// ─────────────────────────────────────────────────────────────
//  CHIMERA — procedural creature art
//  Everything is drawn with the 2D canvas. No image assets.
// ─────────────────────────────────────────────────────────────

const TAU = Math.PI * 2

function hexToRgb(hex) {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
}
export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b)
  return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t)
}
export function shade(hex, amt) {
  return amt < 0 ? mix(hex, '#000000', -amt) : mix(hex, '#ffffff', amt)
}
export function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

function ell(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU)
}
function poly(ctx, pts, close = true) {
  ctx.beginPath()
  pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))
  if (close) ctx.closePath()
}
function curve(ctx, pts) {
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length - 1; i++) {
    const xc = (pts[i][0] + pts[i + 1][0]) / 2
    const yc = (pts[i][1] + pts[i + 1][1]) / 2
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], xc, yc)
  }
  const last = pts[pts.length - 1]
  ctx.lineTo(last[0], last[1])
}
function bodyGrad(ctx, color, accent, y0, y1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1)
  g.addColorStop(0, mix(color, '#ffffff', 0.18))
  g.addColorStop(0.45, color)
  g.addColorStop(1, shade(color, -0.38))
  return g
}

// ─────────── shared adornments ───────────

function drawWings(ctx, pal, t, kind = 'avian', alpha = 1) {
  const flap = Math.sin(t * 3.1) * 0.12
  ctx.save()
  ctx.globalAlpha *= alpha
  for (const side of [-1, 1]) {
    ctx.save()
    ctx.rotate(side * (0.08 + flap))
    const grad = ctx.createLinearGradient(-10, -80, -55, -30)
    grad.addColorStop(0, rgba(pal.accent, 0.85))
    grad.addColorStop(1, rgba(pal.deep, 0.9))
    if (kind === 'avian') {
      poly(ctx, [[-4, -62], [-58, -92], [-48, -63], [-62, -58], [-38, -46], [-20, -44]])
      ctx.fillStyle = grad
      ctx.fill()
      ctx.strokeStyle = rgba(pal.accent, 0.65)
      ctx.lineWidth = 1.1
      ctx.stroke()
      // feather lines
      ctx.strokeStyle = rgba(pal.soft, 0.32)
      ctx.lineWidth = 0.8
      for (let i = 0; i < 4; i++) {
        ctx.beginPath()
        ctx.moveTo(-12 - i * 4, -58 + i * 2)
        ctx.quadraticCurveTo(-40 - i * 4, -72 + i * 3, -54 + i * 3, -62 + i * 5)
        ctx.stroke()
      }
    } else {
      // leathery wing
      poly(ctx, [[-6, -66], [-48, -100], [-72, -79], [-58, -66], [-70, -48], [-40, -42], [-20, -40]])
      ctx.fillStyle = grad
      ctx.fill()
      ctx.strokeStyle = rgba(pal.accent, 0.8)
      ctx.lineWidth = 1.2
      ctx.stroke()
      ctx.strokeStyle = rgba(pal.deep, 0.9)
      for (const end of [[-66, -80], [-56, -58], [-38, -44]]) {
        ctx.beginPath(); ctx.moveTo(-12, -62); ctx.lineTo(end[0], end[1]); ctx.stroke()
      }
    }
    ctx.restore()
  }
  ctx.restore()
}

function drawHorns(ctx, pal, size = 1) {
  ctx.save()
  ctx.fillStyle = mix(pal.accent, '#f8e6c0', 0.35)
  ctx.strokeStyle = rgba(pal.deep, 0.9)
  ctx.lineWidth = 1
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(20 + side * 6, -82 * size)
    ctx.quadraticCurveTo(36 + side * 16, -102 * size, 28 + side * 26, -104 * size)
    ctx.quadraticCurveTo(28 + side * 8, -90 * size, 30 + side * 6, -78 * size)
    ctx.closePath()
    ctx.fill(); ctx.stroke()
  }
  ctx.restore()
}

function drawSpikes(ctx, pal, y = -66, count = 5, color) {
  ctx.save()
  ctx.fillStyle = color || mix(pal.accent, pal.deep, 0.35)
  for (let i = 0; i < count; i++) {
    const x = -26 + i * 14
    const h = 11 + Math.sin(i * 1.7) * 5
    poly(ctx, [[x - 4, y], [x, y - h], [x + 4, y]])
    ctx.fill()
  }
  ctx.restore()
}

function drawOrbs(ctx, pal, t, n = 4) {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < n; i++) {
    const a = t * 0.7 + i * (TAU / n)
    const x = Math.cos(a) * (36 + i * 4)
    const y = -48 + Math.sin(a * 1.4) * 22
    const r = 2 + Math.sin(t * 2 + i) * 1.2
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4)
    g.addColorStop(0, rgba(pal.accent, 0.9))
    g.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = g
    ell(ctx, x, y, r * 4, r * 4); ctx.fill()
  }
  ctx.restore()
}

function drawShards(ctx, pal, t) {
  ctx.save()
  for (let i = 0; i < 4; i++) {
    const a = t * 0.5 + i * (TAU / 4)
    const x = Math.cos(a) * 34
    const y = -52 + Math.sin(a + 0.8) * 24
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(a * 1.3)
    poly(ctx, [[0, -5], [4, 0], [0, 5], [-4, 0]])
    ctx.fillStyle = rgba(pal.accent, 0.8)
    ctx.fill()
    ctx.strokeStyle = rgba(pal.soft, 0.5)
    ctx.stroke()
    ctx.restore()
  }
  ctx.restore()
}

function drawTendrils(ctx, pal, t, n = 4, from = [-6, -26], length = 34) {
  ctx.save()
  ctx.lineCap = 'round'
  for (let i = 0; i < n; i++) {
    const sway = Math.sin(t * 1.7 + i * 1.2) * 8
    const sx = from[0] + (i - n / 2) * 15
    ctx.beginPath()
    ctx.moveTo(sx, from[1])
    ctx.bezierCurveTo(sx - 12 + sway, -4, sx - 26 - sway, 10, sx - 18 + sway, 26 + i * 2)
    ctx.strokeStyle = i === 0 ? rgba(pal.accent, 0.65) : rgba(pal.color, 0.38)
    ctx.lineWidth = 7 - i
    ctx.stroke()
  }
  ctx.restore()
}

