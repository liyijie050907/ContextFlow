import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCustomConfig,publicCustomConfig,providerEndpoint,providerHeaders,providerRequest,consumeProviderResponse,customInference,customModels} from '../../assistant/providers.mjs';
const config=(protocol='chat-completions')=>normalizeCustomConfig({protocol,baseURL:'https://example.invalid/v1',key:'opaque-vendor-key',maxOutputTokens:16000});
const sse=(values)=>new Response(values.map(value=>'data: '+(typeof value==='string'?value:JSON.stringify(value))).join('\n\n'),{headers:{'Content-Type':'text/event-stream'}});
test('custom credentials accept vendor keys and remain bound to the saved address',()=>{
 const c=config();assert.equal(c.key,'opaque-vendor-key');assert(!JSON.stringify(publicCustomConfig(c)).includes(c.key));assert.equal(normalizeCustomConfig({...c,key:''},c).key,c.key);
 assert.throws(()=>normalizeCustomConfig({...c,key:'',baseURL:'https://other.invalid/v1'},c),/重新填写/);
 assert.throws(()=>normalizeCustomConfig({...c,baseURL:'https://user:pass@example.invalid/v1'}));
 assert.throws(()=>normalizeCustomConfig({...c,baseURL:'https://example.invalid/v1?key=secret'}));
 assert.throws(()=>normalizeCustomConfig({...c,baseURL:'http://example.invalid/v1'}));
 assert.equal(normalizeCustomConfig({...c,baseURL:'http://127.0.0.1:11434/v1',key:''}).key,'');
 assert.throws(()=>normalizeCustomConfig({...c,maxOutputTokens:1}));
});
test('OpenCode Go rejects console URLs, uses its model registry and original model IDs',()=>{
 const c={...config(),baseURL:'https://opencode.ai/inference/go/openai/v1'};
 assert.equal(providerEndpoint(c,'models'),'https://opencode.ai/inference/go/v1/models');
 assert.equal(providerEndpoint(c,'inference','kimi-k2.7-code'),'https://opencode.ai/inference/go/openai/v1/chat/completions');
 assert.equal(providerEndpoint({...c,protocol:'anthropic',baseURL:'https://opencode.ai/inference/go/anthropic/v1'},'models'),'https://opencode.ai/inference/go/v1/models');
 assert.equal(providerEndpoint({...c,baseURL:'https://opencode.ai/inference/openai/v1'},'models'),'https://opencode.ai/inference/v1/models');
 assert.throws(()=>normalizeCustomConfig({...c,baseURL:'https://opencode.ai/console/org-example/activity/usage'}),/网页/);
 assert.throws(()=>providerEndpoint({...c,baseURL:'https://opencode.ai/console/org-example/activity/usage'},'inference'),/网页/);
 assert.throws(()=>providerRequest(c,'opencode-go/kimi-k2.7-code',[{role:'user',content:'hello'}]),/前缀/);
});
test('OpenCode uses Bearer authentication across protocols and honest stable client sessions',async()=>{
 for(const protocol of ['chat-completions','responses','anthropic','gemini']){
  const c={...config(protocol),baseURL:'https://opencode.ai/inference/go/openai/v1'},headers=providerHeaders(c,'ses_test-conversation');
  assert.equal(headers.Authorization,'Bearer '+c.key);assert.equal(headers['User-Agent'],'ContextFlow/0.13.1');assert.equal(headers['x-opencode-session'],'ses_test-conversation');assert(!headers['x-api-key']);assert(!headers['x-goog-api-key']);
  assert.equal(providerHeaders(c)['x-opencode-session'],providerHeaders(c)['x-opencode-session']);
 }
 await customInference({...config(),baseURL:'https://opencode.ai/inference/go/openai/v1'},{model:'kimi-k2.7-code',sessionID:'ses_route-test',input:[{role:'user',content:'hello'}]},async(url,options)=>{assert.equal(options.headers['x-opencode-session'],'ses_route-test');return sse(success['chat-completions']);});
});
test('all protocols build their native endpoint, authentication and request format',()=>{
 const input=[{role:'system',content:'Instructions'},{role:'user',content:'Words'}];
 for(const protocol of ['chat-completions','responses','anthropic','gemini']){
  const c=config(protocol),request=providerRequest(c,'vendor-model',input),headers=providerHeaders(c),url=providerEndpoint(c,'inference','vendor-model');
  assert(!('reasoning' in request));assert(!('text' in request));assert.equal(c.maxOutputTokens,16000);
  if(protocol==='chat-completions'){assert(url.endsWith('/v1/chat/completions'));assert.equal(request.messages[0].content,'Instructions');assert.equal(request.max_tokens,16000);assert.equal(headers.Authorization,'Bearer '+c.key);}
  if(protocol==='responses'){assert(url.endsWith('/v1/responses'));assert.equal(request.input.length,2);assert.equal(request.max_output_tokens,16000);}
  if(protocol==='anthropic'){assert(url.endsWith('/v1/messages'));assert.equal(request.system,'Instructions');assert.equal(request.messages.length,1);assert.equal(headers['x-api-key'],c.key);assert.equal(request.max_tokens,16000);}
  if(protocol==='gemini'){assert(url.endsWith('/v1/models/vendor-model:streamGenerateContent?alt=sse'));assert.equal(request.contents[0].parts[0].text,'Words');assert.equal(request.systemInstruction.parts[0].text,'Instructions');assert.equal(headers['x-goog-api-key'],c.key);}
 }
 assert.equal(providerEndpoint({...config(),baseURL:'https://x.invalid/v1/chat/completions'},'inference'),'https://x.invalid/v1/chat/completions');
 assert.equal(providerEndpoint({...config('anthropic'),baseURL:'https://api.anthropic.com'},'inference'),'https://api.anthropic.com/v1/messages');
 assert.equal(providerEndpoint({...config('gemini'),baseURL:'https://x.invalid/v1beta/models/old:generateContent'},'inference','models/new'),'https://x.invalid/v1beta/models/new:streamGenerateContent?alt=sse');
});
const success={
 'chat-completions':[{choices:[{index:0,delta:{reasoning_content:'HIDDEN',content:'因为'},finish_reason:null}]},{choices:[{index:0,delta:{content:'如此'},finish_reason:'stop'}]},'[DONE]'],
 responses:[{type:'response.reasoning.delta',delta:'HIDDEN'},{type:'response.output_text.delta',delta:'因为如此'},{type:'response.completed',response:{status:'completed'}}],
 anthropic:[{type:'content_block_delta',delta:{type:'thinking_delta',thinking:'HIDDEN'}},{type:'content_block_delta',delta:{type:'text_delta',text:'因为如此'}},{type:'message_delta',delta:{stop_reason:'end_turn'}},{type:'message_stop'}],
 gemini:[{candidates:[{content:{parts:[{text:'HIDDEN',thought:true},{text:'因为如此'}]}}]},{candidates:[{finishReason:'STOP'}]}]
};
for(const [protocol,events] of Object.entries(success)){
 test(protocol+' returns complete text with cumulative streaming and no reasoning leaks',async()=>{const deltas=[];assert.equal(await consumeProviderResponse(sse(events),protocol,value=>deltas.push(value)),'因为如此');assert.equal(deltas.at(-1),'因为如此');assert(deltas.every(value=>!value.includes('HIDDEN')));});
 test(protocol+' rejects a truncated response before it can become a cached answer',async()=>{await assert.rejects(()=>consumeProviderResponse(sse(events.slice(0,1)),protocol),/未完整/);});
}
test('token limits, refusals and provider errors cannot be reported as success',async()=>{
 await assert.rejects(()=>consumeProviderResponse(sse([{choices:[{delta:{content:'partial'},finish_reason:'length'}]},'[DONE]']),'chat-completions'),/length/);
 await assert.rejects(()=>consumeProviderResponse(sse([{type:'message_delta',delta:{stop_reason:'max_tokens'}},{type:'message_stop'}]),'anthropic'),/max_tokens/);
 await assert.rejects(()=>consumeProviderResponse(sse([{candidates:[{content:{parts:[{text:'partial'}]},finishReason:'MAX_TOKENS'}]}]),'gemini'),/MAX_TOKENS/);
 await assert.rejects(()=>consumeProviderResponse(sse([{type:'response.output_text.delta',delta:'partial'},{type:'response.incomplete'}]),'responses'),/未完整/);
 await assert.rejects(()=>consumeProviderResponse(sse([{error:{message:'echo opaque-vendor-key'}}]),'chat-completions',()=>{},'opaque-vendor-key'),e=>!e.message.includes('opaque-vendor-key'));
});
test('JSON fallback and arbitrary split UTF-8 SSE retain all content',async()=>{
 const json=new Response(JSON.stringify({choices:[{message:{content:'完成'},finish_reason:'stop'}]}),{headers:{'Content-Type':'application/json'}});assert.equal(await consumeProviderResponse(json,'chat-completions'),'完成');
 const bytes=new TextEncoder().encode(await sse(success.anthropic).text());const response=new Response(new ReadableStream({start(controller){for(let i=0;i<bytes.length;i+=2)controller.enqueue(bytes.slice(i,i+2));controller.close();}}));assert.equal(await consumeProviderResponse(response,'anthropic'),'因为如此');
});
test('custom network requests use the configured host and never forward secrets through redirects',async()=>{
 const c=config();const value=await customInference(c,{model:'my-model',input:[{role:'user',content:'word'}]},async(url,options)=>{assert.equal(url,'https://example.invalid/v1/chat/completions');assert.equal(options.headers.Authorization,'Bearer '+c.key);assert.equal(options.redirect,'error');return sse(success['chat-completions']);});assert.equal(value,'因为如此');
 await assert.rejects(()=>customModels(c,async()=>new Response('{"error":{"message":"echo opaque-vendor-key"}}',{status:403,headers:{'Content-Type':'application/json'}})),e=>e.message.includes('HTTP 403')&&!e.message.includes(c.key));
});
