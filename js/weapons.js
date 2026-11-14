import * as THREE from 'three';
import { glowTexture } from './textures.js';
import { CONFIG } from './config.js';
import { fixSkinBind } from './skin.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export class WeaponSystem {
  constructor(aspect, renderer) {
    this.scene = new THREE.Scene();
    if (renderer) {
      const pmrem = new THREE.PMREMGenerator(renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    }
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.01, 10);
    this.scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x555560, 1.9));
    const key = new THREE.DirectionalLight(0xfff2dd, 2.6); key.position.set(1.5, 2.5, 1.5); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x8899ff, 0.9); rim.position.set(-2, 0.5, -1); this.scene.add(rim);
    this.flashLight = new THREE.PointLight(0xffb060, 0, 3, 2); this.scene.add(this.flashLight);

    this.holder = new THREE.Group();
    this.scene.add(this.holder);
    this.weapons = [];
    this.current = 0;
    this.sw = null;              
    this.kick = 0;
    this.bobT = 0; this.bobAmt = 0;
    this.sway = new THREE.Vector2();
    this.flashTimer = 0;
    this._v = new THREE.Vector3();
    this.onSwitch = null;
  }

  async load(loader, onEach) {
    const flashTex = glowTexture('255,210,110');
    for (const def of CONFIG.weapons) {
      const gltf = await loader.loadAsync(def.file);
      const model = gltf.scene;
      fixSkinBind(model);
      model.traverse(o => {
        if (o.isMesh) {
          o.frustumCulled = false; o.castShadow = false;
          if (o.material && !o.material.transparent) o.material.side = THREE.DoubleSide;
        }
      });
      const pivot = new THREE.Group();
      pivot.rotation.y = Math.PI;                       
      pivot.scale.setScalar(def.view.scale);
      pivot.position.set(...def.view.pos);
      pivot.add(model);

      const flash = new THREE.Sprite(new THREE.SpriteMaterial({
        map: flashTex, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false }));
      flash.position.set(...def.flash.pos); flash.scale.set(def.flash.size, def.flash.size, 1);
      flash.visible = false; flash.renderOrder = 10;
      pivot.add(flash);

      const mixer = new THREE.AnimationMixer(model);
      const clip = gltf.animations[0];
      const action = mixer.clipAction(clip);
      action.play(); action.paused = true;
      action.time = def.view.idleTime;                  
      mixer.update(0);

      model.updateMatrixWorld(true);
      const box = new THREE.Box3(), tmp = new THREE.Box3();
      model.traverse(o => {
        if (o.isMesh && !o.isSkinnedMesh && o.geometry) {
          if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
          tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); box.union(tmp);
        }
      });
      const ex = def.view.expectBox;

if (ex && !box.isEmpty()) {
  const ac = box.getCenter(new THREE.Vector3());

  const ec = new THREE.Vector3(
    (ex.min[0] + ex.max[0]) / 2,
    (ex.min[1] + ex.max[1]) / 2,
    (ex.min[2] + ex.max[2]) / 2
  );

  const d = ec.clone().sub(ac);

  console.info(
    `[arma ${def.id}] caja real`,
    box.min.toArray().map(v => +v.toFixed(1)),
    box.max.toArray().map(v => +v.toFixed(1)),
    '| desplazamiento aplicado',
    d.toArray().map(v => +v.toFixed(1))
  );

  if (def.id === 'pistol' && d.length() > 1.0) {
    model.position.add(d);
  }
}

      pivot.visible = false;
      this.holder.add(pivot);
      this.weapons.push({ def, pivot, flash, mixer, action, t: def.view.idleTime, firing: false, last: -10 });
      if (onEach) onEach(this.weapons.length);
    }
    this.weapons[0].pivot.visible = true;
  }

  get active() { return this.weapons[this.current]; }
  get isSwitching() { return this.sw !== null; }

  select(idx) {
    if (idx === this.current || this.sw || idx < 0 || idx >= this.weapons.length) return false;
    this.sw = { phase: 'down', t: 0, to: idx };
    if (this.onSwitch) this.onSwitch(idx);
    return true;
  }

  canFire(now) {
    const w = this.active;
    return !this.sw && now - w.last >= w.def.cooldown;
  }

  fire(now) {
    const w = this.active;
    w.last = now;
    w.firing = true; w.t = w.def.view.fire[0];
    this.kick = 1;
    this.flashTimer = 0.055;
    w.flash.visible = true; w.flash.material.rotation = Math.random() * 6.28;
    w.flash.scale.setScalar(w.def.flash.size * (0.8 + Math.random() * 0.5));
    this.holder.updateMatrixWorld(true);
    w.flash.getWorldPosition(this._v);
    this.flashLight.position.copy(this._v); this.flashLight.intensity = 14;
  }

  update(dt, moveSpeed01, lookDx, lookDy) {
    for (const w of this.weapons) {
      if (!w.firing) continue;
      w.t += dt;
      if (w.t >= w.def.view.fire[1]) { w.firing = false; w.t = w.def.view.idleTime; }
      w.action.time = w.t; w.mixer.update(0);
    }
    let drop = 0;
    if (this.sw) {
      const s = this.sw; s.t += dt;
      if (s.phase === 'down') {
        const k = Math.min(1, s.t / 0.16); drop = k * k;
        if (k >= 1) {
          this.weapons[this.current].pivot.visible = false;
          this.current = s.to; this.weapons[this.current].pivot.visible = true;
          s.phase = 'up'; s.t = 0;
        }
      } else {
        const k = Math.min(1, s.t / 0.2); drop = 1 - (1 - (1 - k) * (1 - k));
        drop = (1 - k) * (1 - k);
        if (k >= 1) this.sw = null;
      }
    }
    this.kick = Math.max(0, this.kick - dt * 7);
    const k = this.kick * this.kick;
    this.bobAmt += (moveSpeed01 - this.bobAmt) * Math.min(1, dt * 8);
    this.bobT += dt * (6 + 5 * moveSpeed01);
    const bx = Math.cos(this.bobT) * 0.006 * this.bobAmt, by = Math.abs(Math.sin(this.bobT)) * 0.008 * this.bobAmt;
    this.sway.x += (-lookDx * 0.00035 - this.sway.x) * Math.min(1, dt * 10);
    this.sway.y += (lookDy * 0.00035 - this.sway.y) * Math.min(1, dt * 10);
    const sx = Math.max(-0.04, Math.min(0.04, this.sway.x)), sy = Math.max(-0.03, Math.min(0.03, this.sway.y));
    this.holder.position.set(bx + sx, -by + sy - drop * 0.45, k * 0.05);
    this.holder.rotation.set(k * 0.07 + drop * 0.5, sx * 0.8, 0);

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) { this.weapons.forEach(w => w.flash.visible = false); this.flashLight.intensity = 0; }
    }
  }

  debugToggle() {
    this.dbgMode = this.dbgMode ? 0 : 1;
    const w = this.active;
    if (!this._origMats) this._origMats = new Map();
    w.pivot.traverse(o => {
      if (!o.isMesh) return;
      if (this.dbgMode === 1) {
        if (!this._origMats.has(o)) this._origMats.set(o, o.material);
        o.material = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
      } else if (this._origMats.has(o)) { o.material = this._origMats.get(o); }
    });
    if (this.dbgBox) { this.scene.remove(this.dbgBox); this.dbgBox = null; }
    this.holder.updateMatrixWorld(true);
    const box = new THREE.Box3();
    let meshes = 0, skinned = 0;
    w.pivot.traverse(o => { if (o.isMesh) { meshes++; if (o.isSkinnedMesh) skinned++; } });
    box.setFromObject(w.pivot, true);
    if (this.dbgMode === 1 && !box.isEmpty()) {
      this.dbgBox = new THREE.Box3Helper(box, 0xff00ff); this.scene.add(this.dbgBox);
    }
    const f = (v) => v.toArray().map(n => +n.toFixed(2)).join(', ');
    const txt = `${w.def.id}: visible=${w.pivot.visible} mallas=${meshes} (con esqueleto ${skinned}) caja min(${f(box.min)}) max(${f(box.max)})`;
    console.info('[debug arma]', txt);
    return txt;
  }

  resize(aspect) { this.camera.aspect = aspect; this.camera.updateProjectionMatrix(); }

  reset() {
    this.sw = null; this.kick = 0; this.holder.position.set(0, 0, 0); this.holder.rotation.set(0, 0, 0);
    this.weapons.forEach((w, i) => {
      w.firing = false; w.t = w.def.view.idleTime; w.action.time = w.t; w.mixer.update(0);
      w.pivot.visible = i === 0; w.flash.visible = false; w.last = -10;
    });
    this.current = 0; this.flashLight.intensity = 0;
  }
}
