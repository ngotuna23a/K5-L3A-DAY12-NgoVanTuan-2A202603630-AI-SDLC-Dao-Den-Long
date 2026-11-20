import { Game } from '../src/game.mjs';

// An input-only bot: never writes game state. Used to replay a complete default night via the public CLI.
export function planDefaultNight(tuning, seed = 202603630) {
  const game = new Game(tuning, seed), frames = [];
  let pulse = false, interact = false;
  for (let tick = 0; tick < tuning.night1_duration_s * 60 && game.state === 'playing'; tick++) {
    const p = game.player;
    const distance = object => Math.hypot(object.pos[0] - p.pos[0], object.pos[2] - p.pos[2]);
    const lanterns = game.lanterns.filter(l => !l.lit).sort((a, b) => distance(a) - distance(b));
    const danger = game.shades.some(s => s.state !== 'stunned' && distance(s) < 4);
    const target = p.carried >= tuning.lantern_cost || (!game.motes.length && p.carried > 0)
      ? lanterns[0] : game.motes.slice().sort((a, b) => distance(a) - distance(b))[0] ?? lanterns[0];
    const d = target ? distance(target) : 0;
    const move = d > .2 ? [(target.pos[0] - p.pos[0]) / d, (target.pos[2] - p.pos[2]) / d] : [0, 0];
    interact = !interact && lanterns.some(l => distance(l) <= tuning.interact_radius) && p.carried > 0;
    pulse = !pulse && danger && p.carried >= tuning.pulse_cost;
    const input = { move, interact, pulse };
    frames.push({ tick, ...input });
    game.step(input);
  }
  return { seed, frames, expected: game.end() };
}
