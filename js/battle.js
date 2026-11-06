// ─────────────────────────────────────────────────────────────
//  CHIMERA — five-lane battle
// ─────────────────────────────────────────────────────────────
import {
  state, $, $$, clamp, fmt, ROMAN, TERRAINS, sound, toast, emit,
  cloneFighter, familyInfo, terrainFor, rnd,
} from './core.js'
import { drawCreature, renderPortrait } from './creature.js'

const BATTLE_TIME = 60

const COMMANDS = [
  { id: 'rally', key: 'Q', name: 'RALLY', icon: '⚑', desc: '+35% attack speed · 5s', cd: 18 },
  { id: 'aegis', key: 'W', name: 'AEGIS', icon: '◈', desc: '+30% max-HP shield', cd: 22 },
  { id: 'starfall', key: 'E', name: 'STARFALL', icon: '☄', desc: 'Call a meteor onto a lane', cd: 16 },
  { id: 'shift', key: 'R', name: 'SHIFT', icon: '⇄', desc: 'Swap two fighters', cd: 0 },
]

let raf = null
let lastFrame = 0
let resizeTimer = null
let keyBound = false

// ───────────────────────────── setup ─────────────────────────────
export function startBattle() {
  if (state.fighters.some(f => !f)) return
  state.view = 'battle'
  state.stats.battles += 1
  $('#prepView').classList.add('hidden')
  $('#battleView').classList.remove('hidden')
  const stack = $('#toastStack')
  if (stack) stack.innerHTML = ''
  window.scrollTo(0, 0)

  const ally = state.fighters.map((f, i) => makeBattleFighter(f, 'ally', i))
  const enemy = state.lineup.map((f, i) => makeBattleFighter(f, 'enemy', i))
  const bl = {
    lanes: [],
    t: 0,
    time: BATTLE_TIME,
    phase: 'intro',
    introT: 2.2,
    score: { ally: 0, enemy: 0 },
    speed: 1,
    mode: null,
    ended: false,
    revealAt: 0,
    hudT: 0,
    damageDealt: 0,
    commands: {
      rally: { remain: 0, max: COMMANDS[0].cd * state.runMods.cdr },
      aegis: { remain: 0, max: COMMANDS[1].cd * state.runMods.cdr },
      starfall: { remain: 0, max: COMMANDS[2].cd * state.runMods.cdr },
      shift: { remain: 0, max: 0 },
    },
    shiftCharges: 1 + state.runMods.shifts,
  }
  state.battle = bl

  for (let i = 0; i < 5; i++) {
    bl.lanes.push(makeLane(i, ally[i], enemy[i], bl))
  }

  buildArena(bl)
  buildCommands(bl)
  updateScorePips(bl)
  setPhaseText('THE HORN SOUNDS')
  showBanner('THE HORN SOUNDS', 'I')
  $('#speedBtn').textContent = '1×'
  $('#speedBtn').onclick = () => {
    if (!state.battle) return
    state.battle.speed = state.battle.speed === 1 ? 2 : 1
    $('#speedBtn').textContent = state.battle.speed + '×'
    sound.click()
  }
  bindKeys()
  lastFrame = performance.now()
  if (!raf) raf = requestAnimationFrame(loop)
  requestAnimationFrame(layoutLanes)
  sound.init()
}

export function stopBattle() {
  if (raf) cancelAnimationFrame(raf)
  raf = null
}

function makeBattleFighter(src, side, laneIndex) {
  const f = cloneFighter(src)
  if (side === 'ally') {
    const m = state.runMods
    f.maxHp = Math.round(src.maxHp * m.hp)
    f.atk = Math.round(src.atk * m.atk * 10) / 10
    f.interval = Math.max(0.3, src.interval / m.aspd)
    f.crit = src.crit + m.crit
    f.lifesteal = src.lifesteal + m.leech
    f.battleShield = src.battleShield + m.shield
    f.energyMult = src.energyMult * m.energy
    f.shieldPower = src.shieldPower * (1 + m.healing)
  }
  f.hp = f.maxHp
  f.side = side
  f.x = side === 'ally' ? 0.18 : 0.82
  f.attackTimer = 0.3 + Math.random() * 0.45
  f.energy = 10 + Math.random() * 14
  f.shield = Math.round(f.maxHp * (f.battleShield || 0))
  f.shieldUntil = Infinity
  f.dead = false
  f.status = {
    stunUntil: 0, slowUntil: 0, slowAmt: 0,
    aspdUntil: 0, aspdMult: 1, thornsUntil: 0, thornsAmt: 0,
    dots: [],
  }
  f.anim = { atkT: 0, hitT: 0, castT: 0, deadT: 0 }
  f.attackCount = 0
  f.damageDealt = 0
  f.damageTaken = 0
  f.heals = 0
  f.kills = 0
  f.rebornUsed = false
  f.lastHitBy = null
  f.castName = ''
  f.castT = 0
  f.moving = false
  f.rangeType = f.rangeType || (f.rangeType === 'ranged' ? 'ranged' : 'melee')
  return f
}

function makeLane(index, ally, enemy, bl) {
  // Both fighters need a battle-clock reference so damage-over-time effects can expire.
  if (ally) ally.bl = bl
  if (enemy) enemy.bl = bl
  const lane = {
    index, ally, enemy, bl,
    el: null, canvas: null, ctx: null, W: 0, H: 0, dpr: 1,
    bgCanvas: null, hud: { ally: null, enemy: null },
    resolved: false, winner: null, phase: 'fight', pushT: 0,
    fx: { particles: [], texts: [], projectiles: [], rings: [], slashes: [], meteors: [], shake: 0 },
  }
  return lane
}

function buildArena(bl) {
  const arena = $('#arena')
  arena.innerHTML = ''
  bl.lanes.forEach((lane, i) => {
    const terr = TERRAINS[i]
    const el = document.createElement('div')
    el.className = 'lane lane-targetable'
    el.dataset.lane = i
    el.innerHTML = `
      <canvas class="lane-canvas"></canvas>
      <div class="lane-seal">
        <span class="seal-roman">${ROMAN[i]}</span>
        <span class="seal-name" style="--terr-color:${terr.color}">${terr.name}</span>
      </div>
      <div class="lane-hud ally" data-side="ally"></div>
      <div class="lane-hud enemy" data-side="enemy"></div>
      <div class="lane-result"><span class="stamp">BREACHED</span></div>`
    lane.el = el
    lane.canvas = el.querySelector('.lane-canvas')
    lane.ctx = lane.canvas.getContext('2d')
    arena.appendChild(el)
    renderRail(lane, 'ally')
    renderRail(lane, 'enemy')
    el.addEventListener('click', () => laneClicked(i))
  })
  const banner = document.createElement('div')
  banner.className = 'battle-banner hidden'
  banner.id = 'battleBanner'
  banner.innerHTML = '<span class="banner-kicker"></span><span class="banner-word"></span>'
  arena.appendChild(banner)
}

function railHtml(f, side) {
  const fam = familyInfo(f.family)
  const fam2 = f.family2 ? familyInfo(f.family2) : null
  return `
    <div class="hud-top">
      <div class="hud-portrait"></div>
      <div class="hud-id">
        <span class="hud-name">${f.resonant ? '<span style="color:#d9ad62">◈</span> ' : ''}${f.name}</span>
        <span class="hud-family">${fam.name}${fam2 ? ' / ' + fam2.name : ''} · ${f.role}</span>
      </div>
    </div>
    <div class="hud-bars">
      <div class="hp-track"><div class="hp-fill"></div><div class="shield-fill" style="display:none"></div></div>
      <div class="hud-num"><span>HP</span><span><b>${Math.ceil(f.hp)}</b> / ${f.maxHp}</span></div>
      <div class="energy-track"><div class="energy-fill"></div></div>
    </div>`
}

function renderRail(lane, side) {
  const f = side === 'ally' ? lane.ally : lane.enemy
  const el = lane.el.querySelector(`.lane-hud[data-side="${side}"]`)
  el.innerHTML = railHtml(f, side)
  el.classList.toggle('dead', !!f.dead)
  const canvas = document.createElement('canvas')
  el.querySelector('.hud-portrait').appendChild(canvas)
  renderPortrait(canvas, f, { size: 84, ring: false, showPedestal: false })
  lane.hud[side] = {
    el,
    hp: el.querySelector('.hp-fill'),
    shield: el.querySelector('.shield-fill'),
    num: el.querySelector('.hud-num'),
    energy: el.querySelector('.energy-fill'),
    name: el.querySelector('.hud-name'),
  }
}

