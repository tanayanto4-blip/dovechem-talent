import jsPDF from "jspdf";
import { writeFileSync } from "fs";
(jsPDF as any).API.save = function (name: string) {
  writeFileSync("/tmp/papi/gen.pdf", Buffer.from(this.output("arraybuffer")));
  return this;
};
const { exportPapiPdf } = await import("./src/lib/papi-pdf.ts");
const picks: Record<number, string> = {};
for (let i = 1; i <= 90; i++) picks[i] = i % 2 ? "A" : "B";
exportPapiPdf(picks, { candidateName: "Budi Santoso", candidateCode: "DVR-001", position: "Operator", startedAt: new Date().toISOString(), finishedAt: new Date().toISOString() });
