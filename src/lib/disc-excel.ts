import ExcelJS from "exceljs";
import { applyBiodataSheet, type CandidateMeta } from "@/lib/candidate-meta";
import templateAsset from "@/assets/disc-template.xlsx.asset.json";

/**
 * Mengisi template Excel skoring DISC resmi dengan jawaban kandidat.
 * Kolom [P] = PALING menggambarkan (M pada aplikasi)
 * Kolom [K] = PALING TIDAK menggambarkan (L pada aplikasi)
 *
 * Tata letak sheet "DISC Test":
 *   - Kelompok 1-8   -> kolom P = C, K = E
 *   - Kelompok 9-16  -> kolom P = J, K = L
 *   - Kelompok 17-24 -> kolom P = Q, K = S
 *   - Baris awal tiap kelompok: 8, 14, 20, 26, 32, 38, 44, 50 (4 pernyataan)
 *
 * Rumus bawaan template (IF/COUNTIF/VLOOKUP di sheet Input & Result)
 * dipertahankan; nilai turunan pada sheet "DISC Test" dihitung ulang sebagai
 * cached value dan workbook ditandai fullCalcOnLoad agar grafik serta hasil
 * akhir langsung terbaca saat file dibuka.
 */
export interface DiscExcelMeta extends CandidateMeta {}

export interface DiscExcelAnswer {
  question_number: number;
  /** JSON string {"most":"D","least":"S"} atau objek langsung */
  answer: string | { most?: string; least?: string } | null | undefined;
}

const OPTION_KEYS = ["D", "I", "S", "C"];
const BLOCK_ROWS = [8, 14, 20, 26, 32, 38, 44, 50];
const COLUMN_SETS: Array<{ p: string; k: string }> = [
  { p: "C", k: "E" },
  { p: "J", k: "L" },
  { p: "Q", k: "S" },
];

