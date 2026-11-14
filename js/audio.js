export class Sfx {
  constructor() { this.ctx = null; this.muted = false; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  toggleMute() { this.muted = !this.muted; if (this.master) this.master.gain.value = this.muted ? 0 : 0.5; return this.muted; }
  _noise(dur, freq, q, vol, type = 'lowpass', when = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t); src.stop(t + dur);
  }
  _tone(type, f0, f1, dur, vol, when = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  shot(weaponId) {
    if (weaponId === 'pistol') { this._noise(0.18, 2600, 0.7, 0.9); this._tone('square', 220, 50, 0.12, 0.35); }
    else { this._noise(0.22, 1800, 0.6, 1.0); this._tone('sawtooth', 160, 40, 0.16, 0.4); }
  }
  empty() { this._tone('square', 1200, 900, 0.04, 0.12); this._noise(0.03, 5000, 1, 0.1, 'highpass'); }
  switchWeapon() { this._noise(0.06, 1800, 2, 0.25, 'bandpass'); this._tone('square', 500, 300, 0.05, 0.1, 0.07); }
  pickup() { this._tone('triangle', 520, 520, 0.08, 0.25); this._tone('triangle', 780, 780, 0.12, 0.25, 0.08); }
  hit() { this._tone('sine', 140, 60, 0.12, 0.5); this._noise(0.08, 900, 1, 0.4); }
  kill() { this._tone('sawtooth', 200, 40, 0.5, 0.35); this._noise(0.35, 500, 1, 0.45); }
  growl() { this._tone('sawtooth', 90, 55, 0.7, 0.28); this._tone('square', 70, 45, 0.7, 0.18); this._noise(0.5, 400, 3, 0.18, 'bandpass'); }
  gameOver() { this._tone('sawtooth', 220, 40, 1.6, 0.45); this._tone('square', 110, 30, 1.8, 0.3); this._noise(0.9, 300, 1, 0.4); }
  win() { [523, 659, 784, 1046].forEach((f, i) => this._tone('triangle', f, f, 0.35, 0.3, i * 0.18)); }
  step() { this._noise(0.06, 350, 1, 0.08); }
}
