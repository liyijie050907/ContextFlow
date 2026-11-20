import {mkdir,readFile,writeFile,rename,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
export function fileGenerationStore(directory,{encode,decode}){
 const path=id=>{if(!/^[a-zA-Z0-9-]{8,200}$/.test(id))throw Error('无效请求 ID');return resolve(directory,id+'.bin');};
 const bytes=async row=>encode(row);
 return {
  async read(id){try{const row=await decode(await readFile(path(id)));if(typeof row.createdAt==='number'&&Date.now()-row.createdAt>86400000){await unlink(path(id));return null;}return row;}catch(e){if(e.code==='ENOENT')return null;throw e;}},
  async claim(id,row){await mkdir(directory,{recursive:true,mode:0o700});try{await writeFile(path(id),await bytes(row),{flag:'wx',mode:0o600});return true;}catch(e){if(e.code==='EEXIST')return false;throw e;}},
  async write(id,row){await mkdir(directory,{recursive:true,mode:0o700});const tmp=path(id)+'.'+randomBytes(6).toString('hex');await writeFile(tmp,await bytes(row),{mode:0o600});await rename(tmp,path(id));}
 };
}
