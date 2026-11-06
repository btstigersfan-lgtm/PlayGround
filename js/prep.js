// ─────────────────────────────────────────────────────────────
//  CHIMERA — fusion lab
// ─────────────────────────────────────────────────────────────
import {
  state, $, $$, clamp, cap, fmt, ROMAN, TERRAINS, ESSENCES, ESSENCE_BY_ID,
  FAMILIES, MUTATION_BY_ID, TOTAL_ROUNDS, LINEUPS, sound, toast, emit,
  effectivePlayer, powerOf, previewChimera, buildEnemyLineup, familyInfo, terrainFor,
  on,
} from './core.js'
import { renderPortrait, drawPortraitFrame } from './creature.js'
import { startBattle } from './battle.js'

let previewTarget = null
let previewRaf = null

export function showPrep() {
  state.view = 'prep'
  state.battle = null
  $('#prepView').classList.remove('hidden')
  $('#battleView').classList.add('hidden')
  const stack = $('#toastStack')
  if (stack) stack.innerHTML = ''
  window.scrollTo(0, 0)
  updateHeader()
  renderPrep()
  if (!previewRaf) previewRaf = requestAnimationFrame(animatePreview)
}

function animatePreview(now) {
  previewRaf = requestAnimationFrame(animatePreview)
  if (state.view !== 'prep' || !previewTarget) return
  const { canvas, fighter, size } = previewTarget
  if (!canvas.isConnected) { previewTarget = null; return }
  drawPortraitFrame(canvas, fighter, { size, t: now / 1000, animate: true })
}

export function updateHeader() {
  const def = LINEUPS[state.round - 1]
  $('#roundLabel').textContent = `TRIAL ${ROMAN[state.round - 1] || 'I'} / V`
  $('#roundTitle').textContent = def ? def.name : 'THE THORNWILD'
  $('#aetherCount').textContent = state.aether
  $('#emberCount').textContent = state.embers
  const pips = $('#roundPips')
  pips.innerHTML = ''
  for (let i = 0; i < TOTAL_ROUNDS; i++) {
    const d = document.createElement('span')
    d.className = 'round-pip'
    if (i < state.stats.roundsWon) d.classList.add('done')
    else if (i === state.round - 1 && !state.runOver) d.classList.add('current')
    else if (i === state.round - 1 && state.runOver) d.classList.add('failed')
    pips.appendChild(d)
  }
}

export function initPrep() {
  buildEssenceGrid()
  $('#battleBtn').addEventListener('click', () => {
    if (state.fighters.some(f => !f)) {
      toast('Every lane must be garrisoned.', true)
      return
    }
    sound.click()
    startBattle()
  })
  on('runReset', () => { previewTarget = null; showPrep() })
}

// ───────────────────────── essence vault ─────────────────────────
function buildEssenceGrid() {
  const grid = $('#essenceGrid')
  grid.innerHTML = ''
  for (const e of ESSENCES) {
    const fam = familyInfo(e.family)
    const card = document.createElement('button')
    card.className = 'essence-card'
    card.dataset.id = e.id
    card.title = `${e.name} — ${fam.name} ${e.role}\nPrime active: ${e.ability.name} — ${e.ability.desc}\nSeed passive: ${e.passive.name} — ${e.passive.desc}`
    card.innerHTML = `
      <span class="e-art"></span>
      <span class="e-copy">
        <span class="e-name">${e.name}</span>
        <span class="e-meta"><span class="family-dot" style="background:${fam.color};box-shadow:0 0 5px ${fam.color}"></span>${fam.name}<span class="e-role">· ${e.role}</span></span>
      </span>
      <span class="pick-badge hidden">I</span>`
    const art = card.querySelector('.e-art')
    const canvas = document.createElement('canvas')
    art.appendChild(canvas)
    renderPortrait(canvas, e, { size: 84, ring: true, showPedestal: false, pickT: 1.1 })
    card.addEventListener('click', () => selectEssence(e.id))
    grid.appendChild(card)
  }
}

