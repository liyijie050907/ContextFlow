import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';import {fileURLToPath} from 'node:url';import {randomBytes} from 'node:crypto';

export function deploymentConfig(original,project,database){
 const production={...original,...original.env?.production};delete production.env;
 const update={pages_build_output_dir:'./public',compatibility_date:production.compatibility_date>='2025-09-01'?production.compatibility_date:'2025-09-01',compatibility_flags:[...new Set([...(production.compatibility_flags||[]),'nodejs_compat'])],d1_databases:[...(production.d1_databases||[]).filter(x=>x.binding!=='CONTEXTFLOW_DB'),{binding:'CONTEXTFLOW_DB',database_name:database.name,database_id:database.uuid}]};
 return {...production,...update,name:project,env:{...original.env,production:{...original.env?.production,...update}}};
}
export async function deployWorkflow(io,projectName='contextflow-bgk'){
 if(!/^[a-z0-9][a-z0-9-]{0,57}$/.test(projectName))throw Error('网站项目名无效');
 let identity;try{identity=JSON.parse(await io.cli(['whoami','--json']));}catch{io.log('请在打开的 Cloudflare 网页登录并允许授权，完成后脚本会继续。');await io.cli(['login'],{interactive:true});identity=JSON.parse(await io.cli(['whoami','--json']));}
 const targetURL='https://'+projectName+'.pages.dev',targetDomain=projectName+'.pages.dev',matches=[];for(const account of identity.accounts||[]){const projects=JSON.parse(await io.cli(['pages','project','list','--json'],{account:account.id}));for(const p of projects){const domains=Array.isArray(p.domains)?p.domains:String(p['Project Domains']||'').split(',').map(x=>x.trim());if(domains.includes(targetDomain))matches.push({...account,projectName:p['Project Name']||p.name});}}
 if(matches.length!==1)throw Error(matches.length?'多个账户存在同名网站，请在 Cloudflare 退出多余账户后重试。':'没有找到原网站 '+projectName+'。请确认登录了创建此网站的 Cloudflare 账户。');
 const account=matches[0].id;projectName=matches[0].projectName;if(!/^[a-f0-9]{32}$/i.test(account)||!/^[a-z0-9][a-z0-9-]{0,57}$/.test(projectName))throw Error('Cloudflare 账户或项目 ID 无效');
 const cli=(args,options={})=>io.cli(args,{...options,account});
 const auth=JSON.parse(await cli(['auth','token','--json']));if(!auth.token)throw Error('请使用 Cloudflare 登录授权或 API Token，当前凭据类型不支持自动配置。');
 const api=(path,options)=>io.api(path,{...options,token:auth.token});
 const projectPath='/accounts/'+account+'/pages/projects/'+projectName,project=await api(projectPath);
 io.log('已找到原网站：'+targetDomain+'，正在自动配置…');
 const original=await io.downloadConfig(projectName,account);
 const effective={...original,...original.env?.production},existing=effective.d1_databases?.find(x=>x.binding==='CONTEXTFLOW_DB');let database;
 if(existing?.database_id)database={uuid:existing.database_id,name:existing.database_name||projectName+'-settings'};
 else{const name=projectName+'-settings';let list=JSON.parse(await cli(['d1','list','--json']));database=list.find(x=>x.name===name);if(!database){await cli(['d1','create',name]);list=JSON.parse(await cli(['d1','list','--json']));database=list.find(x=>x.name===name);}if(!database)throw Error('数据库尚未创建成功，稍后双击脚本重试即可。');}
 const secrets=await cli(['pages','secret','list','--project-name',projectName]);
 if(!/\bCONTEXTFLOW_MASTER_KEY\s*:/.test(secrets)){const master=await io.getMaster(account,projectName);if(!/^[a-f0-9]{64}$/i.test(master))throw Error('本机加密密钥备份无效，请勿继续上传。');await cli(['pages','secret','bulk','--project-name',projectName],{input:JSON.stringify({CONTEXTFLOW_MASTER_KEY:master})});}
 await io.saveConfig(deploymentConfig(original,projectName,database));
 await io.build();
 const branch=project.production_branch||project.source?.config?.production_branch||'main';
 await cli(['pages','deploy','public','--project-name',projectName,'--branch',branch]);
 if(project.source)await api(projectPath,{method:'PATCH',body:{build_config:{...project.build_config,root_dir:'cloudflare',build_command:'npm run build',destination_dir:'public'}}});
 const url=targetURL;await io.verify(url);
 io.log('更新成功：'+url+'\n请在浏览器按 Ctrl+F5 刷新；选择模型 API，填写 Key 并获取模型。');return url;
}

