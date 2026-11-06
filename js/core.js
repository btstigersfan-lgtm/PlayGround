// ─────────────────────────────────────────────────────────────
//  CHIMERA — core: state, chimera genetics, shared helpers
// ─────────────────────────────────────────────────────────────
import {
  ESSENCES, ESSENCE_BY_ID, FAMILIES, TERRAINS, MUTATIONS, MUTATION_BY_ID,
  LINEUPS, BOONS, STARTING_AETHER, MAX_EMBERS, TOTAL_ROUNDS, ROMAN,
  attachRandomMutation,
} from './data.js'
import { mix } from './creature.js'

export { ESSENCES, ESSENCE_BY_ID, FAMILIES, TERRAINS, MUTATIONS, MUTATION_BY_ID, LINEUPS, BOONS, TOTAL_ROUNDS, ROMAN }
export const $ = (s, p = document) => p.querySelector(s)
export const $$ = (s, p = document) => [...p.querySelectorAll(s)]
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const cap = s => s.charAt(0).toUpperCase() + s.slice(1)
export const fmt = n => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : Math.round(n).toString()
export const rnd = (a, b) => a + Math.random() * (b - a)
export const pick = arr => arr[Math.floor(Math.random() * arr.length)]

export function hashString(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ───────────────────────────── event bus ─────────────────────────────
const listeners = {}
export function on(evt, fn) { (listeners[evt] ||= []).push(fn) }
export function emit(evt, data) { (listeners[evt] || []).forEach(fn => fn(data)) }

// ───────────────────────────── sound ─────────────────────────────
export const sound = {
  ctx: null,
  enabled: true,
  lastHit: 0,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)() } catch { this.ctx = null }
  },
  tone(freq, dur = 0.12, type = 'sine', gain = 0.03, slide = 0, delay = 0) {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return
    const t0 = this.ctx.currentTime + delay
    const o = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t0)
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    o.connect(g).connect(this.ctx.destination)
    o.start(t0); o.stop(t0 + dur + 0.02)
  },
  click() { this.tone(520, 0.05, 'triangle', 0.018, 80) },
  hit(crit = false) {
    const now = performance.now()
    if (now - this.lastHit < 45) return
    this.lastHit = now
    this.tone(crit ? 150 : 105, crit ? 0.14 : 0.09, 'triangle', crit ? 0.05 : 0.028, -55)
  },
  cast() {
    this.tone(300, 0.28, 'sine', 0.03, 520)
    this.tone(600, 0.22, 'triangle', 0.015, 300, 0.04)
  },
  fuse() {
    [261.6, 329.6, 392, 523.3].forEach((f, i) => this.tone(f, 0.5, 'sine', 0.022, 0, i * 0.06))
  },
  breach(ally = true) {
    [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.022, 0, i * 0.07))
    this.tone(ally ? 98 : 73, 0.5, 'sine', 0.05, -20)
  },
  win() {
    [261.6, 392, 523.3, 659.3, 784].forEach((f, i) => this.tone(f, 0.9, 'sine', 0.026, 0, i * 0.1))
  },
  lose() {
    [220, 174.6, 146.8, 110].forEach((f, i) => this.tone(f, 0.8, 'triangle', 0.03, -20, i * 0.14))
  },
}

// ───────────────────────────── run state ─────────────────────────────
const defaultMods = () => ({
  hp: 1, atk: 1, aspd: 1, crit: 0, leech: 0, shield: 0, energy: 1,
  cdr: 1, starfall: 1, shifts: 0, mutations: 0, healing: 0,
})

export const state = {
  view: 'prep',
  round: 1,
  aether: STARTING_AETHER,
  embers: MAX_EMBERS,
  fighters: Array(5).fill(null),
  prime: 'wolf',
  seed: 'phoenix',
  selectedLane: 0,
  lineup: [],
  boons: [],
  runMods: defaultMods(),
  stats: { fusions: 0, roundsWon: 0, laneWins: 0, laneLosses: 0, damage: 0, battles: 0 },
  battle: null,
  runOver: false,
  soundOn: true,
  retrying: false,
}

