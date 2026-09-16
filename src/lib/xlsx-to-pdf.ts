import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import { XlsxFormula, type CellVal } from "./xlsx-formula";

/**
 * Konversi lembar Excel hasil skoring menjadi halaman PDF.
 *
 * Nilai yang dicetak diambil APA ADANYA dari file Excel skoring (termasuk
 * hasil rumus yang sudah tersimpan sebagai cached value oleh exporter),
 * sehingga isi PDF identik dengan file Excel per kandidat.
 */

export interface SheetSpec {
  /** Blob file .xlsx hasil exporter. */
  blob: Blob;
  /** Nama sheet yang dicetak (boleh sebagian nama, case-insensitive). */
  sheet: string;
  /** Judul halaman di PDF. */
  title: string;
  /** Batas kolom/baris maksimum yang dicetak (opsional). */
  maxCols?: number;
  maxRows?: number;
  /**
   * Halaman grafik: digambar sendiri dari nilai sheet (grafik bawaan Excel
   * berupa objek gambar yang tidak bisa disalin di browser).
   */
  custom?: (
    doc: jsPDF,
    area: { x: number; y: number; w: number; h: number },
    ws: ExcelJS.Worksheet,
    valueAt: (r: number, c: number) => CellVal,
  ) => void;
}

const MAX_COLS = 24;
const MAX_ROWS = 80;

