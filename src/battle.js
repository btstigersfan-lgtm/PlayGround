// ── CHIMERA FRONT · deterministic-ish lane battle simulation ────────────────
import { NEXUS_HP, waveData } from './data.js';
import { makeEnemyUnit } from './units.js';

export const WORLD = { w: 1000, h: 620 };
// 5 horizontal lanes, fought left-to-right. `lane` is the row (y), `x` is the advance axis.
export const LANE_Y = [116, 226, 336, 446, 556];
export const START_X = {
  player: { front: 360, back: 205 },
  enemy: { front: 640, back: 795 },
};
export const NEXUS_X = { player: 34, enemy: 966 };
export const FIELD_MIN = 34;
export const FIELD_MAX = 966;
const ABILITY_AUTO_DELAY = { player: 6, enemy: 1.4 };

const rnd = (a, b) => a + Math.random() * (b - a);

function makeCombatUnit(unit, side, lane, row, idx) {
  const traits = new Set(unit.traits);
  const maxHp = unit.stats.hp;
  return {
    ref: unit,
    name: unit.name,
    side, lane, row,
    x: START_X[side][row] + ((idx % 3) - 1) * 2,
    y: LANE_Y[lane] + (row === 'front' ? -14 : 14) * (side === 'player' ? 1 : -1),
    maxHp,
    hp: maxHp,
    shield: traits.has('aegis') ? Math.round(maxHp * 0.25) : 0,
    atk: unit.stats.atk,
    interval: unit.stats.interval,
    range: unit.stats.range,
    speed: unit.stats.speed,
    traits,
    ability: unit.ability,
    tier: unit.tier,
    energy: 0,
    energyMax: 100,
    autoCastAt: 0,
    attackTimer: rnd(0.05, 0.5),
    status: { slow: 0, slowUntil: 0, stunUntil: 0, atkBuff: 0, atkBuffUntil: 0, haste: 0, hasteUntil: 0 },
    poison: [],
    burn: null,
    dotTimer: 0,
    flash: 0,
    lunge: 0,
    hitAnim: 0,
    alive: true,
    deathT: 0,
    atNexus: false,
    breakAnnounced: false,
    casts: 0,
    dmgDone: 0,
    healDone: 0,
  };
}

export function createBattle({ roster, slots, wave }) {
  const wd = waveData(wave);
  const battle = {
    time: 0,
    duration: 60,
    wave,
    waveData: wd,
    units: [],
    playerNexus: NEXUS_HP,
    enemyNexus: NEXUS_HP,
    events: [],
    over: false,
    winner: null,
    bloodrush: false,
    shake: 0,
    slots,
    roster,
    startedAt: performance.now ? performance.now() : 0,
  };

  let idx = 0;
  for (const [key, unitId] of Object.entries(slots || {})) {
    if (!unitId) continue;
    const ru = roster.find((u) => u.id === unitId);
    if (!ru) continue;
    const [laneS, row] = key.split('-');
    const lane = Number(laneS);
    if (lane < 0 || lane > 4) continue;
    battle.units.push(makeCombatUnit(ru, 'player', lane, row, idx++));
  }

  (wd.enemies || []).forEach((e, i) => {
    const ru = makeEnemyUnit(e, wave);
    battle.units.push(makeCombatUnit(ru, 'enemy', e.lane, e.row, 100 + i));
  });

  return battle;
}

function ev(b, type, data = {}) {
  b.events.push({ type, t: b.time, ...data });
}

export function drainEvents(b) {
  const out = b.events;
  b.events = [];
  return out;
}

const alive = (u) => u.alive && u.hp > 0;
const enemiesOf = (b, side) => b.units.filter((u) => alive(u) && u.side !== side);
const alliesOf = (b, side) => b.units.filter((u) => alive(u) && u.side === side);