function drawEyes(ctx, x, y, spread, color = '#ffe9a8', size = 2.2, glow = true) {
  ctx.save()
  if (glow) {
    ctx.shadowColor = color
    ctx.shadowBlur = 8
  }
  ctx.fillStyle = color
  ell(ctx, x - spread, y, size, size * 0.7); ctx.fill()
  ell(ctx, x + spread, y, size, size * 0.7); ctx.fill()
  ctx.restore()
}

// ─────────── silhouettes ───────────

function drawBeast(ctx, pal, t, moving, atk, walk) {
  const leg = moving ? Math.sin(walk) * 4 : 0
  const leg2 = moving ? Math.sin(walk + Math.PI) * 4 : 0
  const bob = Math.sin(t * 2.2) * 1.4

  // tail
  ctx.save()
  ctx.translate(0, bob)
  ctx.beginPath()
  ctx.moveTo(-28, -48)
  ctx.quadraticCurveTo(-55, -62, -58, -78 + Math.sin(t * 2) * 4)
  ctx.strokeStyle = pal.color
  ctx.lineWidth = 9
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.strokeStyle = rgba(pal.soft, 0.6)
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.restore()

  // back legs
  ctx.strokeStyle = shade(pal.color, -0.25)
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  for (const [x, ph] of [[-20, leg2], [14, leg]]) {
    ctx.beginPath()
    ctx.moveTo(x, -30)
    ctx.quadraticCurveTo(x - 3 + ph, -14, x + ph, 2)
    ctx.stroke()
  }

  // body
  ctx.save()
  ctx.translate(0, bob)
  const grad = bodyGrad(ctx, pal.color, pal.accent, -76, -20)
  ell(ctx, 0, -50, 34, 23, -0.08)
  ctx.fillStyle = grad
  ctx.fill()
  ctx.strokeStyle = rgba(pal.deep, 0.65)
  ctx.lineWidth = 1.4
  ctx.stroke()

  // belly
  ell(ctx, 3, -38, 25, 10, -0.05)
  ctx.fillStyle = rgba(pal.soft, 0.16); ctx.fill()

  // flank markings
  ctx.strokeStyle = rgba(pal.accent, 0.7)
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-18, -58); ctx.quadraticCurveTo(0, -64, 18, -57)
  ctx.stroke()
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.moveTo(-12 + i * 10, -61); ctx.lineTo(-16 + i * 10, -50)
    ctx.stroke()
  }

  // neck + head
  ctx.beginPath()
  ctx.moveTo(18, -62)
  ctx.quadraticCurveTo(28, -72, 32, -72)
  ctx.lineTo(42, -64)
  ctx.lineTo(18, -52)
  ctx.closePath()
  ctx.fillStyle = shade(pal.color, -0.08); ctx.fill()
  ctx.strokeStyle = rgba(pal.deep, 0.55); ctx.stroke()

  // ears
  ctx.fillStyle = shade(pal.color, -0.15)
  poly(ctx, [[23, -80], [27, -95], [34, -79]]); ctx.fill()
  poly(ctx, [[32, -79], [39, -92], [42, -76]]); ctx.fill()

  // head
  ell(ctx, 33, -72, 15, 13, 0.08)
  ctx.fillStyle = bodyGrad(ctx, pal.color, pal.accent, -88, -60)
  ctx.fill()
  ctx.strokeStyle = rgba(pal.deep, 0.65); ctx.stroke()

  // muzzle
  poly(ctx, [[42, -78], [55, -74], [54, -66], [41, -66]])
  ctx.fillStyle = shade(pal.color, -0.22); ctx.fill()
  ctx.strokeStyle = rgba(pal.deep, 0.6); ctx.stroke()
  ell(ctx, 52, -73, 2, 1.6)
  ctx.fillStyle = pal.deep; ctx.fill()

  // mane
  ctx.fillStyle = rgba(pal.accent, 0.8)
  for (let i = 0; i < 5; i++) {
    poly(ctx, [[10 + i * 5, -71], [15 + i * 5, -84 - Math.sin(i) * 4], [20 + i * 5, -69]])
    ctx.fill()
  }

  drawEyes(ctx, 37, -75, 3.4, mix(pal.soft, '#ffffff', 0.35), 2)
  ctx.restore()

  // front legs
  ctx.strokeStyle = shade(pal.color, -0.12)
  ctx.lineWidth = 7
  for (const [x, ph] of [[24, leg], [-8, leg2]]) {
    ctx.beginPath()
    ctx.moveTo(x, -34)
    ctx.quadraticCurveTo(x + 3 + ph, -16, x + ph, 1)
    ctx.stroke()
  }
  ctx.fillStyle = pal.accent
  for (const [x, ph] of [[-20, leg2], [14, leg], [24, leg], [-8, leg2]]) {
    ell(ctx, x + ph, 2, 5, 2.5); ctx.fill()
  }
}

