// Builds the Mequon Ave house (walls, openings, floors, stairs, railings, roofs, trim) from data.js.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { LEVELS, STAIRS, toFt, F2, H, RY, ROOFT, PX, WING, CORE, REAR, PORCH, DECK, ENTRY, ceilAt } from './data.js';
import { Batcher, Kit, V, pip, centroid, addSolid, addFloorPoly, addFloorRect, material as matFor, PHYS, ORIGIN } from './geom.js';

// Operable doors (hinged leaves and sliders). Each has t (0 closed .. 1 open) and apply().
export const DOORS = [];
export const DOOR_RENOS = []; // facade parts that ride on moving doors (visibility follows their reno set)
// Renovation sets. 'off:<name>' = parts removed when renovation <name> is on, 'on:<name>' = parts it adds.
const RENO_BATS = new Map(), RENO_GROUPS = new Map();
export function renoGroup(rs, level) {
  const k = rs + '|' + level;
  if (!RENO_GROUPS.has(k)) { const g = new THREE.Group(); g.userData = { rs, level }; g.name = k; RENO_GROUPS.set(k, g); }
  return RENO_GROUPS.get(k);
}
export function renoBat(rs, level) {
  const k = rs + '|' + level;
  if (!RENO_BATS.has(k)) { RENO_BATS.set(k, new Batcher()); renoGroup(rs, level); }
  return RENO_BATS.get(k);
}
// lookup overrides while building renovation walls (new rooms / extended footprint)
export const CTX = { rooms: null, foot: null };
let HANG_Y0 = null;
const lerpAngle = (a, b, t) => a + ((((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * t);
import { buildFixtures, buildFurniture } from './furnish.js';
import { buildRenovations } from './reno.js';

export const P = (L, x, y) => toFt(L.map(x, y));
export const F = (x, y) => toFt([x, y]); // 1st-floor plan px -> ft
function tone(key, f) {
  const [k, hex] = key.split(':');
  const c = new THREE.Color(hex), h = {};
  c.getHSL(h); c.setHSL(h.h, h.s, Math.min(1, Math.max(0, h.l + f)));
  return k + ':#' + c.getHexString();
}
export const LV = Object.fromEntries(LEVELS.map((L) => [L.id, L]));

// Every finished room gets its own themeable wall material ('W:<level>-<n>') and its floor joins a
// themeable floor group ('F:<group>'); ROLES records the categories the style controls act on.
export const ROLES = { walls: [], floors: {} };
function wallCat(L, r) {
  if (r.bare) return null;
  if (L.id === 'b') return 'rec';
  if (/Kitchen|Dining/.test(r.name)) return 'kitchen';
  if (/Bedroom|^Loft$/.test(r.name) && L.id === 'f2' && !/Office/.test(r.name)) return /Loft/.test(r.name) ? 'main' : 'bed';
  if (/Bath|^Linen$|^WC$/.test(r.name)) return 'bath';
  if (/Living/.test(r.name)) return 'living';
  return 'main';
}
function floorCat(L, r) {
  if (!r.floor) return null;
  if (r.floor === 'oak' || (r.floor.startsWith('lvp') && L.id !== 'b')) return 'wood';
  if (r.floor.startsWith('tile:') && /Bath|WC|Linen/.test(r.name)) return 'tileBath';
  if (r.floor.startsWith('tile:')) return 'laundry';
  if (r.floor === 'tileFoyer') return 'foyer';
  if (r.floor === 'carpet:#86707a') return 'carpetLiving';
  if (r.floor === 'carpet:#c79a9b') return 'carpetPink';
  if (r.floor.startsWith('carpet')) return L.id === 'f1' ? 'carpetMain' : 'carpetBed';
  if (r.floor === 'tileBeige') return 'tileBath';
  if (r.floor === 'vinylBeige') return 'laundry';
  if (r.floor === 'vinylDiamond') return 'hallBath';
  return null;
}
export function roleRoom(L, r, i, prefix = '') {
  const rr = { ...r, pts: r.poly.map(([x, y]) => P(L, x, y)), y: r.y ?? L.floor, tile: (r.wall || '').startsWith('tile') };
  const cat = wallCat(L, r);
  if (cat) {
    const key = `W:${prefix}${L.id}-${i}`;
    ORIGIN[key] = r.wall;
    ROLES.walls.push({ key, cat, orig: r.wall });
    rr.wall = key;
    if (r.lower) { // two-tone wall below a chair rail (its own themeable material, same category)
      ORIGIN[key + 'L'] = r.lower;
      ROLES.walls.push({ key: key + 'L', cat, orig: r.lower });
      rr.lowerKey = key + 'L';
    }
  }
  const fc = floorCat(L, r);
  if (fc) {
    rr.floorKey = 'F:' + fc;
    if (!ROLES.floors[fc]) { ROLES.floors[fc] = r.floor; ORIGIN['F:' + fc] = r.floor; }
  } else rr.floorKey = r.floor ? 'floor:' + r.floor : null;
  return rr;
}
function prepLevel(L) {
  L._foot = L.footprint.map((poly) => poly.map(([x, y]) => P(L, x, y)));
  L._holes = (L.slabHoles || []).map((h) => h.map(([x, y]) => P(L, x, y)));
  L._rooms = L.rooms.map((r, i) => roleRoom(L, r, i));
  // the 2nd floor's open-to-below "rooms" take the wall finish of the room below them
  for (const r of L._rooms) if (r.void) { const below = LEVELS[1].rooms.findIndex((q) => q.name === r.void); if (below >= 0) r.wall = `W:f1-${below}`; }
}
const roomAt = (L, x, z) => (CTX.rooms || L._rooms).find((r) => pip(r.pts, x, z));
const inFoot = (L, x, z) => L._foot.some((f) => pip(f, x, z)) || (CTX.foot || []).some((f) => pip(f, x, z));

function sideKey(L, kind, x, z) {
  if (kind === 'e' && !inFoot(L, x, z)) return { key: L.id === 'b' ? 'foundation' : 'siding', outside: true };
  const r = roomAt(L, x, z);
  return { key: r ? r.wall : 'paint:#ecebe7', room: r };
}

// Turned balusters are instanced (one lathe geometry per tag).
const BALUSTERS = {}; // keyed by tag (level id or reno set)
function balusterGeometry() {
  const pr = [[0.0, 0], [0.075, 0], [0.075, 0.35], [0.06, 0.4], [0.07, 0.55], [0.045, 0.75], [0.035, 1.5], [0.05, 1.9], [0.035, 2.05],
    [0.055, 2.25], [0.055, 2.75], [0.07, 2.8], [0.07, 2.9], [0, 2.9]].map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pr, 8);
}

// ------------------------------------------------------------------ walls
export function buildWall(L, w, bat) {
  const [x0, y0, x1, y1, kind, openings = [], opts = {}] = w;
  let RS = opts.rs || (opts.reno ? 'off:' + opts.reno : null);
  if (RS) bat = renoBat(RS, L.id);
  let TAG = RS || L.id;
  const a = P(L, x0, y0), b = P(L, x1, y1);
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
  const u = V(dx / len, 0, dz / len), n = V(-dz / len, 0, dx / len);
  const t = kind === 'e' ? 0.5 : 0.35;
  const base = L.floor;
  const yb = base + (opts.bottom ?? (kind === 'e' ? L.extBottom : 0));
  const slope = opts.slope; // [absolute top at start, at end]
  const yt = slope ? Math.max(...slope) : base + (opts.top ?? (kind === 'e' ? L.extTop : L.intTop));
  const topAt = (s) => (slope ? slope[0] + ((slope[1] - slope[0]) * s) / len : yt);
  const horiz = Math.abs(x1 - x0) >= Math.abs(y1 - y0);
  const frac = (v) => (horiz ? (v - x0) / (x1 - x0) : (v - y0) / (y1 - y0));
  const ops = openings.map((o) => {
    let s = frac(o[0]) * len, e = frac(o[1]) * len;
    const loAt = frac(Math.min(o[0], o[1])) * len, hiAt = frac(Math.max(o[0], o[1])) * len;
    if (s > e) [s, e] = [e, s];
    s = Math.min(len, Math.max(0, s)); e = Math.min(len, Math.max(0, e));
    if (e - s < 0.1) console.warn('opening outside its wall', w, o);
    const type = o[2], oo = o[3] || {};
    let sill = 0, head = 6.8;
    if (type === 'w') { sill = oo.sill ?? L.sill; head = oo.head ?? L.head; }
    else if (type === 'o') head = oo.head ?? 7.0;
    else if (type === 'e') head = 7.0;
    else if (type === 'g') { sill = oo.sill ?? -0.6; head = oo.head ?? 6.65; } // 7 ft sectional doors (photo 44: four 21" sections)
    else if (type === 's' || type === 'f') head = 6.9;
    else if (type === 'v') { sill = oo.sill; head = oo.head; }
    if (oo.drop) { sill += oo.drop; head += oo.drop; }
    return { s, e, type, sill: base + sill, head: base + head, oo, loAt, hiAt };
  }).sort((p, q) => p.s - q.s || p.sill - q.sill);
  // openings sharing a span stack vertically
  const cols = [];
  for (const op of ops) {
    const c = cols[cols.length - 1];
    if (c && op.s < c.e - 0.05) { c.list.push(op); c.e = Math.max(c.e, op.e); } else cols.push({ s: op.s, e: op.e, list: [op] });
  }

  const start = V(a[0], 0, a[1]);
  const at = (s, side, off) => start.clone().addScaledVector(u, s).addScaledVector(n, side * off);
  const sidesAt = (s) => {
    const c = at(s, 0, 0), off = t / 2 + 0.3;
    return [sideKey(L, kind, c.x + n.x * off, c.z + n.z * off), sideKey(L, kind, c.x - n.x * off, c.z - n.z * off)];
  };
  const underF2 = (s) => { const c = at(s, 0, 0); return L.id === 'f1' && inFoot(LV.f2, c.x, c.z); };

  const piece = (s, e, ya, yb2) => {
    if (e - s < 0.02 || yb2 - ya < 0.02) return;
    const cuts = [s];
    let prev = sidesAt(s + 0.01);
    for (let q = s + 0.4; q < e - 0.05; q += 0.4) {
      const cur = sidesAt(q);
      if (cur[0].key !== prev[0].key || cur[1].key !== prev[1].key) { cuts.push(q - 0.2); prev = cur; }
    }
    cuts.push(e);
    for (let i = 0; i < cuts.length - 1; i++) solidPiece(cuts[i], cuts[i + 1], ya, yb2);
  };
  const solidPiece = (s, e, ya, yb2) => {
    const [kp, kn] = sidesAt((s + e) / 2);
    const inner = kp.outside ? kn.key : kp.key;
    const o = at(s, -1, t / 2); o.y = ya;
    const U = u.clone().multiplyScalar(e - s), W = n.clone().multiplyScalar(t);
    if (slope && yb2 >= yt - 0.01) {
      // sloped top: build the faces directly
      const tS = topAt(s), tE = topAt(e);
      const p = (ss, side, y) => { const q = at(ss, side, t / 2); q.y = y; return q; };
      bat.face(kp.key, [p(s, 1, ya), p(e, 1, ya), p(e, 1, tE), p(s, 1, tS)], n);
      bat.face(kn.key, [p(s, -1, ya), p(e, -1, ya), p(e, -1, tE), p(s, -1, tS)], n.clone().negate());
      bat.face('cut', [p(s, 1, tS), p(e, 1, tE), p(e, -1, tE), p(s, -1, tS)], V(0, 1, 0));
      bat.face(inner, [p(s, 1, ya), p(s, -1, ya), p(s, -1, tS), p(s, 1, tS)], u.clone().negate());
      bat.face(inner, [p(e, 1, ya), p(e, -1, ya), p(e, -1, tE), p(e, 1, tE)], u);
      addSolid(o, U, W, ya, Math.max(tS, tE), TAG);
    } else {
      bat.box({ pw: kp.key, nw: kn.key, pv: 'cut', def: inner }, o, U, V(0, yb2 - ya, 0), W);
      addSolid(o, U, W, ya, yb2, TAG);
    }
    trim(kp, 1, s, e, ya, yb2);
    trim(kn, -1, s, e, ya, yb2);
  };

  const strip = (side, s, e, h0, h1, depth, key) => {
    if (e - s < 0.01) return;
    const o = at(s, side, t / 2); o.y = h0;
    bat.box(key, o, u.clone().multiplyScalar(e - s), V(0, h1 - h0, 0), n.clone().multiplyScalar(side * depth));
  };
  // baseboards, chair rail, crown on room faces; foundation strip outside
  const trim = (k, side, s, e, ya, yb2) => {
    if (k.outside) {
      if (L.id === 'f1' && ya <= yb + 0.01) { strip(side, s, e, yb, yb + 0.5, 0.1, 'extTrim'); strip(side, s, e, yb + 0.5, yb + 0.6, 0.16, 'extTrim'); }
      return;
    }
    const r = k.room;
    if (!r || r.bare || r.tile || r.void) return;
    const fy = r.y, tk = r.trim || (L.id === 'b' ? 'col:#d9b98a' : 'trim'), ceil = fy + (L.ceiling || 8);
    if (ya <= fy + 0.01 && yb2 >= fy + 0.3) strip(side, s, e, fy, fy + 0.3, 0.05, tk); // (not on the sliver under a door)
    if (r.chair && ya <= fy + 2.9 && yb2 >= fy + 3.1) strip(side, s, e, fy + 2.85, fy + 3.05, 0.06, r.trim || 'trim');
    if (r.lowerKey && ya <= fy + 0.31 && yb2 >= fy + 2.85) strip(side, s, e, fy + 0.3, fy + 2.85, 0.004, r.lowerKey);
    if (r.crown && ya <= ceil - 0.45 && yb2 >= ceil - 0.01) { strip(side, s, e, ceil - 0.42, ceil, 0.05, tk); strip(side, s, e, ceil - 0.24, ceil, 0.13, tk); strip(side, s, e, ceil - 0.08, ceil, 0.2, tk); }
    // duplex outlets along finished walls, about one per 11 ft of run (cheap realism)
    if (ya <= fy + 0.01 && yb2 >= fy + 1.6 && e - s > 3.5 && !r.noLabel) {
      const cnt = Math.floor((e - s) / 11) + 1;
      for (let i = 0; i < cnt; i++) { const sc = s + ((e - s) * (i + 0.5)) / cnt; strip(side, sc - 0.115, sc + 0.115, fy + 1.15, fy + 1.53, 0.02, 'white'); strip(side, sc - 0.05, sc + 0.05, fy + 1.22, fy + 1.3, 0.025, 'col:#e4e2dc'); strip(side, sc - 0.05, sc + 0.05, fy + 1.38, fy + 1.46, 0.025, 'col:#e4e2dc'); }
    }
  };

  let cur = 0;
  for (const c of cols) {
    piece(cur, c.s, yb, yt);
    let y = yb;
    for (const op of c.list) { if (op.sill > y) piece(c.s, c.e, y, op.sill); y = op.head; opening(op); }
    if (y < yt) piece(c.s, c.e, y, yt);
    cur = c.e;
  }
  piece(cur, len, yb, yt);

  // ---------------------------------------------------------------- openings
  function opening(op) {
    const { s, e, type, sill, head, oo } = op;
    if (type === 'v') return;
    HANG_Y0 = oo.drop ? sill : null;
    const [kp, kn] = sidesAt((s + e) / 2);
    const fk = (k) => (k.outside ? 'winTrim' : k.room && k.room.bare ? 'white' : (k.room && k.room.trim) || 'trim');
    const frameKeys = { pw: fk(kp), nw: fk(kn), def: fk(kp.outside ? kn : kp) };
    const ft = 0.15, fd = t + 0.04;
    const fbox = (s0, s1, h0, h1, keys = frameKeys, depth = fd, solid = false, off = 0) => {
      const o = at(s0, 1, off - depth / 2); o.y = h0;
      const U = u.clone().multiplyScalar(s1 - s0), W = n.clone().multiplyScalar(depth);
      bat.box(keys, o, U, V(0, h1 - h0, 0), W);
      if (solid) addSolid(o, U, W, h0, h1, TAG);
    };
    const outSide = kp.outside ? 1 : kn.outside ? -1 : 0;
    const casing = (side, k, withSill) => {
      const key = fk(k), cw = k.outside ? 0.42 : 0.29, dep = k.outside ? 0.07 : 0.06;
      strip(side, s - cw, s, sill, head + cw, dep, key);
      strip(side, e, e + cw, sill, head + cw, dep, key);
      strip(side, s - cw, e + cw, head, head + cw, dep, key);
      if (withSill) {
        if (k.outside) strip(side, s - cw - 0.05, e + cw + 0.05, sill - 0.14, sill, 0.14, 'winTrim');
        else { strip(side, s - cw - 0.08, e + cw + 0.08, sill - 0.06, sill + 0.02, 0.2, key); strip(side, s - cw, e + cw, sill - 0.36, sill - 0.06, dep, key); }
      }
    };
    if ((type !== 'o' || oo.cased) && type !== 'g') {
      for (const [side, k] of [[1, kp], [-1, kn]]) if (k.outside || (k.room && !k.room.tile && !k.room.void)) casing(side, k, type === 'w');
    }
    if (type === 'o') {
      if (oo.cased) { fbox(s, s + 0.06, sill, head); fbox(e - 0.06, e, sill, head); fbox(s, e, head - 0.06, head); }
      return;
    }
    if (type === 'g') {
      fbox(s, s + 0.25, sill, head, 'extTrim'); fbox(e - 0.25, e, sill, head, 'extTrim'); fbox(s, e, head - 0.25, head, 'extTrim');
      for (const side of [1, -1]) if ((side === 1 ? kp : kn).outside) { strip(side, s - 0.45, s, sill, head + 0.45, 0.08, 'extTrim'); strip(side, e, e + 0.45, sill, head + 0.45, 0.08, 'extTrim'); strip(side, s - 0.45, e + 0.45, head, head + 0.45, 0.08, 'extTrim'); }
      garageDoor(s + 0.25, e - 0.25, sill, head - 0.25, outSide || 1);
      return;
    }
    fbox(s, s + ft, sill, head); fbox(e - ft, e, sill, head); fbox(s, e, head - ft, head);
    if (type === 'w') {
      fbox(s, e, sill, sill + ft); windowSashes(op, s + ft, e - ft, sill + ft, head - ft, outSide);
      if (oo.apron && outSide) { // fish-scale shingle panel under the window, down to the water table / belt course
        const y0 = L.id === 'f1' ? yb + 0.6 : L.floor + 0.32, o = n.clone().multiplyScalar(outSide), pa = at(s - 0.42, 0, 0), pb = at(e + 0.42, 0, 0);
        scallopPanel(bat, [pa.x, pa.z], [pb.x, pb.z], y0, sill - 0.14, [o.x, o.z], 'scallop', true, t / 2 + 0.03);
      }
      return;
    }
    const hingeLo = (oo.hinge || 'lo') === 'lo';
    const hingeAt = hingeLo ? op.loAt : op.hiAt;
    const hingeEnd = Math.abs(hingeAt - s) < Math.abs(hingeAt - e) ? 's' : 'e';
    const into = { '+x': V(1, 0, 0), '-x': V(-1, 0, 0), '+y': V(0, 0, 1), '-y': V(0, 0, -1) }[oo.into || '+y'];
    const swingSide = n.dot(into) >= 0 ? 1 : -1;
    switch (type) {
      case 'd': case 'x': {
        const style = type === 'x' ? oo.style || 'half' : oo.style || 'panel6';
        const color = oo.color || 'door';
        // light switch plate beside the latch side of interior doors, on each finished side
        if (type === 'd') {
          const sw = hingeEnd === 's' ? [e + 0.2, e + 0.44] : [s - 0.44, s - 0.2];
          if (sw[0] > 0.05 && sw[1] < len - 0.05) for (const [sd, k] of [[1, kp], [-1, kn]]) if (k.room && !k.room.void && !k.outside) { strip(sd, sw[0], sw[1], base + 3.85, base + 4.27, 0.02, 'white'); strip(sd, sw[0] + 0.09, sw[1] - 0.09, base + 3.98, base + 4.14, 0.03, 'col:#e8e6e0'); }
        }
        const pid = L.id + ':' + w.slice(0, 2).join(',') + ':' + s.toFixed(1);
        if (oo.pair) {
          const mid = (s + e) / 2;
          hang(s + ft, mid, 's', swingSide, head - ft - 0.02, style, color, 85, pid, !oo.closed);
          hang(mid, e - ft, 'e', swingSide, head - ft - 0.02, style, color, 85, pid, !oo.closed);
        } else hang(s + ft, e - ft, hingeEnd, swingSide, head - ft - 0.02, style, color, type === 'x' ? 80 : 85, null, type !== 'x' && !oo.closed);
        break;
      }
      case 'e': { // entry: as built = oak door with leaded oval-glass lites and sidelights; Classic refresh = black glass double door
        const keep = [bat, RS, TAG];
        bat = renoBat('off:classic', L.id); RS = TAG = 'off:classic';
        const sl = oo.sl ?? 1.15;
        for (const [a0, a1] of [[s + ft, s + ft + sl], [e - ft - sl, e - ft]]) { // sidelights: raised panel low, three rain-glass panes (photo 06)
          const g0 = sill + 3.2, g1 = head - ft - 0.12, pane = (g1 - g0) / 3;
          fbox(a0, a1, sill, g0, 'frontDoor', 0.15, true);
          fbox(a0 + 0.17, a1 - 0.17, sill + 1.1, g0 - 0.3, 'frontDoor', 0.18);
          fbox(a0 + 0.24, a1 - 0.24, sill + 1.17, g0 - 0.37, 'frontDoor', 0.21);
          fbox(a0 + 0.12, a1 - 0.12, g0, g1, 'frosted', 0.05, true);
          fbox(a0, a0 + 0.12, g0, g1, 'frontDoor', 0.16); fbox(a1 - 0.12, a1, g0, g1, 'frontDoor', 0.16);
          for (let i = 1; i < 3; i++) fbox(a0, a1, g0 + pane * i - 0.04, g0 + pane * i + 0.04, 'frontDoor', 0.12);
          fbox(a0, a1, g1, head - ft, 'frontDoor', 0.16);
        }
        fbox(s + ft + sl, s + ft + sl + 0.2, sill, head); fbox(e - ft - sl - 0.2, e - ft - sl, sill, head);
        hang(s + ft + sl + 0.2, e - ft - sl - 0.2, hingeEnd, swingSide, head - ft - 0.02, 'entry', 'frontDoor', 80, null, false);
        bat = renoBat('on:classic', L.id); RS = TAG = 'on:classic';
        { const pid = L.id + ':classic:' + s.toFixed(1), mid = (s + e) / 2;
          hang(s + ft, mid, 's', swingSide, head - ft - 0.02, 'glassdoor', 'black', 80, pid, false);
          hang(mid, e - ft, 'e', swingSide, head - ft - 0.02, 'glassdoor', 'black', 0, pid, false); } // stair-side leaf is the fixed (inactive) leaf: it would swing into the flared bottom steps
        [bat, RS, TAG] = keep;
        break;
      }
      case 'f': {
        const pid = L.id + ':f:' + s.toFixed(1);
        if (oo.pair) {
          const mid = (s + e) / 2;
          hang(s + ft, mid, 's', swingSide, head - ft - 0.02, 'french', 'door', 88, pid, true);
          hang(mid, e - ft, 'e', swingSide, head - ft - 0.02, 'french', 'door', 88, pid, true);
        } else hang(s + ft, e - ft, hingeEnd, swingSide, head - ft - 0.02, 'french', 'door', 85, null, true);
        break;
      }
      case 's': {
        const mid = (s + e) / 2;
        const kInside = kp.outside ? -1 : 1;
        slidePanel(sashKit(mid - 0.05, -0.08 * kInside), e - ft - (mid - 0.05), sill + ft, head - ft, true);
        const pw = mid + 0.05 - (s + ft);
        slider(s + ft, pw, 0.08 * kInside, pw - 0.35, sill, head, (k) => slidePanel(k, pw, sill + ft, head - ft, false));
        break;
      }
      case 'p': {
        const w = e - s - 2 * ft;
        slider(s + ft, w, 0, -(w - 0.25), sill, head, (k) => sixPanel(k, w, head - ft - sill, sill, 'door', 0));
        break;
      }
      case 'c': { // bypass closet doors, oak 6-panel
        const mid = (s + e) / 2, side = kp.room && !kp.room.noLabel ? 1 : -1;
        const wB = e - ft - (mid - 0.08), wA = mid + 0.08 - (s + ft);
        const kB = sashKit(mid - 0.08, -0.07 * side);
        sixPanel(kB, wB, head - ft - sill, sill, 'door', 0);
        kB.solid(0, -0.08, wB, 0.08, sill, head);
        slider(s + ft, wA, 0.07 * side, wB - 0.15, sill, head, (k) => sixPanel(k, wA, head - ft - sill, sill, 'door', 0));
        break;
      }
    }

    function slidePanel(k, w, h0, h1, fixed) {
      k.box('winExt', 0, h0, -0.07, 0.25, h1, 0.07); k.box('winExt', w - 0.25, h0, -0.07, w, h1, 0.07);
      k.box('winExt', 0, h0, -0.07, w, h0 + 0.35, 0.07); k.box('winExt', 0, h1 - 0.25, -0.07, w, h1, 0.07);
      k.box('glass', 0.25, h0 + 0.35, -0.02, w - 0.25, h1 - 0.25, 0.02);
      k.box('chrome', w - 0.4, h0 + 3.0, 0.07, w - 0.3, h0 + 3.8, 0.14);
      if (fixed) k.solid(0, -0.07, w, 0.07, h0, h1);
    }
    function slider(startS, w, offN, slideBy, y0, y1, buildFn) {
      const db = new Batcher();
      buildFn(new Kit(db, TAG).at(0, 0, 0, 0));
      const pivot = new THREE.Group();
      db.build(pivot);
      const base0 = at(startS, 1, offN);
      pivot.rotation.y = Math.atan2(-u.z, u.x);
      const solid = { cx: 0, cz: 0, ux: u.x, uz: u.z, hl: w / 2, ht: 0.08, y0, y1, tag: TAG };
      PHYS.solids.push(solid);
      const d = { kind: 'slide', level: L.id, rs: RS, pivot, t: 0, target: 0, solid };
      d.apply = () => {
        const off = slideBy * d.t;
        pivot.position.set(base0.x + u.x * off, 0, base0.z + u.z * off);
        solid.cx = pivot.position.x + u.x * w / 2; solid.cz = pivot.position.z + u.z * w / 2;
      };
      registerDoor(d, pivot);
    }
  }

  function sashKit(s0, off = 0) {
    const p = at(s0, 1, off);
    const rot = (Math.atan2(-u.z, u.x) * 180) / Math.PI;
    return new Kit(bat, TAG).at(p.x, p.z, 0, rot);
  }

  function windowSashes(op, a0, a1, h0, h1, outSide) {
    const style = op.oo.g || L.grille || 'cs';
    if (op.oo.block) { const kk = sashKit(a0, 0); kk.box('frosted', 0, h0, -0.12, a1 - a0, h1, 0.12); grid(kk, 0, a1 - a0, h0, h1, Math.round((a1 - a0) / 0.67), 2, 'col:#cfd6d8', 0, 0.26); addSolid(kk.P(0, 0, -0.1), kk.ex().multiplyScalar(a1 - a0), kk.ez().multiplyScalar(0.2), h0, h1, TAG); return; }
    const k = sashKit(a0, 0);
    const w = a1 - a0, h = h1 - h0;
    const cols = op.oo.cols || (style === 'gb' ? 4 : 1), rows = op.oo.rows || (style === 'gb' ? 2 : 1);
    const glassAndGrid = (x0, x1, y0, y1, zoff = 0) => {
      k.box('glass', x0, y0, zoff - 0.02, x1, y1, zoff + 0.02);
      addSolid(k.P(x0, 0, zoff - 0.03), k.ex().multiplyScalar(x1 - x0), k.ez().multiplyScalar(0.06), y0, y1, TAG);
      if (cols > 1 || rows > 1) grid(k, x0, x1, y0, y1, cols, rows, 'white', zoff);
    };
    // sash frames: oak inside, almond vinyl-clad outside (local +z is the wall's +n side)
    const kIn = sidesAt((op.s + op.e) / 2)[outSide > 0 ? 1 : 0];
    const inKey = L.id === 'b' ? 'white' : (kIn.room && kIn.room.trim) || 'trim', outKey = op.oo.red ? 'sashAccent' : 'winExt';
    const rail = (x0, x1, y0, y1, zoff = 0) => {
      const sgn = outSide || -1;
      k.box(sgn > 0 ? inKey : outKey, x0, y0, zoff - 0.08, x1, y1, zoff);
      k.box(sgn > 0 ? outKey : inKey, x0, y0, zoff, x1, y1, zoff + 0.08);
    };
    const sashFrame = (x0, x1, y0, y1, zoff = 0) => {
      const b = 0.17;
      rail(x0, x1, y0, y0 + b, zoff); rail(x0, x1, y1 - b, y1, zoff); rail(x0, x0 + b, y0, y1, zoff); rail(x1 - b, x1, y0, y1, zoff);
      return [x0 + b, x1 - b, y0 + b, y1 - b];
    };
    const gk = outSide && L.id !== 'b' ? new Kit(renoBat('on:classic', L.id), 'on:classic').at(k.ox, k.oz, k.oy, k.rot) : null;
    const cs = (x0, x1) => { const f = sashFrame(x0, x1, h0, h1); glassAndGrid(f[0], f[1], f[2], f[3]); if (gk) grid(gk, f[0], f[1], f[2], f[3], 2, f[3] - f[2] > 3.2 ? 3 : 2, 'black', outSide * 0.05, 0.03); };
    if (op.oo.blind) { // white blind / roller shade raised to the head, on the room side (kitchen, office, bedrooms, baths in the photos)
      const sg = outSide || -1, za = -sg * (t / 2 + 0.03), zb = -sg * (t / 2 + 0.24), dr = op.oo.blind === true ? 0.55 : op.oo.blind;
      k.box('white', -0.12, h1 - dr, Math.min(za, zb), w + 0.12, h1 + 0.12, Math.max(za, zb));
      k.box('col:#e9e6df', -0.12, h1 - dr - 0.06, Math.min(za, zb) - 0.01, w + 0.12, h1 - dr, Math.max(za, zb) + 0.01);
    }
    if (style === 'cs2') { cs(0, w / 2); cs(w / 2, w); }
    else if (style === 'cs3') { cs(0, w * 0.25); const f = sashFrame(w * 0.25, w * 0.75, h0, h1); glassAndGrid(f[0], f[1], f[2], f[3]); cs(w * 0.75, w); }
    else if (style === 'cs' || style === 'gb') cs(0, w);
    else { const mid = h0 + h / 2; const lo = sashFrame(0, w, h0, mid + 0.06, 0.06), hi = sashFrame(0, w, mid - 0.06, h1, -0.06); glassAndGrid(lo[0], lo[1], lo[2], lo[3], 0.06); glassAndGrid(hi[0], hi[1], hi[2], hi[3], -0.06); }
  }

  function hang(a0, a1, hingeEnd, side, h, style, color, ang, pair, startOpen) {
    const FY = HANG_Y0 ?? L.floor;
    const w = a1 - a0;
    const hingeS = hingeEnd === 's' ? a0 : a1;
    const p = at(hingeS, side, t / 2 - 0.08);
    const dirClosed = u.clone().multiplyScalar(hingeEnd === 's' ? 1 : -1);
    const r = (ang * Math.PI) / 180;
    const ld = dirClosed.clone().multiplyScalar(Math.cos(r)).addScaledVector(n, side * Math.sin(r));
    const db = new Batcher();
    leaf(new Kit(db, TAG).at(0, 0, 0, 0), w, h - FY, FY, style, color);
    const pivot = new THREE.Group();
    db.build(pivot);
    pivot.position.set(p.x, 0, p.z);
    const solid = { cx: 0, cz: 0, ux: 1, uz: 0, hl: w / 2, ht: 0.09, y0: FY, y1: h, tag: TAG };
    PHYS.solids.push(solid);
    const d = { kind: 'hinge', level: L.id, rs: RS, pivot, pair, solid, t: startOpen ? 1 : 0, target: startOpen ? 1 : 0,
      closed: Math.atan2(-dirClosed.z, dirClosed.x), open: Math.atan2(-ld.z, ld.x) };
    d.apply = () => {
      const a = lerpAngle(d.closed, d.open, d.t);
      pivot.rotation.y = a;
      const dx = Math.cos(a), dz = -Math.sin(a);
      solid.ux = dx; solid.uz = dz; solid.cx = p.x + dx * w / 2; solid.cz = p.z + dz * w / 2;
    };
    registerDoor(d, pivot);
  }
  function registerDoor(d, pivot) {
    const idx = DOORS.length;
    pivot.traverse((o) => { if (o.isMesh) { o.userData.door = idx; o.userData.measurable = true; } });
    d.apply();
    DOORS.push(d);
  }
  function leaf(k, w, h, y0, style, color) {
    let key = color.startsWith('#') ? 'wood:' + color : color; const th = 0.15;
    if (style === 'panel6') {
      sixPanel(k, w, h, y0, key, 0);
    } else if (style === 'panel2') { // two-panel shaker (white doors throughout, photos 18, 23, 31)
      k.box(key, 0, y0, -th / 2, w, y0 + h, th / 2);
      const st = 0.36, mid = y0 + h * 0.4;
      for (const [a, b] of [[y0 + st, mid - 0.12], [mid + 0.12, y0 + h - st]]) for (const s of [-1, 1]) {
        k.box('doorPanel', st, a, s * (th / 2 - 0.02), w - st, b, s * (th / 2 + 0.002));
        for (const [q0, q1, r0, r1] of [[st, w - st, a, a + 0.03], [st, w - st, b - 0.03, b], [st, st + 0.03, a, b], [w - st - 0.03, w - st, a, b]]) k.box('doorLine', q0, r0, s * (th / 2 - 0.02), q1, r1, s * (th / 2 + 0.006));
      }
    } else if (style === 'louver') { // full-louver utility door (basement furnace closet, photo 37)
      const st = 0.35;
      k.box(key, 0, y0, -th / 2, st, y0 + h, th / 2); k.box(key, w - st, y0, -th / 2, w, y0 + h, th / 2);
      k.box(key, st, y0 + h - st, -th / 2, w - st, y0 + h, th / 2); k.box(key, st, y0, -th / 2, w - st, y0 + 0.6, th / 2); k.box(key, st, y0 + h / 2 - 0.15, -th / 2, w - st, y0 + h / 2 + 0.15, th / 2);
      for (let y = y0 + 0.65; y < y0 + h - st - 0.05; y += 0.13) k.box(key, st, y, -0.05, w - st, y + 0.04, 0.05);
    } else if (style === 'entry') { // oak slab: two tall round-top leaded lites, two raised panels below (photos 06, 61)
      const m = 0.17 * w, lw = 0.27 * w, gap = w - 2 * m - 2 * lw, yb = y0 + 2.7, apex = y0 + h - 0.7, ys = apex - lw / 2;
      const xs = [m, m + lw + gap];
      k.box(key, 0, y0, -th / 2, w, yb, th / 2); k.box(key, 0, ys, -th / 2, w, y0 + h, th / 2);
      k.box(key, 0, yb, -th / 2, m, ys, th / 2); k.box(key, m + lw, yb, -th / 2, m + lw + gap, ys, th / 2); k.box(key, w - m, yb, -th / 2, w, ys, th / 2);
      const seg = (x0, ya, x1, yb2, z, t = 0.011) => { // a lead/brass came on the door face
        const dx = x1 - x0, dy = yb2 - ya, d = Math.hypot(dx, dy); if (d < 1e-4) return;
        const nx = (-dy / d) * t, ny = (dx / d) * t;
        k.bat.box('brass', k.P(x0 - nx, ya - ny, z), V(dx, dy, 0), V(2 * nx, 2 * ny, 0), V(0, 0, Math.sign(z) * 0.01));
      };
      for (const x of xs) {
        const cx = x + lw / 2, r = lw / 2;
        k.box('frosted', x, yb, -0.02, x + lw, ys, 0.02); // rectangular part of the lite: real glass in the opening
        for (const sd of [-1, 1]) {
          const zf = sd * (th / 2 + 0.004), zc = sd * 0.025;
          // round top: glass laid over the slab face, with its came outline
          const arc = [...Array(13)].map((_, i) => { const a = (Math.PI * i) / 12; return [cx + Math.cos(a) * r, ys + Math.sin(a) * r]; });
          k.bat.face('frosted', [k.P(x + lw, ys, zf), ...arc.map(([ax, ay]) => k.P(ax, ay, zf)), k.P(x, ys, zf)], V(0, 0, sd));
          for (let i = 0; i < arc.length - 1; i++) seg(arc[i][0], arc[i][1], arc[i + 1][0], arc[i + 1][1], zf);
          // leaded pattern: center came, a chain of bevelled diamonds, a pair of diamonds at the foot, arcs echoing the top
          seg(cx, yb, cx, ys + r * 0.55, zc); seg(x, yb, x, ys, zc); seg(x + lw, yb, x + lw, ys, zc); seg(x, yb, x + lw, yb, zc);
          const H2 = ys - yb, dmd = (yc, hw, hh) => { seg(cx, yc - hh, cx + hw, yc, zc); seg(cx + hw, yc, cx, yc + hh, zc); seg(cx, yc + hh, cx - hw, yc, zc); seg(cx - hw, yc, cx, yc - hh, zc); };
          dmd(yb + H2 * 0.62, r * 0.55, H2 * 0.09); dmd(yb + H2 * 0.38, r * 0.45, H2 * 0.07);
          for (const qx of [x + lw * 0.27, x + lw * 0.73]) { seg(qx, yb + 0.05, qx + lw * 0.2, yb + H2 * 0.11, zc); seg(qx + lw * 0.2, yb + H2 * 0.11, qx, yb + H2 * 0.22, zc); seg(qx, yb + H2 * 0.22, qx - lw * 0.2, yb + H2 * 0.11, zc); seg(qx - lw * 0.2, yb + H2 * 0.11, qx, yb + 0.05, zc); }
          seg(x, yb + H2 * 0.62, cx - r * 0.55, yb + H2 * 0.62, zc); seg(cx + r * 0.55, yb + H2 * 0.62, x + lw, yb + H2 * 0.62, zc);
          seg(x, ys - 0.02, x + lw, ys - 0.02, zc);
          seg(x, yb + H2 * 0.85, cx, ys - 0.02, zc); seg(x + lw, yb + H2 * 0.85, cx, ys - 0.02, zc);
        }
      }
      // two raised panels below the lites
      for (const [p0, p1] of [[m * 0.75, w / 2 - gap * 0.3], [w / 2 + gap * 0.3, w - m * 0.75]]) for (const sd of [-1, 1]) {
        k.box(key, p0, y0 + 0.85, sd * th / 2, p1, y0 + 2.3, sd * (th / 2 + 0.015));
        k.box(key, p0 + 0.08, y0 + 0.93, sd * th / 2, p1 - 0.08, y0 + 2.22, sd * (th / 2 + 0.035));
        for (const [q0, q1, r0, r1] of [[p0, p1, y0 + 0.85, y0 + 0.88], [p0, p1, y0 + 2.27, y0 + 2.3], [p0, p0 + 0.03, y0 + 0.85, y0 + 2.3], [p1 - 0.03, p1, y0 + 0.85, y0 + 2.3]]) k.box('col:#3e2812', q0, r0, sd * th / 2, q1, r1, sd * (th / 2 + 0.02));
      }
    } else if (style === 'victorian') { // old pine door kept in the remodel: etched glass over two raised panels; burgundy outside
      const st = 0.42, gB = y0 + h * 0.43, gT = y0 + h - 0.5, out = key; key = 'sashAccent';
      for (const [a, b, c, d] of [[0, st, y0, y0 + h], [w - st, w, y0, y0 + h], [st, w - st, gT, y0 + h], [st, w - st, y0, y0 + 0.75], [st, w - st, gB - 0.35, gB]]) { k.box(key, a, c, 0, b, d, th / 2); k.box(out, a, c, -th / 2, b, d, 0); }
      k.box('frosted', st, gB, -0.02, w - st, gT, 0.02);
      for (const [a, b] of [[st, w / 2 - 0.08], [w / 2 + 0.08, w - st]]) { k.box(key, a, y0 + 0.75, 0, b, gB - 0.35, th / 2 - 0.03); k.box(out, a, y0 + 0.75, -th / 2 + 0.03, b, gB - 0.35, 0); k.box(key, a + 0.12, y0 + 0.87, 0, b - 0.12, gB - 0.47, th / 2 + 0.01); k.box(out, a + 0.12, y0 + 0.87, -th / 2 - 0.01, b - 0.12, gB - 0.47, 0); }
      k.box(key, w / 2 - 0.08, y0 + 0.75, 0, w / 2 + 0.08, gB - 0.35, th / 2); k.box(out, w / 2 - 0.08, y0 + 0.75, -th / 2, w / 2 + 0.08, gB - 0.35, 0);
    } else if (style === 'glassdoor') { // black steel-look frame, full glass with simulated divided lites
      const st = 0.3;
      k.box(key, 0, y0, -th / 2, st, y0 + h, th / 2); k.box(key, w - st, y0, -th / 2, w, y0 + h, th / 2);
      k.box(key, st, y0 + h - st, -th / 2, w - st, y0 + h, th / 2); k.box(key, st, y0, -th / 2, w - st, y0 + 0.7, th / 2);
      k.box('glass', st, y0 + 0.7, -0.02, w - st, y0 + h - st, 0.02);
      grid(k, st, w - st, y0 + 0.7, y0 + h - st, 2, 5, key, 0, 0.07);
    } else if (style === 'french' || style === 'full' || style === 'half') {
      const st = style === 'french' ? 0.32 : 0.38;
      k.box(key, 0, y0, -th / 2, st, y0 + h, th / 2); k.box(key, w - st, y0, -th / 2, w, y0 + h, th / 2);
      k.box(key, st, y0 + h - st, -th / 2, w - st, y0 + h, th / 2);
      const gTop = y0 + h - st, gBot = style === 'half' ? y0 + h * 0.5 : y0 + 0.75;
      k.box(key, st, y0, -th / 2, w - st, gBot, th / 2);
      k.box('glass', st, gBot, -0.02, w - st, gTop, 0.02);
      grid(k, st, w - st, gBot, gTop, style === 'french' ? 3 : 3, style === 'half' ? 3 : 5, key, 0, 0.07);
    }
    for (const s of [-1, 1]) {
      k.box('brass', w - 0.32, y0 + 3.0, s * (th / 2), w - 0.22, y0 + 3.1, s * (th / 2 + 0.12));
      k.box('brass', w - 0.6, y0 + 3.0, s * (th / 2 + 0.1), w - 0.22, y0 + 3.08, s * (th / 2 + 0.14));
    }
  }
  function sixPanel(k, w, h, y0, key, zoff) {
    const th = 0.15;
    k.box(key, 0, y0, zoff - th / 2, w, y0 + h, zoff + th / 2);
    const pk = key === 'door' ? 'doorPanel' : tone(key, 0.07);
    const rows = [[0.06, 0.4], [0.45, 0.76], [0.8, 0.95]];
    for (const [r0, r1] of rows) for (const [c0, c1] of [[0.12, 0.47], [0.53, 0.88]]) {
      for (const s of [-1, 1]) {
        k.box(key === 'door' ? 'doorLine' : tone(pk, -0.12), w * c0, y0 + h * r0, zoff + s * th / 2, w * c1, y0 + h * r1, zoff + s * (th / 2 + 0.02));
        k.box(pk, w * c0 + 0.06, y0 + h * r0 + 0.06, zoff + s * th / 2, w * c1 - 0.06, y0 + h * r1 - 0.06, zoff + s * (th / 2 + 0.045));
      }
    }
  }
  // sectional garage door, mounted just inside the wall: its sections roll up the tracks and back under the ceiling
  // (E in walk mode, or "open all doors"). drawSection(k, w, sh, i) draws section i (0 = bottom) in y 0..sh.
  function sectionalDoor(a0, a1, h0, h1, outSide, drawSection, rows = 4, extra) {
    const w = a1 - a0, h = h1 - h0, sh = h / rows, R = 0.7, zo = -outSide * (t / 2 + 0.12);
    const p = at(a0, 1, 0), pivot = new THREE.Group();
    pivot.position.set(p.x, 0, p.z); pivot.rotation.y = Math.atan2(-u.z, u.x);
    const secs = [];
    for (let i = 0; i < rows; i++) {
      const db = new Batcher(), g = new THREE.Group();
      const kk = new Kit(db, TAG), box = kk.box.bind(kk); // allow reversed z extents (doors facing -z)
      kk.box = (key, x0, y0, z0, x1, y1, z1) => box(key, x0, y0, Math.min(z0, z1), x1, y1, Math.max(z0, z1));
      drawSection(kk, w, sh, i);
      db.build(g); pivot.add(g); secs.push(g);
      if (extra) extra(g, w, sh, i, h0 + i * sh);
    }
    const arc = (Math.PI * R) / 2;
    const track = (s) => { // [y, depth inward] along the track, s = distance from the closed bottom edge
      if (s <= h) return [h0 + s, 0];
      const s2 = s - h;
      if (s2 <= arc) { const f = s2 / R; return [h1 + R * Math.sin(f), R - R * Math.cos(f)]; }
      return [h1 + R, R + s2 - arc];
    };
    const c = at((a0 + a1) / 2, 1, 0);
    const solid = { cx: c.x + n.x * zo, cz: c.z + n.z * zo, ux: u.x, uz: u.z, hl: w / 2, ht: 0.15, y0: h0, y1: h1, tag: TAG };
    PHYS.solids.push(solid);
    const d = { kind: 'garage', dur: 2.6, level: L.id, rs: RS, pivot, pair: null, solid, t: 0, target: 0 };
    d.apply = () => {
      const lift = d.t * (h + 0.1);
      for (let i = 0; i < rows; i++) {
        const [ya, da] = track(i * sh + lift), [yb, db2] = track((i + 1) * sh + lift);
        secs[i].position.set(0, ya, zo - outSide * da);
        secs[i].rotation.x = Math.atan2(-outSide * (db2 - da), yb - ya);
      }
      solid.y0 = h0 + lift;
    };
    registerDoor(d, pivot);
  }
  function garageDoor(a0, a1, h0, h1, outSide) { // flush steel sections, four horizontal joints
    sectionalDoor(a0, a1, h0, h1, outSide, (k, w, sh, i) => {
      k.box('garageDoor', 0, 0, -0.08, w, sh, 0.08);
      if (i < 3) k.box('blackMatte', 0, sh - 0.02, outSide * 0.08, w, sh + 0.02, outSide * 0.09);
      if (i === 0) for (const s of [-1, 1]) k.box('garageDoor', 0, 0, s * 0.08, w, 0.05, s * 0.1);
      // raised panels (two per 3 ft), and a row of 4-lite windows across the top section (photo 01)
      const np = Math.max(2, Math.round(w / 1.6)), pw = w / np;
      for (let j = 0; j < np; j++) {
        const x0 = j * pw + 0.14, x1 = (j + 1) * pw - 0.14, z = outSide * 0.08;
        if (i === 3) { k.box('glass', x0 + 0.05, 0.18, z - outSide * 0.02, x1 - 0.05, sh - 0.18, z + outSide * 0.01); k.box('garageDoor', (x0 + x1) / 2 - 0.03, 0.18, z, (x0 + x1) / 2 + 0.03, sh - 0.18, z + outSide * 0.03); k.box('garageDoor', x0, sh / 2 - 0.03, z, x1, sh / 2 + 0.03, z + outSide * 0.03); }
        else k.box('garageDoor', x0, 0.16, z, x1, sh - 0.16, z + outSide * 0.04);
      }
    }, 4, (g, w, sh, i, base) => { // modern facade: a band of frosted glass in black frames rides on the doors
      const y0 = Math.max(4.7, base), y1 = Math.min(5.7, base + sh);
      if (y1 <= y0) return;
      const db = new Batcher(), k = new Kit(db, 'on:facade'), z = outSide * 0.08, n = Math.round(w / 2.0);
      const zz = (a, b) => [Math.min(z + outSide * a, z + outSide * b), Math.max(z + outSide * a, z + outSide * b)];
      { const [za, zb] = zz(0, 0.06); k.box('black', 0, y0 - base, za, w, y1 - base, zb); }
      const [fa, fb] = zz(0.06, 0.08);
      for (let j = 0; j < n; j++) k.box('frosted', (w * j) / n + 0.12, Math.max(4.8, y0) - base, fa, (w * (j + 1)) / n - 0.12, Math.min(5.6, y1) - base, fb);
      const fg = new THREE.Group(); fg.userData = { rs: 'on:facade', level: L.id }; db.build(fg); g.add(fg); DOOR_RENOS.push(fg);
    });
  }
}

// muntin grid on a Kit in its x/y plane at depth z
export function grid(k, x0, x1, y0, y1, cols, rows, key, z, d = 0.04) {
  for (let i = 1; i < cols; i++) { const x = x0 + ((x1 - x0) * i) / cols; k.box(key, x - 0.03, y0, z - d / 2, x + 0.03, y1, z + d / 2); }
  for (let j = 1; j < rows; j++) { const y = y0 + ((y1 - y0) * j) / rows; k.box(key, x0, y - 0.03, z - d / 2, x1, y + 0.03, z + d / 2); }
}

// ------------------------------------------------------------------ slabs & floors
const ftPoly = (pts) => pts.map(([x, y]) => toFt([x, y]));
function buildFloors(L, bats) {
  const bat = bats[L.id];
  for (const r of L._rooms) {
    if (!r.floorKey || r.void) continue;
    const holes = L._holes.filter((h) => h.some(([hx, hz]) => pip(r.pts, hx, hz)));
    bat.poly(r.floorKey, r.pts, r.y + 0.012, holes);
  }
  if (L.id === 'b') {
    for (const f of L._foot) { bat.prism({ top: 'floor:concrete', side: 'foundation' }, f, L.floor - 0.4, L.floor); addFloorPoly(f, [], L.floor, 'b'); }
  }
  if (L.id === 'f1') {
    const slab = ftPoly(L.slab);
    bat.prism({ top: 'subfloor', bottom: 'joist', side: 'joist' }, slab, -0.9, 0, L._holes);
    addFloorPoly(slab, L._holes, 0, 'f1');
    // back entry: a landing at grade (three steps below the kitchen)
    const en = ftPoly(L.entry);
    bat.prism({ top: 'subfloor', bottom: 'joist', side: 'white' }, en, ENTRY - 0.6, ENTRY);
    addFloorPoly(en, [], ENTRY, 'f1');
    // porch: concrete deck on a parged base, four risers above the walk
    const po = ftPoly(L.porch);
    bat.prism({ top: 'floor:paving', side: 'foundation' }, po, H.grade - 0.4, -0.12);
    addFloorPoly(po, [], -0.12, 'f1');
    // nook ceiling (under the porch roof) and the porch's beadboard ceiling
    bats.f2.poly('ceiling', [[PORCH.x0, PORCH.y0], [PORCH.nookX, PORCH.y0], [PORCH.nookX, PORCH.nookY], [PORCH.x0, PORCH.nookY]], H.ceil1 - 0.25, [], true);
    bats.f2.poly('col:#b9c7c4', [[PORCH.nookX, PORCH.y0], [PORCH.x1 + 0.6, PORCH.y0], [PORCH.x1 + 0.6, PORCH.y1 + 0.6], [PORCH.nookX, PORCH.y1 + 0.6]], H.porchEave - 0.25, [], true);
  }
  if (L.id === 'f2') {
    const f = L._foot[0];
    bat.prism({ top: 'subfloor', bottom: 'ceiling' }, f, H.ceil1, H.f2, L._holes);
    bat.prism({ side: 'white' }, f, H.ceil1, H.f2, L._holes);
    addFloorPoly(f, L._holes, H.f2, 'f2');
    // ceilings: flat at 8 ft, following the roof slopes down to the knee walls (0.5 ft cells; flat runs merged)
    const S = 0.5, cb = bats.roof, e = 1e-3;
    for (let y = CORE.y0; y < CORE.y1 - 1e-6; y += S) {
      let run = null;
      const flush = () => { if (run) { cb.face('ceiling', [V(run[0], H.f2 + 8, y), V(run[1], H.f2 + 8, y), V(run[1], H.f2 + 8, y + S), V(run[0], H.f2 + 8, y + S)], V(0, -1, 0)); run = null; } };
      for (let x = REAR.x0; x < WING.x1 - 1e-6; x += S) {
        if (!pip(f, x + S / 2, y + S / 2)) { flush(); continue; }
        const h = [[x + e, y + e], [x + S - e, y + e], [x + S - e, y + S - e], [x + e, y + S - e]].map(([a, b]) => ceilAt(a, b));
        if (h.every((q) => q > 7.999)) { if (run) run[1] = x + S; else run = [x, x + S]; continue; }
        flush();
        cb.face('ceiling', [V(x, H.f2 + h[0], y), V(x + S, H.f2 + h[1], y), V(x + S, H.f2 + h[2], y + S), V(x, H.f2 + h[3], y + S)], V(0, -1, 0));
      }
      flush();
    }
  }
}

// ------------------------------------------------------------------ stairs & railings
// 'turned' (oak, lathe balusters), 'square' (painted), 'hand' (wall handrail only), 'iron' (black square spindles)
export function railing(bat, a, b, h0, h1, key = 'trim', tag = 'f1', style = 'turned', posts = true, Hh = 2.9) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
  if (len < 0.01) return;
  const n = V(-dz / len, 0, dx / len);
  const rk = typeof key === 'string' ? key : key.rail, bk = typeof key === 'string' ? key : key.bal;
  bat.box(rk, V(a[0], h0 + Hh, a[1]).addScaledVector(n, -0.12), V(dx, h1 - h0, dz), V(0, 0.2, 0), n.clone().multiplyScalar(0.24));
  if (style === 'hand') return;
  if (style === 'square' || style === 'iron') bat.box(bk, V(a[0], h0 + 0.3, a[1]).addScaledVector(n, -0.08), V(dx, h1 - h0, dz), V(0, 0.15, 0), n.clone().multiplyScalar(0.16));
  const cnt = Math.max(2, Math.round(len / 0.4));
  for (let i = 1; i < cnt; i++) {
    const f = i / cnt, x = a[0] + dx * f, z = a[1] + dz * f, h = h0 + (h1 - h0) * f;
    if (style === 'square') bat.aabox(bk, x - 0.06, h + 0.3, z - 0.06, x + 0.06, h + Hh, z + 0.06);
    else if (style === 'iron') { bat.aabox('black', x - 0.03, h + 0.45, z - 0.03, x + 0.03, h + Hh, z + 0.03); if (i % 2) for (const yy of [h + 1.2, h + 1.75]) bat.aabox('black', x - 0.06, yy, z - 0.06, x + 0.06, yy + 0.18, z + 0.06); }
    else (BALUSTERS[tag] = BALUSTERS[tag] || []).push([x, h, z]);
  }
  if (posts) for (const [x, z, h] of [[a[0], a[1], h0], [b[0], b[1], h1]]) {
    bat.aabox(bk, x - 0.2, h, z - 0.2, x + 0.2, h + Hh + 0.35, z + 0.2);
    bat.aabox(bk, x - 0.25, h + Hh + 0.35, z - 0.25, x + 0.25, h + Hh + 0.45, z + 0.25);
  }
  const u = V(dx / len, 0, dz / len);
  addSolid(V(a[0], 0, a[1]).addScaledVector(n, -0.15), u.clone().multiplyScalar(len), n.clone().multiplyScalar(0.3), Math.min(h0, h1), Math.max(h0, h1) + Hh, tag);
}
export function stairGeom() { return { treads: [{}, {}, {}], n: 0 }; }
const WOODRAIL = { rail: 'wood:#5c3b26', bal: 'trim' };

function buildStairs(bats) {
  // main stair: straight run up the middle of the house, rising east (toward the street)
  const M = STAIRS.main, n = M.risers, r = H.f2 / n, d = (M.x1 - M.x0) / (n - 1);
  for (let i = 1; i < n; i++) {
    const xa = M.x0 + (i - 1) * d, xb = M.x0 + i * d, top = i * r;
    bats.f1.aabox({ def: 'trim', pv: 'wood:#7a4f2e' }, xa, Math.max(0, top - 0.75), M.y0, xb, top, M.y1);
    bats.f1.aabox('wood:#7a4f2e', xa - 0.07, top - 0.09, M.y0, xa + 0.02, top + 0.005, M.y1);
    addFloorRect(xa, M.y0, xb, M.y1, top, 'f1');
  }
  // family-room side: a closed stringer wall with a railing while the stair is below the ceiling (photo 13)
  {
    const z = 22, xEnd = 92.6, top = (x) => Math.max(0.4, ((x - M.x0) / d) * r + 0.35);
    const wk = LV.f1._rooms.find((q) => q.name === 'Family Room').wall;
    const quad = (key, zz, nz) => bats.f1.face(key, [V(M.x0, 0, zz), V(xEnd, 0, zz), V(xEnd, top(xEnd), zz), V(M.x0, top(M.x0), zz)], V(0, 0, nz));
    quad(wk, z - 0.17, -1); quad('white', z + 0.17, 1);
    bats.f1.box('trim', V(M.x0, top(M.x0), z - 0.2), V(xEnd - M.x0, top(xEnd) - top(M.x0), 0), V(0, 0.1, 0), V(0, 0, 0.4));
    bats.f1.aabox('trim', M.x0, 0, z - 0.22, xEnd, 0.35, z - 0.17);
    for (let x = M.x0; x < xEnd - 0.01; x += 1) addSolid(V(x, 0, z - 0.17), V(Math.min(1, xEnd - x), 0, 0), V(0, 0, 0.34), 0, top(x + 0.5) + 3, 'f1');
    railing(bats.f1, [M.x0 + 0.25, z], [xEnd - 0.2, z], top(M.x0 + 0.25) - 0.1, top(xEnd - 0.2) - 0.1, WOODRAIL, 'f1', 'square', false);
    // newel at the foot
    bats.f1.aabox('wood:#5c3b26', M.x0 - 0.25, 0, z - 0.25, M.x0 + 0.25, 3.7, z + 0.25); bats.f1.aabox('wood:#5c3b26', M.x0 - 0.31, 3.7, z - 0.31, M.x0 + 0.31, 3.85, z + 0.31);
    addSolid(V(M.x0 - 0.25, 0, z - 0.25), V(0.5, 0, 0), V(0, 0, 0.5), 0, 3.85, 'f1');
    // above the stair, the family room ceiling's edge is boxed in
    bats.f1.aabox(wk, 88, H.ceil1 - 0.9, z - 0.17, xEnd, H.ceil1, z + 0.17);
  }
  railing(bats.f1, [M.x0 + 0.5, M.y1 - 0.12], [M.x1 - 0.3, M.y1 - 0.12], r + 0.2, H.f2 - 0.2, 'wood:#5c3b26', 'f1', 'hand');
  // basement stair: under the main stair, down from the door in the living room, heading west
  const B = STAIRS.basement, nb = B.risers, rb = -H.basement / nb, db = (B.xTop - B.xBottom) / (nb - 1);
  for (let j = 1; j < nb; j++) {
    const xb = B.xTop - (j - 1) * db, xa = xb - db, top = -j * rb;
    bats.b.aabox({ def: 'col:#8d8980', pv: 'col:#9d9990' }, xa, top - 0.6, B.y0, xb, top, B.y1);
    addFloorRect(xa, B.y0, xb, B.y1, top, 'b');
  }
  railing(bats.b, [B.xTop - 0.4, B.y0 + 0.12], [B.xBottom + 0.3, B.y0 + 0.12], -rb, H.basement + rb, 'wood:#5c3b26', 'b', 'hand');
  // walls of the stairwell below the 1st floor
  for (const z of [B.y0 - 0.2, B.y1 + 0.2]) { bats.b.aabox('white', B.xBottom + 4, -5.5, z - 0.12, 99, -0.9, z + 0.12); addSolid(V(B.xBottom + 4, 0, z - 0.12), V(99 - B.xBottom - 4, 0, 0), V(0, 0, 0.24), -5.5, -0.9, 'b'); }
  // back entry: three steps up to the kitchen door
  {
    const y0 = 31.3, y1 = 34.7, rr = -ENTRY / 3;
    for (let i = 0; i < 2; i++) {
      const xb = 83 - 0.17 - i * 0.95, xa = xb - 0.95, top = -(i + 1) * rr;
      bats.f1.aabox({ def: 'trim', pv: 'wood:#7a4f2e' }, xa, ENTRY, y0, xb, top, y1);
      addFloorRect(xa, y0, xb, y1, top, 'f1');
    }
    railing(bats.f1, [80.95, y0 - 0.1], [82.8, y0 - 0.1], ENTRY + 0.4, 0, 'wood:#5c3b26', 'f1', 'hand');
  }
}

function buildRailings(bats) {
  // vestibule side of the stairwell
  railing(bats.f2, [88, 22.15], [88, 25.6], H.f2, H.f2, WOODRAIL, 'f2', 'square');
}

// ------------------------------------------------------------------ roofs
// A roof plane: polygon in plan ft, height rising at pitch p along `up` from h0 at point o.
// eaves/rakes/ridges list edge indices (edge i = pts[i] -> pts[i+1]) that get fascia+gutter, rake board, ridge cap.
export function rplane(bat, poly, { o, up, h0, p, eaves = [], rakes = [], ridges = [], key = 'shingle', gutter = true }) {
  const ul = Math.hypot(up[0], up[1]), ux = up[0] / ul, uy = up[1] / ul;
  const hAt = (x, y) => h0 + (p * ((x - o[0]) * ux + (y - o[1]) * uy)) / PX;
  const pts = poly.map(([x, y]) => { const [fx, fz] = toFt([x, y]); return V(fx, hAt(x, y), fz); });
  const k = Math.sqrt(1 + p * p);
  const uv = poly.map(([x, y]) => [((x * -uy + y * ux) / PX), (((x - o[0]) * ux + (y - o[1]) * uy) / PX) * k]);
  const nUp = V(-ux * p, 1, -uy * p).normalize();
  bat.face(key, pts, nUp, uv);
  bat.face('soffit', pts.map((q) => q.clone().add(V(0, -ROOFT, 0))), nUp.clone().negate());
  const c = pts.reduce((s, q) => s.add(q), V(0, 0, 0)).multiplyScalar(1 / pts.length);
  const edge = (i) => [pts[i], pts[(i + 1) % pts.length]];
  const outOf = (a, b) => { const m = a.clone().add(b).multiplyScalar(0.5); const dd = V(b.z - a.z, 0, -(b.x - a.x)).normalize(); return dd.dot(m.clone().sub(c)) < 0 ? dd.negate() : dd; };
  for (const i of eaves) {
    const [a, b] = edge(i), out = outOf(a, b);
    bat.face('extTrim', [a, b, b.clone().add(V(0, -ROOFT - 0.15, 0)), a.clone().add(V(0, -ROOFT - 0.15, 0))], out);
    if (!gutter) continue;
    const gg = out.clone().multiplyScalar(0.25);
    bat.face('gutter', [a.clone().add(gg).add(V(0, -0.1, 0)), b.clone().add(gg).add(V(0, -0.1, 0)), b.clone().add(gg).add(V(0, -0.6, 0)), a.clone().add(gg).add(V(0, -0.6, 0))], out);
  }
  for (const i of rakes) {
    const [a, b] = edge(i), out = outOf(a, b);
    bat.face('extTrim', [a, b, b.clone().add(V(0, -ROOFT - 0.35, 0)), a.clone().add(V(0, -ROOFT - 0.35, 0))], out);
    bat.face('extTrim', [a.clone().add(V(0, 0.06, 0)), b.clone().add(V(0, 0.06, 0)), b.clone().add(out.clone().multiplyScalar(-0.3)).add(V(0, 0.06, 0)), a.clone().add(out.clone().multiplyScalar(-0.3)).add(V(0, 0.06, 0))], V(0, 1, 0));
  }
  for (const i of ridges) {
    const [a, b] = edge(i), out = outOf(a, b);
    bat.face('ridgeCap', [a.clone().add(V(0, 0.09, 0)), b.clone().add(V(0, 0.09, 0)), b.clone().add(out.clone().multiplyScalar(-0.45)), a.clone().add(out.clone().multiplyScalar(-0.45))], V(0, 1, 0));
  }
  return hAt;
}
export function gableTri(bat, pts, key = 'siding') {
  const n = new THREE.Vector3().subVectors(pts[1], pts[0]).cross(new THREE.Vector3().subVectors(pts[2], pts[0])).normalize();
  bat.face(key, pts, n);
  bat.face(key, pts, n.clone().negate());
}
// A roof mass = the lowest of its planes over a convex hull. Each plane gets the part of the hull where it is
// the lowest; edges along the hull get fascia + gutter (level) or a rake board (sloped), edges shared by two planes
// a ridge cap. Where masses overlap, the higher surface shows (valleys come out of the overlap).
const planeLin = ({ o, up, h0, p }) => { const l = Math.hypot(up[0], up[1]), ux = up[0] / l, uy = up[1] / l; return [p * ux / PX, p * uy / PX, h0 - p * (o[0] * ux + o[1] * uy) / PX]; };
const evalLin = (f, q) => f[0] * q[0] + f[1] * q[1] + f[2];
const difLin = (f, g) => [f[0] - g[0], f[1] - g[1], f[2] - g[2]];
function clipPoly(poly, g) { // keep g(q) <= 0
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const P0 = poly[i], Q = poly[(i + 1) % poly.length], a = evalLin(g, P0), b = evalLin(g, Q);
    if (a <= 1e-7) out.push(P0);
    if ((a < -1e-7 && b > 1e-7) || (a > 1e-7 && b < -1e-7)) { const t = a / (a - b); out.push([P0[0] + (Q[0] - P0[0]) * t, P0[1] + (Q[1] - P0[1]) * t]); }
  }
  return out.filter((q, i, arr) => Math.hypot(q[0] - arr[(i + 1) % arr.length][0], q[1] - arr[(i + 1) % arr.length][1]) > 0.004);
}
function onEdge(hull, q) {
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i], b = hull[(i + 1) % hull.length], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
    const t = ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / L2;
    if (t > -0.001 && t < 1.001 && Math.hypot(a[0] + dx * t - q[0], a[1] + dy * t - q[1]) < 0.02) return true;
  }
  return false;
}
// opts: key (roofing), trim (false = no fascia / rakes: a saddle buried in another roof), skip (hull edge indices left bare), gutter
export function roofMass(bat, hull, planes, opts = {}) {
  const { key = 'shingle', trim = true, skip = [], gutter = true } = typeof opts === 'string' ? { key: opts } : opts;
  const Ls = planes.map(planeLin);
  const hullEdge = (q, q2) => { const m = [(q[0] + q2[0]) / 2, (q[1] + q2[1]) / 2]; for (let i = 0; i < hull.length; i++) { const seg = [hull[i], hull[(i + 1) % hull.length]]; if (onEdge(seg, q) && onEdge(seg, q2) && onEdge(seg, m)) return i; } return -1; };
  planes.forEach((pl, i) => {
    let poly = hull;
    Ls.forEach((g, j) => { if (j !== i) poly = clipPoly(poly, difLin(Ls[i], g)); });
    if (poly.length < 3) return;
    const eaves = [], ridges = [], rakes = [];
    poly.forEach((q, k) => {
      const q2 = poly[(k + 1) % poly.length], a = evalLin(Ls[i], q), b = evalLin(Ls[i], q2);
      const he = hullEdge(q, q2);
      if (he >= 0) { if (trim && !skip.includes(he)) (Math.abs(a - b) < 0.02 ? eaves : rakes).push(k); }
      else if (Ls.some((g, j) => j !== i && Math.abs(evalLin(g, q) - a) < 0.03 && Math.abs(evalLin(g, q2) - b) < 0.03)) ridges.push(k);
    });
    rplane(bat, poly, { ...pl, eaves, ridges, rakes, key, gutter });
  });
  return (x, y) => Math.min(...Ls.map((f) => evalLin(f, [x, y])));
}
// siding up a gable end: between a wall top (bottom(x,y)) and the roof underside (top(x,y)) along the plan line a->b
export function gableFill(bat, a, b, bottom, top, key = 'siding', n = 40, keyIn = key) {
  const at = (t) => { const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t; const [fx, fz] = F(x, y); return { x, y, fx, fz }; };
  const nn = (() => { const [ax, az] = F(...a), [bx, bz] = F(...b); return V(-(bz - az), 0, bx - ax).normalize(); })();
  for (let i = 0; i < n; i++) {
    const p = at(i / n), q = at((i + 1) / n);
    const b0 = bottom(p.x, p.y), b1 = bottom(q.x, q.y), t0 = top(p.x, p.y), t1 = top(q.x, q.y);
    if (t0 <= b0 + 0.01 && t1 <= b1 + 0.01) continue;
    const pts = [V(p.fx, b0, p.fz), V(q.fx, b1, q.fz), V(q.fx, Math.max(b1, t1), q.fz), V(p.fx, Math.max(b0, t0), p.fz)];
    bat.face(key, pts, nn); bat.face(keyIn, pts, nn.clone().negate());
  }
}

