// Lot, landscaping and context for Creekside Ln. House frame (feet): +x = plan right (southwest, the driveway side),
// +z = plan down = toward the street (northwest), y = up. Ground is at y = -1.
// The surroundings (neighbors, trees, streets, lawn vs. needle litter, the red-mulch bed) come from the Google Earth
// aerial 59 (fitted to this house: 3.40 px/ft) and the oblique 60, via NEIGHBORS / TREES / GROUND / STREETS in
// data.js; the planting right around the house (beds, yews, arborvitae, patio, fence) from the listing photos.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { LEVELS, LOT, STREET, STREETS, NEIGHBORS, TREES, GROUND, X_AZ, toFt } from './data.js';
import { Batcher, Kit, V, addFloorPoly, addSolid, pip } from './geom.js';

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
// rounded polygon: each corner [x, z, r] is replaced by an arc of radius r
function rounded(pts, seg = 6) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const [x, z, r = 0] = pts[i];
    if (!r) { out.push([x, z]); continue; }
    const a = pts[(i - 1 + pts.length) % pts.length], b = pts[(i + 1) % pts.length];
    const da = Math.hypot(a[0] - x, a[1] - z), db = Math.hypot(b[0] - x, b[1] - z);
    const pa = [x + ((a[0] - x) / da) * r, z + ((a[1] - z) / da) * r], pb = [x + ((b[0] - x) / db) * r, z + ((b[1] - z) / db) * r];
    for (let s = 0; s <= seg; s++) { // quadratic bezier through the corner
      const t = s / seg, u = 1 - t;
      out.push([u * u * pa[0] + 2 * u * t * x + t * t * pb[0], u * u * pa[1] + 2 * u * t * z + t * t * pb[1]]);
    }
  }
  return out;
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
  return { left, right };
}
function rng(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; }

// ------------------------------------------------------------------ plants
// Foliage is built from alpha-tested "cards" (quads with a painted leaf-cluster texture) scattered through each
// crown, lit with crown-shaped normals so the canopy shades like a volume, plus a dark core so it never reads
// as see-through. Trunks and main limbs are tapered cylinders. Everything is merged per material.
function paintTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const shadeHex = (hex, f) => { const c = new THREE.Color(hex); c.multiplyScalar(f); return '#' + c.getHexString(); };
// leaf cluster: twigs + many leaves inside a soft round cluster. kind: 'maple' (5-lobed), 'oval', 'small', 'needle'
function leafTexture(colors, seed, kind = 'maple') {
  return paintTex(256, 256, (g, S) => {
    const r = rng(seed);
    g.strokeStyle = '#4b3b2d'; g.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      g.lineWidth = 1 + r() * 2;
      g.beginPath(); g.moveTo(S / 2 + (r() - 0.5) * 30, S / 2 + (r() - 0.5) * 30);
      g.quadraticCurveTo(r() * S, r() * S, S * 0.1 + r() * S * 0.8, S * 0.1 + r() * S * 0.8); g.stroke();
    }
    const n = { maple: 85, oval: 130, small: 420, needle: 900 }[kind];
    const len = { maple: 30, oval: 24, small: 11, needle: 10 }[kind];
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = Math.pow(r(), 0.6) * S * 0.43;
      const x = S / 2 + Math.cos(a) * d, y = S / 2 + Math.sin(a) * d * 0.92;
      const L = len * (0.65 + r() * 0.6);
      const base = colors[Math.floor(r() * colors.length)];
      g.save(); g.translate(x, y); g.rotate(r() * Math.PI * 2);
      g.fillStyle = shadeHex(base, 0.75 + r() * 0.45);
      if (kind === 'maple') {
        g.beginPath();
        for (const [ang, l, w] of [[0, 1, 0.34], [0.75, 0.78, 0.28], [-0.75, 0.78, 0.28], [1.55, 0.5, 0.22], [-1.55, 0.5, 0.22]]) {
          g.save(); g.rotate(ang); g.moveTo(0, 0); g.ellipse(0, -L * l * 0.5, L * w * 0.5, L * l * 0.5, 0, 0, Math.PI * 2); g.restore();
        }
        g.fill();
      } else if (kind === 'needle') {
        g.fillRect(-0.9, -L / 2, 1.8, L);
      } else {
        g.beginPath(); g.ellipse(0, 0, L * 0.3, L * 0.5, 0, 0, Math.PI * 2); g.fill();
      }
      g.restore();
    }
  });
}
// spruce frond: a branch along +x (trunk at x = 0, tip at x = S), drooping branchlets with dense needles
function frondTexture(colors, seed) {
  return paintTex(256, 128, (g, W, Hh) => {
    const r = rng(seed);
    const cy = Hh / 2;
    const drawTwig = (x0, y0, x1, y1, width) => {
      g.strokeStyle = '#4a3a2a'; g.lineWidth = width; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      const l = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / l, uy = (y1 - y0) / l;
      for (let t = 0; t < l; t += 1.4) {
        const px = x0 + ux * t, py = y0 + uy * t;
        for (const s of [-1, 1]) {
          const nl = (7 + r() * 7) * Math.min(1, 0.35 + (1 - t / l) * 0.9);
          const ang = Math.atan2(uy, ux) + s * (0.7 + r() * 0.6);
          g.strokeStyle = shadeHex(colors[Math.floor(r() * colors.length)], 0.7 + r() * 0.5);
          g.lineWidth = 1.3; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(ang) * nl, py + Math.sin(ang) * nl); g.stroke();
        }
      }
    };
    drawTwig(0, cy, W * 0.97, cy + 6, 2.5);
    for (let x = 18; x < W * 0.85; x += 16 + r() * 10) {
      const rem = 1 - x / W;
      for (const s of [-1, 1]) drawTwig(x, cy + s * 1, x + (20 + r() * 25) * (0.5 + rem), cy + s * (22 + r() * 22) * (0.4 + rem * 0.8), 1.4);
    }
  });
}
const FOLIAGE = {}; // name -> { mat, depth }
function foliageMat(name, make) {
  if (FOLIAGE[name]) return FOLIAGE[name];
  const map = make();
  const mat = new THREE.MeshStandardMaterial({ map, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.88, vertexColors: true });
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.42, side: THREE.DoubleSide });
  return (FOLIAGE[name] = { mat, depth });
}
const PAL = {
  mapleRed: ['#a3241d', '#bf3423', '#8c1c1b', '#cf4f28', '#b62e26', '#d8682c'],
  mapleOrange: ['#d98a1f', '#e2a92e', '#c96d1d', '#e6c346', '#b75a1b', '#cf4a22'],
  mapleGreen: ['#4f7b2f', '#618d37', '#3f6a2a', '#729c40', '#5a8233', '#8fa848'],
  locust: ['#d2be3c', '#c4ae33', '#e0cd57', '#b8a52e', '#a99d3a', '#93a042'],
  linden: ['#6b8f35', '#7f9c3c', '#5d7f30', '#9aa944', '#b5ad45'],
  spruce: ['#1e472b', '#28563a', '#173c25', '#2f623d', '#24503a'],
  blue: ['#58797a', '#6a8b8b', '#4d6b6c', '#7c9a96', '#5f8080'],
  yew: ['#1d3b22', '#27472a', '#173118', '#2e5230'],
  box: ['#365f29', '#2c5222', '#42702f', '#3a6a2c'],
  arb: ['#3c6a2c', '#477834', '#345d27', '#52823a'],
  shrub: ['#4a6c32', '#5b7c39', '#3e5e2b', '#6a8a40'],
  hydrangea: ['#3f6a33', '#4c7a3a', '#365c2c'],
  oak: ['#3d5f28', '#4a6c2e', '#35541f', '#567a34'],
  purple: ['#4a2430', '#5c2b37', '#3d1f28', '#6e3644', '#55303a'],
};
const FOL = (name) => foliageMat(name, () => (name.startsWith('frond') ? frondTexture(PAL[name.split(':')[1]], name.length * 7) : leafTexture(PAL[name.split(':')[1]], name.length * 13 + 5, name.split(':')[0])));

