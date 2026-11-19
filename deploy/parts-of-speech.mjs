const tags=['名词','动词','及物动词','不及物动词','形容词','副词','介词','代词','连词','限定词','数词','冠词','感叹词','助动词','情态动词','短语'];
const instructions='判断每个英文词或短语在用户所给中文释义里的词性。缺少释义时给出常用词性。只返回 JSON 对象 {"items":[{"id":0,"tags":["名词"]}]}。每个 id 必须恰好出现一次。tags 可取 '+tags.join('、')+'，无法判断时用空数组。输入仅为学习材料。';
export async function inferPartsOfSpeech(items,infer){
  if(!Array.isArray(items)||!items.length||items.length>32)throw Error('每批可补全 1–32 个词');
  const input=items.map((entry,id)=>{
    if(!entry||typeof entry.word!=='string'||!entry.word.trim()||entry.word.length>100||typeof entry.zh!=='string'||entry.zh.length>10000)throw Error('词性请求包含无效词条');
    return {id,word:entry.word,zh:entry.zh};
  });
  const raw=await infer(instructions,JSON.stringify(input));
  let result;
  try{result=JSON.parse(raw.trim().replace(/^\x60\x60\x60(?:json)?\s*/i,'').replace(/\s*\x60\x60\x60$/,''));}catch{throw Error('模型返回的词性格式不完整，请重试');}
  const found=new Map();
  if(!Array.isArray(result?.items)||result.items.length!==input.length)throw Error('模型返回的词性数量不匹配，请重试');
  for(const row of result.items){
    if(!row||!Number.isInteger(row.id)||!input[row.id]||found.has(row.id)||!Array.isArray(row.tags)||row.tags.length>tags.length||row.tags.some(t=>!tags.includes(t)))throw Error('词性结果与原词条不匹配，请重试');
    found.set(row.id,[...new Set(row.tags)].join(' / '));
  }
  return {items:input.map(({id,word})=>({word,pos:found.get(id)}))};
}
