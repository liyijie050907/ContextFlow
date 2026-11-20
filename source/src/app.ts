import {PosJobs} from './pos-jobs';
import {GenerationQueue} from './generation-queue';
import {connectFileStudy} from './file-study';
import {quizMarkup,answerReading,submitReading,resetReading} from './reading-quiz';
import {normalizeTerm} from './vocabulary-term';
import {motionMode,reducedMotion,setMotionMode} from './motion-mode';
import {notebookStatus,statusNames,matchesSearch,type NotebookStatus,type CardCheck} from './notebook-status';
import {setupSurfaceMotion} from './surface-motion';
import {requestParts} from './import-pos';
import {meaningfulPos,inlinePartOfSpeech} from './parts-of-speech';
import type {GenerationWord} from './generation';
import {gsap} from 'gsap';
import {setupSelectionPopover} from './selection-popover';
import {cachedTranslation} from './translation-cache';
import {animateToNotebook, sampleArt, wordArt, setupStickerDesk, stickerThumb, type WordCard} from './sticker-desk';
import {parseArticles} from './article-import';
import {prepareReading,resetReadingPreparation} from './reading-preparation';
import {contextForWordNode,preparedSelection,clearReadingCache,cachedParagraph,activateReading} from './reading-cache';
import {clearLookupCache} from './lookup-cache';
import {clearTranslationCache,translationKey} from './translation-cache';
import {showLiveLookup,showServiceSettings,translateLive} from './live-service';
import {speakEnglish,stopSpeech} from './speech';
import {markdownInline,markdownHTML} from './markdown';
import type {Dataset,UserState,Lexeme,Sense,Article,Question,Target,VocabularyItem,Mode} from './types';
import {RuleSenseResolver,uid,now,normalized,reviewAfter,backupEnvelope,readBackup,previewMerge,mergeState,parseCSV,csvCell,validateBundle,canonical,initialState,contextKey} from './domain';
import {StorageRepository} from './storage';
import {parseGenerationWords,containsRequiredWord} from './generation';

