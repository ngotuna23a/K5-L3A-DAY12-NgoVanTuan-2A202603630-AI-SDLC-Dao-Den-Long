import{Game}from'../src/game.mjs';
import{xzDistance,direction,surfaceAt}from'../src/world.mjs';
export function planDefaultNight(tuning,seed=202603630){
  const game=new Game(tuning,seed),frames=[];let pulse=false,dash=false,interact=false;
  for(let tick=0;tick<tuning.night1_duration_s*60&&game.state==='playing';tick++){
    const p=game.player,dist=o=>xzDistance(p.pos,o.pos),enemies=game.shades.filter(s=>!['stunned','recoil','spawning'].includes(s.state));
    const lamps=game.lanterns.filter(l=>!l.lit).sort((a,b)=>dist(a)-dist(b));
    const ready=lamps.filter(l=>p.carried>=tuning.lantern_cost-l.deposited);
    let target=ready[0]??game.motes.slice().sort((a,b)=>{const risk=o=>enemies.reduce((n,s)=>n+Math.max(0,5-xzDistance(o.pos,s.pos))*4,0);return dist(a)+risk(a)-dist(b)-risk(b);})[0];
    if(!target)target=game.lanterns.filter(l=>l.lit).sort((a,b)=>dist(a)-dist(b))[0]??{pos:[0,0,0]};
    let move=[0,0],best=Infinity;
    for(let i=0;i<24;i++){
      const a=i*Math.PI/12,v=[Math.cos(a),Math.sin(a)],future=[p.pos[0]+v[0]*3.6,0,p.pos[2]+v[1]*3.6];let cost=xzDistance(future,target.pos);
      if(surfaceAt(1,future[0],future[2])===null)cost+=1000;
      for(const s of enemies)for(const dt of[.2,.4,.6]){const chase=direction(s.pos,p.pos),ep=[s.pos[0]+chase[0]*4*dt,0,s.pos[2]+chase[1]*4*dt],pp=[p.pos[0]+v[0]*6*dt,0,p.pos[2]+v[1]*6*dt];cost+=Math.max(0,2.5-xzDistance(ep,pp))**2*20;}
      if(cost<best){best=cost;move=v;}
    }
    if(xzDistance(p.pos,target.pos)<.3&&enemies.every(s=>dist(s)>5))move=[0,0];
    interact=!interact&&p.carried>0&&lamps.some(l=>dist(l)<=tuning.interact_radius);
    pulse=!pulse&&p.carried>=3&&p.pulseCd===0&&enemies.some(s=>dist(s)<1.6);
    const dashEnd=[p.pos[0]+move[0]*3,0,p.pos[2]+move[1]*3];
    dash=!dash&&p.dashCd===0&&p.dashTicks===0&&dist(target)>3&&surfaceAt(1,dashEnd[0],dashEnd[2])!==null;
    const input={move,interact,pulse,dash};frames.push({tick,...input});game.step(input);
  }
  return{seed,frames,expected:game.end()};
}
