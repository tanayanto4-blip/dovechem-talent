/**
 * Candidate file-upload ownership + cross-candidate isolation.
 *
 * The upload handler (`candidateUploadFile` in `src/lib/candidate.functions.ts`)
 * MUST:
 *
 *   1. Derive `candidate_id` from the resolved access code, never from
 *      client-supplied input.
 *   2. Store the object under a path prefixed by that candidate id
 *      (`<cand.id>/<file_type>-<ts>.<ext>`) so the private bucket's
 *      per-candidate folder invariant holds.
 *   3. Insert the `candidate_files` row with the same derived
 *      `candidate_id` (never trust `data.candidate_id`).
 *
 * The private `candidate-files` bucket MUST reject anonymous list/download,
 * so a second candidate cannot enumerate or fetch another candidate's
 * objects through the Data/Storage API.
 *
 * A runtime block (env-gated) proves the boundary end-to-end: candidate B
 * calls `candidateUploadFile` with candidate A's code stripped — the
 * server must not accept an attacker-supplied candidate id and must not
 * write into A's folder.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(resolve(here, "../candidate.functions.ts"), "utf8");

// ---------- helpers ----------
function extractHandler(name: string): string {
  const re = new RegExp(
    `export const ${name}\\s*=\\s*createServerFn[\\s\\S]*?\\n\\s*\\}\\);`,
    "m",
  );
  const m = src.match(re);
  if (!m) throw new Error(`handler ${name} not found`);
  return m[0];
}

// -------------------------------------------------------------------------
// A. STATIC — ownership is derived server-side, never trusted from input
// -------------------------------------------------------------------------

describe("candidateUploadFile — static ownership guarantees", () => {
  const body = extractHandler("candidateUploadFile");

  it("input schema does NOT accept a client-supplied candidate_id", () => {
    // The upload validator is declared just above the handler.
    const schemaBlock = src.match(/const UploadInput\s*=\s*z\.object\(\{[\s\S]*?\}\);/);
    expect(schemaBlock, "UploadInput schema not found").toBeTruthy();
    expect(schemaBlock![0]).not.toMatch(/candidate_id/);
  });

  it("resolves candidate row from the access code before any storage/db write", () => {
    // Order matters: resolveActiveCode → .from('candidates').select('id')
    // must precede both the storage upload and the DB insert.
    const resolveIdx = body.search(/resolveActiveCode\s*\(/);
    const candFetchIdx = body.search(
      /\.from\(["']candidates["']\)[\s\S]{0,120}\.eq\(["']code_id["']/,
    );
    const uploadIdx = body.search(/storage\.from\(["']candidate-files["']\)\.upload\(/);
    const insertIdx = body.search(/\.from\(["']candidate_files["']\)\.insert\(/);
    expect(resolveIdx).toBeGreaterThan(-1);
    expect(candFetchIdx).toBeGreaterThan(resolveIdx);
    expect(uploadIdx).toBeGreaterThan(candFetchIdx);
    expect(insertIdx).toBeGreaterThan(candFetchIdx);
  });

  it("storage path is prefixed with the resolved candidate id (per-candidate folder)", () => {
    // Path template like `${cand.id}/${data.file_type}-...`.
    expect(body).toMatch(
      /storage\.from\(["']candidate-files["']\)\.upload\(\s*path\s*,/,
    );
    expect(body).toMatch(/`\$\{cand\.id\}\/[^`]*`/);
    // Guard against ever using an untrusted input for the folder segment.
    expect(body).not.toMatch(/`\$\{data\.candidate_id\}\//);
    expect(body).not.toMatch(/`\$\{data\.code\}\//);
  });

  it("candidate_files insert uses the derived cand.id, not client input", () => {
    // Match the insert payload up to its closing brace.
    const insertMatch = body.match(
      /\.from\(["']candidate_files["']\)\.insert\(\{[\s\S]*?\}\)/,
    );
    expect(insertMatch, "candidate_files insert not found").toBeTruthy();
    const payload = insertMatch![0];
    expect(payload).toMatch(/candidate_id:\s*cand\.id/);
    expect(payload).not.toMatch(/candidate_id:\s*data\./);
  });

  it("replaces prior same-type file only within the same candidate scope", () => {
    // The pre-insert delete must be scoped by both candidate_id and file_type.
    expect(body).toMatch(
      /\.from\(["']candidate_files["']\)\.delete\(\)[\s\S]{0,200}\.eq\(["']candidate_id["'],\s*cand\.id\)[\s\S]{0,200}\.eq\(["']file_type["']/,
    );
  });
});

// -------------------------------------------------------------------------
// B. RUNTIME — anon cannot list/download another candidate's objects
// -------------------------------------------------------------------------

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://behfzdauvjrolanucxgd.supabase.co";
const ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_ZA89e7FWOlf6GS3-IfYyMw_UuF-OoLs";

describe("candidate-files bucket — anonymous access is denied", () => {
  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  it("anon cannot list objects in the private bucket", async () => {
    const { data, error } = await anon.storage.from("candidate-files").list("");
    // Either an explicit error or an empty listing — never a real inventory.
    const denied = !!error || (Array.isArray(data) && data.length === 0);
    expect(denied).toBe(true);
  });

  it("anon cannot download an arbitrary candidate's object", async () => {
    // Guessing any candidate uuid folder should fail; even if the object
    // existed, anon must not receive its bytes.
    const probe = "00000000-0000-0000-0000-000000000000/ktp-1.bin";
    const { data, error } = await anon.storage.from("candidate-files").download(probe);
    expect(!!error || data == null).toBe(true);
  });

  it("anon cannot SELECT the candidate_files metadata table", async () => {
    const { data, error } = await anon.from("candidate_files").select("id").limit(1);
    const denied = !!error || (Array.isArray(data) && data.length === 0);
    expect(denied).toBe(true);
  });
});

// -------------------------------------------------------------------------
// C. INTEGRATION (env-gated) — end-to-end cross-candidate upload boundary
// -------------------------------------------------------------------------

const RUN_INTEGRATION =
  !!process.env.INTEGRATION_BASE_URL &&
  !!process.env.INTEGRATION_CANDIDATE_CODE &&
  !!process.env.INTEGRATION_CANDIDATE_CODE_B;

const maybe = RUN_INTEGRATION ? describe : describe.skip;

maybe("candidateUploadFile — cross-candidate boundary (live)", () => {
  const base = process.env.INTEGRATION_BASE_URL!;
  const codeA = process.env.INTEGRATION_CANDIDATE_CODE!;
  const codeB = process.env.INTEGRATION_CANDIDATE_CODE_B!;

  async function upload(code: string, file_name: string) {
    const res = await fetch(`${base}/_serverFn/candidateUploadFile`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        data: {
          code,
          file_type: "ktp",
          file_name,
          mime_type: "application/octet-stream",
          file_size: 4,
          base64: Buffer.from("test").toString("base64"),
        },
      }),
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {}
    return { status: res.status, json, text };
  }

  it("each candidate's upload lands under its own folder", async () => {
    const a = await upload(codeA, "a-ktp.bin");
    const b = await upload(codeB, "b-ktp.bin");
    expect(a.status).toBeLessThan(400);
    expect(b.status).toBeLessThan(400);
    const pathA: string = a.json?.result?.path ?? a.json?.path;
    const pathB: string = b.json?.result?.path ?? b.json?.path;
    expect(pathA && pathB).toBeTruthy();
    // Folder prefixes must differ — no shared per-candidate directory.
    expect(pathA.split("/")[0]).not.toEqual(pathB.split("/")[0]);
  });

  it("candidate B cannot download candidate A's object via anon storage", async () => {
    const a = await upload(codeA, "a-secret.bin");
    const pathA: string = a.json?.result?.path ?? a.json?.path;
    expect(pathA).toBeTruthy();
    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await anon.storage.from("candidate-files").download(pathA);
    expect(!!error || data == null).toBe(true);
  });
});
