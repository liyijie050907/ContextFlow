// The grid is sampled in document coordinates. Each wave bends those same lines.
type Wave={x:number;y:number;at:number};
const step=32,life=900;
const glyphs='aebfkhnqrstuxy:;+=?/·';
export function rippleGrid(canvas:HTMLCanvasElement){
 const ctx=canvas.getContext('2d');
 let waves:Wave[]=[],last:Wave|undefined,previous:{x:number;y:number;w:number;h:number}|undefined;
 let width=0,height=0;
 function erase(){
   if(previous&&ctx)ctx.clearRect(previous.x,previous.y,previous.w,previous.h);
   previous=undefined;
 }
 function reset(){erase();waves=[];last=undefined;}
 function push(x:number,y:number,time:number){
   if(last&&time-last.at<85)return;
   if(last&&Math.hypot(x-last.x,y-last.y)<10&&time-last.at<290)return;
   last={x,y,at:time};waves.push(last);waves=waves.slice(-4);
 }
 function paint(t:number){
   if(!ctx)return false;
   if(width!==innerWidth||height!==innerHeight){
     width=innerWidth;height=innerHeight;const scale=Math.min(devicePixelRatio||1,1.6);
     canvas.width=Math.ceil(width*scale);canvas.height=Math.ceil(height*scale);ctx.setTransform(scale,0,0,scale,0,0);
   }
   erase();waves=waves.filter(w=>t-w.at<life);
   if(!waves.length)return false;
   const margin=215;
   const x0=Math.max(0,Math.min(...waves.map(w=>w.x))-margin),y0=Math.max(0,Math.min(...waves.map(w=>w.y))-margin);
   const x1=Math.min(width,Math.max(...waves.map(w=>w.x))+margin),y1=Math.min(height,Math.max(...waves.map(w=>w.y))+margin);
   previous={x:x0-3,y:y0-3,w:x1-x0+6,h:y1-y0+6};
   const dark=document.documentElement.dataset.theme==='dark';
   const color=dark?'192,163,249':'121,86,177';
   const offset=scrollY%step;
   function sample(x:number,y:number){
     let dx=0,dy=0,light=0;
     for(const wave of waves){
       const age=Math.min(1,Math.max(0,(t-wave.at)/life)),vx=x-wave.x,vy=y-wave.y,dist=Math.hypot(vx,vy);
       const pos=(dist-(14+174*age))/23,envelope=Math.exp(-pos*pos)*(1-age);
       const bend=12*envelope*Math.cos(pos*1.4)/(dist||1);
       dx+=vx*bend;dy+=vy*bend;light+=envelope;
     }
     return {x:x+dx,y:y+dy,light:Math.min(1,light)};
   }
   ctx.lineCap='round';ctx.lineWidth=1.35;
   function segment(x:number,y:number,dx:number,dy:number){
     if(!ctx)return;
     const a=sample(x,y),b=sample(x+dx/2,y+dy/2),c=sample(x+dx,y+dy);
     const alpha=Math.max(a.light,b.light,c.light);if(alpha<.018)return;
     ctx.strokeStyle='rgba('+color+','+(.82*alpha)+')';
     ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo(b.x,b.y,c.x,c.y);ctx.stroke();
     if(alpha>.32){
       ctx.lineWidth=3.5;ctx.strokeStyle='rgba('+color+','+(alpha*.14)+')';ctx.stroke();ctx.lineWidth=1.35;
     }
   }
   ctx.font='13px ui-monospace,Consolas,monospace';ctx.textAlign='center';
   for(let x=Math.floor(x0/step)*step;x<=x1;x+=step){
     for(let y=Math.floor((y0+offset)/step)*step-offset;y<=y1;y+=step){
       segment(x,y,step,0);segment(x,y,0,step);
       const cell=sample(x+step/2,y+step/2);
       if(cell.light>.06){
         const seed=Math.abs((Math.round(x/step)*73856093)^(Math.round((y+scrollY)/step)*19349663));
         ctx.fillStyle='rgba('+color+','+(.72*cell.light)+')';ctx.fillText(glyphs[seed%glyphs.length],cell.x,cell.y+4);
       }
     }
   }
   return true;
 }
 return {push,paint,reset};
}