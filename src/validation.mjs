import { nightMap } from './world.mjs';
const fail = message => { throw new Error(message); };
const object = (v, name) => { if (!v || typeof v !== 'object' || Array.isArray(v)) fail(`${name}: expected object`); };
const number = (v, name, min = -Infinity, max = Infinity, integer = false) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isSafeInteger(v))) fail(`${name}: invalid number`);
};
const fields = (obj, allowed, name) => { object(obj, name); for (const key of Object.keys(obj)) if (!allowed.includes(key)) fail(`${name}: unknown field ${key}`); };
const bool = (v, name) => { if (typeof v !== 'boolean') fail(`${name}: expected boolean`); };
const position = (v, name) => {
  if (!Array.isArray(v) || v.length !== 3) fail(`${name}: expected [x,y,z]`);
  v.forEach(n => number(n, name));
};

export function validateInputs(value) {
  fields(value, ['frames'], 'inputs');
  if (!Array.isArray(value.frames)) fail('inputs.frames: expected array');
  let previous = -1;
  for (const frame of value.frames) {
    fields(frame, ['tick', 'move', 'cam_yaw_deg', 'jump', 'interact', 'pulse', 'dash', 'pause'], 'frame');
    number(frame.tick, 'frame.tick', 0, Infinity, true);
    if (frame.tick <= previous) fail('frame.tick must increase strictly');
    previous = frame.tick;
    if ('move' in frame) {
      if (!Array.isArray(frame.move) || frame.move.length !== 2) fail('move: expected [x,z]');
      frame.move.forEach(n => number(n, 'move', -1, 1));
    }
    if ('cam_yaw_deg' in frame) number(frame.cam_yaw_deg, 'cam_yaw_deg');
    for (const key of ['jump', 'interact', 'pulse', 'dash', 'pause']) if (key in frame) bool(frame[key], key);
  }
  return value;
}

export function validateScenario(value, tuning, night=1) {
  fields(value, ['player', 'random_motes', 'random_shades', 'random_drifters', 'wind_enabled', 'motes', 'shades', 'lanterns', 'drifters', 'charms', 'time_left_s'], 'scenario');
  if ('player' in value) {
    fields(value.player, ['pos', 'carried', 'flames','invuln_ticks','dash_cd_ticks','pulse_cd_ticks','charm_ticks','successful_lights'], 'player');
    if ('pos' in value.player) position(value.player.pos, 'player.pos');
    if ('successful_lights' in value.player) number(value.player.successful_lights,'successful_lights',0,Infinity,true);
    const capacity=Math.min(tuning.capacity_max,tuning.carry_capacity+2*(value.player.successful_lights??0));
    if ('carried' in value.player) number(value.player.carried, 'carried', 0, capacity, true);
    if ('flames' in value.player) number(value.player.flames, 'flames', 0, Infinity, true);
    for(const key of ['invuln_ticks','dash_cd_ticks','pulse_cd_ticks','charm_ticks'])if(key in value.player)number(value.player[key],key,0,Infinity,true);
  }
  for (const key of ['random_motes', 'random_shades','random_drifters','wind_enabled']) if (key in value) bool(value[key], key);
  for (const key of ['motes', 'shades', 'lanterns','drifters','charms']) if (key in value && !Array.isArray(value[key])) fail(`${key}: expected array`);
  const moteIds=new Set();
  for(const mote of value.motes??[]){if(Array.isArray(mote)){position(mote,'mote');continue;}fields(mote,['id','pos','kind','ttl_s','ttl_ticks'],'mote');position(mote.pos,'mote.pos');if(mote.kind!==undefined&&!['random','dropped'].includes(mote.kind))fail('mote.kind invalid');if(mote.ttl_s!==undefined)number(mote.ttl_s,'ttl_s',0);if(mote.ttl_ticks!==undefined)number(mote.ttl_ticks,'ttl_ticks',0,Infinity,true);if(mote.id!==undefined){if(typeof mote.id!=='string'||!mote.id||moteIds.has(mote.id))fail('mote.id invalid');moteIds.add(mote.id);}}
  const shadeIds = new Set();
  for (const shade of value.shades ?? []) {
    fields(shade, ['id', 'pos','state','state_ticks_left','target_lantern_id'], 'shade');
    position(shade.pos, 'shade.pos');
    if(shade.state!==undefined&&!['spawning','wander','chase','recoil','stunned','drain'].includes(shade.state))fail('shade.state invalid');
    if(shade.target_lantern_id!==undefined&&!Array.from({length:nightMap(night).lanterns.length},(_,i)=>'L'+(i+1)).includes(shade.target_lantern_id))fail('target_lantern_id invalid');
    if(shade.state_ticks_left!==undefined)number(shade.state_ticks_left,'state_ticks_left',0,Infinity,true);
    if ('id' in shade) {
      if (typeof shade.id !== 'string' || !shade.id || shadeIds.has(shade.id)) fail('shade.id: empty or duplicate');
      shadeIds.add(shade.id);
    }
  }
  const lanternIds = new Set();
  for (const lantern of value.lanterns ?? []) {
    fields(lantern, ['id', 'pos', 'deposited', 'lit','fuel','ever_lit','relit_count'], 'lantern');
    if (!Array.from({ length: nightMap(night).lanterns.length }, (_, i) => `L${i + 1}`).includes(lantern.id) || lanternIds.has(lantern.id)) fail('lantern.id: unknown or duplicate');
    lanternIds.add(lantern.id);
    if ('pos' in lantern) position(lantern.pos, 'lantern.pos');
    if ('deposited' in lantern) number(lantern.deposited, 'deposited', 0, tuning.lantern_cost, true);
    if ('lit' in lantern) bool(lantern.lit, 'lit');
    if('fuel'in lantern)number(lantern.fuel,'fuel',0,tuning.fuel_max);
    if('ever_lit'in lantern)bool(lantern.ever_lit,'ever_lit');
    if('relit_count'in lantern)number(lantern.relit_count,'relit_count',0,Infinity,true);
  }
  for(const [list,allowed]of [['drifters',['id','pos','state','state_ticks_left','stolen']],['charms',['id','pos','available','respawn_ticks','respawn_s']]]){
    const ids=new Set();
    for(const item of value[list]??[]){fields(item,allowed,list);if(item.pos!==undefined)position(item.pos,list+'.pos');else if(list==='drifters')fail('drifter.pos required');if(item.id!==undefined){if(typeof item.id!=='string'||!item.id||ids.has(item.id))fail(list+'.id invalid');ids.add(item.id);}if(item.state!==undefined&&!['idle','chase','flee','removed'].includes(item.state))fail('drifter.state invalid');for(const key of ['state_ticks_left','stolen','respawn_ticks'])if(key in item)number(item[key],key,0,Infinity,true);if('respawn_s'in item)number(item.respawn_s,'respawn_s',0);if('available'in item)bool(item.available,'available');}
  }
  if ('time_left_s' in value) number(value.time_left_s, 'time_left_s', 0);
  return value;
}
