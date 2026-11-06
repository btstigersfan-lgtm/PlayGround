import { SPECIES, TIER_NAMES, TRAITS, waveData } from './data.js';

let nextId = 1;
export function newId() { return `u${nextId++}`; }
export function resetIds() { nextId = 1; }

// ── colour helpers ───────────────────────────────────────────────────────────
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export function mix(a, b, t = 0.5) {
  const A = hexToRgb(a); const B = hexToRgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
export function shade(hex, amt) {
  const c = hexToRgb(hex);
  return '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v + amt))).toString(16).padStart(2, '0')).join('');
}

// ── art descriptor ──────────────────────────────────────────────────────────
export function buildArt(primaryKey, secondaryKey, tier = 1) {
  const A = SPECIES[primaryKey];
  const B = secondaryKey ? SPECIES[secondaryKey] : null;
  const p = A.palette;
  const q = B ? B.palette : A.palette;
  const feats = new Set(A.features);
  if (B) for (const f of B.features) feats.add(f);
  return {
    body: A.body,
    accentBody: B ? B.body : null,
    primary: primaryKey,
    secondary: secondaryKey || null,
    c1: mix(p.c1, q.c1, B ? 0.32 : 0),
    c2: mix(p.c2, q.c2, B ? 0.32 : 0),
    belly: mix(p.belly, q.belly, B ? 0.4 : 0),
    glow: B ? q.glow : p.glow,
    eyeL: p.eye,
    eyeR: B ? q.eye : p.eye,
    feats,
    tier,
    scale: 1 + (tier - 1) * 0.055 + (feats.has('bulk') ? 0.07 : 0),
  };
}

export function fullName(primaryKey, secondaryKey, tier) {
  const A = SPECIES[primaryKey];
  const B = secondaryKey ? SPECIES[secondaryKey] : A;
  const base = A.prefix + B.suffix;
  return tier > 1 ? `${TIER_NAMES[tier] || ''} ${base}` : base;
}

export function speciesLine(unit) {
  if (!unit.secondary) return SPECIES[unit.primary].name;
  return `${SPECIES[unit.primary].name} / ${SPECIES[unit.secondary].name}`;
}

export function abilityOf(unit) { return SPECIES[unit.primary].ability; }

// ── unit factories ──────────────────────────────────────────────────────────
export function makeBaseUnit(primaryKey, opts = {}) {
  const S = SPECIES[primaryKey];
  const tier = opts.tier || 1;
  const secondary = opts.secondary || null;
  const stats = {
    hp: Math.round(S.stats.hp * (tier > 1 ? [1, 1.55, 2.15, 2.85][tier] : 1)),
    atk: Math.round(S.stats.atk * (tier > 1 ? [1, 1.55, 2.15, 2.85][tier] : 1)),
    interval: S.stats.interval,
    range: S.stats.range,
    speed: S.stats.speed,
  };
  return {
    id: opts.id || newId(),
    name: opts.name || fullName(primaryKey, secondary, tier),
    primary: primaryKey,
    secondary,
    tier,
    role: S.role,
    stats,
    traits: pickTraits([S.traits, secondary ? SPECIES[secondary].traits : []], traitCap(tier)),
    ability: S.ability,
    art: buildArt(primaryKey, secondary, tier),
    enemy: !!opts.enemy,
    lore: S.blurb,
  };
}

export function makeEnemyUnit(template, wave) {
  const wd = waveData(wave);
  const u = makeBaseUnit(template.species, {
    secondary: template.secondary,
    tier: template.tier || 1,
    name: template.name,
    enemy: true,
  });
  scaleUnit(u, wd.scale * (template.name ? 1.06 : 1));
  return u;
}

export function scaleUnit(unit, mul) {
  unit.stats = {
    ...unit.stats,
    hp: Math.round(unit.stats.hp * mul),
    atk: Math.round(unit.stats.atk * mul),
  };
  return unit;
}

export function traitCap(tier) { return tier >= 3 ? 4 : tier === 2 ? 3 : 2; }

export function pickTraits(groups, cap) {
  const out = [];
  const maxLen = Math.max(...groups.map((g) => g.length), 0);
  for (let i = 0; i < maxLen && out.length < cap; i++) {
    for (const g of groups) {
      const t = g[i];
      if (t && !out.includes(t) && out.length < cap) out.push(t);
    }
  }
  return out;
}

// ── splice ──────────────────────────────────────────────────────────────────
export function spliceCost(a, b) {
  return 4 + a.tier + b.tier;
}

export function previewSplice(a, b) {
  const maxHp = Math.max(a.stats.hp, b.stats.hp);
  const minHp = Math.min(a.stats.hp, b.stats.hp);
  const maxAtk = Math.max(a.stats.atk, b.stats.atk);
  const minAtk = Math.min(a.stats.atk, b.stats.atk);
  const tier = Math.min(4, Math.max(a.tier, b.tier) + 1);
  const traits = pickTraits([a.traits, b.traits], traitCap(tier));
  const stats = {
    hp: Math.round(maxHp * 1.1 + minHp * 0.45 + 62 * tier),
    atk: Math.round(maxAtk * 1.1 + minAtk * 0.45 + 5 * tier),
    interval: Math.max(0.55, +(((a.stats.interval + b.stats.interval) / 2) * 0.94).toFixed(2)),
    range: a.stats.range,
    speed: Math.round((a.stats.speed + b.stats.speed) / 2),
  };
  return {
    id: newId(),
    name: fullName(a.primary, b.primary, tier),
    primary: a.primary,
    secondary: b.primary,
    tier,
    role: SPECIES[a.primary].role,
    stats,
    traits,
    ability: SPECIES[a.primary].ability,
    art: buildArt(a.primary, b.primary, tier),
    lore: `Spliced from ${a.name} and ${b.name}. ${SPECIES[a.primary].blurb}`,
    parents: [a.id, b.id],
  };
}

export function applySplice(roster, aId, bId) {
  const a = roster.find((u) => u.id === aId);
  const b = roster.find((u) => u.id === bId);
  if (!a || !b || a === b) return null;
  const hybrid = previewSplice(a, b);
  const rest = roster.filter((u) => u.id !== aId && u.id !== bId);
  return { hybrid, roster: [...rest, hybrid], cost: spliceCost(a, b) };
}

// ── display helpers ─────────────────────────────────────────────────────────
export function statTags(unit) {
  return {
    hp: unit.stats.hp,
    atk: unit.stats.atk,
    dps: Math.round((unit.stats.atk / unit.stats.interval) * 10) / 10,
    range: unit.stats.range >= 150 ? 'Ranged' : 'Melee',
  };
}

export function traitList(unit) {
  return unit.traits.map((t) => TRAITS[t]).filter(Boolean);
}

export function combatPower(unit) {
  const dps = (unit.stats.atk / unit.stats.interval) * (unit.stats.range >= 150 ? 0.9 : 1.05);
  return Math.round(unit.stats.hp * 0.42 + dps * 18 + unit.traits.length * 42 + unit.tier * 60);
}

export function uniqueName(name, roster) {
  if (!roster.some((u) => u.name === name)) return name;
  const suffixes = ['', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
  let i = 2;
  while (roster.some((u) => u.name === `${name} ${suffixes[i] || i}`)) i++;
  return `${name} ${suffixes[i] || i}`;
}
