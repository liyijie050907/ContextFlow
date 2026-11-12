import {test} from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';
test('concurrent reading requests share the same initial session and recover after expiry',async()=>{
 const b=await build({entryPoints:['src/live-service.ts'],bundle:true,write:false,format:'esm',platform:'node'});
 const {liveAPI}=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
 const previousFetch=globalThis.fetch,previousLocation=globalThis.location;let sessions=0,release,expire=false;const gate=new Promise(r=>release=r),tokens=[];
 globalThis.location={protocol:'https:'};globalThis.fetch=async(path,options)=>{if(path==='/api/session'){sessions++;await gate;return new Response(JSON.stringify({token:'session-'+sessions}));}tokens.push(options.headers['X-ContextFlow-Client']);return new Response(JSON.stringify(expire?{error:'expired'}:{ok:true}),{status:expire?403:200});};
 try{const first=liveAPI('/status'),second=liveAPI('/status');assert.equal(sessions,1);release();await Promise.all([first,second]);assert.deepEqual(tokens,['session-1','session-1']);expire=true;await assert.rejects(()=>liveAPI('/status'),/expired/);expire=false;await liveAPI('/status');assert.equal(sessions,2);assert.equal(tokens.at(-1),'session-2');}finally{globalThis.fetch=previousFetch;if(previousLocation===undefined)delete globalThis.location;else globalThis.location=previousLocation;}
});
