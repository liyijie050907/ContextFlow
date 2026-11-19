import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {inferPartsOfSpeech} from '../../assistant/parts-of-speech.mjs';
const built=await build({entryPoints:['src/generation.ts'],bundle:true,format:'esm',write:false,platform:'node'});
const {parseGenerationWords}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
test('paste, Markdown, CSV and JSON carry supplied part of speech through import',()=>{
  const examples=[
    ['gene n. 基因\ndurable：耐用的','n.'],
    ['gene (n.)：基因','n.'],
    ['gene：名词 基因','名词'],
    ['| 单词 | 词性 | 词义 |\n| --- | --- | --- |\n| **gene** | 名词 | **基因** |','名词'],
    ['word,pos,meaning\ngene,noun,基因','noun'],
    ['[{"word":"gene","pos":"n.","zh":"基因"}]','n.'],
    ['## **gene**\n- **n. 基因**','n.'],
    ['- **gene**：n. 基因','n.']
  ];
  for(const [text,pos] of examples){const {words,invalid}=parseGenerationWords(text);assert.deepEqual(invalid,[],text);assert.equal(words[0].word,'gene');assert.equal(words[0].pos,pos,text);assert.match(words[0].zh,/基因/);}
  assert.equal(parseGenerationWords('durable：耐用的').words[0].pos,undefined);
});
test('batch model tags stay paired with the original entries, including unknowns',async()=>{
  const items=[{word:'gene',zh:'基因'},{word:'durable',zh:'耐用的'}];
  const result=await inferPartsOfSpeech(items,async()=>JSON.stringify({items:[{id:1,tags:[]},{id:0,tags:['名词']}]}));
  assert.deepEqual(result.items,[{word:'gene',pos:'名词'},{word:'durable',pos:''}]);
  for(const tags of [[{id:0,tags:['名词']}],[{id:0,tags:['名词']},{id:0,tags:['动词']}],[{id:0,tags:['任意文本']},{id:1,tags:[]}]]){
    await assert.rejects(()=>inferPartsOfSpeech(items,async()=>JSON.stringify({items:tags})));
  }
});