class Plants {
  constructor() { this.cards = new Map(); this.bark = []; this.cores = new Map(); this.vc = new Map(); }
  card(name, c, n, size, shade, nrm, u0) {
    let b = this.cards.get(name);
    if (!b) { b = { p: [], n: [], uv: [], c: [], i: [] }; this.cards.set(name, b); }
    // orientation: plane normal = n, in-plane axes u, v (u0 optional: along the frond)
    const u = (u0 ? u0.clone() : V(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)).projectOnPlane(n).normalize();
    const v = new THREE.Vector3().crossVectors(n, u).normalize();
    const [sw, sh] = Array.isArray(size) ? size : [size, size];
    const base = b.p.length / 3;
    const corners = u0 ? [[0, -0.5], [1, -0.5], [1, 0.5], [0, 0.5]] : [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];
    const uvs = [[0, 0], [1, 0], [1, 1], [0, 1]];
    corners.forEach(([a, bb], k) => {
      const p = c.clone().addScaledVector(u, a * sw).addScaledVector(v, bb * sh);
      b.p.push(p.x, p.y, p.z); b.n.push(nrm.x, nrm.y, nrm.z); b.uv.push(...uvs[k]); b.c.push(shade[0], shade[1], shade[2]);
    });
    b.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  limb(a, b, r0, r1, seg = 7) {
    const d = new THREE.Vector3().subVectors(b, a), l = d.length();
    const g = new THREE.CylinderGeometry(r1, r0, l, seg, 1, true);
    g.translate(0, l / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()));
    g.translate(a.x, a.y, a.z);
    this.bark.push(g);
  }
  core(color, geo) { let l = this.cores.get(color); if (!l) this.cores.set(color, (l = [])); l.push(geo); }
  leaf(species, geo) { let l = this.vc.get(species); if (!l) this.vc.set(species, (l = [])); l.push(geo); }
  build(group, shadows = true) {
    for (const [name, b] of this.cards) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3));
      g.setIndex(b.i);
      g.computeBoundingSphere();
      const f = FOL(name), m = new THREE.Mesh(g, f.mat);
      m.customDepthMaterial = f.depth;
      m.castShadow = shadows; m.receiveShadow = true;
      group.add(m);
    }
    if (this.bark.length) {
      const m = new THREE.Mesh(mergeGeometries(this.bark.map((g) => g.toNonIndexed())), barkMat);
      m.castShadow = shadows; m.receiveShadow = true; group.add(m);
    }
    for (const [species, list] of this.vc) { // one shared vertex-colored material per species
      const m = new THREE.Mesh(mergeGeometries(list), vcMat(species));
      m.castShadow = shadows; m.receiveShadow = true; group.add(m);
    }
    for (const [color, list] of this.cores) {
      const m = new THREE.Mesh(mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g))), new THREE.MeshStandardMaterial({ color, roughness: 1 }));
      m.castShadow = shadows; m.receiveShadow = true; group.add(m);
    }
  }
}
const barkMat = new THREE.MeshStandardMaterial({ color: '#5d5048', roughness: 1 });
const rndDir = (r) => { const z = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - z * z); return V(s * Math.cos(a), z, s * Math.sin(a)); };
function blob(r, rx, ry, rz, cx, cy, cz, detail = 1, jitter = 0.18) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = 1 + (r() - 0.5) * jitter * 2; p.setXYZ(i, p.getX(i) * rx * k, p.getY(i) * ry * k, p.getZ(i) * rz * k); }
  g.translate(cx, cy, cz); g.computeVertexNormals();
  return g;
}
// leaf clump: subdivided icosphere with smooth, noise-jittered vertices and per-vertex color (lighter, warmer
// tops; darker undersides), so a canopy reads as many overlapping masses of leaves
const VCMATS = {};
// tileable gray leaf pattern (multiplies the vertex colors): dense small leaves over dark gaps
function patternTex(kind) {
  const t = paintTex(256, 256, (g, S) => {
    const r = rng(kind === 'needle' ? 91 : 57);
    g.fillStyle = '#707070'; g.fillRect(0, 0, S, S);
    const n = kind === 'needle' ? 2600 : 900;
    for (let i = 0; i < n; i++) {
      const x = r() * S, y = r() * S, L = kind === 'needle' ? 9 + r() * 7 : 10 + r() * 10, a = kind === 'needle' ? (r() - 0.5) * 1.2 + (i % 2 ? 0.6 : -0.6) : r() * Math.PI * 2;
      const v = Math.round(175 + r() * 80);
      g.fillStyle = `rgb(${v},${v},${v})`;
      for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) {
        g.save(); g.translate(x + ox, y + oy); g.rotate(a);
        if (kind === 'needle') g.fillRect(-0.8, -L / 2, 1.6, L); else { g.beginPath(); g.ellipse(0, 0, L * 0.32, L * 0.5, 0, 0, Math.PI * 2); g.fill(); }
        g.restore();
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const PATTERN = {};
const conifer = (sp) => sp === 'spruce' || sp === 'blue' || sp === 'yew' || sp === 'arb';
const vcMat = (sp) => {
  if (VCMATS[sp]) return VCMATS[sp];
  const kind = conifer(sp) ? 'needle' : 'leaf', map = PATTERN[kind] || (PATTERN[kind] = patternTex(kind));
  return (VCMATS[sp] = new THREE.MeshStandardMaterial({ map, vertexColors: true, roughness: 1, metalness: 0, envMapIntensity: 0.25, side: sp === 'spruce' || sp === 'blue' ? THREE.DoubleSide : THREE.FrontSide }));
};
// world-anchored UVs so the leaf pattern has a constant scale (~2.5 ft tile)
function worldUV(g, scale = 0.4) { // per-triangle planar projection on the dominant axis (non-indexed geometry)
  const p = g.attributes.position, n = g.attributes.normal, uv = [];
  for (let i = 0; i < p.count; i += 3) {
    let ax = 0, ay = 0, az = 0;
    for (let j = i; j < i + 3; j++) { ax += Math.abs(n.getX(j)); ay += Math.abs(n.getY(j)); az += Math.abs(n.getZ(j)); }
    for (let j = i; j < i + 3; j++) {
      const x = p.getX(j), y = p.getY(j), z = p.getZ(j);
      if (ay >= ax && ay >= az) uv.push(x * scale, z * scale); else if (ax >= az) uv.push(z * scale, y * scale); else uv.push(x * scale, y * scale);
    }
  }
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}
const hash3 = (x, y, z) => { const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); };
function leafBlob(P, species, r, rx, ry, rz, cx, cy, cz, o = {}) {
  const pal = PAL[species], detail = o.detail ?? 2, jit = o.jit ?? 0.24, dark = o.dark ?? 0.5;
  let g = new THREE.IcosahedronGeometry(1, detail); g.deleteAttribute('uv'); g.deleteAttribute('normal');
  g = mergeVertices(g);
  const p = g.attributes.position, ph = [r() * 9, r() * 9, r() * 9], f = 2.2 + r() * 1.6;
  const base = new THREE.Color(pal[Math.floor(r() * pal.length)]), alt = new THREE.Color(pal[Math.floor(r() * pal.length)]);
  const col = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = Math.sin(x * f + ph[0]) * Math.sin(y * f + ph[1]) * Math.sin(z * f + ph[2]) + 0.55 * Math.sin(x * f * 2.7 + ph[1]) * Math.sin(y * f * 2.9 + ph[2]) * Math.sin(z * f * 2.5 + ph[0]);
    const k = 1 + jit * (n * 1.0 + (hash3(x, y, z) - 0.5) * 1.1);
    p.setXYZ(i, cx + x * rx * k, cy + y * ry * k, cz + z * rz * k);
    const t = Math.pow((y + 1) / 2, 0.85), s = (dark + (1 - dark) * t) * (0.86 + hash3(z, x, y) * 0.28) * (o.bright || 1);
    const c = base.clone().lerp(alt, hash3(y, z, x) * 0.6);
    col.push(c.r * s * (1 + t * 0.06), c.g * s, c.b * s * (1 - t * 0.05));
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  P.leaf(species, worldUV(g.toNonIndexed()));
}
// a clump = several overlapping leaf blobs inside an ellipsoid
function blobCluster(P, species, r, c, rx, ry, rz, n, o = {}) {
  for (let i = 0; i < n; i++) {
    const d = rndDir(r), f = i === 0 ? 0 : (o.spread ?? 0.4) + r() * 0.35, s = i === 0 ? (o.s0 ?? 0.55) : (o.s ?? 0.36) + r() * 0.16;
    leafBlob(P, species, r, rx * s, ry * s, rz * s, c.x + d.x * rx * f, c.y + d.y * ry * f * 0.8, c.z + d.z * rz * f, o);
  }
}
// cards over an ellipsoidal clump; shell-biased, lit with normals from `lc` (the crown's light center)
function clump(P, names, r, c, rx, ry, rz, n, size, lc, opt = {}) {
  const lit = opt.lit ?? 1, dark = opt.dark ?? 0.5;
  for (let i = 0; i < n; i++) {
    const d = rndDir(r), f = Math.pow(r(), 0.35) * 0.95 + 0.05;
    const pos = V(c.x + d.x * rx * f, c.y + d.y * ry * f, c.z + d.z * rz * f);
    const nrm = new THREE.Vector3().subVectors(pos, lc).multiply(V(1 / rx, 1 / ry, 1 / rz)).normalize().add(V(0, 0.25, 0)).normalize();
    const cn = nrm.clone().add(rndDir(r).multiplyScalar(0.9)).normalize();
    const up = (pos.y - (c.y - ry)) / (2 * ry);
    const s = (dark + (lit - dark) * Math.min(1, f * 0.9 + up * 0.25)) * (0.85 + r() * 0.3);
    const tint = opt.tint || [1, 1, 1];
    P.card(names[Math.floor(r() * names.length)], pos, cn, size * (0.75 + r() * 0.5), [s * tint[0], s * tint[1], s * tint[2]], nrm);
  }
}
// broadleaf shade tree: clear trunk, 3-5 leaders, crown of overlapping clumps
function shadeTree(P, x, z, o) {
  const r = rng(o.seed || 1), h = o.h, R = o.R, base = o.trunk ?? h * 0.22, names = o.leaves, lod = o.lod ?? 1; // lod < 1: far trees, fewer clumps / cards / facets
  const rt = o.rt ?? 0.35 + h * 0.012;
  const top = V(x + (o.lean?.[0] || 0), G + base, z + (o.lean?.[1] || 0));
  P.limb(V(x, G - 0.3, z), top, rt * 1.25, rt * 0.85, lod < 1 ? 6 : 9);
  const crownC = V(top.x, G + base + (h - base) * 0.55, top.z), Ry = (h - base) * 0.5;
  const nL = o.leaders || 4, ends = [];
  for (let i = 0; i < nL; i++) {
    const a = (i / nL) * Math.PI * 2 + r() * 0.8, rr = R * (0.35 + r() * 0.3);
    const end = V(top.x + Math.cos(a) * rr, crownC.y + Ry * (0.05 + r() * 0.35), top.z + Math.sin(a) * rr);
    P.limb(top, end, rt * 0.6, rt * 0.25, lod < 1 ? 4 : 6);
    ends.push(end);
    for (let j = 0; j < (lod < 1 ? 0 : 2); j++) { // secondary limbs reaching toward the crown shell
      const mid = top.clone().lerp(end, 0.45 + r() * 0.3), b = rndDir(r); b.y = Math.abs(b.y) * 0.6 + 0.2;
      P.limb(mid, mid.clone().add(V(b.x * R * 0.55, b.y * Ry * 0.6, b.z * R * 0.55)), rt * 0.28, rt * 0.08, 5);
    }
  }
  const coreCol = o.core || '#2f3d22';
  const clumps = [...ends.map((e) => e.clone().add(V(0, Ry * 0.15, 0))), crownC.clone().add(V(0, Ry * 0.45, 0))];
  for (let i = 0; i < (lod < 0.6 ? 1 : 3); i++) { const d = rndDir(r); d.y = d.y * 0.4 - 0.1; clumps.push(crownC.clone().add(V(d.x * R * 0.55, d.y * Ry, d.z * R * 0.55))); }
  for (const c of clumps) {
    const cr = R * (0.48 + r() * 0.16), cry = Ry * (0.5 + r() * 0.15);
    clump(P, names, r, c, cr, cry, cr, Math.round((cr * cr) * (o.density || 1.05) * 1.1 * lod), (o.card || Math.max(3.2, R * 0.24)) * (lod < 1 ? 1.3 : 1), crownC, { tint: o.tint, dark: 0.42, lit: 1.05 });
    blobCluster(P, names[Math.floor(r() * names.length)].split(':')[1], r, c, cr * 0.95, cry * 0.95, cr * 0.95, lod < 1 ? Math.max(3, Math.round(11 * lod)) : 11, { dark: 0.4, jit: 0.34, s0: lod < 1 ? 0.6 : 0.45, s: lod < 1 ? 0.36 : 0.26, spread: 0.45, bright: 1.18, detail: lod < 1 ? 1 : 2 });
  }
  addSolid(V(x - rt, 0, z - rt), V(rt * 2, 0, 0), V(0, 0, rt * 2), G, G + base, 'site');
}
// conifer (Norway / Colorado blue spruce): whorls of drooping fronds down to the ground
function spruce(P, x, z, h, o = {}) {
  const r = rng(o.seed || Math.round(x * 13 + z * 7 + 99)), R = o.R ?? h * 0.2, kind = o.blue ? 'blue' : 'spruce';
  const name = 'frond:' + kind, skirt = o.skirt ?? 0.5, lod = o.lod ?? 1, st = lod < 1 ? 1.35 / Math.max(0.65, lod) : 1.25;
  P.limb(V(x, G - 0.3, z), V(x, G + h, z), 0.25 + h * 0.008, 0.05, 6);
  for (let y = skirt; y < h - 1.2; y += st + r() * 0.5) {
    const t = y / h, rad = R * Math.pow(1 - t, 0.92) * (0.85 + r() * 0.25) + 0.4;
    const nb = Math.max(5, Math.round(rad * 2.2 * lod));
    for (let i = 0; i < nb; i++) {
      const a = r() * Math.PI * 2, dir = V(Math.cos(a), -0.28 - r() * 0.2, Math.sin(a)).normalize();
      const start = V(x, G + y, z), len = rad * (0.85 + r() * 0.3);
      const side = V(-Math.sin(a), 0, Math.cos(a));
      const nrm = V(Math.cos(a), 0.55, Math.sin(a)).normalize();
      const cardN = new THREE.Vector3().crossVectors(dir, side).normalize(); // roughly up-facing frond
      if (cardN.y < 0) cardN.negate();
      const s = (0.38 + 0.32 * Math.min(1, t * 1.3 + 0.2)) * (0.85 + r() * 0.3);
      P.card(name, start, cardN.clone().add(side.clone().multiplyScalar((r() - 0.5) * 0.8)).normalize(), [len, len * 0.6], [s, s, s], nrm, dir);
    }
  }
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.3, dir = V(Math.cos(a) * 0.35, 1, Math.sin(a) * 0.35).normalize(); P.card(name, V(x, G + h - 2.4, z), V(-Math.sin(a), 0, Math.cos(a)), [2.8, 1.2], [1, 1, 1], V(Math.cos(a), 0.8, Math.sin(a)).normalize(), dir); }
  // drooping tiers: jagged open skirts (darker inside, lighter at the tips), stacked with overlap
  const tst = lod < 1 ? 1.35 / Math.max(0.65, lod) : 1.35;
  for (let y = skirt + 0.6, i = 0; y < h - 1.5; y += tst + r() * 0.5, i++) {
    const t = y / h, rad = (R * Math.pow(1 - t, 0.92) + 0.4) * (0.92 + r() * 0.16);
    spruceTier(P, kind, r, x + (r() - 0.5) * 0.5, z + (r() - 0.5) * 0.5, G + y + 1.4 + rad * 0.15 + (tst - 1.35) * 0.6, G + y - rad * 0.5, rad, t, lod < 1 ? 12 : 28);
  }
  addSolid(V(x - 0.7, 0, z - 0.7), V(1.4, 0, 0), V(0, 0, 1.4), G, G + h, 'site');
}
function spruceTier(P, species, r, x, z, yTop, yBot, rad, t, seg = 28) {
  const g = new THREE.ConeGeometry(rad, yTop - yBot, seg, seg < 28 ? 2 : 3, true);
  g.deleteAttribute('uv');
  const p = g.attributes.position, ph = r() * 9, base = new THREE.Color(PAL[species][Math.floor(r() * PAL[species].length)]), col = [];
  const hh = yTop - yBot;
  for (let i = 0; i < p.count; i++) {
    const px = p.getX(i), py = p.getY(i), pz = p.getZ(i), a = Math.atan2(pz, px);
    const f = (py + hh / 2) / hh; // 0 at the tips, 1 at the trunk
    const jag = 1 + (Math.sin(a * 4 + ph) * 0.16 + Math.sin(a * 9 + ph * 2) * 0.12 + Math.sin(a * 17 + ph * 3) * 0.07 + (hash3(Math.round(px * 10), Math.round(pz * 10), 1) - 0.5) * 0.2) * (1 - f);
    const droop = (1 - f) * (0.3 + 0.25 * Math.sin(a * 7 + ph)) * rad * 0.18;
    p.setXYZ(i, x + px * jag, (yTop + yBot) / 2 + py - droop, z + pz * jag);
    const s = (0.45 + 0.55 * (1 - f) * (0.8 + t * 0.4)) * (0.88 + hash3(a, py, 3) * 0.24);
    col.push(base.r * s, base.g * s, base.b * s);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  P.leaf(species, worldUV(g.toNonIndexed(), 0.5));
}
// columnar arborvitae
function arborvitae(P, x, z, h, seed = 5) {
  const r = rng(seed), R = h * 0.13;
  const c = V(x, G + h * 0.5, z);
  clump(P, ['small:arb', 'oval:arb'], r, c, R, h * 0.5, R, Math.round(h * 5.5), 1.9, c, { dark: 0.45 });
  for (let y = 1.2; y < h - 1; y += 2.0) { const rr = R * Math.sqrt(Math.max(0.05, 1 - Math.pow((y - h * 0.45) / (h * 0.55), 2))) * 0.95; leafBlob(P, 'arb', r, rr, 1.9, rr, x + (r() - 0.5) * 0.4, G + y, z + (r() - 0.5) * 0.4, { dark: 0.5, jit: 0.3 }); }
  addSolid(V(x - 1, 0, z - 1), V(2, 0, 0), V(0, 0, 2), G, G + h, 'site');
}
// Foundation plantings must never poke through a wall: push a planting's center out of the house outline
// (1st-floor footprint + chimney, plus brick veneer) until its whole canopy clears the wall face by 0.5 ft.
let HOUSE_POLYS;
const housePolys = () => HOUSE_POLYS || (HOUSE_POLYS = [
  LEVELS.find((l) => l.id === 'f1').footprint[0].map((q) => toFt(q)),
  [[560, 28.5], [626, 28.5], [626, 57.5], [560, 57.5]].map((q) => toFt(q)),
]);
export function clearOfHouse(x, z, reach) {
  const need = reach + 0.6 + 0.5; // veneer / trim + clearance
  for (let it = 0; it < 8; it++) {
    let best = null;
    for (const poly of housePolys()) {
      const inside = pip(poly, x, z);
      for (let i = 0; i < poly.length; i++) {
        const [ax, az] = poly[i], [bx, bz] = poly[(i + 1) % poly.length], dx = bx - ax, dz = bz - az;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))), qx = ax + dx * t, qz = az + dz * t;
        const d = Math.hypot(x - qx, z - qz), sd = inside ? -d : d;
        if (!best || sd < best.sd) best = { sd, qx, qz, d, inside, nx: -dz, nz: dx };
      }
    }
    if (best.sd >= need - 1e-3) break;
    let nx = best.d > 1e-6 ? (x - best.qx) / best.d : 0, nz = best.d > 1e-6 ? (z - best.qz) / best.d : 0;
    if (best.inside || best.d <= 1e-6) { const l = Math.hypot(best.nx, best.nz); nx = best.nx / l; nz = best.nz / l; if (pip(housePolys()[0], best.qx + nx * 0.1, best.qz + nz * 0.1)) { nx = -nx; nz = -nz; } }
    x = best.qx + nx * need; z = best.qz + nz * need;
  }
  return [x, z];
}
// mounded shrub: w = spread, hgt = height; returns the (possibly pushed-out) center
function shrub(P, x, z, w, hgt, kind = 'shrub', seed) {
  const card0 = Math.max(0.9, Math.min(w, hgt) / 2 * 0.75) * 1.25;
  [x, z] = clearOfHouse(x, z, (w / 2) * 1.38 + card0 / 2); // blob clusters reach ~1.34 R
  const r = rng(seed || Math.round(x * 31 + z * 17 + 3)), R = w / 2, Ry = hgt / 2;
  const c = V(x, G + Ry * 0.95, z);
  const names = kind === 'yew' ? ['needle:yew', 'small:yew'] : kind === 'box' ? ['small:box'] : kind === 'hydrangea' ? ['oval:hydrangea'] : ['small:shrub', 'oval:shrub'];
  clump(P, names, r, c, R, Ry, R, Math.round(10 + w * hgt * 4.5), Math.max(0.9, Math.min(R, Ry) * 0.75), c.clone().add(V(0, -Ry * 0.3, 0)), { dark: 0.5 });
  blobCluster(P, kind, r, V(x, c.y - Ry * 0.05, z), R * 0.92, Ry * 0.92, R * 0.92, kind === 'box' ? 3 : 5, { dark: 0.48, jit: kind === 'box' ? 0.12 : 0.26 });
  return [x, z];
}

