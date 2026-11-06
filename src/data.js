// ── CHIMERA FRONT · content data ─────────────────────────────────────────────

export const TRAITS = {
  frenzy:  { name: 'Frenzy',  icon: '»', color: '#ff9a5c', desc: 'Attacks 30% faster while below 50% health.' },
  guard:   { name: 'Guard',   icon: '◈', color: '#93c1ff', desc: 'Takes 18% less damage.' },
  swift:   { name: 'Swift',   icon: '↟', color: '#7ff0d8', desc: '+15% movement speed and +8% attack speed.' },
  venom:   { name: 'Venom',   icon: '☣', color: '#b8ef6a', desc: 'Attacks poison for 4s. Stacks up to 3 times.' },
  frost:   { name: 'Frost',   icon: '❄', color: '#9be8ff', desc: 'Attacks slow the target by 25% for 1.6s.' },
  regen:   { name: 'Regen',   icon: '✚', color: '#7beaa6', desc: 'Restores 2% of max health every second.' },
  thorns:  { name: 'Thorns',  icon: '✶', color: '#ffb276', desc: 'Reflects 20% of direct damage taken.' },
  flurry:  { name: 'Flurry',  icon: '⚔', color: '#ffd66e', desc: '22% chance to strike a second time.' },
  burn:    { name: 'Burn',    icon: '♨', color: '#ff8350', desc: 'Attacks ignite the target, burning for 3s.' },
  aegis:   { name: 'Aegis',   icon: '⬡', color: '#a8bcff', desc: 'Enters battle with a shield worth 25% of max health.' },
  leech:   { name: 'Leech',   icon: '◉', color: '#cc93ff', desc: 'Heals for 22% of damage dealt.' },
  execute: { name: 'Execute', icon: '☠', color: '#ff7185', desc: 'Deals 50% more damage to targets below 35% health.' },
  phase:   { name: 'Phase',   icon: '◇', color: '#d0bdff', desc: '15% chance to evade an incoming attack.' },
};

export const ABILITIES = {
  howl:      { name: 'Bloodhowl',   icon: '◉', color: '#ffcf6e', desc: 'All allies gain +28% attack for 6s.' },
  shockwave: { name: 'Shockwave',   icon: '✦', color: '#ffb35e', desc: 'Stun every foe in this lane for 2.2s and deal heavy damage.' },
  dive:      { name: 'Talon Dive',  icon: '➤', color: '#ffe08a', desc: 'Strike the weakest foe for massive damage and slow them.' },
  venomNova: { name: 'Venom Nova',  icon: '☣', color: '#b9f06a', desc: 'Poison all enemies in this lane and both adjacent lanes.' },
  sting:     { name: 'Deathsting',  icon: '✧', color: '#a8ecff', desc: 'Pierce the weakest foe, dealing bonus damage equal to missing health.' },
  mend:      { name: 'Mending Croak', icon: '✚', color: '#7beaa6', desc: 'Heal the three most wounded allies for 24% of their max health.' },
  gore:      { name: 'Gore Charge', icon: '➤', color: '#ffc27a', desc: 'Ram the lane: damage, knockback and stun all foes.' },
  pounce:    { name: 'Shadow Pounce', icon: '↯', color: '#9dffcf', desc: 'Savagely strike a foe and gain +55% attack speed for 4s.' },
  breath:    { name: 'Cinder Breath', icon: '♨', color: '#ff9155', desc: 'Burn every foe in this lane and both adjacent lanes.' },
  fortify:   { name: 'Runeward',    icon: '⬡', color: '#82f0e0', desc: 'Grant a shield worth 26% max health to your lane and adjacent lanes.' },
  drain:     { name: 'Soul Drain',  icon: '◍', color: '#c79bff', desc: 'Tear at the nearest foe and heal from the damage dealt.' },
  reap:      { name: 'Reaper\'s Cut', icon: '⚔', color: '#d5ff8a', desc: 'Three blinding slashes on the weakest foe, with execute bonus.' },
};

const sp = (key, name, role, body, c1, c2, belly, glow, eye, traits, ability, features, blurb, prefix, suffix, hp, atk, interval, range, speed) => ({
  key, name, role, body,
  palette: { c1, c2, belly, glow, eye },
  traits, ability, features, blurb, prefix, suffix,
  stats: { hp, atk, interval, range, speed },
});

