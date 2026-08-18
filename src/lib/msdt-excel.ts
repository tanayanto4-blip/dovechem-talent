import JSZip from "jszip";
import type { CandidateMeta } from "@/lib/candidate-meta";
import { MSDT_ITEMS, msdtScore } from "@/lib/msdt-key";
import templateAsset from "@/assets/msdt-template.xlsx.asset.json";
import {
  type CellValue,
  assertTemplateIntact,
  clearFormulaCache,
  forceRecalc,
  patchSheet,
  sheetPaths,
  snapshotZip,
} from "@/lib/xlsx-patch";

/**
 * Mengisi template Excel MSDT dengan jawaban kandidat.
 *
 * Aturan yang dikunci (divalidasi sebelum file diunduh):
 *   - HANYA sheet "Soal" yang diisi: sel jawaban tiap nomor (M/Z/AM/AZ) + nama.
 *   - Sheet "Otomatis Scoring" tidak disentuh — rumus A/B, KOREKSI, JUMLAH,
 *     TO/RO/E/O, konversi, dan penentuan gaya tetap identik dan langsung
 *     terisi otomatis dari jawaban di sheet "Soal" saat file dibuka.
 */
export interface MsdtExcelMeta extends CandidateMeta {}

export async function exportMsdtExcel(picks: Record<number, string>, meta: MsdtExcelMeta = {}) {
  const score = msdtScore(picks);

  const res = await fetch(templateAsset.url);
  if (!res.ok) throw new Error("Template Excel MSDT tidak dapat dimuat.");
  const zip = await JSZip.loadAsync(await res.arrayBuffer());
  const before = await snapshotZip(zip);
  const { wbXml, sheets } = await sheetPaths(zip);
  const main = sheets.find((s) => /soal/i.test(s.name)) ?? sheets[0];

  const edits = new Map<string, CellValue>();
  const nama = [meta.candidateName, meta.candidateCode].filter(Boolean).join(" — ") || "-";
  edits.set("D4", nama);
  for (const item of MSDT_ITEMS) {
    const pick = (picks[item.n] ?? "").trim().toUpperCase();
    edits.set(item.cell, pick === "A" || pick === "B" ? pick : null);
  }

  const mainFile = zip.file(main.path);
  if (!mainFile) throw new Error("Sheet 'Soal' tidak ditemukan pada template.");
  zip.file(main.path, patchSheet(await mainFile.async("string"), edits, true));

  const formulaBefore = await clearFormulaCache(zip, sheets, main.path);
  forceRecalc(zip, wbXml);
  await assertTemplateIntact(zip, before, main.path, "template MSDT", formulaBefore);

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    compression: "DEFLATE",
  });
  const safe = (meta.candidateName ?? "kandidat").replace(/[^\w\-]+/g, "_");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `MSDT_${safe}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);

  return {
    answered: score.answered,
    total: score.total,
    dominant: score.dominant,
    dominantLabel: score.dominantLabel,
    dims: score.dims,
  };
}
