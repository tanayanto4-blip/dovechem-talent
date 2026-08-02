import type ExcelJS from "exceljs";

/**
 * Biodata kandidat yang otomatis mengisi setiap lembar skoring Excel.
 * Sumber data: baris `candidates` (biodata yang diisi kandidat di portal).
 */
export interface CandidateMeta {
  candidateName?: string | null;
  candidateCode?: string | null;
  position?: string | null;
  education?: string | null;
  school?: string | null;
  major?: string | null;
  workExperience?: string | null;
  phone?: string | null;
  email?: string | null;
  gender?: string | null;
  birthPlace?: string | null;
  birthDate?: string | null;
  age?: number | string | null;
  maritalStatus?: string | null;
  finishedAt?: string | null;
}

export function ageFromBirthDate(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 120 ? age : null;
}

/** Membangun meta biodata lengkap dari baris kandidat (auto-fill). */
export function buildCandidateMeta(c: any, extra?: Partial<CandidateMeta>): CandidateMeta {
  const cand = c ?? {};
  return {
    candidateName: cand.full_name ?? null,
    candidateCode: cand.candidate_codes?.code ?? cand.code_snapshot ?? null,
    position: cand.position_applied ?? cand.position ?? null,
    education: cand.education ?? null,
    school: cand.school_name ?? null,
    major: cand.major ?? null,
    workExperience: cand.work_experience ?? null,
    phone: cand.phone ?? null,
    email: cand.email ?? null,
    gender: cand.gender ?? null,
    birthPlace: cand.birth_place ?? null,
    birthDate: cand.birth_date ?? null,
    age: ageFromBirthDate(cand.birth_date),
    maritalStatus: cand.marital_status ?? null,
    ...extra,
  };
}

const dash = (v: unknown) => (v == null || v === "" ? "-" : String(v));

export function fmtDate(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("id-ID");
}

export function metaRows(meta: CandidateMeta): Array<[string, string]> {
  return [
    ["Nama Lengkap", dash(meta.candidateName)],
    ["Kode Akses", dash(meta.candidateCode)],
    ["Posisi Dilamar", dash(meta.position)],
    ["Nama Sekolah/Universitas", dash(meta.school)],
    ["Pendidikan", dash(meta.education)],
    ["Jurusan", dash(meta.major)],
    ["Pernah Bekerja", dash(meta.workExperience)],
    ["Telp/HP", dash(meta.phone)],
    ["Email", dash(meta.email)],
    ["Jenis Kelamin", dash(meta.gender)],
    ["Tempat, Tanggal Lahir", `${dash(meta.birthPlace)}, ${fmtDate(meta.birthDate)}`],
    ["Usia", meta.age == null || meta.age === "" ? "-" : `${meta.age} tahun`],
    ["Status Perkawinan", dash(meta.maritalStatus)],
    ["Tanggal Test", fmtDate(meta.finishedAt ?? new Date().toISOString())],
  ];
}

/**
 * Menambahkan sheet "Biodata Kandidat" ke workbook skoring, terisi otomatis
 * dari data biodata yang sudah dimiliki kandidat.
 */
export function applyBiodataSheet(wb: ExcelJS.Workbook, meta: CandidateMeta, testName?: string) {
  const name = "Biodata Kandidat";
  const existing = wb.getWorksheet(name);
  if (existing) wb.removeWorksheet(existing.id);
  const ws = wb.addWorksheet(name);
  ws.columns = [{ width: 30 }, { width: 52 }] as any;

  ws.mergeCells(1, 1, 1, 2);
  const title = ws.getCell(1, 1);
  title.value = `PT DOVER CHEMICAL — Biodata Kandidat${testName ? ` (${testName})` : ""}`;
  title.font = { bold: true, size: 13, color: { argb: "FF0C3A6E" } };
  ws.getRow(1).height = 22;

  metaRows(meta).forEach(([label, value], i) => {
    const row = ws.getRow(i + 3);
    row.getCell(1).value = label;
    row.getCell(2).value = value;
    row.getCell(1).font = { bold: true, size: 10 };
    row.getCell(2).font = { size: 10 };
    row.eachCell((cell) => {
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "hair" },
        left: { style: "hair" },
        bottom: { style: "hair" },
        right: { style: "hair" },
      };
      if (i % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F7FB" } };
    });
    row.height = 18;
  });
  return ws;
}