export function resetRun() {
  state.view = 'prep'
  state.round = 1
  state.aether = STARTING_AETHER
  state.embers = MAX_EMBERS
  state.fighters = Array(5).fill(null)
  state.prime = 'wolf'
  state.seed = 'phoenix'
  state.selectedLane = 0
  state.boons = []
  state.runMods = defaultMods()
  state.stats = { fusions: 0, roundsWon: 0, laneWins: 0, laneLosses: 0, damage: 0, battles: 0 }
  state.battle = null
  state.runOver = false
  state.retrying = false
  state.lineup = buildEnemyLineup(1)
  try { state.soundOn = localStorage.getItem('chimera-sound') !== 'off' } catch { state.soundOn = true }
}

export function currentLineupDef() { return LINEUPS[state.round - 1] }
export function terrainFor(lane) { return TERRAINS[lane] }
export function familyInfo(id) { return FAMILIES[id] || { name: id, color: '#9fd0ff', soft: '#dce9ff' } }

// ───────────────────────────── fighter construction ─────────────────────────────
function basePassive(f) {
  const k = f.passive?.key
  f.flags ||= {}
  if (k === 'thickhide') f.armor += 10
  if (k === 'bulwark') { f.armor += 10; f.shieldPower *= 1.2 }
  if (k === 'airborne') f.dodge += 0.15
  if (k === 'predator') f.crit += 15
  if (k === 'livingstone') f.battleShield += 0.10
  if (k === 'soulsiphon') f.lifesteal += 0.15
  if (k === 'tyrantscale') f.armor += 10
  if (k === 'ashcycle') f.flags.reborn = true
}

function applyMutation(f, id) {
  const m = MUTATION_BY_ID[id]
  if (!m || f.mutations.includes(id)) return false
  f.mutations.push(id)
  f.flags ||= {}
  m.apply(f)
  return true
}

function applyTerrain(f, laneIndex) {
  const terr = TERRAINS[laneIndex]
  if (!terr) return
  if (!f.lineage.includes(terr.family)) return
  f.resonant = { id: terr.id, name: terr.name, desc: terr.desc, color: terr.color, family: terr.family }
  if (terr.bonus.hp) f.maxHp *= terr.bonus.hp
  if (terr.bonus.atk) f.atk *= terr.bonus.atk
  if (terr.bonus.aspd) f.interval /= terr.bonus.aspd
  if (terr.bonus.energy) f.energyMult *= terr.bonus.energy
}

function roleFrom(f) {
  if (f.maxHp > 1080 && f.interval > 1.15) return 'Vanguard'
  if (f.interval <= 0.88) return 'Skirmisher'
  if (f.rangeType === 'ranged' && f.atk > 72) return 'Mystic'
  if (f.atk > 82) return 'Juggernaut'
  if (f.crit > 18) return 'Assassin'
  return 'Duelist'
}

function randomMutations(f, rng, count) {
  const pool = MUTATIONS.filter(m => !f.mutations.includes(m.id) && !(m.id === f.lastMutation))
  for (let i = 0; i < count; i++) {
    const available = pool.filter(m => !f.mutations.includes(m.id))
    if (!available.length) break
    const m = available[Math.floor(rng() * available.length)]
    applyMutation(f, m.id)
  }
}

