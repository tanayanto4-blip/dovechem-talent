import jsPDF from "jspdf";
import {
  PAPI_BOTTOM_ORDER,
  PAPI_KEY,
  PAPI_TOP_ORDER,
  papiScore,
  PAPI_SCALE_LABEL,
} from "./papi-key";
import papiSheetAsset from "@/assets/papi-sheet.png.asset.json";

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

async function loadSheetDataUrl(): Promise<string> {
  const res = await fetch(papiSheetAsset.url);
  if (!res.ok) throw new Error("Gambar lembar jawaban PAPI gagal dimuat");
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("Gambar lembar jawaban PAPI gagal dibaca"));
    fr.readAsDataURL(blob);
  });
}

/* Koordinat dalam piksel scan lembar asli (3256 x 2384) — hasil deteksi otomatis
 * kotak & grid pada lembar acuan, sehingga overlay jatuh persis di tempatnya. */
const IMG_W = 3256;
const IMG_H = 2384;
const TOP_BOXES: Record<string, [number, number]> = {
  G: [1321, 436],
  L: [1501, 437],
  I: [1678, 437],
  T: [1855, 437],
  V: [2025, 438],
  S: [2208, 439],
  R: [2386, 440],
  D: [2560, 439],
  C: [2744, 440],
  E: [2919, 439],
};
const TOP_TOTAL: [number, number] = [1152, 435];
const BOT_BOXES: Record<string, [number, number]> = {
  N: [1262, 2198],
  A: [1427, 2197],
  P: [1599, 2195],
  X: [1770, 2195],
  B: [1945, 2195],
  O: [2118, 2196],
  Z: [2291, 2195],
  K: [2467, 2194],
  F: [2645, 2194],
  W: [2823, 2193],
};
const BOT_TOTAL: [number, number] = [3031, 2190];
const cellX = (c: number) => 2697 - (c - 1) * 180; // c = 1 (kolom kanan) .. 9
const cellY = (r: number) => 607 + (r - 1) * 159.6; // r = 1 (atas) .. 10

/**
 * Cetak lembar jawaban PAPI Kostick memakai citra lembar resmi sebagai dasar,
 * sehingga seluruh garis, kotak, panah, dan nomor item identik dengan lembar asli.
 * Aplikasi hanya menimpa data kandidat: waktu, nama, skor tiap skala, dan
 * penanda biru pada panah opsi A (atas) / B (bawah) yang dipilih kandidat.
 */
export async function exportPapiPdf(picks: Record<number, string>, meta: PapiPdfMeta) {
  const s = papiScore(picks);
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();

  // ---------- Lembar asli sebagai dasar (garis & kotak sama persis) ----------
  const sheet = await loadSheetDataUrl();
  doc.addImage(sheet, "PNG", 0, 0, PW, PH, undefined, "FAST");

  const sx = PW / IMG_W;
  const sy = PH / IMG_H;
  const X = (px: number) => px * sx;
  const Y = (py: number) => py * sy;
  const text = (t: string, px: number, py: number, align?: "center" | "right") =>
    doc.text(t, X(px), Y(py), align ? { align } : undefined);

  // ---------- Isian header ----------
  doc.setTextColor(12, 52, 110);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  text(fmtTime(meta.startedAt), 754, 456, "center");
  text(fmtTime(meta.finishedAt), 754, 596, "center");
  doc.setFontSize(13);
  text(meta.candidateName || "", 240, 735);
  doc.setFontSize(12);
  text(fmtDate(meta.finishedAt ?? meta.startedAt) || "", 240, 868);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  text(`Kode   : ${meta.candidateCode || "-"}`, 150, 985);
  text(`Posisi : ${meta.position || "-"}`, 150, 1035);
  text(`Terjawab : ${s.answered}/${s.total}`, 150, 1085);

  // ---------- Skor tiap kotak skala ----------
  doc.setTextColor(12, 52, 110);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  PAPI_TOP_ORDER.forEach((letter) => {
    const p = TOP_BOXES[letter];
    if (p) text(String(s.scales[letter] ?? 0), p[0], p[1] + 20, "center");
  });
  PAPI_BOTTOM_ORDER.forEach((letter) => {
    const p = BOT_BOXES[letter];
    if (p) text(String(s.scales[letter] ?? 0), p[0], p[1] + 20, "center");
  });
  text(String(s.totalTop), TOP_TOTAL[0], TOP_TOTAL[1] + 20, "center");
  text(String(s.totalBottom), BOT_TOTAL[0], BOT_TOTAL[1] + 20, "center");

  // ---------- Penanda pilihan A (panah atas) / B (panah bawah) ----------
  for (let n = 1; n <= 90; n++) {
    const c = Math.floor((n - 1) / 10) + 1;
    const r = ((n - 1) % 10) + 1;
    const x = cellX(c);
    const y = cellY(r);
    const pick = (picks[n] ?? "").toUpperCase();
    const mark = (px: number, py: number) => {
      doc.setDrawColor(12, 52, 110);
      doc.setLineWidth(1.4);
      doc.circle(X(px), Y(py), X(34), "S");
    };
    if (pick === "A") mark(x + 50, y - 30);
    if (pick === "B") mark(x + 48, y + 44);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(pick === "A" ? 12 : 150, pick === "A" ? 52 : 150, pick === "A" ? 110 : 150);
    text("A", x + 108, y - 22);
    doc.setTextColor(pick === "B" ? 12 : 150, pick === "B" ? 52 : 150, pick === "B" ? 110 : 150);
    text("B", x + 108, y + 54);
  }
  doc.setTextColor(15);

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
    doc.text(String(order === PAPI_TOP_ORDER ? s.totalTop : s.totalBottom), x + tw - 102, yT + 17);
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
