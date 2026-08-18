/**
 * RMIB — The Rothwell-Miller Interest Blank.
 *
 * 9 kelompok (A s/d I), tiap kelompok berisi 12 jenis pekerjaan.
 * Kandidat memberi peringkat 1 (paling disukai) s/d 12 (paling tidak disukai)
 * pada setiap kelompok — ditulis sendiri angkanya di dalam kotak.
 *
 * Daftar pekerjaan dibedakan Laki-laki / Perempuan sesuai blanko asli.
 * Kategori minat mengikuti rotasi baku RMIB: baris ke-i pada kelompok ke-k
 * mewakili kategori CATEGORIES[(k + i) % 12].
 *
 * Skoring: jumlahkan peringkat tiap kategori dari 9 kelompok (rentang 9-108).
 * Semakin KECIL total, semakin tinggi minat. Total lalu dirangking 1-12.
 */

export type RmibCategory =
  | "OUT"
  | "ME"
  | "COMP"
  | "SCI"
  | "PERS"
  | "AESTH"
  | "LIT"
  | "MUS"
  | "SOSS"
  | "CLER"
  | "PRAC"
  | "MED";

export const RMIB_CATEGORIES: RmibCategory[] = [
  "OUT",
  "ME",
  "COMP",
  "SCI",
  "PERS",
  "AESTH",
  "LIT",
  "MUS",
  "SOSS",
  "CLER",
  "PRAC",
  "MED",
];

export const RMIB_CATEGORY_LABEL: Record<RmibCategory, string> = {
  OUT: "Outdoor — pekerjaan lapangan / luar ruangan",
  ME: "Mechanical — permesinan & teknik",
  COMP: "Computational — angka & perhitungan",
  SCI: "Scientific — ilmiah & penelitian",
  PERS: "Personal Contact — hubungan/persuasi dengan orang",
  AESTH: "Aesthetic — seni rupa & keindahan",
  LIT: "Literary — tulis-menulis & bahasa",
  MUS: "Musical — musik",
  SOSS: "Social Service — pelayanan sosial",
  CLER: "Clerical — administrasi & ketatausahaan",
  PRAC: "Practical — keterampilan praktis / kriya",
  MED: "Medical — kesehatan & medis",
};

export type RmibJob = { male: string; female: string };
export type RmibGroup = { code: string; jobs: RmibJob[] };

export type RmibSide = "M" | "F" | null;

const g = (code: string, rows: [string, string][]): RmibGroup => ({
  code,
  jobs: rows.map(([male, female]) => ({ male, female })),
});

