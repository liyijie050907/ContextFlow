import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));await mkdir(resolve(root,'public'),{recursive:true});
let source=resolve(root,'../index.html');try{await readFile(source);}catch{source=resolve(root,'../ContextFlow.html');}
await writeFile(resolve(root,'public/index.html'),(await readFile(source,'utf8')).replace('<body>','<body data-cf-hosted="cloudflare">'));
await writeFile(resolve(root,'public/_routes.json'),JSON.stringify({version:1,include:['/api/*'],exclude:[]}));
await writeFile(resolve(root,'public/_headers'),'/\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  Content-Security-Policy: default-src \'self\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data:; connect-src \'self\'; frame-ancestors \'none\'; base-uri \'none\'\n  Cache-Control: no-cache\n');
console.log('Cloudflare Pages assets ready: public; Functions: functions/api/[[path]].js');
