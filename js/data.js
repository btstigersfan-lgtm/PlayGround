// ─────────────────────────────────────────────────────────────
//  CHIMERA — data: lineages, essences, terrains, enemies, boons
// ─────────────────────────────────────────────────────────────

export const FAMILIES = {
  beast:     { name: 'Beast',     color: '#9fd0ff', soft: '#cfe6ff' },
  avian:     { name: 'Avian',     color: '#a9dcff', soft: '#dcf3ff' },
  reptile:   { name: 'Reptile',   color: '#74e9c4', soft: '#c9ffec' },
  insect:    { name: 'Insect',    color: '#f3d98a', soft: '#fff0bf' },
  construct: { name: 'Construct', color: '#bfcadd', soft: '#e7eefb' },
  spirit:    { name: 'Spirit',    color: '#d8a9ff', soft: '#f0d9ff' },
  monster:   { name: 'Monster',   color: '#ffa184', soft: '#ffd8ca' },
}

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI']

// Terrain resonance is baked into a chimera at the moment of deployment.
export const TERRAINS = [
  {
    id: 'verdant', name: 'Verdant Rift', family: 'beast', roman: 'I',
    bonus: { hp: 1.20 }, color: '#7fe3ac', tint: '#0f2a22',
    desc: '+20% max HP',
  },
  {
    id: 'skyreach', name: 'Skyreach Spire', family: 'avian', roman: 'II',
    bonus: { aspd: 1.25 }, color: '#a9d8ff', tint: '#111f33',
    desc: '+25% attack speed',
  },
  {
    id: 'cinder', name: 'Cinder Pit', family: 'monster', roman: 'III',
    bonus: { atk: 1.22 }, color: '#ff9a6b', tint: '#2a1611',
    desc: '+22% attack',
  },
  {
    id: 'abyss', name: 'Abyssal Well', family: 'reptile', roman: 'IV',
    bonus: { hp: 1.20 }, color: '#74e9c4', tint: '#0d2726',
    desc: '+20% max HP',
  },
  {
    id: 'null', name: 'Null Court', family: 'spirit', roman: 'V',
    bonus: { energy: 1.30 }, color: '#d8a9ff', tint: '#22152e',
    desc: '+30% ability charge',
  },
]