export const RMIB_GROUPS: RmibGroup[] = [
  g("A", [
    ["Petani", "Pekerjaan pertanian"],
    ["Insinyur sipil", "Sopir kendaraan militer"],
    ["Akuntan", "Akuntan"],
    ["Ilmiawan", "Ilmiawati"],
    ["Manager penjualan", "Penjual hasil-hasil mode"],
    ["Seniman", "Seniwati"],
    ["Wartawan", "Wartawati"],
    ["Pianis konser", "Pianis konser"],
    ["Guru sekolah dasar", "Guru sekolah dasar"],
    ["Manager bank", "Sekretaris pribadi"],
    ["Tukang kayu", "Modiste"],
    ["Dokter", "Dokter"],
  ]),
  g("B", [
    ["Ahli pembuat alat-alat", "Petugas perakitan alat"],
    ["Ahli statistik", "Pegawai urusan gaji"],
    ["Insinyur kimia industri", "Insinyur kimia industri"],
    ["Penyiar radio", "Penyiar radio"],
    ["Artis profesional", "Artis profesional"],
    ["Pengarang", "Pengarang"],
    ["Dirigen orkestra", "Pemain musik orkestra"],
    ["Psikolog pendidikan", "Psikolog pendidikan"],
    ["Sekretaris perusahaan", "Juru ketik"],
    ["Ahli bangunan", "Pembuat pot keramik"],
    ["Ahli bedah", "Ahli bedah"],
    ["Ahli kehutanan", "Guru pendidikan olahraga"],
  ]),
  g("C", [
    ["Auditor", "Auditor"],
    ["Ahli meteorologi", "Ahli meteorologi"],
    ["Salesman", "Salesgirl"],
    ["Arsitek", "Guru kesenian"],
    ["Penulis drama", "Penulis drama"],
    ["Komponis", "Komponis"],
    ["Kepala sekolah", "Kepala yayasan sosial"],
    ["Pegawai pemerintah daerah", "Resepsionis"],
    ["Ahli meubel", "Penata rambut"],
    ["Dokter hewan", "Dokter hewan"],
    ["Juru ukur tanah", "Pramugari"],
    ["Tukang bubut", "Operator mesin rajut"],
  ]),
  g("D", [
    ["Ahli biologi", "Ahli biologi"],
    ["Agen biro periklanan", "Agen biro periklanan"],
    ["Dekorator interior", "Dekorator interior"],
    ["Ahli sejarah", "Ahli sejarah"],
    ["Kritikus musik", "Kritikus musik"],
    ["Pekerja sosial", "Pekerja sosial"],
    ["Pegawai asuransi", "Penulis steno"],
    ["Tukang cat", "Penjilid buku"],
    ["Apoteker", "Apoteker"],
    ["Penjelajah", "Ahli pertanaman"],
    ["Tukang listrik", "Petugas pompa bensin"],
    ["Penilai pajak pendapatan", "Petugas mesin hitung"],
  ]),
  g("E", [
    ["Petugas wawancara", "Petugas wawancara"],
    ["Perancang perhiasan", "Perancang pakaian"],
    ["Ahli perpustakaan", "Ahli perpustakaan"],
    ["Guru musik", "Guru musik"],
    ["Pembina rohani", "Penyebar agama"],
    ["Petugas arsip", "Petugas arsip"],
    ["Tukang batu", "Tukang bungkus cokelat"],
    ["Dokter gigi", "Pelatih rehabilitasi pasien"],
    ["Prospektor", "Pembina keolahragaan"],
    ["Montir", "Ahli reparasi jam"],
    ["Guru ilmu pasti", "Guru ilmu pasti"],
    ["Ahli pertanian", "Ahli pertanian"],
  ]),
  g("F", [
    ["Pemotret", "Pemotret"],
    ["Penulis majalah", "Penulis majalah"],
    ["Pemain orgel (organ)", "Pemain orgel (organ)"],
    ["Organisasi pramuka", "Petugas palang merah"],
    ["Petugas pengiriman barang", "Pegawai bank"],
    ["Petugas mesin perkayuan", "Pengurus kerumahtanggaan"],
    ["Ahli kacamata", "Perawat"],
    ["Ahli sortir kulit", "Peternak"],
    ["Instalator", "Ahli gosok lensa"],
    ["Pembantu kasir bank", "Kasir"],
    ["Ahli botani", "Ahli botani"],
    ["Pedagang keliling", "Pedagang keliling"],
  ]),
  g("G", [
    ["Kritikus buku", "Kritikus buku"],
    ["Ahli pustaka musik", "Ahli pustaka musik"],
    ["Pejabat klub remaja", "Pejabat klub remaja"],
    ["Pegawai kantor", "Pegawai kantor"],
    ["Tukang plester tembok", "Tukang binatu"],
    ["Ahli rontgent", "Ahli rontgent"],
    ["Nelayan", "Petani bunga"],
    ["Pembuat arloji", "Operator mesin sulam"],
    ["Kasir", "Ahli tata buku"],
    ["Ahli astronomi", "Ahli astronomi"],
    ["Juru lelang", "Peraga alat kosmetika"],
    ["Penata panggung", "Penata panggung"],
  ]),
  g("H", [
    ["Pemimpin band", "Pemain musik band"],
    ["Ahli penyuluh jabatan", "Ahli penyuluh jabatan"],
    ["Pegawai pos", "Pegawai kantor pos"],
    ["Tukang ledeng", "Penjahit"],
    ["Ahli fisioterapi", "Ahli fisioterapi"],
    ["Sopir angkutan", "Peternak ayam"],
    ["Montir radio", "Ahli reparasi permata"],
    ["Juru bayar", "Juru bayar"],
    ["Ahli geologi", "Ahli geologi"],
    ["Petugas hub. masyarakat", "Petugas hub. masyarakat"],
    ["Penata etalase", "Penata etalase"],
    ["Penulis sandiwara radio", "Penulis sandiwara radio"],
  ]),
  g("I", [
    ["Petugas kesejahteraan sosial", "Petugas kesejahteraan sosial"],
    ["Petugas ekspedisi surat", "Petugas arsip"],
    ["Tukang sepatu", "Juru masak"],
    ["Paramedik / mantri kesehatan", "Perawat orang-orang tua"],
    ["Petani tanaman hias", "Tukang kebun"],
    ["Tukang las", "Operator mesin kaos kaki"],
    ["Petugas pajak", "Petugas pajak"],
    ["Asisten laboratorium", "Asisten laboratorium"],
    ["Salesman asuransi", "Peraga barang/bahan"],
    ["Perancang motif tekstil", "Perancang motif tekstil"],
    ["Penyair", "Penyair"],
    ["Pramuniaga toko musik", "Pramuniaga toko musik"],
  ]),
];

