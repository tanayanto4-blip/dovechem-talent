import jsPDF from "jspdf";
import doverLogo from "@/assets/dover-logo.jpg.asset.json";
import type { CandidateMeta } from "@/lib/candidate-meta";

/**
 * Lembar hasil generik (PDF) untuk test yang BELUM punya file skoring Excel
 * (mis. Tes Buta Warna / Ishihara, soal pilihan ganda umum, kepribadian lain).
 *
 * Isinya: kop berlogo PT Dover Chemical, tabel biodata kandidat (auto-fill),
 * tabel ringkasan skor, dan tabel lembar jawaban per nomor.
 */

export interface ResultSheetRow {
  question_number: number;
  answer?: string | null;
  correct_answer?: string | null;
}

export interface ResultSheetInput {
  testName: string;
  testType?: string | null;
  meta: CandidateMeta & { startedAt?: string | null };
  rows: ResultSheetRow[];
  /** Ringkasan bebas: [label, nilai] — mis. Benar / Salah / Skor. */
  summary?: Array<[string, string]>;
}

const BLUE: [number, number, number] = [21, 62, 117];
const LIGHT: [number, number, number] = [232, 238, 246];

const fmt = (v?: string | null) =>
  v ? new Date(v).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-";

const safe = (v: unknown) => {
  const s = v === null || v === undefined || v === "" ? "-" : String(v);
  return s.length > 60 ? `${s.slice(0, 57)}...` : s;
};

