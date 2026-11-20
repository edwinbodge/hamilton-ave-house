// Builds the Creekside Ln house (walls, openings, floors, stairs, railings, roofs, trim) from data.js.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { LEVELS, STAIRS, toFt, F2, H, RY, ROOFT, PX } from './data.js';
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
    else if (type === 'g') { sill = -0.6; head = 6.65; } // 7 ft sectional doors (photo 44: four 21" sections)
    else if (type === 's' || type === 'f') head = 6.9;
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
      if (L.id === 'f1' && ya <= yb + 0.01) strip(side, s, e, -1.0, -0.6, 0.06, 'foundation');
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
    if (type === 'w') { fbox(s, e, sill, sill + ft); windowSashes(op, s + ft, e - ft, sill + ft, head - ft, outSide); return; }
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
    const inKey = L.id === 'b' ? 'white' : (kIn.room && kIn.room.trim) || 'trim', outKey = 'winExt';
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
    const w = a1 - a0;
    const hingeS = hingeEnd === 's' ? a0 : a1;
    const p = at(hingeS, side, t / 2 - 0.08);
    const dirClosed = u.clone().multiplyScalar(hingeEnd === 's' ? 1 : -1);
    const r = (ang * Math.PI) / 180;
    const ld = dirClosed.clone().multiplyScalar(Math.cos(r)).addScaledVector(n, side * Math.sin(r));
    const db = new Batcher();
    leaf(new Kit(db, TAG).at(0, 0, 0, 0), w, h - L.floor, L.floor, style, color);
    const pivot = new THREE.Group();
    db.build(pivot);
    pivot.position.set(p.x, 0, p.z);
    const solid = { cx: 0, cz: 0, ux: 1, uz: 0, hl: w / 2, ht: 0.09, y0: L.floor, y1: h, tag: TAG };
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
    const key = color.startsWith('#') ? 'wood:' + color : color, th = 0.15;
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
// flat ceilings of the 1-story parts at 9 ft (elsewhere the underside of the 2nd floor); the living room is vaulted
const CEILINGS = [
  { pts: [[197.6, 22.3], [376.8, 22.3], [376.8, 140.2], [383, 140.2], [383, 261.1], [197.6, 261.1]], y: H.ceil1 }, // kitchen + dining
  { pts: [[588.9, 140.2], [808.4, 140.2], [808.4, 508], [679.4, 508], [679.4, 363.9], [588.9, 363.9]], y: H.ceil1 }, // primary suite
  { pts: [[197.6, 564.4], [428, 564.4], [428, 584.6], [197.6, 584.6]], y: H.ceil1 }, // mudroom + back hall past the 2nd floor
  { pts: [[428, 564.4], [678.4, 564.4], [678.4, 598.3], [428, 598.3]], y: H.ceil1, key: 'soffit' }, // porch, past the 2nd-floor overhang
  { pts: [[23.4, 353.1], [197.6, 353.1], [197.6, 584.6], [428, 584.6], [428, 842], [172.3, 842], [172.3, 822.6], [23.4, 822.6]], y: 9.4 }, // garage
];
function buildFloors(L, bats) {
  const bat = bats[L.id];
  for (const r of L._rooms) {
    if (!r.floorKey || r.void) continue;
    const holes = L._holes.filter((h) => h.some(([hx, hz]) => pip(r.pts, hx, hz)));
    bat.poly(r.floorKey, r.pts, r.y + 0.012, holes);
  }
  if (L.id === 'b') {
    for (const f of L._foot) { bat.prism({ top: 'floor:concrete', side: 'foundation' }, f, L.floor - 0.4, L.floor); addFloorPoly(f, [], L.floor, 'b'); }
    // drywall ceiling (lives with the 1st floor so the basement cutaway is open from above)
    bats.f1.poly('ceiling', L._foot[0], L.floor + L.ceiling, [], true);
  }
  if (L.id === 'f1') {
    const slab = ftPoly(L.slab);
    bat.prism({ top: 'subfloor', bottom: 'joist', side: 'joist' }, slab, -1, 0, L._holes);
    addFloorPoly(slab, L._holes, 0, 'f1');
    const gar = ftPoly(L.garage), gh = ftPoly(L.garageHole);
    bat.prism({ top: 'floor:concrete', side: 'foundation' }, gar, -1.2, H.garage, [gh]);
    addFloorPoly(gar, [gh], H.garage, 'f1');
    const po = ftPoly(L.porch); // porch: concrete slab a step-free 1" below the door
    bat.prism({ top: 'floor:paving', side: 'foundation' }, po, H.grade - 0.4, -0.08);
    addFloorPoly(po, [], -0.08, 'f1');
    for (const c of CEILINGS) bats.f2.poly(c.key || 'ceiling', ftPoly(c.pts), c.y, [], true);
  }
  if (L.id === 'f2') {
    const f = L._foot[0];
    bat.prism({ top: 'subfloor', bottom: 'ceiling' }, f, H.ceil1, H.f2, L._holes);
    bat.prism({ side: 'white' }, f, H.ceil1, H.f2, L._holes);
    addFloorPoly(f, L._holes, H.f2, 'f2');
    bats.roof.poly('ceiling', f, H.ceil2, [], true);
  }
}

