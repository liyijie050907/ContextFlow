export type ServiceFailure=Error&{status?:number;retryAfter?:number;deliveryUncertain?:boolean};

export function retryAfterMs(header:string|null){
 if(!header)return undefined;
 const seconds=Number(header);
 const ms=Number.isFinite(seconds)?seconds*1000:Date.parse(header)-Date.now();
 return Number.isFinite(ms)?Math.max(0,ms):undefined;
}

export function httpServiceFailure(response:Response,message:string):ServiceFailure{
 return Object.assign(Error(message),{
  status:response.status,retryAfter:retryAfterMs(response.headers.get('Retry-After')),
  deliveryUncertain:response.status>=500&&!response.headers.get('Content-Type')?.includes('application/json')
 });
}

export function waitForService(ms:number,signal?:AbortSignal){
 signal?.throwIfAborted();
 return new Promise<void>((resolve,reject)=>{
  const abort=()=>{clearTimeout(timer);reject(signal?.reason);};
  const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},ms);
  signal?.addEventListener('abort',abort,{once:true});
 });
}

export async function retryTemporaryService<T>(run:()=>Promise<T>,signal?:AbortSignal,canRetry=()=>true):Promise<T>{
 try{return await run();}
 catch(cause){
  const error=cause as ServiceFailure;
  signal?.throwIfAborted();
  const temporary=[429,502,503,504].includes(error.status||0)||error.deliveryUncertain;
  if(!canRetry()||!temporary||(error.retryAfter??0)>30000)throw cause;
  await waitForService(Math.max(500,error.retryAfter??1000),signal);
  return run();
 }
}

// Do not expose raw error pages: proxies can include request details in HTML.
export async function serviceJSON(response:Response,path:string):Promise<any>{
 const text=await response.text();
 if(response.status>=500&&/^\s*</.test(text))throw httpServiceFailure(response,`网站网关暂时不可用（HTTP ${response.status}，${path}）。`);
 if(/^\s*</.test(text))throw Error(`网站后台未正确连接（${path} 返回网页，HTTP ${response.status}）。静态托管只提供阅读页面；Cloudflare 请使用 cloudflare/ 目录部署 Pages Functions，或运行 deploy/ 中的 Node 后台。仅上传网页不能使用 AI 功能。`);
 let value;try{value=JSON.parse(text);}catch{throw httpServiceFailure(response,`网站后台返回了无效 JSON（${path}，HTTP ${response.status}）。`);}
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error(`网站后台返回格式不正确（${path}），请更新前端和后台到相同版本。`);
 return value;
}
