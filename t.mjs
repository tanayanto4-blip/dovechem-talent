import ExcelJS from 'exceljs';
const OPTION_KEYS=["D","I","S","C"];
const BLOCK_ROWS=[8,14,20,26,32,38,44,50];
const COLUMN_SETS=[{p:"C",k:"E"},{p:"J",k:"L"},{p:"Q",k:"S"}];
const wb=new ExcelJS.Workbook();
await wb.xlsx.readFile('/tmp/disc.xlsx');
const ws=wb.worksheets.find(w=>/disc\s*test/i.test(w.name));
const picks=new Map();
for(let g=1;g<=24;g++){const mi=(g*3)%4, li=(g*3+2)%4;
 const set=COLUMN_SETS[Math.floor((g-1)/8)], row0=BLOCK_ROWS[(g-1)%8];
 ws.getCell(`${set.p}${row0+mi}`).value="x";
 ws.getCell(`${set.k}${row0+li}`).value="x";
 picks.set(g,{most:mi,least:li});
}
wb.calcProperties={...wb.calcProperties, fullCalcOnLoad:true};
await wb.xlsx.writeFile('/tmp/out.xlsx');
console.log(JSON.stringify([...picks].slice(0,3)));
