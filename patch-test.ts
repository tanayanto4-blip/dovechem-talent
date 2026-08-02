import JSZip from "jszip";
import { readFileSync, writeFileSync } from "node:fs";
import {
  type CellValue,
  assertTemplateIntact,
  clearFormulaCache,
  forceRecalc,
  patchSheet,
  sheetPaths,
  snapshotZip,
} from "/dev-server/src/lib/xlsx-patch.ts";

const OPTION_KEYS = ["D", "I", "S", "C"];
const BLOCK_ROWS = [8, 14, 20, 26, 32, 38, 44, 50];
const COLUMN_SETS = [
  { p: "C", k: "E" },
  { p: "J", k: "L" },
  { p: "Q", k: "S" },
];

const zip = await JSZip.loadAsync(readFileSync("/tmp/disc/DISC-7.xlsx"));
const before = await snapshotZip(zip);
const { wbXml, sheets } = await sheetPaths(zip);
const main = sheets.find((s) => /disc\s*test/i.test(s.name)) ?? sheets[0];
console.log("sheets", sheets, "main", main);

const edits = new Map<string, CellValue>();
for (let g = 1; g <= 24; g++) {
  const set = COLUMN_SETS[Math.floor((g - 1) / 8)];
  const row0 = BLOCK_ROWS[(g - 1) % 8];
  for (let i = 0; i < 4; i++) {
    edits.set(`${set.p}${row0 + i}`, null);
    edits.set(`${set.k}${row0 + i}`, null);
  }
}
for (let g = 1; g <= 24; g++) {
  const mi = (g - 1) % 4;
  const li = (mi + 2) % 4;
  const set = COLUMN_SETS[Math.floor((g - 1) / 8)];
  const row0 = BLOCK_ROWS[(g - 1) % 8];
  edits.set(`${set.p}${row0 + mi}`, "x");
  edits.set(`${set.k}${row0 + li}`, "x");
}
edits.set("G2", "Budi Santoso — TEST01");
edits.set("G3", 27);
edits.set("G4", "L");
edits.set("G5", "02/08/2026");

const mainFile = zip.file(main.path)!;
zip.file(main.path, patchSheet(await mainFile.async("string"), edits, true));
const fb = await clearFormulaCache(zip, sheets, main.path);
forceRecalc(zip, wbXml);
await assertTemplateIntact(zip, before, main.path, "template DISC", fb);
writeFileSync("/tmp/disc/out.xlsx", await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
console.log("OK");
console.log(OPTION_KEYS.length);
