import {localParts} from './local-pos';
import {liveAPI,currentModelChoice} from './live-service';
import {parseGenerationWords,type GenerationWord} from './generation';
import {meaningfulPos} from './parts-of-speech';

export async function requestParts(words:GenerationWord[],signal:AbortSignal){
  if(location.protocol==='file:'){const items=await localParts(words,signal);return new Map(items.filter(x=>x.pos).map(x=>[x.word,x.pos]));}
  const choice=await currentModelChoice(),result=new Map<string,string>();
  for(let i=0;i<words.length;i+=32){
    signal.throwIfAborted();
    const batch=words.slice(i,i+32);
    const response=await liveAPI<{items:{word:string;pos:string}[]}>('/parts-of-speech',{...choice,items:batch.map(({word,zh})=>({word,zh}))},signal);
    if(!Array.isArray(response.items)||response.items.length!==batch.length)throw Error('词性结果缺项，请重试');
    for(const [j,item] of response.items.entries()){
      if(!item||item.word!==batch[j].word||typeof item.pos!=='string'||item.pos.length>100)throw Error('词性结果与词表不匹配，请重试');
      if(meaningfulPos(item.pos))result.set(item.word,item.pos);
    }
  }
  return result;
}
type Draft={generated:Map<string,string>;controller?:AbortController};
const drafts=new WeakMap<HTMLFormElement,Draft>();
export const generatedPos=(form:HTMLFormElement,word:string)=>drafts.get(form)?.generated.get(word)||'';
export function attachPosImport(form:HTMLFormElement,previousPos:(word:GenerationWord)=>string,preview:()=>void){
  const field=form.elements.namedItem('words') as HTMLTextAreaElement;
  const btn=form.querySelector<HTMLButtonElement>('[data-fill-pos]')!,submit=form.querySelector<HTMLButtonElement>('[type=submit]')!;
  const status=form.querySelector<HTMLElement>('.pos-status')!;
  const draft:Draft={generated:new Map()};drafts.set(form,draft);
  let missing:GenerationWord[]=[];
  function refresh(){
    try{const parsed=parseGenerationWords(field.value);missing=parsed.invalid.length||parsed.overLimit?[]:parsed.words.filter(w=>!w.pos&&!previousPos(w)&&!draft.generated.has(w.word));}
    catch{missing=[];}
    btn.hidden=!missing.length;btn.textContent='AI 补全词性'+(missing.length?' · '+missing.length:'');
  }
  field.addEventListener('input',()=>{draft.controller?.abort();draft.controller=undefined;draft.generated.clear();submit.disabled=false;status.textContent='';refresh();preview();});
  btn.onclick=async()=>{
    if(draft.controller){draft.controller.abort();return;}
    const ctl=new AbortController();draft.controller=ctl;submit.disabled=true;
    btn.textContent='取消补全';status.textContent='正在补全词性…';
    const watcher=new MutationObserver(()=>{if(!form.isConnected)ctl.abort();});
    watcher.observe(document.body,{childList:true,subtree:true});
    try{const tags=await requestParts(missing,ctl.signal);ctl.signal.throwIfAborted();
      for(const [word,pos] of tags)draft.generated.set(word,pos);
      status.textContent=tags.size===missing.length?'已补全 '+tags.size+' 项词性':'已补全 '+tags.size+' 项，其余可留空';
      preview();
    }catch(error){if(draft.controller===ctl)status.textContent=ctl.signal.aborted?'已取消补全':(error as Error).message;}
    finally{watcher.disconnect();if(draft.controller===ctl){draft.controller=undefined;submit.disabled=false;refresh();}}
  };
  refresh();
}
