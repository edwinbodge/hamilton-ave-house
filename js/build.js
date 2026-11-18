// Builds the house (walls, openings, floors, stairs, roofs, trim) from data.js.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { LEVELS, STAIRS, RAILINGS, toFt, F2, CHERRY } from './data.js';
import { Batcher, Kit, V, pip, centroid, addSolid, addFloorPoly, addFloorRect, material as matFor, PHYS, ORIGIN } from './geom.js';

// Operable doors (hinged leaves and the patio slider). Each has t (0 closed .. 1 open) and apply().
export const DOORS = [];
// Renovation sets. 'off:<name>' = parts removed when renovation <name> is on, 'on:<name>' = parts it adds.
// Geometry for each set and level goes into its own batcher/group so it can be toggled.
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
  if (/^(Shower|Tub)$/.test(r.name)) return 'showerTile';
  if (/Kitchen|Nook/.test(r.name)) return 'kitchen';
  if (/Bedroom/.test(r.name)) return 'bed';
  if (/Bath|^Linen$/.test(r.name)) return 'bath';
  if (r.name === 'Recreation Room') return 'rec';
  return 'main';
}
function floorCat(L, r) {
  if (r.floor === 'oak') return 'wood';
  if (r.floor.startsWith('carpet')) return L.id === 'f1' ? 'carpetMain' : 'carpetBed';
  if (r.floor === 'tileBeige') return 'tileBath';
  if (r.floor === 'slate') return 'sun';
  if (r.floor === 'tile4') return 'shower';
  if (r.floor === 'berber') return 'rec';
  return null;
}
export function roleRoom(L, r, i, prefix = '') {
  const rr = { ...r, pts: r.poly.map(([x, y]) => P(L, x, y)), y: r.y ?? L.floor, tile: r.wall.startsWith('tile') };
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
  } else rr.floorKey = 'floor:' + r.floor;
  return rr;
}
function prepLevel(L) {
  L._foot = L.footprint.map((poly) => poly.map(([x, y]) => P(L, x, y)));
  L._holes = (L.slabHoles || []).map((h) => h.map(([x, y]) => P(L, x, y)));
  L._rooms = L.rooms.map((r, i) => roleRoom(L, r, i));
}
const roomAt = (L, x, z) => (CTX.rooms || L._rooms).find((r) => pip(r.pts, x, z));
const inFoot = (L, x, z) => L._foot.some((f) => pip(f, x, z)) || (CTX.foot || []).some((f) => pip(f, x, z));

function sideKey(L, kind, x, z) {
  if (kind === 'e' && !inFoot(L, x, z)) return { key: L.id === 'b' ? 'foundation' : 'siding', outside: true };
  const r = roomAt(L, x, z);
  return { key: r ? r.wall : 'paint:#ece4d4', room: r };
}

// Turned balusters are instanced (one lathe geometry per level).
const BALUSTERS = { b: [], f1: [], f2: [] }; // keyed by tag (level id or reno set)
function balusterGeometry() {
  const pr = [[0.0, 0], [0.075, 0], [0.075, 0.35], [0.06, 0.4], [0.07, 0.55], [0.045, 0.75], [0.035, 1.5], [0.05, 1.9], [0.035, 2.05],
    [0.055, 2.25], [0.055, 2.75], [0.07, 2.8], [0.07, 2.9], [0, 2.9]].map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pr, 8);
}

