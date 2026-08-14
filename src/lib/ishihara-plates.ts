/**
 * Lembar plate Tes Buta Warna (Ishihara) — 14 gambar, dipetakan berdasarkan
 * nomor soal pada bank soal (test_type = "ishihara").
 */
import p01 from "@/assets/ishihara-01.jpg.asset.json";
import p02 from "@/assets/ishihara-02.jpg.asset.json";
import p03 from "@/assets/ishihara-03.jpg.asset.json";
import p04 from "@/assets/ishihara-04.jpg.asset.json";
import p05 from "@/assets/ishihara-05.jpg.asset.json";
import p06 from "@/assets/ishihara-06.jpg.asset.json";
import p07 from "@/assets/ishihara-07.jpg.asset.json";
import p08 from "@/assets/ishihara-08.jpg.asset.json";
import p09 from "@/assets/ishihara-09.jpg.asset.json";
import p10 from "@/assets/ishihara-10.jpg.asset.json";
import p11 from "@/assets/ishihara-11.jpg.asset.json";
import p12 from "@/assets/ishihara-12.jpg.asset.json";
import p13 from "@/assets/ishihara-13.jpg.asset.json";
import p14 from "@/assets/ishihara-14.jpg.asset.json";

export const ISHIHARA_PLATES: Record<number, { url: string; caption: string }> = {
  1: { url: p01.url, caption: "Lembar warna nomor 1" },
  2: { url: p02.url, caption: "Lembar warna nomor 2" },
  3: { url: p03.url, caption: "Lembar warna nomor 3" },
  4: { url: p04.url, caption: "Lembar warna nomor 4" },
  5: { url: p05.url, caption: "Lembar warna nomor 5" },
  6: { url: p06.url, caption: "Lembar warna nomor 6" },
  7: { url: p07.url, caption: "Lembar warna nomor 7" },
  8: { url: p08.url, caption: "Lembar warna nomor 8" },
  9: { url: p09.url, caption: "Lembar warna nomor 9" },
  10: { url: p10.url, caption: "Lembar warna nomor 10" },
  11: { url: p11.url, caption: "Lembar warna nomor 11" },
  12: { url: p12.url, caption: "Lembar warna nomor 12" },
  13: { url: p13.url, caption: "Lembar warna nomor 13" },
  14: { url: p14.url, caption: "Lembar warna nomor 14" },
};

export function ishiharaPlateFor(n: number) {
  return ISHIHARA_PLATES[n] ?? null;
}
