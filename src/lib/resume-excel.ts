import JSZip from "jszip";
import templateAsset from "@/assets/resume-template.xlsx.asset.json";
import { computeWptScore } from "@/lib/wpt-excel";
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
 * Recruitment Resume (PT Dover Chemical).
 *
 * Baris data pertama template (baris 13) diisi otomatis:
 *   A Name                  <- biodata kandidat
 *   B Date of Pre-Test      <- tanggal test selesai
 *   C Position              <- posisi dilamar
 *   D Department            <- departemen (dari posisi bila tidak diisi)
 *   E Education             <- pendidikan - jurusan - sekolah/universitas
 *   F Age                   <- usia
 *   G Years of Employment   <- lama bekerja
 *   H Colour Blindness      <- "B : x" / "S : y" dari test Ishihara
 *   I General Intelegence   <- IQ dari test WPT
 *   J Ability to Work under Pressure <- total hasil test Pauli (dikerjakan+benar)
 * Sheet, rumus, grafik, dan layout template tidak diubah.
 */

const ROW = 13;

export interface ResumeCandidate {
  full_name?: string | null;
  position_applied?: string | null;
  department?: string | null;
  education?: string | null;
  major?: string | null;
  school_name?: string | null;
  age?: number | string | null;
  birth_date?: string | null;
  work_experience?: string | null;
}

export interface ResumeInput {
  candidate: ResumeCandidate;
  /** Tanggal pelaksanaan test (ISO). */
  testDate?: string | null;
  /** Hasil test buta warna (Ishihara). */
  ishihara?: { correct?: number | null; wrong?: number | null } | null;
  /** Jawaban mentah test WPT untuk menghitung IQ. */
  wptAnswers?: Array<{ question_number: number; answer: any }> | null;
  /** Hasil test Pauli. */
  pauli?: { attempted?: number | null; correct?: number | null } | null;
}

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function fmtDate(v?: string | null) {
  const d = v ? new Date(v) : new Date();
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function ageOf(c: ResumeCandidate): CellValue {
  if (c.age != null && c.age !== "") return Number(c.age) || String(c.age);
  if (!c.birth_date) return "-";
  const d = new Date(c.birth_date);
  if (Number.isNaN(d.getTime())) return "-";
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a >= 0 && a < 120 ? a : "-";
}

function educationOf(c: ResumeCandidate) {
  const parts = [c.education, c.major, c.school_name].map((v) => (v ?? "").toString().trim()).filter(Boolean);
  return parts.length ? parts.join(" - ") : "-";
}

function employmentOf(c: ResumeCandidate): CellValue {
  const raw = (c.work_experience ?? "").toString().trim();
  if (!raw) return "-";
  if (/belum/i.test(raw)) return 0;
  const n = Number(raw.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && raw.match(/\d/) ? n : raw;
}

export async function exportResumeExcel(input: ResumeInput) {
  const c = input.candidate ?? {};

  let iq: CellValue = "-";
  if (input.wptAnswers?.length) {
    try {
      const wpt = await computeWptScore(input.wptAnswers);
      if (wpt.valid) iq = wpt.iq;
    } catch {
      /* IQ dibiarkan kosong bila template WPT gagal dimuat */
    }
  }

  const ish = input.ishihara;
  const colour: CellValue = ish && (ish.correct != null || ish.wrong != null)
    ? `B : ${ish.correct ?? 0}\nS : ${ish.wrong ?? 0}`
    : "-";

  const pauli = input.pauli;
  const pauliTotal: CellValue =
    pauli && (pauli.attempted != null || pauli.correct != null)
      ? (Number(pauli.attempted ?? 0) + Number(pauli.correct ?? 0))
      : "-";

  const res = await fetch(templateAsset.url);
  if (!res.ok) throw new Error("Template Excel Recruitment Resume tidak dapat dimuat.");
  const zip = await JSZip.loadAsync(await res.arrayBuffer());
  const before = await snapshotZip(zip);
  const { wbXml, sheets } = await sheetPaths(zip);
  const main = sheets.find((s) => /^rec/i.test(s.name)) ?? sheets[0];

  const edits = new Map<string, CellValue>([
    [`A${ROW}`, c.full_name ?? "-"],
    [`B${ROW}`, fmtDate(input.testDate)],
    [`C${ROW}`, c.position_applied ?? "-"],
    [`D${ROW}`, c.department ?? c.position_applied ?? "-"],
    [`E${ROW}`, educationOf(c)],
    [`F${ROW}`, ageOf(c)],
    [`G${ROW}`, employmentOf(c)],
    [`H${ROW}`, colour],
    [`I${ROW}`, iq],
    [`J${ROW}`, pauliTotal],
  ]);

  const mainFile = zip.file(main.path);
  if (!mainFile) throw new Error("Sheet resume tidak ditemukan pada template.");
  zip.file(main.path, patchSheet(await mainFile.async("string"), edits, true));

  const formulaBefore = await clearFormulaCache(zip, sheets, main.path);
  forceRecalc(zip, wbXml);
  await assertTemplateIntact(zip, before, main.path, "template Recruitment Resume", formulaBefore);

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    compression: "DEFLATE",
  });
  const safe = (c.full_name ?? "kandidat").replace(/[^\w\-]+/g, "_");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Resume_${safe}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);

  return { iq, colour, pauliTotal };
}