function selectEssence(id) {
  sound.click()
  if (state.prime === id) {
    state.prime = null
  } else if (!state.prime) {
    state.prime = id
  } else if (state.seed === id) {
    state.seed = null
  } else if (!state.seed) {
    state.seed = id
  } else {
    state.seed = id
  }
  renderPrep()
}

function renderEssenceSelection() {
  $$('#essenceGrid .essence-card').forEach(card => {
    const id = card.dataset.id
    card.classList.toggle('selected-prime', state.prime === id)
    card.classList.toggle('selected-seed', state.seed === id)
    const badge = card.querySelector('.pick-badge')
    if (state.prime === id) { badge.classList.remove('hidden'); badge.textContent = 'I'; badge.style.background = '#d9ad62' }
    else if (state.seed === id) { badge.classList.remove('hidden'); badge.textContent = 'II'; badge.style.background = '#7fe3ac' }
    else badge.classList.add('hidden')
  })
}

function renderLineageSlots() {
  const wrap = $('#lineageSlots')
  const a = state.prime ? ESSENCE_BY_ID[state.prime] : null
  const b = state.seed ? ESSENCE_BY_ID[state.seed] : null
  const slot = (which, essence, label) => {
    const fam = essence ? familyInfo(essence.family) : null
    return `
      <div class="lineage-slot ${which} ${essence ? 'filled' : 'empty'}" data-slot="${which}">
        <span class="slot-mark">${which === 'prime' ? 'I' : 'II'}</span>
        ${essence ? `<span class="slot-swatch" style="background:${fam.color};box-shadow:0 0 8px ${fam.color}66"></span>` : ''}
        <span class="slot-text">
          <span class="slot-label">${label}</span>
          <span class="slot-name">${essence ? essence.name : 'Choose essence'}</span>
        </span>
        ${essence ? '<button class="slot-x" data-clear="' + which + '" aria-label="Clear ' + label + '">×</button>' : ''}
      </div>`
  }
  wrap.innerHTML = slot('prime', a, 'Prime · Active') + slot('seed', b, 'Seed · Passive')
  $$('#lineageSlots [data-clear]').forEach(btn => btn.addEventListener('click', ev => {
    ev.stopPropagation()
    if (btn.dataset.clear === 'prime') state.prime = null
    else state.seed = null
    sound.click()
    renderPrep()
  }))
  $('#essenceHint').textContent = !state.prime ? 'Choose the PRIME' : !state.seed ? 'Choose the SEED' : 'Both essences chosen'
}

// ───────────────────────── fusion preview ─────────────────────────
function fuseBlockReason(lane) {
  if (!state.prime || !state.seed) return 'Choose two essences first'
  if (state.aether < 1) return 'No Aether remains'
  if (!lane && lane !== 0) return 'Mark a lane'
  const occupied = !!state.fighters[lane]
  const empties = state.fighters.filter(f => !f).length
  if (occupied && empties > 0) return 'Mark an empty lane'
  if (occupied && empties === 0) return null
  return null
}

