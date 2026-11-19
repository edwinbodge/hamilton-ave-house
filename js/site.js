// Lot, landscaping and context. All in the house's local frame (feet):
// +x = north, +z = east (toward Harrison Ave), y = up. Ground is at y = -1.
//
// Sources: the aerial (driveway pad, lot, big trees), the front photo (beds, shrubs, crabapple,
// evergreens), the rear and yard photos (patio, arborvitae screen, maple, apple island, spruces).
// Real-world sizes of the outdoor things built here are noted where they're made.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
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
function rng(seed) { let s = (Math.abs(Math.round(seed)) % 2147483646) + 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

// ------------------------------------------------------------------ plants
// Every leaf clump, needle spray and limb is collected into two merged meshes (vertex-colored, soft
// normals): one draw call for all foliage and one for all wood, however many plants there are.
// Trees are grown procedurally: a tapering trunk that forks into scaffold limbs and branches, with
// many overlapping leaf clumps (subdivided, jittered icospheres) at the branch tips, lighter on top
// and darker underneath; conifers are whorls of drooping needle sprays around a dark core.
const foliageMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 });
const woodMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
const hash3 = (x, y, z, s) => { const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + s * 0.1373) * 43758.5453; return (h - Math.floor(h)) * 2 - 1; };
const ICO = [new THREE.IcosahedronGeometry(1, 0), new THREE.IcosahedronGeometry(1, 1), new THREE.IcosahedronGeometry(1, 2), new THREE.IcosahedronGeometry(1, 3)];

class Plants {
  constructor() { this.leaf = []; this.wood = []; }
  // Leaf clump: jittered icosphere with radii (rx, ry, rz), optionally rotated by quaternion q, at (x, y, z).
  // Soft (ellipsoid) normals; per-vertex color = base, lighter on top, darker underneath, speckled.
  clump(x, y, z, rx, ry, rz, color, seed, { detail = 2, jit = 0.3, q = null, shade = 0.42, speck = 0.1 } = {}) {
    const g = ICO[detail].clone(), p = g.attributes.position, nrm = g.attributes.normal, n = p.count;
    const col = new Float32Array(n * 3), base = new THREE.Color(color), c = new THREE.Color(), v = V(0, 0, 0), nv = V(0, 0, 0);
    for (let i = 0; i < n; i++) {
      const ux = p.getX(i), uy = p.getY(i), uz = p.getZ(i);
      const kx = +ux.toFixed(3), ky = +uy.toFixed(3), kz = +uz.toFixed(3);
      const k = 1 + jit * (0.65 * hash3(kx, ky, kz, seed) + 0.35 * hash3(kx * 3.1, ky * 3.1, kz * 3.1, seed + 3));
      v.set(ux * rx * k, uy * ry * k * (uy < 0 ? 0.75 : 1), uz * rz * k);
      nv.set(ux / rx, uy / ry, uz / rz).normalize();
      if (q) { v.applyQuaternion(q); nv.applyQuaternion(q); }
      p.setXYZ(i, x + v.x, y + v.y, z + v.z); nrm.setXYZ(i, nv.x, nv.y, nv.z);
      const up = THREE.MathUtils.clamp(nv.y * 0.5 + 0.5, 0, 1);
      c.copy(base).multiplyScalar(1 - shade + shade * 1.25 * up + speck * hash3(kx * 7, ky * 7, kz * 7, seed + 11));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.deleteAttribute('uv');
    this.leaf.push(g);
  }
  // tapered limb from a to b (bark)
  limb(a, b, r0, r1, color = '#5b4636', seg = 7) {
    const d = b.clone().sub(a), L = d.length();
    if (L < 0.05) return;
    const g = new THREE.CylinderGeometry(r1, r0, L, seg, 1, true);
    g.translate(0, L / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()));
    g.translate(a.x, a.y, a.z);
    const ng = g.toNonIndexed(), p = ng.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { c.set(color).multiplyScalar(0.9 + 0.12 * hash3(Math.round(p.getX(i) * 3), Math.round(p.getY(i) * 3), Math.round(p.getZ(i) * 3), 5)); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    ng.setAttribute('color', new THREE.BufferAttribute(col, 3)); ng.deleteAttribute('uv');
    this.wood.push(ng);
  }
  // dark solid of revolution (core of a conifer); profile [[r, y], ...] bottom to top
  core(x, z, prof, color, seed, jitter = 0.12, seg = 12) {
    const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(Math.max(0.001, r), y)), seg);
    g.rotateY(seed % 6.28);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const px = p.getX(i), py = p.getY(i), pz = p.getZ(i), k = 1 + jitter * hash3(+px.toFixed(2), +py.toFixed(2), +pz.toFixed(2), seed);
      p.setXYZ(i, px * k + x, py, pz * k + z);
    }
    g.computeVertexNormals();
    const ng = g.toNonIndexed(), q = ng.attributes.position, col = new Float32Array(q.count * 3), c = new THREE.Color();
    for (let i = 0; i < q.count; i++) { c.set(color); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    ng.setAttribute('color', new THREE.BufferAttribute(col, 3)); ng.deleteAttribute('uv');
    this.leaf.push(ng);
  }
  build(group) {
    for (const [list, mat] of [[this.leaf, foliageMat], [this.wood, woodMat]]) {
      if (!list.length) continue;
      const m = new THREE.Mesh(mergeGeometries(list), mat);
      m.castShadow = m.receiveShadow = true;
      m.userData.tris = m.geometry.attributes.position.count / 3;
      group.add(m);
    }
  }
}

