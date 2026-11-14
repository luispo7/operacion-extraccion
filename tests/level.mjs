import assert from 'node:assert/strict';
import { buildLayout, toColliders } from '../js/levelLayout.js';
import { NavGrid } from '../js/nav.js';
import { CONFIG } from '../js/config.js';

const layout = buildLayout();
const colliders = toColliders(layout);
const nav = new NavGrid(CONFIG.nav, colliders, CONFIG.nav.inflate);
const free = (x, z, m = 0.5) => !colliders.some(b => b.move && x > b.minX - m && x < b.maxX + m && z > b.minZ - m && z < b.maxZ + m);

console.log(`Cajas: ${layout.solids.length} | zombis: ${layout.spawns.length} | objetos: ${layout.pickups.length} | luces: ${layout.lights.length}`);
let bad = 0;
for (const s of layout.spawns) if (!free(s.x, s.z, 0.6)) { console.log('  ! zombi dentro de un obstáculo', s); bad++; }
for (const p of layout.pickups) if (!free(p.x, p.z, 0.4)) { console.log('  ! objeto dentro de un obstáculo', p); bad++; }
const ps = CONFIG.player.startPos;
if (!free(ps.x, ps.z, 0.5)) { console.log('  ! inicio bloqueado'); bad++; }
const ex = CONFIG.extraction;
if (!free(ex.x, ex.z, 0.5)) { console.log('  ! extracción bloqueada'); bad++; }
assert.equal(bad, 0, 'hay elementos colocados dentro de obstáculos');

const toExit = nav.findPath(ps.x, ps.z, ex.x, ex.z, 60000);
assert.ok(toExit, 'debe existir camino desde el inicio hasta la extracción');
let len = 0, px = ps.x, pz = ps.z; for (const w of toExit) { len += Math.hypot(w.x - px, w.z - pz); px = w.x; pz = w.z; }
console.log(`Camino inicio -> extracción: ${len.toFixed(0)} m (${toExit.length} waypoints)`);
for (const s of layout.spawns) assert.ok(nav.findPath(s.x, s.z, ps.x, ps.z, 60000), `zombi sin camino al jugador: ${JSON.stringify(s)}`);
for (const p of layout.pickups) assert.ok(nav.findPath(ps.x, ps.z, p.x, p.z, 60000), `objeto inalcanzable: ${JSON.stringify(p)}`);
const ammoW = [0, 0]; layout.pickups.forEach(p => { if (p.kind === 'ammo') ammoW[p.weapon]++; });
const supply = CONFIG.weapons.map((w, i) => w.startAmmo + ammoW[i] * w.pickupAmount);
console.log(`Munición total disponible: pistola ${supply[0]}, carabina ${supply[1]} (mínimo para matar a todos: ${layout.spawns.length * CONFIG.zombie.hp})`);
console.log('Escenario válido.');

if (process.argv.includes('--map')) {
  const c = 1; const { minX, maxX, minZ, maxZ } = CONFIG.nav; let out = '';
  for (let z = minZ; z < maxZ; z += c * 1.5) {
    let row = '';
    for (let x = minX; x < maxX; x += c) {
      let ch = ' ';
      if (colliders.some(b => b.move && x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ)) ch = '#';
      if (layout.spawns.some(s => Math.abs(s.x - x) < .6 && Math.abs(s.z - z) < .8)) ch = 'Z';
      if (layout.pickups.some(s => Math.abs(s.x - x) < .6 && Math.abs(s.z - z) < .8)) ch = '+';
      if (Math.abs(ex.x - x) < .6 && Math.abs(ex.z - z) < .8) ch = 'X';
      if (Math.abs(ps.x - x) < .6 && Math.abs(ps.z - z) < .8) ch = 'S';
      row += ch;
    }
    out += row + '\n';
  }
  console.log(out);
}
