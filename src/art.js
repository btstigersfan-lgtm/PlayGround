// ── CHIMERA FRONT · procedural creature illustration ────────────────────────
import { shade, mix } from './units.js';

const TAU = Math.PI * 2;
const DARK = '#0a0d13';

function E(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}
function fill(ctx, color) { if (color) { ctx.fillStyle = color; ctx.fill(); } }
function stroke(ctx, color, w = 2.5) { if (color) { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke(); } }
function ell(ctx, x, y, rx, ry, color, rot = 0, line, lw = 2.5) {
  E(ctx, x, y, rx, ry, rot); fill(ctx, color); stroke(ctx, line, lw);
}
function circ(ctx, x, y, r, color, line, lw = 2.5) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); fill(ctx, color); stroke(ctx, line, lw);
}
function rrect(ctx, x, y, w, h, r, color, rot = 0, line, lw = 2.5) {
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); if (rot) ctx.rotate(rot);
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, r); fill(ctx, color); stroke(ctx, line, lw); ctx.restore();
}
function tri(ctx, a, b, c, color, line, lw = 2.5) {
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.closePath();
  fill(ctx, color); stroke(ctx, line, lw);
}
function limb(ctx, pts, width, color, line, lw = 2) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = line || color; ctx.lineWidth = width + (line ? lw * 2 : 0); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
function grad(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([p, c]) => g.addColorStop(p, c));
  return g;
}
function radial(ctx, x, y, r0, r1, stops) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  stops.forEach(([p, c]) => g.addColorStop(p, c));
  return g;
}

function eye(ctx, x, y, rx, ry, color, opts = {}) {
  const { rot = 0, slit = true, glow = true, pupil = DARK } = opts;
  ctx.save();
  E(ctx, x, y, rx * 1.35, ry * 1.35, rot); fill(ctx, 'rgba(4,7,12,.9)');
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 9; }
  E(ctx, x, y, rx, ry, rot); fill(ctx, color);
  ctx.shadowBlur = 0;
  if (slit) {
    E(ctx, x + rx * 0.1, y, Math.max(0.8, rx * 0.24), ry * 0.8, rot); fill(ctx, pupil);
  } else {
    circ(ctx, x, y, Math.max(1, rx * 0.32), pupil);
  }
  ctx.restore();
}

function claws(ctx, x, y, dir, color, size = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(size, size);
  for (let i = 0; i < 3; i++) {
    const ox = (i - 1) * 4.3;
    ctx.beginPath();
    ctx.moveTo(ox, 0); ctx.quadraticCurveTo(ox + 1, 4 * dir, ox + 3 * dir, 7 * dir);
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke();
  }
  ctx.restore();
}

function teeth(ctx, x, y, color) {
  for (let i = -1; i <= 1; i++) {
    tri(ctx, [x + i * 4 - 1.8, y], [x + i * 4 + 1.8, y], [x + i * 4, y + 4.4], color, null);
  }
}

// ══ BODY ARCHETYPES ═════════════════════════════════════════════════════════