// Branching skeleton: limb from a along dir; recurses `depth` times, 2-3 children each, bending
// outward and up. Pushes the end points of the finest twigs into tips.
function grow(P, a, dir, len, r0, depth, r, tips, bark, spread = 0.6, upBias = 0.25) {
  const d = dir.clone().normalize();
  const b = a.clone().addScaledVector(d, len);
  P.limb(a, b, r0, r0 * 0.62, bark, depth >= 2 ? 7 : 5);
  if (depth === 0) { tips.push({ p: b, d }); return; }
  const nKids = 2 + (r() < 0.55 ? 1 : 0);
  const side = V(-d.z, 0, d.x).normalize(); if (side.lengthSq() < 0.01) side.set(1, 0, 0);
  for (let i = 0; i < nKids; i++) {
    const ang = (i / nKids) * Math.PI * 2 + r() * 1.5;
    const perp = side.clone().applyAxisAngle(d, ang);
    const nd = d.clone().addScaledVector(perp, spread * (0.6 + r() * 0.7)).add(V(0, upBias * (r() - 0.2), 0)).normalize();
    const from = a.clone().lerp(b, 0.65 + r() * 0.35);
    grow(P, from, nd, len * (0.62 + r() * 0.15), r0 * 0.6, depth - 1, r, tips, bark, spread, upBias);
  }
}
// Leaf clumps on the tips, kept inside an ellipsoidal crown envelope (center c, radii R).
function foliate(P, tips, c, R, colors, seed, size, perTip = 2, detail = 2) {
  const r = rng(seed * 7 + 1);
  tips.forEach(({ p, d }, i) => {
    for (let j = 0; j < perTip; j++) {
      const q = p.clone().addScaledVector(d, size * (0.2 + r() * 0.6)).add(V((r() - 0.5) * size, (r() - 0.3) * size * 0.7, (r() - 0.5) * size));
      const e = Math.hypot((q.x - c.x) / R.x, (q.y - c.y) / R.y, (q.z - c.z) / R.z);
      if (e > 1) q.sub(c).multiplyScalar(1 / e).add(c);
      const s = size * (0.75 + r() * 0.5), col = colors[(i + j) % colors.length];
      P.clump(q.x, q.y, q.z, s * 1.1, s * 0.8, s * 1.1, col, seed * 131 + i * 7 + j, { detail });
    }
  });
}