// ------------------------------------------------------------------ walls
export function buildWall(L, w, bat) {
  const [x0, y0, x1, y1, kind, openings = [], opts = {}] = w;
  const RS = opts.rs || (opts.reno ? 'off:' + opts.reno : null);
  if (RS) bat = renoBat(RS, L.id);
  const TAG = RS || L.id;
  const a = P(L, x0, y0), b = P(L, x1, y1);
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
  const u = V(dx / len, 0, dz / len), n = V(-dz / len, 0, dx / len);
  const t = kind === 'e' ? 0.5 : 0.35;
  const base = L.floor;
  const yb = base + (kind === 'e' ? L.extBottom : 0);
  const yt = base + (opts.top ?? (kind === 'e' ? L.extTop : L.intTop));
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
    else if (type === 'o' || type === 'e') head = 7.0;
    else if (type === 'g') { sill = -0.5; head = 7.0; }
    else if (type === 's' || type === 'f') head = 6.9;
    return { s, e, type, sill: base + sill, head: base + head, oo, loAt, hiAt };
  }).sort((p, q) => p.s - q.s);

  const start = V(a[0], 0, a[1]);
  const at = (s, side, off) => start.clone().addScaledVector(u, s).addScaledVector(n, side * off);
  const sidesAt = (s) => {
    const c = at(s, 0, 0), off = t / 2 + 0.3;
    return [sideKey(L, kind, c.x + n.x * off, c.z + n.z * off), sideKey(L, kind, c.x - n.x * off, c.z - n.z * off)];
  };
  // over the rest of the house: does the 2nd floor sit above this point? (for the eave frieze)
  const underF2 = (s) => { const c = at(s, 0, 0); return L.id === 'f1' && inFoot(LV.f2, c.x, c.z); };

  // a solid piece; split further wherever the room on either side changes
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
    const U = u.clone().multiplyScalar(e - s), Vv = V(0, yb2 - ya, 0), W = n.clone().multiplyScalar(t);
    bat.box({ pw: kp.key, nw: kn.key, pv: 'cut', def: inner }, o, U, Vv, W);
    addSolid(o, U, W, ya, yb2, TAG);
    trim(kp, 1, s, e, ya, yb2);
    trim(kn, -1, s, e, ya, yb2);
  };

  const strip = (side, s, e, h0, h1, depth, key) => {
    if (e - s < 0.01) return;
    const o = at(s, side, t / 2); o.y = h0;
    bat.box(key, o, u.clone().multiplyScalar(e - s), V(0, h1 - h0, 0), n.clone().multiplyScalar(side * depth));
  };
  // baseboards, crown, wainscot on room faces; foundation + eave frieze outside
  const trim = (k, side, s, e, ya, yb2) => {
    if (k.outside) {
      if (L.id === 'f1' && ya <= yb + 0.01) strip(side, s, e, -1.0, -0.5, 0.06, 'foundation');
      if (yb2 >= yt - 0.01 && L.id !== 'b' && !underF2((s + e) / 2)) strip(side, s, e, yt - 0.7, yt, 0.07, 'white');
      return;
    }
    const r = k.room;
    if (!r || r.bare || r.tile) return;
    const fy = r.y;
    if (ya <= fy + 0.01) {
      if (r.wainscot) {
        strip(side, s, e, fy, Math.min(yb2, fy + 2.9), 0.03, 'W:wainscot');
        if (yb2 >= fy + 3.0) strip(side, s, e, fy + 2.82, fy + 3.0, 0.08, 'trim');
      }
      strip(side, s, e, fy, fy + 0.38, 0.05, 'trim');
    }
    if (r.crown && yb2 >= fy + L.ceiling - 0.01 && ya <= fy + L.ceiling - 0.4) {
      strip(side, s, e, fy + L.ceiling - 0.38, fy + L.ceiling, 0.1, 'trim');
      strip(side, s, e, fy + L.ceiling - 0.12, fy + L.ceiling, 0.2, 'trim');
    }
  };

  let cur = 0;
  for (const op of ops) {
    piece(cur, op.s, yb, yt);
    if (op.sill > yb) piece(op.s, op.e, yb, op.sill);
    if (op.head < yt) piece(op.s, op.e, op.head, yt);
    opening(op);
    cur = op.e;
  }
  piece(cur, len, yb, yt);

  // ---------------------------------------------------------------- openings
  function opening(op) {
    const { s, e, type, sill, head, oo } = op;
    const [kp, kn] = sidesAt((s + e) / 2);
    const fk = (k) => (k.outside ? 'white' : k.room && k.room.bare ? 'white' : 'trim');
    const frameKeys = { pw: fk(kp), nw: fk(kn), def: fk(kp.outside ? kn : kp) };
    const ft = 0.15, fd = t + 0.04;
    const fbox = (s0, s1, h0, h1, keys = frameKeys, depth = fd, solid = false, off = 0) => {
      const o = at(s0, 1, off - depth / 2); o.y = h0;
      const U = u.clone().multiplyScalar(s1 - s0), W = n.clone().multiplyScalar(depth);
      bat.box(keys, o, U, V(0, h1 - h0, 0), W);
      if (solid) addSolid(o, U, W, h0, h1, TAG);
    };
    const outSide = kp.outside ? 1 : kn.outside ? -1 : 0;
    // casing boards on each room face (oak inside, white outside)
    const casing = (side, k, withSill) => {
      const key = fk(k), cw = k.outside ? 0.36 : 0.29, dep = k.outside ? 0.07 : 0.06;
      strip(side, s - cw, s, sill, head + cw, dep, key);
      strip(side, e, e + cw, sill, head + cw, dep, key);
      strip(side, s - cw, e + cw, head, head + cw, dep, key);
      if (withSill) {
        if (k.outside) strip(side, s - cw - 0.05, e + cw + 0.05, sill - 0.12, sill, 0.14, 'white');
        else { strip(side, s - cw - 0.08, e + cw + 0.08, sill - 0.06, sill + 0.02, 0.2, key); strip(side, s - cw, e + cw, sill - 0.36, sill - 0.06, dep, key); }
      }
    };
    if (type !== 'o' && type !== 'g') {
      for (const [side, k] of [[1, kp], [-1, kn]]) if (k.outside || (k.room && !k.room.tile)) casing(side, k, type === 'w');
    }
    if (type === 'o') return; // drywall-wrapped opening, no trim (as in the photos)
    if (type === 'g') {
      fbox(s, s + 0.25, sill, head, 'white'); fbox(e - 0.25, e, sill, head, 'white'); fbox(s, e, head - 0.25, head, 'white');
      garageDoor(s + 0.25, e - 0.25, sill, head - 0.25, outSide || 1);
      return;
    }
    // jambs
    fbox(s, s + ft, sill, head); fbox(e - ft, e, sill, head); fbox(s, e, head - ft, head);
    if (type === 'w') {
      fbox(s, e, sill, sill + ft); windowSashes(op, s + ft, e - ft, sill + ft, head - ft, outSide);
      if (oo.sh && outSide) { // dark green raised-panel shutters, outside the casing
        const sw = Math.min(1.45, (e - s) * 0.46);
        for (const [a0, a1] of [[s - 0.42 - sw, s - 0.42], [e + 0.42, e + 0.42 + sw]]) {
          const o = at(a0, outSide, t / 2 + 0.07); o.y = sill - 0.05;
          const U = u.clone().multiplyScalar(a1 - a0), H = head - sill + 0.15;
          bat.box('shutter', o, U, V(0, H, 0), n.clone().multiplyScalar(outSide * 0.09));
          for (const [f0, f1] of [[0.06, 0.47], [0.53, 0.94]]) {
            const p2 = o.clone().addScaledVector(u, (a1 - a0) * 0.14).addScaledVector(n, outSide * 0.09); p2.y = o.y + H * f0;
            bat.box('col:#1c382f', p2, u.clone().multiplyScalar((a1 - a0) * 0.72), V(0, H * (f1 - f0), 0), n.clone().multiplyScalar(outSide * 0.03));
          }
        }
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
      case 'k':
        hang(s + ft, e - ft, 's', 1, head - ft - 0.02, 'panel6', oo.color || CHERRY, 80, null, false);
        break;
      case 'e': { // entry: 6-panel cherry door with sidelights (lace-curtained glass over a panel)
        const sl = 1.2;
        for (const [a0, a1] of [[s + ft, s + ft + sl], [e - ft - sl, e - ft]]) {
          fbox(a0, a1, sill, sill + 2.4, 'cherry', 0.15, true);
          fbox(a0 + 0.12, a1 - 0.12, sill + 2.6, head - ft - 0.12, 'frosted', 0.05, true);
          fbox(a0, a1, sill + 2.4, sill + 2.6, 'cherry', 0.16);
          fbox(a0, a1, head - ft - 0.12, head - ft, 'cherry', 0.16);
        }
        fbox(s + ft + sl, s + ft + sl + 0.2, sill, head); fbox(e - ft - sl - 0.2, e - ft - sl, sill, head);
        hang(s + ft + sl + 0.2, e - ft - sl - 0.2, hingeEnd, swingSide, head - ft - 0.02, 'panel6', CHERRY, 85, null, false);
        break;
      }
      case 'f': { // French door(s): oak, 15 lites
        const pid = L.id + ':f:' + s.toFixed(1);
        if (oo.pair) {
          const mid = (s + e) / 2;
          hang(s + ft, mid, 's', swingSide, head - ft - 0.02, 'french', 'trim', 88, pid, true);
          hang(mid, e - ft, 'e', swingSide, head - ft - 0.02, 'french', 'trim', 88, pid, true);
        } else hang(s + ft, e - ft, hingeEnd, swingSide, head - ft - 0.02, 'french', 'trim', 85, null, true);
        break;
      }
      case 's': { // sliding patio door: fixed panel + operable panel slid open behind it
        // the panel at the wall's start end (for the sun room: the one nearer the family room)
        // slides open behind the fixed panel
        const mid = (s + e) / 2;
        const kInside = kp.outside ? -1 : 1;
        slidePanel(sashKit(mid - 0.05, -0.08 * kInside), e - ft - (mid - 0.05), sill + ft, head - ft, true);
        const pw = mid + 0.05 - (s + ft);
        slider(s + ft, pw, 0.08 * kInside, pw - 0.35, sill, head, (k) => slidePanel(k, pw, sill + ft, head - ft, false));
        break;
      }
      case 'c': { // bypass closet doors, 6-panel cherry
        // the room-side panel slides over the closet-side one
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
      const h = h1 - h0;
      k.box('trim', 0, h0, -0.07, 0.25, h1, 0.07); k.box('trim', w - 0.25, h0, -0.07, w, h1, 0.07);
      k.box('trim', 0, h0, -0.07, w, h0 + 0.35, 0.07); k.box('trim', 0, h1 - 0.25, -0.07, w, h1, 0.07);
      k.box('glass', 0.25, h0 + 0.35, -0.02, w - 0.25, h1 - 0.25, 0.02);
      grid(k, 0.25, w - 0.25, h0 + 0.35, h1 - 0.25, 3, 5, 'trim', 0.05);
      grid(k, 0.25, w - 0.25, h0 + 0.35, h1 - 0.25, 3, 5, 'white', -0.05);
      k.box('brass', w - 0.4, h0 + 3.0, 0.07, w - 0.3, h0 + 3.8, 0.14);
      if (fixed) k.solid(0, -0.07, w, 0.07, h0, h1);
    }
    // a panel that slides along the wall by `slideBy` when opened
    function slider(startS, w, offN, slideBy, y0, y1, buildFn) {
      const db = new Batcher();
      buildFn(new Kit(db, TAG).at(0, 0, 0, 0));
      const pivot = new THREE.Group();
      db.build(pivot);
      const base = at(startS, 1, offN);
      pivot.rotation.y = Math.atan2(-u.z, u.x);
      const solid = { cx: 0, cz: 0, ux: u.x, uz: u.z, hl: w / 2, ht: 0.08, y0, y1, tag: TAG };
      PHYS.solids.push(solid);
      const d = { kind: 'slide', level: L.id, rs: RS, pivot, t: 0, target: 0, solid };
      d.apply = () => {
        const off = slideBy * d.t;
        pivot.position.set(base.x + u.x * off, 0, base.z + u.z * off);
        solid.cx = pivot.position.x + u.x * w / 2; solid.cz = pivot.position.z + u.z * w / 2;
      };
      registerDoor(d, pivot);
    }
  }

  // a Kit whose local x runs along the wall from distance s0, z across the wall (offset off)
  function sashKit(s0, off = 0) {
    const p = at(s0, 1, off);
    const rot = (Math.atan2(-u.z, u.x) * 180) / Math.PI;
    return new Kit(bat, TAG).at(p.x, p.z, 0, rot);
  }

  function windowSashes(op, a0, a1, h0, h1, outSide) {
    const style = op.oo.g || L.grille || 'dh';
    const k = sashKit(a0, 0);
    const w = a1 - a0, h = h1 - h0;
    const glassAndGrid = (x0, x1, y0, y1, cols, rows, zoff = 0) => {
      k.box('glass', x0, y0, zoff - 0.02, x1, y1, zoff + 0.02);
      addSolid(k.P(x0, 0, zoff - 0.03), k.ex().multiplyScalar(x1 - x0), k.ez().multiplyScalar(0.06), y0, y1, TAG);
      if (style !== 'gb') {
        // muntins: wood on the inside, white on the outside
        grid(k, x0, x1, y0, y1, cols, rows, outSide >= 0 ? 'trim' : 'white', zoff - 0.05);
        grid(k, x0, x1, y0, y1, cols, rows, outSide >= 0 ? 'white' : 'trim', zoff + 0.05);
      } else grid(k, x0, x1, y0, y1, 4, 2, 'white', zoff);
    };
    // sash frames: stained wood inside, white vinyl-clad outside (local +z is the wall's +n side)
    const inKey = 'trim', outKey = 'white';
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
    const cols = op.oo.cols || 2, rows = op.oo.rows || 3;
    const dh = (x0, x1) => {
      const mid = h0 + h / 2;
      const lo = sashFrame(x0, x1, h0, mid + 0.06, 0.06), hi = sashFrame(x0, x1, mid - 0.06, h1, -0.06);
      glassAndGrid(lo[0], lo[1], lo[2], lo[3], cols, rows, 0.06);
      glassAndGrid(hi[0], hi[1], hi[2], hi[3], cols, rows, -0.06);
    };
    const cs = (x0, x1) => { const f = sashFrame(x0, x1, h0, h1); glassAndGrid(f[0], f[1], f[2], f[3], cols, rows); };
    if (style === 'dh') dh(0, w);
    else if (style === 'dh2') { dh(0, w / 2 - 0.08); rail(w / 2 - 0.08, w / 2 + 0.08, h0, h1); dh(w / 2 + 0.08, w); }
    else if (style === 'cs') cs(0, w);
    else if (style === 'cs2') { cs(0, w / 2); cs(w / 2, w); }
    else { glassAndGrid(0, w, h0, h1, 4, 2); }
  }

  // door leaf hinged at one end of [a0,a1], swung `ang` degrees toward `side`
  function hang(a0, a1, hingeEnd, side, h, style, color, ang, pair, startOpen) {
    const w = a1 - a0;
    const hingeS = hingeEnd === 's' ? a0 : a1;
    const p = at(hingeS, side, t / 2 - 0.08);
    const dirClosed = u.clone().multiplyScalar(hingeEnd === 's' ? 1 : -1);
    const r = (ang * Math.PI) / 180;
    const ld = dirClosed.clone().multiplyScalar(Math.cos(r)).addScaledVector(n, side * Math.sin(r));
    const db = new Batcher();
    leaf(new Kit(db, TAG).at(0, 0, 0, 0), w, h - L.floor, L.floor, style, color); // h arrives as an absolute head height
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
    const key = color === 'door' || color === 'trim' ? color : 'wood:' + color, th = 0.15;
    if (style === 'panel6') {
      sixPanel(k, w, h, y0, key, 0);
    } else if (style === 'french' || style === 'full' || style === 'half') {
      const st = style === 'french' ? 0.32 : 0.38;
      k.box(key, 0, y0, -th / 2, st, y0 + h, th / 2); k.box(key, w - st, y0, -th / 2, w, y0 + h, th / 2);
      k.box(key, st, y0 + h - st, -th / 2, w - st, y0 + h, th / 2);
      const gTop = y0 + h - st, gBot = style === 'half' ? y0 + h * 0.5 : y0 + 0.75;
      k.box(key, st, y0, -th / 2, w - st, gBot, th / 2);
      if (style === 'half') for (const s of [-1, 1]) { k.box(key.startsWith('wood:') ? tone(key, -0.04) : key, st + 0.15, y0 + 0.35, s * th / 2, w / 2 - 0.08, gBot - 0.25, s * (th / 2 + 0.03)); k.box(key.startsWith('wood:') ? tone(key, -0.04) : key, w / 2 + 0.08, y0 + 0.35, s * th / 2, w - st - 0.15, gBot - 0.25, s * (th / 2 + 0.03)); }
      k.box('glass', st, gBot, -0.02, w - st, gTop, 0.02);
      grid(k, st, w - st, gBot, gTop, 3, style === 'half' ? 3 : 5, key, 0, 0.07);
    }
    // lever handles both sides
    for (const s of [-1, 1]) {
      k.box('brass', w - 0.32, y0 + 3.0, s * (th / 2), w - 0.22, y0 + 3.1, s * (th / 2 + 0.12));
      k.box('brass', w - 0.6, y0 + 3.0, s * (th / 2 + 0.1), w - 0.22, y0 + 3.08, s * (th / 2 + 0.14));
    }
  }
  function sixPanel(k, w, h, y0, key, zoff) {
    const th = 0.15;
    k.box(key, 0, y0, zoff - th / 2, w, y0 + h, zoff + th / 2);
    const pk = key === 'door' ? 'doorPanel' : key === 'cherry' ? 'cherryPanel' : tone(key, 0.07);
    const rows = [[0.06, 0.4], [0.45, 0.76], [0.8, 0.95]];
    for (const [r0, r1] of rows) for (const [c0, c1] of [[0.12, 0.47], [0.53, 0.88]]) {
      for (const s of [-1, 1]) {
        k.box(key === 'door' ? 'doorLine' : key === 'cherry' ? 'black' : tone(pk, -0.12), w * c0, y0 + h * r0, zoff + s * th / 2, w * c1, y0 + h * r1, zoff + s * (th / 2 + 0.02));
        k.box(pk, w * c0 + 0.06, y0 + h * r0 + 0.06, zoff + s * th / 2, w * c1 - 0.06, y0 + h * r1 - 0.06, zoff + s * (th / 2 + 0.045));
      }
    }
  }
  function garageDoor(a0, a1, h0, h1, outSide) {
    const k = sashKit(a0, -outSide * 0.05);
    const w = a1 - a0, h = h1 - h0;
    k.box('white', 0, h0, -0.08, w, h1, 0.08);
    k.solid(0, -0.1, w, 0.1, h0, h1);
    const rows = 4, cols = Math.max(2, Math.round(w / 2.2));
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x0 = (w / cols) * c + 0.2, x1 = (w / cols) * (c + 1) - 0.2, y0 = h0 + (h / rows) * r + 0.25, y1 = h0 + (h / rows) * (r + 1) - 0.25;
      k.box('col:#e9e9e4', x0, y0, outSide * 0.08, x1, y1, outSide * 0.12);
    }
    for (let r = 1; r < rows; r++) k.box('col:#cfcfc8', 0, h0 + (h / rows) * r - 0.02, outSide * 0.08, w, h0 + (h / rows) * r + 0.02, outSide * 0.1);
  }
}

