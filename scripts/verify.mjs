import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { cpus, platform, release } from 'node:os';
import assert from 'node:assert/strict';
import { planDefaultNight } from './autoplay.mjs';

const proof = resolve('docs/proof/phase-1'); mkdirSync(proof, { recursive: true });
function command(args, record) {
  const result = spawnSync(process.execPath, args, { encoding: 'utf8' });
  if (record) writeFileSync(resolve(proof, record), result.stdout + result.stderr);
  if (result.status !== 0) { process.stderr.write(result.stdout + result.stderr); throw new Error(`Failed: node ${args.join(' ')}`); }
  return result.stdout;
}
console.log('Running unit and CLI tests...'); command(['--test'], 'tests.tap');
console.log('Building web game...'); command(['scripts/build.mjs'], 'build.txt');
const cases = [
  { name: 'win', ticks: 60, inputs: true, state: 'won', endTick: 9, event: 'lantern_lit', eventCount: 5 },
  { name: 'pulse', ticks: 10, inputs: true, state: 'playing', endTick: 10, event: 'pulse', eventCount: 1 },
  { name: 'no-flames', ticks: 60, state: 'lost', endTick: 1, event: 'player_hit', eventCount: 1 },
  { name: 'dawn', ticks: 60, state: 'lost', endTick: 3, event: 'game_over', eventCount: 1 }
];
for (const item of cases) {
  const out = resolve(proof, `${item.name}.jsonl`);
  const args = ['src/headless.mjs', '--seed', '42', '--night', '1', '--scenario', `tests/scenarios/${item.name}.json`, '--ticks', String(item.ticks), '--snapshot-every', '1', '--out', out];
  if (item.inputs) args.push('--inputs', `tests/scenarios/${item.name}-inputs.json`);
  command(args);
  const first = readFileSync(out, 'utf8'); command(args); assert.equal(readFileSync(out, 'utf8'), first);
  const lines = first.trim().split('\n').map(JSON.parse);
  assert.equal(lines[0].tick, 0); assert.equal(lines.at(-1).type, 'end');
  assert.equal(lines.at(-1).state, item.state); assert.equal(lines.at(-1).ticks, item.endTick);
  assert.equal(lines.filter(l => l.type === 'event' && l.name === item.event).length, item.eventCount);
  item.result = lines.at(-1); item.deterministic = true;
}
const tuning = JSON.parse(readFileSync('game.contract.json', 'utf8')).tuning;
const plan = planDefaultNight(tuning);
assert.equal(plan.expected.state, 'won', 'Input-only bot must complete default night');
writeFileSync(resolve(proof, 'default-play-inputs.json'), JSON.stringify({ frames: plan.frames }) + '\n');
const replayArgs = ['src/headless.mjs', '--seed', String(plan.seed), '--night', '1', '--inputs', resolve(proof, 'default-play-inputs.json'), '--ticks', '18000', '--snapshot-every', '60', '--out', resolve(proof, 'default-play.jsonl')];
command(replayArgs);
const replay = readFileSync(resolve(proof, 'default-play.jsonl'), 'utf8');
command(replayArgs); assert.equal(readFileSync(resolve(proof, 'default-play.jsonl'), 'utf8'), replay);
const replayLines = replay.trim().split('\n').map(JSON.parse);
assert.deepEqual(replayLines.at(-1), plan.expected);
assert.equal(replayLines.filter(l => l.name === 'lantern_lit').length, 5);
cases.push({ name: 'default-play', seed: plan.seed, deterministic: true, result: plan.expected, description: 'Default world, no scenario override, input-only bot replayed by public CLI' });
console.log('Checking built site over HTTP...');
const server = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
try {
  const address = await new Promise((ok, no) => {
    const timeout = setTimeout(() => no(new Error('HTTP server start timeout')), 10000);
    server.stdout.on('data', chunk => { const match = chunk.toString().match(/http:\/\/localhost:(\d+)/); if (match) { clearTimeout(timeout); ok(`http://127.0.0.1:${match[1]}`); } });
    server.once('error', e => { clearTimeout(timeout); no(e); });
    server.once('exit', code => { clearTimeout(timeout); no(new Error(`HTTP server exited ${code}`)); });
  });
  for (const path of ['/', '/style.css', '/src/browser.mjs', '/src/game.mjs', '/vendor/three.module.js', '/vendor/three.core.js', '/game.contract.json']) {
    const response = await fetch(address + path); assert.equal(response.status, 200, path); assert.ok((await response.text()).length > 0);
  }
  assert.equal((await fetch(address + '/missing')).status, 404);
} finally { server.kill(); }
const sources = ['game.contract.json', 'src/game.mjs', 'src/validation.mjs', 'src/headless.mjs', 'src/browser.mjs', 'tests/game.test.mjs', 'tests/cli.test.mjs', 'scripts/autoplay.mjs', 'scripts/verify.mjs', 'scripts/build.mjs', 'index.html', 'style.css', 'package-lock.json'];
const hashes = Object.fromEntries(sources.map(path => [path, createHash('sha256').update(readFileSync(path)).digest('hex')]));
writeFileSync(resolve(proof, 'verification.json'), JSON.stringify({ node: process.version, machine: { platform: platform(), release: release(), cpu: cpus()[0]?.model }, cases, http: '8 checks passed', source_sha256: hashes, limits: ['Results apply to the machine recorded above; CI records its own environment', 'Browser QA recorded separately in browser-qa.json', 'Compare source SHA-256 with the intended phase tag'] }, null, 2) + '\n');
console.log(`Verification passed: tests, build, ${cases.length} deterministic scenarios, HTTP smoke. Evidence: docs/proof/phase-1/`);
