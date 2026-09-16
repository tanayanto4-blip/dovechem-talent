/**
 * Kunci skoring PAPI Kostick (PA Preference Inventory) — 90 item forced-choice.
 *
 * Diturunkan dari lembar jawaban resmi PAPI:
 *  - Grid 9 kolom x 10 baris. Kolom 1 (paling kanan) = item 1-10, kolom 2 = 11-20, dst.
 *  - Setiap sel punya panah ATAS (opsi A) dan panah BAWAH (opsi B).
 *  - Panah menunjuk ke salah satu dari 20 skala: 10 skala "role" di baris atas
 *    (G L I T V S R D C E) dan 10 skala "need" di baris bawah (N A P X B O Z K F W).
 *  - Tiap skala berisi tepat 9 item.
 */

export const PAPI_TOP = ["E", "C", "D", "R", "S", "V", "T", "I", "L", "G"] as const; // kolom 0..9 (kanan->kiri)
export const PAPI_BOTTOM = ["W", "F", "K", "Z", "O", "B", "X", "P", "A", "N"] as const;

/** Urutan tampilan pada lembar jawaban (kiri -> kanan). */
export const PAPI_TOP_ORDER = ["G", "L", "I", "T", "V", "S", "R", "D", "C", "E"] as const;
export const PAPI_BOTTOM_ORDER = ["N", "A", "P", "X", "B", "O", "Z", "K", "F", "W"] as const;

export const PAPI_SCALE_LABEL: Record<string, string> = {
  G: "G — Hard Intense Worker (pekerja keras)",
  L: "L — Leadership Role (peran kepemimpinan)",
  I: "I — Ease in Decision Making (kemudahan mengambil keputusan)",
  T: "T — Pace (tempo kerja)",
  V: "V — Vigorous Type (tipe penuh semangat)",
  S: "S — Social Extension (relasi sosial)",
  R: "R — Theoretical Type (tipe teoretis)",
  D: "D — Interest in Working with Details (minat pada detail)",
  C: "C — Organized Type (keteraturan kerja)",
  E: "E — Emotional Restraint (pengendalian emosi)",
  N: "N — Need to Finish Task (kebutuhan menyelesaikan tugas)",
  A: "A — Need to Achieve (kebutuhan berprestasi)",
  P: "P — Need to Control Others (kebutuhan mengatur orang lain)",
  X: "X — Need to be Noticed (kebutuhan diperhatikan)",
  B: "B — Need to Belong to Groups (kebutuhan diterima kelompok)",
  O: "O — Need for Closeness & Affection (kebutuhan kedekatan)",
  Z: "Z — Need for Change (kebutuhan perubahan)",
  K: "K — Need to be Forceful (kebutuhan bersikap agresif)",
  F: "F — Need to Support Authority (kebutuhan mendukung atasan)",
  W: "W — Need for Rules & Supervision (kebutuhan aturan & pengarahan)",
};

export type PapiCell = { number: number; row: number; col: number; A: string; B: string };

/** Posisi grid item: kolom 1 = item 1-10 (paling kanan pada lembar), baris 1-10 dari atas. */
export function papiCell(n: number): PapiCell {
  const col = Math.floor((n - 1) / 10) + 1; // 1..9
  const row = ((n - 1) % 10) + 1; // 1..10
  const idxA = (10 - row) % 10;
  const idxB = (10 - row + col) % 10;
  const useTop = row <= col; // di atas garis diagonal tebal (skala baris atas)
  const A = (useTop ? PAPI_TOP : PAPI_BOTTOM)[idxA];
  const B = (useTop ? PAPI_TOP : PAPI_BOTTOM)[idxB];
  return { number: n, row, col, A, B };
}

export const PAPI_KEY: Record<number, { A: string; B: string }> = Object.fromEntries(
  Array.from({ length: 90 }, (_, i) => {
    const c = papiCell(i + 1);
    return [c.number, { A: c.A, B: c.B }];
  }),
);

/**
 * Daftar nomor item khusus yang ditotal terpisah untuk skoring tambahan.
 * Hanya jawaban "A" (panah atas) yang dihitung; "B" (panah bawah) diabaikan.
 */
export const PAPI_SPECIAL_ITEMS = [
  1, 3, 8, 11, 12, 21, 22, 31, 32, 34, 35, 36, 37, 43, 44, 46, 48, 49, 50, 58, 59, 60, 63, 68, 69,
  70, 79, 80, 90,
] as const;

export type PapiSpecialCount = {
  /** Jumlah jawaban "A" pada nomor-nomor khusus. */
  countA: number;
  /** Jumlah jawaban "B" pada nomor-nomor khusus (tidak dihitung ke total). */
  countB: number;
  /** Nomor khusus yang belum dijawab. */
  unanswered: number[];
  /** Nomor khusus yang dijawab "A". */
  itemsA: number[];
  total: number;
};

export function papiSpecialCount(picks: Record<number, string>): PapiSpecialCount {
  const itemsA: number[] = [];
  const unanswered: number[] = [];
  let countB = 0;
  for (const n of PAPI_SPECIAL_ITEMS) {
    const pick = (picks[n] ?? "").toUpperCase();
    if (pick === "A") itemsA.push(n);
    else if (pick === "B") countB++;
    else unanswered.push(n);
  }
  return {
    countA: itemsA.length,
    countB,
    unanswered,
    itemsA,
    total: PAPI_SPECIAL_ITEMS.length,
  };
}

export type PapiScores = {
  scales: Record<string, number>;
  top: Record<string, number>;
  bottom: Record<string, number>;
  answered: number;
  total: number;
  totalTop: number;
  totalBottom: number;
  highest: string[];
};

/** Hitung skor tiap skala dari jawaban kandidat (nomor item -> "A" | "B"). */
export function papiScore(picks: Record<number, string>): PapiScores {
  const scales: Record<string, number> = {};
  for (const s of [...PAPI_TOP_ORDER, ...PAPI_BOTTOM_ORDER]) scales[s] = 0;
  let answered = 0;
  for (let n = 1; n <= 90; n++) {
    const pick = (picks[n] ?? "").toUpperCase();
    if (pick !== "A" && pick !== "B") continue;
    answered++;
    const scale = PAPI_KEY[n][pick as "A" | "B"];
    scales[scale] = (scales[scale] ?? 0) + 1;
  }
  const top: Record<string, number> = {};
  const bottom: Record<string, number> = {};
  for (const s of PAPI_TOP_ORDER) top[s] = scales[s];
  for (const s of PAPI_BOTTOM_ORDER) bottom[s] = scales[s];
  const totalTop = Object.values(top).reduce((a, b) => a + b, 0);
  const totalBottom = Object.values(bottom).reduce((a, b) => a + b, 0);
  const max = Math.max(...Object.values(scales));
  const highest = Object.entries(scales)
    .filter(([, v]) => v === max && v > 0)
    .map(([k]) => k);
  return { scales, top, bottom, answered, total: 90, totalTop, totalBottom, highest };
}
