/**
 * Lembar plate Tes Buta Warna (Ishihara) — 14 gambar, dipetakan berdasarkan
 * nomor soal pada bank soal (test_type = "ishihara").
 */
import p01 from "@/assets/ishihara-01.jpg";
import p02 from "@/assets/ishihara-02.jpg";
import p03 from "@/assets/ishihara-03.jpg";
import p04 from "@/assets/ishihara-04.jpg";
import p05 from "@/assets/ishihara-05.jpg";
import p06 from "@/assets/ishihara-06.jpg";
import p07 from "@/assets/ishihara-07.jpg";
import p08 from "@/assets/ishihara-08.jpg";
import p09 from "@/assets/ishihara-09.jpg";
import p10 from "@/assets/ishihara-10.jpg";
import p11 from "@/assets/ishihara-11.jpg";
import p12 from "@/assets/ishihara-12.jpg";
import p13 from "@/assets/ishihara-13.jpg";
import p14 from "@/assets/ishihara-14.jpg";

export const ISHIHARA_PLATES: Record<number, { url: string; caption: string }> = {
  1: { url: p01, caption: "Lembar warna nomor 1" },
  2: { url: p02, caption: "Lembar warna nomor 2" },
  3: { url: p03, caption: "Lembar warna nomor 3" },
  4: { url: p04, caption: "Lembar warna nomor 4" },
  5: { url: p05, caption: "Lembar warna nomor 5" },
  6: { url: p06, caption: "Lembar warna nomor 6" },
  7: { url: p07, caption: "Lembar warna nomor 7" },
  8: { url: p08, caption: "Lembar warna nomor 8" },
  9: { url: p09, caption: "Lembar warna nomor 9" },
  10: { url: p10, caption: "Lembar warna nomor 10" },
  11: { url: p11, caption: "Lembar warna nomor 11" },
  12: { url: p12, caption: "Lembar warna nomor 12" },
  13: { url: p13, caption: "Lembar warna nomor 13" },
  14: { url: p14, caption: "Lembar warna nomor 14" },
};

export function ishiharaPlateFor(n: number) {
  return ISHIHARA_PLATES[n] ?? null;
}
