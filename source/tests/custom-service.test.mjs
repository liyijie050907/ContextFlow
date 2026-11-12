import {test} from 'node:test';import assert from 'node:assert/strict';
import http from 'node:http';import {spawn} from 'node:child_process';
import {mkdtemp,copyFile,writeFile,readFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import {setTimeout as delay} from 'node:timers/promises';import {build} from 'esbuild';
test('isolated custom services support all learning routes and restore encrypted configuration', {skip:process.platform!=='win32',timeout:60000},async()=>{
 const root=await mkdtemp(join(tmpdir(),'ContextFlow-provider-test-')),source=resolve('../assistant');
 const probe=http.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));const base='http://127.0.0.1:'+port;
 for(const file of ['network.mjs','generation-core.mjs','lookup-policy.mjs','reading-preparation.mjs','providers.mjs'])await copyFile(join(source,file),join(root,file));
 await writeFile(join(root,'server.mjs'),(await readFile(join(source,'server.mjs'),'utf8')).replaceAll('17863',String(port)));
 const built=await build({entryPoints:['src/generation.ts'],bundle:true,format:'esm',platform:'node',write:false});const G=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
 const scenes=[['farmer','planted','orchard','harvest'],['engineer','measured','laboratory','instrument'],['teacher','explained','classroom','lesson'],['traveller','carried','harbour','voyage'],['curator','displayed','gallery','painting']];let protocol='chat-completions',calls=0;
 const upstream=http.createServer(async(req,res)=>{try{
  assert.equal(req.headers.authorization||req.headers['x-api-key']||req.headers['x-goog-api-key'],protocol==='chat-completions'||protocol==='responses'?'Bearer synthetic-provider-key':'synthetic-provider-key');
  if(req.url.endsWith('/models')){res.writeHead(404,{'Content-Type':'application/json'});res.end('{"error":{"message":"No model listing"}}');return;}
  let raw='';for await(const chunk of req)raw+=chunk;const input=JSON.parse(raw);calls++;
  if(protocol==='chat-completions')assert(req.url.endsWith('/chat/completions'));if(protocol==='responses')assert(req.url.endsWith('/responses'));if(protocol==='anthropic')assert(req.url.endsWith('/messages'));if(protocol==='gemini')assert(req.url.includes('/models/vendor-model:streamGenerateContent?alt=sse'));
  const messages=input.messages||input.input||input.contents;const user=messages.at(-1);const text=typeof user.content==='string'?user.content:user.parts?.map(p=>p.text).join('');let value;
  try{value=JSON.parse(text);}catch{}
  const system=String(input.system||input.systemInstruction?.parts?.[0]?.text||messages[0]?.content||'');let answer='模拟中文释义';
  if(value?.articleIndex){const scene=scenes[value.articleIndex-1];answer=JSON.stringify({format:'ContextFlowLearningBundle',version:1,articles:[{id:'model-id',version:'1',title:scene[2]+' observations',subtitle:'Synthetic test only',topic:scene[2],mode:'CET-4',length:'长篇',source:'synthetic-test-only',paragraphs:[{en:value.requiredWords.map(w=>`The ${scene[0]} ${scene[1]} the ${w} near the ${scene[2]} during the ${scene[3]}.`).join(' '),zh:'程序测试占位译文'}],targets:[],questionIds:[]}],questions:[]});}
  else if(value?.entries&&value?.sentences)answer=JSON.stringify({entries:value.entries.map(x=>({id:x.id,meaning:'模拟预缓存词义'})),sentences:value.sentences.map(x=>({id:x.id,zh:'模拟预缓存译文'}))});
  else if(system.includes('exampleZh'))answer=JSON.stringify({lemma:'sample',meaning:'模拟词义',pos:'n.',explanation:'模拟解释',example:'A sample.',exampleZh:'一个样本。'});
  else if(text==='Reply with exactly OK.')answer='OK';
  let events;if(protocol==='chat-completions')events=[{choices:[{index:0,delta:{content:answer},finish_reason:'stop'}]}];
  if(protocol==='responses')events=[{type:'response.output_text.delta',delta:answer},{type:'response.completed',response:{status:'completed'}}];
  if(protocol==='anthropic')events=[{type:'content_block_delta',delta:{type:'text_delta',text:answer}},{type:'message_delta',delta:{stop_reason:'end_turn'}},{type:'message_stop'}];
  if(protocol==='gemini')events=[{candidates:[{content:{parts:[{text:answer}]},finishReason:'STOP'}]}];
  res.writeHead(200,{'Content-Type':'text/event-stream'});res.end(events.map(x=>'data: '+JSON.stringify(x)+'\n\n').join(''));
 }catch(e){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:{message:e.message}}));}});
 await new Promise(r=>upstream.listen(0,'127.0.0.1',r));const upstreamURL='http://127.0.0.1:'+upstream.address().port;let child,token;
 const start=async()=>{child=spawn(process.execPath,[join(root,'server.mjs')],{env:{...process.env,CONTEXTFLOW_DATA_DIR:join(root,'user-data')},windowsHide:true,stdio:'ignore'});for(let i=0;i<100;i++){try{token=(await fetch(base+'/connection',{headers:{Connection:'close'}}).then(r=>r.json())).token;return;}catch{await delay(100);}}throw Error('Isolated server did not start');};
 const stop=async()=>{if(child&&child.exitCode===null){const exited=new Promise(r=>child.once('exit',r));child.kill();await exited;}};
 // Do not reuse sockets across the deliberate kill/restart in this fixture.
 const post=async(path,body={})=>{const response=await fetch(base+path,{method:'POST',headers:{Connection:'close',Origin:base,'Content-Type':'application/json','X-ContextFlow-Token':token},body:JSON.stringify(body)});const text=await response.text();assert.equal(response.status,200,text);return response.headers.get('content-type').includes('ndjson')?text.split('\n').filter(Boolean).map(line=>JSON.parse(line)):JSON.parse(text);};
 try{await start();const loginA=await post('/signin'),loginB=await post('/signin');assert.equal(loginA.url,loginB.url);assert.equal(new URL(loginA.url).hostname,'auth.openai.com');for(protocol of ['chat-completions','responses','anthropic','gemini']){
  const result=await post('/custom-service',{protocol,baseURL:upstreamURL+(protocol==='gemini'?'/v1beta':'/v1'),key:'synthetic-provider-key'});assert(!JSON.stringify(result).includes('synthetic-provider-key'));
  await post('/service-choice',{provider:'custom',model:'vendor-model'});const selected={provider:'custom',model:'vendor-model'};
  const state=await post('/status');assert.equal(state.custom,true);assert.equal(state.preferences.model,'vendor-model');assert(!JSON.stringify(state).includes('synthetic-provider-key'));
  assert.equal((await post('/test-service',selected)).reply,'OK');
  assert.equal((await post('/lookup-fast',{...selected,word:'sample',context:'A sample.'})).at(-1).type,'done');
  assert.equal((await post('/translate-fast',{...selected,text:'A sample.'})).at(-1).type,'done');
  assert.equal((await post('/lookup',{...selected,word:'sample',context:'A sample.'})).meaning,'模拟词义');
  assert.equal((await post('/translate',{...selected,text:'A sample.'})).translation,'模拟中文释义');
  const prepared=await post('/prepare-reading',{...selected,entries:[{id:'w1',word:'sample',context:'A sample.'}],sentences:[{id:'s1',en:'A sample.'}]});assert.equal(prepared.entries[0].meaning,'模拟预缓存词义');
  const request=G.makeGenerationRequest({batchId:'synthetic-test-batch-'+protocol,targets:Array.from({length:10},(_,i)=>({word:'token'+String.fromCharCode(97+i),senseId:'test-sense-'+i,zh:'**测试词义**',en:''})),mode:'CET-4',topic:'多样主题（自动）',length:'按词量自动',difficulty:'中等',includeQuestions:false,recentContexts:[]});

 }
 await stop();await start();const restored=await post('/status');assert.equal(restored.customConfig.protocol,'gemini');assert.equal(restored.preferences.provider,'custom');assert.equal(restored.preferences.model,'vendor-model');assert(!JSON.stringify(restored).includes('synthetic-provider-key'));
 assert(!(await readFile(join(root,'user-data','credentials.dpapi'))).includes(Buffer.from('synthetic-provider-key')));assert.equal(calls,24);
 }finally{await stop();await new Promise(r=>upstream.close(r));}
});