// muntin grid on a Kit in its x/y plane at depth z
function grid(k, x0, x1, y0, y1, cols, rows, key, z, d = 0.04) {
  for (let i = 1; i < cols; i++) { const x = x0 + ((x1 - x0) * i) / cols; k.box(key, x - 0.03, y0, z - d / 2, x + 0.03, y1, z + d / 2); }
  for (let j = 1; j < rows; j++) { const y = y0 + ((y1 - y0) * j) / rows; k.box(key, x0, y - 0.03, z - d / 2, x1, y + 0.03, z + d / 2); }
}

// ------------------------------------------------------------------ slabs & floors
function buildFloors(L, bats) {
  const bat = bats[L.id];
  for (const r of L._rooms) {
    const holes = L._holes.filter((h) => pip(r.pts, h[0][0], h[0][1]) || pip(r.pts, h[1][0], h[1][1]));
    bat.poly(r.floorKey, r.pts, r.y + 0.012, holes);
  }
  if (L.id === 'b') {
    for (const f of L._foot) { bat.prism({ top: 'floor:concrete', side: 'foundation' }, f, L.floor - 0.4, L.floor); addFloorPoly(f, [], L.floor, 'b'); }
    // rec room drop ceiling (hidden in basement cutaway: lives with the 1st floor)
    const rec = L._rooms[0];
    bats.f1.poly('droptile', rec.pts, L.floor + L.ceiling, [], true);
  }
  if (L.id === 'f1') {
    const slab = L.slab.map(([x, y]) => P(L, x, y));
    bat.prism({ top: 'subfloor', bottom: 'joist', side: 'joist' }, slab, -1, 0, L._holes);
    addFloorPoly(slab, L._holes, 0, 'f1');
    const gar = L.garage.map(([x, y]) => P(L, x, y));
    bat.prism({ top: 'floor:concrete', side: 'foundation' }, gar, -1, -0.5);
    addFloorPoly(gar, [], -0.5, 'f1');
    L.ceilings.forEach((c, i) => (i === 0 ? renoBat('off:addition', 'f2') : bats.f2).poly('ceiling', c.map(([x, y]) => P(L, x, y)), 8, [], true));
  }
  if (L.id === 'f2') {
    const f = L._foot[0];
    bat.prism({ top: 'subfloor', bottom: 'ceiling', side: 'white' }, f, 8, 9, L._holes);
    addFloorPoly(f, L._holes, 9, 'f2');
    bats.roof.poly('ceiling', f, 17, [], true);
  }
}