function drawBeast(ctx, a, o) {
  const { c1, c2, belly, glow, feats } = a;
  const bulk = feats.has('bulk') || a.primary === 'bear' || a.primary === 'rhino';
  const wolfish = a.primary === 'wolf' || a.primary === 'lynx' || feats.has('mane');
  const outline = shade(c2, -18);
  const bw = bulk ? 33 : 26;
  const bh = bulk ? 33 : 30;

  // tail
  if (feats.has('tail')) {
    ctx.save();
    const sway = Math.sin(o.time * 2 + o.seed) * 3;
    ctx.beginPath();
    ctx.moveTo(16, -40);
    ctx.bezierCurveTo(38, -36 + sway, 43, -18, 35, -6 + sway);
    ctx.strokeStyle = outline; ctx.lineWidth = 13; ctx.lineCap = 'round'; ctx.stroke();
    ctx.strokeStyle = c1; ctx.lineWidth = 9; ctx.stroke();
    if (wolfish) { E(ctx, 34, -5 + sway, 6, 8, 0.5); fill(ctx, belly); }
    ctx.restore();
  }

  // rear legs
  ell(ctx, -bw * 0.55, -15, bulk ? 13 : 10, 16, c2, 0, outline);
  ell(ctx, bw * 0.55, -15, bulk ? 13 : 10, 16, c2, 0, outline);
  ell(ctx, -bw * 0.58, -3, 11, 5, shade(c2, 14), 0, outline, 2);
  ell(ctx, bw * 0.58, -3, 11, 5, shade(c2, 14), 0, outline, 2);

  // body
  E(ctx, 0, -46, bw, bh);
  fill(ctx, grad(ctx, -bw, -82, bw, -12, [[0, shade(c1, 26)], [0.55, c1], [1, shade(c2, 6)]]));
  stroke(ctx, outline, 3);
  // belly
  E(ctx, 0, -37, bw * 0.58, bh * 0.56);
  fill(ctx, mix(belly, c1, 0.22));
  // shoulder shading
  E(ctx, -bw * 0.72, -58, 12, 16, 'rgba(255,255,255,.07)', -0.2);
  E(ctx, bw * 0.72, -58, 12, 16, 'rgba(0,0,0,.12)', 0.2);

  // mane collar
  if (feats.has('mane') || a.primary === 'wolf') {
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const ang = Math.PI * 0.05 + (i / 10) * Math.PI * 0.9;
      const r = i % 2 ? 30 : 23;
      const x = Math.cos(ang) * r;
      const y = -72 + Math.sin(ang) * r * 0.72;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.lineTo(-bw * 0.9, -50); ctx.lineTo(bw * 0.9, -50); ctx.closePath();
    fill(ctx, shade(c2, 4));
  }

  // arms
  const armX = bulk ? 33 : 27;
  limb(ctx, [[-armX, -55], [-armX - 4, -34], [-armX - 2, -18]], bulk ? 14 : 10, c1, outline);
  limb(ctx, [[armX, -55], [armX + 4, -34], [armX + 2, -18]], bulk ? 14 : 10, c1, outline);
  circ(ctx, -armX - 2, -16, bulk ? 8 : 6, shade(c1, -4), outline);
  circ(ctx, armX + 2, -16, bulk ? 8 : 6, shade(c1, -4), outline);
  if (feats.has('claws') || bulk) {
    claws(ctx, -armX - 4, -12, 1, '#e8e2d4', bulk ? 1.2 : 0.9);
    claws(ctx, armX + 4, -12, 1, '#e8e2d4', bulk ? 1.2 : 0.9);
  }

  // head
  const hx = 0, hy = -83;
  const hr = bulk ? 23 : 20;
  ell(ctx, hx, hy, hr, hr * 0.95, grad(ctx, -hr, hy - hr, hr, hy + hr, [[0, shade(c1, 32)], [1, c1]]), 0, outline, 3);

  // ears
  if (feats.has('tuftEars')) {
    tri(ctx, [-17, hy - 12], [-25, hy - 33], [-7, hy - 21], c1, outline);
    tri(ctx, [17, hy - 12], [25, hy - 33], [7, hy - 21], c1, outline);
    E(ctx, -21, hy - 29, 2.6, 6, belly, -0.4); E(ctx, 21, hy - 29, 2.6, 6, belly, 0.4);
  } else if (feats.has('ears')) {
    tri(ctx, [-15, hy - 10], [-20, hy - 31], [-4, hy - 20], c1, outline);
    tri(ctx, [15, hy - 10], [20, hy - 31], [4, hy - 20], c1, outline);
    tri(ctx, [-13, hy - 13], [-16, hy - 26], [-7, hy - 19], shade(belly, -14), null);
    tri(ctx, [13, hy - 13], [16, hy - 26], [7, hy - 19], shade(belly, -14), null);
  }

  // muzzle
  ell(ctx, 0, hy + 9, bulk ? 14 : 11, bulk ? 10 : 8.5, shade(belly, -3), 0, outline, 2);
  ell(ctx, 0, hy + 6.5, 4.2, 3, DARK);
  // mouth / fangs
  if (bulk || wolfish) {
    ctx.beginPath(); ctx.moveTo(-7, hy + 14); ctx.quadraticCurveTo(0, hy + 17, 7, hy + 14);
    ctx.strokeStyle = outline; ctx.lineWidth = 1.6; ctx.stroke();
    if (bulk) {
      tri(ctx, [-10, hy + 12], [-6, hy + 18], [-4, hy + 12], '#f0e6cf', null);
      tri(ctx, [10, hy + 12], [6, hy + 18], [4, hy + 12], '#f0e6cf', null);
    }
  }
  // eyes
  eye(ctx, -7.5, hy - 3, 3.4, 3.2, a.eyeL, { rot: -0.15 });
  eye(ctx, 7.5, hy - 3, 3.4, 3.2, a.eyeR, { rot: 0.15 });
  // brow
  ctx.beginPath(); ctx.moveTo(-13, hy - 8); ctx.lineTo(-4, hy - 6); ctx.moveTo(13, hy - 8); ctx.lineTo(4, hy - 6);
  ctx.strokeStyle = shade(c2, -8); ctx.lineWidth = 2; ctx.stroke();

  // rhino horn
  if (feats.has('horn') || a.primary === 'rhino') {
    const hg = grad(ctx, 0, -100, 0, -135, [[0, '#f6dca4'], [1, '#a8794b']]);
    ctx.beginPath(); ctx.moveTo(-5, hy + 1); ctx.quadraticCurveTo(-3, hy - 26, 2, hy - 37);
    ctx.quadraticCurveTo(8, hy - 20, 7, hy + 2); ctx.closePath(); fill(ctx, hg); stroke(ctx, outline, 2);
    ctx.beginPath(); ctx.moveTo(-2, hy - 2); ctx.quadraticCurveTo(0, hy - 22, 2, hy - 31);
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2; ctx.stroke();
  }
  if (feats.has('tusks') && !feats.has('horn')) {
    tri(ctx, [-12, hy + 11], [-16, hy + 22], [-8, hy + 14], '#efe3cd', outline, 1.2);
    tri(ctx, [12, hy + 11], [16, hy + 22], [8, hy + 14], '#efe3cd', outline, 1.2);
  }

  // patterns
  if (feats.has('spots')) {
    ctx.save(); E(ctx, 0, -46, bw - 1, bh - 1); ctx.clip();
    for (let i = 0; i < 7; i++) {
      const x = ((i * 37) % 48) - 24; const y = -30 - ((i * 23) % 44);
      E(ctx, x, y, 3.5, 2.6, 0.3); fill(ctx, shade(c2, 8));
    }
    ctx.restore();
  }
  if (feats.has('plates') && !feats.has('horn')) {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(-bw + 6, -58 + i * 10); ctx.quadraticCurveTo(0, -64 + i * 10, bw - 6, -58 + i * 10);
      ctx.strokeStyle = shade(c2, -2); ctx.lineWidth = 4; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1; ctx.stroke();
    }
  }
  // glow markings
  if (feats.has('runes')) {
    ctx.save(); ctx.shadowColor = glow; ctx.shadowBlur = 7;
    ctx.strokeStyle = glow; ctx.lineWidth = 1.4; ctx.globalAlpha = 0.85;
    for (let i = 0; i < 3; i++) {
      const x = -12 + i * 12;
      ctx.beginPath(); ctx.moveTo(x, -58); ctx.lineTo(x + 4, -54); ctx.lineTo(x, -49); ctx.stroke();
    }
    ctx.restore();
  }
  // accented heterochromia glow flecks from the second lineage
  if (a.secondary && a.secondary !== a.primary) {
    ctx.save(); ctx.globalAlpha = 0.55; ctx.shadowColor = a.glow; ctx.shadowBlur = 8;
    E(ctx, -bw * 0.7, -58, 3, 6, -0.5); fill(ctx, a.glow);
    E(ctx, bw * 0.72, -50, 2, 4, 0.6); fill(ctx, a.glow);
    ctx.restore();
  }
}

