import * as THREE from 'three';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTex(size, draw, seed) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  draw(g, size, rng(seed));
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function noise(g, s, r, base, amp, count, sz = 2) {
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  for (let i = 0; i < count; i++) {
    const v = (r() - 0.5) * amp;
    g.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v) / 255})`;
    g.fillRect(r() * s, r() * s, sz * (0.5 + r()), sz * (0.5 + r()));
  }
}

export function makeTextures() {
  const T = {};
  T.asphalt = canvasTex(256, (g, s, r) => {
    noise(g, s, r, '#34363a', 90, 5000);
    g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.2;
    for (let i = 0; i < 5; i++) { g.beginPath(); let x = r() * s, y = r() * s; g.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += (r() - .5) * 60; y += (r() - .5) * 60; g.lineTo(x, y); } g.stroke(); }
  }, 11);
  T.concrete = canvasTex(256, (g, s, r) => {
    noise(g, s, r, '#7c7e80', 70, 4500, 3);
    for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(30,25,20,${0.04 + r() * 0.07})`; g.beginPath();
      g.ellipse(r() * s, r() * s, 20 + r() * 40, 10 + r() * 30, r() * 3, 0, 7); g.fill(); }
  }, 23);
  T.brick = canvasTex(256, (g, s, r) => {
    g.fillStyle = '#4a4036'; g.fillRect(0, 0, s, s);
    const bh = 16, bw = 40;
    for (let y = 0; y < s / bh; y++) for (let x = -1; x < s / bw + 1; x++) {
      const ox = (y % 2) * (bw / 2);
      const l = 28 + r() * 18;
      g.fillStyle = `hsl(${8 + r() * 10},${35 + r() * 15}%,${l}%)`;
      g.fillRect(x * bw + ox + 1, y * bh + 1, bw - 2, bh - 2);
    }
    for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(0,0,0,${r() * .12})`; g.fillRect(r() * s, r() * s, 2, 2); }
  }, 37);
  T.tile = canvasTex(256, (g, s, r) => {
    const n = 4, q = s / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      g.fillStyle = (x + y) % 2 ? '#8d9a96' : '#a9b4b0'; g.fillRect(x * q, y * q, q, q);
    }
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * q, 0); g.lineTo(i * q, s); g.moveTo(0, i * q); g.lineTo(s, i * q); g.stroke(); }
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(20,10,0,${r() * .12})`; g.fillRect(r() * s, r() * s, 3, 3); }
    for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(110,0,0,0.22)'; g.beginPath(); g.ellipse(r() * s, r() * s, 12 + r() * 20, 6 + r() * 14, r() * 3, 0, 7); g.fill(); }
  }, 41);
  T.grass = canvasTex(256, (g, s, r) => {
    noise(g, s, r, '#26301f', 80, 6000, 2);
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${30 + r() * 30},${55 + r() * 40},20,.35)`; g.fillRect(r() * s, r() * s, 1.5, 4 + r() * 4); }
  }, 53);
  T.metal = canvasTex(256, (g, s, r) => {
    noise(g, s, r, '#5d6266', 60, 3000);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${120 + r() * 40},${55 + r() * 20},20,${0.08 + r() * 0.15})`; g.fillRect(r() * s, r() * s, 2 + r() * 4, 20 + r() * 80); }
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2;
    for (let x = 0; x < s; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, s); g.stroke(); }
  }, 67);
  T.wood = canvasTex(256, (g, s, r) => {
    g.fillStyle = '#5a4128'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 2) { g.fillStyle = `rgba(${r() > .5 ? 255 : 0},${r() > .5 ? 200 : 0},0,${r() * .07})`; g.fillRect(0, y, s, 2); }
    g.strokeStyle = 'rgba(0,0,0,.4)'; for (let x = 0; x < s; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, s); g.stroke(); }
  }, 79);
  return T;
}

export function glowTexture(color = '255,200,90') {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, `rgba(${color},1)`); gr.addColorStop(0.25, `rgba(${color},0.75)`);
  gr.addColorStop(0.6, `rgba(${color},0.18)`); gr.addColorStop(1, `rgba(${color},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
