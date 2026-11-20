import {StorageRepository} from './storage';
import {requestParts} from './import-pos';
import {meaningfulPos,inlinePartOfSpeech} from './parts-of-speech';

export class PosJobs{
 private running=new Set<string>();
 readonly errors=new Map<string,string>();
 constructor(private repo:StorageRepository,private changed:()=>void){}
 async run(setId:string){
  if(navigator.locks){await navigator.locks.request('ContextFlow-pos-'+setId,async()=>{await this.repo.refresh();await this.process(setId);});}else await this.process(setId);
 }
 private async process(setId:string){
  if(this.running.has(setId))return;
  this.running.add(setId);this.errors.delete(setId);this.changed();
  try{
   while(true){
    const state=this.repo.state,set=state.sets.find(x=>x.id===setId);
    const ids=set?.pendingPos?.slice(0,32);
    if(!ids?.length)break;
    const senses=new Map(state.custom.flatMap(lex=>lex.senses.map(sense=>[sense.id,{word:lex.lemma,sense}] as const)));
    const entries=ids.flatMap(id=>{
     const entry=senses.get(id);if(!entry||meaningfulPos(entry.sense.pos)||inlinePartOfSpeech(entry.sense.zh))return [];
     const zh=state.overrides.find(o=>o.senseId===id)?.zh||entry.sense.zh;
     return [{id,word:entry.word,zh}];
    });
    const tags=entries.length?await requestParts(entries,new AbortController().signal):new Map<string,string>();
    await this.repo.commit(d=>{
     const list=d.sets.find(x=>x.id===setId);if(!list)return;
     const changedMeanings=new Set<string>();
     for(const row of entries){
      const sense=d.custom.find(l=>l.senses.some(s=>s.id===row.id))?.senses.find(s=>s.id===row.id);
      if(!sense||meaningfulPos(sense.pos)||!list.targets.some(t=>t.senseId===row.id))continue;
      if((d.overrides.find(o=>o.senseId===row.id)?.zh||sense.zh)!==row.zh){changedMeanings.add(row.id);continue;}
      const pos=tags.get(row.word);if(pos)sense.pos=pos;
     }
     list.pendingPos=list.pendingPos?.filter(id=>!ids.includes(id)||changedMeanings.has(id));
    });
    this.changed();
   }
  }catch(error){this.errors.set(setId,(error as Error).message);}
  finally{this.running.delete(setId);this.changed();}
 }
}
