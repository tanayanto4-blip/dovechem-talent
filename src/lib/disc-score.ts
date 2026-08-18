import { DISC_LEAST_KEY, DISC_MOST_KEY } from "@/lib/disc-descriptions";

/**
 * Skoring DISC identik dengan sheet "Input" + "Result" template resmi:
 *   Line 1 = jumlah huruf pilihan PALING (MOST)
 *   Line 2 = jumlah huruf pilihan PALING TIDAK (LEAST)
 *   Line 3 = Line 1 - Line 2  (grafik "Core/Change" pada sheet Result)
 * Tipe kepribadian diambil dari total terbesar pada Line 3.
 */

export const DISC_LETTERS = ["D", "I", "S", "C"] as const;
export type DiscLetter = (typeof DISC_LETTERS)[number];

export interface DiscAnswerRow {
  question_number: number;
  answer: string | { most?: string; least?: string } | null | undefined;
}

function parseAnswer(raw: DiscAnswerRow["answer"]): { most?: string; least?: string } {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

/** Indeks opsi 0..3 dari huruf D/I/S/C atau angka 1..4 pada jawaban kandidat. */
function optionIndex(key: string | undefined): number {
  if (!key) return -1;
  const i = ["D", "I", "S", "C"].indexOf(String(key).trim().toUpperCase());
  if (i >= 0) return i;
  const n = Number(key);
  return Number.isFinite(n) && n >= 1 && n <= 4 ? n - 1 : -1;
}

export function computeDiscScores(answers: DiscAnswerRow[]) {
  const line1: Record<string, number> = { D: 0, I: 0, S: 0, C: 0 };
  const line2: Record<string, number> = { D: 0, I: 0, S: 0, C: 0 };
  let filled = 0;

  for (const a of answers ?? []) {
    const g = Number(a.question_number);
    if (!Number.isFinite(g) || g < 1 || g > 24) continue;
    const { most, least } = parseAnswer(a.answer);
    const mi = optionIndex(most);
    const li = optionIndex(least);
    if (mi >= 0) {
      const l = DISC_MOST_KEY[g]?.[mi];
      if (l && l in line1) line1[l]++;
    }
    if (li >= 0) {
      const l = DISC_LEAST_KEY[g]?.[li];
      if (l && l in line2) line2[l]++;
    }
    if (mi >= 0 && li >= 0) filled++;
  }

  const line3: Record<string, number> = { D: 0, I: 0, S: 0, C: 0 };
  for (const l of DISC_LETTERS) line3[l] = line1[l] - line2[l];

  // Huruf dengan total Line 3 terbesar. Jika seri, gunakan tipe kombinasi
  // (mis. "D-I") sesuai urutan baku D, I, S, C.
  const max = Math.max(...DISC_LETTERS.map((l) => line3[l]));
  let top = DISC_LETTERS.filter((l) => line3[l] === max) as string[];
  if (top.length > 2) {
    // lebih dari dua seri: ambil dua tertinggi berdasarkan Line 1 (MOST)
    top = [...top].sort((a, b) => line1[b] - line1[a]).slice(0, 2);
    top = DISC_LETTERS.filter((l) => top.includes(l));
  }
  const type = top.join("-");

  return { line1, line2, line3, filled, type, letters: top, valid: filled > 0 };
}
