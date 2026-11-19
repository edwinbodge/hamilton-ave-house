// Lot, landscaping and context for Creekside Ln. House frame (feet): +x = plan right (assumed north),
// +z = plan down = toward the street (assumed east), y = up. Ground is at y = -1.
import * as THREE from 'three';
import { LEVELS, LOT, STREET, NEIGHBORS, toFt } from './data.js';
import { Batcher, Kit, V, addFloorPoly, addSolid } from './geom.js';

const G = -1; // ground elevation

function groundText(text, x, z, w, h, rot, color) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = Math.round((1024 * h) / w);
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.font = `600 ${Math.round(c.height * 0.7)}px Inter, system-ui, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  m.rotation.order = 'YXZ';
  m.rotation.set(-Math.PI / 2, rot, 0);
  m.position.set(x, G + 0.08, z);
  m.renderOrder = 1;
  return m;
}
function curve(points, n) {
  const c = new THREE.CatmullRomCurve3(points.map(([x, z]) => V(x, 0, z)));
  return c.getPoints(n).map((p) => [p.x, p.z]);
}
function ribbon(bat, key, pts, width, y, tag = 'site') {
  const left = [], right = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
    const nx = -dz / l, nz = dx / l;
    left.push([pts[i][0] + nx * width / 2, pts[i][1] + nz * width / 2]);
    right.push([pts[i][0] - nx * width / 2, pts[i][1] - nz * width / 2]);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    bat.face(key, [V(left[i][0], y, left[i][1]), V(right[i][0], y, right[i][1]), V(right[i + 1][0], y, right[i + 1][1]), V(left[i + 1][0], y, left[i + 1][1])], V(0, 1, 0));
    addFloorPoly([left[i], right[i], right[i + 1], left[i + 1]], [], y, tag);
  }
}

// ------------------------------------------------------------------ trees
const leafMats = ['#4f7a35', '#5b8a3c', '#46703a', '#6a8f3f'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true }));
const redMats = ['#b8342a', '#c9452c', '#a32a26', '#d06a2c'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true }));
const yellowMats = ['#c9b13a', '#b9a63a', '#a8a03c', '#d2bb48'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true }));
const conMat = new THREE.MeshStandardMaterial({ color: '#2f5a3a', roughness: 0.95, flatShading: true });
const blueMat = new THREE.MeshStandardMaterial({ color: '#5f7f7a', roughness: 0.95, flatShading: true });
const arbMat = new THREE.MeshStandardMaterial({ color: '#3d6b35', roughness: 0.95, flatShading: true });
const barkMat = new THREE.MeshStandardMaterial({ color: '#5b4636', roughness: 1 });
const shrubMat = new THREE.MeshStandardMaterial({ color: '#4c6e34', roughness: 1, flatShading: true });
const yewMat = new THREE.MeshStandardMaterial({ color: '#2f4d2c', roughness: 1, flatShading: true });
function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function deciduous(group, x, z, h, seed, mats = leafMats, spread = 1) {
  const r = rng(seed);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.025, h * 0.045, h * 0.62, 7), barkMat);
  trunk.position.set(x, G + h * 0.31, z);
  group.add(trunk);
  const crown = h * 0.32 * spread;
  for (let i = 0; i < 8; i++) {
    const s = crown * (0.55 + r() * 0.45);
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), mats[i % mats.length]);
    m.position.set(x + (r() - 0.5) * crown * 1.2, G + h * 0.7 + (r() - 0.2) * crown * 0.6, z + (r() - 0.5) * crown * 1.2);
    group.add(m);
  }
  addSolid(V(x - h * 0.045, 0, z - h * 0.045), V(h * 0.09, 0, 0), V(0, 0, h * 0.09), G, G + h * 0.5, 'site');
}
function spruce(group, x, z, h, mat = conMat) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, h * 0.2, 6), barkMat);
  trunk.position.set(x, G + h * 0.1, z); group.add(trunk);
  for (let i = 0; i < 4; i++) {
    const rr = h * (0.24 - i * 0.045), hh = h * (0.42 - i * 0.05);
    const c = new THREE.Mesh(new THREE.ConeGeometry(rr, hh, 8), mat);
    c.position.set(x, G + h * 0.12 + i * h * 0.2 + hh / 2, z); group.add(c);
  }
  addSolid(V(x - 0.6, 0, z - 0.6), V(1.2, 0, 0), V(0, 0, 1.2), G, G + h, 'site');
}
function arborvitae(group, x, z, h) {
  const c = new THREE.Mesh(new THREE.ConeGeometry(h * 0.14, h, 8), arbMat);
  c.position.set(x, G + h / 2, z); group.add(c);
  addSolid(V(x - 1, 0, z - 1), V(2, 0, 0), V(0, 0, 2), G, G + h, 'site');
}
function shrub(group, x, z, s, mat = shrubMat) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), mat);
  m.scale.y = 0.75; m.position.set(x, G + s * 0.55, z); group.add(m);
}

// ------------------------------------------------------------------ site
export function buildSite() {
  const group = new THREE.Group();
  const bat = new Batcher();
  const OFF = {};
  const off = (rs) => (OFF[rs] = OFF[rs] || new Batcher());
  const F = (x, y) => toFt([x, y]);

  // ground with a hole where the basement is
  const bLevel = LEVELS.find((l) => l.id === 'b');
  const holes = [bLevel.footprint[0].map(([x, y]) => toFt(bLevel.map(x, y)))];
  const W = 420;
  const outer = [[-W, -W], [W, -W], [W, W], [-W, W]];
  bat.poly('grass', outer, G, holes);
  addFloorPoly(outer, holes, G, 'site');

  // street (Creekside Ln), curb, terrace, public sidewalk
  const sz0 = STREET.curb, sz1 = sz0 + STREET.width;
  bat.poly('asphalt', [[-W, sz0], [W, sz0], [W, sz1], [-W, sz1]], G - 0.3);
  bat.aabox('col:#bdbab2', -W, G - 0.3, sz0 - 0.6, W, G + 0.05, sz0);
  const [sw0, sw1] = STREET.sidewalk;
  bat.poly('paving', [[-W, sw0], [W, sw0], [W, sw1], [-W, sw1]], G + 0.03);
  addFloorPoly([[-W, sw0], [W, sw0], [W, sw1], [-W, sw1]], [], G + 0.03, 'site');
  for (const x of [-200, 200]) addFloorPoly([[x - 200, sz0], [x + 200, sz0], [x + 200, sz1], [x - 200, sz1]], [], G - 0.3, 'site');

  // driveway: wide apron at the side-load garage doors, then straight out to the street along the north line
  const [gx] = F(987.5, 0), [, gzB] = F(0, 378.5), [, gzF] = F(0, 722.5);
  const drive = [[gx + 0.3, gzB - 2.5], [LOT.xNorth - 1.5, gzB - 2.5], [LOT.xNorth - 1.5, sz0], [gx + 5.5, sz0], [gx + 5.5, gzF + 6], [gx + 0.3, gzF + 0.5]];
  bat.poly('paving', drive, G + 0.04);
  addFloorPoly(drive, [], G + 0.04, 'site');
  for (const z of [gzB + 10, gzB + 22, gzF + 9, gzF + 22, gzF + 35]) bat.aabox('col:#b5b1a8', gx + 0.3, G + 0.045, z, LOT.xNorth - 1.5, G + 0.05, z + 0.08);
  // front walk: stoop at the door, curving along the garage front to the driveway (front photos)
  const [doorX, porchZ] = F(517, 566.5);
  { const k = new Kit(bat, 'site'); k.box({ pv: 'paving', def: 'foundation' }, doorX - 3.6, G, porchZ, doorX + 3.6, -0.35, porchZ + 4.2); k.box({ pv: 'paving', def: 'foundation' }, doorX - 2.6, G, porchZ + 4.2, doorX + 2.6, -0.68, porchZ + 5.4); }
  addFloorPoly([[doorX - 3.6, porchZ], [doorX + 3.6, porchZ], [doorX + 3.6, porchZ + 4.2], [doorX - 3.6, porchZ + 4.2]], [], -0.35, 'site');
  addFloorPoly([[doorX - 2.6, porchZ + 4.2], [doorX + 2.6, porchZ + 4.2], [doorX + 2.6, porchZ + 5.4], [doorX - 2.6, porchZ + 5.4]], [], -0.68, 'site');
  const walk = curve([[doorX + 1, porchZ + 5], [doorX + 4, gzF - 1.5], [30, gzF + 2.8], [45, gzF + 3.6], [gx + 4, gzF + 3.6]], 32);
  ribbon(bat, 'paving', walk, 4, G + 0.045);
  // existing back patio off the dining slider (replaced by the bigger patio option), with steps from the slider
  {
    const pb = off('off:patio');
    const patio = [[1.6, 13.6], [14.7, 13.6], [14.7, 3.4], [5.5, 3.4], [1.6, 6.8]];
    pb.prism({ top: 'paving', side: 'foundation' }, patio, G, -0.96);
    addFloorPoly(patio, [], -0.96, 'off:patio');
    const [sx0] = F(358, 0), [sx1] = F(434, 0), [, sz] = F(0, 197.5);
    const k = new Kit(pb, 'off:patio');
    k.box({ pv: 'paving', def: 'foundation' }, sx0, -0.96, sz - 2.6, sx1, -0.66, sz); k.box({ pv: 'paving', def: 'foundation' }, sx0 + 0.4, -0.66, sz - 1.3, sx1 - 0.4, -0.33, sz);
    addFloorPoly([[sx0, sz - 2.6], [sx1, sz - 2.6], [sx1, sz - 1.3], [sx0, sz - 1.3]], [], -0.66, 'off:patio');
    addFloorPoly([[sx0 + 0.4, sz - 1.3], [sx1 - 0.4, sz - 1.3], [sx1 - 0.4, sz], [sx0 + 0.4, sz]], [], -0.33, 'off:patio');
  }
  // mulch beds: front foundation, garage front, around the big front maple, along the north side
  const bed = (pts, key = 'mulch') => bat.poly(key, pts, G + 0.05);
  bed([[2.0, 54.4], [8, 57.6], [16, 57.6], [15.6, 54.4]]);
  bed([[F(477, 0)[0], porchZ - 0.1], [doorX - 3.8, porchZ - 0.1], [doorX - 3.8, gzF - 6], [F(477, 0)[0] + 0.4, gzF - 6]]);
  bed([[doorX + 3.8, porchZ - 0.1], [F(700, 0)[0], porchZ - 0.1], [F(700, 0)[0], gzF + 0.5], [doorX + 5, gzF - 2]]);
  bed([[F(700, 0)[0], gzF + 0.5], [gx - 2, gzF + 0.5], [gx - 2, gzF + 2.0], [F(700, 0)[0], gzF + 2.0]]);
  bed([[-3.2, 15], [-0.4, 15], [-0.4, 52], [-3.2, 52]]);
  // white vinyl picket fence along the back half of the south line (rear photos)
  { const k = new Kit(bat, 'site'), x = LOT.xSouth + 0.5;
    k.box('railWhite', x - 0.08, G + 0.3, LOT.zBack + 1, x + 0.08, G + 0.6, 10); k.box('railWhite', x - 0.08, G + 3.0, LOT.zBack + 1, x + 0.08, G + 3.3, 10);
    for (let z = LOT.zBack + 1; z < 10; z += 0.5) k.box('railWhite', x - 0.05, G, z, x + 0.05, G + ((Math.round((z - LOT.zBack) * 2) % 16) === 0 ? 4.4 : 3.9), z + 0.3);
    for (let z = LOT.zBack + 1; z < 10; z += 8) k.box('railWhite', x - 0.22, G, z, x + 0.22, G + 4.6, z + 0.44);
    addSolid(V(x - 0.15, 0, LOT.zBack + 1), V(0.3, 0, 0), V(0, 0, 10 - LOT.zBack - 1), G, G + 4, 'site'); }
  // raised garden bed in the back yard (photo), AC condenser behind the office, downspouts
  { const k = new Kit(bat, 'site').at(4, -36, G, 10); k.box('cedar', -4, 0, -2, 4, 0.9, 2); k.box('mulch', -3.8, 0.7, -1.8, 3.8, 0.85, 1.8); k.solid(-4, -2, 4, 2, 0, 0.9); }
  { const [x, z] = F(780, 186); const k = new Kit(bat, 'site').at(x, z, G, 0); k.cbox('col:#d9d9d3', 0, 0, 2.6, 2.6, 0, 2.6); k.cbox('col:#4a4a48', 0, 0, 2.2, 2.2, 2.6, 2.7); k.cbox('foundation', 0, 0, 3.0, 3.0, 0, 0.12); k.solid(-1.3, -1.3, 1.3, 1.3, 0, 2.7); }
  for (const [px, py, top] of [[323.5, 197.5, 17.8], [474, 57.5, 9.3], [701.5, 57.5, 9.3], [839.5, 197.5, 17.8], [987.5, 378.5, 9.8], [987.5, 722.5, 9.8], [700, 722.5, 9.8], [292, 351.5, 9.8], [323.5, 656.5, 17.8]]) {
    const [x, z] = F(px, py), sx = px > 600 ? 0.35 : -0.35, szz = py > 400 ? 0.35 : -0.35;
    bat.aabox('gutter', x + sx - 0.13, G, z + szz - 0.13, x + sx + 0.13, top, z + szz + 0.13);
    bat.aabox('gutter', x + sx - 0.25, G, z + szz - 0.25, x + sx + 0.25, G + 0.12, z + szz + 0.25);
  }
  // lot lines
  const lotPts = [[LOT.xSouth, LOT.zBack], [LOT.xNorth, LOT.zBack], [LOT.xNorth, LOT.zFront], [LOT.xSouth, LOT.zFront], [LOT.xSouth, LOT.zBack]];
  const lineGeo = new THREE.BufferGeometry().setFromPoints(lotPts.map(([x, z]) => V(x, G + 0.15, z)));
  const lot = new THREE.Line(lineGeo, new THREE.LineDashedMaterial({ color: '#ffffff', dashSize: 3, gapSize: 2, transparent: true, opacity: 0.9 }));
  lot.computeLineDistances();
  lot.name = 'lotLines';
  group.add(lot);
  group.add(groundText('CREEKSIDE LN', 30, sz0 + 14, 60, 7, 0, 'rgba(255,255,255,0.85)'));
  group.add(groundText('N →', LOT.xNorth + 10, LOT.zFront - 6, 14, 7, 0, 'rgba(255,255,255,0.9)'));

  // neighboring houses (simple massing from the aerials)
  for (const [x0, z0, x1, z1, h] of NEIGHBORS) {
    bat.aabox('col:#d8d5ce', x0, G, z0, x1, G + h * 0.6, z1);
    const xc = (x0 + x1) / 2;
    bat.face('col:#7e8288', [V(x0 - 1, G + h * 0.6, z0 - 1), V(x0 - 1, G + h * 0.6, z1 + 1), V(xc, G + h, z1 + 1), V(xc, G + h, z0 - 1)], V(-1, 1, 0));
    bat.face('col:#7e8288', [V(x1 + 1, G + h * 0.6, z0 - 1), V(x1 + 1, G + h * 0.6, z1 + 1), V(xc, G + h, z1 + 1), V(xc, G + h, z0 - 1)], V(1, 1, 0));
    addSolid(V(x0, 0, z0), V(x1 - x0, 0, 0), V(0, 0, z1 - z0), G, G + h, 'site');
  }
  bat.build(group);
  group.userData.renos = Object.entries(OFF).map(([rs, b]) => { const g = new THREE.Group(); g.userData.rs = rs; b.build(g); group.add(g); return g; });

  // trees & planting (autumn colors as in the listing photos)
  const trees = new THREE.Group();
  trees.name = 'trees';
  deciduous(trees, 33, 71, 56, 3, leafMats, 0.95);            // the big front-yard maple (photos 43, 60)
  deciduous(trees, -4, 78, 42, 7, redMats, 0.95);              // red maple at the street corner (aerials)
  deciduous(trees, 8, 92, 26, 11, leafMats);                  // terrace tree
  deciduous(trees, 70, 93, 24, 13, leafMats);
  deciduous(trees, -9, 28, 34, 17, leafMats, 0.9);            // south side yard
  deciduous(trees, 88, -16, 46, 19, yellowMats, 1.2);         // big yellow tree over the north-back corner (aerial)
  deciduous(trees, 30, -52, 40, 23, redMats, 1.0);
  for (const [x, z, h, m] of [[10, -42, 44], [24, -41, 40], [38, -43, 46], [52, -40, 38, blueMat], [66, -42, 42], [78, -38, 36], [-6, -40, 34, blueMat], [80, -22, 34]]) spruce(trees, x, z, h, m);
  for (let z = 30; z < 84; z += 3.4) arborvitae(trees, LOT.xNorth + 0.8, z, 12 + ((z * 7) % 3));
  for (let x = 2.5; x < 16; x += 2.6) shrub(trees, x, 56.0, 1.4, yewMat);
  for (const x of [doorX - 5, doorX + 5.5]) shrub(trees, x, porchZ + 2.0, 1.5, yewMat);
  for (let x = F(705, 0)[0]; x < gx - 3; x += 3.4) shrub(trees, x, gzF + 1.3, 1.1);
  for (const [x, z] of [[18, 1.0], [27.5, 1.0], [-1.8, 20], [-1.8, 42], [-1.8, 47]]) shrub(trees, x, z, 2.2, yewMat);
  group.add(trees);

  // Classic refresh landscaping: white hydrangeas + clipped evergreens in the front beds, a small ornamental
  // tree at the garage corner, warm path lights along the walk and uplights at the tower (AI rendering)
  const classic = new THREE.Group();
  classic.userData.rs = 'on:classic';
  const flowerMat = new THREE.MeshStandardMaterial({ color: '#f4f1e6', roughness: 0.9, flatShading: true, emissive: '#3a372e', emissiveIntensity: 0.15 });
  const leafDk = new THREE.MeshStandardMaterial({ color: '#3f6332', roughness: 1, flatShading: true });
  const box = new THREE.MeshStandardMaterial({ color: '#2f5a2c', roughness: 1, flatShading: true });
  const glow = new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: '#ffbf66', emissiveIntensity: 1.2 });
  const blk = new THREE.MeshStandardMaterial({ color: '#1c1c1d', roughness: 0.5 });
  const hydrangea = (x, z, s = 1.5) => {
    shrub(classic, x, z, s, leafDk);
    const r = rng(Math.round(x * 31 + z * 17) + 5);
    for (let i = 0; i < 11; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s * 0.36, 0), flowerMat); const a = r() * 6.28, d = s * (0.35 + r() * 0.45); m.position.set(x + Math.cos(a) * d, G + s * (0.75 + r() * 0.35), z + Math.sin(a) * d); classic.add(m); }
  };
  const boxwood = (x, z, s = 1.0) => { const m = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6), box); m.scale.y = 0.8; m.position.set(x, G + s * 0.7, z); classic.add(m); };
  const [ex0] = F(477, 0), [ex1] = F(700, 0);
  for (let x = 3; x < 15.5; x += 2.6) (Math.round(x) % 2 ? hydrangea : boxwood)(x, 56.1, 1.25);
  for (const x of [ex0 + 1.4, doorX - 4.6]) hydrangea(x, porchZ + 2.6, 1.4);
  for (let x = doorX + 5; x < ex1 - 1; x += 2.8) (Math.round(x * 2) % 3 ? hydrangea : boxwood)(x, porchZ + 2.5 + (x - doorX) * 0.18, 1.3);
  for (let x = ex1 + 2.5; x < gx - 3; x += 3.2) (Math.round(x) % 2 ? hydrangea : boxwood)(x, gzF + 1.3, 1.15);
  // ornamental tree (serviceberry-like) at the garage's front-west corner
  { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 7, 6), barkMat); t.position.set(ex1 + 1.6, G + 3.5, gzF + 1.6); classic.add(t);
    const r = rng(77); for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1 + r() * 0.6, 1), leafMats[(i + 1) % 4]); m.position.set(ex1 + 1.6 + (r() - 0.5) * 2.4, G + 7 + r() * 2.5, gzF + 1.6 + (r() - 0.5) * 3); classic.add(m); }
    addSolid(V(ex1 + 1.4, 0, gzF + 1.4), V(0.4, 0, 0), V(0, 0, 0.4), G, G + 6, 'on:classic'); }
  // path lights along both sides of the walk
  for (let i = 2; i < walk.length - 1; i += 4) {
    const [ax, az] = walk[i - 1], [bx, bz] = walk[i + 1], l = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / l, nz = (bx - ax) / l;
    for (const sgn of i % 8 ? [1] : [-1]) {
      const x = walk[i][0] + nx * 2.6 * sgn, z = walk[i][1] + nz * 2.6 * sgn;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 6), blk); post.position.set(x, G + 0.8, z); classic.add(post);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.18, 0.18, 8), blk); cap.position.set(x, G + 1.75, z); classic.add(cap);
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.18, 8), glow); lamp.position.set(x, G + 1.57, z); classic.add(lamp);
    }
  }
  // uplights at the tower piers
  for (const [px, py] of [[340, 660], [458, 660]]) { const [x, z] = F(px, py + 12); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.3, 8), glow); m.position.set(x, G + 0.15, z); classic.add(m); }
  group.add(classic);
  group.userData.renos.push(classic);
  return group;
}
