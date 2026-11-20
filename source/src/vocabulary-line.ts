import {parseTaggedLine,inlinePartOfSpeech} from './parts-of-speech';
import {isVocabularyTerm} from './vocabulary-term';

export const validImportTerm=(word:string)=>isVocabularyTerm(word)&&(/[\p{Script=Latin}]/u.test(word)||/^[\p{S}\p{P}]+$/u.test(word))&&!/\p{Script=Han}/u.test(word);
const pairs:Record<string,string>={'(':')','（':'）','[':']','【':'】','<':'>','《':'》','『':'』','「':'」','“':'”','"':'"','‘':'’','`':'`'};
export function cleanHead(raw:string){
 let word=raw.trim().replace(/^(\*\*|__)(.+)\1$/,'$2');
 while(pairs[word[0]]&&word.endsWith(pairs[word[0]]))word=word.slice(1,-1).trim();
 // Strip a stray closing wrapper without damaging terms such as (un)likely or f(x).
 for(const [open,close] of Object.entries(pairs)){
  while(open!==close&&word.startsWith(open)&&word.split(open).length>word.split(close).length)word=word.slice(1).trim();
  while(open!==close&&word.endsWith(close)&&word.split(close).length>word.split(open).length)word=word.slice(0,-1).trim();
 }
 return word.replace(/[’‘]/g,"'");
}
export function vocabularyLine(raw:string){
 const line=raw.trim().replace(/^(?:[-*•●▪·]\s+|[（(]?\d+[.)）．、:：]\s*)/,'').trim();
 if(!line||/^(?:[-=_—─]{3,}|单词表|词汇表|第\s*\d+\s*页)$/u.test(line))return [];
 const tagged=parseTaggedLine(line);if(tagged)return [tagged];
 const split=line.match(/^(.+?)\s*(?:[:：\t]|(?:=>|->|→|⇒)|\s+[—–-]\s+|[—–](?=\s*\p{Script=Han})|[，,;；、=|](?=\s*[\p{Script=Han}（(]))\s*(.+)$/u);
 const mixed=line.match(/^(.+?)\s*([（(【\[]?[\p{Script=Han}].*)$/u);
 const match=split||mixed;
 if(match){
  let head=match[1].trim(),meaning=match[2].trim();
  const tag=head.match(/[(（\[]([^()（）\[\]]{1,36})[)）\]]?$/);
  let pos='';
  if(tag&&inlinePartOfSpeech(tag[1])===tag[1].trim()){pos=tag[1];head=head.slice(0,tag.index).trim();}
  const wrapped=pairs[meaning[0]];if(!split&&wrapped&&meaning.endsWith(wrapped))meaning=meaning.slice(1,-1);
  const word=cleanHead(head);
  const prefixed=parseTaggedLine('term '+meaning);
  return [{word,zh:prefixed?.zh??meaning,pos:pos||prefixed?.pos}];
 }
 return line.split(/[\s,，;；、]+/).filter(Boolean).map(token=>({word:cleanHead(token),zh:''}));
}