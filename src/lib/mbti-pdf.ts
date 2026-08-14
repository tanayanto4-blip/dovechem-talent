import jsPDF from "jspdf";

const TYPE_NICK: Record<string, string> = {
  ISTJ: "The Inspector",
  ISFJ: "The Protector",
  INFJ: "The Advocate",
  INTJ: "The Architect",
  ISTP: "The Craftsman",
  ISFP: "The Composer",
  INFP: "The Healer",
  INTP: "The Thinker",
  ESTP: "The Dynamo",
  ESFP: "The Performer",
  ENFP: "The Champion",
  ENTP: "The Visionary",
  ESTJ: "The Supervisor",
  ESFJ: "The Provider",
  ENFJ: "The Teacher",
  ENTJ: "The Commander",
};

const DIM_TITLE: Record<string, string> = {
  EI: "Sumber Energi (E/I)",
  SN: "Cara Mengolah Informasi (S/N)",
  TF: "Cara Mengambil Keputusan (T/F)",
  JP: "Gaya Kerja (J/P)",
};

export interface MbtiPdfMeta {
  candidateName?: string | null;
  candidateCode?: string | null;
  position?: string | null;
  attemptId: string;
  finishedAt?: string | null;
  score?: number | null;
}

export function exportMbtiPdf(result: any, meta: MbtiPdfMeta) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  const line = (
    text: string,
    size = 10,
    bold = false,
    color: [number, number, number] = [30, 30, 30],
  ) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const wrapped = doc.splitTextToSize(text, pageW - margin * 2);
    if (y + wrapped.length * (size + 2) > pageH - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(wrapped, margin, y);
    y += wrapped.length * (size + 2);
  };
  const gap = (h = 8) => {
    y += h;
  };
  const hr = () => {
    doc.setDrawColor(200);
    doc.line(margin, y, pageW - margin, y);
    y += 8;
  };

  // Header
  doc.setFillColor(15, 55, 110);
  doc.rect(0, 0, pageW, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("PT DOVER CHEMICAL", margin, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Laporan Hasil Psikotes MBTI", margin, 52);
  y = 90;

  // Meta
  line("Data Kandidat", 12, true, [15, 55, 110]);
  hr();
  const rows: [string, string][] = [
    ["Nama", meta.candidateName || "-"],
    ["Kode Akses", meta.candidateCode || "-"],
    ["Posisi Dilamar", meta.position || "-"],
    ["Attempt ID", meta.attemptId],
    ["Tanggal Selesai", meta.finishedAt ? new Date(meta.finishedAt).toLocaleString("id-ID") : "-"],
    ["Skor Total", meta.score != null ? String(meta.score) : "-"],
  ];
  rows.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text(k, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20);
    doc.text(String(v), margin + 130, y);
    y += 14;
  });
  gap();

  // Type
  const type: string = result?.type || "-";
  line("Tipe MBTI", 12, true, [15, 55, 110]);
  hr();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(15, 55, 110);
  doc.text(type, margin, y + 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(80);
  doc.text(TYPE_NICK[type] || "", margin + 110, y + 20);
  y += 40;

  // Dimensions
  line("Skor per Dimensi", 12, true, [15, 55, 110]);
  hr();
  const pairs = ["EI", "SN", "TF", "JP"] as const;
  pairs.forEach((pair) => {
    const [x, yl] = pair.split("");
    const cx = result?.counts?.[x] ?? 0;
    const cy = result?.counts?.[yl] ?? 0;
    const dominant = cx >= cy ? x : yl;
    const clarity = result?.clarity?.[pair] ?? 0;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30);
    if (y + 40 > pageH - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(DIM_TITLE[pair], margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);
    doc.text(
      `Dominan: ${dominant}   |   ${x}: ${cx}   ${yl}: ${cy}   |   Kejelasan: ${clarity}%`,
      margin,
      y + 14,
    );
    // bar
    const barW = pageW - margin * 2;
    const total = Math.max(1, cx + cy);
    const leftW = (cx / total) * barW;
    doc.setFillColor(15, 55, 110);
    doc.rect(margin, y + 20, leftW, 8, "F");
    doc.setFillColor(200, 210, 225);
    doc.rect(margin + leftW, y + 20, barW - leftW, 8, "F");
    y += 40;
  });

  // Footer
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`PT Dover Chemical — Laporan MBTI — Halaman ${i}/${total}`, pageW / 2, pageH - 20, {
      align: "center",
    });
  }

  const safeName = (meta.candidateName || "kandidat").replace(/[^a-z0-9]+/gi, "_");
  doc.save(`MBTI_${safeName}_${meta.attemptId.slice(0, 8)}.pdf`);
}
