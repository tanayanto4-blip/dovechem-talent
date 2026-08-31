/**
 * Regression: no endpoint response may ever include sensitive fields.
 *
 * "Endpoint" here = every `createServerFn(...).handler(...)` exported from
 * `src/lib/*.functions.ts` (the RPC surface the browser can reach) plus any
 * server route under `src/routes/api/`. This suite fails if a handler:
 *
 *   1. Selects a forbidden column from Postgres (e.g. `.select("password_hash")`
 *      or a `.select("...")` list that names one).
 *   2. Uses `.select("*")` on a table known to contain forbidden columns,
 *      unless the handler is explicitly whitelisted for server-side use
 *      (scoring, staff review) AND does not return the raw row to the caller.
 *   3. Names a forbidden field inside an object literal used to build the
 *      response (`return { correct_answer, ... }`, `{ password_hash: … }`).
 *
 * Rules are static — they can't prove the network payload — but the
 * combination catches every realistic leak: PostgREST only returns columns
 * you either `select("*")` or name explicitly, and hand-built responses
 * only expose fields the source code mentions.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const libDir = resolve(here, "..");
const apiDir = resolve(here, "../../routes/api");

const FORBIDDEN = [
  "password_hash",
  "encrypted_password",
  "correct_answer",
  "service_role_key",
  "SUPABASE_SERVICE_ROLE_KEY",
  "session_token",
  "refresh_token",
] as const;

// Tables where `.select("*")` would expose a forbidden field. Any handler
// that does `.from("<table>").select("*")` must be whitelisted below.
const TABLES_WITH_SECRETS: Record<string, readonly string[]> = {
  test_questions: ["correct_answer"],
  // Add here if new tables ever store secrets.
};

// Handlers explicitly allowed to `.select("*")` on a secret-bearing table
// because they run server-side only (scoring, staff review) and their
// return DTO is trusted to strip the secret. Keep this list tight —
// every entry is a manual audit target.
const SELECT_STAR_WHITELIST: Record<string, readonly string[]> = {
  test_questions: [
    // scoring uses correct_answer server-side but returns only score/summary
    "candidateSubmitTest",
    // staff-only bank-of-questions / attempt-review views (requireStaff/requireAdmin)
    "adminListQuestions",
    "adminGetQuestion",
    "getTestQuestionsForReview",
    "getTestWithQuestions",
    "getAttemptDetail",
    // pendampingan pengisian oleh staff (requireStaff): skoring + tinjau soal
    "adminAssistTest",
    "adminSaveAssistedAnswers",
  ],
};

// Admin-only WRITE handlers (requireAdmin) for the question-bank editor.
// They read/write `correct_answer` by design but return only { ok, id } —
// the answer key never crosses back to the browser.
const ADMIN_QUESTION_WRITERS = [
  "upsertTestQuestion",
  "deleteTestQuestion",
  "importTestQuestions",
] as const;

function walk(dir: string): string[] {
  let out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out = out.concat(walk(p));
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const functionFiles = readdirSync(libDir)
  .filter((f) => f.endsWith(".functions.ts"))
  .map((f) => join(libDir, f));
const apiFiles = walk(apiDir);
const ALL_FILES = [...functionFiles, ...apiFiles];

type Handler = { file: string; name: string; body: string };

function extractHandlers(file: string): Handler[] {
  const src = readFileSync(file, "utf8");
  const starts: { name: string; index: number }[] = [];
  for (const m of src.matchAll(/export const (\w+)\s*=\s*createServerFn\s*\(/g)) {
    starts.push({ name: m[1], index: m.index! });
  }
  // Also treat server-route handler bodies as "handlers" for scanning.
  for (const m of src.matchAll(/\b(GET|POST|PUT|PATCH|DELETE)\s*:\s*async\s*\(/g)) {
    starts.push({ name: `route:${m[1]}@${file}`, index: m.index! });
  }
  starts.sort((a, b) => a.index - b.index);
  const out: Handler[] = [];
  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1].index : src.length;
    out.push({ file, name: starts[i].name, body: src.slice(starts[i].index, end) });
  }
  return out;
}

const HANDLERS: Handler[] = ALL_FILES.flatMap(extractHandlers);

// -------------------------------------------------------------------------
// 1. No explicit projection of a forbidden field
// -------------------------------------------------------------------------

describe("endpoint leaks — explicit column projection", () => {
  for (const field of FORBIDDEN) {
    it(`no handler .select()s ${field}`, () => {
      const offenders = HANDLERS.filter((h) => {
        if (
          field === "correct_answer" &&
          (ADMIN_QUESTION_WRITERS as readonly string[]).includes(h.name)
        ) {
          return false;
        }
        // Match `.select("...")` or `.select(\`...\`)` string arguments
        // that list this field.
        const re = new RegExp(`\\.select\\(\\s*[\`"'][^\`"']*\\b${field}\\b[^\`"']*[\`"']`);
        return re.test(h.body);
      });
      expect(
        offenders.map((h) => `${h.name} (${h.file})`),
        `Handlers select the forbidden field \`${field}\``,
      ).toEqual([]);
    });
  }
});

// -------------------------------------------------------------------------
// 2. `.select("*")` on secret-bearing tables must be whitelisted
// -------------------------------------------------------------------------

describe("endpoint leaks — select('*') on secret-bearing tables", () => {
  for (const [table, secrets] of Object.entries(TABLES_WITH_SECRETS)) {
    it(`select('*') on ${table} is confined to the whitelist (secrets: ${secrets.join(", ")})`, () => {
      const allowed = new Set(SELECT_STAR_WHITELIST[table] ?? []);
      const re = new RegExp(
        `\\.from\\(\\s*[\`"']${table}[\`"']\\s*\\)[\\s\\S]{0,200}?\\.select\\(\\s*[\`"']\\*[\`"']`,
      );
      const offenders = HANDLERS.filter((h) => re.test(h.body) && !allowed.has(h.name));
      expect(
        offenders.map((h) => `${h.name} (${h.file})`),
        `Non-whitelisted handlers do select('*') on ${table}, which leaks: ${secrets.join(", ")}`,
      ).toEqual([]);
    });
  }
});

// -------------------------------------------------------------------------
// 3. No hand-built response object names a forbidden field
// -------------------------------------------------------------------------

describe("endpoint leaks — response object literals", () => {
  for (const field of FORBIDDEN) {
    it(`no handler builds a response object with a \`${field}\` key`, () => {
      // Match `field:` or shorthand `{ ..., field, ... }` inside a return
      // or a variable that gets returned. We keep it loose but scoped to
      // handler bodies so unrelated destructures elsewhere don't trip it.
      const keyRe = new RegExp(`[{,]\\s*${field}\\s*[:,}]`);
      const offenders = HANDLERS.filter((h) => {
        if (!keyRe.test(h.body)) return false;
        // Allow whitelisted scoring handler to reference the field internally
        // as long as it does not appear in a return payload literal.
        if (
          [...(SELECT_STAR_WHITELIST["test_questions"] ?? []), ...ADMIN_QUESTION_WRITERS].includes(
            h.name,
          ) &&
          field === "correct_answer"
        ) {
          // Scan return statements only.
          const returnBlocks = h.body.match(/return\s*\{[\s\S]*?\}\s*;/g) ?? [];
          return returnBlocks.some((b) => keyRe.test(b));
        }
        return true;
      });
      expect(
        offenders.map((h) => `${h.name} (${h.file})`),
        `Handlers appear to return the forbidden field \`${field}\` in a response literal`,
      ).toEqual([]);
    });
  }
});

// -------------------------------------------------------------------------
// 4. Sanity: the scanner actually found handlers to inspect
// -------------------------------------------------------------------------

describe("endpoint leak scanner — sanity", () => {
  it("found candidate/admin/user server functions to scan", () => {
    expect(HANDLERS.length).toBeGreaterThan(10);
    const files = new Set(HANDLERS.map((h) => h.file));
    expect(files.size).toBeGreaterThanOrEqual(3);
  });
});