function layoutLanes() {
  if (!state.battle) return
  const bl = state.battle
  bl.lanes.forEach(lane => {
    if (!lane.el.isConnected) return
    const rect = lane.el.getBoundingClientRect()
    if (rect.width < 20 || rect.height < 20) return
    lane.W = rect.width
    lane.H = rect.height
    lane.dpr = Math.min(window.devicePixelRatio || 1, 2)
    lane.canvas.width = Math.round(lane.W * lane.dpr)
    lane.canvas.height = Math.round(lane.H * lane.dpr)
    lane.canvas.style.width = lane.W + 'px'
    lane.canvas.style.height = lane.H + 'px'
    lane.bgCanvas = buildLaneBackground(lane)
  })
}

window.addEventListener('resize', () => {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(layoutLanes, 120)
})

// ───────────────────────────── commands ─────────────────────────────
function buildCommands(bl) {
  const wrap = $('#cmdWrap')
  wrap.innerHTML = ''
  for (const c of COMMANDS) {
    const btn = document.createElement('button')
    btn.className = 'cmd'
    btn.dataset.cmd = c.id
    btn.innerHTML = `
      <span class="cmd-icon">${c.icon}</span>
      <span class="cmd-copy">
        <span class="cmd-name">${c.name}<span class="cmd-key">${c.key}</span>${c.id === 'shift' ? '<span class="charge-dot"></span><span class="shift-count"></span>' : ''}</span>
        <span class="cmd-desc">${c.desc}</span>
      </span>
      <span class="cd-sweep"></span>
      <span class="cd-label"></span>`
    btn.addEventListener('click', () => triggerCommand(c.id))
    wrap.appendChild(btn)
  }
  const hint = $('#commandHint')
  hint.classList.remove('targeting')
  $('#hintText').textContent = 'Abilities charge as your chimeras strike. Commands are yours alone.'
  updateCommandBar(bl, true)
  updateScorePips(bl)
  setPhaseText('THE HORN SOUNDS')
}

function updateCommandBar(bl, force = false) {
  if (!bl) return
  for (const c of COMMANDS) {
    const btn = document.querySelector(`.cmd[data-cmd="${c.id}"]`)
    if (!btn) continue
    const cmd = bl.commands[c.id]
    const remain = c.id === 'shift' ? 0 : Math.max(0, cmd.remain)
    const cooling = remain > 0.05
    const active = bl.mode && bl.mode.type === c.id
    const spent = c.id === 'shift' && bl.shiftCharges <= 0
    btn.classList.toggle('cooling', cooling)
    btn.classList.toggle('active', !!active)
    btn.classList.toggle('spent', spent)
    btn.disabled = bl.phase !== 'fight' || cooling || spent || bl.ended
    const sweep = btn.querySelector('.cd-sweep')
    if (sweep) sweep.style.height = cooling ? `${Math.min(100, (remain / cmd.max) * 100)}%` : '0%'
    const label = btn.querySelector('.cd-label')
    if (label) label.textContent = cooling ? Math.ceil(remain) : ''
    if (c.id === 'shift') {
      const sc = btn.querySelector('.shift-count')
      if (sc) sc.textContent = `${bl.shiftCharges}`
    }
  }
  const hint = $('#commandHint')
  const hintText = $('#hintText')
  if (!hint || !hintText) return
  hint.classList.toggle('targeting', !!bl.mode)
  if (bl.mode?.type === 'starfall') hintText.textContent = 'STARFALL — choose a lane (click or press 1–5). Esc cancels.'
  else if (bl.mode?.type === 'swap') hintText.textContent = bl.mode.first == null ? 'SHIFT — choose the first fighter.' : 'SHIFT — choose the second fighter. Esc cancels.'
  else hintText.textContent = 'Abilities charge as your chimeras strike. Commands are yours alone.'
}

function triggerCommand(id) {
  const bl = state.battle
  if (!bl || bl.phase !== 'fight' || bl.ended) return
  const cmd = bl.commands[id]
  if (id !== 'shift' && cmd.remain > 0) return
  if (bl.mode?.type === id) { clearMode(); return }
  if (id === 'rally') {
    if (cmd.remain > 0) return
    castRally(bl)
  } else if (id === 'aegis') {
    if (cmd.remain > 0) return
    castAegis(bl)
  } else if (id === 'starfall') {
    if (cmd.remain > 0) return
    setMode(bl, { type: 'starfall' })
  } else if (id === 'shift') {
    if (bl.shiftCharges <= 0) return
    setMode(bl, { type: 'swap', first: null })
  }
}

function setMode(bl, mode) {
  bl.mode = mode
  bl.lanes.forEach(lane => lane.el.classList.remove('targeting', 'swap-first'))
  if (mode?.type === 'starfall') {
    bl.lanes.forEach(lane => {
      if (!lane.resolved && !lane.enemy.dead) lane.el.classList.add('targeting')
    })
  }
  updateCommandBar(bl)
  sound.click()
}

function clearMode() {
  const bl = state.battle
  if (!bl) return
  bl.mode = null
  bl.lanes.forEach(lane => lane.el.classList.remove('targeting', 'swap-first'))
  updateCommandBar(bl)
}

function laneClicked(index) {
  const bl = state.battle
  if (!bl || bl.phase !== 'fight' || bl.ended) return
  if (!bl.mode) return
  if (bl.mode.type === 'starfall') {
    castStarfall(bl, index)
  } else if (bl.mode.type === 'swap') {
    handleSwapClick(bl, index)
  }
}

function handleSwapClick(bl, index) {
  const lane = bl.lanes[index]
  if (lane.resolved || lane.phase !== 'fight' || lane.ally.dead) {
    toast('That fighter cannot answer the call.', true)
    return
  }
  if (bl.mode.first == null) {
    bl.mode.first = index
    lane.el.classList.add('swap-first')
    updateCommandBar(bl)
    return
  }
  if (bl.mode.first === index) {
    bl.mode.first = null
    lane.el.classList.remove('swap-first')
    updateCommandBar(bl)
    return
  }
  shiftLanes(bl, bl.mode.first, index)
}

function shiftLanes(bl, i, j) {
  const a = bl.lanes[i], b = bl.lanes[j]
  const fa = a.ally, fb = b.ally
  a.ally = fb
  b.ally = fa
  for (const [lane, f] of [[a, fb], [b, fa]]) {
    f.x = 0.18
    f.attackTimer = Math.max(f.attackTimer, 0.5)
    f.status.stunUntil = 0
    f.status.slowUntil = 0
    lane.el.classList.remove('lane-won-ally', 'lane-won-enemy')
    renderRail(lane, 'ally')
    spawnRing(lane, 0.18, 0.84, 40, 130, '#d8b4ff', 0.5)
    spawnParticles(lane, 0.18, 0.84, '#d8b4ff', 18, 1)
  }
  bl.shiftCharges -= 1
  bl.mode = null
  bl.lanes.forEach(l => l.el.classList.remove('targeting', 'swap-first'))
  updateCommandBar(bl)
  toast('The veil folds — fighters shifted.')
  sound.cast()
}

// ───────────────────────────── command effects ─────────────────────────────
function castRally(bl) {
  bl.commands.rally.remain = bl.commands.rally.max
  for (const lane of bl.lanes) {
    if (lane.resolved || lane.ally.dead) continue
    lane.ally.status.aspdUntil = bl.t + 5
    lane.ally.status.aspdMult = 1.35
    spawnRing(lane, lane.ally.x, 0.84, 20, 95, '#f6d48a', 0.6)
    spawnParticles(lane, lane.ally.x, 0.82, '#f6d48a', 12, 0.8)
    floatText(lane, lane.ally.x, 0.64, 'RALLY', '#f8d995', 1.4, true)
  }
  toast('Rally — the five answer as one.')
  sound.cast()
  updateCommandBar(bl)
}

function castAegis(bl) {
  bl.commands.aegis.remain = bl.commands.aegis.max
  for (const lane of bl.lanes) {
    if (lane.resolved || lane.ally.dead) continue
    lane.ally.shield += lane.ally.maxHp * 0.30 * (lane.ally.shieldPower || 1)
    spawnRing(lane, lane.ally.x, 0.84, 30, 120, '#8ed8ff', 0.7)
    spawnParticles(lane, lane.ally.x, 0.7, '#9ee6ff', 14, 0.6)
    floatText(lane, lane.ally.x, 0.6, 'AEGIS', '#a8e5ff', 1.4, true)
  }
  toast('Aegis — a second hide of light.')
  sound.cast()
  updateCommandBar(bl)
}

