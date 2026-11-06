// ── CHIMERA FRONT · application ─────────────────────────────────────────────
import {
  SPECIES, TRAITS, ABILITIES, WAVES, waveData, ROSTER_MAX, STARTING_ROSTER,
  START_ESSENCE, NEXUS_HP, TIER_NAMES, laneName,
} from './data.js';
import {
  makeBaseUnit, makeEnemyUnit, buildArt, previewSplice, applySplice, spliceCost,
  uniqueName, resetIds, traitList, statTags, speciesLine, combatPower,
} from './units.js';
import { createBattle, stepBattle, drainEvents, castAbility, autoCastIn } from './battle.js';
import { ArenaView, renderTitle } from './scene.js';
import { drawPortrait, drawCreature } from './art.js';
import { Sound } from './audio.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const roman = (n) => ROMAN[n] || String(n);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const arena = new ArenaView($('#arena'));
const sound = new Sound();

const S = {
  screen: 'title',
  phase: 'prep',
  wave: 1,
  essence: START_ESSENCE,
  roster: [],
  slots: {},
  selectedId: null,
  hover: null,
  shop: [],
  enemyPreview: [],
  battle: null,
  resultShown: false,
  resultTimer: null,
  speed: 1,
  battleLog: [],
  stats: { splices: 0, kills: 0 },
  best: Number(localStorage.getItem('chimera-front-best') || 0),
  lastEssence: START_ESSENCE,
  chipEls: [],
  abilityUnits: [],
  modal: null,
  spliceSel: [null, null],
  bannerTimer: null,
  lastNoChargeToast: 0,
  flashBanner: null,
  muted: sound.muted,
};

const els = {
  app: $('#app'),
  title: $('#titleScreen'),
  titleCanvas: $('#titleCanvas'),
  canvas: $('#arena'),
  shell: $('#arenaShell'),
  sidebar: $('#sidebar'),
  dockHead: $('#dockHead'),
  dockBody: $('#dockBody'),
  waveProgress: $('#waveProgress'),
  essenceVal: $('#essenceVal'),
  essencePill: $('#essencePill'),
  nexusYouFill: $('#nexusYouFill'),
  nexusFoeFill: $('#nexusFoeFill'),
  nexusYouVal: $('#nexusYouVal'),
  nexusFoeVal: $('#nexusFoeVal'),
  nexusPair: $('#nexusPair'),
  banner: $('#phaseBanner'),
  hint: $('#arenaHint'),
  timer: $('#battleTimer'),
  timerVal: $('#battleTimerVal'),
  speed: $('#speedControls'),
  modalRoot: $('#modalRoot'),
  toasts: $('#toasts'),
  tooltip: $('#tooltip'),
  soundBtn: $('#soundBtn'),
  bestTitle: $('#bestWaveTitle'),
  helpBtn: $('#helpBtn'),
};

// ══ TITLE ═══════════════════════════════════════════════════════════════════
function buildTitleUnits() {
  const specs = [
    ['wolf', 'bear', 3, 'Ancient Grimhide'],
    ['drake', 'falcon', 4, 'Mythic Embertalon'],
    ['serpent', 'mantis', 3, 'Ancient Venomblade'],
  ];
  return specs.map(([a, b, tier, name]) => {
    const u = makeBaseUnit(a, { secondary: b, tier });
    u.name = name;
    u.art = buildArt(a, b, tier);
    return u;
  });
}
let titleUnits = buildTitleUnits();

function renderTitleBest() {
  els.bestTitle.textContent = S.best > 0 ? roman(S.best) : '—';
}

// ══ STATE HELPERS ═══════════════════════════════════════════════════════════
function newRoster() {
  resetIds();
  const roster = [];
  for (const key of STARTING_ROSTER) {
    const u = makeBaseUnit(key);
    u.name = uniqueName(u.name, roster);
    roster.push(u);
  }
  return roster;
}

function rollShop(wave) {
  const keys = Object.keys(SPECIES);
  const picked = [];
  while (picked.length < 3) {
    const k = keys[Math.floor(Math.random() * keys.length)];
    if (!picked.includes(k)) picked.push(k);
  }
  const cost = 5 + Math.ceil(wave / 2);
  return picked.map((species) => ({ species, cost, sold: false }));
}

function buildEnemyPreview(wave) {
  const wd = waveData(wave);
  return (wd.enemies || []).map((e) => ({ unit: makeEnemyUnit(e, wave), lane: e.lane, row: e.row }));
}

function startRun() {
  sound.init();
  sound.ui();
  S.screen = 'run';
  S.phase = 'prep';
  S.wave = 1;
  S.essence = START_ESSENCE;
  S.roster = newRoster();
  S.slots = {};
  S.selectedId = null;
  S.hover = null;
  S.battle = null;
  S.resultShown = false;
  S.speed = 1;
  S.battleLog = [];
  S.stats = { splices: 0, kills: 0 };
  S.chipEls = [];
  S.abilityUnits = [];
  S.shop = rollShop(1);
  S.enemyPreview = buildEnemyPreview(1);
  S.lastEssence = S.essence;
  els.title.classList.add('hidden');
  els.app.setAttribute('aria-hidden', 'false');
  closeModal();
  refreshAll();
  showBanner(`WAVE ${roman(1)} · ${waveData(1).name.toUpperCase()}`, 'DEPLOY YOUR BEASTS', '');
}

function returnToTitle() {
  if (S.resultTimer) clearTimeout(S.resultTimer);
  S.screen = 'title';
  S.phase = 'prep';
  S.battle = null;
  S.roster = [];
  S.slots = {};
  S.abilityUnits = [];
  S.chipEls = [];
  closeModal();
  els.app.setAttribute('aria-hidden', 'true');
  els.title.classList.remove('hidden');
  renderTitleBest();
  titleUnits = buildTitleUnits();
  hideOverlays();
}

function refreshAll() {
  if (S.screen !== 'run') return;
  arena.resize();
  renderTopbar();
  renderSidebar();
  renderDock();
  updateOverlays();
  updateNexusBars();
  updateArenaHint();
}

// ══ TOP BAR ═════════════════════════════════════════════════════════════════
function renderTopbar() {
  const total = WAVES.length;
  const endless = S.wave > total;
  const pips = [];
  for (let i = 1; i <= Math.max(total, 8); i++) {
    const boss = !!(WAVES[i - 1] && WAVES[i - 1].boss);
    const cls = [`wp-pip`];
    if (i < S.wave || (endless && i <= total)) cls.push('done');
    if (i === S.wave) cls.push('current');
    if (boss) cls.push('boss');
    pips.push(`<span class="${cls.join(' ')}" title="Wave ${i}${boss ? ' · Boss' : ''}"></span>`);
  }
  els.waveProgress.innerHTML = `
    <span class="wp-label">WAVE <b>${endless ? '∞' : roman(S.wave)}</b> / ${total}</span>
    <span class="wp-pips">${pips.join('')}</span>
    ${endless ? `<span class="wp-label">ENDLESS +${S.wave - total}</span>` : ''}
  `;
  els.essenceVal.textContent = S.essence;
  if (S.essence !== S.lastEssence) {
    els.essenceVal.classList.remove('pop');
    void els.essenceVal.offsetWidth;
    els.essenceVal.classList.add('pop');
    S.lastEssence = S.essence;
  }
  els.nexusPair.style.opacity = S.screen === 'run' ? 1 : 0;
}