// ------------------------------------------------------------------ stairs & railings
function buildStairs(bats) {
  const L = LV.f1, Pp = (x, y) => P(L, x, y);
  const { main, basement } = STAIRS;
  const r = 9 / 14;
  const tread = (bat, keys, x0, z0, x1, z1, top, bottom, tag, solid) => {
    bat.aabox(keys, Math.min(x0, x1), bottom, Math.min(z0, z1), Math.max(x0, x1), top, Math.max(z0, z1));
    // bullnose: oak nosing strip proud of the riser
    addFloorRect(Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1), top, tag);
    if (solid) addSolid(V(Math.min(x0, x1), 0, Math.min(z0, z1)), V(Math.abs(x1 - x0), 0, 0), V(0, 0, Math.abs(z1 - z0)), bottom, top, tag);
  };
  // lower run (width along x): oak open stringer on the sides, carpeted treads & risers
  const kLow = { nu: 'trim', pu: 'trim', def: 'stairCarpet' };
  const d = (main.lowerY[0] - main.lowerY[1]) / 6;
  for (let i = 1; i <= 6; i++) {
    const [ax, az] = Pp(main.lowerX[0], main.lowerY[0] - (i - 1) * d);
    const [bx, bz] = Pp(main.lowerX[1], main.lowerY[0] - i * d);
    tread(bats.f1, kLow, ax, az, bx, bz, i * r, 0, 'f1');
  }
  const [l0x, l0z] = Pp(main.landing[0], main.landing[1]), [l1x, l1z] = Pp(main.landing[2], main.landing[3]);
  tread(bats.f1, kLow, l0x, l0z, l1x, l1z, 7 * r, 7 * r - 0.7, 'f1', true);
  // upper run (width along z)
  const kUp = { nw: 'trim', pw: 'trim', def: 'stairCarpet' };
  const e = (main.upperX[1] - main.upperX[0]) / 6;
  for (let j = 1; j <= 6; j++) {
    const [ax, az] = Pp(main.upperX[0] + (j - 1) * e, main.upperY[0]);
    const [bx, bz] = Pp(main.upperX[0] + j * e, main.upperY[1]);
    tread(bats.f1, kUp, ax, az, bx, bz, (7 + j) * r, (7 + j) * r - 0.7, 'f1', true);
  }
  // skirt board along the wall side of the lower run
  const [sx] = Pp(main.lowerX[0], 0), [, sz0] = Pp(0, main.lowerY[0]), [, sz1] = Pp(0, main.lowerY[1]);
  bats.f1.box('trim', V(sx + 0.02, 0, sz0), V(0, 7 * r, sz1 - sz0), V(0, 0.9, 0), V(0.06, 0, 0));
  // wall under the open side of the upper run: rises with the stair, so the space under the
  // treads (and the basement stair behind it) is closed off from the foyer
  {
    const [wx0, wz] = Pp(1210, 784), [wx1] = Pp(1313, 784);
    const zA = wz - 0.175, zB = wz + 0.175, top0 = 7 * r, top1 = 9;
    const wk = LV.f1._rooms.find((q) => q.name === 'Foyer').wall;
    bats.f1.face(wk, [V(wx0, 0, zB), V(wx1, 0, zB), V(wx1, top1, zB), V(wx0, top0, zB)], V(0, 0, 1));
    bats.f1.face(wk, [V(wx0, 0, zA), V(wx1, 0, zA), V(wx1, top1, zA), V(wx0, top0, zA)], V(0, 0, -1));
    bats.f1.face(wk, [V(wx0, 0, zA), V(wx0, 0, zB), V(wx0, top0, zB), V(wx0, top0, zA)], V(-1, 0, 0));
    bats.f1.face('trim', [V(wx0, top0, zA), V(wx1, top1, zA), V(wx1, top1, zB), V(wx0, top0, zB)], V(0, 1, 0));
    bats.f1.aabox('trim', wx0, 0, zB, wx1, 0.38, zB + 0.05);                                   // baseboard
    bats.f1.box('trim', V(wx0, top0 - 0.75, zB), V(wx1 - wx0, top1 - top0, 0), V(0, 0.75, 0), V(0, 0, 0.06)); // skirt board
    addSolid(V(wx0, 0, zA), V(wx1 - wx0, 0, 0), V(0, 0, zB - zA), 0, 9, 'f1');
  }
  // basement stair: carpeted, 13 risers from -9 up to 0
  const rb = 9 / 13, eb = (1300 - basement.x[0]) / 12;
  for (let k = 1; k <= 12; k++) {
    const [ax, az] = Pp(basement.x[0] + (k - 1) * eb, basement.y[0]);
    const [bx, bz] = Pp(basement.x[0] + k * eb, basement.y[1]);
    tread(bats.b, { def: 'carpet:#d0bc9f', nw: 'trim', pw: 'trim' }, ax, az, bx, bz, -9 + k * rb, -9, 'b');
  }
  const [hx0, hz0] = Pp(basement.x[0], basement.y[0] + 3), [hx1, hz1] = Pp(1300, basement.y[0] + 3);
  railing(bats.b, [hx0, hz0 + 0.2], [hx1, hz1 + 0.2], -9 + rb, 0, 'trim', 'b', 'hand');
}

