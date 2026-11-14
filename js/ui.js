import { CONFIG } from './config.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor() {
    this.hud = $('hud');
    this.screens = ['loading', 'menu', 'pause', 'gameover', 'victory', 'error'];
    this.hitTimer = 0;
    this.lastStage = '';
  }
  show(name) { this.screens.forEach(s => $(s).classList.toggle('hidden', s !== name)); }
  hideScreens() { this.screens.forEach(s => $(s).classList.add('hidden')); }
  showHud(on) { this.hud.classList.toggle('hidden', !on); }
  setLoading(p, text) { $('loading-bar').style.width = `${Math.round(p * 100)}%`; if (text) $('loading-text').textContent = text; }
  setError(msg) { $('error-text').innerHTML = msg; this.show('error'); }

  setAmmo(counts, current) {
    counts.forEach((n, i) => {
      $(`ammo-${i}`).textContent = n;
      $(`wslot-${i}`).classList.toggle('empty', n === 0);
      $(`wslot-${i}`).classList.toggle('active', i === current);
    });
    $('ammo-big-n').textContent = counts[current];
    $('ammo-big').classList.toggle('empty', counts[current] === 0);
    document.querySelector('#ammo-big small').textContent = CONFIG.weapons[current].name.toLowerCase();
  }
  setKills(n, total) { $('kills-n').textContent = n; $('kills-total').textContent = total; }

  setStage(name) {
    if (name === this.lastStage) return;
    this.lastStage = name;
    $('stage-name').textContent = name;
  }
  setDistance(m) { $('distance').textContent = `Zona de extracción: ${Math.max(0, Math.round(m))} m`; }
  setBoost(on) { $('boost').classList.toggle('hidden', !on); }

  toast(text, kind = 'info') {
    const el = document.createElement('div');
    el.className = `toast ${kind}`; el.textContent = text;
    const box = $('toasts'); box.appendChild(el);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => el.remove(), 2300);
  }
  hitMarker(kill) {
    const h = $('hitmarker');
    h.classList.add('show'); h.classList.toggle('kill', !!kill);
    clearTimeout(this.hitTimer);
    this.hitTimer = setTimeout(() => h.classList.remove('show'), 130);
  }
  vignette(on) { $('vignette').classList.toggle('on', on); }

  gameOver(stats) { $('go-stats').innerHTML = stats; this.show('gameover'); }
  victory(stats) { $('win-stats').innerHTML = stats; this.show('victory'); }
}