export const SPECIES = {
  wolf: sp('wolf', 'Wolf', 'Skirmisher', 'beast',
    '#8fa3c6', '#38445e', '#d5e2f2', '#8fe8ff', '#a8f6ff',
    ['frenzy', 'swift'], 'howl', ['ears', 'mane', 'tail', 'claws'],
    'A tireless pack hunter that grows wilder as the wound deepens.',
    'Grim', 'fang', 150, 22, 0.92, 72, 62),

  bear: sp('bear', 'Bear', 'Bulwark', 'beast',
    '#ad7b54', '#4a2d21', '#e5c4a4', '#ffc98a', '#ffb875',
    ['guard', 'thorns'], 'shockwave', ['ears', 'tusks', 'claws', 'bulk'],
    'A mountain of muscle. Slow to anger, impossible to move.',
    'Ursa', 'hide', 330, 27, 1.5, 68, 30),

  falcon: sp('falcon', 'Falcon', 'Sniper', 'bird',
    '#d8c7a5', '#654c33', '#f7f0e2', '#ffe3a1', '#ffd45e',
    ['swift', 'phase'], 'dive', ['wings', 'beak', 'crest', 'tailfeathers'],
    'Strikes from beyond the reach of claw and steel.',
    'Sky', 'talon', 112, 21, 1.02, 265, 52),

  serpent: sp('serpent', 'Serpent', 'Venomancer', 'serpent',
    '#5fa86b', '#1d4a32', '#cfe8a9', '#a6ff9c', '#d8ff74',
    ['venom', 'leech'], 'venomNova', ['hood', 'fangs', 'tail', 'scales'],
    'Its venom eats through armor, courage, and time.',
    'Venom', 'coil', 136, 17, 1.08, 245, 40),

  scorpion: sp('scorpion', 'Scorpion', 'Executioner', 'insect',
    '#8296bb', '#2b3a58', '#b9c9dd', '#a9e8ff', '#91efff',
    ['frost', 'execute'], 'sting', ['stinger', 'claws', 'plates', 'extraEyes'],
    'A frozen horror that saves its killing blow for the desperate.',
    'Barb', 'sting', 168, 25, 1.22, 78, 44),

  toad: sp('toad', 'Toad', 'Mender', 'amphibian',
    '#7fa85b', '#2b4524', '#d8e4a4', '#c8ff92', '#ffd45e',
    ['regen', 'guard'], 'mend', ['wideEyes', 'spots', 'bulk'],
    'Brews potent salves in its throat. Do not ask from where.',
    'Mire', 'croak', 228, 14, 1.32, 235, 32),

  rhino: sp('rhino', 'Rhino', 'Juggernaut', 'beast',
    '#9c9181', '#3d3831', '#c9bcaa', '#ffd38f', '#ffb05e',
    ['thorns', 'guard'], 'gore', ['horn', 'plates', 'tusks', 'bulk'],
    'City walls have broken themselves against its hide.',
    'Iron', 'horn', 395, 31, 1.78, 74, 26),

  lynx: sp('lynx', 'Lynx', 'Duelist', 'beast',
    '#cba97f', '#583d29', '#f2dec5', '#ffe3a4', '#a2ffcf',
    ['flurry', 'frenzy'], 'pounce', ['tuftEars', 'spots', 'tail', 'claws'],
    'A blur of gold and hunger. Counts its kills in heartbeats.',
    'Nyx', 'claw', 132, 19, 0.78, 74, 68),

  drake: sp('drake', 'Drake', 'Pyromancer', 'dragon',
    '#c65742', '#471c1c', '#eda381', '#ffb35c', '#ffdf6d',
    ['burn', 'frenzy'], 'breath', ['wings', 'horn', 'tail', 'scales', 'spikes'],
    'A lesser dragon with an incurable appetite for ash.',
    'Ember', 'wing', 162, 26, 1.24, 255, 42),

  golem: sp('golem', 'Golem', 'Colossus', 'construct',
    '#6e7b86', '#232b34', '#93a0a8', '#7bf2e2', '#7ff7e6',
    ['aegis', 'thorns'], 'fortify', ['plates', 'runes', 'bulk', 'horn'],
    'Older than the arena. It remembers every stone that fell here.',
    'Rune', 'shell', 425, 29, 1.95, 70, 22),

  wraith: sp('wraith', 'Wraith', 'Revenant', 'spirit',
    '#7d6cb2', '#241d3f', '#b1a0d4', '#bda2ff', '#dcc6ff',
    ['leech', 'phase'], 'drain', ['wings', 'hood', 'tatters', 'scar'],
    'A grudge that refused to die, wrapped in borrowed shadow.',
    'Dusk', 'wraith', 142, 22, 1.05, 250, 48),

  mantis: sp('mantis', 'Mantis', 'Reaper', 'insect',
    '#83a87c', '#253f29', '#b8caa2', '#c9ff9c', '#d6ff62',
    ['execute', 'flurry'], 'reap', ['blades', 'crest', 'extraEyes'],
    'It prays before it kills. The prayer is very short.',
    'Scythe', 'blade', 148, 26, 0.86, 82, 54),
};

