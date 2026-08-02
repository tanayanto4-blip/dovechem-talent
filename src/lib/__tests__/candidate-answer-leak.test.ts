import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, "../candidate.functions.ts"), "utf8");

/**
 * Security regression test.
 *
 * Candidate-facing server functions must NEVER return `correct_answer`
 * (from `public.test_questions`) to the browser. The scorer reads the
 * key server-side to compute a score, but the RPC response must not
 * include it, otherwise any candidate can inspect the network response
 * and see the answer key.
 *
 * We enforce this statically by parsing the server-function source and
 * asserting that every `test_questions` select projects an explicit
 * safe column list — no `select("*")`, no `correct_answer` in the
 * projection — inside the candidate module.
 */

const CANDIDATE_RPC_FNS = [
  "candidateLogin",
  "candidateGetProfile",
  "candidateSaveProfile",
  "candidateUploadFile",
  "candidateStartTest",
  "candidateGetAttempt",
  "candidateSubmitTest",
];

/** Slice `src` from `export const <name>` up to the next `export const` (or EOF). */
function extractHandlerBody(src: string, name: string): string {
  const start = src.indexOf(`export const ${name}`);
  if (start < 0) throw new Error(`missing export const ${name}`);
  const nextExport = src.indexOf("export const ", start + 1);
  return src.slice(start, nextExport === -1 ? undefined : nextExport);
}


describe("candidate endpoints never expose correct_answer", () => {
  it("exports the candidate-facing server functions we expect to audit", () => {
    for (const name of CANDIDATE_RPC_FNS) {
      expect(source, `expected export const ${name}`).toContain(`export const ${name}`);
    }
  });

  it("never selects '*' or correct_answer from test_questions in browser-returning handlers", () => {
    // candidateSubmitTest legitimately reads correct_answer server-side to
    // compute the score, but only returns aggregate numbers. Every other
    // candidate handler that reads question rows for the browser must
    // project an explicit safe column list.
    const RETURN_QUESTION_ROWS = ["candidateStartTest", "candidateGetAttempt"];
    let totalSelects = 0;
    for (const name of RETURN_QUESTION_ROWS) {
      const body = extractHandlerBody(source, name);
      const matches = [
        ...body.matchAll(
          /\.from\(\s*["'`]test_questions["'`]\s*\)[\s\S]{0,200}?\.select\(\s*(["'`])([\s\S]*?)\1\s*\)/g,
        ),
      ];
      totalSelects += matches.length;
      for (const m of matches) {
        const projection = m[2].trim();
        expect(projection, `${name} must not select "*" from test_questions`).not.toBe("*");
        expect(projection, `${name} must not include correct_answer in projection`).not.toMatch(/\bcorrect_answer\b/);
      }
    }
    // At least one candidate-facing handler must actually serve questions.
    expect(totalSelects, "expected at least one safe test_questions select").toBeGreaterThan(0);
  });

  it("candidateSubmitTest does not return correct_answer in its response shape", () => {
    const body = extractHandlerBody(source, "candidateSubmitTest");
    // Grab everything inside the handler's return statements.
    const returns = [...body.matchAll(/return\s+([\s\S]*?);/g)].map((m) => m[1]);
    for (const r of returns) {
      expect(r, "candidateSubmitTest return must not expose correct_answer").not.toMatch(/\bcorrect_answer\b/);
    }
  });


  it("never mentions correct_answer inside candidateGetAttempt / candidateStartTest bodies", () => {
    // Extract each candidate-facing handler body and assert correct_answer
    // is not projected/returned. Scoring lives in candidateSubmitTest and
    // does read the key — that's fine because it's not returned.
    const readOnlyReturners = ["candidateStartTest", "candidateGetAttempt", "candidateGetProfile"];
    for (const name of readOnlyReturners) {
      const start = source.indexOf(`export const ${name}`);
      expect(start, `missing ${name}`).toBeGreaterThan(-1);
      // Walk forward to the next `export const ` or EOF.
      const nextExport = source.indexOf("export const ", start + 1);
      const body = source.slice(start, nextExport === -1 ? undefined : nextExport);
      expect(body, `${name} must not reference correct_answer`).not.toMatch(/\bcorrect_answer\b/);
    }
  });
});
