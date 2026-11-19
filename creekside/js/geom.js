// Low-level geometry helpers: a batcher that merges faces by material, polygon
// utilities, and a tiny physics registry used by walk mode.
import * as THREE from 'three';
import { tex, texTint } from './textures.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

// ---------------------------------------------------------------- materials
const MATS = {};
// texture by name, with its companion maps (normal / roughness, in texture.userData) and its tint:
// color-parameterized patterns ('paint:#hex', 'grain:#hex' ...) share one neutral texture and the
// material color carries the hex (see textures.js). name = null clears the maps (color untouched).
function useMaps(m, name) {
  const t = name ? tex(name) : null;
  if (t) m.color.copy(texTint(name));
  m.map = t || null;
  const u = t ? t.userData : {};
  m.normalMap = u.normalMap || null;
  m.roughnessMap = u.roughnessMap || null;
  if (u.normalMap) { const s = u.normalScale ?? 1; m.normalScale.set(s, s); }
}
// window glass: reflections rise toward grazing angles (Fresnel) instead of a flat opacity
function fresnelGlass(m, edge) {
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `#include <opaque_fragment>
      { float fr = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 4.0); gl_FragColor.a = clamp(gl_FragColor.a + fr * ${edge.toFixed(2)}, 0.0, 1.0); }`);
  };
  m.customProgramCacheKey = () => 'fresnelGlass' + edge;
  return m;
}
// Themeable materials: walls ('W:<room>'), floors ('F:<group>') and these finish roles. Their
// look is set with applyFinish(); ORIGIN holds the as-listed finish of each.
export const ORIGIN = {
  trim: '#b9843f', door: '#b9843f', doorPanel: '#c4904c', doorLine: '#7d5426', cab: '#c28a48', cabDoor: '#c9924f',
  cabPanel: '#d29c58', counter: 'laminate:#8d9093', vanityTop: '#dccdc5', vanityTop2: 'laminate:#ecebe6', backsplash: 'paint:#f3f2ee', splashTrim: 'laminate:#8d9093',
  fpBrick: 'blackMarble', mantel: '#b9843f', mantelPanel: '#c4904c', stairCarpet: '#c9c3ba', island: '#46555e',
  // exterior (the modern-facade option re-finishes these)
  siding: 'lap:#6a5f56', brickExt: 'brickTan', extTrim: '#ebe5d6', winExt: '#e6dfcf', shingle: 'shingle', garageDoor: '#7b6e60',
  frontDoor: '#8c5e30', shake: 'shake:#544941', gutter: '#ebe5d6', winTrim: '#ebe5d6',
  // remodel finishes (kitchen / bath / mudroom remodels keep these unless a style overrides them)
  rcab: '#ece9e2', rcabDoor: '#f0ede6', rcabPanel: '#e6e2da', rcounter: 'marble', rsplash: 'subway:#f3f1ec',
};
export const THEMED = new Map();
function roughFor(key, spec) {
  if (key.startsWith('F:')) return /carpet|berber/.test(spec) ? 1 : /oak|plank|lvp/.test(spec) ? 0.5 : 0.45;
  if (key === 'counter' || key === 'vanityTop' || key === 'rcounter') return /marble|plank|laminate/.test(spec) ? 0.35 : 0.25;
  if (key === 'backsplash' || key === 'rsplash') return 0.3;
  if (key === 'backsplash') return 0.3;
  if (key.startsWith('W:') || key === 'fpBrick' || key === 'siding' || key === 'brickExt' || key === 'shake') return /blackMarble/.test(spec) ? 0.25 : 0.9;
  if (key === 'shingle') return 0.95;
  return 0.45;
}
// stained-wood colors on wood parts get the grain texture automatically (painted colors stay flat)
const WOODY = new Set(['cab', 'cabDoor', 'cabPanel', 'door', 'doorPanel', 'mantel', 'mantelPanel', 'island', 'trim', 'rcab', 'rcabDoor', 'rcabPanel']);
function stainedWood(hex) {
  const h = {}; new THREE.Color(hex).getHSL(h, THREE.SRGBColorSpace);
  return h.h * 360 >= 15 && h.h * 360 <= 45 && h.s >= 0.3 && h.l >= 0.2 && h.l <= 0.66;
}
export function applyFinish(key, spec) {
  const m = material(key);
  if (!spec) return;
  if (spec.startsWith('#') && WOODY.has(key) && stainedWood(spec)) spec = 'grain:' + spec;
  // hardwood floors run front-to-back (along z) in the photos: floor wood textures are rotated a quarter turn
  const rot = key.startsWith('F:') && /^(oak|plank)/.test(spec);
  if (spec.startsWith('#')) { useMaps(m, null); m.color.set(spec); } else useMaps(m, rot ? spec + (spec.includes(':') ? ':r' : '::r') : spec);
  m.roughness = roughFor(key, spec);
  // the room probe's ceiling lights over-light floors through the diffuse term: damp it on carpet
  // (rough, all diffuse) more than on wood and tile, which need it for their sheen
  if (key === 'shingle') m.userData.envBase = m.envMapIntensity = 0.5; // roofs: less blue sky in the diffuse term
  if (key.startsWith('F:')) m.userData.envBase = m.envMapIntensity = /carpet|berber/.test(spec) ? 0.45 : 0.75;
  if (key.startsWith('W:')) { // a little even "bounce light" on wall paint (stands in for interreflection); same in both houses
    m.emissiveMap = m.map; m.emissive.copy(m.color); m.emissiveIntensity = 0.2;
  }
  m.needsUpdate = true;
}
// flat colors (roughness)
const FLAT = {
  white: ['#f6f6f2', 0.6], trim: ['#a5652c', 0.45], oakLight: ['#c08a4e', 0.45], cut: ['#4a4744', 0.9],
  ceiling: ['#f7f5ef', 0.95], soffit: ['#f2f2ee', 0.9], shutter: ['#23443a', 0.6], cherry: ['#8a3f1f', 0.35],
  cherryPanel: ['#9b4a25', 0.35], stairCarpet: ['#d8d1c4', 1], subfloor: ['#c9b48f', 0.9], joist: ['#c49a62', 0.9],
  foundation: ['#8d8b86', 0.95], post: ['#f4f4f0', 0.6], porcelain: ['#f7f6f2', 0.15], counter: ['#f1eee6', 0.3],
  cultured: ['#eee6d6', 0.2], steel: ['#d3d6d8', 0.32, 0.45], brass: ['#bb8c34', 0.3, 0.85], chrome: ['#dfe2e4', 0.16, 0.7],
  black: ['#1b1b1d', 0.4], blackMatte: ['#262626', 0.8], mirror: ['#c9d3d8', 0.12, 0.6], doorBrown: ['#6a4632', 0.5],
  felt: ['#1f6b46', 1], railWhite: ['#f2f2ee', 0.6], cedar: ['#a8734a', 0.8], mulchEdge: ['#9a958c', 0.9],
  ridgeCap: ['#4a4d52', 0.9], blackGloss: ['#141416', 0.22], goldFrame: ['#c9a75a', 0.3, 0.8], plaster: ['#efece6', 0.85],
};
const GLOW = { bulb: '#fff3d6', shade: '#f6efe0', recessed: '#fffaf0', screen: '#f4f4f4', ember: '#ff6a1f', flame: '#ffb347' };
export function material(key) {
  if (MATS[key]) return MATS[key];
  let m;
  if (/^[WF]:/.test(key) || key in ORIGIN) {
    m = new THREE.MeshStandardMaterial({ roughness: 0.9 });
    // the room environment map lights walls very unevenly by direction; damp it so paint reads true
    if (key.startsWith('W:')) m.envMapIntensity = 0.55;
    MATS[key] = m; THEMED.set(key, m);
    applyFinish(key, ORIGIN[key]);
    return m;
  }
  const [kind, arg] = key.split(':');
  if (kind === 'wall' || kind === 'col') {
    m = new THREE.MeshStandardMaterial({ color: arg, roughness: 0.9 });
  } else if (kind === 'fab') { // fabric: soft sheen at grazing angles (velvet / boucle / linen)
    m = new THREE.MeshPhysicalMaterial({ color: arg, roughness: 1, sheen: 1, sheenRoughness: 0.75, sheenColor: new THREE.Color(arg).lerp(new THREE.Color('#ffffff'), 0.35).multiplyScalar(0.55) });
  } else if (kind === 'wood') {
    m = new THREE.MeshStandardMaterial({ color: arg, roughness: 0.5 });
  } else if (FLAT[key]) {
    const [c, r, mt = 0] = FLAT[key];
    m = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt });
    // ceilings get almost no direct light; a touch of emissive stands in for bounce light
    if (key === 'ceiling' || key === 'soffit') { m.emissive.set('#ffffff'); m.emissiveIntensity = key === 'ceiling' ? 0.5 : 0.12; }
  } else if (GLOW[key]) {
    m = new THREE.MeshStandardMaterial({ color: GLOW[key], emissive: GLOW[key], emissiveIntensity: key === 'shade' ? 0.35 : 0.9, roughness: 0.8 });
  } else if (key === 'glass') { // tint/opacity are adjusted by render.js for outside vs. inside views
    m = fresnelGlass(new THREE.MeshStandardMaterial({ color: '#bcd6e6', roughness: 0.03, metalness: 0, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.4 }), 0.7);
  } else if (key === 'showerGlass') {
    m = fresnelGlass(new THREE.MeshStandardMaterial({ color: '#d7e6ea', roughness: 0.04, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.2 }), 0.5);
  } else if (key === 'smokeGlass') { // bronze-tinted shower glass (primary bath, photo 30)
    m = fresnelGlass(new THREE.MeshStandardMaterial({ color: '#6b5a46', roughness: 0.06, metalness: 0, transparent: true, opacity: 0.34, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.2 }), 0.5);
  } else if (key === 'frosted') {
    m = new THREE.MeshStandardMaterial({ color: '#e7eef0', roughness: 0.6, transparent: true, opacity: 0.85 });
  } else if (key === 'skylight') {
    m = new THREE.MeshStandardMaterial({ color: '#33424e', roughness: 0.1, metalness: 0.3 });
  } else if (kind === 'floor') {
    const rest = key.slice(6);
    m = new THREE.MeshStandardMaterial({ roughness: rest === 'oak' ? 0.5 : rest.startsWith('tile') || rest === 'slate' ? 0.45 : 1 });
    useMaps(m, rest);
  } else {
    // textured: siding, shingle, brick, block, paving, asphalt, grass, droptile, concrete, faux:#, paint:#, ivy, grid, tile*, backsplash, mulch, felt...
    m = new THREE.MeshStandardMaterial({ roughness: key.startsWith('tile') || key === 'backsplash' ? 0.4 : 0.9 });
    useMaps(m, key);
    if (key === 'droptile') { m.emissive.set('#ffffff'); m.emissiveIntensity = 0.25; }
    if (key === 'grass' || key === 'mulch') { m.roughness = 1; m.envMapIntensity = 0.35; } // no sky sheen on lawns
    if (/^shingle/.test(key)) m.envMapIntensity = 0.5; // roofs: less blue sky in the diffuse term
  }
  MATS[key] = m;
  return m;
}

