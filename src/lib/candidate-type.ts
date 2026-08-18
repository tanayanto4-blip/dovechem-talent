/**
 * Kandidat dibagi dua jalur: Magang dan Karyawan.
 * Jalur ditentukan saat Super Admin / HR membuat kode akses, lalu menentukan
 * paket test (kolom `tests.audience`), field biodata, dan label portal.
 *
 * Khusus jalur Karyawan ada dua tingkat jabatan: Staff dan SPV ke atas.
 * Tingkat ditentukan dari pilihan "Posisi Jabatan" saat kandidat mengisi
 * biodata, dan menentukan porsi soal yang muncul di portalnya.
 */
export const CANDIDATE_TYPES = ["magang", "karyawan"] as const;
export type CandidateType = (typeof CANDIDATE_TYPES)[number];

export const TEST_AUDIENCES = [
  "magang",
  "karyawan",
  "karyawan_staff",
  "karyawan_spv",
  "both",
] as const;
export type TestAudience = (typeof TEST_AUDIENCES)[number];

export const JOB_LEVELS = ["staff", "spv_up"] as const;
export type JobLevel = (typeof JOB_LEVELS)[number];

/** Pilihan posisi jabatan untuk kandidat karyawan beserta tingkatnya. */
export const JOB_POSITIONS: { value: string; level: JobLevel }[] = [
  { value: "Staff", level: "staff" },
  { value: "Supervisor", level: "spv_up" },
  { value: "Superintendent", level: "spv_up" },
  { value: "Manager", level: "spv_up" },
  { value: "General Manager", level: "spv_up" },
];

export function jobLevelOfPosition(position?: string | null): JobLevel | null {
  const found = JOB_POSITIONS.find(
    (p) =>
      p.value.toLowerCase() ===
      String(position ?? "")
        .trim()
        .toLowerCase(),
  );
  return found?.level ?? null;
}

export function jobLevelLabel(level?: string | null): string {
  return level === "spv_up" ? "SPV ke atas" : level === "staff" ? "Staff" : "Belum ditentukan";
}

/** Tingkat jabatan kandidat (hanya relevan untuk jalur Karyawan). */
export function candidateLevelOf(candidate: any): JobLevel | null {
  const raw = candidate?.job_level;
  if (raw === "staff" || raw === "spv_up") return raw;
  return jobLevelOfPosition(candidate?.job_position);
}

export function candidateTypeLabel(t?: string | null, level?: string | null): string {
  if (t === "magang") return "Kandidat Magang";
  if (level === "spv_up") return "Kandidat Karyawan — SPV ke atas";
  if (level === "staff") return "Kandidat Karyawan — Staff";
  return "Kandidat Karyawan";
}

export function candidateTypeShort(t?: string | null): string {
  return t === "magang" ? "Magang" : "Karyawan";
}

export function testAudienceLabel(a?: string | null): string {
  if (a === "magang") return "Khusus Magang";
  if (a === "karyawan") return "Semua Karyawan";
  if (a === "karyawan_staff") return "Karyawan — Staff";
  if (a === "karyawan_spv") return "Karyawan — SPV ke atas";
  return "Magang & Karyawan";
}

/**
 * Daftar nilai `tests.audience` yang boleh dilihat sebuah jalur kandidat.
 * Kandidat karyawan yang belum memilih posisi jabatan hanya melihat test umum.
 */
export function audiencesFor(type: string | null | undefined, level?: string | null): string[] {
  if ((type ?? "karyawan") === "magang") return ["both", "magang"];
  const base = ["both", "karyawan"];
  if (level === "staff") base.push("karyawan_staff");
  if (level === "spv_up") base.push("karyawan_spv");
  return base;
}

/**
 * Apakah sebuah test berlaku untuk jalur kandidat tertentu.
 * `level` opsional: kalau tidak diisi (mis. rekap di dashboard staff), semua
 * varian karyawan dianggap cocok.
 */
export function audienceMatches(
  audience: string | null | undefined,
  type: string | null | undefined,
  level?: string | null,
) {
  const a = audience ?? "both";
  if (a === "both") return true;
  const t = type ?? "karyawan";
  if (t === "magang") return a === "magang";
  if (a === "karyawan") return true;
  if (a === "karyawan_staff") return !level || level === "staff";
  if (a === "karyawan_spv") return !level || level === "spv_up";
  return false;
}

/** Jalur kandidat dari relasi kode akses (kode lama tanpa tipe = Karyawan). */
export function candidateTrackOf(candidate: any): CandidateType {
  const t = candidate?.candidate_codes?.candidate_type ?? candidate?.candidate_type;
  return t === "magang" ? "magang" : "karyawan";
}
