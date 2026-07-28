import ExcelJS from 'exceljs';
const OPTION_KEYS=["D","I","S","C"],BLOCK_ROWS=[8,14,20,26,32,38,44,50],COLUMN_SETS=[{p:"C",k:"E"},{p:"J",k:"L"},{p:"Q",k:"S"}];
function setCached(ws,addr,result){const cell=ws.getCell(addr);const v=cell.value;const f=v&&typeof v==='object'&&typeof v.formula==='string'?v.formula:(typeof v==='string'&&v.startsWith('=')?v.slice(1):null);cell.value=f?{formula:f,result}:result;}
const wb=new ExcelJS.Workbook();await wb.xlsx.readFile('/tmp/disc.xlsx');
const ws=wb.worksheets.find(w=>/disc\s*test/i.test(w.name));
const picks=new Map();
for(let g=1;g<=24;g++){const mi=(g*3)%4,li=(g*3+2)%4;const set=COLUMN_SETS[Math.floor((g-1)/8)],row0=BLOCK_ROWS[(g-1)%8];
 ws.getCell(`${set.p}${row0+mi}`).value='x';ws.getCell(`${set.k}${row0+li}`).value='x';picks.set(g,{most:mi,least:li});}
for(let g=1;g<=24;g++){const set=COLUMN_SETS[Math.floor((g-1)/8)],row0=BLOCK_ROWS[(g-1)%8],sumRow=row0+4;
 const pS=String.fromCharCode(set.p.charCodeAt(0)+1),kS=String.fromCharCode(set.k.charCodeAt(0)+1);const pick=picks.get(g);
 for(let i=0;i<4;i++){setCached(ws,`${pS}${row0+i}`,pick&&pick.most===i?i+1:0);setCached(ws,`${kS}${row0+i}`,pick&&pick.least===i?i+1:0);}
 setCached(ws,`${set.p}${sumRow}`,pick&&pick.most>=0?1:0);setCached(ws,`${pS}${sumRow}`,pick&&pick.most>=0?pick.most+1:0);
 setCached(ws,`${set.k}${sumRow}`,pick&&pick.least>=0?1:0);setCached(ws,`${kS}${sumRow}`,pick&&pick.least>=0?pick.least+1:0);}
wb.calcProperties={...wb.calcProperties,fullCalcOnLoad:true};
await wb.xlsx.writeFile('/tmp/out2.xlsx');
// strip stale cached values on other sheets
for (const s of wb.worksheets) {
  if (s === ws) continue;
  s.eachRow({includeEmpty:false}, (row)=>row.eachCell({includeEmpty:false},(cell)=>{
    const v=cell.value;
    if(v&&typeof v==='object'&&typeof v.formula==='string') cell.value={formula:v.formula,result:undefined};
    else if(v&&typeof v==='object'&&typeof v.sharedFormula==='string') cell.value={sharedFormula:v.sharedFormula,result:undefined};
  }));
}
await wb.xlsx.writeFile('/tmp/out3.xlsx');
