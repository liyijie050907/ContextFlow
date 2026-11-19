// Only explicit grammatical labels count as supplied parts of speech.
const label = String.raw`(?:adj\.|adv\.|prep\.|pron\.|conj\.|interj\.|det\.|num\.|aux\.|art\.|phr\.|modal\b|v[ti]?\.|n\.|a\.|adj\b|adv\b|noun\b|verb\b|adjective\b|adverb\b|preposition\b|pronoun\b|conjunction\b|determiner\b|interjection\b|名词|及物动词|不及物动词|助动词|动词|形容词|副词|介词|代词|连词|限定词|数词|冠词|感叹词|短语)`;
const tags = label+'(?:\\s*[/／、&]\\s*'+label+')*';
const term = "[a-zA-Z]+(?:[ '\\u2019-][a-zA-Z]+)*?";
const tagged = new RegExp('^('+term+')\\s*(?:[:：,，\\t]\\s*|\\s+|(?=[（(\\[]))[（(\\[]?('+tags+')[）)\\]]?\\s*(?:[:：,，;；-]\\s*|\\s+|(?=[\\u3400-\\u9fff])|$)(.*)$','i');
const prefix = new RegExp('^[（(\\[]?('+tags+')[）)\\]]?(?=\\s|[:：,，;；]|[\\u3400-\\u9fff]|$)','i');

export function parseTaggedLine(line:string){
  const match=tagged.exec(line.trim());
  return match?{word:match[1].trim(),pos:match[2].trim(),zh:match[3].trim()}:undefined;
}
export function inlinePartOfSpeech(meaning:string){
  const labels=new Set<string>();
  for(const line of meaning.split('\n')){
    const clean=line.trim().replace(/^(?:[-*+]\s+|\d+[.)、]\s*)/,'').replace(/^(?:\*\*|__)/,'');
    const match=prefix.exec(clean);
    if(match)labels.add(match[1]);
  }
  return [...labels].join(' / ');
}
export function partOfSpeechHeader(name:string){
  return /^(?:pos|part[_\s-]*of[_\s-]*speech|词性)$/i.test(name.trim());
}
export function meaningfulPos(value:string|undefined){
  const clean=value?.trim()||'';
  return /^(?:未注明|未标注|未知|unknown|n\/a|—|-)$/i.test(clean)?'':clean;
}
