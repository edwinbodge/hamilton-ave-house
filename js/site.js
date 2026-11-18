// Lot, landscaping and context. All in the house's local frame (feet):
// +x = north, +z = east (toward Harrison Ave), y = up. Ground is at y = -1.
import * as THREE from 'three';
import { LEVELS, LOT, NEIGHBORS, toFt } from './data.js';
import { Batcher, Kit, V, addFloorPoly, addSolid } from './geom.js';

const G = -1; // ground elevation

// text drawn on a transparent plane lying on the ground; rot = rotation about y
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
function ribbon(bat, key, pts, width, y) {
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
  }
  addFloorPoly(left.concat(right.reverse()), [], y, 'site');
}

// ------------------------------------------------------------------ trees
const leafMats = ['#4f7a35', '#5b8a3c', '#46703a', '#6a8f3f'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true }));
const conMat = new THREE.MeshStandardMaterial({ color: '#2f5a3a', roughness: 0.95, flatShading: true });
const arbMat = new THREE.MeshStandardMaterial({ color: '#3d6b35', roughness: 0.95, flatShading: true });
const barkMat = new THREE.MeshStandardMaterial({ color: '#5b4636', roughness: 1 });
const shrubMat = new THREE.MeshStandardMaterial({ color: '#4c6e34', roughness: 1, flatShading: true });
const hydMat = new THREE.MeshStandardMaterial({ color: '#c79a5e', roughness: 1, flatShading: true });

function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

