import JSZip from "jszip";
import templateAsset from "@/assets/test-leadership-part-2.xlsx.asset.json";
import type { CandidateMeta } from "@/lib/candidate-meta";
import { deliverXlsx } from "@/lib/xlsx-deliver";
import { assertTemplateIntact, patchSheet, sheetPaths, snapshotZip } from "@/lib/xlsx-patch";

export const LEADERSHIP_PART2_CODE = "BASIC-LEADERSHIP-2";

const ANSWER_CELLS = ["C7", "C9", "C12", "C14", "C17", "C19"] as const;
const EXPECTED_PROMPTS = [
  "kondisi kerja paling sulit",
  "keputusan paling berani",
  "Masalah operasional",
  "solusi Anda ditolak",
  "rekan kerja yang lebih senior",
  "menolak instruksi karena capek",
] as const;

export interface LeadershipPart2Answer {
  question_number: number;
  answer?: string | null;
}

function readCellText(xml: string, ref: string) {
  const cell = xml.match(new RegExp(`<c\\b[^>]*\\br="${ref}"[^>]*>[\\s\\S]*?<\\/c>`))?.[0] ?? "";
  return [...cell.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
    .map((match) => match[1])
    .join("")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Fill only the identity and answer cells in the original Leadership Part II workbook. */
export async function buildLeadershipPart2Workbook(
  template: ArrayBuffer,
  answers: LeadershipPart2Answer[],
  meta: CandidateMeta = {},
) {
  const zip = await JSZip.loadAsync(template);
  const before = await snapshotZip(zip);
  const { sheets } = await sheetPaths(zip);
  const sheet = sheets.find((item) => item.name.trim().toUpperCase() === "TES 2") ?? sheets[0];
  if (!sheet) throw new Error("Lembar TES 2 tidak ditemukan pada file asli.");

  const sheetFile = zip.file(sheet.path);
  if (!sheetFile) throw new Error("Isi lembar TES 2 tidak dapat dibaca.");
  const original = await sheetFile.async("string");
  const promptCells = ["C6", "C8", "C11", "C13", "C16", "C18"];
  const validTemplate =
    readCellText(original, "B4").includes("TES LEADERSHIP PART - II") &&
    promptCells.every((cell, index) => readCellText(original, cell).includes(EXPECTED_PROMPTS[index]));
  if (!validTemplate) {
    throw new Error("Susunan file Leadership Part II berubah; jawaban tidak dapat ditempatkan dengan aman.");
  }

  const byNumber = new Map(
    answers.map((answer) => [Number(answer.question_number), String(answer.answer ?? "").trim()]),
  );
  const edits = new Map<string, string | null>();
  edits.set("C1", meta.candidateName?.trim() || "-");
  edits.set(
    "C2",
    (meta.finishedAt ? new Date(meta.finishedAt) : new Date()).toLocaleDateString("id-ID"),
  );
  ANSWER_CELLS.forEach((cell, index) => edits.set(cell, byNumber.get(index + 1) || null));

  zip.file(sheet.path, patchSheet(original, edits, false));
  await assertTemplateIntact(zip, before, sheet.path, "file Leadership Part II");

  return zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    compression: "DEFLATE",
  });
}

export async function exportLeadershipPart2Excel(
  answers: LeadershipPart2Answer[],
  meta: CandidateMeta = {},
) {
  const response = await fetch(templateAsset.url);
  if (!response.ok) throw new Error("File Leadership Part II tidak dapat dimuat.");
  const blob = await buildLeadershipPart2Workbook(await response.arrayBuffer(), answers, meta);
  const safeName = (meta.candidateName ?? "kandidat").replace(/[^\w-]+/g, "_");
  deliverXlsx(blob, `Leadership_Part_II_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  return { answered: answers.filter((item) => String(item.answer ?? "").trim()).length, total: 6 };
}