function updateNexusBars() {
  const b = S.battle;
  const you = b ? b.playerNexus : NEXUS_HP;
  const foe = b ? b.enemyNexus : NEXUS_HP;
  els.nexusYouFill.style.width = `${(you / NEXUS_HP) * 100}%`;
  els.nexusFoeFill.style.width = `${(foe / NEXUS_HP) * 100}%`;
  els.nexusYouVal.textContent = Math.ceil(you);
  els.nexusFoeVal.textContent = Math.ceil(foe);
}

// ══ SIDEBAR · PREP ══════════════════════════════════════════════════════════
function enemyRow(e) {
  const u = e.unit;
  const sp = SPECIES[u.primary];
  const traits = traitList(u).slice(0, 3).map((t) =>
    `<span class="mini-trait" style="--tc:${t.color}" data-tip="${esc(t.desc)}" data-tip-title="${esc(t.icon + ' ' + t.name)}">${t.icon}</span>`).join('');
  const tier = Array.from({ length: u.tier }, () => '<i class="tier-dot"></i>').join('');
  return `<div class="enemy-row">
    <span class="lane-badge">${laneName(e.lane)}</span>
    <div class="er-main">
      <div class="er-name">${esc(u.name)}</div>
      <div class="er-meta"><span>${e.row.toUpperCase()}</span><span>·</span><span>${esc(sp.name)}${u.secondary ? ' / ' + esc(SPECIES[u.secondary].name) : ''}</span><span class="tier-dots">${tier}</span></div>
    </div>
    <div class="er-traits">${traits}</div>
  </div>`;
}

function renderPrepSidebar() {
  const wd = waveData(S.wave);
  const isBoss = !!wd.boss;
  const endless = S.wave > WAVES.length;
  const enrolled = S.roster.length;
  const deployed = Object.values(S.slots).filter(Boolean).length;
  const bossTag = isBoss ? `<span class="boss-tag">◆ BOSS ENCOUNTER</span>` : '';
  const offers = S.shop.map((o, i) => {
    const sp = SPECIES[o.species];
    const traits = sp.traits.map((t) => `<span class="mini-trait" style="--tc:${TRAITS[t].color}" data-tip="${esc(TRAITS[t].desc)}" data-tip-title="${esc(TRAITS[t].icon + ' ' + TRAITS[t].name)}">${TRAITS[t].icon}</span>`).join('');
    const disabled = o.sold || S.roster.length >= ROSTER_MAX || S.essence < o.cost;
    return `<div class="shop-card ${o.sold ? 'sold' : ''}">
      <canvas data-shop-portrait="${i}" width="38" height="38"></canvas>
      <div class="sc-main">
        <div class="sc-name">${esc(sp.name)}</div>
        <div class="sc-meta">${esc(sp.role)} · ${sp.stats.range >= 150 ? 'RANGED' : 'MELEE'}</div>
        <div class="sc-traits">${traits}</div>
      </div>
      <button class="buy-btn" data-action="buy" data-index="${i}" ${disabled ? 'disabled' : ''} title="${o.sold ? 'Already purchased' : S.roster.length >= ROSTER_MAX ? 'Roster full' : `Recruit ${sp.name}`}">
        ${o.sold ? 'ADDED' : `<span class="gem"></span>${o.cost}`}
      </button>
    </div>`;
  }).join('');

  const recruitHint = S.roster.length >= ROSTER_MAX
    ? 'Your roster is full. Splice two beasts into one to make room.'
    : S.essence < 5 ? 'Spend essence on recruits, or splice what you already own.'
      : 'Recruits arrive at Tier I. Splice them to unlock higher tiers.';

  const tip = S.wave === 1
    ? '<b>Start here:</b> pick a beast from the roster below, then click a glowing rune in a lane. Melee beasts belong in FRONT, casters and healers in BACK. Then splice two beasts to create something new.'
    : `<b>Tactics:</b> ranged beasts cover adjacent lanes. A lane with no defender will breach your nexus. ${wd.boss ? 'The boss is enormously tough — stack one lane and focus it down.' : 'Match your tanks against their damage.'}`;

  els.sidebar.innerHTML = `
    <section class="panel ${isBoss ? 'boss-panel' : ''}">
      <div class="eyebrow"><span>WAVE <b>${endless ? '∞' : roman(S.wave)}</b> / ${WAVES.length}</span><span class="dot"></span><span>${isBoss ? 'BOSS' : endless ? 'ENDLESS' : 'TRIAL'}</span></div>
      <h2 class="wave-name">${esc(wd.name)}</h2>
      <div class="wave-sub">${esc(wd.subtitle)}</div>
      <p class="wave-desc">${esc(wd.desc)}</p>
      ${bossTag}
      <div class="intel-head">ENEMY LINEUP <span>${wd.enemies.length} BEASTS · ${wd.boss ? 'DANGER' : 'SCOUTED'}</span></div>
      <div class="enemy-list">${S.enemyPreview.map(enemyRow).join('')}</div>
    </section>

    <section class="panel shop-panel">
      <div class="shop-head"><div class="shop-title">THE BLACK MARKET</div><small>RECRUIT · COST ${5 + Math.ceil(S.wave / 2)} ◆</small></div>
      <div class="shop-offers">${offers}</div>
      <div class="shop-foot">
        <button class="reroll-btn" data-action="reroll" ${S.essence < 2 ? 'disabled' : ''}>↻ REROLL OFFERS · 2 ◆</button>
        <small>${recruitHint.split('.')[0]}.</small>
      </div>
    </section>

    <div class="deploy-count"><span>DEPLOYED</span><b>${deployed} / 8</b></div>
    <div class="tip-box">${tip}</div>
    <button class="btn btn-gold battle-btn" data-action="battle" ${deployed === 0 ? 'disabled' : ''}>
      BEGIN BATTLE <span class="kbd">SPACE</span>
    </button>
  `;
  drawSidebarPortraits();
  updateEssenceButtons();
}

function drawSidebarPortraits() {
  els.sidebar.querySelectorAll('[data-shop-portrait]').forEach((c) => {
    const i = Number(c.dataset.shopPortrait);
    const offer = S.shop[i];
    if (!offer) return;
    const art = buildArt(offer.species, null, 1);
    drawPortrait(c, { art }, 38);
  });
}

function updateEssenceButtons() {
  els.sidebar.querySelectorAll('[data-action="buy"]').forEach((btn) => {
    const i = Number(btn.dataset.index);
    const offer = S.shop[i];
    if (!offer) return;
    btn.disabled = offer.sold || S.roster.length >= ROSTER_MAX || S.essence < offer.cost;
  });
}

// ══ SIDEBAR · BATTLE ════════════════════════════════════════════════════════
function renderBattleSidebar() {
  const wd = S.battle ? S.battle.waveData : waveData(S.wave);
  els.sidebar.innerHTML = `
    <section class="panel battle-side">
      <div class="bs-header">
        <span class="bs-wave">${esc(wd.name)}</span>
        <span class="bs-timer" id="bsTimer">0:60</span>
      </div>
      <div class="battle-stats">
        <div class="bstat"><small>WAVE</small><b>${S.wave > WAVES.length ? '∞' : roman(S.wave)}</b></div>
        <div class="bstat"><small>YOUR NEXUS</small><b id="bstatYou">${NEXUS_HP}</b></div>
        <div class="bstat"><small>FOE NEXUS</small><b id="bstatFoe">${NEXUS_HP}</b></div>
      </div>
      <div class="auto-note"><b>COMMAND:</b> abilities charge automatically. Click a ready beast in the command deck — or press its number — to fire it early. Unused abilities auto-cast after 6 seconds.</div>
      <div class="panel log-panel">
        <div class="log-title">BATTLE FEED <span>LIVE</span></div>
        <div class="log-list" id="logList"></div>
      </div>
      <div class="tip-box"><b>Tip:</b> break a lane to send your beast into their nexus. Ranged beasts cover adjacent lanes — position them behind a wall.</div>
    </section>
  `;
  renderLog();
}

