import JSZip from "jszip";

/**
 * Utilitas patch XLSX pada level XML mentah.
 *
 * Dipakai oleh exporter skoring (DISC, PAPI Kostick) agar template Excel resmi
 * tetap UTUH: rumus, format, sheet tersembunyi, grafik, dan relasi antar sheet
 * tidak pernah ditulis ulang oleh library spreadsheet. Hanya sheet input
 * (sheet 1) yang disentuh; sheet lain dibiarkan apa adanya dan divalidasi
 * byte-per-byte sebelum file diunduh.
 */

export type CellValue = string | number | null;

export const colToNum = (letters: string) =>
  letters.split("").reduce((acc, ch) => acc * 26 + (ch.charCodeAt(0) - 64), 0);

export const escXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const attr = (tag: string, name: string) =>
  tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1] ?? "";

function buildCell(ref: string, style: string, value: CellValue) {
  const s = style ? ` s="${style}"` : "";
  if (value === null || value === "") return `<c r="${ref}"${s}/>`;
  if (typeof value === "number") return `<c r="${ref}"${s} t="n"><v>${value}</v></c>`;
  return `<c r="${ref}"${s} t="inlineStr"><is><t>${escXml(value)}</t></is></c>`;
}

/**
 * Menulis nilai pada sel tertentu dan/atau membuang cache hasil rumus (`<v>`)
 * supaya aplikasi spreadsheet menghitung ulang saat file dibuka. Elemen `<f>`
 * (rumus) selalu dipertahankan apa adanya.
 */
export function patchSheet(xml: string, edits: Map<string, CellValue>, clearCache = true) {
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
      const formula = cellXml.match(/<f\b[^>]*\/>|<f\b[^>]*>[\s\S]*?<\/f>/)?.[0] ?? "";
      const open = cellXml.match(/<c\b[^>]*?>/)?.[0] ?? `<c r="${ref}">`;
      const cleanOpen = open.replace(/\st="[^"]*"/, "");
      return `${cleanOpen}${formula}</c>`;
    });

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

/** Daftar sheet (nama + path XML) sesuai urutan pada workbook. */
export async function sheetPaths(zip: JSZip) {
  const wb = await zip.file("xl/workbook.xml")!.async("string");
  const rels = await zip.file("xl/_rels/workbook.xml.rels")!.async("string");
  const relMap = new Map<string, string>();
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attr(m[0], "Id");
    const t = attr(m[0], "Target")
      .replace(/^\/?xl\//, "")
      .replace(/^\.\//, "");
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

/** Tandai workbook agar seluruh rumus dihitung ulang saat file dibuka. */
export function forceRecalc(zip: JSZip, wbXml: string) {
  const wb = /<calcPr\b[^>]*\/>/.test(wbXml)
    ? wbXml.replace(/<calcPr\b([^>]*)\/>/, '<calcPr$1 fullCalcOnLoad="1" calcMode="auto"/>')
    : wbXml.replace("</workbook>", '<calcPr fullCalcOnLoad="1" calcMode="auto"/></workbook>');
  zip.file("xl/workbook.xml", wb);
  zip.remove("xl/calcChain.xml");
}

/** File yang boleh berubah / dihapus oleh exporter. */
export const ALLOWED_MODIFIED = ["xl/workbook.xml"];
export const ALLOWED_REMOVED = ["xl/calcChain.xml"];

export async function snapshotZip(zip: JSZip) {
  const snap = new Map<string, string>();
  await Promise.all(
    Object.keys(zip.files).map(async (name) => {
      const f = zip.file(name);
      if (f && !f.dir) snap.set(name, await f.async("base64"));
    }),
  );
  return snap;
}

/** Semua rumus (`<f>`) pada sebuah sheet, untuk perbandingan integritas. */
export const formulaSignature = (xml: string) =>
  (xml.match(/<f\b[^>]*\/>|<f\b[^>]*>[\s\S]*?<\/f>/g) ?? []).join("\u0001");

/**
 * Membuang cache hasil rumus pada sheet selain sheet input. Rumus, layout,
 * gaya, dan grafik tidak diubah — hanya nilai hasil lama yang dihapus supaya
 * sheet tersebut dihitung ulang (terisi otomatis dari sheet 1) oleh Excel,
 * LibreOffice, maupun Google Sheets saat file dibuka.
 */
export async function clearFormulaCache(
  zip: JSZip,
  sheets: Array<{ name: string; path: string }>,
  mainPath: string,
) {
  const formulas = new Map<string, string>();
  for (const s of sheets) {
    if (s.path === mainPath) continue;
    const file = zip.file(s.path);
    if (!file) continue;
    const xml = await file.async("string");
    formulas.set(s.path, formulaSignature(xml));
    zip.file(s.path, patchSheet(xml, new Map(), true));
  }
  return formulas;
}

/**
 * Memastikan hanya sheet input yang isinya berubah.
 *
 * - Sheet lain boleh kehilangan cache nilai, tetapi daftar rumusnya WAJIB
 *   identik dengan template (dicek lewat `formulaSignature`).
 * - Grafik (xl/charts/*), drawing, styles, theme, dan file lain harus identik
 *   byte-per-byte. Jika tidak, ekspor dibatalkan.
 */
export async function assertTemplateIntact(
  zip: JSZip,
  before: Map<string, string>,
  mainPath: string,
  label = "Template",
  formulaBefore: Map<string, string> = new Map(),
) {
  const allowed = new Set([...ALLOWED_MODIFIED, mainPath, ...formulaBefore.keys()]);
  const after = await snapshotZip(zip);
  const changed: string[] = [];

  for (const [name, data] of before) {
    if (!after.has(name)) {
      if (!ALLOWED_REMOVED.includes(name)) changed.push(`hilang: ${name}`);
      continue;
    }
    if (after.get(name) !== data && !allowed.has(name)) changed.push(`berubah: ${name}`);
  }
  for (const name of after.keys()) {
    if (!before.has(name)) changed.push(`baru: ${name}`);
  }

  // rumus pada sheet non-input wajib persis sama
  for (const [path, sig] of formulaBefore) {
    const f = zip.file(path);
    const now = f ? formulaSignature(await f.async("string")) : "";
    if (now !== sig) changed.push(`rumus berubah: ${path}`);
  }

  if (changed.length) {
    throw new Error(
      `Ekspor dibatalkan — ${label} harus tetap utuh. Bagian berikut ikut berubah: ${changed.join(", ")}`,
    );
  }
}