function parseAnswer(raw: DiscExcelAnswer["answer"]): { most?: string; least?: string } {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

function optionIndex(key: string | undefined): number {
  if (!key) return -1;
  const i = OPTION_KEYS.indexOf(String(key).trim().toUpperCase());
  if (i >= 0) return i;
  const n = Number(key);
  return Number.isFinite(n) && n >= 1 && n <= 4 ? n - 1 : -1;
}

function setCached(ws: ExcelJS.Worksheet, addr: string, result: any) {
  const cell = ws.getCell(addr);
  const v: any = cell.value;
  const formula =
    v && typeof v === "object" && typeof v.formula === "string"
      ? v.formula
      : typeof v === "string" && v.startsWith("=")
        ? v.slice(1)
        : null;
  cell.value = formula ? ({ formula, result } as ExcelJS.CellFormulaValue) : result;
}

export async function exportDiscExcel(answers: DiscExcelAnswer[], meta: DiscExcelMeta = {}) {
  const res = await fetch(templateAsset.url);
  if (!res.ok) throw new Error("Template Excel DISC tidak dapat dimuat.");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await res.arrayBuffer());
  const ws = wb.worksheets.find((w) => /disc\s*test/i.test(w.name)) ?? wb.worksheets[0];

  // Kosongkan seluruh kolom P/K terlebih dahulu
  for (let g = 1; g <= 24; g++) {
    const set = COLUMN_SETS[Math.floor((g - 1) / 8)];
    const row0 = BLOCK_ROWS[(g - 1) % 8];
    for (let i = 0; i < 4; i++) {
      ws.getCell(`${set.p}${row0 + i}`).value = null;
      ws.getCell(`${set.k}${row0 + i}`).value = null;
    }
  }

  let filled = 0;
  const picks = new Map<number, { most: number; least: number }>();
  for (const a of answers) {
    const g = Number(a.question_number);
    if (!Number.isFinite(g) || g < 1 || g > 24) continue;
    const { most, least } = parseAnswer(a.answer);
    const mi = optionIndex(most);
    const li = optionIndex(least);
    if (mi < 0 && li < 0) continue;
    const set = COLUMN_SETS[Math.floor((g - 1) / 8)];
    const row0 = BLOCK_ROWS[(g - 1) % 8];
    if (mi >= 0) ws.getCell(`${set.p}${row0 + mi}`).value = "x";
    if (li >= 0) ws.getCell(`${set.k}${row0 + li}`).value = "x";
    picks.set(g, { most: mi, least: li });
    if (mi >= 0 && li >= 0) filled++;
  }

  // Hitung ulang nilai turunan pada sheet "DISC Test"
  for (let g = 1; g <= 24; g++) {
    const setIdx = Math.floor((g - 1) / 8);
    const set = COLUMN_SETS[setIdx];
    const row0 = BLOCK_ROWS[(g - 1) % 8];
    const sumRow = row0 + 4;
    // kolom skor berada tepat di kanan kolom P dan K
    const pScore = String.fromCharCode(set.p.charCodeAt(0) + 1); // C->D, J->K, Q->R
    const kScore = String.fromCharCode(set.k.charCodeAt(0) + 1); // E->F, L->M, S->T
    const pick = picks.get(g);
    for (let i = 0; i < 4; i++) {
      setCached(ws, `${pScore}${row0 + i}`, pick && pick.most === i ? i + 1 : 0);
      setCached(ws, `${kScore}${row0 + i}`, pick && pick.least === i ? i + 1 : 0);
    }
    setCached(ws, `${set.p}${sumRow}`, pick && pick.most >= 0 ? 1 : 0);
    setCached(ws, `${pScore}${sumRow}`, pick && pick.most >= 0 ? pick.most + 1 : 0);
    setCached(ws, `${set.k}${sumRow}`, pick && pick.least >= 0 ? 1 : 0);
    setCached(ws, `${kScore}${sumRow}`, pick && pick.least >= 0 ? pick.least + 1 : 0);
  }
  for (const row0 of BLOCK_ROWS) {
    const sumRow = row0 + 4;
    let n = 0;
    for (let s = 0; s < 3; s++) {
      const g = s * 8 + BLOCK_ROWS.indexOf(row0) + 1;
      const pick = picks.get(g);
      if (pick?.most !== undefined && pick.most >= 0) n++;
      if (pick?.least !== undefined && pick.least >= 0) n++;
    }
    setCached(ws, `W${sumRow}`, n);
  }

  // Identitas kandidat
  const nama = [meta.candidateName, meta.candidateCode].filter(Boolean).join(" — ") || "-";
  ws.getCell("G2").value = nama;
  if (meta.age != null && meta.age !== "") ws.getCell("G3").value = meta.age;
  if (meta.gender) ws.getCell("G4").value = meta.gender;
  ws.getCell("G5").value = meta.finishedAt
    ? new Date(meta.finishedAt).toLocaleDateString("id-ID")
    : new Date().toLocaleDateString("id-ID");

  // Buang cached value lama pada sheet turunan (Input, Result, dll) agar
  // Excel/LibreOffice/Sheets menghitung ulang rumusnya saat file dibuka.
  for (const sheet of wb.worksheets) {
    if (sheet === ws) continue;
    sheet.eachRow({ includeEmpty: false }, (row) =>
      row.eachCell({ includeEmpty: false }, (cell) => {
        const v: any = cell.value;
        if (v && typeof v === "object" && typeof v.formula === "string") {
          cell.value = { formula: v.formula, result: undefined } as ExcelJS.CellFormulaValue;
        } else if (v && typeof v === "object" && typeof v.sharedFormula === "string") {
          cell.value = { sharedFormula: v.sharedFormula, result: undefined } as any;
        }
      }),
    );
  }

  // Biodata kandidat terisi otomatis dari data yang sudah tersimpan
  applyBiodataSheet(wb, meta, "DISC");

  (wb as any).calcProperties = { ...(wb as any).calcProperties, fullCalcOnLoad: true };


  const out = await wb.xlsx.writeBuffer();
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const safe = (meta.candidateName ?? "kandidat").replace(/[^\w\-]+/g, "_");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `DISC_${safe}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);

  return { filled, total: 24, valid: filled === 24 };
}
