import * as THREE from 'three';
import { glowTexture } from './textures.js';
import { CONFIG } from './config.js';

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.sparkTex = glowTexture('255,210,120');
    this.bloodTex = glowTexture('200,20,20');
  }

  _sprite(tex, pos, size, life, blending = THREE.AdditiveBlending) {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        blending,
        depthWrite: false
      })
    );

    s.position.copy(pos);
    s.scale.set(size, size, 1);
    this.scene.add(s);

    this.items.push({
      obj: s,
      life,
      max: life,
      grow: size * 1.6
    });
  }

  spark(pos) {
    this._sprite(this.sparkTex, pos, 0.18, 0.12);
  }

  blood(pos) {
    for (let i = 0; i < 3; i++) {
      this._sprite(
        this.bloodTex,
        pos.clone().add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.25,
            (Math.random() - 0.5) * 0.25,
            (Math.random() - 0.5) * 0.25
          )
        ),
        0.3,
        0.3,
        THREE.NormalBlending
      );
    }
  }

  tracer(from, to) {
    const g = new THREE.BufferGeometry().setFromPoints([from, to]);

    const l = new THREE.Line(
      g,
      new THREE.LineBasicMaterial({
        color: 0xffe2a0,
        transparent: true,
        opacity: 0.8
      })
    );

    this.scene.add(l);

    this.items.push({
      obj: l,
      life: 0.06,
      max: 0.06,
      line: true
    });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];

      it.life -= dt;

      const k = Math.max(0, it.life / it.max);
      it.obj.material.opacity = k;

      if (!it.line) {
        const s = it.obj.scale.x + it.grow * dt;
        it.obj.scale.set(s, s, 1);
      }

      if (it.life <= 0) {
        this.scene.remove(it.obj);

        if (it.line) {
          it.obj.geometry.dispose();
        }

        it.obj.material.dispose();
        this.items.splice(i, 1);
      }
    }
  }
}

export class Pickups {
  constructor(scene, defs) {
    this.scene = scene;
    this.defs = defs;
    this.list = [];

    const glow = {
      ammo0: '255,200,60',
      ammo1: '255,120,40',
      speed: '60,210,255'
    };

    const col = {
      ammo0: 0xffc93c,
      ammo1: 0xff8a2a,
      speed: 0x35d0ff
    };

    this.geo = new THREE.BoxGeometry(0.5, 0.32, 0.34);
    this.stripeGeo = new THREE.BoxGeometry(0.52, 0.06, 0.36);

    this.dark = new THREE.MeshStandardMaterial({
      color: 0x151515,
      roughness: 0.8
    });

    this.mats = {};
    this.glows = {};

    for (const k of Object.keys(col)) {
      this.mats[k] = new THREE.MeshStandardMaterial({
        color: col[k],
        emissive: col[k],
        emissiveIntensity: 0.55,
        roughness: 0.5,
        metalness: 0.2
      });

      this.glows[k] = new THREE.SpriteMaterial({
        map: glowTexture(glow[k]),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
    }

    for (const d of defs) {
      const key = d.kind === 'ammo'
        ? `ammo${d.weapon}`
        : 'speed';

      const g = new THREE.Group();

      const m = new THREE.Mesh(
        d.kind === 'speed'
          ? new THREE.OctahedronGeometry(0.28)
          : this.geo,
        this.mats[key]
      );

      m.castShadow = true;
      g.add(m);

      if (d.kind === 'ammo') {
        const st = new THREE.Mesh(this.stripeGeo, this.dark);
        g.add(st);
      }

      const halo = new THREE.Sprite(this.glows[key]);
      halo.scale.set(1.5, 1.5, 1);
      g.add(halo);

      g.position.set(d.x, 0.7, d.z);
      this.scene.add(g);

      this.list.push({
        def: d,
        group: g,
        taken: false,
        phase: Math.random() * 6
      });
    }
  }

  reset() {
    for (const p of this.list) {
      p.taken = false;
      p.group.visible = true;
    }
  }

  update(dt, t, player, canTake) {
    let touched = null;

    for (const p of this.list) {
      if (p.taken) continue;

      p.group.rotation.y += dt * 1.6;
      p.group.position.y = 0.7 + Math.sin(t * 2 + p.phase) * 0.08;

      if (
        Math.hypot(
          p.def.x - player.x,
          p.def.z - player.z
        ) < CONFIG.pickupRadius &&
        canTake(p.def)
      ) {
        touched = p;
      }
    }

    return touched;
  }

  take(p) {
    p.taken = true;
    p.group.visible = false;
  }
}