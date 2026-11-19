// The file window receives only the tags for this one confirmed batch.
const statusLine=document.getElementById('status'),apply=document.getElementById('apply');
const nonce=location.hash.slice(1),source=window.opener;
const cancel=new AbortController();
let port,items;
function finish(value){port?.postMessage(value);}
document.getElementById('cancel').onclick=()=>{cancel.abort();finish({cancelled:true});window.close();};
window.addEventListener('pagehide',()=>cancel.abort(),{once:true});
if(source&&/^[a-z0-9-]{36}$/i.test(nonce)){
  window.addEventListener('message',function receive(e){
    if(e.source!==source||e.origin!=='null'||e.data?.type!=='cf-pos-request'||e.data.nonce!==nonce||!e.ports[0])return;
    if(!Array.isArray(e.data.items)||!e.data.items.length||e.data.items.length>200||e.data.items.some(x=>!x||typeof x.word!=='string'||x.word.length>100||typeof x.zh!=='string'||x.zh.length>10000))return;
    window.removeEventListener('message',receive);port=e.ports[0];items=e.data.items;
    port.onmessage=e=>{if(e.data?.close){cancel.abort();window.close();}};
    for(const item of items){const li=document.createElement('li'),en=document.createElement('strong'),zh=document.createElement('span');en.textContent=item.word;zh.textContent=item.zh;li.append(en,zh);document.querySelector('ul').append(li);}
    statusLine.textContent='将把以下 '+items.length+' 个词条的英文和释义发送给已连接的模型。';apply.disabled=false;
  });
  source.postMessage({type:'cf-pos-ready',nonce},'*');
}else statusLine.textContent='请从本地词表中点击「AI 补全词性」。';
apply.onclick=async()=>{
  apply.disabled=true;statusLine.textContent='正在连接模型…';
  try{
    const token=(await (await fetch('/connection',{signal:cancel.signal})).json()).token;
    async function post(url,body){
      const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-ContextFlow-Token':token},body:JSON.stringify(body),signal:cancel.signal});
      const value=await res.json();if(!res.ok)throw Error(value.error||'补全失败，请重试');return value;
    }
    const state=await post('/status',{}),provider=state.preferences?.provider||(state.chatgpt?'chatgpt':'');
    if(!provider)throw Error('请在 ContextFlow 本机版的设置中连接模型，完成后可在这里重试。');
    let model=state.preferences?.model;
    if(!model)model=(await post('/models',{provider})).models?.[0]?.id;
    if(!model)throw Error('请先在设置中选择模型');
    const result=[];
    for(let i=0;i<items.length;i+=32){
      statusLine.textContent='正在补全 '+(i+1)+'–'+Math.min(i+32,items.length)+' / '+items.length;
      const batch=await post('/parts-of-speech',{provider,model,items:items.slice(i,i+32)});
      result.push(...batch.items);
    }
    finish({items:result});
    statusLine.textContent='词性已返回词表。';
  }catch(e){if(!cancel.signal.aborted){statusLine.textContent=e.message;apply.disabled=false;}}
};