function drawBird(ctx, a, o) {
  const { c1, c2, belly, glow, feats } = a;
  const outline = shade(c2, -18);
  // tail feathers
  ctx.save();
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath(); ctx.moveTo(0, -30);
    ctx.quadraticCurveTo(i * 12, -14, i * 9 + Math.sin(o.time * 3 + i) * 2, 2);
    ctx.strokeStyle = i % 2 ? c2 : shade(c1, -10); ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.stroke();
  }
  ctx.restore();

  // legs
  limb(ctx, [[-7, -22], [-8, -7], [-13, -2]], 3, shade(c2, 18), outline, 1);
  limb(ctx, [[7, -22], [8, -7], [13, -2]], 3, shade(c2, 18), outline, 1);
  claws(ctx, -13, -2, 1, '#d8c89a', 0.8); claws(ctx, 13, -2, 1, '#d8c89a', 0.8);

  // folded wings
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 12, -62);
    ctx.quadraticCurveTo(s * 38, -53, s * 32, -22);
    ctx.quadraticCurveTo(s * 22, -25, s * 13, -34);
    ctx.closePath();
    fill(ctx, grad(ctx, s * 10, -60, s * 34, -20, [[0, shade(c1, 8)], [1, c2]]));
    stroke(ctx, outline, 2.5);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(s * 16, -48 + i * 7); ctx.quadraticCurveTo(s * 26, -44 + i * 7, s * 30, -34 + i * 7);
      ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 1.2; ctx.stroke();
    }
  }

  // body
  ell(ctx, 0, -47, 19, 26, grad(ctx, -19, -70, 19, -22, [[0, shade(c1, 24)], [1, c2]]), 0, outline, 2.5);
  ell(ctx, 0, -42, 11, 18, mix(belly, c1, 0.2));
  // feather texture
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.arc(0, -54 + i * 8, 10, 0.3, Math.PI - 0.3);
    ctx.strokeStyle = 'rgba(0,0,0,.14)'; ctx.lineWidth = 1; ctx.stroke();
  }

  // head
  const hy = -78;
  circ(ctx, 0, hy, 16, grad(ctx, -16, hy - 16, 16, hy + 16, [[0, shade(c1, 28)], [1, c1]]), outline, 2.5);
  // crest
  if (feats.has('crest')) {
    for (let i = -2; i <= 2; i++) {
      tri(ctx, [i * 4, hy - 12], [i * 8, hy - 30 - Math.abs(i) * -3], [i * 4 + 3, hy - 13], i % 2 ? c2 : shade(c1, 8), outline, 1.4);
    }
  }
  // beak
  ctx.beginPath(); ctx.moveTo(-3, hy + 2); ctx.quadraticCurveTo(0, hy + 14, 1, hy + 19);
  ctx.quadraticCurveTo(7, hy + 10, 4, hy + 1); ctx.closePath();
  fill(ctx, grad(ctx, 0, hy, 2, hy + 18, [[0, '#ffda8a'], [1, '#b97b32']])); stroke(ctx, outline, 1.6);
  // eyes
  eye(ctx, -5.5, hy - 4, 2.6, 2.8, a.eyeL, { slit: false });
  eye(ctx, 6, hy - 4, 2.6, 2.8, a.eyeR, { slit: false });
  // brow feathers
  ctx.beginPath(); ctx.moveTo(-11, hy - 9); ctx.lineTo(-4, hy - 5); ctx.moveTo(11, hy - 9); ctx.lineTo(4, hy - 5);
  ctx.strokeStyle = c2; ctx.lineWidth = 2; ctx.stroke();

  if (feats.has('wings')) {
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 14, -62);
      ctx.quadraticCurveTo(s * 44, -96, s * 52, -55);
      ctx.quadraticCurveTo(s * 34, -62, s * 22, -46); ctx.closePath();
      fill(ctx, 'rgba(255,255,255,.06)'); stroke(ctx, 'rgba(255,255,255,.15)', 1);
    }
  }
  if (feats.has('runes')) {
    ctx.save(); ctx.shadowColor = glow; ctx.shadowBlur = 7;
    ctx.strokeStyle = glow; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -43, 6, 0.4, 2.7); ctx.stroke();
    ctx.restore();
  }
}

function drawSerpent(ctx, a, o) {
  const { c1, c2, belly, glow, feats } = a;
  const outline = shade(c2, -18);
  const sway = Math.sin(o.time * 1.7 + o.seed) * 3;

  // coiled base
  ell(ctx, -6, -8, 30, 10, c2, 0, outline, 2.5);
  ell(ctx, 4, -14, 25, 9, shade(c1, -8), 0, outline, 2.5);
  ell(ctx, -2, -19, 18, 7, c1, 0, outline, 2);

  // tail tip
  ctx.beginPath(); ctx.moveTo(-30, -8); ctx.quadraticCurveTo(-44, -22, -34, -36);
  ctx.strokeStyle = outline; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.stroke();
  ctx.strokeStyle = c1; ctx.lineWidth = 6; ctx.stroke();

  // S body
  ctx.beginPath();
  ctx.moveTo(-2, -18);
  ctx.bezierCurveTo(-18, -38, 16, -46, 6 + sway, -64);
  ctx.bezierCurveTo(0, -78, 2, -80, 0, -86);
  ctx.strokeStyle = outline; ctx.lineWidth = 27; ctx.lineCap = 'round'; ctx.stroke();
  ctx.strokeStyle = grad(ctx, -16, -80, 16, -20, [[0, shade(c1, 18)], [0.6, c1], [1, c2]]); ctx.lineWidth = 22; ctx.stroke();
  // belly scales
  ctx.beginPath();
  ctx.moveTo(4, -30); ctx.bezierCurveTo(-2, -42, 14, -50, 8, -66);
  ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 3; ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]);

  // hood
  const hy = -90;
  const hood = feats.has('hood');
  if (hood) {
    ctx.beginPath();
    ctx.moveTo(0, hy + 12);
    ctx.quadraticCurveTo(-40, hy - 4, -30, hy - 26);
    ctx.quadraticCurveTo(-8, hy - 18, 0, hy - 22);
    ctx.quadraticCurveTo(8, hy - 18, 30, hy - 26);
    ctx.quadraticCurveTo(40, hy - 4, 0, hy + 12);
    fill(ctx, grad(ctx, -30, hy - 20, 30, hy + 10, [[0, shade(c1, 10)], [1, c2]]));
    stroke(ctx, outline, 2.5);
    // hood markings
    ctx.beginPath(); ctx.moveTo(-18, hy - 13); ctx.quadraticCurveTo(0, hy - 2, 18, hy - 13);
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; ctx.stroke();
  }

  // head
  ell(ctx, 0, hy, 12, 15, grad(ctx, -12, hy - 15, 12, hy + 15, [[0, shade(c1, 22)], [1, c1]]), 0, outline, 2.5);
  // snout
  ell(ctx, 0, hy + 10, 8, 6, shade(c1, 8), 0, outline, 1.6);
  // fangs
  tri(ctx, [-4.5, hy + 13], [-3, hy + 21], [-1.4, hy + 13], '#f2ead5', outline, 1);
  tri(ctx, [4.5, hy + 13], [3, hy + 21], [1.4, hy + 13], '#f2ead5', outline, 1);
  // eyes
  eye(ctx, -6.5, hy - 4, 3.1, 2.4, a.eyeL, { rot: -0.25 });
  eye(ctx, 6.5, hy - 4, 3.1, 2.4, a.eyeR, { rot: 0.25 });
  // scales
  for (let i = 0; i < 5; i++) {
    ctx.beginPath(); ctx.arc(-8 + i * 4, -56 - (i % 2) * 6, 5, -2.4, -0.5);
    ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 1.2; ctx.stroke();
  }
  if (feats.has('spikes') || feats.has('plates')) {
    for (let i = 0; i < 4; i++) {
      tri(ctx, [-4, -44 - i * 9], [2, -52 - i * 9], [6, -43 - i * 9], c2, outline, 1);
    }
  }
  if (feats.has('runes')) {
    ctx.save(); ctx.shadowColor = glow; ctx.shadowBlur = 8; ctx.strokeStyle = glow; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { E(ctx, -5 + i * 5, -40 - i * 8, 2.5, 4, 0.2); stroke(ctx, glow, 1); }
    ctx.restore();
  }
}

