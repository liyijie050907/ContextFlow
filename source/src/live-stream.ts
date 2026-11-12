export async function consumeLiveStream<T>(response:Response,onDelta:(text:string)=>void):Promise<T>{
 if(!response.body)throw Error('查询连接未返回内容');const reader=response.body.getReader(),decoder=new TextDecoder();let pending='',result:T|undefined;
 const consume=(line:string)=>{if(!line.trim())return;const event=JSON.parse(line);if((event.type==='meaning'||event.type==='translation'||event.type==='details')&&typeof event.text==='string'){if(event.text.length>24000)throw Error('返回内容过长，请缩短选段后重试');onDelta(event.text);}if(event.type==='error')throw Error(event.message||'查询中断，请重试');if(event.type==='done'){if(!event.result||typeof event.result!=='object')throw Error('查询未返回有效结果');result=event.result as T;}};
 try{for(;;){const {value,done}=await reader.read();if(done)break;pending+=decoder.decode(value,{stream:true});if(pending.length>100000)throw Error('返回内容超出限制');const lines=pending.split('\n');pending=lines.pop()||'';for(const line of lines)consume(line);}pending+=decoder.decode();if(pending.trim())consume(pending);}finally{reader.releaseLock();}
 if(!result)throw Error('查询未完整完成，请重试');return result;
}
