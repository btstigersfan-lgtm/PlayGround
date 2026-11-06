// ─────────────────────────────────────────────────────────────
//  CHIMERA — entry point, run loop, overlays
// ─────────────────────────────────────────────────────────────
import {
  state, $, ROMAN, TOTAL_ROUNDS, BOONS, LINEUPS, sound, on, resetRun, setSound,
  updateSoundButton, toast, buildEnemyLineup,
} from './core.js'
import { initPrep, showPrep, updateHeader, healFighters } from './prep.js'
import { startBattle, stopBattle } from './battle.js'
import { renderPortrait } from './creature.js'

const overlayRoot = $('#overlayRoot')

let battleEndBound = false
let runEnding = false

// ───────────────────────────── boot ─────────────────────────────
function boot() {
  resetRun()
  sound.enabled = state.soundOn
  updateSoundButton()
  initPrep()
  wireChrome()
  if (!battleEndBound) {
    on('battleEnd', handleBattleEnd)
    battleEndBound = true
  }
  showPrep()
}

function wireChrome() {
  $('#soundBtn').addEventListener('click', () => {
    sound.init()
    setSound(!state.soundOn)
    if (state.soundOn) sound.click()
  })

  $('#infoBtn').addEventListener('click', () => {
    sound.init()
    sound.click()
    $('#modalRoot').classList.remove('hidden')
  })

  document.querySelectorAll('[data-close-modal]').forEach(el => {
    el.addEventListener('click', closeInfo)
  })

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#modalRoot').classList.contains('hidden')) closeInfo()
  })

  window.addEventListener('pointerdown', () => sound.init(), { once: true })

  overlayRoot.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]')
    if (!btn) return
    const action = btn.dataset.action
    if (action === 'boons') showBoons()
    else if (action === 'retry') {
      closeOverlay()
      healFighters()
      startBattle()
      toast('The covenant is rebuilt. The horn sounds again.')
    } else if (action === 'lab') {
      closeOverlay()
      healFighters()
      showPrep()
    } else if (action === 'new-run') {
      startNewRun()
    }
  })
}

function closeInfo() {
  $('#modalRoot').classList.add('hidden')
}

// ───────────────────────────── overlay helpers ─────────────────────────────
function showOverlay(html, wide = false) {
  overlayRoot.innerHTML = `<div class="overlay"><div class="overlay-panel${wide ? ' wide' : ''}">${html}</div></div>`
  return overlayRoot.querySelector('.overlay-panel')
}

function closeOverlay() {
  overlayRoot.innerHTML = ''
}

function laneStrips(bl) {
  if (!bl) return ''
  return `<div class="result-lanes">${bl.lanes.map(lane => {
    const side = lane.winner?.side || ''
    return `<i class="${side}"></i>`
  }).join('')}</div>`
}

function findMvp(bl) {
  if (!bl) return null
  let best = null
  for (const lane of bl.lanes) {
    const f = lane.ally
    if (!f) continue
    if (!best || f.damageDealt > best.damageDealt) best = f
  }
  return best
}

function mvpMarkup(bl) {
  const mvp = findMvp(bl)
  if (!mvp) return ''
  return `
    <div class="mvp-row">
      <div class="mvp-art"><canvas></canvas></div>
      <div class="mvp-copy">
        <div class="mvp-kicker">Champion of the trial</div>
        <div class="mvp-name">${mvp.name}</div>
        <div class="mvp-stat"><b>${Math.round(mvp.damageDealt)}</b> damage dealt · <b>${mvp.kills}</b> slain · ${mvp.role}</div>
      </div>
    </div>`
}

function paintMvp(panel) {
  const bl = state.battle
  const mvp = findMvp(bl)
  const canvas = panel?.querySelector('.mvp-art canvas')
  if (!mvp || !canvas) return
  renderPortrait(canvas, mvp, { size: 112, ring: true, showPedestal: false })
}

// ───────────────────────────── battle resolution ─────────────────────────────
function handleBattleEnd({ side }) {
  const bl = state.battle
  stopBattle()
  if (!bl || runEnding) return

  if (side === 'ally') {
    state.aether += 2
    state.stats.roundsWon += 1
    updateHeader()
    showVictory(bl)
  } else {
    state.embers = Math.max(0, state.embers - 1)
    state.aether += 1
    updateHeader()
    if (state.embers <= 0) showRunDefeat(bl)
    else showLoss(bl)
  }
}