function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function sym(b, u) {
  return u.side === 'player' ? b.enemyNexus : b.playerNexus;
}
function hurtNexus(b, u, amount) {
  if (u.side === 'player') b.enemyNexus = Math.max(0, b.enemyNexus - amount);
  else b.playerNexus = Math.max(0, b.playerNexus - amount);
  u.dmgDone += amount;
  b.shake = Math.max(b.shake, Math.min(14, 4 + amount * 0.25));
  ev(b, 'nexus', {
    side: u.side === 'player' ? 'enemy' : 'player',
    from: u.side, lane: u.lane,
    x: u.side === 'player' ? NEXUS_X.enemy : NEXUS_X.player,
    y: LANE_Y[u.lane],
    amount: Math.round(amount),
  });
  if (b.enemyNexus <= 0 && !b.over) finish(b, 'player');
  else if (b.playerNexus <= 0 && !b.over) finish(b, 'enemy');
}

function finish(b, winner) {
  if (b.over) return;
  b.over = true;
  b.winner = winner;
  ev(b, 'end', { winner });
}

function healUnit(b, u, amount, silent = false) {
  if (!alive(u) || amount <= 0) return;
  const before = u.hp;
  u.hp = Math.min(u.maxHp, u.hp + amount);
  const healed = Math.round(u.hp - before);
  if (healed > 0) {
    u.healDone += healed;
    ev(b, 'heal', { x: u.x, y: u.y - 58, amount: healed, side: u.side });
  }
}

function addPoison(b, target, dps, dur) {
  target.poison = target.poison.filter((p) => p.until > b.time);
  target.poison.push({ dps, until: b.time + dur });
  if (target.poison.length > 3) target.poison.shift();
}

function directDamage(b, src, tgt, raw, kind = 'melee', opts = {}) {
  if (!alive(tgt) || raw <= 0) return 0;
  if (tgt.traits.has('phase') && Math.random() < 0.15) {
    ev(b, 'dodge', { x: tgt.x, y: tgt.y - 52, side: tgt.side });
    return 0;
  }
  let dmg = raw;
  if (tgt.traits.has('guard')) dmg *= 0.82;
  if (src && src.traits.has('execute') && tgt.hp / tgt.maxHp < 0.35) dmg *= 1.5;
  if (kind === 'ability' && opts.ignoreGuard) dmg = raw;

  // shield first
  if (tgt.shield > 0) {
    const absorbed = Math.min(tgt.shield, dmg);
    tgt.shield -= absorbed;
    dmg -= absorbed;
    ev(b, 'shieldHit', { x: tgt.x, y: tgt.y - 52, amount: Math.round(absorbed) });
  }
  const rounded = Math.max(1, Math.round(dmg));
  tgt.hp -= rounded;
  tgt.flash = 1;
  tgt.hitAnim = 1;
  tgt.energy = Math.min(tgt.energyMax, tgt.energy + Math.max(3, rounded * 0.12));
  tgt.dotTimer = 0;
  if (src) {
    src.dmgDone += rounded;
    if (src.traits.has('leech')) {
      const healed = Math.round(rounded * 0.22);
      src.hp = Math.min(src.maxHp, src.hp + healed);
      src.healDone += healed;
    }
  }
  ev(b, 'hit', {
    x: tgt.x + rnd(-6, 6), y: tgt.y - 50 + rnd(-8, 8),
    amount: rounded, kind,
    crit: !!(src && src.traits.has('execute') && tgt.hp / tgt.maxHp < 0.35),
    side: tgt.side,
  });
  if (kind === 'melee' && tgt.traits.has('thorns') && src && alive(src)) {
    const reflect = Math.max(1, Math.round(raw * 0.2));
    src.hp -= reflect;
    src.flash = 0.7;
    ev(b, 'thorns', { x: src.x, y: src.y - 48, amount: reflect });
    if (src.hp <= 0) killUnit(b, src);
  }
  if (tgt.hp <= 0) killUnit(b, tgt);
  return rounded;
}

function killUnit(b, u) {
  if (!u.alive) return;
  u.alive = false;
  u.deathT = 0;
  u.hp = 0;
  ev(b, 'death', { x: u.x, y: u.y - 35, side: u.side, lane: u.lane, name: u.name, color: u.ref.art.glow, tier: u.tier });
}

