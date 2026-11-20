import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game } from '../src/game.mjs';
import { validateInputs, validateScenario } from '../src/validation.mjs';
const t = JSON.parse(readFileSync(new URL('../game.contract.json', import.meta.url))).tuning;
const quiet = { random_motes: false, random_shades: false, motes: [], shades: [] };
const game = extra => new Game(t, 42, { ...quiet, ...extra });
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const steps = (g, n, input) => { for (let i = 0; i < n; i++) g.step(i === 0 ? input : {}); };

test('tick zero is untouched; movement persists; yaw and diagonal normalized', () => {
  const g = game();
  assert.deepEqual(g.snapshot().player.pos, [0, 0, 0]);
  assert.equal(g.tick, 0);
  steps(g, 60, { move: [1, 1], cam_yaw_deg: 90 });
  near(g.player.pos[0], 6 / Math.sqrt(2));
  near(g.player.pos[2], -6 / Math.sqrt(2));
  near(g.timeLeft, 299);
  assert.equal(g.snapshot().sim_tick, 60);
});
test('jump edge; gravity; no repeating jump while held; XZ pickup ignores height', () => {
  const g = game({ motes: [[0, 0, 0]] });
  g.step({ jump: true });
  assert.ok(g.player.pos[1] > 0);
  assert.equal(g.player.carried, 1);
  steps(g, 120);
  assert.equal(g.player.pos[1], 0);
  g.step({ jump: false });
  g.step({ jump: true });
  assert.ok(g.player.pos[1] > 0);
});
test('inclusive pickup radius, capacity and pickup event ticks', () => {
  const g = game({ player: { carried: t.carry_capacity - 1 }, motes: [[t.pickup_radius, 0, 0], [0, 0, 0], [t.pickup_radius + .01, 0, 0]] });
  assert.equal(g.score, 0);
  const events = g.step();
  assert.equal(g.player.carried, t.carry_capacity);
  assert.equal(g.motes.length, 2);
  assert.deepEqual(events, [{ type: 'event', tick: 1, name: 'mote_picked', data: { carried: t.carry_capacity } }]);
});
test('deposit partial, rising edge, inclusive radius, only remaining amount', () => {
  const g = game({ player: { carried: 3 }, lanterns: [{ id: 'L1', pos: [t.interact_radius, 0, 0] }] });
  assert.equal(g.step({ interact: true })[0].data.amount, 3);
  g.player.carried = 8;
  g.step({ interact: true });
  assert.equal(g.lanterns[0].deposited, 3);
  g.step({ interact: false });
  const events = g.step({ interact: true });
  assert.equal(events[0].data.amount, 5);
  assert.equal(g.player.carried, 3);
  assert.equal(g.lanterns[0].lit, true);
  assert.equal(g.score, t.score.per_lantern);
});
test('win once, bonus declared in tuning, scenario lights earn zero', () => {
  const g = game({ player: { carried: 8 }, lanterns: Array.from({ length: 5 }, (_, i) => ({ id: `L${i + 1}`, ...(i === 0 ? { pos: [0, 0, 0] } : { lit: true }) })) });
  assert.equal(g.score, 0);
  const events = g.step({ interact: true });
  assert.equal(g.state, 'won');
  assert.equal(events.at(-1).name, 'game_over');
  assert.equal(g.score, t.score.per_lantern + 299 * t.score.per_second_left + 3 * t.score.per_flame_left);
  const end = g.end(); g.step(); assert.deepEqual(g.end(), end);
});
test('pulse exact radius, cost, push, stun, cooldown and release edge', () => {
  const g = game({ player: { carried: 8 }, shades: [{ id: 'near', pos: [t.pulse_radius, 0, 0] }, { id: 'far', pos: [t.pulse_radius + 1, 0, 0] }] });
  const events = g.step({ pulse: true });
  assert.deepEqual(events[0].data.stunned_ids, ['near']);
  assert.equal(g.player.carried, 6);
  assert.equal(g.shades[0].state, 'stunned');
  near(g.shades[0].pos[0], t.pulse_radius + t.pulse_push_m);
  g.step({ pulse: false }); g.step({ pulse: true });
  assert.equal(g.player.carried, 6);
  steps(g, 60);
  assert.equal(g.player.carried, 6);
  g.step({ pulse: false }); g.step({ pulse: true });
  assert.equal(g.player.carried, 4);
  steps(g, 151);
  assert.equal(g.shades[0].state, 'chase');
});
test('no pulse with insufficient carried; shade chase moves toward player', () => {
  const g = game({ shades: [{ pos: [10, 0, 0] }] });
  assert.equal(g.step({ pulse: true }).some(e => e.name === 'pulse'), false);
  near(g.shades[0].pos[0], 10 - t.shade_speed / 60);
});
test('hit radius, invulnerability exact duration, dropped zero and loss', () => {
  const g = game({ shades: [{ pos: [0, 0, 0] }, { pos: [0, 0, 0] }] });
  const first = g.step();
  assert.equal(first.filter(e => e.name === 'player_hit').length, 1);
  assert.equal(g.player.flames, 2);
  steps(g, t.invuln_s * 60 - 1);
  assert.equal(g.player.flames, 2);
  g.step(); assert.equal(g.player.flames, 1);
  steps(g, t.invuln_s * 60);
  assert.equal(g.state, 'lost');
  assert.deepEqual(g.events.at(-1).data, { result: 'lost', reason: 'no_flames' });
});
test('lit lantern protects; shade cannot enter or pass through safe circle', () => {
  const g = game({ lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true }], shades: [{ pos: [8, 0, 0] }] });
  steps(g, 600);
  assert.equal(g.player.flames, 3);
  near(Math.hypot(g.shades[0].pos[0], g.shades[0].pos[2]), t.safe_radius);
});
test('dawn and initial time override; zero ticks does not finish setup', () => {
  const g = game({ time_left_s: 2 / 60 });
  assert.equal(g.state, 'playing');
  g.step(); assert.equal(g.state, 'playing');
  g.step(); assert.equal(g.state, 'lost');
  assert.equal(g.events.at(-1).data.reason, 'dawn');
});
test('random false never spawns; empty scenario arrays replace defaults', () => {
  const g = game(); steps(g, 721);
  assert.equal(g.motes.length, 0); assert.equal(g.shades.length, 0);
});
test('seeded games and generated ids deterministic; random shade spawn event', () => {
  const a = new Game(t, 123), b = new Game(t, 123);
  steps(a, 720); steps(b, 720);
  assert.deepEqual(a.snapshot(), b.snapshot());
  assert.ok(a.events.some(e => e.name === 'shade_spawned'));
  assert.notDeepEqual(new Game(t, 124).snapshot(), new Game(t, 123).snapshot());
});
test('explicit shade ids cannot collide with automatic ones', () => {
  const g = game({ shades: [{ pos: [20, 0, 0] }, { id: 'S1', pos: [22, 0, 0] }] });
  assert.equal(new Set(g.shades.map(s => s.id)).size, 2);
});
test('island edge prevents falling, default lantern count is five', () => {
  const g = game(); steps(g, 600, { move: [0, 1] });
  near(g.player.pos[2], 29); assert.equal(g.player.flames, 3); assert.equal(g.lanterns.length, 5);
});
test('scenario coordinates remain untouched at tick zero and outside island setup', () => {
  const g = game({ player: { pos: [100, 0, 100] }, lanterns: [{ id: 'L1', lit: true, pos: [100, 0, 100] }], shades: [{ pos: [100, 0, 100] }] });
  assert.deepEqual(g.snapshot().player.pos, [100, 0, 100]);
  assert.deepEqual(g.snapshot().shades[0].pos, [100, 0, 100]);
  g.step(); assert.deepEqual(g.player.pos, [100, 0, 100]);
});
test('validation rejects malformed, duplicate ticks, invalid type/range/id', () => {
  for (const frames of [[{ tick: 1 }, { tick: 1 }], [{ tick: -1 }], [{ tick: 0, move: [2, 0] }], [{ tick: 0, pulse: 1 }]]) assert.throws(() => validateInputs({ frames }));
  for (const s of [null, { player: { carried: -1 } }, { motes: [[0, 1]] }, { lanterns: [{ id: 'L6' }] }, { random_motes: 0 }]) assert.throws(() => validateScenario(s, t));
  assert.doesNotThrow(() => validateInputs({ frames: [{ tick: 0, move: [0, 1] }, { tick: 10, interact: true }] }));
});
