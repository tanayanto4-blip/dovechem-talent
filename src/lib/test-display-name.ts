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
};

export function testDisplayName(test?: { name?: string | null; test_type?: string | null } | null) {
  if (!test) return "Test";
  return DISPLAY_NAMES[(test.test_type ?? "").toLowerCase()] ?? test.name ?? "Test";
}