// ---------------------------------------------------------------- polygons
export function pip(pts, x, z) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
export function centroid(pts) {
  let a = 0, cx = 0, cz = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const f = pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
    a += f; cx += (pts[j][0] + pts[i][0]) * f; cz += (pts[j][1] + pts[i][1]) * f;
  }
  a *= 0.5;
  const c = [cx / (6 * a), cz / (6 * a)];
  return pip(pts, c[0], c[1]) ? c : [(pts[0][0] + pts[2][0]) / 2, (pts[0][1] + pts[2][1]) / 2];
}

// ---------------------------------------------------------------- physics
// solids: oriented boxes in plan with a vertical range; floors: polygons/boxes at a height
export const PHYS = { solids: [], floors: [] };
export function addSolid(o, U, W, y0, y1, tag) {
  const c = o.clone().addScaledVector(U, 0.5).addScaledVector(W, 0.5);
  const hl = U.length() / 2, ht = W.length() / 2;
  const u = V(U.x, 0, U.z).normalize();
  PHYS.solids.push({ cx: c.x, cz: c.z, ux: u.x, uz: u.z, hl, ht, y0: Math.min(y0, y1), y1: Math.max(y0, y1), tag });
}
export function addFloorPoly(pts, holes, y, tag) {
  PHYS.floors.push({ pts, holes: holes || [], y, tag });
}
export function addFloorRect(x0, z0, x1, z1, y, tag) {
  addFloorPoly([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], [], y, tag);
}

