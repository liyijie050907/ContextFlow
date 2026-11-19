/*! React Bits — https://github.com/DavidHDev/react-bits
MIT + Commons Clause License Condition v1.0

Copyright (c) 2026 David Haz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, and distribute the Software **as part of an application, website, or product**, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

## Commons Clause Restriction

You may use this Software, including for any commercial purpose, **so long as you do not sell, sublicense, or redistribute the components themselves-whether alone, in a bundle, or as a ported version.**

The same restriction covers the React Bits tools (Background Studio, Texture Lab, Shape Magic, Center Stage, Sound Lab and any tools added later) and the sounds in the sound library. **You may not sell, sublicense, or redistribute the tools or the sounds themselves, or offer the tools or a substantially similar copy of them as a hosted service-whether alone, in a bundle, or as a ported version.**

What you make with the tools is yours to use. You can use exported code, images, videos, and audio files in any personal or commercial application, website, or product, including paid ones. **You may not sell or redistribute the exports on their own, either individually or as the product itself, such as a sound, texture, background, or template pack.**

## No Warranty

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/
// ContextFlow's native adaptations of React Bits Dock, Spotlight Card and Letter Glitch.
import {rippleGrid} from './ripple-grid';
import {reducedMotion} from './motion-mode';
const surfaceSelector='.target-list button,.lex-card summary,.notebook-item,.btn,.round-btn,.deck-face,.clip-panel button,.collection';

function setupDockHints(){
  let item:HTMLElement|null=null,timer=0;
  function clear(){window.clearTimeout(timer);item?.removeAttribute('data-hint-open');item=null;}
  function arm(node:HTMLElement){
    if(item===node)return;
    clear();item=node;
    timer=window.setTimeout(()=>{if(node.isConnected&&(node.matches(':hover')||node.matches(':focus-visible')))node.dataset.hintOpen='true';},5200);
  }
  document.addEventListener('pointerover',e=>{
    const target=(e.target as Element).closest<HTMLElement>('[data-nav]');
    if(target&&e.pointerType!=='touch')arm(target);
  });
  document.addEventListener('pointerout',e=>{
    if(item&&item.contains(e.target as Node)&&!(e.relatedTarget instanceof Node&&item.contains(e.relatedTarget)))clear();
  });
  document.addEventListener('focusin',e=>{
    const link=(e.target as Element).closest<HTMLElement>('[data-nav]');
    if(link?.matches(':focus-visible'))arm(link);
  });
  document.addEventListener('focusout',e=>{if(item?.contains(e.target as Node))clear();});
  document.addEventListener('pointerdown',clear,true);
  document.addEventListener('visibilitychange',clear);
  window.addEventListener('blur',clear);window.addEventListener('hashchange',clear);
}

export function setupSurfaceMotion(){
  setupDockHints();
  const canvas=document.createElement('canvas');canvas.className='letter-field';canvas.setAttribute('aria-hidden','true');document.body.prepend(canvas);
  const grid=rippleGrid(canvas);
  const cursor=document.createElement('div');cursor.className='target-cursor';cursor.ariaHidden='true';cursor.innerHTML='<i></i><i></i><i></i><i></i>';document.body.append(cursor);
  const edge=document.createElement('div');edge.className='edge-blur';edge.ariaHidden='true';edge.innerHTML='<i></i><i></i><i></i>';document.body.append(edge);
  let frame=0,px=0,py=0,target:Element|null=null,dirty=false;
  let lit:HTMLElement|null=null,dock:HTMLElement|null=null,tilted:HTMLElement|null=null,title:HTMLElement|null=null;
  function schedule(){if(!frame)frame=requestAnimationFrame(draw);}
  function resetTitle(){
    if(!title)return;
    title.querySelectorAll<HTMLElement>('span').forEach(n=>{n.style.removeProperty('--lift');n.style.removeProperty('--slant');});
    title.removeAttribute('data-stretch'); title=null;
  }
  function clear(){
    cancelAnimationFrame(frame);frame=0;target=null;dirty=false;grid.reset();cursor.classList.remove('locked');resetTitle();
    if(tilted){tilted.style.removeProperty('--tilt-x');tilted.style.removeProperty('--tilt-y');tilted=null;}
    lit?.removeAttribute('data-lit');lit=null;
    dock?.querySelectorAll<HTMLElement>('a').forEach(n=>n.style.removeProperty('--dock-weight'));dock=null;
  }
  function updateTitle(){
    const next=target?.closest<HTMLElement>('.elastic-title')||null;
    if(title!==next)resetTitle();
    title=next;if(!title)return;
    const box=title.getBoundingClientRect();const x=px-box.left,y=py-box.top;
    title.dataset.stretch='true';
    title.querySelectorAll<HTMLElement>('span').forEach(ch=>{
      const d=ch.offsetLeft+ch.offsetWidth/2-x,w=Math.exp(-d*d/1450);
      ch.style.setProperty('--lift',(5*w*(y/box.height-.8))+'px');ch.style.setProperty('--slant',(d/10*w)+'deg');
    });
    const net=title.querySelector<SVGPathElement>('.title-net path');if(!net)return;
    const paths:string[]=[];
    function node(nx:number,ny:number){
      const pull=Math.exp(-((nx-x)**2+(ny-y)**2)/1450);
      return (nx+(x-nx)*.26*pull).toFixed(1)+' '+(ny+(y-ny)*.36*pull).toFixed(1);
    }
    for(let row=1;row<=3;row++){
      const points=[];for(let nx=0;nx<box.width+17;nx+=16)points.push(node(nx,row*box.height/4));
      paths.push('M'+points.join(' L'));
    }
    for(let nx=0;nx<=box.width;nx+=16)paths.push('M'+[0,1,2,3,4].map(row=>node(nx,row*box.height/4)).join(' L'));
    net.setAttribute('d',paths.join(' '));
  }
  function draw(t:number){
    frame=0;if(reducedMotion()||document.hidden){clear();return;}
    if(dirty){
      dirty=false;
      const host=target?.closest<HTMLElement>(surfaceSelector)||null;
      if(host!==lit){lit?.removeAttribute('data-lit');lit=host;if(lit)lit.dataset.lit='true';}
      if(lit){const r=lit.getBoundingClientRect();lit.style.setProperty('--light-x',(px-r.left)+'px');lit.style.setProperty('--light-y',(py-r.top)+'px');}
      const card=target?.closest<HTMLElement>('.card-flip')||null;
      if(tilted!==card&&tilted){tilted.style.removeProperty('--tilt-x');tilted.style.removeProperty('--tilt-y');}
      tilted=card;
      if(card){
        const r=card.getBoundingClientRect();card.style.setProperty('--tilt-x',((.5-(py-r.top)/r.height)*15)+'deg');card.style.setProperty('--tilt-y',(((px-r.left)/r.width-.5)*19)+'deg');
      }
      const nav=target?.closest<HTMLElement>('.app-nav')||null;
      if(dock!==nav){dock?.querySelectorAll<HTMLElement>('a').forEach(a=>a.style.removeProperty('--dock-weight'));dock=nav;}
      if(dock)for(const a of dock.querySelectorAll<HTMLElement>('a')){const r=a.getBoundingClientRect();a.style.setProperty('--dock-weight',Math.max(0,1-Math.abs(px-r.left-r.width/2)/70).toFixed(2));}
      updateTitle();
      const control=target?.closest<HTMLElement>('a[href],button:not(:disabled),summary,.word[role=button],select');
      if(control&&!control.closest('.card-flip,.turn-leaf')&&!document.getSelection()?.toString()){
        const r=control.getBoundingClientRect(),parent=control.closest('dialog')||document.body;
        if(cursor.parentElement!==parent)parent.append(cursor);
        // A transformed native dialog is a containing block during its entrance.
        cursor.style.cssText='left:'+(r.left-3)+'px;top:'+(r.top-3)+'px;width:'+(r.width+6)+'px;height:'+(r.height+6)+'px';
        cursor.classList.add('locked');
      }else cursor.classList.remove('locked');
      if(target&&!target.closest('button,a,input,select,textarea,summary,dialog,.article-body,.lex-unit,.notebook-item,.word-card,.clip-panel,.target-list,.elastic-title')&&!document.querySelector('dialog[open]')){
        grid.push(px,py,t);
      }else grid.reset();
    }
    if(grid.paint(t))schedule();
  }
  document.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch'||reducedMotion())return;
    px=e.clientX;py=e.clientY;target=e.target instanceof Element?e.target:null;dirty=true;schedule();
  },{passive:true});
  document.addEventListener('pointerout',e=>{if(!e.relatedTarget)clear();});
  document.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')clear();},{passive:true});
  window.addEventListener('scroll',clear,{passive:true});
  for(const event of ['resize','blur','hashchange'])window.addEventListener(event,clear);
  for(const event of ['visibilitychange','cf-motion-change','cf-deck-open','cf-deck-close'])document.addEventListener(event,clear);
}
