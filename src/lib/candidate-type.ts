/**
 * Kandidat dibagi dua jalur: Magang dan Karyawan.
 * Jalur ditentukan saat Super Admin / HR membuat kode akses, lalu menentukan
 * paket test (kolom `tests.audience`), field biodata, dan label portal.
 */
export const CANDIDATE_TYPES = ["magang", "karyawan"] as const;
export type CandidateType = (typeof CANDIDATE_TYPES)[number];

export const TEST_AUDIENCES = ["magang", "karyawan", "both"] as const;
export type TestAudience = (typeof TEST_AUDIENCES)[number];

export function candidateTypeLabel(t?: string | null): string {
  return t === "magang" ? "Kandidat Magang" : "Kandidat Karyawan";
}

export function candidateTypeShort(t?: string | null): string {
  return t === "magang" ? "Magang" : "Karyawan";
}

export function testAudienceLabel(a?: string | null): string {
  if (a === "magang") return "Khusus Magang";
  if (a === "karyawan") return "Khusus Karyawan";
  return "Magang & Karyawan";
}

/** Apakah sebuah test berlaku untuk jalur kandidat tertentu. */
export function audienceMatches(audience: string | null | undefined, type: string | null | undefined) {
  const a = audience ?? "both";
  return a === "both" || a === (type ?? "karyawan");
}
