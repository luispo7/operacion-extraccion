import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { CONFIG } from './config.js';
import { resolveCircle, rayCylinder } from './collision.js';

const ZC = CONFIG.zombie;

export class Zombie {
  constructor(template, spawn, manager) {
    this.mgr = manager;
    this.spawn = spawn;
    const type = ZC.types[spawn.type] || ZC.types.normal;
    this.type = type;
    this.speed = type.speed;
    this.detect = spawn.detect ?? type.detect;     
    this.scale = type.scale;
    this.hp = ZC.hp;
    this.state = 'idle';                            
    this.pos = { x: spawn.x, z: spawn.z };
    this.yaw = Math.random() * Math.PI * 2;
    this.path = null; this.repath = Math.random() * 0.5;
    this.flash = 0; this.fallT = 0; this.stuckT = 0; this.lastX = spawn.x; this.lastZ = spawn.z;

    this.group = new THREE.Group();
    this.holder = new THREE.Group();
    const model = SkeletonUtils.clone(template.scene);
    const s = (ZC.height / ZC.modelUnits) * this.scale;
    this.baseScale = s;
    this.baseY = 0;
    this.holder.scale.setScalar(s);
    this.holder.add(model);
    this.group.add(this.holder);
    this.group.position.set(spawn.x, 0, spawn.z);
    this.group.rotation.y = this.yaw;

    this.materials = [];
    model.traverse(o => {
      if (!o.isMesh) return;
      o.frustumCulled = false; o.castShadow = true; o.receiveShadow = false;
      o.material = o.material.clone();
      o.material.color.setHex(type.tint);
      if (o.material.map) o.material.map.magFilter = THREE.NearestFilter;   
      o.material.emissive = new THREE.Color(0x000000);
      this.materials.push(o.material);
    });

    this.mixer = new THREE.AnimationMixer(model);
    const find = (name) => template.animations.find(a => a.name.toLowerCase().includes(name));
    const walk = find('walk'), sit = find('sit');
    this.walkAction = walk ? this.mixer.clipAction(walk) : null;
    this.sitAction = sit ? this.mixer.clipAction(sit) : null;
    if (this.sitAction) { this.sitAction.play(); this.sitAction.time = Math.random() * 10; }
    else if (this.walkAction) { this.walkAction.play(); this.walkAction.paused = true; }
    this.mixer.update(0);
  }

  measure() {
    this.group.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(this.group, true);
  }
  calibrate(scaleFactor, baseY) {
    this.holder.scale.setScalar(this.baseScale * scaleFactor);
    this.baseY = baseY; this.holder.position.y = baseY;
  }

  get hitHeight() { return (this.state === 'idle' ? ZC.hitHeightSitting : ZC.hitHeightStanding) * this.scale; }
  get alive() { return this.state !== 'dead'; }

  activate() {
    if (this.state !== 'idle') return;
    this.state = 'chasing';
    if (this.walkAction) {
      this.walkAction.reset().play(); this.walkAction.paused = false;
      this.walkAction.setEffectiveTimeScale(this.speed / 1.6);
      this.walkAction.time = Math.random() * 3;
      if (this.sitAction) { this.walkAction.crossFadeFrom(this.sitAction, 0.4, false); }
    }
    this.mgr.onActivate?.(this);
  }

  hit(damage = 1) {
    if (this.state === 'dead') return false;
    this.hp -= damage;
    this.flash = 0.14;
    if (this.state === 'idle') this.activate();
    if (this.hp <= 0) { this.die(); return true; }
    return false;
  }

  die() {
    this.state = 'dead';
    this.hp = 0;
    this.path = null;
    this.fallT = 0;
    for (const m of this.materials) m.color.setHex(0x777777);
  }

