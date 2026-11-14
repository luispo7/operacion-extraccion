export class AmmoSystem {
  constructor(weaponDefs) {
    this.defs = weaponDefs;
    this.reset();
  }
  reset() { this.count = this.defs.map(w => w.startAmmo); }
  get(i) { return this.count[i]; }
  canShoot(i) { return this.count[i] > 0; }
  consume(i) {
    if (this.count[i] <= 0) return false;
    this.count[i]--;
    return true;
  }
  add(i, n) {
    const before = this.count[i];
    this.count[i] = Math.min(this.defs[i].maxAmmo, before + n);
    return this.count[i] - before;
  }
}
