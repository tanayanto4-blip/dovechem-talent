import ExcelJS from "exceljs";
import { applyInlineBiodata, type CandidateMeta } from "@/lib/candidate-meta";
import templateAsset from "@/assets/eq-template.xlsx.asset.json";

/**
 * Mengisi template Excel skoring EQ (S-EQ) resmi dengan jawaban kandidat.
 * Kisi soal: nomor 1..50 disusun 5 kolom per baris (baris 11..20).
 *   kolom skor: SA=C, ME=E, MO=G, EM=I, SS=K
 *   baris      : 11 + floor((n-1)/5)
 * Rumus Jumlah (C22,E22,G22,I22,K22) sudah ada di template; hasilnya dihitung
 * ulang di sini dan disimpan sebagai cached value agar langsung terbaca di
 * Excel, LibreOffice, maupun Google Sheets.
 */
export interface EqExcelMeta extends CandidateMeta {}

export interface EqExcelAnswer {
  question_number: number;
  answer: string | number | null | undefined;
}

const COLS = ["C", "E", "G", "I", "K"] as const;
const DIMS = ["SA", "ME", "MO", "EM", "SS"] as const;
const DIM_LABEL: Record<string, string> = {
  SA: "Kesadaran diri",
  ME: "Mengelola emosi",
  MO: "Memotivasi diri sendiri",
  EM: "Empati",
  SS: "Keterampilan Sosial",
};
/** Baris rekap interpretasi (langkah 4) per dimensi. */
const SUMMARY_ROWS: Record<string, number> = { SA: 31, ME: 32, MO: 33, EM: 34, SS: 35 };

function category(total: number): "Kekuatan" | "Perlu perhatian" | "Prioritas Pengembangan" {
  if (total >= 35) return "Kekuatan";
  if (total >= 18) return "Perlu perhatian";
  return "Prioritas Pengembangan";
}

function formulaText(cell: ExcelJS.Cell): string | null {
  const v: any = cell.value;
  if (v && typeof v === "object" && typeof v.formula === "string") return v.formula;
  if (typeof v === "string" && v.startsWith("=")) return v.slice(1);
  return null;
}

export async function exportEqExcel(answers: EqExcelAnswer[], meta: EqExcelMeta = {}) {
  const res = await fetch(templateAsset.url);
  if (!res.ok) throw new Error("Template Excel EQ tidak dapat dimuat.");
  const buf = await res.arrayBuffer();

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];

  // Kosongkan kolom skor lalu isi sesuai jawaban kandidat (skala 1..5)
  for (let n = 1; n <= 50; n++) {
    const col = COLS[(n - 1) % 5];
    const row = 11 + Math.floor((n - 1) / 5);
    ws.getCell(`${col}${row}`).value = null;
  }

  const totals: Record<string, number> = { SA: 0, ME: 0, MO: 0, EM: 0, SS: 0 };
  let filled = 0;
  for (const a of answers) {
    const n = Number(a.question_number);
    if (!Number.isFinite(n) || n < 1 || n > 50) continue;
    const val = Number(String(a.answer ?? "").trim());
    if (!Number.isFinite(val) || val < 1 || val > 5) continue;
    const i = (n - 1) % 5;
    const row = 11 + Math.floor((n - 1) / 5);
    ws.getCell(`${COLS[i]}${row}`).value = val;
    totals[DIMS[i]] += val;
    filled++;
  }

  // Simpan hasil rumus Jumlah sebagai cached value
  COLS.forEach((col, i) => {
    const cell = ws.getCell(`${col}22`);
    const f = formulaText(cell);
    const result = totals[DIMS[i]];
    cell.value = f ? ({ formula: f, result } as ExcelJS.CellFormulaValue) : result;
  });

  // Rekap interpretasi per kompetensi (Kekuatan / Perlu perhatian / Prioritas)
  const summary: Record<string, { total: number; category: string; label: string }> = {};
  for (const d of DIMS) {
    const total = totals[d];
    const cat = category(total);
    summary[d] = { total, category: cat, label: DIM_LABEL[d] };
    const row = SUMMARY_ROWS[d];
    ws.getCell(`E${row}`).value = null;
    ws.getCell(`G${row}`).value = null;
    ws.getCell(`J${row}`).value = null;
    const col = cat === "Kekuatan" ? "E" : cat === "Perlu perhatian" ? "G" : "J";
    ws.getCell(`${col}${row}`).value = "✓";
  }

  // Identitas kandidat
  const nama = [meta.candidateName, meta.candidateCode].filter(Boolean).join(" — ") || "-";
  ws.getCell("B6").value = `Nama : ${nama}`;
  ws.getCell("F6").value = `Jabatan : ${meta.position ?? "-"}`;

  // Biodata kandidat terisi otomatis pada lembar template (tanpa sheet tambahan)
  applyInlineBiodata(ws, meta, {
    startRow: 38,
    labelCol: "B",
    valueCol: "D",
    title: "BIODATA KANDIDAT (PT DOVER CHEMICAL)",
  });

  (wb as any).calcProperties = { ...(wb as any).calcProperties, fullCalcOnLoad: true };

  const out = await wb.xlsx.writeBuffer();
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const safe = (meta.candidateName ?? "kandidat").replace(/[^\w\-]+/g, "_");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `EQ_${safe}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);

  const strongest = DIMS.reduce((best, d) => (totals[d] > totals[best] ? d : best), DIMS[0]);
  return { filled, totals, summary, strongest, valid: filled === 50 };
}