export const SPECIES_LIST = Object.values(SPECIES);

export const TIER_NAMES = ['', '', 'Elder', 'Ancient', 'Mythic'];

export const ROWS = ['front', 'back'];
export const LANE_COUNT = 5;
export const ROSTER_MAX = 8;
export const NEXUS_HP = 120;

export function laneName(lane) { return ['I', 'II', 'III', 'IV', 'V'][lane] || String(lane + 1); }

export const WAVES = [
  {
    name: 'The Proving',
    subtitle: 'First blood on the sand',
    desc: 'Two young beasts are sent to test you. Splice your roster before they arrive.',
    enemies: [
      { species: 'wolf', lane: 1, row: 'front' },
      { species: 'falcon', lane: 3, row: 'back' },
    ],
  },
  {
    name: 'Rising Teeth',
    subtitle: 'The pack has found its courage',
    desc: 'Iron in the center, claws on the flank. Watch the venom in the back line.',
    enemies: [
      { species: 'bear', lane: 2, row: 'front' },
      { species: 'lynx', lane: 4, row: 'front' },
      { species: 'serpent', lane: 2, row: 'back' },
    ],
  },
  {
    name: 'Venom & Iron',
    subtitle: 'A warband with a healer',
    desc: 'Their Mirecroak keeps the line alive. Break it before it breaks you.',
    enemies: [
      { species: 'rhino', lane: 0, row: 'front' },
      { species: 'scorpion', lane: 3, row: 'front' },
      { species: 'toad', lane: 1, row: 'back' },
      { species: 'falcon', lane: 3, row: 'back' },
    ],
  },
  {
    name: 'The Warden',
    subtitle: 'BOSS · Rune-fed and enormous',
    desc: 'A rune colossus holds the center. Its wards shield the flanks. Spread your damage.',
    boss: true,
    enemies: [
      { species: 'golem', secondary: 'bear', tier: 2, lane: 2, row: 'front', name: 'The Warden' },
      { species: 'lynx', lane: 0, row: 'front' },
      { species: 'wraith', lane: 1, row: 'back' },
      { species: 'drake', lane: 3, row: 'back' },
      { species: 'toad', lane: 2, row: 'back' },
    ],
  },
  {
    name: 'The Swarm',
    subtitle: 'Too many legs to count',
    desc: 'Scythe insects rush the outer lanes. Their casters punish crowded back lines.',
    enemies: [
      { species: 'mantis', lane: 0, row: 'front' },
      { species: 'scorpion', lane: 2, row: 'front' },
      { species: 'mantis', lane: 4, row: 'front' },
      { species: 'serpent', lane: 1, row: 'back' },
      { species: 'drake', lane: 3, row: 'back' },
      { species: 'toad', lane: 4, row: 'back' },
    ],
  },
  {
    name: 'Ashfall',
    subtitle: 'The sky itself is on fire',
    desc: 'Winged raiders and a living rampart. Frost or focus fire will cool them.',
    enemies: [
      { species: 'rhino', secondary: 'lynx', tier: 2, lane: 3, row: 'front' },
      { species: 'scorpion', lane: 1, row: 'front' },
      { species: 'lynx', lane: 4, row: 'front' },
      { species: 'drake', secondary: 'serpent', tier: 2, lane: 1, row: 'back' },
      { species: 'wraith', lane: 0, row: 'back' },
      { species: 'falcon', lane: 2, row: 'back' },
    ],
  },
  {
    name: 'The Gauntlet',
    subtitle: 'Every beast they have left',
    desc: 'Their elites are spliced. Yours should be too.',
    enemies: [
      { species: 'bear', secondary: 'mantis', tier: 2, lane: 0, row: 'front' },
      { species: 'scorpion', secondary: 'serpent', tier: 2, lane: 1, row: 'front' },
      { species: 'golem', secondary: 'rhino', tier: 2, lane: 2, row: 'front' },
      { species: 'mantis', secondary: 'lynx', tier: 2, lane: 4, row: 'front' },
      { species: 'serpent', secondary: 'falcon', tier: 2, lane: 2, row: 'back' },
      { species: 'drake', secondary: 'serpent', tier: 2, lane: 1, row: 'back' },
      { species: 'wraith', secondary: 'toad', tier: 2, lane: 3, row: 'back' },
    ],
  },
  {
    name: 'The Hollow King',
    subtitle: 'BOSS · The arena’s oldest hunger',
    desc: 'The Hollow King wears a colossus like a crown. End the rite.',
    boss: true,
    enemies: [
      { species: 'golem', secondary: 'rhino', tier: 3, lane: 2, row: 'front', name: 'The Hollow King' },
      { species: 'mantis', secondary: 'scorpion', tier: 2, lane: 0, row: 'front' },
      { species: 'rhino', secondary: 'bear', tier: 2, lane: 4, row: 'front' },
      { species: 'serpent', secondary: 'wraith', tier: 2, lane: 1, row: 'front' },
      { species: 'wraith', secondary: 'serpent', tier: 2, lane: 1, row: 'back' },
      { species: 'drake', secondary: 'falcon', tier: 2, lane: 3, row: 'back' },
      { species: 'toad', secondary: 'golem', tier: 2, lane: 4, row: 'back' },
    ],
  },
];

