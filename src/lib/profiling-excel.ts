import JSZip from "jszip";
import templateAsset from "@/assets/profiling-template.xlsx.asset.json";
import { computeMbtiScores } from "@/lib/mbti-excel";
import { getMbtiDescription } from "@/lib/mbti-descriptions";
import { computeWptScore } from "@/lib/wpt-excel";
import { computeDiscScores } from "@/lib/disc-score";
import { getDiscDescription } from "@/lib/disc-descriptions";
import {
  type CellValue,
  assertTemplateIntact,
  clearFormulaCache,
  forceRecalc,
  patchSheet,
  sheetPaths,
  snapshotZip,
} from "@/lib/xlsx-patch";

const PAULI_QUALIFIED_MIN = 2300;

/**
 * Profiling (Key Background Review) PT Dover Chemical.
 *
 * Template dipakai APA ADANYA — layout, gaya, dan seluruh rumus tidak diubah.
 * Sistem hanya mengisi sel data pada sheet PROFILING:
 *   I6  Nama            I7 Usia          I8 Pendidikan
 *   I9  Posisi/Depart   I10 Tgl. Pemeriksaan
 *   D27:E30  Persentase MBTI (I/E, S/N, T/F, J/P) dari hasil test MBTI
 *   D31 IQ SCORE (WPT)  E31 Kategori IQ  F31 QUALIFIED / UNQUALIFIED (>=102)
 * Sel kategori MBTI (C33:F33) tetap memakai rumus asli template.
 */

export interface ProfilingCandidate {
  full_name?: string | null;
  age?: number | string | null;
  birth_date?: string | null;
  education?: string | null;
  major?: string | null;
  school_name?: string | null;
  position_applied?: string | null;
  department?: string | null;
}

