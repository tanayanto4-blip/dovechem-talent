export type DocKey = "ktp" | "kk" | "cv" | "ijazah" | "transkrip";

export const REQUIRED_DOCS: { key: DocKey; label: string }[] = [
  { key: "ktp", label: "KTP" },
  { key: "kk", label: "KK" },
  { key: "cv", label: "CV" },
  { key: "ijazah", label: "Ijazah" },
  { key: "transkrip", label: "Transkrip" },
];

export function computeChecklist(files: { file_type?: string | null }[] | null | undefined) {
  const uploaded = new Set((files ?? []).map((f) => f.file_type ?? "").filter(Boolean));
  const items = REQUIRED_DOCS.map((d) => ({ ...d, uploaded: uploaded.has(d.key) }));
  const done = items.filter((i) => i.uploaded).length;
  return { items, done, total: REQUIRED_DOCS.length, complete: done === REQUIRED_DOCS.length };
}
