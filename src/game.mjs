import {EPS,nightMap,surfaceAt,moveHorizontal,xzDistance,direction,idOrder} from './world.mjs';
export const DT=1/60;
export const ISLAND_RADIUS=40;
const round=n=>Number(n.toFixed(3));
const posCopy=p=>p.map(round);
export function seededRandom(seed){let value=seed>>>0;return()=>{value+=0x6D2B79F5;let n=value;n=Math.imul(n^n>>>15,n|1);n^=n+Math.imul(n^n>>>7,n|61);return((n^n>>>14)>>>0)/4294967296;};}
export class Game{
  constructor(tuning,seed=1,scenario={},night=1){
    this.t=tuning;this.night=night;this.map=nightMap(night);this.random=seededRandom(seed);this.tick=0;this.simTick=0;this.state='playing';this.score=0;this.events=[];
    this.initialTime=scenario.time_left_s??tuning['night'+night+'_duration_s'];this.timeLeft=this.initialTime;
    this.input={move:[0,0],cam_yaw_deg:0,jump:false,interact:false,pulse:false,dash:false,pause:false};
    this.player={pos:[...this.map.spawn],vel:[0,0,0],carried:0,flames:tuning.flames,grounded:true,facing:[0,1],invulnTicks:0,dashCd:0,pulseCd:0,charmTicks:0,dashTicks:0,dashDir:[0,1],savedVy:0,launch:null,respawnTicks:0};
    const p=this.player,s=scenario.player??{};
    for(const key of ['pos','carried','flames'])if(key in s)p[key]=structuredClone(s[key]);
    p.successfulLights=s.successful_lights??0;
    for(const [key,field]of Object.entries({invuln_ticks:'invulnTicks',dash_cd_ticks:'dashCd',pulse_cd_ticks:'pulseCd',charm_ticks:'charmTicks'}))p[field]=s[key]??0;
    p.grounded=Math.abs((surfaceAt(night,p.pos[0],p.pos[2])??Infinity)-p.pos[1])<=EPS;
    this.randomMotes=scenario.random_motes??true;this.randomShades=scenario.random_shades??true;this.randomDrifters=scenario.random_drifters??true;this.windEnabled=scenario.wind_enabled??true;
    this.wind={active:false,dir_deg:0,warning:false};this.nextMote=1;this.nextShade=1;this.nextDrifter=1;this.nextCharm=1;
    this.motes=[];this.shades=[];this.drifters=[];
    this.lanterns=this.map.lanterns.map((pos,i)=>({id:'L'+(i+1),pos:[...pos],lit:false,deposited:0,fuelUnits:0,ever_lit:false,relit_count:0}));
    for(const update of scenario.lanterns??[]){
      const l=this.lanterns.find(l=>l.id===update.id);Object.assign(l,structuredClone(update));
      if(l.lit){l.ever_lit=true;l.deposited=l.relit_count>0?tuning.relight_cost:tuning.lantern_cost;}
      else if(l.deposited>=this.lightCost(l)){l.lit=true;l.ever_lit=true;}
      l.fuelUnits=l.lit?Math.round((update.fuel??tuning.fuel_max)*60):0;delete l.fuel;
    }
    this.charms=this.map.charms.map((pos,i)=>({id:'C'+(i+1),pos:[...pos],available:true,respawnTicks:0}));
    if(scenario.charms!==undefined)this.charms=scenario.charms.map((c,i)=>({id:c.id??'C'+(i+1),pos:[...(c.pos??this.map.charms[i]??[0,0,0])],available:c.available??true,respawnTicks:c.respawn_ticks??Math.round((c.respawn_s??0)*60)}));
    if(scenario.motes!==undefined){for(const mote of scenario.motes)this.addMote(Array.isArray(mote)?mote:mote.pos,Array.isArray(mote)?{}:mote);}
    else if(this.randomMotes){const points=this.shuffle(this.map.motes);for(const pos of points.slice(0,20))this.addMote(pos);}
    const reserved=new Set((scenario.shades??[]).flatMap(s=>s.id?[s.id]:[]));
    for(const shade of scenario.shades??[]){while(reserved.has('S'+this.nextShade))this.nextShade++;this.addShade(shade.pos,shade);}
    for(const d of scenario.drifters??[])this.addDrifter(d.pos,d);
  }
  shuffle(items){const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
  emit(name,data={}){this.events.push({type:'event',tick:this.tick,name,data});}
  nextId(prefix,key,list){while(list.some(v=>v.id===prefix+this[key]))this[key]++;return prefix+this[key]++;}
  addMote(pos,options={}){const m={id:options.id??this.nextId('M','nextMote',this.motes),pos:[...pos],kind:options.kind??'random',ttl:options.ttl_ticks??Math.round((options.ttl_s??8)*60),born:this.simTick};this.motes.push(m);return m;}
  addShade(pos,options={}){const s={id:options.id??this.nextId('S','nextShade',this.shades),pos:[...pos],state:options.state??'chase',stateTicks:options.state_ticks_left??0,pushTicks:0,pushDir:[1,0],recoilTicks:options.state==='recoil'?(options.state_ticks_left??60):0,recoilDir:[1,0],safeTicks:0,safeDir:[1,0],safeStep:0,wander:[0,1],targetLanternId:options.target_lantern_id??null,drainTicks:0,born:this.simTick};this.shades.push(s);return s;}
  addDrifter(pos,options={}){const d={id:options.id??this.nextId('D','nextDrifter',this.drifters),pos:[...pos],home:[...pos],state:options.state??'idle',stolen:options.stolen??0,stateTicks:options.state_ticks_left??240,fleeDir:direction(this.player.pos,pos),dropped:false,born:this.simTick};this.drifters.push(d);return d;}
  get hitUntil(){return this.simTick+this.player.invulnTicks;}
  get pulseUntil(){return this.simTick+this.player.pulseCd;}
  get capacity(){return Math.min(this.t.capacity_max,this.t.carry_capacity+2*this.player.successfulLights);}
  lightCost(l){return l.ever_lit?this.t.relight_cost:this.t.lantern_cost;}
  fuel(l){return Number((l.fuelUnits/60).toFixed(1));}
  protected(l){return l.lit&&l.fuelUnits>=this.t.low_fuel_threshold*60;}
  canReceive(l){return !l.lit||l.fuelUnits<this.t.fuel_max*60;}
  fuelStep(){
    for(const l of this.lanterns)if(l.lit)l.fuelUnits-=this.t.fuel_decay_per_s;
    const drains=[];
    for(const s of this.shades){
      const l=this.lanterns.find(l=>l.id===s.targetLanternId);
      if(s.state==='drain'&&l?.lit&&l.fuelUnits<this.t.low_fuel_threshold*60&&xzDistance(s.pos,l.pos)<=2+EPS){l.fuelUnits-=this.t.drain_per_s;s.drainTicks++;if(s.drainTicks%60===0)drains.push({s,l});}
    }
    for(const {s,l} of drains)this.emit('fuel_drain',{lantern_id:l.id,shade_id:s.id,fuel:this.fuel({...l,fuelUnits:Math.max(0,l.fuelUnits)})});
    for(const l of this.lanterns)if(l.lit&&l.fuelUnits<=0){l.lit=false;l.fuelUnits=0;l.deposited=0;this.emit('lantern_out',{lantern_id:l.id});}
  }
  dropMotes(amount,pos,scatter=true){for(let i=0;i<amount;i++){const a=this.random()*Math.PI*2,r=scatter?1.5+this.random():0;const x=pos[0]+Math.cos(a)*r,z=pos[2]+Math.sin(a)*r;this.addMote([x,surfaceAt(this.night,x,z)??pos[1],z],{kind:'dropped',ttl_ticks:480});}}
  counters(){
    const p=this.player;
    for(const field of ['invulnTicks','dashCd','pulseCd','charmTicks','dashTicks'])p[field]=Math.max(0,p[field]-1);
    this.motes=this.motes.filter(m=>m.kind!=='dropped'||--m.ttl>0);
    for(const c of this.charms)if(!c.available){c.respawnTicks=Math.max(0,c.respawnTicks-1);if(c.respawnTicks===0)c.available=true;}
    for(const s of this.shades){s.stateTicks=Math.max(0,s.stateTicks-1);s.recoilTicks=Math.max(0,s.recoilTicks-1);}
    for(const d of this.drifters)if(d.state==='flee'&&--d.stateTicks<=0)d.state='removed';
    this.drifters=this.drifters.filter(d=>d.state!=='removed');
    this.timeLeft=Math.max(0,this.initialTime-this.simTick*DT);
    this.fuelStep();
    if(this.night===3&&this.windEnabled){
      const cycle=this.simTick%1800;
      if(cycle===1680)this.wind.dir_deg=this.random()*360;
      this.wind.warning=cycle>=1680;
      this.wind.active=this.simTick>=1800&&cycle<300;
    }else this.wind={active:false,dir_deg:0,warning:false};
  }
  movePlayer(input,edge){
    const p=this.player,t=this.t;
    if(p.respawnTicks>0){
      p.respawnTicks--;p.vel=[0,0,0];
      if(p.respawnTicks===0){p.pos=[...this.map.spawn];p.grounded=true;p.invulnTicks=90;p.launch=null;p.dashTicks=0;p.savedVy=0;}
      return;
    }
    let [x,z]=input.move;const magnitude=Math.hypot(x,z);if(magnitude>1){x/=magnitude;z/=magnitude;}
    const a=input.cam_yaw_deg*Math.PI/180;const move=[x*Math.cos(a)+z*Math.sin(a),-x*Math.sin(a)+z*Math.cos(a)];
    if(magnitude>EPS)p.facing=direction([0,0,0],[move[0],0,move[1]]);
    if(edge('jump')&&p.grounded){p.vel[1]=7;p.grounded=false;}
    if(edge('dash')&&p.dashTicks===0&&(p.dashCd===0||p.charmTicks>0)){
      p.dashTicks=12;p.dashCd=p.charmTicks>0?0:90;p.dashDir=[...p.facing];p.savedVy=p.vel[1];p.vel[1]=0;this.emit('dash');
    }
    if(p.dashTicks===0&&p._wasDashing){p.vel[1]=p.savedVy;p._wasDashing=false;}
    const speed=p.charmTicks>0?7.2:t.player_speed;
    let horizontal=p.launch?[...p.launch]:[move[0]*speed,move[1]*speed];
    if(p.dashTicks>0){horizontal=p.dashDir.map(v=>v*t.dash_speed);p._wasDashing=true;}
    if(this.wind.active){const w=this.wind.dir_deg*Math.PI/180;horizontal[0]+=2*Math.cos(w);horizontal[1]+=2*Math.sin(w);}
    const old=[...p.pos];
    const moved=moveHorizontal(this.night,p.pos,horizontal[0]*DT,horizontal[1]*DT,{grounded:p.grounded});
    p.pos=moved;p.vel[0]=(p.pos[0]-old[0])/DT;p.vel[2]=(p.pos[2]-old[2])/DT;
    const ground=surfaceAt(this.night,p.pos[0],p.pos[2]);
    if(ground===null||Math.abs(p.pos[1]-ground)>EPS)p.grounded=false;
    if(p.dashTicks===0){
      if(!p.grounded){p.pos[1]+=p.vel[1]*DT;p.vel[1]-=20*DT;}
      if(ground!==null&&p.pos[1]<=ground+EPS&&old[1]>=ground-EPS&&p.vel[1]<=0){p.pos[1]=ground;p.vel[1]=0;p.grounded=true;p.launch=null;}
    }
    for(const pad of this.map.pads)if(p.grounded&&xzDistance(p.pos,pad.pos)<=1+EPS&&Math.abs(p.pos[1]-pad.pos[1])<=EPS){const d=direction(pad.pos,pad.target);p.vel[1]=pad.vy;if(p.dashTicks>0){p.savedVy=pad.vy;p.vel[1]=0;}p.launch=d.map(v=>v*pad.speed);p.grounded=false;break;}
    if(p.pos[1]<-10&&p.respawnTicks===0){const lost=p.carried;p.carried=0;p.flames--;p.respawnTicks=60;p.vel=[0,0,0];p.dashTicks=0;p.launch=null;this.emit('player_hit',{by:'fall',flames:p.flames,dropped:0,lost});}
  }
  pickup(){
    const p=this.player;if(p.respawnTicks>0)return;
    const near=pos=>xzDistance(p.pos,pos)<=this.t.pickup_radius+EPS&&Math.abs(p.pos[1]-pos[1])<=1.5+EPS;
    this.motes=this.motes.filter(m=>{if(p.carried<this.capacity&&(m.kind!=='dropped'||m.born<this.simTick)&&near(m.pos)){p.carried++;this.emit('mote_picked',{carried:p.carried});return false;}return true;});
    for(const c of this.charms)if(c.available&&near(c.pos)){c.available=false;c.respawnTicks=2700;p.charmTicks=600;this.emit('charm_picked',{charm_id:c.id,charm_ticks:600});}
  }
  deposit(edge){
    const p=this.player;if(!edge('interact')||p.carried===0||p.respawnTicks>0)return;
    const candidates=this.lanterns.filter(l=>this.canReceive(l)&&xzDistance(l.pos,p.pos)<=this.t.interact_radius+EPS).sort((a,b)=>xzDistance(a.pos,p.pos)-xzDistance(b.pos,p.pos)||idOrder(a,b));
    const l=candidates[0];if(!l)return;
    if(l.lit){const amount=Math.min(p.carried,Math.ceil((this.t.fuel_max*60-l.fuelUnits)/(this.t.fuel_per_mote*60)));if(amount<=0)return;p.carried-=amount;l.fuelUnits=Math.min(this.t.fuel_max*60,l.fuelUnits+amount*this.t.fuel_per_mote*60);this.score+=amount*this.t.score.per_mote;this.emit('refuel',{lantern_id:l.id,amount,fuel:this.fuel(l)});return;}
    const cost=this.lightCost(l),amount=Math.min(p.carried,cost-l.deposited);p.carried-=amount;l.deposited+=amount;this.score+=amount*this.t.score.per_mote;
    this.emit('deposit',{lantern_id:l.id,amount,deposited:l.deposited});
    if(l.deposited===cost){const relight=l.ever_lit;l.lit=true;l.fuelUnits=this.t.fuel_max*60;l.ever_lit=true;if(relight)l.relit_count++;p.successfulLights++;this.score+=relight?this.t.score.per_relight:this.t.score.per_lantern;this.emit('lantern_lit',{lantern_id:l.id,relight});}
  }
  safeZones(){
    for(const s of this.shades){
      const inside=this.lanterns.find(l=>this.protected(l)&&xzDistance(s.pos,l.pos)<this.t.safe_radius-EPS);
      if(!inside){s.safeTicks=0;s.safeMoving=false;continue;}
      if(inside&&s.safeTicks===0){s.safeTicks=30;s.safeDir=direction(inside.pos,s.pos);s.safeStep=(this.t.safe_radius-xzDistance(s.pos,inside.pos))/30;}
      if(s.safeTicks>0){s.pos[0]+=s.safeDir[0]*s.safeStep;s.pos[2]+=s.safeDir[1]*s.safeStep;s.safeTicks--;s.safeMoving=true;}else s.safeMoving=false;
    }
  }
  pulse(edge){
    const p=this.player,t=this.t;if(!edge('pulse')||p.respawnTicks>0||p.pulseCd>0||p.carried<t.pulse_cost)return;
    p.carried-=t.pulse_cost;p.pulseCd=180;
    const center=[p.pos[0],p.pos[1]+.8,p.pos[2]],stunned=[];
    const inRange=s=>Math.hypot(s.pos[0]-center[0],s.pos[1]-center[1],s.pos[2]-center[2])<=t.pulse_radius+EPS;
    for(const s of this.shades)if(inRange(s)){const wasDraining=s.state==='drain';s.state='stunned';s.stateTicks=120;s.pushTicks=15;s.pushDir=direction(p.pos,s.pos);s.recoilTicks=0;s.drainTicks=0;stunned.push(s.id);this.score+=wasDraining?t.score.per_drain_stun:t.score.per_stun;}
    this.emit('pulse',{stunned_ids:stunned});
    for(const d of this.drifters)if(inRange(d)){
      if(d.state==='chase'){d.state='flee';d.stateTicks=240;d.fleeDir=direction(p.pos,d.pos);}
      else if(d.state==='flee'&&d.stolen>0){const amount=d.stolen;d.stolen=0;d.dropped=true;d.stateTicks=120;this.dropMotes(amount,[d.pos[0],surfaceAt(this.night,d.pos[0],d.pos[2])??0,d.pos[2]],false);this.emit('drifter_drop',{drifter_id:d.id,amount});}
    }
  }
  moveShade(s,dx,dz){
    let fraction=1;
    for(const l of this.lanterns){if(!this.protected(l))continue;const ox=s.pos[0]-l.pos[0],oz=s.pos[2]-l.pos[2];const a=dx*dx+dz*dz,b=2*(ox*dx+oz*dz),c=ox*ox+oz*oz-this.t.safe_radius**2;const disc=b*b-4*a*c;
      if(a>EPS&&c>=-EPS&&disc>=0){const root=(-b-Math.sqrt(disc))/(2*a);if(root>=-EPS&&root<=fraction)fraction=Math.max(0,root);}}
    const oldGround=surfaceAt(this.night,s.pos[0],s.pos[2]);
    const moved=moveHorizontal(this.night,[s.pos[0],s.pos[1]-.8,s.pos[2]],dx*fraction,dz*fraction,{grounded:true});
    const ground=surfaceAt(this.night,moved[0],moved[2]);
    if(ground===null||ground>(oldGround??0)+.3)return;
    s.pos[0]=moved[0];s.pos[2]=moved[2];s.pos[1]+=ground-(oldGround??ground);
  }
  moveEnemies(){
    const p=this.player;
    for(const s of this.shades){
      if(s.state==='drain'){
        const l=this.lanterns.find(l=>l.id===s.targetLanternId);
        if(!l?.lit||l.fuelUnits>=this.t.low_fuel_threshold*60||xzDistance(s.pos,l.pos)>2+EPS){s.state='wander';s.drainTicks=0;}
        else if(xzDistance(s.pos,p.pos)<=6+EPS){s.state='chase';s.drainTicks=0;}
        else continue;
      }
      if(s.safeMoving&&s.state!=='stunned')continue;
      if(s.state==='spawning'){if(s.stateTicks>0)continue;s.state='wander';}
      if(s.state==='stunned'){
        if(s.pushTicks>0){this.moveShade(s,s.pushDir[0]*this.t.pulse_push_m/15,s.pushDir[1]*this.t.pulse_push_m/15);s.pushTicks--;}
        if(s.stateTicks>0)continue;s.state='wander';s.targetLanternId=null;continue;
      }
      if(s.state==='recoil'){this.moveShade(s,s.recoilDir[0]*2/60,s.recoilDir[1]*2/60);if(s.recoilTicks===0)s.state='wander';continue;}
      const distance=xzDistance(p.pos,s.pos);
      if(s.state==='chase'&&distance>18)s.state='wander';
      else if(s.state==='wander'&&distance<=12)s.state='chase';
      if(s.state==='chase'){const d=direction(s.pos,p.pos);const speed=this.night===3?this.t.shade_speed_night3:this.t.shade_speed;const step=Math.min(distance,speed*DT);this.moveShade(s,d[0]*step,d[1]*step);}
      else this.wanderShade(s);
    }
    for(const d of this.drifters){
      if(d.state==='flee'){d.pos[0]+=d.fleeDir[0]*7*DT;d.pos[2]+=d.fleeDir[1]*7*DT;continue;}
      const chasing=p.carried>=5&&xzDistance(d.pos,p.pos)<=15;
      d.state=chasing?'chase':'idle';
      const angle=this.simTick*DT*2/3;
      const dir=chasing?direction(d.pos,p.pos):direction(d.pos,[d.home[0]+3*Math.cos(angle),d.pos[1],d.home[2]+3*Math.sin(angle)]);
      d.pos[0]+=dir[0]*(chasing?7:2)*DT;d.pos[2]+=dir[1]*(chasing?7:2)*DT;
    }
  }
  wanderShade(s){
    const weak=this.lanterns.filter(l=>l.lit&&l.fuelUnits<this.t.low_fuel_threshold*60);
    const targets=(weak.length?weak:this.lanterns.filter(l=>!l.lit)).sort((a,b)=>xzDistance(s.pos,a.pos)-xzDistance(s.pos,b.pos)||idOrder(a,b));
    const target=targets[0];s.targetLanternId=target?.id??null;
    if(target){const d=direction(s.pos,target.pos),distance=xzDistance(s.pos,target.pos);if(!(target.lit&&distance<=2+EPS)){const step=Math.min(distance,2*DT);this.moveShade(s,d[0]*step,d[1]*step);}if(target.lit&&xzDistance(s.pos,target.pos)<=2+EPS){s.state='drain';s.drainTicks=0;}}
    else{if((this.simTick+s.id.length)%120===0){const a=this.random()*Math.PI*2;s.wander=[Math.cos(a),Math.sin(a)];}this.moveShade(s,s.wander[0]*2*DT,s.wander[1]*2*DT);}
  }
  contact(){
    const p=this.player;if(p.respawnTicks>0)return;
    for(const d of this.drifters.sort(idOrder))if(d.state!=='flee'&&d.state!=='removed'&&xzDistance(d.pos,p.pos)<=1.2+EPS){const amount=Math.min(3,p.carried);p.carried-=amount;d.stolen=amount;d.state='flee';d.stateTicks=240;d.fleeDir=direction(p.pos,d.pos);this.emit('drifter_steal',{drifter_id:d.id,amount,carried:p.carried});}
    for(const s of this.shades.slice().sort(idOrder)){
      if(p.invulnTicks>0||p.flames<=0)break;
      if(['stunned','spawning','recoil'].includes(s.state)||s.safeMoving||s.safeTicks>0)continue;
      if(xzDistance(s.pos,p.pos)<=this.t.shade_hit_radius+EPS&&Math.abs(s.pos[1]-p.pos[1])<=1.5+EPS){
        p.flames--;const dropped=Math.floor(p.carried/2);p.carried-=dropped;p.invulnTicks=90;this.dropMotes(dropped,p.pos);s.state='recoil';s.recoilTicks=60;s.recoilDir=direction(p.pos,s.pos);this.emit('player_hit',{by:'shade',flames:p.flames,dropped});break;
      }
    }
  }
  spawn(){
    if(this.randomMotes&&this.simTick%240===0&&this.motes.filter(m=>m.kind==='random').length<30){const free=this.map.motes.filter(pos=>!this.motes.some(m=>m.kind==='random'&&xzDistance(m.pos,pos)<EPS&&Math.abs(m.pos[1]-pos[1])<EPS));if(free.length)this.addMote(free[Math.floor(this.random()*free.length)]);}
    if(this.randomShades&&this.simTick>=300&&(this.simTick-300)%this.map.shadeInterval===0){
      const count=this.simTick===300?2:1;
      for(let i=0;i<count&&this.shades.length<this.map.shadeLimit;i++){
        const free=this.map.shades.filter(pos=>xzDistance(pos,this.player.pos)>=15-EPS&&!this.shades.some(s=>xzDistance(s.pos,pos)<1)&&!this.lanterns.some(l=>this.protected(l)&&xzDistance(l.pos,pos)<this.t.safe_radius));
        if(!free.length)break;const pos=free[Math.floor(this.random()*free.length)];const s=this.addShade([pos[0],(surfaceAt(this.night,pos[0],pos[2])??0)+.8,pos[2]],{state:'spawning',state_ticks_left:30});this.emit('shade_spawned',{id:s.id});
      }
    }
    if(this.night>=2&&this.randomDrifters&&this.simTick%1200===0&&this.drifters.length<2){const pos=this.map.shades[Math.floor(this.random()*this.map.shades.length)];this.addDrifter([pos[0],.8,pos[2]]);}
  }
  step(patch={}){
    if(this.state==='won'||this.state==='lost')return[];
    this.events=[];const previous=this.input;const input={...previous,...patch};const edge=key=>input[key]&&!previous[key];this.input=input;this.tick++;
    if(edge('pause')){this.state=this.state==='paused'?'playing':'paused';this.emit(this.state==='paused'?'paused':'resumed');}
    if(this.state==='paused')return this.events;
    this.simTick++;if(this.simTick===1)this.emit('night_start',{night:this.night});
    this.counters();this.movePlayer(input,edge);this.pickup();this.deposit(edge);this.safeZones();this.pulse(edge);this.moveEnemies();this.contact();this.spawn();
    if(this.player.flames<=0)this.finish('lost','no_flames');else if(this.timeLeft<=0){const enough=this.lanterns.filter(l=>l.lit).length>=Math.ceil(this.t.win_ratio*this.lanterns.length);this.finish(enough?'won':'lost',enough?'dawn_survived':'dawn');}
    return this.events;
  }
  finish(state,reason){this.state=state;if(state==='won')this.score+=this.lanterns.filter(l=>l.lit).reduce((score,l)=>score+this.t.score.per_dawn_lantern+Math.floor(l.fuelUnits/60),0)+this.player.flames*this.t.score.per_flame_left;this.emit('game_over',{result:state,reason});}
  snapshot(){const p=this.player;return{type:'snapshot',tick:this.tick,sim_tick:this.simTick,night:this.night,state:this.state,time_left_s:this.timeLeft,score:this.score,wind:{active:this.wind.active,dir_deg:round(this.wind.dir_deg)},player:{pos:posCopy(p.pos),vel:posCopy(p.vel),grounded:p.grounded,flames:p.flames,carried:p.carried,capacity:this.capacity,invuln:p.invulnTicks>0,dash_cd_s:p.dashCd/60,pulse_cd_s:p.pulseCd/60,charm_s:p.charmTicks/60},lanterns:this.lanterns.map(l=>({id:l.id,pos:posCopy(l.pos),lit:l.lit,deposited:l.deposited,fuel:this.fuel(l),ever_lit:l.ever_lit,relit_count:l.relit_count})),shades:this.shades.map(s=>({id:s.id,pos:posCopy(s.pos),state:s.state})),motes_active:this.motes.length,motes:this.motes.map(m=>({id:m.id,pos:posCopy(m.pos),kind:m.kind,ttl_s:m.kind==='dropped'?m.ttl/60:null})),drifters:this.drifters.map(d=>({id:d.id,pos:posCopy(d.pos),state:d.state,stolen:d.stolen})),charms:this.charms.map(c=>({id:c.id,pos:posCopy(c.pos),available:c.available,respawn_s:c.respawnTicks/60}))};}
  end(){return{type:'end',ticks:this.tick,state:this.state,score:this.score};}
}
