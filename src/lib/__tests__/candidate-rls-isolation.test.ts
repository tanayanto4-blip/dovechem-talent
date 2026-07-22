/**
 * RLS + cross-user isolation regression suite for candidate data.
 *
 * Candidate access to Supabase does NOT go through Supabase Auth — they
 * authenticate with a one-time access code, and the server functions load
 * the row scoped by that code. Two things must therefore hold for
 * `test_attempts`, `test_answers`, and `candidate_files`:
 *
 *   A. STATIC — every candidate-side handler that touches those tables
 *      MUST filter by `candidate_id` derived from the resolved access
 *      code, never from client-supplied input. A single missing `.eq(
 *      "candidate_id", cand.id)` is a cross-candidate data leak.
 *
 *   B. RUNTIME — the RLS policies on those tables MUST reject the
 *      anonymous Data API client outright (no anon SELECT/INSERT), and
 *      the private `candidate-files` storage bucket MUST refuse listing
 *      / downloading without a service-role signed URL.
 *
 * A separate opt-in integration block (env-gated) proves the cross-
 * candidate boundary end-to-end by logging in as candidate A over HTTP
 * and asking for candidate B's attempt id — the server function must
 * refuse.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const here = dirname(fileURLToPath(import.meta.url));
const read = (p: string) => readFileSync(resolve(here, p), "utf8");
const candidateSrc = read("../candidate.functions.ts");

// -------------------------------------------------------------------------
// A. STATIC — every candidate table touch is scoped by cand.id
// -------------------------------------------------------------------------

const CANDIDATE_SCOPED_TABLES = ["test_attempts", "test_answers", "candidate_files"] as const;

/** Extract handler bodies from `candidate.functions.ts`. */
function extractHandlers(src: string): { name: string; body: string }[] {
  const out: { name: string; body: string }[] = [];
  const starts: { name: string; index: number }[] = [];
  for (const m of src.matchAll(/export const (\w+)\s*=\s*createServerFn\s*\(/g)) {
    starts.push({ name: m[1], index: m.index! });
  }
  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1].index : src.length;
    out.push({ name: starts[i].name, body: src.slice(starts[i].index, end) });
  }
  return out;
}

const HANDLERS = extractHandlers(candidateSrc);