const data:Dataset=JSON.parse(document.getElementById('embedded')!.textContent!);
const repo=new StorageRepository(data.manifest.version);
let resolver:RuleSenseResolver;
const app=document.getElementById('app')!,overlay=document.getElementById('overlay')!;
const paths:Record<string,string>={book:'M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4z M20 4h-4a3 3 0 0 0-3 3v14a4 4 0 0 1 4-2h3z',list:'M9 5h12 M9 12h12 M9 19h12 M3 5h1 M3 12h1 M3 19h1',bookmark:'M6 3h12v18l-6-4-6 4z',chart:'M4 3v18h17 M8 16v-4 M13 16V8 M18 16V5',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M4 12H2 M22 12h-2 M12 4V2 M12 22v-2 M6.3 6.3 4.9 4.9 M19.1 19.1l-1.4-1.4 M17.7 6.3l1.4-1.4 M4.9 19.1l1.4-1.4',arrow:'M5 12h14 M13 6l6 6-6 6',chevron:'m6 9 6 6 6-6',close:'m6 6 12 12 M18 6 6 18',check:'m5 12 4 4L19 6',plus:'M12 5v14 M5 12h14',search:'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',download:'M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5',upload:'M12 16V4 m-5 5 5-5 5 5 M4 16v5h16v-5',moon:'M20 15a9 9 0 0 1-11-11A9 9 0 1 0 20 15z',sun:'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10 M12 1v2 M12 21v2 M1 12h2 M21 12h2 M4 4l2 2 M18 18l2 2 M4 20l2-2 M18 6l2-2',edit:'m15 4 5 5 M4 20l4-1L21 6l-5-5L3 15v6z',trash:'M3 6h18 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7',info:'M12 11v6 M12 7h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',clock:'M12 6v6l4 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',folder:'M3 5h7l2 3h9v12H3z',filter:'M3 5h18 M6 12h12 M10 19h4',wifi:'M4 8a13 13 0 0 1 16 0 M7 12a8 8 0 0 1 10 0 M10 16a3 3 0 0 1 4 0 M12 20h.01'};
Object.assign(paths,{favorite:'M7 3.5h10a1 1 0 0 1 1 1v16l-6-4-6 4v-16a1 1 0 0 1 1-1z',
  copy:'M9 8h11v13H9z M16 8V3H4v13h5',stop:'M6 6h12v12H6z',
  more:'M5 12h.1 M12 12h.1 M19 12h.1',
  list:'M3 5l3-1 3 15-3 1z M11 4h4v16h-4z M17 4l3-1 3 16-3 1z',
  bookmark:'M5 3h13a2 2 0 0 1 2 2v15H6a2 2 0 0 1-2-2V5a2 2 0 0 1 1-2z M5 16h15 M12 3v7l2-1.5 2 1.5V3',
  settings:'M4 7h6 M15 7h5 M4 17h2 M11 17h9 M15 7a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0 M11 17a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0',
  sound:'M3 9h4l5-4v14l-5-4H3z M15 9q3 3 0 6 M18 6q6 6 0 12',back:'m14 5-7 7 7 7',forward:'m10 5 7 7-7 7',layers:'m3 8 9-5 9 5-9 5z M4 12l8 5 8-5 M4 16l8 5 8-5'});
const icon=(name:string)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(paths[name]||paths.info).split(' M').map((p,i)=>`<path d="${i?'M':''}${p}"/>`).join('')}</svg>`;
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const button=(action:string,label:string,ic='',cls='btn',extra='')=>`<button type="button" class="${cls}" data-action="${action}" ${extra}>${ic?icon(ic):''}${label}</button>`;
const s=()=>repo.state;
const liveUI={modal,esc,announce};
const articles=()=>s().articles;
const questions=()=>s().questions;
let customRef:Lexeme[]|undefined;
let customByName=new Map<string,Lexeme>();
let customBySense=new Map<string,{lexeme:Lexeme;sense:Sense}>();
function latestCustom(){
 if(customRef!==s().custom){
   customRef=s().custom;
   customByName=new Map(customRef.filter(l=>!l.id.startsWith('clip-')).map(l=>[normalized(l.lemma),l]));
   customBySense=new Map(customRef.flatMap(lexeme=>lexeme.senses.map(sense=>[sense.id,{lexeme,sense}] as const)));
 }
 return customByName;
}
const lexemes=()=>{const latest=latestCustom();return [...data.dictionary.filter(l=>!latest.has(normalized(l.lemma))),...latest.values(),...s().custom.filter(l=>l.id.startsWith('clip-'))];};
const getLex=(id:string)=>lexemes().find(l=>l.id===id);
const dictionaryBySense=new Map(data.dictionary.flatMap(lexeme=>lexeme.senses.map(sense=>[sense.id,{lexeme,sense}] as const)));
const senseById=(id:string)=>{latestCustom();return customBySense.get(id)||dictionaryBySense.get(id);};
const due=()=>s().reviews.filter(r=>!r.mastered&&Date.parse(r.nextAt)<=Date.now());
const saved=(id:string)=>s().vocabulary.some(x=>x.senseId===id);
const personal=(id:string)=>s().overrides.find(o=>o.senseId===id);
const baseOwners=new Map(data.dictionary.flatMap(l=>l.senses.map(x=>[x.id,normalized(l.lemma)] as const)));const meaning=(sense:Sense)=>{if(sense.source==='选段收藏')return personal(sense.id)?.zh||sense.zh;const key=baseOwners.get(sense.id)||senseById(sense.id)?.lexeme.lemma;const replacement=key?latestCustom().get(normalized(key))?.senses[0]:undefined;const chosen=replacement||sense;return personal(chosen.id)?.zh||chosen.zh;};
const date=(v:string)=>new Date(v).toLocaleDateString('zh-CN',{month:'short',day:'numeric'});
const routes=[['read','阅读练习','book'],['words','词汇库','list'],['notebook','我的生词本','bookmark'],['settings','设置','settings']];
let currentArticle='',exam:Mode='CET-4',topic='全部主题',length='全部长度',activeSet='',search='',wordFilter='all',sort='new',selected=new Set<string>(),focusReturn:HTMLElement|null=null;
let quiz:{questions:Question[];index:number;answers:Map<string,string>;submitted:boolean;selected:number;article?:string;isReview:boolean}|undefined;

function route(){const key=location.hash.slice(1)||'read';return key==='history'||routes.some(r=>r[0]===key)?key:'read';}
function announce(msg:string,undo?:()=>void){const box=document.getElementById('toast')!;box.innerHTML=`<span>${esc(msg)}</span>${undo?'<button id="undo-action">撤销</button>':''}`;box.classList.add('visible');const timer=setTimeout(()=>box.classList.remove('visible'),undo?10000:4500);box.querySelector('button')?.addEventListener('click',()=>{clearTimeout(timer);box.classList.remove('visible');undo?.();});}
async function change(fn:(state:UserState)=>void,success?:string){try{await repo.commit(fn);if(success)announce(success+(repo.mode==='临时模式'?'（仅本次会话，请导出）':''));return true;}catch(e){announce('保存失败，原有数据已保留。请导出备份并检查浏览器存储。');console.error('Storage write failed',e instanceof Error?e.name:'unknown');return false;}}
function applyTheme(){const theme=s().settings.theme==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):s().settings.theme;document.documentElement.dataset.theme=theme;document.documentElement.style.setProperty('--reading-size',s().settings.fontSize+'px');}
const canAnimate=()=>!reducedMotion();
let lastRoute='';
function notebookCards(scope:'visible'|'due'='visible'):WordCard[]{
 const rows=scope==='due'?s().vocabulary.filter(v=>statusOf(v.senseId)==='due'):notebookRows();
 return rows.map(v=>{
   const obj=senseById(v.senseId),sample=sampleArt(v.senseId)||wordArt(obj?.lexeme.lemma||v.form);
   return {id:v.senseId,word:obj?.lexeme.lemma||v.form,zh:obj?meaning(obj.sense):'原词义当前不可用',
     example:v.context||sample?.example||'',ipa:personal(v.senseId)?.ipa||obj?.lexeme.ipa.us||obj?.lexeme.ipa.uk||sample?.ipa||'',
     image:sample?.image,tone:sample?.tone||'lilac'};
 });
}
function cardsForSet(setId:string):WordCard[]{
 const set=s().sets.find(item=>item.id===setId);
 return (set?.targets||[]).map(target=>{
   const entry=senseById(target.senseId),art=wordArt(target.word);
   return {id:target.senseId,word:target.word,zh:entry?meaning(entry.sense):'原词义当前不可用',
     example:art?.example||'',ipa:personal(target.senseId)?.ipa||entry?.lexeme.ipa.us||entry?.lexeme.ipa.uk||art?.ipa||'',
     image:art?.image,tone:art?.tone||'lilac'};
 });
}
setupSurfaceMotion();
function saveCardCheck(id:string,mark:CardCheck['mark']){
 return change(d=>{d.cardChecks=(d.cardChecks||[]).filter(c=>c.id!==id);d.cardChecks.push({id,mark,updatedAt:now()});});
}
setupStickerDesk({escape:esc,format:markdownInline,icon,savedCards:notebookCards,listCards:cardsForSet,speak:speakEnglish,announce,
 lastMarks:()=>new Map((s().cardChecks||[]).map(c=>[c.id,c.mark])),saveMark:saveCardCheck,
 afterStudy:()=>{if(route()==='notebook')refreshNotebook();}
});
const clip=setupSelectionPopover({
 icon,notify:announce,speak:speakEnglish,stop:stopSpeech,translate:translateLive,
 connect:retry=>void showServiceSettings(liveUI,()=>{closeOverlay();retry();}),
 local:({text,start,paragraphs})=>{
   const own=resolver.lookup(text).senses.find(x=>(x.source==='user'||personal(x.id))&&!x.zh.startsWith('释义待补充'));
   if(own)return {text:meaning(own),exact:true};
   const precise=cachedTranslation(text);
   if(precise)return {text:precise,exact:true};
   const a=article(),parts=paragraphs.map(i=>a?.paragraphs[i]).filter(p=>!!p);
   const translations=parts.map(p=>p.zh&&!p.zh.startsWith('本段未提供译文')?p.zh:cachedParagraph(p.en));
   if(parts.length&&translations.every(Boolean)&&translationKey(parts.map(p=>p.en).join(' '))===translationKey(text))return {text:translations.join('\n\n'),exact:true};
   return preparedSelection(text,start,a?.id);
 },
 save:async(text,zh)=>{
   if(text.length>10000||zh.length>10000){announce('选段过长，请分段收藏');return false;}
   const a=article();
   const stored=s().vocabulary.find(v=>v.context===text&&v.articleId===a?.id&&senseById(v.senseId)?.sense.zh===zh);
   if(stored){announce('选段已在生词本中');return true;}
   const own=resolver.lookup(text).senses.find(se=>normalized(senseById(se.id)?.lexeme.lemma||'')===normalized(text)&&meaning(se)===zh);
   const label=text.length>100?text.slice(0,98)+'…':text;
   const id=own?.id||'clip-s-'+uid(),lexemeId=own?senseById(own.id)!.lexeme.id:'clip-'+uid();
   const ok=await change(d=>{
     if(d.vocabulary.some(v=>v.senseId===id))return;
     if(!own)d.custom.push({id:lexemeId,lemma:label,ipa:{},senses:[{id,pos:'选段',en:'',zh,source:'选段收藏',status:'选段译文'}]});
     d.vocabulary.push({id:'v-'+id,lexemeId,senseId:id,form:label,articleId:a?.id||'',context:text,createdAt:now()});
   },'已收藏到生词本');
   if(ok){resolver=new RuleSenseResolver(lexemes(),data.content.forms);animateToNotebook(document.querySelector('.clip-label'));}
   return ok;
 }
});
function render(){
  clip.close();
  applyTheme();
  const r=route();
  const activeNav=r==='history'?'settings':r;
  const previous=app.querySelector('.nav-marker')?.getBoundingClientRect();
  const nav=routes.map(([id,label,ic])=>`<a data-nav="${id}" data-tip="${label}" aria-label="${label}" href="#${id}" ${activeNav===id?'aria-current="page"':''}>${activeNav===id?'<i class="nav-marker" aria-hidden="true"></i>':''}${icon(ic)}</a>`).join('');
  const dark=document.documentElement.dataset.theme==='dark';
  app.innerHTML=`<header class="app-mast"><div class="mast-inner">
    <a class="app-brand" href="#read" aria-label="ContextFlow 阅读练习"><span class="brand-sticker" aria-hidden="true">c</span>ContextFlow</a>
    <nav class="app-nav" aria-label="主导航">${nav}</nav>
    <button class="round-btn theme-switch" data-action="theme" aria-label="${dark?'切换浅色':'切换深色'}">${icon(dark?'sun':'moon')}</button>
  </div></header>
  <div class="app-space"><main id="main" data-page="${r}" tabindex="-1">${r==='read'?renderReading():r==='words'?renderWords():r==='notebook'?renderNotebook():r==='history'?renderHistory():renderSettings()}</main>
    <footer class="app-footer"><span title="${esc(repo.detail)}"><i class="status-dot"></i> ${repo.mode==='IndexedDB'?'已保存在本机':repo.mode}</span><button data-action="backup">导出完整备份 ${icon('download')}</button></footer></div>`;
  if(lastRoute&&lastRoute!==r&&canAnimate()){
    const main=document.getElementById('main');
    gsap.fromTo(main,{opacity:.38,y:14,filter:'blur(3px)'},{opacity:1,y:0,filter:'blur(0px)',duration:.36,ease:'power2.out',clearProps:'opacity,transform,filter'});
    const marker=app.querySelector<HTMLElement>('.nav-marker');
    if(marker&&previous){const dx=previous.left-marker.getBoundingClientRect().left;gsap.fromTo(marker,{x:dx},{x:0,duration:.25,ease:'power3.out',clearProps:'transform'});}
  }
  lastRoute=r;
  if(r==='read'){bindWordForm(app.querySelector('#word-import-form'));updateWordPreview();const current=article();if(current)queueMicrotask(()=>{void activateReading(current,(w,c)=>resolver.lookup(w,c).senses.some(x=>x.source==='user'));if(route()==='read'&&article()?.id===current.id)void prepareReading(current,(word,context)=>resolver.lookup(word,context).senses.some(x=>(x.source==='user'||personal(x.id))&&!x.zh.startsWith('释义待补充')),liveUI);});}
}
function heading(title:string,description:string,actions=''){return `<div class="page-heading"><div><h1 class="elastic-title" aria-label="${esc(title)}"><svg class="title-net" aria-hidden="true"><path/></svg>${Array.from(title,c=>`<span aria-hidden="true">${esc(c)}</span>`).join('')}</h1>${description?`<p>${description}</p>`:''}</div>${actions?`<div class="heading-actions">${actions}</div>`:''}</div>`;}
function select(id:string,label:string,values:string[],value:string){return `<label class="select-field"><span>${label}</span><select id="${id}" aria-label="${label}">${values.map(v=>`<option ${v===value?'selected':''}>${esc(v)}</option>`).join('')}</select></label>`;}
function filteredArticles(){return articles().filter(a=>!activeSet||a.setId===activeSet);}
function article(){const matches=filteredArticles();return matches.find(a=>a.id===currentArticle)||matches[0];}
function renderReading(){
 const a=article();if(a)currentArticle=a.id;
 const matches=filteredArticles();
 const set=s().sets.find(t=>t.id===activeSet)||(s().sets.length===1?s().sets[0]:undefined);
 const actions=(articles().length?button('library','我的文章','folder','btn subtle'):'')+
   (a?button('import-article','导入文章','upload','btn primary'):'');
 const intro=heading('阅读练习','',actions);
 const filters=s().sets.length?`<section class="reading-controls"><label class="select-field">词汇表<select id="active-set"><option value="">全部词汇表</option>${s().sets.map(t=>`<option value="${esc(t.id)}" ${activeSet===t.id?'selected':''}>${esc(t.name)}</option>`).join('')}</select></label><a class="text-btn" href="#words">管理词汇表 ${icon('forward')}</a></section>`:'';
 if(!a&&!s().sets.length)return intro+`<section class="start-sheet"><div class="sheet-input"><h2>新建词汇表</h2>${wordImportForm(true)}</div><aside class="format-sample"><h3 id="sample-heading">词表格式示例</h3><div id="word-preview"></div></aside></section>`;
 if(!a)return intro+filters+(set?studyPanel(set.id):'')+`<section class="import-sheet"><span class="fold-icon">${icon('book')}</span><div><h2>${set?esc(set.name):'导入阅读文章'}</h2>${set?`<p>${set.targets.length} 个目标词</p>`:''}<div class="button-row">${button('import-article','导入文章','upload','btn primary')}${set?.targets.length?button('generate-set','生成阅读和题目','book','btn primary',`data-set="${esc(set.id)}"`):''}${set?.targets.length?button('export-article-request','导出生成请求','download','btn subtle',`data-set="${esc(set.id)}"`):''}</div></div></section>`;
 const read=s().readArticles.includes(a.id),collected=a.targets.filter(t=>saved(t.senseId)).length;
 const more=`<details class="reading-more"><summary aria-label="更多阅读操作" data-tip="更多阅读操作">${icon('more')}</summary><div class="reading-menu">${button('stop-speech','停止朗读','stop','menu-btn')}${button('font-down','缩小字号','','menu-btn')}${button('font-up','放大字号','','menu-btn')}${button('highlight',s().settings.highlight?'关闭目标词高亮':'开启目标词高亮','layers','menu-btn')}${button('prepare-reading','阅读缓存与诊断','wifi','menu-btn')}${mergedArticleParts(a).length===5?button('split-merged','拆分为 5 篇','list','menu-btn'):''}</div></details>`;
 return intro+filters+(set?studyPanel(set.id):'')+`<div class="reading-layout"><article class="reading-paper"><div class="article-top"><div class="article-meta"><span>${esc(a.topic)}</span><span>${wordCount(a)} 词</span><span>${Math.max(1,Math.ceil(wordCount(a)/140))} 分钟</span>${read?'<span class="read-state">已读</span>':''}</div>${more}</div>
 ${generatedArticleNavigation(a)}<h2 class="article-title" lang="en">${esc(a.title)}</h2>${a.subtitle&&!['个人导入阅读','用户导入阅读'].includes(a.subtitle)?`<p class="article-subtitle">${esc(a.subtitle)}</p>`:''}
 <div class="article-body" lang="en">${a.paragraphs.map((p,i)=>`<section class="paragraph"><p data-paragraph="${i}">${renderText(p.en,a,i)}</p><div class="paragraph-foot"><div class="paragraph-actions">${button('speak-paragraph','朗读','sound','text-btn',`data-p="${i}" aria-label="朗读第 ${i+1} 段"`)}</div><details class="translation" lang="zh-CN"><summary>本段译文 ${icon('chevron')}</summary><p>${p.segments?p.segments.map(seg=>esc(seg.zh)+(seg.english?'<mark data-occurrence="'+esc(seg.occurrenceId||'')+'">（'+esc(seg.english)+'）</mark>':'')).join(''):esc(p.zh||cachedParagraph(p.en)||'尚无译文，可在更多操作中准备阅读缓存。')}</p></details></div></section>`).join('')}</div>
 <div class="article-pagination"><span>${matches.findIndex(x=>x.id===a.id)+1} / ${matches.length} 篇</span><div class="button-row">${button('mark-read',read?'已读完':'完成阅读','check','btn stamp-btn',read?'disabled':'')}${a.questionIds?.length?button('start-quiz','语境练习','book','btn subtle'):''}${matches.length>1?button('next-article','下一篇','arrow','btn subtle'):''}</div></div><section id="reading-quiz" class="study-quiz">${quizMarkup(s(),a,esc)}</section></article>
 <aside class="learning-rail"><div class="rail-title"><h2>本轮目标词</h2><span>${a.targets.length}</span></div><ul class="target-list">${a.targets.map((t,i)=>{const obj=senseById(t.senseId),art=wordArt(t.word),known=obj&&(obj.sense.source==='user'||personal(obj.sense.id));return `<li><button data-action="target-word" data-sense="${esc(t.senseId)}" data-word="${esc(t.word)}"><span class="target-index">${art?`<img src="${art.image}" alt="" draggable="false">`:String(i+1).padStart(2,'0')}</span><span><strong lang="en">${esc(t.word)}</strong>${known?`<small>${markdownInline(meaning(obj.sense))}</small>`:''}</span>${icon(saved(t.senseId)?'bookmark':'forward')}</button></li>`}).join('')}</ul>${a.targets.length?`<div class="rail-progress"><span>本篇已收藏</span><strong>${collected}<small> / ${a.targets.length}</small></strong><div class="line-meter"><i style="width:${100*collected/a.targets.length}%"></i></div></div>`:''}</aside></div>`;
}
function wordCount(a:Article){return (a.paragraphs.map(p=>p.en).join(' ').match(/\b[\w'-]+\b/g)||[]).length;}
function renderText(text:string,a:Article,p:number){
 const literals=a.targets.map(t=>t.word).filter(Boolean).sort((x,y)=>y.length-x.length).map(word=>word.replace(/[.*+?^\x24{}()|[\]\\]/g,'\\$&'));
 const exact=literals.length?"(?<![a-z0-9'-])(?:"+literals.join('|')+")(?![a-z0-9'+#-])|":'';
 const tokens=[...text.matchAll(new RegExp(exact+"[A-Za-z]+(?:['’-][A-Za-z]+)*",'gi'))];let out='',last=0;
 for(let i=0;i<tokens.length;i++){
  const token=tokens[i];let word=token[0],end=token.index!+word.length;
  // Longest dictionary phrase, only across whitespace; punctuation remains a boundary.
  for(let n=Math.min(5,tokens.length-i);n>=2;n--){const group=tokens.slice(i,i+n),phrase=text.slice(token.index,group[n-1].index!+group[n-1][0].length);if(!/^[a-zA-Z'’ -]+$/.test(phrase))continue;const hasTarget=group.some(g=>a.targets.some(t=>normalized(t.word)===normalized(g[0])));const match=resolver.index.has(normalized(phrase))&&(s().custom.some(l=>normalized(l.lemma)===normalized(phrase))||!hasTarget||a.targets.some(t=>normalized(t.word)===normalized(phrase)));if(match){word=phrase;end=group[n-1].index!+group[n-1][0].length;i+=n-1;break;}}
  out+=esc(text.slice(last,token.index));const t=a.targets.find(t=>normalized(t.word)===normalized(word));
  const trailing=text.slice(end).match(/^[.,!?;:%…)\]”’]+/)?.[0]||'';
  out+=`<span role="button" tabindex="0" class="word${t&&s().settings.highlight?' target-word':''}${t?.emphasized?' emphasized-word':''}" data-action="lookup" data-word="${esc(word)}" data-sense="${esc(t?.senseId||'')}" data-p="${p}" data-occurrence="${esc(a.occurrences?.find(o=>o.paragraph===p&&o.start===token.index&&o.end===end)?.id||'')}" lang="en" aria-label="查询 ${esc(word)}">${esc(word+trailing)}</span>`;last=end+trailing.length;
 }return out+esc(text.slice(last));
}
let indexedState:UserState|undefined;
let reviewIndex=new Map<string,UserState['reviews'][number]>();
let checkIndex=new Map<string,CardCheck>();
function statusOf(id:string){
 if(indexedState!==s()){
   indexedState=s();
   reviewIndex=new Map(s().reviews.map(r=>[r.id,r]));
   checkIndex=new Map((s().cardChecks||[]).map(c=>[c.id,c]));
 }
 return notebookStatus(reviewIndex.get(id),checkIndex.get(id));
}
function notebookRows(){
 const rows=s().vocabulary.filter(v=>{
   if(wordFilter!=='all'&&statusOf(v.senseId)!==wordFilter)return false;
   if(!search.trim())return true;
   const obj=senseById(v.senseId);
   return matchesSearch(search,[obj?.lexeme.lemma||'',v.form,obj?meaning(obj.sense):'',v.context]);
 });
 return rows.sort(sort==='az'?(a,b)=>(senseById(a.senseId)?.lexeme.lemma||a.form).localeCompare(senseById(b.senseId)?.lexeme.lemma||b.form):(a,b)=>b.createdAt.localeCompare(a.createdAt));
}
function rowStatus(id:string,word:string){
 const status=statusOf(id);
 return `<select class="row-status" data-notebook-status="${esc(id)}" aria-label="${esc(word)} 的学习状态">${Object.entries(statusNames).map(([key,label])=>`<option value="${key}" ${key===status?'selected':''}>${label}</option>`).join('')}</select>`;
}
function searchBox(placeholder:string){return `<label class="search-box">${icon('search')}<input id="search" type="search" value="${esc(search)}" placeholder="${placeholder}" aria-label="${placeholder}"></label>`;}
function favoriteButton(id:string,word:string,context='',compact=false){
 const on=saved(id),label=(on?'取消收藏':'收藏')+(compact?' '+word:'此义项');
 return `<button type="button" data-action="save-word" data-sense="${esc(id)}" data-word="${esc(word)}" data-context="${esc(context)}" aria-pressed="${on}" aria-label="${esc(label)}" class="${compact?'lex-favorite':'btn primary sense-favorite'}" ${compact?`data-tip="${esc(label)}"`:''}>${icon('favorite')}${compact?'':`<span>${label}</span>`}</button>`;
}
const knownPos=(sense:Sense)=>meaningfulPos(sense.pos)||inlinePartOfSpeech(sense.zh);
function previousImportSense(w:GenerationWord){
 if(w.zh)return;
 return resolver.lookup(w.word).senses.find(x=>(x.source==='user'||personal(x.id))&&!x.zh.startsWith('释义待补充'));
}
function bindWordForm(form:HTMLFormElement|null){
 if(!form)return;
 form.querySelector('textarea')?.addEventListener('input',updateWordPreview);
 const toggle=form.querySelector<HTMLButtonElement>('[data-fill-pos]')!;
 toggle.onclick=()=>{
  const value=toggle.getAttribute('aria-checked')!=='true';
  toggle.setAttribute('aria-checked',String(value));
  void change(d=>{d.settings.autoPos=value;});
 };
}
function renderWordRows(set:UserState['sets'][number]){
 const seen=new Set<string>();
 const rows=set.targets.flatMap(target=>{
   if(seen.has(target.senseId))return [];
   seen.add(target.senseId);
   const entry=senseById(target.senseId);
   if(!entry||!matchesSearch(search,[target.word,entry.lexeme.lemma,meaning(entry.sense)]))return [];
   return [entry];
 });
 return rows.map(({lexeme:l,sense:se})=>{const art=wordArt(l.lemma);return `<div class="lex-unit"><details class="lex-card"><summary>${art?`<img src="${art.image}" alt="">`:''}<strong lang="en">${esc(l.lemma)}</strong>${icon('chevron')}</summary><div class="lex-definition">${markdownHTML(meaning(se))}${button('lookup','查看词义卡','forward','text-btn',`data-word="${esc(l.lemma)}" data-sense="${esc(se.id)}"`)}</div></details>${favoriteButton(se.id,l.lemma,'',true)}</div>`;}).join('')||'<p>没有匹配的词汇</p>';
}
function renderWords(){
 if(!activeSet&&s().sets.length===1)activeSet=s().sets[0].id;
 const active=s().sets.find(t=>t.id===activeSet);
 return heading('词汇库','',button('import-words','新建词汇表','plus','btn primary'))+`<div class="collection-layout"><aside class="collections"><h2>我的词汇表</h2>${s().sets.map(t=>`<button class="collection ${activeSet===t.id?'active':''}" data-action="set" data-id="${esc(t.id)}">${icon('folder')}<span>${esc(t.name)}</span><em>${t.targets.length}</em></button>`).join('')||'<p class="muted">还没有词汇表</p>'}</aside><section class="word-workspace">${active?`<div class="section-heading"><h2>${esc(active.name)} · ${active.targets.length} 词</h2>${button('delete-set','删除词汇表','trash','text-btn')}</div><div class="button-row"><button type="button" class="btn primary" data-sticker="list-deck" data-set="${esc(active.id)}" data-name="${esc(active.name)}" ${active.targets.length?'':'disabled'}>${icon('layers')}翻看词卡</button>${button('append-words','添加单词','plus','btn subtle')}${button('generate-set','生成阅读和题目','book','btn primary')}${button('export-article-request','导出文章生成请求','download','btn subtle')}${button('import-article','导入生成好的文章','upload','btn subtle')}${button('edit-set','编辑词义','edit','text-btn')}</div>${studyPanel(active.id)}<div class="table-tools">${searchBox('搜索此词汇表')}</div><div class="lex-grid">${renderWordRows(active)}</div>`:empty(s().sets.length?'选择词汇表':'还没有词汇表',s().sets.length?'从列表选择要学习的词汇表。':'新建词汇表后，即可导入自己的单词与词义。')}</section></div>`;
}
function empty(title:string,desc:string,actions=''){return `<div class="empty">${icon('book')}<h2>${title}</h2><p>${desc}</p>${actions}</div>`;}
function notebookResults(items:VocabularyItem[]){
 if(!items.length)return empty(search.trim()?'没有匹配的收藏':'这个状态下还没有单词',search.trim()?'可以换个单词、词形或释义。':'可以切换到全部状态继续学习。',button('clear-notebook','清除筛选','back','btn subtle'));
 return `<details class="notebook-manage" ${selected.size?'open':''}><summary>${icon('layers')}批量管理</summary><div class="batch-tools"><label><input type="checkbox" id="select-all"  ${items.every(x=>selected.has(x.id))?'checked':''}>选择当前 ${items.length} 项</label><span>已选 ${selected.size} 项</span>${button('batch-set','加入目标集合','plus','text-btn')}${button('batch-edit','批量编辑释义','edit','text-btn')}${button('batch-delete','删除所选','trash','text-btn danger')}</div></details><div class="notebook-list">${items.map(v=>{const obj=senseById(v.senseId),se=obj?.sense,art=sampleArt(v.senseId)||wordArt(obj?.lexeme.lemma||v.form);const card:WordCard={id:v.senseId,word:obj?.lexeme.lemma||v.form,zh:se?meaning(se):'',example:v.context,ipa:'',tone:art?.tone||'lilac',image:art?.image};return `<article class="notebook-item">${stickerThumb(card)}<label class="row-check"><input type="checkbox" data-select="${v.id}" aria-label="选择 ${esc(v.form)}" ${selected.has(v.id)?'checked':''}></label><div class="notebook-content"><div class="notebook-word"><button class="word-link" data-action="lookup" data-word="${esc(obj?.lexeme.lemma||v.form)}" data-sense="${esc(v.senseId)}" lang="en">${esc(obj?.lexeme.lemma||v.form)}</button>${rowStatus(v.senseId,obj?.lexeme.lemma||v.form)}<span class="muted">${date(v.createdAt)}</span></div><p>${se?`<span class="pos">${esc(se.pos)}</span> ${markdownInline(meaning(se))}`:'原词典义项当前不可用；收藏信息仍保留。'}</p>${v.context?`<blockquote lang="en">${esc(v.context)}</blockquote>`:'<p class="muted">手动收藏 · 暂无来源语境</p>'}<small class="muted">${esc(articles().find(a=>a.id===v.articleId)?.title||'词典 / 手动录入')}${v.form!==obj?.lexeme.lemma?' · 实际词形 '+esc(v.form):''}</small></div><div class="row-actions">${button('edit-word','','edit','icon-btn',`data-sense="${esc(v.senseId)}" aria-label="编辑 ${esc(v.form)}"`)}${button('delete-word','','trash','icon-btn',`data-id="${v.id}" aria-label="删除 ${esc(v.form)}"`)}</div></article>`}).join('')}</div>`;
}
function notebookCounts(){
 const counts={all:s().vocabulary.length,due:0,learning:0,mastered:0};
 for(const v of s().vocabulary)counts[statusOf(v.senseId)]++;
 return counts;
}
function notebookStats(counts:ReturnType<typeof notebookCounts>){
 return (['all','due','learning','mastered'] as const).map(key=>`<button data-action="filter-status" data-filter="${key}" aria-pressed="${key===wordFilter}"><strong>${counts[key]}</strong>${key==='all'?'已收藏':statusNames[key]}</button>`).join('');
}
function refreshNotebook(){
 const results=app.querySelector<HTMLElement>('.notebook-results');if(!results)return;
 const rows=notebookRows(),counts=notebookCounts();
 results.innerHTML=notebookResults(rows);
 app.querySelector('.notebook-summary')!.innerHTML=notebookStats(counts);
 const deck=app.querySelector<HTMLButtonElement>('[data-sticker="saved-deck"]');if(deck)deck.disabled=!rows.length;
 const dueButton=app.querySelector<HTMLButtonElement>('[data-sticker="due-deck"]');if(dueButton){dueButton.hidden=!counts.due;dueButton.disabled=!counts.due;}
 const filter=app.querySelector<HTMLSelectElement>('#word-filter');if(filter)filter.value=wordFilter;
}
function renderNotebook(){
 if(!s().vocabulary.length)return heading('我的生词本','')+empty('还没有收藏','阅读时，打开词义卡或选中一段英文即可收藏。',`<a class="btn primary" href="#read">去阅读 ${icon('arrow')}</a>`);
 const items=notebookRows(),counts=notebookCounts();
 return heading('我的生词本','',`<button type="button" class="btn primary" data-sticker="saved-deck" ${items.length?'':'disabled'}>${icon('layers')}翻看词卡</button><button type="button" class="btn subtle" data-sticker="due-deck" ${counts.due?'':'hidden disabled'}>${icon('clock')}复习待练词</button>`+button('export-words','导出词汇','download','btn subtle'))+
 `<div class="notebook-summary">${notebookStats(counts)}</div><div class="table-tools">${searchBox('搜索单词、释义或实际词形')}<label><span class="sr-only">掌握状态</span><select id="word-filter"><option value="all">全部状态</option>${Object.entries(statusNames).map(([key,label])=>`<option value="${key}" ${key===wordFilter?'selected':''}>${label}</option>`).join('')}</select></label><label><span class="sr-only">排序</span><select id="sort"><option value="new" ${sort==='new'?'selected':''}>最近收藏</option><option value="az" ${sort==='az'?'selected':''}>字母顺序</option></select></label></div><div class="notebook-results">${notebookResults(items)}</div>`;
}
function renderHistory(){const attempts=s().attempts,first=[...new Map([...attempts].reverse().map(a=>[contextKey(a.question),a])).values()],correct=first.filter(a=>a.correct).length,weak=[...s().reviews].filter(r=>r.errors>0&&!r.mastered).sort((a,b)=>b.errors-a.errors);
 return heading('练习记录','',(due().length?button('review-due','开始到期复习','arrow','btn primary'):''))+
 `<div class="stats-row"><div><span>首次提交题数</span><strong>${first.length}<small>题</small></strong></div><div><span>首次正确率</span><strong>${first.length?Math.round(100*correct/first.length)+'%':'—'}</strong></div><div><span>有效复习次数</span><strong>${attempts.filter(a=>a.effective).length}<small>次</small></strong></div><div><span>查询 / 已读文章</span><strong>${s().lookups}<small> / ${s().readArticles.length}</small></strong></div></div><div class="history-layout"><section><h2 class="section-title">最近的语境练习</h2>${attempts.length?`<div class="attempt-list">${[...attempts].reverse().slice(0,100).map(a=>`<button class="attempt-row" data-action="attempt" data-id="${a.id}"><span class="result-icon ${a.correct?'correct':'wrong'}">${icon(a.correct?'check':'close')}</span><span><strong lang="en">${esc(a.question.word)}</strong><small>${esc(a.question.context)}</small></span><span class="attempt-date">${date(a.submittedAt)}<small>${a.effective?'有效复习':'额外练习'}</small></span>${icon('chevron')}</button>`).join('')}</div>`:empty('还没有测试记录','完成一次跨语境测试后，这里会留下你的首次答案和逐项解析。',`<a class="btn subtle" href="#read">开始阅读</a>`)}</section><aside><h2 class="section-title">薄弱义项</h2>${weak.length?weak.map(r=>{const obj=senseById(r.id);return `<div class="weak-item"><strong lang="en">${esc(obj?.lexeme.lemma||r.id)}</strong><p>${esc(obj?.sense.zh||'原义项不可用')}</p><small>答错 ${r.errors} 次 · ${date(r.nextAt)} 复习</small></div>`}).join(''):'<div class="quiet-empty">暂无错误记录。新的测试结果会显示在这里。</div>'}<div class="review-rules"><h3>掌握条件</h3><p>默认间隔 1、3、7、14、30 天。相同义项在 24 小时内只计一次有效复习。</p><p>已掌握需至少跨 14 天、5 次答对的有效复习及 3 个语境。该规则不等同考试能力认证。</p></div></aside></div>`;
}
function renderSettings(){return heading('设置','')+`<div class="settings-layout"><nav class="settings-index" aria-label="设置分区"><a href="#appearance" data-scroll="appearance">阅读与外观</a><a href="#storage" data-scroll="storage">数据与备份</a><a href="#generation" data-scroll="generation">阅读缓存与查询</a></nav><div class="settings-content"><section id="appearance" class="settings-section"><h2>阅读与外观</h2><div class="setting-row"><div><h3>颜色主题</h3></div><select id="theme" aria-label="颜色主题">${[['light','暖白浅色'],['dark','深灰深色'],['system','跟随系统']].map(([v,l])=>`<option value="${v}" ${s().settings.theme===v?'selected':''}>${l}</option>`).join('')}</select></div><div class="setting-row"><label for="motion-mode"><strong>界面动效</strong></label><select id="motion-mode">${[['system','跟随系统'],['full','完整动效'],['reduce','减少动效']].map(([v,l])=>`<option value="${v}" ${motionMode()===v?'selected':''}>${l}</option>`).join('')}</select></div><div class="setting-row"><div><h3>正文字号</h3></div><label><input id="font-size" type="range" min="16" max="26" value="${s().settings.fontSize}"> <output>${s().settings.fontSize}px</output></label></div></section><section id="storage" class="settings-section"><h2>数据与备份</h2><div class="button-row history-entry"><a href="#history" class="btn subtle">${icon('chart')}查看练习记录</a></div><div class="storage-banner"><span class="status-dot"></span><div><strong>${repo.mode==='IndexedDB'?'本机存储可用':repo.mode}</strong><p>${esc(repo.detail)}</p></div></div><details class="inline-help"><summary>备份包含什么？</summary><p>文件移动、隐私模式和浏览器清理可能影响本地数据。导出完整备份后，可在另一份 HTML 中恢复。凭据不会进入学习备份。</p></details><div class="button-row">${button('backup','导出完整备份','download','btn primary')}${button('restore','导入并预览备份','upload')}${button('previous','恢复上一保存快照','clock','btn subtle')}</div><div class="setting-row"><div><h3>清空学习数据</h3><p>清除收藏、个人修改和学习记录，内置内容仍在。</p></div>${button('reset','清空数据','trash','btn danger')}</div></section><section id="generation" class="settings-section"><h2>阅读缓存与查询</h2><p class="setting-explanation">接入的 AI 用于准备词义、段落译文及精准查询缓存。也可使用所选模型生成阅读、题目和词性。</p><div class="provider-row"><span class="provider-symbol">${icon('book')}</span><div><strong>ChatGPT / 自定义模型 API</strong></div>${button('live-settings','连接或更换服务','arrow','btn subtle')}</div></section></div></div>`;}
function closeOverlay(){overlay.querySelector('dialog')?.close();overlay.innerHTML='';const word=focusReturn?.dataset.word;const target=focusReturn?.isConnected?focusReturn:word?app.querySelector<HTMLElement>('[data-word="'+CSS.escape(word)+'"]'):document.getElementById('main');target?.focus({preventScroll:true});focusReturn=null;}
function modal(title:string,body:string,wide=false){const opener=document.activeElement as HTMLElement;closeOverlay();focusReturn=opener;overlay.innerHTML=`<dialog class="modal${wide?' wide':''}" aria-labelledby="dialog-title"><div class="modal-head"><h2 id="dialog-title">${title}</h2>${button('close','','close','icon-btn','aria-label="关闭窗口"')}</div><div class="modal-body">${body}</div></dialog>`;const dialog=overlay.querySelector('dialog')!;dialog.showModal();dialog.addEventListener('cancel',e=>{e.preventDefault();closeOverlay()});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if((e as MouseEvent).clientX<r.left||(e as MouseEvent).clientX>r.right||(e as MouseEvent).clientY<r.top||(e as MouseEvent).clientY>r.bottom)closeOverlay();}});}
async function showLookup(word:string,context='',annotated='',target=false,anchor?:HTMLElement){
 context=contextForWordNode(anchor,context);
 const listed=annotated&&anchor?.closest('.lex-card')?senseById(annotated):undefined;
 const own=listed?.sense||resolver.lookup(word,context).senses.find(x=>(x.source==='user'||x.source==='体验贴纸'||x.id===annotated&&x.source==='选段收藏'||personal(x.id))&&!x.zh.startsWith('释义待补充'));
 if(!own){const found=await showLiveLookup(word,context,liveUI,async lexeme=>{const se=lexeme.senses[0];if(!await change(d=>{d.custom.push(lexeme);d.vocabulary.push({id:'v-'+se.id,lexemeId:lexeme.id,form:word,senseId:se.id,articleId:article()?.id||'',context,createdAt:now()});},'查询结果已收藏'))throw Error('收藏未能保存');resolver=new RuleSenseResolver(lexemes(),data.content.forms);});if(found)await change(d=>{d.lookups++;});return;}

 closeOverlay();focusReturn=anchor||document.activeElement as HTMLElement;
 const result=resolver.lookup(word,context,annotated);
 if(listed&&!result.senses.some(se=>se.id===listed.sense.id)){result.senses.unshift(listed.sense);result.candidates.unshift(listed.lexeme);}
 let active=result.senses.find(se=>se.id===annotated)?.id||result.senses[0]?.id;
 await change(d=>{d.lookups++});
 function draw(){const se=result.senses.find(x=>x.id===active),lex=result.candidates.find(l=>l.senses.some(x=>x.id===active)),full=target||result.ambiguous;
 overlay.innerHTML=`<section class="word-card ${full?'full':''}" role="dialog" aria-modal="false" aria-label="${esc(word)} 的词义"><div class="word-card-head"><div><span class="form-label">${lex&&normalized(word)!==normalized(lex.lemma)?esc(word)+' → 词元':''}</span><h2 lang="en">${esc(lex?.lemma||word)}</h2></div>${button('close','','close','icon-btn','aria-label="关闭词义卡"')}</div>${se?`${knownPos(se)?`<p class="lookup-pos">词性 <strong>${esc(knownPos(se))}</strong></p>`:s().custom.some(l=>l.senses.some(x=>x.id===se.id))?button('fill-sense-pos','AI 补全词性','','text-btn fill-sense-pos',`data-sense="${esc(se.id)}"`):''}<div class="sense-zh user-meaning">${markdownHTML(meaning(se))}</div>${full&&(personal(se.id)?.en||se.en)?`<p class="sense-en" lang="en">${esc(personal(se.id)?.en||se.en)}</p>`:''}${result.senses.length>1?`<label class="sense-picker">切换义项<select id="sense-picker">${result.senses.map(x=>`<option value="${esc(x.id)}" ${x.id===active?'selected':''}>${esc((knownPos(x)?knownPos(x)+' · ':'')+meaning(x).slice(0,65))}</option>`).join('')}</select></label>`:''}${context?`<blockquote lang="en">${esc(context)}</blockquote>`:''}<div class="button-row">${button('speak-word','听发音','sound','btn subtle',`data-text="${esc(word)}"`)}${favoriteButton(se.id,word,context)}${button('edit-word','编辑','edit','btn subtle',`data-sense="${esc(se.id)}"`)}</div>`:`${button('speak-word','听发音','sound','btn subtle',`data-text="${esc(word)}"`)}<p class="sense-zh">暂未收录这个词</p><p class="resolve-reason">不自动补写释义。你可以将它添加为自定义词条。</p>${button('add-word','添加自定义词条','plus','btn primary',`data-word="${esc(word)}"`)}`}</section>`;
 const card=overlay.querySelector<HTMLElement>('.word-card')!;if(innerWidth>760){const r=anchor?.getBoundingClientRect();card.style.top=Math.min(Math.max(80,r?r.bottom+12:170),Math.max(80,innerHeight-card.offsetHeight-16))+'px';card.style.left=Math.min(Math.max(16,r?r.left:innerWidth/2-200),innerWidth-card.offsetWidth-16)+'px';}card.querySelector('button')?.focus({preventScroll:true});card.querySelector('#sense-picker')?.addEventListener('change',e=>{active=(e.target as HTMLSelectElement).value;draw();});}
 draw();
}
async function toggleSense(action:HTMLElement){
 const id=action.dataset.sense!,obj=senseById(id);
 if(!obj)return;
 const word=action.dataset.word||obj.lexeme.lemma,context=action.dataset.context||'',articleId=context?article()?.id||'':'';
 let added=false;
 const removedIds:string[]=[];
 const ok=await change(d=>{
   added=!d.vocabulary.some(v=>v.senseId===id);
   if(added)d.vocabulary.push({id:'v-'+id,lexemeId:obj.lexeme.id,form:word,senseId:id,articleId,context,createdAt:now()});
   else{removedIds.push(...d.vocabulary.filter(v=>v.senseId===id).map(v=>v.id));d.vocabulary=d.vocabulary.filter(v=>v.senseId!==id);}
 });
 if(!ok)return;
 for(const removedId of removedIds)selected.delete(removedId);
 if(route()!=='words')render();
 for(const b of document.querySelectorAll<HTMLElement>('[data-action="save-word"]')){
   if(b.dataset.sense!==id)continue;
   const on=saved(id),compact=b.classList.contains('lex-favorite');
   const label=(on?'取消收藏':'收藏')+(compact?' '+b.dataset.word:'此义项');
   b.setAttribute('aria-label',label);b.setAttribute('aria-pressed',String(on));
   if(compact)b.dataset.tip=label;else b.querySelector('span')!.textContent=label;
 }
 if(added)animateToNotebook(action.isConnected?action:null);
 announce(added?'已收藏到生词本':'已取消收藏');
}
async function fillSensePos(action:HTMLButtonElement){
 const obj=senseById(action.dataset.sense!);if(!obj||knownPos(obj.sense)||action.disabled)return;
 action.disabled=true;action.textContent='正在补全…';
 try{
   const tags=await requestParts([{word:obj.lexeme.lemma,zh:meaning(obj.sense)}],new AbortController().signal);
   const pos=tags.get(obj.lexeme.lemma);if(!pos){announce('当前义项无法确定词性');return;}
   if(await change(d=>{const se=d.custom.find(l=>l.id===obj.lexeme.id)?.senses.find(x=>x.id===obj.sense.id);if(se&&!knownPos(se))se.pos=pos;})){
     resolver=new RuleSenseResolver(lexemes(),data.content.forms);
     if(action.isConnected){const label=document.createElement('p');label.className='lookup-pos';label.textContent='词性　'+pos;action.replaceWith(label);}
   }
 }finally{action.disabled=false;action.textContent='AI 补全词性';}
}
function editSense(id:string){const obj=senseById(id);if(!obj)return;const old=personal(id);modal('编辑个人释义',`<p class="modal-intro">修改仅保存为个人覆盖层，不改变原词典。原义项：<strong lang="en">${esc(obj.lexeme.lemma)}</strong></p><form id="edit-form"><label>中文释义<textarea name="zh" required maxlength="3000">${esc(old?.zh||obj.sense.zh)}</textarea></label><label>英文释义<textarea name="en" maxlength="6000">${esc(old?.en||obj.sense.en)}</textarea></label><label>个人 IPA（注明地区）<input name="ipa" value="${esc(old?.ipa||'')}" maxlength="300" placeholder="缺少可靠来源时可留空"></label><p class="source-note">原始中文：${esc(obj.sense.zh)}</p><div class="modal-actions">${button('close','取消','','btn subtle')}<button class="btn primary" type="submit">保存个人修改</button></div></form>`);overlay.querySelector('form')!.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target as HTMLFormElement);if(await change(d=>{d.overrides=d.overrides.filter(x=>x.senseId!==id);d.overrides.push({id:'override-'+id,lexemeId:obj.lexeme.id,senseId:id,zh:String(f.get('zh')).trim(),en:String(f.get('en')).trim(),ipa:String(f.get('ipa')).trim(),updatedAt:now(),previous:old?.zh||obj.sense.zh});},'个人修改已保存')){closeOverlay();render();}});}
function addWord(prefill=''){modal('添加词汇',`<form id="add-form"><label>英文词元<input name="word" value="${esc(prefill)}" required maxlength="100" pattern="[A-Za-z][A-Za-z '\u2019-]*" placeholder="例如 adapt"></label><label>中文释义（未收录词需手动填写）<textarea name="zh" maxlength="3000" placeholder="保留自己的理解，不自动编造释义"></textarea></label><label>英文释义（可选）<textarea name="en" maxlength="6000"></textarea></label><div class="modal-actions">${button('close','取消','','btn subtle')}<button type="submit" class="btn primary">添加并收藏</button></div></form>`);overlay.querySelector('form')!.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target as HTMLFormElement),word=String(f.get('word')).trim(),zh=String(f.get('zh')).trim(),en=String(f.get('en')).trim();const result=resolver.lookup(word);if(result.senses.length){closeOverlay();await showLookup(word,'','',true);return;}if(!zh){announce('未收录词需要你填写中文释义');return;}const l:Lexeme={id:'custom-'+uid(),lemma:word,ipa:{},senses:[{id:'custom-s-'+uid(),pos:'未注明',en,zh,source:'user',status:'自定义词条'}]};if(await change(d=>{d.custom.push(l);d.vocabulary.push({id:'v-'+l.senses[0].id,lexemeId:l.id,form:word,senseId:l.senses[0].id,articleId:'',context:'',createdAt:now()});},'自定义词条已收藏')){resolver=new RuleSenseResolver(lexemes(),data.content.forms);closeOverlay();render();}});}
function editBatch(ids:string[]){const entries=[...new Set(ids)].map(senseById).filter((x):x is NonNullable<typeof x>=>!!x);if(!entries.length){announce('请先选择要编辑的学习义项');return;}if(entries.length>200){announce('批量编辑每次最多 200 项，请缩小选择范围');return;}modal('批量编辑个人释义',`<p class="modal-intro">将编辑 ${entries.length} 个义项。所有更改一次保存为个人覆盖层，原词典保留。</p><form id="batch-form">${entries.map(x=>`<label><strong lang="en">${esc(x.lexeme.lemma)}</strong> · ${esc(x.sense.pos)}<textarea name="${esc(x.sense.id)}" required maxlength="3000">${esc(meaning(x.sense))}</textarea></label>`).join('')}<div class="modal-actions">${button('close','取消','','btn subtle')}<button type="submit" class="btn primary">保存 ${entries.length} 个义项</button></div></form>`,true);overlay.querySelector('form')!.addEventListener('submit',async e=>{e.preventDefault();const form=new FormData(e.target as HTMLFormElement);if(await change(d=>{for(const x of entries){const old=personal(x.sense.id);d.overrides=d.overrides.filter(o=>o.senseId!==x.sense.id);d.overrides.push({id:'override-'+x.sense.id,lexemeId:x.lexeme.id,senseId:x.sense.id,zh:String(form.get(x.sense.id)).trim(),en:old?.en||x.sense.en,ipa:old?.ipa||'',updatedAt:now(),previous:old?.zh||x.sense.zh});}},'批量个人释义已保存')){closeOverlay();render();}});}
function download(name:string,content:string,type='application/json'){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
async function exportBackup(){download('ContextFlow-完整备份-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(await backupEnvelope(s()),null,2));announce('已生成完整备份，请保留下载文件');}
function pickFile(accept:string,callback:(text:string,name:string)=>Promise<void>|void){const input=document.createElement('input');input.type='file';input.accept=accept;input.onchange=async()=>{const file=input.files?.[0];if(!file)return;if(file.size>30*1024*1024){announce('文件超过 30MB，请拆分后导入');return;}try{await callback(await file.text(),file.name);}catch(e){announce(e instanceof Error?e.message:'文件无法读取，未写入数据');}};input.click();}
function restoreBackup(){pickFile('.json',async text=>{const incoming=await readBackup(JSON.parse(text));const p=previewMerge(s(),incoming);const conflicts:string[]=[];for(const k of ['overrides','custom','vocabulary','sets','articles','questions','attempts','reviews','cardChecks'] as const){for(const x of (incoming[k]||[]) as {id:string}[]){const old=((s()[k]||[]) as {id:string}[]).find(o=>o.id===x.id);if(old&&canonical(old)!==canonical(x))conflicts.push(`<details class="conflict"><summary>${esc(k+' · '+x.id)}</summary><div class="compare"><div><h4>当前保留</h4><pre>${esc(JSON.stringify(old,null,2))}</pre></div><div><h4>备份内容</h4><pre>${esc(JSON.stringify(x,null,2))}</pre></div></div></details>`);}}
 modal('备份导入预览',`<div class="import-counts"><span>新增 <strong>${p.added}</strong></span><span>重复 <strong>${p.duplicate}</strong></span><span>冲突 <strong>${p.conflicts}</strong></span><span>无效 <strong>0</strong></span></div><p>词典版本：${esc(incoming.dictionaryVersion)}。完整性校验通过。导入会在一次事务中完成。</p><p class="modal-intro">默认保留本机已有内容及个人释义。选用备份冲突内容时，将同时使用备份设置。</p><label class="check-label"><input id="prefer-incoming" type="checkbox">使用备份中的全部冲突内容和设置</label>${conflicts.join('')||'<p class="muted">没有需要选择的记录冲突。</p>'}<div class="modal-actions">${button('close','取消','','btn subtle')}${button('commit-restore','确认合并导入','','btn primary')}</div>`,true);overlay.querySelector('[data-action="commit-restore"]')!.addEventListener('click',async()=>{const prefer=overlay.querySelector<HTMLInputElement>('#prefer-incoming')!.checked;try{await repo.replace(mergeState(s(),incoming,prefer));resolver=new RuleSenseResolver(lexemes(),data.content.forms);closeOverlay();render();announce(`导入完成：新增 ${p.added} 条，冲突按选择处理`);}catch{announce('导入失败，事务已回滚，原有数据未被覆盖');}});
 });}
function newSet(targets:Target[]=[]){modal('新建目标集合',`<form id="set-form"><label>集合名称<input name="name" maxlength="100" required placeholder="例如：本周环境主题"></label><p>${targets.length?'将加入所选的 '+targets.length+' 个学习义项。':'创建后，可用批量导入或从生词本加入词汇。'}</p><div class="modal-actions">${button('close','取消','','btn subtle')}<button type="submit" class="btn primary">创建集合</button></div></form>`);overlay.querySelector('form')!.addEventListener('submit',async e=>{e.preventDefault();const name=String(new FormData(e.target as HTMLFormElement).get('name')).trim();if(!name)return;const id=uid();if(await change(d=>d.sets.push({id,name,targets,source:'用户创建',updatedAt:now()}),'目标集合已创建')){activeSet=id;closeOverlay();render();}});}
function importWords(){wordImport();}
function exportWords(){modal('导出生词本',`<p>JSON 保留实际词形、来源、上下文及个人修改。若要完整恢复历史和复习，请使用“完整备份”。</p><div class="export-options">${button('words-json','JSON 词汇数据','download')}${button('words-csv','CSV 表格（Excel）','download')}${button('words-txt','TXT 单词列表','download')}</div>`);for(const format of ['json','csv','txt'])overlay.querySelector('[data-action="words-'+format+'"]')!.addEventListener('click',()=>{const rows=s().vocabulary.map(v=>{const obj=senseById(v.senseId);return {...v,word:obj?.lexeme.lemma||v.form,zh:obj?meaning(obj.sense):'',en:obj?.sense.en||'',pos:obj?knownPos(obj.sense):'',personal:personal(v.senseId)||null};});if(format==='json')download('ContextFlow-词汇.json',JSON.stringify(rows,null,2));else if(format==='csv')download('ContextFlow-词汇.csv','\uFEFF'+[['word','zh','en','form','context','sourceArticle','savedAt','pos'],...rows.map(r=>[r.word,r.zh,r.en,r.form,r.context,r.articleId,r.createdAt,r.pos])].map(row=>row.map(csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8');else download('ContextFlow-词汇.txt',rows.map(r=>r.word+'\t'+r.zh).join('\r\n'),'text/plain;charset=utf-8');closeOverlay();});}
function mergedArticleParts(a:Article){if(!a.id.startsWith('import'))return [];try{return parseArticles('# '+a.title+'\n'+a.paragraphs.map(p=>p.en).join('\n\n'),a.mode,'repair-'+a.id);}catch{return [];}}
async function splitMergedArticle(){const old=article();if(!old)return;const parts=mergedArticleParts(old);if(parts.length!==5){announce('未识别到五篇独立文章，请重新导入并检查识别结果');return;}const incoming=parts.map((a,i)=>({...a,id:i===0?old.id:a.id,batchId:'repaired-'+old.id,setId:old.setId,targets:old.targets.filter(t=>containsRequiredWord(a.paragraphs.map(p=>p.en).join(' '),t.word))}));if(await change(d=>{d.articles=d.articles.filter(a=>a.id!==old.id);d.articles.push(...incoming);},'已拆分为 5 篇独立阅读')){resetReadingPreparation();currentArticle=incoming[0].id;render();for(const a of incoming)void prepareReading(a,(w,c)=>resolver.lookup(w,c).senses.some(se=>se.source==='user'),liveUI);}}
function importArticle(){
 if(!s().sets.length){wordImport();return;}
 modal('批量导入阅读',`<section data-component="ArticleImport"><p class="modal-intro">支持 Article 1–5、第一篇、Markdown 各级标题、加粗标题和 JSON 文章数组；空行分段。也可选择多个文件。</p><form id="article-form"><label>所属词汇表<select name="set" required>${s().sets.map(t=>`<option value="${esc(t.id)}" ${t.id===activeSet?'selected':''}>${esc(t.name)}</option>`).join('')}</select></label><label>阅读内容<textarea name="text" rows="13" maxlength="500000" placeholder="# 第一篇标题&#10;English paragraphs…&#10;&#10;---&#10;&#10;# 第二篇标题&#10;English paragraphs…"></textarea></label><div class="button-row"><label class="btn subtle">选择多个文件<input id="article-files" type="file" multiple accept=".txt,.md,.markdown,.json" style="max-width:230px"></label></div><p id="article-import-status" role="status"></p><div class="modal-actions"><button type="submit" class="btn primary">导入并开始后台缓存</button></div></form></section>`,true);
 const form=overlay.querySelector<HTMLFormElement>('form')!,input=form.querySelector<HTMLTextAreaElement>('textarea')!,status=form.querySelector<HTMLElement>('[role="status"]')!;let loading=false;const preview=()=>{try{const parsed=parseArticles(input.value,exam,'preview');status.textContent='识别到 '+parsed.length+' 篇：'+parsed.map((a,i)=>(i+1)+'. '+a.title).join('；');}catch(e){status.textContent=(e as Error).message;}};input.oninput=preview;
 form.querySelector<HTMLInputElement>('#article-files')!.onchange=async event=>{loading=true;try{const files=[...(event.target as HTMLInputElement).files||[]];input.value=(await Promise.all(files.map(async file=>{const text=await file.text();if(/\.json$/i.test(file.name))return parseArticles(text,exam,'file').map(a=>'# '+a.title+'\n'+a.paragraphs.map(p=>p.en).join('\n\n')).join('\n\n---\n\n');return /^\s*#{1,6}\s/.test(text)?text:'# '+file.name.replace(/\.[^.]+$/,'')+'\n'+text;}))).join('\n\n---\n\n');preview();}catch(e){status.textContent=(e as Error).message;}finally{loading=false;}};

 form.onsubmit=async event=>{event.preventDefault();if(loading)return;try{const set=s().sets.find(t=>t.id===(new FormData(form).get('set')));if(!set)throw Error('请先选择词汇表');const incoming=parseArticles(input.value,exam,uid()).map(a=>({...a,setId:set.id,targets:set.targets.filter(t=>containsRequiredWord(a.paragraphs.map(p=>p.en).join(' '),t.word))}));const missing=incoming.map((a,i)=>({index:i+1,words:set.targets.filter(t=>!a.targets.some(found=>found.senseId===t.senseId)).map(t=>t.word)})).filter(x=>x.words.length);if(missing.length)throw Error('文章未覆盖所选词汇表：'+missing.map(x=>'第 '+x.index+' 篇缺少 '+x.words.join('、')).join('；'));const submit=form.querySelector<HTMLButtonElement>('[type="submit"]')!;submit.disabled=true;if(await change(d=>{d.articles.push(...incoming);d.settings.lastArticle=incoming[0].id;})){closeOverlay();currentArticle=incoming[0].id;topic='全部主题';length='全部长度';activeSet=set.id;location.hash='read';render();window.scrollTo(0,0);for(const item of incoming)void prepareReading(item,(word,context)=>resolver.lookup(word,context).senses.some(x=>(x.source==='user'||personal(x.id))&&!x.zh.startsWith('释义待补充')),liveUI);announce('已导入 '+incoming.length+' 篇阅读，正在后台准备缓存');}else submit.disabled=false;}catch(e){status.textContent=(e as Error).message;}};
}
function previewBundle(raw:unknown){const b=validateBundle(raw,data,s().custom);for(const q of b.questions){const existing=questions().find(x=>x.id===q.id);if(existing&&canonical(existing)!==canonical(q))throw Error('存在同 ID 但内容不同的题目，请给新版本使用新的稳定 ID。');}const conflicts=b.articles.filter(a=>articles().some(x=>x.id===a.id));modal('学习包预览',`<div class="import-counts"><span>文章 <strong>${b.articles.length}</strong></span><span>题目 <strong>${b.questions.length}</strong></span><span>重复文章 <strong>${conflicts.length}</strong></span></div><p>结构、目标词出现、题目选项和文章引用已检查。语言自然度、义项搭配、译文对应和答案唯一性仍需人工审阅。</p>${b.articles.map(a=>`<details open><summary>${esc(a.title)} · ${a.targets.length} 个目标义项</summary>${a.paragraphs.map(p=>`<p lang="en">${esc(p.en)}</p><p class="muted">${esc(p.zh)}</p>`).join('')}</details>`).join('')}<details><summary>查看题目与答案</summary>${b.questions.map(q=>`<p>${esc(q.context)}</p><ol>${q.options.map((x,i)=>`<li>${esc(x)}${q.answer===i?' ✓':''}<p class="muted">${esc(q.explanations[i])}</p></li>`).join('')}</ol>`).join('')}</details><label class="check-label"><input type="checkbox" id="approve-content">我已审阅内容，同意保存（同 ID 相同题目与已有文章跳过）</label><div class="modal-actions">${button('close','取消','','btn subtle')}${button('commit-bundle','保存到文章库','','btn primary','disabled')}</div>`,true);overlay.querySelector('#approve-content')!.addEventListener('change',e=>{overlay.querySelector<HTMLButtonElement>('[data-action="commit-bundle"]')!.disabled=!(e.target as HTMLInputElement).checked;});overlay.querySelector('[data-action="commit-bundle"]')!.addEventListener('click',async()=>{const existingA=new Set(articles().map(a=>a.id)),existingQ=new Set(questions().map(q=>q.id));const incomingA=b.articles.filter(a=>!existingA.has(a.id)),incomingQ=b.questions.filter(q=>!existingQ.has(q.id));if(await change(d=>{d.articles.push(...incomingA);d.questions.push(...incomingQ);},`已导入 ${incomingA.length} 篇文章与 ${incomingQ.length} 道题`)){closeOverlay();if(incomingA[0]){exam=incomingA[0].mode;topic='全部主题';length='全部长度';activeSet='';currentArticle=incomingA[0].id;location.hash='read';}render();for(const item of incomingA)void prepareReading(item,(w,c)=>resolver.lookup(w,c).senses.some(x=>(x.source==='user'||personal(x.id))&&!x.zh.startsWith('释义待补充')),liveUI);}});}
function library(){modal('文章库',`<p class="modal-intro">你导入的阅读文章，可在词汇表中继续添加。</p><div class="library-list">${articles().map(a=>`<button data-action="open-article" data-id="${a.id}"><span class="library-topic">${esc(a.topic)}</span><span><strong lang="en">${esc(a.title)}</strong><small>${esc(a.mode)} · ${a.length} · ${wordCount(a)} 词${s().readArticles.includes(a.id)?' · 已读':''}</small></span>${icon('arrow')}</button>`).join('')}</div>`,true);}
function startQuiz(isDue=false){const a=article();const targetIds=isDue?new Set(due().map(r=>r.id)):new Set(a?.targets.map(t=>t.senseId)||[]);const attempted=new Set(s().attempts.map(x=>contextKey(x.question)));const pool=[...new Map(questions().filter(q=>targetIds.has(q.senseId)&&(isDue||a?.questionIds.includes(q.id))).map(q=>[contextKey(q),q])).values()];const unseen=pool.filter(q=>!attempted.has(contextKey(q)));
 if(!pool.length||(!isDue&&!unseen.length)){modal(isDue?'到期复习':'跨语境测试',`<p>${isDue&&!targetIds.size?'目前没有到期的复习义项。按实际复习时间安排，今天可以继续阅读。':'当前没有未练习的新题。已有题库不足以继续提供新语境，不会通过调整选项伪装成新题。'}</p><p class="muted">可导入包含新语境的学习包；旧题仍可查看首次答案与解析。</p><div class="modal-actions">${button('close','返回阅读','','btn primary')}${button('import-article','导入学习包','upload','btn subtle')}</div>`);return;}
 const chosen:Question[]=[];const ids=new Set<string>();for(const q of (isDue?[...pool].sort((a,b)=>Number(attempted.has(contextKey(a)))-Number(attempted.has(contextKey(b)))||(s().attempts.filter(x=>contextKey(x.question)===contextKey(a)).at(-1)?.submittedAt||'').localeCompare(s().attempts.filter(x=>contextKey(x.question)===contextKey(b)).at(-1)?.submittedAt||'')):unseen)){if(!ids.has(q.senseId)){chosen.push(q);ids.add(q.senseId);}if(chosen.length>=10)break;}
 quiz={questions:chosen,index:0,answers:new Map(),submitted:false,selected:-1,article:a?.id,isReview:isDue};if(a&&!isDue)void change(d=>{if(!d.readArticles.includes(a.id))d.readArticles.push(a.id)});drawQuiz();}
function drawQuiz(){if(!quiz)return;const state=quiz,q=state.questions[state.index];const attemptId=state.answers.get(q.id),attempt=s().attempts.find(a=>a.id===attemptId);const selectedIndex=attempt?.selected??state.selected;const practised=s().attempts.some(a=>contextKey(a.question)===contextKey(q)&&a.id!==attemptId);modal('跨语境测试',`<div class="quiz-meta"><span>${state.index+1} / ${state.questions.length}</span><span>${state.isReview?'到期复习 · '+(practised?'旧题（不算新题）':'未练习语境'):'英文理解 · 未练习语境'}</span></div><div class="quiz-track"><i style="width:${100*state.index/state.questions.length}%"></i></div><p class="quiz-context" lang="en">${esc(q.context).replace(new RegExp('\\b'+q.word+'\\b','gi'),'<mark>$&</mark>')}</p><h3 class="quiz-prompt" lang="en">${esc(q.prompt)}</h3><div class="quiz-options">${q.options.map((o,i)=>`<button data-action="answer" data-index="${i}" ${attempt?'disabled':''} aria-pressed="${selectedIndex===i}" class="quiz-option${selectedIndex===i?' chosen':''}${attempt&&q.answer===i?' answer-correct':''}${attempt&&selectedIndex===i&&!attempt.correct?' answer-wrong':''}"><span>${'ABCD'[i]}</span><span lang="en">${esc(o)}</span>${attempt&&q.answer===i?icon('check'):''}</button>`).join('')}</div>${attempt?`<div class="quiz-explanation"><h3>${attempt.correct?'理解正确':'再看一次这个义项'}</h3><p>${attempt.effective?'已记录本次有效复习。':'首次成绩已记录；该义项距上次有效复习不足 24 小时，本次为额外练习。'}</p>${q.explanations.map((x,i)=>`<p><strong>${'ABCD'[i]}</strong> ${esc(x)}</p>`).join('')}</div>`:'<p class="quiz-hint">提交后显示中文解析。首次提交确定成绩。</p>'}<div class="modal-actions"><span class="muted">${data.manifest.status.split(' · ')[0]}</span>${attempt?button('quiz-next',state.index+1===state.questions.length?'查看本轮结果':'下一题','arrow','btn primary'):button('submit-answer','提交答案','','btn primary',selectedIndex<0?'disabled':'')}</div>`,true);}
async function submitAnswer(){if(!quiz||quiz.selected<0||quiz.submitted)return;quiz.submitted=true;const q=quiz.questions[quiz.index];const previous=s().attempts.find(a=>contextKey(a.question)===contextKey(q));if(previous&&!quiz.isReview){quiz.answers.set(q.id,previous.id);drawQuiz();return;}const id=uid(),chosen=quiz.selected,result=reviewAfter(s().reviews.find(x=>x.id===q.senseId),q,chosen===q.answer);
 if(await change(d=>{d.attempts.push({id,question:structuredClone(q),selected:chosen,correct:chosen===q.answer,submittedAt:now(),effective:result.effective,kind:quiz!.isReview?'review':'initial'});d.reviews=d.reviews.filter(x=>x.id!==q.senseId);d.reviews.push(result.state);})){quiz.answers.set(q.id,id);render();drawQuiz();const check=overlay.querySelector('.answer-correct svg');if(check&&chosen===q.answer&&canAnimate())gsap.from(check,{scale:.62,rotate:-12,duration:.24,ease:'back.out(1.4)'});}else quiz.submitted=false;}
function nextQuiz(){if(!quiz)return;if(quiz.index+1<quiz.questions.length){quiz.index++;quiz.selected=-1;quiz.submitted=false;drawQuiz();}else{const attempts=s().attempts.filter(a=>[...quiz!.answers.values()].includes(a.id)),correct=attempts.filter(a=>a.correct).length;modal('本轮练习完成',`<div class="quiz-result"><span class="result-icon correct">${icon('check')}</span><h3>又多了一次语境里的相遇</h3><p>完成 ${attempts.length} 题，答对 ${correct} 题。</p><p class="muted">一次答对记录本次表现，掌握状态需经过多次间隔复习。</p></div><div class="modal-actions">${button('close','继续阅读','','btn subtle')}<a class="btn primary" href="#history" data-action="close">查看测试记录 ${icon('arrow')}</a></div>`);quiz=undefined;render();}}
function showAttempt(id:string){const a=s().attempts.find(a=>a.id===id);if(!a)return;const q=a.question;modal('首次答题记录',`<p class="quiz-context" lang="en">${esc(q.context)}</p><p lang="en">${esc(q.prompt)}</p>${q.options.map((o,i)=>`<div class="record-option ${i===q.answer?'correct':''}"><strong>${'ABCD'[i]}</strong> <span lang="en">${esc(o)}</span> ${i===a.selected?'（你的首次答案）':''}${i===q.answer?'（正确项）':''}<p>${esc(q.explanations[i])}</p></div>`).join('')}<p class="muted">${new Date(a.submittedAt).toLocaleString('zh-CN')} · ${a.effective?'有效复习':'额外练习'}</p>`,true);}
function exportArticleRequest(setId=activeSet){const set=s().sets.find(t=>t.id===setId);if(!set||!set.targets.length){announce('请先创建并选择有单词的词汇表');return;}const words=set.targets.map(t=>{const se=senseById(t.senseId)?.sense;return `- ${t.emphasized?'**'+t.word+'**':t.word}：${se?meaning(se):'未提供词义'}`;}).join('\n');download(set.name+'-文章生成请求.md',`# 阅读文章生成请求\n\n请使用以下词汇及指定中文词义，创作 5 篇内容不同、自然连贯的英文阅读文章。每一篇英文正文都必须完整包含所有单词或短语，保持原词形；加粗与常考词义优先，不擅自替换用户释义。可根据词量调整篇幅。\n\n只输出英文标题和英文段落，不附加词表、中文翻译、题目或说明。每篇使用 # 标题，文章之间用单独一行 --- 分隔，段落之间空一行，以便批量导入阅读工具。\n\n## 词汇表：${set.name}\n${words}\n`,'text/markdown;charset=utf-8');}
// Older imports grouped lists into one immutable batch. Preserve its raw input on each list when the user edits it.
function detachImportBatch(state:UserState,setId:string){
 const batchId=state.sets.find(set=>set.id===setId)?.importBatchId;if(!batchId)return;
 const batch=state.importBatches.find(b=>b.id===batchId);
 for(const list of state.sets.filter(set=>set.importBatchId===batchId)){
  list.markdown||=batch?.raw;delete list.importBatchId;delete list.groupIndex;delete list.entryIds;delete list.articleId;
 }
 for(const article of state.articles)if(article.importBatchId===batchId)delete article.importBatchId;
 for(const task of state.generationTasks)if(task.batchId===batchId)delete task.batchId;
 state.importEntries=state.importEntries.filter(e=>e.batchId!==batchId);state.importBatches=state.importBatches.filter(b=>b.id!==batchId);
}
function wordImportForm(inline=false,setId=''){
 const options=['CET-4','CET-6','IELTS'].map(m=>`<option ${exam===m?'selected':''}>${m}</option>`).join('');
 return `<form id="word-import-form" data-set="${esc(setId)}">${setId?'':'<label>词表名称<input name="name" maxlength="100" value="我的词表" required></label>'}<label>单词与词义<textarea name="words" rows="${inline?'5':'8'}" required placeholder="camera（n.）：照相机&#10;C++：一种编程语言"></textarea></label><div class="import-options"><button class="pos-switch" type="button" data-fill-pos role="switch" aria-checked="${!!s().settings.autoPos}"><i aria-hidden="true"></i>AI 补全词性</button><label>阅读难度<select name="mode">${options}</select></label></div><div id="word-import-error" role="alert"></div><div class="modal-actions import-actions"><button class="btn subtle" type="submit">${icon('plus')}${setId?'添加到词表':'仅保存词表'}</button><button class="btn primary" type="submit" value="generate">${icon('book')}导入并生成阅读和题目</button></div></form>`;
}
function wordImport(setId=''){
 modal(setId?'添加单词与词义':'新建词汇表',wordImportForm(false,setId),true);
 bindWordForm(overlay.querySelector('#word-import-form'));
}
function updateWordPreview(){
 const preview=document.getElementById('word-preview'),raw=app.querySelector<HTMLTextAreaElement>('#word-import-form textarea')?.value.trim();
 if(!preview)return;
 let words:GenerationWord[]=[];try{words=raw?parseGenerationWords(raw).words:[{word:'camera',zh:'照相机',pos:'n.'},{word:'lens',zh:'镜头'}];}catch{/* An incomplete paste is validated on submit. */}
 document.getElementById('sample-heading')!.textContent=raw?'目标词预览':'词表格式示例';
 preview.innerHTML=words.slice(0,4).map(w=>{const art=wordArt(w.word);return `<div class="preview-entry${art?' with-object':''}">${art?`<img class="entry-object" src="${art.image}" alt="" draggable="false">`:''}<strong lang="en">${esc(w.word)}</strong><span>${esc(w.pos||'')} ${markdownInline(w.zh||'待补充词义')}</span></div>`}).join('')||'<p>每行输入一个单词和词义</p>';
}
document.addEventListener('submit',async e=>{
 const form=e.target as HTMLFormElement;
 if(form.id==='reading-quiz-form'){
  e.preventDefault();const a=article();if(!a)return;
  try{await submitReading(repo,a);paintQuiz(true);}catch(err){form.querySelector('#reading-quiz-error')!.textContent=(err as Error).message;}
  return;
 }
 if(form.id!=='word-import-form')return;
 e.preventDefault();if(form.dataset.busy)return;
 const wantsReading=(e.submitter as HTMLButtonElement)?.value==='generate';
 const autoPos=form.querySelector('[data-fill-pos]')?.getAttribute('aria-checked')==='true';
 try{
  const fields=new FormData(form),raw=String(fields.get('words')),parsed=parseGenerationWords(raw);
  if(parsed.invalid.length)throw Error('请检查这些词条：'+parsed.invalid.slice(0,4).join('、'));
  if(!parsed.words.length||parsed.overLimit)throw Error('每次可添加 1–200 个单词或短语。');
  const setId=form.dataset.set||uid(),mode=String(fields.get('mode')) as Mode;
  if(wantsReading||autoPos)connectFileStudy();
  form.dataset.busy='true';
  await repo.commit(d=>{
   let set=d.sets.find(x=>x.id===setId);
   if(!set){
    if(form.dataset.set)throw Error('词汇表已被删除');
    const name=String(fields.get('name')||'').trim();if(!name)throw Error('请填写词表名称');
    set={id:setId,name,source:'用户词表',targets:[],updatedAt:now()};d.sets.push(set);
   }
   detachImportBatch(d,setId);
   const byWord=new Map(set.targets.map(t=>[normalizeTerm(t.word),t]));
   for(const w of parsed.words){
    const key=normalizeTerm(w.word),prior=byWord.get(key);
    const old=prior?senseById(prior.senseId)?.sense:previousImportSense(w);
    const same=old&&(!w.zh||w.zh===meaning(old))&&(!w.pos||w.pos===knownPos(old));
    let sense=old;
    if(!same){
     sense={id:'user-s-'+uid(),pos:w.pos||'',en:'',zh:w.zh||(old?meaning(old):'释义待补充（用户导入）'),source:'user',status:'用户导入'};
     d.custom.push({id:'user-'+uid(),lemma:w.word,ipa:{},senses:[sense]});
    }
    const target={word:w.word,senseId:sense!.id,emphasized:w.emphasized||prior?.emphasized};
    if(prior)Object.assign(prior,target);else{set.targets.push(target);byWord.set(key,target);}
    if(autoPos&&!knownPos(sense!)&&d.custom.some(l=>l.senses.some(se=>se.id===sense!.id))){
     set.pendingPos||=[];if(!set.pendingPos.includes(sense!.id))set.pendingPos.push(sense!.id);
    }
   }
   set.markdown=[set.markdown,raw].filter(Boolean).join('\n');set.updatedAt=now();d.settings.autoPos=autoPos;
  });
  resolver=new RuleSenseResolver(lexemes(),data.content.forms);if(overlay.contains(form))closeOverlay();
  activeSet=setId;search='';render();announce(form.dataset.set?'已添加到词表':'词表已保存');
  if(autoPos)void posJobs.run(setId);
  if(wantsReading)void generateList(setId,mode);
 }catch(error){form.querySelector('#word-import-error')!.textContent=(error as Error).message;}
 finally{delete form.dataset.busy;}
});
function generatedArticleNavigation(a:Article){const match=a.id.match(/^((?:generated|import-batch)-.+)-\d+$/);const siblings=a.batchId?articles().filter(x=>x.batchId===a.batchId):match?articles().filter(x=>x.id.startsWith(match[1]+'-')):[];if(siblings.length<2)return '';return `<label class="batch-select"><select id="batch-article" aria-label="切换本批文章">${siblings.map((x,i)=>`<option value="${esc(x.id)}" ${x.id===a.id?'selected':''}>第 ${i+1} / ${siblings.length} 篇</option>`).join('')}</select></label>`;}


