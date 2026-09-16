import jsPDF from "jspdf";
import doverLogo from "@/assets/dover-logo.jpg.asset.json";
import { papiScore, papiSpecialCount, PAPI_SPECIAL_ITEMS } from "@/lib/papi-key";
import { computeDiscScores } from "@/lib/disc-score";
import { getDiscDescription } from "@/lib/disc-descriptions";
import { getMbtiDescription } from "@/lib/mbti-descriptions";
import { computeMbtiScores } from "@/lib/mbti-excel";
import { computeWptScore } from "@/lib/wpt-excel";

/**
 * Rangkuman kandidat (Recruitment Resume) PT Dover Chemical — satu file PDF
 * dengan urutan halaman mengikuti dokumen resmi:
 *   1. Recruitment Resume (personal data + ability)
 *   2. Key Background Review (PAPI Kostick)
 *   3. PAPI Chart
 *   4. DISC — Personality System Graph
 *   5. Key Background Review — Summary Personality Background + MBTI + IQ
 */

const BLUE: [number, number, number] = [15, 55, 110];
const LIGHT: [number, number, number] = [232, 238, 246];
const GREEN: [number, number, number] = [198, 239, 206];
const YELLOW: [number, number, number] = [255, 235, 156];
const RED: [number, number, number] = [255, 199, 206];

const IQ_MIN = 102;
const IQ_MEDIAN = 108;
const PAULI_MIN = 2300;
const PAULI_MEDIAN = 3100;
const PAULI_MAX = 4000;

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/** Deskripsi & kualifikasi tiap skala PAPI sesuai lembar Key Background Review. */
const PAPI_GROUPS: Array<{ group: string; letters: string[] }> = [
  { group: "LEADERSHIP", letters: ["L", "P", "I"] },
  { group: "ACTIVITY", letters: ["T", "V"] },
  { group: "SOCIAL NATURE", letters: ["X", "S", "B", "O"] },
  { group: "WORKSTYLE", letters: ["R", "D", "C"] },
  { group: "TEMPERAMENT", letters: ["Z", "E", "K"] },
  { group: "FELLOWSHIP", letters: ["F", "W"] },
  { group: "WORK DIRECTION", letters: ["N", "G", "A"] },
];

const PAPI_REVIEW: Record<string, { desc: string; qual: string }> = {
  L: {
    desc: "cenderung tidak secara aktif menggunakan orang lain dalam bekerja",
    qual: "LEADERSHIP ROLE (PERAN PEMIMPIN)",
  },
  P: {
    desc: "tingkat kebutuhan untuk menerima tanggung jawab orang lain, menjadi orang yang bertanggung jawab",
    qual: "NEED TO CONTROL OTHERS (KEBUTUHAN MENGATUR ORANG LAIN)",
  },
  I: {
    desc: "berhati-hati membuat keputusan",
    qual: "EASE IN DECISION MAKING (PERAN MEMBUAT KEPUTUSAN)",
  },
  T: {
    desc: "melakukan segala sesuatu menurut kemauannya sendiri",
    qual: "PACE (PERAN SIBUK)",
  },
  V: {
    desc: "aktif secara fisik, cenderung sportif dan tangguh",
    qual: "VIGOROUS TYPE (PERAN PENUH SEMANGAT)",
  },
  X: {
    desc: "memiliki pola perilaku yang unik",
    qual: "NEED TO BE NOTICED (KEBUTUHAN UNTUK DIPERHATIKAN)",
  },
  S: {
    desc: "perhatian terhadap hubungan sosial dan kepercayaan pada orang lain",
    qual: "SOCIAL EXTENSION (PERAN HUBUNGAN SOSIAL)",
  },
  B: {
    desc: "selektif dalam memilih kelompok",
    qual: "NEED TO BELONG TO GROUPS (KEBUTUHAN DITERIMA DALAM KELOMPOK)",
  },
  O: {
    desc: "sadar akan hubungan perorangan, tapi tidak terlalu tergantung",
    qual: "NEED FOR CLOSENESS AND AFFECTION (KEBUTUHAN KEDEKATAN DAN KASIH SAYANG)",
  },
  R: {
    desc: "cara berpikir teoretis atau praktis dalam bekerja",
    qual: "THEORETICAL TYPE (PERAN ORANG YANG TEORITIS)",
  },
  D: {
    desc: "minat untuk bekerja secara detail",
    qual: "INTEREST IN WORKING WITH DETAILS (PERAN BEKERJA DENGAN HAL RINCI)",
  },
  C: {
    desc: "keteraturan dalam bekerja",
    qual: "ORGANIZED TYPE (PERAN MENGATUR)",
  },
  Z: {
    desc: "kebutuhan terhadap variasi dan perubahan",
    qual: "NEED FOR CHANGE (KEBUTUHAN UNTUK BERUBAH)",
  },
  E: {
    desc: "keterbukaan dan pengendalian emosi",
    qual: "EMOTIONAL RESISTANT (PERAN PENGENDALIAN EMOSI)",
  },
  K: {
    desc: "cara menghadapi masalah dan konflik",
    qual: "NEED TO BE FORCEFUL (KEBUTUHAN UNTUK AGRESIF)",
  },
  F: {
    desc: "kebutuhan mendukung dan membantu atasan",
    qual: "NEED TO SUPPORT AUTHORITY (KEBUTUHAN MEMBANTU ATASAN)",
  },
  W: {
    desc: "orientasi terhadap tugas dan kebutuhan instruksi yang jelas",
    qual: "NEED FOR RULES AND SUPERVISION (KEBUTUHAN MENGIKUTI ATURAN DAN PENGAWASAN)",
  },
  N: {
    desc: "ketekunan dan tanggung jawab menyelesaikan tugas",
    qual: "NEED TO FINISH TASK (KEBUTUHAN MENYELESAIKAN TUGAS SECARA MANDIRI)",
  },
  G: {
    desc: "kemauan bekerja keras",
    qual: "HARD INTENSE WORKER (PERAN PEKERJA KERAS)",
  },
  A: {
    desc: "kejelasan tujuan, kebutuhan sukses dan ambisi",
    qual: "NEED TO ACHIEVE (KEBUTUHAN BERPRESTASI)",
  },
};