describe("candidate RLS — static scope checks", () => {
  it("every candidate handler resolves cand.id from the access code, not from input", () => {
    // Any handler that queries a candidate-scoped table must first derive
    // `cand` via `resolveActiveCode(...)` → `.from('candidates').select('id')`.
    for (const h of HANDLERS) {
      const touchesScoped = CANDIDATE_SCOPED_TABLES.some((t) =>
        new RegExp(`\\.from\\(["']${t}["']\\)`).test(h.body),
      );
      if (!touchesScoped) continue;
      expect(h.body, `${h.name} must call resolveActiveCode`).toMatch(/resolveActiveCode\s*\(/);
      expect(
        h.body,
        `${h.name} must resolve candidate row from code_id`,
      ).toMatch(/\.from\(["']candidates["']\)[\s\S]*?\.eq\(["']code_id["']/);
    }
  });

  for (const table of CANDIDATE_SCOPED_TABLES) {
    it(`every ${table} query in candidate.functions.ts filters by candidate_id`, () => {
      // Walk each `.from("<table>")` occurrence and read only up to the
      // NEXT `.from(` or end-of-statement, so multi-query Promise.all
      // arrays don't have their scopes bleed into each other.
      const openings = [...candidateSrc.matchAll(new RegExp(`\\.from\\(["']${table}["']\\)`, "g"))];
      expect(openings.length, `expected at least one ${table} query`).toBeGreaterThan(0);
      for (const m of openings) {
        const start = m.index!;
        const rest = candidateSrc.slice(start + m[0].length);
        const nextFrom = rest.search(/\.from\(/);
        const cut = nextFrom >= 0 ? nextFrom : Math.min(rest.length, 600);
        const chunk = rest.slice(0, cut);
        const scopedDirect =
          /\.eq\(["']candidate_id["'],\s*cand\.id/.test(chunk) ||
          /\.eq\(["']candidate_id["'],[\s\S]*?\.data\?\.id/.test(chunk);
        const scopedByVerifiedAttempt = /\.eq\(["']attempt_id["'],\s*data\.attempt_id/.test(chunk);
        expect(
          scopedDirect || scopedByVerifiedAttempt,
          `unscoped ${table} query near offset ${start}:\n${chunk}`,
        ).toBe(true);
      }
    });
  }

  it("candidate handlers never trust an attempt_id without verifying candidate_id first", () => {
    // For handlers that accept `attempt_id` as input, the FIRST select on
    // `test_attempts` in that handler MUST also filter by cand.id.
    for (const h of HANDLERS) {
      if (!/attempt_id:\s*z\.string\(\)\.uuid\(\)/.test(h.body)) continue;
      const firstAttemptSelect = h.body.match(
        /\.from\(["']test_attempts["']\)[\s\S]*?(?=;|\}\))/,
      );
      if (!firstAttemptSelect) continue;
      expect(
        firstAttemptSelect[0],
        `${h.name} reads test_attempts by attempt_id without checking candidate_id`,
      ).toMatch(/\.eq\(["']candidate_id["'],\s*cand\.id\)/);
    }
  });
});

// -------------------------------------------------------------------------
// B. RUNTIME — anon Supabase client cannot reach candidate data
// -------------------------------------------------------------------------

const SUPABASE_URL =
  process.env.INTEGRATION_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_KEY =
  process.env.INTEGRATION_SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "";
const canRunAnon = Boolean(SUPABASE_URL && SUPABASE_KEY);

describe.skipIf(!canRunAnon)("candidate RLS — anon Data API is denied", () => {
  const anon = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const table of CANDIDATE_SCOPED_TABLES) {
    it(`anon SELECT on ${table} returns empty or is rejected`, async () => {
      const { data, error } = await anon.from(table).select("id").limit(1);
      // RLS denies -> either an explicit error or zero rows.
      expect(error !== null || (data ?? []).length === 0).toBe(true);
    });

    it(`anon INSERT on ${table} is rejected`, async () => {
      // Craft a syntactically-valid but semantically-bogus payload; the
      // point is that RLS/WITH CHECK rejects it before any FK check.
      const payload =
        table === "candidate_files"
          ? { candidate_id: "00000000-0000-0000-0000-000000000000", file_type: "ktp", storage_path: "x" }
          : table === "test_attempts"
            ? { candidate_id: "00000000-0000-0000-0000-000000000000", test_id: "00000000-0000-0000-0000-000000000000" }
            : { attempt_id: "00000000-0000-0000-0000-000000000000", question_id: "00000000-0000-0000-0000-000000000000", answer: "x" };
      const { error } = await anon.from(table).insert(payload as never);
      expect(error, "anon insert must be rejected").not.toBeNull();
    });
  }

  it("anon cannot list the private candidate-files storage bucket", async () => {
    const { data, error } = await anon.storage.from("candidate-files").list("");
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it("anon cannot download from the private candidate-files bucket", async () => {
    const { data, error } = await anon.storage.from("candidate-files").download("does-not-exist.pdf");
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});

// -------------------------------------------------------------------------
// C. INTEGRATION — cross-candidate RPC boundary (opt-in via env vars)
// -------------------------------------------------------------------------

const BASE_URL = (process.env.INTEGRATION_BASE_URL ?? "").replace(/\/$/, "");
const CODE_A = process.env.INTEGRATION_CANDIDATE_CODE ?? "";
const CODE_B = process.env.INTEGRATION_CANDIDATE_CODE_B ?? "";
const canRunCross = Boolean(BASE_URL && CODE_A && CODE_B);

describe.skipIf(!canRunCross)("candidate RLS — cross-candidate RPC boundary", () => {
  async function loginAndListAttempts(code: string) {
    const res = await fetch(`${BASE_URL}/_serverFn/candidateLogin`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: { code } }),
    });
    if (!res.ok) throw new Error(`login failed for ${code}: ${res.status}`);
    const body = (await res.json()) as { result?: { attempts?: { id: string }[] } };
    return body.result?.attempts ?? [];
  }

  it("candidate A cannot fetch candidate B's attempt via candidateGetAttempt", async () => {
    const attemptsB = await loginAndListAttempts(CODE_B);
    if (attemptsB.length === 0) {
      // Nothing to steal — the boundary can't be tested until B has an attempt.
      expect(true).toBe(true);
      return;
    }
    const victimId = attemptsB[0]!.id;

    const res = await fetch(`${BASE_URL}/_serverFn/candidateGetAttempt`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: { code: CODE_A, attempt_id: victimId } }),
    });

    // Server may return an HTTP error or a 200 with an error payload; both
    // are acceptable as long as no attempt/questions come back.
    if (res.ok) {
      const body = (await res.json()) as { result?: unknown; error?: unknown };
      expect(body.result ?? null, "cross-candidate read must not return data").toBeNull();
    } else {
      expect(res.status).toBeGreaterThanOrEqual(400);
    }
  });
});