function aspdBonus(u) {
  let m = 1;
  if (u.traits.has('swift')) m *= 1.08;
  if (u.traits.has('frenzy') && u.hp / u.maxHp < 0.5) m *= 1.3;
  if (u.status.hasteUntil > 0) m *= 1 + u.status.haste;
  if (u.status.slowUntil > 0) m *= 1 - u.status.slow;
  return m;
}
function moveBonus(u) {
  let m = 1;
  if (u.traits.has('swift')) m *= 1.15;
  if (u.status.slowUntil > 0) m *= 1 - u.status.slow;
  return m;
}
function atkBonus(u) {
  return u.status.atkBuffUntil > 0 ? 1 + u.status.atkBuff : 1;
}

function acquireTarget(b, u) {
  const melee = u.range < 150;
  let best = null;
  let bestScore = Infinity;
  for (const e of b.units) {
    if (!alive(e) || e.side === u.side) continue;
    const laneDiff = Math.abs(e.lane - u.lane);
    if (melee && laneDiff !== 0) continue;
    if (!melee && laneDiff > 1) continue;
    const d = dist(u, e);
    const reach = u.range + (melee ? 16 : 12) + Math.abs(e.x - u.x) * 0;
    if (d > reach) continue;
    let score = d + laneDiff * 100;
    if (score < bestScore) { bestScore = score; best = e; }
  }
  return best;
}

function sameLaneEnemy(b, u) {
  return b.units.find((e) => alive(e) && e.side !== u.side && e.lane === u.lane) || null;
}