const JOB_MATCH: Record<string, string> = {
  D: "Entrepreneur, General Manager, Project Manager, Sales Manager, Production Manager, Business Development, Field Supervisor, Operation Manager.",
  I: "Sales & Marketing, Public Relation, Customer Relation, Trainer, Recruiter, Event Organizer, Hospitality, Counselor, Promotor.",
  S: "Administration, Human Resource, Customer Service, Quality Assurance, Teacher, Nurse, Support Staff, Logistic, Maintenance.",
  C: "Researcher (Technician, Chemist, Quality Control), Engineer (Project, Draughtsman, Designer), Statistician, Surveyor, Medical Specialist, IT Management, Planner, Technical Writing, Production, Accounting, Computer Programmer, Architect.",
};

const DISC_GRAPH_TITLE: Array<[string, string]> = [
  ["GRAPH 1 — MOST", "Mask / Public Self"],
  ["GRAPH 2 — LEAST", "Core / Private Self"],
  ["GRAPH 3 — CHANGE", "Mirror / Perceived Self"],
];

export interface SummaryAnswerRow {
  question_number: number;
  answer: any;
}

export interface SummaryInput {
  candidate: {
    full_name?: string | null;
    position_applied?: string | null;
    job_position?: string | null;
    department?: string | null;
    education?: string | null;
    major?: string | null;
    school_name?: string | null;
    age?: number | string | null;
    birth_date?: string | null;
    gender?: string | null;
    work_experience?: string | null;
  };
  candidateCode?: string | null;
  testDate?: string | null;
  /** Jawaban mentah per jenis test. */
  papiPicks?: Record<number, string> | null;
  discAnswers?: SummaryAnswerRow[] | null;
  mbtiAnswers?: SummaryAnswerRow[] | null;
  wptAnswers?: SummaryAnswerRow[] | null;
  ishihara?: { correct?: number | null; wrong?: number | null } | null;
  pauli?: { correct?: number | null } | null;
  preparedBy?: string | null;
}

const dash = (v: unknown) => (v === null || v === undefined || v === "" ? "-" : String(v));