function drawAvian(ctx, pal, t, moving, atk, walk) {
  const flap = Math.sin(t * 4.6) * 7
  const bob = Math.sin(t * 2.4) * 2.2
  // far wing
  ctx.save()
  ctx.globalAlpha = 0.75
  poly(ctx, [[-6, -58], [-38, -96 - flap], [-54, -72], [-30, -52]])
  ctx.fillStyle = shade(pal.accent, -0.25); ctx.fill()
  ctx.strokeStyle = rgba(pal.deep, 0.6); ctx.stroke()
  ctx.restore()

  // tail feathers
  ctx.fillStyle = shade(pal.color, -0.2)
  for (let i = 0; i < 3; i++) {
    poly(ctx, [[-12, -46 + i * 4], [-52 - i * 6, -40 + i * 4], [-44 - i * 4, -30 + i * 4]])
    ctx.fill()
    ctx.strokeStyle = rgba(pal.accent, 0.55); ctx.stroke()
  }

  // legs
  ctx.strokeStyle = mix(pal.accent, '#f4d08a', 0.5)
  ctx.lineWidth = 2.6
  ctx.beginPath(); ctx.moveTo(-2, -22); ctx.lineTo(-5, 1); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(6, -22); ctx.lineTo(9, 1); ctx.stroke()
  for (const x of [-5, 9]) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 4, 3); ctx.moveTo(x, 0); ctx.lineTo(x + 4, 3); ctx.stroke() }

  ctx.save()
  ctx.translate(0, bob)
  // body
  ell(ctx, 0, -48, 24, 30, 0.15)
  ctx.fillStyle = bodyGrad(ctx, pal.color, pal.accent, -78, -20); ctx.fill()
  ctx.strokeStyle = rgba(pal.deep, 0.6); ctx.lineWidth = 1.3; ctx.stroke()

  // breast
  ell(ctx, 8, -42, 13, 17, 0.2)
  ctx.fillStyle = rgba(pal.soft, 0.25); ctx.fill()

  // head
  ell(ctx, 18, -76, 12, 11, 0.1)
  ctx.fillStyle = bodyGrad(ctx, pal.color, pal.accent, -88, -64); ctx.fill()
  ctx.strokeStyle = rgba(pal.deep, 0.6); ctx.stroke()

  // beak
  poly(ctx, [[27, -79], [41, -74], [27, -69]])
  ctx.fillStyle = mix(pal.accent, '#ffd27a', 0.55); ctx.fill()
  ctx.strokeStyle = rgba(pal.deep, 0.55); ctx.stroke()

  // crest
  ctx.strokeStyle = pal.accent
  ctx.lineWidth = 2
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.moveTo(12 + i * 4, -86)
    ctx.quadraticCurveTo(10 + i * 6, -100 - i * 2, 2 + i * 7, -102 - i * 3)
    ctx.stroke()
  }

  drawEyes(ctx, 19, -78, 3.2, '#fff3c4', 2.1)

  // near wing, swept back
  poly(ctx, [[-8, -62], [-24, -104 - flap], [-44, -82], [-34, -56], [-10, -48]])
  const wg = ctx.createLinearGradient(0, -100, -40, -50)
  wg.addColorStop(0, rgba(pal.soft, 0.95))
  wg.addColorStop(0.55, rgba(pal.color, 0.85))
  wg.addColorStop(1, rgba(pal.accent, 0.65))
  ctx.fillStyle = wg; ctx.fill()
  ctx.strokeStyle = rgba(pal.accent, 0.8); ctx.lineWidth = 1; ctx.stroke()
  ctx.strokeStyle = rgba(pal.deep, 0.35)
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.moveTo(-14, -58 - i * 4)
    ctx.quadraticCurveTo(-26, -76 - i * 5, -34, -88 - flap + i * 5)
    ctx.stroke()
  }
  ctx.restore()
}

function drawReptile(ctx, pal, t, moving, atk, walk) {
  const bob = Math.sin(t * 2) * 1.6
  const sway = Math.sin(t * 1.4) * 5
  // tail
  ctx.save()
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-8, -22)
  ctx.bezierCurveTo(-30, -20, -50, -10, -40 + sway, 2)
  ctx.strokeStyle = shade(pal.color, -0.14); ctx.lineWidth = 13; ctx.stroke()
  ctx.strokeStyle = rgba(pal.accent, 0.55); ctx.lineWidth = 4; ctx.stroke()
  ctx.restore()

  // back spikes
  ctx.save()
  ctx.fillStyle = rgba(pal.accent, 0.85)
  for (let i = 0; i < 4; i++) {
    const y = -34 - i * 10
    poly(ctx, [[-14, y], [-24, y - 9], [-8, y - 5]])
    ctx.fill()
  }
  ctx.restore()

  // coil body
  ctx.save()
  ctx.translate(0, bob)
  ctx.beginPath()
  ctx.moveTo(0, -24)
  ctx.bezierCurveTo(-16, -36, 16, -52, 2, -64)
  ctx.strokeStyle = bodyGrad(ctx, pal.color, pal.accent, -70, -20)
  ctx.lineWidth = 26
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.strokeStyle = rgba(pal.deep, 0.5)
  ctx.lineWidth = 26
  ctx.stroke()
  ctx.strokeStyle = bodyGrad(ctx, pal.color, pal.accent, -70, -20)
  ctx.lineWidth = 23
  ctx.stroke()

  // belly plates
  ctx.strokeStyle = rgba(pal.soft, 0.35)
  ctx.lineWidth = 1.4
  for (let i = 0; i < 5; i++) {
    const y = -30 - i * 7
    ctx.beginPath(); ctx.moveTo(6, y); ctx.lineTo(14, y + 2); ctx.stroke()
  }

  // hood
  const hood = ctx.createLinearGradient(-30, -80, 20, -50)
  hood.addColorStop(0, rgba(pal.accent, 0.15))
  hood.addColorStop(1, rgba(pal.accent, 0.7))
  ctx.beginPath()
  ctx.moveTo(0, -58)
  ctx.quadraticCurveTo(-38, -76, -26, -88)
  ctx.quadraticCurveTo(2, -98, 22, -80)
  ctx.quadraticCurveTo(32, -66, 22, -58)
  ctx.closePath()
  ctx.fillStyle = hood; ctx.fill()
  ctx.strokeStyle = rgba(pal.deep, 0.6); ctx.stroke()

  // head
  ell(ctx, 15, -76, 15, 12, -0.1)
  ctx.fillStyle = bodyGrad(ctx, pal.color, pal.accent, -90, -64); ctx.fill()
  ctx.strokeStyle = rgba(pal.deep, 0.65); ctx.stroke()

  // crown scales
  ctx.fillStyle = rgba(pal.accent, 0.9)
  poly(ctx, [[4, -84], [7, -94], [12, -84]]); ctx.fill()
  poly(ctx, [[13, -85], [18, -97], [22, -84]]); ctx.fill()

  // eye
  drawEyes(ctx, 20, -79, 3.4, mix(pal.soft, '#ffffff', 0.4), 2.4)

  // tongue
  ctx.strokeStyle = '#ff6c8c'; ctx.lineWidth = 1.4; ctx.lineCap = 'round'
  const flick = (Math.sin(t * 4) + 1) * 5
  ctx.beginPath(); ctx.moveTo(28, -72); ctx.lineTo(36 + flick, -70);
  ctx.stroke()
  ctx.beginPath(); ctx.moveTo(36 + flick, -70); ctx.lineTo(40 + flick, -74); ctx.moveTo(36 + flick, -70); ctx.lineTo(41 + flick, -67); ctx.stroke()
  ctx.restore()
}

