import jsPDF from "jspdf";

export type BiodataField = { key: string; label: string };

export const BIODATA_FIELDS: BiodataField[] = [
  { key: "full_name", label: "Nama Lengkap" },
  { key: "gender", label: "Jenis Kelamin" },
  { key: "school_name", label: "Nama Sekolah/Universitas" },
  { key: "education", label: "Pendidikan" },
  { key: "major", label: "Jurusan" },
  { key: "work_experience", label: "Pernah Bekerja" },
  { key: "phone", label: "Telp/HP" },
  { key: "email", label: "Email" },
  { key: "position_applied", label: "Posisi" },
];

const BRAND = { r: 12, g: 58, b: 110 };

export function safeName(s: string) {
  return (s || "kandidat").replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "_") || "kandidat";
}

function codeOf(c: any) {
  return c.candidate_codes?.code ?? c.code_snapshot ?? "-";
}

function val(c: any, key: string) {
  const v = c[key];
  return v == null || v === "" ? "-" : String(v);
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function header(doc: jsPDF, title: string, subtitle: string, width: number) {
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, width, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("PT DOVER CHEMICAL", 40, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(title, 40, 48);
  doc.setFontSize(8);
  doc.text(subtitle, width - 40, 48, { align: "right" });
  doc.setTextColor(20, 20, 20);
}

const stamp = () => `Dicetak: ${new Date().toLocaleString("id-ID")}`;

/** Single-candidate biodata PDF (portrait, label/value table). */
export function exportCandidateBiodataPdf(c: any) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  header(doc, "Rekap Biodata Kandidat", stamp(), W);

  let y = 105;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(val(c, "full_name"), 40, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(`Kode Akses: ${codeOf(c)}`, 40, y + 15);
  doc.setTextColor(20, 20, 20);

  y += 40;
  const labelW = 180;
  const rowH = 26;
  BIODATA_FIELDS.forEach((f, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(244, 247, 251);
      doc.rect(40, y - 17, W - 80, rowH, "F");
    }
    doc.setDrawColor(220, 226, 234);
    doc.rect(40, y - 17, W - 80, rowH);
    doc.line(40 + labelW, y - 17, 40 + labelW, y - 17 + rowH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(f.label, 50, y);
    doc.setFont("helvetica", "normal");
    const text = doc.splitTextToSize(val(c, f.key), W - 80 - labelW - 20)[0] ?? "-";
    doc.text(text, 50 + labelW, y);
    y += rowH;
  });

  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text("Dokumen internal rekrutmen — PT Dover Chemical", 40, doc.internal.pageSize.getHeight() - 30);
  doc.save(`biodata_${safeName(c.full_name ?? "")}.pdf`);
}

/** All-candidates biodata PDF (landscape recap table). */
export function exportAllBiodataPdf(list: any[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const cols = [
    { label: "No.", w: 30 },
    { label: "Kode", w: 70 },
    ...BIODATA_FIELDS.map((f) => ({ label: f.label, w: 0 })),
  ];
  const fixed = 100;
  const each = (W - 80 - fixed) / BIODATA_FIELDS.length;
  cols.forEach((c, i) => { if (i >= 2) c.w = each; });

  let page = 1;
  const drawHead = () => {
    header(doc, `Rekap Biodata Seluruh Kandidat (${list.length})`, stamp(), W);
    let x = 40;
    doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
    doc.rect(40, 90, W - 80, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    cols.forEach((c) => {
      doc.text(doc.splitTextToSize(c.label, c.w - 8)[0], x + 4, 104);
      x += c.w;
    });
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "normal");
    return 112;
  };

  let y = drawHead();
  const rowH = 20;
  list.forEach((c, idx) => {
    if (y + rowH > H - 40) {
      doc.setFontSize(8);
      doc.setTextColor(130, 130, 130);
      doc.text(`Halaman ${page}`, W - 40, H - 20, { align: "right" });
      doc.addPage();
      page += 1;
      y = drawHead();
    }
    if (idx % 2 === 0) {
      doc.setFillColor(246, 249, 252);
      doc.rect(40, y, W - 80, rowH, "F");
    }
    doc.setDrawColor(224, 230, 238);
    doc.rect(40, y, W - 80, rowH);
    const values = [String(idx + 1), codeOf(c), ...BIODATA_FIELDS.map((f) => val(c, f.key))];
    let x = 40;
    doc.setFontSize(7.5);
    values.forEach((v, i) => {
      doc.text(doc.splitTextToSize(v, cols[i].w - 8)[0] ?? "-", x + 4, y + 13);
      x += cols[i].w;
    });
    y += rowH;
  });
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text(`Halaman ${page}`, W - 40, H - 20, { align: "right" });
  doc.save(`rekap_biodata_kandidat_${new Date().toISOString().slice(0, 10)}.pdf`);
}

async function buildWorkbook(list: any[], sheetName: string) {
  const ExcelJS = (await import("exceljs")).default ?? (await import("exceljs"));
  const wb = new (ExcelJS as any).Workbook();
  wb.creator = "PT Dover Chemical";
  wb.created = new Date();
  const ws = wb.addWorksheet(sheetName, { views: [{ state: "frozen", ySplit: 3 }] });
  const headers = ["No.", "Kode", ...BIODATA_FIELDS.map((f) => f.label)];

  ws.mergeCells(1, 1, 1, headers.length);
  const t = ws.getCell(1, 1);
  t.value = `PT DOVER CHEMICAL — Rekap Biodata Kandidat`;
  t.font = { bold: true, size: 14, color: { argb: "FF0C3A6E" } };
  t.alignment = { vertical: "middle" };
  ws.getRow(1).height = 24;

  ws.mergeCells(2, 1, 2, headers.length);
  const s = ws.getCell(2, 1);
  s.value = stamp();
  s.font = { size: 9, color: { argb: "FF666666" } };

  const head = ws.getRow(3);
  head.values = headers;
  head.eachCell((cell: any) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0C3A6E" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });
  head.height = 28;

  list.forEach((c, i) => {
    const row = ws.addRow([i + 1, codeOf(c), ...BIODATA_FIELDS.map((f) => val(c, f.key))]);
    row.eachCell((cell: any) => {
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.font = { size: 10 };
      cell.border = { top: { style: "hair" }, left: { style: "hair" }, bottom: { style: "hair" }, right: { style: "hair" } };
      if (i % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F7FB" } };
    });
  });

  ws.columns.forEach((col: any, i: number) => {
    let max = String(headers[i] ?? "").length;
    col.eachCell?.({ includeEmpty: false }, (cell: any, rn: number) => {
      if (rn > 3) max = Math.max(max, String(cell.value ?? "").length);
    });
    col.width = Math.min(38, Math.max(8, max + 4));
  });
  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: headers.length } };
  return wb;
}

export async function exportBiodataExcel(list: any[], filename: string, sheetName = "Biodata") {
  const wb = await buildWorkbook(list, sheetName);
  const buf = await wb.xlsx.writeBuffer();
  saveBlob(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
}