// ------------------------------------------------------------------ stairs & railings
// 'turned' (oak, lathe balusters), 'square' (painted), 'hand' (wall handrail only), 'iron' (black square spindles)
export function railing(bat, a, b, h0, h1, key = 'trim', tag = 'f1', style = 'turned', posts = true) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
  if (len < 0.01) return;
  const n = V(-dz / len, 0, dx / len);
  const Hh = 2.9;
  bat.box(key, V(a[0], h0 + Hh, a[1]).addScaledVector(n, -0.12), V(dx, h1 - h0, dz), V(0, 0.2, 0), n.clone().multiplyScalar(0.24));
  if (style === 'hand') return;
  if (style === 'square' || style === 'iron') bat.box(key, V(a[0], h0 + 0.3, a[1]).addScaledVector(n, -0.08), V(dx, h1 - h0, dz), V(0, 0.15, 0), n.clone().multiplyScalar(0.16));
  const cnt = Math.max(2, Math.round(len / 0.4));
  for (let i = 1; i < cnt; i++) {
    const f = i / cnt, x = a[0] + dx * f, z = a[1] + dz * f, h = h0 + (h1 - h0) * f;
    if (style === 'square') bat.aabox(key, x - 0.06, h + 0.3, z - 0.06, x + 0.06, h + Hh, z + 0.06);
    else if (style === 'iron') { bat.aabox('black', x - 0.03, h + 0.45, z - 0.03, x + 0.03, h + Hh, z + 0.03); if (i % 2) for (const yy of [h + 1.2, h + 1.75]) bat.aabox('black', x - 0.06, yy, z - 0.06, x + 0.06, yy + 0.18, z + 0.06); }
    else (BALUSTERS[tag] = BALUSTERS[tag] || []).push([x, h, z]);
  }
  if (posts) for (const [x, z, h] of [[a[0], a[1], h0], [b[0], b[1], h1]]) {
    bat.aabox(key, x - 0.2, h, z - 0.2, x + 0.2, h + Hh + 0.35, z + 0.2);
    bat.aabox(key, x - 0.25, h + Hh + 0.35, z - 0.25, x + 0.25, h + Hh + 0.45, z + 0.25);
  }
  const u = V(dx / len, 0, dz / len);
  addSolid(V(a[0], 0, a[1]).addScaledVector(n, -0.15), u.clone().multiplyScalar(len), n.clone().multiplyScalar(0.3), Math.min(h0, h1), Math.max(h0, h1) + Hh, tag);
}
export function stairGeom() { return { treads: [{}, {}, {}], n: 0 }; } // (Creekside's renovations use it; none here)

