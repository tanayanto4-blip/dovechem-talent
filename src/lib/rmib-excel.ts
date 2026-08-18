import JSZip from "jszip";
import type { CandidateMeta } from "@/lib/candidate-meta";
import { RMIB_GROUPS, parseRmibAnswer, rmibScore } from "@/lib/rmib-key";
import templateAsset from "@/assets/rmib-template.xlsx.asset.json";
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
 * Mengisi template Excel RMIB dengan peringkat kandidat.
 *
 * Template tidak diubah sama sekali — hanya kolom putih tabel pemeriksaan yang
 * diisi: kolom C..K = kelompok A..I, baris 9..20 = urutan pekerjaan ke-1..12
 * pada kelompok tersebut. Seluruh rumus (Total, Ranking, VLOOKUP minat
 * tertinggi) tetap milik template dan dihitung ulang otomatis saat dibuka.
 */
const FIRST_COL = "C".charCodeAt(0);
const FIRST_ROW = 9;

export interface RmibExcelMeta extends CandidateMeta {}

export async function exportRmibExcel(
  answersByGroup: Record<string, string>,
  meta: RmibExcelMeta = {},
) {
  const score = rmibScore(answersByGroup);

  const res = await fetch(templateAsset.url);
  if (!res.ok) throw new Error("Template Excel RMIB tidak dapat dimuat.");
  const zip = await JSZip.loadAsync(await res.arrayBuffer());
  const before = await snapshotZip(zip);
  const { wbXml, sheets } = await sheetPaths(zip);
  const main = sheets.find((s) => /rmib/i.test(s.name)) ?? sheets[0];

  const edits = new Map<string, CellValue>();
  const nama = [meta.candidateName, meta.candidateCode].filter(Boolean).join(" — ") || "-";
  edits.set("C6", nama);

  RMIB_GROUPS.forEach((grp, gi) => {
    const raw = answersByGroup[grp.code] ?? answersByGroup[String(gi + 1)] ?? "";
    const ranks = parseRmibAnswer(raw);
    const col = String.fromCharCode(FIRST_COL + gi);
    ranks.forEach((v, ri) => {
      edits.set(`${col}${FIRST_ROW + ri}`, typeof v === "number" ? v : null);
    });
  });

  const mainFile = zip.file(main.path);
  if (!mainFile) throw new Error("Sheet RMIB tidak ditemukan pada template.");
  zip.file(main.path, patchSheet(await mainFile.async("string"), edits, true));

  const formulaBefore = await clearFormulaCache(zip, sheets, main.path);
  forceRecalc(zip, wbXml);
  await assertTemplateIntact(zip, before, main.path, "template RMIB", formulaBefore);

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    compression: "DEFLATE",
  });
  const safe = (meta.candidateName ?? "kandidat").replace(/[^\w\-]+/g, "_");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `RMIB_${safe}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);

  return {
    answeredGroups: score.answeredGroups,
    totalGroups: score.totalGroups,
    top3: score.top3,
    order: score.order,
  };
}
