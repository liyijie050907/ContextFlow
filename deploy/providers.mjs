// Text adapters for user-configured services. No keys are returned to the browser.
import {fetchService} from './network.mjs';
import {randomUUID} from 'node:crypto';
const fallbackSession='ses_'+randomUUID();
const isOpenCode=url=>url.hostname==='opencode.ai';
export const protocols=['chat-completions','responses','anthropic','gemini'];
const localHost=host=>host==='localhost'||host==='::1'||host==='[::1]'||/^127\./.test(host)||/^10\./.test(host)||/^192\.168\./.test(host)||/^172\.(?:1[6-9]|2\d|3[01])\./.test(host);
export function normalizeCustomConfig(input,previous){
 if(!input||!protocols.includes(input.protocol))throw Error('请选择支持的 API 协议');
 let url;try{url=new URL(String(input.baseURL||'').trim());}catch{throw Error('请输入完整的 API 地址，例如 https://服务商地址/v1');}
 if(url.username||url.password||url.hash||url.href.length>2000)throw Error('API 地址不能包含用户名、密码或片段标识');
 if(isOpenCode(url)&&!/^\/(?:inference|zen)(?:\/|$)/.test(url.pathname))throw Error('这里填的是 OpenCode 网页，不是 API 接口。Go 的兼容接口地址为 https://opencode.ai/inference/go/openai/v1；请重新填写此地址对应的 API Key。');
 if(url.protocol!=='https:'&&!(url.protocol==='http:'&&localHost(url.hostname)))throw Error('远程 API 请使用 HTTPS；本机或局域网服务可以使用 HTTP');
 if([...url.searchParams.keys()].some(key=>/^(key|api[_-]?key|access_token|token)$/i.test(key)))throw Error('请把密钥填写在 API Key 栏，不要放在地址里');
 url.pathname=url.pathname.replace(/\/+$/,'')||'/';const baseURL=url.href.replace(/\/$/,'');
 if(typeof input.key!=='string'||input.key.length>4096||/[\r\n]/.test(input.key))throw Error('API Key 格式无效');
 let key=input.key.trim();if(!key&&previous?.key){if(previous.baseURL!==baseURL)throw Error('更换 API 地址时，请重新填写该服务对应的密钥');key=previous.key;}
 if(!key&&!localHost(url.hostname))throw Error('请填写此服务的 API Key');
 const maxOutputTokens=Number(input.maxOutputTokens||8192);if(!Number.isInteger(maxOutputTokens)||maxOutputTokens<256||maxOutputTokens>131072)throw Error('最大输出 Token 必须为 256–131072 的整数');
 const apiVersion=String(input.apiVersion||'2026-10-21').trim();if(!/^\d{4}-\d{2}-\d{2}$/.test(apiVersion))throw Error('Anthropic-Version 格式应为 YYYY-MM-DD');
 return {baseURL,protocol:input.protocol,key,maxOutputTokens,apiVersion};
}
export function publicCustomConfig(config){if(!config)return;const {baseURL,protocol,maxOutputTokens,apiVersion}=config;return {baseURL,protocol,maxOutputTokens,apiVersion,hasKey:!!config.key};}
export function providerEndpoint(config,kind,model=''){
 const url=new URL(config.baseURL);let path=url.pathname.replace(/\/+$/,'');
 if(isOpenCode(url)&&!/^\/(?:inference|zen)(?:\/|$)/.test(path))throw Error('OpenCode 控制台网页不能用作 API，Go 兼容接口地址为 https://opencode.ai/inference/go/openai/v1');
 if(isOpenCode(url)&&kind==='models'&&/^\/inference(?:\/|$)/.test(path)){url.pathname=/^\/inference\/go(?:\/|$)/.test(path)?'/inference/go/v1/models':'/inference/v1/models';return url.href;}
 if(config.protocol==='gemini'){
  path=path.replace(/\/models(?:\/[^/]+(?::(?:streamGenerateContent|generateContent))?)?$/,'');if(!path)path='/v1beta';
  url.pathname=kind==='models'?path+'/models':path+'/models/'+encodeURIComponent(model.replace(/^models\//,''))+':streamGenerateContent';if(kind!=='models')url.searchParams.set('alt','sse');else url.searchParams.delete('alt');
 }else{path=path.replace(/\/(?:chat\/completions|responses|messages|models)$/,'');if(!path&&config.protocol==='anthropic')path='/v1';url.pathname=path+(kind==='models'?'/models':config.protocol==='anthropic'?'/messages':config.protocol==='responses'?'/responses':'/chat/completions');}
 return url.href;
}
export function providerHeaders(config,sessionID=fallbackSession){const headers={'Content-Type':'application/json'};if(isOpenCode(new URL(config.baseURL))){if(config.key)headers.Authorization='Bearer '+config.key;headers['User-Agent']='ContextFlow/0.13.1';headers['x-opencode-session']=sessionID;return headers;}if(config.protocol==='anthropic'){if(config.key)headers['x-api-key']=config.key;headers['anthropic-version']=config.apiVersion||'2026-10-21';}else if(config.protocol==='gemini'){if(config.key)headers['x-goog-api-key']=config.key;}else if(config.key)headers.Authorization='Bearer '+config.key;return headers;}
function text(value){if(typeof value==='string')return value;if(Array.isArray(value))return value.filter(part=>!part.thought).map(part=>typeof part==='string'?part:part.text||'').join('');return '';}
export function providerRequest(config,model,input){
 if(typeof model!=='string'||!model.trim()||model.length>256)throw Error('请填写服务商提供的模型 ID');
 if(isOpenCode(new URL(config.baseURL))&&/^opencode(?:-go)?\//.test(model))throw Error('OpenCode API 的模型 ID 不加 opencode-go/ 或 opencode/ 前缀，请填写原始模型 ID。');
 const messages=input.map(item=>({role:item.role||'user',content:text(item.content)}));const system=messages.filter(m=>m.role==='system'||m.role==='developer').map(m=>m.content).join('\n');const conversation=messages.filter(m=>m.role!=='system'&&m.role!=='developer');
 if(config.protocol==='responses')return {model,input:messages,store:false,stream:true,max_output_tokens:config.maxOutputTokens||8192};
 if(config.protocol==='chat-completions'){const tokenField=/^(?:gpt-[56](?:[.\-]|$)|o[134](?:-|$))/.test(model)?'max_completion_tokens':'max_tokens';return {model,messages,stream:true,[tokenField]:config.maxOutputTokens||8192};}
 if(config.protocol==='anthropic')return {model,max_tokens:config.maxOutputTokens||8192,...(system?{system}:{}),messages:conversation.map(m=>({role:m.role==='assistant'?'assistant':'user',content:m.content})),stream:true};
 return {...(system?{systemInstruction:{parts:[{text:system}]}}:{}),contents:conversation.map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content}]})),generationConfig:{maxOutputTokens:config.maxOutputTokens||8192}};
}
function redact(message,key){if(key&&key.length<6)return '服务返回错误，请检查接口配置';let value=String(message||'').replace(/(?:Bearer\s+|sk-)[^\s"']+/gi,'[已隐藏]');if(key?.length>=6)value=value.split(key).join('[已隐藏]');return value.replace(/[\r\n]+/g,' ').slice(0,300);}
async function responseError(response,key){let value;try{value=await response.json();}catch{}const code=String(value?.error?.code||value?.error?.type||'request_failed').replace(/[^a-zA-Z0-9_.-]/g,'').slice(0,80);const detail=key&&key.length<6?'':redact(value?.error?.message||value?.message,key);throw Error(`自定义服务请求失败（HTTP ${response.status}，${code}）${detail?'：'+detail:''}`);}
export async function consumeProviderResponse(response,protocol,onDelta=()=>{},key=''){
 if(!response.ok)return responseError(response,key);
 let result='',completed=false,failed='',anthropicReason='';
 const append=value=>{const content=text(value);if(content){result+=content;onDelta(result);}};
 const event=value=>{
  if(value?.error||value?.type==='error'){failed=redact(value?.error?.message||value?.message||'服务返回错误',key);return;}
  if(protocol==='chat-completions'){
   const choice=value?.choices?.find(x=>x.index===0)||value?.choices?.[0];if(!choice)return;if(choice.message){append(choice.message.content);if(choice.message.refusal)failed='服务拒绝了本次请求';}else append(choice.delta?.content);
   if(choice.finish_reason){if(choice.finish_reason==='stop')completed=true;else failed='输出未完整完成（'+String(choice.finish_reason).slice(0,80)+'），请检查输出 Token 上限或模型能力';}
  }else if(protocol==='anthropic'){
   if(value.type==='content_block_start'&&value.content_block?.type==='text')append(value.content_block.text);
   if(value.type==='content_block_delta'&&value.delta?.type==='text_delta')append(value.delta.text);
   const reason=value.delta?.stop_reason||value.stop_reason;if(reason){anthropicReason=reason;if(!['end_turn','stop_sequence'].includes(reason))failed='输出未完整完成（'+String(reason).slice(0,80)+'）';}
   if(value.type==='message_stop'&&['end_turn','stop_sequence'].includes(anthropicReason))completed=true;
   if(value.type==='message'){append(value.content?.filter(x=>x.type==='text'));if(['end_turn','stop_sequence'].includes(anthropicReason))completed=true;}
  }else if(protocol==='gemini'){
   if(value.promptFeedback?.blockReason)failed='服务拦截了本次请求（'+value.promptFeedback.blockReason+'）';const candidate=value.candidates?.[0];if(!candidate)return;append(candidate.content?.parts);if(candidate.finishReason){if(candidate.finishReason==='STOP')completed=true;else failed='输出未完整完成（'+String(candidate.finishReason).slice(0,80)+'）';}
  }else{
   if(value.type==='response.output_text.delta')append(value.delta);
   if(['response.failed','response.incomplete'].includes(value.type))failed='生成未完整完成';
   if(value.type==='response.completed'){if(value.response?.status&&value.response.status!=='completed')failed='生成未完整完成';completed=true;if(!result)append((value.response?.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text'));}
   if(value.object==='response'||value.status==='completed'&&Array.isArray(value.output)){if(value.status==='completed'){completed=true;append(value.output.flatMap(x=>x.content||[]).filter(x=>x.type==='output_text'));}else failed='生成未完整完成';}
  }
 };
 if(response.headers.get('content-type')?.includes('application/json')){const value=await response.json();for(const item of Array.isArray(value)?value:[value])event(item);}
 else{
  const decoder=new TextDecoder();let pending='';const handle=raw=>{const data=raw.split(/\r?\n/).filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');if(!data)return;if(data==='[DONE]'){if(protocol==='chat-completions'&&result&&!failed)completed=true;return;}let value;try{value=JSON.parse(data);}catch{throw Error('自定义服务返回了损坏的流事件，未保存结果');}for(const item of Array.isArray(value)?value:[value])event(item);};
  for await(const chunk of response.body||[]){pending+=decoder.decode(chunk,{stream:true});if(pending.length>4*1024*1024)throw Error('单个流事件过大，已停止读取');const parts=pending.split(/\r?\n\r?\n/);pending=parts.pop()||'';for(const part of parts)handle(part);}pending+=decoder.decode();if(pending.trim())handle(pending);
 }
 if(failed)throw Error(failed);if(!completed||!result.trim())throw Error('自定义服务的输出未完整完成，未保存或缓存半成品');return result;
}
export async function customInference(config,{model,input,signal,sessionID,onDelta=()=>{},onRetry=()=>{}},fetchImpl=fetchService){
 const response=await fetchImpl(providerEndpoint(config,'inference',model),{method:'POST',headers:providerHeaders(config,sessionID),body:JSON.stringify(providerRequest(config,model,input)),redirect:'error',signal},onRetry);return consumeProviderResponse(response,config.protocol,onDelta,config.key);
}
export function customAsResponses(config,{model,input,signal,onRetry,sessionID}){const abort=new AbortController();const combined=signal?AbortSignal.any([signal,abort.signal]):abort.signal;const encoder=new TextEncoder();let previous='';return new Response(new ReadableStream({async start(controller){const emit=value=>controller.enqueue(encoder.encode('data: '+JSON.stringify(value)+'\n\n'));try{await customInference(config,{model,input,signal:combined,onRetry,sessionID,onDelta:content=>{emit({type:'response.output_text.delta',delta:content.slice(previous.length)});previous=content;}});emit({type:'response.completed',response:{status:'completed'}});controller.close();}catch(error){controller.error(error);}},cancel(){abort.abort();}}),{headers:{'Content-Type':'text/event-stream'}});}
export async function customModels(config,fetchImpl=fetchService){
 const models=[],seen=new Set(),pages=new Set();let url=new URL(providerEndpoint(config,'models'));
 for(let page=0;page<30;page++){
  if(pages.has(url.href))throw Error('服务商模型列表分页重复，请稍后重试');pages.add(url.href);
  const response=await fetchImpl(url.href,{headers:providerHeaders(config),redirect:'error',signal:AbortSignal.timeout(20000)});if(!response.ok)return responseError(response,config.key);const value=await response.json(),list=Array.isArray(value)?value:value.data||value.models||[];if(!Array.isArray(list))throw Error('服务未返回有效模型列表');
  for(const m of list){if(config.protocol==='gemini'&&m.supportedGenerationMethods&&!m.supportedGenerationMethods.includes('generateContent'))continue;const id=String(m.id||m.name||'').replace(config.protocol==='gemini'?/^models\//:/^$/,'');if(!id||seen.has(id))continue;seen.add(id);models.push({id,name:String(m.display_name||m.displayName||m.name||m.id||'')});}
  if(config.protocol==='gemini'&&value.nextPageToken){url.searchParams.set('pageToken',value.nextPageToken);continue;}
  if(config.protocol==='anthropic'&&value.has_more){if(!value.last_id)throw Error('服务商模型分页缺少游标');url.searchParams.set('after_id',value.last_id);continue;}
  return models;
 }throw Error('模型列表分页过多，请缩小服务商目录后重试');
}