function drawInsect(ctx, a, o) {
  const { c1, c2, belly, glow, feats } = a;
  const outline = shade(c2, -20);
  const scorp = a.primary === 'scorpion' || feats.has('stinger');
  const mant = a.primary === 'mantis' || feats.has('blades');
  const sway = Math.sin(o.time * 2 + o.seed) * 2;

  // legs
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const y0 = -24 + i * 5;
      const knee = s * (24 + i * 5);
      limb(ctx, [[s * 12, y0], [knee, y0 + 8], [s * (14 + i * 3), 1]], 2.4, shade(c2, 22), outline, 1);
    }
  }

  // scorpion tail behind
  if (scorp) {
    ctx.beginPath();
    ctx.moveTo(-4, -30);
    ctx.bezierCurveTo(-44, -46, -50, -84, -18, -98);
    ctx.strokeStyle = outline; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.stroke();
    ctx.strokeStyle = c1; ctx.lineWidth = 8; ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const t = i / 4;
      const x = -8 - 30 * Math.sin(t * 2.2) - 2;
      const y = -40 - 48 * t;
      E(ctx, x, y, 5.5, 4.5, 0.5); fill(ctx, shade(c1, -8)); stroke(ctx, outline, 1);
    }
    ctx.save(); ctx.shadowColor = glow; ctx.shadowBlur = 12;
    tri(ctx, [-20, -96], [-16, -84], [-25, -91], glow, outline, 1.4);
    ctx.restore();
  }

  // wings (mantis / hybrid)
  if (mant || feats.has('wings')) {
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(0, -52);
      ctx.quadraticCurveTo(s * 30, -72, s * 24, -30);
      ctx.quadraticCurveTo(s * 12, -34, 0, -50);
      fill(ctx, 'rgba(190,255,220,.13)'); stroke(ctx, 'rgba(210,255,230,.25)', 1);
    }
  }

  // body segments
  ell(ctx, 0, -31, 19, 16, grad(ctx, -20, -46, 20, -16, [[0, shade(c1, 22)], [1, c2]]), 0, outline, 2.5);
  ell(ctx, 0, -50, 15, 14, grad(ctx, -15, -64, 15, -36, [[0, shade(c1, 28)], [1, c1]]), 0, outline, 2.5);
  ell(ctx, 0, -63, 11, 11, shade(c1, 6), 0, outline, 2);
  // carapace ridges
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.arc(0, -41 - i * 8, 11 + i * 2, 0.35, Math.PI - 0.35);
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1.4; ctx.stroke();
  }

  // head
  const hy = -78;
  ell(ctx, 0, hy, 13, 12, grad(ctx, -13, hy - 12, 13, hy + 12, [[0, shade(c1, 26)], [1, c1]]), 0, outline, 2.4);
  // antennae
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(s * 6, hy - 9);
    ctx.quadraticCurveTo(s * 16, hy - 24 + sway, s * 26, hy - 20 + sway);
    ctx.strokeStyle = outline; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.strokeStyle = shade(c1, 16); ctx.lineWidth = 1.2; ctx.stroke();
  }
  // eyes
  eye(ctx, -6.5, hy - 1, 3.6, 3.2, a.eyeL, { slit: false });
  eye(ctx, 6.5, hy - 1, 3.6, 3.2, a.eyeR, { slit: false });
  if (feats.has('extraEyes')) {
    eye(ctx, -11.5, hy - 6, 1.6, 1.6, a.eyeL, { slit: false, glow: false });
    eye(ctx, 11.5, hy - 6, 1.6, 1.6, a.eyeR, { slit: false, glow: false });
    eye(ctx, 0, hy - 9, 1.4, 1.4, a.eyeR, { slit: false, glow: false });
  }
  // mandibles
  ctx.beginPath(); ctx.moveTo(-5, hy + 8); ctx.lineTo(-9, hy + 15); ctx.moveTo(5, hy + 8); ctx.lineTo(9, hy + 15);
  ctx.strokeStyle = shade(c2, 30); ctx.lineWidth = 2; ctx.stroke();

  // claws / blades
  if (scorp) {
    for (const s of [-1, 1]) {
      limb(ctx, [[s * 17, -50], [s * 32, -44], [s * 35, -54]], 7, c1, outline, 1.6);
      E(ctx, s * 37, -60, 8, 6, 0.4 * s); fill(ctx, shade(c1, 8)); stroke(ctx, outline, 1.6);
      tri(ctx, [s * 42, -63], [s * 49, -58], [s * 39, -55], shade(c1, -16), outline, 1);
    }
  }
  if (mant) {
    for (const s of [-1, 1]) {
      limb(ctx, [[s * 14, -58], [s * 27, -50], [s * 22, -34]], 5, c2, outline, 1.4);
      ctx.beginPath(); ctx.moveTo(s * 22, -34);
      ctx.quadraticCurveTo(s * 46, -30, s * 38, -8);
      ctx.quadraticCurveTo(s * 28, -18, s * 23, -33);
      fill(ctx, grad(ctx, s * 20, -34, s * 38, -8, [[0, shade(belly, -18)], [1, shade(c2, 24)]]));
      stroke(ctx, outline, 1.4);
    }
  }
  if (feats.has('plates') && !scorp) {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(0, -40 - i * 9, 13 + i, 0.2, Math.PI - 0.2);
      ctx.strokeStyle = shade(belly, -30); ctx.lineWidth = 2; ctx.stroke();
    }
  }
  if (feats.has('runes')) {
    ctx.save(); ctx.shadowColor = glow; ctx.shadowBlur = 8; ctx.strokeStyle = glow; ctx.lineWidth = 1.5;
    E(ctx, 0, -43, 6, 4, 0); stroke(ctx, glow, 1.2);
    ctx.restore();
  }
}

