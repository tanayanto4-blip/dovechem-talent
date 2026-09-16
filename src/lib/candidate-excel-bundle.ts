import { withXlsxCapture, type CapturedXlsx } from "@/lib/xlsx-deliver";
import { exportSheetsToPdf, type SheetSpec } from "@/lib/xlsx-to-pdf";
import { PAPI_SCALES, drawDiscChart, drawPapiChart } from "@/lib/summary-charts";

/**
 * Rangkuman kandidat: menjalankan seluruh exporter Excel skoring (Resume,
 * PAPI, DISC, MBTI, WPT, Profiling) lalu isinya ditarik menjadi satu file PDF
 * dengan urutan halaman sesuai berkas contoh.
 */
export async function buildCandidateExcelBundle(run: () => Promise<void>) {
  return withXlsxCapture(run);
}

/** Urutan halaman PDF: Resume -> PAPI (Summary) -> Chart PAPI -> DISC -> Profiling. */
const PAGE_ORDER: Array<{
  prefix: string;
  sheet: string;
  title: string;
  maxCols?: number;
  maxRows?: number;
  custom?: SheetSpec["custom"];
}> = [
  { prefix: "Resume_", sheet: "Rec", title: "Recruitment Resume", maxCols: 14, maxRows: 40 },
  { prefix: "PAPI_", sheet: "Summary", title: "Key Background Review - PAPI Kostick", maxCols: 17, maxRows: 58 },
  {
    prefix: "PAPI_",
    sheet: "POLA DASAR",
    title: "PAPI Kostick Chart",
    custom: (doc, area, _ws, valueAt) => {
      const scales: Record<string, number> = {};
      PAPI_SCALES.forEach((s, i) => {
        const v = valueAt(6, 3 + i);
        scales[s] = typeof v === "number" ? v : Number(v) || 0;
      });
      drawPapiChart(doc, scales, { ...area, h: Math.min(area.h, 340) });
    },
  },
  { prefix: "DISC_", sheet: "Result", title: "DISC Personality System", maxCols: 16, maxRows: 60 },
  {
    prefix: "DISC_",
    sheet: "Result",
    title: "DISC Personality System Graph",
    custom: (doc, area, _ws, valueAt) => {
      const num = (r: number, c: number) => {
        const v = valueAt(r, c);
        return typeof v === "number" ? v : Number(v) || 0;
      };
      const row = (r: number) => ({
        D: num(r, 8),
        I: num(r, 9),
        S: num(r, 10),
        C: num(r, 11),
      });
      drawDiscChart(
        doc,
        [
          { title: "Graph I - Mask (Public Self)", values: row(10) },
          { title: "Graph II - Core (Private Self)", values: row(11) },
          { title: "Graph III - Mirror (Perceived Self)", values: row(12) },
        ],
        { ...area, h: Math.min(area.h, 320) },
      );
    },
  },
  { prefix: "Profiling_", sheet: "PROFILING", title: "Key Background Review - Summary", maxCols: 16, maxRows: 60 },
  { prefix: "MBTI_", sheet: "MBTI", title: "MBTI Scoring", maxCols: 8, maxRows: 80 },
  { prefix: "WPT_", sheet: "WPT", title: "Cognitive Ability (WPT)", maxCols: 12, maxRows: 60 },
];

export async function downloadSummaryPdf(
  files: CapturedXlsx[],
  candidateName: string,
  subtitle?: string,
) {
  if (!files.length) throw new Error("Tidak ada file skoring yang bisa dirangkum");
  const specs: SheetSpec[] = [];
  for (const p of PAGE_ORDER) {
    const f = files.find((x) => x.filename.startsWith(p.prefix));
    if (f) specs.push({ blob: f.blob, sheet: p.sheet, title: p.title, maxCols: p.maxCols, maxRows: p.maxRows });
  }
  const safe = (candidateName || "kandidat").replace(/[^\w\-]+/g, "_");
  return exportSheetsToPdf(
    specs,
    `Rangkuman_${safe}_${new Date().toISOString().slice(0, 10)}.pdf`,
    subtitle,
  );
}