function showVictory(bl) {
  if (state.round >= TOTAL_ROUNDS) {
    showFinalVictory()
    return
  }
  const panel = showOverlay(`
    <div class="overlay-kicker"><span class="rule"></span> TRIAL ${ROMAN[state.round - 1]} SECURED <span class="rule"></span></div>
    <h2 class="overlay-title">THE LANES HOLD</h2>
    <p class="overlay-sub">${LINEUPS[state.round - 1].name} is broken</p>
    <div class="result-strip">
      <div class="result-side ally"><div class="rs-label">Your chimeras</div><div class="rs-score">${bl.score.ally}</div></div>
      <div class="result-dash">—</div>
      <div class="result-side enemy"><div class="rs-label">The rival covenant</div><div class="rs-score">${bl.score.enemy}</div></div>
    </div>
    ${laneStrips(bl)}
    <div class="reward-row" style="margin-top:16px">
      <span class="reward-pill">+2 <b>AETHER</b></span>
      <span class="reward-pill">◆ <b>BOON</b> EARNED</span>
      <span class="reward-pill">TRIAL <b>${ROMAN[state.round - 1]}</b> CLEARED</span>
    </div>
    ${mvpMarkup(bl)}
    <div class="overlay-actions">
      <button class="primary-btn" data-action="boons"><span class="btn-sheen"></span><span class="btn-label">CLAIM YOUR BOON</span></button>
    </div>`)
  paintMvp(panel)
  sound.win()
}

function showLoss(bl) {
  const panel = showOverlay(`
    <div class="overlay-kicker"><span class="rule"></span> AN EMBER IS SPENT <span class="rule"></span></div>
    <h2 class="overlay-title defeat">THE LANES FALTER</h2>
    <p class="overlay-sub">${state.embers} ember${state.embers === 1 ? '' : 's'} remain · ${LINEUPS[state.round - 1].name} endures</p>
    <div class="result-strip">
      <div class="result-side ally"><div class="rs-label">Your chimeras</div><div class="rs-score">${bl.score.ally}</div></div>
      <div class="result-dash">—</div>
      <div class="result-side enemy"><div class="rs-label">The rival covenant</div><div class="rs-score">${bl.score.enemy}</div></div>
    </div>
    ${laneStrips(bl)}
    <div class="reward-row" style="margin-top:16px">
      <span class="reward-pill">+1 <b>AETHER</b> SALVAGED</span>
      <span class="reward-pill"><b>${state.embers}</b> EMBER${state.embers === 1 ? '' : 'S'} REMAIN</span>
    </div>
    ${mvpMarkup(bl)}
    <div class="overlay-actions">
      <button class="primary-btn" data-action="retry"><span class="btn-sheen"></span><span class="btn-label">FIGHT AGAIN</span></button>
      <button class="ghost-btn" data-action="lab">RETURN TO THE LAB</button>
    </div>`)
  paintMvp(panel)
  sound.lose()
}

function showRunDefeat(bl) {
  state.runOver = true
  runEnding = true
  updateHeader()
  try { localStorage.setItem('chimera-best', String(Math.max(Number(localStorage.getItem('chimera-best') || 0), state.stats.roundsWon))) } catch {}
  const panel = showOverlay(`
    <div class="overlay-kicker"><span class="rule"></span> THE DREAM FADES <span class="rule"></span></div>
    <h2 class="overlay-title defeat">THE LAST EMBER DIES</h2>
    <p class="overlay-sub">The First Chimera keeps its crown</p>
    <div class="result-strip">
      <div class="result-side ally"><div class="rs-label">Trials cleared</div><div class="rs-score">${state.stats.roundsWon}</div></div>
      <div class="result-dash">/</div>
      <div class="result-side enemy"><div class="rs-label">The five trials</div><div class="rs-score">${TOTAL_ROUNDS}</div></div>
    </div>
    <div class="reward-row" style="margin-top:16px">
      <span class="reward-pill"><b>${state.stats.fusions}</b> FUSIONS</span>
      <span class="reward-pill"><b>${state.stats.laneWins}</b> LANES WON</span>
      <span class="reward-pill"><b>${state.stats.laneLosses}</b> LANES LOST</span>
    </div>
    ${mvpMarkup(bl)}
    <div class="overlay-actions">
      <button class="primary-btn" data-action="new-run"><span class="btn-sheen"></span><span class="btn-label">BEGIN A NEW DREAM</span></button>
    </div>`)
  paintMvp(panel)
  sound.lose()
}

