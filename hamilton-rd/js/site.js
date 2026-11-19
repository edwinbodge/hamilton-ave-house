// Lot, landscaping and context for Hamilton Rd. House frame (feet): +x = plan right (southeast, the garage/driveway
// side), +z = plan down = toward Hamilton Rd (southwest), y = up. The ground is flat at -1 in front and slopes down
// along both sides to the walk-out level (-9.6) behind the house (photos 67-74).
// Positions come from the satellite view and the listing's drone photos (80-84): long driveway from Hamilton Rd that
// sweeps around the garage front to the side-load apron, the deck off the great room, a pond and lawn in the back,
// woods all around and an open field past the northwest line.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { LEVELS, LOT, STREET, NEIGHBORS, toFt, groundAt, GROUND, H, CHIMNEYS } from './data.js';
import { Batcher, Kit, V, addFloorPoly, addSolid, pip } from './geom.js';

let G = -1; // ground elevation under the thing being built (trees, shrubs and neighbors read it); see onGround()

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
  const r = rng(o.seed || 1), h = o.h, R = o.R, base = o.trunk ?? h * 0.22, names = o.leaves;
  const rt = o.rt ?? 0.35 + h * 0.012;
  const top = V(x + (o.lean?.[0] || 0), G + base, z + (o.lean?.[1] || 0));
  P.limb(V(x, G - 0.3, z), top, rt * 1.25, rt * 0.85, 9);
  const crownC = V(top.x, G + base + (h - base) * 0.55, top.z), Ry = (h - base) * 0.5;
  const nL = o.leaders || 4, ends = [];
  for (let i = 0; i < nL; i++) {
    const a = (i / nL) * Math.PI * 2 + r() * 0.8, rr = R * (0.35 + r() * 0.3);
    const end = V(top.x + Math.cos(a) * rr, crownC.y + Ry * (0.05 + r() * 0.35), top.z + Math.sin(a) * rr);
    P.limb(top, end, rt * 0.6, rt * 0.25, 6);
    ends.push(end);
    for (let j = 0; j < 2; j++) { // secondary limbs reaching toward the crown shell
      const mid = top.clone().lerp(end, 0.45 + r() * 0.3), b = rndDir(r); b.y = Math.abs(b.y) * 0.6 + 0.2;
      P.limb(mid, mid.clone().add(V(b.x * R * 0.55, b.y * Ry * 0.6, b.z * R * 0.55)), rt * 0.28, rt * 0.08, 5);
    }
  }
  const coreCol = o.core || '#2f3d22';
  const clumps = [...ends.map((e) => e.clone().add(V(0, Ry * 0.15, 0))), crownC.clone().add(V(0, Ry * 0.45, 0))];
  for (let i = 0; i < 3; i++) { const d = rndDir(r); d.y = d.y * 0.4 - 0.1; clumps.push(crownC.clone().add(V(d.x * R * 0.55, d.y * Ry, d.z * R * 0.55))); }
  for (const c of clumps) {
    const cr = R * (0.48 + r() * 0.16), cry = Ry * (0.5 + r() * 0.15);
    clump(P, names, r, c, cr, cry, cr, Math.round((cr * cr) * (o.density || 1.05) * 1.1), o.card || Math.max(3.2, R * 0.24), crownC, { tint: o.tint, dark: 0.42, lit: 1.05 });
    blobCluster(P, names[Math.floor(r() * names.length)].split(':')[1], r, c, cr * 0.95, cry * 0.95, cr * 0.95, 11, { dark: 0.4, jit: 0.34, s0: 0.45, s: 0.26, spread: 0.45, bright: 1.18 });
  }
  addSolid(V(x - rt, 0, z - rt), V(rt * 2, 0, 0), V(0, 0, rt * 2), G, G + base, 'site');
}
// conifer (Norway / Colorado blue spruce): whorls of drooping fronds down to the ground
function spruce(P, x, z, h, o = {}) {
  const r = rng(o.seed || Math.round(x * 13 + z * 7 + 99)), R = o.R ?? h * 0.2, kind = o.blue ? 'blue' : 'spruce';
  const name = 'frond:' + kind, skirt = o.skirt ?? 0.5;
  P.limb(V(x, G - 0.3, z), V(x, G + h, z), 0.25 + h * 0.008, 0.05, 6);
  for (let y = skirt; y < h - 1.2; y += 1.25 + r() * 0.5) {
    const t = y / h, rad = R * Math.pow(1 - t, 0.92) * (0.85 + r() * 0.25) + 0.4;
    const nb = Math.max(5, Math.round(rad * 2.2));
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
  for (let y = skirt + 0.6, i = 0; y < h - 1.5; y += 1.35 + r() * 0.5, i++) {
    const t = y / h, rad = (R * Math.pow(1 - t, 0.92) + 0.4) * (0.92 + r() * 0.16);
    spruceTier(P, kind, r, x + (r() - 0.5) * 0.5, z + (r() - 0.5) * 0.5, G + y + 1.4 + rad * 0.15, G + y - rad * 0.5, rad, t);
  }
  addSolid(V(x - 0.7, 0, z - 0.7), V(1.4, 0, 0), V(0, 0, 1.4), G, G + h, 'site');
}
function spruceTier(P, species, r, x, z, yTop, yBot, rad, t) {
  const seg = 28, g = new THREE.ConeGeometry(rad, yTop - yBot, seg, 3, true);
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
const DECK_PX = [[165, 171], [433, 171], [433, 102], [475, 58], [475, -30], [165, -30]];
const housePolys = () => HOUSE_POLYS || (HOUSE_POLYS = [
  LEVELS.find((l) => l.id === 'f1').footprint[0].map((q) => toFt(q)),
  [[CHIMNEYS[0].px[0], CHIMNEYS[0].px[1]], [CHIMNEYS[0].px[2], CHIMNEYS[0].px[1]], [CHIMNEYS[0].px[2], CHIMNEYS[0].px[3]], [CHIMNEYS[0].px[0], CHIMNEYS[0].px[3]]].map((q) => toFt(q)),
  DECK_PX.map((q) => toFt(q)),
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
// simple houses: body + roof ('gx' gable with ridge along x, 'gz' ridge along z, 'hip'), siding color, windows
function house(bat, o) {
  const { x0, z0, x1, z1, eave, ridge } = o;
  const k = new Kit(bat, 'site');
  k.box('col:' + o.wall, x0, G, z0, x1, G + eave, z1);
  k.box('foundation', x0 - 0.05, G, z0 - 0.05, x1 + 0.05, G + 0.6, z1 + 0.05);
  const rc = 'col:' + (o.roof || '#5b6066'), ov = 1.2, ye = G + eave, yr = G + ridge;
  const a0 = V(x0 - ov, ye, z0 - ov), a1 = V(x1 + ov, ye, z0 - ov), a2 = V(x1 + ov, ye, z1 + ov), a3 = V(x0 - ov, ye, z1 + ov);
  const xm = (x0 + x1) / 2, zm = (z0 + z1) / 2;
  if (o.type === 'gx') { // ridge along x, gable ends at x0 / x1
    const r0 = V(x0 - ov, yr, zm), r1 = V(x1 + ov, yr, zm);
    bat.face(rc, [a0, a1, r1, r0], V(0, 1, -1)); bat.face(rc, [a3, a2, r1, r0], V(0, 1, 1));
    for (const x of [x0, x1]) bat.face('col:' + o.wall, [V(x, ye, z0), V(x, ye, z1), V(x, yr - 0.6, zm)], V(x === x0 ? -1 : 1, 0, 0));
  } else if (o.type === 'gz') {
    const r0 = V(xm, yr, z0 - ov), r1 = V(xm, yr, z1 + ov);
    bat.face(rc, [a0, a3, r1, r0], V(-1, 1, 0)); bat.face(rc, [a1, a2, r1, r0], V(1, 1, 0));
    for (const z of [z0, z1]) bat.face('col:' + o.wall, [V(x0, ye, z), V(x1, ye, z), V(xm, yr - 0.6, z)], V(0, 0, z === z0 ? -1 : 1));
  } else { // hip
    const d = Math.min(x1 - x0, z1 - z0) / 2 + ov, along = x1 - x0 >= z1 - z0;
    const r0 = along ? V(x0 - ov + d, yr, zm) : V(xm, yr, z0 - ov + d), r1 = along ? V(x1 + ov - d, yr, zm) : V(xm, yr, z1 + ov - d);
    if (along) { bat.face(rc, [a0, a1, r1, r0], V(0, 1, -1)); bat.face(rc, [a3, a2, r1, r0], V(0, 1, 1)); bat.face(rc, [a0, a3, r0], V(-1, 1, 0)); bat.face(rc, [a1, a2, r1], V(1, 1, 0)); }
    else { bat.face(rc, [a0, a3, r1, r0], V(-1, 1, 0)); bat.face(rc, [a1, a2, r1, r0], V(1, 1, 0)); bat.face(rc, [a0, a1, r0], V(0, 1, -1)); bat.face(rc, [a3, a2, r1], V(0, 1, 1)); }
  }
  bat.box('col:#e9e6de', a0.clone().add(V(0, -0.7, 0)), V(x1 - x0 + 2 * ov, 0, 0), V(0, 0.7, 0), V(0, 0, 0.12));
  bat.box('col:#e9e6de', a3.clone().add(V(0, -0.7, -0.12)), V(x1 - x0 + 2 * ov, 0, 0), V(0, 0.7, 0), V(0, 0, 0.12));
  // windows on every wall, one or two rows
  const rows = eave > 15 ? [[2.6, 6.6], [12.4, 16.2]] : [[2.6, 6.6]];
  const win = (ax, az, bx, bz, nx, nz) => {
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.floor(L / 9));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, cx = ax + (bx - ax) * t, cz = az + (bz - az) * t, ux = (bx - ax) / L, uz = (bz - az) / L;
      if (o.doors && o.doors.some(([dx, dz]) => Math.hypot(dx - cx, dz - cz) < 6)) continue;
      for (const [y0, y1] of rows) {
        const w = 1.5, p = (s, y, d) => V(cx + ux * s + nx * d, G + y, cz + uz * s + nz * d);
        bat.face('col:#e9e6de', [p(-w - 0.25, y0 - 0.25, 0.04), p(w + 0.25, y0 - 0.25, 0.04), p(w + 0.25, y1 + 0.25, 0.04), p(-w - 0.25, y1 + 0.25, 0.04)], V(nx, 0, nz));
        bat.face('col:#2d3438', [p(-w, y0, 0.07), p(w, y0, 0.07), p(w, y1, 0.07), p(-w, y1, 0.07)], V(nx, 0, nz));
      }
    }
  };
  win(x0, z1, x1, z1, 0, 1); win(x0, z0, x1, z0, 0, -1); win(x0, z0, x0, z1, -1, 0); win(x1, z0, x1, z1, 1, 0);
  for (const [cx, cz, w, nx, nz] of o.doors || []) { // garage doors on a face
    const ux = nz ? 1 : 0, uz = nx ? 1 : 0, p = (s, y) => V(cx + ux * s + nx * 0.08, G + y, cz + uz * s + nz * 0.08);
    bat.face('col:#ece8df', [p(-w / 2, 0), p(w / 2, 0), p(w / 2, 7.3), p(-w / 2, 7.3)], V(nx, 0, nz));
  }
  addSolid(V(x0, 0, z0), V(x1 - x0, 0, 0), V(0, 0, z1 - z0), G, G + ridge, 'site');
}

// ------------------------------------------------------------------ site
// run fn with G set to the ground height at (x, z)
function onGround(x, z, fn) { const g = G; G = groundAt(x, z); const r = fn(); G = g; return r; }

// ------------------------------------------------------------------ site
export function buildSite() {
  const group = new THREE.Group();
  const bat = new Batcher();
  const OFF = {};
  const off = (rs) => (OFF[rs] = OFF[rs] || new Batcher());
  const F = (x, y) => toFt([x, y]);
  const W = 420, ZA0 = -20, ZA1 = 54, XA0 = -40, XA1 = 140;
  const sz0 = STREET.curb, sz1 = sz0 + STREET.width;
  const bLevel = LEVELS.find((l) => l.id === 'b'), f1Level = LEVELS.find((l) => l.id === 'f1');
  const bFoot = bLevel.footprint[0].map(([x, y]) => toFt(bLevel.map(x, y)));
  const fFoot = f1Level.footprint[0].map((q) => toFt(q));
  const deckFt = DECK_PX.map((q) => toFt(q));
  const inHouse = (x, z) => pip(bFoot, x, z) || pip(fFoot, x, z);
  const quad = (a, b, c, d) => bat.face('grass', [V(a[0], groundAt(a[0], a[1]), a[1]), V(b[0], groundAt(b[0], b[1]), b[1]), V(c[0], groundAt(c[0], c[1]), c[1]), V(d[0], groundAt(d[0], d[1]), d[1])], V(0, 1, 0));
  // ---- ground: fine grid around the house (cells cut around the walls), big planes elsewhere, split at the slope kinks
  for (let x = XA0; x < XA1; x++) for (let z = ZA0; z < ZA1; z++) {
    const corners = [[x, z], [x + 1, z], [x + 1, z + 1], [x, z + 1]], ins = corners.map(([a, b]) => inHouse(a, b));
    if (ins.every(Boolean)) continue;
    if (ins.some(Boolean) || inHouse(x + 0.5, z + 0.5)) {
      for (const [dx, dz] of [[0, 0], [0.5, 0], [0, 0.5], [0.5, 0.5]]) { const a = x + dx, b = z + dz; if (!inHouse(a + 0.25, b + 0.25)) quad([a, b], [a + 0.5, b], [a + 0.5, b + 0.5], [a, b + 0.5]); }
    } else quad(...corners);
  }
  quad([-W, -W], [W, -W], [W, ZA0], [-W, ZA0]);
  quad([-W, ZA1], [W, ZA1], [W, sz0], [-W, sz0]);
  quad([-W, sz1], [W, sz1], [W, W], [-W, W]);
  for (const [x0, x1, zs] of [[-W, XA0, [ZA0, 3, 22, ZA1]], [XA1, W, [ZA0, -8, 12, ZA1]]]) for (let i = 0; i < zs.length - 1; i++) quad([x0, zs[i]], [x1, zs[i]], [x1, zs[i + 1]], [x0, zs[i + 1]]);
  // walking surfaces: flat front + back, small level cells down the slope (2 ft columns near the house)
  const holes = [bFoot, fFoot];
  addFloorPoly([[-W, GROUND.zMax], [W, GROUND.zMax], [W, sz0], [-W, sz0]], holes, H.grade, 'site');
  addFloorPoly([[-W, sz1], [W, sz1], [W, W], [-W, W]], [], H.grade, 'site');
  addFloorPoly([[-W, -W], [W, -W], [W, GROUND.zMin], [-W, GROUND.zMin]], holes, H.rearGrade, 'site');
  const cols = [[-W, -60], ...Array.from({ length: 100 }, (_, i) => [-60 + i * 2, -58 + i * 2]), [140, W]];
  for (let z = GROUND.zMin; z < GROUND.zMax; z += 0.5) for (const [x0, x1] of cols) {
    const y = groundAt(Math.max(-60, Math.min(140, (x0 + x1) / 2)), z + 0.25);
    const hs = holes.filter((hp) => hp.some(([hx, hz]) => hx > x0 - 80 && hx < x1 + 80));
    addFloorPoly([[x0, z], [x1, z], [x1, z + 0.5], [x0, z + 0.5]], x1 - x0 > 50 ? [] : hs, y, 'site');
  }
  // ---- Hamilton Rd: ~24 ft asphalt, center line, gravel shoulders (no sidewalk, photo 82)
  bat.poly('asphalt', [[-W, sz0], [W, sz0], [W, sz1], [-W, sz1]], H.grade - 0.25);
  addFloorPoly([[-W, sz0], [W, sz0], [W, sz1], [-W, sz1]], [], H.grade - 0.25, 'site');
  for (let x = -W; x < W; x += 15) bat.aabox('col:#e2b93b', x, H.grade - 0.248, (sz0 + sz1) / 2 - 0.08, x + 9, H.grade - 0.24, (sz0 + sz1) / 2 + 0.08);
  for (const zc of [sz0, sz1]) bat.aabox('col:#a29d93', -W, H.grade - 0.27, zc - 1.2, W, H.grade - 0.2, zc + 1.2);

  // ---- driveway (photos 01, 78-81): from the road straight up to the garage front, sweeping around its corner onto
  //      the side-load apron, with a basketball hoop at the far edge
  const drive = rounded([[40, sz0 + 1.2], [40, 72, 12], [54, 56, 8], [74.5, 53], [74.5, 14, 2], [103, 14, 6], [103, 58, 12], [86, 70, 10], [60, 80, 10], [58, sz0 + 1.2]]);
  bat.poly('paving', drive, H.grade + 0.04);
  addFloorPoly(drive, [], H.grade + 0.04, 'site');
  for (let z = 22; z < sz0 - 4; z += 11) bat.aabox('col:#aaa69e', z < 58 ? 75 : 40.5, H.grade + 0.041, z - 0.04, z < 58 ? 102.5 : 57.5, H.grade + 0.046, z + 0.04);
  { const k = new Kit(bat, 'site').at(104.5, 40, H.grade, -90); // in-ground basketball hoop (photos 01, 79)
    k.cyl('black', 0, 0, 0.25, 0.25, 0, 10.5, 10); k.box('black', -0.15, 9.0, 0, 0.15, 9.3, 4.0); k.box('glass', -3.0, 9.2, 4.0, 3.0, 12.7, 4.1); k.box('white', -3.0, 9.2, 4.12, 3.0, 9.35, 4.15); k.box('white', -3.0, 12.55, 4.12, 3.0, 12.7, 4.15);
    k.cyl('col:#d9541e', 0, 4.9, 0.75, 0.75, 9.95, 10.0, 16); k.solid(-0.3, -0.3, 0.3, 0.3, 0, 10.5); }
  // ---- front stoop (photo 03): brick landing and one step, the curved walk to the drive with a brick border (photo 05)
  const [dX0] = F(400, 0), [dX1] = F(496, 0), [, fz] = F(0, 585);
  { const k = new Kit(bat, 'site'); k.box({ pv: 'brickExt', def: 'brickExt' }, dX0, H.grade, fz + 0.25, dX1, -0.35, fz + 4.8); k.box({ pv: 'brickExt', def: 'brickExt' }, dX0 + 0.5, H.grade, fz + 4.8, dX1 - 0.5, -0.68, fz + 6.0); }
  addFloorPoly([[dX0, fz + 0.25], [dX1, fz + 0.25], [dX1, fz + 4.8], [dX0, fz + 4.8]], [], -0.35, 'site');
  addFloorPoly([[dX0 + 0.5, fz + 4.8], [dX1 - 0.5, fz + 4.8], [dX1 - 0.5, fz + 6.0], [dX0 + 0.5, fz + 6.0]], [], -0.68, 'site');
  const walk = curve([[20.5, fz + 5.6], [21.5, fz + 12], [27, fz + 19], [37, fz + 24], [44, fz + 27]], 30);
  const wr = ribbon(bat, 'paving', walk, 4.5, H.grade + 0.045);
  for (const side of [wr.left, wr.right]) for (let i = 0; i < side.length - 1; i++) bat.face('brickExt', [V(side[i][0], H.grade + 0.05, side[i][1]), V(side[i + 1][0], H.grade + 0.05, side[i + 1][1]), V(side[i + 1][0], H.grade + 0.05, side[i + 1][1] + 0.6), V(side[i][0], H.grade + 0.05, side[i][1] + 0.6)], V(0, 1, 0));
  // ---- the brick pier with the house plaque (left blank here) and a stone lion on a low curved wall (photos 01, 02)
  { const k = new Kit(bat, 'site').at(33, 66, H.grade, -25);
    k.box('brickExt', -1.4, 0, -1.4, 1.4, 4.3, 1.4); k.prof('stoneTrim', [[-1.6, 4.3], [1.6, 4.3], [0, 5.3]], -1.6, 1.6);
    k.box('col:#ece6d6', -0.95, 2.2, 1.4, 0.95, 3.6, 1.48); k.box('col:#cfc6b3', -0.85, 2.3, 1.48, 0.85, 3.5, 1.5); // plaque (no address on the model)
    k.box('brickExt', -6.5, 0, -0.6, -1.4, 1.6, 0.6); k.box('stoneTrim', -6.7, 1.6, -0.75, -1.4, 1.8, 0.75);
    k.box('stoneTrim', -7.6, 0, -1.0, -5.6, 2.2, 1.0); k.soft('col:#b8b2a6', -7.2, 2.2, -0.6, -6.0, 3.6, 0.7, 0.4); k.soft('col:#b8b2a6', -7.0, 3.3, 0.1, -6.2, 4.3, 0.8, 0.3);
    k.solid(-1.4, -1.4, 1.4, 1.4, 0, 5); k.solid(-7.6, -1, -1.4, 1, 0, 2.2); }
  bat.poly('mulch', rounded([[25, 61, 2.5], [38, 60, 2.5], [39.5, 70, 2.5], [27, 72, 2.5]]), H.grade + 0.05);
  // lamp post by the front walk (photo 01)
  { const k = new Kit(bat, 'site').at(25, 52, H.grade);
    k.cyl('black', 0, 0, 0.3, 0.3, 0, 0.5, 8); k.cyl('black', 0, 0, 0.12, 0.1, 0.5, 6.4, 8); k.cyl('frosted', 0, 0, 0.36, 0.42, 6.5, 7.6, 6); k.cyl('black', 0, 0, 0.5, 0.05, 7.6, 8.15, 6); k.solid(-0.3, -0.3, 0.3, 0.3, 0, 8); }

  // ---- deck off the great room and dinette (photos 64-69): wood deck at the main floor, white rails, a brick
  //      fireplace, a timber umbrella frame; long stair down to the walk-out level; concrete patio underneath
  const DY = -0.25, DB = off('off:patio');
  DB.prism({ top: 'plank:#7a5a43', side: 'col:#6b4d38' }, deckFt, DY - 0.3, DY);
  addFloorPoly(deckFt, [], DY, 'site');
  { const zMin = Math.min(...deckFt.map((q) => q[1])), xMin = Math.min(...deckFt.map((q) => q[0])), xMax = Math.max(...deckFt.map((q) => q[0]));
    for (let x = xMin + 0.3; x <= xMax; x += 7.5) for (const z of [zMin + 0.3, zMin + 7.5]) { const g = groundAt(x, z); bat.aabox('col:#6b4d38', x - 0.25, g, z - 0.25, x + 0.25, DY - 0.3, z + 0.25); addSolid(V(x - 0.25, 0, z - 0.25), V(0.5, 0, 0), V(0, 0, 0.5), g, DY - 0.3, 'site'); }
    bat.aabox('col:#6b4d38', xMin, DY - 1.2, zMin, xMax, DY - 0.3, zMin + 0.4);
    // white rails (the upgrade swaps them for black aluminum)
    const [sx0] = F(385, 0), [sx1] = F(432, 0);
    for (const [a, b] of [[[xMin, 0], [xMin, zMin]], [[xMin, zMin], [sx0, zMin]], [[sx1, zMin], [xMax, zMin]], [[xMax, zMin], F(475, 58)]]) railing(DB, a, b, DY, 'off:patio');
    // stair down to the yard: 14 risers to the walk-out level
    const n = 14, rr = (DY - H.rearGrade) / n, run = 0.85;
    for (let i = 1; i < n; i++) { const z0 = zMin - i * run, top = DY - i * rr; bat.aabox({ pv: 'plank:#7a5a43', def: 'col:#6b4d38' }, sx0, top - 0.15, z0, sx1, top, z0 + run); addFloorPoly([[sx0, z0], [sx1, z0], [sx1, z0 + run], [sx0, z0 + run]], [], top, 'site'); }
    for (const x of [sx0, sx1]) { bat.box('col:#6b4d38', V(x - 0.1, DY - 0.5, zMin), V(0, -(n - 1) * rr, -(n - 1) * run), V(0, 0.9, 0), V(0.2, 0, 0)); railing(bat, [x, zMin], [x, zMin - (n - 1) * run], DY, 'site', H.rearGrade + rr); }
    // brick deck fireplace + chimney on the back edge (photos 64-66)
    { const k = new Kit(bat, 'site').at(F(205, 0)[0], zMin + 0.3, DY, 0);
      k.box('brickExt', -2.4, 0, 0, 2.4, 5.2, 2.6); k.box('stoneTrim', -2.6, 5.2, -0.1, 2.6, 5.5, 2.8); k.box('brickExt', -1.4, 5.5, 0.3, 1.4, 13.0, 2.0); k.box('stoneTrim', -1.6, 13.0, 0.1, 1.6, 13.3, 2.2);
      k.box('black', -1.4, 0.9, 2.6, 1.4, 3.4, 2.62); k.box('ember', -0.9, 1.0, 2.3, 0.9, 1.3, 2.55); k.box('stoneTrim', -2.6, 0, 2.6, 2.6, 0.5, 3.6);
      k.box('brickExt', -2.4, DY - H.rearGrade > 0 ? -(DY - H.rearGrade) : 0, 0.2, 2.4, 0, 2.4);
      k.solid(-2.4, 0, 2.4, 2.6, -9, 13); }
    // timber frame carrying four square umbrellas over the table (photos 64, 65, 69)
    { const k = new Kit(bat, 'site').at(10.5, -7.6, DY, 0), Wd = 'col:#7c5a3a';
      k.cbox(Wd, 0, 0, 0.6, 0.6, 0, 9.2);
      for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { k.cbox(Wd, dx * 5.5, dz * 4.5, 0.45, 0.45, 0, 8.4); bat.box(Wd, k.P(0, 8.9, 0), V(dx * 5.5, -0.5, dz * 4.5), V(0, 0.4, 0), V(0.15, 0, 0.15));
        const c = k.P(dx * 3.0, 9.6, dz * 2.5); const tip = (sx, sz) => V(c.x + sx * 2.6, 8.7, c.z + sz * 2.6);
        for (const [a, b] of [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]]) { bat.face('fab:#d9c9a8', [c, tip(...a), tip(...b)], V(0, 1, 0)); bat.face('fab:#cbb994', [c, tip(...b), tip(...a)], V(0, -1, 0)); } }
      k.solid(-0.3, -0.3, 0.3, 0.3, 0, 9.2); }
    // concrete patio at the walk-out under the deck, by the rec room slider (photo 68)
    const pat = [[xMin - 1, 0.3], [xMax + 1, 0.3], [xMax + 1, zMin - 2], [xMin - 1, zMin - 2]];
    bat.prism({ top: 'paving', side: 'foundation' }, pat, H.rearGrade - 0.2, H.rearGrade + 0.12);
    addFloorPoly(pat, [], H.rearGrade + 0.12, 'site');
  }
  // patio table + chairs on the deck (photos 64-66)
  { const k = new Kit(off('off:patio'), 'off:patio').at(10.5, -7.6, DY, 90); for (const [cx, cz, r] of diningTableLite(k, 6.5, 3.4)) { const p = k.P(cx, 0, cz); patioChairLite(new Kit(k.bat, 'off:patio').at(p.x, p.z, DY, r)); } }
  // ---- pond with a rock waterfall in the back yard (photos 75, 76)
  { const cx = -6, cz = -52, pond = curve([[cx - 9, cz], [cx - 4, cz - 6], [cx + 5, cz - 5.5], [cx + 9, cz + 1], [cx + 4, cz + 6], [cx - 6, cz + 5], [cx - 9, cz]], 40);
    bat.poly('col:#3b4a3d', pond, H.rearGrade - 0.35);
    bat.poly('glass', pond, H.rearGrade - 0.12);
    const r = rng(77);
    for (let i = 0; i < pond.length - 1; i += 2) { const [x, z] = pond[i], s = 0.8 + r() * 1.3; new Kit(bat, 'site').at(x, z, H.rearGrade).soft('col:#9b958a', -s, -0.3, -s * 0.8, s, s * 0.7, s * 0.8, s * 0.4); }
    for (let i = 0; i < 7; i++) new Kit(bat, 'site').at(cx + 9 + r() * 3, cz - 4 + i * 1.2, H.rearGrade).soft('col:#8c867b', -1.2, 0, -1, 1.2, 1.0 + i * 0.35, 1, 0.5);
  }
  // ---- downspouts at the gutter corners
  for (const [px, py, top] of [[177.5, 585, 17.7], [721, 585, 17.7], [177.5, 171, 17.7], [433, 171, 17.7], [820, 812, 8.6], [1130, 812, 8.6], [1130, 381, 8.6], [966, 206, 14.6], [433, 102, 9.0], [712.5, 102, 9.0]]) {
    const [x, z] = F(px, py), sx = px < 450 ? -0.35 : 0.35, szz = py > 400 ? 0.35 : -0.35, g = groundAt(x, z + szz);
    bat.aabox('gutter', x + sx - 0.13, g + 0.25, z + szz - 0.13, x + sx + 0.13, top, z + szz + 0.13);
  }
  // ---- lot lines, street name, north arrow
  const lot = new THREE.Group(); lot.name = 'lotLines';
  const lotMat = new THREE.LineDashedMaterial({ color: '#ffffff', dashSize: 3, gapSize: 2, transparent: true, opacity: 0.9 });
  const lotLine = (pts) => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(([x, z]) => V(x, groundAt(x, z) + 0.15, z))), lotMat); l.computeLineDistances(); lot.add(l); };
  lotLine([[LOT.xSouth, LOT.zBack], [LOT.xNorth, LOT.zBack]]); lotLine([[LOT.xSouth, LOT.zFront], [LOT.xNorth, LOT.zFront]]);
  for (const x of [LOT.xSouth, LOT.xNorth]) { const pts = []; for (let z = LOT.zBack; z <= LOT.zFront; z += 2) pts.push([x, z]); lotLine(pts); } // follows the slope
  group.add(lot);
  group.add(groundText('HAMILTON RD', 40, (sz0 + sz1) / 2 + 4, 60, 7, 0, 'rgba(255,255,255,0.85)'));
  { const t = groundText('N →', LOT.xSouth + 8, LOT.zFront - 10, 14, 7, (128 * Math.PI) / 180, 'rgba(255,255,255,0.9)'); group.add(t); } // north is back-left (the front faces southwest)

  // ---- neighboring houses (satellite positions)
  for (const n of NEIGHBORS) onGround((n.x0 + n.x1) / 2, (n.z0 + n.z1) / 2, () => house(bat, n));
  bat.build(group);
  group.userData.renos = Object.entries(OFF).map(([rs, b]) => { const g = new THREE.Group(); g.userData.rs = rs; b.build(g); group.add(g); return g; });

  // ---- trees & planting: a wooded lot (satellite + photos 01, 67-81)
  const trees = new THREE.Group(); trees.name = 'trees';
  const P = new Plants();
  const T = (x, z, o) => onGround(x, z, () => shadeTree(P, x, z, o));
  const S = (x, z, h, o = {}) => onGround(x, z, () => spruce(P, x, z, h, { R: h * 0.2, ...o }));
  // front yard: big shade trees near the road and the side lines, a flowering tree in front of the dining wing
  T(-14, 96, { h: 52, R: 19, trunk: 11, leaders: 5, seed: 3, leaves: ['maple:mapleGreen', 'maple:mapleGreen', 'oval:linden'] });
  T(92, 104, { h: 48, R: 17, trunk: 10, leaders: 4, seed: 5, leaves: ['oval:linden', 'maple:mapleGreen'] });
  T(8, 120, { h: 44, R: 16, trunk: 10, leaders: 4, seed: 7, leaves: ['maple:mapleGreen'] });
  T(30, 45, { h: 18, R: 7, trunk: 4, leaders: 3, seed: 9, rt: 0.3, leaves: ['oval:linden'], card: 2.2, density: 1.6 });
  T(-22, 50, { h: 40, R: 15, trunk: 9, leaders: 4, seed: 11, leaves: ['oval:locust', 'maple:mapleGreen'] });
  // northwest side: a band of woods along the field
  for (const [x, z, h, sd] of [[-26, 18, 50, 13], [-24, -12, 46, 15], [-28, -45, 52, 17], [-20, -78, 48, 19], [-27, 80, 44, 21]]) T(x, z, { h, R: h * 0.36, trunk: h * 0.25, leaders: 4, seed: sd, leaves: ['oval:locust', 'maple:mapleGreen', 'oval:linden'] });
  for (const [x, z, h] of [[-18, 34, 38], [-29, 2, 42], [-14, -30, 36], [-30, -60, 44]]) S(x, z, h);
  // southeast side past the apron: tall arborvitae screen and a few spruces (photos 01, 78, 81)
  for (const [z, h] of [[6, 22], [13, 24], [20, 23], [27, 25], [34, 22], [41, 24], [48, 23], [55, 21]]) onGround(110, z, () => arborvitae(P, 110, z, h, z * 3));
  for (const [x, z, h] of [[100, -10, 46], [106, -30, 40], [96, 80, 38]]) S(x, z, h);
  // back yard: open lawn with big scattered trees, woods toward the back line (photos 70-77)
  for (const [x, z, h, sd] of [[-6, -30, 50, 31], [44, -36, 54, 33], [88, -50, 50, 35], [18, -86, 56, 37], [62, -96, 48, 39], [-14, -112, 52, 41], [96, -118, 50, 43], [40, -136, 54, 45], [8, -146, 46, 47], [78, -146, 48, 49], [-24, -146, 44, 51], [104, -88, 46, 53]])
    T(x, z, { h, R: h * 0.37, trunk: h * 0.26, leaders: 5, seed: sd, leaves: sd % 3 ? ['maple:mapleGreen', 'oval:linden'] : ['oval:locust', 'maple:mapleOrange'] });
  for (const [x, z, h, b] of [[30, -60, 38], [70, -70, 42, 1], [-22, -96, 40], [100, -66, 36, 1]]) S(x, z, h, { blue: !!b });
  // foundation shrubs: rounded yews and boxwoods along the front and the garage gable (photos 01, 03, 80)
  for (const [x, z, w, h, kind] of [[2.5, 33.6, 4.5, 4.0, 'yew'], [8.5, 33.6, 3.5, 3.0, 'box'], [14.5, 33.6, 3.0, 2.6, 'box'], [26.5, 33.6, 3.0, 2.6, 'box'], [32.5, 33.6, 3.6, 3.2, 'yew'], [38.5, 33.6, 4.0, 3.5, 'yew'],
    [50, 50.8, 3.6, 3.0, 'shrub'], [56, 51, 5.5, 5.5, 'shrub'], [63, 51, 4.0, 3.6, 'yew'], [69.5, 50.8, 3.4, 3.0, 'shrub'], [46.5, 34, 4.0, 3.8, 'yew'], [-3, 24, 4.2, 3.6, 'yew'], [-3, 12, 4.0, 3.4, 'yew']])
    onGround(x, z, () => shrub(P, x, z, w, h, kind));
  P.build(trees);
  group.add(trees);
  return group;
}

