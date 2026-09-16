import type ExcelJS from "exceljs";

/**
 * Evaluator rumus Excel sederhana.
 *
 * Dipakai saat mencetak PDF dari file Excel skoring: exporter sengaja
 * membuang cached value agar Excel menghitung ulang, sehingga nilai hasil
 * rumus harus dihitung ulang di sini supaya PDF tetap berisi angka.
 *
 * Mendukung: referensi antar-sheet, range, operator aritmatika/perbandingan,
 * serta fungsi yang dipakai template (IF, SUM, HLOOKUP, dst).
 */

export type CellVal = string | number | boolean | null;

const colNum = (s: string) =>
  s.toUpperCase().split("").reduce((a, ch) => a * 26 + (ch.charCodeAt(0) - 64), 0);

interface Tok {
  t: "num" | "str" | "ref" | "op" | "fn" | "par" | "sep" | "bool";
  v: string;
}

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const refRe =
    /^((?:'[^']+'|[A-Za-z0-9_ .]+)!)?\$?[A-Za-z]{1,3}\$?\d{1,7}(:\$?[A-Za-z]{1,3}\$?\d{1,7})?/;
  while (i < src.length) {
    const ch = src[i]!;
    if (ch === " ") {
      i++;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      let s = "";
      while (j < src.length) {
        if (src[j] === '"' && src[j + 1] === '"') {
          s += '"';
          j += 2;
          continue;
        }
        if (src[j] === '"') break;
        s += src[j];
        j++;
      }
      out.push({ t: "str", v: s });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(src[i + 1] ?? ""))) {
      const m = /^[0-9]*\.?[0-9]+(?:[eE][-+]?\d+)?/.exec(src.slice(i))!;
      out.push({ t: "num", v: m[0] });
      i += m[0].length;
      continue;
    }
    if (ch === "(" || ch === ")") {
      out.push({ t: "par", v: ch });
      i++;
      continue;
    }
    if (ch === "," || ch === ";") {
      out.push({ t: "sep", v: "," });
      i++;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (two === "<=" || two === ">=" || two === "<>") {
      out.push({ t: "op", v: two });
      i += 2;
      continue;
    }
    if ("+-*/^&=<>%".includes(ch)) {
      out.push({ t: "op", v: ch });
      i++;
      continue;
    }
    const rest = src.slice(i);
    const fn = /^[A-Za-z_][A-Za-z0-9_.]*\s*\(/.exec(rest);
    const ref = refRe.exec(rest);
    if (fn && (!ref || fn[0].length - 1 >= ref[0].length)) {
      const name = fn[0].slice(0, -1).trim();
      out.push({ t: "fn", v: name.toUpperCase() });
      i += fn[0].length - 1;
      continue;
    }
    if (ref) {
      out.push({ t: "ref", v: ref[0] });
      i += ref[0].length;
      continue;
    }
    const word = /^[A-Za-z_][A-Za-z0-9_.$]*/.exec(rest);
    if (word) {
      const w = word[0].toUpperCase();
      if (w === "TRUE" || w === "FALSE") out.push({ t: "bool", v: w });
      else out.push({ t: "str", v: "" }); // named range tak dikenal → kosong
      i += word[0].length;
      continue;
    }
    i++; // karakter tak dikenal diabaikan
  }
  return out;
}

const num = (v: CellVal): number => {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v == null || v === "") return 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const str = (v: CellVal): string => (v == null ? "" : String(v));

export class XlsxFormula {
  private cache = new Map<string, CellVal>();
  private busy = new Set<string>();

  constructor(private wb: ExcelJS.Workbook) {}

  private sheet(name?: string, fallback?: ExcelJS.Worksheet) {
    if (!name) return fallback ?? this.wb.worksheets[0];
    const clean = name.replace(/^'|'$/g, "").trim().toLowerCase();
    return (
      this.wb.worksheets.find((w) => w.name.trim().toLowerCase() === clean) ??
      this.wb.worksheets.find((w) => w.name.trim().toLowerCase().includes(clean)) ??
      fallback
    );
  }

  /** Nilai sebuah sel (hitung rumus bila cached value tidak tersedia). */
  value(ws: ExcelJS.Worksheet, row: number, col: number): CellVal {
    const key = `${ws.name}!${col}:${row}`;
    if (this.cache.has(key)) return this.cache.get(key)!;
    if (this.busy.has(key)) return null;
    this.busy.add(key);
    let out: CellVal = null;
    try {
      const v: any = ws.getRow(row).getCell(col).value;
      if (v == null) out = null;
      else if (typeof v === "object") {
        if ("richText" in v) out = v.richText.map((r: any) => r.text).join("");
        else if (v instanceof Date) out = v.toLocaleDateString("id-ID");
        else if ("formula" in v || "sharedFormula" in v) {
          const cached = (v as any).result;
          if (cached != null && !(typeof cached === "object" && "error" in cached)) {
            out = typeof cached === "object" ? null : cached;
          } else if (typeof v.formula === "string") {
            out = this.evaluate(v.formula, ws);
          }
        } else if ("text" in v) out = String(v.text);
        else if ("error" in v) out = null;
      } else out = v as CellVal;
    } catch {
      out = null;
    }
    this.busy.delete(key);
    this.cache.set(key, out);
    return out;
  }

  /** Hitung sebuah ekspresi rumus (tanpa tanda "="). */
  evaluate(formula: string, ctx: ExcelJS.Worksheet): CellVal {
    const src = formula.replace(/^=/, "");
    const toks = tokenize(src);
    let p = 0;
    const peek = () => toks[p];
    const eat = () => toks[p++];

    const refCells = (ref: string): CellVal[] => {
      const bang = ref.lastIndexOf("!");
      const sheetName = bang >= 0 ? ref.slice(0, bang) : undefined;
      const ws = this.sheet(sheetName, ctx);
      if (!ws) return [];
      const body = bang >= 0 ? ref.slice(bang + 1) : ref;
      const parts = body.split(":");
      const parse = (a: string) => {
        const m = /^\$?([A-Za-z]{1,3})\$?(\d+)$/.exec(a.trim());
        return m ? { c: colNum(m[1]!), r: Number(m[2]) } : null;
      };
      const a = parse(parts[0]!);
      if (!a) return [];
      const b = parts[1] ? parse(parts[1]) : a;
      if (!b) return [];
      const out: CellVal[] = [];
      for (let r = Math.min(a.r, b.r); r <= Math.max(a.r, b.r); r++)
        for (let c = Math.min(a.c, b.c); c <= Math.max(a.c, b.c); c++)
          out.push(this.value(ws, r, c));
      return out;
    };

    const refGrid = (ref: string): CellVal[][] => {
      const bang = ref.lastIndexOf("!");
      const sheetName = bang >= 0 ? ref.slice(0, bang) : undefined;
      const ws = this.sheet(sheetName, ctx);
      if (!ws) return [];
      const body = bang >= 0 ? ref.slice(bang + 1) : ref;
      const parts = body.split(":");
      const parse = (a: string) => {
        const m = /^\$?([A-Za-z]{1,3})\$?(\d+)$/.exec(a.trim());
        return m ? { c: colNum(m[1]!), r: Number(m[2]) } : null;
      };
      const a = parse(parts[0]!);
      const b = parts[1] ? parse(parts[1]!) : a;
      if (!a || !b) return [];
      const grid: CellVal[][] = [];
      for (let r = Math.min(a.r, b.r); r <= Math.max(a.r, b.r); r++) {
        const row: CellVal[] = [];
        for (let c = Math.min(a.c, b.c); c <= Math.max(a.c, b.c); c++) row.push(this.value(ws, r, c));
        grid.push(row);
      }
      return grid;
    };

    // --- parser ---
    type Arg = { flat: CellVal[]; grid: CellVal[][]; scalar: CellVal };
    const scalarOf = (a: Arg): CellVal => a.scalar;

    const primary = (): Arg => {
      const t = eat();
      if (!t) return { flat: [], grid: [], scalar: null };
      if (t.t === "num") return { flat: [], grid: [], scalar: Number(t.v) };
      if (t.t === "str") return { flat: [], grid: [], scalar: t.v };
      if (t.t === "bool") return { flat: [], grid: [], scalar: t.v === "TRUE" };
      if (t.t === "ref") {
        const flat = refCells(t.v);
        const grid = refGrid(t.v);
        return { flat, grid, scalar: flat.length === 1 ? flat[0]! : (flat[0] ?? null) };
      }
      if (t.t === "par" && t.v === "(") {
        const v = expr();
        if (peek()?.v === ")") eat();
        return v;
      }
      if (t.t === "fn") {
        if (peek()?.v === "(") eat();
        const args: Arg[] = [];
        if (peek()?.v !== ")") {
          args.push(expr());
          while (peek()?.t === "sep") {
            eat();
            args.push(expr());
          }
        }
        if (peek()?.v === ")") eat();
        return { flat: [], grid: [], scalar: callFn(t.v, args) };
      }
      if (t.t === "op" && (t.v === "-" || t.v === "+")) {
        const v = primary();
        return { flat: [], grid: [], scalar: t.v === "-" ? -num(scalarOf(v)) : num(scalarOf(v)) };
      }
      return { flat: [], grid: [], scalar: null };
    };

    const callFn = (name: string, args: Arg[]): CellVal => {
      const s = (i: number) => scalarOf(args[i] ?? { flat: [], grid: [], scalar: null });
      const nums = () =>
        args.flatMap((a) => (a.flat.length ? a.flat : [a.scalar])).filter((v) => v !== null && v !== "");
      switch (name) {
        case "IF":
          return truthy(s(0)) ? s(1) : args.length > 2 ? s(2) : false;
        case "IFERROR":
          return s(0) ?? s(1);
        case "AND":
          return nums().every((v) => truthy(v));
        case "OR":
          return nums().some((v) => truthy(v));
        case "NOT":
          return !truthy(s(0));
        case "SUM":
          return nums().reduce<number>((a, b) => a + num(b), 0);
        case "AVERAGE": {
          const v = nums().map(num);
          return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
        }
        case "MAX":
          return Math.max(0, ...nums().map(num));
        case "MIN":
          return Math.min(0, ...nums().map(num));
        case "COUNT":
          return nums().filter((v) => typeof v === "number").length;
        case "COUNTA":
          return nums().length;
        case "ROUND":
          return Number(num(s(0)).toFixed(Math.max(0, num(s(1)))));
        case "ABS":
          return Math.abs(num(s(0)));
        case "INT":
          return Math.floor(num(s(0)));
        case "LEN":
          return str(s(0)).length;
        case "UPPER":
          return str(s(0)).toUpperCase();
        case "LOWER":
          return str(s(0)).toLowerCase();
        case "TRIM":
          return str(s(0)).trim();
        case "LEFT":
          return str(s(0)).slice(0, args[1] ? num(s(1)) : 1);
        case "RIGHT": {
          const n = args[1] ? num(s(1)) : 1;
          return n ? str(s(0)).slice(-n) : "";
        }
        case "MID":
          return str(s(0)).substr(num(s(1)) - 1, num(s(2)));
        case "CONCATENATE":
          return args.map((a) => str(scalarOf(a))).join("");
        case "TEXT":
          return str(s(0));
        case "HLOOKUP": {
          const key = s(0);
          const grid = args[1]?.grid ?? [];
          const rowIdx = num(s(2));
          if (!grid.length) return null;
          const head = grid[0]!;
          let col = head.findIndex((v) => looseEq(v, key));
          if (col < 0) return null;
          return grid[rowIdx - 1]?.[col] ?? null;
        }
        case "VLOOKUP": {
          const key = s(0);
          const grid = args[1]?.grid ?? [];
          const colIdx = num(s(2));
          const row = grid.find((r) => looseEq(r[0] ?? null, key));
          return row?.[colIdx - 1] ?? null;
        }
        default:
          return null;
      }
    };

    const truthy = (v: CellVal) =>
      typeof v === "boolean" ? v : typeof v === "number" ? v !== 0 : !!v && String(v) !== "FALSE";
    const looseEq = (a: CellVal, b: CellVal) => {
      if (a == null || b == null) return a == null && b == null;
      if (typeof a === "number" || typeof b === "number") return num(a) === num(b);
      return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
    };

    const wrap = (v: CellVal): Arg => ({ flat: [], grid: [], scalar: v });

    const power = (): Arg => {
      let l = primary();
      while (peek()?.t === "op" && peek()!.v === "^") {
        eat();
        l = wrap(Math.pow(num(scalarOf(l)), num(scalarOf(primary()))));
      }
      return l;
    };
    const mul = (): Arg => {
      let l = power();
      while (peek()?.t === "op" && (peek()!.v === "*" || peek()!.v === "/")) {
        const op = eat()!.v;
        const r = num(scalarOf(power()));
        const a = num(scalarOf(l));
        l = wrap(op === "*" ? a * r : r === 0 ? null : a / r);
      }
      return l;
    };
    const add = (): Arg => {
      let l = mul();
      while (peek()?.t === "op" && (peek()!.v === "+" || peek()!.v === "-")) {
        const op = eat()!.v;
        const r = num(scalarOf(mul()));
        const a = num(scalarOf(l));
        l = wrap(op === "+" ? a + r : a - r);
      }
      return l;
    };
    const concat = (): Arg => {
      let l = add();
      while (peek()?.t === "op" && peek()!.v === "&") {
        eat();
        l = wrap(str(scalarOf(l)) + str(scalarOf(add())));
      }
      return l;
    };
    const expr = (): Arg => {
      let l = concat();
      while (peek()?.t === "op" && ["=", "<>", "<", ">", "<=", ">="].includes(peek()!.v)) {
        const op = eat()!.v;
        const r = scalarOf(concat());
        const a = scalarOf(l);
        let res: boolean;
        if (op === "=") res = looseEq(a, r);
        else if (op === "<>") res = !looseEq(a, r);
        else {
          const x = typeof a === "string" && typeof r === "string" ? a.localeCompare(r) : num(a) - num(r);
          res = op === "<" ? x < 0 : op === ">" ? x > 0 : op === "<=" ? x <= 0 : x >= 0;
        }
        l = wrap(res);
      }
      return l;
    };

    try {
      return scalarOf(expr());
    } catch {
      return null;
    }
  }
}
