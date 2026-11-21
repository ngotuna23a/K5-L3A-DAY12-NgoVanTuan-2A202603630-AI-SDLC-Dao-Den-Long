import{spawn,spawnSync}from'node:child_process';
import{mkdirSync,readFileSync,writeFileSync}from'node:fs';
import{createHash}from'node:crypto';
import{resolve}from'node:path';
import{cpus,platform,release}from'node:os';
import assert from'node:assert/strict';
import{planDefaultNight}from'./autoplay.mjs';
const proof=resolve('docs/proof/phase-4');mkdirSync(proof,{recursive:true});
function command(args,record,timeout=35000){const r=spawnSync(process.execPath,args,{encoding:'utf8',timeout,maxBuffer:20*1024*1024});if(record)writeFileSync(resolve(proof,record),r.stdout+r.stderr);if(r.status!==0){process.stderr.write(r.stdout+r.stderr);throw Error('Failed: node '+args.join(' ')+(r.error?' '+r.error.message:''));}return r.stdout;}
console.log('Running unit and CLI regression...');command(['--test','tests/game.test.mjs','tests/cli.test.mjs','tests/phase3.test.mjs','tests/phase4.test.mjs'],'tests.tap');
console.log('Building all three nights...');command(['scripts/build.mjs'],'build.txt');
const cases=[
  {name:'dash',night:1,ticks:12,inputs:true,check:s=>assert.ok(Math.abs(s.player.pos[2]-2.8)<.001)},
  {name:'pause',night:1,ticks:120,inputs:true,check:s=>{assert.equal(s.sim_tick,60);assert.equal(s.player.charm_s,9);}},
  {name:'fall',night:1,ticks:61,check:s=>{assert.deepEqual(s.player.pos,[0,0,0]);assert.equal(s.player.flames,2);assert.equal(s.player.carried,0);}},
  {name:'pad',night:2,ticks:90,check:s=>{assert.ok(s.player.pos[0]>42);assert.equal(s.player.grounded,true);}},
  {name:'upper-pad',night:3,ticks:60,check:s=>{assert.equal(s.player.pos[1],6);assert.equal(s.player.grounded,true);}},
  {name:'charm',night:2,ticks:30,inputs:true,check:(s,lines)=>{assert.ok(s.player.charm_s>0);assert.equal(s.player.dash_cd_s,0);assert.equal(lines.filter(l=>l.name==='dash').length,2);}},
  {name:'drifter',night:2,ticks:1,check:s=>{assert.equal(s.player.carried,5);assert.equal(s.drifters[0].stolen,3);}},
  {name:'drifter-drop',night:2,ticks:1,inputs:true,check:s=>{assert.equal(s.motes.length,3);assert.equal(s.drifters[0].stolen,0);assert.ok(s.motes.every(m=>m.kind==='dropped'));}},
  {name:'wind',night:3,ticks:2100,check:(s,lines)=>{assert.equal(s.wind.active,false);assert.ok(lines.some(l=>l.type==='snapshot'&&l.sim_tick===1800&&l.wind.active));}},
  {name:'safe-zone',night:1,ticks:30,check:s=>{assert.equal(s.player.flames,3);assert.ok(Math.abs(Math.hypot(s.shades[0].pos[0],s.shades[0].pos[2])-6)<.001);}},
  {name:'pulse',night:1,ticks:15,inputs:true,check:s=>{assert.equal(s.player.carried,7);assert.equal(s.shades[0].state,'stunned');assert.ok(Math.abs(s.shades[0].pos[0]-7)<.001);}},
  {name:'dawn',night:1,ticks:60,state:'lost',endTick:3},
  {name:'no-flames',night:1,ticks:60,state:'lost',endTick:1},
  {name:'win',night:1,ticks:60,inputs:true,state:'won',endTick:1}
];
cases.push(
{name:'out',night:1,ticks:1,check:(s,lines)=>{assert.equal(s.lanterns[0].lit,false);assert.equal(s.lanterns[0].fuel,0);assert.ok(lines.some(l=>l.name==='lantern_out'));}},
{name:'refuel',night:1,ticks:1,inputs:true,check:s=>{assert.equal(s.player.carried,1);assert.equal(s.lanterns[0].fuel,100);assert.equal(s.score,10);}},
{name:'relight',night:1,ticks:1,inputs:true,check:(s,lines)=>{assert.equal(s.player.capacity,12);assert.equal(s.score,65);assert.equal(s.lanterns[0].relit_count,1);assert.equal(lines.find(l=>l.name==='lantern_lit').data.relight,true);}},
{name:'capacity',night:1,ticks:1,inputs:true,check:s=>{assert.equal(s.player.capacity,20);assert.equal(s.score,150);}},
{name:'drain',night:1,ticks:60,check:(s,lines)=>{assert.equal(s.lanterns[0].fuel,9);assert.equal(lines.filter(l=>l.name==='fuel_drain').length,2);}},
{name:'weak-shield',night:1,ticks:30,check:s=>{assert.ok(s.shades[0].pos[0]<6);}},
{name:'refuel-shield',night:1,ticks:30,inputs:true,check:s=>{assert.equal(s.player.flames,3);assert.ok(Math.abs(s.shades[0].pos[0]-26)<.001);}},
{name:'dawn-win',night:1,ticks:60,state:'won',endTick:1,check:(s,lines)=>{assert.equal(s.score,510);assert.equal(lines.find(l=>l.name==='game_over').data.reason,'dawn_survived');}},
{name:'dawn-loss',night:1,ticks:60,state:'lost',endTick:1},
{name:'final-hit',night:1,ticks:60,state:'lost',endTick:1,check:(s,lines)=>assert.equal(lines.find(l=>l.name==='game_over').data.reason,'no_flames')},
{name:'no-early',night:1,ticks:30,check:s=>assert.equal(s.state,'playing')},
{name:'pulse-drain',night:1,ticks:1,inputs:true,check:s=>assert.equal(s.score,15)},
{name:'fuel-pause',night:1,ticks:120,inputs:true,check:s=>{assert.equal(s.sim_tick,60);assert.equal(s.lanterns[0].fuel,99);}}
);
const results=[];
for(const item of cases){const out=resolve(proof,item.name+'.jsonl');const args=['src/headless.mjs','--seed','42','--night',String(item.night),'--scenario','tests/scenarios/phase-3/'+item.name+'.json','--ticks',String(item.ticks),'--snapshot-every','1','--out',out];if(item.inputs)args.push('--inputs','tests/scenarios/phase-3/'+item.name+'-inputs.json');command(args);const first=readFileSync(out,'utf8');command(args);assert.equal(readFileSync(out,'utf8'),first);const lines=first.trim().split('\n').map(JSON.parse),end=lines.at(-1),last=lines.filter(l=>l.type==='snapshot').at(-1);assert.equal(lines[0].tick,0);assert.equal(end.type,'end');assert.equal(end.state,item.state??'playing',item.name);assert.equal(end.ticks,item.endTick??item.ticks,item.name);item.check?.(last,lines);results.push({name:item.name,night:item.night,deterministic:true,result:end});}
console.log('Replaying complete default Night 1 using ordinary inputs...');
const tuning=JSON.parse(readFileSync('game.contract.json','utf8')).tuning,plan=planDefaultNight(tuning);assert.equal(plan.expected.state,'won','Input-only bot should complete default Night 1');
writeFileSync(resolve(proof,'default-play-inputs.json'),JSON.stringify({frames:plan.frames})+'\n');
const replayArgs=['src/headless.mjs','--seed',String(plan.seed),'--night','1','--inputs',resolve(proof,'default-play-inputs.json'),'--ticks','18000','--snapshot-every','60','--out',resolve(proof,'default-play.jsonl')];command(replayArgs);const replay=readFileSync(resolve(proof,'default-play.jsonl'),'utf8');command(replayArgs);assert.equal(readFileSync(resolve(proof,'default-play.jsonl'),'utf8'),replay);const replayLines=replay.trim().split('\n').map(JSON.parse);assert.deepEqual(replayLines.at(-1),plan.expected);assert.equal(replayLines.find(l=>l.name==='game_over').data.reason,'dawn_survived');assert.ok(replayLines.filter(l=>l.type==='snapshot').at(-1).lanterns.filter(l=>l.lit).length>=3);results.push({name:'default-play',night:1,seed:plan.seed,deterministic:true,result:plan.expected,scenario_override:false});
console.log('Benchmarking full headless nights...');
const benchmarks=[];const benchmarkScene=resolve(proof,'benchmark-scenario.json');writeFileSync(benchmarkScene,JSON.stringify({player:{flames:9999}})+'\n');
for(const night of[1,2,3]){const ticks=tuning['night'+night+'_duration_s']*60;const out=resolve(proof,'benchmark-night-'+night+'.jsonl');const args=['src/headless.mjs','--seed','42','--night',String(night),'--scenario',benchmarkScene,'--ticks',String(ticks),'--snapshot-every','600','--out',out];const start=performance.now();command(args);const seconds=(performance.now()-start)/1000;assert.ok(seconds<=30,'Night '+night+' must complete in <=30 seconds');const end=readFileSync(out,'utf8').trim().split('\n').map(JSON.parse).at(-1);assert.equal(end.ticks,ticks);benchmarks.push({night,ticks,seconds,threshold_s:30,passed:true,command:[process.execPath,...args].join(' '),note:'Only health overridden to prevent early death; normal world and scheduled spawns run'});}
console.log('Running ten-night single-process soak...');
command(['--jitless','--expose-gc','--max-semi-space-size=1','scripts/soak.mjs','--seed','7','--nights','10','--out',resolve(proof,'soak.json')],'soak.txt',120000);
const soak=JSON.parse(readFileSync(resolve(proof,'soak.json')));assert.equal(soak.crashes,0);assert.equal(soak.results.length,10);assert.ok(soak.mem_end_mb<=1.2*soak.mem_start_mb);
console.log('Checking built modules over HTTP...');
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
const paths=['/','/style.css','/src/browser.mjs','/src/game.mjs','/src/world.mjs','/src/campaign.mjs','/src/audio.mjs','/src/settings.mjs','/src/leaderboard.mjs','/src/benchmark.mjs','/vendor/three.module.js','/vendor/three.core.js','/game.contract.json','/LICENSE','/vendor/THREE-LICENSE.txt'];
try{const address=await new Promise((ok,no)=>{const timer=setTimeout(()=>no(Error('HTTP start timeout')),10000);server.stdout.on('data',chunk=>{const m=chunk.toString().match(/http:\/\/localhost:(\d+)/);if(m){clearTimeout(timer);ok('http://127.0.0.1:'+m[1]);}});server.once('error',e=>{clearTimeout(timer);no(e);});server.once('exit',code=>{clearTimeout(timer);no(Error('HTTP server exited '+code));});});for(const path of paths){const r=await fetch(address+path);assert.equal(r.status,200,path);assert.ok((await r.text()).length>0);}assert.equal((await fetch(address+'/missing')).status,404);}finally{server.kill();}
const sources=['game.contract.json','src/game.mjs','src/world.mjs','src/campaign.mjs','src/audio.mjs','src/settings.mjs','src/leaderboard.mjs','src/benchmark.mjs','scripts/soak.mjs','scripts/bench.mjs','scripts/serve.mjs','scripts/leaderboard-store.mjs','tests/phase4.test.mjs','src/validation.mjs','src/headless.mjs','src/browser.mjs','tests/game.test.mjs','tests/cli.test.mjs','tests/phase3.test.mjs','scripts/autoplay.mjs','scripts/verify.mjs','scripts/build.mjs','scripts/browser-qa.mjs','index.html','style.css','package-lock.json'];
const hashes=Object.fromEntries(sources.map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')]));
writeFileSync(resolve(proof,'verification.json'),JSON.stringify({contract_version:'1.3',node:process.version,machine:{platform:platform(),release:release(),cpu:cpus()[0]?.model},cases:results,benchmarks,soak,http:paths.length+1+' checks passed',source_sha256:hashes,limits:['Browser QA and FPS recorded separately','Windows local run; CI records its own environment','GUI campaign wins use scenarios; default Night 1 win above is input-only with no scenario override']},null,2)+'\n');
console.log('Verification passed: tests, build, '+results.length+' deterministic cases, 3 full headless benchmarks, soak, HTTP smoke.');
