import type {Article,Mode,Paragraph} from './types';
const cleanTitle=(line:string)=>line.trim().replace(/^#{1,6}\s*/, '').replace(/^(?:\*\*|__)(.*)(?:\*\*|__)$/,'$1').trim();
const numbered=/^(?:(?:article|passage|reading|story|text)\s*(?:[0-9０-９]+|[ivxlcdm]+|one|two|three|four|five)\b|第\s*[一二三四五六七八九十0-9]+\s*篇|[0-9０-９]+[.．、):：]\s+\S)/i;
function splitText(text:string):{title:string;paragraphs:Paragraph[]}[]{
 const parts=text.split(/^[ \t]*(?:-{3,}|={3,}|\*{3,})[ \t]*$/m).map(x=>x.trim()).filter(Boolean),out:{title:string;paragraphs:Paragraph[]}[]=[];
 for(const part of parts){const lines=part.split('\n'),labelled=lines.flatMap((l,i)=>numbered.test(cleanTitle(l))?[i]:[]);let boundaries:number[]=[];
 if(labelled.length)boundaries=labelled;
 else{const heads=lines.flatMap((l,i)=>{const h=l.match(/^(#{1,6})\s+(.+)$/);return h?[{i,depth:h[1].length,title:h[2]}]:[];});if(heads.length){let depth=Math.min(...heads.map(h=>h.depth));const top=heads.filter(h=>h.depth===depth);if(top.length===1&&/(?:5|五|five).*(?:篇|articles|stories|readings)|(?:articles|stories|readings).*(?:5|five)/i.test(top[0].title)&&heads.some(h=>h.depth>depth))depth=Math.min(...heads.filter(h=>h.depth>depth).map(h=>h.depth));boundaries=heads.filter(h=>h.depth===depth).map(h=>h.i);}else{const bold=lines.flatMap((l,i)=>/^\s*(?:\*\*|__)[^\n]{1,200}(?:\*\*|__)\s*$/.test(l)&&!/[.!?]\s*(?:\*\*|__)\s*$/.test(l)?[i]:[]);if(bold.length>1)boundaries=bold;}}
 if(!boundaries.length){out.push({title:'阅读 '+(out.length+1),paragraphs:part.split(/\n\s*\n/).map(en=>({en:en.trim(),zh:''}))});continue;}
 for(let i=0;i<boundaries.length;i++){const start=boundaries[i],body=lines.slice(start+1,boundaries[i+1]??lines.length).join('\n').trim();out.push({title:cleanTitle(lines[start]),paragraphs:body.split(/\n\s*\n/).filter(Boolean).map(en=>({en:en.trim(),zh:''}))});}
 }return out;
}
export function parseArticles(input:string,mode:Mode,batch:string):Article[]{
 const text=input.replace(/\r\n?/g,'\n').trim().replace(/^```(?:json|markdown|md|text)?\s*\n/i,'').replace(/\n```\s*$/,'').trim();if(!text)throw Error('请粘贴阅读文章');if(text.length>500000)throw Error('单批正文请控制在 50 万字符以内');
 let parts:{title:string;paragraphs:Paragraph[]}[];
 if(/^[\[{]/.test(text)){let value;try{value=JSON.parse(text);}catch{throw Error('JSON 文章格式无法解析，请检查括号和引号，或改用纯文本粘贴');}const list=Array.isArray(value)?value:value.articles;if(!Array.isArray(list)||!list.length)throw Error('JSON 中需要 articles 数组');parts=list.map((a,i)=>{if(typeof a==='string')return {title:'阅读 '+(i+1),paragraphs:a.split(/\n\s*\n/).map(en=>({en,zh:''}))};const title=typeof a.title==='string'?a.title:'阅读 '+(i+1);if(Array.isArray(a.paragraphs))return {title,paragraphs:a.paragraphs.map((p:unknown)=>typeof p==='string'?{en:p,zh:''}:{en:(p as Paragraph)?.en,zh:(p as Paragraph)?.zh||''})};const body=a.en||a.text||a.body||a.content;if(typeof body!=='string')throw Error('第 '+(i+1)+' 篇缺少英文正文');return {title,paragraphs:body.split(/\n\s*\n/).map(en=>({en,zh:typeof a.zh==='string'?a.zh:''}))};});}
 else parts=splitText(text);
 if(!parts.length||parts.length>50)throw Error('一次需要导入 1–50 篇文章');
 return parts.map((part,i)=>{if(!part.paragraphs.length||part.paragraphs.some(p=>typeof p.en!=='string'||!/[A-Za-z]/.test(p.en)||p.en.length>30000||typeof p.zh!=='string'||p.zh.length>30000)||part.paragraphs.length>100)throw Error('第 '+(i+1)+' 篇缺少英文正文或段落过长');const body=part.paragraphs.map(p=>p.en).join(' ');return {batchId:'import-batch-'+batch,id:'import-batch-'+batch+'-'+(i+1),version:'1',title:part.title.slice(0,300),subtitle:'个人导入阅读',topic:'个人导入',mode,length:body.split(/\s+/).length>500?'长篇':'短篇',paragraphs:part.paragraphs,targets:[],questionIds:[],source:'用户导入'};});
}