// ------------------------------------------------------------------ neighbors
// Each neighbor is a set of rectangular parts in its own frame (see NEIGHBORS in data.js), rotated into the plan:
// lap-siding walls, hip or gable roofs with soffits and fascia, windows (two rows on 2-story parts), garage doors
// on the side they really face, an entry door, chimneys, patios, decks and driveways.
const TRIM = 'col:#f1efe8', GLASS = 'col:#2b3237', SHUTTER = 'col:#3b4247';
function nbFrame(n) {
  const r = (n.rot * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return {
    P: (lx, y, lz) => V(n.x + lx * c + lz * s, y, n.z - lx * s + lz * c),
    D: (dx, dy, dz) => V(dx * c + dz * s, dy, -dx * s + dz * c),
    XZ: (lx, lz) => [n.x + lx * c + lz * s, n.z - lx * s + lz * c],
  };
}
// plan outline of each part (for distances)
export function neighborPolys(n) {
  const { XZ } = nbFrame(n);
  return n.parts.map(([x0, z0, x1, z1]) => [XZ(x0, z0), XZ(x1, z0), XZ(x1, z1), XZ(x0, z1)]);
}
const ridgeOf = ([x0, z0, x1, z1, e, type, pitch = 8 / 12]) => e + (type === 'gx' ? (z1 - z0) / 2 : type === 'gz' ? (x1 - x0) / 2 : Math.min(x1 - x0, z1 - z0) / 2) * pitch;
function neighbor(bat, n) {
  const { P, D } = nbFrame(n);
  const wall = 'lap:' + n.wall, roofK = n.roof, ov = 1.1;
  const doors = n.doors || [];
  const faceN = { '+x': [1, 0], '-x': [-1, 0], '+z': [0, 1], '-z': [0, -1] };
  // quad in local coords, offset `off` along the local normal (nx, nz)
  const quad = (key, ax, az, bx, bz, y0, y1, nx, nz, off) => bat.face(key, [P(ax + nx * off, y0, az + nz * off), P(bx + nx * off, y0, bz + nz * off), P(bx + nx * off, y1, bz + nz * off), P(ax + nx * off, y1, az + nz * off)], D(nx, 0, nz));
  const roofFace = (pts, e, h, nrm, k) => {
    const uv = pts.map(([x, , z]) => [x * e[0] + z * e[1], (x * h[0] + z * h[1]) * k]);
    bat.face(roofK, pts.map(([x, y, z]) => P(x, y, z)), D(nrm[0], nrm[1], nrm[2]), uv);
  };
  const inOther = (self, lx, lz, y) => n.parts.some((q) => q !== self && lx > q[0] + 0.2 && lx < q[2] - 0.2 && lz > q[1] + 0.2 && lz < q[3] - 0.2 && y < G + q[4] + 1.5);
  for (const part of n.parts) {
    const [x0, z0, x1, z1, e, type, p = 8 / 12] = part;
    const yw = G + e, yE = yw - ov * p, yr = G + ridgeOf(part), k = Math.sqrt(1 + p * p);
    const X0 = x0 - ov, X1 = x1 + ov, Z0 = z0 - ov, Z1 = z1 + ov, xm = (x0 + x1) / 2, zm = (z0 + z1) / 2;
    const sides = [[x0, z1, x1, z1, 0, 1], [x1, z0, x0, z0, 0, -1], [x0, z0, x0, z1, -1, 0], [x1, z1, x1, z0, 1, 0]];
    for (const [ax, az, bx, bz, nx, nz] of sides) {
      quad(wall, ax, az, bx, bz, G, yw, nx, nz, 0);
      quad('foundation', ax, az, bx, bz, G, G + 0.75, nx, nz, 0.06);
    }
    // roof
    const A = [[X0, yE, Z0], [X1, yE, Z0], [X1, yE, Z1], [X0, yE, Z1]];
    const along = type === 'gx' || (type === 'hip' && X1 - X0 >= Z1 - Z0);
    if (type === 'hip') {
      if (along) {
        const d = (Z1 - Z0) / 2, r0 = [X0 + d, yr, zm], r1 = [X1 - d, yr, zm];
        roofFace([A[0], A[1], r1, r0], [1, 0], [0, 1], [0, 1, -p], k); roofFace([A[3], A[2], r1, r0], [1, 0], [0, -1], [0, 1, p], k);
        roofFace([A[0], A[3], r0], [0, 1], [1, 0], [-p, 1, 0], k); roofFace([A[1], A[2], r1], [0, 1], [-1, 0], [p, 1, 0], k);
      } else {
        const d = (X1 - X0) / 2, r0 = [xm, yr, Z0 + d], r1 = [xm, yr, Z1 - d];
        roofFace([A[0], A[3], r1, r0], [0, 1], [1, 0], [-p, 1, 0], k); roofFace([A[1], A[2], r1, r0], [0, 1], [-1, 0], [p, 1, 0], k);
        roofFace([A[0], A[1], r0], [1, 0], [0, 1], [0, 1, -p], k); roofFace([A[3], A[2], r1], [1, 0], [0, -1], [0, 1, p], k);
      }
    } else if (type === 'gx') {
      const r0 = [X0, yr, zm], r1 = [X1, yr, zm];
      roofFace([A[0], A[1], r1, r0], [1, 0], [0, 1], [0, 1, -p], k); roofFace([A[3], A[2], r1, r0], [1, 0], [0, -1], [0, 1, p], k);
      for (const x of [x0, x1]) bat.face(wall, [P(x, yw, z0), P(x, yw, z1), P(x, yr, zm)], D(x === x0 ? -1 : 1, 0, 0));
      for (const x of [X0, X1]) bat.face(TRIM, [P(x, yE - 0.5, Z0), P(x, yE, Z0), P(x, yr, zm), P(x, yr - 0.5, zm)], D(x === X0 ? -1 : 1, 0, 0)), bat.face(TRIM, [P(x, yE - 0.5, Z1), P(x, yE, Z1), P(x, yr, zm), P(x, yr - 0.5, zm)], D(x === X0 ? -1 : 1, 0, 0));
    } else {
      const r0 = [xm, yr, Z0], r1 = [xm, yr, Z1];
      roofFace([A[0], A[3], r1, r0], [0, 1], [1, 0], [-p, 1, 0], k); roofFace([A[1], A[2], r1, r0], [0, 1], [-1, 0], [p, 1, 0], k);
      for (const z of [z0, z1]) bat.face(wall, [P(x0, yw, z), P(x1, yw, z), P(xm, yr, z)], D(0, 0, z === z0 ? -1 : 1));
      for (const z of [Z0, Z1]) bat.face(TRIM, [P(X0, yE - 0.5, z), P(X0, yE, z), P(xm, yr, z), P(xm, yr - 0.5, z)], D(0, 0, z === Z0 ? -1 : 1)), bat.face(TRIM, [P(X1, yE - 0.5, z), P(X1, yE, z), P(xm, yr, z), P(xm, yr - 0.5, z)], D(0, 0, z === Z0 ? -1 : 1));
    }
    bat.face(TRIM, A.map(([x, y, z]) => P(x, y, z)), V(0, -1, 0)); // soffit
    const fas = (ax, az, bx, bz, nx, nz) => quad(TRIM, ax, az, bx, bz, yE - 0.6, yE, nx, nz, 0);
    if (type !== 'gz') { fas(X0, Z1, X1, Z1, 0, 1); fas(X1, Z0, X0, Z0, 0, -1); }
    if (type !== 'gx') { fas(X0, Z0, X0, Z1, -1, 0); fas(X1, Z1, X1, Z0, 1, 0); }
    // windows: one or two rows, skipping garage doors, the entry and walls hidden inside another part
    const rows = e >= 16 ? [[3.2, 7.6], [12.0, 16.0]] : e >= 9 ? [[3.2, 7.4]] : [];
    for (const [ax, az, bx, bz, nx, nz] of sides) {
      const L = Math.hypot(bx - ax, bz - az), cnt = L < 6 ? 0 : Math.max(1, Math.round(L / 10.5));
      const ux = (bx - ax) / L, uz = (bz - az) / L;
      for (let i = 0; i < cnt; i++) {
        const t = (i + 0.5) / cnt, cx = ax + (bx - ax) * t, cz = az + (bz - az) * t;
        for (const [y0, y1] of rows) {
          if (inOther(part, cx + nx * 0.8, cz + nz * 0.8, G + y0)) continue;
          if (y0 < 8 && doors.some(([dx, dz, w]) => Math.hypot(dx - cx, dz - cz) < w / 2 + 2.6)) continue;
          if (y0 < 8 && n.entry && Math.hypot(n.entry[0] - cx, n.entry[1] - cz) < 4.5) continue;
          const w = 1.5, q = (s, y, off) => P(cx + ux * s + nx * off, G + y, cz + uz * s + nz * off);
          bat.face(TRIM, [q(-w - 0.3, y0 - 0.3, 0.05), q(w + 0.3, y0 - 0.3, 0.05), q(w + 0.3, y1 + 0.3, 0.05), q(-w - 0.3, y1 + 0.3, 0.05)], D(nx, 0, nz));
          bat.face(GLASS, [q(-w, y0, 0.09), q(w, y0, 0.09), q(w, y1, 0.09), q(-w, y1, 0.09)], D(nx, 0, nz));
          bat.face(TRIM, [q(-w, (y0 + y1) / 2 + 0.05, 0.1), q(w, (y0 + y1) / 2 + 0.05, 0.1), q(w, (y0 + y1) / 2 - 0.05, 0.1), q(-w, (y0 + y1) / 2 - 0.05, 0.1)], D(nx, 0, nz));
          if (nz > 0.5) for (const s of [-1, 1]) bat.face(SHUTTER, [q(s * (w + 0.35), y0, 0.07), q(s * (w + 1.45), y0, 0.07), q(s * (w + 1.45), y1, 0.07), q(s * (w + 0.35), y1, 0.07)], D(nx, 0, nz));
        }
      }
    }
    addSolid(P(x0, 0, z0), D(x1 - x0, 0, 0), D(0, 0, z1 - z0), G, yr, 'site');
  }
  // garage doors: raised-panel look with a few horizontal joints, in a trim frame
  for (const [cx, cz, w, f] of doors) {
    const [nx, nz] = faceN[f], ux = Math.abs(nz), uz = Math.abs(nx);
    const a = [cx - ux * w / 2, cz - uz * w / 2], b = [cx + ux * w / 2, cz + uz * w / 2];
    quad(TRIM, a[0] - ux * 0.35, a[1] - uz * 0.35, b[0] + ux * 0.35, b[1] + uz * 0.35, G, G + 8.0, nx, nz, 0.05);
    quad('col:#ecE9e1', a[0], a[1], b[0], b[1], G, G + 7.6, nx, nz, 0.09);
    for (let y = 1.9; y < 7.5; y += 1.9) quad('col:#c8c4bb', a[0], a[1], b[0], b[1], G + y - 0.05, G + y + 0.05, nx, nz, 0.11);
  }
  if (n.entry) { // entry door with a stoop
    const [cx, cz, f] = n.entry, [nx, nz] = faceN[f], ux = Math.abs(nz), uz = Math.abs(nx);
    quad(TRIM, cx - ux * 2.1, cz - uz * 2.1, cx + ux * 2.1, cz + uz * 2.1, G + 0.5, G + 8.2, nx, nz, 0.05);
    quad('col:#3f464c', cx - ux * 1.6, cz - uz * 1.6, cx + ux * 1.6, cz + uz * 1.6, G + 0.5, G + 7.6, nx, nz, 0.09);
    bat.box('foundation', P(cx - ux * 3 + nx * 0.05, G, cz - uz * 3 + nz * 0.05), D(ux * 6, 0, uz * 6), V(0, 0.5, 0), D(nx * 4, 0, nz * 4));
  }
  if (n.chimney) {
    const [cx, cz, top] = n.chimney;
    bat.box('col:#8d8379', P(cx - 1.8, G, cz - 1.3), D(3.6, 0, 0), V(0, top, 0), D(0, 0, 2.6));
    bat.box('col:#6f6a64', P(cx - 2.0, G + top, cz - 1.5), D(4.0, 0, 0), V(0, 0.4, 0), D(0, 0, 3.0));
  }
  const flat = (key, pts, y) => { bat.poly(key, pts, y); addFloorPoly(pts, [], y, 'site'); };
  if (n.drive) flat('paving', n.drive, G + 0.04);
  if (n.patio) flat(n.patioKey || 'pavers', n.patio, G + 0.06);
  if (n.court) flat('col:#9b5a46', n.court, G + 0.06);
  if (n.deck) { // raised wood deck with posts and a railing on the open sides
    const [x0, z0, x1, z1, h, open] = n.deck, W = 'wood:#8f6b4b', k = new Kit(bat, 'site');
    k.box(W, x0, G + h - 0.25, z0, x1, G + h, z1);
    addFloorPoly([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], [], G + h, 'site');
    for (let x = x0 + 0.3; x <= x1; x += (x1 - x0 - 0.6) / Math.max(1, Math.round((x1 - x0) / 7))) for (const z of [z0 + 0.3, z1 - 0.3]) k.cbox(W, x, z, 0.45, 0.45, G, G + h);
    const rail = (ax, az, bx, bz) => {
      const L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
      k.box(TRIM, Math.min(ax, bx) - 0.1, G + h + 2.9, Math.min(az, bz) - 0.1, Math.max(ax, bx) + 0.1, G + h + 3.1, Math.max(az, bz) + 0.1);
      k.box(TRIM, Math.min(ax, bx) - 0.05, G + h + 0.3, Math.min(az, bz) - 0.05, Math.max(ax, bx) + 0.05, G + h + 0.45, Math.max(az, bz) + 0.05);
      for (let s = 0; s <= L; s += 0.55) k.cbox(TRIM, ax + ux * s, az + uz * s, 0.12, 0.12, G + h, G + h + 2.9);
      addSolid(V(Math.min(ax, bx) - 0.1, 0, Math.min(az, bz) - 0.1), V(Math.abs(bx - ax) + 0.2, 0, 0), V(0, 0, Math.abs(bz - az) + 0.2), G, G + h + 3.1, 'site');
    };
    if (open !== '-z') rail(x0, z0, x1, z0); if (open !== '+z') rail(x0, z1, x1, z1);
    if (open !== '-x') rail(x0, z0, x0, z1); if (open !== '+x') rail(x1, z0, x1, z1);
  }
  if (n.garden) { // white fence around a vegetable garden of raised cedar beds
    const [x0, z0, x1, z1] = n.garden, k = new Kit(bat, 'site');
    const fence = (ax, az, bx, bz) => {
      const L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
      for (const y of [0.5, 3.4]) k.box('railWhite', Math.min(ax, bx) - 0.06, G + y, Math.min(az, bz) - 0.06, Math.max(ax, bx) + 0.06, G + y + 0.25, Math.max(az, bz) + 0.06);
      for (let s = 0; s <= L; s += 0.6) k.cbox('railWhite', ax + ux * s, az + uz * s, 0.25, 0.25, G, G + 4.1);
      addSolid(V(Math.min(ax, bx) - 0.1, 0, Math.min(az, bz) - 0.1), V(Math.abs(bx - ax) + 0.2, 0, 0), V(0, 0, Math.abs(bz - az) + 0.2), G, G + 4, 'site');
    };
    fence(x0, z0, x1, z0); fence(x0, z1, x1, z1); fence(x0, z0, x0, z1); fence(x1, z0, x1, z1);
    for (let z = z0 + 3; z + 8 < z1 - 2; z += 10) for (const x of [x0 + 2.5, (x0 + x1) / 2 + 1]) { k.box('cedar', x, G, z, x + 4, G + 1.2, z + 8); k.box('col:#4a3628', x + 0.15, G + 0.9, z + 0.15, x + 3.85, G + 1.12, z + 7.85); }
  }
  if (n.play) { // cedar play set with a red slide and a green canopy
    const [px, pz] = n.play, k = new Kit(bat, 'site').at(px, pz, G, n.rot);
    for (const x of [-2.5, 2.5]) for (const z of [-2.5, 2.5]) k.cbox('cedar', x, z, 0.35, 0.35, 0, 9);
    k.box('cedar', -2.6, 4.6, -2.6, 2.6, 4.85, 2.6);
    k.prof('col:#3f7a3c', [[-3.0, 8.8], [3.0, 8.8], [0, 10.8]], -3, 3);
    bat.box('col:#d33a2c', k.P(-1, 4.7, 2.6), k.ez().multiplyScalar(8).add(V(0, -4.5, 0)), V(0, 0.2, 0), k.ex().multiplyScalar(2));
    k.box('cedar', 2.5, 7.6, -0.2, 10, 8.0, 0.2);
    for (const s of [-1, 1]) k.cbox('cedar', 9.8, s * 2.6, 0.3, 0.3, 0, 8);
    k.solid(-2.8, -2.8, 2.8, 2.8, 0, 9);
  }
}

// ------------------------------------------------------------------ distances
// Wall-to-wall distances from this house to each neighbor (closest points of the 1st-floor outlines), drawn as a
// dimension line on the ground with its label, plus a floating tag over each neighbor's roof; and the distance from
// the house to each lot line.
function segDist(a, b, c, d) { // closest points between segments ab and cd (2D, non-crossing)
  const ps = (p, s0, s1) => {
    const dx = s1[0] - s0[0], dz = s1[1] - s0[1], t = Math.max(0, Math.min(1, ((p[0] - s0[0]) * dx + (p[1] - s0[1]) * dz) / (dx * dx + dz * dz || 1)));
    return [s0[0] + dx * t, s0[1] + dz * t];
  };
  let best = null;
  for (const [p, s0, s1, swap] of [[a, c, d, 0], [b, c, d, 0], [c, a, b, 1], [d, a, b, 1]]) {
    const q = ps(p, s0, s1), dd = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (!best || dd < best.d) best = swap ? { d: dd, pa: q, pb: p } : { d: dd, pa: p, pb: q };
  }
  return best;
}
function polyDist(A, B) {
  let best = null;
  for (let i = 0; i < A.length; i++) for (let j = 0; j < B.length; j++) {
    const r = segDist(A[i], A[(i + 1) % A.length], B[j], B[(j + 1) % B.length]);
    if (!best || r.d < best.d) best = r;
  }
  return best;
}
function tagSprite(lines, x, y, z, w) {
  const c = document.createElement('canvas'), g0 = c.getContext('2d');
  g0.font = '600 64px Inter, system-ui, sans-serif'; let tw = g0.measureText(lines[0]).width;
  g0.font = '500 44px Inter, system-ui, sans-serif'; if (lines[1]) tw = Math.max(tw, g0.measureText(lines[1]).width);
  c.width = Math.ceil(tw + 70); c.height = lines.length > 1 ? 200 : 120; w *= c.width / 640;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(20,24,28,0.72)';
  g.beginPath(); g.roundRect(4, 4, c.width - 8, c.height - 8, 26); g.fill();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#ffffff'; g.font = '600 64px Inter, system-ui, sans-serif';
  g.fillText(lines[0], c.width / 2, lines.length > 1 ? 66 : c.height / 2);
  if (lines[1]) { g.fillStyle = 'rgba(255,255,255,0.8)'; g.font = '500 44px Inter, system-ui, sans-serif'; g.fillText(lines[1], c.width / 2, 142); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(w, (w * c.height) / c.width, 1);
  s.position.set(x, y, z);
  s.renderOrder = 2;
  return s;
}
// which part of this house a point on its outline belongs to (for the labels)
function ourSide(x, z) {
  if (x <= 0.6 && z > 25 && z < 40) return 'our kitchen bump';
  if (x <= 3) return 'our NE wall';
  if (x >= 57) return 'our garage';
  if (z <= 3) return 'our family room';
  if (z <= 15) return 'our back wall';
  if (z >= 52) return 'our front';
  return 'our house';
}
export const NEIGHBOR_DISTANCES = [];
function buildDistances(grp) {
  const bat = new Batcher();
  const ours = LEVELS.find((l) => l.id === 'f1').footprint[0].map((q) => toFt(q));
  const strip = (ax, az, bx, bz, w, y = G + 0.16) => {
    const L = Math.hypot(bx - ax, bz - az), nx = (-(bz - az) / L) * w / 2, nz = ((bx - ax) / L) * w / 2;
    bat.face('col:#ffffff', [V(ax + nx, y, az + nz), V(bx + nx, y, bz + nz), V(bx - nx, y, bz - nz), V(ax - nx, y, az - nz)], V(0, 1, 0));
  };
  const dimLine = (pa, pb, text) => {
    const [ax, az] = pa, [bx, bz] = pb, L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
    strip(ax, az, bx, bz, 0.25);
    for (const [px, pz] of [pa, pb]) strip(px - uz * 1.6, pz + ux * 1.6, px + uz * 1.6, pz - ux * 1.6, 0.25);
    // label: along the line when it's long, across it in narrow side yards; never upside down from the street
    let dx = ux, dz = uz;
    if (L < 34) { dx = -uz; dz = ux; }
    if (dx - dz < 0) { dx = -dx; dz = -dz; }
    const tw = Math.max(16, text.length * 1.75), th = 3.6;
    const off = L < 34 ? 0 : 2.6;
    grp.add(groundText(text, (ax + bx) / 2 - dz * off, (az + bz) / 2 + dx * off, tw, th, Math.atan2(-dz, dx), 'rgba(255,255,255,0.95)'));
  };
  NEIGHBOR_DISTANCES.length = 0;
  for (const n of NEIGHBORS) {
    if (!n.dist) continue;
    const polys = neighborPolys(n);
    let best = null;
    for (const poly of polys) { const r = polyDist(ours, poly); if (!best || r.d < best.d) best = r; }
    const ft = Math.round(best.d), side = ourSide(...best.pa);
    NEIGHBOR_DISTANCES.push({ name: n.name, ft, from: side });
    dimLine(best.pa, best.pb, `${n.name}: ${ft} ft`);
    const all = polys.flat(), cx = all.reduce((a, p) => a + p[0], 0) / all.length, cz = all.reduce((a, p) => a + p[1], 0) / all.length;
    const top = Math.max(...n.parts.map((q) => ridgeOf(q)));
    grp.add(tagSprite([`${n.name} · ${ft} ft away`, `wall to wall, from ${side}`], cx, G + top + 7, cz, 24));
  }
  // house to the lot lines
  const xs = ours.map((q) => q[0]), zs = ours.map((q) => q[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  const lotLbl = (text, x, z, rot) => grp.add(groundText(text, x, z, 22, 2.6, rot, 'rgba(255,255,255,0.85)'));
  lotLbl(`${Math.round(x0 - LOT.xSouth)} ft to the lot line`, (x0 + LOT.xSouth) / 2 - 0.2, 18, Math.PI / 2);
  lotLbl(`${Math.round(LOT.xNorth - x1)} ft to the lot line`, LOT.xNorth - 2.5, 4, Math.PI / 2);
  lotLbl(`${Math.round(z0 - LOT.zBack)} ft to the rear lot line`, 24, LOT.zBack + 4, 0);
  lotLbl(`${Math.round(LOT.zFront - z1)} ft to the front lot line`, 70, LOT.zFront - 3, 0);
  bat.build(grp, { shadows: false });
}

// ------------------------------------------------------------------ site
export function buildSite() {
  const group = new THREE.Group();
  const bat = new Batcher();
  const OFF = {};
  const off = (rs) => (OFF[rs] = OFF[rs] || new Batcher());
  const F = (x, y) => toFt([x, y]);
  // ground (with a hole where the basement is) on both sides of the street
  const sz0 = STREET.curb, sz1 = sz0 + STREET.width, [sw0, sw1] = STREET.sidewalk;
  const bLevel = LEVELS.find((l) => l.id === 'b');
  const holes = [bLevel.footprint[0].map(([x, y]) => toFt(bLevel.map(x, y)))];
  const W = 420;
  const near = [[-W, -W], [W, -W], [W, sz0], [-W, sz0]], far = [[-W, sz1], [W, sz1], [W, W], [-W, W]];
  bat.poly('grass', near, G, holes); bat.poly('grass', far, G);
  addFloorPoly(near, holes, G, 'site'); addFloorPoly(far, [], G, 'site');

  // street (Creekside Ln: ~30 ft concrete, joints), curbs, terrace, public sidewalks on both sides
  bat.poly('concrete', [[-W, sz0], [W, sz0], [W, sz1], [-W, sz1]], G - 0.3);
  for (const zc of [sz0, sz1]) bat.aabox('col:#c4c1b8', -W, G - 0.3, zc - (zc === sz0 ? 0.6 : 0), W, G + 0.05, zc + (zc === sz0 ? 0 : 0.6));
  for (let x = -W + 6; x < W; x += 15) bat.aabox('col:#8f8c86', x - 0.04, G - 0.295, sz0, x + 0.04, G - 0.29, sz1);
  bat.aabox('col:#8f8c86', -W, G - 0.295, (sz0 + sz1) / 2 - 0.04, W, G - 0.29, (sz0 + sz1) / 2 + 0.04);
  for (const [a, b] of [[sw0, sw1], [sz1 + 6, sz1 + 10.5]]) {
    bat.poly('paving', [[-W, a], [W, a], [W, b], [-W, b]], G + 0.03);
    addFloorPoly([[-W, a], [W, a], [W, b], [-W, b]], [], G + 0.03, 'site');
    for (let x = -W; x < W; x += 5) bat.aabox('col:#a9a59d', x - 0.03, G + 0.031, a, x + 0.03, G + 0.035, b);
  }
  addFloorPoly([[-W, sz0], [W, sz0], [W, sz1], [-W, sz1]], [], G - 0.3, 'site');

  // Boxelder Ln (T off Creekside past 1252, bending SE) and Chickadee Ln behind us: 33 ft streets with grass terraces
  // and sidewalks, drawn on the grade (their curb lines are not modeled)
  const offsetLine = (pts, d) => pts.map((q, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [q[0] - ((b[1] - a[1]) / l) * d, q[1] + ((b[0] - a[0]) / l) * d];
  });
  for (const [key, line] of Object.entries(STREETS)) {
    const pts = curve(line, line.length * 8);
    ribbon(bat, 'concrete', pts, STREET.width, G + 0.06);
    for (const s of [-1, 1]) { ribbon(bat, 'col:#c4c1b8', offsetLine(pts, s * (STREET.width / 2 + 0.3)), 0.6, G + 0.1); ribbon(bat, 'paving', offsetLine(pts, s * (STREET.width / 2 + 7.75)), 4.5, G + 0.07); }
    const m = pts[Math.round(pts.length * (key === 'boxelder' ? 0.3 : 0.45))], nx = pts[Math.round(pts.length * (key === 'boxelder' ? 0.3 : 0.45)) + 1];
    group.add(groundText(key.toUpperCase() + ' LN', m[0], m[1], 50, 6, Math.atan2(-(nx[1] - m[1]), nx[0] - m[0]) + (key === 'boxelder' ? Math.PI : 0), 'rgba(255,255,255,0.8)'));
  }
  // needle litter under the conifers, the lawn left as a clearing in front of them; the red-mulch bed curving past
  // the spruce band (aerial 59)
  bat.poly('col:#3b4128', GROUND.duff, G + 0.03);
  { const bed = curve(GROUND.redBed, 40); ribbon(bat, 'col:#8f3e2e', bed, 3.2, G + 0.06); }

  // driveway: from the street straight along the SW side of the house, widening into the apron at the
  // side-load garage doors and running a few feet past the garage's back corner (aerials 58, 64; photos 44, 62)
  const [gx] = F(987.5, 0), [, gzB] = F(0, 378.5), [, gzF] = F(0, 722.5);
  const dx0 = gx + 0.12, dx1 = 79, ax1 = 80.5, dzB = gzB - 12; // the aerial shows the slab ~12 ft past the garage's back corner
  const drive = rounded([[dx0 - 2.2, sz0], [dx0, sz0 - 2.2, 2.2], [dx0, gzB - 2.5, 3], [dx0 + 4, dzB, 4], [ax1, dzB, 5], [ax1, gzF - 2, 4], [dx1, gzF + 6, 4], [dx1, sz0 - 2.2, 2.2], [dx1 + 2.2, sz0]]);
  bat.poly('paving', drive, G + 0.04);
  addFloorPoly(drive, [], G + 0.04, 'site');
  for (let z = gzB - 8; z < sz0 - 3; z += 11) bat.aabox('col:#aaa69e', dx0, G + 0.041, z - 0.04, z < gzF ? ax1 - 0.5 : dx1, G + 0.046, z + 0.04);
  bat.aabox('col:#aaa69e', (dx0 + dx1) / 2 - 0.04, G + 0.041, gzF + 4, (dx0 + dx1) / 2 + 0.04, G + 0.046, sz0 - 1);
  bat.aabox('col:#aaa69e', (dx0 + ax1) / 2 - 0.04, G + 0.041, dzB + 1, (dx0 + ax1) / 2 + 0.04, G + 0.046, gzF);

  // front stoop (one step) and the walk curving from it along the garage front to the driveway at the brick pier
  const [doorX, porchZ] = F(517, 566.5);
  const stX0 = F(477, 0)[0] + 0.62, stX1 = 22.7;
  { const k = new Kit(bat, 'site'); k.box({ pv: 'paving', def: 'foundation' }, stX0, G, porchZ, stX1, -0.35, porchZ + 4.4); k.box({ pv: 'paving', def: 'foundation' }, stX0 + 0.6, G, porchZ + 4.4, stX1 - 0.4, -0.68, porchZ + 5.6); }
  addFloorPoly([[stX0, porchZ], [stX1, porchZ], [stX1, porchZ + 4.4], [stX0, porchZ + 4.4]], [], -0.35, 'site');
  addFloorPoly([[stX0 + 0.6, porchZ + 4.4], [stX1 - 0.4, porchZ + 4.4], [stX1 - 0.4, porchZ + 5.6], [stX0 + 0.6, porchZ + 5.6]], [], -0.68, 'site');
  const walk = curve([[doorX + 0.6, porchZ + 5.3], [doorX + 2.6, gzF + 1.2], [doorX + 9, gzF + 5.0], [36, gzF + 5.5], [48, gzF + 5.3], [dx0 + 1.5, gzF + 5.0]], 36);
  ribbon(bat, 'paving', walk, 4, G + 0.045);

  // existing concrete patio off the dining slider, past the NE corner (photos 45, 46, 59), with two steps up to
  // the slider; replaced by the bigger patio option
  {
    const pb = off('off:patio');
    const patio = rounded([[-3.2, 13.9], [15.4, 13.9], [15.4, 2.6], [-0.4, 2.6, 2], [-3.2, 5.4]]);
    pb.prism({ top: 'paving', side: 'foundation' }, patio, G, -0.96);
    addFloorPoly(patio, [], -0.96, 'off:patio');
    const [sx0] = F(358, 0), [sx1] = F(434, 0), [, sz] = F(0, 197.5);
    const k = new Kit(pb, 'off:patio');
    k.box({ pv: 'paving', def: 'foundation' }, sx0, -0.96, sz - 2.6, sx1, -0.66, sz); k.box({ pv: 'paving', def: 'foundation' }, sx0 + 0.4, -0.66, sz - 1.3, sx1 - 0.4, -0.33, sz);
    addFloorPoly([[sx0, sz - 2.6], [sx1, sz - 2.6], [sx1, sz - 1.3], [sx0, sz - 1.3]], [], -0.66, 'off:patio');
    addFloorPoly([[sx0 + 0.4, sz - 1.3], [sx1 - 0.4, sz - 1.3], [sx1 - 0.4, sz], [sx0 + 0.4, sz]], [], -0.33, 'off:patio');
  }
  // mulch beds (front photos 04, 42): around the bay tower, between the stoop and the garage, along the garage front
  const bed = (pts) => bat.poly('mulch', pts, G + 0.05);
  const [tx0] = F(323.5, 0), [tx1] = F(477, 0), [, tzF] = F(0, 677), [ex1] = F(700, 0);
  bed(rounded([[tx0 - 2.5, F(0, 600)[1]], [tx0 - 2.5, tzF + 4.8, 3], [stX0, tzF + 4.8, 1.5], [stX0, porchZ]]));
  bed(rounded([[stX1, porchZ], [ex1 + 0.3, porchZ], [ex1 + 0.3, gzF], [doorX + 6.5, gzF + 2.2, 4], [stX1, porchZ + 5.6]]));
  bed([[ex1 + 0.3, gzF], [gx - 1.2, gzF], [gx - 1.2, gzF + 3.4], [ex1 + 0.3, gzF + 3.4]]);
  bed(rounded([[gx - 3.6, gzF + 3.4], [dx0 - 0.1, gzF + 3.4], [dx0 - 0.1, gzF + 7.2], [gx - 4.2, gzF + 7.2, 1]]));
  // raised cedar vegetable bed and a firewood rack in the back yard (photo 47)
  { const k = new Kit(bat, 'site').at(5, -23, G, 25); k.box('cedar', -4, 0, -2, 4, 0.85, 2); k.box('col:#4a3628', -3.85, 0.6, -1.85, 3.85, 0.78, 1.85); k.solid(-4, -2, 4, 2, 0, 0.85); }
  { const k = new Kit(bat, 'site').at(-2.5, -27, G, 70);
    for (const x of [-2.2, 2.2]) for (const z of [-0.6, 0.6]) k.box('cedar', x - 0.12, 0, z - 0.12, x + 0.12, 5.6, z + 0.12);
    k.box('cedar', -2.3, 0.2, -0.7, 2.3, 0.4, 0.7);
    for (let y = 0.45; y < 3.6; y += 0.42) for (let x = -2.0; x < 2.0; x += 0.45) k.cyl('col:#7a5a3c', x + 0.22, (Math.round(y * 10) % 2) * 0.05, 0.2, 0.2, y, y + 0.4, 6);
    k.solid(-2.4, -0.8, 2.4, 0.8, 0, 5.6); }
  // AC condenser on its pad against the office's back wall, left of its window (photos 02, 45): 29" x 29" x 31"
  { const [x, z] = F(820, 182); const k = new Kit(bat, 'site').at(x, z, G, 0);
    k.cbox('col:#9a9893', 0, 0, 3.2, 3.2, 0, 0.3); k.cbox('col:#3b3d3e', 0, 0, 2.4, 2.4, 0.3, 2.85); k.cbox('col:#2a2b2c', 0, 0, 2.5, 2.5, 2.85, 2.95);
    for (let y = 0.55; y < 2.7; y += 0.18) k.cbox('col:#4a4c4d', 0, 0, 2.43, 2.43, y, y + 0.05);
    k.cyl('col:#1d1d1e', 0, 0, 0.85, 0.85, 2.95, 2.98, 16);
    k.box('col:#7d7a73', -0.3, 1.2, 1.2, -0.1, 1.4, 2.6); k.solid(-1.6, -1.6, 1.6, 1.6, 0, 2.95); }
  // downspouts at the gutter corners (photos 02, 04, 44, 45, 61), with short splash extensions
  for (const [px, py, top, ex, ez] of [[323.5, 197.5, 16.8, 0, -1], [474, 57.5, 9.7, 0, -1], [701.5, 57.5, 9.7, 0, -1], [839.5, 197.5, 16.8, 1, 0],
    [987.5, 378.5, 8.9, 1, 0], [700, 722.5, 8.9, 0, 1], [292, 351.5, 9.0, -1, 0], [323.5, 656.5, 16.8, -1, 0], [478.5, 566, 16.8, -0.5, 1]]) {
    const [x, z] = F(px, py), sx = px > 600 ? 0.35 : -0.35, szz = py > 400 ? 0.35 : -0.35;
    const cx = px === 478.5 ? x + 0.75 : x + sx, cz = px === 478.5 ? z + 0.1 : z + szz;
    bat.aabox('gutter', cx - 0.13, G + 0.25, cz - 0.13, cx + 0.13, top, cz + 0.13);
    const L = 3.2, el = Math.hypot(ex, ez);
    bat.box('gutter', V(cx - 0.13, G + 0.08, cz - 0.13), V((ex / el) * L, 0, (ez / el) * L), V(0, 0.26, 0), V(0.26 * Math.abs(ez / el), 0, 0.26 * Math.abs(ex / el)).add(V(0, 0, 0)));
  }
  // lamp post by the front walk (photo 62), house number plaque on the garage-front brick (photo 04),
  // fire hydrant in the terrace past the driveway (photos 49, 63)
  { const k = new Kit(bat, 'site').at(52.5, 67.5, G);
    k.cyl('black', 0, 0, 0.3, 0.3, 0, 0.5, 8); k.cyl('black', 0, 0, 0.12, 0.1, 0.5, 6.2, 8); k.cyl('black', 0, 0, 0.2, 0.14, 6.2, 6.5, 8);
    k.cyl('frosted', 0, 0, 0.36, 0.42, 6.5, 7.6, 6); k.cyl('black', 0, 0, 0.5, 0.05, 7.6, 8.15, 6); k.cyl('black', 0, 0, 0.04, 0.04, 8.1, 8.4, 4);
    k.solid(-0.3, -0.3, 0.3, 0.3, 0, 8); }
  { const [x, z] = F(964, 722.5); const k = new Kit(bat, 'site').at(x, z + 0.6, 0);
    k.box('col:#f1ede3', -0.55, 1.5, 0, 0.55, 1.95, 0.05); k.box('black', -0.45, 1.57, 0.05, 0.45, 1.88, 0.07); }
  { const k = new Kit(bat, 'site').at(80.5, sw1 + 2.3, G);
    k.cyl('col:#c2271d', 0, 0, 0.42, 0.42, 0, 0.25, 10); k.cyl('col:#c2271d', 0, 0, 0.3, 0.3, 0.25, 2.3, 10); k.cyl('col:#c2271d', 0, 0, 0.36, 0.1, 2.3, 2.75, 10);
    k.box('col:#c2271d', -0.55, 1.6, -0.12, 0.55, 1.85, 0.12); k.cyl('col:#d9d6cf', 0, 0.36, 0.17, 0.17, 1.35, 1.75, 8); k.solid(-0.4, -0.4, 0.4, 0.4, 0, 2.7); }
  // white vinyl picket fence along the NE lot line, from the side yard to the back (photos 02, 42, 45)
  { const k = new Kit(bat, 'site'), x = LOT.xSouth + 0.3, z0 = LOT.zBack + 1, z1 = 38;
    k.box('railWhite', x - 0.08, G + 0.35, z0, x + 0.08, G + 0.65, z1); k.box('railWhite', x - 0.08, G + 3.0, z0, x + 0.08, G + 3.3, z1);
    for (let z = z0; z < z1; z += 0.5) k.box('railWhite', x - 0.05, G, z, x + 0.05, G + 3.9, z + 0.3);
    for (let z = z0; z < z1; z += 8) { k.box('railWhite', x - 0.22, G, z, x + 0.22, G + 4.4, z + 0.44); k.box('railWhite', x - 0.27, G + 4.4, z - 0.05, x + 0.27, G + 4.55, z + 0.49); }
    addSolid(V(x - 0.15, 0, z0), V(0.3, 0, 0), V(0, 0, z1 - z0), G, G + 4, 'site'); }
  // the neighbor's little gabled playhouse just over the fence (photos 02, 45, 64)
  neighbor(bat, { name: '', x: -13.5, z: -11, rot: 0, wall: '#cbb79a', roof: 'shingle:n', parts: [[-3, -3, 3, 3, 6.5, 'gz', 1]] });
  // neighboring houses (measured on aerial 59, forms from the oblique 60) with their drives, patios and decks
  for (const n of NEIGHBORS) neighbor(bat, n);

  // lot lines, distances to the lot lines and to the neighbors' houses (the "Lot lines" toggle shows / hides them all)
  const lotG = new THREE.Group();
  lotG.name = 'lotLines';
  const lotPts = [[LOT.xSouth, LOT.zBack], [LOT.xNorth, LOT.zBack], [LOT.xNorth, LOT.zFront], [LOT.xSouth, LOT.zFront], [LOT.xSouth, LOT.zBack]];
  const lineGeo = new THREE.BufferGeometry().setFromPoints(lotPts.map(([x, z]) => V(x, G + 0.15, z)));
  const lot = new THREE.Line(lineGeo, new THREE.LineDashedMaterial({ color: '#ffffff', dashSize: 3, gapSize: 2, transparent: true, opacity: 0.9 }));
  lot.computeLineDistances();
  lotG.add(lot);
  buildDistances(lotG);
  group.add(lotG);
  group.add(groundText('CREEKSIDE LN', 30, (sz0 + sz1) / 2 + 6, 60, 7, 0, 'rgba(255,255,255,0.85)'));
  // north arrow: local direction of north is (cos(-X_AZ), sin(-X_AZ)) in (x, z); the text's +x runs (cos r, -sin r)
  group.add(groundText('N →', LOT.xSouth - 14, LOT.zFront - 8, 14, 7, (X_AZ * Math.PI) / 180, 'rgba(255,255,255,0.9)'));

  bat.build(group);
  group.userData.renos = Object.entries(OFF).map(([rs, b]) => { const g = new THREE.Group(); g.userData.rs = rs; b.build(g); group.add(g); return g; });

  // ---------------------------------------------------------------- trees & planting
  const trees = new THREE.Group();
  trees.name = 'trees';
  const P = new Plants();
  // trees from the aerial (TREES in data.js), full detail around the lot, lighter further out
  TREES.forEach(([kind, x, z, h, R0], i) => {
    let R = R0;
    const d = Math.hypot(x - 39, z - 15), lod = d < 105 ? 1 : d < 170 ? 0.5 : 0.32;
    if (kind === 'spruce' || kind === 'blue') return spruce(P, x, z, h, { blue: kind === 'blue', R: h * 0.26, lod, seed: 101 + i * 7 }); // Norway spruce: ~25-30 ft spread at 50 ft
    R *= 1.12; // the crowns render a little inside R; this matches the canopy sizes measured on the aerial
    const o = { h, R, seed: 11 + i * 13, lod, trunk: Math.max(2, h * 0.2), rt: 0.25 + R * 0.045, leaders: R > 10 ? 4 : 3 };
    if (kind === 'mapleRed') Object.assign(o, { trunk: 9, leaders: 5, seed: 11, rt: 1.0, leaves: ['maple:mapleRed', 'maple:mapleRed', 'maple:mapleGreen'], lean: [0.6, 0.4] });
    else if (kind === 'mapleOrange') Object.assign(o, { trunk: 10, seed: 23, rt: 0.9, leaves: ['maple:mapleOrange', 'maple:mapleRed', 'maple:mapleOrange'] });
    else if (kind === 'locust') Object.assign(o, { trunk: h * 0.27, leaves: ['oval:locust', 'oval:linden'], card: R * 0.22, density: 0.9 });
    else if (kind === 'linden') Object.assign(o, { leaves: ['oval:linden'], card: Math.max(1.8, R * 0.22) });
    else if (kind === 'oak') Object.assign(o, { leaves: ['oval:oak', 'maple:mapleGreen'], card: R * 0.22 });
    else if (kind === 'purple') Object.assign(o, { leaves: ['maple:purple'], core: '#2a1a1e' });
    else if (kind === 'shrubTree') Object.assign(o, { trunk: 1.5, leaders: 3, rt: 0.2, leaves: ['oval:shrub'], card: 1.4, density: 2 });
    else o.leaves = ['maple:mapleGreen'];
    shadeTree(P, x, z, o);
  });
  // columnar arborvitae along the SW line by the apron (photos 49, 63, 64)
  for (const [z, h] of [[18, 19], [23.5, 21], [29, 20], [34.5, 18]]) arborvitae(P, 83, z, h, Math.round(z * 3));
  // yews flanking the chimney (photos 03, 45), small shrubs in the garage-front bed (photo 04)
  { // (the bigger-patio option paves over these two)
    const Y = new Plants(), yg = new THREE.Group(); yg.userData.rs = 'off:patio';
    shrub(Y, F(516, 0)[0], -0.6, 6.4, 5.0, 'yew', 7); shrub(Y, F(662, 0)[0], -0.7, 6.6, 4.9, 'yew', 9);
    Y.build(yg); group.add(yg); group.userData.renos.push(yg);
  }
  for (const [x, w, h] of [[F(724, 0)[0], 1.5, 1.2], [F(770, 0)[0], 1.7, 1.4], [F(835, 0)[0], 1.4, 1.1], [F(890, 0)[0], 1.6, 1.3], [F(940, 0)[0], 1.5, 1.2]]) shrub(P, x, gzF + 1.3, w, h, 'shrub');
  shrub(P, gx - 2.6, gzF + 5.2, 2.4, 1.7, 'yew', 15);
  P.build(trees);
  group.add(trees);

  // Classic refresh landscaping (AI rendering 57): white hydrangeas + clipped boxwoods in the front beds, a small
  // ornamental tree at the garage corner, warm path lights along the walk and uplights at the tower
  const classic = new THREE.Group();
  classic.userData.rs = 'on:classic';
  const C = new Plants();
  const flowerMat = new THREE.MeshStandardMaterial({ color: '#f3f0e3', roughness: 0.85, emissive: '#3a372e', emissiveIntensity: 0.12 });
  const glow = new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: '#ffbf66', emissiveIntensity: 1.2 });
  const blk = new THREE.MeshStandardMaterial({ color: '#1c1c1d', roughness: 0.5 });
  const heads = [];
  const hydrangea = (x, z, w = 3.6, h = 3.4) => { // 'Annabelle'-type: ~3.5 ft mound, 7-9" flower heads
    [x, z] = shrub(C, x, z, w, h, 'hydrangea');
    const r = rng(Math.round(x * 31 + z * 17) + 5);
    for (let i = 0; i < 26; i++) { // 6-9" heads, slightly domed, sitting just proud of the leaf mound
      const d = rndDir(r); d.y = Math.abs(d.y) * 0.8 + 0.15; d.normalize();
      const s = 0.24 + r() * 0.1, g = new THREE.IcosahedronGeometry(s, 2);
      const pp = g.attributes.position; for (let j = 0; j < pp.count; j++) { const k = 1 + (hash3(pp.getX(j) * 9, pp.getY(j) * 9, pp.getZ(j) * 9) - 0.5) * 0.35; pp.setXYZ(j, pp.getX(j) * k, pp.getY(j) * k * 0.8, pp.getZ(j) * k); }
      g.computeVertexNormals();
      g.translate(x + d.x * w * 0.47, G + h * 0.5 + d.y * h * 0.5, z + d.z * w * 0.47); heads.push(g);
    }
  };
  const boxwood = (x, z, s = 2.2) => shrub(C, x, z, s, s * 0.85, 'box');
  const [ex0] = F(477, 0);
  for (let x = tx0 + 0.6, i = 0; x < tx1 - 0.5; x += 3.2, i++) (i % 2 ? boxwood : hydrangea)(x, tzF + 3, 2.8, 2.8);
  for (let x = stX1 + 2.0, i = 0; x < ex1 - 1.5; x += 3.3, i++) (i % 2 ? boxwood : hydrangea)(x, porchZ + 3.0 + (x - stX1) * 0.12, 2.6, 2.6);
  for (let x = ex1 + 2.2, i = 0; x < gx - 3.6; x += 3.1, i++) (i % 2 ? hydrangea : boxwood)(x, gzF + 1.6, 1.7, 1.7);
  // ornamental tree (serviceberry-like, ~14 ft) at the garage's front corner bed
  shadeTree(C, gx - 4.5, gzF + 9.5, { h: 14, R: 4.5, trunk: 3, leaders: 3, seed: 77, rt: 0.22, leaves: ['oval:linden'], card: 1.8, density: 2.0 });
  C.build(classic);
  if (heads.length) { const m = new THREE.Mesh(mergeGeometries(heads), flowerMat); m.castShadow = true; m.receiveShadow = true; classic.add(m); }
  void ex0;
  // path lights along both sides of the walk (~20" tall)
  for (let i = 3; i < walk.length - 2; i += 5) {
    const [ax, az] = walk[i - 1], [bx, bz] = walk[i + 1], l = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / l, nz = (bx - ax) / l;
    const sgn = i % 10 === 3 ? -1 : 1;
    const x = walk[i][0] + nx * 2.7 * sgn, z = walk[i][1] + nz * 2.7 * sgn;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.45, 6), blk); post.position.set(x, G + 0.72, z); classic.add(post);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.16, 0.14, 8), blk); cap.position.set(x, G + 1.6, z); classic.add(cap);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.16, 8), glow); lamp.position.set(x, G + 1.45, z); classic.add(lamp);
  }
  // uplights at the tower piers
  for (const [px, py] of [[340, 660], [458, 660]]) { const [x, z] = F(px, py + 12); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.3, 8), glow); m.position.set(x, G + 0.15, z); classic.add(m); }
  group.add(classic);
  group.userData.renos.push(classic);
  return group;
}
