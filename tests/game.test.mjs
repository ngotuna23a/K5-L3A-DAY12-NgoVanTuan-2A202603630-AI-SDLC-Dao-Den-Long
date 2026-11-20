import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync}from'node:fs';
import{Game}from'../src/game.mjs';
import{nightMap,surfaceAt}from'../src/world.mjs';
import{Campaign}from'../src/campaign.mjs';
import{validateInputs,validateScenario}from'../src/validation.mjs';
const t=JSON.parse(readFileSync(new URL('../game.contract.json',import.meta.url))).tuning;
const quiet={random_motes:false,random_shades:false,random_drifters:false,wind_enabled:false,motes:[],shades:[],drifters:[],charms:[]};
const make=(extra={},night=1)=>new Game(t,42,{...quiet,...extra},night);
const steps=(g,n,input={})=>{for(let i=0;i<n;i++)g.step(i===0?input:{});};
const near=(a,b,tolerance=1e-7)=>assert.ok(Math.abs(a-b)<=tolerance,a+' != '+b);
const events=(g,name)=>g.events.filter(e=>e.name===name);

test('standard tuning values match Ticket-02',()=>{
  assert.equal(t.carry_capacity,10);assert.equal(t.lantern_cost,10);assert.equal(t.pickup_radius,1);assert.equal(t.interact_radius,2);
  assert.equal(t.pulse_cost,3);assert.equal(t.pulse_radius,5);assert.equal(t.pulse_cooldown_s,3);assert.equal(t.pulse_stun_s,2);assert.equal(t.safe_radius,6);
  assert.equal(t.player_speed,6);assert.equal(t.dash_speed,14);assert.equal(t.dash_duration_s,.2);assert.equal(t.dash_cooldown_s,1.5);assert.equal(t.invuln_s,1.5);assert.equal(t.fall_enabled,true);
});
test('standard maps, lantern positions, spawn points and zero setup events/score',()=>{
  for(const night of[1,2,3]){const g=new Game(t,7,{},night),s=g.snapshot();assert.equal(s.night,night);assert.equal(s.tick,0);assert.equal(s.sim_tick,0);assert.equal(g.score,0);assert.deepEqual(g.events,[]);assert.equal(g.lanterns.length,night+4);assert.equal(g.motes.length,20);assert.equal(new Set(g.motes.map(m=>JSON.stringify(m.pos))).size,20);assert.equal(g.shades.length,0);assert.equal(g.timeLeft,[240,270,300][night-1]);}
  assert.deepEqual(nightMap(1).lanterns[1],[23.8,0,7.7]);assert.deepEqual(nightMap(2).lanterns[4],[87,0,-10]);assert.deepEqual(nightMap(3).lanterns[0],[0,6,6]);
  assert.equal(nightMap(1).motes.length,24);assert.equal(nightMap(2).motes.length,24);assert.equal(nightMap(3).motes.length,30);
});
test('tick model, persistent movement, yaw and diagonal normalization regression',()=>{
  const g=make();assert.deepEqual(g.player.pos,[0,0,0]);steps(g,60,{move:[1,1],cam_yaw_deg:90});near(g.player.pos[0],6/Math.sqrt(2));near(g.player.pos[2],-6/Math.sqrt(2));near(g.timeLeft,239);assert.equal(g.simTick,60);
});
test('jump only on ground; full air control; held jump never repeats',()=>{
  const g=make();g.step({jump:true,move:[1,0]});assert.ok(g.player.pos[1]>0);const y=g.player.pos[1];g.step({jump:false,move:[-1,0]});g.step({jump:true});assert.ok(g.player.pos[1]>y);steps(g,120,{move:[0,0]});assert.equal(g.player.pos[1],0);assert.equal(g.player.grounded,true);g.step({jump:false});g.step({jump:true});assert.ok(g.player.pos[1]>0);
});
test('inclusive pickup, cap, height and no points for picking up',()=>{
  const g=make({player:{carried:9},motes:[[1,0,0],[0,0,0],[1.01,0,0]]});g.step();assert.equal(g.player.carried,10);assert.equal(g.motes.length,2);assert.equal(g.score,0);assert.equal(events(g,'mote_picked')[0].tick,1);
  const high=make({player:{pos:[0,1.6,0]},motes:[[0,0,0]]});high.step();assert.equal(high.player.carried,0);
  const edge=make({player:{pos:[0,1.5,0]},motes:[[1,0,0]]});edge.step();assert.equal(edge.player.carried,1);
});
test('deposit nearest unlit, tie by numeric id, partial progress and edge activation',()=>{
  const g=make({player:{carried:3},lanterns:[{id:'L1',pos:[2,0,0]},{id:'L2',pos:[-2,0,0]}]});g.step({interact:true});assert.equal(g.lanterns[0].deposited,3);assert.equal(g.score,15);
  g.player.carried=10;g.step();assert.equal(g.lanterns[0].deposited,3);g.step({interact:false});g.step({interact:true});assert.equal(g.player.carried,3);assert.equal(g.lanterns[0].lit,true);assert.equal(g.score,150);
  const outside=make({player:{carried:10},lanterns:[{id:'L1',pos:[2.01,0,0]}]});outside.step({interact:true});assert.equal(outside.player.carried,10);
});
test('win priority at dawn, standardized points and bonus exactly once',()=>{
  const g=make({time_left_s:1/60,player:{carried:10},lanterns:Array.from({length:5},(_,i)=>({id:'L'+(i+1),...(i?{lit:true}:{pos:[0,0,0]})}))});assert.equal(g.score,0);g.step({interact:true});assert.equal(g.state,'won');assert.equal(g.score,1046);assert.deepEqual(events(g,'game_over')[0].data,{result:'won',reason:'dawn_survived'});const before=g.end();g.step();assert.deepEqual(g.end(),before);
});
test('no flames has priority over all lights and dawn',()=>{
  const g=make({player:{flames:0},time_left_s:0,lanterns:Array.from({length:5},(_,i)=>({id:'L'+(i+1),lit:true}))});g.step();assert.equal(g.state,'lost');assert.equal(events(g,'game_over')[0].data.reason,'no_flames');
});
test('pulse uses 3D center and inclusive boundary, consumes exactly 3, pushes 4 over 15 ticks',()=>{
  const g=make({player:{carried:10},shades:[{id:'near',pos:[5,.8,0]},{id:'far',pos:[0,5.801,0]}]});g.step({pulse:true});assert.deepEqual(events(g,'pulse')[0].data.stunned_ids,['near']);assert.equal(g.player.carried,7);near(g.shades[0].pos[0],5+4/15);assert.equal(g.shades[0].state,'stunned');steps(g,14,{pulse:false});near(g.shades[0].pos[0],9);assert.equal(g.score,5);steps(g,105);assert.equal(g.shades[0].state,'stunned');g.step();assert.notEqual(g.shades[0].state,'stunned');
});
test('pulse cooldown and edge, repeated pulse scores on already stunned targets',()=>{
  const g=make({player:{carried:10},shades:[{id:'s',pos:[2,.8,0],state:'stunned',state_ticks_left:600}]});g.step({pulse:true});assert.equal(g.score,5);g.step({pulse:false});g.step({pulse:true});assert.equal(g.player.carried,7);steps(g,177);assert.equal(g.player.pulseCd,1);g.step({pulse:false});g.step({pulse:true});assert.equal(g.player.carried,4);
  const poor=make({player:{carried:2}});poor.step({pulse:true});assert.equal(events(poor,'pulse').length,0);assert.equal(poor.player.pulseCd,0);
});
test('dash speed and 12-tick duration, 90-tick cooldown, held button edge',()=>{
  const g=make();g.step({dash:true});assert.equal(events(g,'dash').length,1);near(g.player.pos[2],14/60);steps(g,11);near(g.player.pos[2],2.8);g.step();near(g.player.pos[2],2.8);assert.equal(g.player.dashCd,78);steps(g,77);assert.equal(g.player.dashCd,1);g.step({dash:false});g.step({dash:true});assert.equal(events(g,'dash').length,1);
});
test('dash uses movement direction then remembered facing, and holds altitude in air',()=>{
  const g=make();g.step({move:[1,0]});g.step({move:[0,0],dash:true});assert.ok(g.player.pos[0]>.3);near(g.player.pos[2],0);
  const air=make({player:{pos:[0,2,0]}});air.step({dash:true,move:[0,1]});const y=air.player.pos[1];steps(air,11);near(air.player.pos[1],y);assert.equal(air.player.vel[1],0);steps(air,2,{dash:false});assert.ok(air.player.pos[1]<y);
});
test('dash grants no invulnerability',()=>{
  const g=make({shades:[{pos:[0,.8,.3]}]});g.step({dash:true});assert.equal(g.player.flames,2);
});
test('hit drops floor half in annulus, invulnerability 90 ticks, recoil and one hit per tick',()=>{
  const g=make({player:{carried:7},shades:[{id:'S2',pos:[0,.8,0]},{id:'S1',pos:[0,.8,0]}]});g.step();assert.equal(g.player.flames,2);assert.equal(g.player.carried,4);assert.equal(g.motes.length,3);assert.equal(events(g,'player_hit').length,1);assert.equal(g.shades.find(s=>s.id==='S1').state,'recoil');
  for(const m of g.motes){const r=Math.hypot(m.pos[0],m.pos[2]);assert.ok(r>=1.5&&r<=2.5);assert.equal(m.ttl,480);}
  steps(g,89);assert.equal(g.player.flames,2);g.step();assert.equal(g.player.flames,1);
});
test('shade contact checks vertical difference',()=>{
  const g=make({player:{pos:[0,3,0]},shades:[{pos:[0,.8,0]}]});g.step();assert.equal(g.player.flames,3);
});
test('stun, chase detection, disengage, spawning and recoil states',()=>{
  const g=make({shades:[{id:'a',pos:[11,.8,0],state:'wander'},{id:'b',pos:[20,.8,0],state:'chase'},{id:'c',pos:[0,.8,0],state:'spawning',state_ticks_left:2}]});g.step();assert.equal(g.shades[0].state,'chase');assert.equal(g.shades[1].state,'wander');assert.equal(g.player.flames,3);g.step();assert.notEqual(g.shades[2].state,'spawning');assert.equal(g.player.flames,2);
});
test('safe zone expels in 30 ticks without damage and blocks re-entry',()=>{
  const g=make({lanterns:[{id:'L1',pos:[0,0,0],lit:true}],shades:[{pos:[0,.8,0]}]});g.step();assert.ok(g.shades[0].pos[0]>0&&g.shades[0].pos[0]<6);assert.equal(g.player.flames,3);steps(g,29);near(Math.hypot(g.shades[0].pos[0],g.shades[0].pos[2]),6);steps(g,100);assert.equal(g.player.flames,3);assert.ok(Math.hypot(g.shades[0].pos[0],g.shades[0].pos[2])>=6-1e-7);
});
test('fall ignores invulnerability, loses all carried only once, respawns after 60 ticks',()=>{
  const g=make({player:{pos:[42,-10.1,0],carried:8,invuln_ticks:300}});g.step();assert.equal(g.player.flames,2);assert.equal(g.player.carried,0);assert.equal(g.player.respawnTicks,60);assert.deepEqual(events(g,'player_hit')[0].data,{by:'fall',flames:2,dropped:0,lost:8});steps(g,59);assert.equal(g.player.flames,2);assert.ok(g.player.pos[1]<-10);g.step();assert.deepEqual(g.player.pos,[0,0,0]);assert.equal(g.player.invulnTicks,90);assert.deepEqual(g.player.vel,[0,0,0]);
});
test('fall with last flame loses immediately and does not respawn',()=>{
  const g=make({player:{pos:[41,-11,0],flames:1}});g.step();assert.equal(g.state,'lost');assert.equal(events(g,'game_over')[0].data.reason,'no_flames');const end=g.end();steps(g,100);assert.deepEqual(g.end(),end);
});
test('walking beyond island actually falls rather than clamps',()=>{
  const g=make({player:{pos:[39.9,0,0]}});steps(g,3,{move:[1,0]});assert.ok(g.player.pos[0]>40);assert.equal(g.player.grounded,false);steps(g,65,{move:[0,0]});assert.equal(g.player.flames,2);
});
test('bridge geometry, pads preserve launch and land on other island',()=>{
  assert.equal(surfaceAt(2,35,2),0);assert.equal(surfaceAt(2,35,2.01),null);
  const g=make({player:{pos:[20,0,18]}},2);g.step();assert.equal(g.player.vel[1],14);assert.ok(g.player.launch);steps(g,90,{move:[-1,0]});assert.ok(g.player.pos[0]>42);assert.equal(g.player.grounded,true);assert.equal(g.player.pos[1],0);
});
test('night 3 levels, ramp ascent, vertical walls and bell collision',()=>{
  assert.equal(surfaceAt(3,15,10),3);assert.equal(surfaceAt(3,0,5),6);assert.equal(surfaceAt(3,30,0),0);
  const a=Math.PI/6;const g=make({player:{pos:[30*Math.cos(a),0,30*Math.sin(a)]}},3);steps(g,64,{move:[-Math.cos(a),-Math.sin(a)]});near(g.player.pos[1],3);assert.ok(Math.hypot(g.player.pos[0],g.player.pos[2])<24);
  const wall=make({player:{pos:[0,0,25]}},3);steps(wall,30,{move:[0,-1]});assert.ok(wall.player.pos[2]>=24);
  const bell=make({player:{pos:[0,6,3]}},3);steps(bell,30,{move:[0,-1]});assert.ok(bell.player.pos[2]>=2-1e-7);
});
test('night 3 pad reaches upper level',()=>{
  const g=make({player:{pos:[0,3,13]}},3);steps(g,60);assert.equal(g.player.grounded,true);near(g.player.pos[1],6);assert.ok(g.player.pos[2]<8&&g.player.pos[2]>2);
});
test('charms refresh effect, boosted run, free cooldown dash and 2700 tick respawn',()=>{
  const g=make({charms:[{id:'C1',pos:[0,0,0],available:true}]},2);g.step();assert.equal(g.player.charmTicks,600);assert.equal(events(g,'charm_picked')[0].data.charm_ticks,600);assert.equal(g.charms[0].respawnTicks,2700);g.step({move:[1,0]});near(g.player.pos[0],7.2/60);g.step({dash:true});assert.equal(g.player.dashCd,0);g.step({dash:false});steps(g,11);g.step({dash:true});assert.equal(events(g,'dash').length,1);
  const h=make({charms:[{id:'C1',pos:[20,0,0],available:false,respawn_ticks:2}]},2);h.step();assert.equal(h.charms[0].available,false);h.step();assert.equal(h.charms[0].available,true);
});
test('charm expires after 600 gameplay ticks',()=>{
  const g=make({player:{charm_ticks:2}},2);g.step({move:[1,0]});near(g.player.pos[0],7.2/60);g.step();near(g.player.pos[0],7.2/60+6/60);assert.equal(g.player.charmTicks,0);
});
test('drifter chase requires five carried, steals once before shade damage even if invulnerable',()=>{
  const g=make({player:{carried:7},drifters:[{id:'D1',pos:[0,.8,0]}],shades:[{pos:[0,.8,0]}]},2);g.step();assert.equal(g.player.carried,2);assert.equal(g.player.flames,2);assert.equal(g.drifters[0].stolen,3);assert.equal(events(g,'drifter_steal')[0].data.amount,3);assert.ok(g.events.findIndex(e=>e.name==='drifter_steal')<g.events.findIndex(e=>e.name==='player_hit'));
  const invuln=make({player:{carried:7,invuln_ticks:90},drifters:[{pos:[0,.8,0]}]},2);invuln.step();assert.equal(invuln.player.carried,4);assert.equal(invuln.player.flames,3);steps(invuln,20);assert.equal(events(invuln,'drifter_steal').length,0);
});
test('drifter pulse forces flee, second pulse returns stolen motes with TTL',()=>{
  const chase=make({player:{carried:8},drifters:[{id:'D1',pos:[3,.8,0],state:'chase'}]},2);chase.step({pulse:true});assert.equal(chase.drifters[0].state,'flee');assert.equal(chase.drifters[0].stolen,0);
  const flee=make({player:{carried:3},drifters:[{id:'D1',pos:[2,.8,0],state:'flee',stolen:3,state_ticks_left:240}]},2);flee.step({pulse:true});assert.equal(flee.motes.length,3);assert.equal(flee.drifters[0].stolen,0);assert.equal(events(flee,'drifter_drop')[0].data.amount,3);steps(flee,120);assert.equal(flee.drifters.length,0);
});
test('drifter does not chase poor player, ignores safe zone, disappears after 240 flee ticks',()=>{
  const g=make({player:{carried:4},drifters:[{pos:[10,.8,0],state:'idle'}]},2);g.step();assert.equal(g.drifters[0].state,'idle');
  const gone=make({drifters:[{pos:[10,.8,0],state:'flee',stolen:2,state_ticks_left:2}]},2);steps(gone,2);assert.equal(gone.drifters.length,0);
});
test('pause freezes every gameplay counter/spawn/TTL while tick and edges continue',()=>{
  const g=make({player:{invuln_ticks:10,dash_cd_ticks:10,pulse_cd_ticks:10,charm_ticks:10},motes:[{pos:[10,0,0],kind:'dropped',ttl_ticks:100}],charms:[{id:'C1',pos:[20,0,0],available:false,respawn_ticks:100}]},2);
  g.step({pause:true,move:[1,0]});assert.equal(g.state,'paused');assert.equal(g.simTick,0);steps(g,50);assert.equal(g.tick,51);assert.equal(g.timeLeft,270);assert.equal(g.player.invulnTicks,10);assert.equal(g.motes[0].ttl,100);assert.equal(g.charms[0].respawnTicks,100);g.step({pause:false});g.step({pause:true});assert.equal(g.state,'playing');assert.equal(g.simTick,1);assert.equal(g.player.invulnTicks,9);assert.equal(events(g,'resumed').length,1);
});
test('spawn schedules exact ticks, newborns interact next tick and no overlapping random motes',()=>{
  const g=new Game(t,1,{random_shades:false,random_drifters:false});steps(g,239);assert.equal(g.motes.length,20);g.step();assert.equal(g.motes.length,21);
  const shades=make({random_shades:true});steps(shades,299);assert.equal(shades.shades.length,0);shades.step();assert.equal(shades.shades.length,2);assert.ok(shades.shades.every(s=>s.state==='spawning'));assert.deepEqual(events(shades,'shade_spawned').map(e=>e.data.id),['S1','S2']);steps(shades,480);assert.equal(shades.shades.length,3);
  const drifters=make({random_drifters:true},2);steps(drifters,1199);assert.equal(drifters.drifters.length,0);drifters.step();assert.equal(drifters.drifters.length,1);
});
test('wind warning, active timing, displacement, duration and pause',()=>{
  const g=make({wind_enabled:true},3);steps(g,1679);assert.equal(g.wind.warning,false);g.step();assert.equal(g.wind.warning,true);assert.equal(g.wind.active,false);steps(g,119);const before=[...g.player.pos];g.step();assert.equal(g.wind.active,true);near(Math.hypot(g.player.pos[0]-before[0],g.player.pos[2]-before[2]),2/60);const sim=g.simTick;g.step({pause:true});steps(g,100);assert.equal(g.simTick,sim);assert.equal(g.wind.active,true);g.step({pause:false});g.step({pause:true});steps(g,299);assert.equal(g.wind.active,false);
});
test('dropped TTL expiry and score not granted on setup',()=>{
  const g=make({motes:[{pos:[10,0,0],kind:'dropped',ttl_ticks:2}],lanterns:[{id:'L1',lit:true}]});assert.equal(g.score,0);g.step();assert.equal(g.motes.length,1);g.step();assert.equal(g.motes.length,0);
});
test('same seed deterministic for all nights and generated ids never collide',()=>{
  for(const night of[1,2,3]){const a=new Game(t,321,{},night),b=new Game(t,321,{},night);steps(a,1200);steps(b,1200);assert.deepEqual(a.snapshot(),b.snapshot());}
  const g=make({shades:[{pos:[20,.8,0]},{id:'S1',pos:[25,.8,0]}]});assert.equal(new Set(g.shades.map(s=>s.id)).size,2);
});
test('scenario positions exactly preserved at tick zero',()=>{
  const g=make({player:{pos:[100,0,100]},shades:[{pos:[100,0,100]}]});assert.deepEqual(g.snapshot().player.pos,[100,0,100]);assert.deepEqual(g.snapshot().shades[0].pos,[100,0,100]);
});
test('pulse push completes in first 15 ticks even during safe-zone expulsion',()=>{
  const g=make({player:{carried:3,pos:[0,0,0]},lanterns:[{id:'L1',pos:[0,0,0],lit:true}],shades:[{pos:[2,.8,0]}]});g.step({pulse:true});steps(g,14,{pulse:false});assert.equal(g.shades[0].pushTicks,0);assert.equal(g.player.flames,3);
});
test('recoil moves two meters over 60 ticks after hit',()=>{
  const g=make({shades:[{pos:[0,.8,0]}]});g.step();const origin=g.shades[0].pos[0];steps(g,60);near(g.shades[0].pos[0]-origin,2);
});
test('dropped motes cannot be collected in hit tick but can be picked up on next tick',()=>{
  const g=make({player:{carried:6},shades:[{pos:[0,.8,0]}]});g.step();assert.equal(g.player.carried,3);const mote=g.motes[0];g.player.pos=[...mote.pos];g.step();assert.ok(g.player.carried>3);
});
test('campaign flow counts only won nights and retries current night',()=>{
  const c=new Campaign(t);assert.equal(c.screen,'menu');c.begin();assert.equal(c.screen,'intro');c.play();c.game.state='won';c.game.score=100;c.complete();assert.equal(c.total,100);c.next();assert.equal(c.night,2);assert.equal(c.game.player.flames,3);c.play();c.game.state='lost';c.game.score=900;c.complete();assert.equal(c.total,100);c.retry();assert.equal(c.night,2);c.game.state='won';c.game.score=200;c.complete();c.next();c.game.state='won';c.game.score=300;c.complete();assert.equal(c.screen,'dawn');assert.equal(c.total,600);c.begin();assert.equal(c.total,0);
});
test('validation keeps strict frames and accepts v1.1 scenario fields',()=>{
  for(const frames of[[{tick:1},{tick:1}],[{tick:-1}],[{tick:0,move:[2,0]}],[{tick:0,pause:1}]])assert.throws(()=>validateInputs({frames}));
  for(const s of[null,{player:{carried:-1}},{motes:[[0,1]]},{lanterns:[{id:'L6'}]},{shades:[{pos:[0,0,0],state:'bad'}]}])assert.throws(()=>validateScenario(s,t));
  assert.doesNotThrow(()=>validateScenario({player:{charm_ticks:600},drifters:[{pos:[0,.8,0],state:'chase',stolen:2}],charms:[],wind_enabled:false,lanterns:[{id:'L7'}]},t,3));
  assert.doesNotThrow(()=>validateInputs({frames:[{tick:0,dash:true,pause:true},{tick:2,pause:false}]}));
});