function pushLog(text, tone = '', icon = '•') {
  S.battleLog.push({ text, tone, icon });
  if (S.battleLog.length > 40) S.battleLog.shift();
  renderLog();
}

function renderLog() {
  const list = $('#logList');
  if (!list) return;
  list.innerHTML = S.battleLog.map((l) =>
    `<div class="log-line ${l.tone}"><i>${l.icon}</i><span>${l.text}</span></div>`).join('');
}

// ══ DOCK · ROSTER ═══════════════════════════════════════════════════════════
function slotLabelFor(unitId) {
  for (const [key, id] of Object.entries(S.slots)) {
    if (id === unitId) {
      const [lane, row] = key.split('-');
      return `${laneName(Number(lane))} · ${row.toUpperCase()[0]}`;
    }
  }
  return null;
}

function unitTip(u) {
  const t = traitList(u).map((x) => `${x.name}: ${x.desc}`).join(' ');
  const ab = ABILITIES[u.ability];
  return `${speciesLine(u)} · Tier ${u.tier} ${u.role}. HP ${u.stats.hp} · ATK ${u.stats.atk} · SPD ${u.stats.interval}s · ${statTags(u).range}. ${t} Ability — ${ab.name}: ${ab.desc}`;
}

function traitMiniHtml(u) {
  return traitList(u).map((t) =>
    `<span class="mini-trait" style="--tc:${t.color}" data-tip="${esc(t.desc)}" data-tip-title="${esc(t.icon + ' ' + t.name)}">${t.icon}</span>`).join('');
}

function renderRosterDock() {
  const deployedCount = Object.values(S.slots).filter(Boolean).length;
  els.dockHead.innerHTML = `
    <div class="dock-title">
      <h3>YOUR ROSTER</h3>
      <span class="count"><b>${S.roster.length}</b> / ${ROSTER_MAX}</span>
      <span class="dock-tip">Click a beast, then a glowing rune. Click a placed beast again to recall.</span>
    </div>
    <div class="dock-actions">
      <button class="btn btn-sm btn-splice" data-action="open-splice" ${S.roster.length < 2 ? 'disabled' : ''}>◆ SPLICE BEASTS</button>
      <button class="btn btn-sm btn-primary" data-action="battle" ${deployedCount === 0 ? 'disabled' : ''}>BATTLE <span class="kbd">␣</span></button>
    </div>
  `;

  if (!S.roster.length) {
    els.dockBody.innerHTML = '<div class="empty-note">Your roster is empty.</div>';
    return;
  }
  els.dockBody.innerHTML = S.roster.map((u) => {
    const slot = slotLabelFor(u.id);
    const sel = S.selectedId === u.id;
    return `<button class="unit-card ${sel ? 'selected' : ''} ${slot ? 'deployed' : ''}" data-uid="${u.id}" data-tier="${u.tier}" data-tip="${esc(unitTip(u))}" data-tip-title="${esc(u.name + ' · ' + speciesLine(u))}">
      <div class="uc-top">
        <span class="uc-tier">${'<i></i>'.repeat(u.tier)}</span>
        <span class="uc-deploy">${slot || ''}</span>
      </div>
      <canvas class="uc-art" data-portrait="${u.id}"></canvas>
      <div class="uc-name">${esc(u.name)}</div>
      <div class="uc-line">${esc(speciesLine(u))}</div>
      <div class="uc-traits">${traitMiniHtml(u)}</div>
      <div class="uc-bottom">
        <span class="uc-stat">HP <b>${u.stats.hp}</b></span>
        <span class="uc-stat">ATK <b>${u.stats.atk}</b></span>
      </div>
    </button>`;
  }).join('');
  els.dockBody.querySelectorAll('[data-portrait]').forEach((c) => {
    const u = S.roster.find((x) => x.id === c.dataset.portrait);
    if (u) drawPortrait(c, u, 58);
  });
}

// ══ DOCK · BATTLE COMMAND ══════════════════════════════════════════════════
function renderBattleDock() {
  S.abilityUnits = S.battle ? S.battle.units.filter((u) => u.side === 'player') : [];
  els.dockHead.innerHTML = `
    <div class="dock-title">
      <h3>COMMAND DECK</h3>
      <span class="count"><b>${S.abilityUnits.length}</b> BEASTS DEPLOYED</span>
      <span class="dock-tip">Press 1–8 or click a charged beast. Abilities fire automatically after 6s if unused.</span>
    </div>
    <div class="dock-actions">
      <span class="count" id="battleKills">0 SLAIN</span>
    </div>
  `;
  if (!S.abilityUnits.length) {
    els.dockBody.innerHTML = '<div class="empty-note">No beasts deployed.</div>';
    S.chipEls = [];
    return;
  }
  els.dockBody.innerHTML = S.abilityUnits.map((u, i) => {
    const ab = ABILITIES[u.ability];
    return `<button class="ability-chip" data-uid="${u.ref.id}" data-index="${i}">
      <span class="ac-key">${i + 1}</span>
      <span class="ac-lane">${laneName(u.lane)} · ${u.row[0].toUpperCase()}</span>
      <canvas data-chip-portrait="${u.ref.id}"></canvas>
      <span class="ac-name">${esc(u.name)}</span>
      <span class="ac-skill">${esc(ab.name)}</span>
      <span class="ac-charge"><i></i></span>
      <span class="ac-state">0%</span>
    </button>`;
  }).join('');
  S.chipEls = S.abilityUnits.map((u, i) => {
    const root = els.dockBody.querySelector(`[data-index="${i}"]`);
    return {
      u,
      root,
      fill: root ? root.querySelector('.ac-charge i') : null,
      state: root ? root.querySelector('.ac-state') : null,
    };
  });
  els.dockBody.querySelectorAll('[data-chip-portrait]').forEach((c) => {
    const u = S.abilityUnits.find((x) => x.ref.id === c.dataset.chipPortrait);
    if (u) drawPortrait(c, u.ref, 54);
  });
}

function updateBattleDock() {
  if (!S.battle) return;
  let ready = 0;
  for (const chip of S.chipEls) {
    const u = chip.u;
    if (!u || !chip.root) continue;
    const charged = u.energy >= 100;
    const alive = u.alive;
    if (alive) chip.fill.style.width = `${Math.min(100, u.energy)}%`;
    chip.root.classList.toggle('ready', alive && charged);
    chip.root.classList.toggle('dead', !alive);
    chip.root.classList.toggle('stunned', alive && u.status.stunUntil > S.battle.time);
    let txt;
    if (!alive) txt = 'SLAIN';
    else if (u.status.stunUntil > S.battle.time) txt = 'STUNNED';
    else if (charged) {
      const auto = autoCastIn(S.battle, u);
      txt = auto != null && auto > 0 ? `AUTO ${Math.ceil(auto)}s` : 'READY';
      if (alive) ready++;
    } else txt = `${Math.floor(u.energy)}%`;
    if (chip.state.textContent !== txt) chip.state.textContent = txt;
  }
  const killEl = $('#battleKills');
  if (killEl) {
    const kills = S.battle.units.filter((u) => u.side === 'enemy' && !u.alive).length;
    killEl.textContent = `${kills} SLAIN`;
  }
  const el = $('#bsTimer');
  if (el) {
    const left = Math.max(0, S.battle.duration - S.battle.time);
    el.textContent = `0:${String(Math.ceil(left)).padStart(2, '0')}`;
  }
  const y = $('#bstatYou'); if (y) y.textContent = Math.ceil(S.battle.playerNexus);
  const f = $('#bstatFoe'); if (f) f.textContent = Math.ceil(S.battle.enemyNexus);
}

