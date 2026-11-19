// Builds the Hamilton Rd house (walls, openings, floors, stairs, railings, roofs, trim) from data.js.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { LEVELS, STAIRS, toFt, F2, H, ROOFT, PX, GR, grVault, CHIMNEYS, groundAt } from './data.js';
import { Batcher, Kit, V, pip, centroid, addSolid, addFloorPoly, addFloorRect, material as matFor, PHYS, ORIGIN } from './geom.js';

// Operable doors (hinged leaves and sliders). Each has t (0 closed .. 1 open) and apply().
export const DOORS = [];
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
const renoKeyed = (k) => k; // (crown color key; the cosmetic refresh repaints it via the 'crownBlue' finish)
export const LV = Object.fromEntries(LEVELS.map((L) => [L.id, L]));

// Every finished room gets its own themeable wall material ('W:<level>-<n>') and its floor joins a
// themeable floor group ('F:<group>'); ROLES records the categories the style controls act on.
export const ROLES = { walls: [], floors: {} };
function wallCat(L, r) {
  if (r.bare) return null;
  if (L.id === 'b') return 'rec';
  if (/Kitchen|Pantry/.test(r.name)) return 'kitchen';
  if (/Dining/.test(r.name)) return 'dining';
  if (/Bedroom|Closet/.test(r.name) && L.id === 'f2') return 'bed';
  if (/Bath|^Linen$|^WC$|Powder/.test(r.name)) return 'bath';
  if (/Living/.test(r.name)) return 'living';
  return 'main';
}
function floorCat(L, r) {
  if (!r.floor) return null;
  if (r.floor === 'oak') return 'wood';
  if (r.floor === 'marbleRose') return 'foyer';
  if (L.id === 'b') return null;
  if (r.floor.startsWith('carpet')) return L.id === 'f1' ? (/Living/.test(r.name) ? 'carpetLiving' : /Office/.test(r.name) ? 'carpetOffice' : 'carpetMain') : 'carpetBed';
  if (r.floor === 'tile:#e4d9c6') return 'kitchenTile';
  if (/^tile|vinyl/.test(r.floor)) return L.id === 'f2' ? (r.floor === 'vinylDiamond' ? 'hallBath' : 'tileBath') : 'laundry';
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
  if (kind === 'e' && !inFoot(L, x, z)) return { key: 'siding', outside: true }; // brick everywhere, incl. the walk-out basement walls
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
    if (r.crown && ya <= ceil - 0.45 && yb2 >= ceil - 0.01) { const ck = r.crownKey ? renoKeyed(r.crownKey) : tk; strip(side, s, e, ceil - 0.42, ceil, 0.05, ck); strip(side, s, e, ceil - 0.24, ceil, 0.13, ck); strip(side, s, e, ceil - 0.08, ceil, 0.2, ck); }
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
    const arch = type === 'w' && oo.arch, ar = (e - s) / 2, spring = head - ar;
    if ((type !== 'o' || oo.cased) && type !== 'g' && !arch) {
      for (const [side, k] of [[1, kp], [-1, kn]]) if (k.outside || (k.room && !k.room.tile && !k.room.void)) casing(side, k, type === 'w');
    }
    // cast-stone lintel with a keystone over the brick openings (photos 01-04, 79), stone sill below windows
    if (type === 'w' && !arch && oo.g !== 'lead' && L.id !== 'b' && sill > base + 0.5) for (const [side, k] of [[1, kp], [-1, kn]]) if (k.outside) {
      strip(side, s - 0.55, e + 0.55, head + 0.12, head + 0.72, 0.1, 'stoneTrim');
      strip(side, (s + e) / 2 - 0.32, (s + e) / 2 + 0.32, head + 0.05, head + 0.88, 0.16, 'stoneTrim');
      strip(side, s - 0.35, e + 0.35, sill - 0.22, sill - 0.02, 0.18, 'stoneTrim');
    }
    if (arch) archWindow(op, kp, kn);
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
    if (arch) {
      fbox(s, s + ft, sill, spring); fbox(e - ft, e, sill, spring); fbox(s, e, sill, sill + ft); fbox(s, e, spring - 0.06, spring + 0.06);
      windowSashes(op, s + ft, e - ft, sill + ft, spring - 0.06, outSide);
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
      case 'e': { // entry: as built = cherry door with an oval leaded lite and leaded sidelights; exterior refresh = black glass double door
        const keep = [bat, RS, TAG];
        bat = renoBat('off:exterior', L.id); RS = TAG = 'off:exterior';
        const sl = 1.15;
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
        hang(s + ft + sl + 0.2, e - ft - sl - 0.2, hingeEnd, swingSide, head - ft - 0.02, 'oval', 'frontDoor', 80, null, false);
        bat = renoBat('on:exterior', L.id); RS = TAG = 'on:exterior';
        { const pid = L.id + ':exterior:' + s.toFixed(1), mid = (s + e) / 2;
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

  // half-round head: brick/paint spandrels fill the rectangular cut's top corners, an arched reveal, a fan sash with
  // radial muntins and (outside) a white arched trim band with a keystone
  function archWindow(op, kp, kn) {
    const { s, e, head } = op, r = (e - s) / 2, cx = (s + e) / 2, spring = head - r, N = 16;
    const arc = (i, rr = r) => { const a = (Math.PI * i) / N; return [cx + Math.cos(a) * rr, spring + Math.sin(a) * rr]; };
    const pt = (ss, y, off) => { const q = at(ss, 0, 0).addScaledVector(n, off); q.y = y; return q; };
    for (const [side, k] of [[1, kp], [-1, kn]]) {
      const off = side * (t / 2), nn = n.clone().multiplyScalar(side), key = k.key;
      const R = [pt(e, head, off)]; for (let i = 0; i <= N / 2; i++) R.push(pt(...arc(i), off));
      const Lf = [pt(s, head, off)]; for (let i = N; i >= N / 2; i--) Lf.push(pt(...arc(i), off));
      bat.face(key, R, nn); bat.face(key, Lf, nn);
      if (k.outside || (k.room && !k.room.tile && !k.room.void)) { // arched casing band
        const tk = k.outside ? 'winTrim' : (k.room && k.room.trim) || 'trim', cw = k.outside ? 0.42 : 0.29, d = k.outside ? 0.08 : 0.06;
        for (let i = 0; i < N; i++) {
          const [a0, b0] = arc(i, r), [a1, b1] = arc(i + 1, r), [c0, d0] = arc(i, r + cw), [c1, d1] = arc(i + 1, r + cw);
          const q = [pt(a0, b0, off + side * d), pt(a1, b1, off + side * d), pt(c1, d1, off + side * d), pt(c0, d0, off + side * d)];
          bat.face(tk, q, nn);
          bat.face(tk, [pt(c0, d0, off), pt(c1, d1, off), pt(c1, d1, off + side * d), pt(c0, d0, off + side * d)], V(0, 1, 0));
        }
        strip(side, s - cw, s, op.sill, spring, d, tk); strip(side, e, e + cw, op.sill, spring, d, tk);
        if (k.outside) { strip(side, cx - 0.3, cx + 0.3, head - 0.1, head + cw + 0.35, 0.16, 'winTrim'); strip(side, s - cw - 0.05, e + cw + 0.05, op.sill - 0.14, op.sill, 0.14, 'winTrim'); }
        else strip(side, s - cw - 0.08, e + cw + 0.08, op.sill - 0.06, op.sill + 0.02, 0.2, tk);
      }
    }
    const inner = kp.outside ? kn.key : kp.key;
    for (let i = 0; i < N; i++) { // reveal under the arch, facing the arch center
      const [a0, b0] = arc(i), [a1, b1] = arc(i + 1), sm = (a0 + a1) / 2, ym = (b0 + b1) / 2;
      const nIn = at(cx, 0, 0).sub(at(sm, 0, 0)).add(V(0, spring - ym, 0));
      bat.face(inner, [pt(a0, b0, t / 2), pt(a1, b1, t / 2), pt(a1, b1, -t / 2), pt(a0, b0, -t / 2)], nIn);
    }
    // fan sash: glass half-disc, frame ring, three radial muntins
    const fan = [pt(cx, spring, 0)]; for (let i = 0; i <= N; i++) fan.push(pt(...arc(i, r - 0.15), 0));
    bat.face('glass', fan, n);
    const fk = (kp.outside ? kn : kp).room && !(kp.outside ? kn : kp).room.bare ? 'trim' : 'white';
    for (let i = 0; i < N; i++) {
      const [a0, b0] = arc(i, r - 0.17), [a1, b1] = arc(i + 1, r - 0.17), [c0, d0] = arc(i, r), [c1, d1] = arc(i + 1, r);
      for (const sd of [-1, 1]) bat.face(sd > 0 ? (kp.outside ? 'winExt' : fk) : (kp.outside ? fk : 'winExt'), [pt(a0, b0, sd * 0.06), pt(a1, b1, sd * 0.06), pt(c1, d1, sd * 0.06), pt(c0, d0, sd * 0.06)], n.clone().multiplyScalar(sd));
    }
    for (const a of [Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4]) {
      const x1 = cx + Math.cos(a) * (r - 0.15), y1 = spring + Math.sin(a) * (r - 0.15), ux = Math.cos(a), uy = Math.sin(a), px = -uy * 0.03, py = ux * 0.03;
      for (const sd of [-1, 1]) bat.face('white', [pt(cx + px, spring + py, sd * 0.03), pt(x1 + px, y1 + py, sd * 0.03), pt(x1 - px, y1 - py, sd * 0.03), pt(cx - px, spring - py, sd * 0.03)], n.clone().multiplyScalar(sd));
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
    const gk = outSide && L.id !== 'b' ? new Kit(renoBat('on:exterior', L.id), 'on:exterior').at(k.ox, k.oz, k.oy, k.rot) : null;
    const cs = (x0, x1) => { const f = sashFrame(x0, x1, h0, h1); glassAndGrid(f[0], f[1], f[2], f[3]); if (gk) grid(gk, f[0], f[1], f[2], f[3], 2, f[3] - f[2] > 3.2 ? 3 : 2, 'black', outSide * 0.05, 0.03); };
    if (op.oo.blind) { // white blind / roller shade raised to the head, on the room side (kitchen, office, bedrooms, baths in the photos)
      const sg = outSide || -1, za = -sg * (t / 2 + 0.03), zb = -sg * (t / 2 + 0.24), dr = op.oo.blind === true ? 0.55 : op.oo.blind;
      k.box('white', -0.12, h1 - dr, Math.min(za, zb), w + 0.12, h1 + 0.12, Math.max(za, zb));
      k.box('col:#e9e6df', -0.12, h1 - dr - 0.06, Math.min(za, zb) - 0.01, w + 0.12, h1 - dr, Math.max(za, zb) + 0.01);
    }
    if (style === 'lead') { const f = sashFrame(0, w, h0, h1); k.box('frosted', f[0], f[2], -0.02, f[1], f[3], 0.02); grid(k, f[0], f[1], f[2], f[3], 6, 1, 'brass', 0, 0.05); return; }
    if (style === 'cs2') { cs(0, w / 2); cs(w / 2, w); }
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
    } else if (style === 'oval') { // Hamilton Rd entry (photos 03, 06): cherry slab, oval leaded lite, two raised panels below
      k.box(key, 0, y0, -th / 2, w, y0 + h, th / 2);
      const cx = w / 2, cy = y0 + h * 0.62, rx = w * 0.3, ry = h * 0.24, N = 24;
      for (const sd of [-1, 1]) {
        const zf = sd * (th / 2 + 0.006), P0 = k.P(cx, cy, zf), ring = [...Array(N + 1)].map((_, i) => { const a = (i / N) * Math.PI * 2; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
        for (let i = 0; i < N; i++) k.bat.face('frosted', [P0, k.P(ring[i][0], ring[i][1], zf), k.P(ring[i + 1][0], ring[i + 1][1], zf)], V(0, 0, sd).applyAxisAngle(V(0, 1, 0), (k.rot * Math.PI) / 180));
        for (let i = 0; i < N; i++) { const [ax, ay] = ring[i], [bx, by] = ring[i + 1], [cx2, cy2] = [cx + (ax - cx) * 1.12, cy + (ay - cy) * 1.1], [dx2, dy2] = [cx + (bx - cx) * 1.12, cy + (by - cy) * 1.1];
          k.bat.face('col:#3a1d10', [k.P(ax, ay, zf + sd * 0.01), k.P(bx, by, zf + sd * 0.01), k.P(dx2, dy2, zf + sd * 0.03), k.P(cx2, cy2, zf + sd * 0.03)], V(0, 0, sd).applyAxisAngle(V(0, 1, 0), (k.rot * Math.PI) / 180)); }
        // a leaded diamond in the oval
        for (const [x1, y1, x2, y2] of [[cx, cy - ry * 0.8, cx + rx * 0.7, cy], [cx + rx * 0.7, cy, cx, cy + ry * 0.8], [cx, cy + ry * 0.8, cx - rx * 0.7, cy], [cx - rx * 0.7, cy, cx, cy - ry * 0.8]]) {
          const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy), nx = (-dy / d) * 0.012, ny = (dx / d) * 0.012;
          k.bat.box('brass', k.P(x1 - nx, y1 - ny, zf), V(dx, dy, 0).applyAxisAngle(V(0, 1, 0), (k.rot * Math.PI) / 180), V(2 * nx, 2 * ny, 0).applyAxisAngle(V(0, 1, 0), (k.rot * Math.PI) / 180), V(0, 0, sd * 0.012).applyAxisAngle(V(0, 1, 0), (k.rot * Math.PI) / 180));
        }
        for (const [p0, p1] of [[0.14 * w, 0.46 * w], [0.54 * w, 0.86 * w]]) { k.box(key, p0, y0 + 0.7, sd > 0 ? th / 2 : -th / 2 - 0.03, p1, y0 + 2.6, sd > 0 ? th / 2 + 0.03 : -th / 2); }
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
const G2 = (x, y) => toFt(F2(x, y));
function buildFloors(L, bats) {
  const bat = bats[L.id];
  for (const r of L._rooms) {
    if (!r.floorKey || r.void) continue;
    bat.poly(r.floorKey, r.pts, r.y + 0.012);
  }
  if (L.id === 'b') {
    for (const f of L._foot) { bat.prism({ top: 'floor:concrete', side: 'foundation' }, f, L.floor - 0.4, L.floor); addFloorPoly(f, [], L.floor, 'b'); }
    // drywall ceilings per room (they live with the 1st floor so the basement cutaway is open from above); none over the stairs
    for (const r of L._rooms) if (!/^Stair/.test(r.name)) bats.f1.poly(r.bare ? 'joist' : 'ceiling', r.pts, L.floor + L.ceiling, [], true);
    bat.poly('foundation', ftPoly(LV.f1.garage), H.garage - 0.45); // garage slab seen from the basement cutaway
  }
  if (L.id === 'f1') {
    const slab = ftPoly(L.slab);
    bat.prism({ top: 'subfloor', bottom: 'joist', side: 'joist' }, slab, -1, 0, L._holes);
    addFloorPoly(slab, L._holes, 0, 'f1');
    const gar = ftPoly(L.garage);
    bat.prism({ top: 'floor:concrete', side: 'foundation' }, gar, -1.6, H.garage);
    addFloorPoly(gar, [], H.garage, 'f1');
    // garage ceiling (flat drywall at the 9 ft plate)
    bats.f2.poly('ceiling', gar, H.garagePlate, [], true);
  }
  if (L.id === 'f2') {
    const slab = ftPoly(L.slab.map(([x, y]) => F2(x, y)));
    bat.prism({ top: 'subfloor', bottom: 'ceiling', side: 'white' }, slab, H.ceil1, H.f2);
    addFloorPoly(slab, [], H.f2, 'f2');
    buildCeiling2(bats);
  }
}

// 2nd-floor ceilings: flat at 18 ft except the great room vault, the primary bedroom's tray and the slope along the
// wing's 5 ft knee wall (primary bath, walk-in closet)
const TRAY2 = [630, 150, 835, 420]; // primary tray, 2nd-floor plan px
function buildCeiling2(bats) {
  const bat = bats.roof, Y = H.ceil2;
  const C = [[425, 120], [857, 120], [857, 232.8], [1236, 232.8], [1236, 615.1], [878, 615.1], [878, 746], [43, 746], [43, 421], [247, 421], [265, 445], [350, 343], [425, 253]];
  const [tx0, tz0] = G2(TRAY2[0], TRAY2[1]), [tx1, tz1] = G2(TRAY2[2], TRAY2[3]);
  const tray = [[tx0, tz0], [tx1, tz0], [tx1, tz1], [tx0, tz1]];
  bat.poly('ceiling', C.map(([x, y]) => G2(x, y)), Y, [tray], true);
  // tray: 45-degree coves up 1.2 ft to a flat center
  { const d = 1.2, inner = [[tx0 + d, tz0 + d], [tx1 - d, tz0 + d], [tx1 - d, tz1 - d], [tx0 + d, tz1 - d]];
    bat.poly('ceiling', inner, Y + d, [], true);
    for (let i = 0; i < 4; i++) { const a = tray[i], b = tray[(i + 1) % 4], c = inner[(i + 1) % 4], e = inner[i];
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], ctr = [(tx0 + tx1) / 2, (tz0 + tz1) / 2];
      bat.face('ceiling', [V(a[0], Y, a[1]), V(b[0], Y, b[1]), V(c[0], Y + d, c[1]), V(e[0], Y + d, e[1])], V(ctr[0] - m[0], -1, ctr[1] - m[1]).normalize()); } }
  // the wing's sloped ceilings along its 5 ft knee walls (primary bedroom corner + bath at the back, bedroom 2's alcove
  // + walk-in closet at the front; photos 39-41, 44-45), and the little end triangle where the back slope meets the bump
  { const [a0, zr] = G2(857, 173), [a1, zr2] = G2(1236, 232.8), [b0, zf] = G2(878, 615.1), [, zf2] = G2(0, 676);
    bat.face('ceiling', [V(a0, H.wingPlate, zr), V(a1, H.wingPlate, zr), V(a1, Y, zr2), V(a0, Y, zr2)], V(0, -0.7, 0.7));
    bat.face('ceiling', [V(b0, Y, zf), V(a1, Y, zf), V(a1, H.wingPlate, zf2), V(b0, H.wingPlate, zf2)], V(0, -0.7, -0.7));
    const pw = LV.f1._rooms.find((r) => r.name === 'Office').wall; void pw;
    bat.face('paint:#efe5d2', [V(a0, H.wingPlate, zr), V(a0, Y, zr2), V(a0, Y, zr)], V(1, 0, 0)); }
  // great room cathedral (photos 13-16): springs from 18 ft at the back wall and the balcony line, ridge along the middle
  const voidPx = [[43, 120], [425, 120], [425, 253], [350, 343], [265, 445], [247, 421], [43, 421]].map(([x, y]) => F2(x, y));
  const z0 = toFt([0, GR.y0])[1], z1 = toFt([0, GR.y1])[1], zc = (z0 + z1) / 2, pv = GR.pitch;
  const vh = (z) => Y + (Math.min(z - z0, z1 - z) * pv);
  const vpoly = voidPx.map(([x, y]) => toFt([x, y]));
  for (const [sgn] of [[1], [-1]]) { // two planes: z <= zc and z >= zc
    const half = clipPoly(vpoly, (q) => sgn * (q[1] - zc));
    if (half.length < 3) continue;
    bat.face('ceiling', half.map(([x, z]) => V(x, vh(z), z)), V(0, -1, sgn * pv).normalize());
  }
  // vertical infill from the 18 ft ceiling/wall tops up to the vault along every edge of the void
  for (let i = 0; i < vpoly.length; i++) {
    let a = vpoly[i], b = vpoly[(i + 1) % vpoly.length];
    const segs = (a[1] - zc) * (b[1] - zc) < 0 ? (() => { const t = (zc - a[1]) / (b[1] - a[1]), m = [a[0] + (b[0] - a[0]) * t, zc]; return [[a, m], [m, b]]; })() : [[a, b]];
    for (const [p, q] of segs) {
      const pts = [V(p[0], Y, p[1]), V(q[0], Y, q[1]), V(q[0], vh(q[1]), q[1]), V(p[0], vh(p[1]), p[1])];
      const nIn = V(-(q[1] - p[1]), 0, q[0] - p[0]); // the void is to one side; draw both faces
      const gk = LV.f1._rooms.find((r) => r.name === 'Great Room').wall;
      bat.face(gk, pts, nIn); bat.face(gk, pts, nIn.clone().negate());
    }
  }
}
// keep the part of a polygon where g(q) <= 0 (g linear)
function clipPoly(poly, g) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const P0 = poly[i], Q = poly[(i + 1) % poly.length], a = g(P0), b = g(Q);
    if (a <= 1e-9) out.push(P0);
    if ((a < -1e-9 && b > 1e-9) || (a > 1e-9 && b < -1e-9)) { const t = a / (a - b); out.push([P0[0] + (Q[0] - P0[0]) * t, P0[1] + (Q[1] - P0[1]) * t]); }
  }
  return out.filter((q, i, arr) => Math.hypot(q[0] - arr[(i + 1) % arr.length][0], q[1] - arr[(i + 1) % arr.length][1]) > 1e-4);
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
  if (style === 'square') bat.box(key, V(a[0], h0 + 0.3, a[1]).addScaledVector(n, -0.08), V(dx, h1 - h0, dz), V(0, 0.15, 0), n.clone().multiplyScalar(0.16));
  const cnt = Math.max(2, Math.round(len / 0.4));
  for (let i = 1; i < cnt; i++) {
    const f = i / cnt, x = a[0] + dx * f, z = a[1] + dz * f, h = h0 + (h1 - h0) * f;
    if (style === 'square') bat.aabox(key, x - 0.06, h + 0.3, z - 0.06, x + 0.06, h + Hh, z + 0.06);
    else if (style === 'iron') bat.aabox('black', x - 0.03, h, z - 0.03, x + 0.03, h + Hh, z + 0.03);
    else (BALUSTERS[tag] = BALUSTERS[tag] || []).push([x, h, z]);
  }
  if (posts) for (const [x, z, h] of [[a[0], a[1], h0], [b[0], b[1], h1]]) {
    bat.aabox(key, x - 0.2, h, z - 0.2, x + 0.2, h + Hh + 0.35, z + 0.2);
    bat.aabox(key, x - 0.25, h + Hh + 0.35, z - 0.25, x + 0.25, h + Hh + 0.45, z + 0.25);
    if (style === 'turned') { const kk = new Kit(bat, tag).at(x, z, h); kk.cyl(key, 0, 0, 0.14, 0.18, Hh + 0.45, Hh + 0.6, 10); kk.cyl(key, 0, 0, 0.18, 0.02, Hh + 0.6, Hh + 0.85, 10); }
  }
  const u = V(dx / len, 0, dz / len);
  addSolid(V(a[0], 0, a[1]).addScaledVector(n, -0.15), u.clone().multiplyScalar(len), n.clone().multiplyScalar(0.3), Math.min(h0, h1), Math.max(h0, h1) + Hh, tag);
}

// main stair treads (shared with the cosmetic refresh, which re-skins the railing): px polygons -> ft, tread tops
export function stairGeom() {
  const M = STAIRS.main, r = H.f2 / M.risers, T = [];
  const lo = M.lower, dy = (lo.yBottom - lo.yTop) / lo.n;
  for (let i = 1; i <= lo.n; i++) T.push({ i, run: 'lower', top: i * r, px: [[lo.x0, lo.yBottom - i * dy], [lo.x1, lo.yBottom - i * dy], [lo.x1, lo.yBottom - (i - 1) * dy], [lo.x0, lo.yBottom - (i - 1) * dy]] });
  const W = M.wind, ic = [W.x1, W.y1], L1 = W.y1 - W.y0, L2 = W.x1 - W.x0, tot = L1 + L2;
  const along = (d) => (d <= L1 ? [W.x0, W.y1 - d] : [W.x0 + (d - L1), W.y0]);
  for (let j = 0; j < W.n; j++) {
    const d0 = (tot * j) / W.n, d1 = (tot * (j + 1)) / W.n, pts = [ic, along(d0)];
    if (d0 < L1 && d1 > L1) pts.push([W.x0, W.y0]);
    pts.push(along(d1));
    T.push({ i: lo.n + j + 1, run: 'wind', top: (lo.n + j + 1) * r, px: pts });
  }
  const U = M.upper, dx = (U.xEnd - U.xStart) / U.n;
  for (let k = 1; k <= U.n; k++) { const i = lo.n + W.n + k; T.push({ i, run: 'upper', top: i * r, px: [[U.xStart + (k - 1) * dx, U.y0], [U.xStart + k * dx, U.y0], [U.xStart + k * dx, U.y1], [U.xStart + (k - 1) * dx, U.y1]] }); }
  for (const t of T) t.pts = ftPoly(t.px);
  return { T, r, M };
}
function buildStairs(bats) {
  const { T, r, M } = stairGeom();
  // main stair (photos 06, 08, 32): oak treads with a carpet runner; the bottom run sits on a closed base, the winders
  // and top run are open underneath (the basement stair runs below them)
  for (const t of T) {
    const base = t.run === 'lower' ? 0 : t.top - 0.75;
    bats.f1.prism({ top: 'stairCarpet', side: 'trim', bottom: 'white' }, t.pts, base, t.top);
    addFloorPoly(t.pts, [], t.top, 'f1');
    if (t.run === 'lower') addSolid(V(t.pts[0][0], 0, t.pts[0][1]), V(t.pts[1][0] - t.pts[0][0], 0, 0), V(0, 0, t.pts[2][1] - t.pts[1][1]), 0, t.top - 1.3, 'f1');
  }
  // flared bottom step (photo 08)
  { const [x0, z0] = F(M.lower.x0, M.lower.yBottom - 8), [x1, z1] = F(M.lower.x1 + 16, M.lower.yBottom + 4);
    const k = new Kit(bats.f1, 'f1'); k.box({ def: 'trim', pv: 'stairCarpet' }, x0, 0, z0, x1, r, z1); k.cyl('trim', x1, (z0 + z1) / 2, (z1 - z0) / 2, (z1 - z0) / 2, 0, r, 14);
    addFloorRect(x0, z0, x1 + 0.4, z1, r, 'f1'); }
  // railing: newel at the bottom, up the open side of the bottom run, around the winder corner, up the top run
  const t1 = T[0], t6 = T[M.lower.n - 1], [xo] = F(M.lower.x1, 0), [, zc] = F(0, M.upper.y1);
  railing(bats.f1, [xo - 0.1, t1.pts[2][1] - 0.6], [xo - 0.1, zc], t1.top, t6.top + r, 'trim', 'stairRail');
  const [xe] = F(M.upper.xEnd, 0);
  railing(bats.f1, [xo, zc - 0.1], [xe, zc - 0.1], (M.lower.n + M.wind.n + 1) * r, H.f2, 'trim', 'stairRail');
  // sloped soffit under the top run
  { const [ux0, uz0] = F(M.upper.xStart, M.upper.y0), [ux1, uz1] = F(M.upper.xEnd, M.upper.y1), y0 = (M.lower.n + M.wind.n + 1) * r - 0.75, y1 = H.f2 - r - 0.75;
    bats.f1.face('white', [V(ux0, y0, uz0), V(ux1, y1, uz0), V(ux1, y1, uz1), V(ux0, y0, uz1)], V(y1 - y0, -(ux1 - ux0), 0)); }

  // basement stair under the main stair (13 risers), rising toward the foyer end; landing at the door
  { const S = STAIRS.front, n = S.risers - 1, rb = -H.basement / S.risers, dx = (S.xTop - S.xBottom) / n;
    const [, za] = F(0, S.y0), [, zb] = F(0, S.y1);
    for (let j = 1; j <= n; j++) {
      const [xa] = F(S.xBottom + (j - 1) * dx, 0), [xb] = F(S.xBottom + j * dx, 0), top = H.basement + j * rb;
      bats.b.aabox({ def: 'white', pv: 'carpet:#b9a98f' }, xa, H.basement, za, xb, top, zb);
      addFloorRect(xa, za, xb, zb, top, 'b');
      addSolid(V(xa, 0, za), V(xb - xa, 0, 0), V(0, 0, zb - za), H.basement, top - 1.3, 'b');
    }
    const [xl] = F(S.xTop, 0), [xd] = F(493, 0);
    bats.f1.aabox({ def: 'white', pv: 'marbleRose' }, xl, -1, za, xd, 0, zb); addFloorRect(xl, za, xd, zb, 0, 'f1');
    railing(bats.b, [F(S.xBottom, 0)[0], za + 0.2], [xl, za + 0.2], H.basement + rb, 0, 'trim', 'b', 'hand');
  }
  // back-hall U stair to the basement (15 risers): flight A down toward the front, landing, flight B back
  { const B = STAIRS.back, rb = -H.basement / B.risers, dyA = (B.yLand0 - B.yTop) / (B.nA - 1);
    const [xa0] = F(B.xa0, 0), [xa1] = F(B.xa1, 0), [xb0] = F(B.xb0, 0), [xb1] = F(B.xb1, 0);
    for (let j = 1; j < B.nA; j++) {
      const [, z0] = F(0, B.yTop + (j - 1) * dyA), [, z1] = F(0, B.yTop + j * dyA), top = -j * rb;
      bats.f1.aabox({ def: 'trim', pv: 'carpet:#b9a98f', nv: 'white' }, xa0, top - 0.7, z0, xa1, top, z1);
      addFloorRect(xa0, z0, xa1, z1, top, 'f1');
    }
    const yl = -B.nA * rb, [, zl0] = F(0, B.yLand0), [, zl1] = F(0, B.yLand1);
    bats.f1.aabox({ def: 'white', pv: 'carpet:#b9a98f' }, xa0, yl - 0.7, zl0, xb1, yl, zl1);
    addFloorRect(xa0, zl0, xb1, zl1, yl, 'f1');
    const nB = B.risers - B.nA;
    for (let k = 1; k < nB; k++) {
      const [, z1] = F(0, B.yLand0 - (k - 1) * dyA), [, z0] = F(0, B.yLand0 - k * dyA), top = yl - k * rb;
      bats.b.aabox({ def: 'white', pv: 'carpet:#b9a98f' }, xb0, H.basement, z0, xb1, top, z1);
      addFloorRect(xb0, z0, xb1, z1, top, 'b');
      addSolid(V(xb0, 0, z0), V(xb1 - xb0, 0, 0), V(0, 0, z1 - z0), H.basement, top - 1.3, 'b');
    }
    // half wall between the flights, capped with oak; guard rail across the top of flight B
    const [, zt] = F(0, B.yTop);
    bats.f1.aabox('white', xa1, H.basement, zt, xb0, 3.0, zl0); bats.f1.aabox('trim', xa1 - 0.08, 3.0, zt, xb0 + 0.08, 3.15, zl0);
    addSolid(V(xa1, 0, zt), V(xb0 - xa1, 0, 0), V(0, 0, zl0 - zt), H.basement, 3.15, 'f1');
    railing(bats.f1, [xb0, zt + 0.15], [F(820, 0)[0], zt + 0.15], 0, 0, 'trim', 'f1', 'square');
    railing(bats.f1, [F(722, 0)[0] + 0.25, zt + 0.5], [F(722, 0)[0] + 0.25, zl0], -rb, yl, 'trim', 'f1', 'hand');
  }
}

function buildRailings(bats) {
  // 2nd floor: the great room balcony (diagonal, photos 16, 32), around the stair well and the foyer void
  railing(bats.f2, G2(425, 253), G2(350, 343), H.f2, H.f2, 'trim', 'stairRail2');
  railing(bats.f2, G2(326, 452), G2(386, 452), H.f2, H.f2, 'trim', 'stairRail2');
  railing(bats.f2, G2(386, 456), G2(500, 456), H.f2, H.f2, 'trim', 'stairRail2');
  railing(bats.f2, G2(500, 523), G2(570, 523), H.f2, H.f2, 'trim', 'stairRail2');
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
    const g = out.clone().multiplyScalar(0.25);
    bat.face('gutter', [a.clone().add(g).add(V(0, -0.1, 0)), b.clone().add(g).add(V(0, -0.1, 0)), b.clone().add(g).add(V(0, -0.6, 0)), a.clone().add(g).add(V(0, -0.6, 0))], out);
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
// plane spec -> linear height function coefficients in px
const lin = ({ o, up, h0, p }) => { const l = Math.hypot(up[0], up[1]) || 1, ux = up[0] / l, uy = up[1] / l; return [(p * ux) / PX, (p * uy) / PX, h0 - (p * (o[0] * ux + o[1] * uy)) / PX]; };
const ev = (f, q) => f[0] * q[0] + f[1] * q[1] + f[2];
// Roof as the lower envelope of planes over a convex region: facet i is where plane i is the lowest. Edges at the
// eave height get fascia + gutter, edges shared with another plane a ridge/hip cap, the rest rake boards.
export function envRoof(bat, region, planes, { eave, key = 'roofTile', skip = () => false } = {}) {
  const Fs = planes.map(lin), out = [];
  Fs.forEach((f, i) => {
    let poly = region;
    Fs.forEach((g, j) => { if (j !== i) poly = clipPoly(poly, (q) => ev(f, q) - ev(g, q)); });
    if (poly.length < 3) return;
    const eaves = [], ridges = [], rakes = [];
    poly.forEach((q, k) => {
      const q2 = poly[(k + 1) % poly.length], h1 = ev(f, q), h2 = ev(f, q2);
      if (skip(q, q2)) return;
      if (eave !== undefined && Math.abs(h1 - eave) < 0.03 && Math.abs(h2 - eave) < 0.03) eaves.push(k);
      else if (Fs.some((g, j) => j !== i && Math.abs(ev(g, q) - h1) < 0.03 && Math.abs(ev(g, q2) - h2) < 0.03)) { if (Fs.findIndex((g, j) => j !== i && Math.abs(ev(g, q) - h1) < 0.03 && Math.abs(ev(g, q2) - h2) < 0.03) > i) ridges.push(k); }
      else if (planes[i].p > 0) rakes.push(k);
    });
    const spec = planes[i].p > 0 ? planes[i] : { o: [0, 0], up: [1, 0], h0: planes[i].h0, p: 0 };
    out.push({ poly, f, hAt: rplane(bat, poly, { ...spec, eaves, rakes, ridges, key }) });
  });
  return out;
}
// wall infill in a vertical plane: px polygon of [s (px along x or y), height] at fixed coordinate
function infill(bat, axis, at, pts, key = 'siding') {
  const P3 = pts.map(([s, y]) => { const [fx, fz] = axis === 'x' ? toFt([s, at]) : toFt([at, s]); return V(fx, y, fz); });
  gableTri(bat, P3, key);
}

const SKYLIGHTS = []; // filled by buildRoofs: { pts (ft V3 corners on the roof), ceilY }
export const ROOF = {}; // height functions (px -> ft) used by reno + site
function buildRoofs(bats) {
  const bat = bats.roof, ov = PX, p = H.pitch, R = H.plate2 + ROOFT;
  // ---- main block: side gable roof, 10/12, hipped at the living-room end, gable (red-painted siding) at the garage end
  //      above the lower wing roof (photos 01, 80); ridge ~31.6 ft
  const MX0 = 177.5, MX1 = 715, MY0 = 171, MY1 = 585;
  const main = [{ o: [0, MY1], up: [0, -1], h0: R, p }, { o: [0, MY0], up: [0, 1], h0: R, p }, { o: [MX0, 0], up: [1, 0], h0: R, p }];
  const mf = envRoof(bat, [[MX0 - ov, MY0 - ov], [MX1 + ov, MY0 - ov], [MX1 + ov, MY1 + ov], [MX0 - ov, MY1 + ov]], main, { eave: R - p });
  ROOF.main = (x, y) => Math.min(...main.map(lin).map((f) => ev(f, [x, y])));
  { const ym = (MY0 + MY1) / 2, top = H.plate2 + ((ym - MY0) / PX) * p; infill(bats.roof, 'y', MX1, [[MY0, H.plate2], [MY1, H.plate2], [ym, top]], 'sidingRed'); }
  // ---- center pediment over the entry bay (photos 01, 03, 04): front gable, 12/12
  { const PX0 = 365, PX1 = 530, pc = H.gablePitch, ovp = 0.5 * PX, yF = MY1 + ovp;
    envRoof(bat, [[PX0 - ovp, 470], [PX1 + ovp, 470], [PX1 + ovp, yF], [PX0 - ovp, yF]], [{ o: [PX0, 0], up: [1, 0], h0: R, p: pc }, { o: [PX1, 0], up: [-1, 0], h0: R, p: pc }], { eave: R - pc * 0.5, skip: (a, b) => a[1] < 471 && b[1] < 471 });
    const xm = (PX0 + PX1) / 2, top = H.plate2 + ((xm - PX0) / PX) * pc;
    infill(bats.roof, 'x', MY1 + 0.6, [[PX0, H.plate2], [PX1, H.plate2], [xm, top]], 'siding');
    // white cornice band at the pediment base + oculus-free brick tympanum (photo 04)
    const [ax, az] = F(PX0 - 4, MY1), [bx] = F(PX1 + 4, 0);
    bats.roof.aabox('extTrim', ax, H.plate2 - 0.25, az + 0.25, bx, H.plate2 + 0.2, az + 0.75);
  }
  // ---- wing over the laundry, office and the back of the garage (2nd-floor primary bath, walk-in closet, bedroom 2's
  //      alcove): a lower side gable, 12/12 off 5 ft knee walls, ridge parallel to the main ridge; its gable end (with
  //      the satellite dish) faces the driveway (photos 80, 81), its back slope carries the bath skylights (photo 84)
  const WL = 715, WR = 966, WY0 = 206, WY1 = 538.5, Wh = H.wingPlate + ROOFT, pw = H.wingPitch, Wym = (WY0 + WY1) / 2;
  const wing = [{ o: [0, WY0], up: [0, 1], h0: Wh, p: pw }, { o: [0, WY1], up: [0, -1], h0: Wh, p: pw }];
  envRoof(bat, [[WL, WY0 - ov], [WR + ov, WY0 - ov], [WR + ov, WY1 + ov], [WL, WY1 + ov]], wing, { eave: Wh - pw, skip: (a, b) => a[0] < WL + 0.5 && b[0] < WL + 0.5 });
  ROOF.wing = (x, y) => Math.min(...wing.map(lin).map((f) => ev(f, [x, y])));
  { const under = (y) => H.wingPlate + (Math.min(y - WY0, WY1 - y) / PX) * pw, y18a = WY0 + ((H.ceil2 - H.wingPlate) / pw) * PX, y18b = WY1 - ((H.ceil2 - H.wingPlate) / pw) * PX;
    infill(bats.roof, 'y', WR, [[y18a, H.ceil2], [y18b, H.ceil2], [Wym, under(Wym)]], 'siding');
    // satellite dish under the gable peak (photos 80, 81)
    const [dx, dz] = F(WR, Wym - 20), k = new Kit(bats.roof, 'roof').at(dx + 0.3, dz, under(Wym) - 3.2, 90);
    k.box('col:#d9d9d6', -0.05, -0.6, 0, 0.05, 0.2, 0.6); k.cyl('col:#e6e6e3', 0, 1.1, 1.0, 1.0, -0.1, 0.0, 16, 1); }
  // ---- garage: front gable (photos 01, 79-81), 12/12 off a 9 ft plate; behind the wing's front wall only its
  //      right half continues back to the rear gable
  const GX0 = 820, GX1 = 1130, GY0 = 381, GY1 = 812, Gh = H.garagePlate + ROOFT, pg = H.garagePitch, Gr = (GX0 + GX1) / 2;
  const gar = [{ o: [GX0, 0], up: [1, 0], h0: Gh, p: pg }, { o: [GX1, 0], up: [-1, 0], h0: Gh, p: pg }];
  envRoof(bat, [[GX0 - ov, WY1], [GX1 + ov, WY1], [GX1 + ov, GY1 + ov], [GX0 - ov, GY1 + ov]], gar, { eave: Gh - pg, skip: (a, b) => a[1] < WY1 + 0.5 && b[1] < WY1 + 0.5 });
  envRoof(bat, [[WR, GY0 - ov], [GX1 + ov, GY0 - ov], [GX1 + ov, WY1], [WR, WY1]], gar, { eave: Gh - pg, skip: (a, b) => (a[1] > WY1 - 0.5 && b[1] > WY1 - 0.5) || (a[0] < WR + 0.5 && b[0] < WR + 0.5) });
  // where the garage's left slope stands above the wing's front eave it runs back until it meets the wing's front slope
  { const gl = (x) => Gh + ((x - GX0) / PX) * pg, x0 = GX0 + ((Wh - Gh) / pg) * PX, yMeet = WY1 - ((gl(WR) - Wh) / pw) * PX;
    envRoof(bat, [[x0, WY1], [WR, WY1], [WR, yMeet]], gar, { eave: -99, skip: () => true }); }
  ROOF.garage = (x, y) => Math.min(...gar.map(lin).map((f) => ev(f, [x, y])));
  { const top = H.garagePlate + ((Gr - GX0) / PX) * pg, gu = (x) => H.garagePlate + ((Math.min(x - GX0, GX1 - x)) / PX) * pg;
    infill(bats.roof, 'x', GY1, [[GX0, H.garagePlate], [GX1, H.garagePlate], [Gr, top]], 'siding');
    infill(bats.roof, 'x', GY0, [[WR, H.garagePlate], [GX1, H.garagePlate], [Gr, top], [WR, gu(WR)]], 'siding');
    // half-round louvered vent high in the front gable (photos 01, 80)
    const [vx, vz] = F(Gr, GY1), k = new Kit(bats.roof, 'roof').at(vx, vz + 0.27, 0), r0 = 1.55, yv = top - 4.1;
    for (let i = 0; i < 12; i++) { const a0 = (Math.PI * i) / 12, a1 = (Math.PI * (i + 1)) / 12;
      bats.roof.face('extTrim', [k.P(Math.cos(a0) * r0, yv + Math.sin(a0) * r0, 0.12), k.P(Math.cos(a1) * r0, yv + Math.sin(a1) * r0, 0.12), k.P(Math.cos(a1) * (r0 + 0.35), yv + Math.sin(a1) * (r0 + 0.35), 0.12), k.P(Math.cos(a0) * (r0 + 0.35), yv + Math.sin(a0) * (r0 + 0.35), 0.12)], V(0, 0, 1));
      bats.roof.face('col:#e9e4d8', [k.P(0, yv, 0.06), k.P(Math.cos(a0) * r0, yv + Math.sin(a0) * r0, 0.06), k.P(Math.cos(a1) * r0, yv + Math.sin(a1) * r0, 0.06)], V(0, 0, 1)); }
    for (let i = 1; i < 6; i++) { const yy = yv + (i * r0) / 6, hw = Math.sqrt(r0 * r0 - (yy - yv) ** 2); k.box('col:#cfc8ba', -hw, yy - 0.04, 0.06, hw, yy, 0.12); }
    k.box('extTrim', -r0 - 0.35, yv - 0.2, 0, r0 + 0.35, yv, 0.14);
  }
  // ---- kitchen octagon (one story): low hip, 4/12, cut flat at 12.2 ft under the 2nd-floor windows; wood plank
  //      vault inside (photos 18-24), skylight
  const K = [[433, 171], [433, 102], [502, 31.5], [644, 31.5], [712.5, 102], [712.5, 171]], Kh = H.kitchenPlate + ROOFT, pk = H.kitchenPitch * (2 / 3);
  const kPlanes = [];
  for (let i = 0; i < K.length - 1; i++) { const a = K[i], b = K[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); kPlanes.push({ o: a, up: [dy / l, -dx / l], h0: Kh, p: pk }); }
  // inward normal check: the octagon's interior is toward +y from the top edge
  for (const pl of kPlanes) { const c = [572, 120]; if ((c[0] - pl.o[0]) * pl.up[0] + (c[1] - pl.o[1]) * pl.up[1] < 0) pl.up = [-pl.up[0], -pl.up[1]]; }
  const capH = 12.2 + ROOFT;
  const kAll = [...kPlanes, { o: [0, 0], up: [1, 0], h0: capH, p: 0 }];
  const Kreg = offsetPoly(K, ov, [K.length - 1]);
  envRoof(bat, Kreg, kAll, { eave: Kh - pk, skip: (a, b) => a[1] > 170.5 && b[1] > 170.5 });
  { const fs = kAll.map(lin), under = (x, y) => Math.min(...fs.map((f) => ev(f, [x, y]))) - ROOFT;
    for (let i = 0; i < kAll.length; i++) {
      let poly = K;
      for (let j = 0; j < kAll.length; j++) if (j !== i) poly = clipPoly(poly, (q) => ev(fs[i], q) - ev(fs[j], q));
      if (poly.length < 3) continue;
      bats.f2.face('wood:#b07a45', poly.map(([x, y]) => { const [fx, fz] = toFt([x, y]); return V(fx, under(x, y), fz); }), V(0, -1, 0));
    }
    // header where the vault meets the flat 9 ft ceiling under the 2nd floor (photo 19's beam)
    for (let x = 433; x < 712.5; x += 13.97) { const xb = Math.min(712.5, x + 13.97), [ax, az] = F(x, 171), [bx] = F(xb, 0);
      bats.f2.face('wood:#8a5a2e', [V(ax, H.ceil1 - 0.6, az + 0.01), V(bx, H.ceil1 - 0.6, az + 0.01), V(bx, under(xb, 171.5), az + 0.01), V(ax, under(x, 171.5), az + 0.01)], V(0, 0, -1)); }
    // skylight on the dinette's top facet
    const sx0 = 548, sx1 = 598, sy0 = 50, sy1 = 82, q = [[sx0, sy0], [sx1, sy0], [sx1, sy1], [sx0, sy1]], hr = (x, y) => under(x, y) + ROOFT;
    SKYLIGHTS.push({ top: q.map(([x, y]) => { const [fx, fz] = toFt([x, y]); return V(fx, hr(x, y) + 0.12, fz); }), ceil: (x, y) => under(x, y), px: q, bat: bats.f2 });
  }
  // ---- chimneys: great room (outside the living-room end wall) and the primary bedroom flue, brick with stone caps
  for (const c of CHIMNEYS) {
    const [x0, z0] = F(c.px[0], c.px[1]), [x1, z1] = F(c.px[2], c.px[3]);
    const lo = c.base < 0 ? H.basement : H.ceil2;
    if (c.base < 0) { bats.f1.aabox({ def: 'brickExt', pv: 'cut' }, x0, lo, z0, x1, H.f2, z1); bats.f2.aabox({ def: 'brickExt', pv: 'cut' }, x0, H.f2, z0, x1, H.plate2, z1); }
    bat.aabox({ def: 'brickExt', pv: 'cut' }, x0, c.base < 0 ? H.plate2 : lo, z0, x1, c.top, z1);
    bat.aabox('stoneTrim', x0 - 0.2, c.top, z0 - 0.2, x1 + 0.2, c.top + 0.35, z1 + 0.2);
    const k = new Kit(bat, 'roof').at((x0 + x1) / 2, (z0 + z1) / 2, 0);
    k.cyl('col:#6b6660', 0, 0, 0.32, 0.32, c.top + 0.35, c.top + 1.3, 10); k.cyl('col:#3c3a38', 0, 0, 0.48, 0.45, c.top + 1.3, c.top + 1.55, 10);
    addSolid(V(x0, 0, z0), V(x1 - x0, 0, 0), V(0, 0, z1 - z0), lo, c.top, c.base < 0 ? 'f1' : 'f2');
  }
  // ---- skylights: two over the primary bath (photos 39, 40) on the wing's garage-side slope, the kitchen one above
  for (const [x0, y0, x1, y1] of [[868, 214, 896, 252], [908, 214, 936, 252]]) {
    const q = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    SKYLIGHTS.push({ top: q.map(([x, y]) => { const [fx, fz] = toFt([x, y]); return V(fx, ROOF.wing(x, y) + 0.12, fz); }), ceil: (x, y) => Math.min(H.ceil2, H.wingPlate + (y - 206) / PX), px: q, bat: bats.f2 });
  }
  for (const s of SKYLIGHTS) {
    const top = s.top;
    bat.face('skylight', top, V(0, 1, 0));
    for (let i = 0; i < 4; i++) {
      const a = top[i], b = top[(i + 1) % 4];
      bat.face('extTrim', [a, b, b.clone().add(V(0, -0.2, 0)), a.clone().add(V(0, -0.2, 0))], V(b.z - a.z, 0, a.x - b.x));
      const ca = s.ceil(s.px[i][0], s.px[i][1]), cb = s.ceil(s.px[(i + 1) % 4][0], s.px[(i + 1) % 4][1]);
      s.bat.face('white', [V(a.x, ca, a.z), V(b.x, cb, b.z), V(b.x, b.y - 0.12 - ROOFT, b.z), V(a.x, a.y - 0.12 - ROOFT, a.z)], V(a.z - b.z, 0, b.x - a.x));
    }
    s.bat.face('frosted', top.map((v) => V(v.x, v.y - 0.12 - ROOFT + 0.02, v.z)), V(0, -1, 0));
  }
  // plumbing vents on the back slope
  for (const [x, y] of [[470, 230], [900, 330]]) { const [fx, fz] = F(x, y); const h = x > 800 ? ROOF.wing(x, y) : ROOF.main(x, y); bat.aabox('col:#3a3a3a', fx, h - 0.3, fz, fx + 0.35, h + 1.1, fz + 0.35); }
}
// offset a polygon's edges outward by d px (edges listed in `keep` stay put); returns the new vertices
function offsetPoly(pts, d, keep = []) {
  const n = pts.length;
  let area = 0; for (let i = 0, j = n - 1; i < n; j = i++) area += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
  const lines = pts.map((a, i) => { const b = pts[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); let nx = dy / l, ny = -dx / l; if (area > 0) { nx = -nx; ny = -ny; } const o = keep.includes(i) ? 0 : d; return { p: [a[0] + nx * o, a[1] + ny * o], d: [dx / l, dy / l] }; });
  return pts.map((_, i) => { const L1 = lines[(i - 1 + n) % n], L2 = lines[i]; const den = L1.d[0] * L2.d[1] - L1.d[1] * L2.d[0]; if (Math.abs(den) < 1e-9) return L2.p; const t = ((L2.p[0] - L1.p[0]) * L2.d[1] - (L2.p[1] - L1.p[1]) * L2.d[0]) / den; return [L1.p[0] + L1.d[0] * t, L1.p[1] + L1.d[1] * t]; });
}

// ------------------------------------------------------------------ exterior: quoins, entry surround, lanterns
function buildExterior(bats) {
  const b1 = bats.f1, b2 = bats.f2;
  // raised brick quoins at the main block's corners and either side of the entry bay (photo 04)
  const quoin = (px, py, dirs) => {
    const [x, z] = F(px, py);
    for (let i = 0, y = -1.0; y < H.plate2 - 0.5; i++, y += 0.78) {
      const bat = y < H.f2 ? b1 : b2, long = i % 2 === 0;
      for (const [ux, uz, nx, nz] of dirs) {
        const w = long ? 1.55 : 0.95, o = V(x + nx * 0.25, y + 0.04, z + nz * 0.25);
        bat.box('brickExt', o.clone().addScaledVector(V(ux, 0, uz), -0.33), V(ux * (w + 0.33), 0, uz * (w + 0.33)), V(0, 0.7, 0), V(nx * 0.43, 0, nz * 0.43));
      }
    }
  };
  quoin(177.5, 585, [[1, 0, 0, 1], [0, -1, -1, 0]]);
  quoin(721, 585, [[-1, 0, 0, 1], [0, -1, 1, 0]]);
  quoin(365, 585, [[-1, 0, 0, 1]]); quoin(530, 585, [[1, 0, 0, 1]]);
  quoin(177.5, 171, [[0, 1, -1, 0], [1, 0, 0, -1]]);
  // entry surround (photos 03, 05): white fluted pilasters, an elliptical arch with a keystone over the leaded transom
  { const [x0, z] = F(408, 585), [x1] = F(488, 0), zf = z + 0.25, cx = (x0 + x1) / 2, a = (x1 - x0) / 2 + 0.25, bA = 1.2, ys = 8.3, k = new Kit(b1, 'f1');
    for (const x of [x0 - 0.35, x1 + 0.35]) { k.box('extTrim', x - 0.35, -0.2, zf, x + 0.35, ys, zf + 0.22); for (const dx of [-0.17, 0, 0.17]) k.box('col:#dcd7cb', x + dx - 0.03, 0.4, zf + 0.22, x + dx + 0.03, ys - 0.4, zf + 0.24); k.box('extTrim', x - 0.45, ys - 0.2, zf, x + 0.45, ys, zf + 0.3); }
    const N = 16, pt = (t, r) => [cx + Math.cos(t) * (a + r), ys + Math.sin(t) * (bA + r * 0.8)];
    for (let i = 0; i < N; i++) { const t0 = (Math.PI * i) / N, t1 = (Math.PI * (i + 1)) / N, [p0x, p0y] = pt(t0, 0), [p1x, p1y] = pt(t1, 0), [q1x, q1y] = pt(t1, 0.55), [q0x, q0y] = pt(t0, 0.55);
      b2.face('extTrim', [V(p0x, p0y, zf + 0.22), V(p1x, p1y, zf + 0.22), V(q1x, q1y, zf + 0.22), V(q0x, q0y, zf + 0.22)], V(0, 0, 1));
      b2.face('extTrim', [V(q0x, q0y, zf), V(q1x, q1y, zf), V(q1x, q1y, zf + 0.22), V(q0x, q0y, zf + 0.22)], V(0, 1, 0)); }
    k.box('extTrim', cx - 0.3, ys + bA - 0.15, zf, cx + 0.3, ys + bA + 0.75, zf + 0.32);
  }
  // half-round vents in the gable ends were added with the roofs; basement window wells are not needed (walk-out)
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
  Object.values(groups).forEach((g) => house.add(g));
  return { house, groups, furn, labels, levels: LV, renos };
}

export function roomAtPoint(id, x, z) {
  const L = LV[id];
  return L && L._rooms ? roomAt(L, x, z) : null;
}