function castStarfall(bl, laneIndex) {
  const lane = bl.lanes[laneIndex]
  if (!lane || lane.resolved || lane.enemy.dead) {
    toast('No living foe in that lane.', true)
    return
  }
  const allies = bl.lanes.filter(l => !l.ally.dead).map(l => l.ally)
  const avg = allies.length ? allies.reduce((s, f) => s + f.atk, 0) / allies.length : 70
  const raw = avg * 3.4 * state.runMods.starfall
  addMeteor(lane, lane.enemy.x, 0.82, 0.75)
  bl.commands.starfall.remain = bl.commands.starfall.max
  // Impact after the meteor falls.
  lane.fx.pendingMeteor = {
    at: bl.t + 0.38, raw, target: lane.enemy, source: allies[0] || lane.ally,
    burnDps: Math.max(5, avg * 0.22 * state.runMods.starfall),
  }
  bl.mode = null
  bl.lanes.forEach(l => l.el.classList.remove('targeting', 'swap-first'))
  updateCommandBar(bl)
  toast('Starfall — the sky answers.')
  sound.cast()
}

// ───────────────────────────── loop & simulation ─────────────────────────────
function loop(now) {
  raf = requestAnimationFrame(loop)
  if (!state.battle || state.view !== 'battle') return
  const bl = state.battle
  // Reading the codex pauses the duel; the board stays visible behind the modal.
  if (!$('#modalRoot').classList.contains('hidden')) {
    drawBattle(bl)
    return
  }
  // Keep the duel real-time even when the machine drops frames; the cap only
  // guards against tab-switch time jumps.
  const raw = Math.min(0.1, (now - lastFrame) / 1000) || 0
  lastFrame = now
  const dt = raw * (bl.speed || 1)

  if (bl.phase === 'intro') {
    bl.t += dt
    bl.introT -= dt
    const w = bl.introT > 1.65 ? 'I' : bl.introT > 1.1 ? 'II' : bl.introT > 0.55 ? 'III' : 'ENGAGE'
    const word = $('#battleBanner .banner-word')
    if (word && word.textContent !== w) word.textContent = w
    if (bl.introT <= 0) {
      bl.phase = 'fight'
      hideBanner()
      setPhaseText('THE FIVE LANES BURN')
    }
  } else if (bl.phase === 'fight') {
    bl.t += dt
    bl.time -= dt
    for (const cmd of ['rally', 'aegis', 'starfall']) {
      if (bl.commands[cmd].remain > 0) bl.commands[cmd].remain = Math.max(0, bl.commands[cmd].remain - dt)
    }
    for (const lane of bl.lanes) updateLane(lane, dt)
    bl.hudT += dt
    if (bl.hudT > 0.07) {
      bl.hudT = 0
      updateHud(bl)
      updateCommandBar(bl)
    }
    if (bl.time <= 0 && !bl.ended) endByTime(bl)
  } else if (bl.phase === 'ended') {
    bl.t += dt * 0.5
    for (const lane of bl.lanes) updateFx(lane, dt * 0.5)
  }

  updateTimer(bl)
  drawBattle(bl)
}

function updateTimer(bl) {
  const t = Math.max(0, Math.ceil(bl.time))
  const txt = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
  const el = $('#battleTimer')
  if (el && el.textContent !== txt) el.textContent = txt
}

function setPhaseText(text, hold = 0) {
  const el = $('#battlePhase')
  if (!el) return
  el.textContent = text
  const bl = state.battle
  if (!bl) return
  bl.phaseToken = (bl.phaseToken || 0) + 1
  const token = bl.phaseToken
  if (hold) {
    setTimeout(() => {
      if (state.battle === bl && bl.phaseToken === token && bl.phase === 'fight' && !bl.ended) {
        $('#battlePhase').textContent = 'THE FIVE LANES BURN'
      }
    }, hold * 1000)
  }
}

function showBanner(kicker, word) {
  const b = $('#battleBanner')
  if (!b) return
  b.querySelector('.banner-kicker').textContent = kicker
  b.querySelector('.banner-word').textContent = word
  b.classList.remove('hidden', 'out')
}

function hideBanner() {
  const b = $('#battleBanner')
  if (!b) return
  b.classList.add('out')
  setTimeout(() => b.classList.add('hidden'), 420)
}

function updateScorePips(bl) {
  const ally = $('#allyPips'), enemy = $('#enemyPips')
  if (!ally || !enemy) return
  ally.innerHTML = [0, 1, 2].map(i => `<span class="pip ${i < bl.score.ally ? 'won' : ''}"></span>`).join('')
  enemy.innerHTML = [0, 1, 2].map(i => `<span class="pip ${i < bl.score.enemy ? 'won' : ''}"></span>`).join('')
}

function updateHud(bl) {
  for (const lane of bl.lanes) {
    for (const side of ['ally', 'enemy']) {
      const f = lane[side]
      const hud = lane.hud[side]
      if (!hud || !hud.hp) continue
      const pct = clamp(f.hp / f.maxHp, 0, 1)
      hud.hp.style.transform = `scaleX(${pct})`
      const sh = clamp(f.shield / f.maxHp, 0, 1)
      hud.shield.style.display = sh > 0.001 ? 'block' : 'none'
      hud.shield.style.transform = `scaleX(${Math.min(1, sh)})`
      const energy = clamp(f.energy / 100, 0, 1)
      hud.energy.style.width = `${energy * 100}%`
      hud.num.innerHTML = `<span>${f.shield > 1 ? '◈ ' + Math.ceil(f.shield) : 'HP'}</span><span><b>${Math.ceil(Math.max(0, f.hp))}</b> / ${f.maxHp}</span>`
      hud.el.classList.toggle('dead', f.dead)
    }
  }
}

function updateLane(lane, dt) {
  const bl = lane.bl
  if (lane.resolved) { updateFx(lane, dt); return }

  if (lane.phase === 'push') {
    lane.pushT += dt
    const w = lane.winner
    if (w) {
      const target = w.side === 'ally' ? 0.93 : 0.07
      w.x += Math.sign(target - w.x) * Math.min(Math.abs(target - w.x), dt * 0.55)
      w.anim.atkT = Math.max(0, w.anim.atkT - dt)
      if (lane.pushT > 0.55 && !lane.gateBurst) {
        lane.gateBurst = true
        const gx = w.side === 'ally' ? 0.96 : 0.04
        spawnRing(lane, gx, 0.82, 18, 120, w.side === 'ally' ? '#ffdd9c' : '#ff9b88', 0.8)
        spawnParticles(lane, gx, 0.8, w.side === 'ally' ? '#ffdd9c' : '#ff9b88', 26, 1.3)
        lane.fx.shake = 9
        sound.breach(w.side === 'ally')
      }
    }
    if (lane.pushT >= 1.15) resolveLane(lane, lane.winner)
    updateProjectiles(lane, dt)
    updateFx(lane, dt)
    return
  }

  const { ally, enemy } = lane
  if (bl.mode?.type === 'starfall' && lane.el) lane.el.classList.toggle('targeting', !enemy.dead)
  updateFighter(lane, ally, enemy, dt)
  if (lane.phase === 'fight' && !enemy.dead) updateFighter(lane, enemy, ally, dt)
  updateProjectiles(lane, dt)
  updateMeteors(lane, dt)
  updateFx(lane, dt)
}

function rangeNorm(lane, f) {
  const px = f.rangeType === 'ranged' ? 300 : 92
  return clamp(px / Math.max(200, lane.W), 0.045, 0.42)
}

function aspdMult(f, bl) {
  let m = 1
  if (f.status.aspdUntil > bl.t) m *= f.status.aspdMult
  if (f.flags.pack && f.hp / f.maxHp > 0.6) m *= 1.15
  if (f.flags.berserk && f.hp / f.maxHp < 0.35) m *= 1.30
  if (f.status.slowUntil > bl.t) m *= 1 - f.status.slowAmt * 0.45
  return Math.max(0.3, m)
}

function moveSpeed(f, bl) {
  let m = 0.14
  if (f.flags.swift) m *= 1.10
  if (f.status.slowUntil > bl.t) m *= 1 - f.status.slowAmt * 0.7
  return m
}

