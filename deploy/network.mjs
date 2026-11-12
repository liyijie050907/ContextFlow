// Transport errors deliberately expose codes, never request headers or proxy credentials.
export function transportCodes(error){const found=new Set(),seen=new Set();function visit(e){if(!e||typeof e!=='object'||seen.has(e))return;seen.add(e);if(typeof e.code==='string'&&/^[A-Z0-9_]{2,80}$/.test(e.code))found.add(e.code);visit(e.cause);for(const nested of e.errors||[])visit(nested);}visit(error);return [...found];}
export function friendlyNetworkError(error){
 if(error?.name==='AbortError')return '操作已取消，已有学习内容保留。';
 const codes=transportCodes(error),tag=codes.length?'（'+codes.join(' / ')+'）':'';
 if(codes.some(x=>/CERT|SSL|TLS/.test(x)))return '连接模型服务时证书校验失败'+tag+'。请检查 Windows 系统时间和受信任证书；证书校验仍保持开启。';
 if(codes.some(x=>['ENOTFOUND','EAI_AGAIN'].includes(x)))return '无法解析模型服务或代理的地址'+tag+'。请检查网络和 DNS，然后重试。';
 if(codes.includes('ECONNREFUSED'))return '模型服务或现有代理端口拒绝连接'+tag+'。请确认你平时使用的网络代理已启动，再重新启动生成助手。';
 if(error?.name==='TimeoutError'||codes.some(x=>/TIMEOUT|TIMEDOUT/.test(x)))return '连接模型服务超时'+tag+'。请检查网络及 Windows 中已设置的代理；调整网络后重新启动生成助手。';
 if(codes.length||error?.message==='fetch failed'||error?.message==='terminated')return '与模型服务的连接失败或中断'+tag+'。已有学习内容保留；请检查网络后重试。';
 return null;
}
const preConnect=new Set(['UND_ERR_CONNECT_TIMEOUT','ECONNREFUSED','ENOTFOUND','EAI_AGAIN','ENETUNREACH','EHOSTUNREACH']);
export async function fetchService(url,options={},onRetry=()=>{},settings={}){
 const fetchImpl=settings.fetchImpl||globalThis.fetch,wait=settings.wait||((ms,signal)=>new Promise((resolve,reject)=>{if(signal?.aborted){reject(signal.reason);return;}const finish=()=>{signal?.removeEventListener('abort',abort);resolve();};const timer=setTimeout(finish,ms);const abort=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);reject(signal.reason);};signal?.addEventListener('abort',abort,{once:true});}));
 for(let attempt=1;;attempt++){options.signal?.throwIfAborted();try{return await fetchImpl(url,options);}catch(error){options.signal?.throwIfAborted();const codes=transportCodes(error);const safeToRepeat=codes.length&&codes.every(x=>preConnect.has(x));if(attempt>=3||!safeToRepeat)throw error;onRetry({attempt,next:attempt+1,code:codes.join(' / ')});await wait(800*attempt,options.signal);}}
}