// ───────────────────────────── ESSENCES ─────────────────────────────
// Prime supplies active ability; Seed supplies passive.
export const ESSENCES = [
  {
    id: 'wolf', name: 'Fenrir Whelp', family: 'beast', role: 'Duelist', silhouette: 'beast',
    hp: 760, atk: 64, interval: 1.00, armor: 6, crit: 8, lifesteal: 0,
    range: 'melee', color: '#bcd8ff', accent: '#5aa7ff', deep: '#1b3153',
    prefix: 'Fenr', suffix: 'fang', epithet: 'the Frostbound',
    passive: { key: 'pack', name: 'Pack Instinct', desc: '+15% attack speed while above 60% health.' },
    ability: { key: 'pounce', name: 'Savage Pounce', desc: 'Leaps at the foe for 190% ATK and a lingering bleed.' },
  },
  {
    id: 'bear', name: 'Ursine Colossus', family: 'beast', role: 'Vanguard', silhouette: 'beast',
    hp: 1150, atk: 78, interval: 1.45, armor: 14, crit: 4, lifesteal: 0,
    range: 'melee', color: '#d8b48a', accent: '#c47b3e', deep: '#3a2417',
    prefix: 'Urs', suffix: 'hide', epithet: 'the Mountain',
    passive: { key: 'thickhide', name: 'Thick Hide', desc: '+10% damage reduction from every blow.' },
    ability: { key: 'maul', name: 'Crushing Maul', desc: 'A tectonic blow for 155% ATK that stuns for 1.1s.' },
  },
  {
    id: 'falcon', name: 'Storm Talon', family: 'avian', role: 'Skirmisher', silhouette: 'avian',
    hp: 640, atk: 58, interval: 0.78, armor: 2, crit: 10, lifesteal: 0,
    range: 'melee', color: '#bfe9ff', accent: '#45c5ff', deep: '#15324a',
    prefix: 'Aer', suffix: 'talon', epithet: 'the Skyborne',
    passive: { key: 'airborne', name: 'Airborne', desc: '15% chance to slip any attack entirely.' },
    ability: { key: 'dive', name: 'Skyfall Dive', desc: 'A 200% ATK stoop that grants 2 sure dodges.' },
  },
  {
    id: 'serpent', name: 'Sable Coil', family: 'reptile', role: 'Mystic', silhouette: 'reptile',
    hp: 780, atk: 62, interval: 1.15, armor: 8, crit: 8, lifesteal: 0,
    range: 'ranged', color: '#8ff0c4', accent: '#21c98a', deep: '#10362b',
    prefix: 'Seth', suffix: 'coil', epithet: 'the Venomous',
    passive: { key: 'venomcoils', name: 'Venom Coils', desc: 'Attacks leave a 3s poison on the target.' },
    ability: { key: 'venom', name: 'Venom Burst', desc: '115% ATK, heavy poison and a numbing slow.' },
  },
  {
    id: 'turtle', name: 'Aegis Shell', family: 'reptile', role: 'Sentinel', silhouette: 'turtle',
    hp: 1280, atk: 44, interval: 1.55, armor: 24, crit: 2, lifesteal: 0,
    range: 'melee', color: '#a9d6b9', accent: '#4e9e7f', deep: '#183528',
    prefix: 'Chel', suffix: 'shell', epithet: 'the Unbroken',
    passive: { key: 'bulwark', name: 'Bulwark', desc: '+10% armour and 20% stronger shields.' },
    ability: { key: 'guard', name: 'Shell Guard', desc: 'Raises a 32% max-HP shield and thorned hide.' },
  },
  {
    id: 'golem', name: 'Rune Colossus', family: 'construct', role: 'Vanguard', silhouette: 'construct',
    hp: 1400, atk: 70, interval: 1.75, armor: 18, crit: 2, lifesteal: 0,
    range: 'melee', color: '#bfcadd', accent: '#8faacc', deep: '#232c3c',
    prefix: 'Ter', suffix: 'stone', epithet: 'the Runed',
    passive: { key: 'livingstone', name: 'Living Stone', desc: 'Begins each duel with a 10% max-HP shield.' },
    ability: { key: 'quake', name: 'Seismic Slam', desc: '155% ATK and a 1.35s stun that shakes the lane.' },
  },
  {
    id: 'wraith', name: 'Hollow Shade', family: 'spirit', role: 'Duelist', silhouette: 'spirit',
    hp: 720, atk: 76, interval: 1.10, armor: 4, crit: 8, lifesteal: 0,
    range: 'ranged', color: '#d5b8ff', accent: '#9b5cff', deep: '#271740',
    prefix: 'Mor', suffix: 'shade', epithet: 'the Hollow',
    passive: { key: 'soulsiphon', name: 'Soul Siphon', desc: 'Heals for 15% of all damage dealt.' },
    ability: { key: 'drain', name: 'Wraith Drain', desc: 'Tears away life and heals for most of it.' },
  },
  {
    id: 'phoenix', name: 'Ember Sovereign', family: 'spirit', role: 'Mystic', silhouette: 'avian',
    hp: 800, atk: 84, interval: 1.25, armor: 6, crit: 8, lifesteal: 0,
    range: 'ranged', color: '#ffd08a', accent: '#ff7a3c', deep: '#4a1c12',
    prefix: 'Pyr', suffix: 'wing', epithet: 'the Undying',
    passive: { key: 'ashcycle', name: 'Ashen Cycle', desc: 'Once per duel, rises again at 35% health.' },
    ability: { key: 'pyre', name: 'Pyre Nova', desc: '200% ATK and a searing 4s burn.' },
  },
  {
    id: 'scorpion', name: 'Dune Sting', family: 'insect', role: 'Assassin', silhouette: 'insect',
    hp: 700, atk: 66, interval: 0.95, armor: 10, crit: 20, lifesteal: 0,
    range: 'melee', color: '#f6d78f', accent: '#e39b2b', deep: '#3a2810',
    prefix: 'Vex', suffix: 'sting', epithet: 'the Venomhand',
    passive: { key: 'predator', name: "Predator's Eye", desc: '+15% critical strike chance.' },
    ability: { key: 'sting', name: 'Venom Sting', desc: '170% ATK with a guaranteed critical and poison.' },
  },
  {
    id: 'mantis', name: 'Bladewing', family: 'insect', role: 'Assassin', silhouette: 'insect',
    hp: 740, atk: 54, interval: 0.64, armor: 4, crit: 10, lifesteal: 0,
    range: 'melee', color: '#c8f79a', accent: '#6fc22c', deep: '#1c3210',
    prefix: 'Zan', suffix: 'claw', epithet: 'the Bladed',
    passive: { key: 'flurry', name: 'Flurry', desc: 'Every fourth strike lands a second time.' },
    ability: { key: 'storm', name: 'Blade Storm', desc: 'Five razor cuts in the span of a heartbeat.' },
  },
  {
    id: 'dragon', name: 'Cinder Wyrm', family: 'monster', role: 'Juggernaut', silhouette: 'monster',
    hp: 1080, atk: 92, interval: 1.40, armor: 14, crit: 6, lifesteal: 0,
    range: 'ranged', color: '#ffab8a', accent: '#ff5d3a', deep: '#461a14',
    prefix: 'Dra', suffix: 'maw', epithet: 'the Cinderking',
    passive: { key: 'tyrantscale', name: "Tyrant's Scale", desc: '+10% armour; attacks leave a short burn.' },
    ability: { key: 'breath', name: 'Cataclysm Breath', desc: '235% ATK in a torrent of fire and ash.' },
  },
  {
    id: 'kraken', name: 'Abyss Maw', family: 'reptile', role: 'Mystic', silhouette: 'kraken',
    hp: 1180, atk: 72, interval: 1.30, armor: 12, crit: 4, lifesteal: 0,
    range: 'ranged', color: '#8ad8e8', accent: '#2e8fa8', deep: '#0e2a33',
    prefix: 'Kra', suffix: 'tide', epithet: 'the Deepborn',
    passive: { key: 'abyssgrip', name: 'Abyssal Grip', desc: 'Attacks slow the victim by 15% for 2s.' },
    ability: { key: 'maelstrom', name: 'Maelstrom', desc: '150% ATK, a crushing slow, and a healing surge.' },
  },
]