export const ROOF = {}; // roof height functions
const OV = 1.1; // eave / rake overhang
function buildRoofs(bats) {
  const bat = bats.roof, p = H.pitch, E = H.f2 + H.knee + ROOFT, ER = H.f2 + H.kneeRear + ROOFT, pr = H.pitchRear;
  // front wing: steep gable facing the street; its ridge runs back into the core's ridge
  ROOF.wing = roofMass(bat, [[CORE.ridge, WING.y0 - OV], [WING.x1 + OV, WING.y0 - OV], [WING.x1 + OV, WING.y1 + OV], [CORE.ridge, WING.y1 + OV]],
    [{ o: [0, WING.y0], up: [0, 1], h0: E, p }, { o: [0, WING.y1], up: [0, -1], h0: E, p }], { skip: [3] });
  // core: steep cross gable, ridge north-south
  ROOF.core = roofMass(bat, [[CORE.x0, CORE.y0 - OV], [CORE.x1 + OV, CORE.y0 - OV], [CORE.x1 + OV, CORE.y1 + OV], [CORE.x0, CORE.y1 + OV]],
    [{ o: [CORE.x0, 0], up: [1, 0], h0: E, p }, { o: [CORE.x1, 0], up: [-1, 0], h0: E, p }], { skip: [3] });
  // rear part: low gable facing the back yard; a saddle carries its ridge into the core roof
  const rp = [{ o: [0, REAR.y0], up: [0, 1], h0: ER, p: pr }, { o: [0, REAR.y1], up: [0, -1], h0: ER, p: pr }];
  ROOF.rear = roofMass(bat, [[REAR.x0 - OV, REAR.y0 - OV], [REAR.x1 + 0.3, REAR.y0 - OV], [REAR.x1 + 0.3, REAR.y1 + OV], [REAR.x0 - OV, REAR.y1 + OV]], rp, { skip: [1] });
  roofMass(bat, [[REAR.x1 + 0.3, REAR.y0 + 0.4], [CORE.ridge, REAR.y0 + 0.4], [CORE.ridge, REAR.y1 - 0.4], [REAR.x1 + 0.3, REAR.y1 - 0.4]], rp, { trim: false });
  // the attic triangles of the three gable ends above the middle wall pieces (the walls carry the rest)
  const under = (f) => (x, y) => f(x, y) - ROOFT - 0.02;
  for (const y of [CORE.y0, CORE.y1]) gableFill(bat, [89, y], [93, y], () => H.f2 + H.knee + p * 6, under(ROOF.core), 'siding', 8, 'white');
  gableFill(bat, [REAR.x0, 28], [REAR.x0, 20], () => H.f2 + H.kneeRear + pr * 10.5, under(ROOF.rear), 'siding', 8, 'white');
  // porch: hipped, off the wing's south wall, covering the enclosed nook too
  const PE = H.porchEave + ROOFT, pp = H.pitchPorch;
  ROOF.porch = roofMass(bat, [[PORCH.x0 - 0.5, PORCH.y0], [PORCH.x1 + 0.9, PORCH.y0], [PORCH.x1 + 0.9, PORCH.y1 + 0.9], [PORCH.x0 - 0.5, PORCH.y1 + 0.9]],
    [{ o: [0, PORCH.y1 + 0.9], up: [0, -1], h0: PE - 0.4, p: pp }, { o: [PORCH.x1 + 0.9, 0], up: [-1, 0], h0: PE - 0.4, p: pp }, { o: [PORCH.x0 - 0.5, 0], up: [1, 0], h0: PE - 0.4, p: pp }], { skip: [0] });
  // chimney: cream brick, up through the core roof beside the wing's ridge (photos 01, 0565)
  {
    const cx0 = 94.3, cx1 = 96.3, cz0 = 19.6, cz1 = 21.6, CT = 28.3;
    bat.aabox({ def: 'col:#cdb991', pv: 'col:#8d8676' }, cx0, 19, cz0, cx1, CT, cz1);
    bat.aabox('col:#b9a57f', cx0 - 0.12, CT - 0.5, cz0 - 0.12, cx1 + 0.12, CT - 0.2, cz1 + 0.12);
    bat.aabox('col:#3a3a3a', cx0 + 0.3, CT, cz0 + 0.3, cx1 - 0.3, CT + 0.9, cz1 - 0.3);
  }
  // plumbing vent
  { const h = ROOF.rear(78, 14); bat.aabox('col:#3a3a3a', 78, h - 0.3, 14, 78.3, h + 1.0, 14.3); }
}
function buildVault() {}