function deciduous(group, x, z, h, seed) {
  const r = rng(seed);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.025, h * 0.04, h * 0.5, 7), barkMat);
  trunk.position.set(x, G + h * 0.25, z);
  group.add(trunk);
  const crown = h * 0.32;
  for (let i = 0; i < 7; i++) {
    const s = crown * (0.55 + r() * 0.45);
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), leafMats[i % leafMats.length]);
    m.position.set(x + (r() - 0.5) * crown * 1.1, G + h * 0.62 + (r() - 0.3) * crown * 0.8, z + (r() - 0.5) * crown * 1.1);
    group.add(m);
  }
  addSolid(V(x - h * 0.04, 0, z - h * 0.04), V(h * 0.08, 0, 0), V(0, 0, h * 0.08), G, G + h * 0.5, 'site');
}
function spruce(group, x, z, h) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, h * 0.2, 6), barkMat);
  trunk.position.set(x, G + h * 0.1, z); group.add(trunk);
  for (let i = 0; i < 4; i++) {
    const rr = h * (0.27 - i * 0.05), hh = h * (0.42 - i * 0.05);
    const c = new THREE.Mesh(new THREE.ConeGeometry(rr, hh, 8), conMat);
    c.position.set(x, G + h * 0.12 + i * h * 0.2 + hh / 2, z); group.add(c);
  }
  addSolid(V(x - 0.6, 0, z - 0.6), V(1.2, 0, 0), V(0, 0, 1.2), G, G + h, 'site');
}
function arborvitae(group, x, z, h) {
  const c = new THREE.Mesh(new THREE.ConeGeometry(h * 0.13, h, 8), arbMat);
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

  // ground with a hole where the basement is
  const bLevel = LEVELS.find((l) => l.id === 'b');
  const holes = [bLevel.groundHole.map(([x, y]) => toFt(bLevel.map(x, y)))];
  const W = 420;
  const outer = [[-W, -W], [W, -W], [W, W], [-W, W]];
  bat.poly('grass', outer, G, holes);
  addFloorPoly(outer, holes, G, 'site');

  // street (Harrison Ave) and curb
  const sz0 = LOT.zEast + 9, sz1 = sz0 + 26;
  bat.poly('asphalt', [[-W, sz0], [W, sz0], [W, sz1], [-W, sz1]], G + 0.02);
  bat.aabox('col:#bdbab2', -W, G, sz0 - 0.6, W, G + 0.15, sz0);
  // driveway: pad at the side-entry garage, then out to the street
  const pad = [[LOT.xSouth + 2, 25.5], [0, 25.5], [0, 49.5], [-4, 54], [-4, sz0], [-22, sz0], [-22, 50], [LOT.xSouth + 2, 44]];
  bat.poly('paving', pad, G + 0.03);
  addFloorPoly(pad, [], G + 0.03, 'site');
  // front walk: porch steps curving down toward the drive
  const [doorX, porchZ] = toFt([1264, 1028.5]);
  ribbon(bat, 'paving', curve([[doorX, porchZ + 8.3], [doorX - 4, porchZ + 13], [20, porchZ + 17], [2, porchZ + 19.5], [-4, porchZ + 20]], 30), 3.6, G + 0.04);
  // rear patio (rounded concrete slab between the laundry door and the sun room)
  const patio = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI;
    patio.push([31 + 19 * Math.cos(a), 4.5 - 11 * Math.sin(a)]);
  }
  // the flat side follows the house's rear walls (laundry, kitchen, nook bay, sun room)
  patio.push([12, 14.55], [25, 14.55], [25, 12.95], [33.7, 12.95], [33.7, 11.0], [36.2, 8.5], [42.5, 8.5], [44.9, 11.05], [49.0, 11.05], [49.0, 4.5]);
  bat.prism({ top: 'paving', side: 'foundation' }, patio, G, -0.62);
  addFloorPoly(patio, [], -0.62, 'site');

  // ---- landscaping (from the backyard photos)
  // mulch beds edged with river rock
  const blob = (cx, cz, rx, rz, wob = 0.12, seed = 1, n = 40) => {
    const r = rng(seed);
    const ph = [r() * 6, r() * 6, r() * 6];
    return [...Array(n)].map((_, i) => {
      const a = (i / n) * Math.PI * 2;
      const f = 1 + wob * (Math.sin(a * 2 + ph[0]) * 0.6 + Math.sin(a * 3 + ph[1]) * 0.3 + Math.sin(a * 5 + ph[2]) * 0.1);
      return [cx + Math.cos(a) * rx * f, cz + Math.sin(a) * rz * f];
    });
  };
  const rocks = new Kit(bat, 'site');
  const bed = (pts, seed, rockEdge = true) => {
    bat.poly('mulch', pts, G + 0.05);
    if (!rockEdge) return;
    const r = rng(seed * 31 + 7);
    for (let i = 0; i < pts.length; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length];
      const L2 = Math.hypot(bx - ax, bz - az), n2 = Math.max(1, Math.round(L2 / 0.75));
      for (let j = 0; j < n2; j++) {
        const f = j / n2, x = ax + (bx - ax) * f, z = az + (bz - az) * f, s = 0.3 + r() * 0.22;
        rocks.at(x, z, G).cyl(r() < 0.5 ? 'col:#a29d94' : r() < 0.5 ? 'col:#8c8780' : 'col:#bdb6aa', 0, 0, s, s * 0.55, 0, s * 0.75, 7, 0.8 + r() * 0.4);
      }
    }
  };
  bed(blob(-10, -44, 10, 23, 0.14, 2), 1);          // island with the apple trees
  bed(blob(26, -48, 7.5, 7.5, 0.1, 5), 2);          // ring around the big maple
  bed(blob(20, -88, 52, 7, 0.25, 9, 64), 3);        // back bed with spruces & small arborvitae
  bed([[66, -46], [74, -46], [74, 13], [64.5, 13], [64.5, -10]], 4, false); // arborvitae hedge bed
  bed([[25.3, 49.4], [62, 49.4], [62, 53], [doorX + 3, 53], [doorX + 3, 50.6], [doorX - 3, 50.6], [doorX - 3, 53], [25.3, 53]], 5, false); // front foundation bed
  bed([[0.4, 48.6], [24.8, 48.6], [24.8, 52], [0.4, 52]], 6, false);   // garage front bed
  bed([[-3.4, 1], [-0.3, 1], [-0.3, 24.5], [-3.4, 24.5]], 7, false);   // garage side bed

  // birdhouse on a post, near the patio
  { const k = new Kit(bat, 'site').at(44.5, -8.5, G);
    k.cbox('post', 0, 0, 0.35, 0.35, 0, 6.2);
    k.cbox('white', 0, 0, 1.6, 1.6, 6.2, 7.5);
    k.prof('col:#2f5b45', [[-1.1, 7.45], [1.1, 7.45], [0, 8.3]], -1.1, 1.1);
    k.cbox('col:#2f5b45', 0, 0, 0.5, 0.5, 8.2, 8.7);
    for (const s of [-1, 1]) k.cyl('black', 0.4 * s, 0.81, 0.13, 0.13, 6.9, 6.92, 10);
    addSolid(V(44.3, 0, -8.7), V(0.4, 0, 0), V(0, 0, 0.4), G, G + 6, 'site'); }
  // cedar raised planter on the patio, by the sun room slider
  { const k = new Kit(bat, 'site').at(46, 1.2, -0.62, 90);
    for (const x of [-1.9, 1.9]) for (const z of [-0.6, 0.6]) k.cbox('cedar', x, z, 0.25, 0.25, 0, 2.6);
    k.box('cedar', -2.1, 1.8, -0.8, 2.1, 2.8, 0.8);
    for (let i = 0; i < 5; i++) k.cyl(i % 2 ? 'col:#5d8a3e' : 'col:#7a9a4b', -1.6 + i * 0.8, (i % 2) * 0.2 - 0.1, 0.4, 0.1, 2.8, 3.4 + (i % 3) * 0.2, 6);
    addSolid(V(45.2, 0, -0.9), V(1.6, 0, 0), V(0, 0, 4.2), -0.62, 2.8, 'site'); }
  // white fan trellis on the garage's back wall, right of the laundry door
  { const k = new Kit(bat, 'site').at(4.6, 14.5, 0, 180);
    for (let i = 0; i < 7; i++) {
      const a = (-0.55 + (1.1 * i) / 6), kb = new Kit(bat, 'site').at(4.6, 14.5, 0, 180);
      const top = V(Math.sin(a) * 2.6, 6.5, 0);
      kb.bat.box('white', kb.P(-0.04, 0.3, -0.06), kb.ex().multiplyScalar(top.x).add(V(0, top.y - 0.3, 0)), V(0.08, 0, 0), kb.ez().multiplyScalar(0.06));
    }
    for (const r of [3.2, 4.4, 5.6]) k.box('white', -r * 0.42, r, -0.06, r * 0.42, r + 0.07, 0);
    k.box('white', -0.15, 0, -0.06, 0.15, 0.4, 0); }
  // wooden play set on the far (west) side of the yard: fort with slide, swing beam, climbing wall
  {
    const cx = 44, cz = -70;
    bat.poly('mulch', [[cx - 13, cz - 9], [cx + 13, cz - 9], [cx + 13, cz + 9], [cx - 13, cz + 9]], G + 0.05);
    for (const [x0, z0, x1, z1] of [[cx - 13.3, cz - 9.3, cx + 13.3, cz - 9], [cx - 13.3, cz + 9, cx + 13.3, cz + 9.3], [cx - 13.3, cz - 9, cx - 13, cz + 9], [cx + 13, cz - 9, cx + 13.3, cz + 9]]) bat.aabox('cedar', x0, G, z0, x1, G + 0.45, z1);
    const k = new Kit(bat, 'site').at(cx, cz, G, 0);
    const W = 'cedar', fx = -6.5; // fort centered at local x = -6.5
    for (const x of [fx - 2.5, fx + 2.5]) for (const z of [-2.5, 2.5]) k.cbox(W, x, z, 0.33, 0.33, 0, 10.2);
    k.box(W, fx - 2.6, 4.8, -2.6, fx + 2.6, 5.05, 2.6); // deck at 5 ft
    for (const z of [-2.5, 2.5]) for (let y = 5.3; y < 7.6; y += 0.45) k.box(W, fx - 2.5, y, z - 0.05, fx + 2.5, y + 0.3, z + 0.05);
    k.box(W, fx - 2.5, 5.05, -2.5, fx - 2.45, 7.6, 2.5);
    k.prof('col:#3f7a3c', [[-3.1, 10.0], [3.1, 10.0], [0, 12.4]], fx - 3.0, fx + 3.0); // green canopy roof
    for (let y = 0.9; y < 4.8; y += 0.95) k.box(W, fx + 2.55, y, -1.0, fx + 2.75, y + 0.15, 1.0); // ladder rungs
    k.box(W, fx + 2.55, 0, -1.1, fx + 2.75, 5.0, -0.95); k.box(W, fx + 2.55, 0, 0.95, fx + 2.75, 5.0, 1.1);
    for (let i = 0; i < 14; i++) k.cbox(['col:#d9452f', 'col:#2f6fbf', 'col:#f2b632', 'col:#3a9b4a'][i % 4], fx - 2.6 - 0.12, -1.8 + (i % 4) * 1.1, 0.25, 0.4, 0.6 + Math.floor(i / 4) * 1.1, 0.95 + Math.floor(i / 4) * 1.1);
    // slide off the front of the deck, down toward the house
    bat.box('col:#3f9a46', k.P(fx - 1.0, 4.85, 2.6), V(0, -4.45, 9.0), V(0, 0.15, 0), V(2.0, 0, 0));
    for (const s of [-1, 1]) bat.box('col:#3f9a46', k.P(fx + s * 1.05 - 0.05, 5.0, 2.6), V(0, -4.45, 9.0), V(0, 0.5, 0), V(0.1, 0, 0));
    // swing beam from the fort out to an A-frame
    k.box(W, fx + 2.5, 8.6, -0.25, 9.5, 9.1, 0.25);
    for (const s of [-1, 1]) bat.box(W, k.P(9.3, 0, s * 3.4), V(0, 8.9, -s * 3.2), V(0.33, 0, 0), V(0, 0, 0.33));
    for (const [x, kind] of [[0.8, 'swing'], [3.8, 'swing'], [7.0, 'glider']]) {
      for (const dz of [-0.75, 0.75]) k.box('col:#8c8c8c', x - 0.03, 1.8, dz - 0.03, x + 0.03, 8.6, dz + 0.03);
      k.box(kind === 'swing' ? 'col:#1e1e1e' : 'col:#2f6fbf', x - 0.4, 1.6, -0.85, x + 0.4, 1.8, 0.85);
    }
    k.solid(fx - 2.8, -2.8, fx + 2.8, 2.8, 0, 10);
    k.solid(9.0, -3.6, 9.6, -3.2, 0, 9); k.solid(9.0, 3.2, 9.6, 3.6, 0, 9);
  }
  // downspouts
  for (const [x, z, top] of [[0.05, 14.5, 9], [0.05, 48.55, 9], [25.4, 49.0, 9], [61.95, 0.05, 9], [61.95, 41.9, 17], [21.6, 41.95, 17], [21.6, 14.6, 17], [33.6, 13.0, 9]]) {
    bat.aabox('white', x - 0.13, G, z - 0.13, x + 0.13, top - 0.1, z + 0.13);
    bat.aabox('white', x - 0.25, G, z - 0.25, x + 0.25, G + 0.12, z + 0.25);
  }
  // hose reel by the laundry door, AC condenser at the back corner of the garage
  { const k = new Kit(bat, 'site').at(9, 13.6, G, 180); k.cyl('col:#2f5b45', 0, 0, 0.9, 0.9, 0.3, 1.0, 14); k.cbox('col:#3a3a3a', 0, 0, 1.0, 1.0, 0, 0.3); }
  { const k = new Kit(bat, 'site').at(-2.6, 18, G, 0); k.cbox('col:#d9d9d3', 0, 0, 2.6, 2.6, 0, 2.6); k.cbox('col:#4a4a48', 0, 0, 2.2, 2.2, 2.6, 2.7); k.cbox('foundation', 0, 0, 3.0, 3.0, 0, 0.12); k.solid(-1.3, -1.3, 1.3, 1.3, 0, 2.7); }

  // lot lines
  const lotPts = [[LOT.xSouth, LOT.zWest], [LOT.xNorth, LOT.zWest], [LOT.xNorth, LOT.zEast], [LOT.xSouth, LOT.zEast], [LOT.xSouth, LOT.zWest]];
  const lineGeo = new THREE.BufferGeometry().setFromPoints(lotPts.map(([x, z]) => V(x, G + 0.15, z)));
  const lot = new THREE.Line(lineGeo, new THREE.LineDashedMaterial({ color: '#ffffff', dashSize: 3, gapSize: 2, transparent: true, opacity: 0.9 }));
  lot.computeLineDistances();
  lot.name = 'lotLines';
  group.add(lot);

  // painted-on-the-ground labels (occlude properly, unlike HTML overlays)
  group.add(groundText('HARRISON AVE', 20, sz0 + 13, 60, 7, 0, 'rgba(255,255,255,0.85)'));
  // "N" with the arrow pointing north (+x): text up-vector rotated to +x
  group.add(groundText('N →', LOT.xNorth + 8, LOT.zEast - 10, 14, 7, 0, 'rgba(255,255,255,0.9)'));

  // neighboring houses (simple massing, roughly placed from the aerial)
  for (const [x0, z0, x1, z1, h] of NEIGHBORS) {
    bat.aabox('col:#d8d5ce', x0, G, z0, x1, G + h * 0.6, z1);
    const xc = (x0 + x1) / 2;
    bat.face('col:#8a8d92', [V(x0 - 1, G + h * 0.6, z0 - 1), V(x0 - 1, G + h * 0.6, z1 + 1), V(xc, G + h, z1 + 1), V(xc, G + h, z0 - 1)], V(-1, 1, 0));
    bat.face('col:#8a8d92', [V(x1 + 1, G + h * 0.6, z0 - 1), V(x1 + 1, G + h * 0.6, z1 + 1), V(xc, G + h, z1 + 1), V(xc, G + h, z0 - 1)], V(1, 1, 0));
  }
  bat.build(group);

  // trees & planting
  const trees = new THREE.Group();
  trees.name = 'trees';
  for (let z = -42; z <= 12; z += 3.2) { arborvitae(trees, 68.5, z, 21 + ((z * 7) % 3)); arborvitae(trees, 71.5, z + 1.6, 20 + ((z * 5) % 3)); }
  for (const [x, z, h] of [[58, -88, 38], [38, -93, 34], [14, -90, 40], [-12, -84, 36], [70, -66, 42], [-20, -64, 30], [64, 52, 30]]) spruce(trees, x, z, h);
  deciduous(trees, 26, -48, 46, 3);
  for (const [x, z, s] of [[-9, -30, 5], [-13, -46, 9], [-6, -60, 13]]) deciduous(trees, x, z, 18, s);
  for (let x = -22; x < 62; x += 9) arborvitae(trees, x + 3, -82.5 + Math.sin(x) * 1.5, 9 + (x % 3));
  deciduous(trees, -34, 72, 40, 21);
  deciduous(trees, 80, 70, 36, 33);
  for (let x = 27; x < 61; x += 3.4) if (Math.abs(x - doorX) > 3.5) shrub(trees, x, porchZ + 8.6, 1.5 + (x % 2) * 0.3, Math.abs(x - 34) < 4 ? hydMat : shrubMat);
  for (let z = 3; z < 23; z += 4.5) shrub(trees, -1.8, z, 1.4); // along the garage side, behind the pad
  for (let x = 2; x < 23; x += 4.2) shrub(trees, x, 50.2, 1.4);
  group.add(trees);
  return group;
}