// ---------------------------------------------------------------- batcher
function autoUV(pts, n) {
  if (Math.abs(n.y) > 0.7) return pts.map((p) => [p.x, p.z]);
  const t = V(n.z, 0, -n.x).normalize();
  return pts.map((p) => [p.dot(t), p.y]);
}

export class Batcher {
  constructor() { this.b = new Map(); }
  bucket(key) {
    let b = this.b.get(key);
    if (!b) { b = { p: [], n: [], uv: [] }; this.b.set(key, b); }
    return b;
  }
  tri(key, a, b, c, ua, ub, uc) {
    const bk = this.bucket(key);
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    for (const [p, u] of [[a, ua], [b, ub], [c, uc]]) {
      bk.p.push(p.x, p.y, p.z); bk.n.push(n.x, n.y, n.z); bk.uv.push(u[0], u[1]);
    }
  }
  // triangle with explicit (smooth) vertex normals
  triN(key, a, b, c, na, nb, nc) {
    const bk = this.bucket(key);
    for (const [p, n] of [[a, na], [b, nb], [c, nc]]) { bk.p.push(p.x, p.y, p.z); bk.n.push(n.x, n.y, n.z); bk.uv.push(p.x, p.z + p.y); }
  }
  // convex polygon (3+ points) oriented to face nOut
  face(key, pts, nOut, uvs) {
    if (!key) return;
    const n = new THREE.Vector3().subVectors(pts[1], pts[0]).cross(new THREE.Vector3().subVectors(pts[2], pts[0]));
    if (n.lengthSq() < 1e-12) {
      // degenerate first triangle; try the next one
      if (pts.length > 3) n.subVectors(pts[2], pts[0]).cross(new THREE.Vector3().subVectors(pts[3], pts[0]));
    }
    if (nOut && n.dot(nOut) < 0) { pts = pts.slice().reverse(); if (uvs) uvs = uvs.slice().reverse(); }
    uvs = uvs || autoUV(pts, nOut || n.normalize());
    for (let i = 1; i < pts.length - 1; i++) this.tri(key, pts[0], pts[i], pts[i + 1], uvs[0], uvs[i], uvs[i + 1]);
  }
  // parallelepiped from origin corner o along edge vectors U, Vv, W
  box(keys, o, U, Vv, W) {
    const k = (f) => (typeof keys === 'string' ? keys : keys[f] !== undefined ? keys[f] : keys.def);
    const s = (...vs) => vs.reduce((acc, v) => acc.add(v), o.clone());
    const c000 = o.clone(), c100 = s(U), c010 = s(Vv), c001 = s(W), c110 = s(U, Vv), c101 = s(U, W), c011 = s(Vv, W), c111 = s(U, Vv, W);
    const nu = U.clone().normalize(), nv = Vv.clone().normalize(), nw = W.clone().normalize();
    // make each face normal perpendicular-ish to the face (for sheared boxes) by using cross products
    const fw = new THREE.Vector3().crossVectors(U, Vv).normalize(); if (fw.dot(nw) < 0) fw.negate();
    const fu = new THREE.Vector3().crossVectors(Vv, W).normalize(); if (fu.dot(nu) < 0) fu.negate();
    const fv = new THREE.Vector3().crossVectors(U, W).normalize(); if (fv.dot(nv) < 0) fv.negate();
    this.face(k('nw'), [c000, c100, c110, c010], fw.clone().negate());
    this.face(k('pw'), [c001, c101, c111, c011], fw);
    this.face(k('nu'), [c000, c001, c011, c010], fu.clone().negate());
    this.face(k('pu'), [c100, c101, c111, c110], fu);
    this.face(k('nv'), [c000, c100, c101, c001], fv.clone().negate());
    this.face(k('pv'), [c010, c110, c111, c011], fv);
  }
  // axis-aligned box helper
  aabox(keys, x0, y0, z0, x1, y1, z1) {
    this.box(keys, V(x0, y0, z0), V(x1 - x0, 0, 0), V(0, y1 - y0, 0), V(0, 0, z1 - z0));
  }
  // horizontal polygon with holes; pts as [[x,z]]
  poly(key, pts, y, holes = [], down = false) {
    const contour = pts.map(([x, z]) => new THREE.Vector2(x, z));
    const hs = holes.map((h) => h.map(([x, z]) => new THREE.Vector2(x, z)));
    const all = contour.concat(...hs);
    const tris = THREE.ShapeUtils.triangulateShape(contour, hs);
    const nOut = down ? V(0, -1, 0) : UP;
    for (const [a, b, c] of tris) {
      const P = [all[a], all[b], all[c]].map((v) => V(v.x, y, v.y));
      this.face(key, P, nOut, P.map((p) => [p.x, p.z]));
    }
  }
  // vertical prism of a polygon; keys {top, bottom, side}
  prism(keys, pts, y0, y1, holes = []) {
    if (keys.top) this.poly(keys.top, pts, y1, holes);
    if (keys.bottom) this.poly(keys.bottom, pts, y0, holes, true);
    if (!keys.side) return;
    const ring = (r, inward) => {
      // determine orientation so side normals point outward of the solid
      let area = 0;
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) area += r[j][0] * r[i][1] - r[i][0] * r[j][1];
      for (let i = 0; i < r.length; i++) {
        const [ax, az] = r[i], [bx, bz] = r[(i + 1) % r.length];
        const dx = bx - ax, dz = bz - az;
        let n = V(dz, 0, -dx).normalize();
        if (area < 0) n.negate(); // ccw vs cw in x/z
        if (inward) n.negate();
        this.face(keys.side, [V(ax, y0, az), V(bx, y0, bz), V(bx, y1, bz), V(ax, y1, az)], n);
      }
    };
    ring(pts, false);
    holes.forEach((h) => ring(h, true));
  }
  // build meshes into group
  build(group, { shadows = true } = {}) {
    const meshes = [];
    for (const [key, b] of this.b) {
      if (!b.p.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, material(key));
      m.name = key;
      const transparent = material(key).transparent;
      m.castShadow = shadows && !transparent;
      m.receiveShadow = shadows;
      m.userData.measurable = !transparent;
      group.add(m);
      meshes.push(m);
    }
    this.b.clear();
    return meshes;
  }
}

