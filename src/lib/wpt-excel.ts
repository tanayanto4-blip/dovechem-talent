import { deliverXlsx } from "@/lib/xlsx-deliver";
import ExcelJS from "exceljs";
import { applyInlineBiodata, type CandidateMeta } from "@/lib/candidate-meta";
import templateAsset from "@/assets/wpt-template.xlsx.asset.json";

/**
 * Mengisi template Excel skoring WPT (Wonderlic Personnel Test - Form A) resmi
 * dengan jawaban kandidat.
 *   - Jawaban soal n  -> sel C(6+n)   (C7..C56)
 *   - Rumus penilaian -> C137..C186, total benar C187
 *   - IQ              -> VLOOKUP(total, H137:I186)
 * Rumus asli template tetap dipertahankan; hasilnya dihitung ulang di sini dan
 * disimpan sebagai cached value agar langsung terbaca di Excel, LibreOffice,
 * maupun Google Sheets tanpa perlu menekan apa pun.
 */
export interface WptExcelMeta extends CandidateMeta {}

export interface WptExcelAnswer {
  question_number: number;
  answer: string | number | null | undefined;
}

const FIRST_ANSWER_ROW = 7; // soal 1
const SCORE_START = 137; // baris rumus soal 1
const SCORE_END = 186; // baris rumus soal 50

function formulaText(cell: ExcelJS.Cell): string | null {
  const v: any = cell.value;
  if (v && typeof v === "object" && typeof v.formula === "string") return v.formula;
  if (typeof v === "string" && v.startsWith("=")) return v.slice(1);
  return null;
}

function cellPlainValue(cell: ExcelJS.Cell): any {
  const v: any = cell.value;
  if (v && typeof v === "object" && "result" in v) return v.result;
  if (v && typeof v === "object" && "richText" in v)
    return v.richText.map((t: any) => t.text).join("");
  return v;
}

function toNumber(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const s = String(raw ?? "").trim();
  if (!s) return null;
  // "2,5" (desimal koma) -> 2.5 ; tapi "1,2,4,5" (daftar) bukan angka
  const norm = /^-?\d+,\d+$/.test(s) ? s.replace(",", ".") : s;
  if (!/^-?\d*\.?\d+$/.test(norm)) return null;
  const n = Number(norm);
  return Number.isFinite(n) ? n : null;
}