export const ESSENCE_BY_ID = Object.fromEntries(ESSENCES.map(e => [e.id, e]))

// ───────────────────────────── MUTATIONS ─────────────────────────────
export const MUTATIONS = [
  {
    id: 'twinhearts', name: 'Twin Hearts', desc: '+18% maximum health.',
    apply: f => { f.maxHp *= 1.18 },
  },
  {
    id: 'bloodrage', name: 'Bloodrage', desc: '+25% attack while below half health.', flag: 'bloodrage',
    apply: f => { f.flags.bloodrage = true },
  },
  {
    id: 'phaseskin', name: 'Phase Skin', desc: '18% chance to phase through an attack.', flag: 'dodge',
    apply: f => { f.dodge += 0.18 },
  },
  {
    id: 'thornmail', name: 'Thornmail', desc: 'Reflects 15% of damage taken.', flag: 'thorns',
    apply: f => { f.thorns += 0.15 },
  },
  {
    id: 'vampiric', name: 'Vampiric', desc: 'Heals for 10% of damage dealt.', flag: 'lifesteal',
    apply: f => { f.lifesteal += 0.10 },
  },
  {
    id: 'frostvein', name: 'Frostvein', desc: 'Strikes slow the target by 18% for 2s.', flag: 'frost',
    apply: f => { f.flags.frost = true },
  },
  {
    id: 'emberblood', name: 'Emberblood', desc: 'Strikes ignite the target for 2s.', flag: 'ember',
    apply: f => { f.flags.ember = true },
  },
  {
    id: 'ironheart', name: 'Ironheart', desc: '+10% armour.', flag: 'armor',
    apply: f => { f.armor += 10 },
  },
  {
    id: 'berserker', name: 'Berserker', desc: '+30% attack speed below 35% health.', flag: 'berserk',
    apply: f => { f.flags.berserk = true },
  },
  {
    id: 'sinew', name: 'Giant Sinew', desc: '+14% attack.', flag: 'atk',
    apply: f => { f.atk *= 1.14 },
  },
  {
    id: 'regrowth', name: 'Regrowth', desc: 'Regenerates 1.6% max health each second.', flag: 'regen',
    apply: f => { f.flags.regen = 1.6 },
  },
  {
    id: 'executioner', name: 'Executioner', desc: '+30% damage to foes below 30% health.', flag: 'execute',
    apply: f => { f.flags.execute = true },
  },
  {
    id: 'aegisborn', name: 'Aegis Born', desc: 'Starts with a 16% max-health shield.', flag: 'shield',
    apply: f => { f.battleShield += 0.16 },
  },
  {
    id: 'swiftfoot', name: 'Swiftfoot', desc: '+10% attack speed and movement.', flag: 'speed',
    apply: f => { f.interval /= 1.10; f.flags.swift = true },
  },
  {
    id: 'keeneye', name: 'Keen Eye', desc: '+15% critical strike chance.', flag: 'crit',
    apply: f => { f.crit += 15 },
  },
  {
    id: 'reborn', name: 'Ashen Heart', desc: 'Rises once per duel at 30% health.', flag: 'reborn',
    apply: f => { f.flags.reborn = true },
  },
  {
    id: 'soulsiphon', name: 'Soulbound', desc: 'Heals for 12% of damage dealt.', flag: 'lifesteal',
    apply: f => { f.lifesteal += 0.12 },
  },
]
export const MUTATION_BY_ID = Object.fromEntries(MUTATIONS.map(m => [m.id, m]))

