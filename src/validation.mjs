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
    fields(frame, ['tick', 'move', 'cam_yaw_deg', 'jump', 'interact', 'pulse', 'dash'], 'frame');
    number(frame.tick, 'frame.tick', 0, Infinity, true);
    if (frame.tick <= previous) fail('frame.tick must increase strictly');
    previous = frame.tick;
    if ('move' in frame) {
      if (!Array.isArray(frame.move) || frame.move.length !== 2) fail('move: expected [x,z]');
      frame.move.forEach(n => number(n, 'move', -1, 1));
    }
    if ('cam_yaw_deg' in frame) number(frame.cam_yaw_deg, 'cam_yaw_deg');
    for (const key of ['jump', 'interact', 'pulse', 'dash']) if (key in frame) bool(frame[key], key);
  }
  return value;
}

export function validateScenario(value, tuning) {
  fields(value, ['player', 'random_motes', 'random_shades', 'motes', 'shades', 'lanterns', 'time_left_s'], 'scenario');
  if ('player' in value) {
    fields(value.player, ['pos', 'carried', 'flames'], 'player');
    if ('pos' in value.player) position(value.player.pos, 'player.pos');
    if ('carried' in value.player) number(value.player.carried, 'carried', 0, tuning.carry_capacity, true);
    if ('flames' in value.player) number(value.player.flames, 'flames', 0, Infinity, true);
  }
  for (const key of ['random_motes', 'random_shades']) if (key in value) bool(value[key], key);
  for (const key of ['motes', 'shades', 'lanterns']) if (key in value && !Array.isArray(value[key])) fail(`${key}: expected array`);
  for (const pos of value.motes ?? []) position(pos, 'mote');
  const shadeIds = new Set();
  for (const shade of value.shades ?? []) {
    fields(shade, ['id', 'pos'], 'shade');
    position(shade.pos, 'shade.pos');
    if ('id' in shade) {
      if (typeof shade.id !== 'string' || !shade.id || shadeIds.has(shade.id)) fail('shade.id: empty or duplicate');
      shadeIds.add(shade.id);
    }
  }
  const lanternIds = new Set();
  for (const lantern of value.lanterns ?? []) {
    fields(lantern, ['id', 'pos', 'deposited', 'lit'], 'lantern');
    if (!Array.from({ length: tuning.lantern_count_night1 }, (_, i) => `L${i + 1}`).includes(lantern.id) || lanternIds.has(lantern.id)) fail('lantern.id: unknown or duplicate');
    lanternIds.add(lantern.id);
    if ('pos' in lantern) position(lantern.pos, 'lantern.pos');
    if ('deposited' in lantern) number(lantern.deposited, 'deposited', 0, tuning.lantern_cost, true);
    if ('lit' in lantern) bool(lantern.lit, 'lit');
  }
  if ('time_left_s' in value) number(value.time_left_s, 'time_left_s', 0);
  return value;
}
