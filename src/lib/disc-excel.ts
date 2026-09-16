import { deliverXlsx } from "@/lib/xlsx-deliver";
import JSZip from "jszip";
import {
  type CellValue,
  assertTemplateIntact,
  clearFormulaCache,
  forceRecalc,
  patchSheet,
  sheetPaths,
  snapshotZip,
} from "@/lib/xlsx-patch";
import type { CandidateMeta } from "@/lib/candidate-meta";
import templateAsset from "@/assets/disc-template.xlsx.asset.json";

/**
 * Mengisi template Excel skoring DISC resmi dengan jawaban kandidat.
 *
 * Penting: file di-patch langsung pada level XML (bukan ditulis ulang oleh
 * library spreadsheet) sehingga SEMUA isi template tetap utuh — rumus,
 * format, sheet tersembunyi, dan grafik pada sheet "Result".
 *
 * Yang diisi hanya:
 *   - tanda "x" pada kolom P (PALING) dan K (PALING TIDAK) di sheet 1
 *   - identitas kandidat pada G2..G5 sheet 1
 *
 * Sheet 2 (Input) dan sheet 3 (Result + grafik) terisi otomatis oleh rumus
 * bawaan template: seluruh cache nilai lama dihapus dan workbook ditandai
 * fullCalcOnLoad agar Excel/LibreOffice/Sheets menghitung ulang saat dibuka.
 *
 * Tata letak sheet "DISC Test":
 *   - Kelompok 1-8   -> kolom P = C, K = E
 *   - Kelompok 9-16  -> kolom P = J, K = L
 *   - Kelompok 17-24 -> kolom P = Q, K = S
 *   - Baris awal tiap kelompok: 8, 14, 20, 26, 32, 38, 44, 50 (4 pernyataan)
 */
export interface DiscExcelMeta extends CandidateMeta {}

export interface DiscExcelAnswer {
  question_number: number;
  /** JSON string {"most":"D","least":"S"} atau objek langsung */
  answer: string | { most?: string; least?: string } | null | undefined;
}

const OPTION_KEYS = ["D", "I", "S", "C"];
const BLOCK_ROWS = [8, 14, 20, 26, 32, 38, 44, 50];
const COLUMN_SETS: Array<{ p: string; k: string }> = [
  { p: "C", k: "E" },
  { p: "J", k: "L" },
  { p: "Q", k: "S" },
];

