import assert from 'node:assert/strict';
import { resolveCircle, rayBox, rayWorld, rayCylinder } from '../js/collision.js';
import { NavGrid } from '../js/nav.js';
import { AmmoSystem } from '../js/ammo.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const box = (minX, maxX, minZ, maxZ, minY = 0, maxY = 3) => ({ minX, maxX, minZ, maxZ, minY, maxY, move: true, shoot: true });

console.log('Munición (RF02)');
test('contadores independientes por arma', () => {
  const a = new AmmoSystem([{ startAmmo: 3, maxAmmo: 10 }, { startAmmo: 5, maxAmmo: 10 }]);
  assert.equal(a.consume(0), true); assert.equal(a.get(0), 2); assert.equal(a.get(1), 5);
});
test('no se dispara con el contador en cero', () => {
  const a = new AmmoSystem([{ startAmmo: 1, maxAmmo: 10 }]);
  assert.equal(a.consume(0), true); assert.equal(a.canShoot(0), false);
  assert.equal(a.consume(0), false); assert.equal(a.get(0), 0);
});
test('solo se recupera con add() y respeta el máximo', () => {
  const a = new AmmoSystem([{ startAmmo: 0, maxAmmo: 10 }]);
  assert.equal(a.add(0, 6), 6); assert.equal(a.add(0, 6), 4); assert.equal(a.get(0), 10);
});

console.log('Colisiones');
test('el jugador no atraviesa una pared', () => {
  const p = { x: 0.2, z: 0.2 };   
  resolveCircle(p, 0.35, [box(-1, 1, -1, 1)]);
  assert.ok(Math.max(Math.abs(p.x), Math.abs(p.z)) >= 1.35 - 1e-6);
});
test('desliza a lo largo de una pared', () => {
  const p = { x: 2, z: 0 };
  resolveCircle(p, 0.35, [box(-1, 1, -5, 5)]);
  assert.ok(p.x >= 1.35 - 1e-6);
});
test('rayo contra caja', () => {
  const t = rayBox(0, 1.6, 10, 0, 0, -1, box(-1, 1, -1, 1));
  assert.ok(Math.abs(t - 9) < 1e-9);
  assert.equal(rayBox(5, 1.6, 10, 0, 0, -1, box(-1, 1, -1, 1)), Infinity);
});
test('un coche bajo no bloquea un disparo hacia arriba', () => {
  const car = box(-1, 1, -1, 1, 0, 1.4);
  assert.equal(rayWorld(0, 1.65, 10, 0, 0, -1, [car]), Infinity);      
  assert.ok(rayWorld(0, 1.0, 10, 0, 0, -1, [car]) < Infinity);         
});
test('rayo contra cilindro (zombi)', () => {
  const t = rayCylinder(0, 1.65, 10, 0, 0, -1, 0, 0, 0.5, 0, 1.95);
  assert.ok(Math.abs(t - 9.5) < 1e-9);
  assert.equal(rayCylinder(0, 2.5, 10, 0, 0, -1, 0, 0, 0.5, 0, 1.95), Infinity);  
  assert.equal(rayCylinder(2, 1.65, 10, 0, 0, -1, 0, 0, 0.5, 0, 1.95), Infinity); 
});

console.log('Navegación A*');
test('rodea un muro y no atraviesa obstáculos', () => {
  const boxes = [box(-1, 1, -10, 6)];       
  const nav = new NavGrid({ minX: -20, maxX: 20, minZ: -30, maxZ: 30, cell: 0.75 }, boxes, 0.5);
  const path = nav.findPath(-8, 0, 8, 0);
  assert.ok(path && path.length >= 2, 'debe existir camino');
  let px = -8, pz = 0;
  for (const w of path) { assert.ok(nav.lineClear(px, pz, w.x, w.z), 'segmento libre'); px = w.x; pz = w.z; }
  assert.ok(Math.hypot(px - 8, pz - 0) < 1.2);
});
test('sin camino cuando el destino está encerrado', () => {
  const boxes = [box(-5, 5, 5, 6), box(-5, 5, 14, 15), box(-5, -4, 5, 15), box(4, 5, 5, 15)];
  const nav = new NavGrid({ minX: -20, maxX: 20, minZ: -30, maxZ: 30, cell: 0.75 }, boxes, 0.3);
  assert.equal(nav.findPath(-10, 0, 0, 10), null);
});

console.log(`\n${n} pruebas superadas.`);