function drawAmphibian(ctx, a, o) {
  const { c1, c2, belly, glow, feats } = a;
  const outline = shade(c2, -20);
  const breath = Math.sin(o.time * 2.4 + o.seed) * 1.5;

  // back legs folded
  ell(ctx, -27, -13, 12, 12, c2, 0.2, outline, 2);
  ell(ctx, 27, -13, 12, 12, c2, -0.2, outline, 2);
  for (const s of [-1, 1]) {
    ell(ctx, s * 33, -4, 12, 4.5, shade(c2, 14), 0, outline, 1.5);
  }
  // small arms
  limb(ctx, [[-20, -32], [-26, -20], [-30, -12]], 5, shade(c1, -8), outline, 1.2);
  limb(ctx, [[20, -32], [26, -20], [30, -12]], 5, shade(c1, -8), outline, 1.2);

  // squat body
  E(ctx, 0, -32, 32, 24);
  fill(ctx, grad(ctx, -30, -52, 30, -10, [[0, shade(c1, 20)], [0.65, c1], [1, c2]]));
  stroke(ctx, outline, 2.8);
  // belly/throat
  E(ctx, 0, -24, 20, 14 + breath);
  fill(ctx, mix(belly, c1, 0.18));
  ctx.globalAlpha = 0.5; ctx.beginPath();
  ctx.moveTo(-13, -18); ctx.quadraticCurveTo(0, -10 + breath, 13, -18);
  ctx.strokeStyle = shade(belly, -30); ctx.lineWidth = 1.4; ctx.stroke(); ctx.globalAlpha = 1;

  // head is merged with body
  const hy = -50;
  // eyes on top
  for (const s of [-1, 1]) {
    const ex = s * 13.5, ey = hy - 4;
    circ(ctx, ex, ey, 8.5, shade(c1, 6), outline, 2);
    eye(ctx, ex, ey, 6, 5, a.eyeL, { slit: false, rot: 0 });
    // horizontal toad pupil
    E(ctx, ex, ey, 4.5, 1.6); fill(ctx, DARK);
    ctx.beginPath(); ctx.arc(ex, ey, 6, 0.2, Math.PI - 0.2); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.stroke();
  }
  // wide mouth
  ctx.beginPath(); ctx.moveTo(-20, hy + 12); ctx.quadraticCurveTo(0, hy + 20, 20, hy + 12);
  ctx.strokeStyle = shade(c2, -6); ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.stroke();
  // nostrils
  circ(ctx, -5, hy + 5, 1.2, DARK); circ(ctx, 5, hy + 5, 1.2, DARK);

  if (feats.has('spots')) {
    ctx.save(); E(ctx, 0, -32, 31, 23); ctx.clip();
    for (let i = 0; i < 9; i++) {
      const x = ((i * 41) % 52) - 26; const y = -20 - ((i * 29) % 30);
      E(ctx, x, y, 4, 3, 0.2); fill(ctx, shade(c2, 12));
    }
    ctx.restore();
  }
  if (feats.has('horn')) {
    tri(ctx, [-8, hy - 8], [-11, hy - 26], [-2, hy - 10], '#efd39b', outline, 1.2);
    tri(ctx, [8, hy - 8], [11, hy - 26], [2, hy - 10], '#efd39b', outline, 1.2);
  }
  if (feats.has('wings')) {
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(0, -38);
      ctx.quadraticCurveTo(s * 40, -62, s * 46, -30);
      ctx.quadraticCurveTo(s * 24, -32, 0, -36);
      fill(ctx, 'rgba(220,255,220,.12)'); stroke(ctx, 'rgba(255,255,255,.16)', 1);
    }
  }
  if (feats.has('runes')) {
    ctx.save(); ctx.shadowColor = glow; ctx.shadowBlur = 8; ctx.strokeStyle = glow; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, -35, 8, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.restore();
  }
}

