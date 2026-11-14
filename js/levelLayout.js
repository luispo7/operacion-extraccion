export function buildLayout() {
  const solids = [], floors = [], spawns = [], pickups = [], lights = [];
  const H = 3.2, T = 0.4;

  function solid(x0, x1, z0, z1, y0, y1, mat, o = {}) {
    solids.push({ x0, x1, z0, z1, y0, y1, mat, move: o.move !== false, shoot: o.shoot !== false,
                  kind: o.kind || 'box', color: o.color, tile: o.tile || 3, cast: o.cast !== false, horizontal: !!o.horizontal });
  }
  const box = (cx, cz, w, d, h, mat, o = {}) => solid(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, o.y0 || 0, (o.y0 || 0) + h, mat, o);

  function segments(a0, a1, gaps) {
    const g = [...gaps].sort((p, q) => p[0] - q[0]);
    const segs = []; let cur = a0;
    for (const [ga, gb] of g) { if (ga > cur) segs.push([cur, ga]); cur = gb; }
    if (cur < a1) segs.push([cur, a1]);
    return segs;
  }
  function wallH(z, x0, x1, gaps = [], o = {}) {
    const mat = o.mat || 'brick', h = o.h || H, t = o.t || T;
    for (const [a, b] of segments(x0, x1, gaps)) solid(a, b, z - t / 2, z + t / 2, 0, h, mat, o);
    for (const [a, b] of gaps) solid(a, b, z - t / 2, z + t / 2, 2.5, h, mat, { move: false, shoot: false, tile: o.tile }); 
  }
  function wallV(x, z0, z1, gaps = [], o = {}) {
    const mat = o.mat || 'brick', h = o.h || H, t = o.t || T;
    for (const [a, b] of segments(z0, z1, gaps)) solid(x - t / 2, x + t / 2, a, b, 0, h, mat, o);
    for (const [a, b] of gaps) solid(x - t / 2, x + t / 2, a, b, 2.5, h, mat, { move: false, shoot: false, tile: o.tile });
  }
  function building(minX, maxX, minZ, maxZ, doors = {}, o = {}) {
    const mat = o.mat || 'brick';
    wallH(minZ, minX - T / 2, maxX + T / 2, doors.N || [], { mat });
    wallH(maxZ, minX - T / 2, maxX + T / 2, doors.S || [], { mat });
    wallV(minX, minZ, maxZ, doors.W || [], { mat });
    wallV(maxX, minZ, maxZ, doors.E || [], { mat });
    floors.push({ x0: minX, x1: maxX, z0: minZ, z1: maxZ, y: 0.02, mat: o.floor || 'concrete', tile: 4 });
    if (o.roof !== false) solid(minX - 0.3, maxX + 0.3, minZ - 0.3, maxZ + 0.3, H, H + 0.3, 'concrete', { move: false, shoot: false, tile: 6 });
  }
  const car = (x, z, color, vertical = true) =>
    vertical ? solid(x - 0.95, x + 0.95, z - 2.2, z + 2.2, 0, 1.4, 'metal', { kind: 'car', color })
             : solid(x - 2.2, x + 2.2, z - 0.95, z + 0.95, 0, 1.4, 'metal', { kind: 'car', color, horizontal: true });
  const container = (x, z, w, d, color) => solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 0, 2.6, 'metal', { kind: 'container', color, tile: 2 });
  const crate = (x, z, s = 1) => box(x, z, s, s, s, 'wood', { tile: 1 });
  const light = (x, y, z, color, intensity, distance) => lights.push({ x, y, z, color, intensity, distance });

  floors.push({ x0: -32, x1: 32, z0: -132, z1: 14, y: 0, mat: 'grass', tile: 6 });
  floors.push({ x0: -9, x1: 9, z0: -64, z1: -14, y: 0.01, mat: 'concrete', tile: 4 });   
  floors.push({ x0: -7, x1: 7, z0: -64, z1: -14, y: 0.02, mat: 'asphalt', tile: 5 });   
  floors.push({ x0: -32, x1: 32, z0: -132, z1: -96, y: 0.01, mat: 'asphalt', tile: 6 }); 

  wallH(-132, -33, 33, [], { mat: 'concrete', h: 4, t: 1, tile: 4 });
  wallH(14, -33, 33, [], { mat: 'concrete', h: 4, t: 1, tile: 4 });
  wallV(-32, -132, 14, [], { mat: 'concrete', h: 4, t: 1, tile: 4 });
  wallV(32, -132, 14, [], { mat: 'concrete', h: 4, t: 1, tile: 4 });

  building(-7, 7, -14, 12, { N: [[-5.5, -2.5]] }, { mat: 'brick', floor: 'concrete' });
  crate(-5.6, 10.4, 1.2); crate(-5.6, 9.0, 1.0); crate(5.6, 10.6, 1.2); crate(4.3, 10.9, 0.9);
  box(5.4, -2, 2.4, 0.9, 1.0, 'wood', { tile: 1 });          
  box(-6.3, -4, 1.0, 3.0, 1.0, 'metal', { tile: 1 });        
  light(0, 2.8, 0, '#ffcf8a', 26, 20);
  pickups.push({ x: 5, z: -10, kind: 'ammo', weapon: 1 });

  const fence = (x, z0, z1) => wallV(x, z0, z1, [], { mat: 'metal', h: 2.4, t: 0.3, tile: 2 });
  fence(-9, -24, -14); fence(-9, -44, -38); fence(-9, -64, -58);
  fence(9, -20, -14);  fence(9, -46, -34);  fence(9, -64, -60);

  building(-25, -9, -38, -24, { E: [[-32.5, -29.5]] });  
  building(-25, -9, -58, -44, { E: [[-52.5, -49.5]] });  
  building(9, 25, -34, -20, { W: [[-28.5, -25.5]] });    
  building(9, 25, -60, -46, { W: [[-54.5, -51.5]] });    
  box(-22, -26, 4, 1, 1.0, 'wood', { tile: 1 }); box(-22, -36, 1.2, 1.2, 1.2, 'metal', { tile: 1 }); crate(-13, -26, 1);
  box(-22, -46, 4, 1, 1.0, 'wood', { tile: 1 }); crate(-24, -56, 1.2); crate(-13, -56, 1);
  box(22, -22, 4, 1, 1.0, 'wood', { tile: 1 }); crate(24, -32, 1.2); crate(13, -32, 1);
  box(22, -48, 4, 1, 1.0, 'wood', { tile: 1 }); crate(24, -58, 1.2); crate(13, -58, 1);

  car(4, -27, '#2c4a6b'); car(-3, -34, '#6b6b3a');
  car(5.5, -47, '#3d3d3d'); car(-2, -54, '#8a8a8a'); car(-4.5, -60, '#4b2c63');
  solid(-8.85, -6.0, -20.9, -20.1, 0, 1.0, 'concrete', { tile: 2 });
  solid(-3.0, 8.85, -20.9, -20.1, 0, 1.0, 'concrete', { tile: 2 });
  solid(-8.85, 1.5, -41.4, -40.6, 0, 1.0, 'concrete', { tile: 2 });
  solid(5.5, 8.85, -41.4, -40.6, 0, 1.0, 'concrete', { tile: 2 });
  box(-6, -37, 1.4, 0.8, 1.0, 'concrete', { tile: 2 });
  light(0, 5.5, -30, '#6f86b8', 45, 34); light(0, 5.5, -52, '#6f86b8', 45, 34);

  building(-22, 22, -96, -64, { S: [[5, 8]], N: [[-16, -13]] }, { mat: 'concrete', floor: 'tile' });
  wallH(-72, -22, 22, [[-17, -14], [-6, -3], [14, 17]], { mat: 'concrete' });
  wallV(-8, -90, -72, [[-81, -78]], { mat: 'concrete' });
  wallV(8, -90, -72, [[-87, -84]], { mat: 'concrete' });
  wallH(-90, -22, 22, [[4, 7]], { mat: 'concrete' });
  box(-11, -68, 6, 1.2, 1.1, 'wood', { tile: 1 });                  
  box(11, -68, 5, 0.8, 0.6, 'metal', { tile: 1 });                  
  box(2, -77, 1, 1, H, 'concrete', { tile: 1 }); box(-3, -82, 1, 1, H, 'concrete', { tile: 1 }); box(-1, -87, 1, 1, H, 'concrete', { tile: 1 });
  for (const [bx, bz] of [[-19, -76], [-19, -85], [-12, -75], [-12, -87], [19, -76], [19, -83], [12, -75], [12, -88]])
    box(bx, bz, 1.0, 2.0, 0.6, 'metal', { tile: 1 });               
  box(-10, -93, 3, 1, 1.0, 'wood', { tile: 1 }); box(11, -93.5, 1.4, 1.4, 1.2, 'metal', { tile: 1 });
  light(0, 2.8, -68, '#ffe2b0', 20, 16); light(0, 2.8, -80, '#8fb4ff', 22, 18); light(0, 2.8, -93, '#ff7a5a', 12, 14);

  container(-18, -104, 2.5, 6, '#7a3b2e'); container(18, -104, 2.5, 6, '#2f5a6b');
  container(-6, -110, 6, 2.5, '#6b6b2e');  container(7, -113, 6, 2.5, '#7a3b2e');
  container(-22, -116, 2.5, 6, '#2f5a6b'); container(22, -114, 2.5, 6, '#6b6b2e');
  solid(-15.4, -12.6, -112, -101, 0, 3.0, 'metal', { kind: 'bus', color: '#b7a23a' });         
  car(2, -101, '#7a2b24');
  wallH(-118, -32, 32, [[10, 14]], { mat: 'metal', h: 2.6, t: 0.3, tile: 2 });
  box(16.5, -115.8, 3, 0.8, 1.0, 'concrete', { tile: 2 }); box(5.5, -116.2, 3, 0.8, 1.0, 'concrete', { tile: 2 });
  solid(-1.1, 1.1, -131.3, -126.7, 0, 2.2, 'metal', { kind: 'heli', color: '#3e5b3a' });
  light(0, 9, -112, '#88a4d8', 60, 40); light(0, 3, -124, '#40ff80', 40, 26);

  const Z = (x, z, type, detect) => spawns.push({ x, z, type, detect });
  Z(-3, -27, 'normal', 11); Z(5, -37, 'normal', 12); Z(-6, -48, 'runner', 15); Z(3, -57, 'runner', 16);
  Z(-17, -31, 'normal', 8); Z(17, -27, 'normal', 8); Z(-17, -51, 'normal', 8);
  Z(3, -79, 'normal', 10); Z(-2.5, -85, 'normal', 10); Z(-16, -79, 'normal', 8);
  Z(-16, -88, 'normal', 8); Z(16, -80, 'normal', 8); Z(8, -93, 'runner', 12);
  Z(-9, -104, 'normal', 10); Z(9, -106, 'normal', 11); Z(-9, -114, 'normal', 10);
  Z(16, -110, 'runner', 14); Z(8, -116, 'normal', 9); Z(-8, -124, 'runner', 8);

  const P = (x, z, kind, weapon) => pickups.push({ x, z, kind, weapon });
  P(-16, -36, 'ammo', 0); P(22, -25, 'ammo', 1); P(-22, -56, 'ammo', 0);
  P(22, -58, 'ammo', 1); P(22, -51, 'speed'); P(6, -22, 'ammo', 0);
  P(-19, -67, 'ammo', 0); P(-20, -79, 'ammo', 1); P(20, -79, 'ammo', 0); P(-14, -93, 'ammo', 1);
  P(-20, -110, 'ammo', 0); P(0, -108, 'ammo', 1); P(20, -122, 'ammo', 0);

  return { solids, floors, spawns, pickups, lights };
}

export function toColliders(layout) {
  return layout.solids.filter(s => s.move || s.shoot).map(s => ({
    minX: s.x0, maxX: s.x1, minZ: s.z0, maxZ: s.z1, minY: s.y0, maxY: s.y1, move: s.move, shoot: s.shoot,
  }));
}