// ───────────────────────────── ENEMY LINEUPS ─────────────────────────────
export const LINEUPS = [
  {
    id: 1, name: 'THE THORNWILD', tagline: 'Fangs of the old green',
    units: [
      { essence: 'falcon',  name: 'Skirl',   title: 'the Quick',       scale: 0.78 },
      { essence: 'wolf',    name: 'Grell',   title: 'the Snapper',     scale: 0.80 },
      { essence: 'bear',    name: 'Ursa',    title: 'the Grey',        scale: 0.76 },
      { essence: 'serpent', name: 'Sethis',  title: 'of the Coil',     scale: 0.82 },
      { essence: 'wraith',  name: 'Morrow',  title: 'the Hollow',      scale: 0.78 },
    ],
  },
  {
    id: 2, name: 'THE ASHFALL CULT', tagline: 'Where the sky remembers fire',
    units: [
      { essence: 'scorpion', name: 'Vex',        title: 'the Needle',    scale: 0.88, mutations: ['keeneye'] },
      { essence: 'phoenix',  name: 'Cinderwing', title: 'Ash-Blessed',   scale: 0.94, mutations: ['emberblood'] },
      { essence: 'dragon',   name: 'Ashmaw',     title: 'the Red Sermon',scale: 0.90, mutations: ['twinhearts'] },
      { essence: 'kraken',   name: 'Deepmother', title: 'of the Sump',   scale: 0.92 },
      { essence: 'mantis',   name: 'Zan',        title: 'the Bladed',    scale: 0.96, mutations: ['swiftfoot'] },
    ],
  },
  {
    id: 3, name: 'THE DROWNED COURT', tagline: 'Every tide has its tithe',
    units: [
      { essence: 'turtle',  name: 'Chelon',     title: 'the Wall',     scale: 1.00, mutations: ['ironheart'] },
      { essence: 'falcon',  name: 'Stormcrest', title: 'of the Ninth',  scale: 1.00, mutations: ['phaseskin'] },
      { essence: 'kraken',  name: 'Kragg',      title: 'the Maw',       scale: 1.04, mutations: ['twinhearts'] },
      { essence: 'serpent', name: 'Sable Coil', title: 'the Whisper',   scale: 1.02, mutations: ['vampiric'] },
      { essence: 'wraith',  name: 'The Choir',  title: 'Hollow-Bound',  scale: 1.00, mutations: ['frostvein'] },
    ],
  },
  {
    id: 4, name: 'THE OBSIDIAN LEGION', tagline: 'Stone does not forgive',
    units: [
      { essence: 'golem',   name: 'Runebreaker',  title: 'the Silent',   scale: 1.10, mutations: ['twinhearts', 'ironheart'] },
      { essence: 'mantis',  name: 'Bladewing',    title: 'Prime',        scale: 1.12, mutations: ['swiftfoot', 'executioner'] },
      { essence: 'dragon',  name: 'Ember Wyrm',   title: 'the Unburied', scale: 1.14, mutations: ['emberblood'] },
      { essence: 'turtle',  name: 'Aegis',        title: 'of the Deep',  scale: 1.12, mutations: ['thornmail', 'aegisborn'] },
      { essence: 'wraith',  name: 'Sovereign',    title: 'of Ash',       scale: 1.10, mutations: ['vampiric', 'phaseskin'] },
    ],
  },
  {
    id: 5, name: 'THE FIRST CHIMERA', tagline: 'It has worn every shape',
    units: [
      { fusion: ['wolf', 'phoenix'],   name: 'Vharos', title: 'the Undying King', scale: 1.30, mutations: ['reborn', 'twinhearts', 'vampiric'], boss: true },
      { fusion: ['falcon', 'mantis'],  name: 'Nyx',    title: 'Thousand Cuts',    scale: 1.32, mutations: ['swiftfoot', 'executioner', 'phaseskin'], boss: true },
      { fusion: ['golem', 'dragon'],   name: 'Korr',   title: 'the Worldbreaker', scale: 1.34, mutations: ['ironheart', 'twinhearts', 'berserker'], boss: true },
      { fusion: ['kraken', 'turtle'],  name: 'Sebek',  title: 'the Drowned Crown',scale: 1.32, mutations: ['regrowth', 'thornmail', 'aegisborn'], boss: true },
      { fusion: ['wraith', 'scorpion'],name: 'Ophira', title: 'the Last Whisper', scale: 1.30, mutations: ['vampiric', 'frostvein', 'soulsiphon'], boss: true },
    ],
  },
]