function drawDragon(ctx, a, o) {
  const { c1, c2, belly, glow, feats } = a;
  const outline = shade(c2, -20);
  const flap = Math.sin(o.time * 2.2 + o.seed) * 4;

  // tail
  ctx.beginPath(); ctx.moveTo(18, -32);
  ctx.bezierCurveTo(44, -30, 52, -10, 38, 2);
  ctx.strokeStyle = outline; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.stroke();
  ctx.strokeStyle = c1; ctx.lineWidth = 10; ctx.stroke();
  tri(ctx, [36, -1], [48, -6], [44, 4], c2, outline, 1);

  // wings behind
  for (const s of [-1, 1]) {
    const lift = (s === -1 ? flap : -flap) * 0.6;
    ctx.beginPath();
    ctx.moveTo(s * 12, -62);
    ctx.quadraticCurveTo(s * 46, -96 - lift, s * 58, -54 - lift);
    ctx.quadraticCurveTo(s * 42, -58, s * 38, -40);
    ctx.quadraticCurveTo(s * 30, -50, s * 18, -42);
    ctx.closePath();
    fill(ctx, grad(ctx, s * 12, -80, s * 52, -40, [[0, 'rgba(255,255,255,.16)'], [1, 'rgba(0,0,0,.25)']]));
    stroke(ctx, outline, 2.4);
    // wing bones
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(s * 14, -58);
      ctx.quadraticCurveTo(s * (32 + i * 6), -70 - i * 4 - lift, s * (48 - i * 3), -52 + i * 4);
      ctx.strokeStyle = shade(c2, 12); ctx.lineWidth = 2; ctx.stroke();
    }
  }

  // legs
  ell(ctx, -18, -16, 10, 15, c2, 0, outline, 2);
  ell(ctx, 18, -16, 10, 15, c2, 0, outline, 2);
  ell(ctx, -19, -3, 12, 4.5, shade(c2, 16), 0, outline, 1.6);
  ell(ctx, 19, -3, 12, 4.5, shade(c2, 16), 0, outline, 1.6);
  claws(ctx, -22, -2, 1, '#f0e2c0', 0.9); claws(ctx, 22, -2, 1, '#f0e2c0', 0.9);

  // torso
  E(ctx, 0, -47, 24, 31);
  fill(ctx, grad(ctx, -24, -78, 24, -18, [[0, shade(c1, 28)], [0.55, c1], [1, c2]]));
  stroke(ctx, outline, 3);
  E(ctx, 0, -38, 14, 20, mix(belly, c1, 0.15));
  // chest scales
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.arc(0, -54 + i * 7, 10, 0.35, Math.PI - 0.35);
    ctx.strokeStyle = 'rgba(0,0,0,.16)'; ctx.lineWidth = 1.2; ctx.stroke();
  }
  // arms
  limb(ctx, [[-22, -58], [-32, -42], [-28, -28]], 8, c1, outline, 1.6);
  limb(ctx, [[22, -58], [32, -42], [28, -28]], 8, c1, outline, 1.6);
  if (feats.has('claws')) {
    claws(ctx, -30, -25, 1, '#f0e2c0', 0.9); claws(ctx, 30, -25, 1, '#f0e2c0', 0.9);
  }

  // neck
  limb(ctx, [[0, -74], [0, -84]], 18, c1, outline, 2);

  // head
  const hy = -90;
  ell(ctx, 0, hy, 15, 14, grad(ctx, -15, hy - 14, 15, hy + 14, [[0, shade(c1, 26)], [1, c1]]), 0, outline, 2.6);
  // snout
  ell(ctx, 0, hy + 11, 11, 7, shade(c1, 4), 0, outline, 2);
  // horn
  tri(ctx, [-9, hy - 8], [-19, hy - 28], [-4, hy - 15], '#f2d9a2', outline, 1.4);
  tri(ctx, [9, hy - 8], [19, hy - 28], [4, hy - 15], '#f2d9a2', outline, 1.4);
  // eyes
  eye(ctx, -6.5, hy - 2, 3.1, 3.1, a.eyeL, { rot: -0.2 });
  eye(ctx, 6.5, hy - 2, 3.1, 3.1, a.eyeR, { rot: 0.2 });
  // fangs
  tri(ctx, [-6, hy + 14], [-4.4, hy + 20], [-2.6, hy + 14], '#f6edd3', null);
  tri(ctx, [6, hy + 14], [4.4, hy + 20], [2.6, hy + 14], '#f6edd3', null);
  // nostril glow
  ctx.save(); ctx.shadowColor = glow; ctx.shadowBlur = 9;
  circ(ctx, -4, hy + 8, 1.3, glow); circ(ctx, 4, hy + 8, 1.3, glow);
  ctx.restore();

  // dorsal spikes
  if (feats.has('spikes')) {
    for (let i = 0; i < 4; i++) {
      tri(ctx, [-4, -52 - i * 7], [0, -60 - i * 7], [4, -52 - i * 7], c2, outline, 1);
    }
  }
  if (feats.has('runes')) {
    ctx.save(); ctx.shadowColor = glow; ctx.shadowBlur = 9; ctx.strokeStyle = glow; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-8, -50); ctx.lineTo(0, -44); ctx.lineTo(8, -50); ctx.stroke();
    ctx.restore();
  }
}