function buildStairs(bats) {
  const M = STAIRS.main, r = H.f2 / (M.risers1 + M.risers2);
  const [xa0] = F(M.f1x[0], 0), [xa1] = F(M.f1x[1], 0), [xb0] = F(M.f2x[0], 0), [xb1] = F(M.f2x[1], 0);
  const zB = F(0, M.yBottom)[1], zL = F(0, M.yLand)[1], zL2 = F(0, M.yLand2)[1], zT = F(0, M.yTop)[1];
  const tread = (x0, x1, za, zb, top) => {
    const z0 = Math.min(za, zb), z1 = Math.max(za, zb);
    bats.f1.aabox({ def: 'stairCarpet', nu: 'trim' }, x0, Math.max(0, top - 0.7), z0, x1, top, z1);
    bats.f1.aabox('trim', x0, top - 0.02, z1 - 0.02, x1, top + 0.03, z1 + 0.06);
    addFloorRect(x0, z0, x1, z1, top, 'f1');
  };
  // flight 1: up from the living room (south), toward the front of the house
  const n1 = M.risers1, d1 = (zL - zB) / (n1 - 1);
  for (let i = 1; i < n1; i++) tread(xa0, xa1, zB + (i - 1) * d1, zB + i * d1, i * r);
  // landing across both flights, over the mudroom (boxed in below)
  const hl = n1 * r;
  bats.f1.aabox({ def: 'stairCarpet', nd: 'ceiling', nu: 'white', pu: 'white', pw: 'white' }, xb0 - 0.05, hl - 0.85, zL, xa1 + 0.05, hl, zL2);
  addFloorRect(xb0, zL, xa1, zL2, hl, 'f1');
  // flight 2: back north to the loft
  const n2 = M.risers2, d2 = (zL - zT) / (n2 - 1);
  for (let j = 1; j < n2; j++) tread(xb0, xb1, zL - j * d2, zL - (j - 1) * d2, hl + j * r);
  // open side of flight 1 (foyer): knee wall under the stringer, white rail with black iron spindles (photos 07, 08)
  {
    const xw = F(428, 0)[0], top = (z) => Math.max(0.6, ((z - zB) / d1) * r - 0.55);
    const wk = LV.f1._rooms.find((q) => q.name === 'Foyer').wall;
    for (const [sx, key] of [[-0.17, 'paint:#cbbfae'], [0.17, wk]]) bats.f1.face(key, [V(xw + sx, 0, zB), V(xw + sx, 0, zL), V(xw + sx, top(zL), zL), V(xw + sx, top(zB), zB)], V(Math.sign(sx), 0, 0));
    bats.f1.box('trim', V(xw - 0.2, top(zB), zB), V(0, top(zL) - top(zB), zL - zB), V(0, 0.12, 0), V(0.4, 0, 0));
    bats.f1.aabox('trim', xw + 0.17, 0, zB, xw + 0.22, 0.4, zL);
    addSolid(V(xw - 0.17, 0, zB), V(0.34, 0, 0), V(0, 0, zL - zB), 0, H.f2, 'f1');
    railing(bats.f1, [xw, zB + 0.3], [xw, zL - 0.2], r + 0.3, hl - 0.2, 'trim', 'f1', 'iron');
    // newel at the bottom
    bats.f1.aabox('trim', xw - 0.22, 0, zB - 0.1, xw + 0.22, 3.6, zB + 0.34); bats.f1.aabox('trim', xw - 0.27, 3.6, zB - 0.15, xw + 0.27, 3.72, zB + 0.39);
  }
  railing(bats.f1, [xa0 + 0.15, zB + 0.4], [xa0 + 0.15, zL - 0.3], r + 0.2, hl - 0.4, 'trim', 'f1', 'hand');
  railing(bats.f1, [xb1 - 0.15, zL - 0.3], [xb1 - 0.15, zT + 0.3], hl + 0.3, H.f2 - 0.2, 'trim', 'f1', 'hand');
  // basement stair: under flight 1, from the mudroom down north to the rec room
  const B = STAIRS.basement, nb = B.risers, rb = -H.basement / nb, db = (B.yTop - B.yBottom) / (nb - 1);
  const [bx0] = F(B.x0, 0), [bx1] = F(B.x1, 0);
  for (let j = 1; j < nb; j++) {
    const [, za] = F(0, B.yBottom + (j - 1) * db), [, zb] = F(0, B.yBottom + j * db), top = H.basement + j * rb;
    bats.b.aabox({ def: 'carpet:#b9b0a3', nw: 'white' }, bx0, H.basement, za, bx1, top, zb);
    addFloorRect(bx0, za, bx1, zb, top, 'b');
    addSolid(V(bx0, 0, za), V(bx1 - bx0, 0, 0), V(0, 0, zb - za), H.basement, top - 1.3, 'b');
  }
  const [, zbB] = F(0, B.yBottom), [, zbT] = F(0, B.yTop);
  railing(bats.b, [bx1 - 0.15, zbB], [bx1 - 0.15, zbT], H.basement + rb, 0, 'trim', 'b', 'hand');
  // the stairwell's open end in the mudroom: short rails on both sides
  for (const x of [bx0 - 0.1, bx1 + 0.1]) railing(bats.f1, [x, F(0, 509)[1]], [x, zbT - 0.2], 0, 0, 'trim', 'f1', 'square');
  // garage stair: from the garage floor down east into the workshop (14 risers)
  const G = STAIRS.garage, ng = G.risers, rg = (H.garage - H.basement) / ng, dg = (205 - G.xTop) / (ng - 1);
  const [, gz0] = F(0, G.y0), [, gz1] = F(0, G.y1);
  for (let i = 1; i < ng; i++) {
    const [xa] = F(G.xTop + (i - 1) * dg, 0), [xb] = F(G.xTop + i * dg, 0), top = H.garage - i * rg;
    bats.f1.aabox({ def: 'col:#a9a49b', pv: 'col:#b8b3aa' }, xa, top - 0.7, gz0, xb, top, gz1);
    addFloorRect(xa, gz0, xb, gz1, top, top > -4.5 ? 'f1' : 'b');
  }
  railing(bats.f1, [F(G.xTop + 6, 0)[0], gz1 - 0.15], [F(200, 0)[0], gz1 - 0.15], H.garage - rg, H.basement + rg, 'trim', 'f1', 'hand');
}

