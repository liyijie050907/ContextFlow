export type CardMark='pass'|'again';
export class CardRound {
  readonly marks=new Map<string,CardMark>();
  constructor(readonly ids:string[]){}
  grade(id:string,mark:CardMark){
    if(!this.ids.includes(id))return;
    this.marks.set(id,mark);
  }
  nextUnseen(index:number){
    for(let i=1;i<=this.ids.length;i++){
      const next=(index+i)%this.ids.length;
      if(!this.marks.has(this.ids[next]))return next;
    }
    return -1;
  }
  get missed(){return this.ids.filter(id=>this.marks.get(id)==='again');}
}
