import {reducedMotion} from './motion-mode';
import { gsap } from 'gsap';

type SelectionInfo = {text:string; start:number; paragraphs:number[]; anchor:DOMRect};
type Result = {text:string; exact:boolean};
type Tools = {
  icon:(name:string)=>string;
  local:(info:SelectionInfo)=>Result|undefined;
  translate:(text:string,partial:(value:string)=>void,signal:AbortSignal)=>Promise<string>;
  save:(text:string,meaning:string)=>Promise<boolean>;
  speak:(text:string)=>void;
  stop:()=>void;
  connect:(retry:()=>void)=>void;
  notify:(msg:string)=>void;
};
const motion = () => !reducedMotion();
const canonical = (s:string)=>s.normalize('NFKC').replace(/\s+/g,' ').trim();
const parent = (n:Node|null)=>n instanceof Element?n:n?.parentElement;
function selectionInfo():SelectionInfo|undefined {
  const sel=getSelection();
  if(!sel?.rangeCount||sel.isCollapsed)return;
  const range=sel.getRangeAt(0);
  if(!parent(range.startContainer)?.closest('[data-paragraph]')||!parent(range.endContainer)?.closest('[data-paragraph]'))return;
  const parts:string[]=[],paragraphs:number[]=[];
  let offset=0,start=0;
  for(const p of document.querySelectorAll<HTMLElement>('.article-body [data-paragraph]')){
    if(range.intersectsNode(p)){
      const part=document.createRange();
      part.selectNodeContents(p);
      if(p.contains(range.startContainer)){
        part.setStart(range.startContainer,range.startOffset);
        const prefix=document.createRange();
        prefix.selectNodeContents(p);prefix.setEnd(range.startContainer,range.startOffset);
        const before=prefix.toString().normalize('NFKC').replace(/\s+/g,' ').trimStart();
        start=offset+before.length+((!before.endsWith(' ')&&/^\s/.test(part.toString())&&before.length)?1:0);
      }
      if(p.contains(range.endContainer))part.setEnd(range.endContainer,range.endOffset);
      const selected=part.toString().trim();
      if(selected){parts.push(selected);paragraphs.push(Number(p.dataset.paragraph));}
    }
    offset+=canonical(p.textContent||'').length+1;
  }
  const text=parts.join('\n\n');
  if(!text)return;
  return {text,start,paragraphs,anchor:range.getBoundingClientRect()};
}
export function setupSelectionPopover(ui:Tools){
  let panel:HTMLElement|undefined,info:SelectionInfo|undefined,answer:Result|undefined,request:AbortController|undefined;
  let timer=0,dragged=false,inText=false,ignoreCollapsed=false;
  let observer:ResizeObserver|undefined;
  const close=()=>{
    window.clearTimeout(timer);request?.abort();request=undefined;
    observer?.disconnect();panel?.remove();panel=undefined;info=undefined;answer=undefined;dragged=false;ignoreCollapsed=false;
  };
  function bounds(){
    const v=window.visualViewport;
    return {left:(v?.offsetLeft||0)+8,top:(v?.offsetTop||0)+8,right:(v?.offsetLeft||0)+(v?.width||innerWidth)-8,bottom:(v?.offsetTop||0)+(v?.height||innerHeight)-8};
  }
  function position(x:number,y:number){
    if(!panel)return;
    const b=bounds();
    panel.style.left=Math.max(b.left,Math.min(x,b.right-panel.offsetWidth))+'px';
    panel.style.top=Math.max(b.top,Math.min(y,b.bottom-panel.offsetHeight))+'px';
  }
  function place(){
    if(!panel||!info)return;
    if(dragged){position(parseFloat(panel.style.left),parseFloat(panel.style.top));return;}
    const b=bounds(),r=info.anchor,h=panel.offsetHeight,w=panel.offsetWidth;
    if(innerWidth>700&&r.right+12+w<=b.right){
      position(r.right+12,r.top-(h-r.height)/2);return;
    }
    const dock=document.querySelector('.app-nav')?.getBoundingClientRect();
    const bottom=dock&&r.left<dock.right&&r.left+w>dock.left?Math.min(b.bottom,dock.top-7):b.bottom;
    const below=bottom-r.bottom,above=r.top-b.top;
    position(r.left,r.bottom+9+h<=bottom||below>=above?r.bottom+9:r.top-h-9);
  }
  const find=<T extends HTMLElement=HTMLElement>(selector:string)=>panel!.querySelector<T>(selector)!;
  function paint(result:Result|undefined,msg?:string){
    if(!panel)return;
    answer=result;
    find('.clip-label').textContent=result&&!result.exact?'所在句参考译文':'选段翻译';
    find('.clip-content').textContent=msg||result?.text||'此选段尚无本地译文';
    const translate=find<HTMLButtonElement>('[data-clip="translate"]');
    translate.hidden=!!result?.exact;
    translate.textContent=result?'精确翻译':'翻译选段';
    find<HTMLButtonElement>('[data-clip="save"]').disabled=!result?.exact;
    find<HTMLButtonElement>('[data-clip="copy-zh"]').disabled=!result;
    place();
  }
  async function translate(){
    if(!panel||!info)return;
    const text=info.text,previous=answer;
    request?.abort();const ctl=new AbortController();request=ctl;
    find('[data-clip="connect"]').hidden=true;
    paint(undefined,'正在翻译…');panel.setAttribute('aria-busy','true');
    find<HTMLButtonElement>('[data-clip="translate"]').disabled=true;
    try{
      const translated=await ui.translate(text,v=>{if(!ctl.signal.aborted&&panel)find('.clip-content').textContent=v;},ctl.signal);
      if(!ctl.signal.aborted)paint({text:translated,exact:true});
    }catch(error){
      if(!ctl.signal.aborted&&panel){paint(previous);if(previous)ui.notify((error as Error).message);else find('.clip-content').textContent=(error as Error).message;find('[data-clip="connect"]').hidden=false;}
    }finally{
      if(!ctl.signal.aborted&&panel){panel.removeAttribute('aria-busy');find<HTMLButtonElement>('[data-clip="translate"]').disabled=false;}
    }
  }
  async function copy(text:string){
    try{await navigator.clipboard.writeText(text);}
    catch{
      const temp=document.createElement('textarea');temp.value=text;temp.style.cssText='position:fixed;opacity:0';panel!.append(temp);temp.select();
      const ok=document.execCommand('copy');temp.remove();if(!ok)throw Error('复制未完成');
    }
    ui.notify('已复制');
  }
  function open(value:SelectionInfo){
    if(panel&&info?.text===value.text&&info.start===value.start)return;
    close();info=value;
    panel=document.createElement('section');panel.className='clip-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','选段翻译');
    const btn=(id:string,label:string,icon:string)=>'<button type="button" data-clip="'+id+'" aria-label="'+label+'" data-tip="'+label+'">'+ui.icon(icon)+'</button>';
    panel.innerHTML='<header class="clip-head"><button type="button" class="clip-grip" aria-label="移动翻译浮窗，可用方向键调整"><span aria-hidden="true">⠿</span><strong class="clip-label">选段翻译</strong></button>'+btn('close','关闭浮窗','close')+'</header><div class="clip-content" role="status"></div><div class="clip-extra" hidden><blockquote lang="en"></blockquote><div>'+btn('stop','停止朗读','stop')+'<button data-clip="copy-zh">复制译文</button></div></div><footer class="clip-actions">'+btn('sound','朗读原文','sound')+btn('copy','复制原文','copy')+btn('save','收藏选段','bookmark')+'<button data-clip="translate">翻译选段</button><button data-clip="connect" hidden>连接服务</button>'+btn('expand','展开原文与工具','chevron')+'</footer>';
    document.body.append(panel);find('blockquote').textContent=value.text;
    find('[data-clip="expand"]').setAttribute('aria-expanded','false');paint(ui.local(value));
    if(motion())gsap.fromTo(panel,{opacity:0,y:3},{opacity:1,y:0,duration:.16,clearProps:'transform,opacity'});
    observer=new ResizeObserver(place);observer.observe(panel);
    const grip=find<HTMLButtonElement>('.clip-grip');let drag:{id:number;x:number;y:number;l:number;t:number}|undefined;
    grip.onpointerdown=e=>{
      if(!e.isPrimary||e.button!==0)return;
      e.preventDefault();gsap.killTweensOf(panel!);gsap.set(panel!,{clearProps:'transform,opacity'});
      drag={id:e.pointerId,x:e.clientX,y:e.clientY,l:panel!.offsetLeft,t:panel!.offsetTop};
      grip.setPointerCapture(e.pointerId);panel!.classList.add('is-dragging');
    };
    grip.onpointermove=e=>{if(!drag||drag.id!==e.pointerId)return;dragged=true;position(drag.l+e.clientX-drag.x,drag.t+e.clientY-drag.y);};
    grip.onlostpointercapture=()=>{if(!drag||!panel)return;drag=undefined;panel.classList.remove('is-dragging');if(dragged&&motion())gsap.fromTo(grip,{scale:.98},{scale:1,duration:.22,ease:'back.out(1.1)',clearProps:'transform'});};
    grip.onkeydown=e=>{if(!e.key.startsWith('Arrow'))return;e.preventDefault();const step=e.shiftKey?32:8;dragged=true;position(panel!.offsetLeft+({'ArrowRight':step,'ArrowLeft':-step}[e.key]||0),panel!.offsetTop+({'ArrowDown':step,'ArrowUp':-step}[e.key]||0));};
    panel.onclick=async e=>{const btn=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-clip]');if(!btn||!info)return;
      try{switch(btn.dataset.clip){
        case 'close':close();break;
        case 'expand':{const more=find('.clip-extra');more.hidden=!more.hidden;btn.setAttribute('aria-expanded',String(!more.hidden));panel!.classList.toggle('expanded',!more.hidden);btn.setAttribute('aria-label',more.hidden?'展开原文与工具':'收起原文与工具');place();break;}
        case 'translate':await translate();break;
        case 'connect':ui.connect(()=>{if(panel)void translate();});break;
        case 'sound':ui.speak(info.text);break;
        case 'stop':ui.stop();break;
        case 'copy':await copy(info.text);break;
        case 'copy-zh':if(answer)await copy(answer.text);break;
        case 'save':if(answer?.exact){btn.disabled=true;if(await ui.save(info.text,answer.text)){btn.innerHTML=ui.icon('check');btn.setAttribute('aria-label','已收藏');}else btn.disabled=false;}break;
      }}catch(error){ui.notify((error as Error).message);}
    };
  }
  function schedule(){
    clearTimeout(timer);timer=window.setTimeout(()=>{
      if(inText||document.querySelector('dialog[open]'))return;
      const value=selectionInfo();if(value)open(value);else if(!ignoreCollapsed&&!panel?.contains(document.activeElement))close();
    },65);
  }
  document.addEventListener('selectionchange',()=>{if(!inText)schedule();});
  document.addEventListener('pointerdown',e=>{
    const el=e.target as HTMLElement;
    if(panel?.contains(el)){ignoreCollapsed=true;dragged=true;return;}
    if(el.closest('dialog'))return;
    inText=!!el.closest('[data-paragraph]');close();
  },true);
  document.addEventListener('pointerup',()=>{if(inText){inText=false;schedule();}},true);
  document.addEventListener('pointercancel',()=>{inText=false;schedule();});
  document.addEventListener('click',e=>{if((e.target as HTMLElement).closest('[data-paragraph]')&&selectionInfo()){e.preventDefault();e.stopImmediatePropagation();schedule();}},true);
  document.addEventListener('keydown',e=>{
    if(!panel||document.querySelector('dialog[open]'))return;
    if(e.key==='Tab'&&!e.shiftKey&&!panel.contains(document.activeElement)&&selectionInfo()){
      e.preventDefault();find('.clip-grip').focus({preventScroll:true});
    }
    if(e.key==='Escape'){
      e.preventDefault();e.stopImmediatePropagation();
      const returnTo=panel.contains(document.activeElement)?parent(getSelection()?.anchorNode||null)?.closest<HTMLElement>('.word'):null;
      close();returnTo?.focus({preventScroll:true});
    }
  },true);
  window.addEventListener('resize',place);window.visualViewport?.addEventListener('resize',place);
  window.addEventListener('scroll',()=>{if(!panel||dragged)return;const v=selectionInfo();if(v){info=v;if(v.anchor.bottom<0||v.anchor.top>innerHeight)close();else place();}},{passive:true});
  return {close};
}