function updateFighter(lane, f, target, dt) {
  const bl = lane.bl
  if (f.dead || target.dead || lane.phase !== 'fight') return
  f.anim.atkT = Math.max(0, f.anim.atkT - dt)
  f.anim.hitT = Math.max(0, f.anim.hitT - dt)
  f.anim.castT = Math.max(0, f.anim.castT - dt)
  if (f.castT > 0) f.castT -= dt

  tickStatus(lane, f, dt)
  if (f.dead) return
  if (target.dead) return

  f.energy = Math.min(100, f.energy + 1.0 * dt * (f.energyMult || 1))

  const stunned = f.status.stunUntil > bl.t
  if (stunned) {
    f.moving = false
    if (Math.random() < dt * 4) spawnParticles(lane, f.x, 0.63, '#ffe6a6', 1, 0.35)
    return
  }

  if (f.energy >= 100) {
    castAbility(lane, f, target)
    return
  }

  const dist = Math.abs(target.x - f.x)
  const range = rangeNorm(lane, f)
  f.moving = false
  if (dist > range) {
    const step = moveSpeed(f, bl) * dt
    const dir = Math.sign(target.x - f.x)
    const nx = f.x + dir * step
    // never cross the opponent
    if (dir > 0) f.x = Math.min(nx, target.x - 0.035)
    else f.x = Math.max(nx, target.x + 0.035)
    f.moving = true
  }

  f.attackTimer -= dt
  if (f.attackTimer <= 0 && Math.abs(target.x - f.x) <= range + 0.005) {
    performAttack(lane, f, target)
    f.attackTimer = Math.max(0.28, f.interval / aspdMult(f, bl))
  }
  if (f.attackTimer < 0) f.attackTimer = 0
}

function tickStatus(lane, f, dt) {
  const bl = lane.bl
  const st = f.status
  if (st.stunUntil && st.stunUntil < bl.t) st.stunUntil = 0
  if (st.slowUntil && st.slowUntil < bl.t) { st.slowUntil = 0; st.slowAmt = 0 }
  if (st.aspdUntil && st.aspdUntil < bl.t) { st.aspdUntil = 0; st.aspdMult = 1 }
  if (st.thornsUntil && st.thornsUntil < bl.t) { st.thornsUntil = 0; st.thornsAmt = 0 }

  if (f.flags.regen && f.hp > 0) {
    heal(lane, f, f.maxHp * (f.flags.regen / 100) * dt, true)
  }

  for (let i = st.dots.length - 1; i >= 0; i--) {
    const dot = st.dots[i]
    if (bl.t >= dot.until) { st.dots.splice(i, 1); continue }
    const dmg = dot.dps * dt
    applyDamage(lane, dot.source, f, dmg, { dot: true, unavoidable: true, silent: true, trueDamage: false, armorHalf: true })
    if (Math.random() < dt * 2.2) {
      spawnParticles(lane, f.x, 0.72, dot.color, 1, 0.4)
    }
    if (f.dead) return
  }
}

function performAttack(lane, f, target) {
  const bl = lane.bl
  f.attackCount += 1
  f.anim.atkT = 0.28
  let mult = 1
  if (f.flags.bloodrage && f.hp / f.maxHp < 0.5) mult *= 1.25
  let raw = f.atk * mult * (0.92 + Math.random() * 0.16)
  const crit = Math.random() * 100 < f.crit
  if (crit) raw *= 1.6
  if (f.flags.execute && target.hp / target.maxHp < 0.3) raw *= 1.3
  f.energy = Math.min(100, f.energy + 13 * (f.energyMult || 1))

  if (f.rangeType === 'ranged') {
    spawnProjectile(lane, f, target, raw, crit)
  } else {
    const hx = (f.x + target.x) / 2
    addSlash(lane, hx, 0.74, f.side, crit)
    const dealt = applyDamage(lane, f, target, raw, { crit, melee: true })
    if (dealt > 0) applyOnHit(lane, f, target)
  }

  if (f.passive.key === 'flurry' && f.attackCount % 4 === 0) {
    const extra = f.atk * 0.55
    setTimeout(() => {
      const bl2 = state.battle
      if (!bl2 || lane.resolved || target.dead || f.dead || lane.phase !== 'fight') return
      addSlash(lane, (f.x + target.x) / 2, 0.72, f.side, false)
      const d = applyDamage(lane, f, target, extra, { melee: true })
      if (d > 0) applyOnHit(lane, f, target)
    }, 110)
  }
}

function applyOnHit(lane, f, target) {
  if (target.dead) return
  const bl = lane.bl
  if (f.passive.key === 'venomcoils') addDot(target, f.atk * 0.12, 3, 'poison', '#76e6bb')
  if (f.passive.key === 'tyrantscale') addDot(target, f.atk * 0.10, 2, 'burn', '#ff9a6b')
  if (f.passive.key === 'abyssgrip') addSlow(target, bl, 0.15, 2)
  if (f.flags.frost) addSlow(target, bl, 0.18, 2)
  if (f.flags.ember) addDot(target, f.atk * 0.12, 2, 'burn', '#ff9a6b')
}

function spawnProjectile(lane, f, target, dmg, crit) {
  lane.fx.projectiles.push({
    x: f.x, y: 0.7, tx: target.x, ty: 0.76,
    target, source: f, dmg, crit,
    speed: 1.05 * clamp(lane.H / 100, 0.7, 1.4),
    life: 2.5,
    color: f.accent,
  })
}

function updateProjectiles(lane, dt) {
  const bl = lane.bl
  for (let i = lane.fx.projectiles.length - 1; i >= 0; i--) {
    const p = lane.fx.projectiles[i]
    if (p.target.dead || p.source.dead) { lane.fx.projectiles.splice(i, 1); continue }
    p.tx = p.target.x
    p.ty = 0.76
    const dx = p.tx - p.x, dy = p.ty - p.y
    const dist = Math.hypot(dx, dy)
    p.life -= dt
    if (p.life <= 0) { lane.fx.projectiles.splice(i, 1); continue }
    if (dist < 0.024) {
      const dealt = applyDamage(lane, p.source, p.target, p.dmg, { crit: p.crit, ranged: true })
      if (dealt > 0) applyOnHit(lane, p.source, p.target)
      spawnParticles(lane, p.x, p.y, p.color, 7, 0.6)
      lane.fx.projectiles.splice(i, 1)
      continue
    }
    const step = Math.min(dist, p.speed * dt)
    p.x += dx / dist * step
    p.y += dy / dist * step
    if (Math.random() < dt * 24) {
      lane.fx.particles.push({
        x: p.x, y: p.y, vx: rnd(-8, 8), vy: rnd(-8, 8), life: 0.24, max: 0.24,
        color: p.color, size: 1.5, grav: 0,
      })
    }
  }
}

function addDot(target, dps, dur, type, color) {
  target.status.dots.push({ dps, until: target.bl ? target.bl.t + dur : 0, type, color, source: target.lastHitBy })
  if (target.status.dots.length > 8) target.status.dots.shift()
}

function addSlow(target, bl, amt, dur) {
  if (target.dead) return
  target.status.slowAmt = Math.max(target.status.slowAmt, amt)
  target.status.slowUntil = Math.max(target.status.slowUntil, bl.t + dur)
}

