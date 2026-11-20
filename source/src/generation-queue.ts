import type {Article,GenerationTarget,GenerationTask,Mode,UserState} from './types';
import {StorageRepository} from './storage';
import {liveAPI,generationModelChoice} from './live-service';
import {waitForService} from './service-response';
import type {ServiceFailure} from './service-response';
import {normalizeBody,normalizeQuestions,bodyHash,validateReadingSet} from './group-core';
const stamp=()=>new Date().toISOString(),id=()=>crypto.randomUUID();
const settled=(t:GenerationTask)=>['completed','cancelled','failed','interrupted'].includes(t.status);
async function sendGeneration(path:string,body:GenerationTask&{feedback:string;article?:Article},signal:AbortSignal){
 try{return await liveAPI(path,body,signal);}
 catch(cause){
  const error=cause as ServiceFailure;
  signal.throwIfAborted();
  if(!error.deliveryUncertain&&(error.status??0)<500)throw cause;
  try{
   const receipt=await liveAPI('/generation-status',{operation:'status',requestId:body.requestId},signal);
   if(receipt.status!=='unknown')return receipt;
   if((error.retryAfter??0)>30000)throw error;
   await waitForService(Math.max(500,error.retryAfter??1000),signal);
   return await liveAPI(path,body,signal);
  }catch{
   signal.throwIfAborted();
   throw Object.assign(error,{uncertain:true});
  }
 }
}
export class GenerationQueue {
 private active=new Map<string,AbortController>();private draining=false;
 constructor(private repo:StorageRepository,private changed:()=>void,private bodyReady:(article:Article)=>void,private prepareCache:(article:Article)=>void=()=>{}){}
 private async update(fn:(s:UserState)=>void){await this.repo.commit(fn);this.changed();}
 stopRemovedTasks(tasks:GenerationTask[]){
  for(const task of tasks){
   this.active.get(task.id)?.abort();
   if(task.requestId&&task.requestStarted&&!settled(task)){
    void liveAPI('/generation-status',{operation:'cancel',requestId:task.requestId}).catch(()=>{});
   }
  }
 }
 async recover(){const mark=async()=>{if(!this.repo.state.generationTasks.some(t=>['running','body-ready','waiting'].includes(t.status)))return;await this.update(s=>{for(const t of s.generationTasks)if(['running','body-ready','waiting'].includes(t.status)){t.status='interrupted';t.message='页面曾关闭或刷新，点击恢复核对后继续';}});};if(navigator.locks)await navigator.locks.request('ContextFlow-generation-worker',{ifAvailable:true},async lock=>{if(lock)await mark();});else await mark();}
 async vocabulary(setId:string,targets:GenerationTarget[],mode:Mode){
  const choice=await generationModelChoice();
  await this.update(state=>{
   if(!state.sets.some(set=>set.id===setId))return;
   const covered=new Set(state.generationTasks.filter(task=>task.groupId===setId&&task.mode===mode&&task.status!=='cancelled').flatMap(task=>task.targets.map(target=>target.senseId)));
   const pending=targets.filter(target=>!covered.has(target.senseId));
   for(let start=0;start<pending.length;start+=20){
    state.generationTasks.push({id:id(),kind:'group',groupId:setId,articleId:id(),mode,targets:pending.slice(start,start+20),...choice,status:'waiting',stage:'body',attempts:{body:0,questions:0},requestId:'',message:'等待生成正文',createdAt:stamp(),updatedAt:stamp()});
   }
  });
  void this.start();
 }
 async questions(articleId:string,mode:Mode){const a=this.repo.state.articles.find(a=>a.id===articleId);if(!a)throw Error('文章不存在');const saved=this.repo.state.readingQuestionSets.find(q=>q.id===a.readingQuestionSetId);if(saved){validateReadingSet(saved,a);return;}if(this.repo.state.generationTasks.some(t=>t.articleId===articleId&&!settled(t)))return;const choice=await generationModelChoice();await this.update(s=>{const a=s.articles.find(a=>a.id===articleId);if(!a||a.readingQuestionSetId||s.generationTasks.some(t=>t.articleId===articleId&&!settled(t)))return;s.generationTasks.push({id:id(),kind:'questions',articleId,mode,targets:[],...choice,status:'waiting',stage:'questions',attempts:{body:0,questions:0},requestId:'',message:'等待生成五题',createdAt:stamp(),updatedAt:stamp()});a.phases||={body:'ready',questions:'waiting',translations:a.paragraphs.every(p=>p.zh.trim())?'ready':'idle',meanings:'idle'};a.phases.questions='waiting';});void this.start();}
 async cancel(taskId:string){const task=this.repo.state.generationTasks.find(t=>t.id===taskId);if(!task||task.status==='completed')return;this.active.get(taskId)?.abort();await this.update(s=>{const t=s.generationTasks.find(t=>t.id===taskId);if(!t)return;t.status='cancelled';t.message='已取消，已保存内容保留';t.updatedAt=stamp();const a=s.articles.find(a=>a.id===t.articleId);if(a?.phases&&a.phases.questions!=='ready')a.phases.questions='cancelled';});if(task.requestId)void liveAPI('/generation-status',{operation:'cancel',requestId:task.requestId}).catch(()=>{});}
 async resume(taskId:string){const t=this.repo.state.generationTasks.find(t=>t.id===taskId);if(!t||t.status==='completed')return;const existingArticle=this.repo.state.articles.find(a=>a.id===t.articleId),existingSet=this.repo.state.readingQuestionSets.find(q=>q.id===existingArticle?.readingQuestionSetId);if(existingArticle&&existingSet){validateReadingSet(existingSet,existingArticle);await this.update(s=>{const task=s.generationTasks.find(x=>x.id===taskId)!;task.status='completed';task.requestStarted=false;task.message='已有完整五题，直接使用已保存内容';});return;}
  if(t.requestId&&t.requestStarted){const receipt=await liveAPI<any>('/generation-status',{operation:'status',requestId:t.requestId});if(receipt.status==='done'){await this.accept(t,receipt.result);if(t.stage==='body')await this.update(s=>{const task=s.generationTasks.find(x=>x.id===taskId)!;if(task.status!=='cancelled')task.status='waiting';});void this.start();return;}if(receipt.status==='running'){await this.update(s=>{const task=s.generationTasks.find(x=>x.id===taskId)!;task.status='interrupted';task.message='原请求仍在执行，请稍后再次核对';});return;}}
  await this.update(s=>{const task=s.generationTasks.find(x=>x.id===taskId)!;const a=s.articles.find(a=>a.id===task.articleId);if(a){task.stage='questions';task.attempts.questions=0;}else task.attempts.body=0;task.requestId='';task.requestStarted=false;task.status='waiting';task.message='已主动恢复，将只处理缺失阶段';});void this.start();
 }
 private async start(){if(this.draining)return;this.draining=true;try{if(navigator.locks)await navigator.locks.request('ContextFlow-generation-worker',{ifAvailable:true},async lock=>{if(lock)await this.drain();});else await this.drain();}finally{this.draining=false;if(this.repo.state.generationTasks.some(t=>t.status==='waiting'))setTimeout(()=>void this.start(),500);}}
 private async drain(){await this.repo.refresh();await Promise.all([this.worker(),this.worker()]);}
 private async worker(){while(true){let picked='';await this.update(s=>{const t=s.generationTasks.find(t=>t.status==='waiting');if(t){t.status='running';t.message='正在生成';picked=t.id;}});if(!picked)return;const controller=new AbortController();this.active.set(picked,controller);try{while(true){const task=this.repo.state.generationTasks.find(t=>t.id===picked)!;if(!task||task.status==='cancelled'||task.status==='completed')break;const stage=task.stage;if(task.attempts[stage]>=3)throw Error('本阶段已达到三次请求上限，请主动重试');
   let requestTask:GenerationTask|undefined;await this.update(s=>{const t=s.generationTasks.find(t=>t.id===picked);if(!t||t.status==='cancelled')return;t.requestId=id();t.requestStarted=true;t.attempts[stage]++;t.status='running';t.message=(stage==='body'?'正在生成正文':'正文可读，正在准备五题')+` · 第 ${t.attempts[stage]}/3 次`;t.updatedAt=stamp();if(stage==='body')for(const target of t.targets){
    const own=s.overrides.find(row=>row.senseId===target.senseId);
    const entry=s.importEntries.find(row=>row.senseId===target.senseId);
    target.zh=own?.zh||entry?.zh||target.zh;
   }
   requestTask=structuredClone(t);const a=s.articles.find(a=>a.id===t.articleId);if(a?.phases)a.phases.questions='running';});if(!requestTask)break;
   try{const a=this.repo.state.articles.find(a=>a.id===requestTask!.articleId);const response=await sendGeneration(stage==='body'?'/generate-article':'/generate-questions',{...requestTask,stage,feedback:task.message.startsWith('校验失败')?task.message:'',article:stage==='questions'?a:undefined},controller.signal);if(response.status==='running'||response.status==='interrupted'||response.status==='unknown')throw Object.assign(Error('请求状态待核对，请点击恢复'),{uncertain:true});if(response.status!=='done')throw Object.assign(Error(response.message||'该阶段生成失败'),{status:response.httpStatus,retryAfter:response.retryAfter});try{await this.accept(requestTask,response.result);}catch(error){throw Object.assign(error as Error,{uncertain:true});}}
   catch(error){if(controller.signal.aborted)break;const e=error as Error&{status?:number;uncertain?:boolean;retryAfter?:number};if(/尚未连接|请先连接|请先配置|授权|API Key/.test(e.message))throw e;if(e.uncertain||e.status===401||e.status===403||!e.status&&/连接中断/.test(e.message))throw e;const latest=this.repo.state.generationTasks.find(t=>t.id===picked);if(!latest)break;if(latest.attempts[stage]>=3||(e.retryAfter??0)>30000)throw e;await this.update(s=>{const t=s.generationTasks.find(t=>t.id===picked);if(t&&t.status!=='cancelled')t.message=(e.status?'请求暂时失败：':'校验失败：')+e.message.slice(0,1000);});await waitForService(Math.max(500,e.retryAfter??1000*2**(requestTask!.attempts[stage]-1)),controller.signal);}
  }}catch(error){if(!controller.signal.aborted){const mark=(s:UserState)=>{const t=s.generationTasks.find(t=>t.id===picked)!;if(!t||t.status==='cancelled')return;t.status=(error as any).uncertain||/连接中断/.test((error as Error).message)?'interrupted':'failed';t.message=(error as Error).message.slice(0,1500);const a=s.articles.find(a=>a.id===t.articleId);if(a?.phases&&a.phases.questions!=='ready')a.phases.questions='failed';};try{await this.update(mark);}catch{mark(this.repo.state);this.changed();}}}finally{this.active.delete(picked);}}
 }
 private async accept(task:GenerationTask,result:any){if(task.stage==='body'){
  const article=normalizeBody(result,{articleId:task.articleId,mode:task.mode,targets:task.targets,groupId:task.groupId,batchId:task.batchId});article.batchId=task.batchId||task.groupId;let saved=false;await this.update(s=>{const t=s.generationTasks.find(t=>t.id===task.id);if(!t||t.status==='cancelled')return;if(!s.articles.some(a=>a.id===article.id)){s.articles.push(article);saved=true;}const g=s.sets.find(g=>g.id===t.groupId);if(g&&t.batchId)g.articleId=article.id;t.stage='questions';t.status='running';t.requestStarted=false;t.message='正文已保存，可立即阅读';});if(saved){this.prepareCache(article);this.bodyReady(article);}
 }else{const article=this.repo.state.articles.find(a=>a.id===task.articleId);if(!article)throw Error('正文尚未保存');const set=normalizeQuestions(result,article,task.mode,article.id+'-reading');await this.update(s=>{const t=s.generationTasks.find(t=>t.id===task.id);if(!t||t.status==='cancelled')return;const a=s.articles.find(a=>a.id===task.articleId)!;if(bodyHash(a)!==set.bodyHash)throw Error('正文版本已改变，题目未保存');if(!a.readingQuestionSetId){s.readingQuestionSets.push(set);a.readingQuestionSetId=set.id;}a.phases||={body:'ready',questions:'ready',translations:a.paragraphs.every(p=>p.zh.trim())?'ready':'idle',meanings:'idle'};a.phases.questions='ready';t.status='completed';t.requestStarted=false;t.message='正文与五题已就绪';});}
 }
}
