import JSZip from "jszip";
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

/* ---------------------- util patch XML spreadsheet ---------------------- */

const colToNum = (letters: string) =>
  letters.split("").reduce((acc, ch) => acc * 26 + (ch.charCodeAt(0) - 64), 0);

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const attr = (tag: string, name: string) =>
  tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1] ?? "";

type CellValue = string | number | null;

function buildCell(ref: string, style: string, value: CellValue) {
  const s = style ? ` s="${style}"` : "";
  if (value === null || value === "") return `<c r="${ref}"${s}/>`;
  if (typeof value === "number")
    return `<c r="${ref}"${s} t="n"><v>${value}</v></c>`;
  return `<c r="${ref}"${s} t="inlineStr"><is><t>${esc(value)}</t></is></c>`;
}

/**
 * Menulis nilai pada sel tertentu dan/atau membuang cache hasil rumus
 * (`<v>`) supaya aplikasi spreadsheet menghitung ulang saat file dibuka.
 */
function patchSheet(xml: string, edits: Map<string, CellValue>, clearCache = true) {
  const rowRe = /<row\b[^>]*\/>|<row\b[^>]*>[\s\S]*?<\/row>/g;
  const cellRe = /<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/g;

  return xml.replace(rowRe, (rowXml) => {
    const rowNum = attr(rowXml, "r");
    const pending = new Map<string, CellValue>();
    for (const [ref, val] of edits) {
      if (ref.replace(/[A-Z]+/, "") === rowNum) pending.set(ref, val);
    }
    if (!pending.size && !clearCache) return rowXml;

    let out = rowXml.replace(cellRe, (cellXml) => {
      const ref = attr(cellXml, "r");
      if (pending.has(ref)) {
        const val = pending.get(ref)!;
        pending.delete(ref);
        return buildCell(ref, attr(cellXml, "s"), val);
      }
      if (!clearCache || !/<f[\s>/]/.test(cellXml)) return cellXml;
      // sel rumus: pertahankan <f>, buang cache <v> dan atribut t
      X
      const open = cellXml.match(/<c\b[^>]*?>/)?.[0] ?? `<c r="${ref}">`;
      const cleanOpen = open.replace(/\st="[^"]*"/, "");
      return `${cleanOpen}${formula}</c>`;
    });

    // sel yang belum ada pada baris: sisipkan sesuai urutan kolom
    for (const [ref, val] of pending) {
      const newCell = buildCell(ref, "", val);
      const target = colToNum(ref.replace(/\d+/, ""));
      const cells = out.match(cellRe) ?? [];
      const after = cells.find((c) => colToNum(attr(c, "r").replace(/\d+/, "")) > target);
      if (after) out = out.replace(after, newCell + after);
      else if (out.endsWith("</row>")) out = out.slice(0, -6) + newCell + "</row>";
    }
    return out;
  });
}

async function sheetPaths(zip: JSZip) {
  const wb = await zip.file("xl/workbook.xml")!.async("string");
  const rels = await zip.file("xl/_rels/workbook.xml.rels")!.async("string");
  const relMap = new Map<string, string>();
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attr(m[0], "Id");
    const t = attr(m[0], "Target").replace(/^\/?xl\//, "").replace(/^\.\//, "");
    if (id) relMap.set(id, `xl/${t}`);
  }
  const out: Array<{ name: string; path: string }> = [];
  for (const m of wb.matchAll(/<sheet\b[^>]*>/g)) {
    const name = attr(m[0], "name");
    const rid = attr(m[0], "r:id") || attr(m[0], "id");
    const path = relMap.get(rid);
    if (name && path) out.push({ name, path });
  }
  return { wbXml: wb, sheets: out };
}

/* ------------------------------- exporter ------------------------------- */

export async function exportDiscExcel(answers: DiscExcelAnswer[], meta: DiscExcelMeta = {}) {
  const res = await fetch(templateAsset.url);
  if (!res.ok) throw new Error("Template Excel DISC tidak dapat dimuat.");
  const zip = await JSZip.loadAsync(await res.arrayBuffer());
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

  let filled = 0;
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
  }

  // 2) Identitas kandidat pada kolom yang memang disediakan template
  const nama = [meta.candidateName, meta.candidateCode].filter(Boolean).join(" — ") || "-";
  edits.set("G2", nama);
  edits.set("G3", meta.age != null && meta.age !== "" ? Number(meta.age) || String(meta.age) : null);
  edits.set("G4", meta.gender ? String(meta.gender).toUpperCase() : null);
  edits.set(
    "G5",
    (meta.finishedAt ? new Date(meta.finishedAt) : new Date()).toLocaleDateString("id-ID"),
  );

  // 3) Patch sheet 1 + hapus cache rumus di seluruh sheet (Input, Result, dll)
  for (const s of sheets) {
    const file = zip.file(s.path);
    if (!file) continue;
    const xml = await file.async("string");
    zip.file(s.path, patchSheet(xml, s === main ? edits : new Map(), true));
  }

  // 4) Paksa hitung ulang saat file dibuka (grafik ikut ter-update)
  let wb = wbXml;
  wb = /<calcPr\b[^>]*\/>/.test(wb)
    ? wb.replace(/<calcPr\b([^>]*)\/>/, '<calcPr$1 fullCalcOnLoad="1" calcMode="auto"/>')
    : wb.replace("</workbook>", '<calcPr fullCalcOnLoad="1" calcMode="auto"/></workbook>');
  zip.file("xl/workbook.xml", wb);
  zip.remove("xl/calcChain.xml");

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    compression: "DEFLATE",
  });
  const safe = (meta.candidateName ?? "kandidat").replace(/[^\w\-]+/g, "_");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `DISC_${safe}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);

  return { filled, total: 24, valid: filled === 24 };
}
