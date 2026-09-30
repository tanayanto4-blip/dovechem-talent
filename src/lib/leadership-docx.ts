import JSZip from "jszip";
import templateAsset from "@/assets/basic-leadership-tahap-1.docx.asset.json";

/** Fill only the already-empty answer lines in the original Dover Chemical form. */
export async function exportLeadershipDocx(
  candidate: { full_name?: string | null; education?: string | null; job_position?: string | null },
  questions: Array<{ id: string; question_number: number }>,
  answers: Map<string, { answer?: string | null }>,
) {
  const response = await fetch(templateAsset.url);
  if (!response.ok) throw new Error("Formulir Basic Leadership tidak dapat dimuat.");
  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  const file = zip.file("word/document.xml");
  if (!file) throw new Error("Isi formulir Basic Leadership tidak ditemukan.");
  const xml = new DOMParser().parseFromString(await file.async("string"), "application/xml");
  if (xml.querySelector("parsererror")) throw new Error("Formulir Basic Leadership tidak valid.");
  const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const body = xml.getElementsByTagNameNS(ns, "body")[0];
  if (!body) throw new Error("Halaman formulir tidak ditemukan.");
  const paragraphs = Array.from(body.children).filter((node) => node.localName === "p");
  const textOf = (node: Element) =>
    Array.from(node.getElementsByTagNameNS(ns, "t"))
      .map((part) => part.textContent ?? "")
      .join("");

  // These indices refer to the original, unmodified template; never recreate
  // question, HR/USER, scoring, drawing, or paragraph formatting nodes.
  const questionStarts = [7, 23, 36, 48, 61, 72, 85, 100, 112, 123];
  const questionEnds = [...questionStarts.slice(1), 138];
  if (paragraphs.length < 141 || !textOf(paragraphs[7] ?? body).includes("nilai-nilai budaya perusahaan")) {
    throw new Error("Susunan formulir berubah; jawaban tidak dapat ditempatkan dengan aman.");
  }

  const headerValues = [candidate.full_name, candidate.education, candidate.job_position];
  headerValues.forEach((value, index) => {
    if (!value) return;
    const paragraph = paragraphs[index];
    if (!paragraph) return;
    const blank = Array.from(paragraph.getElementsByTagNameNS(ns, "t")).find(
      (part) => (part.textContent ?? "").length > 4 && !(part.textContent ?? "").trim(),
    );
    if (blank) {
      const spaces = blank.textContent ?? "";
      const label = value.trim().slice(0, 55);
      blank.textContent = label + spaces.slice(Math.min(label.length, spaces.length));
    }
  });

  const byNumber = new Map(questions.map((question) => [question.question_number, question.id]));
  for (let i = 0; i < questionStarts.length; i++) {
    const id = byNumber.get(i + 1);
    const answer = id ? (answers.get(id)?.answer ?? "").trim() : "";
    if (!answer) continue;
    const slots = paragraphs.slice(questionStarts[i] + 1, questionEnds[i]).filter(
      (paragraph) => !textOf(paragraph).trim() && !paragraph.getElementsByTagNameNS(ns, "drawing").length,
    );
    // Preserve the reserved line count: split text across existing empty lines.
    const words = answer.replace(/\s+/g, " ").split(" ");
    const lines: string[] = [];
    for (const word of words) {
      const last = lines.length - 1;
      if (last >= 0 && `${lines[last]} ${word}`.length <= 65) lines[last] += ` ${word}`;
      else lines.push(word);
    }
    if (lines.length > slots.length) {
      throw new Error(`Jawaban soal ${i + 1} terlalu panjang untuk ruang formulir asli.`);
    }
    lines.forEach((line, j) => {
      const paragraph = slots[j];
      const run = xml.createElementNS(ns, "w:r");
      const text = xml.createElementNS(ns, "w:t");
      text.textContent = line;
      run.appendChild(text);
      paragraph.appendChild(run);
    });
  }

  zip.file("word/document.xml", new XMLSerializer().serializeToString(xml));
  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Basic_Leadership_${(candidate.full_name || "kandidat").replace(/[^\w-]+/g, "_")}.docx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}