function normText(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Mengurai token sisi kanan pembanding pada rumus IF template. */
function tokenValue(token: string, ws: ExcelJS.Worksheet): unknown {
  const t = token.trim();
  if (/^"[\s\S]*"$/.test(t)) return t.slice(1, -1).replace(/""/g, '"');
  if (/^\$?[A-Z]{1,2}\$?\d{1,4}$/i.test(t)) return cellPlainValue(ws.getCell(t.replace(/\$/g, "")));
  const frac = t.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const n = Number(t);
  return Number.isFinite(n) && t !== "" ? n : t;
}

/** Membandingkan jawaban kandidat dengan salah satu nilai yang diterima. */
function matches(answer: string, accepted: unknown): boolean {
  if (accepted === null || accepted === undefined || accepted === "") return false;
  const a = toNumber(answer);
  const b = toNumber(accepted);
  if (a !== null && b !== null) return Math.abs(a - b) < 1e-6;
  const at = normText(answer);
  if (!at) return false;
  const bt = normText(accepted);
  if (!bt) return false;
  if (at === bt) return true;
  // Kunci berupa daftar alternatif, mis. "T,N,tidak,No"
  if (bt.includes(",")) {
    const parts = bt.split(",").map((p) => p.trim());
    if (parts.length > 1 && parts.includes(at)) return true;
  }
  return false;
}

function classifyIq(iq: number): string {
  if (iq <= 65) return "Mentally Defective";
  if (iq <= 79) return "Borderline Defective";
  if (iq <= 90) return "Low Average";
  if (iq <= 110) return "Average";
  if (iq <= 120) return "High Average";
  if (iq <= 130) return "Superior";
  return "Very Superior";
}

/**
 * Menghitung skor & IQ WPT dari jawaban kandidat memakai kunci + tabel konversi
 * pada template resmi. Mengembalikan workbook/sheet yang sudah terisi supaya
 * bisa dipakai ulang oleh exporter Excel maupun resume rekrutmen.
 */
export async function computeWptScore(answers: WptExcelAnswer[]) {
  const res = await fetch(templateAsset.url);
  if (!res.ok) throw new Error("Template Excel WPT tidak dapat dimuat.");
  const buf = await res.arrayBuffer();

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  const ws = wb.worksheets.find((w) => /wpt/i.test(w.name)) ?? wb.worksheets[0];

  // Kosongkan kolom jawaban testee lalu isi sesuai jawaban kandidat
  const given = new Map<number, string>();
  for (let n = 1; n <= 50; n++) ws.getCell(`C${FIRST_ANSWER_ROW + n - 1}`).value = null;

  let filled = 0;
  for (const a of answers) {
    const n = Number(a.question_number);
    if (!Number.isFinite(n) || n < 1 || n > 50) continue;
    const raw = String(a.answer ?? "").trim();
    if (!raw) continue;
    const num = toNumber(raw);
    ws.getCell(`C${FIRST_ANSWER_ROW + n - 1}`).value = num !== null ? num : raw;
    given.set(n, raw);
    filled++;
  }

  // Hitung ulang rumus skor per soal (C137:C186) sebagai cached value
  let total = 0;
  for (let row = SCORE_START; row <= SCORE_END; row++) {
    const n = row - SCORE_START + 1;
    const cell = ws.getCell(`C${row}`);
    const f = formulaText(cell);
    const answer = given.get(n) ?? "";
    let score = 0;
    if (answer) {
      const accepted: unknown[] = [];
      if (f) {
        const re = /C\d{1,3}\s*=\s*("(?:[^"]|"")*"|[^,()]+)/gi;
        let m: RegExpExecArray | null;
        while ((m = re.exec(f))) accepted.push(tokenValue(m[1], ws));
      }
      if (!accepted.length) accepted.push(cellPlainValue(ws.getCell(`B${row}`)));
      score = accepted.some((acc) => matches(answer, acc)) ? 1 : 0;
    }
    total += score;
    cell.value = f ? ({ formula: f, result: score } as ExcelJS.CellFormulaValue) : score;
  }

  const setCached = (addr: string, result: any) => {
    const cell = ws.getCell(addr);
    const f = formulaText(cell);
    cell.value = f ? ({ formula: f, result } as ExcelJS.CellFormulaValue) : result;
  };

  setCached(`C${SCORE_END + 1}`, total); // C187 total benar

  // Kolom "Terjawab" (E137:E186) — E137 memeriksa soal 50, menurun sampai soal 1
  for (let row = SCORE_START; row <= SCORE_END; row++) {
    const n = 50 - (row - SCORE_START);
    setCached(`E${row}`, given.has(n) ? 1 : 0);
  }
  const lastAnswered = Array.from(given.keys()).reduce((m, n) => (n > m ? n : m), 0);
  setCached("E188", lastAnswered ? 51 - lastAnswered : 51);
  setCached("E189", lastAnswered);

  // Tabel konversi RS -> IQ (H137:I186), VLOOKUP approximate match
  let iq = 0;
  for (let row = SCORE_START; row <= SCORE_END; row++) {
    const rs = toNumber(cellPlainValue(ws.getCell(`H${row}`)));
    const val = toNumber(cellPlainValue(ws.getCell(`I${row}`)));
    if (rs === null || val === null) continue;
    if (rs <= total) iq = val;
  }
  const category = classifyIq(iq);

  setCached("F7", lastAnswered); // pertanyaan terakhir terjawab
  setCached("F8", 50 - total); // salah atau ditinggalkan
  setCached("F10", total);
  setCached("F11", iq);
  setCached("F12", category);

  return { wb, ws, filled, total, iq, category, lastAnswered, valid: filled > 0 };
}

export async function exportWptExcel(answers: WptExcelAnswer[], meta: WptExcelMeta = {}) {
  const { wb, ws, filled, total, iq, category, lastAnswered } = await computeWptScore(answers);

  // Identitas kandidat
  const nama = [meta.candidateName, meta.candidateCode].filter(Boolean).join(" — ") || "-";
  ws.getCell("B5").value = `Nama : ${nama}   |   Jabatan : ${meta.position ?? "-"}`;

  // Biodata kandidat terisi otomatis pada lembar template (tanpa sheet tambahan)
  applyInlineBiodata(ws, meta, {
    startRow: 191,
    labelCol: "B",
    valueCol: "C",
    title: "BIODATA KANDIDAT (PT DOVER CHEMICAL)",
  });

  (wb as any).calcProperties = { ...(wb as any).calcProperties, fullCalcOnLoad: true };

  const out = await wb.xlsx.writeBuffer();
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const safe = (meta.candidateName ?? "kandidat").replace(/[^\w\-]+/g, "_");
  deliverXlsx(blob, `WPT_${safe}_${new Date().toISOString().slice(0, 10)}.xlsx`);

  return { filled, total, iq, category, lastAnswered, valid: filled > 0 };
}
