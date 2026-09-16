import type { jsPDF } from "jspdf";

/**
 * Grafik rangkuman kandidat yang digambar ulang dari nilai pada file Excel
 * skoring (grafik bawaan Excel berupa objek gambar sehingga tidak bisa
 * disalin apa adanya oleh pembaca spreadsheet di browser).
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Urutan skala pada chart PAPI Kostick (kolom C..V sheet "POLA DASAR"). */
export const PAPI_SCALES = [
  "N", "G", "A", "L", "P", "I", "T", "V", "X", "S",
  "B", "O", "R", "D", "C", "Z", "E", "K", "F", "W",
] as const;

/** Grafik profil PAPI Kostick: 20 skala, nilai 0-9. */
export function drawPapiChart(doc: jsPDF, scales: Record<string, number>, r: Rect) {
  const cols = PAPI_SCALES.length;
  const rows = 10; // nilai 9 (atas) .. 0 (bawah)
  const labelH = 16;
  const axisW = 18;
  const gw = (r.w - axisW) / cols;
  const gh = (r.h - labelH) / rows;

  doc.setLineWidth(0.4);
  doc.setDrawColor(150);
  for (let c = 0; c <= cols; c++) {
    const x = r.x + axisW + c * gw;
    doc.line(x, r.y, x, r.y + rows * gh);
  }
  for (let i = 0; i <= rows; i++) {
    const y = r.y + i * gh;
    doc.line(r.x + axisW, y, r.x + axisW + cols * gw, y);
  }

  // Label skala + nilai sumbu
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(11, 61, 145);
  PAPI_SCALES.forEach((s, i) => {
    doc.text(s, r.x + axisW + i * gw + gw / 2, r.y + rows * gh + 11, { align: "center" });
  });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90);
  doc.setFontSize(7);
  for (let v = 9; v >= 0; v--) {
    const y = r.y + (9 - v) * gh + gh / 2 + 2;
    doc.text(String(v), r.x + axisW - 4, y, { align: "right" });
  }

  // Titik nilai + garis penghubung
  const pts: Array<[number, number]> = PAPI_SCALES.map((s, i) => {
    const raw = Number(scales[s] ?? 0);
    const v = Math.max(0, Math.min(9, Number.isFinite(raw) ? raw : 0));
    return [r.x + axisW + i * gw + gw / 2, r.y + (9 - v) * gh + gh / 2];
  });
  doc.setDrawColor(11, 61, 145);
  doc.setLineWidth(1);
  for (let i = 1; i < pts.length; i++)
    doc.line(pts[i - 1]![0], pts[i - 1]![1], pts[i]![0], pts[i]![1]);
  doc.setFillColor(11, 61, 145);
  pts.forEach(([x, y]) => doc.circle(x, y, 2.4, "F"));

  // Angka nilai di atas titik
  doc.setFontSize(6.5);
  doc.setTextColor(20);
  PAPI_SCALES.forEach((s, i) => {
    const v = Number(scales[s] ?? 0);
    doc.text(String(Number.isFinite(v) ? v : 0), pts[i]![0], pts[i]![1] - 4, { align: "center" });
  });
}

export interface DiscGraph {
  title: string;
  values: Record<"D" | "I" | "S" | "C", number>;
}

/** Tiga grafik DISC (Mask / Core / Mirror) berdampingan. */
export function drawDiscChart(doc: jsPDF, graphs: DiscGraph[], r: Rect) {
  const gap = 24;
  const gw = (r.w - gap * (graphs.length - 1)) / graphs.length;
  graphs.forEach((g, gi) => {
    const gx = r.x + gi * (gw + gap);
    const titleH = 16;
    const labelH = 14;
    const plotY = r.y + titleH;
    const plotH = r.h - titleH - labelH;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(11, 61, 145);
    doc.text(g.title, gx + gw / 2, r.y + 10, { align: "center" });

    const keys: Array<"D" | "I" | "S" | "C"> = ["D", "I", "S", "C"];
    const vals = keys.map((k) => Number(g.values[k] ?? 0));
    const max = Math.max(12, ...vals.map((v) => Math.abs(v)));
    const min = Math.min(0, ...vals);
    const top = max;
    const bottom = min < 0 ? -max : 0;
    const span = top - bottom || 1;
    const yOf = (v: number) => plotY + ((top - v) / span) * plotH;

    doc.setDrawColor(150);
    doc.setLineWidth(0.4);
    doc.rect(gx, plotY, gw, plotH);
    const zeroY = yOf(0);
    doc.setDrawColor(120);
    doc.line(gx, zeroY, gx + gw, zeroY);

    const cw = gw / keys.length;
    const pts: Array<[number, number]> = vals.map((v, i) => [gx + i * cw + cw / 2, yOf(v)]);
    doc.setDrawColor(11, 61, 145);
    doc.setLineWidth(1);
    for (let i = 1; i < pts.length; i++)
      doc.line(pts[i - 1]![0], pts[i - 1]![1], pts[i]![0], pts[i]![1]);
    doc.setFillColor(11, 61, 145);
    pts.forEach(([x, y]) => doc.circle(x, y, 2.6, "F"));

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(20);
    keys.forEach((k, i) => {
      doc.text(k, gx + i * cw + cw / 2, plotY + plotH + 11, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(String(vals[i]), pts[i]![0], pts[i]![1] - 5, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
    });
  });
}