// ------------------------------------------------------------------ exterior: Victorian trim
// Fish-scale shingle panels, dentil belt course, corner boards, the spindle-work porch and the rear deck.
export function scallopPanel(bat, a, b, y0, y1, out, key = 'scallop', frame = true, off = 0.3) {
  const [ax, az] = a, [bx, bz] = b, l = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / l, uz = (bz - az) / l;
  const o = V(ax + out[0] * off, y0, az + out[1] * off);
  bat.box(key, o, V(ux * l, 0, uz * l), V(0, y1 - y0, 0), V(out[0] * 0.05, 0, out[1] * 0.05));
  if (!frame) return;
  for (const [s0, s1, h0, h1] of [[0, 0.22, y0, y1], [l - 0.22, l, y0, y1]])
    bat.box('extTrim', V(ax + ux * s0 + out[0] * off, h0, az + uz * s0 + out[1] * off), V(ux * (s1 - s0), 0, uz * (s1 - s0)), V(0, h1 - h0, 0), V(out[0] * 0.09, 0, out[1] * 0.09));
}
// a horizontal trim band with dentil blocks under it
export function dentilBand(bat, a, b, y, out, o = {}) {
  const { h = 0.5, dent = true, off = 0.27, cap = true } = o;
  const [ax, az] = a, [bx, bz] = b, l = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / l, uz = (bz - az) / l;
  const at = (s, d) => V(ax + ux * s + out[0] * (off + d), 0, az + uz * s + out[1] * (off + d));
  const bx2 = (s0, s1, y0, y1, d0, d1) => { const q = at(s0, d0); q.y = y0; bat.box('extTrim', q, V(ux * (s1 - s0), 0, uz * (s1 - s0)), V(0, y1 - y0, 0), V(out[0] * (d1 - d0), 0, out[1] * (d1 - d0))); };
  bx2(0, l, y, y + h, 0, 0.1);
  if (cap) bx2(-0.05, l + 0.05, y + h, y + h + 0.12, 0, 0.24);
  if (dent) { bx2(0, l, y + h - 0.2, y + h, 0.1, 0.14); for (let s = 0.12; s < l - 0.2; s += 0.42) bx2(s, s + 0.2, y + h - 0.42, y + h - 0.2, 0.1, 0.2); }
}
// gable peak: fish-scale shingles above a dentil band at height hb, on the gable wall a -> b (its two eave corners,
// knee height K, roof pitch p), with a louvered vent
export function gablePeak(bat, a, b, out, K, p, hb, vent = true) {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / l, uz = (b[1] - a[1]) / l, hw = l / 2, din = Math.max(0, (hb - K) / p), top = K + p * hw - 0.1;
  const pt = (s, y, off = 0.3) => V(a[0] + ux * s + out[0] * off, y, a[1] + uz * s + out[1] * off);
  bat.face('scallop', [pt(din, hb), pt(l - din, hb), pt(hw, top)], V(out[0], 0, out[1]));
  dentilBand(bat, [a[0] + ux * (din - 0.35), a[1] + uz * (din - 0.35)], [a[0] + ux * (l - din + 0.35), a[1] + uz * (l - din + 0.35)], hb - 0.55, out, { h: 0.55 });
  if (vent && top - hb > 3) { const c = pt(hw - 0.6, hb + (top - hb) * 0.36, 0.31); bat.box('extTrim', c, V(ux * 1.2, 0, uz * 1.2), V(0, 1.0, 0), V(out[0] * 0.06, 0, out[1] * 0.06)); for (let i = 0; i < 4; i++) bat.box('col:#b9b6ae', pt(hw - 0.5, hb + (top - hb) * 0.36 + 0.14 + i * 0.2, 0.37), V(ux * 1.0, 0, uz * 1.0), V(0, 0.07, 0), V(out[0] * 0.02, 0, out[1] * 0.02)); }
}
function buildExterior(bats) {
  const b1 = bats.f1, b2 = bats.f2, br = bats.roof, p = H.pitch;
  const K = H.f2 + H.knee;
  // corner boards
  const cb = (bat, x, z, y0, y1) => bat.aabox('extTrim', x - 0.3, y0, z - 0.3, x + 0.3, y1, z + 0.3);
  for (const [x, z, top] of [[REAR.x0, REAR.y0, H.f2 + H.kneeRear], [REAR.x0, REAR.y1, H.f2 + H.kneeRear], [CORE.x1, CORE.y0, K], [WING.x1, WING.y0, K], [WING.x1, WING.y1, K], [REAR.x1, REAR.y0, K], [REAR.x1, REAR.y1, K]]) {
    cb(b1, x + (x < 80 ? -0.02 : 0.02), z + (z < 20 ? -0.02 : 0.02), -0.35, H.f2); cb(b2, x + (x < 80 ? -0.02 : 0.02), z + (z < 20 ? -0.02 : 0.02), H.f2, top);
  }
  cb(b1, CORE.x1 + 0.02, CORE.y1 + 0.02 - 0.3, -0.35, H.f2 - 0.6); cb(b2, CORE.x1 + 0.02, CORE.y1 + 0.02, H.f2 + 4.2, K);
  cb(b1, PORCH.nookX + 0.02, PORCH.nookY + 0.02, -0.35, H.porchEave - 0.3);
  // belt course at the 2nd floor line: dentils on the old house, a plain band on the rear addition
  const belt = [
    [[REAR.x1, CORE.y0], [CORE.x1, CORE.y0], [0, -1], true], [[CORE.x1, CORE.y0], [CORE.x1, WING.y0], [1, 0], true], [[CORE.x1, WING.y0], [WING.x1, WING.y0], [0, -1], true],
    [[WING.x1, WING.y0], [WING.x1, WING.y1], [1, 0], true], [[WING.x1, WING.y1], [PORCH.x1 + 0.6, WING.y1], [0, 1], true],
    [[CORE.x1, CORE.y1], [REAR.x1, CORE.y1], [0, 1], true],
    [[REAR.x1, REAR.y1], [REAR.x0, REAR.y1], [0, 1], false], [[REAR.x0, REAR.y1], [REAR.x0, REAR.y0], [-1, 0], false], [[REAR.x0, REAR.y0], [REAR.x1, REAR.y0], [0, -1], false],
  ];
  for (const [a, b, out, dent] of belt) dentilBand(b2, a, b, H.f2 - 0.35, out, { dent, h: dent ? 0.55 : 0.5 });
  // eave-line frieze boards under the steep roofs
  for (const [a, b, out] of [[[CORE.x1, WING.y0], [WING.x1, WING.y0], [0, -1]], [[WING.x1, WING.y1], [CORE.x1, WING.y1], [0, 1]], [[CORE.x1, CORE.y0], [CORE.x1, WING.y0], [1, 0]], [[CORE.x1, WING.y1], [CORE.x1, CORE.y1], [1, 0]]]) dentilBand(b2, a, b, K - 0.55, out, { dent: false, cap: false });
  // gable peaks: fish-scale shingles above a dentil band at the window heads (street, south and north gables)
  const hb = H.f2 + 7.25;
  gablePeak(br, [WING.x1, WING.y0], [WING.x1, WING.y1], [1, 0], K, p, hb);
  gablePeak(br, [CORE.x1, CORE.y1], [CORE.x0, CORE.y1], [0, 1], K, p, hb);
  gablePeak(br, [CORE.x0, CORE.y0], [CORE.x1, CORE.y0], [0, -1], K, p, hb);
  // rear gable: plain, with a band at the eave line
  dentilBand(br, [REAR.x0, REAR.y1], [REAR.x0, REAR.y0], H.f2 + H.kneeRear - 0.1, [-1, 0], { dent: false });

  // ---- front porch (photos 01, 0565, 0585, 0586): square posts, spindle frieze, scroll brackets, white rail, concrete steps
  const py = -0.12, top = H.porchEave - 0.25, X1 = PORCH.x1, Y1 = PORCH.y1, NX = PORCH.nookX;
  const post = (x, z, half = false) => {
    const k = new Kit(b1, 'f1').at(x, z, 0);
    k.cbox('extTrim', 0, 0, half ? 0.3 : 0.5, 0.5, py, top); k.cbox('extTrim', 0, 0, half ? 0.4 : 0.62, 0.62, py, py + 0.7); k.cbox('extTrim', 0, 0, half ? 0.4 : 0.62, 0.62, top - 0.9, top - 0.75);
    addSolid(V(x - 0.25, 0, z - 0.25), V(0.5, 0, 0), V(0, 0, 0.5), py, top, 'f1');
  };
  post(X1 - 0.3, Y1 - 0.3); post(NX + 0.35, Y1 - 0.3); post(X1 - 0.3, PORCH.y0 + 0.4, false);
  // beam, dentils under the eave, and the spindle frieze between the posts
  const frieze = (a, b, out) => {
    const [ax, az] = a, [bx, bz] = b, l = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / l, uz = (bz - az) / l;
    const bxs = (s0, s1, y0, y1, w = 0.3) => b1.box('extTrim', V(ax + ux * s0 - Math.abs(uz) * w / 2, y0, az + uz * s0 - Math.abs(ux) * w / 2), V(ux * (s1 - s0), 0, uz * (s1 - s0)), V(0, y1 - y0, 0), V(Math.abs(uz) * w, 0, Math.abs(ux) * w));
    bxs(0, l, top - 0.02, top + 0.45, 0.5);
    bxs(0.25, l - 0.25, top - 0.2, top - 0.02, 0.14); bxs(0.25, l - 0.25, top - 1.25, top - 1.1, 0.14);
    for (let s = 0.45; s < l - 0.4; s += 0.34) bxs(s, s + 0.11, top - 1.1, top - 0.2, 0.09);
    // scroll brackets at both ends
    for (const [s, sg] of [[0.25, 1], [l - 0.25, -1]]) for (let i = 0; i < 4; i++) bxs(s + sg * i * 0.22, s + sg * (i + 1) * 0.22, top - 1.25 - (3 - i) * 0.22 - 0.14, top - 1.25, 0.1);
    dentilBand(b1, [ax + out[0] * 0.02, az + out[1] * 0.02], [bx + out[0] * 0.02, bz + out[1] * 0.02], top - 0.02, out, { h: 0.45, off: 0.25, cap: false });
  };
  frieze([NX + 0.35, Y1 - 0.3], [X1 - 0.3, Y1 - 0.3], [0, 1]);
  frieze([X1 - 0.3, Y1 - 0.3], [X1 - 0.3, PORCH.y0 + 0.4], [1, 0]);
  // the nook's two outside faces carry the frieze line as a flat band
  dentilBand(b1, [NX, Y1 - 0.2], [PORCH.x0, Y1 - 0.2], top - 0.05, [0, 1], { h: 0.5, off: 0.02, cap: false });
  // address plaque over the steps
  b1.aabox('col:#2f3a36', X1 + 0.02, top - 0.85, 34.4, X1 + 0.07, top - 0.3, 36.6);
  // rail along the south edge, steps down to the east with a rail each side
  const WR = { rail: 'extTrim', bal: 'extTrim' };
  railing(b1, [NX + 0.65, Y1 - 0.3], [X1 - 0.6, Y1 - 0.3], py, py, WR, 'f1', 'square', false, 2.6);
  const sw0 = PORCH.y0 + 0.75, sw1 = Y1 - 0.65, rs = (py - H.grade) / 4;
  for (let i = 1; i <= 3; i++) {
    const xa = X1 + (i - 1) * 1.0, tp = py - i * rs;
    b1.aabox('floor:paving', xa, H.grade - 0.3, sw0, xa + 1.0 + (i === 3 ? 0.15 : 0), tp, sw1);
    addFloorRect(xa, sw0, xa + 1.0, sw1, tp, 'f1');
  }
  for (const z of [sw0 + 0.12, sw1 - 0.12]) {
    railing(b1, [X1 + 0.1, z], [X1 + 3.0, z], py - rs * 0.3, H.grade + 0.15, WR, 'f1', 'square', false, 2.6);
    b1.aabox('extTrim', X1 + 2.85, H.grade, z - 0.22, X1 + 3.3, H.grade + 3.3, z + 0.22); b1.aabox('extTrim', X1 + 2.8, H.grade + 3.3, z - 0.27, X1 + 3.35, H.grade + 3.42, z + 0.27);
    addSolid(V(X1 + 2.85, 0, z - 0.22), V(0.45, 0, 0), V(0, 0, 0.44), H.grade, H.grade + 3.4, 'f1');
  }
  // mailbox + porch light
  b1.aabox('col:#2b2b2b', 109.0, 3.6, PORCH.y0 + 0.27, 110.0, 4.3, PORCH.y0 + 0.6);
  b1.aabox('bulb', 106.9, H.porchEave - 0.55, 35.0, 107.5, H.porchEave - 0.3, 35.6);

  // ---- rear deck off the office (photos 0572, 0579): on two posts, white rail. Goes when the mudroom is built.
  {
    const D = DECK, db = renoBat('off:mud', 'f2'), tg = 'off:mud', fy = H.f2 - 0.08;
    db.aabox({ def: 'col:#4a4a47', pv: 'col:#8b8478' }, D.x0, fy - 0.85, D.y0, D.x1 - 0.25, fy, D.y1);
    addFloorRect(D.x0, D.y0, D.x1, D.y1, fy, tg);
    for (const z of [D.y0 + 0.35, D.y1 - 0.35]) { db.aabox('col:#8a7458', D.x0 + 0.1, H.grade, z - 0.22, D.x0 + 0.55, fy - 0.85, z + 0.22); addSolid(V(D.x0 + 0.1, 0, z - 0.22), V(0.45, 0, 0), V(0, 0, 0.44), H.grade, fy, tg); }
    railing(db, [D.x0 + 0.15, D.y0 + 0.15], [D.x0 + 0.15, D.y1 - 0.15], fy, fy, WR, tg, 'square', true, 3.0);
    railing(db, [D.x0 + 0.15, D.y0 + 0.15], [D.x1 - 0.3, D.y0 + 0.15], fy, fy, WR, tg, 'square', false, 3.0);
    railing(db, [D.x0 + 0.15, D.y1 - 0.15], [D.x1 - 0.3, D.y1 - 0.15], fy, fy, WR, tg, 'square', false, 3.0);
  }
  // exterior lights at the back door and the deck door
  b1.aabox('col:#2b2b2b', 75.8, 5.5, CORE.y1 + 0.27, 76.4, 6.2, CORE.y1 + 0.6); b1.aabox('bulb', 75.95, 5.3, CORE.y1 + 0.3, 76.25, 5.5, CORE.y1 + 0.55);
}