// ───────────────────────────── abilities ─────────────────────────────
function castAbility(lane, f, target) {
  const bl = lane.bl
  const key = f.ability.key
  const power = f.abilityPower || 1
  f.energy = 0
  f.anim.castT = 0.9
  f.castT = 1.5
  f.castName = f.ability.name
  spawnRing(lane, f.x, 0.8, 12, 90, f.accent, 0.65)
  sound.cast()

  const dmg = (mult, opts = {}) => {
    const raw = f.atk * mult * power * (opts.power || 1)
    const dealt = applyDamage(lane, f, target, raw, { ability: true, unavoidable: !!opts.unavoidable, crit: false, ...opts })
    return dealt
  }

  switch (key) {
    case 'pounce': {
      addSlash(lane, target.x, 0.72, f.side, true)
      if (dmg(1.9, { melee: true }) > 0) addDot(target, f.atk * 0.35, 4, 'bleed', '#ff7b78')
      spawnParticles(lane, target.x, 0.76, f.accent, 14, 0.7)
      break
    }
    case 'maul': {
      dmg(1.55, { melee: true })
      if (!target.dead) {
        target.status.stunUntil = Math.max(target.status.stunUntil, bl.t + 1.1)
        floatText(lane, target.x, 0.58, 'STUNNED', '#ffe3a0', 1.1, true)
      }
      lane.fx.shake = 8
      break
    }
    case 'dive': {
      addSlash(lane, target.x, 0.72, f.side, true)
      dmg(2.0, { melee: true })
      f.status.dodgeCharges = (f.status.dodgeCharges || 0) + 2
      f.dodge += 0.14
      spawnParticles(lane, f.x, 0.64, f.accent, 12, 0.5)
      break
    }
    case 'venom': {
      if (dmg(1.15, { ranged: true }) > 0) {
        addDot(target, f.atk * 0.55, 5, 'poison', '#76e6bb')
        addSlow(target, bl, 0.20, 3)
      }
      spawnParticles(lane, target.x, 0.7, '#76e6bb', 14, 0.8)
      break
    }
    case 'guard': {
      f.shield += f.maxHp * 0.32 * (f.shieldPower || 1)
      f.status.thornsUntil = bl.t + 6
      f.status.thornsAmt = Math.max(f.status.thornsAmt, 0.30)
      spawnRing(lane, f.x, 0.82, 20, 110, '#8ee8c4', 0.8)
      floatText(lane, f.x, 0.58, 'GUARD', '#9df2cb', 1.2, true)
      break
    }
    case 'quake': {
      dmg(1.55, { melee: true })
      if (!target.dead) {
        target.status.stunUntil = Math.max(target.status.stunUntil, bl.t + 1.35)
        floatText(lane, target.x, 0.58, 'STUNNED', '#ffe3a0', 1.1, true)
      }
      lane.fx.shake = 12
      spawnRing(lane, target.x, 0.82, 12, 140, '#d9c08c', 0.8)
      break
    }
    case 'drain': {
      const raw = Math.min(target.maxHp * 0.20, f.atk * 2.4) * power
      const dealt = applyDamage(lane, f, target, raw, { ability: true, unavoidable: true })
      if (dealt > 0) heal(lane, f, dealt * 0.8)
      spawnParticles(lane, f.x, 0.66, f.accent, 14, 0.7)
      break
    }
    case 'pyre': {
      if (dmg(2.0, { ranged: true }) > 0) addDot(target, f.atk * 0.35, 4, 'burn', '#ff9a6b')
      spawnParticles(lane, target.x, 0.7, '#ff9a6b', 20, 0.9)
      break
    }
    case 'sting': {
      const raw = f.atk * 1.7 * power
      applyDamage(lane, f, target, raw, { ability: true, crit: true, melee: true })
      if (!target.dead) addDot(target, f.atk * 0.42, 5, 'poison', '#76e6bb')
      addSlash(lane, target.x, 0.72, f.side, true)
      break
    }
    case 'storm': {
      for (let i = 0; i < 5; i++) {
        const raw = f.atk * 0.52 * power
        setTimeout(() => {
          if (!state.battle || lane.resolved || target.dead || f.dead) return
          addSlash(lane, target.x, 0.7 + Math.random() * 0.06, f.side, false)
          applyDamage(lane, f, target, raw, { ability: true, melee: true, silent: i > 0 })
        }, i * 95)
      }
      break
    }
    case 'breath': {
      if (dmg(2.35 * 0.8, { ranged: true }) > 0) addDot(target, f.atk * 0.30, 3, 'burn', '#ff9a6b')
      addBeam(lane, f.x, 0.64, target.x, 0.72, '#ff8a5e')
      spawnParticles(lane, (f.x + target.x) / 2, 0.68, '#ff8a5e', 24, 1.0)
      break
    }
    case 'maelstrom': {
      if (dmg(1.5, { ranged: true }) > 0) {
        addSlow(target, bl, 0.45, 4)
      }
      heal(lane, f, f.maxHp * 0.09)
      spawnRing(lane, target.x, 0.8, 16, 120, '#8ad8e8', 0.8)
      break
    }
  }

  floatText(lane, f.x, 0.52, f.ability.name.toUpperCase(), f.accent, 1.15, true)
  if (target.dead && lane.phase === 'fight') {
    // applyDamage already handled death
  }
}

// ───────────────────────────── damage / death ─────────────────────────────
function applyDamage(lane, source, target, raw, opts = {}) {
  const bl = lane.bl
  if (!target || target.dead || raw <= 0) return 0
  if (!opts.unavoidable) {
    const dodge = (target.dodge || 0) + (target.status.dodgeCharges ? 0.22 : 0)
    if (dodge > 0 && Math.random() < dodge) {
      if (target.status.dodgeCharges) target.status.dodgeCharges -= 1
      floatText(lane, target.x, 0.62, 'MISS', '#b9d7e8', 0.9)
      if (source) source.energy = Math.min(100, source.energy + 3)
      return 0
    }
  }

  let dmg = raw
  if (!opts.trueDamage) {
    const armor = clamp(target.armor, 0, 55) * (opts.armorHalf ? 0.5 : 1) / 100
    dmg *= 1 - armor
  }
  if (opts.bonus) dmg *= opts.bonus

  target.lastHitBy = source
  let absorbed = 0
  if (target.shield > 0) {
    absorbed = Math.min(target.shield, dmg)
    target.shield -= absorbed
    dmg -= absorbed
  }
  target.hp = Math.max(0, target.hp - dmg)
  target.damageTaken += dmg + absorbed
  target.anim.hitT = 0.20
  if (!opts.dot) target.energy = Math.min(100, target.energy + 7 * (target.energyMult || 1))

  if (source && !source.dead) {
    source.damageDealt += dmg + absorbed
    source.energy = Math.min(100, source.energy + (opts.dot ? 0 : 4 * (source.energyMult || 1)))
    if ((source.lifesteal || 0) > 0 && dmg > 0 && !opts.noLifesteal) {
      heal(lane, source, dmg * source.lifesteal, true)
    }
  }

  const x = target.x, y = 0.66
  if (!opts.silent) {
    const shown = Math.max(1, Math.round(dmg + absorbed))
    const color = opts.ability ? '#e6c8ff' : opts.crit ? '#ffe6a6' : absorbed > 0 && dmg <= 0 ? '#a8e5ff' : '#f2e8d4'
    floatText(lane, x + rnd(-0.015, 0.015), y, (opts.crit ? '✧ ' : '') + shown, color, opts.crit ? 1.25 : 1, opts.crit)
    if (absorbed > 0) floatText(lane, x, y - 0.05, 'SHIELD', '#a8e5ff', 0.7)
    spawnParticles(lane, x, 0.74, opts.ability ? '#d9a9ff' : opts.crit ? '#ffdd9c' : '#ffd6b0', opts.crit ? 10 : 4, 0.5)
    lane.fx.shake = Math.max(lane.fx.shake, opts.crit ? 5 : 1.6)
    sound.hit(!!opts.crit)
  }

  // thorn damage
  const thorns = (target.thorns || 0) + (target.status.thornsUntil > bl.t ? target.status.thornsAmt : 0)
  if (thorns > 0 && source && !source.dead && opts.melee) {
    const reflect = dmg * thorns
    if (reflect > 1) {
      source.hp = Math.max(0, source.hp - reflect)
      source.damageTaken += reflect
      floatText(lane, source.x, 0.6, 'THORNS', '#9df2cb', 0.8)
      if (source.hp <= 0) handleDeath(lane, target, source)
    }
  }

  if (target.hp <= 0) handleDeath(lane, source, target)
  return dmg + absorbed
}

function heal(lane, f, amount, silent = false) {
  if (!f || f.dead || amount <= 0) return
  const before = f.hp
  f.hp = Math.min(f.maxHp, f.hp + amount)
  const healed = f.hp - before
  if (healed > 0.5) {
    f.heals += healed
    if (!silent && Math.random() < 0.5) spawnParticles(lane, f.x, 0.72, '#8df0b8', 3, 0.5)
  }
}

function handleDeath(lane, source, target) {
  if (target.dead) return
  const bl = lane.bl

  if (target.flags.reborn && !target.rebornUsed) {
    target.rebornUsed = true
    target.hp = Math.round(target.maxHp * 0.35)
    target.dead = false
    target.anim.deadT = 0
    target.shield = 0
    spawnRing(lane, target.x, 0.82, 15, 130, '#ffc06a', 0.9)
    spawnParticles(lane, target.x, 0.7, '#ffb45e', 30, 1.1)
    floatText(lane, target.x, 0.56, 'REBORN', '#ffc06a', 1.4, true)
    sound.cast()
    return
  }

  target.dead = true
  target.hp = 0
  target.anim.deadT = 0.001
  spawnParticles(lane, target.x, 0.72, target.accent, 26, 1.3)
  spawnRing(lane, target.x, 0.78, 8, 90, target.accent, 0.6)
  floatText(lane, target.x, 0.6, 'SLAIN', '#ff9f8f', 1.2, true)
  sound.hit(true)
  if (source && !source.dead) source.kills += 1

  if (lane.phase !== 'fight') return
  const other = target === lane.ally ? lane.enemy : lane.ally
  if (other.dead) {
    const winner = source && !source.dead ? source : (target.lastHitBy || other)
    resolveLane(lane, winner)
  } else {
    lane.winner = other
    lane.phase = 'push'
    lane.pushT = 0
    lane.el.classList.add('lane-pushing')
    setPhaseText(`${ROMAN[lane.index]} · ${target.name.toUpperCase()} FALLS`, 1.8)
  }
}

