import JSZip from "jszip";
import fs from "fs";
const src = fs.readFileSync("/tmp/disc-template.xlsx");
const mod = await import("/dev-server/src/lib/disc-excel.ts").catch(()=>null);
// replicate logic inline instead
const OPTION_KEYS=["D","I","S","C"];
const BLOCK_ROWS=[8,14,20,26,32,38,44,50];
const SETS=[{p:"C",k:"E"},{p:"J",k:"L"},{p:"Q",k:"S"}];
const zip=await JSZip.loadAsync(src);
const wbXml=await zip.file("xl/workbook.xml")!.async("string");
const rels=await zip.file("xl/_rels/workbook.xml.rels")!.async("string");
const attr=(t:string,n:string)=>t.match(new RegExp(`\\s${n}="([^"]*)"`))?.[1]??"";
const relMap=new Map<string,string>();
for(const m of rels.matchAll(/<Relationship\b[^>]*>/g)) relMap.set(attr(m[0],"Id"),"xl/"+attr(m[0],"Target").replace(/^\/?xl\//,"").replace(/^\.\//,""));
const sheets=[...wbXml.matchAll(/<sheet\b[^>]*>/g)].map(m=>({name:attr(m[0],"name"),path:relMap.get(attr(m[0],"r:id")||attr(m[0],"id"))!}));
const edits=new Map<string,any>();
for(let g=1;g<=24;g++){const s=SETS[Math.floor((g-1)/8)],r=BLOCK_ROWS[(g-1)%8];
 const mi=g%4, li=(g+2)%4;
 edits.set(`${s.p}${r+mi}`,"x"); edits.set(`${s.k}${r+li}`,"x");}
edits.set("G2","Tes Kandidat"); edits.set("G3",25); edits.set("G4","PRIA"); edits.set("G5","02/08/2026");
const colToNum=(l:string)=>l.split("").reduce((a,c)=>a*26+(c.charCodeAt(0)-64),0);
function buildCell(ref:string,style:string,value:any){const s=style?` s="${style}"`:"";if(value===null||value==="")return `<c r="${ref}"${s}/>`;if(typeof value==="number")return `<c r="${ref}"${s} t="n"><v>${value}</v></c>`;return `<c r="${ref}"${s} t="inlineStr"><is><t>${value}</t></is></c>`;}
function patchSheet(xml:string,ed:Map<string,any>,clear=true){const rowRe=/<row\b[^>]*\/>|<row\b[^>]*>[\s\S]*?<\/row>/g;const cellRe=/<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/g;
 return xml.replace(rowRe,(rowXml)=>{const rowNum=attr(rowXml,"r");const pending=new Map<string,any>();for(const [ref,val] of ed){if(ref.replace(/[A-Z]+/,"")===rowNum)pending.set(ref,val);}if(!pending.size&&!clear)return rowXml;
  let out=rowXml.replace(cellRe,(cellXml)=>{const ref=attr(cellXml,"r");if(pending.has(ref)){const v=pending.get(ref);pending.delete(ref);return buildCell(ref,attr(cellXml,"s"),v);}if(!clear||!/<f[\s>/]/.test(cellXml))return cellXml;const f=cellXml.match(/<f\b[^>]*\/>|<f\b[^>]*>[\s\S]*?<\/f>/)?.[0]??"";const open=cellXml.match(/<c\b[^>]*?>/)?.[0]??`<c r="${ref}">`;return `${open.replace(/\st="[^"]*"/,"")}${f}</c>`;});
  for(const [ref,val] of pending){const nc=buildCell(ref,"",val);const target=colToNum(ref.replace(/\d+/,""));const cells=out.match(cellRe)??[];const after=cells.find(c=>colToNum(attr(c,"r").replace(/\d+/,""))>target);if(after)out=out.replace(after,nc+after);else if(out.endsWith("</row>"))out=out.slice(0,-6)+nc+"</row>";}
  return out;});}
for(const s of sheets){const f=zip.file(s.path);if(!f)continue;const xml=await f.async("string");zip.file(s.path,patchSheet(xml,s.name===sheets[0].name?edits:new Map(),true));}
let wb=wbXml;wb=/<calcPr\b[^>]*\/>/.test(wb)?wb.replace(/<calcPr\b([^>]*)\/>/,'<calcPr$1 fullCalcOnLoad="1" calcMode="auto"/>'):wb.replace("</workbook>",'<calcPr fullCalcOnLoad="1" calcMode="auto"/></workbook>');
zip.file("xl/workbook.xml",wb);zip.remove("xl/calcChain.xml");
fs.writeFileSync("/tmp/sim/out.xlsx",await zip.generateAsync({type:"nodebuffer",compression:"DEFLATE"}));
console.log("ok",sheets.map(s=>s.name));