// Enemy stat multiplier per wave (index 0 = wave 1).
export const WAVE_SCALE = [0.75, 0.8, 0.86, 0.92, 0.98, 1.02, 1.06, 1.1];

export const WAVE_REWARDS = [14, 16, 18, 24, 22, 24, 26, 32];

export function waveData(wave) {
  if (wave <= WAVES.length) {
    return { ...WAVES[wave - 1], index: wave, scale: WAVE_SCALE[wave - 1], reward: WAVE_REWARDS[wave - 1] ?? 12 };
  }
  // Endless waves: generated from the boss template with rising scale.
  const n = wave - WAVES.length;
  const pool = ['wolf', 'bear', 'falcon', 'serpent', 'scorpion', 'toad', 'rhino', 'lynx', 'drake', 'golem', 'wraith', 'mantis'];
  const enemies = [];
  const count = Math.min(8, 5 + Math.floor(n / 2));
  for (let i = 0; i < count; i++) {
    const primary = pool[(wave * 3 + i * 5) % pool.length];
    const secondary = pool[(wave * 7 + i * 3 + 2) % pool.length];
    enemies.push({
      species: primary,
      secondary: i % 2 === 0 ? secondary : undefined,
      tier: Math.min(4, 2 + Math.floor((n + i) / 3)),
      lane: (i * 3 + wave) % 5,
      row: i % 2 === 0 ? 'front' : 'back',
    });
  }
  return {
    name: `Endless Rite ${n}`,
    subtitle: 'The gate hungers still',
    desc: 'The arena resets, but the beasts grow stranger.',
    enemies,
    scale: 1.55 + n * 0.12,
    reward: 18,
    index: wave,
    heroic: true,
  };
}

export const STARTING_ROSTER = ['wolf', 'bear', 'falcon', 'serpent'];
export const START_ESSENCE = 16;
export const SPLICE_BASE_COST = 4;
export const SHOP_REROLL_COST = 2;
