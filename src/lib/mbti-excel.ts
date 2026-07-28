import ExcelJS from "exceljs";
import templateAsset from "@/assets/mbti-template.xlsx.asset.json";

/**
 * Mengisi template Excel skoring MBTI (S-MBTI) resmi dengan jawaban kandidat.
 * Baris soal n berada di baris Excel n + 3.
 * Jawaban "A" -> kolom D bernilai 1, jawaban "B" -> kolom E bernilai 1.
 * Rumus skoring (D68:E71, C74:F74) sudah ada di template dan dihitung otomatis oleh Excel.
 */
export interface MbtiExcelMeta {
  candidateName?: string | null;
  candidateCode?: string | null;
  position?: string | null;
  education?: string | null;
  finishedAt?: string | null;
}

export interface MbtiExcelAnswer {
  question_number: number;
  answer: string | null | undefined;
}

export async function exportMbtiExcel(answers: MbtiExcelAnswer[], meta: MbtiExcelMeta = {}) {
  const res = await fetch(templateAsset.url);
  if (!res.ok) throw new Error("Template Excel MBTI tidak dapat dimuat.");
  const buf = await res.arrayBuffer();

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];

  // Kosongkan kolom isian lalu isi sesuai jawaban kandidat
  for (let n = 1; n <= 60; n++) {
    const row = n + 3;
    ws.getCell(`D${row}`).value = null;
    ws.getCell(`E${row}`).value = null;
  }
  let filled = 0;
  for (const a of answers) {
    const n = Number(a.question_number);
    if (!Number.isFinite(n) || n < 1 || n > 60) continue;
    const key = String(a.answer ?? "").trim().toUpperCase();
    if (key !== "A" && key !== "B") continue;
    ws.getCell(`${key === "A" ? "D" : "E"}${n + 3}`).value = 1;
    filled++;
  }

  // Identitas kandidat pada baris tanda tangan
  const nama = [meta.candidateName, meta.candidateCode].filter(Boolean).join(" — ") || "-";
  ws.getCell("B64").value = `Nama lengkap & Usia : ${nama}`;
  ws.getCell("E64").value = `Pendidikan & Jabatan : ${meta.education ?? "-"} - ${meta.position ?? "-"}`;

  // Paksa Excel menghitung ulang seluruh rumus saat file dibuka
  (wb as any).calcProperties = { ...(wb as any).calcProperties, fullCalcOnLoad: true };

  const out = await wb.xlsx.writeBuffer();
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const safe = (meta.candidateName ?? "kandidat").replace(/[^\w\-]+/g, "_");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `MBTI_${safe}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
  return { filled };
}
