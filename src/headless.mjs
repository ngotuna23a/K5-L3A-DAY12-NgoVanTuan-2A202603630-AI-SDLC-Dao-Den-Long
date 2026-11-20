import { readFileSync, openSync, writeSync, closeSync } from 'node:fs';
import { Game } from './game.mjs';
import { validateInputs, validateScenario } from './validation.mjs';

function main() {
  const contract = JSON.parse(readFileSync(new URL('../game.contract.json', import.meta.url), 'utf8'));
  const options = {};
  const allowed = ['--seed', '--night', '--scenario', '--inputs', '--ticks', '--out', '--snapshot-every'];
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 2) {
    if (!allowed.includes(argv[i]) || argv[i + 1] === undefined || argv[i] in options) throw new Error(`Invalid argument: ${argv[i]}`);
    options[argv[i]] = argv[i + 1];
  }
  const integer = (name, fallback, min = 0) => {
    const raw = options[name] ?? fallback;
    if (raw === undefined || !/^-?\d+$/.test(String(raw))) throw new Error(`${name}: expected integer`);
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value < min) throw new Error(`${name}: out of range`);
    return value;
  };
  const seed = integer('--seed', undefined, -Number.MAX_SAFE_INTEGER);
  const night=integer('--night');
  if (![1,2,3].includes(night)) throw new Error('--night must be 1, 2 or 3');
  const ticks = integer('--ticks');
  const interval = integer('--snapshot-every', 10, 1);
  if (!options['--out']) throw new Error('--out is required');
  let scenario = {}, inputs = { frames: [] };
  try {
    if (options['--scenario']) scenario = validateScenario(JSON.parse(readFileSync(options['--scenario'], 'utf8').replace(/^\uFEFF/, '')), contract.tuning, night);
    if (options['--inputs']) inputs = validateInputs(JSON.parse(readFileSync(options['--inputs'], 'utf8').replace(/^\uFEFF/, '')));
  } catch (error) {
    console.error(`Invalid inputs/scenario: ${error.message}`);
    process.exitCode = 2;
    return;
  }
  const game = new Game(contract.tuning, seed, scenario, night);
  const fd = openSync(options['--out'], 'w');
  try {
    const write = value => writeSync(fd, JSON.stringify(value) + '\n');
    write(game.snapshot());
    let index = 0;
    for (let k = 0; k < ticks && ['playing','paused'].includes(game.state); k++) {
      let input;
      if (inputs.frames[index]?.tick === k) input = inputs.frames[index++];
      for (const event of game.step(input)) write(event);
      if (game.tick % interval === 0) write(game.snapshot());
    }
    write(game.end());
  } finally { closeSync(fd); }
}

try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
