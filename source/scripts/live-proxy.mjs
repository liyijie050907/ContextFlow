// Same-origin gateway. Credentials stay in the background service, never in the browser.
import {execFile} from 'node:child_process';
import {resolve} from 'node:path';
const service='http://127.0.0.1:17863';let starting;
const allowed=new Set(['/status','/models','/progress','/cancel','/signin','/key','/forget','/translate','/lookup','/lookup-fast','/translate-fast','/prepare-reading','/network-test','/custom-service','/discover-models','/service-choice','/test-service']);
async function ensure(output){try{const health=await fetch(service+'/health',{signal:AbortSignal.timeout(1000)}).then(r=>r.json());if(health.app==='ContextFlow'&&health.inlineReady&&health.lookupReady&&health.translationReady&&health.precacheReady&&health.customApiReady)return;}catch{}
 if(!starting)starting=new Promise((resolveStart,reject)=>execFile('powershell.exe',['-NoProfile','-NonInteractive','-WindowStyle','Hidden','-File',resolve(output,'assistant/launch.ps1'),'-NoBrowser'],{windowsHide:true},(error,stdout,stderr)=>error?reject(Error((stdout+stderr).trim()||'后台生成服务未能启动')):resolveStart())).finally(()=>{starting=undefined;});await starting;
 const health=await fetch(service+'/health').then(r=>r.json());if(!health.inlineReady)throw Error('后台服务版本较旧，请等待当前生成完成后重新启动项目。');}
export async function proxyLiveRequest(req,res,url,{origin,token,output}){
 if(url.pathname==='/api/session'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({token}));return;}
 const endpoint=url.pathname.slice(4);if(!allowed.has(endpoint)||req.method!=='POST'){res.writeHead(404);res.end();return;}
 if(req.headers.origin!==origin||req.headers['x-contextflow-client']!==token||!req.headers['content-type']?.startsWith('application/json')){res.writeHead(403,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'请求来源校验失败，请刷新当前页面。'}));return;}
 let raw='',bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>4*1024*1024)throw Error('请求超过 4MB，请减少本次释义长度。');raw+=chunk;}
 await ensure(output);const connection=await fetch(service+'/connection').then(r=>r.json());const controller=new AbortController();const disconnect=()=>{if(!res.writableEnded)controller.abort();};res.on('close',disconnect);
 try{const upstream=await fetch(service+endpoint,{method:'POST',headers:{Origin:service,'Content-Type':'application/json','X-ContextFlow-Token':connection.token},body:raw||'{}',signal:controller.signal});res.writeHead(upstream.status,{'Content-Type':upstream.headers.get('content-type')||'application/json; charset=utf-8','Cache-Control':'no-store','X-Accel-Buffering':'no'});for await(const chunk of upstream.body||[])res.write(chunk);res.end();}finally{res.off('close',disconnect);}
}
