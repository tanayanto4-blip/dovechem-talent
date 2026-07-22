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

// Strip the non-DISC branches so assertions only inspect the DISC block.
const DISC_BLOCK = (() => {
  const start = SRC.indexOf("isDisc ? (");
  const end = SRC.indexOf(") : (", start);
  expect(start, "DISC branch missing").toBeGreaterThan(-1);
  expect(end, "DISC branch not terminated").toBeGreaterThan(start);
  return SRC.slice(start, end);
})();

describe("DISC layout regression", () => {
  it("uses a 3-column grid (M | statement | L) for header and rows", () => {
    const grids = DISC_BLOCK.match(
      /grid-cols-\[[^\]]*_minmax\(0,1fr\)_[^\]]*\]/g,
    );
    // header + statement row = at least 2 occurrences.
    expect(grids?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("renders M header before Pernyataan, and Pernyataan before L", () => {
    const mIdx = DISC_BLOCK.indexOf('text-primary">M<');
    const pIdx = DISC_BLOCK.indexOf(">Pernyataan<");
    const lIdx = DISC_BLOCK.indexOf('text-destructive">L<');
    expect(mIdx).toBeGreaterThan(-1);
    expect(pIdx).toBeGreaterThan(mIdx);
    expect(lIdx).toBeGreaterThan(pIdx);
  });

  it("renders the M button before the L button inside every option row", () => {
    const mostBtn = DISC_BLOCK.indexOf('setDisc(q.id, "most"');
    const leastBtn = DISC_BLOCK.indexOf('setDisc(q.id, "least"');
    expect(mostBtn).toBeGreaterThan(-1);
    expect(leastBtn).toBeGreaterThan(mostBtn);
  });

  it("iterates q.options in stored order (no sort/reverse)", () => {
    expect(DISC_BLOCK).toMatch(/\(q\.options \?\? \[\]\)\.map\(/);
    expect(DISC_BLOCK).not.toMatch(/q\.options[\s\S]{0,40}\.(sort|reverse)\(/);
  });

  it("keeps the M/L legend order (M kiri, L kanan) in the footer", () => {
    const mLegend = DISC_BLOCK.indexOf("(kiri)");
    const lLegend = DISC_BLOCK.indexOf("(kanan)");
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