export function renderFusionPreview() {
  const body = $('#fusionPreview')
  const lane = state.selectedLane
  const prime = state.prime ? ESSENCE_BY_ID[state.prime] : null
  const seed = state.seed ? ESSENCE_BY_ID[state.seed] : null
  previewTarget = null

  if (!prime || !seed) {
    const chosen = prime || seed
    body.innerHTML = `
      <div class="forge-empty">
        <div class="forge-sigil"><span class="ring"></span><span class="ring"></span><span class="ring"></span><span class="core"></span></div>
        <h3>${chosen ? 'THE CHAMBER HUNGERS' : 'BEGIN THE BINDING'}</h3>
        <p>${chosen
          ? `You have offered <strong style="color:#d9c9a4">${chosen.name}</strong> as ${prime ? 'the Prime. Its active power will lead the fusion.' : 'the Seed. Its instinct will root the fusion.'}<br>Choose ${prime ? 'a Seed' : 'a Prime'} to reveal the chimera.`
          : 'Choose two essences from the vault. The first lends its active power; the second lends its passive instinct. Cross-lineage fusions always mutate.'}</p>
        <div class="lineage-pair"><span class="ghost-slot">I</span><span>✕</span><span class="ghost-slot">II</span><span style="color:#5e6478;font-size:9px;letter-spacing:.1em">→ ?</span></div>
      </div>`
    $('#forgeSub').textContent = chosen ? 'One half of the pattern is set' : 'The chamber is listening'
    return
  }

  const preview = previewChimera(lane)
  if (!preview) return
  const disp = effectivePlayer(preview)
  const enemy = state.lineup[lane]
  const terr = TERRAINS[lane]
  const pFam = familyInfo(prime.family)
  const sFam = familyInfo(seed.family)
  const block = fuseBlockReason(lane)
  const occupied = !!state.fighters[lane]
  const empties = state.fighters.filter(f => !f).length
  const dim = (occupied && empties > 0) ? true : false
  const pw = powerOf(disp)
  const ep = enemy ? powerOf(enemy) : 0
  const ratio = ep ? pw / ep : 2
  const matchLabel = ratio >= 1.14 ? 'FAVOURED' : ratio <= 0.88 ? 'RISKY' : 'EVEN'
  const matchClass = ratio >= 1.14 ? '' : ratio <= 0.88 ? 'risky' : 'even'
  const laneTitle = `LANE ${ROMAN[lane]} — ${terr.name}`
  const muts = preview.mutations.map(id => MUTATION_BY_ID[id]).filter(Boolean)
  const ability = preview.ability
  const passive = preview.passive
  const buttonLabel = block
    ? block.toUpperCase()
    : occupied ? 'REPLACE & DEPLOY' : `FUSE & DEPLOY TO LANE ${ROMAN[lane]}`

  body.innerHTML = `
    <div class="forge-result">
      <div class="forge-hero">
        <div class="forge-portrait"><canvas></canvas></div>
        <div class="forge-id">
          <div class="lineage-mini">
            <b>${prime.name}</b><i>×</i><b>${seed.name}</b>
            ${preview.family2 ? `<i>·</i><span>${pFam.name} / ${sFam.name}</span>` : `<i>·</i><span>Pureblood</span>`}
          </div>
          <div class="forge-name">${preview.name}</div>
          <div class="forge-epithet">${preview.title || prime.epithet}</div>
          <div class="forge-badges">
            <span class="chip gold">${preview.role}</span>
            <span class="chip">${pFam.name}${preview.family2 ? ' / ' + sFam.name : ' lineage'}</span>
            <span class="chip">${preview.rangeType === 'ranged' ? 'Ranged' : 'Melee'}</span>
            ${preview.isPureblood ? '<span class="chip green">Pureblood</span>' : ''}
            ${preview.resonant ? `<span class="chip" style="color:${terr.color};border-color:${terr.color}55">Resonant</span>` : ''}
          </div>
          <div class="forge-power"><span>POWER</span><b>${pw}</b><em>vs ${ep || '—'} ${enemy ? 'in lane' : ''}</em></div>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-box"><span>Vitality</span><b>${fmt(disp.maxHp)}</b><i style="width:${clamp(disp.maxHp / 2200 * 100, 8, 100)}%"></i></div>
        <div class="stat-box"><span>Attack</span><b>${Math.round(disp.atk)}</b><i style="width:${clamp(disp.atk / 130 * 100, 8, 100)}%"></i></div>
        <div class="stat-box"><span>Cadence</span><b>${(1 / disp.interval).toFixed(2)}<small style="font-size:7px;color:#5e6478">/s</small></b><i style="width:${clamp((1 / disp.interval) / 2.2 * 100, 8, 100)}%"></i></div>
        <div class="stat-box"><span>Armour</span><b>${disp.armor}%</b><i style="width:${clamp(disp.armor / 55 * 100, 6, 100)}%"></i></div>
      </div>

      <div class="trait-list">
        <div class="trait">
          <span class="trait-icon">✦</span>
          <div class="trait-copy"><b>${ability.name}<em>Prime active</em></b><p>${ability.desc}${preview.isPureblood ? ' <span style="color:#7fe3ac">Empowered by pure blood.</span>' : ''}</p></div>
        </div>
        <div class="trait passive">
          <span class="trait-icon">❖</span>
          <div class="trait-copy"><b>${passive.name}<em>Seed passive</em></b><p>${passive.desc}</p></div>
        </div>
        ${muts.map(m => `<div class="trait mutation"><span class="trait-icon">☣</span><div class="trait-copy"><b>${m.name}<em>Mutation</em></b><p>${m.desc}</p></div></div>`).join('')}
      </div>

      <div class="resonance-note" style="--res-color:${terr.color}">
        <span class="res-glyph">◈</span>
        <span>${preview.resonant
          ? `<b>${terr.name}</b> resonates — ${terr.desc} woven into this chimera.`
          : `<b>${terr.name}</b> lies dormant — this lineage earns no terrain blessing here.`}</span>
      </div>

      ${enemy ? `<div class="matchup"><span>${laneTitle} · VS ${enemy.name}</span><b class="${matchClass}">${matchLabel}</b></div>` : ''}

      <button class="fuse-btn" id="fuseBtn" ${block ? 'disabled' : ''}>
        <span class="sheen"></span>
        ${buttonLabel}
        ${!block ? '<small>◆ 1 AETHER · THE PATTERN WILL HOLD</small>' : ''}
      </button>
    </div>`

  const canvas = body.querySelector('.forge-portrait canvas')
  renderPortrait(canvas, preview, { size: 300, ring: true, showPedestal: true })
  previewTarget = { canvas, fighter: preview, size: 300 }
  $('#forgeSub').textContent = `${laneTitle} · ${preview.mutations.length} mutation${preview.mutations.length === 1 ? '' : 's'}`
  const fuseBtn = $('#fuseBtn')
  if (fuseBtn) fuseBtn.addEventListener('click', doFuse)
  if (dim) {
    // The lane is occupied while others remain empty. Make the reason explicit.
    $('#forgeSub').textContent = 'That lane is already garrisoned'
  }
}