function finalizeFighter(f, opts = {}) {
  const {
    laneIndex = 0, scale = 1, rng = Math.random, mutations = null,
    name = null, title = null, isPlayer = false, boss = false,
  } = opts
  basePassive(f)
  if (mutations && mutations.length) {
    mutations.forEach(id => applyMutation(f, id))
  } else {
    let count = f.isPureblood ? 1 : 1 + (rng() < 0.48 ? 1 : 0)
    if (isPlayer && state.runMods.mutations) count += state.runMods.mutations
    randomMutations(f, rng, count)
  }
  f.maxHp = Math.max(320, Math.round(f.maxHp * scale))
  f.atk = Math.max(24, Math.round(f.atk * scale * 10) / 10)
  f.interval = Math.max(0.45, Math.round(f.interval * 1000) / 1000)
  f.armor = Math.round(clamp(f.armor, 0, 55))
  f.crit = Math.round(clamp(f.crit, 0, 60))
  f.lifesteal = Math.round(f.lifesteal * 100) / 100
  f.dodge = Math.round(f.dodge * 100) / 100
  f.thorns = Math.round(f.thorns * 100) / 100
  f.shieldPower = Math.round(f.shieldPower * 100) / 100
  f.energyMult = Math.round(f.energyMult * 100) / 100
  f.battleShield = Math.round(f.battleShield * 100) / 100
  applyTerrain(f, laneIndex)
  f.maxHp = Math.round(f.maxHp)
  f.atk = Math.round(f.atk * 10) / 10
  f.hp = f.maxHp
  f.role = roleFrom(f)
  if (name) f.name = name
  if (title) f.title = title
  f.laneIndex = laneIndex
  f.isPlayer = isPlayer
  f.isEnemy = !isPlayer
  f.isBoss = boss
  f.level = state.round
  f.phaseOffset = rng() * 6
  f.power = powerOf(f)
  return f
}

export function makeChimera(primeId, seedId, opts = {}) {
  const a = ESSENCE_BY_ID[primeId]
  const b = ESSENCE_BY_ID[seedId]
  const rng = opts.rng || Math.random
  const pure = a.family === b.family
  const f = {
    id: `${primeId}-${seedId}-${opts.laneIndex ?? 0}`,
    name: cap(a.prefix + b.suffix),
    title: a.epithet,
    family: a.family,
    family2: b.family !== a.family ? b.family : null,
    lineage: [...new Set([a.family, b.family])],
    silhouette: a.silhouette,
    extra: b.silhouette !== a.silhouette ? b.silhouette : null,
    extraAccent: b.accent,
    color: mix(a.color, b.color, 0.34),
    accent: mix(a.accent, b.accent, 0.25),
    deep: mix(a.deep, b.deep, 0.4),
    soft: mix(mix(a.color, b.color, 0.34), '#ffffff', 0.55),
    role: 'Duelist',
    maxHp: ((a.hp + b.hp) / 2) * 1.07 * (pure ? 1.12 : 1),
    atk: ((a.atk + b.atk) / 2) * 1.07 * (pure ? 1.12 : 1),
    interval: ((a.interval + b.interval) / 2) * (pure ? 0.95 : 0.98),
    armor: Math.round((a.armor + b.armor) / 2),
    crit: Math.round((a.crit + b.crit) / 2),
    lifesteal: 0,
    dodge: 0,
    thorns: 0,
    battleShield: 0,
    shieldPower: 1,
    energyMult: 1,
    rangeType: (a.range === 'ranged' || b.range === 'ranged') ? 'ranged' : 'melee',
    ability: { ...a.ability, power: pure ? 1.22 : 1 },
    passive: { ...b.passive },
    abilitySource: a.name,
    passiveSource: b.name,
    primeId, seedId,
    flags: {},
    mutations: [],
    isPureblood: pure,
    abilityPower: pure ? 1.22 : 1,
    resonant: null,
  }
  if (primeId === seedId) f.name = 'Elder ' + a.name
  if (opts.name) f.name = opts.name
  if (opts.title) f.title = opts.title
  return finalizeFighter(f, opts)
}

export function makeEssenceEnemy(essenceId, opts = {}) {
  const e = ESSENCE_BY_ID[essenceId]
  const f = {
    id: `enemy-${essenceId}-${opts.laneIndex ?? 0}`,
    name: e.name,
    title: e.epithet,
    family: e.family,
    family2: null,
    lineage: [e.family],
    silhouette: e.silhouette,
    extra: null,
    extraAccent: e.accent,
    color: e.color,
    accent: e.accent,
    deep: e.deep,
    soft: mix(e.color, '#ffffff', 0.55),
    role: e.role,
    maxHp: e.hp,
    atk: e.atk,
    interval: e.interval,
    armor: e.armor,
    crit: e.crit,
    lifesteal: 0,
    dodge: 0,
    thorns: 0,
    battleShield: 0,
    shieldPower: 1,
    energyMult: 1,
    rangeType: e.range,
    ability: { ...e.ability, power: 1 },
    passive: { ...e.passive },
    abilitySource: e.name,
    passiveSource: e.name,
    flags: {},
    mutations: [],
    isPureblood: false,
    abilityPower: 1,
    resonant: null,
  }
  return finalizeFighter(f, opts)
}