function showFinalVictory() {
  state.runOver = true
  runEnding = true
  updateHeader()
  try { localStorage.setItem('chimera-victories', String(Number(localStorage.getItem('chimera-victories') || 0) + 1)) } catch {}
  showOverlay(`
    <div class="overlay-kicker"><span class="rule"></span> THE FIRST CHIMERA FALLS <span class="rule"></span></div>
    <h2 class="overlay-title">ASCENDANT</h2>
    <p class="overlay-sub">Every shape has been worn. Every shape has been beaten.</p>
    <div class="result-strip">
      <div class="result-side ally"><div class="rs-label">Trials cleared</div><div class="rs-score">V</div></div>
      <div class="result-dash">/</div>
      <div class="result-side enemy"><div class="rs-label">Chimeras fused</div><div class="rs-score">${state.stats.fusions}</div></div>
    </div>
    <div class="reward-row" style="margin-top:16px">
      <span class="reward-pill"><b>${state.stats.laneWins}</b> LANES WON</span>
      <span class="reward-pill"><b>${state.stats.laneLosses}</b> LANES LOST</span>
      <span class="reward-pill"><b>${Math.round(state.stats.damage)}</b> DAMAGE</span>
      <span class="reward-pill"><b>${state.embers}</b> EMBER${state.embers === 1 ? '' : 'S'} SPARED</span>
    </div>
    <div class="overlay-actions">
      <button class="primary-btn" data-action="new-run"><span class="btn-sheen"></span><span class="btn-label">BEGIN A NEW DREAM</span></button>
    </div>`)
  sound.win()
}

// ───────────────────────────── boons & next trial ─────────────────────────────
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function showBoons() {
  closeOverlay()
  sound.init()
  const available = BOONS.filter(b => !state.boons.includes(b.id))
  const pool = available.length >= 3 ? available : BOONS
  const picks = shuffle(pool).slice(0, 3)
  const panel = showOverlay(`
    <div class="overlay-kicker"><span class="rule"></span> THE TRIAL YIELDS <span class="rule"></span></div>
    <h2 class="overlay-title">CLAIM A BOON</h2>
    <p class="overlay-sub">One gift carries into the next trial</p>
    <div class="boon-grid">
      ${picks.map(b => `
        <button class="boon-card" data-boon="${b.id}">
          <span class="boon-icon">${b.icon}</span>
          <span class="boon-tag">${b.tag}</span>
          <span class="boon-name">${b.name}</span>
          <span class="boon-desc">${b.desc}</span>
          <span class="boon-pick">◈ CLAIM THIS BOON</span>
        </button>`).join('')}
    </div>`, true)

  panel.querySelectorAll('[data-boon]').forEach(btn => {
    btn.addEventListener('click', () => {
      const boon = BOONS.find(b => b.id === btn.dataset.boon)
      if (!boon) return
      boon.apply(state)
      state.boons.push(boon.id)
      sound.fuse()
      closeOverlay()
      toast(`${boon.name} — claimed.`)
      advanceTrial()
    })
  })
}

function advanceTrial() {
  if (state.round >= TOTAL_ROUNDS) {
    showFinalVictory()
    return
  }
  state.round += 1
  state.lineup = buildEnemyLineup(state.round)
  healFighters()
  updateHeader()
  showPrep()
  const def = LINEUPS[state.round - 1]
  toast(`Trial ${ROMAN[state.round - 1]} — ${def.name} awaits.`)
}

function startNewRun() {
  closeOverlay()
  stopBattle()
  runEnding = false
  resetRun()
  sound.enabled = state.soundOn
  showPrep()
  toast('A new covenant begins.')
}

boot()