// ------------------------------------------------------------------ labels
export function buildLabels(L, group, rooms = L._rooms) {
  const labels = [];
  for (const r of rooms) {
    if (r.noLabel || r.void) continue;
    const [cx, cz] = centroid(r.pts);
    const div = document.createElement('div');
    div.className = 'room-label';
    div.innerHTML = `<b>${r.name}</b><span>${r.dims || ''}</span>`;
    const o = new CSS2DObject(div);
    o.position.set(cx, r.y + 0.3, cz);
    o.userData.level = L.id;
    o.userData.name = r.name;
    group.add(o);
    labels.push(o);
  }
  return labels;
}

// ------------------------------------------------------------------ entry
export function buildHouse() {
  LEVELS.forEach(prepLevel);
  const groups = { b: new THREE.Group(), f1: new THREE.Group(), f2: new THREE.Group(), roof: new THREE.Group() };
  const furn = {};
  const bats = { b: new Batcher(), f1: new Batcher(), f2: new Batcher(), roof: new Batcher(), bF: new Batcher(), f1F: new Batcher(), f2F: new Batcher() };
  for (const L of LEVELS) {
    for (const w of L.walls) buildWall(L, w, bats[L.id]);
    buildFloors(L, bats);
  }
  buildStairs(bats);
  buildRailings(bats);
  buildFixtures(bats);
  buildFurniture(bats);
  buildRoofs(bats);
  buildVault(bats);
  buildExterior(bats);
  buildRenovations(bats);
  const labels = {};
  const balGeo = balusterGeometry();
  const levelGroup = (lv) => (lv === 'site' ? house : groups[lv]);
  const house = new THREE.Group();
  for (const id of ['b', 'f1', 'f2']) {
    bats[id].build(groups[id]);
    furn[id] = new THREE.Group();
    furn[id].name = 'furniture';
    bats[id + 'F'].build(furn[id]);
    groups[id].add(furn[id]);
    labels[id] = buildLabels(LV[id], groups[id]);
  }
  for (const [tag, list] of Object.entries(BALUSTERS)) {
    if (!list.length) continue;
    const im = new THREE.InstancedMesh(balGeo, matFor('trim'), list.length);
    const m = new THREE.Matrix4();
    list.forEach(([x, y, z], i) => im.setMatrixAt(i, m.makeTranslation(x, y, z)));
    im.castShadow = im.receiveShadow = true;
    im.userData.measurable = true;
    if (tag === 'stairRail' || tag === 'stairRail2') renoGroup('off:refresh', tag === 'stairRail' ? 'f1' : 'f2').add(im);
    else (groups[tag] || renoGroup(tag, 'f1')).add(im);
  }
  bats.roof.build(groups.roof);
  for (const d of DOORS) (d.rs ? renoGroup(d.rs, d.level) : groups[d.level]).add(d.pivot);
  for (const [k, bat] of RENO_BATS) bat.build(RENO_GROUPS.get(k));
  const renos = [];
  for (const g of RENO_GROUPS.values()) { levelGroup(g.userData.level).add(g); renos.push(g); }
  renos.push(...DOOR_RENOS);
  Object.values(groups).forEach((g) => house.add(g));
  return { house, groups, furn, labels, levels: LV, renos };
}

export function roomAtPoint(id, x, z) {
  const L = LV[id];
  return L && L._rooms ? roomAt(L, x, z) : null;
}