// style: 'turned' (oak, lathe balusters), 'square' (white porch), 'hand' (wall handrail only)
export function railing(bat, a, b, h0, h1, key = 'trim', tag = 'f1', style = 'turned') {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
  if (len < 0.01) return;
  const n = V(-dz / len, 0, dx / len);
  const H = 2.9;
  bat.box(key, V(a[0], h0 + H, a[1]).addScaledVector(n, -0.12), V(dx, h1 - h0, dz), V(0, 0.2, 0), n.clone().multiplyScalar(0.24));
  if (style === 'hand') return;
  if (style === 'square') bat.box(key, V(a[0], h0 + 0.3, a[1]).addScaledVector(n, -0.08), V(dx, h1 - h0, dz), V(0, 0.15, 0), n.clone().multiplyScalar(0.16));
  const cnt = Math.max(2, Math.round(len / 0.4));
  for (let i = 1; i < cnt; i++) {
    const f = i / cnt, x = a[0] + dx * f, z = a[1] + dz * f, h = h0 + (h1 - h0) * f;
    if (style === 'square') bat.aabox(key, x - 0.06, h + 0.3, z - 0.06, x + 0.06, h + H, z + 0.06);
    else (BALUSTERS[tag] = BALUSTERS[tag] || []).push([x, h, z]);
  }
  for (const [x, z, h] of [[a[0], a[1], h0], [b[0], b[1], h1]]) {
    bat.aabox(key, x - 0.2, h, z - 0.2, x + 0.2, h + H + 0.35, z + 0.2);
    bat.aabox(key, x - 0.25, h + H + 0.35, z - 0.25, x + 0.25, h + H + 0.45, z + 0.25);
    if (style === 'turned') { const kk = new Kit(bat, tag).at(x, z, h); kk.cyl(key, 0, 0, 0.14, 0.18, H + 0.45, H + 0.6, 10); kk.cyl(key, 0, 0, 0.18, 0.02, H + 0.6, H + 0.85, 10); }
  }
  const u = V(dx / len, 0, dz / len);
  addSolid(V(a[0], 0, a[1]).addScaledVector(n, -0.15), u.clone().multiplyScalar(len), n.clone().multiplyScalar(0.3), Math.min(h0, h1), Math.max(h0, h1) + H, tag);
}

function buildRailings(bats) {
  for (const r of RAILINGS) {
    if (Array.isArray(r)) {
      const [x0, y0, x1, y1, h0, h1, reno] = r;
      if (reno) railing(renoBat('off:' + reno, 'f1'), toFt([x0, y0]), toFt([x1, y1]), h0, h1, 'trim', 'off:' + reno);
      else railing(bats.f1, toFt([x0, y0]), toFt([x1, y1]), h0, h1);
    } else {
      const pts = r.f2.map(([x, y]) => toFt(F2(x, y)));
      for (let i = 0; i < pts.length - 1; i++) railing(bats.f2, pts[i], pts[i + 1], 9, 9, 'trim', 'f2');
    }
  }
}

// ------------------------------------------------------------------ roofs
export const ROOFT = 0.55; // visual roof thickness (shingle surface vs. soffit/ceiling)

function slope(bat, pts, eaveDir, eavePt, p) {
  const k = Math.sqrt(1 + p * p);
  const perp = V(-eaveDir.z, 0, eaveDir.x);
  const uv = pts.map((q) => [q.dot(eaveDir), Math.abs(q.clone().sub(eavePt).dot(perp)) * k]);
  bat.face('shingle', pts, V(0, 1, 0), uv);
  const under = pts.map((q) => q.clone().add(V(0, -ROOFT, 0)));
  bat.face('soffit', under, V(0, -1, 0));
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const c = pts.reduce((s, q) => s.add(q), V(0, 0, 0)).multiplyScalar(1 / pts.length);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const out = mid.clone().sub(c).setY(0).normalize();
    const lowest = Math.abs(a.y - b.y) < 0.01 && a.y <= Math.min(...pts.map((q) => q.y)) + 0.01;
    if (lowest) {
      bat.face('white', [a, b, b.clone().add(V(0, -ROOFT, 0)), a.clone().add(V(0, -ROOFT, 0))], out);
      // gutter
      const g = out.clone().multiplyScalar(0.25);
      bat.face('white', [a.clone().add(g).add(V(0, -0.1, 0)), b.clone().add(g).add(V(0, -0.1, 0)), b.clone().add(g).add(V(0, -0.55, 0)), a.clone().add(g).add(V(0, -0.55, 0))], out);
    } else if (Math.abs(a.y - b.y) < 0.01 && a.y >= Math.max(...pts.map((q) => q.y)) - 0.01) {
      // ridge cap
      bat.face('col:#43474c', [a.clone().add(V(0, 0.08, 0)), b.clone().add(V(0, 0.08, 0)), b.clone().add(out.clone().multiplyScalar(-0.5)), a.clone().add(out.clone().multiplyScalar(-0.5))], V(0, 1, 0));
    }
  }
}
export function gableTri(bat, pts) {
  const n = new THREE.Vector3().subVectors(pts[1], pts[0]).cross(new THREE.Vector3().subVectors(pts[2], pts[0])).normalize();
  bat.face('siding', pts, n);
  bat.face('siding', pts, n.clone().negate());
}

