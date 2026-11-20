export const DT = 1 / 60;
export const ISLAND_RADIUS = 29;
const distance = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const round = n => Number(n.toFixed(3));
const posCopy = pos => pos.map(round);

export function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let n = value;
    n = Math.imul(n ^ n >>> 15, n | 1);
    n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}

export class Game {
  constructor(tuning, seed = 1, scenario = {}) {
    this.t = tuning;
    this.random = seededRandom(seed);
    this.tick = 0;
    this.state = 'playing';
    this.score = 0;
    this.initialTime = scenario.time_left_s ?? tuning.night1_duration_s;
    this.timeLeft = this.initialTime;
    this.player = { pos: [0, 0, 0], carried: 0, flames: tuning.flames, vy: 0 };
    if (scenario.player) Object.assign(this.player, structuredClone(scenario.player));
    this.input = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false };
    this.hitUntil = 0;
    this.pulseUntil = 0;
    this.events = [];
    this.nextMote = 1;
    this.nextShade = 1;
    this.randomMotes = scenario.random_motes ?? true;
    this.randomShades = scenario.random_shades ?? true;
    this.lanterns = Array.from({ length: tuning.lantern_count_night1 }, (_, i) => {
      const angle = i * Math.PI * 2 / tuning.lantern_count_night1;
      return { id: `L${i + 1}`, pos: [Math.sin(angle) * 18, 0, Math.cos(angle) * 18], deposited: 0, lit: false };
    });
    for (const update of scenario.lanterns ?? []) {
      const lantern = this.lanterns.find(l => l.id === update.id);
      Object.assign(lantern, structuredClone(update));
      if (lantern.lit) lantern.deposited = tuning.lantern_cost;
      if (lantern.deposited >= tuning.lantern_cost) lantern.lit = true;
    }
    this.motes = [];
    this.shades = [];
    if (scenario.motes !== undefined) {
      for (const pos of scenario.motes) this.addMote(pos);
    } else if (this.randomMotes) {
      for (let i = 0; i < 85; i++) this.addMote(this.randomPos(25));
    }
    if (scenario.shades !== undefined) {
      const reserved = new Set(scenario.shades.flatMap(s => s.id ? [s.id] : []));
      for (const shade of scenario.shades) {
        while (reserved.has(`S${this.nextShade}`)) this.nextShade++;
        this.addShade(shade.pos, shade.id);
      }
    } else if (this.randomShades) {
      for (let i = 0; i < 3; i++) this.addShade(this.randomPos(26, 23));
    }
  }

  randomPos(max, min = 0) {
    const angle = this.random() * Math.PI * 2;
    const radius = Math.sqrt(min * min + this.random() * (max * max - min * min));
    return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
  }

  addMote(pos) { this.motes.push({ id: `M${this.nextMote++}`, pos: [...pos] }); }
  addShade(pos, id) {
    while (this.shades.some(shade => shade.id === `S${this.nextShade}`)) this.nextShade++;
    const shade = { id: id ?? `S${this.nextShade++}`, pos: [...pos], state: 'chase', stunUntil: 0 };
    this.shades.push(shade);
    return shade;
  }
  emit(name, data) { this.events.push({ type: 'event', tick: this.tick, name, data }); }

  keepOutsideLight(shade) {
    for (const lantern of this.lanterns) {
      if (!lantern.lit) continue;
      const d = distance(shade.pos, lantern.pos);
      if (d < this.t.safe_radius) {
        const dx = d > 0 ? (shade.pos[0] - lantern.pos[0]) / d : 1;
        const dz = d > 0 ? (shade.pos[2] - lantern.pos[2]) / d : 0;
        shade.pos[0] = lantern.pos[0] + dx * this.t.safe_radius;
        shade.pos[2] = lantern.pos[2] + dz * this.t.safe_radius;
      }
    }
  }

  step(patch = {}) {
    if (this.state !== 'playing') return [];
    this.events = [];
    const previous = this.input;
    const input = { ...previous, ...patch };
    const edge = name => input[name] && !previous[name];
    this.input = input;
    this.tick++;
    this.timeLeft = Math.max(0, this.initialTime - this.tick * DT);
    const p = this.player;
    const t = this.t;
    let [x, z] = input.move;
    const magnitude = Math.hypot(x, z);
    if (magnitude > 1) { x /= magnitude; z /= magnitude; }
    const angle = input.cam_yaw_deg * Math.PI / 180;
    const previousRadius = Math.hypot(p.pos[0], p.pos[2]);
    p.pos[0] += (x * Math.cos(angle) + z * Math.sin(angle)) * t.player_speed * DT;
    p.pos[2] += (-x * Math.sin(angle) + z * Math.cos(angle)) * t.player_speed * DT;
    const radius = Math.hypot(p.pos[0], p.pos[2]);
    if (previousRadius <= ISLAND_RADIUS + 1e-9 && radius > ISLAND_RADIUS) {
      p.pos[0] *= ISLAND_RADIUS / radius;
      p.pos[2] *= ISLAND_RADIUS / radius;
    }
    if (edge('jump') && p.pos[1] <= 0) p.vy = 7;
    if (p.vy !== 0 || p.pos[1] > 0) {
      p.pos[1] = Math.max(0, p.pos[1] + p.vy * DT);
      p.vy -= 20 * DT;
      if (p.pos[1] === 0) p.vy = 0;
    }
    this.motes = this.motes.filter(mote => {
      if (p.carried < t.carry_capacity && distance(p.pos, mote.pos) <= t.pickup_radius + 1e-9) {
        p.carried++;
        this.score += t.score.per_mote;
        this.emit('mote_picked', { carried: p.carried });
        return false;
      }
      return true;
    });
    if (edge('interact') && p.carried > 0) {
      const candidates = this.lanterns.filter(l => !l.lit && distance(p.pos, l.pos) <= t.interact_radius + 1e-9);
      candidates.sort((a, b) => distance(p.pos, a.pos) - distance(p.pos, b.pos));
      const lantern = candidates[0];
      if (lantern) {
        const amount = Math.min(p.carried, t.lantern_cost - lantern.deposited);
        p.carried -= amount;
        lantern.deposited += amount;
        this.emit('deposit', { lantern_id: lantern.id, amount, deposited: lantern.deposited });
        if (lantern.deposited >= t.lantern_cost) {
          lantern.lit = true;
          this.score += t.score.per_lantern;
          this.emit('lantern_lit', { lantern_id: lantern.id });
        }
      }
    }
    if (edge('pulse') && this.tick >= this.pulseUntil && p.carried >= t.pulse_cost) {
      p.carried -= t.pulse_cost;
      this.pulseUntil = this.tick + Math.ceil(t.pulse_cooldown_s * 60);
      const stunned = [];
      for (const shade of this.shades) {
        const d = distance(shade.pos, p.pos);
        if (d > t.pulse_radius + 1e-9) continue;
        if (shade.state !== 'stunned') this.score += t.score.per_stun;
        shade.state = 'stunned';
        shade.stunUntil = this.tick + Math.ceil(t.pulse_stun_s * 60);
        shade.pos[0] += (d > 0 ? (shade.pos[0] - p.pos[0]) / d : 1) * t.pulse_push_m;
        shade.pos[2] += (d > 0 ? (shade.pos[2] - p.pos[2]) / d : 0) * t.pulse_push_m;
        stunned.push(shade.id);
      }
      this.emit('pulse', { stunned_ids: stunned });
    }
    for (const shade of this.shades) {
      this.keepOutsideLight(shade);
      if (shade.state === 'stunned' && this.tick >= shade.stunUntil) shade.state = 'chase';
      if (shade.state === 'stunned') continue;
      const d = distance(shade.pos, p.pos);
      const step = Math.min(t.shade_speed * DT, d);
      const dx = d > 0 ? (p.pos[0] - shade.pos[0]) / d * step : 0;
      const dz = d > 0 ? (p.pos[2] - shade.pos[2]) / d * step : 0;
      let fraction = 1;
      for (const lantern of this.lanterns) {
        if (!lantern.lit) continue;
        const ox = shade.pos[0] - lantern.pos[0], oz = shade.pos[2] - lantern.pos[2];
        const a = dx * dx + dz * dz;
        const b = 2 * (ox * dx + oz * dz);
        const c = ox * ox + oz * oz - t.safe_radius * t.safe_radius;
        const disc = b * b - 4 * a * c;
        if (a > 0 && disc >= 0) {
          const root = (-b - Math.sqrt(disc)) / (2 * a);
          if (root >= -1e-9 && root <= fraction) fraction = Math.max(0, root);
        }
      }
      shade.pos[0] += dx * fraction;
      shade.pos[2] += dz * fraction;
      if (this.tick >= this.hitUntil && p.flames > 0 && distance(p.pos, shade.pos) <= t.shade_hit_radius + 1e-9) {
        p.flames--;
        this.hitUntil = this.tick + Math.ceil(t.invuln_s * 60);
        const dropped = Math.floor(p.carried * t.hit_drop_ratio);
        p.carried -= dropped;
        for (let i = 0; i < dropped; i++) this.addMote([...p.pos]);
        this.emit('player_hit', { by: 'shade', flames: p.flames, dropped });
      }
    }
    if (p.flames <= 0) this.finish('lost', 'no_flames');
    else if (this.lanterns.every(l => l.lit)) this.finish('won', 'all_lit');
    else if (this.timeLeft <= 0) this.finish('lost', 'dawn');
    if (this.state === 'playing') {
      if (this.randomMotes && this.tick % 120 === 0 && this.motes.length < 100) this.addMote(this.randomPos(25));
      if (this.randomShades && this.tick % 720 === 0 && this.shades.length < 8) {
        const shade = this.addShade(this.randomPos(27, 25));
        this.keepOutsideLight(shade);
        this.emit('shade_spawned', { id: shade.id });
      }
    }
    return this.events;
  }

  finish(state, reason) {
    this.state = state;
    if (state === 'won') this.score += Math.floor(this.timeLeft) * this.t.score.per_second_left + this.player.flames * this.t.score.per_flame_left;
    this.emit('game_over', { result: state, reason });
  }

  snapshot() {
    return {
      type: 'snapshot', tick: this.tick, sim_tick: this.tick, state: this.state,
      time_left_s: this.timeLeft, score: this.score,
      player: { pos: posCopy(this.player.pos), flames: this.player.flames, carried: this.player.carried },
      lanterns: this.lanterns.map(l => ({ id: l.id, pos: posCopy(l.pos), lit: l.lit, deposited: l.deposited })),
      shades: this.shades.map(s => ({ id: s.id, pos: posCopy(s.pos), state: s.state })),
      motes_active: this.motes.length, motes: this.motes.map(m => ({ id: m.id, pos: posCopy(m.pos) }))
    };
  }
  end() { return { type: 'end', ticks: this.tick, state: this.state, score: this.score }; }
}