function drawTurtle(ctx, pal, t, moving, atk, walk) {
  const bob = Math.sin(t * 1.8) * 1
  // stubby legs
  ctx.strokeStyle = shade(pal.color, -0.25); ctx.lineWidth = 7; ctx.lineCap = 'round'
  for (const x of [-24, -8, 12, 26]) {
    ctx.beginPath(); ctx.moveTo(x, -14); ctx.lineTo(x + Math.sin(t * 2 + x) * 1.5, 0); ctx.stroke()
  }
  // tail
  ctx.beginPath(); ctx.moveTo(-34, -22); ctx.lineTo(-46, -14); ctx.strokeStyle = pal.color; ctx.lineWidth = 5; ctx.stroke()

  ctx.save(); ctx.translate(0, bob)
  const grad = ctx.createLinearGradient(0, -76, 0, -8)
  grad.addColorStop(0, mix(pal.color, '#fff', 0.25)); grad.addColorStop(1, shade(pal.color, -0.35))
  ctx.beginPath()
  ctx.moveTo(-34, -34)
  ctx.quadraticCurveTo(-30, -78, 2, -80)
  ctx.quadraticCurveTo(34, -78, 36, -32)
  ctx.quadraticCurveTo(22, -14, 0, -15)
  ctx.quadraticCurveTo(-22, -14, -34, -34)
  ctx.closePath()
  ctx.fillStyle = grad; ctx.fill()
  ctx.strokeStyle = rgba(pal.deep, 0.75); ctx.lineWidth = 1.6; ctx.stroke()

  // shell plates
  ctx.strokeStyle = rgba(pal.deep, 0.45); ctx.lineWidth = 1.3
  for (let i = 0; i < 4; i++) {
    ctx.beginPath()
    ctx.ellipse(0, -48, 28 - i * 4, 22 - i * 3, 0, 0, TAU)
    ctx.stroke()
  }
  ctx.beginPath(); ctx.moveTo(0, -74); ctx.lineTo(0, -22)
  ctx.moveTo(-28, -48); ctx.lineTo(28, -48); ctx.stroke()
  // rim
  ctx.beginPath(); ctx.ellipse(0, -30, 35, 9, 0, 0, TAU)
  ctx.strokeStyle = rgba(pal.accent, 0.8); ctx.lineWidth = 2; ctx.stroke()

  // head
  ctx.beginPath(); ctx.moveTo(28, -52); ctx.quadraticCurveTo(46, -52, 46, -40); ctx.quadraticCurveTo(44, -32, 28, -34); ctx.closePath()
  ctx.fillStyle = mix(pal.color, pal.accent, 0.25); ctx.fill(); ctx.strokeStyle = rgba(pal.deep, 0.6); ctx.stroke()
  drawEyes(ctx, 39, -43, 2.6, '#fff2b8', 1.7)
  // rim runes
  ctx.fillStyle = rgba(pal.soft, 0.5)
  for (let i = -2; i <= 2; i++) { ell(ctx, i * 9, -31, 1.5, 2.2); ctx.fill() }
  ctx.restore()
}

