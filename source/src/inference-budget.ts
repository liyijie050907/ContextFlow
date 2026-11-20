import PQueue from 'p-queue';
const generation=new PQueue({concurrency:1});
const preparation=new PQueue({concurrency:1});
const parts=new PQueue({concurrency:1});
const foreground=new PQueue({concurrency:1});
export function inferenceSlot<T>(path:string,run:()=>Promise<T>,signal?:AbortSignal):Promise<T>{
 const queue=path==='/generate-article'||path==='/generate-questions'?generation:
  path==='/parts-of-speech'?parts:path==='/prepare-reading'?preparation:/^\/(?:lookup|translate)(?:-fast)?$/.test(path)?foreground:undefined;
 if(!queue)return run();
 return queue.add(async()=>{signal?.throwIfAborted();return run();},{signal}) as Promise<T>;
}
