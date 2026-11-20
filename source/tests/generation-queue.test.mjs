import {test} from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';
const result=await build({stdin:{contents:"export * from './src/domain';export * from './src/generation-queue';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',write:false,plugins:[{name:'mock-service',setup(b){b.onLoad({filter:/live-service\.ts$/},()=>({contents:"export const generationModelChoice=async()=>({provider:'custom',model:'fixture'});export const liveAPI=(path,body,signal)=>globalThis.__queueAPI(path,body,signal);",loader:'ts'}))}}]});
const C=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
globalThis.document=new EventTarget();
const makeState=(count=21)=>{const state=C.initialState('test');state.sets.push({id:'fixture-list',name:'fixture',source:'fixture',updatedAt:new Date().toISOString(),targets:Array.from({length:count},(_,i)=>({word:'word'+String.fromCharCode(97+i),senseId:'fixture-'+i,zh:'个人释义'}))});return state;};
const generate=(queue,repo,mode,count=21)=>queue.vocabulary('fixture-list',repo.state.sets[0].targets.slice(0,count),mode);
function repository(state,failBodySave=false){let chain=Promise.resolve();return {state,async refresh(){},commit(fn){const task=chain.then(()=>{const draft=structuredClone(this.state);fn(draft);C.validateState(draft);if(failBodySave&&draft.articles.length>this.state.articles.length){failBodySave=false;throw Error('固定测试：磁盘写入失败');}this.state=draft;});chain=task.catch(()=>{});return task;}};}
const article=body=>({title:'A community learns',paragraphs:[{en:body.targets.map(t=>'We discussed '+t.word+' together.').join(' ')+' '+('People considered the situation carefully and worked towards a useful shared understanding. '.repeat(9)),zh:''}]});
const questions=()=>Array.from({length:5},(_,i)=>({type:['main-idea','detail','inference','attitude','context'][i],prompt:'What does idea '+(i+1)+' suggest?',options:['Community','Music','Travel','Weather'],answer:0,explanation:'原文中的社区合作情境提供了依据。'}));
async function until(fn){const deadline=Date.now()+10000;while(!fn()){if(Date.now()>deadline)throw Error('Queue did not settle');await new Promise(r=>setTimeout(r,5));}}
test('two workers save bodies before questions, retain stage separation and never regenerate completed groups',async()=>{const repo=repository(makeState());let active=0,max=0,calls=0;globalThis.__queueAPI=async(path,b)=>{calls++;active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,10));active--;return {status:'done',result:path.includes('article')?{article:article(b)}:{questions:questions()}};};const readable=[];const queue=new C.GenerationQueue(repo,()=>{},a=>{assert.equal(repo.state.articles.find(x=>x.id===a.id).paragraphs[0].zh,'');assert(!repo.state.articles.find(x=>x.id===a.id).readingQuestionSetId);readable.push(a.id)});await generate(queue,repo,'IELTS');await until(()=>repo.state.generationTasks.every(t=>t.status==='completed'));assert.equal(max,2);assert.equal(calls,4);assert.equal(readable.length,2);await generate(queue,repo,'IELTS');assert.equal(calls,4);assert(repo.state.articles.every(a=>a.mode==='IELTS'));});
test('save failure uses the completed receipt on explicit recovery instead of generating another body',async()=>{const state=makeState(1);const repo=repository(state,true),receipts=new Map();let bodies=0;globalThis.__queueAPI=async(path,b)=>{if(path.includes('status'))return receipts.get(b.requestId)||{status:'unknown'};const r={status:'done',result:path.includes('article')?{article:(bodies++,article(b))}:{questions:questions()}};receipts.set(b.requestId,r);return r;};const queue=new C.GenerationQueue(repo,()=>{},()=>{});await generate(queue,repo,'IELTS');await until(()=>repo.state.generationTasks[0].status==='interrupted');assert.equal(bodies,1);assert.equal(repo.state.articles.length,0);await queue.resume(repo.state.generationTasks[0].id);await until(()=>repo.state.generationTasks[0].status==='completed');assert.equal(bodies,1);assert.equal(repo.state.articles.length,1);});
test('per-stage finite retries stop after three failed calls',async()=>{const state=makeState();const repo=repository(state);let calls=0;globalThis.__queueAPI=async()=>{calls++;return {status:'failed',message:'固定格式错误',httpStatus:429,retryAfter:1};};const queue=new C.GenerationQueue(repo,()=>{},()=>{});await generate(queue,repo,'CET-4',20);await until(()=>repo.state.generationTasks[0].status==='failed');assert.equal(calls,3);assert.equal(repo.state.articles.length,0);});
test('explicit cancellation keeps a saved body and rejects late question writes',async()=>{const repo=repository(makeState());let waiting=false,release;globalThis.__queueAPI=async(path,b,signal)=>{if(path.includes('status'))return {status:'cancelled'};if(path.includes('article'))return {status:'done',result:{article:article(b)}};waiting=true;await new Promise(r=>release=r);return {status:'done',result:{questions:questions()}};};const queue=new C.GenerationQueue(repo,()=>{},()=>{});await generate(queue,repo,'CET-6',20);await until(()=>waiting);await queue.cancel(repo.state.generationTasks[0].id);release();await new Promise(r=>setTimeout(r,30));assert.equal(repo.state.generationTasks[0].status,'cancelled');assert.equal(repo.state.articles.length,1);assert.equal(repo.state.readingQuestionSets.length,0);});
test('generation checks the original receipt after a gateway 503 before making another request',async()=>{
 const repo=repository(makeState());
 let receipt,bodies=0,checks=0;
 globalThis.__queueAPI=async(path,body)=>{
  if(path==='/generate-article'){
   bodies++;receipt={id:body.requestId,article:article(body)};
   throw Object.assign(Error('测试网站网关 503'),{status:503,deliveryUncertain:true});
  }
  if(path==='/generation-status'){
   checks++;assert.equal(body.requestId,receipt.id);
   return {status:'done',result:{article:receipt.article}};
  }
  return {status:'done',result:{questions:questions()}};
 };
 const queue=new C.GenerationQueue(repo,()=>{},()=>{});
 await generate(queue,repo,'CET-4',20);
 await until(()=>repo.state.generationTasks[0].status==='completed');
 assert.equal(bodies,1);
 assert.equal(checks,1);
 assert.equal(repo.state.articles.length,1);
});
