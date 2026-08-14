import ExcelJS from "exceljs";
import { applyInlineBiodata, type CandidateMeta } from "@/lib/candidate-meta";
import templateAsset from "@/assets/mbti-template.xlsx.asset.json";

/**
 * Mengisi template Excel skoring MBTI (S-MBTI) resmi dengan jawaban kandidat.
 * Baris soal n berada di baris Excel n + 3.
 * Jawaban "A" -> kolom D bernilai 1, jawaban "B" -> kolom E bernilai 1.
 * Rumus skoring (D68:E71, H68:H71, C74:F74) sudah ada di template. Selain
 * mengaktifkan fullCalcOnLoad, hasil rumus juga dihitung ulang di sini dan
 * disimpan sebagai cached value, sehingga hasil langsung terbaca di Excel,
 * LibreOffice, Google Sheets, maupun saat pratinjau file.
 */
export interface MbtiExcelMeta extends CandidateMeta {}

export interface MbtiExcelAnswer {
  question_number: number;
  answer: string | null | undefined;
}

const DIM_ROWS = [68, 69, 70, 71] as const;
const DIM_LETTERS: Record<number, [string, string]> = {
  68: ["I", "E"],
  69: ["S", "N"],
  70: ["T", "F"],
  71: ["J", "P"],
};

/** Menjumlahkan referensi sel pada rumus "(D5+E8+...)/15" memakai nilai isian. */
function sumFormula(formula: string, values: Map<string, number>) {
  const refs = formula.toUpperCase().match(/\b[DE]\d{1,2}\b/g) ?? [];
  let total = 0;
  for (const ref of refs) total += values.get(ref) ?? 0;
  const div = formula.match(/\/\s*(\d+)/);
  const d = div ? Number(div[1]) : 1;
  return d ? total / d : total;
}

function formulaText(cell: ExcelJS.Cell): string | null {
  const v: any = cell.value;
  if (v && typeof v === "object" && typeof v.formula === "string") return v.formula;
  if (typeof v === "string" && v.startsWith("=")) return v.slice(1);
  return null;
}

export async function exportMbtiExcel(answers: MbtiExcelAnswer[], meta: MbtiExcelMeta = {}) {
  const res = await fetch(templateAsset.url);
  if (!res.ok) throw new Error("Template Excel MBTI tidak dapat dimuat.");
  const buf = await res.arrayBuffer();

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];

  // Kosongkan kolom isian lalu isi sesuai jawaban kandidat
  const values = new Map<string, number>();
  for (let n = 1; n <= 60; n++) {
    const row = n + 3;
    ws.getCell(`D${row}`).value = null;
    ws.getCell(`E${row}`).value = null;
  }
  let filled = 0;
  for (const a of answers) {
    const n = Number(a.question_number);
    if (!Number.isFinite(n) || n < 1 || n > 60) continue;
    const key = String(a.answer ?? "")
      .trim()
      .toUpperCase();
    if (key !== "A" && key !== "B") continue;
    const addr = `${key === "A" ? "D" : "E"}${n + 3}`;
    ws.getCell(addr).value = 1;
    values.set(addr, 1);
    filled++;
  }

  // Hitung ulang rumus dimensi + status + tipe kepribadian, simpan sebagai cached value
  const scores: Record<string, number> = {};
  let allOk = true;
  for (const row of DIM_ROWS) {
    const [left, right] = DIM_LETTERS[row];
    for (const col of ["D", "E"] as const) {
      const cell = ws.getCell(`${col}${row}`);
      const f = formulaText(cell);
      if (!f) continue;
      const result = sumFormula(f, values);
      scores[col === "D" ? left : right] = result;
      cell.value = { formula: f, result } as ExcelJS.CellFormulaValue;
    }
    const sum = (scores[left] ?? 0) + (scores[right] ?? 0);
    const ok = Math.abs(sum - 1) < 1e-9;
    if (!ok) allOk = false;
    const hCell = ws.getCell(`H${row}`);
    const hf = formulaText(hCell);
    if (hf)
      hCell.value = { formula: hf, result: ok ? "OK" : "CEK ULANG" } as ExcelJS.CellFormulaValue;
  }

  const typeLetters = DIM_ROWS.map((row) => {
    const [left, right] = DIM_LETTERS[row];
    return (scores[left] ?? 0) > (scores[right] ?? 0) ? left : right;
  });
  ["C", "D", "E", "F"].forEach((col, i) => {
    const cell = ws.getCell(`${col}74`);
    const f = formulaText(cell);
    if (f) cell.value = { formula: f, result: typeLetters[i] } as ExcelJS.CellFormulaValue;
  });

  // Identitas kandidat pada baris tanda tangan
  const nama = [meta.candidateName, meta.candidateCode].filter(Boolean).join(" — ") || "-";
  ws.getCell("B64").value = `Nama lengkap & Usia : ${nama} (${meta.age ?? "-"} th)`;
  ws.getCell("E64").value =
    `Pendidikan & Jabatan : ${meta.education ?? "-"} - ${meta.position ?? "-"}`;

  // Paksa Excel menghitung ulang seluruh rumus saat file dibuka
  // Biodata kandidat terisi otomatis pada lembar template (tanpa sheet tambahan)
  applyInlineBiodata(ws, meta, {
    startRow: 79,
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
  a.download = `MBTI_${safe}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
  return { filled, type: typeLetters.join(""), valid: allOk && filled === 60, scores };
}