function drawInsect(ctx, pal, t, moving, atk, walk) {
  const bob = Math.sin(t * 3.4) * 2
  const step = moving ? Math.sin(t * 12) * 3 : Math.sin(t * 2) * 1
  // legs
  ctx.strokeStyle = shade(pal.color, -0.35); ctx.lineWidth = 2.2; ctx.lineCap = 'round'
  for (let i = 0; i < 3; i++) {
    const x = -10 + i * 12
    ctx.beginPath(); ctx.moveTo(x, -38); ctx.quadraticCurveTo(x - 12, -22, x - 18 + step, 0); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x + 3, -38); ctx.quadraticCurveTo(x + 10, -18, x + 12 - step, 0); ctx.stroke()
  }
  // wings
  ctx.save(); ctx.globalAlpha = 0.32
  const flap = Math.sin(t * 9) * 0.15
  for (const s of [-1, 1]) {
    ctx.save(); ctx.rotate(s * (0.2 + flap)); ctx.translate(-10, -56)
    ell(ctx, -18, 0, 26, 9, -0.35)
    ctx.fillStyle = pal.soft; ctx.fill()
    ctx.strokeStyle = rgba(pal.accent, 0.7); ctx.stroke()
    ctx.restore()
  }
  ctx.restore()

  // abdomen segments
  ctx.save(); ctx.translate(0, bob)
  for (let i = 0; i < 3; i++) {
    ell(ctx, -22 - i * 10, -42 + i * 2, 12 - i * 2, 9 - i * 1.5, 0.1)
    ctx.fillStyle = i % 2 ? shade(pal.color, -0.2) : pal.color
    ctx.fill(); ctx.strokeStyle = rgba(pal.deep, 0.6); ctx.stroke()
  }
  // thorax
  ell(ctx, 2, -46, 16, 18, -0.15)
  ctx.fillStyle = bodyGrad(ctx, pal.color, pal.accent, -66, -30); ctx.fill()
  ctx.strokeStyle = rgba(pal.deep, 0.65); ctx.stroke()

  // head
  poly(ctx, [[8, -66], [28, -76], [28, -56], [10, -48]])
  ctx.fillStyle = bodyGrad(ctx, pal.color, pal.accent, -78, -48); ctx.fill()
  ctx.strokeStyle = rgba(pal.deep, 0.6); ctx.stroke()
  // compound eyes
  ctx.save(); ctx.shadowColor = pal.accent; ctx.shadowBlur = 6
  ctx.fillStyle = mix(pal.accent, '#ffffff', 0.25)
  ell(ctx, 22, -70, 5.5, 6.5, -0.3); ctx.fill()
  ell(ctx, 20, -61, 4, 4.5, 0.3); ctx.fill()
  ctx.restore()
  // antennae
  ctx.strokeStyle = pal.accent; ctx.lineWidth = 1.4
  ctx.beginPath(); ctx.moveTo(26, -76); ctx.quadraticCurveTo(38, -94, 48, -88); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(24, -77); ctx.quadraticCurveTo(32, -98, 42, -98); ctx.stroke()

  // scythe arms
  const raise = atk > 0 ? Math.sin(atk * Math.PI) * 0.7 : 0
  for (const s of [-1, 1]) {
    ctx.save()
    ctx.translate(8, -54 + s * 3)
    ctx.rotate(-0.5 - raise * s * 0.6)
    ctx.strokeStyle = mix(pal.accent, '#ffffff', 0.15); ctx.lineWidth = 3.2
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(22, -10); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(22, -10); ctx.lineTo(46, -28); ctx.stroke()
    ctx.fillStyle = mix(pal.accent, '#ffffff', 0.35)
    poly(ctx, [[44, -30], [56, -34], [51, -21]]); ctx.fill()
    ctx.strokeStyle = rgba(pal.deep, 0.5); ctx.lineWidth = 0.8; ctx.stroke()
    ctx.restore()
  }
  // thorax marking
  ctx.fillStyle = rgba(pal.accent, 0.8)
  poly(ctx, [[0, -56], [7, -48], [0, -40], [-7, -48]]); ctx.fill()
  ctx.restore()
}

function drawConstruct(ctx, pal, t, moving, atk, walk) {
  const bob = Math.sin(t * 1.4) * 1.4
  // legs
  ctx.fillStyle = shade(pal.color, -0.3)
  for (const s of [-1, 1]) {
    ctx.fillRect(s * 14 - 5, -26, 10, 25)
    ctx.fillRect(s * 14 - 8, -4, 16, 5)
  }
  drawShards(ctx, pal, t * 0.7)
  ctx.save(); ctx.translate(0, bob)
  // body hex
  poly(ctx, [[-26, -68], [0, -82], [26, -68], [26, -38], [0, -26], [-26, -38]])
  const bg = ctx.createLinearGradient(-26, -82, 26, -26)
  bg.addColorStop(0, mix(pal.color, '#fff', 0.2)); bg.addColorStop(0.5, pal.color); bg.addColorStop(1, shade(pal.color, -0.4))
  ctx.fillStyle = bg; ctx.fill()
  ctx.strokeStyle = rgba(pal.deep, 0.8); ctx.lineWidth = 1.6; ctx.stroke()
  // rune trim
  ctx.strokeStyle = rgba(pal.accent, 0.9); ctx.lineWidth = 1.2
  poly(ctx, [[-20, -65], [0, -76], [20, -65], [20, -42], [0, -32], [-20, -42]], false); ctx.stroke()
  // core
  const cg = ctx.createRadialGradient(0, -54, 0, 0, -54, 17)
  cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.25, mix(pal.accent, '#ffffff', 0.2)); cg.addColorStop(1, rgba(pal.accent, 0))
  ctx.fillStyle = cg; ell(ctx, 0, -54, 18, 18); ctx.fill()
  ctx.fillStyle = mix(pal.accent, '#ffffff', 0.5); ell(ctx, 0, -54, 3.5, 3.5); ctx.fill()
  // arms
  for (const s of [-1, 1]) {
    const swing = atk > 0 && s === 1 ? -Math.sin(atk * Math.PI) * 0.6 : 0
    ctx.save(); ctx.translate(s * 26, -62); ctx.rotate(swing)
    ctx.fillStyle = shade(pal.color, -0.18)
    ctx.fillRect(-4, 0, 9, 28)
    ctx.fillRect(-7, 24, 15, 10)
    ctx.strokeStyle = rgba(pal.deep, 0.7); ctx.strokeRect(-4, 0, 9, 28)
    ctx.restore()
  }
  // head
  poly(ctx, [[-10, -88], [10, -90], [13, -76], [0, -70], [-12, -76]])
  ctx.fillStyle = shade(pal.color, -0.08); ctx.fill()
  ctx.strokeStyle = rgba(pal.deep, 0.8); ctx.stroke()
  drawEyes(ctx, 1, -81, 4.5, mix(pal.accent, '#ffffff', 0.45), 2)
  // crown shard
  poly(ctx, [[-3, -95], [1, -106], [5, -95]])
  ctx.fillStyle = rgba(pal.accent, 0.85); ctx.fill()
  ctx.restore()
}