const LEAF = ['#4b7832', '#57873a', '#41692c', '#628f3e', '#4f7f36'];
// Shade tree (sugar / red maple): straight trunk to ~0.35 h, 4-6 scaffold limbs that fork twice, a
// broad oval crown of ~70 leaf clumps. h = height, w = crown spread (~0.7 h for a mature maple).
function shadeTree(P, x, z, h, seed, { w = h * 0.7, colors = LEAF, bark = '#5f554c', limbedUp = false, detail = 2 } = {}) {
  const r = rng(seed), trunkTop = h * (limbedUp ? 0.5 : 0.36), crownC = V(x, G + h * (limbedUp ? 0.72 : 0.62), z);
  const R = V(w / 2, h * (limbedUp ? 0.28 : 0.37), w / 2);
  const top = V(x + (r() - 0.5) * 0.8, G + trunkTop, z + (r() - 0.5) * 0.8);
  P.limb(V(x, G - 0.3, z), top, h * 0.028, h * 0.02, bark, 10);
  // root flare
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + r(); P.limb(V(x + Math.cos(a) * h * 0.04, G - 0.2, z + Math.sin(a) * h * 0.04), V(x, G + h * 0.05, z), h * 0.012, h * 0.006, bark, 5); }
  const tips = [], nL = 4 + Math.floor(r() * 3);
  for (let i = 0; i < nL; i++) {
    const a = (i / nL) * Math.PI * 2 + r() * 0.8, lift = 0.9 + r() * 0.6;
    const from = top.clone().add(V(0, -r() * h * 0.06, 0));
    grow(P, from, V(Math.cos(a), lift, Math.sin(a)), h * 0.22, h * 0.016, 2, r, tips, bark, 0.65, 0.35);
  }
  grow(P, top, V(0, 1, 0), h * 0.25, h * 0.014, 2, r, tips, bark, 0.55, 0.4); // central leader
  foliate(P, tips, crownC, R, colors, seed, h * 0.062, 3, detail);
  addSolid(V(x - h * 0.03, 0, z - h * 0.03), V(h * 0.06, 0, 0), V(0, 0, h * 0.06), G, G + trunkTop, 'site');
}
// Apple / crabapple: short trunk forking low into 3-4 leaders, wide rounded crown (~15-19 ft).
function fruitTree(P, x, z, h, seed, { w = h * 0.95, colors = ['#56803d', '#679046', '#4b7535'], fruit = null } = {}) {
  const r = rng(seed), fork = h * 0.2, bark = '#5a4b3e';
  const top = V(x, G + fork, z);
  P.limb(V(x, G - 0.2, z), top, 0.4, 0.32, bark, 8);
  const tips = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + r() * 0.8;
    grow(P, top, V(Math.cos(a), 0.9 + r() * 0.4, Math.sin(a)), h * 0.3, 0.24, 2, r, tips, bark, 0.75, 0.2);
  }
  const C = V(x, G + h * 0.6, z), R = V(w / 2, h * 0.32, w / 2);
  foliate(P, tips, C, R, colors, seed, h * 0.085, 2, 2);
  if (fruit) tips.forEach(({ p }, i) => { if (i % 2) return; for (let j = 0; j < 4; j++) P.clump(p.x + (r() - 0.5) * 2.2, p.y + (r() - 0.6) * 1.4, p.z + (r() - 0.5) * 2.2, 0.17, 0.16, 0.17, fruit, seed + i * 5 + j, { detail: 1, jit: 0.1, shade: 0.3 }); });
  addSolid(V(x - 0.45, 0, z - 0.45), V(0.9, 0, 0), V(0, 0, 0.9), G, G + fork, 'site');
}
// Spruce (Norway / Colorado blue): whorls of drooping needle sprays around a dark core, ragged outline,
// narrowing to a leader. Width at the base ~0.42 h.
function spruce(P, x, z, h, seed = 1, color = '#2d5236') {
  const r = rng(seed), base = h * 0.06, R0 = h * 0.21, nW = Math.round(h / 3.1), dark = new THREE.Color(color).multiplyScalar(0.55).getStyle();
  P.limb(V(x, G - 0.2, z), V(x, G + h * 0.97, z), Math.max(0.3, h * 0.016), 0.06, '#4d3b2d', 7);
  P.core(x, z, [[0.2, G + base], [R0 * 0.62, G + base + 1], [R0 * 0.45, G + h * 0.4], [R0 * 0.2, G + h * 0.75], [0.05, G + h * 0.95]], dark, seed, 0.15);
  const up = V(0, 1, 0);
  for (let i = 0; i < nW; i++) {
    const t = i / nW, y = G + base + t * (h - base) * 0.93, Rw = R0 * Math.pow(1 - t, 0.9) + 0.6;
    const nB = Math.max(5, Math.round(8 - t * 3)), rot = r() * 6.28;
    for (let j = 0; j < nB; j++) {
      const a = rot + (j / nB) * Math.PI * 2 + (r() - 0.5) * 0.5, L = Rw * (0.75 + r() * 0.35);
      const droop = 0.18 + t * 0.1 + r() * 0.15;                                // radians below horizontal
      const q = new THREE.Quaternion().setFromAxisAngle(up, -a).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), -droop));
      const cx = x + Math.cos(a) * L * 0.5, cz = z + Math.sin(a) * L * 0.5, cy = y - Math.sin(droop) * L * 0.45;
      const c = new THREE.Color(color).offsetHSL((r() - 0.5) * 0.02, 0, (r() - 0.5) * 0.05).getStyle();
      P.clump(cx, cy, cz, L * 0.55, Math.max(0.35, L * 0.13), Math.max(0.6, L * 0.28), c, seed * 97 + i * 13 + j, { detail: 1, jit: 0.35, q, shade: 0.5 });
    }
  }
  P.clump(x, G + h * 0.95, z, 0.35, h * 0.06, 0.35, color, seed + 1, { detail: 1, jit: 0.1 });
  addSolid(V(x - 0.7, 0, z - 0.7), V(1.4, 0, 0), V(0, 0, 1.4), G, G + h, 'site');
}
// Arborvitae ('Emerald Green' / 'Techny'): dense column, widest low, soft pointed top; a dark core
// covered in overlapping foliage clumps.
function arborvitae(P, x, z, h, w, seed, color = '#3b6a31') {
  const R = w / 2, r = rng(seed), prof = [];
  const radius = (t) => R * (t < 0.2 ? 0.75 + t * 1.25 : Math.pow(Math.max(0, 1 - (t - 0.2) / 0.8), 0.8));
  for (let i = 0; i <= 10; i++) prof.push([radius(i / 10) * 0.82, G + h * (i / 10)]);
  P.core(x, z, prof, new THREE.Color(color).multiplyScalar(0.78).getStyle(), seed, 0.22, 12);
  // foliage sprays in staggered rings, flush with the column so it reads as one dense, tufted mass
  const rows = Math.round(h / 1.7);
  for (let j = 0; j < rows; j++) {
    const t = (j + 0.5) / rows * 0.95, R2 = radius(t), k = Math.max(3, Math.round(R2 * 2.8));
    for (let i = 0; i < k; i++) {
      const a = (i / k) * Math.PI * 2 + j * 1.3 + r() * 0.5, rr = R2 * 0.7, s = Math.max(0.5, R2 * 0.48);
      const c = new THREE.Color(color).offsetHSL((r() - 0.5) * 0.02, 0, (r() - 0.5) * 0.07).getStyle();
      P.clump(x + Math.cos(a) * rr, G + h * t, z + Math.sin(a) * rr, s, s * 1.25, s, c, seed * 53 + j * 11 + i, { detail: (i + j) % 2, jit: 0.45, shade: 0.25, speck: 0.14 });
    }
  }
  addSolid(V(x - R * 0.7, 0, z - R * 0.7), V(R * 1.4, 0, 0), V(0, 0, R * 1.4), G, G + h, 'site');
}
// Dwarf Alberta spruce: small dense formal cone (the one at the garage's back corner).
function dwarfSpruce(P, x, z, h, seed) {
  const R = h * 0.33, r = rng(seed);
  P.core(x, z, [[R * 0.7, G], [R * 0.95, G + h * 0.15], [R * 0.5, G + h * 0.6], [0.05, G + h]], '#355f33', seed, 0.06, 14);
  for (let i = 0; i < 26; i++) {
    const t = r() * 0.9, a = r() * 6.28, rr = R * (1 - t) * 0.85;
    P.clump(x + Math.cos(a) * rr, G + h * t + 0.2, z + Math.sin(a) * rr, 0.5 * (1 - t * 0.5), 0.6, 0.5 * (1 - t * 0.5), '#44733f', seed * 7 + i, { detail: 1, jit: 0.2 });
  }
  addSolid(V(x - R * 0.7, 0, z - R * 0.7), V(R * 1.4, 0, 0), V(0, 0, R * 1.4), G, G + h, 'site');
}
// Rounded foundation shrub (yew / boxwood / spirea): a mound of overlapping small clumps. d = width.
function shrub(P, x, z, d, seed, color = '#4a6e33', hRatio = 0.8) {
  const r = rng(seed), R = d / 2, H = R * hRatio;
  P.clump(x, G + H * 0.8, z, R * 0.8, H * 0.8, R * 0.8, new THREE.Color(color).multiplyScalar(0.7).getStyle(), seed, { detail: 1, jit: 0.15 });
  const n = 9 + Math.round(d * 2);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, el = r() * 1.2, s = R * (0.32 + r() * 0.16);
    const c = new THREE.Color(color).offsetHSL((r() - 0.5) * 0.02, 0, (r() - 0.5) * 0.06).getStyle();
    P.clump(x + Math.cos(a) * Math.cos(el) * R * 0.68, G + H * 0.75 + Math.sin(el) * H * 0.75, z + Math.sin(a) * Math.cos(el) * R * 0.68, s, s * 0.85, s, c, seed * 41 + i, { detail: 2, jit: 0.3 });
  }
}
// Panicle hydrangea ('Limelight'): leafy mound with big upright cream flower cones on top (~5 ft).
function hydrangea(P, x, z, d, seed) {
  const r = rng(seed), R = d / 2;
  shrub(P, x, z, d, seed, '#5b7f3f', 0.75);
  for (let i = 0; i < 11; i++) {
    const a = r() * Math.PI * 2, f = Math.sqrt(r()) * 0.75;
    P.clump(x + Math.cos(a) * R * f, G + R * 1.35 + r() * 0.4 - f * 0.5, z + Math.sin(a) * R * f, 0.36, 0.6, 0.36, i % 3 ? '#e6dfc4' : '#d5dab2', seed * 3 + i, { detail: 1, jit: 0.25, shade: 0.25 });
  }
}

