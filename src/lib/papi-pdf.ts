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

  /* --------------------------------------------------------------------
   * Semua koordinat di bawah diukur langsung dari lembar jawaban PAPI asli
   * (scan 150 dpi, 1755 x 1240 px = A4 landscape). Faktor P mengonversi
   * piksel referensi -> point PDF sehingga posisi garis, kotak, huruf,
   * angka, dan panah sama persis dengan lembar aslinya.
   * ------------------------------------------------------------------ */
  const P = (px: number) => px * 0.48;

  const line = (x1: number, y1: number, x2: number, y2: number) =>
    doc.line(P(x1), P(y1), P(x2), P(y2));
  const rect = (x: number, y: number, w: number, h: number, style?: "S" | "F") =>
    doc.rect(P(x), P(y), P(w), P(h), style);
  const text = (
    t: string,
    x: number,
    y: number,
    align?: "center" | "right",
  ) => doc.text(t, P(x), P(y), align ? { align } : undefined);

  const dashOn = () => doc.setLineDashPattern([0.9, 2.2], 0);
  const dashOff = () => doc.setLineDashPattern([], 0);

  // ---------- Bingkai lembar ----------
  doc.setDrawColor(20);
  doc.setLineWidth(1.1);
  rect(122, 28, 1510, 1103);

  // ---------- Header kiri (identik lembar asli) ----------
  doc.setTextColor(15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(46);
  text("PAPI", 150, 118);
  doc.setFontSize(13);
  text("PA Preference Inventory", 150, 158);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setLineWidth(0.9);
  text("Time started", 150, 222);
  rect(420, 197, 72, 35);
  text(fmtTime(meta.startedAt), 456, 221, "center");
  text("Time finished", 150, 289);
  rect(420, 264, 72, 35);
  text(fmtTime(meta.finishedAt), 456, 288, "center");

  text("Name", 150, 353);
  line(150, 365, 492, 365);
  text(meta.candidateName || "", 240, 359);
  text("Date", 150, 417);
  line(150, 429, 492, 429);
  text(fmtDate(meta.finishedAt ?? meta.startedAt) || "", 240, 423);

  doc.setFontSize(8.5);
  doc.setTextColor(105);
  text(`Kode   : ${meta.candidateCode || "-"}`, 150, 480);
  text(`Posisi : ${meta.position || "-"}`, 150, 502);
  text(`Terjawab : ${s.answered}/${s.total}`, 150, 524);
  doc.setTextColor(15);

  // ---------- Geometri grid ----------
  const colX = (c: number) => 1387 - (c - 1) * 85.4; // c = 1 (kanan) .. 9 (kiri)
  const rowY = (r: number) => 295 + (r - 1) * 77.2; // r = 1 (atas) .. 10 (bawah)
  const topBoxX = (i: number) => 729.5 + i * 85.4; // pusat kotak G..E
  const botBoxX = (i: number) => 701 + i * 83.4; // pusat kotak N..W
  const TOP_BOX_Y = 191;
  const BOT_BOX_Y = 1040;
  const BOX_H = 37;
  const BOX_W = 34;

  // ---------- Garis batas grid + diagonal tebal pemisah ----------
  doc.setLineWidth(1.1);
  line(615, 228, 615, 1047); // vertikal kiri
  line(1487, 240, 1580, 240); // takik kanan atas
  line(1580, 240, 1580, 1047); // vertikal kanan
  line(1487, 240, 615, 1047); // diagonal tebal role / need

  // ---------- Kotak skala atas (G L I T V S R D C E) ----------
  doc.setLineWidth(0.9);
  PAPI_TOP_ORDER.forEach((letter, i) => {
    const cx = topBoxX(i);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    text(letter, cx, 180, "center");
    rect(cx - BOX_W / 2, TOP_BOX_Y, BOX_W, BOX_H);
    doc.setFontSize(14);
    text(String(s.scales[letter] ?? 0), cx, TOP_BOX_Y + 27, "center");
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  text("Total", 648, 180, "center");
  rect(615, TOP_BOX_Y, 67, BOX_H);
  doc.setFontSize(14);
  text(String(s.totalTop), 648, TOP_BOX_Y + 27, "center");

  // ---------- Kotak skala bawah (N A P X B O Z K F W) ----------
  PAPI_BOTTOM_ORDER.forEach((letter, i) => {
    const cx = botBoxX(i);
    doc.setLineWidth(0.9);
    rect(cx - 18, BOT_BOX_Y, 36, BOX_H);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    text(String(s.scales[letter] ?? 0), cx, BOT_BOX_Y + 27, "center");
    doc.setFontSize(17);
    text(letter, cx, BOT_BOX_Y + 72, "center");
  });
  doc.setLineWidth(0.9);
  rect(1517, BOT_BOX_Y, 116, BOX_H);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  text(String(s.totalBottom), 1575, BOT_BOX_Y + 27, "center");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  text("Total", 1575, BOT_BOX_Y + 66, "center");

  // ---------- Rantai titik-titik diagonal (opsi B) ----------
  const anchor = (c: number, r: number): [number, number] => [colX(c) + 30, rowY(r) + 20];
  doc.setDrawColor(45);
  doc.setLineWidth(0.55);
  dashOn();
  for (let k = 0; k <= 8; k++) {
    // wilayah atas: sel (r, c = r + k), r = 1..9-k  -> kotak atas index 9-k
    const last = 9 - k;
    const [x1, y1] = anchor(1 + k, 1);
    const [x2, y2] = anchor(last + k, last);
    line(x1, y1, x2 + 42, y2 + 38);
    line(x1, y1, topBoxX(9 - k), TOP_BOX_Y + BOX_H + 4);
  }
  for (let k = 1; k <= 9; k++) {
    // wilayah bawah: sel (c, r = c + k), c = 1..10-k -> kotak bawah index k-1
    const last = 10 - k;
    const [x1, y1] = anchor(1, 1 + k);
    const [x2, y2] = anchor(last, last + k);
    line(x1 - 42, y1 - 38, x2, y2);
    line(x2, y2, botBoxX(k - 1), BOT_BOX_Y - 4);
  }
  dashOff();

  // ---------- Panah ----------
  const arrow = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    active: boolean,
  ) => {
    if (active) {
      doc.setDrawColor(12, 52, 110);
      doc.setLineWidth(2);
    } else {
      doc.setDrawColor(20);
      doc.setLineWidth(1);
    }
    line(x1, y1, x2, y2);
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const h = active ? 13 : 11;
    line(x2, y2, x2 - h * Math.cos(ang - 0.45), y2 - h * Math.sin(ang - 0.45));
    line(x2, y2, x2 - h * Math.cos(ang + 0.45), y2 - h * Math.sin(ang + 0.45));
    doc.setDrawColor(20);
    doc.setLineWidth(0.9);
  };

  // ---------- Sel item 1..90 ----------
  for (let n = 1; n <= 90; n++) {
    const c = Math.floor((n - 1) / 10) + 1;
    const r = ((n - 1) % 10) + 1;
    const x = colX(c);
    const y = rowY(r);
    const top = r <= c;
    const pick = (picks[n] ?? "").toUpperCase();
    const uy = y - 16;
    const ly = y + 13;

    // garis titik-titik horizontal (rantai opsi A sepanjang baris)
    doc.setDrawColor(45);
    doc.setLineWidth(0.55);
    dashOn();
    if (top ? c < 9 : c < r - 1) line(x - 48, uy, x + 6, uy);
    line(x - 22, ly, x + 14, ly);
    dashOff();
    doc.setDrawColor(20);

    // nomor item
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11.5);
    doc.setTextColor(15);
    text(String(n), x, y + 5, "center");

    // opsi A = panah atas, opsi B = panah bawah
    if (top) {
      arrow(x + 28, uy, x + 12, uy, pick === "A");
      arrow(x + 13, ly + 3, x + 31, ly - 11, pick === "B");
    } else {
      arrow(x + 12, uy, x + 28, uy, pick === "A");
      arrow(x + 31, ly - 11, x + 13, ly + 3, pick === "B");
    }

    // label opsi A / B agar mudah dipindahkan ke Excel skoring
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(pick === "A" ? 12 : 130, pick === "A" ? 52 : 130, pick === "A" ? 110 : 130);
    text("A", x + 42, uy + 4);
    doc.setTextColor(pick === "B" ? 12 : 130, pick === "B" ? 52 : 130, pick === "B" ? 110 : 130);
    text("B", x + 42, ly + 6);
    doc.setTextColor(15);
  }

  // ---------- Kepala panah tepi kiri (baris 1..9) ----------
  doc.setDrawColor(20);
  doc.setLineWidth(1.1);
  for (let r = 1; r <= 9; r++) {
    const vy = rowY(r) - 14;
    line(678, vy, 724, vy - 44);
    line(678, vy, 698, vy);
  }
  // ---------- Kepala panah tepi kanan (baris 2..10) ----------
  for (let r = 2; r <= 10; r++) {
    const uy = rowY(r) - 16;
    line(1462, uy, 1518, uy);
    line(1518, uy, 1534, uy - 16);
    line(1534, uy - 16, 1520, uy - 14);
  }


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
