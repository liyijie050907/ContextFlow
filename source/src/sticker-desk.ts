import {reducedMotion,setMotionMode} from './motion-mode';
import {CardRound,type CardMark} from './card-round';
import mug from './assets/mug.webp';
import croissant from './assets/croissant.webp';
import camera from './assets/camera.webp';
import headphones from './assets/headphones.webp';
import lamp from './assets/lamp.webp';
import daisy from './assets/daisy.webp';

export interface WordCard {
  id:string;
  word:string;
  zh:string;
  example:string;
  ipa:string;
  image?:string;
  tone:string;
}
const samples:WordCard[]=[
  {id:'mug',word:'Mug',zh:'马克杯',example:'She warmed her hands around the mug.',ipa:'/mʌɡ/',image:mug,tone:'peach'},
  {id:'croissant',word:'Croissant',zh:'可颂面包',example:'I picked up a warm croissant on my way home.',ipa:'/kwɑːˈsɑːnt/',image:croissant,tone:'honey'},
  {id:'camera',word:'Camera',zh:'照相机',example:'I packed my camera before the walk.',ipa:'/ˈkæmərə/',image:camera,tone:'blue'},
  {id:'headphones',word:'Headphones',zh:'头戴式耳机',example:'My headphones keep the music to myself.',ipa:'/ˈhedfoʊnz/',image:headphones,tone:'mint'},
  {id:'lamp',word:'Lamp',zh:'灯',example:'The lamp beside my bed gives a soft light.',ipa:'/læmp/',image:lamp,tone:'butter'},
  {id:'daisy',word:'Daisy',zh:'雏菊',example:'A small daisy grew beside the path.',ipa:'/ˈdeɪzi/',image:daisy,tone:'lilac'}
];
type DeskUI={
  escape:(text:string)=>string;
  icon:(name:string)=>string;
  format:(text:string)=>string;
  listCards:(id:string)=>WordCard[];
  lastMarks:()=>Map<string,CardMark|'mastered'>;
  saveMark:(id:string,mark:CardMark)=>Promise<boolean>;
  savedCards:(scope?:'visible'|'due')=>WordCard[];
  afterStudy:()=>void;
  speak:(word:string)=>void;
  announce:(text:string)=>void;
};
let ui:DeskUI;

let drawer:HTMLDialogElement|null=null;
let opener:HTMLElement|null=null;
let drawerCards:WordCard[]=[];
let drawerIndex=0;
let originalCards:WordCard[]=[];
let round=new CardRound([]);
let deckTitle='';
let busy=false;
const reduced=reducedMotion;

