import JSZip from "jszip";
import type { CandidateMeta } from "@/lib/candidate-meta";
import { papiScore } from "@/lib/papi-key";
import templateAsset from "@/assets/papi-template.xlsx.asset.json";
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
 * Mengisi template Excel skoring PAPI Kostick dengan total skor kandidat.
 *
 * Aturan yang dikunci (divalidasi sebelum file diunduh):
 *   - HANYA sheet 1 ("POLA DASAR") yang diisi: B6 (nama) dan C6..V6 (20 skala).
 *   - Sheet 2 ("CHART PAPIKOSTIK") dan sheet 3 ("Summary") tidak disentuh sama
 *     sekali — rumus, layout, dan seluruh grafiknya tetap byte-per-byte sama.
 *   - Workbook ditandai fullCalcOnLoad agar sheet 2 & 3 terisi otomatis dari
 *     sheet 1 saat file dibuka.
 */
export interface PapiExcelMeta extends CandidateMeta {}

/** Urutan kolom skala pada baris 4 template: C..V */
const SCALE_COLUMNS: Array<{ col: string; scale: string }> = [
  { col: "C", scale: "N" },
  { col: "D", scale: "G" },
  { col: "E", scale: "A" },
  { col: "F", scale: "L" },
  { col: "G", scale: "P" },
  { col: "H", scale: "I" },
  { col: "I", scale: "T" },
  { col: "J", scale: "V" },
  { col: "K", scale: "X" },
  { col: "L", scale: "S" },
  { col: "M", scale: "B" },
  { col: "N", scale: "O" },
  { col: "O", scale: "R" },
  { col: "P", scale: "D" },
  { col: "Q", scale: "C" },
  { col: "R", scale: "Z" },
  { col: "S", scale: "E" },
  { col: "T", scale: "K" },
  { col: "U", scale: "F" },
  { col: "V", scale: "W" },
];

/** Baris data pertama pada sheet "POLA DASAR" — yang dirujuk sheet Summary. */
const DATA_ROW = 6;

export async function exportPapiExcel(picks: Record<number, string>, meta: PapiExcelMeta = {}) {
  const score = papiScore(picks);

  const res = await fetch(templateAsset.url);
  if (!res.ok) throw new Error("Template Excel PAPI Kostick tidak dapat dimuat.");
  const zip = await JSZip.loadAsync(await res.arrayBuffer());
  const before = await snapshotZip(zip);
  const { wbXml, sheets } = await sheetPaths(zip);
  const main = sheets.find((s) => /pola\s*dasar/i.test(s.name)) ?? sheets[0];

  const edits = new Map<string, CellValue>();
  const nama = [meta.candidateName, meta.candidateCode].filter(Boolean).join(" — ") || "-";
  edits.set(`B${DATA_ROW}`, nama);
  for (const { col, scale } of SCALE_COLUMNS) {
    edits.set(`${col}${DATA_ROW}`, score.scales[scale] ?? 0);
  }

  const mainFile = zip.file(main.path);
  if (!mainFile) throw new Error("Sheet 'POLA DASAR' tidak ditemukan pada template.");
  zip.file(main.path, patchSheet(await mainFile.async("string"), edits, true));

  // Sheet 2 & 3 tidak diubah — hanya cache nilainya dibuang agar terisi
  // otomatis dari sheet 1; rumusnya divalidasi tetap identik.
  const formulaBefore = await clearFormulaCache(zip, sheets, main.path);

  forceRecalc(zip, wbXml);
  await assertTemplateIntact(zip, before, main.path, "template PAPI Kostick", formulaBefore);

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    compression: "DEFLATE",
  });
  const safe = (meta.candidateName ?? "kandidat").replace(/[^\w\-]+/g, "_");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `PAPI_${safe}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);

  return {
    answered: score.answered,
    total: score.total,
    highest: score.highest,
    scales: score.scales,
  };
}