// ---------------------------------------------------------------- Kit
// Places geometry in an object's local frame: x = width, y = up, z = depth (front = +z),
// positioned at (x, z) on the floor at height y and rotated `rot` degrees about y.
// rot 0 faces +z (plan down / east), 90 faces +x (plan right / north), 180 faces -z, -90 faces -x.
export class Kit {
  constructor(bat, tag) { this.bat = bat; this.tag = tag; this.at(0, 0, 0, 0); }
  at(x, z, y = 0, rot = 0) {
    const r = (rot * Math.PI) / 180;
    this.ox = x; this.oz = z; this.oy = y; this.c = Math.cos(r); this.s = Math.sin(r); this.rot = rot;
    return this;
  }
  P(x, y, z) { return V(this.ox + x * this.c + z * this.s, this.oy + y, this.oz - x * this.s + z * this.c); }
  ex() { return V(this.c, 0, -this.s); }
  ez() { return V(this.s, 0, this.c); }
  box(key, x0, y0, z0, x1, y1, z1) {
    if (x1 - x0 <= 0 || y1 - y0 <= 0 || z1 - z0 <= 0) return this;
    this.bat.box(key, this.P(x0, y0, z0), this.ex().multiplyScalar(x1 - x0), V(0, y1 - y0, 0), this.ez().multiplyScalar(z1 - z0));
    return this;
  }
  // centered box helper: center (x, z), size (w, d), from y0 to y1
  cbox(key, x, z, w, d, y0, y1) { return this.box(key, x - w / 2, y0, z - d / 2, x + w / 2, y1, z + d / 2); }
  // rounded ("soft") box: a superellipsoid filling [x0,x1]x[y0,y1]x[z0,z1]; r = corner radius (ft)
  soft(key, x0, y0, z0, x1, y1, z1, r = 0.15, nu = 14, nv = 8) {
    const a = (x1 - x0) / 2, b = (y1 - y0) / 2, c = (z1 - z0) / 2;
    if (a <= 0 || b <= 0 || c <= 0) return this;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
    const e1 = Math.min(1, Math.max(0.08, (2 * r) / (2 * b))), e2 = Math.min(1, Math.max(0.08, (2 * r) / (2 * Math.min(a, c))));
    const sp = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
    const pt = (eta, om) => {
      const ce = Math.cos(eta), se = Math.sin(eta), co = Math.cos(om), so = Math.sin(om);
      const p = this.P(cx + a * sp(ce, e1) * sp(co, e2), cy + b * sp(se, e1), cz + c * sp(ce, e1) * sp(so, e2));
      const nl = [sp(ce, 2 - e1) * sp(co, 2 - e2) / a, sp(se, 2 - e1) / b, sp(ce, 2 - e1) * sp(so, 2 - e2) / c];
      const n = V(nl[0] * this.c + nl[2] * this.s, nl[1], -nl[0] * this.s + nl[2] * this.c).normalize();
      return [p, n];
    };
    const grid = [];
    for (let i = 0; i <= nv; i++) {
      const eta = -Math.PI / 2 + (Math.PI * i) / nv, row = [];
      for (let j = 0; j <= nu; j++) row.push(pt(eta, -Math.PI + (2 * Math.PI * j) / nu));
      grid.push(row);
    }
    for (let i = 0; i < nv; i++) for (let j = 0; j < nu; j++) {
      const [p00, n00] = grid[i][j], [p01, n01] = grid[i][j + 1], [p10, n10] = grid[i + 1][j], [p11, n11] = grid[i + 1][j + 1];
      this.bat.triN(key, p00, p10, p11, n00, n10, n11);
      this.bat.triN(key, p00, p11, p01, n00, n11, n01);
    }
    return this;
  }
  csoft(key, x, z, w, d, y0, y1, r = 0.15) { return this.soft(key, x - w / 2, y0, z - d / 2, x + w / 2, y1, z + d / 2, r); }
  // vertical frustum / elliptic cylinder centered at (x, z)
  cyl(key, x, z, r0, r1, y0, y1, seg = 16, sz = 1, caps = true) {
    const ring = (r, y) => [...Array(seg)].map((_, i) => {
      const a = (i / seg) * Math.PI * 2;
      return this.P(x + Math.cos(a) * r, y, z + Math.sin(a) * r * sz);
    });
    const b = ring(r0, y0), t = ring(r1, y1), c = this.P(x, 0, z);
    for (let i = 0; i < seg; i++) {
      const j = (i + 1) % seg;
      const mid = b[i].clone().add(b[j]).add(t[i]).add(t[j]).multiplyScalar(0.25);
      const n = V(mid.x - c.x, 0, mid.z - c.z).normalize();
      this.bat.face(key, [b[i], b[j], t[j], t[i]], n);
    }
    if (caps) {
      if (r1 > 0.001) this.bat.face(key, t, V(0, 1, 0));
      if (r0 > 0.001) this.bat.face(key, b, V(0, -1, 0));
    }
    return this;
  }
  // polygon profile in the local (z, y) plane, extruded along local x from x0 to x1
  prof(key, pts, x0, x1, capKey = key) {
    if (x0 > x1) [x0, x1] = [x1, x0];
    const c2 = pts.map(([z, y]) => new THREE.Vector2(z, y));
    const tris = THREE.ShapeUtils.triangulateShape(c2, []);
    for (const [xx, sgn] of [[x0, -1], [x1, 1]]) {
      for (const [a, b, c] of tris) {
        const P3 = [a, b, c].map((i) => this.P(xx, pts[i][1], pts[i][0]));
        this.bat.face(capKey, P3, this.ex().multiplyScalar(sgn));
      }
    }
    let area = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) area += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
    for (let i = 0; i < pts.length; i++) {
      const [za, ya] = pts[i], [zb, yb] = pts[(i + 1) % pts.length];
      let nz = yb - ya, ny = -(zb - za);
      if (area < 0) { nz = -nz; ny = -ny; }
      const n = this.ez().multiplyScalar(nz).add(V(0, ny, 0));
      this.bat.face(key, [this.P(x0, ya, za), this.P(x1, ya, za), this.P(x1, yb, zb), this.P(x0, yb, zb)], n);
    }
    return this;
  }
  // horizontal polygon prism, pts in local (x, z)
  prism(keys, pts, y0, y1) {
    const w = pts.map(([x, z]) => { const p = this.P(x, 0, z); return [p.x, p.z]; });
    this.bat.prism(typeof keys === 'string' ? { top: keys, side: keys, bottom: keys } : keys, w, this.oy + y0, this.oy + y1);
    return this;
  }
  solid(x0, z0, x1, z1, y0, y1) {
    addSolid(this.P(x0, 0, z0), this.ex().multiplyScalar(x1 - x0), this.ez().multiplyScalar(z1 - z0), this.oy + y0, this.oy + y1, this.tag);
    return this;
  }
}