function resolveLane(lane, winner) {
  if (lane.resolved) return
  const bl = lane.bl
  lane.resolved = true
  lane.phase = 'resolved'
  lane.winner = winner
  const side = winner?.side || 'ally'
  bl.score[side] += 1
  if (side === 'ally') state.stats.laneWins += 1
  else state.stats.laneLosses += 1
  lane.el.classList.add('lane-resolved', `lane-won-${side}`)
  lane.el.classList.remove('lane-pushing')
  const result = lane.el.querySelector('.lane-result')
  result.className = `lane-result ${side}`
  result.querySelector('.stamp').textContent = side === 'ally' ? 'LANE BREACHED' : 'LANE LOST'
  const gx = side === 'ally' ? 0.95 : 0.05
  spawnParticles(lane, gx, 0.78, side === 'ally' ? '#ffdd9c' : '#ff9b88', 40, 1.7)
  spawnRing(lane, gx, 0.8, 20, 180, side === 'ally' ? '#ffdd9c' : '#ff9b88', 1.2)
  lane.fx.shake = 12
  updateScorePips(bl)
  updateHud(bl)
  setPhaseText(side === 'ally' ? `LANE ${ROMAN[lane.index]} BREACHED` : `LANE ${ROMAN[lane.index]} LOST`, 2.2)
  sound.breach(side === 'ally')
  if (bl.score[side] >= 3) {
    endBattle(side, 'three-lanes')
  } else if (bl.lanes.every(l => l.resolved)) {
    const winnerSide = bl.score.ally > bl.score.enemy ? 'ally' : 'enemy'
    endBattle(winnerSide, 'all-lanes')
  }
}

function endByTime(bl) {
  if (bl.ended) return
  let side
  if (bl.score.ally !== bl.score.enemy) side = bl.score.ally > bl.score.enemy ? 'ally' : 'enemy'
  else {
    const allyHp = bl.lanes.reduce((s, l) => s + Math.max(0, l.ally.hp) / l.ally.maxHp, 0)
    const enemyHp = bl.lanes.reduce((s, l) => s + Math.max(0, l.enemy.hp) / l.enemy.maxHp, 0)
    side = allyHp >= enemyHp ? 'ally' : 'enemy'
  }
  endBattle(side, 'hourglass')
}

function endBattle(side, reason) {
  const bl = state.battle
  if (!bl || bl.ended) return
  bl.ended = true
  bl.phase = 'ended'
  bl.winner = side
  bl.mode = null
  bl.lanes.forEach(l => l.el.classList.remove('targeting', 'swap-first'))
  updateCommandBar(bl)
  showBanner(side === 'ally' ? 'THE FIVE LANES' : 'THE FIVE LANES', side === 'ally' ? 'SECURED' : 'FALTERED')
  setPhaseText(side === 'ally' ? 'TRIAL SECURED' : 'THE LANES FALTER')
  state.stats.damage += bl.lanes.reduce((s, l) => s + (l.ally?.damageDealt || 0), 0)
  if (side === 'ally') sound.win()
  else sound.lose()
  setTimeout(() => emit('battleEnd', { side, reason }), 1650)
}

// ───────────────────────────── input ─────────────────────────────
function bindKeys() {
  if (keyBound) return
  keyBound = true
  window.addEventListener('keydown', e => {
    if (state.view !== 'battle') return
    if (!$('#modalRoot').classList.contains('hidden')) return
    if ($('#overlayRoot').childElementCount) return
    const bl = state.battle
    if (!bl || bl.ended) return
    const key = e.key.toLowerCase()
    if (key === 'escape') { clearMode(); return }
    if (key === 'q') { triggerCommand('rally'); return }
    if (key === 'w') { triggerCommand('aegis'); return }
    if (key === 'e') { triggerCommand('starfall'); return }
    if (key === 'r') { triggerCommand('shift'); return }
    if (/^[1-5]$/.test(key)) {
      const i = Number(key) - 1
      if (bl.mode?.type === 'starfall') castStarfall(bl, i)
      else if (bl.mode?.type === 'swap') handleSwapClick(bl, i)
    }
  })
}

// ───────────────────────────── effects ─────────────────────────────
function spawnParticles(lane, nx, ny, color, count = 8, power = 1) {
  for (let i = 0; i < count; i++) {
    lane.fx.particles.push({
      x: nx + rnd(-0.02, 0.02),
      y: ny + rnd(-0.035, 0.02),
      vx: rnd(-0.16, 0.16) * power,
      vy: rnd(-0.24, 0.04) * power,
      life: rnd(0.35, 0.9) * Math.min(1.5, power),
      max: 1,
      color,
      size: rnd(1.4, 3.5) * power,
      grav: 0.32,
    })
  }
}

function floatText(lane, nx, ny, text, color, scale = 1, crit = false) {
  lane.fx.texts.push({
    x: nx, y: ny, text, color,
    life: crit ? 1.05 : 0.8, max: crit ? 1.05 : 0.8,
    scale, crit, vy: -0.075,
  })
}

function spawnRing(lane, nx, ny, r0, r1, color, dur = 0.6) {
  lane.fx.rings.push({ x: nx, y: ny, r0, r1, color, life: dur, max: dur })
}

function addSlash(lane, nx, ny, side, crit) {
  lane.fx.slashes.push({ x: nx, y: ny, side, crit, life: 0.28, max: 0.28 })
}

function addBeam(lane, x1, y1, x2, y2, color) {
  lane.fx.beams ||= []
  lane.fx.beams.push({ x1, y1, x2, y2, color, life: 0.55, max: 0.55 })
}

function addMeteor(lane, nx, ny, dur) {
  lane.fx.meteors.push({ x: nx, y: ny, life: dur, max: dur })
}

function updateMeteors(lane, dt) {
  const bl = lane.bl
  const pm = lane.fx.pendingMeteor
  if (pm && bl.t >= pm.at) {
    lane.fx.pendingMeteor = null
    if (!pm.target.dead) {
      applyDamage(lane, pm.source, pm.target, pm.raw, { ability: true, unavoidable: true, armorHalf: true, noLifesteal: true })
      if (!pm.target.dead) addDot(pm.target, pm.burnDps, 4, 'burn', '#ff9a6b')
      spawnParticles(lane, pm.target.x, 0.74, '#ffb06e', 30, 1.4)
      spawnParticles(lane, pm.target.x, 0.74, '#ffe2b0', 14, 0.8)
      spawnRing(lane, pm.target.x, 0.82, 12, 190, '#ffb06e', 0.9)
      lane.fx.shake = 14
      sound.hit(true)
    }
  }
}

function updateFx(lane, dt) {
  const fx = lane.fx
  if (fx.shake > 0.1) fx.shake *= Math.pow(0.02, dt)
  else fx.shake = 0
  for (let i = fx.particles.length - 1; i >= 0; i--) {
    const p = fx.particles[i]
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vy += p.grav * dt
    p.life -= dt
    if (p.life <= 0) fx.particles.splice(i, 1)
  }
  for (let i = fx.texts.length - 1; i >= 0; i--) {
    const t = fx.texts[i]
    t.y += t.vy * dt
    t.life -= dt
    if (t.life <= 0) fx.texts.splice(i, 1)
  }
  for (let i = fx.rings.length - 1; i >= 0; i--) {
    const r = fx.rings[i]
    r.life -= dt
    if (r.life <= 0) fx.rings.splice(i, 1)
  }
  for (let i = fx.slashes.length - 1; i >= 0; i--) {
    const s = fx.slashes[i]
    s.life -= dt
    if (s.life <= 0) fx.slashes.splice(i, 1)
  }
  if (fx.meteors) {
    for (let i = fx.meteors.length - 1; i >= 0; i--) {
      fx.meteors[i].life -= dt
      if (fx.meteors[i].life <= 0) fx.meteors.splice(i, 1)
    }
  }
  if (fx.beams) {
    for (let i = fx.beams.length - 1; i >= 0; i--) {
      fx.beams[i].life -= dt
      if (fx.beams[i].life <= 0) fx.beams.splice(i, 1)
    }
  }
}

// ───────────────────────────── drawing ─────────────────────────────
function drawBattle(bl) {
  for (const lane of bl.lanes) {
    if (!lane.W || !lane.bgCanvas) continue
    drawLane(lane)
  }
}