function drawSpirit(ctx, pal, t, moving, atk, walk) {
  const bob = Math.sin(t * 1.6) * 3
  const sway = Math.sin(t * 1.1) * 4
  // wisp tail
  ctx.save(); ctx.lineCap = 'round'
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.moveTo(-6 + i * 6, -34)
    ctx.bezierCurveTo(-18 + i * 8 + sway, -16, -26 + i * 10 - sway, -2, -10 + i * 8 + sway, 12)
    ctx.strokeStyle = rgba(i === 1 ? pal.accent : pal.color, 0.35 - i * 0.06)
    ctx.lineWidth = 10 - i * 2.4
    ctx.stroke()
  }
  ctx.restore()

  // cloak
  ctx.save(); ctx.translate(0, bob)
  const cg = ctx.createLinearGradient(0, -92, 0, -10)
  cg.addColorStop(0, rgba(pal.color, 0.9))
  cg.addColorStop(0.6, rgba(pal.color, 0.55))
  cg.addColorStop(1, rgba(pal.accent, 0.03))
  ctx.beginPath()
  ctx.moveTo(-24, -14)
  ctx.quadraticCurveTo(-30, -58, -10, -76)
  ctx.quadraticCurveTo(2, -104, 24, -78)
  ctx.quadraticCurveTo(34, -54, 22, -16)
  ctx.quadraticCurveTo(0, -6, -24, -14)
  ctx.closePath()
  ctx.fillStyle = cg; ctx.fill()
  ctx.strokeStyle = rgba(pal.accent, 0.6); ctx.lineWidth = 1.2; ctx.stroke()

  // hood opening
  const hg = ctx.createRadialGradient(8, -66, 2, 8, -66, 22)
  hg.addColorStop(0, '#05060d'); hg.addColorStop(1, rgba(pal.deep, 0.9))
  ell(ctx, 8, -68, 17, 21, -0.1)
  ctx.fillStyle = hg; ctx.fill()
  ctx.strokeStyle = rgba(pal.accent, 0.5); ctx.stroke()

  drawEyes(ctx, 12, -69, 4.2, mix(pal.soft, '#ffffff', 0.55), 2.4)

  // crown wisps
  ctx.strokeStyle = rgba(pal.soft, 0.65); ctx.lineWidth = 1.4
  for (let i = 0; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(-6 + i * 7, -88 - i * 2)
    ctx.quadraticCurveTo(-12 + i * 9 + sway * 0.5, -102 - i * 3, -4 + i * 8, -110 - i * 2)
    ctx.stroke()
  }
  // arm wisps
  ctx.strokeStyle = rgba(pal.color, 0.7); ctx.lineWidth = 4; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(20, -56); ctx.quadraticCurveTo(40, -52, 46, -40 + sway); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(-18, -48); ctx.quadraticCurveTo(-34, -40, -38, -26 - sway); ctx.stroke()

  // rune
  ctx.fillStyle = rgba(pal.accent, 0.8)
  poly(ctx, [[0, -44], [4, -38], [0, -32], [-4, -38]]); ctx.fill()
  ctx.restore()
  drawOrbs(ctx, pal, t, 4)
}

function drawMonster(ctx, pal, t, moving, atk, walk) {
  const bob = Math.sin(t * 1.7) * 1.6
  const leg = moving ? Math.sin(t * 7) * 4 : 0
  drawWings(ctx, pal, t, 'dragon', 0.9)
  // tail
  ctx.save(); ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-28, -44)
  ctx.bezierCurveTo(-58, -50, -66, -24, -52, -8)
  ctx.strokeStyle = shade(pal.color, -0.2); ctx.lineWidth = 12; ctx.stroke()
  ctx.strokeStyle = rgba(pal.accent, 0.5); ctx.lineWidth = 3; ctx.stroke()
  ctx.fillStyle = mix(pal.accent, pal.deep, 0.4)
  poly(ctx, [[-56, -10], [-64, -22], [-46, -18]]); ctx.fill()
  ctx.restore()

  // legs
  ctx.strokeStyle = shade(pal.color, -0.35); ctx.lineWidth = 9; ctx.lineCap = 'round'
  for (const [x, ph] of [[-18, leg], [16, -leg]]) {
    ctx.beginPath(); ctx.moveTo(x, -30); ctx.quadraticCurveTo(x - 4 + ph, -14, x + ph, 0); ctx.stroke()
    ctx.fillStyle = mix(pal.accent, '#f6d9a0', 0.3)
    for (let i = -1; i <= 1; i++) { poly(ctx, [[x + ph + i * 4, 0], [x + ph + i * 4 + 2, 4], [x + ph + i * 4 - 1, 3]]); ctx.fill() }
  }

  ctx.save(); ctx.translate(0, bob)
  // body
  ell(ctx, 0, -50, 41, 27, -0.04)
  ctx.fillStyle = bodyGrad(ctx, pal.color, pal.accent, -80, -22); ctx.fill()
  ctx.strokeStyle = rgba(pal.deep, 0.75); ctx.lineWidth = 1.6; ctx.stroke()
  // belly
  ell(ctx, 4, -36, 30, 10, -0.05)
  ctx.fillStyle = rgba(pal.soft, 0.2); ctx.fill()
  // molten cracks
  ctx.strokeStyle = rgba(pal.accent, 0.85); ctx.lineWidth = 1.4
  ctx.beginPath(); ctx.moveTo(-16, -64); ctx.lineTo(-8, -52); ctx.lineTo(-13, -42); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(8, -68); ctx.lineTo(14, -58); ctx.lineTo(10, -48); ctx.stroke()
  // back spikes
  drawSpikes(ctx, pal, -72, 5, mix(pal.accent, pal.deep, 0.25))

  // neck
  ctx.beginPath()
  ctx.moveTo(20, -62)
  ctx.quadraticCurveTo(40, -78, 42, -86)
  ctx.lineTo(26, -54); ctx.closePath()
  ctx.fillStyle = shade(pal.color, -0.08); ctx.fill()
  ctx.strokeStyle = rgba(pal.deep, 0.6); ctx.stroke()

  // head
  ell(ctx, 44, -86, 20, 14, 0.12)
  ctx.fillStyle = bodyGrad(ctx, pal.color, pal.accent, -100, -72); ctx.fill()
  ctx.strokeStyle = rgba(pal.deep, 0.7); ctx.stroke()
  // jaw
  poly(ctx, [[48, -82], [68, -80], [66, -70], [46, -72]])
  ctx.fillStyle = shade(pal.color, -0.25); ctx.fill()
  ctx.strokeStyle = rgba(pal.deep, 0.6); ctx.stroke()
  // teeth
  ctx.fillStyle = '#f7ecd2'
  for (let i = 0; i < 3; i++) { poly(ctx, [[55 + i * 4, -78], [57 + i * 4, -73], [59 + i * 4, -78]]); ctx.fill() }
  // horns
  drawHorns(ctx, pal, 1)
  drawEyes(ctx, 48, -89, 4, '#ffd76e', 2.3)
  // nostril ember
  ctx.fillStyle = rgba(pal.accent, 0.9); ell(ctx, 64, -82, 1.6, 1.2); ctx.fill()
  // crown spikes
  ctx.fillStyle = rgba(pal.accent, 0.8)
  poly(ctx, [[32, -94], [36, -105], [40, -93]]); ctx.fill()
  ctx.restore()
}