function doFuse() {
  const lane = state.selectedLane
  const block = fuseBlockReason(lane)
  if (block) { toast(block, true); return }
  const preview = previewChimera(lane)
  if (!preview) return
  preview.isPlayer = true
  preview.isEnemy = false
  preview.laneIndex = lane
  state.fighters[lane] = preview
  state.aether -= 1
  state.stats.fusions += 1
  sound.fuse()
  toast(`${preview.name} is bound to Lane ${ROMAN[lane]}`)
  const panel = $('.forge-panel')
  panel.classList.remove('fusing')
  void panel.offsetWidth
  panel.classList.add('fusing')
  setTimeout(() => panel.classList.remove('fusing'), 700)

  state.prime = null
  state.seed = null
  const nextEmpty = state.fighters.findIndex(f => !f)
  if (nextEmpty >= 0) state.selectedLane = nextEmpty
  renderPrep()
  if (state.fighters.every(Boolean)) toast('The covenant is complete. The horn awaits.')
}

// ───────────────────────── lane list ─────────────────────────
function renderLaneList() {
  const list = $('#laneList')
  list.innerHTML = ''
  const empties = state.fighters.filter(f => !f).length
  for (let i = 0; i < 5; i++) {
    const terr = TERRAINS[i]
    const enemy = state.lineup[i]
    const fighter = state.fighters[i]
    const disp = fighter ? effectivePlayer(fighter) : null
    const selectable = !fighter || empties === 0
    const card = document.createElement('button')
    card.className = 'lane-card' + (state.selectedLane === i ? ' selected' : '') + (fighter ? ' occupied' : '')
    card.dataset.lane = i
    card.innerHTML = `
      <span class="lane-ident">
        <span class="lane-roman">${ROMAN[i]}</span>
        <span class="terrain-name">${terr.name}</span>
        <span class="terrain-bonus" style="--terr-color:${terr.color}">${terr.desc}</span>
      </span>
      <span class="unit-chip ally ${fighter ? '' : 'empty'}">
        ${fighter ? '<span class="u-art"></span>' : '<span class="u-art">?</span>'}
        <span class="u-copy">
          <span class="u-name">${fighter ? fighter.name : 'Unbound'}</span>
          <span class="u-stat">${fighter ? `<b>${fmt(disp.maxHp)}</b> HP · <b>${Math.round(disp.atk)}</b> ATK` : 'Awaiting chimera'}</span>
        </span>
        ${fighter && fighter.resonant ? `<span class="res-mark" style="--terr-color:${terr.color}" title="Resonant: ${terr.desc}">◈</span>` : ''}
      </span>
      <span class="vs-mark">VS</span>
      <span class="unit-chip enemy" title="${enemy.ability.name} — ${enemy.ability.desc}">
        <span class="u-art"></span>
        <span class="u-copy">
          <span class="u-name">${enemy.name}</span>
          <span class="u-stat"><b>${fmt(enemy.maxHp)}</b> HP · PWR <b>${powerOf(enemy)}</b></span>
        </span>
        ${enemy.resonant ? `<span class="res-mark" style="--terr-color:${terr.color}" title="Enemy resonance: ${terr.desc}">◈</span>` : ''}
      </span>
      <span class="lane-status">${selectable ? 'TARGET' : 'GARRISONED'}</span>`
    list.appendChild(card)

    const art = card.querySelector('.unit-chip.ally .u-art')
    if (fighter && art) {
      const c = document.createElement('canvas')
      art.appendChild(c)
      renderPortrait(c, fighter, { size: 74, ring: true, showPedestal: false })
    }
    const eArt = card.querySelector('.unit-chip.enemy .u-art')
    const ec = document.createElement('canvas')
    eArt.appendChild(ec)
    renderPortrait(ec, enemy, { size: 74, ring: true, showPedestal: false })

    card.addEventListener('click', () => {
      if (!selectable) {
        toast('That lane is garrisoned. Choose an empty lane.', true)
        return
      }
      state.selectedLane = i
      sound.click()
      renderPrep()
    })
  }
  $('#laneCount').textContent = `${5 - empties} / 5`
  $('#deploySub').textContent = empties ? `Garrison every lane · ${empties} remaining` : 'The covenant is complete'
}

// ───────────────────────── overall prep ─────────────────────────
export function renderPrep() {
  updateHeader()
  renderEssenceSelection()
  renderLineageSlots()
  renderFusionPreview()
  renderLaneList()
  const filled = state.fighters.filter(Boolean).length
  const ready = filled === 5
  const btn = $('#battleBtn')
  btn.disabled = !ready
  const hint = $('#deployHint')
  if (ready) {
    hint.textContent = 'The covenant is complete. Sound the horn.'
    hint.classList.add('ready')
  } else {
    hint.textContent = state.aether < 1
      ? 'No Aether remains. Return with the next dawn.'
      : 'All five lanes must be garrisoned before the horn sounds.'
    hint.classList.remove('ready')
  }
  $('#stepTrack')?.querySelectorAll('.step').forEach(step => {
    const n = +step.dataset.step
    const both = state.prime && state.seed
    const laneOk = state.selectedLane != null && fuseBlockReason(state.selectedLane) === null
    step.classList.toggle('active', n === 1 ? !both : n === 2 ? (both && !laneOk) : (both && laneOk))
  })
}

export function healFighters() {
  state.fighters.forEach(f => { if (f) { f.hp = f.maxHp } })
}