// ══ OVERLAYS ════════════════════════════════════════════════════════════════
function updateOverlays() {
  const battle = S.phase === 'battle' || S.phase === 'result';
  els.timer.classList.toggle('show', battle);
  els.speed.classList.toggle('show', battle);
  els.speed.querySelectorAll('.speed-btn').forEach((b) => b.classList.toggle('active', Number(b.dataset.speed) === S.speed));
  if (battle && S.battle) {
    const left = Math.max(0, S.battle.duration - S.battle.time);
    els.timerVal.textContent = `0:${String(Math.ceil(left)).padStart(2, '0')}`;
  } else {
    els.timerVal.textContent = '1:00';
  }
}

function updateArenaHint() {
  let html = '';
  if (S.phase === 'prep') {
    html = '<b>Select a beast</b> below, then click a glowing rune to deploy. Click a placed beast twice to recall.';
  } else if (S.phase === 'battle') {
    html = '<b>Command:</b> click a glowing beast or press its number to cast early. Abilities auto-fire after 6s.';
  }
  els.hint.innerHTML = html;
  els.hint.classList.toggle('show', !!html && S.screen === 'run');
}

function showBanner(main, sub = '', tone = '', ms = 2500) {
  if (S.bannerTimer) clearTimeout(S.bannerTimer);
  els.banner.className = `phase-banner show ${tone}`;
  els.banner.innerHTML = `${esc(main)}${sub ? `<small>${esc(sub)}</small>` : ''}`;
  S.bannerTimer = setTimeout(() => { els.banner.classList.remove('show'); }, ms);
}

function hideOverlays() {
  if (S.bannerTimer) clearTimeout(S.bannerTimer);
  els.banner.classList.remove('show');
  els.hint.classList.remove('show');
  els.timer.classList.remove('show');
  els.speed.classList.remove('show');
}

function toast(text, tone = '') {
  const div = document.createElement('div');
  div.className = `toast ${tone}`;
  div.textContent = text;
  els.toasts.appendChild(div);
  setTimeout(() => div.remove(), 2900);
}

// ══ RENDER DISPATCH ═════════════════════════════════════════════════════════
function renderSidebar() {
  if (S.phase === 'prep') renderPrepSidebar();
  else if (S.phase === 'battle' || S.phase === 'result') renderBattleSidebar();
}

function renderDock() {
  if (S.phase === 'prep') renderRosterDock();
  else if (S.phase === 'battle' || S.phase === 'result') renderBattleDock();
}

function arenaState() {
  return {
    mode: S.phase === 'prep' ? 'prep' : 'battle',
    roster: S.roster,
    slots: S.slots,
    selectedId: S.selectedId,
    hover: S.hover,
    enemies: S.enemyPreview,
    battle: S.battle,
  };
}

// ══ SHOP / DEPLOY ═══════════════════════════════════════════════════════════
function buyOffer(index) {
  const offer = S.shop[index];
  if (!offer || offer.sold) return;
  if (S.roster.length >= ROSTER_MAX) { toast('Roster full — splice two beasts to make room', 'error'); sound.error(); return; }
  if (S.essence < offer.cost) { toast('Not enough essence', 'error'); sound.error(); return; }
  const u = makeBaseUnit(offer.species);
  u.name = uniqueName(u.name, S.roster);
  S.roster.push(u);
  S.essence -= offer.cost;
  offer.sold = true;
  S.lastEssence = S.essence + offer.cost;
  sound.buy();
  toast(`${u.name} joins the roster`, 'good');
  refreshAll();
}

function rerollShop() {
  if (S.essence < 2) { toast('Not enough essence to reroll', 'error'); sound.error(); return; }
  S.essence -= 2;
  S.lastEssence = S.essence + 2;
  S.shop = rollShop(S.wave);
  sound.ui();
  refreshAll();
}

function deployUnit(id, key) {
  const unit = S.roster.find((u) => u.id === id);
  if (!unit) return;
  let fromKey = null;
  for (const [k, v] of Object.entries(S.slots)) if (v === id) { fromKey = k; break; }
  const occupant = S.slots[key];
  if (fromKey === key) return;
  if (occupant && occupant !== id) {
    if (fromKey) S.slots[fromKey] = occupant;
    else delete S.slots[fromKey];
  } else if (fromKey) {
    delete S.slots[fromKey];
  }
  S.slots[key] = id;
  sound.deploy();
  refreshAll();
}

function recallUnit(key) {
  const id = S.slots[key];
  if (!id) return;
  const u = S.roster.find((x) => x.id === id);
  delete S.slots[key];
  sound.ui();
  if (u) toast(`${u.name} recalled`);
  refreshAll();
}

function handleSlotClick(pick) {
  const key = pick.key;
  const occupant = S.slots[key];
  if (S.selectedId) {
    if (occupant === S.selectedId) recallUnit(key);
    else deployUnit(S.selectedId, key);
    return;
  }
  if (occupant) {
    S.selectedId = occupant;
    sound.select();
    refreshAll();
    const u = S.roster.find((x) => x.id === occupant);
    if (u) toast(`${u.name} selected — click a rune to move, click again to recall`);
    return;
  }
  toast('Select a beast from your roster first', 'error');
  sound.error();
}

function selectBench(id) {
  if (S.phase !== 'prep') return;
  if (S.selectedId === id) {
    S.selectedId = null;
    sound.ui();
  } else {
    S.selectedId = id;
    sound.select();
  }
  renderDock();
  renderPrepSidebar();
}

// ══ BATTLE ══════════════════════════════════════════════════════════════════
function startBattle() {
  if (S.phase !== 'prep') return;
  const deployed = Object.values(S.slots).filter(Boolean).length;
  if (deployed === 0) { toast('Deploy at least one beast first', 'error'); sound.error(); return; }
  S.phase = 'battle';
  S.resultShown = false;
  S.battleLog = [];
  S.selectedId = null;
  S.hover = null;
  S.speed = 1;
  S.battle = createBattle({ roster: S.roster, slots: S.slots, wave: S.wave });
  arena.resetFx();
  arena.resize();
  renderSidebar();
  renderDock();
  updateOverlays();
  updateArenaHint();
  pushLog(`The gate opens. ${S.abilityUnits.length} beasts answer the call.`, '', '◈');
  showBanner('BATTLE', `WAVE ${roman(S.wave)} · BREAK THE ENEMY NEXUS`, 'foe', 2200);
  sound.battleStart();
  S.lastNoChargeToast = 0;
}

