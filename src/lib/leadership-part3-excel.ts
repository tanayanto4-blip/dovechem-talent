import JSZip from "jszip";
import templateAsset from "@/assets/test-leadership-part-3.xlsx.asset.json";
import type { CandidateMeta } from "@/lib/candidate-meta";
import { fmtDate } from "@/lib/candidate-meta";
import { deliverXlsx } from "@/lib/xlsx-deliver";
import { assertTemplateIntact, patchSheet, sheetPaths, snapshotZip } from "@/lib/xlsx-patch";

export const LEADERSHIP_PART3_CODE = "BASIC-LEADERSHIP-3";
export const LEADERSHIP_PART3_TYPE = "leadership_likert";

const OPTION_COLUMN: Record<string, string> = {
  "5": "D",
  "4": "E",
  "3": "F",
  "2": "G",
  "1": "H",
};

export interface LeadershipPart3Answer {
  question_number: number;
  answer?: string | null;
}

function decodeXml(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function readSharedStrings(xml: string) {
  return [...xml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map((item) =>
    [...item[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
      .map((part) => decodeXml(part[1]))
      .join(""),
  );
}

function readCellText(xml: string, ref: string, sharedStrings: string[]) {
  const cell = xml.match(new RegExp(`<c\\b[^>]*\\br="${ref}"[^>]*>[\\s\\S]*?<\\/c>`))?.[0] ?? "";
  if (/\bt="s"/.test(cell)) {
    const index = Number(cell.match(/<v>(\d+)<\/v>/)?.[1]);
    return Number.isInteger(index) ? (sharedStrings[index] ?? "") : "";
  }
  return decodeXml(
    [...cell.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((match) => match[1]).join(""),
  );
}

/** Places one checkmark per answered row while preserving the employer workbook package. */
export async function buildLeadershipPart3Workbook(
  template: ArrayBuffer,
  answers: LeadershipPart3Answer[],
  meta: CandidateMeta = {},
) {
  const zip = await JSZip.loadAsync(template);
  const before = await snapshotZip(zip);
  const { sheets } = await sheetPaths(zip);
  const sheet = sheets.find((item) => item.name.trim().toUpperCase() === "TES 1") ?? sheets[0];
  if (!sheet) throw new Error("Lembar TES 1 tidak ditemukan pada file asli.");
  const sheetFile = zip.file(sheet.path);
  if (!sheetFile) throw new Error("Isi lembar TES 1 tidak dapat dibaca.");

  const original = await sheetFile.async("string");
  const sharedFile = zip.file("xl/sharedStrings.xml");
  const sharedStrings = sharedFile ? readSharedStrings(await sharedFile.async("string")) : [];
  const templateValid =
    readCellText(original, "B9", sharedStrings) === "Statement" &&
    readCellText(original, "D9", sharedStrings) === "Strongly Agree" &&
    readCellText(original, "H9", sharedStrings) === "Strongly Disagree" &&
    readCellText(original, "B10", sharedStrings).includes("develop people’s skills") &&
    readCellText(original, "B39", sharedStrings).includes("seeing my team achieve");
  if (!templateValid) {
    throw new Error("Susunan file Leadership Test 3 berubah; centang tidak dapat ditempatkan dengan aman.");
  }

  const byNumber = new Map(
    answers.map((answer) => [Number(answer.question_number), String(answer.answer ?? "").trim()]),
  );
  const edits = new Map<string, string | null>();
  edits.set("D2", meta.candidateName?.trim() || "-");
  edits.set("D3", meta.education?.trim() || "-");
  edits.set("D4", meta.position?.trim() || "-");
  edits.set("D6", fmtDate(meta.finishedAt ?? new Date().toISOString()));

  for (let number = 1; number <= 30; number += 1) {
    const row = number + 9;
    for (const column of ["D", "E", "F", "G", "H"]) edits.set(`${column}${row}`, null);
    const selectedColumn = OPTION_COLUMN[byNumber.get(number) ?? ""];
    if (selectedColumn) edits.set(`${selectedColumn}${row}`, "✓");
  }

  zip.file(sheet.path, patchSheet(original, edits, false));
  await assertTemplateIntact(zip, before, sheet.path, "file Leadership Test 3");
  return zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    compression: "DEFLATE",
  });
}

export async function exportLeadershipPart3Excel(
  answers: LeadershipPart3Answer[],
  meta: CandidateMeta = {},
) {
  const response = await fetch(templateAsset.url);
  if (!response.ok) throw new Error("File Leadership Test 3 tidak dapat dimuat.");
  const blob = await buildLeadershipPart3Workbook(await response.arrayBuffer(), answers, meta);
  const safeName = (meta.candidateName ?? "kandidat").replace(/[^\w-]+/g, "_");
  deliverXlsx(blob, `Leadership_Test_3_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  return { answered: answers.filter((item) => OPTION_COLUMN[String(item.answer ?? "").trim()]).length, total: 30 };
}