export async function main(){
 const root=dirname(fileURLToPath(import.meta.url)),wrangler=resolve(root,'node_modules/wrangler/bin/wrangler.js'),privateDir=resolve(root,'.deploy-private');
 await mkdir(privateDir,{recursive:true});
 const run=(executable,args,{cwd=root,input,interactive=false,account}={})=>new Promise((resolvePromise,reject)=>{let stdout='';const child=spawn(executable,args,{cwd,windowsHide:true,shell:false,env:{...process.env,NO_COLOR:'1',WRANGLER_SEND_METRICS:'false',WRANGLER_WRITE_LOGS:'false',WRANGLER_LOG_SANITIZE:'true',...(account?{CLOUDFLARE_ACCOUNT_ID:account}:{})},stdio:interactive?'inherit':['pipe','pipe','pipe']});if(!interactive){child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',()=>{});child.stdin.end(input);}child.on('error',()=>reject(Error('启动部署工具失败，请检查网络后重试。')));child.on('close',code=>code===0?resolvePromise(stdout):reject(Error('Cloudflare 操作未完成（'+args.filter(x=>!x.startsWith('--')).slice(0,3).join(' ')+'）。请检查网络、登录权限后重新运行；已有配置会沿用。')));});
 try{await access(wrangler);await access(resolve(root,'node_modules/smol-toml'));}catch{console.log('首次运行正在准备官方部署工具，请稍候…');const npmCli=resolve(dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');await run(process.execPath,[npmCli,'ci','--no-audit','--no-fund'],{interactive:true});}
 const {parse}=await import('smol-toml');
 console.log('ContextFlow 一键更新\n目标：contextflow-bgk.pages.dev\n将自动配置数据库、加密密钥、后台和网页；保留现有学习数据。\n');
 const cli=(args,options)=>run(process.execPath,[wrangler,...args],options);
 return deployWorkflow({cli,log:console.log,
  async api(path,{token,method='GET',body}={}){if(!path.startsWith('/accounts/'))throw Error('API 路径无效');const response=await fetch('https://api.cloudflare.com/client/v4'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(60000)});let value;try{value=await response.json();}catch{throw Error('Cloudflare 返回了无效响应，请检查网络。');}if(!response.ok||!value.success)throw Error('Cloudflare 配置请求失败（HTTP '+response.status+'），请检查账号权限后重试。');return value.result;},
  async downloadConfig(project,account){const cwd=resolve(privateDir,'remote');await mkdir(cwd,{recursive:true});await cli(['pages','download','config',project,'--force'],{cwd,account});return parse(await readFile(resolve(cwd,'wrangler.toml'),'utf8'));},
  async getMaster(account,project){const file=resolve(privateDir,account+'-'+project+'-master.json');try{return JSON.parse(await readFile(file,'utf8')).key;}catch(error){if(error.code!=='ENOENT')throw Error('本机密钥备份读取失败，已停止，避免覆盖原密钥。');const key=randomBytes(32).toString('hex');await writeFile(file,JSON.stringify({key}),{mode:0o600,flag:'wx'});return key;}},
  async saveConfig(config){const file=resolve(root,'wrangler.json');try{const previous=await readFile(file);await writeFile(resolve(privateDir,'previous-wrangler.json'),previous,{mode:0o600});}catch(error){if(error.code!=='ENOENT')throw error;}await writeFile(file,JSON.stringify(config,null,2));},
  async build(){await run(process.execPath,[resolve(root,'build.mjs')]);await cli(['pages','functions','build','--compatibility-date=2025-09-01','--compatibility-flags=nodejs_compat','--outdir=.wrangler/easy-check']);},
  async verify(url){for(let attempt=0;attempt<15;attempt++){try{const r=await fetch(url+'/api/health?check='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(15000)}),v=await r.json();if(v.runtime==='cloudflare-pages'&&v.ready){const session=await fetch(url+'/api/session',{signal:AbortSignal.timeout(15000)});if(session.ok&&typeof (await session.json()).token==='string')return;}}catch{}await new Promise(r=>setTimeout(r,2000));}throw Error('上传完成，但网站后台暂未就绪。请等一分钟后重新运行；脚本不会重置原密钥。');}
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error('\n'+error.message);process.exitCode=1;});
