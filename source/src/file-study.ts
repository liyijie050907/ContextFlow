const origin='http://127.0.0.1:17863';
let popup:Window|null=null, ready:Promise<MessagePort>|undefined;
const pending=new Map<string,(reply?:{status:number;body:unknown})=>void>();
export function fileStudyConnected(){return !!ready&&!!popup&&!popup.closed;}
export function connectFileStudy(){
 if(location.protocol!=='file:'||(ready&&popup&&!popup.closed))return;
 const nonce=crypto.randomUUID();
 popup=window.open(origin+'/study-window#'+nonce,'_blank','popup,width=480,height=380');
 if(!popup)return;
 const child=popup;
 ready=new Promise<MessagePort>((resolve,reject)=>{
  const channel=new MessageChannel();
  const close=()=>{
   clearTimeout(deadline);clearInterval(watch);window.removeEventListener('message',handshake);
   channel.port1.close();channel.port2.close();ready=undefined;popup=null;
   for(const finish of [...pending.values()])finish();
   reject(Error('本机助手未连接，请启动本机服务并重新连接。'));
  };
  const deadline=window.setTimeout(close,12000),watch=window.setInterval(()=>{if(child.closed)close();},400);
  const handshake=(event:MessageEvent)=>{
   if(event.source!==child||event.origin!==origin||event.data?.nonce!==nonce||event.data.type!=='cf-study-ready')return;
   clearTimeout(deadline);window.removeEventListener('message',handshake);
   child.postMessage({type:'cf-study-port',nonce},origin,[channel.port2]);
   channel.port1.onmessage=event=>{
    if(event.data?.allowed===true)resolve(channel.port1);
    else if(event.data?.id)pending.get(event.data.id)?.(event.data);
   };
  };
  window.addEventListener('message',handshake);
 });
 void ready.catch(()=>{});
}
export async function fileStudyFetch(path:string,init:RequestInit){
 if(!ready||!popup||popup.closed)throw Error('请启动本机助手，再点击生成或补全按钮连接。');
 const port=await ready,signal=init.signal,id=crypto.randomUUID();
 signal?.throwIfAborted();
 return new Promise<Response>((resolve,reject)=>{
  function abort(){port.postMessage({cancel:id});pending.delete(id);reject(signal?.reason||Error('已取消'));}
  pending.set(id,reply=>{
   pending.delete(id);signal?.removeEventListener('abort',abort);
   if(reply)resolve(Response.json(reply.body,{status:reply.status}));else reject(Error('本机助手窗口已关闭，可重新连接。'));
  });
  signal?.addEventListener('abort',abort,{once:true});
  port.postMessage({id,path,body:JSON.parse(String(init.body||'{}'))});
 });
}