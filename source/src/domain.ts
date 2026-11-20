import {containsVocabularyTerm} from './vocabulary-term';
import {validateBody,validateReadingSet} from './group-core';
import type {Lexeme,Sense,UserState,Question,ReviewState,Article,Dataset} from './types';
export const uid=()=>crypto.randomUUID();
export const now=()=>new Date().toISOString();
export const normalized=(s:string)=>s.toLowerCase().normalize('NFKC').replace(/[’‘]/g,"'").replace(/'s$/,'').trim();
export function initialState(version:string):UserState {return {schema:2,importBatches:[],importEntries:[],generationTasks:[],readingQuestionSets:[],readingRounds:[],dictionaryVersion:version,vocabulary:[],overrides:[],custom:[],sets:[],articles:[],questions:[],attempts:[],reviews:[],cardChecks:[],readArticles:[],lookups:0,settings:{theme:'light',fontSize:19,mode:'CET-4',lastArticle:'',highlight:true},updatedAt:now()};}
export interface LookupResult {form:string;candidates:Lexeme[];senses:Sense[];recommended?:string;reason:string;ambiguous:boolean}
export interface SenseResolver {lookup(form:string,context?:string,annotatedSense?:string):LookupResult}
export class RuleSenseResolver implements SenseResolver {
  index=new Map<string,Lexeme[]>();
  constructor(public dictionary:Lexeme[],public forms:Record<string,string[]>) {for(const l of dictionary){for(const f of [l.lemma,...l.variants||[]]){const k=normalized(f);const old=this.index.get(k)||[];this.index.set(k,l.senses.some(s=>s.source==='user')?[l,...old]:[...old,l]);}}}
  lookup(form:string,context='',annotatedSense?:string):LookupResult {
    const f=normalized(form),roots=new Set([f,...this.forms[f]||[]]);
    const add=(r:string)=>{if(this.index.has(r)) roots.add(r);};
    if(f.endsWith('ies'))add(f.slice(0,-3)+'y');
    if(f.endsWith('ing')){const r=f.slice(0,-3);add(r);add(r+'e');if(/(.)\1$/.test(r))add(r.slice(0,-1));}
    if(f.endsWith('ed')){const r=f.slice(0,-2);add(r);add(r+'e');if(/(.)\1$/.test(r))add(r.slice(0,-1));}
    if(f.endsWith('es'))add(f.slice(0,-2));if(f.endsWith('s'))add(f.slice(0,-1));
    const candidates=[...new Map([...roots].flatMap(r=>this.index.get(r)||[]).map(l=>[l.id,l])).values()];
    const own=candidates.filter(l=>l.senses.some(s=>s.source==='user'));const senses=(own.length?own:candidates).flatMap(l=>l.senses);let recommended:string|undefined,reason='缺少可靠语境线索；以下为常见义项，请结合原句选择。';
    if(own.length){recommended=own[0].senses[0]?.id;reason='采用你最近导入的词义（覆盖内置词典显示）。';}
    else if(annotatedSense&&senses.some(s=>s.id===annotatedSense)){recommended=annotatedSense;reason='内置文章的义项标注（模型编写，尚未独立语言审阅）。';}
    else if(/\baddress(?:es|ed|ing)?\s+(?:the\s+|a\s+)?(?:problem|issue|challenge|concern)/i.test(context)&&roots.has('address')){recommended=senses.find(s=>s.id==='s-address-deal')?.id;reason='搭配线索：address + problem / issue，表示处理问题。';}
    else if(/\bstatistically\s+significant\b/i.test(context)&&roots.has('significant')){recommended=senses.find(s=>s.id==='s-significant-stat')?.id;reason='搭配线索：statistically significant，统计学显著。';}
    if(!senses.length)reason='离线词典暂未收录。可以保存为自定义词条，手动补充释义。';
    return {form,candidates,senses:[...senses].sort((a,b)=>Number(b.id===recommended)-Number(a.id===recommended)),recommended,reason,ambiguous:!recommended&&senses.length>1};
  }
  phraseAt(tokens:string[],i:number):string|undefined {for(let n=Math.min(5,tokens.length-i);n>=2;n--){const phrase=tokens.slice(i,i+n).join(' ');if(this.index.has(normalized(phrase)))return phrase;}return undefined;}
}
const DAYS=86400000;
// Identity of a learning context is its actual sentence and sense, never shuffled options or caller IDs.
export function contextKey(q:Pick<Question,'senseId'|'context'>){return q.senseId+'|'+q.context.toLowerCase().normalize('NFKC').replace(/\s+/g,' ').trim();}
export function reviewAfter(previous:ReviewState|undefined,q:Question,correct:boolean,date=now()):{state:ReviewState;effective:boolean}{
  const stamp=Date.parse(date),old=previous||{id:q.senseId,stage:0,firstAt:date,lastAt:'',nextAt:date,successes:0,contexts:[],errors:0,mastered:false};
  // At most one scheduled review per sense per local 24h; new contexts still count as practice.
  const effective=!old.lastAt||(stamp-Date.parse(old.lastAt)>=DAYS&&stamp>=Date.parse(old.nextAt));
  if(!effective)return {state:correct?old:{...old,stage:Math.max(0,old.stage-1),errors:old.errors+1,mastered:false,nextAt:new Date(stamp+DAYS).toISOString()},effective:false};
  const stage=correct?Math.min(old.stage+1,5):Math.max(0,old.stage-1);
  const successes=correct?old.successes+1:old.successes;
  const contexts=correct?[...new Set([...old.contexts,contextKey(q)])]:old.contexts;
  const mastered=correct&&successes>=5&&contexts.length>=3&&stamp-Date.parse(old.firstAt)>=14*DAYS;
  return {effective:true,state:{...old,stage,successes,contexts,mastered,errors:old.errors+Number(!correct),lastAt:date,nextAt:new Date(stamp+(correct?[1,3,7,14,30][Math.max(0,stage-1)]:1)*DAYS).toISOString()}};
}
export function parseCSV(text:string,separator=','):string[][] {const rows:string[][]=[];let row:string[]=[],field='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(c===separator&&!quoted){row.push(field);field='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(Boolean))rows.push(row);row=[];field='';}else field+=c;}if(quoted)throw Error('CSV 引号没有闭合。');row.push(field);if(row.some(Boolean))rows.push(row);return rows;}
export function csvCell(s:string){if(/^[\s]*[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
export function canonical(v:unknown):string {if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(v&&typeof v==='object')return '{'+Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>JSON.stringify(k)+':'+canonical(x)).join(',')+'}';return JSON.stringify(v);}
export async function checksum(v:unknown){const bytes=new TextEncoder().encode(canonical(v));const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('');}
export async function backupEnvelope(state:UserState){const data=JSON.parse(JSON.stringify(state)) as UserState;return {format:'ContextFlowBackup',version:state.schema===2?2:1,dictionaryVersion:state.dictionaryVersion,createdAt:now(),algorithm:'SHA-256',checksum:await checksum(data),data};}
function assert(ok:unknown,msg:string):asserts ok {if(!ok)throw Error(msg);}
const isStr=(v:unknown,max=10000):v is string=>typeof v==='string'&&v.length<=max;
const validDate=(v:unknown)=>isStr(v)&&Number.isFinite(Date.parse(v));
export function validateAlignment(a:Article){const occurrences=a.occurrences||[];assert(Array.isArray(occurrences)&&occurrences.length<=10000,'文章词定位无效');const ids=new Set<string>();for(const o of occurrences){assert(o&&isStr(o.id)&&!ids.has(o.id)&&Number.isInteger(o.paragraph)&&o.paragraph>=0&&o.paragraph<a.paragraphs.length&&Number.isInteger(o.start)&&Number.isInteger(o.end)&&o.start>=0&&o.end>o.start&&isStr(o.form,100)&&isStr(o.senseId)&&a.paragraphs[o.paragraph].en.slice(o.start,o.end)===o.form,'目标词位置与原文不一致');ids.add(o.id);}for(const [i,p] of a.paragraphs.entries()){if(p.segments===undefined)continue;assert(Array.isArray(p.segments)&&p.segments.length<=1000,'译文片段结构无效');for(const seg of p.segments){assert(seg&&isStr(seg.zh,30000)&&(!seg.english||isStr(seg.english,100))&&(!seg.occurrenceId||occurrences.some(o=>o.id===seg.occurrenceId&&o.paragraph===i&&normalized(o.form)===normalized(seg.english||''))),'译文标注未对应同段英文位置');}}}
export function validateQuestion(q:Question){assert(q&&isStr(q.id)&&isStr(q.version)&&isStr(q.senseId)&&isStr(q.word,100)&&/^[A-Za-z][A-Za-z'’ -]*$/.test(q.word)&&isStr(q.context)&&q.context.length>5&&!/[\u4e00-\u9fff]/.test(q.context)&&isStr(q.contextId)&&isStr(q.prompt)&&isStr(q.type),'题目字段不完整或英文语境无效');assert(Array.isArray(q.options)&&q.options.length===4&&q.options.every(x=>isStr(x)&&/[A-Za-z]/.test(x)&&!/[\u4e00-\u9fff]/.test(x))&&new Set(q.options).size===4,'每题必须有四个不同的英文选项');assert(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4,'答案索引无效');assert(Array.isArray(q.explanations)&&q.explanations.length===4&&q.explanations.every(x=>isStr(x)&&x.trim()),'需要四项解析');}
export function validateArticle(a:Article,questions:Question[],lexemes:Lexeme[]){assert(a&&(a.batchId===undefined||isStr(a.batchId,300))&&(a.setId===undefined||isStr(a.setId,100))&&isStr(a.id)&&isStr(a.version)&&isStr(a.title,300)&&isStr(a.subtitle,500)&&isStr(a.source)&&isStr(a.topic,80)&&['CET-4','CET-6','IELTS'].includes(a.mode)&&isStr(a.length),'文章字段不完整');assert(Array.isArray(a.paragraphs)&&a.paragraphs.length>0&&a.paragraphs.length<=100&&a.paragraphs.every(p=>isStr(p.en,30000)&&p.en.trim()&&isStr(p.zh,30000)&&p.zh.trim()),'每段需有英文和对应译文');assert(Array.isArray(a.targets)&&a.targets.length<=200&&a.targets.every(t=>isStr(t.word,100)&&lexemes.some(l=>l.senses.some(s=>s.id===t.senseId))),'目标词义未在词典中找到');assert(Array.isArray(a.questionIds)&&a.questionIds.every(id=>questions.some(q=>q.id===id)),'文章引用的题目不存在');const all=a.paragraphs.map(p=>p.en).join(' ').toLowerCase();for(const t of a.targets){assert(containsVocabularyTerm(all,t.word),`目标词 ${t.word} 未实际出现`);}for(const q of questions.filter(q=>a.questionIds.includes(q.id))){assert(a.targets.some(t=>t.senseId===q.senseId),'题目不属于本篇目标义项');assert(!all.includes(q.context.toLowerCase()),'练习语境不能重复文章原句');}validateAlignment(a);}
export function validateState(s:UserState){
 assert(s&&(s.schema===1||s.schema===2)&&isStr(s.dictionaryVersion),'不支持此数据版本。请使用对应版本导出 JSON。');
 assert(s.libraryReset015===undefined||typeof s.libraryReset015==='boolean','词汇库迁移标记无效');
 const collections=['vocabulary','overrides','custom','sets','articles','questions','attempts','reviews','readArticles'] as const;
 for(const k of collections)assert(Array.isArray(s[k])&&s[k].length<=100000,`备份集合 ${k} 无效或过大`);
 const known=['schema','dictionaryVersion',...collections,...(s.schema===2?['importBatches','importEntries','generationTasks','readingQuestionSets','readingRounds','removedArticleIds']:[]),'lookups','settings','updatedAt','libraryReset015','cardChecks'];assert(Object.keys(s).every(k=>known.includes(k)),'备份包含未知字段，已拒绝导入。');
 for(const k of collections.filter(k=>k!=='readArticles')){const ids=new Set<string>();for(const x of s[k] as {id:string}[]){assert(x&&isStr(x.id)&&!ids.has(x.id),`${k} 中存在无效或重复 ID`);ids.add(x.id);}}
 assert(s.settings&&['light','dark','system'].includes(s.settings.theme)&&Number.isFinite(s.settings.fontSize)&&s.settings.fontSize>=16&&s.settings.fontSize<=26&&['CET-4','CET-6','IELTS'].includes(s.settings.mode)&&isStr(s.settings.lastArticle)&&typeof s.settings.highlight==='boolean','设置字段无效');
 assert(Number.isSafeInteger(s.lookups)&&s.lookups>=0&&validDate(s.updatedAt)&&s.readArticles.every(x=>isStr(x)),'统计或日期字段无效');
 for(const v of s.vocabulary)assert(isStr(v.lexemeId)&&isStr(v.form,100)&&isStr(v.senseId)&&isStr(v.articleId)&&isStr(v.context)&&validDate(v.createdAt),'收藏记录无效');
 for(const o of s.overrides)assert(isStr(o.lexemeId)&&isStr(o.senseId)&&isStr(o.zh)&&isStr(o.en)&&isStr(o.ipa,300)&&validDate(o.updatedAt),'个人修改无效');
 for(const l of s.custom)assert(isStr(l.lemma,100)&&l.ipa&&(!l.ipa.uk||isStr(l.ipa.uk,300))&&(!l.ipa.us||isStr(l.ipa.us,300))&&(!l.ipa.other||Array.isArray(l.ipa.other)&&l.ipa.other.every(x=>isStr(x,300)))&&Array.isArray(l.senses)&&l.senses.length>0&&l.senses.every(x=>isStr(x.id)&&isStr(x.zh)&&isStr(x.en)&&isStr(x.pos)&&isStr(x.source)&&isStr(x.status)),'自定义词条无效');
 for(const t of s.sets)assert((t.pendingPos===undefined||Array.isArray(t.pendingPos)&&t.pendingPos.every(id=>isStr(id,150)))&&isStr(t.name,200)&&isStr(t.source)&&validDate(t.updatedAt)&&Array.isArray(t.targets)&&t.targets.every(x=>isStr(x.word,100)&&isStr(x.senseId)),'目标集合无效');
 for(const q of s.questions)validateQuestion(q);
 for(const a of s.articles)assert((a.batchId===undefined||isStr(a.batchId,300))&&(a.setId===undefined||isStr(a.setId,100))&&isStr(a.version)&&isStr(a.title,300)&&isStr(a.subtitle,500)&&isStr(a.topic,80)&&isStr(a.length)&&isStr(a.source)&&['CET-4','CET-6','IELTS'].includes(a.mode)&&Array.isArray(a.paragraphs)&&a.paragraphs.length>0&&a.paragraphs.length<=100&&a.paragraphs.every(p=>isStr(p.en,30000)&&isStr(p.zh,30000))&&Array.isArray(a.targets)&&a.targets.length<=200&&a.targets.every(t=>isStr(t.word,100)&&isStr(t.senseId))&&Array.isArray(a.questionIds)&&a.questionIds.every(id=>isStr(id)),'备份中的文章结构无效');for(const a of s.articles)validateAlignment(a);
 for(const a of s.attempts){validateQuestion(a.question);assert(Number.isInteger(a.selected)&&a.selected>=0&&a.selected<4&&a.correct===(a.selected===a.question.answer)&&typeof a.effective==='boolean'&&(!a.kind||['initial','review'].includes(a.kind))&&validDate(a.submittedAt),'答题记录无效');}
 if(s.cardChecks!==undefined){
   assert(Array.isArray(s.cardChecks)&&s.cardChecks.length<=100000,'词卡自测记录无效');
   const ids=new Set<string>();
   for(const c of s.cardChecks){
     assert(c&&isStr(c.id)&&c.id.trim()&&!ids.has(c.id)&&['again','pass','mastered'].includes(c.mark)&&validDate(c.updatedAt),'词卡自测记录无效');
     ids.add(c.id);
   }
 }
 for(const r of s.reviews)assert([r.stage,r.successes,r.errors].every(x=>Number.isInteger(x)&&x>=0)&&r.stage<=5&&validDate(r.firstAt)&&validDate(r.lastAt)&&validDate(r.nextAt)&&Array.isArray(r.contexts)&&r.contexts.every(x=>isStr(x))&&typeof r.mastered==='boolean','复习状态无效');
 if(s.schema===2)validateNewCollections(s);
}
export function migrateState(raw:UserState):UserState {validateState(raw);if(raw.schema===2)return structuredClone(raw);const next={...structuredClone(raw),schema:2 as const,importBatches:[],importEntries:[],generationTasks:[],readingQuestionSets:[],readingRounds:[]};validateState(next);return next;}
export async function readBackup(raw:unknown){const b=raw as any;assert(b&&b.format==='ContextFlowBackup'&&[1,2].includes(b.version)&&b.algorithm==='SHA-256','这不是支持的完整备份（格式版本 1 或 2）。');validateState(b.data);assert(b.checksum===await checksum(b.data),'完整性校验失败；文件已损坏或被修改，未写入任何数据。');const data=migrateState(b.data);for(const task of data.generationTasks)if(!['completed','cancelled'].includes(task.status)){task.status='interrupted';task.message='从备份恢复，需主动核对任务';}return data;}

export function previewMerge(current:UserState,incoming:UserState){let added=0,duplicate=0,conflicts=0;for(const k of ['vocabulary','overrides','custom','sets','articles','questions','attempts','reviews','importBatches','importEntries','generationTasks','readingQuestionSets','readingRounds','cardChecks'] as const){const index=new Map(((current[k]||[]) as {id:string}[]).map(x=>[x.id,x]));for(const x of (incoming[k]||[]) as {id:string}[]){const old=index.get(x.id);if(!old)added++;else if(canonical(old)===canonical(x))duplicate++;else conflicts++;}}return {added,duplicate,conflicts};}
export function mergeState(current:UserState,incoming:UserState,preferIncoming=false){
 const next=structuredClone(current);
 for(const key of ['vocabulary','overrides','custom','sets','articles','questions','attempts','reviews','importBatches','importEntries','generationTasks','readingQuestionSets','readingRounds','cardChecks'] as const){
  const items=new Map(((next[key]||[]) as {id:string}[]).map(item=>[item.id,item]));
  for(const item of (incoming[key]||[]) as {id:string}[]){
   if(preferIncoming||!items.has(item.id))items.set(item.id,structuredClone(item));
  }
  Object.assign(next,{[key]:[...items.values()]});
 }
 const restoredGroups=new Set<string>();
 for(const article of next.articles){
  if(!article.importBatchId||!current.removedArticleIds?.includes(article.id))continue;
  const group=next.sets.find(group=>group.id===article.setId&&group.importBatchId===article.importBatchId);
  if(!group)continue;
  restoredGroups.add(group.id);
  group.articleId||=article.id;
 }
 // A regenerated group keeps one primary article. Preserve the other saved body as standalone.
 for(const article of next.articles){
  if(!article.setId||!article.importBatchId||!restoredGroups.has(article.setId))continue;
  const group=next.sets.find(group=>group.id===article.setId);
  if(group?.articleId===article.id)continue;
  delete article.setId;
  delete article.importBatchId;
 }
 next.readArticles=[...new Set([...current.readArticles,...incoming.readArticles])];
 next.lookups=Math.max(current.lookups,incoming.lookups);
 if(preferIncoming)next.settings=structuredClone(incoming.settings);
 next.schema=2;
 if(current.removedArticleIds||incoming.removedArticleIds){
  next.removedArticleIds=[...new Set([...(current.removedArticleIds||[]),...(incoming.removedArticleIds||[])])]
   .filter(id=>!next.articles.some(a=>a.id===id));
 }
 next.updatedAt=now();
 validateState(next);
 return next;
}
export function validateBundle(raw:unknown,dataset:Dataset,custom:Lexeme[]){const b=raw as {format:'ContextFlowLearningBundle';version:1;articles:Article[];questions:Question[]};assert(b&&b.format==='ContextFlowLearningBundle'&&b.version===1&&Array.isArray(b.articles)&&b.articles.length>0&&b.articles.length<=100&&Array.isArray(b.questions)&&b.questions.length<=5000,'需要格式版本 1 的 ContextFlowLearningBundle');const ids=new Set<string>();for(const q of b.questions){validateQuestion(q);assert(!ids.has(q.id),'题目 ID 重复');ids.add(q.id);}for(const a of b.articles)validateArticle(a,b.questions,[...dataset.dictionary,...custom]);return b;}

function validateNewCollections(s:UserState){
 assert(s.removedArticleIds===undefined||Array.isArray(s.removedArticleIds)&&s.removedArticleIds.length<=100000&&s.removedArticleIds.every(id=>isStr(id)&&!!id)&&new Set(s.removedArticleIds).size===s.removedArticleIds.length,'已删除文章标记无效');
 const keys=['importBatches','importEntries','generationTasks','readingQuestionSets','readingRounds'] as const;
 for(const key of keys){assert(Array.isArray(s[key])&&s[key].length<=100000,'新增数据集合无效：'+key);const ids=new Set();for(const row of s[key]){assert(row&&isStr(row.id)&&row.id&&!ids.has(row.id),'新增数据 ID 重复：'+key);ids.add(row.id);}}
 for(const batch of s.importBatches){assert(isStr(batch.name,200)&&Number.isInteger(batch.ordinal)&&batch.ordinal>0&&validDate(batch.createdAt)&&isStr(batch.raw,1000000)&&Number.isInteger(batch.total)&&batch.total>0&&batch.total<=200&&Array.isArray(batch.groupIds)&&batch.groupIds.length===Math.ceil(batch.total/20)&&new Set(batch.groupIds).size===batch.groupIds.length,'导入批次无效');const entries=s.importEntries.filter(e=>e.batchId===batch.id);assert(entries.length===batch.total,'批次词数与词项不一致');for(const [i,id] of batch.groupIds.entries()){const group=s.sets.find(g=>g.id===id);assert(group&&group.importBatchId===batch.id&&group.groupIndex===i&&group.targets.length===Math.min(20,batch.total-i*20)&&group.entryIds?.length===group.targets.length,'批次分组关联无效');for(const [j,entryId] of group.entryIds!.entries()){const e=entries.find(e=>e.id===entryId);assert(e&&e.order===i*20+j&&e.senseId===group.targets[j].senseId&&e.word===group.targets[j].word,'分组词项顺序或义项无效');}}}
 for(const e of s.importEntries)assert(s.importBatches.some(b=>b.id===e.batchId)&&Number.isInteger(e.order)&&e.order>=0&&isStr(e.word,100)&&isStr(e.zh)&&typeof e.emphasized==='boolean'&&s.custom.some(l=>l.senses.some(x=>x.id===e.senseId)),'导入词项无效');
 for(const a of s.articles){if(a.importBatchId){const group=s.sets.find(g=>g.id===a.setId);assert(group?.importBatchId===a.importBatchId&&group.articleId===a.id,'文章与分组关联无效');validateBody(a,group.targets);assert(a.targets.length===group.targets.length&&a.targets.every((t,i)=>t.word===group.targets[i].word&&t.senseId===group.targets[i].senseId),'文章目标词与所属分组不一致');}if(a.phases){const stages=['idle','waiting','running','ready','failed','cancelled','interrupted'];assert(Object.values(a.phases).every(v=>stages.includes(v))&&a.phases.body==='ready','文章阶段无效');validateBody(a);if(a.phases.translations==='ready')assert(a.paragraphs.every(p=>p.zh.trim()),'译文尚未完整，不能标记就绪');if(a.phases.questions==='ready')assert(!!a.readingQuestionSetId,'题组尚未关联，不能标记就绪');}if(a.readingQuestionSetId)assert(s.readingQuestionSets.some(q=>q.id===a.readingQuestionSetId&&q.articleId===a.id),'文章阅读题关联无效');}
 for(const set of s.readingQuestionSets){const article=s.articles.find(a=>a.id===set.articleId);assert(article||s.removedArticleIds?.includes(set.articleId),'阅读题对应文章不存在');validateReadingSet(set,article);}
 for(const round of s.readingRounds){const set=s.readingQuestionSets.find(q=>q.id===round.questionSetId);assert(set&&set.articleId===round.articleId&&['draft','submitted'].includes(round.status)&&Array.isArray(round.choices)&&round.choices.length===5&&round.choices.every(c=>Number.isInteger(c)&&c>=-1&&c<=3)&&validDate(round.updatedAt),'阅读答题轮次无效');if(round.status==='submitted')assert(round.choices.every(c=>c>=0)&&round.score===round.choices.filter((c,i)=>c===set.questions[i].answer).length,'阅读成绩无效');else assert(round.score===0,'未提交轮次不能包含旧成绩');}
 for(const task of s.generationTasks){assert(['group','questions'].includes(task.kind)&&['waiting','running','body-ready','completed','failed','cancelled','interrupted'].includes(task.status)&&['body','questions'].includes(task.stage)&&isStr(task.articleId)&&isStr(task.provider,100)&&isStr(task.model,300)&&['CET-4','CET-6','IELTS'].includes(task.mode)&&isStr(task.requestId,200)&&isStr(task.message,2000)&&validDate(task.createdAt)&&validDate(task.updatedAt)&&Number.isInteger(task.attempts.body)&&task.attempts.body>=0&&Number.isInteger(task.attempts.questions)&&task.attempts.questions>=0&&Array.isArray(task.targets)&&task.targets.length<=20,'生成任务无效');if(task.groupId)assert(s.sets.some(g=>g.id===task.groupId&&(!task.batchId||g.importBatchId===task.batchId)),'生成任务分组不存在');if(task.stage==='questions')assert(s.articles.some(a=>a.id===task.articleId),'补题任务缺少已保存正文');}
}