function tryCast(unit, opts = {}) {
  if (!S.battle || S.phase !== 'battle' || S.battle.over) return;
  if (!unit || unit.side !== 'player' || !unit.alive) return;
  if (unit.energy < 100) {
    const now = performance.now();
    if (!opts.silent && now - S.lastNoChargeToast > 900) {
      S.lastNoChargeToast = now;
      toast(`${unit.name} is still charging (${Math.floor(unit.energy)}%)`);
    }
    return;
  }
  const ok = castAbility(S.battle, unit);
  if (ok) {
    const ab = ABILITIES[unit.ability];
    pushLog(`<b>${esc(unit.name)}</b> unleashes ${esc(ab.name)}.`, 'cast', '✦');
    updateBattleDock();
  }
}

function castByIndex(i) {
  if (!S.abilityUnits[i]) return;
  tryCast(S.abilityUnits[i]);
}

function handleBattleEvents(events) {
  let needsResult = false;
  for (const e of events) {
    switch (e.type) {
      case 'hit':
        sound.hit();
        if (e.crit) sound.heavy();
        break;
      case 'slash': sound.hit(); break;
      case 'shot': sound.shot(); break;
      case 'cast': {
        sound.cast();
        const ab = ABILITIES[e.ability];
        if (e.side === 'enemy') {
          pushLog(`<b>${esc(e.name || 'Enemy')}</b> casts ${esc(ab.name)}.`, 'cast', '✦');
        }
        break;
      }
      case 'death': {
        sound.death();
        if (e.side === 'enemy') {
          S.stats.kills++;
          if (e.tier >= 3) toast(`${e.name} has fallen`, 'epic');
        }
        if (e.side === 'player') pushLog(`<b>${esc(e.name)}</b> is slain.`, 'death', '✕');
        else pushLog(`<b>${esc(e.name)}</b> falls.`, 'death', '✕');
        break;
      }
      case 'laneBreak': {
        if (e.side === 'player') {
          sound.alarm();
          showBanner(`LANE ${laneName(e.lane)} BREACHED`, 'YOUR BEAST IS STRIKING THE ENEMY NEXUS', 'gold', 1800);
          pushLog(`Lane ${laneName(e.lane)} breached — enemy nexus under attack!`, 'breach', '⚡');
        } else {
          sound.alarm();
          showBanner(`LANE ${laneName(e.lane)} LOST`, 'THE ENEMY IS STRIKING YOUR NEXUS', 'foe', 1800);
          pushLog(`Lane ${laneName(e.lane)} has fallen. Your nexus is exposed!`, 'breach', '⚡');
        }
        break;
      }
      case 'nexus': {
        sound.nexus();
        arena.shake = Math.max(arena.shake, 8);
        break;
      }
      case 'bloodrush': {
        sound.bloodrush();
        showBanner('BLOODRUSH', 'THE ARENA HUNGERS · ALL DAMAGE INCREASED', 'foe', 2600);
        pushLog('<b>The Bloodrush begins.</b> All beasts grow stronger.', 'breach', '☠');
        break;
      }
      case 'end': {
        needsResult = true;
        if (e.winner === 'player') sound.victory(); else sound.defeat();
        showBanner(e.winner === 'player' ? 'NEXUS BROKEN' : 'NEXUS LOST', e.winner === 'player' ? 'THE RITE CONTINUES' : 'THE ARENA CLAIMS YOU', e.winner === 'player' ? 'gold' : 'foe', 2400);
        break;
      }
      default: break;
    }
  }
  updateBattleDock();
  if (needsResult && !S.resultShown) {
    S.resultShown = true;
    if (S.resultTimer) clearTimeout(S.resultTimer);
    const token = S.battle;
    S.resultTimer = setTimeout(() => {
      if (S.screen === 'run' && S.battle === token) showResult(token.winner);
    }, 1500);
  }
}

function showResult(winner) {
  if (!S.battle) return;
  S.phase = 'result';
  const wd = S.battle.waveData;
  const victory = winner === 'player';
  const reward = victory ? wd.reward : 0;
  const kills = S.battle.units.filter((u) => u.side === 'enemy' && !u.alive).length;
  const survivors = S.battle.units.filter((u) => u.side === 'player' && u.alive).length;
  const time = Math.min(60, Math.round(S.battle.time));
  if (victory) {
    S.essence += reward;
    S.best = Math.max(S.best, S.wave);
    localStorage.setItem('chimera-front-best', String(S.best));
  }
  updateNexusBars();
  updateOverlays();
  setTimeout(() => { if (S.screen === 'run') renderTitleBest(); }, 0);

  const newBest = victory && S.wave >= S.best;
  const isEndless = S.wave > WAVES.length;
  const resultStats = `
    <div class="rs"><small>WAVE</small><b>${isEndless ? '∞ ' + (S.wave - WAVES.length) : roman(S.wave)}</b></div>
    <div class="rs"><small>TIME</small><b>${time}s</b></div>
    <div class="rs"><small>BEASTS SLAIN</small><b>${kills}</b></div>
    <div class="rs"><small>SURVIVORS</small><b>${survivors}</b></div>
    <div class="rs"><small>SPLICES</small><b>${S.stats.splices}</b></div>
    <div class="rs"><small>NEXUS LEFT</small><b>${Math.ceil(S.battle.playerNexus)}</b></div>
  `;
  const actions = victory
    ? `<button class="btn btn-ghost" data-action="title">END RUN</button>
       <button class="btn btn-gold" data-action="next-wave">${S.wave >= 8 ? 'ENTER THE ENDLESS' : 'NEXT WAVE'} <span class="btn-arrow">›</span></button>`
    : `<button class="btn btn-ghost" data-action="title">RETURN TO TITLE</button>
       <button class="btn btn-primary" data-action="retry">TRY AGAIN <span class="btn-arrow">›</span></button>`;

  openModal(`
    <div class="modal result-modal ${victory ? 'win' : 'loss'}">
      <div class="modal-body">
        <div class="result-emblem"><span>${victory ? '◆' : '✕'}</span></div>
        <div class="result-kicker">${victory ? `WAVE ${isEndless ? 'ENDLESS' : roman(S.wave)} CLEARED` : 'THE RITE ENDS'}</div>
        <div class="result-title">${victory ? (S.wave === WAVES.length ? 'THE HOLLOW KING FALLS' : 'VICTORY') : 'DEFEAT'}</div>
        <p class="result-sub">${victory
          ? (S.wave >= WAVES.length ? 'The arena is silent. Its oldest hunger is finally fed.' : 'The enemy nexus shatters. Your chimeras taste blood and victory.')
          : `Your nexus broke on wave ${isEndless ? 'endless' : roman(S.wave)}. The rite begins again.`}</p>
        ${victory ? `<div class="result-reward"><span class="gem"></span>+${reward} ESSENCE ${newBest ? ' · NEW BEST WAVE' : ''}</div>` : ''}
        <div class="result-stats">${resultStats}</div>
        <div class="result-actions">${actions}</div>
      </div>
    </div>
    <div class="modal-backdrop" data-action="close-result" style="position:absolute"></div>
  `, true);
  // Put backdrop behind
  const root = els.modalRoot;
  const bd = root.querySelector('.modal-backdrop');
  const md = root.querySelector('.modal');
  if (bd && md) { root.insertBefore(bd, md); }
  updateBattleDock();
  hideOverlays();
}

