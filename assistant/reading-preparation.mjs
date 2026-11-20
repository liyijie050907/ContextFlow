import {createHash} from 'node:crypto';
const pending=new Map(),cache=new Map();
export function validatePreparation(body){if(!body||!Array.isArray(body.entries)||!Array.isArray(body.sentences)||body.entries.length>24||body.sentences.length>6||(!body.entries.length&&!body.sentences.length)||body.entries.some(x=>typeof x.id!=='string'||typeof x.word!=='string'||!x.word.trim()||x.word.length>100||typeof x.context!=='string'||x.context.length>1600)||body.sentences.some(x=>typeof x.id!=='string'||typeof x.en!=='string'||!x.en.trim()||x.en.length>20000))throw Error('阅读预缓存请求格式无效');}
export function validatePreparedResult(body,result){if(!Array.isArray(result?.entries)||!Array.isArray(result?.sentences))throw Error('阅读缓存格式不完整');for(const item of body.entries){const found=result.entries.find(x=>x.id===item.id);if(!found||typeof found.meaning!=='string'||!found.meaning.trim()||found.meaning.length>2000)throw Error('词义缓存缺项：'+item.word);}for(const item of body.sentences){const found=result.sentences.find(x=>x.id===item.id);if(!found||typeof found.zh!=='string'||!found.zh.trim()||found.zh.length>24000)throw Error('句子译文缓存缺项');}return result;}
let running=0;const waiting=[];
async function limited(signal,work){signal.throwIfAborted();if(running>=2)await new Promise((resolve,reject)=>{const item={resolve:()=>{signal.removeEventListener('abort',abort);resolve();}};const abort=()=>{const index=waiting.indexOf(item);if(index>=0)waiting.splice(index,1);reject(signal.reason);};waiting.push(item);signal.addEventListener('abort',abort,{once:true});});signal.throwIfAborted();running++;try{return await work();}finally{running--;waiting.shift()?.resolve();}}
export async function prepareReadingRequest(body,call,signal){
 validatePreparation(body);let feedback='';
 for(let attempt=0;attempt<2;attempt++){
  signal?.throwIfAborted();
  const raw=await call({entries:body.entries,sentences:body.sentences,feedback},signal);
  try{
   const text=String(raw).trim().replace(/^\x60{3}(?:json)?\s*/,'').replace(/\s*\x60{3}$/,'');
   return validatePreparedResult(body,JSON.parse(text));
  }catch(error){
   if(attempt)throw error;
   feedback='上次输出未通过校验，请返回完整JSON并补齐每个id：'+error.message;
  }
 }
}
export async function prepareReadingData(body,call,signal){
 validatePreparation(body);signal?.throwIfAborted();const key=createHash('sha256').update(JSON.stringify({provider:body.provider,serviceNamespace:body.serviceNamespace,model:body.model,entries:body.entries,sentences:body.sentences})).digest('hex');if(cache.has(key))return cache.get(key);
 let job=pending.get(key);
 if(!job){job={controller:new AbortController(),users:0,settled:false,promise:undefined};const current=job;current.promise=limited(current.controller.signal,async()=>{
  const result=await prepareReadingRequest(body,call,current.controller.signal);
  cache.set(key,result);if(cache.size>100)cache.delete(cache.keys().next().value);
  return result;
 }).finally(()=>{current.settled=true;if(pending.get(key)===current)pending.delete(key);});pending.set(key,current);}
 job.users++;let abort;
 try{const cancelled=new Promise((resolve,reject)=>{abort=()=>reject(signal.reason);signal?.addEventListener('abort',abort,{once:true});});return await Promise.race([job.promise,cancelled]);}
 finally{signal?.removeEventListener('abort',abort);job.users--;if(!job.users&&!job.settled)job.controller.abort();}
}