  update(dt, player, others, colliders, nav) {
    if (this.flash > 0) {
      this.flash -= dt;
      const k = Math.max(0, this.flash / 0.14);
      for (const m of this.materials) m.emissive.setRGB(0.9 * k, 0.05 * k, 0.05 * k);
    }

    const dx = player.x - this.pos.x, dz = player.z - this.pos.z;
    const dist = Math.hypot(dx, dz);

    if (this.state === 'dead') {
      if (this.fallT < 1) {
        this.fallT = Math.min(1, this.fallT + dt / 0.7);
        const k = 1 - (1 - this.fallT) * (1 - this.fallT);
        this.holder.rotation.x = -k * Math.PI / 2;     
        this.holder.position.y = this.baseY + k * 0.3;
      }
      return false;
    }

    if (this.state === 'idle') {
      if (dist < this.detect) this.activate();         
      if (dist < 45) this.mixer.update(dt);
      return false;
    }

    this.mixer.update(dt);
    this.repath -= dt;
    if (this.repath <= 0 || !this.path || this.path.length === 0) {
      this.repath = 0.45 + Math.random() * 0.3;
      if (nav.lineClear(this.pos.x, this.pos.z, player.x, player.z)) this.path = [{ x: player.x, z: player.z, direct: true }];
      else this.path = nav.findPath(this.pos.x, this.pos.z, player.x, player.z) || [{ x: player.x, z: player.z, direct: true }];
    }
    let target = this.path[0];
    if (target.direct) { target.x = player.x; target.z = player.z; }
    let tx = target.x - this.pos.x, tz = target.z - this.pos.z, td = Math.hypot(tx, tz);
    if (td < 0.45 && !target.direct) { this.path.shift(); target = this.path[0] || { x: player.x, z: player.z, direct: true }; tx = target.x - this.pos.x; tz = target.z - this.pos.z; td = Math.hypot(tx, tz); }
    if (td > 1e-4) {
      const step = Math.min(this.speed * dt, td);
      this.pos.x += (tx / td) * step; this.pos.z += (tz / td) * step;
    }
    for (const o of others) {
      if (o === this || !o.alive) continue;
      const ox = this.pos.x - o.pos.x, oz = this.pos.z - o.pos.z, od = Math.hypot(ox, oz);
      if (od > 1e-4 && od < 0.8) { const p = (0.8 - od) * 0.5; this.pos.x += (ox / od) * p * dt * 4; this.pos.z += (oz / od) * p * dt * 4; }
    }
    resolveCircle(this.pos, ZC.radius, colliders);

    this.stuckT += dt;
    if (this.stuckT > 0.8) {
      if (Math.hypot(this.pos.x - this.lastX, this.pos.z - this.lastZ) < 0.25) this.repath = 0;
      this.lastX = this.pos.x; this.lastZ = this.pos.z; this.stuckT = 0;
    }

    const want = Math.atan2(tx, tz);
    let diff = want - this.yaw; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.yaw += diff * Math.min(1, dt * 8);
    this.group.position.set(this.pos.x, 0, this.pos.z);
    this.group.rotation.y = this.yaw;

    return dist < ZC.contactDistance;
  }
}

export class ZombieManager {
  constructor(template, spawns, scene, nav, colliders) {
    this.template = template; this.spawns = spawns; this.scene = scene; this.nav = nav; this.colliders = colliders;
    this.list = [];
    this.onActivate = null;
    this.reset();
  }

  reset() {
    for (const z of this.list) this.scene.remove(z.group);
    this.list = this.spawns.map(sp => {
      const z = new Zombie(this.template, sp, this);
      this.scene.add(z.group);
      return z;
    });
    this.autoCalibrate();
  }

  autoCalibrate() {
    if (!this.list.length) return;
    const z0 = this.list[0];
    const b = z0.measure();
    const h = b.max.y - b.min.y;
    this.measured = { height: +h.toFixed(3), minY: +b.min.y.toFixed(3), ok: Number.isFinite(h) && h > 1e-4 };
    const expected = ZC.hitHeightSitting * z0.scale;
    let factor = 1, baseY = 0;
    if (this.measured.ok) {
      const ratio = expected / h;
      if (ratio < 0.8 || ratio > 1.25) factor = ratio;
      baseY = -b.min.y * factor / 1;           
      if (Math.abs(b.min.y) < 0.03) baseY = 0;
    }
    this.measured.factor = +factor.toFixed(3);
    console.info('[zombi] altura sentado medida', this.measured.height, 'm | esperada', +expected.toFixed(2),
      '| factor aplicado', this.measured.factor, '| minY', this.measured.minY);
    if (factor !== 1 || baseY !== 0) for (const z of this.list) z.calibrate(factor, baseY);
  }

  get killed() { return this.list.filter(z => z.state === 'dead').length; }
  get total() { return this.list.length; }
  get chasing() { return this.list.filter(z => z.state === 'chasing').length; }

  update(dt, player) {
    let caught = false;
    for (const z of this.list) if (z.update(dt, player, this.list, this.colliders, this.nav)) caught = true;
    return caught;
  }

  raycast(o, d, maxT) {
    let best = null, bt = maxT;
    for (const z of this.list) {
      if (!z.alive) continue;
      const t = rayCylinder(o.x, o.y, o.z, d.x, d.y, d.z, z.pos.x, z.pos.z, ZC.hitRadius * z.scale, 0, z.hitHeight, bt);
      if (t < bt) { bt = t; best = z; }
    }
    return best ? { zombie: best, t: bt } : null;
  }
}