export interface ProfilingInput {
  candidate: ProfilingCandidate;
  testDate?: string | null;
  /** Jawaban mentah MBTI (A/B) untuk menghitung persentase dimensi. */
  mbtiAnswers?: Array<{ question_number: number; answer: any }> | null;
  /** Jawaban mentah WPT untuk menghitung IQ dan kategorinya. */
  wptAnswers?: Array<{ question_number: number; answer: any }> | null;
  /** Jawaban mentah DISC untuk mengisi SUMMARY PERSONALITY BACKGROUND. */
  discAnswers?: Array<{ question_number: number; answer: any }> | null;
  /** Hasil test Pauli: jumlah jawaban benar untuk menentukan qualified/unqualified. */
  pauli?: { correct?: number | null } | null;
}

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function fmtDate(v?: string | null) {
  const d = v ? new Date(v) : new Date();
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function ageOf(c: ProfilingCandidate): string {
  if (c.age != null && c.age !== "") return `${c.age} th`;
  if (!c.birth_date) return "-";
  const d = new Date(c.birth_date);
  if (Number.isNaN(d.getTime())) return "-";
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a >= 0 && a < 120 ? `${a} th` : "-";
}

function educationOf(c: ProfilingCandidate) {
  const left = [c.education, c.major].map((v) => (v ?? "").toString().trim()).filter(Boolean);
  const school = (c.school_name ?? "").toString().trim();
  const base = left.join(" ");
  if (base && school) return `${base} - ${school}`;
  return base || school || "-";
}

export async function exportProfilingExcel(input: ProfilingInput) {
  const c = input.candidate ?? {};

  // MBTI -> persentase tiap dimensi (0..1, format persen mengikuti template)
  let mbti: Record<string, number> | null = null;
  let mbtiType: string | null = null;
  if (input.mbtiAnswers?.length) {
    try {
      const r = await computeMbtiScores(input.mbtiAnswers);
      if (r.filled > 0) {
        mbti = r.scores;
        mbtiType = r.typeLetters.join("");
      }
    } catch {
      /* persentase MBTI dilewati bila template MBTI gagal dimuat */
    }
  }

  // WPT -> IQ + kategori (Average / Low Average / dst) + status kelulusan
  let iq: number | null = null;
  let category: string | null = null;
  if (input.wptAnswers?.length) {
    try {
      const w = await computeWptScore(input.wptAnswers);
      if (w.valid) {
        iq = w.iq;
        category = w.category;
      }
    } catch {
      /* IQ dilewati bila template WPT gagal dimuat */
    }
  }

  // DISC -> tipe dominan (total terbesar Line 3 pada sheet Result template)
  let discType: string | null = null;
  if (input.discAnswers?.length) {
    const d = computeDiscScores(input.discAnswers);
    if (d.valid) discType = d.type;
  }

  // Pauli -> jumlah jawaban benar untuk status qualified/unqualified.
  const pauliCorrect: number | null =
    input.pauli?.correct != null ? Number(input.pauli.correct) : null;

  const res = await fetch(templateAsset.url);
  if (!res.ok) throw new Error("Template Excel Profiling tidak dapat dimuat.");
  const zip = await JSZip.loadAsync(await res.arrayBuffer());
  const before = await snapshotZip(zip);
  const { wbXml, sheets } = await sheetPaths(zip);
  const main = sheets.find((s) => /^profiling$/i.test(s.name.trim())) ?? sheets[0];

  const posisi = [c.position_applied, c.department].filter(Boolean).join(" / ") || "-";
  const edits = new Map<string, CellValue>([
    ["I6", `: ${c.full_name ?? "-"}`],
    ["I7", `: ${ageOf(c)}`],
    ["I8", `: ${educationOf(c)}`],
    ["I9", `: ${posisi}`],
    ["I10", `: ${fmtDate(input.testDate)}`],
  ]);

  if (mbti) {
    const dims: Array<[number, string, string]> = [
      [27, "I", "E"],
      [28, "S", "N"],
      [29, "T", "F"],
      [30, "J", "P"],
    ];
    for (const [row, left, right] of dims) {
      edits.set(`D${row}`, Number(mbti[left] ?? 0));
      edits.set(`E${row}`, Number(mbti[right] ?? 0));
    }
  }

  // Keterangan tipe MBTI pada kolom kanan (G26 judul, G27:G31 poin, G33 ringkasan)
  const desc = getMbtiDescription(mbtiType);
  if (desc) {
    edits.set("G26", desc.title);
    for (let i = 0; i < 5; i++) edits.set(`G${27 + i}`, desc.bullets[i] ?? "");
    edits.set("G33", desc.summary);
  }

  // SUMMARY PERSONALITY BACKGROUND (B14 judul, B15:B17 uraian, B20:B23 perlakuan)
  const discDesc = getDiscDescription(discType);
  if (discDesc) {
    edits.set("B14", discDesc.title);
    for (let i = 0; i < 3; i++) edits.set(`B${15 + i}`, discDesc.paragraphs[i] ?? "");
    edits.set("B19", discDesc.treatmentHeader);
    const t = discDesc.treatments;
    for (let i = 0; i < 4; i++) {
      const val = i === 3 ? t.slice(3).join("\n") : (t[i] ?? "");
      edits.set(`B${20 + i}`, val);
    }
  }

  if (iq !== null) {
    edits.set("D31", iq);
    edits.set("E31", ` ${(category ?? "").toUpperCase()}`);
    edits.set("F31", iq >= QUALIFIED_MIN ? "QUALIFIED" : "UNQUALIFIED");
  }

  const mainFile = zip.file(main.path);
  if (!mainFile) throw new Error("Sheet PROFILING tidak ditemukan pada template.");
  zip.file(main.path, patchSheet(await mainFile.async("string"), edits, true));

  const formulaBefore = await clearFormulaCache(zip, sheets, main.path);
  forceRecalc(zip, wbXml);
  await assertTemplateIntact(zip, before, main.path, "template Profiling", formulaBefore);

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    compression: "DEFLATE",
  });
  const safe = (c.full_name ?? "kandidat").replace(/[^\w\-]+/g, "_");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Profiling_${safe}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);

  return {
    iq,
    category,
    status: iq === null ? null : iq >= QUALIFIED_MIN ? "QUALIFIED" : "UNQUALIFIED",
    mbti,
    disc: discType,
  };
}