/** Kategori untuk baris ke-i (0-based) pada kelompok ke-k (0-based). */
export function rmibCategoryAt(groupIndex: number, rowIndex: number): RmibCategory {
  return RMIB_CATEGORIES[(groupIndex + rowIndex) % 12]!;
}

export type RmibAnswerData = {
  ranks: (number | null)[];
  sides: RmibSide[];
};

function parseRmibData(value: string | undefined | null): RmibAnswerData {
  const raw = value ?? "";
  if (raw.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as { ranks?: unknown[]; sides?: unknown[] };
      const ranks = Array.from({ length: 12 }, (_, i) => {
        const n = parsed?.ranks?.[i];
        return typeof n === "number" && n >= 1 && n <= 12 ? n : null;
      });
      const sides = Array.from({ length: 12 }, (_, i) => {
        const s = parsed?.sides?.[i];
        return s === "M" || s === "F" ? s : null;
      });
      return { ranks, sides };
    } catch {
      // fall through to legacy format
    }
  }
  // Legacy comma-separated ranks only
  const parts = raw.split(",");
  const ranks = Array.from({ length: 12 }, (_, i) => {
    const n = parseInt((parts[i] ?? "").trim(), 10);
    return Number.isFinite(n) && n >= 1 && n <= 12 ? n : null;
  });
  return { ranks, sides: Array(12).fill(null) };
}

/** Jawaban satu kelompok: "1,5,,3,..." (12 slot, boleh kosong) atau JSON. */
export function parseRmibAnswer(value: string | undefined | null): (number | null)[] {
  return parseRmibData(value).ranks;
}

export function parseRmibSides(value: string | undefined | null): RmibSide[] {
  return parseRmibData(value).sides;
}

export function serializeRmibAnswer(
  ranks: (number | null)[],
  sides?: RmibSide[],
): string {
  const hasSide = sides?.some((s) => s === "M" || s === "F");
  if (hasSide) {
    return JSON.stringify({ ranks, sides });
  }
  return Array.from({ length: 12 }, (_, i) => ranks[i] ?? "").join(",");
}

/** Satu kelompok dianggap selesai bila 12 angka terisi dan tidak ada yang kembar. */
export function rmibGroupComplete(value: string | undefined | null): boolean {
  const v = parseRmibAnswer(value);
  if (v.some((x) => x === null)) return false;
  return new Set(v as number[]).size === 12;
}

export function rmibDuplicates(value: string | undefined | null): Set<number> {
  const v = parseRmibAnswer(value);
  const seen = new Map<number, number>();
  for (const n of v) if (n !== null) seen.set(n, (seen.get(n) ?? 0) + 1);
  return new Set([...seen.entries()].filter(([, c]) => c > 1).map(([n]) => n));
}

export type RmibResult = {
  totals: Record<RmibCategory, number>;
  ranks: Record<RmibCategory, number>;
  order: { category: RmibCategory; label: string; total: number; rank: number }[];
  top3: RmibCategory[];
  answeredGroups: number;
  totalGroups: number;
  complete: boolean;
};

/**
 * @param answersByGroup peringkat per kelompok, key = kode kelompok ("A".."I")
 *                       atau nomor urut kelompok (1..9).
 */
export function rmibScore(answersByGroup: Record<string, string>): RmibResult {
  const totals = Object.fromEntries(RMIB_CATEGORIES.map((c) => [c, 0])) as Record<
    RmibCategory,
    number
  >;
  let answeredGroups = 0;

  RMIB_GROUPS.forEach((grp, gi) => {
    const raw = answersByGroup[grp.code] ?? answersByGroup[String(gi + 1)] ?? "";
    const vals = parseRmibAnswer(raw);
    if (vals.some((v) => v !== null)) answeredGroups++;
    vals.forEach((v, ri) => {
      if (v !== null) totals[rmibCategoryAt(gi, ri)] += v;
    });
  });

  const sorted = [...RMIB_CATEGORIES].sort((a, b) => totals[a] - totals[b]);
  const ranks = Object.fromEntries(RMIB_CATEGORIES.map((c) => [c, 0])) as Record<
    RmibCategory,
    number
  >;
  sorted.forEach((c, i) => (ranks[c] = i + 1));

  return {
    totals,
    ranks,
    order: sorted.map((c) => ({
      category: c,
      label: RMIB_CATEGORY_LABEL[c],
      total: totals[c],
      rank: ranks[c],
    })),
    top3: sorted.slice(0, 3),
    answeredGroups,
    totalGroups: RMIB_GROUPS.length,
    complete: answeredGroups === RMIB_GROUPS.length,
  };
}