function buildRailings(bats) {
  const g = (x, y) => toFt([x, y]);
  railing(bats.f2, g(386, 396.2), g(535.5, 396.2), H.f2, H.f2, 'trim', 'f2', 'iron');   // loft balcony over the living room
  railing(bats.f2, g(385, 442.2), g(429, 442.2), H.f2, H.f2, 'trim', 'f2', 'iron');     // around the stair well
  railing(bats.f2, g(384.1, 443), g(384.1, 500), H.f2, H.f2, 'trim', 'f2', 'iron');
}

// ------------------------------------------------------------------ roofs
// A roof plane: polygon in 1st-floor px, height rising at pitch p along `up` from h0 at point o.
// eaves/rakes/ridges list edge indices (edge i = pts[i] -> pts[i+1]) that get fascia+gutter, rake board, ridge cap.
export function rplane(bat, poly, { o, up, h0, p, eaves = [], rakes = [], ridges = [], key = 'shingle' }) {
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
  const outOf = (a, b) => { const m = a.clone().add(b).multiplyScalar(0.5); const d = V(b.z - a.z, 0, -(b.x - a.x)).normalize(); return d.dot(m.clone().sub(c)) < 0 ? d.negate() : d; };
  for (const i of eaves) {
    const [a, b] = edge(i), out = outOf(a, b);
    bat.face('extTrim', [a, b, b.clone().add(V(0, -ROOFT - 0.15, 0)), a.clone().add(V(0, -ROOFT - 0.15, 0))], out);
    const gg = out.clone().multiplyScalar(0.25);
    bat.face('gutter', [a.clone().add(gg).add(V(0, -0.1, 0)), b.clone().add(gg).add(V(0, -0.1, 0)), b.clone().add(gg).add(V(0, -0.6, 0)), a.clone().add(gg).add(V(0, -0.6, 0))], out);
  }
  for (const i of rakes) {
    const [a, b] = edge(i), out = outOf(a, b);
    bat.face('extTrim', [a, b, b.clone().add(V(0, -ROOFT - 0.2, 0)), a.clone().add(V(0, -ROOFT - 0.2, 0))], out);
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
// A roof mass = the lowest of its planes over a convex hull (px). Each plane gets the part of the hull where it is
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
  return out.filter((q, i, arr) => Math.hypot(q[0] - arr[(i + 1) % arr.length][0], q[1] - arr[(i + 1) % arr.length][1]) > 0.05);
}
function onEdge(hull, q) {
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i], b = hull[(i + 1) % hull.length], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
    const t = ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / L2;
    if (t > -0.001 && t < 1.001 && Math.hypot(a[0] + dx * t - q[0], a[1] + dy * t - q[1]) < 0.3) return true;
  }
  return false;
}
function roofMass(bat, hull, planes, key = 'shingle') {
  const Ls = planes.map(planeLin);
  planes.forEach((pl, i) => {
    let poly = hull;
    Ls.forEach((g, j) => { if (j !== i) poly = clipPoly(poly, difLin(Ls[i], g)); });
    if (poly.length < 3) return;
    const eaves = [], ridges = [], rakes = [];
    poly.forEach((q, k) => {
      const q2 = poly[(k + 1) % poly.length], a = evalLin(Ls[i], q), b = evalLin(Ls[i], q2), mid = [(q[0] + q2[0]) / 2, (q[1] + q2[1]) / 2];
      if (onEdge(hull, q) && onEdge(hull, q2) && onEdge(hull, mid)) (Math.abs(a - b) < 0.02 ? eaves : rakes).push(k);
      else if (Ls.some((g, j) => j !== i && Math.abs(evalLin(g, q) - a) < 0.03 && Math.abs(evalLin(g, q2) - b) < 0.03)) ridges.push(k);
    });
    rplane(bat, poly, { ...pl, eaves, ridges, rakes, key });
  });
  return (x, y) => Math.min(...Ls.map((f) => evalLin(f, [x, y])));
}
// siding up the gable end: between a wall top (bottom(t)) and the roof underside (top(t)) along the plan line a->b
function gableFill(bat, a, b, bottom, top, key = 'siding', n = 40) {
  const at = (t) => { const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t; const [fx, fz] = F(x, y); return { x, y, fx, fz }; };
  const nn = (() => { const [ax, az] = F(...a), [bx, bz] = F(...b); return V(-(bz - az), 0, bx - ax).normalize(); })();
  for (let i = 0; i < n; i++) {
    const p = at(i / n), q = at((i + 1) / n);
    const b0 = bottom(p.x, p.y), b1 = bottom(q.x, q.y), t0 = top(p.x, p.y), t1 = top(q.x, q.y);
    if (t0 <= b0 + 0.01 && t1 <= b1 + 0.01) continue;
    const pts = [V(p.fx, b0, p.fz), V(q.fx, b1, q.fz), V(q.fx, Math.max(b1, t1), q.fz), V(p.fx, Math.max(b0, t0), p.fz)];
    bat.face(key, pts, nn); bat.face(key, pts, nn.clone().negate());
  }
}