// ------------------------------------------------------------------ outdoor objects (real sizes)
// Gas grill, Weber Genesis class: 59" W (side shelves out) x 29" D x 47" H lid closed. Faces +z.
function grill(k) {
  k.cbox('col:#2a2b2d', 0, 0, 2.5, 1.9, 0.35, 2.95);                     // cabinet
  for (const s of [-1, 1]) k.box('col:#3a3c3f', s > 0 ? 0.03 : -1.22, 0.45, 0.95, s > 0 ? 1.22 : -0.03, 2.8, 0.98);
  k.cbox('steel', 0, 0, 2.6, 2.1, 2.95, 3.25);                             // firebox
  k.cyl('col:#1f2021', 0, 0, 1.05, 1.05, 3.25, 3.3, 16, 0.95);
  k.prof('col:#1f2021', [[-1.0, 3.25], [1.0, 3.25], [0.85, 3.65], [0.3, 3.92], [-0.6, 3.85], [-1.0, 3.5]], -1.25, 1.25); // lid
  k.box('steel', -0.9, 3.55, 1.0, 0.9, 3.6, 1.15);                          // handle
  for (const s of [-1, 1]) k.box('steel', s * 1.3, 3.0, -0.9, s * 2.45, 3.06, 0.9); // side shelves
  for (const [x, z] of [[-1.1, -0.8], [1.1, -0.8], [-1.1, 0.8], [1.1, 0.8]]) k.cyl('black', x, z, 0.14, 0.14, 0, 0.35, 8);
  k.solid(-2.45, -1.2, 2.45, 1.2, 0, 3.9);
}
// 96-gallon wheeled cart: 29" W x 35" D x 46" H. Faces +z (handle/wheels at the back).
function cart(k, color) {
  k.prof(color, [[-1.2, 0.25], [1.15, 0.25], [1.4, 3.6], [-1.3, 3.6]], -1.15, 1.15);
  k.box(color, -1.2, 3.6, -1.38, 1.2, 3.8, 1.5);                            // lid
  k.box(color, -1.0, 3.5, -1.6, 1.0, 3.72, -1.32);                          // handle
  const wheel = [...Array(10)].map((_, i) => [-1.05 + Math.cos((i / 10) * Math.PI * 2) * 0.4, 0.4 + Math.sin((i / 10) * Math.PI * 2) * 0.4]);
  for (const s of [-1, 1]) k.prof('black', wheel, s * 1.15, s * 1.38);
  k.solid(-1.25, -1.5, 1.25, 1.5, 0, 3.8);
}
// Rural-style curbside mailbox (#1 size: 6.5" W x 8.75" H x 19" D), bottom 42" above the road, on a 4x4 post.
function mailbox(k) {
  k.cbox('col:#f2f2ee', 0, -0.5, 0.29, 0.29, 0, 3.75);
  k.cbox('col:#f2f2ee', 0, 0.1, 0.29, 1.5, 3.25, 3.5);                       // arm
  k.cbox('black', 0, 0.5, 0.56, 1.6, 3.5, 3.9);
  k.prof('black', [[-0.3, 3.9], [1.3, 3.9], [1.3, 4.05], [0.5, 4.2], [-0.3, 4.05]], -0.28, 0.28);
  k.box('col:#b8282c', 0.28, 3.75, 0.1, 0.32, 4.15, 0.25);                  // flag
  k.solid(-0.3, -0.65, 0.3, 1.3, 0, 4.2);
}
// Central air condenser, 3-ton: 29" x 29" x 33" on a 36" pad.
function condenser(k) {
  k.cbox('foundation', 0, 0, 3.0, 3.0, 0, 0.15);
  k.cbox('col:#d9d8d1', 0, 0, 2.42, 2.42, 0.15, 0.55);
  for (let y = 0.6; y < 2.6; y += 0.12) k.cbox('col:#9fa29f', 0, 0, 2.4, 2.4, y, y + 0.06);
  for (const [x, z] of [[-1.15, -1.15], [1.15, -1.15], [-1.15, 1.15], [1.15, 1.15]]) k.cbox('col:#d9d8d1', x, z, 0.14, 0.14, 0.55, 2.7);
  k.cbox('col:#d9d8d1', 0, 0, 2.45, 2.45, 2.6, 2.75);
  k.cyl('col:#2c2c2c', 0, 0, 0.95, 0.95, 2.75, 2.8, 18);
  k.solid(-1.25, -1.25, 1.25, 1.25, 0, 2.8);
}

