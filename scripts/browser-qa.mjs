import { writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';

// Uses an already installed Chrome via its local CDP port; installs no test dependency.
const port = process.env.CDP_PORT ?? '9222';
const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
const target = targets.find(t => t.type === 'page');
if (!target) throw new Error('No Chrome page target. Start headless Chrome with --remote-debugging-port=9222.');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((ok, no) => { socket.addEventListener('open', ok, { once: true }); socket.addEventListener('error', no, { once: true }); });
let nextId = 0;
const pending = new Map(), errors = [];
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const request = pending.get(message.id); if (!request) return;
    pending.delete(message.id); clearTimeout(request.timer);
    if (message.error) request.reject(new Error(JSON.stringify(message.error))); else request.resolve(message.result);
  } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text + ': ' + (message.params.exceptionDetails.exception?.description ?? ''));
  else if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(`${message.params.entry.text} ${message.params.entry.url ?? ''}`);
});
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 20000);
    pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function until(expression, timeout = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return;
    await new Promise(ok => setTimeout(ok, 100));
  }
  throw new Error(`Timed out waiting: ${expression}`);
}
async function key(code, key, type) { const special={Space:32,ShiftLeft:16,ShiftRight:16,ArrowLeft:37,ArrowUp:38,ArrowRight:39,ArrowDown:40,Escape:27};await cdp('Input.dispatchKeyEvent', { type, code, key, windowsVirtualKeyCode: special[code]??(key.length===1?key.toUpperCase().charCodeAt(0):0) }); }
const proof=resolve('docs/proof/phase-3');await mkdir(proof,{recursive:true});
const checks=[],details={};
const record=name=>{checks.push(name);console.log('OK: '+name);};
const quiet={random_motes:false,random_shades:false,random_drifters:false,wind_enabled:false,motes:[],shades:[],drifters:[],charms:[]};
const click=async id=>{await evaluate("document.getElementById("+JSON.stringify(id)+").click()");};
const load=async(scenario={},night=1)=>{await evaluate('window.__dao.loadScenario('+JSON.stringify({...quiet,...scenario})+','+night+')');await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');};
const snapshot=()=>evaluate('window.__dao.snapshot()');
const shot=async name=>writeFile(resolve(proof,name+'.png'),Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
try{
  await cdp('Runtime.enable');await cdp('Log.clear');await cdp('Log.enable');await cdp('Page.enable');errors.length=0;
  await cdp('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await cdp('Page.navigate',{url:'http://127.0.0.1:4173/?qa=1'});await until('Boolean(window.__dao)&&!document.getElementById("play").disabled',30000);
  assert.ok(await evaluate('window.__dao.rendererInfo().triangles>0'));assert.equal((await snapshot()).night,1);await shot('menu');record('WebGL renders main menu and default Night 1');
  await click('settings');await evaluate("document.getElementById('colorblind').checked=false;document.getElementById('colorblind').dispatchEvent(new Event('input'))");await click('settings-back');
  await click('play');assert.equal(await evaluate('window.__dao.status().screen'),'intro');assert.ok(await evaluate('document.getElementById("panel-description").textContent.includes("Ông Đăng")'));await click('play');await until('window.__dao.status().screen==="playing"');assert.equal(await evaluate('document.activeElement.id'),'world');assert.equal(await evaluate('window.__dao.audio().state'),'running');record('Menu to Ông Đăng introduction to gameplay; audio unlocked');
  const before=await snapshot();await key('KeyW','w','keyDown');await until('window.__dao.snapshot().player.pos[2]>.8');await key('KeyW','w','keyUp');record('W moves forward');
  const horizontal=[];async function directionTest(code,label,sign){const p=(await snapshot()).player.pos;await key(code,label,'keyDown');try{await until('Math.hypot(window.__dao.snapshot().player.pos[0]-('+p[0]+'),window.__dao.snapshot().player.pos[2]-('+p[2]+'))>.6');}finally{await key(code,label,'keyUp');}const delta=await evaluate('window.__dao.screenPosition(window.__dao.snapshot().player.pos)[0]-window.__dao.screenPosition('+JSON.stringify(p)+')[0]');assert.ok(delta*sign>.01,code+' inverted');horizontal.push({code,sign,delta});}
  for(const[code,label,sign]of[['KeyA','a',-1],['KeyD','d',1],['ArrowLeft','ArrowLeft',-1],['ArrowRight','ArrowRight',1]])await directionTest(code,label,sign);record('A/D and arrow keys agree with screen left/right');
  await cdp('Input.dispatchMouseEvent',{type:'mousePressed',x:640,y:370,button:'left',clickCount:1});await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',x:954,y:370,button:'left',buttons:1});await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',x:954,y:370,button:'left',clickCount:1});await until('Math.abs(window.__dao.screenPosition([0,0,1])[0]-window.__dao.screenPosition([0,0,0])[0])>.02');await directionTest('KeyA','a',-1);await directionTest('KeyD','d',1);details.horizontal=horizontal;record('Screen left/right remain correct after camera rotation');
  await load();await key('Space',' ','keyDown');await until('window.__dao.snapshot().player.pos[1]>.1');await key('Space',' ','keyUp');await until('window.__dao.snapshot().player.grounded');record('Jump lands on the shared terrain');
  await key('ShiftLeft','Shift','keyDown');await until('window.__dao.snapshot().player.dash_cd_s>0');await key('ShiftLeft','Shift','keyUp');assert.ok(await evaluate('document.getElementById("dash-status").textContent.includes("s")'));record('Shift triggers dash and HUD cooldown');
  await key('KeyP','p','keyDown');await key('KeyP','p','keyUp');await until('window.__dao.status().paused');const paused=await snapshot();await evaluate('new Promise(r=>setTimeout(r,300))');const frozen=await snapshot();assert.ok(frozen.tick>paused.tick);assert.equal(frozen.sim_tick,paused.sim_tick);assert.equal(frozen.time_left_s,paused.time_left_s);assert.equal(frozen.player.dash_cd_s,paused.player.dash_cd_s);for(const id of['play','retry','panel-settings','menu'])assert.equal(await evaluate('document.getElementById('+JSON.stringify(id)+').hidden'),false);record('P pauses simulation, advances only tick, exposes all pause actions');
  await click('panel-settings');await evaluate("document.getElementById('volume').value='.55';document.getElementById('volume').dispatchEvent(new Event('input'));document.getElementById('sensitivity').value='1.4';document.getElementById('sensitivity').dispatchEvent(new Event('input'))");assert.deepEqual(await evaluate('window.__dao.settings()'),{volume:.55,sensitivity:1.4,colorblind:false});assert.equal(await evaluate('window.__dao.audio().volume'),.55);await click('settings-back');await click('play');await until('window.__dao.status().screen==="playing"');record('Volume/sensitivity settings apply and resume works');
  await cdp('Page.reload');await until('Boolean(window.__dao)&&!document.getElementById("play").disabled');assert.deepEqual(await evaluate('window.__dao.settings()'),{volume:.55,sensitivity:1.4,colorblind:false});await click('play');await click('play');record('Settings persist across reload');
  await load({charms:[{id:'C1',pos:[0,0,0],available:true}]},2);await until('window.__dao.snapshot().player.charm_s>0');assert.equal(await evaluate('document.getElementById("charm-status").hidden'),false);assert.equal(await evaluate('document.querySelectorAll("#carry-slots i").length'),10);await shot('night-2');record('Night 2 bridge/pads/charm and ten-slot HUD render');
  await load({player:{pos:[20,0,18]}},2);await until('window.__dao.snapshot().player.pos[1]>1');await until('window.__dao.snapshot().player.grounded&&window.__dao.snapshot().player.pos[0]>42',20000);record('Night 2 jump pad launches and lands on the other island');
  await load({player:{carried:8},drifters:[{id:'D1',pos:[0,.8,0],state:'chase'}]},2);await until('window.__dao.snapshot().player.carried===5');assert.equal((await snapshot()).drifters[0].stolen,3);record('Gió Lạc steals three and enters flee');
  await load({player:{pos:[42,-10.1,0],carried:8}},1);await until('window.__dao.snapshot().player.flames===2');await until('window.__dao.snapshot().player.pos[1]===0&&window.__dao.snapshot().player.invuln',20000);assert.equal((await snapshot()).player.carried,0);record('Fall penalty and respawn render correctly');
  await load({player:{carried:3},shades:[{pos:[3,.8,0]}]});await key('KeyQ','q','keyDown');await until('window.__dao.snapshot().shades[0].state==="stunned"');await key('KeyQ','q','keyUp');assert.equal((await snapshot()).player.carried,0);record('Q pulses, consumes three and stuns enemy');
  await load({time_left_s:29});assert.equal(await evaluate('document.getElementById("timer").parentElement.classList.contains("danger")'),true);assert.equal(await evaluate('getComputedStyle(document.getElementById("timer").parentElement).animationName'),'warning');record('Last 30 seconds uses danger color and flashing');
  await load({player:{carried:14,successful_lights:3}});assert.equal((await snapshot()).player.capacity,16);assert.equal(await evaluate('document.querySelectorAll("#carry-slots i").length'),16);assert.equal(await evaluate('document.getElementById("carried").textContent'),'14 / 16');await shot('capacity');record('Successful lights expand capacity and the HUD slots');
  await load({time_left_s:2,lanterns:Array.from({length:5},(_,i)=>({id:'L'+(i+1),lit:true}))});await evaluate('window.__dao.advance(30)');assert.equal((await snapshot()).state,'playing');record('All lamps lit no longer finishes the night early');
  await load({time_left_s:29,lanterns:[{id:'L1',pos:[-2,0,6]},{id:'L2',pos:[0,0,6],lit:true,fuel:25},{id:'L3',pos:[2,0,6],lit:true,fuel:70}],shades:[{pos:[5,.8,6],state:'stunned',state_ticks_left:9999}]});
  let visuals=await evaluate('window.__dao.lanternVisuals()');const off=visuals.find(v=>v.id==='L1'),on=visuals.find(v=>v.id==='L2');assert.ok(Math.abs(off.scaleY/on.scaleY-.8)<.001);assert.equal(off.tear,true);assert.equal(on.tear,false);assert.equal(on.low,true);assert.ok(await evaluate('document.querySelectorAll(".fuel-bar[role=meter]").length===5'));record('Fuel bars, twenty-percent collapsed/torn unlit lanterns and low-fuel state');
  await click('pause');await until('window.__dao.status().paused');await click('panel-settings');await evaluate("document.getElementById('colorblind').checked=true;document.getElementById('colorblind').dispatchEvent(new Event('input'))");assert.equal(await evaluate('window.__dao.settings().colorblind'),true);assert.ok((await evaluate('window.__dao.shadeAccents()')).flat().every(c=>c.toLowerCase()==='#00b3ff'));assert.equal(await evaluate('getComputedStyle(document.documentElement).getPropertyValue("--danger").trim()'),'#FFFFFF');await click('settings-back');await click('play');await until('window.__dao.status().screen==="playing"');await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');assert.equal(await evaluate('document.getElementById("danger-symbol").hidden'),false);await shot('colorblind-fuel');record('Colorblind mode turns shade eyes/outline blue and warnings white with icon');
  const blink=await evaluate('(()=>{const v=window.__dao.lanternVisuals().find(v=>v.id==="L2"),s=window.__dao.snapshot();return {opacity:v.opacity,expected:Math.floor(s.sim_tick/30)%2===1?".3":"1"};})()');assert.equal(blink.opacity,blink.expected);record('Low-fuel blink follows the 30-tick half-cycle (1 Hz)');
  await cdp('Page.reload');await until('Boolean(window.__dao)&&!document.getElementById("play").disabled');assert.equal(await evaluate('window.__dao.settings().colorblind'),true);await click('play');await click('play');record('Colorblind setting persists across reload');
  // Full GUI campaign transitions use explicit scenario fixtures, not a claim of normal-world completion.
  await click('pause');await until('window.__dao.status().paused');await click('menu');await click('play');await click('play');const wins=[];
  for(const night of[1,2,3]){
    const lanterns=Array.from({length:night+4},(_,i)=>({id:'L'+(i+1),...(i?{lit:true}:{pos:night===3?[0,6,6]:[0,0,0]})}));
    if(night===3){await load({wind_enabled:true},3);await evaluate('window.__dao.advance(1800)');await until('!document.getElementById("wind-warning").hidden');assert.equal((await snapshot()).wind.active,true);await shot('night-3');record('Night 3 tiers, tower, ramps and strong wind render');}
    await load({time_left_s:2,player:{pos:night===3?[0,6,6]:[0,0,0],carried:10},lanterns},night);await key('KeyE','e','keyDown');await until('window.__dao.snapshot().state==="won"');await key('KeyE','e','keyUp');wins.push((await snapshot()).score);assert.equal(await evaluate('window.__dao.status().screen'),night===3?'dawn':'result');await shot('won-night-'+night);if(night<3){await click('play');assert.equal(await evaluate('window.__dao.status().screen'),'intro');assert.equal(await evaluate('window.__dao.status().night'),night+1);await click('play');}
  }
  assert.equal(await evaluate('window.__dao.status().total'),wins.reduce((a,b)=>a+b,0));details.campaign={scenarioBased:true,scores:wins,total:wins.reduce((a,b)=>a+b,0)};record('Three-night campaign, Ông Đăng intros, result screens and dawn total');
  await click('play');await click('play');await load({player:{flames:1},shades:[{pos:[0,.8,0]}]});await until('window.__dao.snapshot().state==="lost"');await click('play');assert.equal(await evaluate('window.__dao.status().night'),1);assert.equal((await snapshot()).player.flames,3);record('Loss retries current night with full health');
  await load({},3);const map=await evaluate('window.__dao.snapshot()');await load({lanterns:map.lanterns.map((l,i)=>({id:l.id,lit:i>0})),motes:Array.from({length:30},(_,i)=>[Math.cos(i)*30,0,Math.sin(i)*30]),shades:Array.from({length:10},(_,i)=>({id:'S'+i,pos:[Math.cos(i)*43,.8,Math.sin(i)*43]}))},3);
  await evaluate('window.__dao.resetPerformance()');await evaluate('new Promise(r=>setTimeout(r,6000))');details.performance=await evaluate('window.__dao.performanceStats()');details.renderer=await evaluate('window.__dao.rendererInfo()');details.performance.threshold_fps=30;details.performance.measurement_s=6;details.performance.passed=details.performance.fps>=30;assert.ok(details.performance.passed,'Average FPS below 30');record('Measured actual FPS at 1280x720 in Night 3 stress scene');await shot('performance');
  const palette=await evaluate('window.__dao.palette()');assert.equal(palette.sky,'#0E1430');assert.equal(palette.tunic,'#E8E2D0');assert.equal(palette.shade,'#120A1A');details.palette=palette;record('Palette matches Ticket-02 hex values');
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await cdp('Emulation.setTouchEmulationEnabled',{enabled:true});await cdp('Page.reload');await until('Boolean(window.__dao)&&innerWidth===390',30000);await shot('mobile');assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);record('Mobile viewport has no horizontal overflow');
  assert.deepEqual(errors,[]);record('No browser runtime or resource errors');
  const report={browser:await cdp('Browser.getVersion'),checks,errors,...details,limits:['Campaign GUI win tests use explicit scenarios; not a normal-world human playthrough','Audio verified by Web Audio state and event execution, not a listening test']};await writeFile(resolve(proof,'browser-qa.json'),JSON.stringify(report,null,2)+'\n');
  console.log('Browser QA passed: '+checks.length+' checks. FPS: '+details.performance.fps.toFixed(1));
}catch(error){await writeFile(resolve(proof,'browser-failure.json'),JSON.stringify({message:error.message,checks,errors,details},null,2)+'\n');await shot('failure').catch(()=>{});throw error;}
finally{await cdp('Page.navigate',{url:'about:blank'}).catch(()=>{});socket.close();}
