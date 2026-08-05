import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Regression guard for the DISC candidate test layout.
 *
 * Locks the visual/interaction contract:
 *  - Two answer columns (M on the LEFT, L on the RIGHT) wrap a single
 *    statement column — the "kanan-kiri" pairing the candidate sees.
 *  - Options are rendered in their stored order (`q.options.map`),
 *    so statement order is not silently shuffled by future edits.
 *  - M writes to `most`, L writes to `least` — the setDisc contract
 *    that scoring (`most`/`least` buckets in candidateSubmitTest) depends on.
 *  - Header + each row use the same 3-column grid template so the M/L
 *    buttons stay vertically aligned with their column headers.
 */

const SRC = readFileSync(
  resolve(__dirname, "../../routes/candidate.portal.test.$testId.tsx"),
  "utf8",
);

// The per-question rendering (including the DISC grid) lives in the shared
// question card component; the route owns state + the setDisc contract.
const CARD = readFileSync(
  resolve(__dirname, "../../components/test-question-card.tsx"),
  "utf8",
);

// Strip the non-DISC branches so assertions only inspect the DISC block.
const DISC_BLOCK = (() => {
  const start = CARD.indexOf("isDisc ? (");
  const end = CARD.slice(start).search(/\n\s*\) : /) + start;
  expect(start, "DISC branch missing").toBeGreaterThan(-1);
  expect(end, "DISC branch not terminated").toBeGreaterThan(start);
  return CARD.slice(start, end);
})();

describe("DISC layout regression", () => {
  it("uses a 3-column grid (statement | M | L) for header and rows", () => {
    const grids = DISC_BLOCK.match(
      /grid-cols-\[minmax\(0,1fr\)_[^\]]*\]/g,
    );
    expect(grids?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("renders Pernyataan header before M, and M before L", () => {
    const pIdx = DISC_BLOCK.indexOf(">Pernyataan<");
    const mIdx = DISC_BLOCK.indexOf('text-primary">M<');
    const lIdx = DISC_BLOCK.indexOf('text-destructive">L<');
    expect(pIdx).toBeGreaterThan(-1);
    expect(mIdx).toBeGreaterThan(pIdx);
    expect(lIdx).toBeGreaterThan(mIdx);
  });

  it("renders the M button before the L button inside every option row", () => {
    const mostBtn = DISC_BLOCK.indexOf("handleDiscMost(opt.key)");
    const leastBtn = DISC_BLOCK.indexOf("handleDiscLeast(opt.key)");
    expect(mostBtn).toBeGreaterThan(-1);
    expect(leastBtn).toBeGreaterThan(mostBtn);
    // and the handlers keep the M -> most / L -> least mapping
    expect(CARD).toMatch(/handleDiscMost\s*=[\s\S]{0,80}onSetDisc\(q\.id, "most"/);
    expect(CARD).toMatch(/handleDiscLeast\s*=[\s\S]{0,80}onSetDisc\(q\.id, "least"/);
  });

  it("iterates q.options in stored order (no sort/reverse)", () => {
    expect(DISC_BLOCK).toMatch(/\(q\.options \?\? \[\]\)\.map\(/);
    expect(DISC_BLOCK).not.toMatch(/q\.options[\s\S]{0,40}\.(sort|reverse)\(/);
  });

  it("keeps the M/L legend order (M kolom kiri, L kolom kanan) in the footer", () => {
    const mLegend = DISC_BLOCK.indexOf("(kolom kiri)");
    const lLegend = DISC_BLOCK.indexOf("(kolom kanan)");
    expect(mLegend).toBeGreaterThan(-1);
    expect(lLegend).toBeGreaterThan(mLegend);
  });


  it("keeps the setDisc contract: M -> most, L -> least", () => {
    // Guards the scoring path in candidateSubmitTest which reads
    // JSON.parse(answer).most / .least buckets.
    const setDiscSig = SRC.match(
      /function setDisc\(qid: string, kind: "most" \| "least", key: string\)/,
    );
    expect(setDiscSig, "setDisc signature changed").not.toBeNull();
    expect(SRC).toMatch(/JSON\.stringify\(\{ most: cur\.most, least: cur\.least \}\)/);
  });
});