// ------------------------------------------------------------------ site
export function buildSite() {
  const group = new THREE.Group();
  const bat = new Batcher();
  // yard items a renovation option displaces, by set
  const OFF = {};
  const off = (rs) => (OFF[rs] = OFF[rs] || new Batcher());

  // ground with a hole where the basement is
  const bLevel = LEVELS.find((l) => l.id === 'b');
  const holes = [bLevel.groundHole.map(([x, y]) => toFt(bLevel.map(x, y)))];
  const W = 420;
  const outer = [[-W, -W], [W, -W], [W, W], [-W, W]];
  bat.poly('grass', outer, G, holes);
  addFloorPoly(outer, holes, G, 'site');

  // street (Harrison Ave): asphalt, mountable concrete curb
  const sz0 = LOT.zEast + 9, sz1 = sz0 + 26;
  bat.poly('asphalt', [[-W, sz0], [W, sz0], [W, sz1], [-W, sz1]], G + 0.02);
  bat.aabox('col:#bdbab2', -W, G, sz0 - 0.6, W, G + 0.15, sz0);
  bat.aabox('col:#b4b1a9', -W, G, sz0, W, G + 0.04, sz0 + 1.4);              // gutter pan
  // driveway (aerial): one broad pad along the whole south side of the side-entry garage, ~27 ft
  // from the garage wall to its south edge, running straight out to the street with a flared apron.
  const padS = -27.4;
  const pad = [[padS, 14.6], [0.15, 14.6], [0.15, 49.5], [-4, 53.5], [-4, LOT.zEast + 2], [-2.5, sz0], [padS - 1.5, sz0], [padS, LOT.zEast + 2]];
  bat.poly('paving', pad, G + 0.03);
  addFloorPoly(pad, [], G + 0.03, 'site');
  for (let z = 22; z < LOT.zEast; z += 12) bat.face('col:#a9a59c', [V(padS, G + 0.035, z), V(0.15, G + 0.035, z), V(0.15, G + 0.035, z + 0.06), V(padS, G + 0.035, z + 0.06)], V(0, 1, 0)); // control joints
  for (let x = -14; x > padS; x -= 13.5) bat.face('col:#a9a59c', [V(x, G + 0.035, 14.6), V(x + 0.06, G + 0.035, 14.6), V(x + 0.06, G + 0.035, LOT.zEast), V(x, G + 0.035, LOT.zEast)], V(0, 1, 0));
  // front walk: porch steps curving down toward the drive
  const [doorX, porchZ] = toFt([1264, 1028.5]);
  // (front photo: from the steps it sweeps south-east across the lawn and meets the drive near the street)
  ribbon(bat, 'paving', curve([[doorX, porchZ + 8.3], [doorX - 1.5, porchZ + 12.5], [32, porchZ + 19.5], [19, porchZ + 26.5], [6, porchZ + 30.5], [-4.5, porchZ + 32]], 40), 3.6, G + 0.04);
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
  // walk along the garage's back wall from the patio to the driveway (rear photos)
  const strip = [[0.15, 11.2], [12.5, 11.2], [12.5, 14.55], [0.15, 14.55]];
  bat.prism({ top: 'paving', side: 'foundation' }, strip, G, -0.8);
  addFloorPoly(strip, [], -0.8, 'site');

  // ---- landscaping (from the photos)
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
  // a bed along a wall line with a gently scalloped front edge
  const wavyBed = (x0, x1, zBack, depth, seed, notch) => {
    const r = rng(seed), pts = [[x0, zBack]];
    for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / 16) {
      if (notch && x > notch[0] && x < notch[1]) continue;
      pts.push([x, zBack + depth + Math.sin(x * 0.55 + r() * 6) * 0.45]);
    }
    if (notch) { // stop either side of the walk
      const i = pts.findIndex((p) => p[0] >= notch[1]);
      pts.splice(i, 0, [notch[0], zBack + depth], [notch[0], zBack + 1.1], [notch[1], zBack + 1.1], [notch[1], zBack + depth]);
    }
    pts.push([x1, zBack]);
    bat.poly('mulch', pts, G + 0.05);
  };
  bed(blob(-10, -44, 10, 23, 0.14, 2), 1);          // island with the apple trees
  bed(blob(24, -50, 7.5, 7.5, 0.1, 5), 2);          // ring around the big maple
  bed(blob(20, -88, 52, 7, 0.25, 9, 64), 3);        // back bed with spruces & small arborvitae
  bed([[61.5, -46], [LOT.xNorth - 0.5, -46], [LOT.xNorth - 0.5, 13], [62.3, 13], [62.3, 0.4], [61.5, -10]], 4, false); // arborvitae screen
  wavyBed(25.3, 62.3, 49.3, 4.6, 5, [doorX - 3.2, doorX + 3.2]); // porch bed (hydrangeas / shrubs)
  wavyBed(-0.2, 25.3, 48.3, 4.4, 6);                 // bed across the garage's street gable

  // birdhouse on a post, near the patio
  { const k = new Kit(bat, 'site').at(44.5, -8.5, G);
    k.cbox('post', 0, 0, 0.35, 0.35, 0, 6.2);
    k.cbox('white', 0, 0, 1.6, 1.6, 6.2, 7.5);
    k.prof('col:#2f5b45', [[-1.1, 7.45], [1.1, 7.45], [0, 8.3]], -1.1, 1.1);
    k.cbox('col:#2f5b45', 0, 0, 0.5, 0.5, 8.2, 8.7);
    for (const s of [-1, 1]) k.cyl('black', 0.4 * s, 0.81, 0.13, 0.13, 6.9, 6.92, 10);
    addSolid(V(44.3, 0, -8.7), V(0.4, 0, 0), V(0, 0, 0.4), G, G + 6, 'site'); }
  // cedar raised planter on the patio, by the sun room slider (~50" x 20", 33" tall)
  { const k = new Kit(bat, 'site').at(46, 1.2, -0.62, 90);
    for (const x of [-1.9, 1.9]) for (const z of [-0.6, 0.6]) k.cbox('cedar', x, z, 0.25, 0.25, 0, 2.6);
    k.box('cedar', -2.1, 1.8, -0.8, 2.1, 2.8, 0.8);
    for (let i = 0; i < 5; i++) k.cyl(i % 2 ? 'col:#5d8a3e' : 'col:#7a9a4b', -1.6 + i * 0.8, (i % 2) * 0.2 - 0.1, 0.4, 0.1, 2.8, 3.4 + (i % 3) * 0.2, 6);
    addSolid(V(45.2, 0, -0.9), V(1.6, 0, 0), V(0, 0, 4.2), -0.62, 2.8, 'site'); }
  // white fan trellis on the garage's back wall, right of the laundry door
  { const k = new Kit(off('off:mud'), 'off:mud').at(4.6, 14.5, 0, 180);
    for (let i = 0; i < 7; i++) {
      const a = (-0.55 + (1.1 * i) / 6), kb = new Kit(off('off:mud'), 'off:mud').at(4.6, 14.5, 0, 180);
      const top = V(Math.sin(a) * 2.6, 6.5, 0);
      kb.bat.box('white', kb.P(-0.04, 0.3, -0.06), kb.ex().multiplyScalar(top.x).add(V(0, top.y - 0.3, 0)), V(0.08, 0, 0), kb.ez().multiplyScalar(0.06));
    }
    for (const r of [3.2, 4.4, 5.6]) k.box('white', -r * 0.42, r, -0.06, r * 0.42, r + 0.07, 0);
    k.box('white', -0.15, 0, -0.06, 0.15, 0.4, 0); }
  // wooden play set on the far (west) side of the yard: fort with slide, swing beam, climbing wall.
  // Typical cedar set: 5 ft deck, 8 ft swing beam, 10 ft slide, ~26 x 18 ft use zone.
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
      for (const dz of [-0.75, 0.75]) k.box('col:#8c8c8c', x - 0.03, 1.6, dz - 0.03, x + 0.03, 8.6, dz + 0.03);
      k.box(kind === 'swing' ? 'col:#1e1e1e' : 'col:#2f6fbf', x - 0.4, 1.4, -0.85, x + 0.4, 1.6, 0.85); // seats 17-19" up
    }
    k.solid(fx - 2.8, -2.8, fx + 2.8, 2.8, 0, 10);
    k.solid(9.0, -3.6, 9.6, -3.2, 0, 9); k.solid(9.0, 3.2, 9.6, 3.6, 0, 9);
  }
  // downspouts
  for (const [x, z, top, rear] of [[0.05, 14.5, 9], [0.05, 48.55, 9], [25.4, 49.0, 9], [61.95, 0.05, 9, 'off:sunext'], [61.95, 41.9, 17], [21.6, 41.95, 17], [21.6, 14.6, 17], [33.6, 13.0, 9, 'off:bump']]) {
    const b = rear ? off(rear) : bat; // downspouts at corners an option builds over
    b.aabox('white', x - 0.13, G, z - 0.13, x + 0.13, top - 0.1, z + 0.13);
    b.aabox('white', x - 0.25, G, z - 0.25, x + 0.25, G + 0.12, z + 0.25);
  }
  // hose reel by the laundry door
  { const k = new Kit(off('off:mud'), 'off:mud').at(9, 13.6, -0.8, 180); k.cyl('col:#2f5b45', 0, 0, 0.9, 0.9, 0.3, 1.0, 14); k.cbox('col:#3a3a3a', 0, 0, 1.0, 1.0, 0, 0.3); }
  // AC condenser: not visible in any photo, so placed where it is out of the way of every path and option:
  // on its pad against the north wall, just behind the chimney chase
  condenser(new Kit(bat, 'site').at(63.6, 25.5, G, 90));
  // garbage + recycling carts against the garage's south wall, behind the car bays
  cart(new Kit(bat, 'site').at(-1.6, 16.8, G + 0.03, -90), 'col:#30383a');
  cart(new Kit(bat, 'site').at(-1.6, 19.5, G + 0.03, -90), 'col:#2d5c8e');
  // grill at the sun room end of the patio, clear of the fire pit circle
  grill(new Kit(bat, 'site').at(41.8, -0.8, -0.62, -90));
  // mailbox at the curb on the north side of the drive apron, door to the street
  mailbox(new Kit(bat, 'site').at(-1.6, sz0 - 1.1, G, 0));

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

  // neighboring houses: two-story massing with a side-gabled roof, eaves and a garage wing
  for (const [x0, z0, x1, z1, h] of NEIGHBORS) {
    const eave = G + h * 0.62, xc = (x0 + x1) / 2;
    bat.aabox({ def: 'col:#dcd8cf', pv: 'col:#dcd8cf' }, x0, G, z0, x1, eave, z1);
    bat.aabox('col:#8d8a84', x0 - 0.1, G, z0 - 0.1, x1 + 0.1, G + 1.2, z1 + 0.1);   // foundation
    const ov = 1.2;
    bat.face('col:#5d6166', [V(x0 - ov, eave - 0.6, z0 - ov), V(x0 - ov, eave - 0.6, z1 + ov), V(xc, G + h, z1 + ov), V(xc, G + h, z0 - ov)], V(-1, 1, 0));
    bat.face('col:#5d6166', [V(x1 + ov, eave - 0.6, z0 - ov), V(x1 + ov, eave - 0.6, z1 + ov), V(xc, G + h, z1 + ov), V(xc, G + h, z0 - ov)], V(1, 1, 0));
    for (const z of [z0, z1]) bat.face('col:#dcd8cf', [V(x0, eave, z), V(x1, eave, z), V(xc, G + h - 0.4, z)], V(0, 0, z === z0 ? -1 : 1));
    // windows on the long walls (a rhythm of dark rectangles reads as a house at a distance)
    for (const x of [x0 - 0.06, x1 + 0.06]) for (let z = z0 + 4; z < z1 - 3; z += 7) for (const y of [G + 3.5, G + 12.5])
      bat.aabox('col:#3b4148', x - 0.03, y, z, x + 0.03, y + 4.2, z + 3);
  }
  bat.build(group);
  group.userData.renos = Object.entries(OFF).map(([rs, b]) => { const g = new THREE.Group(); g.userData.rs = rs; b.build(g); group.add(g); return g; });

  // ------------------------------------------------------------------ trees & planting
  const trees = new THREE.Group();
  trees.name = 'trees';
  const P = new Plants();
  // arborvitae screen along the north line, behind the sun room (rear photos: ~22 ft, two staggered rows)
  { const r = rng(11);
    for (let z = -42, i = 0; z <= 12; z += 3.4, i++) {
      arborvitae(P, LOT.xNorth - 3.6, z, 20 + r() * 3.5, 4.2 + r() * 0.6, 100 + i, i % 3 ? '#3b6a31' : '#41723a');
      arborvitae(P, LOT.xNorth - 1.6, z + 1.7, 19 + r() * 3.5, 4.0 + r() * 0.6, 200 + i, i % 2 ? '#386530' : '#3f6e35');
    } }
  // tall spruces at the back of the lot (yard photos), a Colorado blue among the Norways
  for (const [x, z, h, c] of [[58, -88, 38], [38, -93, 34, '#4c6e6a'], [14, -90, 40], [-12, -84, 36], [62, -52, 38], [-20, -64, 30, '#527370']]) spruce(P, x, z, h, Math.round(x * 7 + z), c);
  // big sugar maple in the middle of the back yard (yard photos: ~45 ft, broad crown)
  shadeTree(P, 24, -50, 46, 3, { w: 30 });
  // apple trees in the rock-edged island
  // (the nearest one sits 4 ft further west so its crown clears the detached studio's back wall at z = -22)
  for (const [x, z, s] of [[-9, -34, 5], [-13, -48, 9], [-6, -61, 13]]) fruitTree(P, x, z, 17, s);
  // row of young arborvitae in the back bed
  for (let x = -22; x < 62; x += 9) arborvitae(P, x + 3, -82.5 + Math.sin(x) * 1.5, 9 + (Math.abs(x) % 3), 3.0, 300 + x);
  // dwarf Alberta spruce at the garage's back corner (rear photos)
  dwarfSpruce(P, -0.9, 9.9, 5.2, 5);
  // front: crabapple at the porch's north end, tall evergreens on the north side (front photo)
  fruitTree(P, 61.5, 56, 20, 41, { w: 11.5, colors: ['#4f6f35', '#5b7c3c', '#47652f'], fruit: '#b3262c' });
  arborvitae(P, 66.4, 45, 30, 7.5, 61, '#2f5a30');
  spruce(P, 79, 22, 46, 77);                          // over the north line, behind the house (rear photos)
  spruce(P, 78, 2, 42, 79);
  // street trees and the neighbors' trees around the front (aerial; the front photo is framed by one)
  shadeTree(P, 55, 80, 50, 21, { w: 36, limbedUp: true });
  shadeTree(P, -38, 70, 40, 23, { w: 30, detail: 1 });
  shadeTree(P, 80, 70, 36, 33, { detail: 1 });
  shadeTree(P, -38, 42, 36, 25, { w: 26, colors: ['#5d8a3a', '#6b9440', '#557f35', '#79a046'], detail: 1 });
  spruce(P, -39, 6, 40, 91);                       // behind the garage, over the south line (front photo, far left)
  // front beds: four yews + one burning bush across the garage gable, hydrangeas left of the walk,
  // boxwoods / yews right of it (front photo)
  for (const [x, z] of [[2.8, 50.6], [8.8, 50.8], [13.8, 50.6], [20.4, 50.8]]) shrub(P, x, z, 3.4, Math.round(x * 13), '#466b34', 0.78);
  shrub(P, -1.2, 50.4, 3.6, 7, '#5b6f30', 0.85);
  for (const [x, i] of [[28.5, 0], [32.6, 1], [36.6, 2]]) hydrangea(P, x, 51.6 + (i % 2) * 0.5, 4.6, 50 + i);
  for (const [x, d] of [[49.4, 3.2], [53.2, 3.6], [57.0, 3.2], [60.8, 3.0]]) shrub(P, x, 51.4, d, Math.round(x * 7), '#4a7136', 0.8);
  shrub(P, 46.9, 51.0, 1.8, 9, '#6b6a40', 0.9);
  P.build(trees);
  group.add(trees);
  return group;
}