function drawLane(lane) {
  const { ctx, W, H, dpr, bl } = lane
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, W, H)
  ctx.save()
  if (lane.fx.shake > 0.2) {
    ctx.translate(rnd(-lane.fx.shake, lane.fx.shake), rnd(-lane.fx.shake * 0.5, lane.fx.shake * 0.5))
  }
  ctx.drawImage(lane.bgCanvas, 0, 0, W, H)
  drawMotes(lane)
  drawGroundAura(lane, lane.ally)
  drawGroundAura(lane, lane.enemy)
  drawFighter(lane, lane.ally, false)
  drawFighter(lane, lane.enemy, true)
  drawProjectiles(lane)
  drawMeteors(lane)
  drawBeams(lane)
  drawSlashes(lane)
  drawRings(lane)
  drawParticles(lane)
  drawTexts(lane)
  ctx.restore()
}

function drawMotes(lane) {
  const { ctx, W, H, bl } = lane
  const terr = TERRAINS[lane.index]
  const t = bl.t
  ctx.save()
  for (let i = 0; i < 12; i++) {
    const seed = i * 91.7
    const x = ((seed * 13.3 + t * (5 + i * 1.2)) % (W + 80)) - 40
    const y = H * (0.18 + ((i * 0.173 + Math.sin(t * 0.3 + i) * 0.04) % 0.66))
    const a = 0.05 + 0.05 * Math.sin(t * 1.3 + i)
    ctx.fillStyle = `rgba(255,255,255,${a})`
    ctx.beginPath(); ctx.arc(x, y, 0.9 + (i % 3) * 0.5, 0, Math.PI * 2); ctx.fill()
  }
  // drifting terrain embers
  for (let i = 0; i < 5; i++) {
    const x = (W * 0.2 + i * W * 0.15 + Math.sin(t * 0.7 + i * 1.7) * 18) % W
    const y = H * (0.3 + 0.4 * ((i * 0.27 + Math.sin(t * 0.4 + i) * 0.05) % 1))
    ctx.fillStyle = terr.color + '22'
    ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

function drawGroundAura(lane, f) {
  if (!f || f.dead) return
  const { ctx, W, H } = lane
  const x = f.x * W
  const y = H * 0.855
  const scale = clamp(H / 118, 0.58, 0.98)
  ctx.save()
  const g = ctx.createRadialGradient(x, y, 2, x, y, 62 * scale)
  g.addColorStop(0, (f.accent || '#ffffff') + '2a')
  g.addColorStop(0.6, (f.accent || '#ffffff') + '0a')
  g.addColorStop(1, (f.accent || '#ffffff') + '00')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.ellipse(x, y, 66 * scale, 13 * scale, 0, 0, Math.PI * 2); ctx.fill()
  if (f.resonant) {
    ctx.strokeStyle = f.resonant.color + '55'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 5])
    ctx.beginPath(); ctx.ellipse(x, y, 46 * scale, 9 * scale, 0, 0, Math.PI * 2); ctx.stroke()
  }
  ctx.restore()
}

