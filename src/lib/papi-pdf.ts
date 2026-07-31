import jsPDF from "jspdf";
import {
  PAPI_BOTTOM_ORDER,
  PAPI_KEY,
  PAPI_TOP_ORDER,
  papiScore,
  PAPI_SCALE_LABEL,
} from "./papi-key";

export interface PapiPdfMeta {
  candidateName?: string | null;
  candidateCode?: string | null;
  position?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
}

const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString("id-ID") : "-");

/**
 * Cetak lembar jawaban PAPI Kostick berisi jawaban kandidat.
 * Opsi A = panah atas, opsi B = panah bawah (sesuai lembar resmi),
 * total tiap skala terisi otomatis pada kotak atas (role) dan bawah (need).
 */
export function exportPapiPdf(picks: Record<number, string>, meta: PapiPdfMeta) {
  const s = papiScore(picks);
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const pageW = doc.internal.pageSize.getWidth();

  // Header kiri
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(15, 55, 110);
  doc.text("PAPI", 40, 60);
  doc.setFontSize(11);
  doc.setTextColor(40);
  doc.text("PA Preference Inventory", 40, 78);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60);
  const info: [string, string][] = [
    ["Nama", meta.candidateName || "-"],
    ["Kode", meta.candidateCode || "-"],
    ["Posisi", meta.position || "-"],
    ["Mulai", fmt(meta.startedAt)],
    ["Selesai", fmt(meta.finishedAt)],
    ["Terjawab", `${s.answered} / ${s.total}`],
  ];
  let iy = 100;
  info.forEach(([k, v]) => {
    doc.text(`${k}`, 40, iy);
    doc.text(`: ${v}`, 95, iy);
    iy += 15;
  });

  // Grid
  const gridX = 300;
  const gridY = 118;
  const colW = 50;
  const rowH = 40;
  const boxH = 20;

  doc.setLineWidth(0.6);
  doc.setDrawColor(30);
  doc.setFontSize(10);

  // Kotak total atas (role)
  PAPI_TOP_ORDER.forEach((letter, i) => {
    const x = gridX + i * colW;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20);
    doc.text(letter, x + colW / 2, gridY - boxH - 6, { align: "center" });
    doc.rect(x + 10, gridY - boxH, 30, boxH);
    doc.setFontSize(11);
    doc.text(String(s.scales[letter] ?? 0), x + 25, gridY - 6, { align: "center" });
    doc.setFontSize(10);
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Total", gridX - 44, gridY - 6);
  doc.rect(gridX - 50, gridY - boxH, 46, boxH);
  doc.setFontSize(10);
  doc.text(String(s.totalTop), gridX - 27, gridY - 6, { align: "center" });

  // Sel item
  for (let n = 1; n <= 90; n++) {
    const col = Math.floor((n - 1) / 10) + 1; // 1..9 (1 = paling kanan)
    const row = ((n - 1) % 10) + 1;
    const x = gridX + (9 - col) * colW;
    const y = gridY + (row - 1) * rowH;
    const key = PAPI_KEY[n];
    const pick = (picks[n] ?? "").toUpperCase();

    doc.setDrawColor(215);
    doc.rect(x, y, colW, rowH);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(String(n), x + 3, y + rowH / 2 + 2.5);

    const mark = (opt: "A" | "B", my: number) => {
      const chosen = pick === opt;
      const bx = x + 16;
      const by = my - 7;
      if (chosen) {
        doc.setFillColor(15, 55, 110);
        doc.setDrawColor(15, 55, 110);
        doc.rect(bx, by, 28, 12, "FD");
        doc.setTextColor(255);
        doc.setFont("helvetica", "bold");
      } else {
        doc.setDrawColor(200);
        doc.rect(bx, by, 28, 12);
        doc.setTextColor(150);
        doc.setFont("helvetica", "normal");
      }
      doc.setFontSize(7.5);
      doc.text(`${opt}${chosen ? " ✓" : ""} ${key[opt]}`, bx + 14, by + 8.5, { align: "center" });
    };
    mark("A", y + rowH * 0.3);
    mark("B", y + rowH * 0.75);
  }

  // Kotak total bawah (need)
  const bottomY = gridY + 10 * rowH + 6;
  doc.setDrawColor(30);
  PAPI_BOTTOM_ORDER.forEach((letter, i) => {
    const x = gridX + i * colW;
    doc.rect(x + 10, bottomY, 30, boxH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20);
    doc.text(String(s.scales[letter] ?? 0), x + 25, bottomY + 14, { align: "center" });
    doc.setFontSize(10);
    doc.text(letter, x + colW / 2, bottomY + boxH + 12, { align: "center" });
  });
  doc.rect(gridX - 50, bottomY, 46, boxH);
  doc.setFontSize(10);
  doc.text(String(s.totalBottom), gridX - 27, bottomY + 14, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Total", gridX - 44, bottomY + boxH + 10);

  // Halaman 2: rekap skala
  doc.addPage("a4", "portrait");
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(15, 55, 110);
  doc.rect(0, 0, pw, 64, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("PT DOVER CHEMICAL", 40, 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Rekap Skor PAPI Kostick", 40, 46);

  let y = 90;
  doc.setTextColor(30);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`${meta.candidateName || "-"} · ${meta.candidateCode || "-"}`, 40, y);
  y += 20;

  const drawSection = (title: string, order: readonly string[]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 55, 110);
    doc.text(title, 40, y);
    y += 12;
    doc.setDrawColor(210);
    doc.line(40, y, pw - 40, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(40);
    for (const letter of order) {
      const v = s.scales[letter] ?? 0;
      doc.text(PAPI_SCALE_LABEL[letter] ?? letter, 40, y);
      const barX = pw - 190;
      doc.setDrawColor(220);
      doc.rect(barX, y - 7, 100, 9);
      doc.setFillColor(15, 55, 110);
      if (v > 0) doc.rect(barX, y - 7, (100 * v) / 9, 9, "F");
      doc.text(`${v}/9`, barX + 110, y);
      y += 16;
    }
    y += 8;
  };

  drawSection("Skala Peran (Roles)", PAPI_TOP_ORDER);
  drawSection("Skala Kebutuhan (Needs)", PAPI_BOTTOM_ORDER);

  doc.setFontSize(8);
  doc.setTextColor(110);
  doc.text(
    `Skala tertinggi: ${s.highest.join(", ") || "-"} · Terjawab ${s.answered}/${s.total} · Interpretasi akhir oleh psikolog/HR.`,
    40,
    y,
    { maxWidth: pw - 80 },
  );

  const safe = (meta.candidateName || "kandidat").replace(/[^a-z0-9]+/gi, "_");
  doc.save(`PAPI_${safe}.pdf`);
  return s;
}

export { pageWMarker };
const pageWMarker = 0;