export const ROOF = {}; // roof height functions (px -> ft)
const OV = PX; // 1 ft overhang
function buildRoofs(bats) {
  const bat = bats.roof, p = H.pitch, E = H.plate1 + ROOFT; // eave-line surface height over a 1-story wall
  const pg = H.garagePitch, pw = H.wingPitch;
  // main block: side gable, ridge east-west. Rear slope comes down over the vaulted living room and the kitchen to
  // the 1st-floor plate; the front slope starts on the 2nd floor's front wall (photos 01, 51, 52).
  const MX0 = 192.8, MX1 = 679.4, MY0 = 140.2, MY1 = 564.4;
  const mainRear = { o: [0, MY0], up: [0, 1], h0: E, p }, mainFront = { o: [0, MY1], up: [0, -1], h0: RY, p };
  ROOF.main = roofMass(bat, [[MX0 - OV, MY0 - OV], [MX1 + OV, MY0 - OV], [MX1 + OV, MY1 + OV], [MX0 - OV, MY1 + OV]], [mainRear, mainFront]);
  ROOF.rear = (x, y) => evalLin(planeLin(mainRear), [x, y]);
  const under = (x, y) => ROOF.main(x, y) - ROOFT - 0.02;
  // gable ends: west over the kitchen wall / bedroom 2, east over the primary suite roof / bedroom 3
  gableFill(bats.roof, [195.1, MY0 - 2], [195.1, MY1], (x, y) => (y < 261.1 ? H.f2 : H.ceil2), under);
  gableFill(bats.roof, [679.4, MY0], [679.4, MY1], (x, y) => (y < 363.9 ? H.plate1 : H.ceil2), under);
  // front cross gable over bedroom 3 (shakes in the gable, photo 01)
  const CX0 = 537, CX1 = 679.4;
  roofMass(bat, [[CX0 - OV, 380], [CX1 + OV, 380], [CX1 + OV, MY1 + OV], [CX0 - OV, MY1 + OV]], [{ o: [CX0, 0], up: [1, 0], h0: RY, p }, { o: [CX1, 0], up: [-1, 0], h0: RY, p }]);
  gableFill(bats.roof, [CX0, MY1 + 0.5], [CX1, MY1 + 0.5], () => H.wallTop2, (x, y) => Math.min(RY + (p * Math.min(x - CX0, CX1 - x)) / PX, ROOF.main(x, y)) - ROOFT - 0.02, 'shake');
  // dining bump: gable facing the back yard
  const DX0 = 197.6, DX1 = 376.8, DY0 = 22.3;
  roofMass(bat, [[DX0 - OV, DY0 - OV], [DX1 + OV, DY0 - OV], [DX1 + OV, 215], [DX0 - OV, 215]], [{ o: [DX0, 0], up: [1, 0], h0: E, p: pw }, { o: [DX1, 0], up: [-1, 0], h0: E, p: pw }]);
  gableFill(bats.roof, [DX0, DY0], [DX1, DY0], () => H.plate1, (x) => E + (pw * Math.min(x - DX0, DX1 - x)) / PX - ROOFT - 0.02);
  // primary suite wing: hipped, tucked under the main roof's east gable
  const WX1 = 808.4, WY0 = 140.2, WY1 = 508;
  roofMass(bat, [[650, WY0 - OV], [WX1 + OV, WY0 - OV], [WX1 + OV, WY1 + OV], [650, WY1 + OV]],
    [{ o: [WX1, 0], up: [-1, 0], h0: E, p: pw }, { o: [0, WY0], up: [0, 1], h0: E, p: pw }, { o: [0, WY1], up: [0, -1], h0: E, p: pw }]);
  // garage: big front gable (single + half the double bay), a smaller gable stepped forward over the double door,
  // and a low gable over the tandem bay along the kitchen
  const GX0 = 23.4, GX1 = 428, GYa = 822.6, GYb = 842;
  roofMass(bat, [[GX0 - OV, 540], [GX1 + OV, 540], [GX1 + OV, GYa + OV], [GX0 - OV, GYa + OV]], [{ o: [GX0, 0], up: [1, 0], h0: E, p: pg }, { o: [GX1, 0], up: [-1, 0], h0: E, p: pg }]);
  const gR = (x) => E + (pg * Math.min(x - GX0, GX1 - x)) / PX;
  gableFill(bats.roof, [GX0, GYa], [GX1, GYa], () => H.plate1, (x) => gR(x) - ROOFT - 0.02, 'shake');
  const SX0 = 172.3;
  roofMass(bat, [[SX0 - OV, 640], [GX1 + OV, 640], [GX1 + OV, GYb + OV], [SX0 - OV, GYb + OV]], [{ o: [SX0, 0], up: [1, 0], h0: E, p: pg }, { o: [GX1, 0], up: [-1, 0], h0: E, p: pg }]);
  gableFill(bats.roof, [SX0, GYb], [GX1, GYb], () => H.plate1, (x) => E + (pg * Math.min(x - SX0, GX1 - x)) / PX - ROOFT - 0.02, 'shake');
  const TX1 = 197.6, TY0 = 353.1, pt = 6 / 12;
  roofMass(bat, [[GX0 - OV, TY0 - OV], [TX1 + OV, TY0 - OV], [TX1 + OV, 600], [GX0 - OV, 600]], [{ o: [GX0, 0], up: [1, 0], h0: E, p: pt }, { o: [TX1, 0], up: [-1, 0], h0: E, p: pt }]);
  gableFill(bats.roof, [GX0, TY0], [TX1, TY0], () => H.plate1, (x) => E + (pt * Math.min(x - GX0, TX1 - x)) / PX - ROOFT - 0.02);
  // front porch: a short pent roof off the 2nd floor's overhang, on three posts
  const PY = 598.3;
  roofMass(bat, [[416, MY1], [690.4, MY1], [690.4, PY + OV], [416, PY + OV]], [{ o: [0, MY1], up: [0, -1], h0: 11.6, p: 4 / 12 }]);
  for (const px of [434, 553, 672]) {
    const [x, z] = F(px, PY - 4), k = new Kit(bats.f1, 'f1').at(x, z, 0);
    k.cbox('stone', 0, 0, 1.25, 1.25, -0.1, 2.6); k.cbox('col:#d9d3c5', 0, 0, 1.4, 1.4, 2.6, 2.75);
    k.cbox('extTrim', 0, 0, 0.75, 0.75, 2.75, H.ceil1); k.cbox('extTrim', 0, 0, 0.95, 0.95, H.ceil1 - 0.4, H.ceil1);
    addSolid(V(x - 0.6, 0, z - 0.6), V(1.2, 0, 0), V(0, 0, 1.2), -0.1, H.ceil1, 'f1');
  }
  { const [x0, z0] = F(428, 564.4), [x1, z1] = F(678.4, PY); bats.f1.aabox({ def: 'extTrim', nv: 'soffit' }, x0, H.ceil1, z1 - 0.6, x1, H.ceil1 + 0.9, z1); void z0; }
  // rear dormer over the living room (the high window in photos 03-05)
  const DM = { x0: 437, x1: 517, y0: 166, sill: 13.2, head: 16.3, eave: 17.0 };
  {
    const dp = 10 / 12, hR = DM.eave + (dp * (DM.x1 - DM.x0) / 2) / PX, yBack = MY0 + ((hR - E) / p) * PX + 6;
    roofMass(bat, [[DM.x0 - 6, DM.y0 - 6], [DM.x1 + 6, DM.y0 - 6], [DM.x1 + 6, yBack], [DM.x0 - 6, yBack]],
      [{ o: [DM.x0, 0], up: [1, 0], h0: DM.eave + ROOFT, p: dp }, { o: [DM.x1, 0], up: [-1, 0], h0: DM.eave + ROOFT, p: dp }]);
    const roofUnder = (x) => DM.eave + (dp * Math.min(x - DM.x0, DM.x1 - x)) / PX;
    const [fx0] = F(DM.x0, 0), [fx1] = F(DM.x1, 0), [, fz] = F(0, DM.y0), [wx0] = F(DM.x0 + 15, 0), [wx1] = F(DM.x1 - 15, 0);
    const base = ROOF.rear(0, DM.y0) - ROOFT;
    // face wall around the window, gable above
    const faceQ = (xa, xb, ya, yb2) => { const q = [V(xa, ya, fz), V(xb, ya, fz), V(xb, yb2, fz), V(xa, yb2, fz)]; bat.face('siding', q, V(0, 0, -1)); bat.face(LV.f1._rooms.find((r) => r.name === 'Living Room').wall, q, V(0, 0, 1)); };
    faceQ(fx0, wx0, base, DM.eave); faceQ(wx1, fx1, base, DM.eave); faceQ(wx0, wx1, base, DM.sill); faceQ(wx0, wx1, DM.head, DM.eave);
    gableTri(bat, [V(fx0, DM.eave, fz), V(fx1, DM.eave, fz), V((fx0 + fx1) / 2, hR, fz)], 'siding');
    bat.aabox('glass', wx0, DM.sill, fz - 0.02, wx1, DM.head, fz + 0.02);
    for (const [a, b, c2, d] of [[wx0 - 0.15, wx0, DM.sill, DM.head], [wx1, wx1 + 0.15, DM.sill, DM.head], [wx0, wx1, DM.sill - 0.15, DM.sill], [wx0, wx1, DM.head, DM.head + 0.15], [(wx0 + wx1) / 2 - 0.08, (wx0 + wx1) / 2 + 0.08, DM.sill, DM.head]])
      bat.aabox({ def: 'winExt', nw: 'winTrim' }, a, c2, fz - 0.12, b, d, fz + 0.06);
    // cheek walls from the main roof up to the dormer eave
    const zBack = F(0, MY0 + ((DM.eave - E + ROOFT) / p) * PX)[1];
    for (const fxx of [fx0, fx1]) {
      const q = [V(fxx, base, fz), V(fxx, DM.eave, fz), V(fxx, DM.eave, zBack)];
      bat.face('siding', q, V(fxx === fx0 ? -1 : 1, 0, 0)); bat.face('white', q, V(fxx === fx0 ? 1 : -1, 0, 0));
    }
    bat.face('ceiling', [V(fx0, DM.eave - 0.01, fz), V(fx1, DM.eave - 0.01, fz), V(fx1, DM.eave - 0.01, zBack), V(fx0, DM.eave - 0.01, zBack)], V(0, -1, 0));
    ROOF.dormer = { ...DM, zBack, roofUnder };
  }
  // chimney: sided chase on the fireplace wall, up through the rear slope past the ridge line (photos 51, 52)
  {
    const [cx0, cz0] = F(578, 205), [cx1, cz1] = F(600, 262), CT = 31.5;
    bat.aabox({ def: 'siding', pv: 'cut' }, cx0, H.ceil2, cz0, cx1, CT, cz1);
    bat.aabox('col:#3a3a3a', cx0 - 0.15, CT, cz0 - 0.15, cx1 + 0.15, CT + 0.25, cz1 + 0.15);
    const k = new Kit(bat, 'roof').at((cx0 + cx1) / 2, (cz0 + cz1) / 2, 0); k.cyl('col:#3a3a3a', 0, 0, 0.3, 0.3, CT + 0.25, CT + 1.4, 10); k.cyl('col:#2b2b2b', 0, 0, 0.5, 0.45, CT + 1.4, CT + 1.7, 10);
  }
  // plumbing vents + a satellite-free roof
  for (const [x, y] of [[470, 470], [300, 500]]) { const [fx, fz] = F(x, y), h = ROOF.main(x, y); bat.aabox('col:#3a3a3a', fx, h - 0.3, fz, fx + 0.35, h + 1.1, fz + 0.35); }
}

