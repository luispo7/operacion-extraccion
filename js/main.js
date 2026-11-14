import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from './config.js';
import { buildLevel } from './level.js';
import { NavGrid } from './nav.js';
import { rayWorld } from './collision.js';
import { AmmoSystem } from './ammo.js';
import { WeaponSystem } from './weapons.js';
import { ZombieManager } from './zombies.js';
import { Player } from './player.js';
import { Effects, Pickups } from './effects.js';
import { Sfx } from './audio.js';
import { UI } from './ui.js';
import { fixSkinBind } from './skin.js';

const DEBUG = new URLSearchParams(location.search).has('debug');

class Game {
  constructor() {
    this.ui = new UI();
    this.sfx = new Sfx();
    this.state = 'loading';          
    this.clock = new THREE.Clock();
    this.time = 0; this.playTime = 0;
    this.stats = { shots: 0, hits: 0 };
    this.flashlightOn = true;
    this.nextFullToast = 0;
    this.lastStage = '';
    this._dir = new THREE.Vector3(); this._o = new THREE.Vector3(); this._p = new THREE.Vector3();
  }

  async init() {
    const L = CONFIG.lighting;
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = L.exposure;
    this.renderer.autoClear = false;     
    document.getElementById('app').appendChild(this.renderer.domElement);
    this.canvas = this.renderer.domElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(L.background);
    this.scene.fog = new THREE.FogExp2(L.background, L.fogDensity);
    const C = CONFIG.camera;
    this.camera = new THREE.PerspectiveCamera(C.fov, window.innerWidth / window.innerHeight, C.near, C.far);
    this.scene.add(this.camera);

    this.scene.add(new THREE.HemisphereLight(0x8fa0c8, 0x2b2b2b, L.ambient));
    this.moon = new THREE.DirectionalLight(0xb8c4e8, L.moon);
    this.moon.castShadow = true;
    this.moon.shadow.mapSize.set(2048, 2048);
    const sc = this.moon.shadow.camera; sc.left = -34; sc.right = 34; sc.top = 34; sc.bottom = -34; sc.near = 1; sc.far = 130;
    this.moon.shadow.bias = -0.0004; this.moon.shadow.normalBias = 0.03;
    this.scene.add(this.moon, this.moon.target);
    this.flash = new THREE.SpotLight(0xfff0d0, L.flashlight, 40, 0.5, 0.55, 1.4);   
    this.flash.position.set(0.15, -0.1, 0); this.flash.target.position.set(0, 0, -6);
    this.camera.add(this.flash, this.flash.target);

    const loader = new GLTFLoader();
    this.ui.setLoading(0.05, 'Cargando zombi…');
    const zombieGltf = await loader.loadAsync(CONFIG.zombie.file);
    fixSkinBind(zombieGltf.scene);     
    this.ui.setLoading(0.3, 'Cargando armas…');
    this.weapons = new WeaponSystem(window.innerWidth / window.innerHeight, this.renderer);
    await this.weapons.load(loader, (n) => this.ui.setLoading(0.3 + n * 0.3, `Cargando armas… (${n}/${CONFIG.weapons.length})`));
    this.ui.setLoading(0.95, 'Construyendo escenario…');

    this.level = buildLevel();
    this.scene.add(this.level.group);
    this.colliders = this.level.colliders;
    this.nav = new NavGrid(CONFIG.nav, this.colliders, CONFIG.nav.inflate);

    this.ammo = new AmmoSystem(CONFIG.weapons);
    this.player = new Player(this.camera, this.sfx);
    this.effects = new Effects(this.scene);
    this.pickups = new Pickups(this.scene, this.level.layout.pickups);
    this.zombies = new ZombieManager(zombieGltf, this.level.layout.spawns, this.scene, this.nav, this.colliders);
    this.zombies.onActivate = (z) => {
      if (Math.hypot(z.pos.x - this.player.pos.x, z.pos.z - this.player.pos.z) < 30) this.sfx.growl();
    };
    this.weapons.onSwitch = (idx) => { this.sfx.switchWeapon(); this.ui.setAmmo(this.ammo.count, idx); };

    this.bindEvents();
    this.resetRun();
    this.state = 'menu';
    this.ui.show('menu');
    window.__gameStarted = true;
    this.renderer.setAnimationLoop(() => this.frame());
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight; this.camera.updateProjectionMatrix();
      this.weapons.resize(this.camera.aspect);
    });
    document.getElementById('btn-play').addEventListener('click', () => this.requestPlay());
    document.getElementById('pause').addEventListener('click', () => this.requestPlay());
    document.getElementById('btn-retry').addEventListener('click', () => this.restart());
    document.getElementById('btn-again').addEventListener('click', () => this.restart());

    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === this.canvas;
      this.player.locked = locked;
      if (locked && (this.state === 'menu' || this.state === 'paused')) {
        this.state = 'playing'; this.ui.hideScreens(); this.ui.showHud(true); this.clock.getDelta();
      } else if (!locked && this.state === 'playing') {
        this.state = 'paused'; this.ui.show('pause');
      }
    });
    document.addEventListener('pointerlockerror', () => this.ui.toast('No se pudo capturar el mouse. Haz clic de nuevo.', 'bad'));

    document.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || this.state !== 'playing' || !this.player.locked) return;
      this.tryShoot();
    });
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (this.state === 'playing') {
        if (e.code === 'Digit1' || e.code === 'Numpad1') this.weapons.select(0);
        else if (e.code === 'Digit2' || e.code === 'Numpad2') this.weapons.select(1);
        else if (e.code === 'KeyF') { this.flashlightOn = !this.flashlightOn; this.flash.visible = this.flashlightOn; }
      }
      if (e.code === 'KeyM') { const m = this.sfx.toggleMute(); this.ui.toast(m ? 'Sonido desactivado' : 'Sonido activado'); }
      if (e.code === 'KeyR' && (this.state === 'gameover' || this.state === 'victory')) this.restart();
      if (DEBUG && e.code === 'KeyT' && this.state === 'playing') this.debugTeleport();
      if (DEBUG && e.code === 'KeyV' && this.state === 'playing') { this.dbgWeaponText = this.weapons.debugToggle(); }
    });
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  debugTeleport() {
    const p = this.player.pos;
    let best = null, bd = Infinity;
    for (const z of this.zombies.list) {
      if (z.state !== 'idle') continue;
      const d = Math.hypot(z.pos.x - p.x, z.pos.z - p.z);
      if (d < bd) { bd = d; best = z; }
    }
    if (!best) return;
    p.x = best.pos.x; p.z = best.pos.z + 4;
    this.player.yaw = 0; this.player.pitch = -0.1;
    this.ui.toast(`Frente a un zombi (${best.spawn.type})`, 'info');
  }

  requestPlay() {
    this.sfx.init();
    if (this.state === 'menu' || this.state === 'paused') {
      const p = this.canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => this.ui.toast('No se pudo capturar el mouse', 'bad'));
    }
  }

  restart() {
    this.resetRun();
    this.state = 'paused';
    this.ui.show('pause');
    this.requestPlay();
  }

  resetRun() {
    this.player.reset();
    this.ammo.reset();
    this.weapons.reset();
    this.zombies.reset();
    this.pickups.reset();
    this.stats = { shots: 0, hits: 0 };
    this.playTime = 0; this.lastStage = '';
    this.ui.vignette(false); this.ui.setBoost(false);
    this.ui.setAmmo(this.ammo.count, 0);
    this.ui.setKills(0, this.zombies.total);
    this.ui.setStage('INICIO');
    this.ui.setDistance(Math.hypot(CONFIG.extraction.x - this.player.pos.x, CONFIG.extraction.z - this.player.pos.z));
  }

  statsText() {
    const m = Math.floor(this.playTime / 60), s = Math.floor(this.playTime % 60);
    const acc = this.stats.shots ? Math.round(100 * this.stats.hits / this.stats.shots) : 0;
    return `Tiempo: <b>${m}:${String(s).padStart(2, '0')}</b><br>Zombis eliminados: <b>${this.zombies.killed}/${this.zombies.total}</b><br>` +
           `Disparos: <b>${this.stats.shots}</b> · Precisión: <b>${acc}%</b><br>` +
           `Munición restante: <b>${this.ammo.count.join(' / ')}</b>`;
  }

  tryShoot() {
    const now = this.time;
    if (!this.weapons.canFire(now)) return;
    const wi = this.weapons.current, def = CONFIG.weapons[wi];
    if (!this.ammo.consume(wi)) {            
      this.weapons.active.last = now;
      this.sfx.empty(); this.ui.toast('SIN MUNICIÓN – busca una caja de abastecimiento', 'bad');
      return;
    }
    this.weapons.fire(now);
    this.sfx.shot(def.id);
    this.ui.setAmmo(this.ammo.count, wi);
    this.stats.shots++;

    const o = this._o.copy(this.camera.position);
    const d = this.camera.getWorldDirection(this._dir);
    const MAXR = 250;
    const wallT = rayWorld(o.x, o.y, o.z, d.x, d.y, d.z, this.colliders, MAXR);
    const hit = this.zombies.raycast(o, d, Math.min(wallT, MAXR));

    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
    const from = o.clone().addScaledVector(d, 0.7).addScaledVector(right, 0.13).addScaledVector(up, -0.1);
    const tEnd = hit ? hit.t : Math.min(wallT, 80);
    const to = o.clone().addScaledVector(d, tEnd);
    this.effects.tracer(from, to);

    if (hit) {
      const killed = hit.zombie.hit(def.damage);      
      this.effects.blood(to);
      killed ? this.sfx.kill() : this.sfx.hit();
      this.ui.hitMarker(killed);
      this.ui.setKills(this.zombies.killed, this.zombies.total);
      if (killed) this.ui.toast(`Zombi eliminado (${this.zombies.killed}/${this.zombies.total})`, 'good');
    } else if (wallT < MAXR) {
      this.effects.spark(to);
    }
  }

  collect(p) {
    const d = p.def;
    if (d.kind === 'ammo') {
      const wdef = CONFIG.weapons[d.weapon];
      const added = this.ammo.add(d.weapon, wdef.pickupAmount);
      this.ui.toast(`+${added} balas (${wdef.name})`, 'good');
      this.ui.setAmmo(this.ammo.count, this.weapons.isSwitching ? this.weapons.sw.to : this.weapons.current);
    } else {
      this.player.boost = CONFIG.player.boostSeconds;
      this.ui.toast('ADRENALINA: ¡velocidad aumentada!', 'info');
    }
    this.sfx.pickup();
    this.pickups.take(p);
  }

  gameOver() {
    this.state = 'gameover';
    this.sfx.gameOver();
    this.ui.vignette(true);
    document.exitPointerLock();
    setTimeout(() => { if (this.state === 'gameover') { this.ui.showHud(false); this.ui.gameOver(this.statsText()); } }, 900);
  }

  victory() {
    this.state = 'victory';
    this.sfx.win();
    document.exitPointerLock();
    this.ui.showHud(false);
    this.ui.victory(this.statsText());
  }

  updateDebug() {
    if (!this.dbgEl) {
      this.dbgEl = document.createElement('div');
      this.dbgEl.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:30;font:12px monospace;color:#9f9;background:rgba(0,0,0,.6);padding:6px 10px;border-radius:4px;white-space:pre';
      document.body.appendChild(this.dbgEl);
    }
    const p = this.player.pos; let near = Infinity;
    for (const z of this.zombies.list) if (z.alive) near = Math.min(near, Math.hypot(z.pos.x - p.x, z.pos.z - p.z));
    const m = this.zombies.measured || {};
    this.dbgEl.textContent = `DEBUG  pos (${p.x.toFixed(1)}, ${p.z.toFixed(1)})  zombis ${this.zombies.list.length} (activos ${this.zombies.chasing})\n` +
      `zombi más cercano: ${near.toFixed(1)} m   altura medida: ${m.height} m   factor: ${m.factor}  \n` +
      (this.dbgWeaponText || '');
  }

  updateStage() {
    const z = this.player.pos.z;
    const stage = z > -14.5 ? 'INICIO' : (z < -96 ? 'FINAL' : 'DESARROLLO');
    if (stage !== this.lastStage) {
      if (this.lastStage) this.ui.toast(stage === 'DESARROLLO' ? 'DESARROLLO: atraviesa la zona infestada' : 'FINAL: la extracción está cerca', 'info');
      this.lastStage = stage; this.ui.setStage(stage);
    }
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.time += dt;
    if (this.level.rotor) this.level.rotor.rotation.y += dt * 9;
    if (this.level.beam) this.level.beam.material.opacity = 0.24 + Math.sin(this.time * 2) * 0.05;

    if (this.state === 'playing') {
      this.playTime += dt;
      this.player.update(dt, this.colliders);
      const [lx, ly] = this.player.consumeLook();
      this.weapons.update(dt, this.player.moveAmt, lx, ly);

      const caught = this.zombies.update(dt, this.player.pos);

      // RF10: coleccionables
      const touched = this.pickups.update(dt, this.time, this.player.pos, (def) => {
        if (def.kind !== 'ammo') return true;
        if (this.ammo.get(def.weapon) < CONFIG.weapons[def.weapon].maxAmmo) return true;
        if (this.time > this.nextFullToast) { this.nextFullToast = this.time + 2.5; this.ui.toast('Munición llena', 'info'); }
        return false;
      });
      if (touched) this.collect(touched);

      if (DEBUG) this.updateDebug();
      this.ui.setBoost(this.player.boost > 0);
      this.updateStage();
      const ex = CONFIG.extraction;
      const dEx = Math.hypot(ex.x - this.player.pos.x, ex.z - this.player.pos.z);
      this.ui.setDistance(dEx);

      if (caught) this.gameOver();                    
      else if (dEx < ex.radius) this.victory();       
    }

    this.effects.update(dt);
    if (this.state !== 'playing') this.weapons.update(dt, 0, 0, 0);

    const px = this.player.pos.x, pz = this.player.pos.z;
    this.moon.position.set(px - 18, 38, pz + 14); this.moon.target.position.set(px, 0, pz);

    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.clearDepth();
    this.renderer.render(this.weapons.scene, this.weapons.camera);
  }
}

const game = new Game();
game.init().catch((err) => {
  console.error(err);
  const file = location.protocol === 'file:';
  game.ui.setError(file
    ? 'Abre el proyecto con un servidor local (los navegadores bloquean los archivos .glb desde file://).<br><code>python3 -m http.server 8000</code> y entra a <b>http://localhost:8000</b>'
    : `${String(err && err.message || err)}<br>Revisa tu conexión (Three.js se carga desde un CDN) y que existan los archivos de <code>assets/models/</code>.`);
});
