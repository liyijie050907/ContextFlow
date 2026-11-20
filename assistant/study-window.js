const openerWindow=window.opener,nonce=location.hash.slice(1);
const allow=document.querySelector('#apply'),status=document.querySelector('#status');
const routes=new Set(['/status','/models','/parts-of-speech','/generate-article','/generate-questions','/generation-status','/prepare-reading','/lookup','/lookup-fast','/translate','/translate-fast']);
const requests=new Map();
document.querySelector('#cancel').onclick=()=>window.close();
if(openerWindow&&/^[a-f0-9-]{36}$/i.test(nonce)){
 window.addEventListener('message',function handshake(event){
  if(event.source!==openerWindow||event.origin!=='null'||event.data?.nonce!==nonce||event.data.type!=='cf-study-port'||!event.ports[0])return;
  window.removeEventListener('message',handshake);
  const port=event.ports[0];allow.disabled=false;
  allow.onclick=async()=>{
   allow.disabled=true;
   try{
    const {token}=await (await fetch('/connection')).json();
    port.onmessage=async({data})=>{
     if(data?.cancel){requests.get(data.cancel)?.abort();return;}
     if(!routes.has(data?.path)||typeof data.id!=='string'||requests.has(data.id))return;
     const ctl=new AbortController();requests.set(data.id,ctl);
     try{
      const response=await fetch(data.path,{method:'POST',headers:{'Content-Type':'application/json','X-ContextFlow-Token':token},body:JSON.stringify(data.body),signal:ctl.signal});
      let body=await response.json();
      if(data.path==='/status'&&response.ok){const {chatgpt,api,custom,preferences}=body;body={chatgpt,api,custom,preferences};}
      port.postMessage({id:data.id,status:response.status,body});
     }catch{port.postMessage({id:data.id,status:503,body:{error:'本机服务连接中断，请重试。'}});}
     finally{requests.delete(data.id);}
    };
    port.postMessage({allowed:true});status.textContent='已连接。返回原词表即可继续学习，关闭此窗口会断开连接。';
   }catch{allow.disabled=false;status.textContent='连接失败，请重试。';}
  };
 });
 openerWindow.postMessage({type:'cf-study-ready',nonce},'*');
}
window.addEventListener('pagehide',()=>{for(const request of requests.values())request.abort();});
