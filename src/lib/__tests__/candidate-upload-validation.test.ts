/**
 * Candidate file upload — MIME / size / extension validation.
 *
 * Layer 1 (static): the source of `candidateUploadFile` must declare a MIME
 * allowlist, an extension allowlist, and a hard 10MB size cap, and must
 * reject the input before touching storage when any check fails.
 *
 * Layer 2 (runtime, env-gated): hit the deployed endpoint with a valid
 * access code and confirm oversize / bad MIME / bad extension / lying
 * `file_size` payloads are rejected with a 4xx (400/403/422) response,
 * while a well-formed PDF is accepted.
 *
 * Env to enable the runtime block:
 *   INTEGRATION_BASE_URL         e.g. https://test-dovechem.lovable.app
 *   INTEGRATION_CANDIDATE_CODE   an active candidate access code
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

describe("candidateUploadFile — static validation guarantees", () => {
  const body = extractHandler("candidateUploadFile");

  it("declares a MIME allowlist covering pdf/jpeg/png/webp only", () => {
    // Allowlist lives at module scope; assert against the whole source too.
    expect(src).toMatch(/ALLOWED_MIME\s*=\s*new Set\(\[/);
    expect(src).toMatch(/"application\/pdf"/);
    expect(src).toMatch(/"image\/jpeg"/);
    expect(src).toMatch(/"image\/png"/);
    expect(src).toMatch(/"image\/webp"/);
    // No wide-open types
    expect(src).not.toMatch(/application\/octet-stream/);
    expect(src).not.toMatch(/["']\*\/\*["']/);
  });

  it("rejects disallowed MIME types before touching storage", () => {
    // The MIME check must run before the storage.upload call.
    const mimeCheckIdx = body.search(/ALLOWED_MIME\.has\(/);
    const uploadIdx = body.search(/storage\.from\(["']candidate-files["']\)\.upload/);
    expect(mimeCheckIdx).toBeGreaterThan(-1);
    expect(uploadIdx).toBeGreaterThan(-1);
    expect(mimeCheckIdx).toBeLessThan(uploadIdx);
    expect(body).toMatch(/throw new Error\([^)]*[Tt]ipe file[^)]*\)/);
  });

  it("declares an extension allowlist and rejects mismatched extensions", () => {
    expect(src).toMatch(/ALLOWED_EXT\s*=\s*new Set\(\[/);
    expect(body).toMatch(/ALLOWED_EXT\.has\(/);
    expect(body).toMatch(/throw new Error\([^)]*[Ee]kstensi[^)]*\)/);
  });

  it("caps size at 10MB in both the schema and the handler", () => {
    // Schema-level cap
    expect(src).toMatch(/MAX_UPLOAD_BYTES\s*=\s*10\s*\*\s*1024\s*\*\s*1024/);
    expect(src).toMatch(/file_size:\s*z[^\n]*\.max\(MAX_UPLOAD_BYTES\)/);
    // Handler-level cap on both declared size and decoded buffer length
    expect(body).toMatch(/data\.file_size\s*>\s*MAX_UPLOAD_BYTES/);
    expect(body).toMatch(/buf\.length\s*>\s*MAX_UPLOAD_BYTES/);
  });

  it("rejects an empty decoded payload and payloads whose size lies", () => {
    expect(body).toMatch(/buf\.length\s*===\s*0/);
    expect(body).toMatch(/Math\.abs\(buf\.length\s*-\s*data\.file_size\)/);
  });

  it("size / MIME / extension checks all run before the storage upload", () => {
    const uploadIdx = body.search(/storage\.from\(["']candidate-files["']\)\.upload/);
    for (const check of [
      /data\.file_size\s*>\s*MAX_UPLOAD_BYTES/,
      /ALLOWED_MIME\.has\(/,
      /ALLOWED_EXT\.has\(/,
      /buf\.length\s*===\s*0/,
      /buf\.length\s*>\s*MAX_UPLOAD_BYTES/,
    ]) {
      const idx = body.search(check);
      expect(idx, `check ${check} must exist`).toBeGreaterThan(-1);
      expect(idx, `check ${check} must run before storage upload`).toBeLessThan(uploadIdx);
    }
  });

  it("only accepts the whitelisted file_type enum values", () => {
    // Guardrails against silently accepting arbitrary future types.
    expect(src).toMatch(
      /file_type:\s*z\.enum\(\[\s*"ktp",\s*"kk",\s*"cv",\s*"ijazah",\s*"transkrip",\s*"foto",\s*"npwp"\s*\]\)/,
    );
  });
});

// ---------- Runtime (env-gated) ----------

const BASE = process.env.INTEGRATION_BASE_URL;
const CODE = process.env.INTEGRATION_CANDIDATE_CODE;
const runtime = BASE && CODE ? describe : describe.skip;

async function callUpload(payload: Record<string, unknown>): Promise<Response> {
  // TanStack Start RPC path for createServerFn (POST).
  const url = `${BASE}/_serverFn/candidateUploadFile`;
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ data: payload }),
  });
}

// Minimal valid 1x1 PNG (67 bytes) for the happy path.
const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const TINY_PNG_BYTES = Buffer.from(TINY_PNG_B64, "base64").length;

runtime("candidateUploadFile — runtime rejection (env-gated)", () => {
  it("rejects a disallowed MIME (text/plain) with 4xx", async () => {
    const res = await callUpload({
      code: CODE,
      file_type: "cv",
      file_name: "resume.txt",
      mime_type: "text/plain",
      file_size: 5,
      base64: Buffer.from("hello").toString("base64"),
    });
    expect(res.status, `expected 4xx, got ${res.status}`).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(res.ok).toBe(false);
  });

  it("rejects a disallowed extension (.exe) even with a valid MIME", async () => {
    const res = await callUpload({
      code: CODE,
      file_type: "cv",
      file_name: "resume.exe",
      mime_type: "application/pdf",
      file_size: TINY_PNG_BYTES,
      base64: TINY_PNG_B64,
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it("rejects an oversize declared file_size (>10MB) at the schema layer", async () => {
    const res = await callUpload({
      code: CODE,
      file_type: "cv",
      file_name: "big.pdf",
      mime_type: "application/pdf",
      file_size: 11 * 1024 * 1024,
      base64: TINY_PNG_B64, // small payload, but declared size lies
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it("rejects a payload whose decoded size does not match file_size", async () => {
    const res = await callUpload({
      code: CODE,
      file_type: "cv",
      file_name: "photo.png",
      mime_type: "image/png",
      file_size: 5_000_000, // lie: claim ~5MB
      base64: TINY_PNG_B64, // ~67 bytes actual
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it("rejects an unknown file_type enum value", async () => {
    const res = await callUpload({
      code: CODE,
      file_type: "malware",
      file_name: "x.pdf",
      mime_type: "application/pdf",
      file_size: TINY_PNG_BYTES,
      base64: TINY_PNG_B64,
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it("rejects the request when no access code is supplied (403-equivalent)", async () => {
    const res = await callUpload({
      code: "",
      file_type: "cv",
      file_name: "resume.pdf",
      mime_type: "application/pdf",
      file_size: TINY_PNG_BYTES,
      base64: TINY_PNG_B64,
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it("accepts a well-formed small PNG for the valid candidate code", async () => {
    const res = await callUpload({
      code: CODE,
      file_type: "foto",
      file_name: "foto.png",
      mime_type: "image/png",
      file_size: TINY_PNG_BYTES,
      base64: TINY_PNG_B64,
    });
    // 200 on success; if the deployment hasn't shipped the new validator yet,
    // surface the body to make the failure diagnosable.
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`expected 2xx, got ${res.status}: ${text.slice(0, 300)}`);
    }
    expect(res.ok).toBe(true);
  });
});
