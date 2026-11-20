// Shared request protocol. This is not a durable batch worker.
import {generationPrompt,parseModelJSON,normalizeBody,normalizeQuestions,validateBody,isVocabularyTerm} from './group-core.mjs';
const inflight=new Map(),leaseMs=240000;
export function activeGenerationCount(){return inflight.size;}
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9-]{8,200}$/.test(id);
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)))),b=>b.toString(16).padStart(2,'0')).join('');
export async function generationRequest(body,namespace,store,infer,{requestScoped=false,signal}={}){
 if(!validId(body.requestId))throw Error('生成请求 ID 无效');const key=namespace+':'+body.requestId;
 if(body.operation==='status'||body.operation==='cancel'){
  if(body.operation==='cancel'){if(!requestScoped)inflight.get(key)?.controller.abort();const old=await store.read(body.requestId);if(old&&old.status==='running'){old.status='cancelled';await store.write(body.requestId,old);}}
  const row=await store.read(body.requestId);if(!row)return {status:'unknown'};if(row.status==='running'&&Date.now()-row.createdAt>leaseMs)return {status:'interrupted',message:'后台请求已中断，需主动恢复'};return {status:row.status,result:row.result,message:row.message,httpStatus:row.httpStatus,retryAfter:row.retryAfter};
 }
 if(!['body','questions'].includes(body.stage)||typeof body.model!=='string'||!body.model.trim()||body.model.length>256||(typeof body.articleId!=='string'||!body.articleId||body.articleId.length>300)||!['CET-4','CET-6','IELTS'].includes(body.mode))throw Error('生成阶段、文章或模型无效');
 if(body.stage==='body'&&(!Array.isArray(body.targets)||!body.targets.length||body.targets.length>20||body.targets.some(t=>!t||!isVocabularyTerm(t.word)||typeof t.zh!=='string'||t.zh.length>10000||typeof t.senseId!=='string'||typeof t.emphasized!=='boolean'&&t.emphasized!==undefined)))throw Error('生成目标词无效');
 if(body.stage==='questions'){if(body.article?.id!==body.articleId)throw Error('题目与文章 ID 不一致');validateBody(body.article);}
 const input={stage:body.stage,provider:body.provider,model:body.model,articleId:body.articleId,mode:body.mode,targets:body.targets,article:body.article,groupId:body.groupId,batchId:body.batchId,feedback:body.feedback||''};
 if(typeof input.feedback!=='string'||input.feedback.length>2000)throw Error('修复反馈无效');const requestHash=await digest(input),existing=await store.read(body.requestId);
 if(existing){if(existing.requestHash!==requestHash)throw Error('同一请求 ID 对应了不同内容，已阻止重复使用');if(existing.status==='done')return {status:'done',result:existing.result};if(existing.status==='running'&&!requestScoped&&inflight.has(key))return inflight.get(key).promise;
  const running=existing.status==='running'&&Date.now()-existing.createdAt<=leaseMs;
  return {status:existing.status==='running'?(running?'running':'interrupted'):existing.status,message:existing.message||'原请求未完成，请核对',httpStatus:existing.httpStatus,retryAfter:existing.retryAfter};}
 const row={requestHash,status:'running',createdAt:Date.now()};if(!await store.claim(body.requestId,row))return {status:'running'};
 const controller=new AbortController();
 const signals=[controller.signal,AbortSignal.timeout(180000)];
 if(signal)signals.push(signal);
 const promise=(async()=>{
  try{
   const prompt=generationPrompt(body.stage,input);
   const text=await infer(prompt.system,prompt.user,AbortSignal.any(signals));
   controller.signal.throwIfAborted();
   if((await store.read(body.requestId))?.status==='cancelled')return {status:'cancelled',message:'生成已取消'};
   const raw=parseModelJSON(text);
   const result=body.stage==='body'
    ? {article:normalizeBody(raw,{articleId:body.articleId,mode:body.mode,targets:body.targets,groupId:body.groupId,batchId:body.batchId})}
    : {questionSet:normalizeQuestions(raw,body.article,body.mode,body.articleId+'-reading')};
   await store.write(body.requestId,{...row,status:'done',result});
   return {status:'done',result};
  }catch(error){
   const cancelled=controller.signal.aborted||(await store.read(body.requestId))?.status==='cancelled';
   if(signal?.aborted&&!cancelled)return {status:'interrupted',message:'生成连接已中断，需核对回执'};
   const message=cancelled?'请求已取消':String(error?.message||'生成失败').slice(0,1500);
   const httpStatus=error?.status||Number(message.match(/HTTP\s+(401|403|429|5[0-9][0-9])/i)?.[1])||undefined;
   const failure={status:cancelled?'cancelled':'failed',message,httpStatus,retryAfter:error?.retryAfter};
   await store.write(body.requestId,{...row,...failure});
   return failure;
  }finally{if(!requestScoped)inflight.delete(key);}
 })();
 if(!requestScoped)inflight.set(key,{controller,promise});
 return promise;
}
