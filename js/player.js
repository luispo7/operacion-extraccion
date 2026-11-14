import * as THREE from 'three';
import { CONFIG } from './config.js';
import { resolveCircle } from './collision.js';

const PC = CONFIG.player;

export class Player {
  constructor(camera, sfx) {
    this.camera = camera; this.sfx = sfx;
    camera.rotation.order = 'YXZ';
    this.keys = new Set();
    this.lookDx = 0; this.lookDy = 0;
    this.pos = { x: 0, z: 0 };
    this.yaw = 0; this.pitch = 0;
    this.boost = 0; this.stepDist = 0; this.moveAmt = 0;
    this.locked = false;

    window.addEventListener('keydown', e => { this.keys.add(e.code); });
    window.addEventListener('keyup', e => { this.keys.delete(e.code); });
    window.addEventListener('blur', () => this.keys.clear());
    document.addEventListener('mousemove', e => {
      if (!this.locked) return;
      this.yaw -= e.movementX * PC.mouseSensitivity;
      this.pitch -= e.movementY * PC.mouseSensitivity;
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
      this.lookDx += e.movementX; this.lookDy += e.movementY;
    });
    this.reset();
  }

  reset() {
    this.pos.x = PC.startPos.x; this.pos.z = PC.startPos.z;
    this.yaw = PC.startYaw; this.pitch = 0;
    this.boost = 0; this.stepDist = 0; this.moveAmt = 0;
    this.keys.clear();
    this.sync(0);
  }

  get speed() { return PC.speed * (this.boost > 0 ? PC.speedBoostFactor : 1); }

  update(dt, colliders) {
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    let mx = 0, mz = 0;
    if (this.keys.has('KeyW')) { mx += fx; mz += fz; }   
    if (this.keys.has('KeyS')) { mx -= fx; mz -= fz; }   
    if (this.keys.has('KeyA')) { mx -= rx; mz -= rz; }   
    if (this.keys.has('KeyD')) { mx += rx; mz += rz; }   
    const len = Math.hypot(mx, mz);
    let moved = 0;
    if (len > 0) {
      const sp = this.speed * dt;
      const px = this.pos.x, pz = this.pos.z;
      this.pos.x += (mx / len) * sp; this.pos.z += (mz / len) * sp;
      resolveCircle(this.pos, PC.radius, colliders);
      moved = Math.hypot(this.pos.x - px, this.pos.z - pz);
    }
    this.moveAmt += ((moved > 0 ? 1 : 0) - this.moveAmt) * Math.min(1, dt * 10);
    this.stepDist += moved;
    if (this.stepDist > 1.9) { this.stepDist = 0; this.sfx.step(); }
    if (this.boost > 0) this.boost = Math.max(0, this.boost - dt);
    this.sync(dt);
  }

  sync(dt) {
    const bob = Math.sin(performance.now() * 0.011) * 0.025 * this.moveAmt;
    this.camera.position.set(this.pos.x, PC.eyeHeight + bob, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  consumeLook() { const r = [this.lookDx, this.lookDy]; this.lookDx = 0; this.lookDy = 0; return r; }
}