function nextWave() {
  if (!S.battle) return;
  S.wave++;
  S.phase = 'prep';
  S.battle = null;
  S.battleLog = [];
  S.resultShown = false;
  S.speed = 1;
  S.selectedId = null;
  S.hover = null;
  S.chipEls = [];
  S.abilityUnits = [];
  S.shop = rollShop(S.wave);
  S.enemyPreview = buildEnemyPreview(S.wave);
  closeModal();
  refreshAll();
  const wd = waveData(S.wave);
  showBanner(`WAVE ${S.wave > WAVES.length ? '∞' : roman(S.wave)} · ${wd.name.toUpperCase()}`, 'PREPARE YOUR LINE', wd.boss ? 'foe' : '');
  if (wd.boss) setTimeout(() => toast('BOSS ENCOUNTER — their nexus is guarded by a colossus', 'epic'), 400);
  else if (S.roster.length >= ROSTER_MAX) toast('Roster full — splice to grow stronger', '');
}

// ══ SPLICE ══════════════════════════════════════════════════════════════════
function openSplice() {
  if (S.roster.length < 2) { toast('You need two beasts to splice', 'error'); sound.error(); return; }
  S.spliceSel = [null, null];
  renderSpliceModal();
}

function findRoster(id) { return S.roster.find((u) => u.id === id); }

function splicePreviewHtml() {
  const a = findRoster(S.spliceSel[0]);
  const b = findRoster(S.spliceSel[1]);
  if (!a || !b || a === b) {
    return `<div class="splice-empty">
      <div class="se-rune"><span>✧</span></div>
      <h3>THE SPLICE CHAMBER</h3>
      <p>Choose two beasts. The first chosen becomes the <b>primary form</b> — its body, range and ability dominate. The second contributes essence, coloring and traits.</p>
    </div>`;
  }
  const h = previewSplice(a, b);
  const delta = (key) => {
    const best = Math.max(a.stats[key], b.stats[key]);
    const d = h.stats[key] - best;
    return d === 0 ? '' : `<i class="${d < 0 ? 'down' : ''}">${d > 0 ? '+' : ''}${d}</i>`;
  };
  const stat = (label, value, d = '') => `<div class="sp-stat"><small>${label}</small><b>${value}</b>${d}</div>`;
  const ab = ABILITIES[h.ability];
  const cost = spliceCost(a, b);
  const cannot = S.essence < cost;
  return `
    <canvas class="sp-art" id="spliceArt"></canvas>
    <div class="sp-name">${esc(h.name)}</div>
    <div class="sp-lineage">${esc(SPECIES[h.primary].name)} / ${esc(SPECIES[h.secondary].name)} · TIER ${h.tier}</div>
    <div class="sp-role">${esc(h.role)} · ${h.stats.range >= 150 ? 'RANGED' : 'MELEE'}</div>
    <div class="sp-traits">${h.traits.map((t) => `<span class="trait" style="--tc:${TRAITS[t].color}" data-tip="${esc(TRAITS[t].desc)}" data-tip-title="${esc(TRAITS[t].icon + ' ' + TRAITS[t].name)}">${TRAITS[t].icon} ${TRAITS[t].name}</span>`).join('')}</div>
    <div class="sp-stats">
      ${stat('HEALTH', h.stats.hp, delta('hp'))}
      ${stat('ATTACK', h.stats.atk, delta('atk'))}
      ${stat('ATK SPD', h.stats.interval + 's')}
      ${stat('FORM', h.stats.range >= 150 ? 'RANGED' : 'MELEE')}
    </div>
    <div class="sp-ability"><b>${esc(ab.icon)} ${esc(ab.name)}</b><span>${esc(ab.desc)}</span></div>
    <input type="hidden" data-cost="${cost}" data-cannot="${cannot ? 1 : 0}" />
  `;
}

function renderSpliceModal() {
  const a = findRoster(S.spliceSel[0]);
  const b = findRoster(S.spliceSel[1]);
  const canSplice = !!(a && b && a !== b && S.essence >= spliceCost(a, b));
  const picks = S.roster.map((u) => {
    const isA = S.spliceSel[0] === u.id;
    const isB = S.spliceSel[1] === u.id;
    const badge = isA ? 'A' : isB ? 'B' : '';
    return `<button class="splice-pick ${isA ? 'picked-a' : ''} ${isB ? 'picked-b' : ''}" data-action="pick-splice" data-id="${u.id}">
      <canvas data-splice-portrait="${u.id}"></canvas>
      <span class="sp-main">
        <span class="sp-name">${esc(u.name)}</span>
        <span class="sp-meta">${esc(speciesLine(u))} · T${u.tier}</span>
      </span>
      <span class="pick-badge">${badge}</span>
    </button>`;
  }).join('');

  const right = `
    <div class="out-box">
      <div class="ob-label">PARENT A · PRIMARY FORM</div>
      ${a ? `<div class="parent-row"><canvas data-mini-parent="${a.id}"></canvas><div><div class="pr-name">${esc(a.name)}</div><div class="pr-tag">${esc(SPECIES[a.primary].name)} · ${a.stats.range >= 150 ? 'RANGED' : 'MELEE'} · ability</div></div></div>` : `<div class="ob-sub">— choose the form —</div>`}
    </div>
    <div class="out-box">
      <div class="ob-label">PARENT B · ESSENCE</div>
      ${b ? `<div class="parent-row"><canvas data-mini-parent="${b.id}"></canvas><div><div class="pr-name">${esc(b.name)}</div><div class="pr-tag">${esc(SPECIES[b.primary].name)} · traits &amp; color</div></div></div>` : `<div class="ob-sub">— choose the essence —</div>`}
    </div>
    <button class="btn btn-sm btn-ghost swap-btn" data-action="swap-splice" ${a && b ? '' : 'disabled'}>⇄ SWAP FORM / ESSENCE</button>
    <div class="cost-row">
      <span>SPLICE COST</span>
      <b class="${a && b && S.essence < spliceCost(a, b) ? 'insufficient' : ''}"><span class="gem"></span>${a && b ? spliceCost(a, b) : '—'}</b>
    </div>
    ${a && b && S.essence < spliceCost(a, b) ? '<div class="splice-warn">Not enough essence for this splice.</div>' : ''}
    <div class="splice-hint">Splicing consumes both parents. The hybrid inherits the primary parent's form, range and ability. Tier rises by one (max Mythic). Traits are merged.</div>
  `;

  openModal(`
    <div class="modal splice-modal">
      <div class="modal-head">
        <div><h2>THE SPLICE CHAMBER</h2><p>Fuse two beasts into one superior chimera. Essence: <b style="color:var(--gold)">${S.essence} ◆</b></p></div>
        <button class="modal-close" data-action="close-modal" aria-label="Close">✕</button>
      </div>
      <div class="modal-body">
        <div class="splice-grid">
          <div class="splice-col">
            <div class="col-label">CHOOSE PARENTS <span>${S.spliceSel.filter(Boolean).length} / 2 PICKED</span></div>
            <div class="splice-roster">${picks}</div>
          </div>
          <div class="splice-col preview-col">
            <div class="col-label">PROJECTED HYBRID <span>LIVE PREVIEW</span></div>
            <div class="splice-preview" id="splicePreview">${splicePreviewHtml()}</div>
          </div>
          <div class="splice-col out">
            <div class="col-label">OUTCOME <span>SPLICE PROTOCOL</span></div>
            <div class="splice-out">${right}</div>
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <div class="foot-note">Parent order matters. <b>A</b> decides the creature's form and ability.</div>
        <div class="foot-actions">
          <button class="btn btn-ghost" data-action="close-modal">CANCEL</button>
          <button class="btn btn-primary" data-action="confirm-splice" ${canSplice ? '' : 'disabled'}>SPLICE <span class="btn-arrow">›</span></button>
        </div>
      </div>
    </div>
    <div class="modal-backdrop" data-action="close-modal"></div>
  `);
  // Ensure backdrop is behind the modal
  const md = els.modalRoot.querySelector('.modal');
  const bd = els.modalRoot.querySelector('.modal-backdrop');
  if (md && bd) els.modalRoot.insertBefore(bd, md);
  drawSplicePortraits();
}