const esc=(text:string)=>ui.escape(text);
export function sampleArt(senseId:string){
  return samples.find(card=>'sample-sense-'+card.id===senseId);
}
export function wordArt(word:string){return samples.find(card=>card.word.toLowerCase()===word.toLowerCase());}
function art(card:WordCard){
  return card.image?`<img class="sticker-object" src="${card.image}" alt="" draggable="false">`:`<span class="type-sticker" lang="en">${esc(card.word)}</span>`;
}
export function stickerThumb(card:WordCard){
  return `<button type="button" class="sticker-tile tone-${card.tone}" data-sticker="personal" data-sense-id="${esc(card.id)}" aria-label="查看 ${esc(card.word)} 词卡">
    <span class="sticker-print">${!card.image&&card.word.includes(' ')?'<span class="quote-sticker" aria-hidden="true">“</span>':art(card)}${card.image?`<strong lang="en">${esc(card.word)}</strong>`:''}</span>
  </button>`;
}
function face(card:WordCard){
  return `<button type="button" class="card-flip tone-${card.tone}" data-sticker="flip" aria-pressed="false" aria-label="${esc(card.word)}，翻面查看词义">
    <span class="flip-inner">
      <span class="deck-face face-front" aria-hidden="true"><span class="deck-art">${card.image?art(card):`<span class="letterpress" aria-hidden="true">${esc(card.word.trim().slice(0,2))}</span>`}</span><strong lang="en">${esc(card.word)}</strong><small>轻点翻面</small></span>
      <span class="deck-face face-back" aria-hidden="true"><span class="reverse-head"><small lang="en">${esc(card.ipa)}</small><strong lang="en">${esc(card.word)}</strong></span>
      <span class="translation-face">${ui.format(card.zh)}</span>${card.example?`<small class="card-example" lang="en">${esc(card.example)}</small>`:''}</span>
    </span></button>`;
}
function controls(card:WordCard){
  return `<div class="deck-controls"><button type="button" class="round-btn" data-sticker="sound" aria-label="听 ${esc(card.word)} 发音">${ui.icon('sound')}</button></div>`;
}
function deck(){
  const card=drawerCards[drawerIndex];
  return `<div class="word-deck"><div class="deck-heading"><h2>${esc(deckTitle)}</h2><span class="deck-position" aria-live="polite">${drawerIndex+1} / ${drawerCards.length}</span></div>
    <div class="deck-stage"><div class="deck-under"></div>${face(card)}</div>
    <div class="grade-row"><button type="button" class="grade again" data-sticker="again" disabled>${ui.icon('back')}再练一次</button><button type="button" class="grade pass" data-sticker="pass" disabled>${ui.icon('check')}已过关</button></div>
    <div class="deck-toolbar"><button class="round-btn deck-prev" type="button" data-sticker="prev" aria-label="上一张词卡" ${drawerCards.length<2?'disabled':''}>${ui.icon('back')}</button>
    ${controls(card)}<button class="round-btn" type="button" data-sticker="next" aria-label="下一张词卡" ${drawerCards.length<2?'disabled':''}>${ui.icon('forward')}</button><small>已测 ${round.marks.size} / ${drawerCards.length}</small></div></div>`;
}
function visibleFace(){
  const flip=drawer?.querySelector('.card-flip');
  if(!flip||reduced())return null;
  const visible=flip.querySelector<HTMLElement>(flip.classList.contains('is-turned')?'.face-back':'.face-front');
  if(!visible)return null;
  const copy=visible.cloneNode(true) as HTMLElement;
  copy.style.setProperty('--card-stock',getComputedStyle(visible).getPropertyValue('--card-stock'));
  return copy;
}
function turnPage(leaf:HTMLElement|null,direction:number){
  const stage=drawer?.querySelector('.deck-stage');
  stage?.querySelector('.turn-leaf')?.remove();
  if(!leaf||!stage||reduced()){
    if(stage&&reduced())stage.animate([{opacity:.65},{opacity:1}],{duration:170});
    return;
  }
  const forward=direction>0;
  leaf.classList.add('turn-leaf');
  leaf.inert=true;leaf.setAttribute('aria-hidden','true');
  leaf.style.transformOrigin=forward?'5% 56%':'95% 56%';
  stage.append(leaf);
  const sign=forward?-1:1;
  const animation=leaf.animate([
    {transform:'rotateY(0deg)',opacity:1},
    {transform:`translateY(-3px) rotateY(${sign*38}deg) rotateZ(${sign*1.4}deg)`,opacity:1,offset:.4},
    {transform:`rotateY(${sign*94}deg) rotateZ(${sign*2}deg)`,opacity:.70,offset:.83},
    {transform:`rotateY(${sign*105}deg)`,opacity:0}
  ],{duration:550,easing:'cubic-bezier(.4,.05,.22,1)',fill:'both'});
  animation.onfinish=animation.oncancel=()=>leaf.remove();
}
function missedFromLast(){
  const marks=ui.lastMarks();
  return originalCards.filter(c=>marks.get(c.id)==='again');
}
function startRound(cards:WordCard[],index=0,offerPrevious=false){
  if(!drawer||!cards.length)return;
  drawerCards=cards;drawerIndex=index;round=new CardRound(cards.map(c=>c.id));
  drawer.querySelector('.word-deck')?.remove();
  drawer.insertAdjacentHTML('beforeend',deck());
  if(offerPrevious){
    const missed=missedFromLast();
    if(missed.length)drawer.querySelector('.deck-toolbar')?.insertAdjacentHTML('afterend',`<button class="previous-misses" data-sticker="previous-misses">上次待练 · ${missed.length} 词</button>`);
  }
  drawer.querySelector<HTMLElement>('.card-flip')?.focus({preventScroll:true});
}
function finishRound(){
  if(!drawer)return;
  const groups=(mark:CardMark)=>drawerCards.filter(c=>round.marks.get(c.id)===mark);
  const section=(mark:CardMark,title:string)=>{const cards=groups(mark);return `<section><h3>${title}<span>${cards.length}</span></h3>${cards.length?`<ul>${cards.map(c=>`<li lang="en">${esc(c.word)}</li>`).join('')}</ul>`:''}</section>`;};
  drawer.querySelector('.word-deck')?.remove();
  drawer.insertAdjacentHTML('beforeend',`<div class="word-deck round-summary"><h2 tabindex="-1">本轮自测</h2>${section('again','待巩固')}${section('pass','已过关')}
  <div class="button-row">${round.missed.length?`<button class="btn primary" data-sticker="retry">只练待巩固词</button>`:''}<button class="btn subtle" data-sticker="restart">重测全部</button><button class="text-btn" data-sticker="close">完成</button></div></div>`);
  drawer.querySelector<HTMLElement>('.round-summary h2')?.focus();
}
function fly(node:HTMLElement|null,target:DOMRect,collect=false){
  if(!node||reduced()||!target.width)return;
  const start=node.getBoundingClientRect();
  if(!start.width||!start.height)return;
  const copy=node.cloneNode(true) as HTMLElement;
  copy.setAttribute('aria-hidden','true');
  copy.classList.add('flying-print');
  Object.assign(copy.style,{left:start.left+'px',top:start.top+'px',width:start.width+'px',height:start.height+'px'});
  (drawer?.open?drawer:document.body).append(copy);
  const dx=target.left+target.width/2-start.left-start.width/2;
  const dy=target.top+target.height/2-start.top-start.height/2;
  const scale=collect ? .15 : Math.min(target.width/start.width,target.height/start.height);
  const animation=copy.animate([
    {transform:'translate(0,0) rotate(0) scale(1)',opacity:1},
    {transform:`translate(${dx*.26}px,${dy*.26-16}px) rotate(-8deg) scale(1.07)`,offset:.3,opacity:1},
    {transform:`translate(${dx}px,${dy}px) rotate(0) scale(${scale})`,opacity:collect?0:1}
  ],{duration:collect?540:430,easing:'cubic-bezier(.22,.8,.25,1)'});
  animation.onfinish=animation.oncancel=()=>copy.remove();
}
export function animateToNotebook(origin:HTMLElement|null){
  const target=document.querySelector('[data-nav="notebook"]');
  if(target)fly(origin,target.getBoundingClientRect(),true);
}
function closeDrawer(){
  const old=drawer;
  if(!old)return;
  document.body.classList.remove('study-open');document.dispatchEvent(new Event('cf-deck-close'));busy=false;
  old.close();
  old.remove();
  drawer=null;
  ui.afterStudy();
  if(opener?.isConnected)opener.focus({preventScroll:true});
  opener=null;
}
function openDrawer(cards:WordCard[],id:string|undefined,origin:HTMLElement,title:string){
  if(!cards.length)return;
  closeDrawer();
  originalCards=[...new Map(cards.map(c=>[c.id,c])).values()];
  opener=origin;deckTitle=title;
  drawer=document.createElement('dialog');
  drawer.className='deck-dialog';drawer.setAttribute('aria-label',title);
  drawer.innerHTML=`<button type="button" class="round-btn drawer-close" data-sticker="close" aria-label="关闭词卡">${ui.icon('close')}</button>`;
  if(reduced())drawer.insertAdjacentHTML('beforeend','<button type="button" class="motion-invite" data-sticker="enable-motion">开启完整翻页动效</button>');
  document.body.append(drawer);drawer.showModal();
  document.body.classList.add('study-open');document.dispatchEvent(new Event('cf-deck-open'));
  startRound(originalCards,Math.max(0,originalCards.findIndex(c=>c.id===id)),true);
  drawer.addEventListener('cancel',e=>{e.preventDefault();closeDrawer();});
  drawer.addEventListener('click',e=>{if(e.target===drawer){const r=drawer!.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDrawer();}});
}
function display(index:number,direction:number){
  if(!drawer)return;
  const old=visibleFace();
  const focused=(document.activeElement as HTMLElement)?.dataset.sticker;
  drawerIndex=index;
  drawer.querySelector('.word-deck')?.remove();
  drawer.insertAdjacentHTML('beforeend',deck());
  const focus=focused==='prev'||focused==='next'?focused:'flip';
  drawer.querySelector<HTMLElement>('[data-sticker="'+focus+'"]')?.focus({preventScroll:true});
  turnPage(old,direction);
}
export function setupStickerDesk(callbacks:DeskUI){
  ui=callbacks;
  window.addEventListener('hashchange',closeDrawer);
  document.addEventListener('click',async e=>{
    const button=(e.target as HTMLElement).closest<HTMLElement>('[data-sticker]');
    if(!button)return;
    const action=button.dataset.sticker;
    if(action==='close'){closeDrawer();return;}
    if(action==='personal'||action==='saved-deck'||action==='due-deck'){
      const due=action==='due-deck';
      openDrawer(ui.savedCards(due?'due':'visible'),button.dataset.senseId,button,due?'待复习词卡':'我的词卡');return;
    }
    if(action==='list-deck'){
      openDrawer(ui.listCards(button.dataset.set!),undefined,button,button.dataset.name||'词表自测');return;
    }
    if(action==='enable-motion'){setMotionMode('full');button.remove();drawer?.querySelector<HTMLElement>('.card-flip')?.focus();return;}
    if(!drawer||busy)return;
    if(action==='previous-misses'){startRound(missedFromLast());return;}
    if(action==='retry'){startRound(drawerCards.filter(c=>round.marks.get(c.id)==='again'));return;}
    if(action==='restart'){startRound(originalCards);return;}
    const cards=drawerCards, index=drawerIndex,card=cards[index];
    if(!card)return;
    if(action==='next'||action==='prev'){
      const direction=action==='next'?1:-1;
      display((index+direction+cards.length)%cards.length,direction);
    }else if(action==='flip'){
      const leaf=visibleFace();
      const turned=button.classList.toggle('is-turned');
      button.setAttribute('aria-pressed',String(turned));
      button.setAttribute('aria-label',turned?card.word+'，'+card.zh+'。'+card.example+'。翻回正面':card.word+'，翻面查看词义');
      drawer.querySelectorAll<HTMLButtonElement>('.grade').forEach(b=>b.disabled=!turned);
      turnPage(leaf,turned?1:-1);
    }else if(action==='pass'||action==='again'){
      if(!drawer.querySelector('.card-flip.is-turned'))return;
      const current=drawer;busy=true;
      const success=await ui.saveMark(card.id,action);
      if(drawer!==current)return;
      busy=false;if(!success)return;
      round.grade(card.id,action);
      const next=round.nextUnseen(index);
      if(next<0)finishRound();else display(next,1);
    }else if(action==='sound'){
      try{ui.speak(card.word);}catch(error){ui.announce((error as Error).message);}
    }
  });
  let start:{x:number;y:number;button:HTMLElement;id:number}|undefined;
  let suppress:HTMLElement|null=null;
  document.addEventListener('pointerdown',e=>{
    const button=(e.target as HTMLElement).closest<HTMLElement>('.card-flip');
    if(button&&e.isPrimary&&e.button===0){start={x:e.clientX,y:e.clientY,button,id:e.pointerId};button.setPointerCapture(e.pointerId);}
  });
  document.addEventListener('pointermove',e=>{
    if(!start||start.id!==e.pointerId||reduced())return;
    const dx=e.clientX-start.x,dy=e.clientY-start.y;
    if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy))start.button.style.transform=`translateX(${Math.max(-48,Math.min(48,dx*.4))}px) rotate(${Math.max(-6,Math.min(6,dx*.04))}deg)`;
  });
  document.addEventListener('pointercancel',()=>{if(start)start.button.style.transform='';start=undefined;});
  document.addEventListener('pointerup',e=>{
    if(!start||start.id!==e.pointerId)return;
    const {x,y,button}=start;start=undefined;button.style.transform='';
    const dx=e.clientX-x;
    if(Math.abs(dx)<40||Math.abs(dx)<1.35*Math.abs(e.clientY-y))return;
    const cards=drawerCards;
    if(cards.length<2)return;
    suppress=button;setTimeout(()=>{if(suppress===button)suppress=null;},350);
    if(!busy)display((drawerIndex+(dx<0?1:-1)+cards.length)%cards.length,dx<0?1:-1);
  });
  document.addEventListener('click',e=>{if(suppress&&suppress.contains(e.target as Node)){e.preventDefault();e.stopImmediatePropagation();suppress=null;}},true);
  document.addEventListener('keydown',e=>{
    if(!drawer||!['ArrowRight','ArrowLeft'].includes(e.key))return;
    e.preventDefault();drawer.querySelector<HTMLElement>('[data-sticker="'+(e.key==='ArrowRight'?'next':'prev')+'"]')?.click();
  });
}

