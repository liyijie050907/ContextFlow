export function normalizeTerm(text:string){
 return text.normalize('NFKC').replace(/[’‘]/g,"'").replace(/[‐‑‒–−]/g,'-').replace(/\s+/g,' ').trim().toLowerCase();
}

export function isVocabularyTerm(value:unknown):value is string{
 return typeof value==='string'&&value.trim().length>0&&value.length<=100&&!/[\p{Cc}]/u.test(value);
}

export function containsVocabularyTerm(text:string,term:string){
 const word=normalizeTerm(term);
 if(!word)return false;
 const escape=word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const left=/^[\p{Script=Latin}\p{N}_'-]/u.test(word)?'(?<![\\p{Script=Latin}\\p{N}_\'-])':'';
 const right=/[\p{Script=Latin}\p{N}_'+#-]$/u.test(word)?'(?![\\p{Script=Latin}\\p{N}_\'+#-])':'';
 return new RegExp(left+escape+right,'u').test(normalizeTerm(text));
}