function drawSplicePortraits() {
  els.modalRoot.querySelectorAll('[data-splice-portrait]').forEach((c) => {
    const u = findRoster(c.dataset.splicePortrait);
    if (u) drawPortrait(c, u, 44);
  });
  els.modalRoot.querySelectorAll('[data-mini-parent]').forEach((c) => {
    const u = findRoster(c.dataset.miniParent);
    if (u) drawPortrait(c, u, 32);
  });
  const artCanvas = $('#spliceArt');
  const a = findRoster(S.spliceSel[0]);
  const b = findRoster(S.spliceSel[1]);
  if (artCanvas && a && b) {
    const h = previewSplice(a, b);
    drawBigArt(artCanvas, h, 230, 220);
  }
}

function drawBigArt(canvas, unit, w, h) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  drawCreature(ctx, unit.art, w / 2, h * 0.95, (h / 138) * (unit.art.scale || 1), {
    ring: false, animate: false, time: 0, seed: 2,
  });
}

function pickSpliceParent(id) {
  const [a, b] = S.spliceSel;
  if (a === id) { S.spliceSel = [b, null]; }
  else if (b === id) { S.spliceSel = [a, null]; }
  else if (!a) S.spliceSel = [id, b];
  else if (!b) S.spliceSel = [a, id];
  else S.spliceSel = [a, id];
  sound.select();
  renderSpliceModal();
}

function confirmSplice() {
  const a = findRoster(S.spliceSel[0]);
  const b = findRoster(S.spliceSel[1]);
  if (!a || !b || a === b) { sound.error(); return; }
  const cost = spliceCost(a, b);
  if (S.essence < cost) { toast('Not enough essence', 'error'); sound.error(); return; }
  const res = applySplice(S.roster, a.id, b.id);
  if (!res) return;
  for (const key of Object.keys(S.slots)) {
    if (S.slots[key] === a.id || S.slots[key] === b.id) delete S.slots[key];
  }
  res.hybrid.name = uniqueName(res.hybrid.name, res.roster.filter((u) => u.id !== res.hybrid.id));
  S.roster = res.roster;
  S.essence -= cost;
  S.lastEssence = S.essence + cost;
  S.stats.splices++;
  sound.splice();
  toast(`SPLICE COMPLETE — ${res.hybrid.name} is born`, 'epic');
  closeModal();
  refreshAll();
  showBanner('SPLICE COMPLETE', `${res.hybrid.name.toUpperCase()} · TIER ${res.hybrid.tier}`, 'gold', 2600);
}

// ══ MODALS ══════════════════════════════════════════════════════════════════
function openModal(inner, lockClose = false) {
  S.modal = { lockClose };
  els.modalRoot.innerHTML = inner;
  els.modalRoot.classList.add('open');
  document.body.classList.add('modal-open');
}

function closeModal() {
  if (S.modal && S.modal.lockClose && S.phase !== 'result' && S.modal.lockClose !== 'result') {
    // result modal is closable through its actions only
  }
  els.modalRoot.classList.remove('open');
  els.modalRoot.innerHTML = '';
  S.modal = null;
  document.body.classList.remove('modal-open');
}

function openHelp() {
  const traitRows = Object.entries(TRAITS).map(([k, t]) =>
    `<div class="trait-detail" style="--tc:${t.color}"><span class="td-icon">${t.icon}</span><span><b>${t.name}</b> — ${t.desc}</span></div>`).join('');
  openModal(`
    <div class="modal help-modal">
      <div class="modal-head">
        <div><h2>HOW TO PLAY</h2><p>Splice beasts. Claim five lanes. Break their nexus.</p></div>
        <button class="modal-close" data-action="close-modal" aria-label="Close">✕</button>
      </div>
      <div class="modal-body">
        <div class="help-grid">
          <div class="help-step"><div class="hs-num"><span>1</span></div><div><h4>SPLICE THE WILD</h4><p>Open <b>SPLICE BEASTS</b> and fuse any two creatures. The first chosen is the <b>primary form</b> — its body, attack range and ability dominate. The second adds <b>traits, colors and power</b>. Each splice raises the tier.</p></div></div>
          <div class="help-step"><div class="hs-num"><span>2</span></div><div><h4>CLAIM FIVE LANES</h4><p>The battle runs <b>left to right</b>: your beasts hold the left, the enemy holds the right. Deploy up to <b>8 beasts</b> across five lanes and two columns. Melee units belong in <b>FRONT</b>, closer to the enemy; ranged units cover their own lane and both <b>adjacent lanes</b> from <b>BACK</b>.</p></div></div>
          <div class="help-step"><div class="hs-num"><span>3</span></div><div><h4>COMMAND ABILITIES</h4><p>Every beast charges a signature ability. When a card glows, <b>click it or press its number</b> to fire early — timing a heal or stun wins fights. Unused abilities auto-cast after 6 seconds.</p></div></div>
          <div class="help-step"><div class="hs-num"><span>4</span></div><div><h4>BREAK THE NEXUS</h4><p>Win a lane and your beast marches on the <b>enemy nexus</b>. Every hit cracks it. Your own nexus is exposed the same way — a lane with no defenders is a death sentence.</p></div></div>
        </div>
        <div class="help-traits"><h4>TRAITS &amp; LINEAGE</h4><div class="trait-grid">${traitRows}</div></div>
      </div>
      <div class="modal-foot">
        <div class="foot-note">Recruits cost essence. Splices consume both parents. A run ends if your nexus breaks.</div>
        <div class="foot-actions">
          ${S.screen === 'run' ? '<button class="btn btn-ghost" data-action="title">ABANDON RUN</button>' : ''}
          <button class="btn btn-primary" data-action="close-modal">UNDERSTOOD</button>
        </div>
      </div>
    </div>
    <div class="modal-backdrop" data-action="close-modal"></div>
  `);
  const md = els.modalRoot.querySelector('.modal');
  const bd = els.modalRoot.querySelector('.modal-backdrop');
  if (md && bd) els.modalRoot.insertBefore(bd, md);
}

// ══ TOOLTIPS ════════════════════════════════════════════════════════════════
let tipRaf = 0;
function showTip(el, x, y) {
  const title = el.dataset.tipTitle || '';
  const desc = el.dataset.tip || '';
  if (!title && !desc) return;
  els.tooltip.innerHTML = `${title ? `<b>${title}</b>` : ''}${desc ? `<span>${esc(desc)}</span>` : ''}<div class="tt-meta">CLICK FOR DETAILS</div>`;
  els.tooltip.classList.add('show');
  positionTip(x, y);
}
function positionTip(x, y) {
  const pad = 14;
  const r = els.tooltip.getBoundingClientRect();
  let left = x + 16; let top = y + 16;
  if (left + r.width > window.innerWidth - pad) left = x - r.width - 12;
  if (top + r.height > window.innerHeight - pad) top = y - r.height - 12;
  els.tooltip.style.left = `${Math.max(pad, left)}px`;
  els.tooltip.style.top = `${Math.max(pad, top)}px`;
}
function hideTip() { els.tooltip.classList.remove('show'); }

