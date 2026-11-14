import * as THREE from 'three';
import { makeTextures, glowTexture } from './textures.js';
import { buildLayout, toColliders } from './levelLayout.js';
import { CONFIG } from './config.js';

function boxGeo(w, h, d, tile) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const sizes = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
    const i = f * 4 + v;
    uv.setXY(i, uv.getX(i) * sizes[f][0] / tile, uv.getY(i) * sizes[f][1] / tile);
  }
  return g;
}

export function buildLevel() {
  const layout = buildLayout();
  const colliders = toColliders(layout);
  const T = makeTextures();
  const group = new THREE.Group();

  const tint = { asphalt: 0xffffff, concrete: 0xffffff, brick: 0xffffff, tile: 0xffffff, grass: 0xffffff, metal: 0xffffff, wood: 0xffffff };
  const mats = {};
  for (const k of Object.keys(T)) mats[k] = new THREE.MeshStandardMaterial({ map: T[k], color: tint[k], roughness: 0.92, metalness: k === 'metal' ? 0.25 : 0 });
  const flat = (color, rough = 0.7, metal = 0.2) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  const dark = flat(0x111111, 0.9, 0);
  const glass = flat(0x223344, 0.2, 0.6);

  for (const f of layout.floors) {
    const w = f.x1 - f.x0, d = f.z1 - f.z0;
    const g = new THREE.PlaneGeometry(w, d);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / f.tile, uv.getY(i) * d / f.tile);
    const m = new THREE.Mesh(g, mats[f.mat]);
    m.rotation.x = -Math.PI / 2;
    m.position.set((f.x0 + f.x1) / 2, f.y, (f.z0 + f.z1) / 2);
    m.receiveShadow = true;
    group.add(m);
  }

  for (const s of layout.solids) {
    const w = s.x1 - s.x0, d = s.z1 - s.z0, h = s.y1 - s.y0;
    const cx = (s.x0 + s.x1) / 2, cz = (s.z0 + s.z1) / 2;
    const addMesh = (geo, mat, x, y, z, cast = true) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
      m.castShadow = cast; m.receiveShadow = true; group.add(m); return m;
    };
    if (s.kind === 'car') {
      const horiz = !!s.horizontal;
      const L = horiz ? d : d, W = horiz ? d : w;
      const bodyMat = flat(new THREE.Color(s.color), 0.45, 0.5);
      const bw = horiz ? 4.4 : 1.9, bd = horiz ? 1.9 : 4.4;
      addMesh(new THREE.BoxGeometry(bw, 0.7, bd), bodyMat, cx, 0.65, cz);
      addMesh(new THREE.BoxGeometry(horiz ? 2.2 : 1.7, 0.6, horiz ? 1.7 : 2.2), glass, cx, 1.25, cz);
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const wx = horiz ? dx * 1.4 : dx * 0.95, wz = horiz ? dz * 0.95 : dz * 1.4;
        addMesh(new THREE.BoxGeometry(horiz ? 0.8 : 0.25, 0.6, horiz ? 0.25 : 0.8), dark, cx + wx, 0.3, cz + wz, false);
      }
      void L; void W;
    } else if (s.kind === 'container') {
      addMesh(boxGeo(w, h, d, 2), flat(new THREE.Color(s.color), 0.6, 0.4), cx, s.y0 + h / 2, cz);
      const ribs = flat(0x000000, 0.9, 0.2);
      const along = d > w;
      for (let i = -2; i <= 2; i++) {
        const geo = along ? new THREE.BoxGeometry(w + 0.06, h - 0.2, 0.08) : new THREE.BoxGeometry(0.08, h - 0.2, d + 0.06);
        const o = i * (along ? d : w) / 6;
        addMesh(geo, ribs, along ? cx : cx + o, h / 2, along ? cz + o : cz, false);
      }
    } else if (s.kind === 'bus') {
      addMesh(new THREE.BoxGeometry(w, 2.4, d), flat(new THREE.Color(s.color), 0.5, 0.3), cx, 1.5, cz);
      addMesh(new THREE.BoxGeometry(w + 0.04, 0.8, d - 0.6), glass, cx, 2.2, cz, false);
      addMesh(new THREE.BoxGeometry(w - 0.2, 0.2, d - 0.4), dark, cx, 0.35, cz, false);
    } else if (s.kind === 'heli') {
      const hm = flat(new THREE.Color(s.color), 0.5, 0.4);
      addMesh(new THREE.BoxGeometry(2.0, 1.8, 3.6), hm, cx, 1.3, cz + 0.4);
      addMesh(new THREE.BoxGeometry(0.4, 0.5, 3.2), hm, cx, 1.6, cz - 2.2);
      addMesh(new THREE.BoxGeometry(1.7, 0.7, 0.2), glass, cx, 1.7, cz + 2.25, false);
      const rotor = addMesh(new THREE.BoxGeometry(9.5, 0.06, 0.3), dark, cx, 2.6, cz + 0.4, false);
      rotor.userData.spin = true; group.userData.rotor = rotor;
      addMesh(new THREE.BoxGeometry(0.15, 0.7, 0.15), dark, cx, 2.3, cz + 0.4, false);
    } else {
      addMesh(boxGeo(w, h, d, s.tile), mats[s.mat], cx, s.y0 + h / 2, cz, s.cast);
    }
  }

  for (const l of layout.lights) {
    const pl = new THREE.PointLight(new THREE.Color(l.color), l.intensity, l.distance, 1.6);
    pl.position.set(l.x, l.y, l.z); group.add(pl);
  }

  const ex = CONFIG.extraction;
  const ring = new THREE.Mesh(new THREE.RingGeometry(ex.radius - 0.5, ex.radius, 48), new THREE.MeshBasicMaterial({ color: 0x35ff7a, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(ex.x, 0.05, ex.z); group.add(ring);
  const pad = new THREE.Mesh(new THREE.CircleGeometry(ex.radius - 0.5, 48), new THREE.MeshBasicMaterial({ color: 0x1c3b28, transparent: true, opacity: 0.8 }));
  pad.rotation.x = -Math.PI / 2; pad.position.set(ex.x, 0.04, ex.z); group.add(pad);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.4, 70, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x40ff88, transparent: true, opacity: 0.28, fog: false, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.set(ex.x, 35, ex.z); group.add(beam);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('64,255,128'), transparent: true, depthWrite: false, fog: false }));
  halo.scale.set(9, 9, 1); halo.position.set(ex.x, 1.5, ex.z); group.add(halo);

  return { group, layout, colliders, rotor: group.userData.rotor, beam };
}