// Living room: the vault is the rear slope's underside, from the back wall up past the loft. Its side walls rise
// from the kitchen ceiling (west) and the primary suite ceiling (east) to the vault; above the loft's 18 ft
// ceiling the front wall carries on up. The dormer opens in it.
function buildVault(bats) {
  const lr = LV.f1._rooms.find((r) => r.name === 'Living Room'), wk = lr.wall;
  const bat = bats.roof;
  const u = (y) => ROOF.rear(0, y) - ROOFT - 0.03;
  const X0 = 383, X1 = 588.9, Y0 = 140.2, Y1 = 396.2, D = ROOF.dormer;
  const quad = (xa, xb, ya, yb) => { const [x0, z0] = F(xa, ya), [x1, z1] = F(xb, yb); bat.face('ceiling', [V(x0, u(ya), z0), V(x1, u(ya), z0), V(x1, u(yb), z1), V(x0, u(yb), z1)], V(0, -1, 0)); };
  const yDb = (D.zBack * PX); // dormer back (px)
  quad(X0, D.x0, Y0, Y1); quad(D.x1, X1, Y0, Y1); quad(D.x0, D.x1, Y0, D.y0); quad(D.x0, D.x1, yDb, Y1);
  // the dormer's inner cheeks above the vault surface
  for (const xx of [D.x0, D.x1]) {
    const [fx] = F(xx, 0), [, z0] = F(0, D.y0), [, z1] = F(0, yDb);
    bat.face(wk, [V(fx, u(D.y0), z0), V(fx, D.eave - 0.01, z0), V(fx, D.eave - 0.01, z1)], V(xx === D.x0 ? 1 : -1, 0, 0));
  }
  // side walls of the void
  const side = (x, segs, n) => { for (const [ya, yb, b0] of segs) gableFill(bat, [x, ya], [x, yb], () => b0, (xx, yy) => u(yy), wk, n); };
  side(X0, [[Y0, 263.4, H.ceil1], [263.4, Y1, H.ceil2]], 16);
  side(X1, [[Y0, 366.1, H.ceil1], [366.1, Y1, H.ceil2]], 16);
  // front wall above the loft ceiling
  { const [x0, z] = F(X0, Y1), [x1] = F(X1, 0); bat.face(wk, [V(x0, H.ceil2, z), V(x1, H.ceil2, z), V(x1, u(Y1), z), V(x0, u(Y1), z)], V(0, 0, -1)); }
  // drywalled 2nd-floor band around the balcony edge
  { const [x0, z] = F(X0, Y1), [x1] = F(X1, 0); bats.f2.face(wk, [V(x0, H.ceil1, z - 0.01), V(x1, H.ceil1, z - 0.01), V(x1, H.f2 + 0.02, z - 0.01), V(x0, H.f2 + 0.02, z - 0.01)], V(0, 0, -1)); }
}