function drawKraken(ctx, pal, t, moving, atk, walk) {
  const bob = Math.sin(t * 1.5) * 2
  drawTendrils(ctx, pal, t, 5, [0, -28], 38)
  ctx.save(); ctx.translate(0, bob)
  // body / mantle
  const bg = ctx.createRadialGradient(-8, -74, 4, 0, -58, 42)
  bg.addColorStop(0, mix(pal.color, '#ffffff', 0.3))
  bg.addColorStop(0.6, pal.color)
  bg.addColorStop(1, shade(pal.color, -0.45))
  ell(ctx, 0, -58, 34, 38, -0.12)
  ctx.fillStyle = bg; ctx.fill()
  ctx.strokeStyle = rgba(pal.deep, 0.8); ctx.lineWidth = 1.5; ctx.stroke()

  // fins
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(s * 28, -58)
    ctx.quadraticCurveTo(s * 50, -68, s * 44, -42)
    ctx.quadraticCurveTo(s * 36, -46, s * 27, -44)
    ctx.closePath()
    ctx.fillStyle = rgba(pal.accent, 0.45); ctx.fill()
    ctx.strokeStyle = rgba(pal.accent, 0.6); ctx.stroke()
  }
  // big eyes
  ctx.save(); ctx.shadowColor = '#ffe9a8'; ctx.shadowBlur = 10
  ctx.fillStyle = '#ffe9a8'
  ell(ctx, -10, -64, 8, 6); ctx.fill()
  ell(ctx, 12, -60, 6, 5); ctx.fill()
  ctx.fillStyle = '#0a1318'
  ell(ctx, -9, -64, 3.6, 3.4); ctx.fill()
  ell(ctx, 12.5, -60, 2.8, 2.8); ctx.fill()
  ctx.restore()
  // beak
  poly(ctx, [[0, -50], [7, -44], [-2, -40], [-7, -46]])
  ctx.fillStyle = mix(pal.accent, '#f4d08a', 0.35); ctx.fill()
  // suckers on visible tendril tips
  ctx.fillStyle = rgba(pal.soft, 0.6)
  for (let i = 0; i < 4; i++) { ell(ctx, -14 + i * 8, -18 + i * 2, 1.6, 1.6); ctx.fill() }
  // mantle spots
  ctx.fillStyle = rgba(pal.soft, 0.22)
  for (let i = 0; i < 5; i++) { ell(ctx, -18 + (i % 3) * 15, -76 + Math.floor(i / 3) * 9, 3, 2); ctx.fill() }
  // crown fin
  poly(ctx, [[-2, -94], [4, -112], [11, -93]])
  ctx.fillStyle = rgba(pal.accent, 0.8); ctx.fill()
  ctx.restore()
}

// ─────────── extra lineage features ───────────
function drawExtra(ctx, extra, pal, t) {
  ctx.save()
  switch (extra) {
    case 'avian':
      ctx.globalAlpha = 0.7
      drawWings(ctx, { ...pal, accent: pal.extraAccent || pal.accent }, t, 'avian', 0.8)
      break
    case 'spirit':
      drawOrbs(ctx, { ...pal, accent: pal.extraAccent || '#d8a9ff' }, t, 5)
      ctx.strokeStyle = rgba(pal.extraAccent || '#d8a9ff', 0.5)
      ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.ellipse(0, -54, 40, 30, 0, 0, TAU); ctx.stroke()
      break
    case 'monster':
      drawHorns(ctx, { ...pal, accent: pal.extraAccent || '#ff9a6b' }, 0.94)
      drawSpikes(ctx, { ...pal, accent: pal.extraAccent || '#ff9a6b' }, -60, 4, rgba(pal.extraAccent || '#ff9a6b', 0.8))
      break
    case 'insect':
      ctx.strokeStyle = rgba(pal.extraAccent || '#f3d98a', 0.85); ctx.lineWidth = 1.4
      ctx.beginPath(); ctx.moveTo(18, -82); ctx.quadraticCurveTo(30, -104, 42, -102); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(12, -84); ctx.quadraticCurveTo(18, -108, 30, -112); ctx.stroke()
      ctx.globalAlpha = 0.25
      for (const s of [-1, 1]) {
        ctx.save(); ctx.translate(0, -60); ctx.rotate(s * 0.5)
        ell(ctx, -28, 0, 30, 9, -0.4)
        ctx.fillStyle = rgba(pal.extraAccent || '#f3d98a', 0.5); ctx.fill()
        ctx.restore()
      }
      break
    case 'construct':
      ctx.globalAlpha = 0.65
      drawShards(ctx, { ...pal, accent: pal.extraAccent || '#bfcadd' }, t * 1.2)
      break
    case 'beast':
      ctx.fillStyle = rgba(pal.extraAccent || '#9fd0ff', 0.65)
      poly(ctx, [[20, -84], [25, -98], [32, -82]]); ctx.fill()
      poly(ctx, [[30, -82], [38, -95], [42, -80]]); ctx.fill()
      break
    case 'reptile':
      ctx.fillStyle = rgba(pal.extraAccent || '#74e9c4', 0.7)
      for (let i = 0; i < 4; i++) {
        poly(ctx, [[-20 + i * 12, -66], [-16 + i * 12, -78], [-10 + i * 12, -66]]); ctx.fill()
      }
      break
    case 'kraken':
      ctx.globalAlpha = 0.45
      drawTendrils(ctx, { ...pal, accent: pal.extraAccent || '#8ad8e8', color: pal.extraAccent || '#8ad8e8' }, t, 3, [18, -20], 26)
      break
  }
  ctx.restore()
}

