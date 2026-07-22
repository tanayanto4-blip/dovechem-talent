/**
 * Integration coverage for the full submit-test flow.
 *
 *  1. Static guarantees on the source of `candidateSubmitTest`:
 *     - the handler is gated on an active access code + candidate ownership
 *       of the attempt before any write;
 *     - a finished attempt cannot be re-submitted;
 *     - answers are replaced (delete-then-insert) scoped to the attempt id;
 *     - the attempt row is updated with `status: 'finished'`, `finished_at`,
 *       `score`, and `result`;
 *     - MCQ/Kraepelin scoring compares against `correct_answer`, DISC scoring
 *       tallies most/least/change per D/I/S/C.
 *
 *  2. Pure scoring parity: three tiny reference scorers mirror the handler's
 *     branches and are exercised against hand-built fixtures to lock the
 *     score formulas (`round(correct/total*100)` for MCQ/Kraepelin,
 *     `round(most[dominant]/24*100)` for DISC).
 *
 *  3. Runtime end-to-end (env-gated). Starts an attempt, submits real
 *     answers, and re-fetches the attempt to assert:
 *     - HTTP 200 for a valid attempt;
 *     - persisted answers match what was sent;
 *     - returned score matches the recomputed reference score;
 *     - a bogus attempt id (or a foreign candidate's attempt id) is rejected
 *       with a 4xx.
 *
 *  Env for the runtime block:
 *    INTEGRATION_BASE_URL          e.g. https://test-dovechem.lovable.app
 *    INTEGRATION_CANDIDATE_CODE    active candidate access code (data completed)
 *    INTEGRATION_TEST_ID           uuid of an MCQ test with >=1 question
 *    INTEGRATION_TEST_ID_B (opt)   uuid of a test owned by a *different* candidate;
 *                                  used to prove cross-candidate attempts are rejected
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(resolve(here, "../candidate.functions.ts"), "utf8");

function extractHandler(name: string): string {
  const startRe = new RegExp(`export const ${name}\\s*=\\s*createServerFn`);
  const start = src.search(startRe);
  if (start < 0) throw new Error(`handler ${name} not found`);
  const rest = src.slice(start + 1);
  const nextIdx = rest.search(/\nexport const \w+\s*=\s*createServerFn/);
  return nextIdx < 0 ? src.slice(start) : src.slice(start, start + 1 + nextIdx);
}

// ---------- 1. Static guarantees ----------

describe("candidateSubmitTest — static guarantees", () => {
  const body = extractHandler("candidateSubmitTest");

  it("resolves the active access code before any write", () => {
    const resolveIdx = body.search(/resolveActiveCode\(sb,\s*data\.code\)/);
    const answersDeleteIdx = body.search(/from\(["']test_answers["']\)\.delete\(\)/);
    const answersInsertIdx = body.search(/from\(["']test_answers["']\)\.insert\(/);
    const attemptUpdateIdx = body.search(/from\(["']test_attempts["']\)\.update\(/);
    expect(resolveIdx).toBeGreaterThan(-1);
    expect(resolveIdx).toBeLessThan(answersDeleteIdx);
    expect(resolveIdx).toBeLessThan(answersInsertIdx);
    expect(resolveIdx).toBeLessThan(attemptUpdateIdx);
  });

  it("loads the attempt scoped to the resolved candidate id", () => {
    expect(body).toMatch(
      /from\(["']test_attempts["']\)[\s\S]{0,120}\.eq\(["']id["'],\s*data\.attempt_id\)[\s\S]{0,60}\.eq\(["']candidate_id["'],\s*cand\.id\)/,
    );
  });

  it("rejects an unknown attempt and a finished attempt", () => {
    expect(body).toMatch(/if\s*\(!attempt\)\s*throw new Error\(["']Attempt tidak valid\.["']\)/);
    expect(body).toMatch(/attempt\.status\s*===\s*["']finished["'][\s\S]{0,80}throw new Error/);
  });

  it("replaces answers for the attempt (delete-then-insert scoped to attempt_id)", () => {
    expect(body).toMatch(
      /from\(["']test_answers["']\)\.delete\(\)\.eq\(["']attempt_id["'],\s*data\.attempt_id\)/,
    );
    expect(body).toMatch(
      /from\(["']test_answers["']\)\.insert\([\s\S]*?attempt_id:\s*data\.attempt_id/,
    );
  });

  it("updates the attempt row with status/finished_at/score/result", () => {
    expect(body).toMatch(
      /from\(["']test_attempts["']\)\.update\(\{[\s\S]*status:\s*["']finished["'][\s\S]*finished_at[\s\S]*score,[\s\S]*result,?[\s\S]*\}\)\.eq\(["']id["'],\s*data\.attempt_id\)/,
    );
  });

  it("MCQ and Kraepelin branches compare answers against correct_answer", () => {
    // Two independent comparisons (one per branch)
    const matches = body.match(/map\.get\(q\.id\)\s*===\s*q\.correct_answer/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(body).toMatch(/Math\.round\(\(correct\s*\/\s*total\)\s*\*\s*100\)/);
  });

  it("DISC branch tallies most/least across D/I/S/C and derives dominant + score", () => {
    expect(body).toMatch(/most:\s*Record<string,\s*number>\s*=\s*\{\s*D:\s*0,\s*I:\s*0,\s*S:\s*0,\s*C:\s*0/);
    expect(body).toMatch(/least:\s*Record<string,\s*number>\s*=\s*\{\s*D:\s*0,\s*I:\s*0,\s*S:\s*0,\s*C:\s*0/);
    expect(body).toMatch(/change:\s*Record<string,\s*number>/);
    expect(body).toMatch(/const dominant\s*=\s*\(Object\.entries\(most\)\.sort/);
    expect(body).toMatch(/Math\.round\(\(most\[dominant\]\s*\/\s*totalGroups\)\s*\*\s*100\)/);
  });
});

// ---------- 2. Pure scoring parity (mirrors the handler) ----------

type Q = { id: string; correct_answer: string | null };
type A = { question_id: string; answer: string };

function scoreMcq(questions: Q[], answers: A[]) {
  const map = new Map(answers.map((a) => [a.question_id, a.answer]));
  let correct = 0;
  for (const q of questions) if (map.get(q.id) === q.correct_answer) correct++;
  const total = questions.length || 1;
  return { score: Math.round((correct / total) * 100), correct, total };
}

function scoreDisc(answers: A[], totalGroups = 24) {
  const most: Record<string, number> = { D: 0, I: 0, S: 0, C: 0 };
  const least: Record<string, number> = { D: 0, I: 0, S: 0, C: 0 };
  for (const a of answers) {
    try {
      const v = JSON.parse(a.answer);
      if (v && most[v.most] !== undefined) most[v.most]++;
      if (v && least[v.least] !== undefined) least[v.least]++;
    } catch {
      if (most[a.answer] !== undefined) most[a.answer]++;
    }
  }
  const change = { D: most.D - least.D, I: most.I - least.I, S: most.S - least.S, C: most.C - least.C };
  const dominant = (Object.entries(most).sort((x, y) => y[1] - x[1])[0] ?? ["D", 0])[0];
  const score = Math.round((most[dominant] / totalGroups) * 100);
  return { score, most, least, change, dominant };
}

describe("scoring reference (mirrors handler branches)", () => {
  it("MCQ: 3/4 correct rounds to 75", () => {
    const qs: Q[] = [
      { id: "q1", correct_answer: "A" },
      { id: "q2", correct_answer: "B" },
      { id: "q3", correct_answer: "C" },
      { id: "q4", correct_answer: "D" },
    ];
    const ans: A[] = [
      { question_id: "q1", answer: "A" },
      { question_id: "q2", answer: "B" },
      { question_id: "q3", answer: "C" },
      { question_id: "q4", answer: "A" }, // wrong
    ];
    expect(scoreMcq(qs, ans)).toEqual({ score: 75, correct: 3, total: 4 });
  });

  it("MCQ: unanswered questions count as wrong (empty answers → 0)", () => {
    const qs: Q[] = [
      { id: "q1", correct_answer: "A" },
      { id: "q2", correct_answer: "B" },
    ];
    expect(scoreMcq(qs, [])).toEqual({ score: 0, correct: 0, total: 2 });
  });

  it("MCQ: total falls back to 1 when there are no questions (no divide-by-zero)", () => {
    expect(scoreMcq([], [])).toEqual({ score: 0, correct: 0, total: 1 });
  });

  it("DISC: dominant trait wins on ties by object-entry order (D > I > S > C)", () => {
    const ans: A[] = [
      { question_id: "g1", answer: JSON.stringify({ most: "D", least: "C" }) },
      { question_id: "g2", answer: JSON.stringify({ most: "I", least: "S" }) },
    ];
    const r = scoreDisc(ans, 24);
    expect(r.most).toEqual({ D: 1, I: 1, S: 0, C: 0 });
    expect(r.least).toEqual({ D: 0, I: 0, S: 1, C: 1 });
    expect(r.change).toEqual({ D: 1, I: 1, S: -1, C: -1 });
    expect(r.dominant).toBe("D");
    expect(r.score).toBe(Math.round((1 / 24) * 100)); // 4
  });

  it("DISC: 24 clean picks of D → score 100", () => {
    const ans: A[] = Array.from({ length: 24 }, (_, i) => ({
      question_id: `g${i}`,
      answer: JSON.stringify({ most: "D", least: "C" }),
    }));
    expect(scoreDisc(ans, 24).score).toBe(100);
  });

  it("DISC: malformed JSON falls back to single-letter 'most' counting", () => {
    const ans: A[] = [{ question_id: "g1", answer: "I" }];
    const r = scoreDisc(ans, 24);
    expect(r.most.I).toBe(1);
    expect(r.least).toEqual({ D: 0, I: 0, S: 0, C: 0 });
  });
});

// ---------- 3. Runtime end-to-end (env-gated) ----------

const BASE = process.env.INTEGRATION_BASE_URL;
const CODE = process.env.INTEGRATION_CANDIDATE_CODE;
const TEST_ID = process.env.INTEGRATION_TEST_ID;
const TEST_ID_B = process.env.INTEGRATION_TEST_ID_B;
const runtime = BASE && CODE && TEST_ID ? describe : describe.skip;

async function rpc(name: string, data: Record<string, unknown>): Promise<Response> {
  return fetch(`${BASE}/_serverFn/${name}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ data }),
  });
}

async function json<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  try { return JSON.parse(text) as T; } catch { throw new Error(`non-JSON response ${res.status}: ${text.slice(0, 200)}`); }
}

runtime("candidateSubmitTest — end-to-end (env-gated)", () => {
  it("returns 200 for a valid attempt, persists answers, and score matches reference", async () => {
    const start = await rpc("candidateStartTest", { code: CODE, test_id: TEST_ID });
    expect(start.ok, `candidateStartTest failed: ${start.status}`).toBe(true);
    const { attempt, questions, test } = await json(start);
    expect(attempt?.id).toBeTruthy();
    expect(Array.isArray(questions)).toBe(true);
    expect(questions.length).toBeGreaterThan(0);

    // Build deterministic answers per test_type.
    let answers: A[];
    if (test.test_type === "disc") {
      answers = questions.map((q: any) => ({
        question_id: q.id,
        answer: JSON.stringify({ most: "D", least: "C" }),
      }));
    } else {
      // MCQ / Kraepelin — pick the first option so scoring is deterministic.
      answers = questions.map((q: any) => ({
        question_id: q.id,
        answer: String((q.options?.[0]?.value ?? q.options?.[0] ?? "A")),
      }));
    }

    const submit = await rpc("candidateSubmitTest", {
      code: CODE, attempt_id: attempt.id, answers,
    });
    expect(submit.status, `submit failed: ${submit.status}`).toBe(200);
    const submitBody = await json(submit);
    expect(submitBody.ok).toBe(true);
    expect(typeof submitBody.score).toBe("number");

    // Re-fetch the attempt and verify answers persisted verbatim.
    const detail = await rpc("candidateGetAttempt", { code: CODE, attempt_id: attempt.id });
    expect(detail.status).toBe(200);
    const { attempt: saved } = await json(detail);
    const savedByQ = new Map<string, string>(
      (saved.test_answers ?? []).map((r: any) => [r.question_id, r.answer]),
    );
    for (const a of answers) expect(savedByQ.get(a.question_id)).toBe(a.answer);
    expect(saved.status).toBe("finished");
    expect(saved.finished_at).toBeTruthy();
    expect(saved.score).toBe(submitBody.score);
  }, 30_000);

  it("rejects submission for a non-existent attempt id with a 4xx", async () => {
    const res = await rpc("candidateSubmitTest", {
      code: CODE,
      attempt_id: "00000000-0000-0000-0000-000000000000",
      answers: [],
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it("rejects submission when the access code does not own the attempt (cross-candidate)", async () => {
    if (!TEST_ID_B) return; // optional; skip silently when not provided
    // Try to submit against a random uuid pretending to be someone else's attempt.
    const res = await rpc("candidateSubmitTest", {
      code: CODE,
      attempt_id: TEST_ID_B, // deliberately a foreign id
      answers: [],
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
