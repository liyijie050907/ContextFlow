import {test} from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';
const b=await build({entryPoints:['src/service-response.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {serviceJSON}=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
test('static SPA fallbacks and proxy error pages identify the failing API without exposing HTML',async()=>{
 for(const path of ['/api/session','/api/discover-models'])for(const status of [200,404,502])await assert.rejects(()=>serviceJSON(new Response('<!doctype html><body>private-error-detail</body>',{status}),path),e=>e.message.includes(path)&&e.message.includes('静态托管')&&!e.message.includes('private-error-detail'));
});
test('service JSON accepts valid proxy responses and rejects invalid payloads safely',async()=>{
 assert.deepEqual(await serviceJSON(new Response('{"token":"test"}'),'/api/session'),{token:'test'});
 assert.deepEqual(await serviceJSON(new Response('{"error":"Key 权限不足"}',{status:401}),'/api/models'),{error:'Key 权限不足'});
 for(const text of ['broken-private-detail','null','[]','"text"'])await assert.rejects(()=>serviceJSON(new Response(text),'/api/models'),e=>e.message.includes('/api/models')&&!e.message.includes('private-detail'));
});
