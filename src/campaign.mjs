import {Game} from './game.mjs';
export class Campaign{
  constructor(tuning,seed=202603630){this.t=tuning;this.seed=seed;this.night=1;this.scores=[];this.screen='menu';this.game=null;}
  get total(){return this.scores.reduce((sum,n)=>sum+n,0);}
  begin(){this.night=1;this.scores=[];this.screen='intro';this.game=new Game(this.t,this.seed,{},1);return this.game;}
  play(){if(!this.game)this.begin();this.screen='playing';return this.game;}
  complete(){if(!['won','lost'].includes(this.game?.state))return;this.screen='result';if(this.game.state==='won'){this.scores[this.night-1]=this.game.score;if(this.night===3)this.screen='dawn';}}
  next(){if(this.game?.state!=='won'||this.night>=3)return null;this.night++;this.game=new Game(this.t,this.seed+this.night-1,{},this.night);this.screen='intro';return this.game;}
  retry(){this.scores=this.scores.slice(0,this.night-1);this.game=new Game(this.t,this.seed+this.night-1,{},this.night);this.screen='intro';return this.game;}
  menu(){this.screen='menu';}
}