function argbToRgb(argb?: string): [number, number, number] | null {
  if (!argb || argb.length < 6) return null;
  const hex = argb.length === 8 ? argb.slice(2) : argb;
  const n = parseInt(hex, 16);
  if (Number.isNaN(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function fmtVal(v: CellVal, cell: ExcelJS.Cell): string {
  if (v == null || v === "") return "";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") {
    const fmt = String(cell.numFmt ?? "");
    if (fmt.includes("%")) return `${(v * 100).toFixed(fmt.includes("0.0") ? 1 : 0)}%`;
    return Number.isInteger(v) ? String(v) : v.toFixed(2);
  }
  return String(v);
}

/** Cari worksheet berdasarkan nama (cocok sebagian, abaikan spasi/kapital). */
function findSheet(wb: ExcelJS.Workbook, name: string) {
  const norm = (s: string) => s.trim().toLowerCase();
  return (
    wb.worksheets.find((w) => norm(w.name) === norm(name)) ??
    wb.worksheets.find((w) => norm(w.name).includes(norm(name))) ??
    null
  );
}

/** Gabungkan beberapa sheet Excel menjadi satu dokumen PDF dan unduh. */
export async function exportSheetsToPdf(
  specs: SheetSpec[],
  filename: string,
  subtitle?: string,
  onDoc?: (doc: jsPDF) => void,
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 24;
  let first = true;
  let printed = 0;

  for (const spec of specs) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await spec.blob.arrayBuffer());
    const ws = findSheet(wb, spec.sheet);
    if (!ws) continue;

    const calc = new XlsxFormula(wb);
    const valueAt = (r: number, c: number) => calc.value(ws, r, c);

    // Tentukan area terpakai: buang baris/kolom kosong di ujung
    const capCol = Math.min(spec.maxCols ?? MAX_COLS, Math.max(1, ws.actualColumnCount || 1));
    const capRow = Math.min(spec.maxRows ?? MAX_ROWS, Math.max(1, ws.actualRowCount || 1));
    let lastCol = 1;
    let lastRow = 1;
    for (let r = 1; r <= capRow; r++)
      for (let c = 1; c <= capCol; c++) {
        const v = valueAt(r, c);
        if (v !== null && v !== "") {
          if (r > lastRow) lastRow = r;
          if (c > lastCol) lastCol = c;
        }
      }
    if (lastRow < 2 && lastCol < 2) continue; // sheet grafik/kosong dilewati

    // Kumpulkan sel dan lebar kolom
    const widths: number[] = [];
    for (let c = 1; c <= lastCol; c++) {
      const w = ws.getColumn(c).width ?? 8.43;
      widths.push(Math.max(3, Math.min(40, w)));
    }
    const totalW = widths.reduce((a, b) => a + b, 0) || 1;
    const usableW = pageW - margin * 2;
    const colW = widths.map((w) => (w / totalW) * usableW);

    // Sel gabungan
    const merges: Record<string, { rs: number; cs: number }> = {};
    const covered = new Set<string>();
    for (const range of (ws as any).model?.merges ?? []) {
      const m = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(String(range));
      if (!m) continue;
      const colNum = (s: string) => s.split("").reduce((a, ch) => a * 26 + (ch.charCodeAt(0) - 64), 0);
      const c1 = colNum(m[1]!), r1 = Number(m[2]), c2 = colNum(m[3]!), r2 = Number(m[4]);
      merges[`${r1}:${c1}`] = { rs: r2 - r1 + 1, cs: c2 - c1 + 1 };
      for (let r = r1; r <= r2; r++)
        for (let c = c1; c <= c2; c++) if (!(r === r1 && c === c1)) covered.add(`${r}:${c}`);
    }

    // Tinggi baris nyaman dibaca; bila tidak muat, lanjut ke halaman berikutnya
    const headerH = 44;
    const rowH = 15;

    if (!first) doc.addPage();
    first = false;
    printed++;

    const drawHeader = () => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(11, 61, 145);
      doc.text(spec.title, margin, margin + 14);
      if (subtitle) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(90);
        doc.text(subtitle, margin, margin + 28);
      }
    };
    drawHeader();

    let y = margin + headerH;
    for (let r = 1; r <= lastRow; r++) {
      if (y + rowH > pageH - margin) {
        doc.addPage();
        printed++;
        drawHeader();
        y = margin + headerH;
      }
      let x = margin;
      for (let c = 1; c <= lastCol; c++) {
        const w = colW[c - 1]!;
        if (covered.has(`${r}:${c}`)) {
          x += w;
          continue;
        }
        const cell = ws.getRow(r).getCell(c);
        const span = merges[`${r}:${c}`];
        const cw = span ? colW.slice(c - 1, c - 1 + span.cs).reduce((a, b) => a + b, 0) : w;
        const ch = span ? rowH * span.rs : rowH;

        const fill: any = (cell.style as any)?.fill;
        const rgb = fill?.type === "pattern" ? argbToRgb(fill?.fgColor?.argb) : null;
        if (rgb && !(rgb[0] === 255 && rgb[1] === 255 && rgb[2] === 255)) {
          doc.setFillColor(rgb[0], rgb[1], rgb[2]);
          doc.rect(x, y, cw, ch, "F");
        }

        const text = fmtVal(valueAt(r, c) as CellVal, cell);
        if (text) {
          const font = cell.font ?? {};
          doc.setFont("helvetica", font.bold ? "bold" : "normal");
          const fc = argbToRgb(font.color?.argb) ?? [20, 20, 20];
          doc.setTextColor(fc[0], fc[1], fc[2]);

          // Shrink-to-fit: kecilkan font sampai teks muat di lebar sel
          let fs = 7.5;
          doc.setFontSize(fs);
          const maxW = cw - 4;
          while (fs > 3.6 && doc.getTextWidth(text) > maxW) {
            fs -= 0.3;
            doc.setFontSize(fs);
          }
          const lines =
            doc.getTextWidth(text) > maxW ? doc.splitTextToSize(text, maxW).slice(0, 2) : [text];
          const align = cell.alignment?.horizontal;
          const startY =
            y + ch / 2 - ((lines.length - 1) * (fs + 1)) / 2 + fs * 0.35;
          lines.forEach((line: string, i: number) => {
            const ty = startY + i * (fs + 1);
            if (align === "center") doc.text(line, x + cw / 2, ty, { align: "center" });
            else if (align === "right") doc.text(line, x + cw - 2, ty, { align: "right" });
            else doc.text(line, x + 2, ty);
          });
        }

        doc.setDrawColor(220);
        doc.setLineWidth(0.3);
        doc.rect(x, y, cw, ch);
        x += w;
      }
      y += rowH;
    }
  }


  if (!printed) throw new Error("Tidak ada lembar skoring yang bisa dicetak");
  if (onDoc) onDoc(doc);
  else doc.save(filename);
  return printed;
}
