class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(node) {
    const a = this.a; a.push(node);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]]; i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        let l = 2 * i + 1, r = l + 1, m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top;
  }
}

export class NavGrid {
  constructor({ minX, maxX, minZ, maxZ, cell }, boxes, inflate) {
    this.minX = minX; this.minZ = minZ; this.cell = cell;
    this.w = Math.ceil((maxX - minX) / cell);
    this.h = Math.ceil((maxZ - minZ) / cell);
    this.blocked = new Uint8Array(this.w * this.h);
    for (const b of boxes) {
      if (!b.move) continue;
      const x0 = Math.max(0, Math.floor((b.minX - inflate - minX) / cell));
      const x1 = Math.min(this.w - 1, Math.floor((b.maxX + inflate - minX) / cell));
      const z0 = Math.max(0, Math.floor((b.minZ - inflate - minZ) / cell));
      const z1 = Math.min(this.h - 1, Math.floor((b.maxZ + inflate - minZ) / cell));
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) this.blocked[z * this.w + x] = 1;
    }
  }
  toCell(x, z) { return [Math.floor((x - this.minX) / this.cell), Math.floor((z - this.minZ) / this.cell)]; }
  toWorld(cx, cz) { return { x: this.minX + (cx + 0.5) * this.cell, z: this.minZ + (cz + 0.5) * this.cell }; }
  isBlockedCell(cx, cz) {
    return cx < 0 || cz < 0 || cx >= this.w || cz >= this.h || this.blocked[cz * this.w + cx] === 1;
  }
  isBlocked(x, z) { const [cx, cz] = this.toCell(x, z); return this.isBlockedCell(cx, cz); }

  lineClear(x0, z0, x1, z1) {
    const d = Math.hypot(x1 - x0, z1 - z0);
    const steps = Math.max(1, Math.ceil(d / (this.cell * 0.5)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (this.isBlocked(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t)) return false;
    }
    return true;
  }

  nearestFree(cx, cz, maxR = 4) {
    if (!this.isBlockedCell(cx, cz)) return [cx, cz];
    for (let r = 1; r <= maxR; r++) {
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        if (!this.isBlockedCell(cx + dx, cz + dz)) return [cx + dx, cz + dz];
      }
    }
    return null;
  }

  findPath(sx, sz, ex, ez, maxNodes = 9000) {
    let s = this.nearestFree(...this.toCell(sx, sz));
    let e = this.nearestFree(...this.toCell(ex, ez));
    if (!s || !e) return null;
    const W = this.w, N = this.w * this.h;
    const g = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const sIdx = s[1] * W + s[0], eIdx = e[1] * W + e[0];
    const hf = (i) => {
      const dx = Math.abs((i % W) - e[0]), dz = Math.abs(((i / W) | 0) - e[1]);
      return (dx + dz) + (1.41421356 - 2) * Math.min(dx, dz);
    };
    const open = new MinHeap();
    g[sIdx] = 0; open.push({ i: sIdx, f: hf(sIdx) });
    let expanded = 0, found = false;
    while (open.size && expanded < maxNodes) {
      const { i } = open.pop();
      if (closed[i]) continue;
      closed[i] = 1; expanded++;
      if (i === eIdx) { found = true; break; }
      const cx = i % W, cz = (i / W) | 0;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const nx = cx + dx, nz = cz + dz;
        if (this.isBlockedCell(nx, nz)) continue;
        if (dx && dz && (this.isBlockedCell(cx + dx, cz) || this.isBlockedCell(cx, cz + dz))) continue; 
        const ni = nz * W + nx;
        if (closed[ni]) continue;
        const ng = g[i] + (dx && dz ? 1.41421356 : 1);
        if (ng < g[ni]) { g[ni] = ng; came[ni] = i; open.push({ i: ni, f: ng + hf(ni) }); }
      }
    }
    if (!found) return null;
    const cells = [];
    for (let i = eIdx; i !== -1; i = came[i]) cells.push(this.toWorld(i % W, (i / W) | 0));
    cells.reverse();
    const out = [];
    let a = 0;
    while (a < cells.length - 1) {
      let b = cells.length - 1;
      while (b > a + 1 && !this.lineClear(cells[a].x, cells[a].z, cells[b].x, cells[b].z)) b--;
      out.push(cells[b]); a = b;
    }
    return out;
  }
}
