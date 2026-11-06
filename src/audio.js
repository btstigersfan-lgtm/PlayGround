// ── CHIMERA FRONT · synthesized sound (no assets) ───────────────────────────
export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = localStorage.getItem('chimera-muted') === '1';
    this.last = {};
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
  }

  setMuted(m) {
    this.muted = m;
    localStorage.setItem('chimera-muted', m ? '1' : '0');
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  throttle(key, ms = 45) {
    const now = performance.now();
    if (this.last[key] && now - this.last[key] < ms) return false;
    this.last[key] = now;
    return true;
  }

  tone(freq, dur, type = 'sine', vol = 0.2, slide = null, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  noise(dur, vol = 0.15, freq = 900, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = freq; filter.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter); filter.connect(g); g.connect(this.master);
    src.start(t0);
  }

  ui() { if (!this.throttle('ui', 60)) return; this.tone(540, 0.06, 'triangle', 0.07, 700); }
  select() { if (!this.throttle('sel', 60)) return; this.tone(680, 0.08, 'triangle', 0.08, 900); }
  deploy() { this.tone(220, 0.16, 'sine', 0.16, 380); this.noise(0.12, 0.06, 600); }
  error() { if (!this.throttle('err', 120)) return; this.tone(160, 0.12, 'square', 0.08, 120); }
  buy() { this.tone(440, 0.09, 'triangle', 0.12); this.tone(660, 0.12, 'triangle', 0.1, null, 0.08); }
  splice() {
    this.tone(180, 0.5, 'sawtooth', 0.08, 520);
    this.tone(240, 0.45, 'triangle', 0.1, 720, 0.12);
    this.noise(0.5, 0.08, 1400);
    [0, 0.1, 0.2, 0.3].forEach((d, i) => this.tone(520 + i * 160, 0.14, 'sine', 0.09, null, 0.28 + d));
  }
  battleStart() {
    this.tone(90, 0.7, 'sine', 0.2, 60);
    this.tone(180, 0.5, 'triangle', 0.08, 240);
    this.noise(0.5, 0.1, 500);
  }
  hit() { if (!this.throttle('hit', 55)) return; this.noise(0.08, 0.06, 1400); this.tone(120, 0.06, 'sine', 0.05, 90); }
  heavy() { if (!this.throttle('heavy', 90)) return; this.noise(0.16, 0.1, 700); this.tone(80, 0.18, 'sine', 0.12, 50); }
  shot() { if (!this.throttle('shot', 65)) return; this.tone(900, 0.07, 'triangle', 0.04, 500); }
  cast() {
    if (!this.throttle('cast', 100)) return;
    this.tone(260, 0.5, 'sawtooth', 0.05, 780);
    this.noise(0.35, 0.08, 1800);
  }
  death() { if (!this.throttle('death', 120)) return; this.tone(160, 0.3, 'triangle', 0.07, 70); }
  nexus() { if (!this.throttle('nexus', 90)) return; this.tone(60, 0.6, 'sine', 0.22, 40); this.noise(0.4, 0.14, 300); }
  alarm() { this.tone(330, 0.18, 'square', 0.06, 220); this.tone(330, 0.18, 'square', 0.06, 220, 0.22); }
  victory() {
    [392, 494, 587, 784].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.1, null, i * 0.13));
    this.tone(196, 1.2, 'sine', 0.1, 196, 0.1);
  }
  defeat() {
    [330, 294, 247, 196].forEach((f, i) => this.tone(f, 0.55, 'triangle', 0.09, null, i * 0.17));
    this.tone(98, 1.4, 'sine', 0.12, 60, 0.2);
  }
  bloodrush() {
    this.tone(70, 0.7, 'sawtooth', 0.1, 120);
    this.noise(0.6, 0.1, 240);
  }
}