export function buildEnemyLineup(round) {
  const def = LINEUPS[round - 1]
  return def.units.map((u, i) => {
    let f
    if (u.fusion) {
      f = makeChimera(u.fusion[0], u.fusion[1], {
        laneIndex: i, scale: u.scale, mutations: u.mutations || [],
        name: u.name, title: u.title, rng: mulberry32(hashString(`boss-${round}-${i}`)),
        boss: !!u.boss,
      })
    } else {
      f = makeEssenceEnemy(u.essence, {
        laneIndex: i, scale: u.scale, mutations: u.mutations || null,
        rng: mulberry32(hashString(`foe-${round}-${i}-${u.name}`)),
        name: u.name, title: u.title,
      })
    }
    f.level = round
    return f
  })
}

export function cloneFighter(f) {
  if (!f) return null
  return {
    ...f,
    flags: { ...f.flags },
    mutations: [...f.mutations],
    resonant: f.resonant ? { ...f.resonant } : null,
    ability: { ...f.ability },
    passive: { ...f.passive },
  }
}

export function effectivePlayer(f) {
  const c = cloneFighter(f)
  const m = state.runMods
  c.maxHp = Math.round(f.maxHp * m.hp)
  c.hp = c.maxHp
  c.atk = Math.round(f.atk * m.atk * 10) / 10
  c.interval = Math.max(0.3, f.interval / m.aspd)
  c.crit = f.crit + m.crit
  c.lifesteal = f.lifesteal + m.leech
  c.battleShield = f.battleShield + m.shield
  c.energyMult = f.energyMult * m.energy
  c.shieldPower = f.shieldPower * (1 + m.healing)
  c.role = f.role
  return c
}

export function powerOf(f) {
  const armorEff = 1 + clamp(f.armor || 0, 0, 60) / 100 * 0.85
  const dodgeEff = 1 + (f.dodge || 0) * 0.7
  const shieldEff = 1 + (f.battleShield || 0) * 0.8
  const ehp = f.maxHp * armorEff * dodgeEff * shieldEff
  const dps = (f.atk / Math.max(0.3, f.interval)) * (1 + (f.crit || 0) / 100 * 0.55)
  return Math.round(ehp * 0.5 + dps * 5.6 + (f.lifesteal || 0) * ehp * 0.5 + (f.shieldPower || 1) * 22)
}

export function previewChimera(laneIndex) {
  if (!state.prime || !state.seed) return null
  const key = `${state.prime}|${state.seed}|${laneIndex}|${state.round}|${state.stats.fusions}|${state.runMods.mutations}`
  return makeChimera(state.prime, state.seed, {
    laneIndex, rng: mulberry32(hashString(key)), isPlayer: true,
  })
}

export function fighterStatLine(f) {
  return { hp: f.maxHp, atk: f.atk, aspd: 1 / f.interval, armor: f.armor, crit: f.crit, range: f.rangeType }
}

// ───────────────────────────── toast ─────────────────────────────
let toastTimer = null
export function toast(text, bad = false) {
  const stack = $('#toastStack')
  if (!stack) return
  const el = document.createElement('div')
  el.className = 'toast' + (bad ? ' bad' : '')
  el.textContent = text
  stack.appendChild(el)
  while (stack.children.length > 3) stack.firstChild.remove()
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(6px)'; el.style.transition = '.3s'; setTimeout(() => el.remove(), 320) }, 2500)
}

export function updateSoundButton() {
  document.body.classList.toggle('muted', !state.soundOn)
}

export function setSound(on) {
  state.soundOn = on
  sound.enabled = on
  updateSoundButton()
  try { localStorage.setItem('chimera-sound', on ? 'on' : 'off') } catch {}
}

export function attachBoonMutation(fighter) {
  return attachRandomMutation(fighter)
}