function fmtDate(v?: string | null) {
  const d = v ? new Date(v) : new Date();
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function ageOf(c: SummaryInput["candidate"]): string {
  if (c.age != null && c.age !== "") return String(c.age);
  if (!c.birth_date) return "-";
  const d = new Date(c.birth_date);
  if (Number.isNaN(d.getTime())) return "-";
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a >= 0 && a < 120 ? String(a) : "-";
}

function educationOf(c: SummaryInput["candidate"]) {
  const parts = [c.education, c.major, c.school_name]
    .map((v) => (v ?? "").toString().trim())
    .filter(Boolean);
  return parts.length ? parts.join(" - ") : "-";
}

async function logoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(doverLogo.url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(new Error("logo gagal dibaca"));
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Membangun dokumen rangkuman (dipisah agar mudah diuji). */
export function buildSummaryDoc(input: SummaryInput, data: SummaryData, logo: string | null) {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const c = input.candidate ?? {};
  const name = dash(c.full_name);
  const position = dash(c.job_position ?? c.position_applied);
  const department = dash(c.department ?? c.position_applied);
  const testDate = fmtDate(input.testDate);

  const LW = doc.internal.pageSize.getWidth(); // landscape width
  const LH = doc.internal.pageSize.getHeight();
  const M = 32;

  const head = (title: string, subtitle: string, w: number) => {
    doc.setFillColor(...BLUE);
    doc.rect(0, 0, w, 62, "F");
    if (logo) {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(M - 4, 11, 52, 40, 4, 4, "F");
      try {
        doc.addImage(logo, "JPEG", M, 15, 44, 32);
      } catch {
        /* abaikan */
      }
    }
    const x = logo ? M + 62 : M;
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("PT DOVER CHEMICAL", x, 28);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(title, x, 45);
    doc.setFontSize(8);
    doc.text(subtitle, w - M, 45, { align: "right" });
    doc.setTextColor(20);
  };

  const confidential = (w: number, y: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28);
    doc.text("CONFIDENTIAL", M, y);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(110);
    doc.text("For Authorized personnel only", M + 74, y);
    doc.setTextColor(20);
    doc.setFont("helvetica", "normal");
  };

  // =============== HALAMAN 1 — RECRUITMENT RESUME ===============
  head("Recruitment Resume", `Tanggal Pre-Test: ${testDate}`, LW);
  confidential(LW, 80);

  const cols: Array<{ label: string; w: number }> = [
    { label: "Name", w: 120 },
    { label: "Date of Pre-Test", w: 78 },
    { label: "Position", w: 90 },
    { label: "Department", w: 70 },
    { label: "Education", w: 150 },
    { label: "Age", w: 38 },
    { label: "Years of Employment", w: 62 },
    { label: "Colour Blindness", w: 62 },
    { label: "General Intelligence", w: 62 },
    { label: "Ability to Work under Pressure", w: 76 },
  ];
  const tableW = cols.reduce((a, b) => a + b.w, 0);
  let y = 94;

  // Judul kelompok kolom
  const abW = cols[cols.length - 1].w + cols[cols.length - 2].w;
  doc.setFillColor(...BLUE);
  doc.rect(M, y, tableW - abW, 18, "F");
  doc.rect(M + tableW - abW, y, abW, 18, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Personal Data", M + 6, y + 12);
  doc.text("Ability", M + tableW - abW + 6, y + 12);
  y += 18;

  // Baris header kolom
  doc.setFillColor(...LIGHT);
  doc.rect(M, y, tableW, 30, "F");
  doc.setTextColor(20);
  doc.setFontSize(7);
  let x = M;
  cols.forEach((col) => {
    doc.setDrawColor(150, 165, 185);
    doc.rect(x, y, col.w, 30);
    const lines = doc.splitTextToSize(col.label, col.w - 6);
    doc.text(lines.slice(0, 3), x + 3, y + (30 - lines.length * 8) / 2 + 7);
    x += col.w;
  });
  y += 30;

  const rowVals = (vals: string[], h: number, fills?: Array<[number, number, number] | null>) => {
    let cx = M;
    doc.setFontSize(7);
    cols.forEach((col, i) => {
      const fill = fills?.[i];
      if (fill) {
        doc.setFillColor(...fill);
        doc.rect(cx, y, col.w, h, "F");
      }
      doc.setDrawColor(150, 165, 185);
      doc.rect(cx, y, col.w, h);
      const lines = doc.splitTextToSize(vals[i] ?? "", col.w - 6).slice(0, 4);
      doc.text(lines, cx + 3, y + 10);
      cx += col.w;
    });
    y += h;
  };

  doc.setFont("helvetica", "normal");
  rowVals(["Min", "", "", "", "", "", "", "", String(IQ_MIN), String(PAULI_MIN)], 14);
  rowVals(
    ["Clerk, Sr. Clerk Median", "", "", "", "", "", "", "", String(IQ_MEDIAN), String(PAULI_MEDIAN)],
    14,
  );
  rowVals(["Max", "", "", "", "", "", "", "", "", String(PAULI_MAX)], 14);

  const iq = data.iq;
  const pauli = data.pauliCorrect;
  const iqFill = iq == null ? null : iq >= IQ_MIN ? GREEN : iq >= IQ_MIN - 8 ? YELLOW : RED;
  const pauliFill =
    pauli == null ? null : pauli >= PAULI_MIN ? GREEN : pauli >= PAULI_MIN - 300 ? YELLOW : RED;
  const colour = data.ishihara
    ? `B : ${data.ishihara.correct ?? 0}  S : ${data.ishihara.wrong ?? 0}`
    : "-";

  doc.setFont("helvetica", "bold");
  rowVals(
    [
      name,
      testDate,
      position,
      department,
      educationOf(c),
      ageOf(c),
      dash(c.work_experience),
      colour,
      iq == null ? "-" : String(iq),
      pauli == null ? "-" : String(pauli),
    ],
    26,
    [null, null, null, null, null, null, null, null, iqFill, pauliFill],
  );
  doc.setFont("helvetica", "normal");

  // Legenda
  y += 18;
  const legend: Array<[string, [number, number, number]]> = [
    ["Nominasi / Passed Standart", GREEN],
    ["Alternatif / Near to Standart", YELLOW],
    ["Jauh di bawah Standar / Not Passed", RED],
  ];
  let lx = M;
  doc.setFontSize(8);
  legend.forEach(([label, color]) => {
    doc.setFillColor(...color);
    doc.rect(lx, y, 14, 10, "F");
    doc.setDrawColor(150);
    doc.rect(lx, y, 14, 10);
    doc.text(label, lx + 19, y + 8);
    lx += doc.getTextWidth(label) + 46;
  });

  y += 42;
  doc.setFontSize(9);
  doc.text("Prepared by,", M, y);
  doc.setDrawColor(150);
  doc.line(M, y + 42, M + 170, y + 42);
  doc.text(dash(input.preparedBy ?? "HR / Talent Acquisition"), M, y + 56);

  // =============== HALAMAN 2 — KEY BACKGROUND REVIEW (PAPI) ===============
  doc.addPage("a4", "portrait");
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  head("KEY BACKGROUND REVIEW — PAPI Kostick", testDate, PW);
  confidential(PW, 78);

  const idRows: Array<[string, string]> = [
    ["NAMA", name],
    ["USIA", `${ageOf(c)} Th`],
    ["PENDIDIKAN", educationOf(c)],
    ["POSISI / DEPART", `${position} / ${department}`],
    ["Tgl. Pemeriksaan", testDate],
  ];
  let py = 88;
  doc.setFontSize(8.5);
  idRows.forEach(([k, v], i) => {
    doc.setFillColor(...(i % 2 === 0 ? LIGHT : ([255, 255, 255] as [number, number, number])));
    doc.rect(M, py, PW - M * 2, 16, "F");
    doc.setDrawColor(190, 200, 214);
    doc.rect(M, py, PW - M * 2, 16);
    doc.line(M + 120, py, M + 120, py + 16);
    doc.setFont("helvetica", "bold");
    doc.text(k, M + 5, py + 11);
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(v, PW - M * 2 - 132)[0] ?? "-", M + 126, py + 11);
    py += 16;
  });
  py += 14;

  const pc: Array<{ label: string; w: number }> = [
    { label: "Deskripsi", w: 80 },
    { label: "Uraian", w: 170 },
    { label: "Kualifikasi", w: 180 },
    { label: "Kode", w: 32 },
    { label: "Nilai", w: 34 },
    { label: "Default", w: 35 },
  ];
  const pTableW = pc.reduce((a, b) => a + b.w, 0);

  const papiHeader = () => {
    doc.setFillColor(...BLUE);
    doc.rect(M, py, pTableW, 18, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    let hx = M;
    pc.forEach((col) => {
      doc.text(col.label, hx + 4, py + 12);
      hx += col.w;
    });
    doc.setTextColor(20);
    doc.setFont("helvetica", "normal");
    py += 18;
  };
  papiHeader();

  const papiScores = data.papi?.scales ?? null;
  doc.setFontSize(7.5);
  PAPI_GROUPS.forEach((grp) => {
    if (py + 28 > PH - 60) {
      doc.addPage("a4", "portrait");
      head("KEY BACKGROUND REVIEW — PAPI Kostick", testDate, PW);
      py = 84;
      papiHeader();
    }
    doc.setFillColor(215, 226, 240);
    doc.rect(M, py, pTableW, 14, "F");
    doc.setDrawColor(190, 200, 214);
    doc.rect(M, py, pTableW, 14);
    doc.setFont("helvetica", "bold");
    doc.text(grp.group, M + 4, py + 10);
    doc.setFont("helvetica", "normal");
    py += 14;

    grp.letters.forEach((letter) => {
      const info = PAPI_REVIEW[letter];
      const cells = [
        grp.group,
        info?.desc ?? "-",
        info?.qual ?? "-",
        letter,
        papiScores ? String(papiScores[letter] ?? 0) : "-",
        "9",
      ];
      const heights = cells.map(
        (v, i) => doc.splitTextToSize(String(v), pc[i].w - 8).length * 8 + 6,
      );
      const h = Math.max(16, ...heights);
      if (py + h > PH - 60) {
        doc.addPage("a4", "portrait");
        head("KEY BACKGROUND REVIEW — PAPI Kostick", testDate, PW);
        py = 84;
        papiHeader();
      }
      let cx = M;
      cells.forEach((v, i) => {
        doc.setDrawColor(200, 210, 224);
        doc.rect(cx, py, pc[i].w, h);
        if (i >= 3) doc.setFont("helvetica", "bold");
        doc.text(doc.splitTextToSize(String(v), pc[i].w - 8), cx + 4, py + 10);
        doc.setFont("helvetica", "normal");
        cx += pc[i].w;
      });
      py += h;
    });
  });

  // Relative importance (total jawaban A pada item khusus)
  const special = data.papiSpecial;
  py += 6;
  if (py + 46 > PH - 32) {
    doc.addPage("a4", "portrait");
    head("KEY BACKGROUND REVIEW — PAPI Kostick", testDate, PW);
    py = 90;
  }
  doc.setFillColor(...LIGHT);
  doc.rect(M, py, pTableW, 34, "F");
  doc.setDrawColor(190, 200, 214);
  doc.rect(M, py, pTableW, 34);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("RELATIVE IMPORTANCE", M + 6, py + 14);
  const pctRel = special ? Math.round((special.countA / special.total) * 100) : null;
  doc.text(
    special ? `${special.countA} / ${special.total}  (${pctRel}%)` : "-",
    M + 170,
    py + 14,
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(
    doc.splitTextToSize(`Item: ${PAPI_SPECIAL_ITEMS.join(", ")}`, pTableW - 12),
    M + 6,
    py + 25,
  );
  py += 44;

  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text(
    doc.splitTextToSize(
      "Kesimpulan uraian sesuai nilai tertinggi ataupun rata-rata di masing-masing kriteria aspek / ruang lingkup di atas.",
      PW - M * 2,
    ),
    M,
    py,
  );
  doc.setFont("helvetica", "normal");

  // =============== HALAMAN 3 — PAPI CHART ===============
  doc.addPage("a4", "landscape");
  head("PAPI CHART", name.toUpperCase(), LW);
  const chartTop = 100;
  const chartH = 220;
  const letters = [...PAPI_GROUPS.flatMap((g) => g.letters)];
  const barGap = 8;
  const barW = (LW - M * 2 - barGap * (letters.length - 1)) / letters.length;
  const maxScale = 9;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Profil Skala PAPI (0 - 9)", M, 88);
  doc.setFont("helvetica", "normal");

  // Garis skala
  doc.setFontSize(7);
  for (let s = 0; s <= maxScale; s++) {
    const gy = chartTop + chartH - (s / maxScale) * chartH;
    doc.setDrawColor(226, 232, 240);
    doc.line(M, gy, LW - M, gy);
    doc.setTextColor(120);
    doc.text(String(s), M - 12, gy + 3);
    doc.setTextColor(20);
  }

  letters.forEach((letter, i) => {
    const v = papiScores ? (papiScores[letter] ?? 0) : 0;
    const bx = M + i * (barW + barGap);
    const bh = (Math.min(v, maxScale) / maxScale) * chartH;
    doc.setFillColor(...BLUE);
    doc.rect(bx, chartTop + chartH - bh, barW, bh, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(letter, bx + barW / 2, chartTop + chartH + 14, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(String(v), bx + barW / 2, chartTop + chartH - bh - 4, { align: "center" });
  });

  let ly = chartTop + chartH + 38;
  doc.setFontSize(7.5);
  const half = Math.ceil(letters.length / 2);
  letters.forEach((letter, i) => {
    const colX = i < half ? M : LW / 2 + 6;
    const rowY = ly + (i < half ? i : i - half) * 11;
    doc.text(
      `${letter} — ${(PAPI_REVIEW[letter]?.qual ?? "").split(" (")[0]}: ${papiScores ? (papiScores[letter] ?? 0) : "-"}`,
      colX,
      rowY,
    );
  });

  // =============== HALAMAN 4 — DISC ===============
  doc.addPage("a4", "portrait");
  head("DISC — Personality System Graph", testDate, PW);
  let dy = 86;
  doc.setFontSize(9);
  doc.text(`Name : ${name}`, M, dy);
  doc.text(`Age : ${ageOf(c)} tahun`, M + 240, dy);
  dy += 14;
  doc.text(`Gender : ${dash(c.gender)}`, M, dy);
  doc.text(`Tgl. Tes : ${testDate}`, M + 240, dy);
  dy += 22;

  const disc = data.disc;
  const discCols = ["Line", "D", "I", "S", "C"];
  const dcW = [70, 60, 60, 60, 60];
  const dTableW = dcW.reduce((a, b) => a + b, 0);
  doc.setFillColor(...BLUE);
  doc.rect(M, dy, dTableW, 18, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  let dx = M;
  discCols.forEach((label, i) => {
    doc.text(label, dx + 6, dy + 12);
    dx += dcW[i];
  });
  doc.setTextColor(20);
  doc.setFont("helvetica", "normal");
  dy += 18;

  const discLines: Array<[string, Record<string, number> | null]> = [
    ["1 (MOST)", disc?.line1 ?? null],
    ["2 (LEAST)", disc?.line2 ?? null],
    ["3 (CHANGE)", disc?.line3 ?? null],
  ];
  discLines.forEach(([label, vals], i) => {
    doc.setFillColor(...(i % 2 === 0 ? LIGHT : ([255, 255, 255] as [number, number, number])));
    doc.rect(M, dy, dTableW, 16, "F");
    let cx = M;
    ["Line", "D", "I", "S", "C"].forEach((key, ci) => {
      doc.setDrawColor(200, 210, 224);
      doc.rect(cx, dy, dcW[ci], 16);
      const text = ci === 0 ? label : vals ? String(vals[key] ?? 0) : "-";
      doc.text(text, cx + 6, dy + 11);
      cx += dcW[ci];
    });
    dy += 16;
  });
  dy += 20;

  // Tiga grafik batang DISC
  const gW = (PW - M * 2 - 24) / 3;
  const gH = 120;
  DISC_GRAPH_TITLE.forEach(([title, sub], gi) => {
    const gx = M + gi * (gW + 12);
    const vals = [disc?.line1, disc?.line2, disc?.line3][gi] ?? null;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(title, gx, dy);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(110);
    doc.text(sub, gx, dy + 10);
    doc.setTextColor(20);
    const base = dy + 16 + gH;
    doc.setDrawColor(210, 218, 230);
    doc.rect(gx, dy + 16, gW, gH);
    const bw = (gW - 20) / 4;
    ["D", "I", "S", "C"].forEach((l, li) => {
      const raw = vals ? (vals[l] ?? 0) : 0;
      const capped = Math.max(-12, Math.min(24, raw));
      const zero = base - (12 / 36) * gH;
      const h = (Math.abs(capped) / 36) * gH;
      const bx = gx + 10 + li * bw;
      doc.setFillColor(...BLUE);
      doc.rect(bx + 3, capped >= 0 ? zero - h : zero, bw - 6, h, "F");
      doc.setDrawColor(150);
      doc.line(gx, zero, gx + gW, zero);
      doc.setFontSize(7.5);
      doc.text(l, bx + bw / 2, base + 10, { align: "center" });
      doc.text(String(raw), bx + bw / 2, capped >= 0 ? zero - h - 3 : zero + h + 8, {
        align: "center",
      });
    });
  });
  dy += gH + 44;

  const discDesc = data.discDesc;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BLUE);
  doc.text("GAMBARAN KARAKTER", M, dy);
  doc.setTextColor(20);
  dy += 14;
  doc.setFontSize(9);
  doc.text(discDesc?.title ?? "Belum ada hasil DISC", M, dy);
  dy += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const firstPara = discDesc?.paragraphs?.[0] ?? "-";
  const paraLines = doc.splitTextToSize(firstPara, PW - M * 2);
  doc.text(paraLines.slice(0, 10), M, dy);
  dy += Math.min(paraLines.length, 10) * 10 + 10;

  doc.setFont("helvetica", "bold");
  doc.text("Job Match :", M, dy);
  doc.setFont("helvetica", "normal");
  dy += 12;
  const jm = JOB_MATCH[(data.discTypeMost ?? "").split("-")[0]] ?? "-";
  doc.text(doc.splitTextToSize(jm, PW - M * 2).slice(0, 6), M, dy);

  // =============== HALAMAN 5 — SUMMARY PERSONALITY + MBTI + IQ ===============
  doc.addPage("a4", "portrait");
  head("KEY BACKGROUND REVIEW — Summary", testDate, PW);
  confidential(PW, 78);
  let sy = 92;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BLUE);
  doc.text("SUMMARY PERSONALITY BACKGROUND", M, sy);
  doc.setTextColor(20);
  sy += 14;
  doc.setFontSize(9);
  doc.text(discDesc?.title ?? "-", M, sy);
  sy += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  (discDesc?.paragraphs ?? []).forEach((p) => {
    const lines = doc.splitTextToSize(p, PW - M * 2);
    if (sy + lines.length * 9 > PH - 70) {
      doc.addPage("a4", "portrait");
      head("KEY BACKGROUND REVIEW — Summary", testDate, PW);
      sy = 90;
    }
    doc.text(lines, M, sy);
    sy += lines.length * 9 + 6;
  });

  if (discDesc?.treatments?.length) {
    if (sy + 60 > PH - 70) {
      doc.addPage("a4", "portrait");
      head("KEY BACKGROUND REVIEW — Summary", testDate, PW);
      sy = 90;
    }
    doc.setFont("helvetica", "bold");
    doc.text(doc.splitTextToSize(discDesc.treatmentHeader, PW - M * 2), M, sy);
    sy += 12;
    doc.setFont("helvetica", "normal");
    discDesc.treatments.forEach((t) => {
      const lines = doc.splitTextToSize(t, PW - M * 2 - 8);
      doc.text(lines, M + 8, sy);
      sy += lines.length * 9 + 2;
    });
    sy += 10;
  }

  // Tabel dimensi MBTI + IQ
  if (sy + 140 > PH - 70) {
    doc.addPage("a4", "portrait");
    head("KEY BACKGROUND REVIEW — Summary", testDate, PW);
    sy = 90;
  }
  const mbtiDesc = data.mbtiDesc;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BLUE);
  doc.text("DIMENSION", M, sy);
  doc.setTextColor(20);
  doc.setFontSize(9);
  doc.text(mbtiDesc?.title ?? (data.mbtiType ?? "-"), M + 90, sy);
  sy += 10;
  doc.setFont("helvetica", "normal");

  const mw = [22, 110, 50, 50, 110, PW - M * 2 - 342];
  const dims: Array<[string, string, string, string]> = [
    ["1", "INTROVERT (I)", "I", "E"],
    ["2", "SENSING (S)", "S", "N"],
    ["3", "THINKING (T)", "T", "F"],
    ["4", "JUDGING (J)", "J", "P"],
  ];
  const rightLabel: Record<string, string> = {
    E: "(E) EKSTROVERT",
    N: "(N) INTUITION",
    F: "(F) FEELING",
    P: "(P) PERCEIVING",
  };
  doc.setFontSize(8);
  dims.forEach(([no, left, lk, rk], i) => {
    const pct = data.mbti ? Math.round((data.mbti[lk] ?? 0) * 100) : null;
    const cells = [
      no,
      left,
      pct == null ? "-" : `${pct}%`,
      pct == null ? "-" : `${100 - pct}%`,
      rightLabel[rk],
      mbtiDesc?.bullets?.[i] ?? "",
    ];
    const h = Math.max(
      18,
      ...cells.map((v, ci) => doc.splitTextToSize(String(v), mw[ci] - 8).length * 9 + 8),
    );
    let cx = M;
    cells.forEach((v, ci) => {
      doc.setFillColor(...(i % 2 === 0 ? LIGHT : ([255, 255, 255] as [number, number, number])));
      doc.rect(cx, sy, mw[ci], h, "F");
      doc.setDrawColor(200, 210, 224);
      doc.rect(cx, sy, mw[ci], h);
      if (ci === 2 || ci === 3) doc.setFont("helvetica", "bold");
      doc.text(doc.splitTextToSize(String(v), mw[ci] - 8), cx + 4, sy + 12);
      doc.setFont("helvetica", "normal");
      cx += mw[ci];
    });
    sy += h;
  });

  // Baris IQ
  const iqCat = data.iqCategory ?? "-";
  const iqStatus = iq == null ? "-" : iq >= IQ_MIN ? "QUALIFIED" : "UNQUALIFIED";
  const iqCells = [
    "5",
    "IQ SCORE",
    iq == null ? "-" : String(iq),
    iqCat.toUpperCase(),
    iqStatus,
    data.pauliCorrect == null
      ? "Ability to work under pressure: -"
      : `Ability to work under pressure: ${data.pauliCorrect} (${data.pauliCorrect >= PAULI_MIN ? "QUALIFIED" : "UNQUALIFIED"})`,
  ];
  let ix = M;
  iqCells.forEach((v, ci) => {
    doc.setFillColor(...(ci === 2 ? YELLOW : ([255, 255, 255] as [number, number, number])));
    doc.rect(ix, sy, mw[ci], 20, "F");
    doc.setDrawColor(200, 210, 224);
    doc.rect(ix, sy, mw[ci], 20);
    doc.setFont("helvetica", ci <= 2 ? "bold" : "normal");
    doc.text(doc.splitTextToSize(String(v), mw[ci] - 8).slice(0, 2), ix + 4, sy + 12);
    doc.setFont("helvetica", "normal");
    ix += mw[ci];
  });
  sy += 32;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`CATEGORY : ${(data.mbtiType ?? "-").split("").join("  ")}`, M, sy);
  doc.setFont("helvetica", "normal");
  sy += 12;
  doc.setFontSize(8);
  if (mbtiDesc?.summary) {
    const lines = doc.splitTextToSize(mbtiDesc.summary, PW - M * 2);
    doc.text(lines.slice(0, 8), M, sy);
    sy += Math.min(lines.length, 8) * 9 + 12;
  }

  // Rekomendasi
  if (sy + 70 > PH - 60) {
    doc.addPage("a4", "portrait");
    head("KEY BACKGROUND REVIEW — Summary", testDate, PW);
    sy = 92;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("RECOMMENDATION :", M, sy);
  doc.setFont("helvetica", "normal");
  sy += 14;
  const recs = [
    "TIDAK DISARANKAN",
    "DIPERTIMBANGKAN",
    "DILANJUTKAN DENGAN KETERBATASAN",
    "DILANJUTKAN DENGAN PENGEMBANGAN",
    "SANGAT DISARANKAN",
  ];
  doc.setFontSize(8);
  recs.forEach((r) => {
    doc.setDrawColor(120);
    doc.rect(M, sy - 7, 9, 9);
    doc.text(r, M + 15, sy);
    sy += 14;
  });
  sy += 6;
  doc.setFont("helvetica", "bold");
  doc.text("REMARKS :", M, sy);
  doc.setDrawColor(200, 210, 224);
  doc.rect(M, sy + 6, PW - M * 2, 56);
  doc.setFont("helvetica", "normal");
  doc.line(PW - M - 170, sy + 100, PW - M, sy + 100);
  doc.text("Penilai / HR", PW - M - 170, sy + 112);

  // Footer semua halaman
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(7.5);
    doc.setTextColor(120);
    doc.text(`Rangkuman Kandidat — ${name}`, M, h - 18);
    doc.text(`Halaman ${i} / ${pages}`, w - M, h - 18, { align: "right" });
    doc.setTextColor(20);
  }

  return doc;
}

export interface SummaryData {
  iq: number | null;
  iqCategory: string | null;
  pauliCorrect: number | null;
  ishihara: { correct?: number | null; wrong?: number | null } | null;
  papi: ReturnType<typeof papiScore> | null;
  papiSpecial: ReturnType<typeof papiSpecialCount> | null;
  disc: ReturnType<typeof computeDiscScores> | null;
  discTypeMost: string | null;
  discDesc: ReturnType<typeof getDiscDescription>;
  mbti: Record<string, number> | null;
  mbtiType: string | null;
  mbtiDesc: ReturnType<typeof getMbtiDescription>;
}

/** Menghitung seluruh nilai yang dipakai rangkuman dari jawaban mentah. */
export async function computeSummaryData(input: SummaryInput): Promise<SummaryData> {
  let iq: number | null = null;
  let iqCategory: string | null = null;
  if (input.wptAnswers?.length) {
    try {
      const w = await computeWptScore(input.wptAnswers);
      if (w.valid) {
        iq = w.iq;
        iqCategory = w.category;
      }
    } catch {
      /* IQ dikosongkan bila template WPT gagal dimuat */
    }
  }

  let mbti: Record<string, number> | null = null;
  let mbtiType: string | null = null;
  if (input.mbtiAnswers?.length) {
    try {
      const r = await computeMbtiScores(input.mbtiAnswers);
      if (r.filled > 0) {
        mbti = r.scores;
        mbtiType = r.typeLetters.join("");
      }
    } catch {
      /* persentase MBTI dilewati */
    }
  }

  const disc = input.discAnswers?.length ? computeDiscScores(input.discAnswers) : null;
  const discTypeMost = disc?.valid ? disc.typeMost || disc.type : null;

  const papi = input.papiPicks ? papiScore(input.papiPicks) : null;
  const papiSpecial = input.papiPicks ? papiSpecialCount(input.papiPicks) : null;

  return {
    iq,
    iqCategory,
    pauliCorrect: input.pauli?.correct != null ? Number(input.pauli.correct) : null,
    ishihara: input.ishihara ?? null,
    papi,
    papiSpecial,
    disc,
    discTypeMost,
    discDesc: getDiscDescription(discTypeMost),
    mbti,
    mbtiType,
    mbtiDesc: getMbtiDescription(mbtiType),
  };
}

/** Membuat & mengunduh rangkuman kandidat dalam satu file PDF. */
export async function exportCandidateSummaryPdf(input: SummaryInput) {
  const [logo, data] = await Promise.all([logoDataUrl(), computeSummaryData(input)]);
  const doc = buildSummaryDoc(input, data, logo);
  const safe = (input.candidate?.full_name ?? "kandidat").replace(/[^\w\-]+/g, "_");
  doc.save(`Rangkuman_${safe}_${new Date().toISOString().slice(0, 10)}.pdf`);
  return data;
}