// ───────────────────────────── BOONS ─────────────────────────────
export const BOONS = [
  { id: 'aether', name: 'Aether Bloom', icon: '◆', tag: 'RESOURCE', desc: 'Gain 2 Aether to reshape your covenant.', apply: s => { s.aether += 2 } },
  { id: 'titan', name: "Titan's Marrow", icon: '⬡', tag: 'VITALITY', desc: 'Your chimeras gain +18% maximum health for the rest of the trial.', apply: s => { s.runMods.hp *= 1.18 } },
  { id: 'feral', name: 'Feral Edge', icon: '⌁', tag: 'POWER', desc: 'Your chimeras gain +15% attack for the rest of the trial.', apply: s => { s.runMods.atk *= 1.15 } },
  { id: 'quick', name: 'Quickened Blood', icon: '⟳', tag: 'TEMPO', desc: 'Your chimeras attack 12% faster for the rest of the trial.', apply: s => { s.runMods.aspd *= 1.12 } },
  { id: 'crit', name: 'Serrated Instinct', icon: '✦', tag: 'PRECISION', desc: 'All chimeras gain +12% critical strike chance.', apply: s => { s.runMods.crit += 12 } },
  { id: 'leech', name: 'Crimson Pact', icon: '◉', tag: 'SUSTAIN', desc: 'All chimeras heal for 10% of damage dealt.', apply: s => { s.runMods.leech += 0.10 } },
  { id: 'shield', name: 'Verdant Pact', icon: '❖', tag: 'WARD', desc: 'Begin every duel with a 20% max-health shield.', apply: s => { s.runMods.shield += 0.20 } },
  { id: 'energy', name: 'Rite of Tides', icon: '≋', tag: 'ARCANA', desc: 'All chimeras gain 20% more ability charge.', apply: s => { s.runMods.energy += 0.20 } },
  { id: 'command', name: 'Drilled Command', icon: '⚑', tag: 'TACTICS', desc: 'Rally, Aegis and Starfall recharge 25% faster.', apply: s => { s.runMods.cdr *= 0.75 } },
  { id: 'starfall', name: 'Starforge', icon: '☄', tag: 'TACTICS', desc: 'Starfall deals 45% more damage.', apply: s => { s.runMods.starfall += 0.45 } },
  { id: 'shift', name: 'Blink Doctrine', icon: '⇄', tag: 'TACTICS', desc: 'Gain +1 Shift charge every battle.', apply: s => { s.runMods.shifts += 1 } },
  { id: 'mutagen', name: 'Mutagenesis', icon: '☣', tag: 'MUTATION', desc: 'Every chimera — present and future — gains one random mutation.', apply: s => { s.runMods.mutations += 1; s.fighters.forEach(f => f && attachRandomMutation(f, s)) } },
  { id: 'evo', name: 'Evolution', icon: '⟡', tag: 'ASCENSION', desc: 'All chimeras gain +10% health, attack and attack speed.', apply: s => { s.runMods.hp *= 1.10; s.runMods.atk *= 1.10; s.runMods.aspd *= 1.10 } },
  { id: 'unbroken', name: 'The Unbroken', icon: '✧', tag: 'VITALITY', desc: 'Max-health shields and healing effects are 25% stronger.', apply: s => { s.runMods.healing += 0.25 } },
]

// Helper used by the mutagen boon (defined here to avoid circular imports).
export function attachRandomMutation(f) {
  const pool = MUTATIONS.filter(m => !f.mutations.includes(m.id))
  if (!pool.length) return null
  const m = pool[Math.floor(Math.random() * pool.length)]
  f.mutations.push(m.id)
  m.apply(f)
  f.maxHp = Math.round(f.maxHp)
  f.hp = f.maxHp
  return m
}

export const STARTING_AETHER = 5
export const MAX_EMBERS = 3
export const TOTAL_ROUNDS = 5