function hipRoof(bat, { x0, x1, z0, z1, y, p, o }) {
  const X0 = x0 - o, X1 = x1 + o, Z0 = z0 - o, Z1 = z1 + o, ye = y - o * p;
  const hd = (z1 - z0) / 2, zc = (z0 + z1) / 2, yr = y + hd * p;
  const R1 = V(x0 + hd, yr, zc), R2 = V(x1 - hd, yr, zc);
  const A = V(X0, ye, Z0), B = V(X1, ye, Z0), C = V(X1, ye, Z1), D = V(X0, ye, Z1);
  const ex = V(1, 0, 0), ez = V(0, 0, 1);
  slope(bat, [A, B, R2, R1], ex, A, p);
  slope(bat, [C, D, R1, R2], ex, C, p);
  slope(bat, [D, A, R1], ez, D, p);
  slope(bat, [B, C, R2], ez, B, p);
  return yr;
}

// ridge runs along z. rake: overhang at z0/z1; gable: build triangles; xLimE: east slope stops at this x
export function gableRoof(bat, { x0, x1, z0, z1, y, p, o, rake = [o, o], gable = [true, true], xLimE, base = y }) {
  const xc = (x0 + x1) / 2, yr = y + ((x1 - x0) / 2) * p, ye = y - o * p;
  const Z0 = z0 - rake[0], Z1 = z1 + rake[1];
  const ez = V(0, 0, 1);
  slope(bat, [V(x0 - o, ye, Z0), V(x0 - o, ye, Z1), V(xc, yr, Z1), V(xc, yr, Z0)], ez, V(x0 - o, ye, Z0), p);
  let east = [V(x1 + o, ye, Z0), V(x1 + o, ye, Z1)];
  if (xLimE !== undefined) { const yl = yr - (xLimE - xc) * p; east = [V(xLimE, yl, Z0), V(xLimE, yl, Z1)]; }
  slope(bat, [east[0], east[1], V(xc, yr, Z1), V(xc, yr, Z0)], ez, east[0], p);
  [z0, z1].forEach((z, i) => {
    if (!gable[i]) return;
    if (xLimE !== undefined) {
      const yl = yr - (xLimE - xc) * p;
      gableTri(bat, [V(x0, y, z), V(xLimE, y, z), V(xLimE, yl, z), V(xc, yr, z)]);
    } else if (base < y) gableTri(bat, [V(x0, base, z), V(x1, base, z), V(x1, y, z), V(xc, yr, z), V(x0, y, z)]);
    else gableTri(bat, [V(x0, y, z), V(x1, y, z), V(xc, yr, z)]);
    // gable vent
    const k = new Kit(bat, 'roof').at(xc, z + (i ? 0.03 : -0.03), 0, i ? 0 : 180);
    k.box('white', -0.9, yr - 3.2, 0, 0.9, yr - 1.6, 0.08);
    for (let j = 0; j < 5; j++) k.box('col:#d8d8d2', -0.75, yr - 3.05 + j * 0.28, 0.08, 0.75, yr - 2.95 + j * 0.28, 0.12);
  });
  return yr;
}

// single slope from a wall (zWall) down to an eave (zEave), optional hipped ends
export function leanRoof(bat, { x0, x1, zWall, zEave, y, p, o, hip0 = true, hip1 = true }) {
  const dir = Math.sign(zEave - zWall), depth = Math.abs(zEave - zWall);
  const Ze = zEave + dir * o, ye = y - o * p, yt = y + depth * p;
  const Xa = x0 - (hip0 ? o : 0), Xb = x1 + (hip1 ? o : 0);
  const T0 = V(x0 + (hip0 ? depth : 0), yt, zWall), T1 = V(x1 - (hip1 ? depth : 0), yt, zWall);
  const E0 = V(Xa, ye, Ze), E1 = V(Xb, ye, Ze);
  slope(bat, [E0, E1, T1, T0], V(1, 0, 0), E0, p);
  if (hip0) slope(bat, [E0, T0, V(Xa, ye, zWall)], V(0, 0, 1), E0, p);
  if (hip1) slope(bat, [E1, V(Xb, ye, zWall), T1], V(0, 0, 1), E1, p);
  return yt;
}

