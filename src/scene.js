// ── CHIMERA FRONT · arena & title renderer ──────────────────────────────────
import { drawCreature } from './art.js';
import { LANE_Y, START_X } from './battle.js';

export const WORLD = { w: 1000, h: 620 };
const SLOT_X = START_X;
const LANE_OFF = { player: { front: -14, back: 14 }, enemy: { front: 14, back: -14 } };
const GATE_X = { player: 34, enemy: 966 };
const LANE_ROMAN = ['I', 'II', 'III', 'IV', 'V'];
const TEAM = { player: '#5fe3d1', enemy: '#ff5c6c' };

function rgba(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rnd(a, b) { return a + Math.random() * (b - a); }
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
}
function diamond(ctx, x, y, r) {
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath();
}
function hexPath(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 3 * i - Math.PI / 6;
    const px = x + Math.cos(a) * r; const py = y + Math.sin(a) * r;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}

export class ArenaView {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.fx = [];
    this.floats = [];
    this.projectiles = [];
    this.time = 0;
    this.shake = 0;
    this.flashRed = 0;
    this.motes = Array.from({ length: 42 }, () => ({
      x: rnd(20, 980), y: rnd(30, 610), r: rnd(0.8, 2.4), sp: rnd(2, 9),
      ph: rnd(0, 6.28), hue: Math.random() < 0.3 ? '#ffcf8a' : '#8fe8ff',
    }));
    this.souls = [];
    this.view = { scale: 1, ox: 0, oy: 0, dpr: 1, w: 1000, h: 620 };
    this.pulse = 0;
    this.initRunes();
    this.resize();
  }

  initRunes() {
    this.runes = [
      { x: 500, y: 320, r: 150, rot: 0 },
      { x: 500, y: 320, r: 118, rot: 0.5 },
    ];
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(320, rect.width);
    const h = Math.max(240, rect.height);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    const scale = Math.min(w / WORLD.w, h / WORLD.h);
    this.view = { scale, ox: (w - WORLD.w * scale) / 2, oy: (h - WORLD.h * scale) / 2, dpr, w, h };
  }

  toWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const { scale, ox, oy } = this.view;
    return { x: (clientX - rect.left - ox) / scale, y: (clientY - rect.top - oy) / scale };
  }

  pick(state, clientX, clientY) {
    const p = this.toWorld(clientX, clientY);
    if (state.mode === 'battle' && state.battle) {
      let best = null; let bd = 40;
      for (const u of state.battle.units) {
        if (!u.alive) continue;
        const d = Math.hypot(u.x - p.x, (u.y - 40) - p.y);
        if (d < bd) { bd = d; best = u; }
      }
      return best ? { unit: best } : null;
    }
    // slot proximity
    let best = null; let bd = 66;
    for (let lane = 0; lane < 5; lane++) {
      for (const row of ['front', 'back']) {
        const x = SLOT_X.player[row];
        const y = LANE_Y[lane] + LANE_OFF.player[row];
        const d = Math.hypot(x - p.x, y - p.y);
        if (d < bd) { bd = d; best = { lane, row, x, y }; }
      }
    }
    if (best) best.key = `${best.lane}-${best.row}`;
    return best;
  }

  hovered(state, clientX, clientY) {
    return this.pick(state, clientX, clientY);
  }

  resetFx() {
    this.fx = []; this.floats = []; this.projectiles = []; this.souls = []; this.shake = 0;
  }

  burst(x, y, color, n = 8, power = 60) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2);
      const sp = rnd(power * 0.3, power);
      this.fx.push({
        type: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 10,
        life: rnd(0.3, 0.65), max: 0.65, color, size: rnd(1.2, 2.8), grav: 90,
      });
    }
  }

  ring(x, y, color, r = 8, size = 46, life = 0.5, flat = 0.4) {
    this.fx.push({ type: 'ring', x, y, r, size, color, life, max: life, flat });
  }

  float(x, y, text, color, size = 15) {
    this.floats.push({ x, y, text, color, life: 0.95, max: 0.95, size, vy: -34 });
  }

  ingest(events) {
    for (const e of events) {
      switch (e.type) {
        case 'hit': {
          this.float(e.x, e.y - 6, `${e.amount}`, e.crit ? '#ffd46e' : e.side === 'player' ? '#ffb0b8' : '#ffffff', e.crit ? 21 : 15);
          this.burst(e.x, e.y, e.crit ? '#ffd46e' : '#ffd9c0', e.crit ? 10 : 5, e.crit ? 110 : 60);
          this.ring(e.x, e.y, e.crit ? '#ffd46e' : 'rgba(255,255,255,.5)', 4, e.crit ? 28 : 17, 0.32, 0.6);
          if (e.crit) this.shake = Math.max(this.shake, 2.4);
          break;
        }
        case 'shieldHit': {
          this.float(e.x, e.y - 4, `⛊ ${e.amount}`, '#9fc4ff', 12);
          this.burst(e.x, e.y, '#9fc4ff', 4, 40);
          break;
        }
        case 'dot': {
          this.float(e.x, e.y, `${e.amount}`, e.color, 11);
          this.burst(e.x, e.y + 4, e.color, 3, 24);
          break;
        }
        case 'thorns': {
          this.float(e.x, e.y, `${e.amount}`, '#ffb276', 11);
          this.burst(e.x, e.y, '#ffb276', 4, 40);
          break;
        }
        case 'heal': {
          this.float(e.x, e.y, `+${e.amount}`, '#7beaa6', 14);
          for (let i = 0; i < 4; i++) {
            this.fx.push({
              type: 'spark', x: e.x + rnd(-14, 14), y: e.y + rnd(-6, 10), vx: rnd(-8, 8), vy: rnd(-60, -24),
              life: 0.7, max: 0.7, color: '#7beaa6', size: rnd(1.4, 2.4), grav: -10,
            });
          }
          this.ring(e.x, e.y, '#7beaa6', 6, 26, 0.5, 0.5);
          break;
        }
        case 'dodge': {
          this.float(e.x, e.y, 'MISS', '#d9d2ff', 12);
          break;
        }
        case 'slash': {
          this.fx.push({
            type: 'slash', x: e.tx, y: e.ty, x0: e.x, y0: e.y,
            color: e.color, life: 0.24, max: 0.24,
          });
          this.burst(e.tx, e.ty, '#ffd9b0', 3, 34);
          break;
        }
        case 'flurry': {
          this.ring(e.x, e.y, e.color, 10, 38, 0.3, 0.7);
          break;
        }
        case 'shot': {
          this.projectiles.push({
            x0: e.x, y0: e.y, x: e.x, y: e.y,
            tx: e.tx, ty: e.ty, t: 0, dur: rnd(0.16, 0.26), color: e.color,
          });
          break;
        }
        case 'cast': {
          this.fx.push({
            type: 'cast', x: e.x, y: e.y, color: e.color, ability: e.ability,
            kind: e.kind, points: e.points || [], life: 1.0, max: 1.0, side: e.side,
          });
          this.ring(e.x, e.y + 10, e.color, 10, 74, 0.8, 0.35);
          this.burst(e.x, e.y + 6, e.color, 12, 80);
          this.shake = Math.max(this.shake, 5);
          break;
        }
        case 'death': {
          this.burst(e.x, e.y + 10, e.color, 16, 95);
          this.ring(e.x, e.y + 10, e.color, 6, 54, 0.8, 0.5);
          this.float(e.x, e.y - 20, 'SLAIN', '#ff8d9a', 12);
          this.shake = Math.max(this.shake, 3.5);
          break;
        }
        case 'nexus': {
          this.fx.push({ type: 'nexus', x: e.x, y: e.y, color: TEAM[e.side === 'player' ? 'enemy' : 'player'], life: 0.7, max: 0.7, from: e.from });
          this.burst(e.x, e.y, e.side === 'player' ? '#ff7b86' : '#5fe3d1', 12, 90);
          this.shake = Math.max(this.shake, 8);
          this.flashRed = Math.max(this.flashRed, 0.25);
          break;
        }
        case 'nexusStrike': {
          const gx = e.side === 'player' ? GATE_X.enemy : GATE_X.player;
          const gy = LANE_Y[e.lane] != null ? LANE_Y[e.lane] : e.y;
          this.fx.push({
            type: 'beam', x0: e.x, y0: e.y, x1: gx, y1: gy,
            color: e.color, life: 0.5, max: 0.5, width: 4,
          });
          break;
        }
        case 'laneBreak': {
          this.fx.push({
            type: 'laneBreak', lane: e.lane, color: e.color,
            side: e.side, life: 1.6, max: 1.6,
          });
          this.shake = Math.max(this.shake, 5);
          break;
        }
        case 'bloodrush': {
          this.fx.push({ type: 'bloodrush', life: 2.4, max: 2.4 });
          break;
        }
        default: break;
      }
    }
  }

  updateFx(dt) {
    this.time += dt;
    this.pulse = (Math.sin(this.time * 2.4) + 1) / 2;
    this.shake = Math.max(0, this.shake - dt * 30);
    this.flashRed = Math.max(0, this.flashRed - dt * 0.8);

    for (const p of this.projectiles) {
      p.t += dt;
      const k = clamp(p.t / p.dur, 0, 1);
      const e = k * (2 - k);
      p.x = p.x0 + (p.tx - p.x0) * e;
      p.y = p.y0 + (p.ty - p.y0) * e - Math.sin(k * Math.PI) * 16;
    }
    this.projectiles = this.projectiles.filter((p) => p.t < p.dur + 0.05);

    for (const f of this.fx) {
      f.life -= dt;
      if (f.type === 'spark') {
        f.x += f.vx * dt; f.y += f.vy * dt;
        f.vy += f.grav * dt;
        f.vx *= 1 - dt * 2;
      }
    }
    this.fx = this.fx.filter((f) => f.life > 0);

    for (const f of this.floats) {
      f.life -= dt; f.y += f.vy * dt; f.vy *= 1 - dt * 2.6;
    }
    this.floats = this.floats.filter((f) => f.life > 0);

    // ambient
    for (const m of this.motes) {
      m.y -= m.sp * dt;
      m.x += Math.sin(this.time * 0.5 + m.ph) * dt * 6;
      if (m.y < 20) { m.y = 610; m.x = rnd(20, 980); }
    }
  }

  // ══ ARENA BACKDROP ════════════════════════════════════════════════════════
  drawBackdrop(ctx, t, state) {
    const battle = state.battle;
    const bg = ctx.createLinearGradient(0, 0, 0, WORLD.h);
    bg.addColorStop(0, '#080b14');
    bg.addColorStop(0.45, '#0a1420');
    bg.addColorStop(1, '#071019');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WORLD.w, WORLD.h);

    // ambient side glows
    let g = ctx.createRadialGradient(500, 640, 20, 500, 640, 460);
    g.addColorStop(0, 'rgba(70,220,200,.10)'); g.addColorStop(1, 'rgba(70,220,200,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1000, 620);
    g = ctx.createRadialGradient(500, -10, 20, 500, -10, 420);
    g.addColorStop(0, 'rgba(255,80,100,.09)'); g.addColorStop(1, 'rgba(255,80,100,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1000, 620);

    // arena floor slab
    const floorGrad = ctx.createLinearGradient(0, 20, 0, 604);
    floorGrad.addColorStop(0, '#101826');
    floorGrad.addColorStop(0.5, '#0c141f');
    floorGrad.addColorStop(1, '#0d1722');
    rr(ctx, 24, 22, 952, 576, 20);
    ctx.fillStyle = floorGrad; ctx.fill();
    ctx.strokeStyle = 'rgba(140,215,255,.14)'; ctx.lineWidth = 2; ctx.stroke();
    rr(ctx, 30, 28, 940, 564, 16);
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.stroke();

    // subtle stone tiling
    ctx.save();
    rr(ctx, 30, 28, 940, 564, 16); ctx.clip();
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.moveTo(30 + i * 120, 28); ctx.lineTo(30 + i * 120 - 90, 592);
      ctx.strokeStyle = 'rgba(120,190,230,.028)'; ctx.lineWidth = 1; ctx.stroke();
    }
    for (let i = 0; i < 7; i++) {
      ctx.beginPath(); ctx.moveTo(24, 60 + i * 82); ctx.lineTo(976, 60 + i * 82);
      ctx.strokeStyle = 'rgba(120,190,230,.03)'; ctx.lineWidth = 1; ctx.stroke();
    }
    // center sigil
    ctx.save(); ctx.translate(500, 320);
    ctx.rotate(t * 0.03);
    ctx.strokeStyle = 'rgba(120,230,230,.055)';
    ctx.lineWidth = 1.2;
    for (const r of [96, 106, 150]) { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); }
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 106, Math.sin(a) * 106);
      ctx.lineTo(Math.cos(a) * 150, Math.sin(a) * 150);
      ctx.stroke();
    }
    ctx.font = '700 13px Cinzel, serif';
    ctx.fillStyle = 'rgba(120,220,230,.065)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('THE SPLICING PIT', 0, 0);
    ctx.restore();
    ctx.restore();

    // horizontal lanes (player left → enemy right)
    for (let lane = 0; lane < 5; lane++) {
      const y = LANE_Y[lane];
      const laneGrad = ctx.createLinearGradient(36, 0, 964, 0);
      laneGrad.addColorStop(0, 'rgba(95,227,209,.055)');
      laneGrad.addColorStop(0.46, 'rgba(140,200,255,.016)');
      laneGrad.addColorStop(1, 'rgba(255,92,108,.05)');
      rr(ctx, 34, y - 52, 932, 104, 14);
      ctx.fillStyle = laneGrad; ctx.fill();
      ctx.strokeStyle = 'rgba(150,215,255,.06)'; ctx.lineWidth = 1; ctx.stroke();

      // lane divider runes
      for (let i = 0; i < 6; i++) {
        const x = 170 + i * 132;
        ctx.save(); ctx.translate(x, y + 46); ctx.rotate(Math.PI / 4);
        ctx.fillStyle = 'rgba(120,230,230,.10)';
        ctx.fillRect(-2, -2, 4, 4);
        ctx.restore();
      }
      // lane numeral near your gate
      ctx.save();
      ctx.font = '700 13px Cinzel, serif';
      ctx.fillStyle = 'rgba(150,225,235,.28)';
      ctx.textAlign = 'center';
      ctx.fillText(LANE_ROMAN[lane], 94, y + 5);
      ctx.restore();
    }

    // center divider (no-man's land)
    ctx.save();
    ctx.setLineDash([3, 12]);
    ctx.beginPath(); ctx.moveTo(500, 40); ctx.lineTo(500, 580);
    ctx.strokeStyle = 'rgba(160,230,255,.09)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();

    // player column headers
    ctx.save();
    ctx.font = '600 8px Rajdhani, sans-serif';
    ctx.fillStyle = 'rgba(120,210,200,.32)';
    ctx.textAlign = 'center';
    ctx.fillText('BACK', SLOT_X.player.back, 612);
    ctx.fillText('FRONT', SLOT_X.player.front, 612);
    ctx.restore();

    // corner braziers
    this.drawBrazier(ctx, 62, 42, t, '#ffb35c');
    this.drawBrazier(ctx, 938, 42, t, '#ffb35c');
    this.drawBrazier(ctx, 62, 580, t, '#63f0d8');
    this.drawBrazier(ctx, 938, 580, t, '#63f0d8');

    // gates
    this.drawGate(ctx, 'enemy', t, battle);
    this.drawGate(ctx, 'player', t, battle);

    // ambient motes
    for (const m of this.motes) {
      ctx.globalAlpha = 0.24 + Math.sin(t * 1.4 + m.ph) * 0.16;
      ctx.fillStyle = m.hue;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // edge vignette
    const vg = ctx.createRadialGradient(500, 300, 220, 500, 300, 600);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(2,4,8,.5)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, 1000, 620);
  }

  drawBrazier(ctx, x, y, t, color) {
    ctx.save();
    ctx.translate(x, y);
    // bowl
    ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(11, 0); ctx.lineTo(7, 10); ctx.lineTo(-7, 10); ctx.closePath();
    ctx.fillStyle = '#1a2731'; ctx.fill();
    ctx.strokeStyle = 'rgba(160,220,240,.2)'; ctx.lineWidth = 1; ctx.stroke();
    // flame
    const f = Math.sin(t * 7 + x) * 2;
    ctx.globalCompositeOperation = 'lighter';
    const fg = ctx.createRadialGradient(0, -6, 0, 0, -6, 26);
    fg.addColorStop(0, rgba(color, 0.9)); fg.addColorStop(0.35, rgba(color, 0.35)); fg.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.ellipse(0, -8, 17 + f, 26 + f, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,245,220,.9)';
    ctx.beginPath();
    ctx.moveTo(-4, -2); ctx.quadraticCurveTo(-3, -16 - f, 1, -22 - f); ctx.quadraticCurveTo(5, -12, 4, -2); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  drawGate(ctx, side, t, battle) {
    const gx = GATE_X[side];
    const color = TEAM[side];
    const isLeft = side === 'player';
    const nexus = battle ? (side === 'player' ? battle.playerNexus : battle.enemyNexus) : 120;
    const hpFrac = nexus / 120;
    const wallX = isLeft ? 20 : 952;
    ctx.save();
    // side wall band
    const g = ctx.createLinearGradient(wallX, 0, wallX + 28, 0);
    g.addColorStop(0, isLeft ? '#0e1a26' : '#080d15');
    g.addColorStop(1, isLeft ? '#080d15' : '#0e1a26');
    ctx.fillStyle = g;
    ctx.fillRect(wallX, 22, 28, 576);
    ctx.strokeStyle = rgba(color, 0.22); ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(isLeft ? 48 : 952, 22); ctx.lineTo(isLeft ? 48 : 952, 598); ctx.stroke();

    // pylons at each lane
    for (let lane = 0; lane < 5; lane++) {
      const y = LANE_Y[lane];
      const pulse = 0.55 + Math.sin(t * 2.2 + lane) * 0.2 + (1 - hpFrac) * 0.3;
      ctx.save();
      ctx.translate(gx, y);
      ctx.globalCompositeOperation = 'lighter';
      const cg = ctx.createRadialGradient(0, 0, 2, 0, 0, 44);
      cg.addColorStop(0, rgba(color, 0.55 * pulse));
      cg.addColorStop(0.4, rgba(color, 0.16 * pulse));
      cg.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // shrine / crystal
      ctx.save(); ctx.translate(gx, y);
      ctx.beginPath();
      ctx.moveTo(0, -14); ctx.lineTo(11, -3); ctx.lineTo(6, 12); ctx.lineTo(-6, 12); ctx.lineTo(-11, -3); ctx.closePath();
      ctx.fillStyle = rgba(color, 0.22 + hpFrac * 0.25); ctx.fill();
      ctx.strokeStyle = rgba(color, 0.7); ctx.lineWidth = 1.4; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 7); ctx.strokeStyle = rgba('#ffffff', 0.45); ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    }

    // vertical label along the wall
    ctx.save();
    ctx.translate(isLeft ? 14 : 986, 310);
    ctx.rotate(isLeft ? -Math.PI / 2 : Math.PI / 2);
    ctx.font = '700 9px Rajdhani, sans-serif';
    ctx.fillStyle = rgba(color, 0.6);
    ctx.textAlign = 'center';
    ctx.letterSpacing = '3px';
    ctx.fillText(side === 'player' ? 'YOUR NEXUS' : 'ENEMY NEXUS', 0, 0);
    ctx.letterSpacing = '0px';
    ctx.restore();
    ctx.restore();
  }

  drawSlot(ctx, x, y, lane, row, side, state, opts = {}) {
    const key = `${lane}-${row}`;
    const hovered = state.hover && state.hover.key === key;
    const selected = state.selectedId && state.slots[key] === state.selectedId;
    const occupied = !!state.slots[key];
    const isEnemy = side === 'enemy';
    const color = isEnemy ? TEAM.enemy : TEAM.player;
    ctx.save();
    ctx.translate(x, y + 2);
    ctx.scale(1, 0.42);
    const r = 36;
    const pulse = 0.5 + Math.sin(this.time * 2 + lane + (row === 'back' ? 1 : 0)) * 0.12;
    const active = hovered || selected || (state.selectedId && !occupied && !isEnemy);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = active ? rgba(color, 0.15) : 'rgba(255,255,255,.028)';
    ctx.fill();
    ctx.strokeStyle = rgba(color, active ? 0.7 : 0.25);
    ctx.lineWidth = hovered ? 2.4 : 1.3;
    ctx.setLineDash(active ? [] : [5, 7]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(0, 0, r - 7, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(color, active ? 0.3 : 0.13); ctx.lineWidth = 1; ctx.stroke();
    // inner rune
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = rgba(color, active ? 0.55 : 0.18); ctx.lineWidth = 1;
    ctx.strokeRect(-9, -9, 18, 18);
    ctx.restore();

    if (active) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(x, y, 4, x, y, 58);
      glow.addColorStop(0, rgba(color, 0.16)); glow.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(x, y, 58, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    if (row === 'front' && !isEnemy && !occupied) {
      ctx.font = '600 8px Rajdhani, sans-serif';
      ctx.fillStyle = 'rgba(140,190,210,.34)';
      ctx.textAlign = 'center';
      ctx.fillText('FRONT', x, y + 28);
    }
    if (row === 'back' && !isEnemy && !occupied) {
      ctx.font = '600 8px Rajdhani, sans-serif';
      ctx.fillStyle = 'rgba(140,190,210,.3)';
      ctx.textAlign = 'center';
      ctx.fillText('BACK', x, y + 28);
    }
  }

  drawHpBar(ctx, u, y, small = false) {
    const w = small ? 48 : 62;
    const h = small ? 4 : 5.5;
    const x = u.x - w / 2;
    const frac = clamp(u.hp / u.maxHp, 0, 1);
    const color = frac > 0.55 ? '#6ee7a8' : frac > 0.28 ? '#f4c96b' : '#ff6d7e';
    ctx.save();
    rr(ctx, x - 1, y - 1, w + 2, h + 2, (h + 2) / 2);
    ctx.fillStyle = 'rgba(4,8,12,.82)'; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1; ctx.stroke();
    if (frac > 0) {
      rr(ctx, x, y, Math.max(1.5, w * frac), h, h / 2);
      ctx.fillStyle = color; ctx.fill();
      rr(ctx, x, y, Math.max(1.5, w * frac), h / 2, h / 2);
      ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fill();
    }
    if (u.shield > 0) {
      const sw = w * clamp(u.shield / u.maxHp, 0, 1);
      rr(ctx, x, y - 3, sw, 2, 1);
      ctx.fillStyle = '#9fc4ff'; ctx.fill();
    }
    // tier pips
    const team = u.side === 'player' ? TEAM.player : TEAM.enemy;
    for (let i = 0; i < u.tier; i++) {
      diamond(ctx, x - 8 - i * 7, y + h / 2, 2.2);
      ctx.fillStyle = i === 0 ? team : 'rgba(240,200,121,.8)'; ctx.fill();
    }
    // status
    let sx = x + w + 6;
    const dot = (c) => { ctx.beginPath(); ctx.arc(sx, y + h / 2, 2.4, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); sx += 6; };
    if (u.poison && u.poison.length) dot('#b8ef6a');
    if (u.burn) dot('#ff9a5c');
    if (u.status && u.status.slowUntil > this.time) dot('#9be8ff');
    if (u.status && u.status.stunUntil > this.time) dot('#ffd46e');
    if (u.status && u.status.atkBuffUntil > this.time) dot('#ffcf6e');
    ctx.restore();
  }

  drawUnit(ctx, u, state, scaleMul = 1, preview = false) {
    const art = u.ref.art;
    const scale = 0.78 * (art.scale || 1) * scaleMul;
    const dir = u.side === 'player' ? -1 : 1;
    const lunge = preview ? 0 : (u.lunge || 0) * 6 * dir;
    const alpha = u.alive === false ? 0.25 : 1;
    const x = u.x;
    const y = u.y + lunge;
    drawCreature(ctx, art, x, y, scale, {
      time: this.time,
      seed: (u.lane + 1) * 1.7 + (u.side === 'enemy' ? 2.3 : 0),
      team: u.side,
      flash: u.flash || 0,
      alpha,
      ring: true,
      bob: u.walking ? 1.6 : 0.8,
    });

    if (preview) return;

    // energy ring at feet
    if (u.energy != null) {
      const pct = clamp(u.energy / 100, 0, 1);
      const color = u.side === 'player' ? TEAM.player : TEAM.enemy;
      ctx.save();
      ctx.translate(x, y + 3); ctx.scale(1, 0.4);
      ctx.beginPath();
      ctx.arc(0, 0, 27, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
      ctx.strokeStyle = u.energy >= 100 ? '#ffe08a' : rgba(color, 0.7);
      ctx.lineWidth = 2.4;
      if (u.energy >= 100) { ctx.shadowColor = '#ffe08a'; ctx.shadowBlur = 8; }
      ctx.stroke();
      ctx.restore();
    }

    // shield ring
    if (u.shield > 0) {
      ctx.save();
      ctx.translate(x, y - 40);
      ctx.strokeStyle = 'rgba(159,196,255,.5)';
      ctx.lineWidth = 1.4;
      hexPath(ctx, 0, 0, 33 + Math.sin(this.time * 3) * 2);
      ctx.stroke();
      ctx.restore();
    }

    // stun stars
    if (u.status && u.status.stunUntil > this.time) {
      ctx.save();
      for (let i = 0; i < 3; i++) {
        const a = this.time * 3 + i * 2.1;
        const sx = x + Math.cos(a) * 22;
        const sy = y - 74 + Math.sin(a) * 5;
        ctx.fillStyle = 'rgba(255,225,140,.9)';
        diamond(ctx, sx, sy, 2.4); ctx.fill();
      }
      ctx.restore();
    }

    // ready halo
    if (u.energy >= 100) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const rg = ctx.createRadialGradient(x, y - 60, 6, x, y - 60, 42);
      rg.addColorStop(0, 'rgba(255,224,138,.22)'); rg.addColorStop(1, 'rgba(255,224,138,0)');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(x, y - 60, 42, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.fillStyle = '#ffe08a';
      ctx.shadowColor = '#ffe08a'; ctx.shadowBlur = 8;
      diamond(ctx, x, y - 100 - Math.sin(this.time * 3) * 3, 4); ctx.fill();
      ctx.restore();
    }

    this.drawHpBar(ctx, u, y - (art.feats.has('bulk') ? 88 : 84));
  }

  // ══ MAIN RENDER ═══════════════════════════════════════════════════════════
  render(state, dt) {
    this.updateFx(dt);
    const ctx = this.ctx;
    const { dpr, w, h, scale, ox, oy } = this.view;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#050810';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const shakeX = this.shake ? rnd(-this.shake, this.shake) : 0;
    const shakeY = this.shake ? rnd(-this.shake, this.shake) * 0.6 : 0;
    ctx.setTransform(dpr, 0, 0, dpr, dpr * (ox + shakeX * scale), dpr * (oy + shakeY * scale));
    ctx.scale(scale, scale);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, 1000, 620); ctx.clip();

    const t = this.time;
    this.drawBackdrop(ctx, t, state);

    // slots
    for (let lane = 0; lane < 5; lane++) {
      for (const row of ['back', 'front']) {
        this.drawSlot(ctx, SLOT_X.player[row], LANE_Y[lane] + LANE_OFF.player[row], lane, row, 'player', state);
        this.drawSlot(ctx, SLOT_X.enemy[row], LANE_Y[lane] + LANE_OFF.enemy[row], lane, row, 'enemy', state);
      }
    }

    if (state.mode === 'prep') {
      this.drawPrep(ctx, state, t);
    } else if (state.battle) {
      this.drawBattle(ctx, state, t);
    }

    // floats on top
    for (const f of this.floats) {
      const a = clamp(f.life / f.max, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = `700 ${f.size}px Rajdhani, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(4,8,12,.8)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }

    // vignette over units for cohesion
    const vg = ctx.createRadialGradient(500, 310, 300, 500, 310, 590);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(2,4,8,.28)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, 1000, 620);

    if (this.flashRed > 0.01) {
      ctx.fillStyle = `rgba(255,40,60,${this.flashRed * 0.5})`;
      ctx.fillRect(0, 0, 1000, 620);
    }
    for (const f of this.fx.filter((f) => f.type === 'bloodrush')) {
      ctx.fillStyle = `rgba(255,40,50,${0.08 + Math.sin(t * 8) * 0.04})`;
      ctx.fillRect(0, 0, 1000, 620);
    }
    ctx.restore();
  }

  drawPrep(ctx, state, t) {
    // enemy intel
    if (state.enemies) {
      for (const e of state.enemies) {
        const x = SLOT_X.enemy[e.row];
        const y = LANE_Y[e.lane] + LANE_OFF.enemy[e.row];
        ctx.save(); ctx.globalAlpha = 0.9;
        const fake = {
          x, y, side: 'enemy', lane: e.lane, row: e.row, ref: e.unit,
          flash: 0, walking: false, energy: 0, shield: 0, alive: true,
          status: { stunUntil: 0, slowUntil: 0, atkBuffUntil: 0 },
          hp: e.unit.stats.hp, maxHp: e.unit.stats.hp, tier: e.unit.tier,
        };
        this.drawUnit(ctx, fake, state, 0.94, false);
        ctx.font = '600 9px Rajdhani, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,150,160,.85)';
        ctx.fillText(e.unit.name.toUpperCase(), x, y + 30);
        ctx.restore();
      }
    }

    // deployed player units
    for (const [key, id] of Object.entries(state.slots || {})) {
      if (!id) continue;
      const [laneS, row] = key.split('-');
      const lane = Number(laneS);
      const ru = state.roster.find((u) => u.id === id);
      if (!ru) continue;
      const selected = state.selectedId === id;
      const x = SLOT_X.player[row];
      const y = LANE_Y[lane] + LANE_OFF.player[row];
      const fake = {
        x, y, side: 'player', lane, row, ref: ru,
        flash: 0, walking: false, energy: 0, shield: 0, alive: true,
        status: { stunUntil: 0, slowUntil: 0, atkBuffUntil: 0 },
        hp: ru.stats.hp, maxHp: ru.stats.hp, tier: ru.tier,
      };
      ctx.save();
      if (selected) {
        ctx.globalCompositeOperation = 'lighter';
        const sg = ctx.createRadialGradient(x, y - 24, 4, x, y - 24, 58);
        sg.addColorStop(0, 'rgba(95,227,209,.16)'); sg.addColorStop(1, 'rgba(95,227,209,0)');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(x, y - 24, 58, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      this.drawUnit(ctx, fake, state, selected ? 1.02 : 1, false);
      ctx.font = '600 9px Rajdhani, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(150,240,225,.9)';
      ctx.fillText(ru.name.toUpperCase(), x, y + 30);
    }

    // ghost preview for selected unit on hover
    if (state.selectedId && state.hover && state.hover.key) {
      const id = state.selectedId;
      const occupied = state.slots[state.hover.key];
      const ru = state.roster.find((u) => u.id === id);
      if (ru && (!occupied || occupied === id)) {
        const x = state.hover.x; const y = state.hover.y;
        ctx.save(); ctx.globalAlpha = 0.45;
        drawCreature(ctx, ru.art, x, y, 0.78 * (ru.art.scale || 1), {
          time: t, team: 'player', ring: false, animate: true, seed: 3,
        });
        ctx.restore();
      }
    }

    // matchup lines
    for (let lane = 0; lane < 5; lane++) {
      const myId = state.slots[`${lane}-front`] || state.slots[`${lane}-back`];
      const their = (state.enemies || []).find((e) => e.lane === lane);
      if (!myId || !their) continue;
      const y = LANE_Y[lane];
      ctx.save();
      ctx.setLineDash([2, 9]);
      ctx.beginPath();
      ctx.moveTo(SLOT_X.player.front + 44, y);
      ctx.lineTo(SLOT_X.enemy.front - 44, y);
      ctx.strokeStyle = 'rgba(255,120,140,.22)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.fillStyle = 'rgba(255,150,160,.28)';
      ctx.font = '700 8px Rajdhani, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VS', 500, y - 5);
      ctx.restore();
    }
  }

  drawBattle(ctx, state, t) {
    const b = state.battle;
    const units = b.units;
    // dead first
    for (const u of units) {
      if (!u.alive && u.deathT < 1.3) this.drawUnit(ctx, u, state);
    }
    const alive = units.filter((u) => u.alive).sort((a, c) => a.y - c.y);
    for (const u of alive) this.drawUnit(ctx, u, state);

    // projectiles
    for (const p of this.projectiles) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255,255,255,.25)';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(p.x0, p.y0); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.strokeStyle = p.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x0, p.y0); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // effects
    for (const f of this.fx) this.drawFx(ctx, f, t);

    // lane break indicators
    for (const f of this.fx) {
      if (f.type !== 'laneBreak') continue;
      const a = clamp(f.life / f.max, 0, 1);
      const x = f.side === 'player' ? GATE_X.enemy : GATE_X.player;
      const y = LANE_Y[f.lane];
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = f.color; ctx.lineWidth = 2;
      ctx.shadowColor = f.color; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(x, y, 26 + (1 - a) * 16, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  drawFx(ctx, f, t) {
    const a = clamp(f.life / f.max, 0, 1);
    if (f.type === 'spark') {
      ctx.globalAlpha = a;
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.size * a, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (f.type === 'ring') {
      ctx.save();
      ctx.globalAlpha = a * 0.8;
      ctx.translate(f.x, f.y);
      ctx.scale(1, f.flat);
      const rr = f.r + (1 - a) * f.size;
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2);
      ctx.strokeStyle = f.color; ctx.lineWidth = 2 + a * 2;
      ctx.shadowColor = f.color; ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.restore();
    } else if (f.type === 'slash') {
      ctx.save();
      ctx.globalAlpha = a;
      const mx = (f.x + f.x0) / 2; const my = (f.y + f.y0) / 2;
      ctx.translate(mx, my);
      ctx.rotate(Math.atan2(f.y - f.y0, f.x - f.x0) + Math.PI / 2);
      ctx.beginPath(); ctx.arc(0, 0, 24, -1.1, 1.3);
      ctx.strokeStyle = '#fff7e6'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
      ctx.shadowColor = f.color; ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.strokeStyle = f.color; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
    } else if (f.type === 'beam') {
      const k = 1 - a;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = f.color; ctx.lineWidth = f.width || 4;
      ctx.shadowColor = f.color; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.moveTo(f.x0, f.y0); ctx.lineTo(f.x1, f.y1); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
    } else if (f.type === 'cast') {
      this.drawCastFx(ctx, f, a, t);
    } else if (f.type === 'nexus') {
      ctx.save();
      const r = 20 + (1 - a) * 60;
      ctx.globalAlpha = a;
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, r);
      g.addColorStop(0, 'rgba(255,255,255,.8)'); g.addColorStop(0.4, f.color); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fill();
      ctx.restore();
    } else if (f.type === 'bloodrush') {
      // handled globally
    }
  }

  drawCastFx(ctx, f, a, t) {
    const fade = a;
    const c = f.color;
    const p = 1 - a;
    ctx.save();
    // central pillar
    ctx.globalAlpha = fade * 0.9;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, 60 + p * 30);
    g.addColorStop(0, rgba(c, 0.55)); g.addColorStop(0.5, rgba(c, 0.12)); g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(f.x, f.y, 60 + p * 30, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // connectors to affected points
    if (f.points && f.points.length) {
      ctx.save();
      ctx.globalAlpha = fade * 0.7;
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 2;
      ctx.strokeStyle = c;
      ctx.shadowColor = c; ctx.shadowBlur = 10;
      for (const pt of f.points) {
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(pt.x, pt.y); ctx.stroke();
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 10 + p * 12, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(f.x, f.y);
    ctx.strokeStyle = c; ctx.lineWidth = 2;
    ctx.shadowColor = c; ctx.shadowBlur = 10;

    switch (f.ability) {
      case 'howl': {
        for (let i = 0; i < 3; i++) {
          const rr = 26 + i * 18 + p * 50;
          ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke();
        }
        for (let i = 0; i < 8; i++) {
          const ang = i / 8 * Math.PI * 2 + t;
          ctx.beginPath(); ctx.moveTo(Math.cos(ang) * 20, Math.sin(ang) * 20);
          ctx.lineTo(Math.cos(ang) * (34 + p * 26), Math.sin(ang) * (34 + p * 26)); ctx.stroke();
        }
        break;
      }
      case 'shockwave': {
        ctx.scale(1, 0.45);
        for (let i = 0; i < 3; i++) {
          ctx.beginPath(); ctx.arc(0, 0, 30 + i * 22 + p * 90, 0, Math.PI * 2);
          ctx.strokeStyle = rgba('#ffb35e', fade * (0.8 - i * 0.2)); ctx.stroke();
        }
        break;
      }
      case 'breath': {
        const dir = f.side === 'player' ? 1 : -1;
        ctx.scale(dir, 1);
        const fg = ctx.createLinearGradient(0, 0, 130, 0);
        fg.addColorStop(0, rgba('#ffe0a0', 0.55 * fade)); fg.addColorStop(1, rgba('#ff5c2a', 0));
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.quadraticCurveTo(70, -46, 130, 0); ctx.quadraticCurveTo(70, 46, 0, 8); ctx.closePath(); ctx.fill();
        break;
      }
      case 'fortify': {
        for (let i = 0; i < 2; i++) {
          ctx.beginPath(); ctx.arc(0, 0, 34 + i * 18 + p * 30, 0, Math.PI * 2); ctx.stroke();
        }
        break;
      }
      case 'reap': {
        for (let i = 0; i < 3; i++) {
          ctx.rotate(2.1);
          ctx.beginPath(); ctx.arc(0, 0, 36 + p * 30, -0.5, 0.9); ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.stroke();
        }
        break;
      }
      case 'venomNova': {
        for (let i = 0; i < 3; i++) {
          ctx.beginPath(); ctx.arc(0, 0, 24 + i * 16 + p * 40, 0, Math.PI * 2);
          ctx.strokeStyle = rgba('#b9f06a', fade * 0.7); ctx.stroke();
        }
        break;
      }
      default: {
        for (let i = 0; i < 3; i++) {
          ctx.beginPath(); ctx.arc(0, 0, 20 + i * 15 + p * 40, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }
    }
    ctx.restore();
  }
}

// ══ TITLE SCREEN ═══════════════════════════════════════════════════════════
export function renderTitle(canvas, units, time) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(320, rect.width); const h = Math.max(240, rect.height);
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const bg = ctx.createRadialGradient(w * 0.5, h * 0.52, 20, w * 0.5, h * 0.52, Math.max(w, h) * 0.8);
  bg.addColorStop(0, '#10202b'); bg.addColorStop(0.5, '#08121c'); bg.addColorStop(1, '#04070d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

  // distant rays
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {
    const x = w * (0.15 + i * 0.12) + Math.sin(time * 0.2 + i) * 20;
    const g = ctx.createLinearGradient(x, 0, x + 80, h);
    g.addColorStop(0, 'rgba(90,230,210,.05)'); g.addColorStop(1, 'rgba(90,230,210,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 90, 0); ctx.lineTo(x + 200, h); ctx.lineTo(x + 40, h); ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  const scale = Math.min(w / 1180, h / 820);
  const baseY = h * 0.86;
  const groundY = baseY;
  ctx.save();
  ctx.translate(w / 2, groundY);
  ctx.scale(scale, scale);

  // platform
  ctx.save(); ctx.scale(1, 0.28);
  const pg = ctx.createRadialGradient(0, 0, 20, 0, 0, 430);
  pg.addColorStop(0, 'rgba(63,220,200,.25)'); pg.addColorStop(0.6, 'rgba(63,220,200,.06)'); pg.addColorStop(1, 'rgba(63,220,200,0)');
  ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(0, 0, 430, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(120,240,225,.3)'; ctx.lineWidth = 2;
  for (const r of [180, 260, 340]) { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();

  // rune ring behind
  ctx.save();
  ctx.translate(0, -160);
  ctx.rotate(time * 0.05);
  ctx.strokeStyle = 'rgba(120,230,230,.12)'; ctx.lineWidth = 1.4;
  for (let i = 0; i < 2; i++) {
    ctx.beginPath(); ctx.arc(0, 0, 260 + i * 30, 0, Math.PI * 2); ctx.stroke();
  }
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2;
    ctx.save(); ctx.translate(Math.cos(a) * 290, Math.sin(a) * 290); ctx.rotate(a);
    ctx.fillStyle = 'rgba(130,240,230,.18)';
    ctx.fillRect(-2, -6, 4, 12);
    ctx.restore();
  }
  ctx.restore();

  // creatures
  const lineup = [
    { u: units[0], x: -280, s: 1.6, t: 0.2 },
    { u: units[1], x: 0, s: 1.95, t: 1.4 },
    { u: units[2], x: 285, s: 1.6, t: 2.6 },
  ];
  for (const item of lineup) {
    if (!item.u) continue;
    const bob = Math.sin(time * 1.2 + item.t) * 5;
    ctx.save();
    ctx.globalAlpha = 0.96;
    const glow = ctx.createRadialGradient(item.x, -80, 20, item.x, -80, 190);
    glow.addColorStop(0, 'rgba(90,240,220,.12)'); glow.addColorStop(1, 'rgba(90,240,220,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(item.x, -80, 190, 0, Math.PI * 2); ctx.fill();
    drawCreature(ctx, item.u.art, item.x, bob, item.s, {
      time, seed: item.t, team: item.u.primary === 'drake' ? 'enemy' : 'player',
      ring: true, animate: true,
    });
    ctx.restore();
  }
  ctx.restore();

  // fog
  ctx.save();
  for (let i = 0; i < 6; i++) {
    const x = ((time * (8 + i * 2) + i * 230) % (w + 400)) - 200;
    const y = h * 0.72 + Math.sin(time * 0.3 + i) * 18 + i * 10;
    const g = ctx.createRadialGradient(x, y, 10, x, y, 180 + i * 20);
    g.addColorStop(0, 'rgba(80,160,170,.055)'); g.addColorStop(1, 'rgba(80,160,170,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y, 220, 52, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // floating embers
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 30; i++) {
    const x = (i * 157 + Math.sin(time * 0.4 + i) * 50) % w;
    const y = (h - ((time * (12 + i % 9) + i * 53) % h));
    const a = 0.15 + Math.sin(time * 2 + i) * 0.1;
    ctx.globalAlpha = a;
    ctx.fillStyle = i % 3 ? '#7be8d8' : '#ffcf8a';
    ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // bottom fade into UI
  const fade = ctx.createLinearGradient(0, h * 0.72, 0, h);
  fade.addColorStop(0, 'rgba(4,7,13,0)'); fade.addColorStop(1, 'rgba(4,7,13,.92)');
  ctx.fillStyle = fade; ctx.fillRect(0, h * 0.72, w, h * 0.28);
  // top vignette
  const top = ctx.createLinearGradient(0, 0, 0, h * 0.35);
  top.addColorStop(0, 'rgba(3,6,10,.8)'); top.addColorStop(1, 'rgba(3,6,10,0)');
  ctx.fillStyle = top; ctx.fillRect(0, 0, w, h * 0.35);
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
}
