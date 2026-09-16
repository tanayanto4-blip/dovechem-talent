import JSZip from "jszip";
import { withXlsxCapture, type CapturedXlsx } from "@/lib/xlsx-deliver";

/**
 * Rangkuman kandidat: menjalankan seluruh exporter Excel skoring (Resume,
 * PAPI, DISC, MBTI, WPT, Profiling) lalu menggabungkannya menjadi satu arsip
 * ZIP dengan penomoran sesuai urutan berkas contoh.
 */
export async function buildCandidateExcelBundle(run: () => Promise<void>) {
  return withXlsxCapture(run);
}

export async function downloadExcelBundle(files: CapturedXlsx[], candidateName: string) {
  if (!files.length) throw new Error("Tidak ada file skoring yang bisa dirangkum");
  const zip = new JSZip();
  files.forEach((f, i) => {
    zip.file(`${String(i + 1).padStart(2, "0")}_${f.filename}`, f.blob);
  });
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  const safe = (candidateName || "kandidat").replace(/[^\w\-]+/g, "_");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Rangkuman_${safe}_${new Date().toISOString().slice(0, 10)}.zip`;
  a.click();
  URL.revokeObjectURL(url);
  return files.length;
}
