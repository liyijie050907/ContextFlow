// Development-only preview. Keeps the offline build and learning data untouched.
import {context} from 'esbuild';
import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {watch} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {proxyLiveRequest} from './live-proxy.mjs';
import {execFile} from 'node:child_process';
import {readdir} from 'node:fs/promises';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),output=resolve(root,'..');
const host='127.0.0.1',port=Number(process.env.CONTEXTFLOW_DEV_PORT||5173),origin=`http://${host}:${port}`;
const clients=new Set(),token=randomBytes(24).toString('hex');let javascript='',html='',css='',revision=0,lastError='',building=false;const watchers=[];
let checksRunning=false,checksPending=false;
async function checkCode(){if(checksRunning){checksPending=true;return;}checksRunning=true;const checkedRevision=revision;const run=(args)=>new Promise(resolveRun=>execFile(process.execPath,args,{cwd:root,windowsHide:true,maxBuffer:1024*1024},(error,stdout,stderr)=>resolveRun({passed:!error,output:(stdout+stderr).trim()})));try{const tests=(await readdir(resolve(root,'tests'))).filter(name=>name.endsWith('.test.mjs')).map(name=>'tests/'+name);const [types,unit]=await Promise.all([run(['node_modules/typescript/bin/tsc','--noEmit']),run(['--test',...tests])]);await mkdir(resolve(output,'preview'),{recursive:true});await writeFile(resolve(output,'preview/latest-checks.json'),JSON.stringify({revision:checkedRevision,types,unit,checkedAt:new Date().toISOString()},null,2));broadcast('checks',{passed:types.passed&&unit.passed});console.log(`[preview checks] TypeScript ${types.passed?'passed':'failed'}; tests ${unit.passed?'passed':'failed'}`);}finally{checksRunning=false;if(checksPending){checksPending=false;void checkCode();}}}
const componentRules=[
 ['.sidebar','AppSidebar','render'],['.sidebar nav','MainNavigation','render'],['.topbar','TopBar','render'],['#main','PageContent','render'],
 ['.page-heading','PageHeading','heading'],['.reading-controls','ReadingFilters','renderReading'],['.reading-paper','ReadingArticle','renderReading'],['.paragraph','ReadingParagraph','renderReading'],['.learning-rail','TargetWords','renderReading'],['.generated-navigation','GeneratedArticles','generatedArticleNavigation'],
 ['.word-workspace','MyWordLists','renderWords'],['.notebook-item','NotebookItem','renderNotebook'],['.settings-section','SettingsSection','renderSettings'],['.word-card','WordCard','showLookup'],['.modal','Dialog','modal'],['.live-lookup','LiveLookup','showLiveLookup'],['#reading-cache-status','ReadingCacheQueue','prepareReading'],['[data-component=ArticleImport]','ArticleImport','importArticle'],['.app-footer','AppFooter','render'],['#toast','Notification','announce']
];
async function sourceMap(){const source=await readFile(resolve(root,'src/app.ts'),'utf8'),live=await readFile(resolve(root,'src/live-service.ts'),'utf8'),preparation=await readFile(resolve(root,'src/reading-preparation.ts'),'utf8');return componentRules.map(([selector,name,fn])=>{const isLive=fn==='showLiveGeneration'||fn==='showLiveLookup';const isPreparation=fn==='prepareReading';const lines=(isPreparation?preparation:isLive?live:source).split('\n');return {selector,name,file:isPreparation?'src/reading-preparation.ts':isLive?'src/live-service.ts':'src/app.ts',line:Math.max(1,lines.findIndex(line=>line.includes(`function ${fn}(`))+1)};});}
function broadcast(type,extra={}){revision++;for(const res of clients)res.write(`data: ${JSON.stringify({type,revision,...extra})}\n\n`);}
async function page(){
 const dictionary=JSON.parse(await readFile(resolve(output,'data/dictionary.json'),'utf8'));
 for(const row of JSON.parse(await readFile(resolve(root,'scripts/phrase-supplements.json'),'utf8')))if(!dictionary.some(x=>x.id===row.id))dictionary.push(row);
 const embedded=JSON.stringify({dictionary,content:{articles:[],questions:[],forms:JSON.parse(await readFile(resolve(output,'data/content.json'),'utf8')).forms},manifest:JSON.parse(await readFile(resolve(output,'data/manifest.json'),'utf8'))}).replace(/</g,'\\u003c');
 html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>ContextFlow · 开发预览</title><link rel="stylesheet" href="/style.css"></head><body><a class="skip" href="#main">跳到正文</a><div id="app"><p>正在打开语境流…</p></div><div id="overlay"></div><div id="toast" role="status" aria-live="polite"></div><script id="embedded" type="application/json">${embedded}</script><script src="/app.js"></script><script type="module" src="/__dev/client.js"></script></body></html>`;
}
function send(res,status,type,body){res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);}
const server=http.createServer(async(req,res)=>{try{
 if(req.headers.host!==`${host}:${port}`){send(res,403,'text/plain','Invalid local preview host');return;}
 const url=new URL(req.url,origin);
 if(url.pathname.startsWith('/api/')){try{await proxyLiveRequest(req,res,url,{origin,token,output});}catch(e){if(res.headersSent)res.end();else send(res,503,'application/json',JSON.stringify({error:e.message}));}return;}
 if(req.method==='POST'&&['/__dev/selection','/__dev/audit'].includes(url.pathname)){
  if(req.headers.origin!==origin||req.headers['x-contextflow-dev']!==token){send(res,403,'text/plain','Invalid preview session');return;}
  let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>64000)throw Error('Selection too large');}
  const selection=JSON.parse(raw);const isSelection=url.pathname==='/__dev/selection';if(isSelection&&(typeof selection.selector!=='string'||selection.selector.length>4000))throw Error('Invalid selection');
  const path=resolve(output,'preview',isSelection?'selection.json':'latest-audit.json');await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify({...selection,preview:origin,recordedAt:new Date().toISOString()},null,2));send(res,200,'application/json',JSON.stringify({ok:true}));return;
 }
 if(req.method!=='GET'){send(res,405,'text/plain','Method not allowed');return;}
 if(url.pathname==='/__dev/events'){
  res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write(`data: ${JSON.stringify({type:'connected',revision,boot:token.slice(0,8)})}\n\n`);clients.add(res);req.on('close',()=>clients.delete(res));return;
 }
 if(url.pathname==='/__dev/status'){send(res,200,'application/json',JSON.stringify({app:'ContextFlow-preview',root,origin,revision,building,error:lastError,hotCss:true,liveReload:true}));return;}
 if(url.pathname==='/__dev/source-map'){send(res,200,'application/json',JSON.stringify(await sourceMap()));return;}
 if(url.pathname==='/__dev/client.js'){send(res,200,'text/javascript',`window.__CONTEXTFLOW_DEV__=${JSON.stringify({origin,token,revision,boot:token.slice(0,8)})};\n`+await readFile(resolve(root,'scripts/preview-client.js'),'utf8'));return;}
 if(url.pathname==='/app.js'){send(res,200,'text/javascript',javascript);return;}
 if(url.pathname==='/style.css'){send(res,200,'text/css',css);return;}
 if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
 if(url.pathname==='/'){send(res,200,'text/html',html||'正在构建，请稍候刷新。');return;}
 send(res,404,'text/plain','Not found');
 }catch(error){send(res,500,'text/plain',String(error.message));}});
const buildContext=await context({entryPoints:[resolve(root,'src/app.ts')],bundle:true,write:false,format:'iife',target:'es2022',sourcemap:'inline',sourcesContent:true,plugins:[{name:'preview-update',setup(build){build.onStart(()=>{building=true;});build.onEnd(async result=>{building=false;if(result.errors.length){lastError=result.errors.map(x=>x.text).join('\n');broadcast('error',{message:lastError});return;}try{javascript=result.outputFiles[0].text;css=await readFile(resolve(root,'src/style.css'),'utf8');await page();lastError='';broadcast('reload');void checkCode();console.log(`[preview] compiled revision ${revision}`);}catch(e){lastError=e.message;broadcast('error',{message:lastError});}});}}]});
await buildContext.rebuild();await buildContext.watch();
let cssTimer,dataTimer;
watchers.push(watch(resolve(root,'src/style.css'),()=>{clearTimeout(cssTimer);cssTimer=setTimeout(async()=>{try{css=await readFile(resolve(root,'src/style.css'),'utf8');broadcast('style');}catch(e){broadcast('error',{message:e.message});}},80);}));
for(const file of [resolve(output,'data/dictionary.json'),resolve(output,'data/content.json'),resolve(output,'data/manifest.json'),resolve(root,'scripts/phrase-supplements.json')])watchers.push(watch(file,()=>{clearTimeout(dataTimer);dataTimer=setTimeout(async()=>{try{await page();broadcast('reload');}catch(e){broadcast('error',{message:e.message});}},100);}));
const heartbeat=setInterval(()=>{for(const res of clients)res.write(': heartbeat\n\n');},15000);
server.listen(port,host,()=>console.log(`ContextFlow preview ready: ${origin}\nCSS hot replacement + TypeScript incremental reload. Alt+Shift+A selects an element; Esc exits.`));
server.on('error',e=>{console.error(e.message);process.exitCode=1;});
async function shutdown(){clearInterval(heartbeat);for(const watcher of watchers)watcher.close();for(const res of clients)res.end();await buildContext.dispose();server.close();}
process.on('SIGINT',()=>void shutdown());process.on('SIGTERM',()=>void shutdown());
