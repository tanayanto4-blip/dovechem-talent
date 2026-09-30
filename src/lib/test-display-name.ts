/** Nama tampilan resmi per jenis test (dipakai di dashboard admin & portal kandidat). */
const DISPLAY_NAMES: Record<string, string> = {
  pauli: "Test Koran",
  kraepelin: "Test Koran",
  wpt: "Cognitive Ability Test",
  mcq: "Cognitive Ability Test",
  mbti: "Personality Test",
  eq: "Emotional Intelligence Test",
  disc: "Disc Test",
  papi: "Papikostik",
  ishihara: "Color Blindness",
  leadership: "Basic Leadership Assessment — Tahap 1",
};

const CODE_NAMES: Record<string, string> = {
  "BASIC-LEADERSHIP-2": "Leadership Assessment — Part II",
};

export function testDisplayName(
  test?: { code?: string | null; name?: string | null; test_type?: string | null } | null,
) {
  if (!test) return "Test";
  const codeName = CODE_NAMES[(test.code ?? "").toUpperCase()];
  if (codeName) return codeName;
  return DISPLAY_NAMES[(test.test_type ?? "").toLowerCase()] ?? test.name ?? "Test";
}