function buildRoofs(bats) {
  const bat = bats.roof;
  const f = (x, y) => toFt([x, y]);
  const g2 = (x, y) => toFt(F2(x, y));
  const [mx0, mz0] = g2(270, 111.5), [mx1, mz1] = g2(1729, 1105);
  const RY = 17 + ROOFT; // roof surface at the wall line; its underside meets the 17 ft ceiling
  hipRoof(bat, { x0: mx0, x1: mx1, z0: mz0, z1: mz1, y: RY, p: 7 / 12, o: 1.2 });
  const [fx0] = g2(830, 0), [fx1, fz1] = g2(1303, 1178);
  gableRoof(bat, { x0: fx0, x1: fx1, z0: 28, z1: mz1, y: RY, p: 1, o: 0, rake: [0, 0], gable: [false, false] });
  gableRoof(bat, { x0: fx0, x1: fx1, z0: mz1, z1: fz1, y: RY, p: 1, o: 1.0, rake: [0, 1.0], gable: [false, true], base: 17 });
  const [rx0, rz0] = g2(375, 52.5), [rx1] = g2(682, 52.5);
  gableRoof(bat, { x0: rx0, x1: rx1, z0: mz0, z1: 22, y: RY, p: 1, o: 0, rake: [0, 0], gable: [false, false] });
  gableRoof(bat, { x0: rx0, x1: rx1, z0: rz0, z1: mz0, y: RY, p: 1, o: 1.0, rake: [1.0, 0], gable: [true, false], base: 17 });
  const [gx0] = f(255, 0), [gx1] = f(847, 0), [, gzBack] = f(0, 392.5), [, gzFront] = f(0, 1181.5);
  gableRoof(bat, { x0: gx0, x1: gx1, z0: gzBack, z1: mz1, y: 9, p: 8 / 12, o: 1.0, rake: [0, 0], gable: [false, false], xLimE: mx0 });
  // its rear gable end + rake: replaced by the rear addition
  gableRoof(renoBat('off:addition', 'roof'), { x0: gx0, x1: gx1, z0: gzBack, z1: gzBack + 0.01, y: 9, p: 8 / 12, o: 1.0, rake: [1.0, 0], gable: [true, false], xLimE: mx0 });
  gableRoof(bat, { x0: gx0, x1: gx1, z0: mz1, z1: gzFront, y: 9, p: 8 / 12, o: 1.0, rake: [0, 1.0], gable: [false, true] });
  const [sx0, sz0] = f(1420.5, 49.5), [sx1] = f(1703.5, 0);
  const sp = 10 / 12;
  const offA = renoBat('off:addition', 'roof'), offA1 = renoBat('off:addition', 'f1');
  gableRoof(offA, { x0: sx0, x1: sx1, z0: sz0, z1: mz0, y: 9, p: sp, o: 1.0, rake: [1.0, 0], gable: [false, false] });
  for (const [za, zb] of [[3.3, 5.6], [7.6, 9.9]]) {
    const xa = sx0 + 1.2, xb = sx0 + 3.6, ya = 9 + (xa - sx0) * sp + 0.06, yb = 9 + (xb - sx0) * sp + 0.06;
    offA.face('skylight', [V(xa, ya, za), V(xb, yb, za), V(xb, yb, zb), V(xa, ya, zb)], V(-0.6, 1, 0));
    // skylight shaft visible from inside the vaulted ceiling
    offA1.face('white', [V(xa, ya - ROOFT - 0.02, za), V(xb, yb - ROOFT - 0.02, za), V(xb, yb - ROOFT - 0.02, zb), V(xa, ya - ROOFT - 0.02, zb)], V(0.6, -1, 0));
  }
  const [nx0, nz0] = f(1054, 250), [nx1] = f(1420.5, 0);
  leanRoof(offA, { x0: nx0, x1: nx1, zWall: mz0, zEave: nz0, y: 9, p: 6 / 12, o: 1.0, hip0: true, hip1: false });
  // infill between the sun room's vaulted ceiling and the family room's flat ceiling (above the 8 ft wall)
  {
    const z = toFt([0, 310.5])[1], xc = (sx0 + sx1) / 2, top = (x) => 9 + (Math.min(x, 2 * xc - x) - sx0) * sp - ROOFT - 0.02;
    const key = LV.f1._rooms.find((q) => q.name === 'Sun Room').wall;
    const pts = [V(sx0, 8, z), V(sx1, 8, z), V(sx1, top(sx1), z), V(xc, top(xc), z), V(sx0, top(sx0), z)];
    bats.f1.face(key, pts, V(0, 0, -1)); bats.f1.face(key, pts, V(0, 0, 1));
  }
  const [px0, pzW] = f(847, 1028.5), [px3] = f(1709, 0), pzE = pzW + 7.5;
  const pp = 3.5 / 12;
  leanRoof(bat, { x0: px0, x1: fx0, zWall: pzW, zEave: pzE, y: 9, p: pp, o: 0.8, hip0: true, hip1: false });
  leanRoof(bat, { x0: fx0, x1: fx1, zWall: fz1, zEave: pzE, y: 9, p: pp, o: 0.8, hip0: false, hip1: false });
  leanRoof(bat, { x0: fx1, x1: px3, zWall: pzW, zEave: pzE, y: 9, p: pp, o: 0.8, hip0: false, hip1: true });
  bat.poly('soffit', [[px0, pzW], [px3, pzW], [px3, pzE], [px0, pzE]], 8.75, [], true);
  bat.aabox('white', px0, 8.1, pzE - 0.45, px3, 9.0, pzE + 0.05);
  // spindle frieze under the porch beam (as in the front photo)
  for (let x = px0 + 0.6; x < px3 - 0.4; x += 0.45) bat.aabox('white', x - 0.04, 7.75, pzE - 0.25, x + 0.04, 8.1, pzE - 0.17);
  bat.aabox('white', px0, 7.68, pzE - 0.3, px3, 7.76, pzE - 0.12);
  // chimney
  const [cx0, cz0] = f(1703.5, 387), [cx1, cz1] = f(1745, 538);
  bat.aabox({ def: 'siding', pv: 'cut' }, cx0, 9, cz0 + 0.3, cx1 + 0.1, 27.5, cz1 - 0.3);
  bat.aabox('white', cx0 - 0.15, 27.2, cz0 + 0.15, cx1 + 0.25, 27.6, cz1 - 0.15);
  bat.aabox('col:#3a3a3a', cx0 + 0.4, 27.6, cz0 + 1.2, cx1 - 0.2, 28.3, cz1 - 1.2);
  bats.f1.aabox({ def: 'siding', pv: 'cut' }, cx0, -0.9, cz0, cx1, 9, cz1);
  addSolid(V(cx0, 0, cz0), V(cx1 - cx0, 0, 0), V(0, 0, cz1 - cz0), -0.9, 9, 'f1');
  // plumbing vent & roof vents
  bat.aabox('col:#9a9a96', 40, 22.6, 20, 40.4, 24.2, 20.4);
  for (const [x, z] of [[33, 37], [50, 37]]) bat.aabox('col:#3a3d42', x, 22.2, z, x + 1.2, 22.6, z + 1.2);
}

// The sun room's west gable wall, with the arched window
export function buildSunroomGable(group, yPlan = 49.5, tag = 'f1') {
  const [x0, z] = toFt([1415, yPlan]), [x1] = toFt([1709, yPlan]);
  const xc = (x0 + x1) / 2, yr = 9 + ((x1 - x0) / 2) * (10 / 12);
  const [wx0] = toFt([1478, 0]), [wx1] = toFt([1676, 0]);
  const sill = 1.6, head = 7.6, r = (wx1 - wx0) / 4;
  const shape = new THREE.Shape();
  shape.moveTo(x0, -0.9); shape.lineTo(x1, -0.9); shape.lineTo(x1, 9); shape.lineTo(xc, yr); shape.lineTo(x0, 9); shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(wx0, sill); hole.lineTo(wx1, sill); hole.lineTo(wx1, head); hole.lineTo(xc + r, head);
  hole.absarc(xc, head, r, 0, Math.PI, false);
  hole.lineTo(wx0, head); hole.closePath();
  shape.holes.push(hole);
  const mk = (depth, mat, zoff) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 });
    const m = new THREE.Mesh(g, mat);
    m.position.z = z + zoff;
    m.castShadow = m.receiveShadow = true;
    m.userData.measurable = true;
    group.add(m);
  };
  mk(0.25, [matFor('siding'), matFor('siding')], -0.25);
  const sage = LV.f1._rooms.find((q) => q.name === 'Sun Room').wall;
  mk(0.25, [matFor(sage), matFor(sage)], 0);
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(wx1 - wx0, head - sill), matFor('glass'));
  gl.position.set(xc, (sill + head) / 2, z); group.add(gl);
  const arc = new THREE.Mesh(new THREE.CircleGeometry(r, 24, 0, Math.PI), matFor('glass'));
  arc.position.set(xc, head, z); group.add(arc);
  const bat = new Batcher();
  const k = new Kit(bat, tag).at(0, z, 0, 0);
  // four casements, each 2 x 5 lites, oak inside / white outside, plus oak casing & sunburst
  for (let i = 0; i < 4; i++) {
    const a = wx0 + ((wx1 - wx0) * i) / 4, b = wx0 + ((wx1 - wx0) * (i + 1)) / 4;
    k.box('trim', a, sill, -0.1, a + 0.12, head, 0.1); k.box('trim', b - 0.12, sill, -0.1, b, head, 0.1);
    k.box('trim', a, sill, -0.1, b, sill + 0.15, 0.1); k.box('trim', a, head - 0.15, -0.1, b, head, 0.1);
    grid(k, a + 0.12, b - 0.12, sill + 0.15, head - 0.15, 2, 5, 'trim', 0.06);
    grid(k, a + 0.12, b - 0.12, sill + 0.15, head - 0.15, 2, 5, 'white', -0.06);
  }
  for (let i = 1; i < 4; i++) {
    const ang = (i / 4) * Math.PI, c = Math.cos(ang), s = Math.sin(ang);
    const a = V(xc, head, z), b = V(xc + c * r, head + s * r, z);
    bat.box('trim', a.clone().add(V(-0.04 * s, 0.04 * c, -0.06)), b.clone().sub(a), V(0.08 * s, -0.08 * c, 0), V(0, 0, 0.12));
  }
  for (let i = 0; i < 18; i++) { // arched casing
    const a0 = (i / 18) * Math.PI, a1 = ((i + 1) / 18) * Math.PI;
    const p0 = V(xc + Math.cos(a0) * r, head + Math.sin(a0) * r, z + 0.25), p1 = V(xc + Math.cos(a1) * r, head + Math.sin(a1) * r, z + 0.25);
    const q0 = V(xc + Math.cos(a0) * (r + 0.3), head + Math.sin(a0) * (r + 0.3), z + 0.25), q1 = V(xc + Math.cos(a1) * (r + 0.3), head + Math.sin(a1) * (r + 0.3), z + 0.25);
    bat.face('trim', [p0, p1, q1, q0], V(0, 0, 1));
  }
  k.box('trim', wx0 - 0.3, sill - 0.3, 0.25, wx0, head, 0.31); k.box('trim', wx1, sill - 0.3, 0.25, wx1 + 0.3, head, 0.31);
  k.box('trim', wx0 - 0.4, sill - 0.08, 0.25, wx1 + 0.4, sill, 0.45); k.box('trim', wx0, head, 0.25, xc - r, head + 0.3, 0.31); k.box('trim', xc + r, head, 0.25, wx1, head + 0.3, 0.31);
  k.box('trim', x0 + 0.3, 0, 0.25, x1 - 0.3, 0.38, 0.3);
  bat.build(group);
  addSolid(V(x0, 0, z - 0.25), V(x1 - x0, 0, 0), V(0, 0, 0.5), -0.9, 9, tag);
}

