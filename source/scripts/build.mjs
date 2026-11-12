import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const output=resolve(root,'..');
await build({entryPoints:[resolve(root,'src/generation.ts')],bundle:true,outfile:resolve(output,'assistant/generation-core.mjs'),format:'esm',platform:'node',target:'node24',legalComments:'inline'});
const result=await build({entryPoints:[resolve(root,'src/app.ts')],bundle:true,write:false,format:'iife',target:'es2022',minify:true,legalComments:'inline'});
const css=await readFile(resolve(root,'src/style.css'),'utf8');
const dictionary=JSON.parse(await readFile(resolve(output,'data/dictionary.json'),'utf8'));
for(const row of JSON.parse(await readFile(resolve(root,'scripts/phrase-supplements.json'),'utf8'))){if(!dictionary.some(x=>x.id===row.id))dictionary.push(row);}
const data=JSON.stringify(dictionary);await writeFile(resolve(output,'data/dictionary.json'),data);
const metadata=JSON.parse(await readFile(resolve(output,'data/manifest.json'),'utf8'));metadata.headwords=dictionary.length;await writeFile(resolve(output,'data/manifest.json'),JSON.stringify(metadata));
const content=await readFile(resolve(output,'data/content.json'),'utf8');
const manifest=await readFile(resolve(output,'data/manifest.json'),'utf8');
const embedded=JSON.stringify({dictionary:JSON.parse(data),content:{articles:[],questions:[],forms:JSON.parse(content).forms},manifest:JSON.parse(manifest)}).replace(/</g,'\\u003c');
const js=result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>ContextFlow · 语境流</title><style>${css}</style></head><body><a class="skip" href="#main">跳到正文</a><div id="app"><p>正在打开语境流…</p></div><div id="overlay"></div><div id="toast" role="status" aria-live="polite"></div><script id="embedded" type="application/json">${embedded}</script><script>${js}</script></body></html>`;
await mkdir(output,{recursive:true});await writeFile(resolve(output,'ContextFlow.html'),html);console.log(`Built ${Buffer.byteLength(html)} bytes → ContextFlow.html`);