async function logoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(doverLogo.url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(new Error("logo gagal dibaca"));
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportResultSheetPdf(input: ResultSheetInput) {
  const logo = await logoDataUrl();
  const doc = buildResultSheetDoc(input, logo);
  const nameSlug = (input.meta.candidateName || "kandidat")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
  const testSlug = input.testName.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
  doc.save(`lembar-hasil-${testSlug}-${nameSlug}.pdf`);
  return { total: input.rows.length };
}

/** Menggambar dokumen (dipakai juga oleh pemeriksaan visual otomatis). */
export function buildResultSheetDoc(input: ResultSheetInput, logo: string | null) {
  const { testName, meta, rows, summary = [] } = input;
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const M = 40;

  const header = () => {
    doc.setFillColor(...BLUE);
    doc.rect(0, 0, pw, 70, "F");
    if (logo) {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(M - 4, 13, 52, 44, 4, 4, "F");
      try {
        doc.addImage(logo, "JPEG", M, 17, 44, 36);
      } catch {
        /* abaikan */
      }
    }
    const x = logo ? M + 62 : M;
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("PT DOVER CHEMICAL", x, 32);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Lembar Hasil Psikotest", x, 48);
    doc.setFontSize(9);
    doc.text(testName.toUpperCase(), pw - M, 48, { align: "right" });
    doc.setTextColor(20);
  };

  const footer = () => {
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text("Dokumen internal rekrutmen PT Dover Chemical", M, ph - 20);
      doc.text(`Halaman ${i} / ${pages}`, pw - M, ph - 20, { align: "right" });
      doc.setTextColor(20);
    }
  };

  /** Tabel dua kolom (label | nilai). */
  const infoTable = (title: string, data: Array<[string, string]>, startY: number) => {
    let y = startY;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BLUE);
    doc.text(title, M, y);
    doc.setTextColor(20);
    y += 10;
    const w = pw - M * 2;
    const labelW = 150;
    const rowH = 18;
    doc.setFontSize(9);
    data.forEach(([label, value], i) => {
      if (y + rowH > ph - 50) {
        doc.addPage();
        header();
        y = 90;
      }
      doc.setFillColor(...(i % 2 === 0 ? LIGHT : ([255, 255, 255] as [number, number, number])));
      doc.rect(M, y, w, rowH, "F");
      doc.setDrawColor(205, 213, 224);
      doc.rect(M, y, w, rowH);
      doc.line(M + labelW, y, M + labelW, y + rowH);
      doc.setFont("helvetica", "bold");
      doc.text(label, M + 6, y + 12);
      doc.setFont("helvetica", "normal");
      doc.text(safe(value), M + labelW + 6, y + 12);
      y += rowH;
    });
    return y + 20;
  };

  header();
  let y = 96;

  const bio: Array<[string, string]> = [
    ["Nama kandidat", safe(meta.candidateName)],
    ["Kode akses", safe(meta.candidateCode)],
    ["Posisi dilamar", safe(meta.position)],
    ["Jenis kelamin", safe(meta.gender)],
    ["Tempat, tanggal lahir", `${safe(meta.birthPlace)}, ${safe(meta.birthDate)}`],
    ["Usia", safe(meta.age)],
    ["Pendidikan", safe(meta.education)],
    ["Sekolah / Universitas", safe(meta.school)],
    ["Jurusan", safe(meta.major)],
    ["Pengalaman kerja", safe(meta.workExperience)],
    ["No. telepon", safe(meta.phone)],
    ["Email", safe(meta.email)],
  ];
  y = infoTable("DATA KANDIDAT", bio, y);

  const summaryRows: Array<[string, string]> = [
    ["Nama test", testName],
    ["Mulai", fmt(meta.startedAt)],
    ["Selesai", fmt(meta.finishedAt)],
    ["Jumlah soal", String(rows.length)],
    ["Terjawab", String(rows.filter((r) => String(r.answer ?? "").trim() !== "").length)],
    ...summary,
  ];
  y = infoTable("RINGKASAN HASIL", summaryRows, y);

  // ---------- Lembar jawaban ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLUE);
  doc.text("LEMBAR JAWABAN", M, y);
  doc.setTextColor(20);
  y += 10;

  const hasKey = rows.some((r) => String(r.correct_answer ?? "").trim() !== "");
  const cols = hasKey ? 2 : 3; // blok tabel bersebelahan
  const gap = 14;
  const blockW = (pw - M * 2 - gap * (cols - 1)) / cols;
  const noW = 38;
  const keyW = hasKey ? 72 : 0;
  const rowH = 16;

  /** Menggambar satu blok kolom tabel jawaban. */
  const drawBlock = (block: ResultSheetRow[], x: number, topY: number) => {
    let by = topY;
    doc.setFillColor(...BLUE);
    doc.rect(x, by, blockW, rowH, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("No", x + 6, by + 11);
    doc.text("Jawaban", x + noW + 6, by + 11);
    if (hasKey) doc.text("Kunci", x + blockW - keyW + 6, by + 11);
    doc.setTextColor(20);
    by += rowH;

    doc.setFont("helvetica", "normal");
    block.forEach((r, i) => {
      doc.setFillColor(...(i % 2 === 0 ? ([255, 255, 255] as [number, number, number]) : LIGHT));
      doc.rect(x, by, blockW, rowH, "F");
      doc.setDrawColor(205, 213, 224);
      doc.rect(x, by, blockW, rowH);
      doc.line(x + noW, by, x + noW, by + rowH);
      if (hasKey) doc.line(x + blockW - keyW, by, x + blockW - keyW, by + rowH);
      doc.setFontSize(8.5);
      doc.text(String(r.question_number), x + 6, by + 11);
      const ans = String(r.answer ?? "").trim();
      doc.text(ans ? (ans.length > 18 ? `${ans.slice(0, 17)}…` : ans) : "-", x + noW + 6, by + 11);
      if (hasKey) {
        const key = String(r.correct_answer ?? "").trim();
        const ok = key && ans && key.toLowerCase() === ans.toLowerCase();
        if (key) {
          doc.setTextColor(
            ...(ok
              ? ([21, 128, 61] as [number, number, number])
              : ([185, 28, 28] as [number, number, number])),
          );
          doc.text(`${key} ${ok ? "(B)" : "(S)"}`, x + blockW - keyW + 6, by + 11);
          doc.setTextColor(20);
        } else {
          doc.text("-", x + blockW - keyW + 6, by + 11);
        }
      }
      by += rowH;
    });
    return by;
  };

  // Paginasi: potong tabel jawaban agar tidak melewati batas halaman.
  const bottomLimit = ph - 70;
  let cursor = 0;
  let tableBottom = y;
  while (cursor < rows.length) {
    const avail = Math.max(3, Math.floor((bottomLimit - y - rowH) / rowH));
    const chunk = rows.slice(cursor, cursor + avail * cols);
    const perBlock = Math.ceil(chunk.length / cols) || 1;
    for (let bi = 0; bi < cols; bi++) {
      const block = chunk.slice(bi * perBlock, (bi + 1) * perBlock);
      if (block.length) drawBlock(block, M + bi * (blockW + gap), y);
    }
    tableBottom = y + rowH * (perBlock + 1);
    cursor += chunk.length;
    if (cursor < rows.length) {
      doc.addPage();
      header();
      y = 100;
      tableBottom = y;
    }
  }

  let sy = tableBottom + 40;
  if (sy > ph - 120) {
    doc.addPage();
    header();
    sy = 120;
  }

  // ---------- Kolom catatan & tanda tangan ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BLUE);
  doc.text("CATATAN PENILAI", M, sy);
  doc.setTextColor(20);
  doc.setDrawColor(205, 213, 224);
  doc.rect(M, sy + 8, pw - M * 2, 70);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.line(pw - M - 160, sy + 122, pw - M, sy + 122);
  doc.text("Penilai / HR", pw - M - 160, sy + 136);

  footer();

  return doc;
}