function parseAnswer(raw: DiscExcelAnswer["answer"]): { most?: string; least?: string } {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

function optionIndex(key: string | undefined): number {
  if (!key) return -1;
  const i = OPTION_KEYS.indexOf(String(key).trim().toUpperCase());
  if (i >= 0) return i;
  const n = Number(key);
  return Number.isFinite(n) && n >= 1 && n <= 4 ? n - 1 : -1;
}

/* --------------------- kunci resmi template (sheet Input) --------------------- */

/**
 * Membaca kunci konversi posisi pernyataan -> huruf DISC langsung dari rumus
 * template (sheet "Input"). Sebagian pernyataan bernilai "*" (netral / tidak
 * diskor). Bila kandidat banyak memilih pernyataan netral, grafik pada sheet
 * Result tidak bisa diklasifikasikan dan keterangan tipe tampil #N/A.
 */
function readNeutralKey(inputXml: string) {
  const cells = new Map<string, string>();
  for (const m of inputXml.matchAll(/<c r="([A-Z]+\d+)"[^>]*>([\s\S]*?)<\/c>/g)) {
    const f = /<f[^>]*>([\s\S]*?)<\/f>/.exec(m[2]);
    if (f)
      cells.set(
        m[1],
        f[1].replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&"),
      );
  }
  const keyOf = (ref: string) => {
    const out: Record<number, string> = {};
    for (const k of (cells.get(ref) ?? "").matchAll(/=(\d),"(.)"/g)) out[Number(k[1])] = k[2];
    return out;
  };
  const P_COLS = ["E", "J", "O"];
  const K_COLS = ["F", "K", "P"];
  const most: Array<Record<number, string>> = [];
  const least: Array<Record<number, string>> = [];
  for (let g = 1; g <= 24; g++) {
    const i = Math.floor((g - 1) / 8);
    const row = 6 + ((g - 1) % 8);
    most.push(keyOf(`${P_COLS[i]}${row}`));
    least.push(keyOf(`${K_COLS[i]}${row}`));
  }
  return { most, least };
}

/* ------------------------------- exporter ------------------------------- */

export async function exportDiscExcel(answers: DiscExcelAnswer[], meta: DiscExcelMeta = {}) {
  const res = await fetch(templateAsset.url);

  if (!res.ok) throw new Error("Template Excel DISC tidak dapat dimuat.");
  const zip = await JSZip.loadAsync(await res.arrayBuffer());
  const before = await snapshotZip(zip);
  const { wbXml, sheets } = await sheetPaths(zip);
  const main = sheets.find((s) => /disc\s*test/i.test(s.name)) ?? sheets[0];

  // 1) Kosongkan semua kolom P/K, lalu isi sesuai jawaban kandidat
  const edits = new Map<string, CellValue>();
  for (let g = 1; g <= 24; g++) {
    const set = COLUMN_SETS[Math.floor((g - 1) / 8)];
    const row0 = BLOCK_ROWS[(g - 1) % 8];
    for (let i = 0; i < 4; i++) {
      edits.set(`${set.p}${row0 + i}`, null);
      edits.set(`${set.k}${row0 + i}`, null);
    }
  }

  const inputSheet = sheets.find((s) => /^input$/i.test(s.name.trim()));
  const key = inputSheet
    ? readNeutralKey(await zip.file(inputSheet.path)!.async("string"))
    : null;

  let filled = 0;
  let neutralMost = 0;
  for (const a of answers) {
    const g = Number(a.question_number);
    if (!Number.isFinite(g) || g < 1 || g > 24) continue;
    const { most, least } = parseAnswer(a.answer);
    const mi = optionIndex(most);
    const li = optionIndex(least);
    if (mi < 0 && li < 0) continue;
    const set = COLUMN_SETS[Math.floor((g - 1) / 8)];
    const row0 = BLOCK_ROWS[(g - 1) % 8];
    if (mi >= 0) edits.set(`${set.p}${row0 + mi}`, "x");
    if (li >= 0) edits.set(`${set.k}${row0 + li}`, "x");
    if (mi >= 0 && li >= 0) filled++;
    if (key && mi >= 0 && (key.most[g - 1]?.[mi + 1] ?? "*") === "*") neutralMost++;
  }


  // 2) Identitas kandidat pada kolom yang memang disediakan template
  const nama = [meta.candidateName, meta.candidateCode].filter(Boolean).join(" — ") || "-";
  edits.set("G2", nama);
  edits.set(
    "G3",
    meta.age != null && meta.age !== "" ? Number(meta.age) || String(meta.age) : null,
  );
  edits.set("G4", meta.gender ? String(meta.gender).toUpperCase() : null);
  edits.set(
    "G5",
    (meta.finishedAt ? new Date(meta.finishedAt) : new Date()).toLocaleDateString("id-ID"),
  );

  // 3) HANYA sheet 1 yang di-patch. Sheet lain (Input, Result + grafik) sama
  //    sekali tidak disentuh agar rumus & cache-nya tetap terbaca.
  const mainFile = zip.file(main.path);
  if (!mainFile) throw new Error("Sheet utama template DISC tidak ditemukan.");
  const originalMain = await mainFile.async("string");
  zip.file(main.path, patchSheet(originalMain, edits, true));

  // Sheet Input & Result tidak diubah — hanya cache nilai lama dibuang agar
  // terisi otomatis dari sheet 1; rumusnya divalidasi tetap identik.
  const formulaBefore = await clearFormulaCache(zip, sheets, main.path);

  // 4) Paksa hitung ulang saat file dibuka (grafik ikut ter-update)
  forceRecalc(zip, wbXml);

  // 5) Kunci integritas: pastikan tidak ada bagian template lain yang berubah
  await assertTemplateIntact(zip, before, main.path, "template DISC", formulaBefore);

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    compression: "DEFLATE",
  });

  const safe = (meta.candidateName ?? "kandidat").replace(/[^\w\-]+/g, "_");
  deliverXlsx(blob, `DISC_${safe}_${new Date().toISOString().slice(0, 10)}.xlsx`);

  return { filled, total: 24, valid: filled === 24, neutralMost };
}
