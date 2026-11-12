import type {UserState} from './types';
import {initialState,validateState,now} from './domain';
const KEY='contextflow-state-v1';
export class StorageRepository {
  state:UserState; mode:'IndexedDB'|'兼容存储'|'临时模式'='临时模式';detail='';db?:IDBDatabase;private queue=Promise.resolve();
  constructor(version:string){this.state=initialState(version);}
  async init(){
    try {this.db=await new Promise<IDBDatabase>((res,rej)=>{const r=indexedDB.open('ContextFlow-v1',1);const timeout=setTimeout(()=>rej(Error('打开数据库超时')),4000);r.onupgradeneeded=()=>r.result.createObjectStore('state');r.onsuccess=()=>{clearTimeout(timeout);res(r.result)};r.onerror=()=>{clearTimeout(timeout);rej(r.error)};r.onblocked=()=>{clearTimeout(timeout);rej(Error('数据库被其他窗口阻塞'))};});
      await this.idbPut({test:true},'probe');const probe=await this.idbGet('probe') as {test?:boolean};if(!probe?.test)throw Error('自检失败');
      const saved=await this.idbGet('current');if(saved){validateState(saved as UserState);this.state=saved as UserState;}this.mode='IndexedDB';this.detail='本机浏览器 · 读写自检通过';return;
    }catch(e){this.db?.close();this.db=undefined;this.detail='IndexedDB 不可用：'+String(e);}
    try{const test=KEY+'-probe';localStorage.setItem(test,'ok');if(localStorage.getItem(test)!=='ok')throw Error('自检失败');localStorage.removeItem(test);const text=localStorage.getItem(KEY);if(text){const saved=JSON.parse(text);validateState(saved);this.state=saved;}this.mode='兼容存储';this.detail='容量受限，请定期导出备份';}
    catch(e){this.mode='临时模式';this.detail='关闭页面后无法保留本次数据；请导出完整备份。'+String(e);}
  }
  private idbGet(key:string){return new Promise<unknown>((res,rej)=>{const r=this.db!.transaction('state').objectStore('state').get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
  private idbPut(value:unknown,key:string){return new Promise<void>((res,rej)=>{const tx=this.db!.transaction('state','readwrite');tx.objectStore('state').put(value,key);tx.oncomplete=()=>res();tx.onerror=tx.onabort=()=>rej(tx.error||Error('事务中断'));});}
  async commit(change:(draft:UserState)=>void){const task=this.queue.then(async()=>{const next=structuredClone(this.state);change(next);next.updatedAt=now();validateState(next);if(this.mode==='IndexedDB'){await new Promise<void>((res,rej)=>{const tx=this.db!.transaction('state','readwrite');const store=tx.objectStore('state');store.put(this.state,'previous');store.put(next,'current');tx.oncomplete=()=>res();tx.onerror=tx.onabort=()=>rej(tx.error||Error('保存事务失败'));});}else if(this.mode==='兼容存储'){localStorage.setItem(KEY,JSON.stringify(next));}this.state=next;});this.queue=task.catch(()=>{});return task;}
  async replace(next:UserState){await this.commit(d=>Object.assign(d,structuredClone(next)));}
  async previous(){if(this.db)return await this.idbGet('previous') as UserState|undefined;return undefined;}
}
