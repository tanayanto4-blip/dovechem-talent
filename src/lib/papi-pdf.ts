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
      arrow(cx - 2, cy + 9, cx - 16, cy + 15, pick === "B"); // ke kiri-bawah
    }

    if (pick === "A" || pick === "B") {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(15, 55, 110);
      doc.text(pick, cx - 15, pick === "A" ? cy - 8 : cy + 14);
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

  // ---------- Halaman 2: rekap skala ----------
  doc.addPage("a4", "portrait");
  const p2w = doc.internal.pageSize.getWidth();
  doc.setFillColor(15, 55, 110);
  doc.rect(0, 0, p2w, 64, "F");
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
    doc.setLineWidth(0.6);
    doc.line(40, y, p2w - 40, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(40);
    for (const letter of order) {
      const v = s.scales[letter] ?? 0;
      doc.text(PAPI_SCALE_LABEL[letter] ?? letter, 40, y);
      const barX = p2w - 190;
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
    { maxWidth: p2w - 80 },
  );

  // Kunci item (A/B) untuk verifikasi manual
  doc.addPage("a4", "portrait");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 55, 110);
  doc.text("Detail Jawaban & Skala", 40, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(40);
  let cx0 = 40;
  let cy0 = 74;
  for (let n = 1; n <= 90; n++) {
    const pick = (picks[n] ?? "").toUpperCase();
    const k = PAPI_KEY[n];
    const scale = pick === "A" || pick === "B" ? k[pick as "A" | "B"] : "-";
    doc.text(`${String(n).padStart(2, "0")}. ${pick || "-"} → ${scale}   (A:${k.A} / B:${k.B})`, cx0, cy0);
    cy0 += 13;
    if (cy0 > 780) {
      cy0 = 74;
      cx0 += 175;
    }
  }

  const safe = (meta.candidateName || "kandidat").replace(/[^a-z0-9]+/gi, "_");
  doc.save(`PAPI_${safe}.pdf`);
  return s;
}
