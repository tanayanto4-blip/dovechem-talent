import jsPDF from "jspdf";
import type { PauliColumn } from "@/components/pauli-result";

export interface PauliPdfMeta {
  candidateName?: string | null;
  candidateCode?: string | null;
  position?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export interface PauliPdfData {
  columns: PauliColumn[];
  filled: number;
  correct: number;
  wrong: number;
  total: number;
  unanswered: number;
  accuracy: number;
  completion: number;
}

const fmt = (v?: string | null) =>
  v ? new Date(v).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-";

/** Ekspor hasil skoring Pauli/Koran: ringkasan, rekap per kolom, dan lembar jawaban visual. */
export function exportPauliPdf(res: PauliPdfData, meta: PauliPdfMeta = {}) {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const M = 36;

  const header = (title: string) => {
    doc.setFillColor(21, 62, 117);
    doc.rect(0, 0, pw, 58, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("PT DOVER CHEMICAL", M, 26);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(title, M, 43);
    doc.setTextColor(20);
  };

  // ---------- Halaman 1: ringkasan ----------
  header("Hasil Skoring Test Pauli / Koran");
  let y = 84;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(meta.candidateName || "-", M, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  y += 15;
  const info: Array<[string, string]> = [
    ["Kode kandidat", meta.candidateCode || "-"],
    ["Posisi dilamar", meta.position || "-"],
    ["Mulai", fmt(meta.startedAt)],
    ["Selesai", fmt(meta.finishedAt)],
  ];
  for (const [k, v] of info) {
    doc.setTextColor(110);
    doc.text(k, M, y);
    doc.setTextColor(20);
    doc.text(`: ${v}`, M + 90, y);
    y += 13;
  }

  y += 10;
  const stats: Array<[string, string]> = [
    ["Terisi", `${res.filled} / ${res.total}`],
    ["Benar", String(res.correct)],
    ["Salah", String(res.wrong)],
    ["Belum diisi", String(res.unanswered)],
    ["Akurasi", `${res.accuracy}%`],
    ["Pengerjaan", `${res.completion}%`],
  ];
  const bw = (pw - M * 2 - 5 * 8) / 6;
  stats.forEach(([label, value], i) => {
    const x = M + i * (bw + 8);
    doc.setDrawColor(200);
    doc.setFillColor(244, 247, 251);
    doc.roundedRect(x, y, bw, 46, 4, 4, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(21, 62, 117);
    doc.text(value, x + bw / 2, y + 22, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(110);
    doc.text(label, x + bw / 2, y + 36, { align: "center" });
  });
  doc.setTextColor(20);
  y += 66;

  // ---------- Rekap per kolom ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Rekap per kolom", M, y);
  y += 10;

  const cols = ["Kolom", "Terisi", "Benar", "Salah", "Akurasi"];
  const tableW = (pw - M * 2 - 12) / 2; // dua tabel bersebelahan
  const cw = [tableW * 0.28, tableW * 0.2, tableW * 0.17, tableW * 0.17, tableW * 0.18];
  const rowH = 14;

  const drawHead = (x: number, yy: number) => {
    doc.setFillColor(21, 62, 117);
    doc.rect(x, yy, tableW, rowH, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    let cx = x;
    cols.forEach((c, i) => {
      doc.text(c, i === 0 ? cx + 4 : cx + cw[i] - 4, yy + 9.5, { align: i === 0 ? "left" : "right" });
      cx += cw[i];
    });
    doc.setTextColor(20);
    doc.setFont("helvetica", "normal");
  };

  const half = Math.ceil(res.columns.length / 2);
  const groups = [res.columns.slice(0, half), res.columns.slice(half)];
  const tableTop = y;
  groups.forEach((group, gi) => {
    const x = M + gi * (tableW + 12);
    let yy = tableTop;
    drawHead(x, yy);
    yy += rowH;
    group.forEach((c, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(246, 248, 251);
        doc.rect(x, yy, tableW, rowH, "F");
      }
      doc.setDrawColor(220);
      doc.rect(x, yy, tableW, rowH);
      doc.setFontSize(7.5);
      const acc = c.filled > 0 ? Math.round((c.correct / c.filled) * 100) : 0;
      const vals = [`Kolom ${c.column}`, `${c.filled}/${c.total}`, String(c.correct), String(c.wrong), `${acc}%`];
      let cx = x;
      vals.forEach((v, i) => {
        doc.text(v, i === 0 ? cx + 4 : cx + cw[i] - 4, yy + 9.5, { align: i === 0 ? "left" : "right" });
        cx += cw[i];
      });
      yy += rowH;
    });
  });

  // ---------- Lembar jawaban visual ----------
  const worked = res.columns.filter((c) => c.filled > 0);
  const sheetCols = worked.length > 0 ? worked : res.columns;

  const colW = 46;
  const cellH = 9.5;
  const perRow = Math.floor((pw - M * 2) / (colW + 6));

  const newSheetPage = () => {
    doc.addPage();
    header("Lembar Jawaban Pauli / Koran");
    doc.setFontSize(7.5);
    doc.setTextColor(110);
    doc.text(
      "Tiap kolom: angka soal · jawaban kandidat · kunci.  [x] = salah, kosong (–) = belum diisi.",
      M,
      74,
    );
    doc.setTextColor(20);
    return 86;
  };

  let sy = newSheetPage();
  for (let i = 0; i < sheetCols.length; i += perRow) {
    const slice = sheetCols.slice(i, i + perRow);
    const maxCells = Math.max(...slice.map((c) => c.cells.length));
    const blockH = 14 + maxCells * cellH + 10;
    if (sy + blockH > ph - M) sy = newSheetPage();

    slice.forEach((c, k) => {
      const x = M + k * (colW + 6);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(21, 62, 117);
      doc.text(`K${c.column}  ${c.correct}B/${c.wrong}S`, x + colW / 2, sy + 8, { align: "center" });
      doc.setTextColor(20);
      doc.setFont("helvetica", "normal");

      let cy = sy + 12;
      c.cells.forEach((cell) => {
        if (cell.value !== null) {
          if (cell.correct) doc.setFillColor(232, 245, 236);
          else doc.setFillColor(252, 232, 232);
          doc.rect(x + colW / 3, cy, colW / 3, cellH, "F");
        }
        doc.setDrawColor(215);
        doc.rect(x, cy, colW, cellH);
        doc.setFontSize(6.5);
        doc.setTextColor(120);
        doc.text(String(c.digits[cell.index] ?? ""), x + colW / 6, cy + 6.8, { align: "center" });
        doc.text(String(cell.key), x + (colW * 5) / 6, cy + 6.8, { align: "center" });
        doc.setFontSize(7.2);
        doc.setTextColor(cell.value === null ? 150 : cell.correct ? 22 : 190, cell.value === null ? 150 : cell.correct ? 120 : 40, cell.value === null ? 150 : cell.correct ? 60 : 40);
        doc.text(cell.value ?? "–", x + colW / 2, cy + 6.8, { align: "center" });
        doc.setTextColor(20);
        cy += cellH;
      });
      doc.setFillColor(238, 241, 245);
      doc.rect(x, cy, colW, cellH, "F");
      doc.setDrawColor(215);
      doc.rect(x, cy, colW, cellH);
      doc.setFontSize(6);
      doc.setTextColor(120);
      doc.text("soal", x + colW / 6, cy + 6.5, { align: "center" });
      doc.text("jwb", x + colW / 2, cy + 6.5, { align: "center" });
      doc.text("kunci", x + (colW * 5) / 6, cy + 6.5, { align: "center" });
      doc.setTextColor(20);
    });
    sy += blockH;
  }

  // Footer nomor halaman
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setTextColor(140);
    doc.text(`PT Dover Chemical · Hasil Pauli · Halaman ${p}/${pages}`, pw / 2, ph - 18, { align: "center" });
  }

  const safe = (meta.candidateName || "kandidat").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_");
  doc.save(`Pauli_${safe}.pdf`);
}