async function deleteItems(ids:string[]){const removed=s().vocabulary.filter(v=>ids.includes(v.id));if(!removed.length){announce('请先选择要删除的词义');return;}if(await change(d=>{d.vocabulary=d.vocabulary.filter(v=>!ids.includes(v.id));})){selected.clear();render();announce(`已删除 ${removed.length} 个收藏义项`,()=>{void change(d=>{const existing=new Set(d.vocabulary.map(v=>v.id));d.vocabulary.push(...removed.filter(v=>!existing.has(v.id)));},'已恢复删除的收藏').then(()=>render());});}}
document.addEventListener('click',async e=>{const target=e.target as HTMLElement;const action=target.closest<HTMLElement>('[data-action]');if(!action){if(overlay.querySelector('.word-card')&&!target.closest('.word-card'))closeOverlay();return;}const name=action.dataset.action!;const menu=action.closest<HTMLDetailsElement>('.reading-more');if(menu){menu.open=false;menu.querySelector('summary')?.focus();}const a=article();try{
 switch(name){
 case 'close':closeOverlay();break;
 case 'prepare-reading':connectFileStudy();if(a)void prepareReading(a,(word,context)=>resolver.lookup(word,context).senses.some(x=>(x.source==='user'||personal(x.id))&&!x.zh.startsWith('释义待补充')),liveUI,true);break;
 case 'live-settings':void showServiceSettings(liveUI);break;
 case 'direct-query':modal('直接查询',`<form id="direct-query-form"><label>英文单词或短语<input name="word" required maxlength="100" placeholder="例如 in that"></label><div class="modal-actions"><button class="btn primary" type="submit">查询</button></div></form>`);overlay.querySelector('form')!.addEventListener('submit',e=>{e.preventDefault();const word=String(new FormData(e.target as HTMLFormElement).get('word')).trim();if(word)void showLookup(word);});break;
 case 'speak-word':speakEnglish(action.dataset.text||'');break;
 case 'speak-paragraph':speakEnglish(a?.paragraphs[Number(action.dataset.p)]?.en||'');break;
 case 'stop-speech':stopSpeech();break;
 case 'mark-read':if(a&&!s().readArticles.includes(a.id)&&await change(d=>{if(!d.readArticles.includes(a.id))d.readArticles.push(a.id)},'已完成阅读')){render();const stamp=app.querySelector('.stamp-btn');if(stamp&&canAnimate())gsap.from(stamp,{scale:1.08,rotation:-2,duration:.27,ease:'back.out(1.3)'});}break;
 case 'theme':await change(d=>{d.settings.theme=document.documentElement.dataset.theme==='dark'?'light':'dark'});render();break;
 case 'exam':exam=action.dataset.value as Mode;currentArticle='';await change(d=>{d.settings.mode=exam});render();break;
 case 'font-down':case 'font-up':await change(d=>{d.settings.fontSize=Math.min(26,Math.max(16,d.settings.fontSize+(name==='font-up'?1:-1)))});applyTheme();break;
 case 'highlight':await change(d=>{d.settings.highlight=!d.settings.highlight});render();break;
 case 'clear-filter':topic='全部主题';length='全部长度';activeSet='';render();break;
 case 'next-article':{const matches=filteredArticles();currentArticle=matches[(matches.findIndex(x=>x.id===currentArticle)+1)%matches.length]?.id||'';await change(d=>{d.settings.lastArticle=currentArticle});render();document.getElementById('main')?.scrollIntoView();break;}
 case 'lookup':{const context=action.dataset.context||a?.paragraphs[Number(action.dataset.p)]?.en||'';await showLookup(action.dataset.word!,context,action.dataset.sense||'',!!action.dataset.sense,action);break;}
 case 'target-word':await showLookup(action.dataset.word!,a?.paragraphs.find(p=>p.en.toLowerCase().includes(action.dataset.word!.toLowerCase()))?.en||'',action.dataset.sense!,true,action);break;
 case 'save-word':await toggleSense(action);break;
 case 'fill-sense-pos':connectFileStudy();await fillSensePos(action as HTMLButtonElement);break;
 case 'edit-word':editSense(action.dataset.sense!);break;
 case 'add-word':addWord(action.dataset.word||'');break;
 case 'new-set':wordImport();break;
 case 'append-words':wordImport(activeSet);break;
 case 'generate-set':connectFileStudy();void generateList(action.dataset.set||activeSet,exam);break;
 case 'retry-pos':connectFileStudy();void posJobs.run(action.dataset.set!);break;
 case 'resume-generation':connectFileStudy();void generation.resume(action.dataset.id!).catch(e=>announce(e.message));break;
 case 'cancel-generation':void generation.cancel(action.dataset.id!).catch(e=>announce(e.message));break;
 case 'generate-questions':if(a){connectFileStudy();void generation.questions(a.id,(document.querySelector<HTMLSelectElement>('#question-difficulty')?.value||a.mode) as Mode).catch(e=>announce(e.message));}break;
 case 'reset-reading-quiz':if(a){await resetReading(repo,a);paintQuiz(true);}break;
 case 'set':activeSet=action.dataset.id!;search='';render();break;
 case 'filter-status':wordFilter=action.dataset.filter!;selected.clear();refreshNotebook();app.querySelector<HTMLElement>('[data-filter="'+wordFilter+'"]')?.focus({preventScroll:true});break;
 case 'clear-notebook':wordFilter='all';selected.clear();search='';render();app.querySelector<HTMLElement>('#search')?.focus();break;
 case 'delete-set':{const jobs=s().generationTasks.filter(t=>t.groupId===activeSet);if(activeSet&&await change(d=>{detachImportBatch(d,activeSet);d.sets=d.sets.filter(t=>t.id!==activeSet);d.generationTasks=d.generationTasks.filter(t=>t.groupId!==activeSet);for(const a of d.articles)if(a.setId===activeSet)delete a.setId},'集合已删除')){generation.stopRemovedTasks(jobs);activeSet='';render();}break;}
 case 'export-markdown':{const set=s().sets.find(t=>t.id===activeSet);if(set?.markdown)download('ContextFlow-原始词表.md',set.markdown,'text/markdown;charset=utf-8');break;}

 case 'import-words':importWords();break;
 case 'export-words':exportWords();break;
 case 'backup':await exportBackup();break;
 case 'restore':restoreBackup();break;
 case 'delete-word':await deleteItems([action.dataset.id!]);break;
 case 'batch-edit':editBatch(s().vocabulary.filter(v=>selected.has(v.id)).map(v=>v.senseId));break;
 case 'edit-set':editBatch(s().sets.find(t=>t.id===activeSet)?.targets.map(t=>t.senseId)||[]);break;
 case 'batch-delete':await deleteItems([...selected]);break;
 case 'batch-set':{const targets=s().vocabulary.filter(v=>selected.has(v.id)).map(v=>({word:getLex(v.lexemeId)?.lemma||v.form,senseId:v.senseId}));if(!targets.length)announce('先选择要加入训练的收藏义项');else newSet(targets);break;}
 case 'library':library();break;
 case 'open-generated':{const chosen=articles().find(x=>x.id===action.dataset.id);if(chosen){if(!await change(d=>{d.settings.lastArticle=chosen.id;d.settings.mode=chosen.mode}))break;exam=chosen.mode;topic='全部主题';length='全部长度';activeSet=chosen.setId||'';currentArticle=chosen.id;location.hash='read';render();window.scrollTo(0,0);}break;}
 case 'open-article':{const chosen=articles().find(x=>x.id===action.dataset.id);if(chosen){exam=chosen.mode;topic='全部主题';length='全部长度';activeSet=chosen.setId||'';currentArticle=chosen.id;await change(d=>{d.settings.lastArticle=chosen.id;d.settings.mode=exam});closeOverlay();render();}break;}
 case 'import-article':importArticle();break;
 case 'split-merged':await splitMergedArticle();break;
 case 'export-article-request':exportArticleRequest(action.dataset.set);break;
 
 
 case 'start-quiz':startQuiz();break;
 case 'review-due':startQuiz(true);break;
 case 'answer':if(quiz&&!quiz.answers.has(quiz.questions[quiz.index].id)){quiz.selected=Number(action.dataset.index);drawQuiz();}break;
 case 'submit-answer':await submitAnswer();break;
 case 'quiz-next':nextQuiz();break;
 case 'attempt':showAttempt(action.dataset.id!);break;
 case 'previous':{const previous=await repo.previous();if(!previous){announce('当前没有可恢复的 IndexedDB 快照');break;}modal('恢复上一保存快照',`<p>快照时间：${new Date(previous.updatedAt).toLocaleString('zh-CN')}。恢复前建议先导出当前数据。</p><div class="modal-actions">${button('backup','导出当前备份','download','btn subtle')}${button('confirm-previous','恢复此快照','','btn primary')}</div>`);overlay.querySelector('[data-action="confirm-previous"]')!.addEventListener('click',async()=>{try{await repo.replace(previous);resolver=new RuleSenseResolver(lexemes(),data.content.forms);closeOverlay();render();announce('已恢复上一快照');}catch{announce('恢复失败，原有数据保留');}});break;}
 case 'reset':modal('清空本机学习数据',`<p>将清除 ${s().vocabulary.length} 个收藏、${s().attempts.length} 条答题及所有个人修改、导入文章和目标集合。建议先导出备份。</p><label>输入“清空”确认<input id="reset-confirm" autocomplete="off"></label><div class="modal-actions">${button('backup','先导出备份','download','btn subtle')}${button('confirm-reset','确认清空','','btn danger')}</div>`);overlay.querySelector('[data-action="confirm-reset"]')!.addEventListener('click',async()=>{if(overlay.querySelector<HTMLInputElement>('#reset-confirm')!.value!=='清空'){announce('请输入“清空”后再确认');return;}try{await repo.replace(initialState(data.manifest.version));resolver=new RuleSenseResolver(lexemes(),data.content.forms);activeSet='';selected.clear();clearLookupCache();clearTranslationCache();await clearReadingCache();resetReadingPreparation();closeOverlay();render();announce('已清空学习数据');}catch{announce('清空失败，数据未改变');}});break;
 }
 }catch(err){announce(err instanceof Error?err.message:'操作未完成，请重试');}
});
document.addEventListener('change',async e=>{const el=e.target as HTMLInputElement;if(el.dataset.readingQuestion!==undefined){const a=article();if(a)await answerReading(repo,a,Number(el.dataset.readingQuestion),Number(el.value));return;}if(el.id==='batch-article'){const a=articles().find(x=>x.id===el.value);if(a&&await change(d=>{d.settings.lastArticle=a.id;d.settings.mode=a.mode})){currentArticle=a.id;activeSet=a.setId||'';render();}}else if(el.id==='topic'){topic=el.value;currentArticle='';render();}else if(el.id==='length'){length=el.value;currentArticle='';render();}else if(el.id==='active-set'){activeSet=el.value;currentArticle='';render();}else if(el.id==='word-filter'){wordFilter=el.value;selected.clear();refreshNotebook();}else if(el.id==='sort'){sort=el.value;refreshNotebook();}else if(el.dataset.notebookStatus){
 const mark=({mastered:'mastered',learning:'pass',due:'again'} as const)[el.value as NotebookStatus];
 await saveCardCheck(el.dataset.notebookStatus,mark);refreshNotebook();
 }else if(el.id==='motion-mode'){setMotionMode(el.value);}
 else if(el.id==='theme'){await change(d=>{d.settings.theme=el.value as UserState['settings']['theme']});render();}else if(el.id==='font-size'){await change(d=>{d.settings.fontSize=Number(el.value)});render();}else if(el.dataset.select){if(el.checked)selected.add(el.dataset.select);else selected.delete(el.dataset.select);render();}else if(el.id==='select-all'){const inputs=app.querySelectorAll<HTMLInputElement>('[data-select]');for(const input of inputs){if(el.checked)selected.add(input.dataset.select!);else selected.delete(input.dataset.select!);}render();}});