function nearestLaneEnemy(b, u) {
  let best = null; let bd = Infinity;
  for (const e of b.units) {
    if (!alive(e) || e.side === u.side) continue;
    const d = Math.abs(e.x - u.x) + Math.abs(e.lane - u.lane) * 60;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function allyAheadX(b, u) {
  let limit = u.side === 'player' ? Infinity : -Infinity;
  for (const a of b.units) {
    if (!alive(a) || a === u || a.side !== u.side || a.lane !== u.lane) continue;
    if (u.side === 'player' && a.x > u.x) limit = Math.min(limit, a.x - 42);
    if (u.side === 'enemy' && a.x < u.x) limit = Math.max(limit, a.x + 42);
  }
  return limit;
}

function moveUnit(b, u, dt, target, dir) {
  let step = u.speed * moveBonus(u) * dt;
  if (u.bloodrush) step *= 1.15;
  if (step <= 0) return;
  let nx = u.x + dir * step;

  // don't walk through the target
  if (target && Math.abs(target.lane - u.lane) === 0) {
    const stop = Math.min(u.range * 0.9, 96);
    if (dir > 0) nx = Math.min(nx, target.x - stop);
    else nx = Math.max(nx, target.x + stop);
  }
  // don't stack on allies
  const allyLimit = allyAheadX(b, u);
  if (dir > 0 && allyLimit < Infinity) nx = Math.min(nx, allyLimit);
  if (dir < 0 && allyLimit > -Infinity) nx = Math.max(nx, allyLimit);

  nx = Math.max(FIELD_MIN, Math.min(FIELD_MAX, nx));
  const mover = dir > 0 ? nx > u.x : nx < u.x;
  u.walking = mover;
  u.x = nx;
}

export function castAbility(b, u) {
  if (!alive(u) || u.energy < 100) return false;
  u.energy = 0;
  u.autoCastAt = 0;
  u.casts++;
  const skill = u.ref.ability;
  const hurt = directDamage;
  const foes = enemiesOf(b, u.side);
  const mates = alliesOf(b, u.side);
  const ownLaneFoes = foes.filter((f) => f.lane === u.lane);
  const adjacentFoes = foes.filter((f) => Math.abs(f.lane - u.lane) <= 1);
  const adjacentMates = mates.filter((m) => Math.abs(m.lane - u.lane) <= 1);
  const weakest = (list) => list.slice().sort((a, c) => a.hp / a.maxHp - c.hp / c.maxHp)[0];
  const closest = (list, maxD = 999) => list.filter((f) => dist(u, f) <= maxD).sort((a, c) => dist(u, a) - dist(u, c))[0];
  let kind = 'damage';
  let points = [];
  let targets = [];

  switch (skill) {
    case 'howl': {
      kind = 'buff';
      for (const m of mates) {
        m.status.atkBuff = Math.max(m.status.atkBuff, 0.28);
        m.status.atkBuffUntil = b.time + 6;
        points.push({ x: m.x, y: m.y - 60 });
      }
      healUnit(b, u, u.maxHp * 0.08);
      break;
    }
    case 'shockwave': {
      targets = ownLaneFoes;
      for (const f of targets) {
        hurt(b, u, f, u.atk * 1.6, 'ability');
        f.status.stunUntil = Math.max(f.status.stunUntil, b.time + 2.2);
        points.push({ x: f.x, y: f.y - 40 });
      }
      b.shake = Math.max(b.shake, 10);
      break;
    }
    case 'dive': {
      const t = weakest(adjacentFoes) || weakest(foes);
      if (t) {
        hurt(b, u, t, u.atk * 3.4, 'ability');
        t.status.slow = 0.4; t.status.slowUntil = b.time + 2.4;
        points.push({ x: t.x, y: t.y - 40 });
        targets = [t];
      }
      break;
    }
    case 'venomNova': {
      kind = 'debuff';
      targets = adjacentFoes;
      for (const f of targets) {
        hurt(b, u, f, u.atk * 0.7, 'ability');
        addPoison(b, f, 3 + u.atk * 0.18, 6);
        points.push({ x: f.x, y: f.y - 40 });
      }
      break;
    }
    case 'sting': {
      const t = weakest(adjacentFoes) || weakest(foes);
      if (t) {
        const missing = t.maxHp - t.hp;
        hurt(b, u, t, u.atk * 1.7 + missing * 0.22, 'ability');
        t.status.slow = 0.3; t.status.slowUntil = b.time + 2;
        points.push({ x: t.x, y: t.y - 40 });
        targets = [t];
      }
      break;
    }
    case 'mend': {
      kind = 'heal';
      const wounded = mates.slice().sort((a, c) => a.hp / a.maxHp - c.hp / c.maxHp).slice(0, 3);
      for (const m of wounded) {
        healUnit(b, m, m.maxHp * 0.24);
        points.push({ x: m.x, y: m.y - 55 });
      }
      break;
    }
    case 'gore': {
      targets = ownLaneFoes;
      for (const f of targets) {
        hurt(b, u, f, u.atk * 1.7, 'ability');
        f.status.stunUntil = Math.max(f.status.stunUntil, b.time + 1.6);
        f.x += u.side === 'player' ? 48 : -48;
        f.x = Math.max(FIELD_MIN, Math.min(FIELD_MAX, f.x));
        points.push({ x: f.x, y: f.y - 36 });
      }
      b.shake = Math.max(b.shake, 9);
      break;
    }
    case 'pounce': {
      const t = closest(adjacentFoes, 300) || weakest(foes);
      if (t) {
        hurt(b, u, t, u.atk * 2.5, 'ability');
        u.status.haste = 0.55; u.status.hasteUntil = b.time + 4;
        points.push({ x: t.x, y: t.y - 40 });
        targets = [t];
      }
      break;
    }
    case 'breath': {
      kind = 'cone';
      targets = adjacentFoes;
      for (const f of targets) {
        hurt(b, u, f, u.atk * 1.15, 'ability');
        f.burn = { dps: 4 + u.atk * 0.16, until: b.time + 4 };
        points.push({ x: f.x, y: f.y - 38 });
      }
      break;
    }
    case 'fortify': {
      kind = 'shield';
      for (const m of adjacentMates) {
        m.shield += Math.round(m.maxHp * 0.26);
        points.push({ x: m.x, y: m.y - 55 });
      }
      break;
    }
    case 'drain': {
      const t = closest(adjacentFoes, 320) || ownLaneFoes[0] || weakest(foes);
      if (t) {
        const dealt = hurt(b, u, t, u.atk * 2.0, 'ability');
        healUnit(b, u, dealt * 0.65 + u.maxHp * 0.08);
        points.push({ x: t.x, y: t.y - 40 });
        targets = [t];
      }
      break;
    }
    case 'reap': {
      const t = weakest(ownLaneFoes) || weakest(adjacentFoes);
      if (t) {
        for (let i = 0; i < 3; i++) hurt(b, u, t, u.atk * 0.95, 'ability');
        points.push({ x: t.x, y: t.y - 40 });
        targets = [t];
      }
      break;
    }
    default: break;
  }

  u.lunge = 1;
  b.shake = Math.max(b.shake, 4);
  ev(b, 'cast', {
    x: u.x, y: u.y - 56, lane: u.lane, side: u.side, name: u.name,
    ability: skill, kind, color: u.ref.art.glow,
    points: points.slice(0, 8),
  });
  return true;
}

function attack(b, u, target) {
  const melee = u.range < 150;
  const base = u.atk * atkBonus(u) * (u.bloodrush ? 1.3 : 1) * rnd(0.92, 1.08);
  const dmg = directDamage(b, u, target, base, melee ? 'melee' : 'ranged');
  u.lunge = 1;
  if (melee) {
    ev(b, 'slash', { x: u.x, y: u.y - 44, tx: target.x, ty: target.y - 44, side: u.side, color: u.ref.art.glow });
    if (u.traits.has('venom')) addPoison(b, target, 2.5 + u.atk * 0.12, 4);
    if (u.traits.has('frost')) { target.status.slow = Math.max(target.status.slow, 0.25); target.status.slowUntil = b.time + 1.6; }
    if (u.traits.has('burn')) target.burn = { dps: 3 + u.atk * 0.16, until: b.time + 3 };
  } else {
    ev(b, 'shot', {
      x: u.x, y: u.y - 48, tx: target.x, ty: target.y - 36, side: u.side,
      color: u.ref.art.glow, kind: u.ref.primary,
    });
    if (u.traits.has('venom')) addPoison(b, target, 2.5 + u.atk * 0.12, 4);
    if (u.traits.has('frost')) { target.status.slow = Math.max(target.status.slow, 0.25); target.status.slowUntil = b.time + 1.6; }
    if (u.traits.has('burn')) target.burn = { dps: 3 + u.atk * 0.16, until: b.time + 3 };
  }
  // flurry
  if (u.traits.has('flurry') && Math.random() < 0.22 && alive(target)) {
    directDamage(b, u, target, base * 0.62, melee ? 'melee' : 'ranged');
    ev(b, 'flurry', { x: u.x, y: u.y - 50, color: u.ref.art.glow });
  }
  u.energy = Math.min(u.energyMax, u.energy + 13);
}

function tickDots(b, u, dt) {
  if (u.poison.length) {
    u.poison = u.poison.filter((p) => p.until > b.time);
    if (u.poison.length) {
      const dps = u.poison.reduce((s, p) => s + p.dps, 0);
      const dmg = dps * dt;
      u.hp -= dmg;
      u.dotTimer += dt;
      if (u.dotTimer > 0.75) {
        u.dotTimer = 0;
        ev(b, 'dot', { x: u.x + 8, y: u.y - 46, amount: Math.max(1, Math.round(dmg + dps * 0.4)), color: '#b8ef6a' });
      }
    }
  }
  if (u.burn && u.burn.until > b.time) {
    const dmg = u.burn.dps * dt;
    u.hp -= dmg;
    u.dotTimer += dt;
    if (u.dotTimer > 0.85) {
      u.dotTimer = 0;
      ev(b, 'dot', { x: u.x - 8, y: u.y - 44, amount: Math.max(1, Math.round(dmg + u.burn.dps * 0.3)), color: '#ff9a5c' });
    }
  } else if (u.burn) u.burn = null;

  if (u.traits.has('regen') && u.hp < u.maxHp) {
    u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.02 * dt);
  }
  if (u.hp <= 0) killUnit(b, u);
}

function updateUnit(b, u, dt) {
  if (!alive(u)) { u.deathT += dt; return; }
  if (u.status.stunUntil > b.time) {
    u.walking = false;
    u.flash = Math.max(0, u.flash - dt * 3);
    return;
  }
  if (u.status.slowUntil <= b.time) u.status.slow = 0;
  if (u.status.atkBuffUntil <= b.time) u.status.atkBuff = 0;
  if (u.status.hasteUntil <= b.time) u.status.haste = 0;

  u.flash = Math.max(0, u.flash - dt * 4.5);
  u.lunge = Math.max(0, u.lunge - dt * 6);
  u.hitAnim = Math.max(0, u.hitAnim - dt * 5);
  u.walking = false;

  tickDots(b, u, dt);
  if (!alive(u)) return;

  // energy + auto cast
  u.energy = Math.min(u.energyMax, u.energy + dt * 5.2);
  if (u.energy >= u.energyMax && u.autoCastAt === 0) {
    u.autoCastAt = b.time + (u.side === 'player' ? ABILITY_AUTO_DELAY.player : ABILITY_AUTO_DELAY.enemy * rnd(0.7, 1.4));
  }
  if (u.energy >= u.energyMax && u.autoCastAt > 0 && b.time >= u.autoCastAt) {
    castAbility(b, u);
  }

  const target = acquireTarget(b, u);
  const dir = u.side === 'player' ? 1 : -1;
  const inLaneFoe = sameLaneEnemy(b, u);

  // nexus attack?
  if (!inLaneFoe) {
    const canNexus = u.side === 'player' ? u.x >= 930 : u.x <= 70;
    if (canNexus) {
      if (!u.breakAnnounced) {
        u.breakAnnounced = true;
        u.atNexus = true;
        ev(b, 'laneBreak', { side: u.side, lane: u.lane, color: u.ref.art.glow });
      }
      u.attackTimer -= dt;
      if (u.attackTimer <= 0) {
        const amount = Math.max(7, u.atk * 0.55 * (u.bloodrush ? 1.4 : 1));
        hurtNexus(b, u, amount);
        u.attackTimer = u.interval / aspdBonus(u) * 1.05;
        ev(b, 'nexusStrike', { x: u.x, y: u.y - 40, side: u.side, lane: u.lane, color: u.ref.art.glow });
      }
      return;
    }
    if (target) {
      // ranged support from adjacent lane: hold position and fire
      if (u.range >= 150) {
        // shoot
      } else {
        // melee never has cross-lane target
      }
    }
  }

  if (target) {
    u.attackTimer -= dt;
    if (u.attackTimer <= 0) {
      attack(b, u, target);
      u.attackTimer = u.interval / aspdBonus(u);
    }
    // drift forward if target is far (mostly ranged lanes)
    if (dist(u, target) > u.range * 0.92) {
      moveUnit(b, u, dt, target, dir);
    }
  } else if (inLaneFoe) {
    // enemy exists in lane but is out of reach → advance
    moveUnit(b, u, dt, inLaneFoe, dir);
  } else {
    const any = nearestLaneEnemy(b, u);
    if (any) moveUnit(b, u, dt, null, dir);
    else moveUnit(b, u, dt, null, dir);
  }
}

export function stepBattle(b, dt) {
  if (b.over) return;
  dt = Math.min(dt, 0.05);
  b.time += dt;
  b.shake = Math.max(0, b.shake - dt * 22);

  if (!b.bloodrush && b.time >= 40) {
    b.bloodrush = true;
    for (const u of b.units) u.bloodrush = true;
    ev(b, 'bloodrush', {});
  }

  for (const u of b.units) updateUnit(b, u, dt);

  if (b.time >= b.duration && !b.over) {
    const p = b.playerNexus / NEXUS_HP;
    const e = b.enemyNexus / NEXUS_HP;
    if (p > e) finish(b, 'player');
    else if (e > p) finish(b, 'enemy');
    else {
      const pScore = b.units.filter((u) => u.side === 'player' && alive(u)).reduce((s, u) => s + u.hp / u.maxHp, 0);
      const eScore = b.units.filter((u) => u.side === 'enemy' && alive(u)).reduce((s, u) => s + u.hp / u.maxHp, 0);
      finish(b, pScore >= eScore ? 'player' : 'enemy');
    }
  }
}

export function readyUnits(b, side = 'player') {
  return b.units.filter((u) => u.side === side && alive(u) && u.energy >= 100);
}

export function autoCastIn(b, u) {
  if (!alive(u) || u.energy < 100) return null;
  if (!u.autoCastAt) return null;
  return Math.max(0, u.autoCastAt - b.time);
}
