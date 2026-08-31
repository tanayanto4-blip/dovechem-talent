import { papiScore } from "@/lib/papi-key";
import { msdtScore } from "@/lib/msdt-key";
import { rmibScore } from "@/lib/rmib-key";

export type ScoreAnswer = { question_id: string; answer: string };

/**
 * Penilaian satu attempt berdasarkan tipe test. Dipakai baik saat kandidat
 * submit sendiri maupun saat staff membantu melengkapi jawaban kandidat.
 */
export function scoreTest(
  test: any,
  questions: any[],
  answers: ScoreAnswer[],
): { score: number; result: any } {
let score = 0;
let result: any = {};
if (test.test_type === "mcq") {
  const map = new Map(answers.map((a) => [a.question_id, a.answer]));
  let correct = 0;
  for (const q of questions) if (map.get(q.id) === q.correct_answer) correct++;
  const total = (questions).length || 1;
  score = Math.round((correct / total) * 100);
  result = { correct, total };
} else if (test.test_type === "disc") {
  const most: Record<string, number> = { D: 0, I: 0, S: 0, C: 0 };
  const least: Record<string, number> = { D: 0, I: 0, S: 0, C: 0 };
  for (const a of answers) {
    try {
      const v = JSON.parse(a.answer);
      if (v && most[v.most] !== undefined) most[v.most]++;
      if (v && least[v.least] !== undefined) least[v.least]++;
    } catch {
      /* legacy single-letter answer */
      if (most[a.answer] !== undefined) most[a.answer]++;
    }
  }
  const change: Record<string, number> = {
    D: most.D - least.D,
    I: most.I - least.I,
    S: most.S - least.S,
    C: most.C - least.C,
  };
  const dominant = (Object.entries(most).sort((a, b) => b[1] - a[1])[0] ?? ["D", 0])[0];
  const totalGroups = (questions).length || 24;
  score = Math.round((most[dominant] / totalGroups) * 100);
  result = { most, least, change, dominant };
} else if (test.test_type === "kraepelin") {
  // answers are numeric strings; score = correctness rate provided by client-side check
  const map = new Map(answers.map((a) => [a.question_id, a.answer]));
  let correct = 0;
  for (const q of questions) if (map.get(q.id) === q.correct_answer) correct++;
  const total = (questions).length || 1;
  score = Math.round((correct / total) * 100);
  result = { correct, total };
} else if (test.test_type === "mbti") {
  // Forced-choice: each option carries a dimension letter (E/I, S/N, T/F, J/P).
  const counts: Record<string, number> = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
  const qMap = new Map((questions).map((q: any) => [q.id, q]));
  for (const a of answers) {
    const q: any = qMap.get(a.question_id);
    const opt = (q?.options ?? []).find((o: any) => o.key === a.answer);
    const dim = opt?.dimension;
    if (dim && counts[dim] !== undefined) counts[dim]++;
  }
  const pick = (x: string, y: string) => (counts[x] >= counts[y] ? x : y);
  const type = `${pick("E", "I")}${pick("S", "N")}${pick("T", "F")}${pick("J", "P")}`;
  const pairs = {
    EI: { E: counts.E, I: counts.I },
    SN: { S: counts.S, N: counts.N },
    TF: { T: counts.T, F: counts.F },
    JP: { J: counts.J, P: counts.P },
  };
  // Score = average clarity of the dominant letter in each pair (0-100).
  const clarity = (a: number, b: number) =>
    a + b === 0 ? 0 : Math.round((Math.max(a, b) / (a + b)) * 100);
  const clarityByPair = {
    EI: clarity(counts.E, counts.I),
    SN: clarity(counts.S, counts.N),
    TF: clarity(counts.T, counts.F),
    JP: clarity(counts.J, counts.P),
  };
  score = Math.round(
    (clarityByPair.EI + clarityByPair.SN + clarityByPair.TF + clarityByPair.JP) / 4,
  );
  result = { type, counts, pairs, clarity: clarityByPair };
} else if (test.test_type === "eq") {
  // Likert 1..5 per item; group by dimension (SA/ME/MO/EM/SS).
  const dims = ["SA", "ME", "MO", "EM", "SS"] as const;
  const sums: Record<string, number> = { SA: 0, ME: 0, MO: 0, EM: 0, SS: 0 };
  const counts: Record<string, number> = { SA: 0, ME: 0, MO: 0, EM: 0, SS: 0 };
  const qMap = new Map((questions).map((q: any) => [q.id, q]));
  for (const a of answers) {
    const q: any = qMap.get(a.question_id);
    const dim = q?.dimension;
    const val = parseInt(a.answer, 10);
    if (dim && sums[dim] !== undefined && !Number.isNaN(val) && val >= 1 && val <= 5) {
      sums[dim] += val;
      counts[dim] += 1;
    }
  }
  // Per-dimension score normalized to 0-100 (max = count * 5)
  const perDim: Record<string, { raw: number; max: number; percent: number }> = {} as any;
  let totalPct = 0;
  let dimsWithData = 0;
  for (const d of dims) {
    const max = counts[d] * 5;
    const pct = max > 0 ? Math.round((sums[d] / max) * 100) : 0;
    perDim[d] = { raw: sums[d], max, percent: pct };
    if (max > 0) {
      totalPct += pct;
      dimsWithData++;
    }
  }
  score = dimsWithData > 0 ? Math.round(totalPct / dimsWithData) : 0;
  const dominant = (Object.entries(perDim).sort((a, b) => b[1].percent - a[1].percent)[0] ?? [
    "SA",
    { percent: 0 },
  ])[0];
  result = { perDim, dominant, sums, counts };
} else if (test.test_type === "wpt") {
  // WPT: jawaban bebas — tidak ada auto-scoring; menunggu review manual HR.
  const answered = answers.filter((a) => (a.answer ?? "").trim() !== "").length;
  const total = (questions).length || 50;
  score = 0;
  result = { requires_manual_review: true, answered, total, unanswered: total - answered };
} else if (test.test_type === "papi") {
  // PAPI Kostick: forced-choice A/B. Skor dihitung dengan kunci lembar jawaban resmi
  // (opsi A = panah atas, opsi B = panah bawah) -> 20 skala, masing-masing maks 9.
  const qMap = new Map((questions).map((q: any) => [q.id, q]));
  const picks: Record<number, string> = {};
  for (const a of answers) {
    const key = (a.answer ?? "").trim().toUpperCase();
    if (key !== "A" && key !== "B") continue;
    const q: any = qMap.get(a.question_id);
    if (q?.question_number) picks[q.question_number] = key;
  }
  const papi = papiScore(picks);
  const total = (questions).length || 90;
  score = 0;
  result = {
    requires_manual_review: true,
    answered: papi.answered,
    total,
    unanswered: total - papi.answered,
    scales: papi.scales,
    roles: papi.top,
    needs: papi.bottom,
    highest: papi.highest,
    picks,
  };
} else if (test.test_type === "msdt") {
  // MSDT: forced-choice A/B (64 item) -> 8 gaya kepemimpinan + TO/RO/E.
  const qMap = new Map((questions).map((q: any) => [q.id, q]));
  const picks: Record<number, string> = {};
  for (const a of answers) {
    const key = (a.answer ?? "").trim().toUpperCase();
    if (key !== "A" && key !== "B") continue;
    const q: any = qMap.get(a.question_id);
    if (q?.question_number) picks[q.question_number] = key;
  }
  const msdt = msdtScore(picks);
  const total = (questions).length || 64;
  score = 0;
  result = {
    requires_manual_review: true,
    answered: msdt.answered,
    total,
    unanswered: total - msdt.answered,
    columns: msdt.columns,
    dims: msdt.dims,
    konversi: msdt.konversi,
    dominant: msdt.dominant,
    dominant_label: msdt.dominantLabel,
    picks,
  };
} else if (test.test_type === "rmib") {
  // RMIB: 9 kelompok x 12 pekerjaan, kandidat menulis peringkat 1-12 di tiap kotak.
  const qMap = new Map((questions).map((q: any) => [q.id, q]));
  const byGroup: Record<string, string> = {};
  for (const a of answers) {
    const q: any = qMap.get(a.question_id);
    const code = (q?.options as any)?.code ?? String(q?.question_number ?? "");
    if (code) byGroup[code] = a.answer ?? "";
  }
  const rmib = rmibScore(byGroup);
  score = 0;
  result = {
    requires_manual_review: true,
    answered: rmib.answeredGroups,
    total: rmib.totalGroups,
    unanswered: rmib.totalGroups - rmib.answeredGroups,
    totals: rmib.totals,
    ranks: rmib.ranks,
    order: rmib.order,
    top3: rmib.top3,
    groups: byGroup,
  };
} else if (test.test_type === "pauli") {

  // Pauli/Koran: kunci dihitung dari deret angka (jumlah dua angka bersebelahan, ambil digit terakhir).
  const byId = new Map((questions).map((q: any) => [q.id, q]));
  let attempted = 0;
  let correct = 0;
  const perColumn: Array<{ column: number; attempted: number; correct: number }> = [];
  for (const a of answers) {
    const q: any = byId.get(a.question_id);
    const digits: string = (q?.options as any)?.digits ?? "";
    if (!digits) continue;
    const chars = (a.answer ?? "").split("");
    let cAtt = 0;
    let cCor = 0;
    for (let i = 0; i < digits.length - 1; i++) {
      const ch = chars[i];
      if (!ch || !/\d/.test(ch)) continue;
      cAtt++;
      const key = (Number(digits[i]) + Number(digits[i + 1])) % 10;
      if (Number(ch) === key) cCor++;
    }
    attempted += cAtt;
    correct += cCor;
    perColumn.push({ column: q?.question_number ?? 0, attempted: cAtt, correct: cCor });
  }
  perColumn.sort((x, y) => x.column - y.column);
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
  score = accuracy;
  result = { attempted, correct, wrong: attempted - correct, accuracy, perColumn };
} else if (test.test_type === "ishihara") {
  // Tes buta warna: cukup hitung berapa benar dan berapa salah.
  const map = new Map(
    answers.map((a) => [a.question_id, (a.answer ?? "").trim().toLowerCase()]),
  );
  const list = questions;
  let correct = 0;
  for (const q of list) {
    const key = String(q.correct_answer ?? "")
      .trim()
      .toLowerCase();
    const ans = map.get(q.id) ?? "";
    if (key && ans && ans === key) correct++;
  }
  const total = list.length || 14;
  score = correct;
  result = { correct, wrong: total - correct, total };
}

  return { score, result };
}