function updateSearch(input:HTMLInputElement){
 search=input.value;selected.clear();
 if(route()==='words'){
   const active=s().sets.find(t=>t.id===activeSet),grid=app.querySelector('.lex-grid');
   if(active&&grid)grid.innerHTML=renderWordRows(active);
 }else if(route()==='notebook')refreshNotebook();
}
document.addEventListener('compositionend',e=>{const el=e.target as HTMLInputElement;if(el.id==='search')updateSearch(el);});
document.addEventListener('input',e=>{const el=e.target as HTMLInputElement;if(el.id==='search'&&!(e as InputEvent).isComposing)updateSearch(el);if(el.id==='font-size'){el.parentElement!.querySelector('output')!.textContent=el.value+'px';document.documentElement.style.setProperty('--reading-size',el.value+'px');}});
document.addEventListener('click',e=>{const link=(e.target as HTMLElement).closest<HTMLAnchorElement>('[data-scroll]');if(link){e.preventDefault();document.getElementById(link.dataset.scroll!)?.scrollIntoView({behavior:reducedMotion()?'instant':'smooth'});}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay.childElementCount)closeOverlay();});
let navigation=0;
window.addEventListener('hashchange',()=>{
 const ticket=++navigation;clip.close();if(overlay.childElementCount)closeOverlay();
 search='';wordFilter='all';selected.clear();
 const apply=()=>{if(ticket!==navigation)return;render();document.getElementById('main')?.focus({preventScroll:true});window.scrollTo(0,0);};
 const main=document.getElementById('main');
 if(main)gsap.killTweensOf(main);
 if(main&&lastRoute!==route()&&canAnimate())gsap.to(main,{opacity:.15,y:-3,duration:.085,onComplete:apply});else apply();
});
document.addEventListener('keydown',e=>{
 const el=e.target as HTMLElement;
 if(el.matches('.word[role="button"]')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();el.click();}
 const menu=document.querySelector<HTMLDetailsElement>('.reading-more[open]');
 if(e.key==='Escape'&&menu){menu.open=false;menu.querySelector('summary')?.focus();}
});
document.addEventListener('pointerdown',e=>{const m=document.querySelector<HTMLDetailsElement>('.reading-more[open]');if(m&&!m.contains(e.target as Node))m.open=false;});
window.addEventListener('resize',()=>{if(overlay.querySelector('.word-card'))closeOverlay();});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applyTheme);
async function init(){await repo.init();if(!s().libraryReset015){await repo.commit(d=>{d.libraryReset015=true;});}resolver=new RuleSenseResolver(lexemes(),data.content.forms);exam=s().settings.mode;currentArticle=s().settings.lastArticle||'article-1-1';render();void generation.recover();if(location.protocol!=='file:')for(const set of s().sets)if(set.pendingPos?.length)void posJobs.run(set.id);if(repo.mode==='临时模式')announce(repo.detail);}
const listMessages=new Map<string,string>();
const starting=new Set<string>();
const generation=new GenerationQueue(repo,paintStudy,
 a=>{if(route()==='read'&&!app.querySelector('.reading-paper')&&(!activeSet||activeSet===a.setId)){exam=a.mode;currentArticle=a.id;render();}},
 a=>void prepareReading(a,(word,context)=>resolver.lookup(word,context).senses.some(x=>x.source==='user'||!!personal(x.id)),liveUI));