function drawConstruct(ctx, a, o) {
  const { c1, c2, belly, glow, feats } = a;
  const outline = shade(c2, -24);
  const float = Math.sin(o.time * 1.6 + o.seed) * 1.2;

  // legs / base
  rrect(ctx, -24, -22, 17, 24, 5, shade(c2, 6), 0, outline, 2.4);
  rrect(ctx, 7, -22, 17, 24, 5, shade(c2, 6), 0, outline, 2.4);
  ell(ctx, -16, -2, 15, 5, shade(c2, 16), 0, outline, 1.6);
  ell(ctx, 16, -2, 15, 5, shade(c2, 16), 0, outline, 1.6);

  // floating shoulder stones
  for (const s of [-1, 1]) {
    E(ctx, s * 40, -63 + (s === 1 ? float : -float), 9, 12, -0.3 * s);
    fill(ctx, grad(ctx, s * 32, -78, s * 48, -48, [[0, shade(c1, 14)], [1, c2]]));
    stroke(ctx, outline, 2);
  }

  // arms
  for (const s of [-1, 1]) {
    rrect(ctx, s * 30 - 8, -58, 16, 32, 7, c1, 0.08 * s, outline, 2.2);
    E(ctx, s * 34, -28, 11, 10, 0); fill(ctx, shade(c1, -4)); stroke(ctx, outline, 2);
    for (let i = 0; i < 3; i++) {
      rrect(ctx, s * 34 - 8 + i * 6, -24, 5, 11, 2.5, shade(c2, 16), 0, outline, 1.2);
    }
  }

  // torso block
  ctx.beginPath();
  ctx.moveTo(-26, -58); ctx.lineTo(-21, -86); ctx.lineTo(-10, -94); ctx.lineTo(12, -93);
  ctx.lineTo(23, -84); ctx.lineTo(27, -54); ctx.lineTo(20, -22); ctx.lineTo(-22, -23); ctx.closePath();
  fill(ctx, grad(ctx, -26, -92, 26, -22, [[0, shade(c1, 22)], [0.55, c1], [1, c2]]));
  stroke(ctx, outline, 3);
  // cracks
  ctx.beginPath(); ctx.moveTo(-14, -84); ctx.lineTo(-7, -68); ctx.lineTo(-12, -55); ctx.lineTo(-3, -36);
  ctx.strokeStyle = shade(c2, -12); ctx.lineWidth = 2; ctx.stroke();

  // rune core
  ctx.save();
  ctx.shadowColor = glow; ctx.shadowBlur = 18;
  E(ctx, 0, -52, 10, 12); fill(ctx, 'rgba(8,20,24,.8)'); stroke(ctx, glow, 2);
  ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.moveTo(0, -62); ctx.lineTo(5, -52); ctx.lineTo(0, -42); ctx.lineTo(-5, -52); ctx.closePath();
  ctx.fillStyle = glow; ctx.fill();
  ctx.restore();

  // shoulder plates
  rrect(ctx, -22, -80, 15, 14, 5, shade(c1, 8), 0.35, outline, 1.8);
  rrect(ctx, 7, -80, 15, 14, 5, shade(c1, 4), -0.35, outline, 1.8);

  // head
  const hy = -100;
  ctx.beginPath();
  ctx.moveTo(-13, hy + 12); ctx.lineTo(-16, hy - 7); ctx.lineTo(-6, hy - 16); ctx.lineTo(7, hy - 16);
  ctx.lineTo(16, hy - 6); ctx.lineTo(13, hy + 12); ctx.closePath();
  fill(ctx, grad(ctx, -15, hy - 16, 15, hy + 12, [[0, shade(c1, 18)], [1, c1]]));
  stroke(ctx, outline, 2.4);
  // eyes
  ctx.save(); ctx.shadowColor = glow; ctx.shadowBlur = 10;
  rrect(ctx, -9, hy - 5, 6, 3.4, 1.5, glow, 0, null);
  rrect(ctx, 3, hy - 5, 6, 3.4, 1.5, a.eyeR, 0, null);
  ctx.restore();
  // head crystal
  tri(ctx, [-4, hy - 15], [0, hy - 28], [4, hy - 15], glow, outline, 1.2);

  if (feats.has('horn')) {
    tri(ctx, [-15, hy - 4], [-30, hy - 20], [-9, hy - 12], '#d8c6a2', outline, 1.4);
    tri(ctx, [15, hy - 4], [30, hy - 20], [9, hy - 12], '#d8c6a2', outline, 1.4);
  }
  if (feats.has('plates')) {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(-24, -40 - i * 8); ctx.lineTo(24, -45 - i * 8);
      ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 2; ctx.stroke();
    }
  }
  if (feats.has('mane')) {
    for (let i = 0; i < 5; i++) {
      tri(ctx, [-20 + i * 10, -82], [-13 + i * 10, -92], [-8 + i * 10, -80], c2, outline, 1);
    }
  }
}

function drawSpirit(ctx, a, o) {
  const { c1, c2, belly, glow, feats } = a;
  const outline = shade(c2, -24);
  const float = Math.sin(o.time * 2 + o.seed) * 3;

  // tattered cloak
  ctx.beginPath();
  ctx.moveTo(-26, -64);
  ctx.quadraticCurveTo(-38, -36, -30, -6);
  for (let i = 0; i < 5; i++) {
    const x = -30 + i * 14;
    ctx.lineTo(x + 5, -1 + ((i % 2) * 9) + float * 0.3);
    ctx.lineTo(x + 10, -10 + (i % 2) * 4);
  }
  ctx.quadraticCurveTo(36, -34, 26, -66);
  ctx.closePath();
  fill(ctx, grad(ctx, 0, -70, 0, -2, [[0, c1], [0.65, c2], [1, 'rgba(10,12,20,.75)']]));
  stroke(ctx, outline, 2.6);

  // inner glow at hem
  ctx.save(); ctx.shadowColor = glow; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.moveTo(-18, -74); ctx.quadraticCurveTo(0, -40, 18, -74);
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 10; ctx.stroke();
  ctx.restore();

  // tattered wings
  if (feats.has('wings')) {
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 18, -62);
      ctx.quadraticCurveTo(s * 54, -74, s * 46, -32);
      ctx.lineTo(s * 38, -40); ctx.lineTo(s * 34, -26); ctx.lineTo(s * 26, -36);
      ctx.closePath();
      fill(ctx, 'rgba(170,140,255,.14)'); stroke(ctx, 'rgba(190,165,255,.28)', 1.2);
    }
  }

  // arms / claws
  for (const s of [-1, 1]) {
    limb(ctx, [[s * 20, -60], [s * 34, -44], [s * 32, -30]], 7, shade(c1, 4), outline, 1.4);
    claws(ctx, s * 32, -28, 1, '#e8dcff', 0.9);
    ctx.beginPath(); ctx.moveTo(s * 30, -32); ctx.quadraticCurveTo(s * 40, -26, s * 34, -20);
    ctx.strokeStyle = 'rgba(200,180,255,.35)'; ctx.lineWidth = 3; ctx.stroke();
  }

  // hood
  const hy = -83;
  ctx.beginPath();
  ctx.moveTo(-19, hy + 18); ctx.quadraticCurveTo(-26, hy - 10, 0, hy - 24);
  ctx.quadraticCurveTo(26, hy - 10, 19, hy + 18);
  ctx.quadraticCurveTo(9, hy + 8, 0, hy + 9);
  ctx.quadraticCurveTo(-9, hy + 8, -19, hy + 18);
  fill(ctx, grad(ctx, -20, hy - 20, 20, hy + 16, [[0, shade(c1, 14)], [1, c2]]));
  stroke(ctx, outline, 2.4);
  // hood opening
  E(ctx, 0, hy + 2, 11, 12); fill(ctx, '#0a0714');
  // eyes
  ctx.save(); ctx.shadowColor = a.glow; ctx.shadowBlur = 12;
  E(ctx, -5, hy, 2.6, 3.4, -0.15); fill(ctx, a.eyeL);
  E(ctx, 5, hy, 2.6, 3.4, 0.15); fill(ctx, a.eyeR);
  ctx.restore();
  // tiny wisps
  ctx.save(); ctx.globalAlpha = 0.5;
  for (let i = 0; i < 4; i++) {
    const ang = o.time * 1.1 + i * 1.7;
    E(ctx, Math.cos(ang) * (26 + i * 3), -50 + Math.sin(ang * 1.4) * 20, 1.5, 2.6, ang);
    fill(ctx, glow);
  }
  ctx.restore();
}