// ------------------------------------------------------------------ porch & exterior trim
function buildPorch(bats) {
  const bat = bats.f1;
  const [px0, pzW] = toFt([847, 1028.5]), [px3] = toFt([1709, 0]), pzE = pzW + 7.5;
  bat.aabox({ pv: 'paving', def: 'foundation' }, px0, -1, pzW, px3, -0.3, pzE);
  addFloorRect(px0, pzW, px3, pzE, -0.3, 'site');
  const [doorX] = toFt([1264, 0]);
  bat.aabox({ pv: 'paving', def: 'foundation' }, doorX - 2.6, -1, pzE, doorX + 2.6, -0.65, pzE + 1.1);
  addFloorRect(doorX - 2.6, pzE, doorX + 2.6, pzE + 1.1, -0.65, 'site');
  const posts = [px0 + 0.4, px0 + 7.8, doorX - 2.9, doorX + 2.9, doorX + 10.3, px3 - 0.4];
  for (const x of posts) {
    const k = new Kit(bat, 'f1').at(x, pzE - 0.2, -0.3);
    k.cbox('post', 0, 0, 0.42, 0.42, 0, 8.4);
    k.cbox('post', 0, 0, 0.6, 0.6, 0, 0.6);
    k.cbox('post', 0, 0, 0.56, 0.56, 7.7, 7.95);
    // scroll brackets
    for (const [dx, dz] of [[1, 0], [-1, 0]]) {
      const kb = new Kit(bat, 'f1').at(x, pzE - 0.2, -0.3, dx > 0 ? 90 : -90);
      kb.prof('post', [[0.21, 6.9], [0.21, 7.75], [1.0, 7.75]], -0.05, 0.05);
    }
    addSolid(V(x - 0.3, 0, pzE - 0.5), V(0.6, 0, 0), V(0, 0, 0.6), -0.3, 8.4, 'f1');
  }
  const rz = pzE - 0.2;
  for (let i = 0; i < posts.length - 1; i++) {
    if (i === 2) continue; // stair opening at the front door
    railing(bat, [posts[i] + 0.3, rz], [posts[i + 1] - 0.3, rz], -0.3, -0.3, 'railWhite', 'f1', 'square');
  }
  railing(bat, [px3 - 0.2, pzW + 0.4], [px3 - 0.2, pzE - 0.5], -0.3, -0.3, 'railWhite', 'f1', 'square');
}

// white vinyl corner posts at the outside corners of each story
function cornerBoards(L, bat, y0, y1) {
  for (const poly of L._foot) {
    let area = 0;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) area += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
    for (let i = 0; i < poly.length; i++) {
      const p0 = poly[(i - 1 + poly.length) % poly.length], p = poly[i], p1 = poly[(i + 1) % poly.length];
      const ax = p[0] - p0[0], az = p[1] - p0[1], bx = p1[0] - p[0], bz = p1[1] - p[1];
      const cross = ax * bz - az * bx;
      if (Math.sign(cross) !== Math.sign(area)) continue; // concave corner
      const axisAligned = (Math.abs(ax) < 0.05 || Math.abs(az) < 0.05) && (Math.abs(bx) < 0.05 || Math.abs(bz) < 0.05);
      if (!axisAligned) continue;
      bat.aabox('white', p[0] - 0.3, y0, p[1] - 0.3, p[0] + 0.3, y1, p[1] + 0.3);
    }
  }
}

// ------------------------------------------------------------------ labels
export function buildLabels(L, group, rooms = L._rooms) {
  const labels = [];
  for (const r of rooms) {
    if (r.noLabel) continue;
    const [cx, cz] = centroid(r.pts);
    const div = document.createElement('div');
    div.className = 'room-label';
    div.innerHTML = `<b>${r.name}</b><span>${r.dims}</span>`;
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
  const bats = { b: new Batcher(), f1: new Batcher(), f2: new Batcher(), roof: new Batcher(), bF: new Batcher(), f1F: new Batcher(), f2F: new Batcher(), bA: new Batcher(), bB: new Batcher() };
  for (const L of LEVELS) {
    for (const w of L.walls) buildWall(L, w, bats[L.id]);
    buildFloors(L, bats);
  }
  cornerBoards(LV.f1, bats.f1, -0.9, 9);
  cornerBoards(LV.f2, bats.f2, 9, 17);
  buildStairs(bats);
  buildRailings(bats);
  buildFixtures(bats);
  buildFurniture(bats);
  buildRoofs(bats);
  buildPorch(bats);
  buildSunroomGable(renoGroup('off:addition', 'f1'), 49.5, 'off:addition');
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
    (groups[tag] || renoGroup(tag, 'f1')).add(im);
  }
  bats.roof.build(groups.roof);
  for (const d of DOORS) (d.rs ? renoGroup(d.rs, d.level) : groups[d.level]).add(d.pivot);
  for (const [k, bat] of RENO_BATS) bat.build(RENO_GROUPS.get(k));
  const renos = [];
  for (const g of RENO_GROUPS.values()) { levelGroup(g.userData.level).add(g); renos.push(g); }
  // alternative basement layouts (A: gym at the east end, TV in the bay; B: gym in storage, media room east)
  const layouts = { A: new THREE.Group(), B: new THREE.Group() };
  bats.bA.build(layouts.A); bats.bB.build(layouts.B);
  layouts.B.visible = false;
  furn.b.add(layouts.A, layouts.B);
  Object.values(groups).forEach((g) => house.add(g));
  return { house, groups, furn, labels, levels: LV, layouts, renos };
}

export function roomAtPoint(id, x, z) {
  const L = LV[id];
  return L && L._rooms ? roomAt(L, x, z) : null;
}