function drawFighter(lane, f, isEnemy) {
  const { ctx, W, H, bl } = lane
  const x = f.x * W
  const ground = H * 0.855
  const scale = clamp(H / 118, 0.58, 0.98) * (f.isBoss ? 1.12 : 1)
  const deadT = f.dead ? f.anim.deadT : 0
  if (f.dead && deadT > 1.15) return
  const alpha = f.dead ? clamp(1 - deadT / 1.15, 0, 1) : 1
  const y = ground - (f.dead ? deadT * 16 : 0)
  ctx.save()
  ctx.globalAlpha = alpha

  if (f.dead) {
    f.anim.deadT += 0 // incremented in updateFx? handled in loop below
  }

  // shield dome
  if (!f.dead && f.shield > 1) {
    ctx.save()
    ctx.strokeStyle = 'rgba(156,224,255,.5)'
    ctx.fillStyle = 'rgba(120,200,255,.07)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.ellipse(x, ground - 44 * scale, 42 * scale, 55 * scale, 0, 0, Math.PI * 2)
    ctx.fill(); ctx.stroke()
    ctx.restore()
  }

  // stun orbit
  if (!f.dead && f.status.stunUntil > bl.t) {
    ctx.save()
    ctx.fillStyle = '#ffe6a6'
    for (let i = 0; i < 3; i++) {
      const a = bl.t * 5 + i * (Math.PI * 2 / 3)
      ctx.beginPath()
      ctx.arc(x + Math.cos(a) * 22 * scale, ground - 90 * scale + Math.sin(a) * 6 * scale, 2.1 * scale, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  drawCreature(ctx, {
    silhouette: f.silhouette || 'beast',
    extra: f.extra || null,
    x, y,
    scale,
    facing: isEnemy ? -1 : 1,
    t: bl.t + (f.phaseOffset || 0),
    moving: f.moving,
    attack: f.anim.atkT > 0 ? 1 - f.anim.atkT / 0.28 : 0,
    flash: f.anim.hitT > 0 ? (f.anim.hitT / 0.2) * 0.7 : 0,
    alpha,
    color: f.color,
    accent: f.accent,
    deep: f.deep,
    soft: f.soft,
    extraAccent: f.extraAccent || null,
  })

  // health sliver
  if (!f.dead) {
    const bw = 56 * scale
    const bh = 3.4 * scale
    const bx = x - bw / 2
    const by = ground - 96 * scale
    ctx.fillStyle = 'rgba(4,7,12,.7)'
    ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2)
    const pct = clamp(f.hp / f.maxHp, 0, 1)
    const hg = ctx.createLinearGradient(bx, 0, bx + bw, 0)
    if (isEnemy) { hg.addColorStop(0, '#c0523f'); hg.addColorStop(1, '#ffa48f') }
    else { hg.addColorStop(0, '#4c9fc4'); hg.addColorStop(1, '#a5e9ff') }
    ctx.fillStyle = hg
    ctx.fillRect(bx, by, bw * pct, bh)
    if (f.shield > 1) {
      ctx.fillStyle = 'rgba(190,235,255,.8)'
      ctx.fillRect(bx + bw * pct, by, Math.min(bw * (1 - pct), bw * f.shield / f.maxHp), bh)
    }
  }

  // cast name
  if (f.castT > 0 && !f.dead) {
    ctx.save()
    ctx.globalAlpha = clamp(f.castT, 0, 1)
    ctx.font = `700 ${Math.round(9 * scale)}px Cinzel, serif`
    ctx.textAlign = 'center'
    ctx.fillStyle = f.accent
    ctx.shadowColor = f.accent
    ctx.shadowBlur = 10
    ctx.fillText(f.castName.toUpperCase(), x, ground - 110 * scale)
    ctx.restore()
  }

  ctx.restore()
  // death animation timer
  if (f.dead) f.anim.deadT += 0.016
}

function drawProjectiles(lane) {
  const { ctx, W, H } = lane
  for (const p of lane.fx.projectiles) {
    const x = p.x * W, y = p.y * H
    const px = (p.x - Math.sign(p.tx - p.x) * 0.035) * W
    const py = (p.y - 0.005) * H
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const g = ctx.createLinearGradient(px, py, x, y)
    g.addColorStop(0, p.color + '00')
    g.addColorStop(1, p.color + 'cc')
    ctx.strokeStyle = g
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke()
    const rg = ctx.createRadialGradient(x, y, 0, x, y, 9)
    rg.addColorStop(0, '#ffffff')
    rg.addColorStop(0.35, p.color)
    rg.addColorStop(1, p.color + '00')
    ctx.fillStyle = rg
    ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }
}

function drawMeteors(lane) {
  const { ctx, W, H } = lane
  for (const m of lane.fx.meteors) {
    const prog = 1 - m.life / m.max
    const tx = m.x * W, ty = m.y * H
    const sx = tx + (1 - prog) * W * 0.16
    const sy = ty - (1 - prog) * H * 1.35
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const g = ctx.createLinearGradient(sx, sy, tx, ty)
    g.addColorStop(0, 'rgba(255,180,110,0)')
    g.addColorStop(0.6, 'rgba(255,170,90,.7)')
    g.addColorStop(1, '#ffe0a8')
    ctx.strokeStyle = g
    ctx.lineWidth = 4 + prog * 5
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.stroke()
    const rg = ctx.createRadialGradient(tx, ty, 0, tx, ty, 20 + prog * 20)
    rg.addColorStop(0, 'rgba(255,240,200,.95)')
    rg.addColorStop(0.4, 'rgba(255,160,90,.75)')
    rg.addColorStop(1, 'rgba(255,120,60,0)')
    ctx.fillStyle = rg
    ctx.beginPath(); ctx.arc(tx, ty, 20 + prog * 20, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }
}

function drawBeams(lane) {
  if (!lane.fx.beams) return
  const { ctx, W, H } = lane
  for (const b of lane.fx.beams) {
    const a = b.life / b.max
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = a
    const g = ctx.createLinearGradient(b.x1 * W, b.y1 * H, b.x2 * W, b.y2 * H)
    g.addColorStop(0, b.color + '22')
    g.addColorStop(0.6, b.color + 'bb')
    g.addColorStop(1, '#fff3d8')
    ctx.strokeStyle = g
    ctx.lineWidth = 10
    ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(b.x1 * W, b.y1 * H); ctx.lineTo(b.x2 * W, b.y2 * H); ctx.stroke()
    ctx.lineWidth = 2
    ctx.strokeStyle = '#fff8e8'
    ctx.stroke()
    ctx.restore()
  }
}

function drawSlashes(lane) {
  const { ctx, W, H } = lane
  for (const s of lane.fx.slashes) {
    const p = clamp(1 - s.life / s.max, 0, 1)
    const x = s.x * W, y = s.y * H
    const r = (18 + p * 16) * clamp(H / 100, 0.7, 1.3)
    ctx.save()
    ctx.globalAlpha = Math.sin(p * Math.PI) * 0.95
    ctx.globalCompositeOperation = 'lighter'
    ctx.strokeStyle = s.crit ? '#ffe8b0' : '#e8f4ff'
    ctx.lineWidth = s.crit ? 3.4 : 2
    ctx.shadowColor = s.crit ? '#ffd58a' : '#b9eaff'
    ctx.shadowBlur = 10
    ctx.beginPath()
    const start = s.side === 'ally' ? -1.35 : Math.PI + 1.35
    const end = s.side === 'ally' ? 0.9 : Math.PI - 0.9
    ctx.arc(x, y, r, start, end)
    ctx.stroke()
    ctx.restore()
  }
}

function drawRings(lane) {
  const { ctx, W, H } = lane
  for (const r of lane.fx.rings) {
    const p = clamp(1 - r.life / r.max, 0, 1)
    const rad = (r.r0 + (r.r1 - r.r0) * p) * clamp(H / 100, 0.7, 1.3)
    ctx.save()
    ctx.globalAlpha = (1 - p) * 0.85
    ctx.strokeStyle = r.color
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.ellipse(r.x * W, r.y * H, rad, rad * 0.36, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }
}

function drawParticles(lane) {
  const { ctx, W, H } = lane
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const p of lane.fx.particles) {
    const a = clamp(p.life / (p.max || 0.8), 0, 1)
    ctx.globalAlpha = a
    ctx.fillStyle = p.color
    const s = p.size * clamp(H / 100, 0.7, 1.3)
    ctx.beginPath(); ctx.arc(p.x * W, p.y * H, s, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

function drawTexts(lane) {
  const { ctx, W, H } = lane
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const t of lane.fx.texts) {
    const a = clamp(t.life / t.max, 0, 1)
    ctx.globalAlpha = a
    const size = (t.crit ? 11 : 8.5) * (t.scale || 1) * clamp(H / 100, 0.72, 1.35)
    ctx.font = `800 ${Math.round(size)}px Manrope, sans-serif`
    ctx.fillStyle = t.color
    ctx.shadowColor = 'rgba(0,0,0,.85)'
    ctx.shadowBlur = 5
    ctx.fillText(t.text, t.x * W, t.y * H)
  }
  ctx.restore()
}

// ───────────────────────────── background ─────────────────────────────
function buildLaneBackground(lane) {
  const { W, H, dpr, index } = lane
  const terr = TERRAINS[index]
  const c = document.createElement('canvas')
  c.width = Math.round(W * dpr)
  c.height = Math.round(H * dpr)
  const x = c.getContext('2d')
  x.setTransform(dpr, 0, 0, dpr, 0, 0)

  const g = x.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#070b13')
  g.addColorStop(0.42, terr.tint)
  g.addColorStop(0.7, mixDark(terr.tint, 0.55))
  g.addColorStop(1, '#060910')
  x.fillStyle = g
  x.fillRect(0, 0, W, H)

  // central glow
  const cg = x.createRadialGradient(W / 2, H * 0.55, 4, W / 2, H * 0.55, W * 0.44)
  cg.addColorStop(0, hexA(terr.color, 0.10))
  cg.addColorStop(0.55, hexA(terr.color, 0.035))
  cg.addColorStop(1, hexA(terr.color, 0))
  x.fillStyle = cg
  x.fillRect(0, 0, W, H)

  // gate glows
  for (const [gx, color] of [[-0.02, '#81d7ff'], [1.02, '#ff8b78']]) {
    const gg = x.createRadialGradient(W * gx, H * 0.6, 0, W * gx, H * 0.6, W * 0.18)
    gg.addColorStop(0, hexA(color, 0.30))
    gg.addColorStop(0.5, hexA(color, 0.08))
    gg.addColorStop(1, hexA(color, 0))
    x.fillStyle = gg
    x.fillRect(0, 0, W, H)
  }

  // sigil rings
  x.save()
  x.translate(W / 2, H * 0.56)
  x.scale(1, 0.72)
  const base = Math.min(W * 0.16, H * 0.62)
  x.strokeStyle = hexA(terr.color, 0.12)
  x.lineWidth = 1
  x.beginPath(); x.arc(0, 0, base, 0, Math.PI * 2); x.stroke()
  x.setLineDash([4, 9])
  x.strokeStyle = hexA(terr.color, 0.10)
  x.beginPath(); x.arc(0, 0, base * 1.34, 0, Math.PI * 2); x.stroke()
  x.setLineDash([])
  x.restore()

  // giant roman numeral
  x.save()
  x.font = `700 ${Math.round(H * 0.52)}px Cinzel, Georgia, serif`
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  x.fillStyle = hexA(terr.color, 0.035)
  x.fillText(ROMAN[index], W / 2, H * 0.52)
  x.restore()

  // lane ticks
  x.strokeStyle = 'rgba(200,215,240,.045)'
  x.lineWidth = 1
  for (let i = 1; i < 10; i++) {
    const px = W * i / 10
    x.beginPath(); x.moveTo(px, H * 0.2); x.lineTo(px, H * 0.88); x.stroke()
  }

  // rails / gate lines
  const floor = H * 0.855
  const fg = x.createLinearGradient(0, 0, W, 0)
  fg.addColorStop(0, hexA('#81d7ff', 0.55))
  fg.addColorStop(0.16, hexA(terr.color, 0.16))
  fg.addColorStop(0.5, hexA(terr.color, 0.34))
  fg.addColorStop(0.84, hexA(terr.color, 0.16))
  fg.addColorStop(1, hexA('#ff8b78', 0.55))
  x.strokeStyle = fg
  x.lineWidth = 1
  x.beginPath(); x.moveTo(0, floor); x.lineTo(W, floor); x.stroke()

  const fl = x.createRadialGradient(W / 2, floor, 0, W / 2, floor, W * 0.55)
  fl.addColorStop(0, hexA(terr.color, 0.08))
  fl.addColorStop(1, hexA(terr.color, 0))
  x.fillStyle = fl
  x.fillRect(0, floor - H * 0.18, W, H * 0.18)

  // gate pillars
  for (const [gx, color] of [[0.012, '#81d7ff'], [0.988, '#ff8b78']]) {
    const pg = x.createLinearGradient(W * gx, 0, W * gx, H)
    pg.addColorStop(0, hexA(color, 0))
    pg.addColorStop(0.45, hexA(color, 0.35))
    pg.addColorStop(0.85, hexA(color, 0.1))
    pg.addColorStop(1, hexA(color, 0))
    x.strokeStyle = pg
    x.lineWidth = 2
    x.beginPath(); x.moveTo(W * gx, H * 0.12); x.lineTo(W * gx, H * 0.9); x.stroke()
  }

  // top / bottom vignette
  const vg = x.createLinearGradient(0, 0, 0, H)
  vg.addColorStop(0, 'rgba(4,6,11,.55)')
  vg.addColorStop(0.18, 'rgba(4,6,11,0)')
  vg.addColorStop(0.86, 'rgba(4,6,11,0)')
  vg.addColorStop(1, 'rgba(4,6,11,.6)')
  x.fillStyle = vg
  x.fillRect(0, 0, W, H)

  return c
}

function hexA(hex, a) {
  const n = parseInt(hex.replace('#', ''), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}
function mixDark(hex, amt) {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.round(((n >> 16) & 255) * amt)
  const g = Math.round(((n >> 8) & 255) * amt)
  const b = Math.round((n & 255) * amt)
  return `rgb(${r},${g},${b})`
}
