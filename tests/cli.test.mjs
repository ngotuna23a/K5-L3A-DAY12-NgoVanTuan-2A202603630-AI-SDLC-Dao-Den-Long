import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const directory = mkdtempSync(join(tmpdir(), 'dao-den-long-test-'));
const cli = resolve('src/headless.mjs');
const write = (name, value) => { const path = join(directory, name); writeFileSync(path, typeof value === 'string' ? value : JSON.stringify(value)); return path; };
const run = (args = [], out = join(directory, 'out.jsonl')) => ({ ...spawnSync(process.execPath, [cli, '--seed', '42', '--night', '1', '--ticks', '20', '--out', out, ...args], { encoding: 'utf8' }), out });
test('CLI JSONL tick model, inputs persistence, end last, exact determinism', () => {
  const scenario = write('quiet.json', { random_motes: false, random_shades: false, motes: [[0, 0, 0]] });
  const inputs = write('move.json', { frames: [{ tick: 0, move: [0, 1] }, { tick: 10, move: [0, 0] }] });
  const args = ['--scenario', scenario, '--inputs', inputs];
  const a = run(args, join(directory, 'a.jsonl')), b = run(args, join(directory, 'b.jsonl'));
  assert.equal(a.status, 0, a.stderr); assert.equal(b.status, 0, b.stderr);
  const text = readFileSync(a.out, 'utf8'); assert.equal(text, readFileSync(b.out, 'utf8'));
  const lines = text.trim().split('\n').map(JSON.parse);
  assert.deepEqual(lines.filter(l => l.type === 'snapshot').map(l => l.tick), [0, 10, 20]);
  assert.equal(lines.find(l => l.type === 'event').tick, 1);
  assert.deepEqual(lines.at(-2).player.pos, [0, 0, 1]);
  assert.deepEqual(lines.at(-1), { type: 'end', ticks: 20, state: 'playing', score: 10 });
  assert.equal(a.stdout, '');
});
test('invalid JSON or schema returns code 2 and stderr', () => {
  for (const content of ['{bad', { frames: [{ tick: 1 }, { tick: 1 }] }, { frames: [{ tick: 0, jump: 'yes' }] }]) {
    const result = run(['--inputs', write('bad.json', content)]);
    assert.equal(result.status, 2); assert.ok(result.stderr.length > 0);
  }
  const bad = run(['--scenario', write('bad-scene.json', { lanterns: [{ id: 'L9' }] })]);
  assert.equal(bad.status, 2);
});
test('duplicate/unknown arguments are nonzero; malformed path is exit 2', () => {
  assert.notEqual(run(['--ticks', '0']).status, 0);
  assert.notEqual(run(['--unknown', 'x']).status, 0);
  assert.equal(run(['--inputs', join(directory, 'missing.json')]).status, 2);
});
test('zero steps emits only snapshot zero and end; terminal exits early', () => {
  const zero = spawnSync(process.execPath, [cli, '--seed', '0', '--night', '1', '--ticks', '0', '--out', join(directory, 'zero.jsonl')]);
  assert.equal(zero.status, 0);
  assert.equal(readFileSync(join(directory, 'zero.jsonl'), 'utf8').trim().split('\n').length, 2);
  const result = run(['--scenario', write('dawn.json', { time_left_s: 1 / 60, random_shades: false })]);
  const lines = readFileSync(result.out, 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(result.status, 0);
  assert.equal(lines.at(-1).ticks, 1); assert.equal(lines.at(-1).state, 'lost');
});