const BODIES = {
  beast: drawBeast,
  bird: drawBird,
  serpent: drawSerpent,
  insect: drawInsect,
  amphibian: drawAmphibian,
  dragon: drawDragon,
  construct: drawConstruct,
  spirit: drawSpirit,
};

// ── cross-lineage ornaments ────────────────────────────────────────────────
function drawWingsBack(ctx, a, o) {
  if (a.accentBody === 'bird' || a.body === 'bird' || a.body === 'dragon' || a.body === 'spirit') return;
  if (!a.feats.has('wings')) return;
  const flap = Math.sin(o.time * 2 + o.seed) * 4;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 14, -64);
    ctx.quadraticCurveTo(s * 56, -92 - flap, s * 62, -46 - flap);
    ctx.quadraticCurveTo(s * 42, -50, s * 34, -34);
    ctx.quadraticCurveTo(s * 26, -46, s * 14, -40);
    ctx.closePath();
    fill(ctx, 'rgba(160,220,255,.10)');
    stroke(ctx, 'rgba(190,235,255,.22)', 1.2);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(s * 16, -58);
      ctx.quadraticCurveTo(s * 38, -68 - i * 6, s * 54 - i * 4, -48 + i * 3);
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1; ctx.stroke();
    }
  }
}

function drawExtraTail(ctx, a, o) {
  if (['beast', 'serpent', 'dragon', 'insect', 'spirit'].includes(a.body)) return;
  if (!a.feats.has('tail') && !a.feats.has('stinger')) return;
  ctx.beginPath(); ctx.moveTo(16, -40);
  ctx.bezierCurveTo(44, -34, 50, -12, 34, 0);
  ctx.strokeStyle = shade(a.c2, -20); ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.stroke();
  ctx.strokeStyle = a.c1; ctx.lineWidth = 6; ctx.stroke();
  if (a.feats.has('stinger')) {
    ctx.save(); ctx.shadowColor = a.glow; ctx.shadowBlur = 8;
    tri(ctx, [30, -4], [42, 0], [33, 7], a.glow, shade(a.c2, -20), 1);
    ctx.restore();
  }
}

function drawExtraHorns(ctx, a) {
  if (a.feats.has('horn') === false) return;
  if (!['insect', 'bird', 'amphibian', 'serpent', 'spirit'].includes(a.body)) return;
  const hy = a.body === 'amphibian' ? -58 : a.body === 'insect' ? -90 : -80;
  tri(ctx, [-10, hy], [-20, hy - 22], [-3, hy - 8], '#e8d3a4', shade(a.c2, -18), 1.2);
  tri(ctx, [10, hy], [20, hy - 22], [3, hy - 8], '#e8d3a4', shade(a.c2, -18), 1.2);
}

function drawTierHalo(ctx, a, o) {
  if (a.tier < 3) return;
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 3; i++) {
    const ang = o.time * 0.9 + i * TAU / 3;
    const x = Math.cos(ang) * 34;
    const y = -92 + Math.sin(ang) * 8;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang + Math.PI / 2);
    ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(2.4, 0); ctx.lineTo(0, 3); ctx.lineTo(-2.4, 0); ctx.closePath();
    ctx.fillStyle = a.glow; ctx.shadowColor = a.glow; ctx.shadowBlur = 8; ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// ══ PUBLIC DRAW ═════════════════════════════════════════════════════════════
export function drawCreature(ctx, art, x, y, scale, opts = {}) {
  const {
    time = 0, seed = 0, alpha = 1, team = 'player', flash = 0,
    animate = true, ring = true, dead = false, bob = 1,
  } = opts;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  if (dead) ctx.globalAlpha *= 0.5;

  // team aura + ground ring
  if (ring) {
    const teamColor = team === 'player' ? '#5fe3d1' : '#ff5c6c';
    ctx.save();
    ctx.translate(0, 2);
    ctx.scale(1, 0.3);
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 42 * scale);
    g.addColorStop(0, `${teamColor}66`); g.addColorStop(1, `${teamColor}00`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 42 * scale, 0, TAU); ctx.fill();
    ctx.strokeStyle = `${teamColor}88`; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, 0, 28 * scale, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  // shadow
  ctx.save(); ctx.scale(1, 0.34);
  const sh = ctx.createRadialGradient(0, 0, 2, 0, 0, 30);
  sh.addColorStop(0, 'rgba(0,0,0,.55)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(0, 4, 30, 0, TAU); ctx.fill();
  ctx.restore();

  if (animate && bob) ctx.translate(0, Math.sin(time * 2.2 + seed) * 1.4);
  ctx.scale(scale, scale);
  if (flash > 0.01) ctx.filter = `brightness(${1 + flash * 1.9}) saturate(${1 + flash})`;

  const a = art;
  drawWingsBack(ctx, a, { ...opts, time, seed });
  drawExtraTail(ctx, a, { time, seed });
  const draw = BODIES[a.body] || drawBeast;
  draw(ctx, a, { time, seed, team });
  drawExtraHorns(ctx, a);
  if (a.tier >= 3) drawTierHalo(ctx, a, { time });

  ctx.restore();
}

export function drawPortrait(canvas, unit, size = 96, opts = {}) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = size * dpr; canvas.height = size * dpr;
  canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const scale = (size / 132) * 1.02 * (unit.art.scale || 1);
  drawCreature(ctx, unit.art, size / 2, size * 0.94, scale, {
    ring: false, animate: false, time: 0, seed: 0, ...opts,
  });
}
