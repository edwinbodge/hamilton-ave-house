// Builds the Creekside Ln house (walls, openings, floors, stairs, railings, roofs, trim) from data.js.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { LEVELS, STAIRS, toFt, F2, H, RY, ROOFT, PX, vaultTop, vaultUnder } from './data.js';
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
  if (r.floor === 'oak') return 'wood';
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
    else if (type === 'g') { sill = -0.6; head = 7.4; }
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
    const fy = r.y;
    if (ya <= fy + 0.01) strip(side, s, e, fy, fy + 0.3, 0.05, L.id === 'b' ? 'col:#d9b98a' : 'trim');
    if (r.chair && ya <= fy + 2.9 && yb2 >= fy + 3.1) strip(side, s, e, fy + 2.85, fy + 3.05, 0.06, 'trim');
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
    const fk = (k) => (k.outside ? 'winTrim' : k.room && k.room.bare ? 'white' : 'trim');
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
        const style = type === 'x' ? oo.style || 'half' : 'panel6';
        const color = oo.color || 'door';
        const pid = L.id + ':' + w.slice(0, 2).join(',') + ':' + s.toFixed(1);
        if (oo.pair) {
          const mid = (s + e) / 2;
          hang(s + ft, mid, 's', swingSide, head - ft - 0.02, style, color, 85, pid, true);
          hang(mid, e - ft, 'e', swingSide, head - ft - 0.02, style, color, 85, pid, true);
        } else hang(s + ft, e - ft, hingeEnd, swingSide, head - ft - 0.02, style, color, type === 'x' ? 80 : 85, null, type !== 'x');
        break;
      }
      case 'e': { // entry: as built = oak door with leaded oval-glass lites and sidelights; Classic refresh = black glass double door
        const keep = [bat, RS, TAG];
        bat = renoBat('off:classic', L.id); RS = TAG = 'off:classic';
        const sl = 1.15;
        for (const [a0, a1] of [[s + ft, s + ft + sl], [e - ft - sl, e - ft]]) {
          fbox(a0, a1, sill, sill + 2.2, 'frontDoor', 0.15, true);
          fbox(a0 + 0.12, a1 - 0.12, sill + 2.4, head - ft - 0.12, 'frosted', 0.05, true);
          fbox(a0, a1, sill + 2.2, sill + 2.4, 'frontDoor', 0.16);
          fbox(a0, a1, head - ft - 0.12, head - ft, 'frontDoor', 0.16);
        }
        fbox(s + ft + sl, s + ft + sl + 0.2, sill, head); fbox(e - ft - sl - 0.2, e - ft - sl, sill, head);
        hang(s + ft + sl + 0.2, e - ft - sl - 0.2, hingeEnd, swingSide, head - ft - 0.02, 'entry', 'frontDoor', 80, null, false);
        bat = renoBat('on:classic', L.id); RS = TAG = 'on:classic';
        { const pid = L.id + ':classic:' + s.toFixed(1), mid = (s + e) / 2;
          hang(s + ft, mid, 's', swingSide, head - ft - 0.02, 'glassdoor', 'black', 80, pid, false);
          hang(mid, e - ft, 'e', swingSide, head - ft - 0.02, 'glassdoor', 'black', 80, pid, false); }
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
    const inKey = L.id === 'b' ? 'white' : 'trim', outKey = 'winExt';
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
    } else if (style === 'entry') { // oak slab, raised panels low, two tall arched leaded lites
      const gw = (w - 0.9) / 2, g0 = y0 + 3.1, g1 = y0 + h - 0.6;
      k.box(key, 0, y0, -th / 2, w, g0, th / 2); k.box(key, 0, g1, -th / 2, w, y0 + h, th / 2);
      k.box(key, 0, g0, -th / 2, 0.35, g1, th / 2); k.box(key, w - 0.35, g0, -th / 2, w, g1, th / 2); k.box(key, 0.35 + gw, g0, -th / 2, 0.55 + gw, g1, th / 2);
      for (const s of [-1, 1]) {
        k.box('black', 0.35, y0 + 0.5, s * th / 2, w - 0.35, y0 + 2.6, s * (th / 2 + 0.02));
        k.box(key, 0.42, y0 + 0.57, s * th / 2, w - 0.42, y0 + 2.53, s * (th / 2 + 0.04));
      }
      for (const x of [0.35, 0.55 + gw]) {
        k.box('frosted', x, y0 + 3.1, -0.02, x + gw, y0 + h - 0.6, 0.02);
        k.box('brass', x - 0.04, y0 + 3.06, -th / 2 - 0.01, x + gw + 0.04, y0 + 3.1, th / 2 + 0.01);
        for (let i = 1; i < 4; i++) k.box('brass', x + gw / 2 - 0.01, y0 + 3.1 + (i * (h - 3.7)) / 4, -0.03, x + gw / 2 + 0.01, y0 + 3.1 + (i * (h - 3.7)) / 4 + 0.6, 0.03);
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
  function garageDoor(a0, a1, h0, h1, outSide) { // flush steel sections, four horizontal joints
    const k = sashKit(a0, -outSide * 0.05);
    const w = a1 - a0, h = h1 - h0;
    k.box('garageDoor', 0, h0, -0.08, w, h1, 0.08);
    k.solid(0, -0.1, w, 0.1, h0, h1);
    for (let r = 1; r < 4; r++) k.box('blackMatte', 0, h0 + (h / 4) * r - 0.02, outSide * 0.08, w, h0 + (h / 4) * r + 0.02, outSide * 0.09);
    for (const s of [-1, 1]) k.box('garageDoor', 0, h0, s * 0.08, w, h0 + 0.05, s * 0.1);
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
    if (r.vault) { renoBat('off:kitchen', 'f1').poly(r.floorKey, r.pts, r.y + 0.012); continue; } // sunken family room (leveled by the kitchen remodel)
    const holes = L._holes.filter((h) => pip(r.pts, h[0][0], h[0][1]) || pip(r.pts, h[1][0], h[1][1]) || pip(r.pts, h[2][0], h[2][1]));
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
    const fam = ftPoly(L.family);
    renoBat('off:kitchen', 'f1').prism({ top: 'subfloor', bottom: 'joist', side: 'joist' }, fam, -1.5, H.family);
    addFloorPoly(fam, [], H.family, 'off:kitchen');
    const gar = ftPoly(L.garage);
    bat.prism({ top: 'floor:concrete', side: 'foundation' }, gar, -1.2, H.garage);
    addFloorPoly(gar, [], H.garage, 'f1');
    for (const c of L.ceilings) bats.f2.poly('ceiling', ftPoly(c.pts), c.y, [], true);
  }
  if (L.id === 'f2') {
    const f = L._foot[0];
    bat.prism({ top: 'subfloor', bottom: 'ceiling', side: 'white' }, f, H.ceil1, H.f2, L._holes);
    addFloorPoly(f, L._holes, H.f2, 'f2');
    bats.roof.poly('ceiling', f, H.ceil2, SKYLIGHTS.map((s) => s.hole), true);
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

// main stair treads (shared with the cosmetic-refresh option, which re-skins them)
export function stairGeom() {
  const M = STAIRS.main, n = M.risers - 1, r = H.f2 / M.risers, d = (M.yBottom - M.yTop) / n;
  const [x0] = F(M.x0, 0), [x1] = F(M.x1, 0), [xf] = F(M.flareX, 0);
  const treads = [];
  for (let i = 1; i <= n; i++) {
    const [, za] = F(0, M.yBottom - (i - 1) * d), [, zb] = F(0, M.yBottom - i * d);
    treads.push({ i, x0: i <= 2 ? xf - (2 - i) * 0.5 : x0, x1, z0: zb, z1: za, top: i * r });
  }
  return { M, n, r, d, x0, x1, xf, treads, zTop: F(0, M.yTop)[1], zBot: F(0, M.yBottom)[1] };
}
function buildStairs(bats) {
  const S = stairGeom();
  const { treads, r, x0, x1, zTop, zBot } = S;
  // main stair: carpeted treads & risers, oak open stringer on the foyer side
  for (const t of treads) {
    const bottom = t.i <= 2 ? 0 : t.top - 0.7;
    bats.f1.aabox({ def: 'stairCarpet', nu: 'trim' }, t.x0, bottom, t.z0, t.x1, t.top, t.z1);
    if (t.i <= 2) bats.f1.aabox('trim', t.x0 - 0.02, t.top - 0.02, t.z1, t.x1, t.top + 0.04, t.z1 + 0.08); // oak nosing on the flared steps
    addFloorRect(t.x0, t.z0, t.x1, t.z1, t.top, 'f1');
  }
  // wall under the open side: closes the basement stairwell off from the foyer, rising with the stair
  {
    const zA = F(0, 531)[1], xw0 = x0 - 0.17, xw1 = x0 + 0.17;
    const topAt = (z) => Math.max(0.5, ((zBot - z) / (zBot - zTop)) * (H.f2 - r) - 0.75);
    const wk = LV.f1._rooms.find((q) => q.name === 'Foyer').wall;
    const zs = [zA, zTop + 0.01];
    bats.f1.face(wk, [V(xw0, 0, zs[0]), V(xw0, 0, zs[1]), V(xw0, Math.min(H.ceil1, topAt(zs[1])), zs[1]), V(xw0, topAt(zs[0]), zs[0])], V(-1, 0, 0));
    bats.f1.face('paint:#ecebe7', [V(xw1, 0, zs[0]), V(xw1, 0, zs[1]), V(xw1, Math.min(H.ceil1, topAt(zs[1])), zs[1]), V(xw1, topAt(zs[0]), zs[0])], V(1, 0, 0));
    bats.f1.face('paint:#ecebe7', [V(xw0, 0, zA), V(xw1, 0, zA), V(xw1, topAt(zA), zA), V(xw0, topAt(zA), zA)], V(0, 0, 1));
    // oak stringer along the top edge, baseboard
    bats.f1.box('trim', V(xw0 - 0.04, topAt(zA), zA), V(0, topAt(zTop) - topAt(zA), zTop - zA), V(0, 0.95, 0), V(0.08, 0, 0));
    bats.f1.aabox('trim', xw0 - 0.05, 0, zTop, xw0, 0.3, zA);
    addSolid(V(xw0, 0, zTop), V(0.34, 0, 0), V(0, 0, zA - zTop), 0, H.f2, 'f1');
  }
  // railing: newel on the 2nd step, up the open side to the 2nd floor
  const t2 = treads[2];
  railing(bats.f1, [x0 + 0.05, t2.z1 - 0.1], [x0 + 0.05, zTop], t2.top, H.f2, 'trim', 'stairRail');
  railing(bats.f1, [x1 - 0.2, zBot - 0.6], [x1 - 0.2, zTop + 0.4], 0.67, H.f2 - 0.3, 'trim', 'f1', 'hand');
  // basement stair: carpeted treads, closed underneath, from the door off the back hall down toward the front
  const B = STAIRS.basement, nb = B.risers - 1, rb = (0 - H.basement) / B.risers, db = (B.yBottom - B.yTop) / nb;
  for (let j = 1; j <= nb; j++) {
    const [, za] = F(0, B.yBottom - j * db), [, zb] = F(0, B.yBottom - (j - 1) * db);
    const top = H.basement + j * rb;
    bats.b.aabox({ def: 'carpet:#bdb5a8', nw: 'white' }, x0, H.basement, za, x1, top, zb);
    addFloorRect(x0, za, x1, zb, top, 'b');
    addSolid(V(x0, 0, za), V(x1 - x0, 0, 0), V(0, 0, zb - za), H.basement, top - 1.3, 'b');
  }
  const [, zbT] = F(0, B.yTop), [, zbB] = F(0, B.yBottom);
  railing(bats.b, [x1 - 0.2, zbB], [x1 - 0.2, zbT], H.basement + rb, 0, 'trim', 'b', 'hand');
  railing(bats.b, [x0 + 0.2, zbB], [x0 + 0.2, zbT], H.basement + rb, 0, 'trim', 'b', 'hand');
}

function buildRailings(bats) {
  const g2 = (x, y) => toFt(F2(x, y));
  // 2nd floor: around the foyer void (loft side and the short hall run) and the loft balcony over the family room
  const S = stairGeom();
  railing(bats.f2, [S.x0 + 0.05, S.zTop + 0.05], g2(752.5, 215.5), H.f2, H.f2, 'trim', 'stairRail2');
  railing(bats.f2, g2(752.5, 215.5), g2(752.5, 245.5), H.f2, H.f2, 'trim', 'stairRail2');
  railing(bats.f2, g2(783.5, 163), g2(835.5, 163), H.f2, H.f2, 'trim', 'stairRail2');
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

// skylights: primary bath (seen in the photos) and the upstairs hall (aerial photos). px rectangles + the roof plane they sit in.
const sk = (x0, y0, x1, y1, plane) => ({ px: [x0, y0, x1, y1], plane, hole: ftPoly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) });
const SKYLIGHTS = [sk(780, 262, 805, 310, 'east'), sk(444, 365, 466, 412, 'west')];

export const ROOF = {}; // plane height functions (px -> ft), filled by buildRoofs, used by reno + site
function buildRoofs(bats) {
  const bat = bats.roof, p = H.pitch, o = PX;
  const X0 = 323.5, X1 = 840, Y0 = 197.5, Y1 = 563.5, D = (Y1 - Y0) / 2, Yr = Y0 + D, Rx0 = X0 + D, Rx1 = X1 - D;
  const X0o = X0 - o, X1o = X1 + o, Y0o = Y0 - o, Y1o = Y1 + o;
  // family block (catslide off the rear slope) and the bay/tower projection on the west front
  const FX0 = 474, FX1 = 701.5, FY0o = 57.5 - o, FX0r = FX0 - o, FX1r = FX1 + o;
  const PX0 = 323.5, PX1 = 477, PY1 = 656.5, Pd = (PX1 - PX0) / 2, Pr = PX0 + Pd, PY1o = PY1 + o, PX1o = PX1 + o, PYr = PY1 - Pd;
  const hipL = (x) => Y0o + (x - X0o), hipR = (x) => Y0o + (X1o - x);
  const rear = { o: [0, Y0], up: [0, 1], h0: RY, p };
  ROOF.rear = rplane(bat, [[X0o, Y0o], [FX0r, Y0o], [FX0r, hipL(FX0r)]], { ...rear, eaves: [0] });
  rplane(bat, [[FX0r, FY0o], [FX1r, FY0o], [FX1r, Y0o], [FX1r, hipR(FX1r)], [Rx1, Yr], [Rx0, Yr], [FX0r, hipL(FX0r)], [FX0r, Y0o]], { ...rear, eaves: [0], rakes: [1, 7], ridges: [4] });
  rplane(bat, [[FX1r, Y0o], [X1o, Y0o], [FX1r, hipR(FX1r)]], { ...rear, eaves: [0] });
  // front slope (the tower projection takes over its west end)
  const vx = PX1o, vy = Y1o; // valley start: projection's east eave meets the main front eave
  const vTop = [Pr, 887 + 0 - Pr]; // on the main west hip line y = (X0o + Y1o) - x
  vTop[1] = X0o + Y1o - Pr;
  ROOF.front = rplane(bat, [[vx, vy], [X1o, Y1o], [Rx1, Yr], [Rx0, Yr], vTop], { o: [0, Y1], up: [0, -1], h0: RY, p, eaves: [0] });
  // west slope + the tower's west slope (same plane)
  const west = { o: [X0, 0], up: [1, 0], h0: RY, p };
  ROOF.west = rplane(bat, [[X0o, Y0o], [X0o, PY1o], [Pr, PYr + 0], [Pr, vTop[1]]], { ...west, eaves: [0], ridges: [2] });
  rplane(bat, [[X0o, Y0o], [Pr, vTop[1]], [Rx0, Yr]], west);
  rplane(bat, [[PX1o, Y1o], [PX1o, PY1o], [Pr, PYr], [Pr, vTop[1]]], { o: [PX1, 0], up: [-1, 0], h0: RY, p, eaves: [0], ridges: [2] });
  rplane(bat, [[X0o, PY1o], [PX1o, PY1o], [Pr, PYr]], { o: [0, PY1], up: [0, -1], h0: RY, p, eaves: [0] });
  // east slope, with the bedroom bump over the garage
  const BX1 = 931.9, BY0 = 379.4, BY1 = 520.6, bd = (BY1 - BY0) / 2, Bry = BY0 + bd, BX1o = BX1 + o, BY0o = BY0 - o, BY1o = BY1 + o, Brx = BX1 - bd;
  const vN = [X1o - (Bry - BY0o), Bry]; // valleys meet on the bump ridge line
  const east = { o: [X1, 0], up: [-1, 0], h0: RY, p };
  ROOF.east = rplane(bat, [[X1o, Y0o], [X1o, BY0o], vN, [Rx1, Yr]], { ...east, eaves: [0] });
  rplane(bat, [vN, [X1o, BY1o], [X1o, Y1o], [Rx1, Yr]], { ...east, eaves: [1] });
  rplane(bat, [[X1o, BY0o], [BX1o, BY0o], [Brx, Bry], vN], { o: [0, BY0], up: [0, 1], h0: RY, p, eaves: [0], ridges: [2] });
  rplane(bat, [vN, [Brx, Bry], [BX1o, BY1o], [X1o, BY1o]], { o: [0, BY1], up: [0, -1], h0: RY, p, eaves: [2], ridges: [0] });
  rplane(bat, [[BX1o, BY0o], [BX1o, BY1o], [Brx, Bry]], { o: [BX1, 0], up: [-1, 0], h0: RY, p, eaves: [0] });
  // garage: hip at the front, rake at the back (behind the bump), pitch 7/12
  const RG = 10 + ROOFT, pg = H.garagePitch;
  const GX0 = 700, GX1 = 987.5, GY0 = 378.5, GY1 = 722.5, GR = (GX0 + GX1) / 2, GY1o = GY1 + o, GX1o = GX1 + o, GX0o = GX0 - o, Gry = GY1o - (GX1o - GR);
  const gE = { o: [GX1, 0], up: [-1, 0], h0: RG, p: pg };
  ROOF.garageEast = rplane(bat, [[BX1, GY0 - o], [GX1o, GY0 - o], [GX1o, BY1], [BX1, BY1]], { ...gE, eaves: [1], rakes: [0] });
  rplane(bat, [[GR, BY1], [GX1o, BY1], [GX1o, GY1o], [GR, Gry]], { ...gE, eaves: [1], ridges: [3] });
  const gW = { o: [GX0, 0], up: [1, 0], h0: RG, p: pg }, Yp = 536.9, wHip = Gry + (GR - 701.5);
  rplane(bat, [[701.5, Yp], [GR, Yp], [GR, Gry], [701.5, wHip]], { ...gW, ridges: [1] });
  rplane(bat, [[GX0o, 563.5], [701.5, 563.5], [701.5, wHip], [GX0o, GY1o]], { ...gW, eaves: [3] });
  rplane(bat, [[GX0o, GY1o], [GX1o, GY1o], [GR, Gry]], { o: [0, GY1], up: [0, -1], h0: RG, p: pg, eaves: [0] });
  { // gable end of the garage's back rake, above the rear wall
    const [ax, az] = F(BX1, GY0), [bx] = F(GX1, 0);
    gableTri(bats.f1, [V(ax, 10, az), V(bx, 10, az), V(ax, 10 + (pg * (GX1 - BX1)) / PX, az)]);
  }
  // kitchen bump: low hip against the dining/kitchen wing
  const pk = 5 / 12, RK = 10 + ROOFT, kx0 = 292 - o, ky0 = 351.5 - o, ky1 = 494.5 + o, kd = 323.5 - kx0;
  rplane(bat, [[kx0, ky0], [kx0, ky1], [323.5, ky1 - kd], [323.5, ky0 + kd]], { o: [292, 0], up: [1, 0], h0: RK, p: pk, eaves: [0] });
  rplane(bat, [[kx0, ky0], [323.5, ky0 + kd], [323.5, ky0]], { o: [0, 351.5], up: [0, 1], h0: RK, p: pk, eaves: [2] });
  rplane(bat, [[kx0, ky1], [323.5, ky1], [323.5, ky1 - kd]], { o: [0, 494.5], up: [0, -1], h0: RK, p: pk, eaves: [0] });
  // the two-story bay's own low bonnet roof, dying into the tower's front hip
  {
    const A = [357, 656.5], B = [372, 677], C = [425, 677], Dd = [440, 656.5], ob = 9;
    const off = (p0, p1) => { const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy); return [dy / l * ob, -dx / l * ob]; };
    const inter = (a1, a2, b1, b2) => { const d = (a2[0] - a1[0]) * (b2[1] - b1[1]) - (a2[1] - a1[1]) * (b2[0] - b1[0]); const t = ((b1[0] - a1[0]) * (b2[1] - b1[1]) - (b1[1] - a1[1]) * (b2[0] - b1[0])) / d; return [a1[0] + (a2[0] - a1[0]) * t, a1[1] + (a2[1] - a1[1]) * t]; };
    const oAB = off(A, B), oBC = off(B, C), oCD = off(C, Dd);
    const sh = (p0, d) => [p0[0] - d[0], p0[1] - d[1]]; // outward is -normal for this winding
    const aA = sh(A, oAB), aB = sh(B, oAB), bB = sh(B, oBC), bC = sh(C, oBC), cC = sh(C, oCD), cD = sh(Dd, oCD);
    const Bp = inter(aA, aB, bB, bC), Cp = inter(bB, bC, cC, cD);
    const wall = [[0, 656.5], [1, 656.5]];
    const Ap = inter(aA, aB, wall[0], wall[1]), Dp = inter(cC, cD, wall[0], wall[1]);
    const Bw = inter(Bp, B, wall[0], wall[1]), Cw = inter(Cp, C, wall[0], wall[1]);
    const pb = 4 / 12, hb = RY - 0.35;
    const fh = {};
    const facet = (poly, e0, e1) => { const dx = e1[0] - e0[0], dy = e1[1] - e0[1], l = Math.hypot(dx, dy); return rplane(bat, poly, { o: e0, up: [dy / l, -dx / l], h0: hb, p: pb, eaves: [0] }); };
    fh.f = facet([Bp, Cp, Cw, Bw], Bp, Cp);
    facet([Ap, Bp, Bw], Ap, Bp);
    facet([Cp, Dp, Cw], Cp, Dp);
    // apron where the bonnet meets the tower wall above the hip
    const apron = [Ap, Bw, Cw, Dp].map(([x, y], i) => { const [fx, fz] = F(x, y); return [fx, fz, i === 0 || i === 3 ? hb : fh.f(x, y)]; });
    for (let i = 0; i < 3; i++) { const [ax, az, ah] = apron[i], [bx, bz, bh] = apron[i + 1]; gableTri(bat, [V(ax, RY - 0.7, az), V(bx, RY - 0.7, bz), V(bx, bh, bz)]); gableTri(bat, [V(ax, RY - 0.7, az), V(bx, bh, bz), V(ax, ah, az)]); }
  }
  // entry canopy: shallow shed roof on a white post with a brick base (as in the front photos); the modern facade replaces it
  {
    const pc = 4 / 12, cr = renoBat('off:facade', 'roof'), c1 = renoBat('off:facade', 'f1');
    const [cx, cz] = F(553, 586);
    const k = new Kit(c1, 'off:facade').at(cx, cz, 0);
    k.cbox('brickExt', 0, 0, 1.6, 1.6, -0.9, 9.6); k.cbox('col:#cbbfae', 0, 0, 1.85, 1.85, 9.6, 9.85);
    addSolid(V(cx - 0.8, 0, cz - 0.8), V(1.6, 0, 0), V(0, 0, 1.6), -1, 9.85, 'off:facade');
  }
  // chimney: tan brick from grade to above the roof, stone cap, flue
  {
    const [cx0, cz0] = F(560, 28.5), [cx1, cz1] = F(626, 57.5);
    bats.f1.aabox({ def: 'brickExt', pv: 'cut' }, cx0, -1.0, cz0, cx1, 10, cz1);
    bat.aabox({ def: 'brickExt', pv: 'cut' }, cx0, 10, cz0, cx1, 27.6, cz1);
    bat.aabox('col:#c9c3b6', cx0 - 0.2, 27.6, cz0 - 0.2, cx1 + 0.2, 28.0, cz1 + 0.2);
    const k = new Kit(bat, 'roof').at((cx0 + cx1) / 2, (cz0 + cz1) / 2, 0);
    k.cyl('col:#3a3a3a', 0, 0, 0.35, 0.35, 28.0, 29.0, 10); k.cyl('col:#2b2b2b', 0, 0, 0.55, 0.5, 29.0, 29.4, 10);
    addSolid(V(cx0, 0, cz0), V(cx1 - cx0, 0, 0), V(0, 0, cz1 - cz0), -1, 28, 'f1');
  }
  // skylights + their light shafts down to the 18 ft ceiling
  for (const s of SKYLIGHTS) {
    const f = ROOF[s.plane], [x0, y0, x1, y1] = s.px;
    const q = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    const top = q.map(([x, y]) => { const [fx, fz] = toFt([x, y]); return V(fx, f(x, y) + 0.12, fz); });
    bat.face('skylight', top, V(0, 1, 0));
    for (let i = 0; i < 4; i++) {
      const a = top[i], b = top[(i + 1) % 4];
      bat.face('extTrim', [a, b, b.clone().add(V(0, -0.2, 0)), a.clone().add(V(0, -0.2, 0))], V(b.z - a.z, 0, a.x - b.x));
      const lo = (v) => V(v.x, H.ceil2, v.z), hi = (v) => V(v.x, v.y - 0.12 - ROOFT, v.z);
      bats.f2.face('white', [lo(a), lo(b), hi(b), hi(a)], V(a.z - b.z, 0, b.x - a.x));
    }
    bats.f2.face('frosted', top.map((v) => V(v.x, v.y - 0.12 - ROOFT + 0.02, v.z)), V(0, -1, 0));
  }
  // plumbing vents
  for (const [x, y] of [[700, 350], [400, 430]]) { const [fx, fz] = F(x, y); const h = y < 380 ? ROOF.east(x, y) : ROOF.west(x, y); bat.aabox('col:#3a3a3a', fx, h - 0.3, fz, fx + 0.35, h + 1.1, fz + 0.35); }
}

// Family room: the vaulted ceiling, the gable-ish infill above the 2nd-floor walls around the void,
// and the loft's knee wall above the balcony. Wall finish = the family room's.
function buildVault(bats) {
  const fam = LV.f1._rooms.find((r) => r.name === 'Family Room'), wk = fam.wall;
  const bat = bats.roof; // goes with the roof so the plan views look into the room
  const [x0, z0] = F(474, 57.5), [x1, z1] = F(701.5, 305);
  const u = (z) => vaultUnder(z * PX + 28.5) - 0.03;
  bat.face('ceiling', [V(x0, u(z0), z0), V(x1, u(z0), z0), V(x1, u(z1), z1), V(x0, u(z1), z1)], V(0, -1, 0.75).normalize());
  const zb = F(0, 197.5)[1];
  for (const x of [x0, x1]) {
    const pts = [V(x, H.ceil2, zb), V(x, H.ceil2, z1), V(x, u(z1), z1)];
    bat.face(wk, pts, V(x === x0 ? 1 : -1, 0, 0)); bat.face(wk, pts, V(x === x0 ? -1 : 1, 0, 0));
  }
  const fz = [V(x0, H.ceil2, z1), V(x1, H.ceil2, z1), V(x1, u(z1), z1), V(x0, u(z1), z1)];
  bat.face(wk, fz, V(0, 0, -1)); bat.face('white', fz, V(0, 0, 1));
  // the 2nd-floor joist band (9-10 ft) seen from the family room is drywalled
  bats.f2.face(wk, [V(x0, H.ceil1, z1), V(x1, H.ceil1, z1), V(x1, H.f2 + 0.02, z1), V(x0, H.f2 + 0.02, z1)], V(0, 0, -1));
  // and the band above the 2nd-floor partitions (18 -> 18 ft wall top) on the 2nd-floor side walls of the void
  // ceiling fan + recessed lights are in furnish.js
}

// ------------------------------------------------------------------ exterior: brick, bay panels, corner boards
function buildExterior(bats) {
  const b1 = bats.f1, b2 = bats.f2;
  const hw = 0.25; // half wall thickness
  // brick on a face: plan segment a->b (px), outward normal side computed from `out` ([nx, nz])
  const veneer = (bat, a, b, out, y0, y1, key = 'brickExt', ext0 = 0, ext1 = 0, T = 0.33) => {
    const [ax, az] = F(...a), [bx, bz] = F(...b);
    const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l;
    const o = V(ax - ux * ext0 + out[0] * hw, y0, az - uz * ext0 + out[1] * hw);
    bat.box(key, o, V(ux * (l + ext0 + ext1), 0, uz * (l + ext0 + ext1)), V(0, y1 - y0, 0), V(out[0] * T, 0, out[1] * T));
    if (key === 'brickExt' && y1 < 9) bat.box('col:#cbbfae', o.clone().add(V(0, y1 - y0, 0)), V(ux * (l + ext0 + ext1), 0, uz * (l + ext0 + ext1)), V(0, 0.12, 0), V(out[0] * (T + 0.08), 0, out[1] * (T + 0.08)));
  };
  // tower piers: full two stories of brick either side of the bay, wrapping the corners
  for (const [bat, y0, y1] of [[b1, -0.9, 10], [b2, 10, 18]]) {
    veneer(bat, [323.5, 656.5], [357, 656.5], [0, 1], y0, y1, 'brickExt', 0.6, 0);
    veneer(bat, [440, 656.5], [477, 656.5], [0, 1], y0, y1, 'brickExt', 0, 0.6);
    veneer(bat, [323.5, 620], [323.5, 656.5], [-1, 0], y0, y1, 'brickExt', 0, 0.6);
    veneer(bat, [477, 563.5], [477, 656.5], [1, 0], y0, y1, 'brickExt', 0, 0.6);
  }
  // bay: brick base, cedar-shake panels between the two floors of windows
  const bay = [[357, 656.5], [372, 677], [425, 677], [440, 656.5]];
  for (let i = 0; i < 3; i++) {
    const a = bay[i], c = bay[i + 1], dx = c[0] - a[0], dy = c[1] - a[1], l = Math.hypot(dx, dy), out = [-dy / l, dx / l];
    veneer(b1, a, c, out, -0.9, 1.85);
    veneer(b1, a, c, out, 7.75, 11.75, 'shake', 0, 0, 0.06);
  }
  // brick wainscot across the stair/laundry front and around the garage front, with a sloped cap
  veneer(b1, [552, 563.5], [700, 563.5], [0, 1], -0.9, 2.6);
  // white-trimmed vertical strip right of the entry: laundry window, shake panel, 2nd-floor window stacked (front photo)
  veneer(b1, [646, 563.5], [685, 563.5], [0, 1], 2.72, 3.6, 'shake', 0, 0, 0.06);
  veneer(b1, [646, 563.5], [685, 563.5], [0, 1], 7.0, 10, 'shake', 0, 0, 0.06);
  veneer(b2, [646, 563.5], [685, 563.5], [0, 1], 10, 12.4, 'shake', 0, 0, 0.06);
  for (const [bat, y0, y1] of [[b1, 2.72, 10], [b2, 10, 17.3]]) {
    veneer(bat, [642, 563.5], [646, 563.5], [0, 1], y0, y1, 'winTrim', 0, 0, 0.1);
    veneer(bat, [685, 563.5], [689, 563.5], [0, 1], y0, y1, 'winTrim', 0, 0, 0.1);
  }
  veneer(b2, [642, 563.5], [689, 563.5], [0, 1], 16.95, 17.3, 'winTrim', 0, 0, 0.1);
  veneer(b1, [700, 563.5], [700, 722.5], [-1, 0], -0.9, 2.6, 'brickExt', 0, 0.6);
  veneer(b1, [700, 722.5], [987.5, 722.5], [0, 1], -0.9, 2.6, 'brickExt', 0.6, 0.6);
  // brick pier at the garage's front corner with a lantern on top (driveway photo)
  {
    const [x, z] = F(985, 735);
    const k = new Kit(b1, 'f1').at(x, z, 0);
    k.cbox('brickExt', 0, 0, 2.0, 2.0, -1.0, 3.4); k.cbox('col:#cbbfae', 0, 0, 2.3, 2.3, 3.4, 3.6);
    k.cyl('black', 0, 0, 0.18, 0.3, 3.6, 4.0, 8); k.cyl('frosted', 0, 0, 0.32, 0.38, 4.0, 5.0, 6); k.cyl('black', 0, 0, 0.42, 0.1, 5.0, 5.5, 6);
    addSolid(V(x - 1, 0, z - 1), V(2, 0, 0), V(0, 0, 2), -1, 3.6, 'f1');
  }
  // corner boards on the sided corners
  const corners = (L, bat, y0, y1, skip) => {
    for (const poly of L._foot) {
      let area = 0;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) area += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
      for (let i = 0; i < poly.length; i++) {
        const p0 = poly[(i - 1 + poly.length) % poly.length], q = poly[i], p1 = poly[(i + 1) % poly.length];
        const ax = q[0] - p0[0], az = q[1] - p0[1], bx = p1[0] - q[0], bz = p1[1] - q[1];
        if (Math.sign(ax * bz - az * bx) !== Math.sign(area)) continue;
        if (!((Math.abs(ax) < 0.05 || Math.abs(az) < 0.05) && (Math.abs(bx) < 0.05 || Math.abs(bz) < 0.05))) continue;
        if (skip(q)) continue;
        let d = [0.2, 0.2];
        for (const c of [[0.2, 0.2], [-0.2, 0.2], [0.2, -0.2], [-0.2, -0.2]]) if (!pip(poly, q[0] + c[0] * 3, q[1] + c[1] * 3)) d = c;
        const cx = q[0] + d[0], cz = q[1] + d[1];
        const low = L.id === 'f1' && q[1] * PX + 28.5 < 60; // family room rear corners: under the low eave
        bat.aabox('extTrim', cx - 0.25, y0, cz - 0.25, cx + 0.25, low ? 9.3 : y1, cz + 0.25);
      }
    }
  };
  const brickCorner = (q) => { const px = q[0] * PX + 292, py = q[1] * PX + 28.5; return (py > 640 && px < 480) || (py > 560 && Math.abs(px - 477) < 3); };
  corners(LV.f1, b1, -0.9, 10, brickCorner);
  corners(LV.f2, b2, 10, 18, brickCorner);
  // basement window wells along the west wall and the east room
  for (const [x, y, nx, nz] of [[323.5, 291, -1, 0], [323.5, 572, -1, 0], [771, 222, 0, -1], [840.3, 311, 1, 0]]) {
    const [fx, fz] = F(x, y);
    const k = new Kit(b1, 'f1').at(fx + nx * 1.4, fz + nz * 1.4, 0, nx ? 90 : 0);
    k.box('col:#9a9893', -2.0, -1.6, -1.2, 2.0, -0.85, 1.2);
  }
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
  Object.values(groups).forEach((g) => house.add(g));
  return { house, groups, furn, labels, levels: LV, renos };
}

export function roomAtPoint(id, x, z) {
  const L = LV[id];
  return L && L._rooms ? roomAt(L, x, z) : null;
}