// ══ EVENTS ══════════════════════════════════════════════════════════════════
function bindEvents() {
  $('#startBtn').addEventListener('click', startRun);
  $('#howBtn').addEventListener('click', openHelp);
  els.helpBtn.addEventListener('click', openHelp);
  els.soundBtn.addEventListener('click', () => {
    sound.init();
    sound.setMuted(!sound.muted);
    S.muted = sound.muted;
    els.soundBtn.classList.toggle('muted', sound.muted);
    sound.ui();
  });
  els.soundBtn.classList.toggle('muted', sound.muted);

  // delegated actions
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    switch (action) {
      case 'battle': startBattle(); break;
      case 'open-splice': openSplice(); break;
      case 'buy': buyOffer(Number(el.dataset.index)); break;
      case 'reroll': rerollShop(); break;
      case 'help': openHelp(); break;
      case 'title': returnToTitle(); break;
      case 'close-modal': closeModal(); break;
      case 'close-result': break;
      case 'pick-splice': pickSpliceParent(el.dataset.id); break;
      case 'swap-splice': {
        S.spliceSel = [S.spliceSel[1], S.spliceSel[0]];
        sound.ui();
        renderSpliceModal();
        break;
      }
      case 'confirm-splice': confirmSplice(); break;
      case 'next-wave': nextWave(); break;
      case 'retry': closeModal(); startRun(); break;
      case 'speed': {
        S.speed = Number(el.dataset.speed) || 1;
        updateOverlays();
        sound.ui();
        break;
      }
      default: break;
    }
  });

  // dock
  els.dockBody.addEventListener('click', (e) => {
    if (S.phase === 'battle') {
      const chip = e.target.closest('.ability-chip');
      if (chip) {
        const u = S.abilityUnits.find((x) => x.ref.id === chip.dataset.uid);
        if (u) tryCast(u);
      }
      return;
    }
    if (S.phase !== 'prep') return;
    const card = e.target.closest('.unit-card');
    if (!card) return;
    selectBench(card.dataset.uid);
  });

  els.speed.addEventListener('click', (e) => {
    const btn = e.target.closest('.speed-btn');
    if (!btn) return;
    S.speed = Number(btn.dataset.speed) || 1;
    updateOverlays();
    sound.ui();
  });

  // arena mouse
  els.canvas.addEventListener('mousemove', (e) => {
    if (S.screen !== 'run') return;
    const pick = arena.pick(arenaState(), e.clientX, e.clientY);
    if (S.phase === 'prep') {
      S.hover = pick || null;
    } else {
      S.hover = null;
    }
    els.canvas.style.cursor = pick ? 'pointer' : 'default';
  });
  els.canvas.addEventListener('mouseleave', () => { S.hover = null; els.canvas.style.cursor = 'default'; });

  els.canvas.addEventListener('click', (e) => {
    if (S.screen !== 'run') return;
    const pick = arena.pick(arenaState(), e.clientX, e.clientY);
    if (S.phase === 'prep') {
      if (!pick) { S.selectedId = null; renderDock(); renderPrepSidebar(); return; }
      if (pick.lane == null) return;
      handleSlotClick(pick);
      return;
    }
    if (S.phase === 'battle' && pick && pick.unit && pick.unit.side === 'player') {
      tryCast(pick.unit);
    }
  });

  // modal backdrop clicks
  els.modalRoot.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop') && S.phase !== 'result') closeModal();
  });

  // tooltips
  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest('[data-tip]');
    if (el) showTip(el, e.clientX, e.clientY);
  });
  document.addEventListener('mousemove', (e) => {
    if (!els.tooltip.classList.contains('show')) return;
    positionTip(e.clientX, e.clientY);
  });
  document.addEventListener('mouseout', (e) => {
    const el = e.target.closest('[data-tip]');
    if (el) hideTip();
  });
  window.addEventListener('scroll', hideTip, true);

  // keyboard
  window.addEventListener('keydown', (e) => {
    if (S.screen === 'title') {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startRun(); }
      return;
    }
    if (e.key === 'Escape') {
      if (els.modalRoot.classList.contains('open') && S.phase !== 'result') { closeModal(); return; }
      if (S.selectedId) { S.selectedId = null; renderDock(); renderPrepSidebar(); }
      return;
    }
    if (els.modalRoot.classList.contains('open')) return;
    if (S.phase === 'prep') {
      if (e.key === ' ') { e.preventDefault(); startBattle(); }
      else if (e.key === 's' || e.key === 'S') openSplice();
      else if (e.key === 'h' || e.key === 'H' || e.key === '?') openHelp();
      else if (e.key === 'm' || e.key === 'M') els.soundBtn.click();
    } else if (S.phase === 'battle') {
      const n = Number(e.key);
      if (n >= 1 && n <= 9) castByIndex(n - 1);
      else if (e.key === 'm' || e.key === 'M') els.soundBtn.click();
      else if (e.key === 'h' || e.key === 'H' || e.key === '?') openHelp();
    }
  });

  new ResizeObserver(() => { arena.resize(); }).observe(els.shell);
  window.addEventListener('resize', () => arena.resize());
}

// ══ MAIN LOOP ═══════════════════════════════════════════════════════════════
let lastT = performance.now();
let hudAcc = 0;

function loop(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000) || 0.016;
  lastT = now;

  if (S.screen === 'title') {
    renderTitle(els.titleCanvas, titleUnits, now / 1000);
    requestAnimationFrame(loop);
    return;
  }

  if (S.phase === 'battle' && S.battle && !S.battle.over) {
    let remaining = dt * S.speed;
    let guard = 0;
    while (remaining > 0 && guard++ < 8) {
      const step = Math.min(remaining, 1 / 60);
      stepBattle(S.battle, step);
      remaining -= step;
    }
  }
  if (S.battle && S.phase === 'battle') {
    const events = drainEvents(S.battle);
    if (events.length) {
      arena.ingest(events);
      handleBattleEvents(events);
    }
  }

  arena.render(arenaState(), dt);

  hudAcc += dt;
  if (hudAcc > 0.06) {
    hudAcc = 0;
    updateNexusBars();
    if (S.phase === 'battle') updateBattleDock();
    updateOverlays();
  }
  requestAnimationFrame(loop);
}

// ══ BOOT ════════════════════════════════════════════════════════════════════
function boot() {
  renderTitleBest();
  bindEvents();
  els.app.setAttribute('aria-hidden', 'true');
  requestAnimationFrame((t) => { lastT = t; loop(t); });
}

function fastForward(seconds) {
  if (!S.battle || S.phase !== 'battle') return;
  const total = Math.max(0, Number(seconds) || 0);
  for (let t = 0; t < total; t += 1 / 60) stepBattle(S.battle, 1 / 60);
  const events = drainEvents(S.battle);
  if (events.length) { arena.ingest(events); handleBattleEvents(events); }
  arena.render(arenaState(), 1 / 60);
  updateNexusBars();
  updateBattleDock();
  updateOverlays();
}

window.__CHIMERA = { S, arena, sound, waveData, startBattle, startRun, renderAll: refreshAll, fastForward };
boot();
