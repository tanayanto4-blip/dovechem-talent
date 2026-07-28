import fs from "fs";
const buf = fs.readFileSync("/mnt/user-uploads/IQ-3.xlsx");
(globalThis as any).fetch = async () => ({ ok: true, arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset+buf.byteLength) });
(globalThis as any).Blob = class { constructor(p:any){} };
(globalThis as any).URL.createObjectURL = () => "x";
(globalThis as any).URL.revokeObjectURL = () => {};
(globalThis as any).document = { createElement: () => ({ click(){} }) };
const { exportWptExcel } = await import("/dev-server/src/lib/wpt-excel.ts");
const keys: Record<number,string> = {1:"4",2:"2",3:"3",4:"tidak",5:"3",6:"1",7:"3",8:"0.125",9:"1",10:"4",13:"1",23:"A",29:"2,5",44:"6,9",49:"1,2,4,5"};
const rows = Array.from({length:50},(_,i)=>({question_number:i+1, answer: keys[i+1] ?? ""}));
console.log(await exportWptExcel(rows,{candidateName:"Tes"}));
import ExcelJS from "exceljs";
const wb=new ExcelJS.Workbook(); await wb.xlsx.load(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength));
const ws=wb.worksheets[0];
for (const n of Object.keys(keys).map(Number)) { const row=136+n; console.log(n, keys[n], JSON.stringify(ws.getCell(`C${row}`).value), JSON.stringify(ws.getCell(`B${row}`).value)); }
