export function resolveCircle(pos, radius, boxes) {
  let hit = false;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (!b.move) continue;

      const cx = Math.max(b.minX, Math.min(pos.x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
      let dx = pos.x - cx, dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;

      if (d2 >= radius * radius) continue;

      hit = true;

      if (d2 > 1e-9) {
        const d = Math.sqrt(d2);
        const push = radius - d;
        pos.x += (dx / d) * push;
        pos.z += (dz / d) * push;
      } else {
        const l = pos.x - b.minX;
        const r = b.maxX - pos.x;
        const t = pos.z - b.minZ;
        const bt = b.maxZ - pos.z;
        const m = Math.min(l, r, t, bt);

        if (m === l) pos.x = b.minX - radius;
        else if (m === r) pos.x = b.maxX + radius;
        else if (m === t) pos.z = b.minZ - radius;
        else pos.z = b.maxZ + radius;
      }
    }
  }
  return hit;
}

export function rayBox(ox, oy, oz, dx, dy, dz, b, maxT = Infinity) {
  let tmin = 0, tmax = maxT;
  const o = [ox, oy, oz], d = [dx, dy, dz];
  const mn = [b.minX, b.minY, b.minZ], mx = [b.maxX, b.maxY, b.maxZ];

  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < mn[i] || o[i] > mx[i]) return Infinity;
    } else {
      let t1 = (mn[i] - o[i]) / d[i];
      let t2 = (mx[i] - o[i]) / d[i];

      if (t1 > t2) {
        const t = t1;
        t1 = t2;
        t2 = t;
      }

      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return Infinity;
    }
  }

  return tmin;
}

export function rayWorld(ox, oy, oz, dx, dy, dz, boxes, maxT = Infinity) {
  let best = Infinity;

  for (let i = 0; i < boxes.length; i++) {
    if (!boxes[i].shoot) continue;

    const t = rayBox(
      ox,
      oy,
      oz,
      dx,
      dy,
      dz,
      boxes[i],
      Math.min(best, maxT)
    );

    if (t < best) best = t;
  }

  return best;
}

export function rayCylinder(
  ox,
  oy,
  oz,
  dx,
  dy,
  dz,
  cx,
  cz,
  r,
  y0,
  y1,
  maxT = Infinity
) {
  const fx = ox - cx;
  const fz = oz - cz;
  const a = dx * dx + dz * dz;

  if (a < 1e-12) return Infinity;

  const c = fx * fx + fz * fz - r * r;
  const bq = fx * dx + fz * dz;
  const disc = bq * bq - a * c;

  if (disc < 0) return Infinity;

  const sq = Math.sqrt(disc);
  let t = (-bq - sq) / a;

  if (t < 0) {
    t = c <= 0 ? 0 : (-bq + sq) / a;
  }

  if (t < 0 || t > maxT) return Infinity;

  const y = oy + dy * t;

  if (y < y0 || y > y1) {
    const t2 = (-bq + sq) / a;

    if (t2 >= 0 && t2 <= maxT) {
      const y2 = oy + dy * t2;

      if (y2 >= y0 && y2 <= y1 && t <= t2) {
        return t2;
      }
    }

    return Infinity;
  }

  return t;
}

export function dist2D(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}