// ------------------------------------------------------------------ exterior: stone wainscot, corner boards
function buildExterior(bats) {
  const b1 = bats.f1, b2 = bats.f2, hw = 0.25;
  const veneer = (bat, a, b, out, y0, y1, key = 'stone', ext0 = 0, ext1 = 0, T = 0.3) => {
    const [ax, az] = F(...a), [bx, bz] = F(...b);
    const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l;
    const o = V(ax - ux * ext0 + out[0] * hw, y0, az - uz * ext0 + out[1] * hw);
    bat.box(key, o, V(ux * (l + ext0 + ext1), 0, uz * (l + ext0 + ext1)), V(0, y1 - y0, 0), V(out[0] * T, 0, out[1] * T));
    if (key === 'stone') bat.box('col:#d9d3c5', o.clone().add(V(0, y1 - y0, 0)), V(ux * (l + ext0 + ext1), 0, uz * (l + ext0 + ext1)), V(0, 0.14, 0), V(out[0] * (T + 0.1), 0, out[1] * (T + 0.1)));
  };
  // stacked-stone wainscot across the front (photo 02): garage front + returns, porch wall, primary closet
  const W = 3.0;
  veneer(b1, [23.4, 822.6], [172.3, 822.6], [0, 1], -0.9, W, 'stone', 0.55, 0);
  veneer(b1, [172.3, 822.6], [172.3, 842], [-1, 0], -0.9, W, 'stone', 0, 0.55);
  veneer(b1, [172.3, 842], [428, 842], [0, 1], -0.9, W, 'stone', 0, 0.55);
  veneer(b1, [428, 598.3], [428, 842], [1, 0], -0.9, W, 'stone');
  veneer(b1, [23.4, 640], [23.4, 822.6], [-1, 0], -0.9, W, 'stone', 0, 0.55);
  veneer(b1, [678.4, 508], [808.4, 508], [0, 1], -0.9, W, 'stone', 0, 0.55);
  veneer(b1, [808.4, 430], [808.4, 508], [1, 0], -0.9, W, 'stone');
  // corner boards on the sided corners
  const corners = (L, bat, y0, y1) => {
    for (const poly of L._foot) {
      let area = 0;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) area += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
      for (let i = 0; i < poly.length; i++) {
        const p0 = poly[(i - 1 + poly.length) % poly.length], q = poly[i], p1 = poly[(i + 1) % poly.length];
        const ax = q[0] - p0[0], az = q[1] - p0[1], bx = p1[0] - q[0], bz = p1[1] - q[1];
        if (Math.sign(ax * bz - az * bx) !== Math.sign(area)) continue;
        let d = [0.2, 0.2];
        for (const c of [[0.2, 0.2], [-0.2, 0.2], [0.2, -0.2], [-0.2, -0.2]]) if (!pip(poly, q[0] + c[0] * 3, q[1] + c[1] * 3)) d = c;
        const cx = q[0] + d[0], cz = q[1] + d[1];
        bat.aabox('extTrim', cx - 0.25, y0, cz - 0.25, cx + 0.25, y1, cz + 0.25);
      }
    }
  };
  corners(LV.f1, b1, 2.9, H.plate1);
  corners(LV.f2, b2, H.f2, H.wallTop2);
  // frieze board under the 2nd floor's front overhang
  { const [x0, z] = F(195.1, 564.4), [x1] = F(677.1, 0); b2.aabox('extTrim', x0 - 0.25, H.f2 - 0.15, z, x1 + 0.25, H.f2 + 0.6, z + 0.3); }
  // retractable awning over the patio (photos 49, 50: rolled out over the table)
  { const [ax0, rz] = F(395, 140.2), [ax1] = F(560, 0);
    b1.aabox('col:#e9e5da', ax0, 8.6, rz - 0.65, ax1, 8.9, rz - 0.25); b1.box('col:#efebe2', V(ax0, 8.6, rz - 0.45), V(ax1 - ax0, 0, 0), V(0, -1.4, -9), V(0, 0.08, 0));
    b1.aabox('col:#e2ddd0', ax0, 6.7, rz - 9.6, ax1, 7.25, rz - 9.4); }
  // basement window wells on the east (plan right) wall
  for (const y of [245, 433]) { const [fx, fz] = F(808.4, y); new Kit(b1, 'f1').at(fx + 1.4, fz, 0, 90).box('col:#9a9893', -1.6, -1.5, -1.2, 1.6, -0.75, 1.2); }
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
