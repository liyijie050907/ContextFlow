import type {UserState} from './types';
import {initialState,validateState,migrateState,now} from './domain';
const KEY='contextflow-state-v1';
export class StorageRepository {
 state:UserState;mode:'IndexedDB'|'兼容存储'|'临时模式'='临时模式';detail='';db?:IDBDatabase;rawSaved:unknown;private queue=Promise.resolve();private channel?:BroadcastChannel;
 constructor(version:string){this.state=initialState(version);}
 async init(){
  try{this.db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('ContextFlow-v1',1),timer=setTimeout(()=>reject(Error('打开数据库超时')),4000);r.onupgradeneeded=()=>r.result.createObjectStore('state');r.onsuccess=()=>{clearTimeout(timer);resolve(r.result)};r.onerror=()=>{clearTimeout(timer);reject(r.error)};r.onblocked=()=>{clearTimeout(timer);reject(Error('数据库被其他窗口阻塞'))};});await this.put({test:true},'probe');if(!(await this.get('probe') as any)?.test)throw Error('自检失败');}
  catch(e){this.db?.close();this.db=undefined;this.detail='IndexedDB 不可用：'+String(e);}
  // Invalid saved data must escape, rather than silently opening an empty library.
  if(this.db){const saved=await this.get('current');this.rawSaved=saved;if(saved!==undefined){this.state=migrateState(saved as UserState);if((saved as any).schema===1)await this.writeMigration(saved);}this.mode='IndexedDB';this.detail='本机浏览器 · 读写自检通过';}
  else{let available=false;try{localStorage.setItem(KEY+'-probe','ok');available=localStorage.getItem(KEY+'-probe')==='ok';localStorage.removeItem(KEY+'-probe');}catch{}if(available){const text=localStorage.getItem(KEY);if(text!==null){this.rawSaved=text;const saved=JSON.parse(text);this.rawSaved=saved;this.state=migrateState(saved);if(saved.schema===1){localStorage.setItem(KEY+'-before-v2',text);localStorage.setItem(KEY,JSON.stringify(this.state));}}this.mode='兼容存储';this.detail='容量受限，请定期导出备份';}else this.detail='无法持久保存；关闭页面前请导出备份';}
  if(typeof BroadcastChannel!=='undefined'){this.channel=new BroadcastChannel('ContextFlow-state-updates');this.channel.onmessage=()=>{void this.refresh().then(()=>document.dispatchEvent(new Event('cf-state-external'))).catch(console.error);};}
 }
 private get(key:string){return new Promise<unknown>((resolve,reject)=>{const r=this.db!.transaction('state').objectStore('state').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
 private put(value:unknown,key:string){return new Promise<void>((resolve,reject)=>{const tx=this.db!.transaction('state','readwrite');tx.objectStore('state').put(value,key);tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(tx.error||Error('事务中断'));});}
 private writeMigration(original:unknown){return new Promise<void>((resolve,reject)=>{const tx=this.db!.transaction('state','readwrite'),store=tx.objectStore('state');store.put(original,'migration-before-v2');store.put(this.state,'current');tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(tx.error||Error('迁移未保存'));});}
 async refresh(){const raw=this.db?await this.get('current'):this.mode==='兼容存储'?JSON.parse(localStorage.getItem(KEY)||'null'):null;if(raw)this.state=migrateState(raw as UserState);}
 async commit(change:(draft:UserState)=>void,beforeSave?:(previous:UserState)=>Promise<void>){const save=async()=>{await this.refresh();const previous=this.state;const next=structuredClone(previous);change(next);next.updatedAt=now();validateState(next);if(beforeSave)await beforeSave(previous);if(this.db){await new Promise<void>((resolve,reject)=>{const tx=this.db!.transaction('state','readwrite'),store=tx.objectStore('state');store.put(previous,'previous');store.put(next,'current');tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(tx.error||Error('事务中断'));});}else if(this.mode==='兼容存储')localStorage.setItem(KEY,JSON.stringify(next));this.state=next;this.channel?.postMessage({updatedAt:next.updatedAt});};const task=this.queue.then(async()=>{if(typeof navigator!=='undefined'&&navigator.locks)await navigator.locks.request('ContextFlow-state-write',async()=>{await save();});else await save();});this.queue=task.catch(()=>{});return task;}
 async replace(next:UserState){const migrated=migrateState(next);await this.commit(d=>{for(const key of Object.keys(d))Reflect.deleteProperty(d,key);Object.assign(d,migrated);});}
 async previous(){return this.db?await this.get('previous') as UserState|undefined:undefined;}
}