const posJobs=new PosJobs(repo,paintStudy);
async function generateList(setId:string,mode:Mode){
 if(starting.has(setId))return;
 const list=s().sets.find(x=>x.id===setId);if(!list)return;
 starting.add(setId);listMessages.set(setId,'正在连接阅读服务…');paintStudy();
 try{
  const targets=list.targets.map(t=>({...t,zh:meaningForTarget(t)}));
  await generation.vocabulary(setId,targets,mode);listMessages.delete(setId);
 }catch(error){listMessages.set(setId,(error as Error).message);}
 finally{starting.delete(setId);paintStudy();}
}
function meaningForTarget(t:Target){
 const obj=senseById(t.senseId);const zh=obj?meaning(obj.sense):'';return zh.startsWith('释义待补充（用户导入）')?'':zh;
}
function studyPanel(setId:string){return `<div class="study-jobs" data-study-set="${esc(setId)}" aria-live="polite">${studyStatus(setId)}</div>`;}
function studyStatus(setId:string){
 const list=s().sets.find(set=>set.id===setId);if(!list)return '';
 const rows:string[]=[],message=listMessages.get(setId);
 if(message)rows.push(`<div><span>阅读 · ${esc(message)}</span>${starting.has(setId)?'':button('live-settings','连接模型','arrow','text-btn')}</div>`);
 if(list.pendingPos?.length){
  const error=posJobs.errors.get(setId);
  rows.push(`<div><span>词性 · ${error?esc(error):'待补全 '+list.pendingPos.length+' 项'}</span>${(error||location.protocol==='file:')?button('retry-pos','继续补全','arrow','text-btn',`data-set="${esc(setId)}"`):''}</div>`);
 }
 for(const task of s().generationTasks.filter(t=>t.groupId===setId)){
  const article=s().articles.find(a=>a.id===task.articleId),attrs=`data-id="${esc(task.id)}"`;
  rows.push(`<div><span>${esc(article?.title||task.targets[0]?.word||'阅读')} · ${esc(task.message)}</span>${article?button('open-generated','阅读','book','text-btn',`data-id="${esc(article.id)}"`):''}${task.status==='completed'?'':['failed','interrupted','cancelled'].includes(task.status)?button('resume-generation','重试','arrow','text-btn',attrs):button('cancel-generation','取消','','text-btn',attrs)}</div>`);
 }
 return rows.join('');
}
function paintQuiz(force=false){
 const box=document.querySelector<HTMLElement>('#reading-quiz'),a=article();if(!box||!a)return;
 const key=JSON.stringify([a.id,a.readingQuestionSetId,s().generationTasks.filter(t=>t.articleId===a.id).map(t=>[t.status,t.message])]);
 if(force||key!==box.dataset.version){box.innerHTML=quizMarkup(s(),a,esc);box.dataset.version=key;}
}
function paintStudy(){
 for(const box of app.querySelectorAll<HTMLElement>('[data-study-set]')){const html=studyStatus(box.dataset.studySet!);if(box.innerHTML!==html)box.innerHTML=html;}
 paintQuiz();
}

void init().catch(err=>{app.textContent="学习数据加载失败："+err.message;});

document.addEventListener('cf-reading-ready',()=>{if(route()!=='read')return;document.querySelectorAll('.paragraph .translation>p').forEach((node,i)=>{const p=article()?.paragraphs[i];if(p&&!p.zh){const translated=cachedParagraph(p.en);if(translated)node.textContent=translated;}});});