// ─────────── main entry ───────────
export function drawCreature(ctx, o) {
  const {
    silhouette = 'beast', extra = null, x = 0, y = 0, scale = 1, facing = 1,
    t = 1, moving = false, attack = 0, flash = 0, alpha = 1,
    color = '#9fd0ff', accent = '#5aa7ff', deep = '#1b3153', soft = '#ffffff',
    extraAccent = null,
  } = o

  const pal = {
    color: flash > 0 ? mix(color, '#ffffff', flash * 0.85) : color,
    accent: flash > 0 ? mix(accent, '#ffffff', flash * 0.7) : accent,
    deep,
    soft,
    extraAccent: extraAccent || accent,
  }

  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.translate(x, y)
  ctx.scale(facing * scale, scale)

  // ground shadow & aura
  const auraR = 52
  const aura = ctx.createRadialGradient(0, -50, 6, 0, -50, auraR)
  aura.addColorStop(0, rgba(accent, 0.22))
  aura.addColorStop(0.6, rgba(accent, 0.07))
  aura.addColorStop(1, rgba(accent, 0))
  ctx.fillStyle = aura
  ell(ctx, 0, -50, auraR, auraR * 0.9); ctx.fill()

  ctx.fillStyle = 'rgba(0,0,0,.34)'
  ell(ctx, 0, 0, 32, 5.5); ctx.fill()

  const walk = t * 8
  const lunge = attack > 0 ? Math.sin(attack * Math.PI) * 9 : 0
  ctx.translate(lunge, 0)

  ctx.save()
  const fn = { beast: drawBeast, avian: drawAvian, reptile: drawReptile, turtle: drawTurtle,
    insect: drawInsect, construct: drawConstruct, spirit: drawSpirit, monster: drawMonster, kraken: drawKraken }[silhouette] || drawBeast
  fn(ctx, pal, t, moving, attack, walk)
  ctx.restore()

  if (extra && extra !== silhouette) drawExtra(ctx, extra, pal, t)
  ctx.restore()
}

// ─────────── portrait rendering ───────────
export function renderPortrait(canvas, fighter, opts = {}) {
  const size = opts.size || 96
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(size * dpr)
  canvas.height = Math.round(size * dpr)
  canvas._portraitSize = size
  canvas._portraitDpr = dpr
  if (!canvas.style.width) canvas.style.width = '100%'
  drawPortraitFrame(canvas, fighter, opts)
}

export function drawPortraitFrame(canvas, fighter, opts = {}) {
  const {
    ring = true, familyColor = '#d9ad62', showPedestal = true,
    animate = false, pickT = null,
  } = opts
  const W = canvas._portraitSize || opts.size || 96
  const H = W
  const dpr = canvas._portraitDpr || Math.min(window.devicePixelRatio || 1, 2)
  const t = opts.t != null ? opts.t : 1.2
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, W, H)

  const c = fighter
  const color = c.color || '#9fd0ff'
  const accent = c.accent || '#5aa7ff'
  const deep = c.deep || '#1b3153'
  const soft = c.soft || '#ffffff'

  // atmosphere
  const bg = ctx.createRadialGradient(W * 0.5, H * 0.46, 2, W * 0.5, H * 0.5, W * 0.62)
  bg.addColorStop(0, rgba(accent, 0.22))
  bg.addColorStop(0.55, rgba(deep, 0.4))
  bg.addColorStop(1, 'rgba(5,8,15,0)')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // concentric rings
  if (ring) {
    ctx.save()
    ctx.strokeStyle = rgba(familyColor, 0.22)
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(W / 2, H * 0.48, W * 0.33, 0, TAU); ctx.stroke()
    ctx.setLineDash([2, 5])
    ctx.strokeStyle = rgba(familyColor, 0.28)
    ctx.beginPath(); ctx.arc(W / 2, H * 0.48, W * 0.41, 0, TAU); ctx.stroke()
    ctx.restore()
  }

  // specks
  ctx.save()
  ctx.fillStyle = rgba(accent, 0.4)
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4 + 0.6
    const r = (0.24 + (i % 3) * 0.09) * W
    const px = W / 2 + Math.cos(a) * r
    const py = H * 0.48 + Math.sin(a) * r * 0.8
    ell(ctx, px, py, 0.9, 0.9); ctx.fill()
  }
  ctx.restore()

  if (showPedestal) {
    ctx.save()
    ctx.strokeStyle = rgba(familyColor, 0.35)
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.ellipse(W / 2, H * 0.84, W * 0.3, W * 0.07, 0, 0, TAU); ctx.stroke()
    ctx.beginPath(); ctx.ellipse(W / 2, H * 0.84, W * 0.22, W * 0.048, 0, 0, TAU); ctx.stroke()
    ctx.restore()
  }

  const scale = (H / 128) * (opts.zoom || 1)
  drawCreature(ctx, {
    silhouette: c.silhouette || 'beast',
    extra: c.extra || null,
    x: W / 2,
    y: H * 0.855,
    scale,
    facing: opts.facing || 1,
    t: pickT != null ? pickT : (animate ? t : 1.2),
    moving: false,
    color, accent, deep, soft,
    extraAccent: c.extraAccent || null,
  })

  // vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.32, W / 2, H / 2, W * 0.72)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(3,5,10,.45)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, W, H)
}

export function makePortrait(fighter, size = 64, opts = {}) {
  const canvas = document.createElement('canvas')
  canvas.className = opts.className || 'portrait-canvas'
  renderPortrait(canvas, fighter, { size, ...opts })
  return canvas
}
