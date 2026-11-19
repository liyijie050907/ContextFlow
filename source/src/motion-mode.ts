export type MotionMode='system'|'full'|'reduce';
const media=matchMedia('(prefers-reduced-motion: reduce)');
const key='ContextFlow.motion';
let mode:MotionMode='system';
try{
  const saved=localStorage.getItem(key);
  if(saved==='full'||saved==='reduce')mode=saved;
}catch{/* Private browsing can still use the in-memory setting. */}
export const motionMode=()=>mode;
export const reducedMotion=()=>mode==='reduce'||(mode==='system'&&media.matches);
function apply(){
  document.documentElement.dataset.motion=reducedMotion()?'reduce':'full';
  document.dispatchEvent(new Event('cf-motion-change'));
}
export function setMotionMode(value:string){
  if(value!=='system'&&value!=='full'&&value!=='reduce')return;
  mode=value;
  try{localStorage.setItem(key,value);}catch{}
  apply();
}
apply();media.addEventListener('change',apply);
