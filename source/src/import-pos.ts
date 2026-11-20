import {liveAPI,currentModelChoice} from './live-service';
import {type GenerationWord} from './generation';
import {meaningfulPos} from './parts-of-speech';

export async function requestParts(words:GenerationWord[],signal:AbortSignal){
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
