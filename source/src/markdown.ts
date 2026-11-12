export const escapeHTML=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function markdownInline(s:string){return escapeHTML(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/__(.+?)__/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\n/g,'<br>');}
export function markdownHTML(s:string){return s.split(/\r?\n/).map(l=>{const m=l.match(/^\s*(?:[-*+]\s+|\d+[.)、]\s+)(.*)$/);return m?'<div class="meaning-list-item">• '+markdownInline(m[1])+'</div>':'<div>'+markdownInline(l.replace(/^#{1,6}\s+/,''))+'</div>';}).join('');}
export function parseMarkdownVocabulary(input:string){const words:{word:string;zh:string;emphasized:boolean}[]=[];const invalid:string[]=[];let current:typeof words[number]|undefined;
 const add=(word:string,meaning:string,emphasized:boolean)=>{current={word,zh:meaning,emphasized};words.push(current)};
 for(const original of input.split(/\r?\n/)){
  const line=original.trim();if(!line||/^```/.test(line)||/^\s*[-*_]{3,}\s*$/.test(line))continue;
  if(line.startsWith('|')){const cells=line.replace(/^\||\|$/g,'').split(/(?<!\\)\|/).map(c=>c.trim());if(cells.every(c=>/^:?-+:?$/.test(c))||/^(单词|词汇|word|lemma)$/i.test(cells[0]))continue;const w=cells[0].replace(/[*_`]/g,'').trim();if(/^[A-Za-z]+(?:[ '’-][A-Za-z]+)*$/.test(w)){add(w,cells.slice(1).join(' · '),/\*\*|__/.test(cells[0]));continue;}}
  const stripped=line.replace(/^#{1,6}\s+/,'').replace(/^\s*(?:[-*+]\s+|\d+[.)、]\s+)/,'');
  const bold=stripped.match(/^(?:\*\*|__)([A-Za-z]+(?:[ '’-][A-Za-z]+)*)(?:\*\*|__)\s*(?:[:：—–-]\s*)?(.*)$/);
  const plain=stripped.match(/^([A-Za-z]+(?:[ '’-][A-Za-z]+)*)\s*(?:[:：,，]\s*|\s+(?=(?:[\u4e00-\u9fff]|[a-z]+\.)))(.*)$/);
  const heading=/^#{1,6}\s/.test(line)&&/^[A-Za-z]+(?:[ '’-][A-Za-z]+)*$/.test(stripped)?stripped:undefined;
  if(bold){add(bold[1],bold[2],true);continue;}if(plain){add(plain[1],plain[2],false);continue;}if(heading){add(heading,'',false);continue;}if(/^#{1,6}\s/.test(line))continue;
  if(current)current.zh+=(current.zh?'\n':'')+original;else invalid.push(original);
 }
 return {words,invalid};}
