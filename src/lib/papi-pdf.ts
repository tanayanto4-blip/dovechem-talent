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

const fmtTime = (v?: string | null) =>
  v ? new Date(v).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "";
const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString("id-ID") : "");

/**
 * Cetak lembar jawaban PAPI Kostick mengikuti template resmi:
 * grid 9 kolom x 10 baris, skala peran (G L I T V S R D C E) di atas,
 * skala kebutuhan (N A P X B O Z K F W) di bawah, opsi A = panah atas,
 * opsi B = panah bawah, kotak total terisi otomatis dari jawaban kandidat.
 */
export function exportPapiPdf(picks: Record<number, string>, meta: PapiPdfMeta) {
  const s = papiScore(picks);
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  // Bingkai lembar
  doc.setDrawColor(30);
  doc.setLineWidth(1.2);
  doc.rect(24, 24, pw - 48, ph - 48);

  // ---------- Header kiri ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(40);
  doc.setTextColor(20);
  doc.text("PAPI", 52, 78);
  doc.setFontSize(11);
  doc.text("PA Preference Inventory", 52, 98);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setLineWidth(0.8);
  const field = (label: string, value: string, y: number, boxed: boolean) => {
    doc.text(label, 52, y);
    if (boxed) {
      doc.rect(170, y - 13, 62, 20);
      doc.text(value, 201, y, { align: "center" });
    } else {
      doc.line(52, y + 4, 262, y + 4);
      doc.text(value, 110, y);
    }
  };
  field("Time started", fmtTime(meta.startedAt), 132, true);
  field("Time finished", fmtTime(meta.finishedAt), 170, true);
  field("Name", meta.candidateName || "", 210, false);
  field("Date", fmtDate(meta.finishedAt ?? meta.startedAt), 248, false);
  doc.setFontSize(8.5);
  doc.setTextColor(90);
  doc.text(`Kode  : ${meta.candidateCode || "-"}`, 52, 282);
  doc.text(`Posisi: ${meta.position || "-"}`, 52, 298);
  doc.text(`Terjawab: ${s.answered}/${s.total}`, 52, 314);

  // ---------- Grid ----------
  const cols = 9;
  const rows = 10;
  const cellW = 48;
  const cellH = 36;
  const gridX = 322;
  const gridY = 128;
  const gridW = cols * cellW;
  const gridH = rows * cellH;
  const boxW = 26;
  const boxH = 20;

  const letterX = (i: number) => gridX + i * cellW; // 10 titik untuk 10 skala

  // Kotak skala atas
  doc.setDrawColor(30);
  doc.setLineWidth(0.9);
  PAPI_TOP_ORDER.forEach((letter, i) => {
    const cx = letterX(i);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(20);
    doc.text(letter, cx, gridY - boxH - 12, { align: "center" });
    doc.rect(cx - boxW / 2, gridY - boxH - 6, boxW, boxH);
    doc.setFontSize(11);
    doc.text(String(s.scales[letter] ?? 0), cx, gridY - 11, { align: "center" });
  });
  // Total atas
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(40);
  doc.text("Total", gridX - 78, gridY - boxH - 12);
  doc.rect(gridX - 86, gridY - boxH - 6, 44, boxH);
  doc.setFontSize(11);
  doc.text(String(s.totalTop), gridX - 64, gridY - 11, { align: "center" });

  // Panah
  const arrow = (x1: number, y1: number, x2: number, y2: number, active: boolean) => {
    if (active) {
      doc.setDrawColor(15, 55, 110);
      doc.setLineWidth(1.6);
    } else {
      doc.setDrawColor(120);
      doc.setLineWidth(0.5);
    }
    doc.line(x1, y1, x2, y2);
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const h = active ? 5 : 3.6;
    doc.line(x2, y2, x2 - h * Math.cos(ang - 0.5), y2 - h * Math.sin(ang - 0.5));
    doc.line(x2, y2, x2 - h * Math.cos(ang + 0.5), y2 - h * Math.sin(ang + 0.5));
    doc.setLineWidth(0.8);
  };

  for (let n = 1; n <= 90; n++) {
    const col = Math.floor((n - 1) / 10) + 1; // 1 = paling kanan
    const row = ((n - 1) % 10) + 1;
    const x = gridX + (cols - col) * cellW;
    const y = gridY + (row - 1) * cellH;
    const cx = x + cellW / 2;
    const cy = y + cellH / 2;
    const pick = (picks[n] ?? "").toUpperCase();
    const topRegion = row <= col;

    // garis bantu titik-titik searah diagonal
    doc.setLineDashPattern([1, 2.2], 0);
    doc.setDrawColor(175);
    doc.setLineWidth(0.4);
    if (topRegion) doc.line(x + 4, y + cellH - 4, x + cellW - 4, y + 4);
    else doc.line(x + 4, y + 4, x + cellW - 4, y + cellH - 4);
    doc.setLineDashPattern([], 0);

    // nomor item
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(60);
    doc.text(String(n), cx - 15, cy + 2.5);

    // A = panah atas, B = panah bawah
    if (topRegion) {
      arrow(cx - 2, cy - 5, cx - 16, cy - 10, pick === "A"); // ke kiri-atas
      arrow(cx - 2, cy + 9, cx + 12, cy + 2, pick === "B"); // ke kanan-atas
    } else {
      arrow(cx - 2, cy - 5, cx + 12, cy - 10, pick === "A"); // ke kanan-atas/kanan
      arrow(cx - 2, cy + 8, cx - 16, cy + 13, pick === "B"); // ke kiri-bawah
    }

    if (pick === "A" || pick === "B") {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(15, 55, 110);
      doc.text(pick, cx + 18, pick === "A" ? cy - 6 : cy + 11);
      doc.setTextColor(60);
    }
  }

  // Garis diagonal tebal pemisah role / need
  doc.setDrawColor(30);
  doc.setLineWidth(1.2);
  doc.line(gridX + gridW, gridY, gridX, gridY + gridH);
  // Siku kiri-bawah & kanan-atas seperti lembar asli
  doc.line(gridX, gridY + 12, gridX, gridY + gridH);
  doc.line(gridX + gridW, gridY, gridX + gridW, gridY + gridH - 12);

  // Kotak skala bawah
  const bottomY = gridY + gridH + 8;
  doc.setLineWidth(0.9);
  PAPI_BOTTOM_ORDER.forEach((letter, i) => {
    const cx = letterX(i);
    doc.rect(cx - boxW / 2, bottomY, boxW, boxH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20);
    doc.text(String(s.scales[letter] ?? 0), cx, bottomY + 14, { align: "center" });
    doc.setFontSize(13);
    doc.text(letter, cx, bottomY + boxH + 15, { align: "center" });
  });
  doc.rect(gridX + gridW + 22, bottomY, 44, boxH);
  doc.setFontSize(11);
  doc.text(String(s.totalBottom), gridX + gridW + 44, bottomY + 14, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Total", gridX + gridW + 44, bottomY + boxH + 12, { align: "center" });

  // ---------- Halaman lanjutan bergaya lembar acuan (mono, berbingkai) ----------
  const sheetHeader = (subtitle: string) => {
    doc.addPage("a4", "landscape");
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setDrawColor(30);
    doc.setLineWidth(1.2);
    doc.rect(24, 24, w - 48, h - 48);
    doc.setTextColor(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.text("PAPI", 52, 68);
    doc.setFontSize(10);
    doc.text("PA Preference Inventory", 52, 86);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(subtitle, 52, 104);
    doc.setFontSize(9);
    doc.text(`Name  : ${meta.candidateName || "-"}`, 52, 128);
    doc.text(`Kode  : ${meta.candidateCode || "-"}`, 300, 128);
    doc.text(`Posisi: ${meta.position || "-"}`, 500, 128);
    doc.text(`Date  : ${fmtDate(meta.finishedAt ?? meta.startedAt) || "-"}`, 700, 128);
    doc.setLineWidth(0.8);
    doc.line(52, 138, w - 52, 138);
    return w;

  };

  // Halaman 2: rekap skala — dua tabel berkotak (Roles & Needs)
  const p2w = sheetHeader("Scale Summary / Rekap Skor");

  const drawScaleTable = (title: string, order: readonly string[], x: number, top: number) => {
    const tw = 330;
    const rowH = 26;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(20);
    doc.text(title, x, top - 8);
    doc.setDrawColor(30);
    doc.setLineWidth(0.8);
    // header baris
    doc.rect(x, top, tw, rowH);
    doc.setFontSize(8.5);
    doc.text("Skala", x + 8, top + 17);
    doc.text("Skor", x + tw - 104, top + 17);
    doc.text("Grafik (0-9)", x + tw - 74, top + 17);
    doc.setFont("helvetica", "normal");
    order.forEach((letter, i) => {
      const y0 = top + rowH * (i + 1);
      const v = s.scales[letter] ?? 0;
      doc.setLineWidth(0.6);
      doc.rect(x, y0, tw, rowH);
      doc.line(x + tw - 112, y0, x + tw - 112, y0 + rowH);
      doc.line(x + tw - 82, y0, x + tw - 82, y0 + rowH);
      doc.setFontSize(7.5);
      const lines = doc.splitTextToSize(PAPI_SCALE_LABEL[letter] ?? letter, tw - 124).slice(0, 2);
      const startTextY = lines.length > 1 ? y0 + 11 : y0 + 16;
      lines.forEach((ln: string, li: number) => doc.text(ln, x + 8, startTextY + li * 9));
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(String(v), x + tw - 102, y0 + 17);
      doc.setFont("helvetica", "normal");
      // grafik kotak 9 sel
      doc.setFillColor(30, 30, 30);
      for (let c = 0; c < 9; c++) {
        const bx = x + tw - 76 + c * 7.6;
        doc.setLineWidth(0.4);
        doc.rect(bx, y0 + 8, 6, 10);
        if (c < v) doc.rect(bx, y0 + 8, 6, 10, "F");
      }
    });

    // total
    const yT = top + rowH * (order.length + 1);
    doc.setLineWidth(0.8);
    doc.rect(x, yT, tw, rowH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Total", x + 8, yT + 17);
    doc.text(
      String(order === PAPI_TOP_ORDER ? s.totalTop : s.totalBottom),
      x + tw - 102,
      yT + 17,
    );
    doc.setFont("helvetica", "normal");
  };

  drawScaleTable("Roles  (G L I T V S R D C E)", PAPI_TOP_ORDER, 52, 176);
  drawScaleTable("Needs  (N A P X B O Z K F W)", PAPI_BOTTOM_ORDER, 452, 176);

  doc.setFontSize(8);
  doc.setTextColor(60);
  doc.text(
    `Skala tertinggi: ${s.highest.join(", ") || "-"}   ·   Terjawab ${s.answered}/${s.total}   ·   Interpretasi akhir oleh psikolog/HR.`,
    52,
    doc.internal.pageSize.getHeight() - 42,
    { maxWidth: p2w - 104 },
  );

  // Halaman 3: detail jawaban — tabel berkotak 6 blok x 15 baris
  sheetHeader("Detail Jawaban & Skala per Item");
  const blockW = 118;
  const rowH2 = 21;
  const startX = 52;
  const startY = 180;
  doc.setTextColor(20);
  for (let b = 0; b < 6; b++) {
    const bx = startX + b * (blockW + 6);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setLineWidth(0.8);
    doc.setDrawColor(30);
    doc.rect(bx, startY - rowH2, blockW, rowH2);
    doc.text("No", bx + 5, startY - 7);
    doc.text("Pilih", bx + 29, startY - 7);
    doc.text("Skala", bx + 59, startY - 7);
    doc.text("A/B", bx + 91, startY - 7);
    doc.setFont("helvetica", "normal");
    for (let r = 0; r < 15; r++) {
      const n = b * 15 + r + 1;
      const y0 = startY + r * rowH2;
      const pick = (picks[n] ?? "").toUpperCase();
      const k = PAPI_KEY[n];
      const scale = pick === "A" || pick === "B" ? k[pick as "A" | "B"] : "-";
      doc.setLineWidth(0.5);
      doc.rect(bx, y0, blockW, rowH2);
      doc.line(bx + 25, y0, bx + 25, y0 + rowH2);
      doc.line(bx + 54, y0, bx + 54, y0 + rowH2);
      doc.line(bx + 86, y0, bx + 86, y0 + rowH2);
      doc.setFontSize(7.5);
      doc.text(String(n).padStart(2, "0"), bx + 5, y0 + 14);
      doc.setFont("helvetica", "bold");
      doc.text(pick || "-", bx + 35, y0 + 14);
      doc.text(scale, bx + 64, y0 + 14);
      doc.setFont("helvetica", "normal");
      doc.text(`${k.A}/${k.B}`, bx + 91, y0 + 14);

    }
  }


  const safe = (meta.candidateName || "kandidat").replace(/[^a-z0-9]+/gi, "_");
  doc.save(`PAPI_${safe}.pdf`);
  return s;
}