// small local versions so site.js stays independent of furnish.js
function diningTableLite(k, w, d) {
  k.box('col:#2b2b2b', -w / 2, 2.35, -d / 2, w / 2, 2.45, d / 2);
  for (const x of [-w / 2 + 0.4, w / 2 - 0.4]) for (const z of [-d / 2 + 0.4, d / 2 - 0.4]) k.cbox('col:#2b2b2b', x, z, 0.15, 0.15, 0, 2.35);
  k.solid(-w / 2, -d / 2, w / 2, d / 2, 0, 2.45);
  return [[-1.5, d / 2 + 0.6, 180], [1.5, d / 2 + 0.6, 180], [-1.5, -d / 2 - 0.6, 0], [1.5, -d / 2 - 0.6, 0], [w / 2 + 0.6, 0, -90], [-w / 2 - 0.6, 0, 90]];
}
function patioChairLite(k) {
  for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) k.cyl('col:#2b2b2b', x, z, 0.04, 0.04, 0, 1.5, 5);
  k.box('col:#2b2b2b', -0.9, 1.45, -0.9, 0.9, 1.55, 0.9); k.box('col:#2b2b2b', -0.9, 1.55, -1.0, 0.9, 3.3, -0.85);
  k.solid(-0.9, -1.0, 0.9, 0.9, 0, 1.6);
}
// white deck rail: posts every ~6 ft, 2x2 balusters, a flat cap
function railing(bat, a, b, y, tag = 'site', y1 = y) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz); if (len < 0.1) return;
  const n = Math.max(2, Math.round(len / 0.4)), np = Math.max(1, Math.round(len / 6));
  for (let i = 0; i <= n; i++) { const t = i / n, x = a[0] + dx * t, z = a[1] + dz * t, h = y + (y1 - y) * t; bat.aabox('railWhite', x - 0.05, h, z - 0.05, x + 0.05, h + 3.0, z + 0.05); }
  for (let i = 0; i <= np; i++) { const t = i / np, x = a[0] + dx * t, z = a[1] + dz * t, h = y + (y1 - y) * t; bat.aabox('railWhite', x - 0.2, h, z - 0.2, x + 0.2, h + 3.4, z + 0.2); }
  const nx = -dz / len, nz = dx / len;
  bat.box('railWhite', V(a[0] - nx * 0.25, y + 3.0, a[1] - nz * 0.25), V(dx, y1 - y, dz), V(0, 0.15, 0), V(nx * 0.5, 0, nz * 0.5));
  bat.box('railWhite', V(a[0] - nx * 0.1, y + 0.3, a[1] - nz * 0.1), V(dx, y1 - y, dz), V(0, 0.15, 0), V(nx * 0.2, 0, nz * 0.2));
  addSolid(V(a[0] - nx * 0.15, 0, a[1] - nz * 0.15), V(dx, 0, dz), V(nx * 0.3, 0, nz * 0.3), Math.min(y, y1), Math.max(y, y1) + 3.0, tag);
}
