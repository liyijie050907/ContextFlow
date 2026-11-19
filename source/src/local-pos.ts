import type {GenerationWord} from './generation';
export function localParts(words:GenerationWord[],signal:AbortSignal):Promise<{word:string;pos:string}[]>{
  const origin='http://127.0.0.1:17863',nonce=crypto.randomUUID();
  const opened=window.open(origin+'/pos-window#'+nonce,'_blank','popup,width=510,height=520');
  if(!opened)return Promise.reject(Error('请允许打开本机补全窗口，或在本机预览中使用 AI 补全。'));
  const popup:Window=opened;
  return new Promise((resolve,reject)=>{
    const channel=new MessageChannel();let ready=false;
    const timer=window.setTimeout(()=>stop(Error('未连接本机助手。可启动整合包中的本机服务后重试，或直接保存词表。')),8000);
    const watch=window.setInterval(()=>{if(popup.closed)stop(Error('已取消补全'));},300);
    const abort=()=>stop(Error('已取消补全'));
    function stop(error?:Error){
      clearTimeout(timer);clearInterval(watch);window.removeEventListener('message',receive);signal.removeEventListener('abort',abort);
      channel.port1.postMessage({close:true});channel.port1.close();if(!ready)channel.port2.close();popup.close();
      if(error)reject(error);
    }
    const receive=(e:MessageEvent)=>{
      if(ready||e.source!==popup||e.origin!==origin||e.data?.type!=='cf-pos-ready'||e.data.nonce!==nonce)return;
      ready=true;clearTimeout(timer);popup.postMessage({type:'cf-pos-request',nonce,items:words.map(({word,zh})=>({word,zh}))},origin,[channel.port2]);
    };
    channel.port1.onmessage=e=>{
      if(e.data?.cancelled){stop(Error('已取消补全'));return;}
      const items=e.data?.items;
      if(!Array.isArray(items)||items.length!==words.length||items.some((x,i)=>!x||x.word!==words[i].word||typeof x.pos!=='string'||x.pos.length>100)){stop(Error('本机助手返回的词性与词表不匹配'));return;}
      resolve(items);stop();
    };
    window.addEventListener('message',receive);signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
  });
}
