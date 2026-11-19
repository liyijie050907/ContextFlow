import type {ReviewState, UserState} from './types';
export type NotebookStatus='due'|'learning'|'mastered';
export const statusNames={due:'待复习',learning:'学习中',mastered:'已掌握'} as const;
export type CardCheck=NonNullable<UserState['cardChecks']>[number];
export function notebookStatus(review:ReviewState|undefined,check:CardCheck|undefined,now=Date.now()):NotebookStatus{
  if(check&&(!review||Date.parse(check.updatedAt)>=Date.parse(review.lastAt))){
    if(check.mark==='mastered')return 'mastered';
    if(check.mark==='again')return 'due';
    return now-Date.parse(check.updatedAt)>=86400000?'due':'learning';
  }
  if(!review)return 'due';
  return review.mastered?'mastered':Date.parse(review.nextAt)<=now?'due':'learning';
}
export function searchText(text:string){
 return text.normalize('NFKC').toLocaleLowerCase().replace(/[’‘]/g,"'").trim().replace(/\s+/g,' ');
}
export function matchesSearch(query:string,fields:string[]){
 const terms=searchText(query).split(' ').filter(Boolean);
 const haystack=searchText(fields.join(' '));
 return terms.every(term=>haystack.includes(term));
}