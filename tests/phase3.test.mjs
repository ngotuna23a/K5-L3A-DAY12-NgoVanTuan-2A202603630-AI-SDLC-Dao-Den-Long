import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game} from '../src/game.mjs';
import {validateScenario} from '../src/validation.mjs';
const t=JSON.parse(readFileSync(new URL('../game.contract.json',import.meta.url))).tuning;
const quiet={random_motes:false,random_shades:false,random_drifters:false,wind_enabled:false,motes:[],shades:[],drifters:[],charms:[]};
const make=(scenario={},night=1,tuning=t)=>new Game(tuning,7,{...quiet,...scenario},night);
const steps=(g,n,input={})=>{for(let i=0;i<n;i++)g.step(i===0?input:{});};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,a+' != '+b);
const events=(g,name)=>g.events.filter(e=>e.name===name);

test('v1.2 tuning, initial lantern schema and no setup rewards',()=>{
  assert.deepEqual([t.night1_duration_s,t.night2_duration_s,t.night3_duration_s],[240,270,300]);
  assert.equal(t.fuel_max,100);assert.equal(t.relight_cost,5);assert.equal(t.win_ratio,.6);assert.equal(t.capacity_max,20);
  const g=make({lanterns:[{id:'L1',lit:true}]});const s=g.snapshot();
  assert.equal(s.lanterns[0].fuel,100);assert.equal(s.lanterns[0].ever_lit,true);assert.equal(s.lanterns[0].relit_count,0);assert.equal(s.player.capacity,10);assert.equal(g.player.successfulLights,0);assert.equal(g.score,0);assert.deepEqual(g.events,[]);
});
test('fuel decays exactly 1/60 each step, expires on step 6000 and resets deposited',()=>{
  const g=make({lanterns:[{id:'L1',lit:true}]});steps(g,5999);assert.equal(g.lanterns[0].fuelUnits,1);assert.equal(g.lanterns[0].lit,true);g.step();assert.equal(g.lanterns[0].fuelUnits,0);assert.equal(g.lanterns[0].lit,false);assert.equal(g.lanterns[0].deposited,0);assert.equal(g.lanterns[0].ever_lit,true);assert.deepEqual(events(g,'lantern_out')[0].data,{lantern_id:'L1'});g.step();assert.equal(events(g,'lantern_out').length,0);
});
test('refuel ceiling uses unrounded fuel after decay, clamps at max and consumes exact amount',()=>{
  const g=make({player:{carried:3},lanterns:[{id:'L1',pos:[0,0,0],lit:true,fuel:90}]});g.step({interact:true});assert.equal(g.player.carried,1);assert.equal(g.lanterns[0].fuelUnits,6000);assert.equal(g.score,10);assert.deepEqual(events(g,'refuel')[0].data,{lantern_id:'L1',amount:2,fuel:100});assert.equal(g.player.successfulLights,0);
  const h=make({player:{carried:3},lanterns:[{id:'L1',pos:[0,0,0],lit:true,fuel:90.1}]});h.step({interact:true});assert.equal(h.player.carried,2);assert.equal(h.lanterns[0].fuelUnits,6000);assert.equal(h.score,5);
});
test('full fuel is ineligible and silent; nearest receivable tie uses numeric id',()=>{
  const g=make({player:{carried:1},lanterns:[{id:'L1',pos:[0,0,0],lit:true},{id:'L2',pos:[1,0,0]}]},1,{...t,fuel_decay_per_s:0});assert.equal(g.canReceive(g.lanterns[0]),false);g.step({interact:true});assert.equal(events(g,'refuel').length,0);assert.equal(events(g,'deposit')[0].data.lantern_id,'L2');assert.equal(g.score,5);
  const h=make({player:{carried:1},lanterns:[{id:'L1',pos:[2,0,0],lit:true,fuel:50},{id:'L2',pos:[-2,0,0]}]});h.step({interact:true});assert.equal(events(h,'refuel')[0].data.lantern_id,'L1');
});
test('relighting costs five, increments relit_count/capacity and scores 65',()=>{
  const g=make({player:{carried:5},lanterns:[{id:'L1',pos:[0,0,0],ever_lit:true}]});g.step({interact:true});assert.equal(g.lanterns[0].lit,true);assert.equal(g.lanterns[0].deposited,5);assert.equal(g.lanterns[0].relit_count,1);assert.equal(g.lanterns[0].fuelUnits,6000);assert.equal(g.capacity,12);assert.equal(g.score,65);assert.equal(events(g,'lantern_lit')[0].data.relight,true);
});
test('first light still costs ten and dynamic capacity reaches at most twenty',()=>{
  const g=make({player:{carried:10,successful_lights:4},lanterns:[{id:'L1',pos:[0,0,0]}]});assert.equal(g.capacity,18);g.step({interact:true});assert.equal(g.capacity,20);assert.equal(g.score,150);assert.equal(events(g,'lantern_lit')[0].data.relight,false);
  const h=make({player:{successful_lights:50}});assert.equal(h.snapshot().player.capacity,20);assert.equal(make().capacity,10);
});
test('pickup respects increased capacity from successful lights, prelit is not counted',()=>{
  const g=make({player:{carried:11,successful_lights:1},motes:[[0,0,0],[0,0,0]]});g.step();assert.equal(g.player.carried,12);assert.equal(g.motes.length,1);
  const h=make({lanterns:Array.from({length:5},(_,i)=>({id:'L'+(i+1),lit:true}))});h.step();assert.equal(h.state,'playing');assert.equal(h.capacity,10);
});
test('all lit is not an early win; full final tick is required',()=>{
  const g=make({time_left_s:2/60,lanterns:Array.from({length:5},(_,i)=>({id:'L'+(i+1),lit:true}))});g.step();assert.equal(g.state,'playing');assert.equal(events(g,'game_over').length,0);g.step();assert.equal(g.state,'won');assert.equal(events(g,'game_over')[0].data.reason,'dawn_survived');
});
test('dawn thresholds are 3/5, 4/6 and 5/7; bonus uses floor fuel and health only',()=>{
  for(const night of[1,2,3]){const count=night+4,required=Math.ceil(.6*count);for(const n of[required-1,required]){const g=make({time_left_s:1/60,lanterns:Array.from({length:n},(_,i)=>({id:'L'+(i+1),lit:true,fuel:70.5}))},night);g.step();assert.equal(g.state,n>=required?'won':'lost');assert.equal(g.score,n>=required?n*120+150:0);}}
});
test('fuel-out on dawn counts before victory, but last-tick relight can save the night',()=>{
  const scene={time_left_s:1/60,player:{carried:5},lanterns:[{id:'L1',lit:true},{id:'L2',lit:true},{id:'L3',pos:[0,0,0],lit:true,fuel:1/60}]};
  const lose=make(scene);lose.step();assert.equal(lose.state,'lost');assert.equal(events(lose,'lantern_out').length,1);
  const win=make(scene);win.step({interact:true});assert.equal(win.state,'won');assert.equal(events(win,'lantern_lit')[0].data.relight,true);assert.equal(win.score,663);const end=win.end();win.step();assert.deepEqual(win.end(),end);
});
test('last-flame hit at dawn always beats surviving lights',()=>{
  const g=make({time_left_s:1/60,player:{flames:1},lanterns:[{id:'L1',lit:true},{id:'L2',lit:true},{id:'L3',lit:true}],shades:[{pos:[0,.8,0]}]});g.step();assert.equal(g.state,'lost');assert.equal(events(g,'game_over')[0].data.reason,'no_flames');assert.equal(g.score,0);
});
test('shield boundary exactly thirty, then disappears below thirty',()=>{
  const g=make({lanterns:[{id:'L1',pos:[20,0,0],lit:true,fuel:30+1/60}],shades:[{pos:[26,.8,0],state:'wander'}]});assert.equal(g.protected(g.lanterns[0]),true);g.step();assert.equal(g.lanterns[0].fuelUnits,1800);assert.equal(g.protected(g.lanterns[0]),true);g.step();assert.equal(g.protected(g.lanterns[0]),false);
});
test('stacked drain is five per second each plus passive one; events every 60 drain ticks',()=>{
  const g=make({lanterns:[{id:'L1',pos:[20,0,0],lit:true,fuel:20}],shades:[{id:'S1',pos:[20,.8,0],state:'drain',target_lantern_id:'L1'},{id:'S2',pos:[21,.8,0],state:'drain',target_lantern_id:'L1'}]});steps(g,59);assert.equal(events(g,'fuel_drain').length,0);g.step();near(g.lanterns[0].fuelUnits/60,9);assert.equal(events(g,'fuel_drain').length,2);assert.ok(events(g,'fuel_drain').every(e=>e.data.fuel===9));
});
test('wander enters drain at weak target, stands still, and starts charging next tick',()=>{
  const g=make({lanterns:[{id:'L1',pos:[20,0,0],lit:true,fuel:20}],shades:[{pos:[20,.8,0],state:'wander'}]});g.step();assert.equal(g.shades[0].state,'drain');assert.equal(g.lanterns[0].fuelUnits,1199);const before=[...g.shades[0].pos];g.step();assert.deepEqual(g.shades[0].pos,before);assert.equal(g.lanterns[0].fuelUnits,1193);
});
test('wander chooses weak before unlit, breaks ties by id, and chase retains player target',()=>{
  const g=make({lanterns:[{id:'L1',pos:[20,0,1]},{id:'L2',pos:[30,0,0],lit:true,fuel:20}],shades:[{pos:[20,.8,0],state:'wander'}]});g.step();assert.equal(g.shades[0].targetLanternId,'L2');assert.ok(g.shades[0].pos[0]>20);
  const tie=make({lanterns:[{id:'L1',pos:[-25,0,0],lit:true,fuel:20},{id:'L2',pos:[25,0,0],lit:true,fuel:20}],shades:[{pos:[0,.8,20],state:'wander'}]});tie.step();assert.equal(tie.shades[0].targetLanternId,'L1');
  const chase=make({lanterns:[{id:'L1',pos:[12,0,0],lit:true,fuel:20}],shades:[{pos:[10,.8,0],state:'chase'}]});chase.step();assert.equal(chase.shades[0].state,'chase');assert.ok(chase.shades[0].pos[0]<10);
});
test('drain exits for nearby player, invalid distance, fuel-out and strong fuel',()=>{
  const scene={lanterns:[{id:'L1',pos:[20,0,0],lit:true,fuel:20}],shades:[{pos:[20,.8,0],state:'drain',target_lantern_id:'L1'}]};
  const near=make({...scene,player:{pos:[14,0,0]}});near.step();assert.equal(near.shades[0].state,'chase');
  const far=make({...scene,shades:[{pos:[24,.8,0],state:'drain',target_lantern_id:'L1'}]});far.step();assert.equal(far.shades[0].state,'wander');
  const out=make({...scene,lanterns:[{id:'L1',pos:[20,0,0],lit:true,fuel:1/60}]});out.step();assert.equal(out.lanterns[0].lit,false);assert.equal(out.shades[0].state,'wander');
});
test('refueling above thirty ends drain, expels safely in thirty ticks',()=>{
  const g=make({player:{pos:[18,0,0],carried:2},lanterns:[{id:'L1',pos:[20,0,0],lit:true,fuel:20}],shades:[{pos:[20.5,.8,0],state:'drain',target_lantern_id:'L1'}]});g.step({interact:true});assert.equal(g.protected(g.lanterns[0]),true);assert.equal(g.shades[0].state,'wander');assert.equal(g.player.flames,3);steps(g,29);near(Math.hypot(g.shades[0].pos[0]-20,g.shades[0].pos[2]),6);assert.equal(g.player.flames,3);
});
test('pulse against drain awards total fifteen; stun expiry first returns to wander',()=>{
  const g=make({player:{carried:3},lanterns:[{id:'L1',pos:[3,0,0],lit:true,fuel:20}],shades:[{pos:[3,.8,0],state:'drain',target_lantern_id:'L1'}]});g.step({pulse:true});assert.equal(g.score,15);assert.equal(g.shades[0].state,'stunned');steps(g,120,{pulse:false});assert.equal(g.shades[0].state,'wander');assert.equal(g.score,15);
});
test('pause freezes passive oil, drain and drain event counters',()=>{
  const g=make({lanterns:[{id:'L1',pos:[20,0,0],lit:true,fuel:20}],shades:[{pos:[20,.8,0],state:'drain',target_lantern_id:'L1'}]});g.step({pause:true});steps(g,120);assert.equal(g.lanterns[0].fuelUnits,1200);assert.equal(g.shades[0].drainTicks,0);g.step({pause:false});g.step({pause:true});assert.equal(g.lanterns[0].fuelUnits,1194);
});
test('scenario validation supports successful lights, fuel/history/drain and rejects invalid values',()=>{
  assert.doesNotThrow(()=>validateScenario({player:{carried:16,successful_lights:3},lanterns:[{id:'L1',lit:true,fuel:20,ever_lit:true}],shades:[{pos:[0,.8,0],state:'drain',target_lantern_id:'L1'}]},t));
  for(const s of[{player:{carried:17,successful_lights:3}},{player:{successful_lights:-1}},{lanterns:[{id:'L1',fuel:101}]},{shades:[{pos:[0,0,0],state:'drain',target_lantern_id:'bad'}]}])assert.throws(()=>validateScenario(s,t));
});
