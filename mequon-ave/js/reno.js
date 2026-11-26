// Renovation options for the Mequon Ave house. Each adds geometry to a tagged set; the as-built parts it replaces
// carry the opposite tag (data.js walls, build.js deck, site.js old garage + drive + beds, furnish.js laundry).
// Tags may combine: 'a&b' = both, 'a|b' = either, 'not:a'. Tags used here:
//   gar:0 | gar:A | gar:B | gar:C   which garage: the existing one, or one of three new 3-car garages with a rec room above
//                                   (A east-facing at the end of the drive, B south-facing along the north line,
//                                   C a smaller south-facing one tucked in the rear corner). Each brings its own apron.
//   on:mud / off:mud                mudroom addition where the rear deck is (the deck goes; the laundry wall opens to it)
//   link:walk | link:bridge, brg    covered breezeway from the garage to the mudroom; 'brg' = an upper footbridge from the
//                                   rec room to the office's deck door as well (north-side garages only)
//   yard:A | yard:B | yard:C        yard plans: fire pit (Solo Stove + Adirondack chairs), play area, pergola, garden beds
//   on:front                        front yard: deeper planted beds, picket fence, paver walk, an ornamental tree
import * as THREE from 'three';
import { H, ROOFT, ENTRY, DECK, LOT } from './data.js';
import { Kit, V, addFloorPoly, addFloorRect, addSolid, swap, item } from './geom.js';
import { LV, CTX, renoBat, renoGroup, roleRoom, buildWall, buildLabels, railing, roofMass, gableFill, gablePeak, dentilBand } from './build.js';
import {
  sofa, armchair, coffeeTable, floorLamp, plant, rug, runKit, recessed, flushDome, bed, nightstand, wallTV, mediaConsole, diningTable,
  powerRack, liftBench, dumbbellRack, pelotonBike, rubberFloor, shelving, adirondack, patioChair, exteriorLantern, car, sideTable,
} from './furnish.js';
import { Plants, shrub, shadeTree, arborvitae, rounded, ribbon, DRIVE, GROUND_Y as G } from './site.js';

const fab = (c) => 'fab:' + c;
const wood = (c) => 'wood:' + c;
export const RENO_LABELS = [];
export const RENO_ROOMS = []; // { rs, level, room } for the walk-mode room readout
const RED = '#6e2a2a';

// ------------------------------------------------------------------ shaker cabinetry (remodel finishes: rcab*, rcounter, rsplash)
function shaker(k, x0, x1, y0, y1, z, frame = 'rcabDoor', panel = 'rcabPanel') {
  const m = Math.min(0.22, (x1 - x0) * 0.2, (y1 - y0) * 0.2);
  k.box(frame, x0, y0, z, x0 + m, y1, z + 0.07); k.box(frame, x1 - m, y0, z, x1, y1, z + 0.07);
  k.box(frame, x0 + m, y0, z, x1 - m, y0 + m, z + 0.07); k.box(frame, x0 + m, y1 - m, z, x1 - m, y1, z + 0.07);
  k.box(panel, x0 + m, y0 + m, z, x1 - m, y1 - m, z + 0.035);
}
const pull = (k, x, y, z, vertical = false) => (vertical ? k.box('black', x - 0.025, y - 0.35, z + 0.07, x + 0.025, y + 0.35, z + 0.13) : k.box('black', x - 0.3, y - 0.025, z + 0.07, x + 0.3, y + 0.025, z + 0.13));
function baseRun(k, x0, x1, o = {}) {
  const d = 1.95, cab = o.cab || 'rcab', fr = o.frame || 'rcabDoor', pn = o.panel || 'rcabPanel';
  k.box(cab, x0, 0.35, 0, x1, 2.92, d);
  k.box('blackMatte', x0, 0, 0, x1, 0.35, d - 0.25);
  const w = x1 - x0, n = Math.max(1, Math.round(w / 1.6)), cw = w / n;
  for (let i = 0; i < n; i++) {
    const a = x0 + i * cw + 0.02, b = x0 + (i + 1) * cw - 0.02;
    if (o.drawers) { for (const [ya, yb] of [[2.2, 2.88], [1.3, 2.16], [0.4, 1.26]]) { shaker(k, a, b, ya, yb, d, fr, pn); pull(k, (a + b) / 2, yb - 0.18, d); } }
    else { shaker(k, a, b, 2.3, 2.88, d, fr, pn); pull(k, (a + b) / 2, 2.6, d); shaker(k, a, b, 0.4, 2.26, d, fr, pn); pull(k, i % 2 ? a + 0.18 : b - 0.18, 1.95, d, true); }
  }
}
function upperRun(k, x0, x1, y0 = 4.6, y1 = H.ceil1 - 0.2) { // 40" uppers with a crown to the 8 ft ceiling
  const d = 1.05;
  k.box('rcab', x0, y0, 0, x1, y1, d);
  k.box('rcabDoor', x0 - 0.04, y1, 0, x1 + 0.04, y1 + 0.2, d + 0.1);
  const w = x1 - x0, n = Math.max(1, Math.round(w / 1.4)), cw = w / n;
  for (let i = 0; i < n; i++) { const a = x0 + i * cw + 0.02, b = x0 + (i + 1) * cw - 0.02; shaker(k, a, b, y0 + 0.05, y1 - 0.05, d); pull(k, i % 2 ? a + 0.18 : b - 0.18, y0 + 0.45, d, true); }
}
function shelf(k, x0, x1, y) { k.box(wood('#b98d5f'), x0, y, 0, x1, y + 0.15, 0.9); }
function counterTop(k, x0, x1, d = 2.1, splashTop = 4.6) {
  k.box('rcounter', x0, 2.92, 0, x1, 3.08, d);
  if (splashTop) k.box('rsplash', x0, 3.08, 0, x1, splashTop, 0.04);
}
function farmSink(k, xc) {
  k.box('porcelain', xc - 1.5, 1.95, 1.7, xc + 1.5, 3.0, 2.02);
  k.box('col:#e3e1dc', xc - 1.35, 3.081, 0.35, xc + 1.35, 3.086, 1.75);
  k.cyl('black', xc, 0.25, 0.06, 0.05, 3.08, 4.2, 8); k.box('black', xc - 0.04, 4.1, 0.25, xc + 0.04, 4.18, 0.95);
}
function proRange(k, x0, x1) { // 36" range with a plaster hood to the ceiling
  const d = 2.2;
  k.box('steel', x0, 0, 0, x1, 3.0, d);
  k.box('black', x0, 3.0, 0, x1, 3.05, d);
  for (const zz of [0.6, 1.6]) for (let i = 0; i < 3; i++) k.cbox('blackMatte', x0 + 0.5 + i * ((x1 - x0 - 1) / 2), zz, 0.85, 0.85, 3.05, 3.12);
  k.box('black', x0 + 0.25, 0.55, d, x1 - 0.25, 2.2, d + 0.02);
  k.box('chrome', x0 + 0.3, 2.3, d + 0.02, x1 - 0.3, 2.37, d + 0.15);
  k.prof('plaster', [[0, 5.7], [1.9, 5.7], [1.9, 6.0], [1.0, H.ceil1 - 0.02], [0, H.ceil1 - 0.02]], x0 - 0.2, x1 + 0.2);
  k.box(wood('#b98d5f'), x0 - 0.25, 5.55, 0, x1 + 0.25, 5.75, 2.0);
  k.box('rsplash', x0, 3.05, 0, x1, 5.6, 0.04);
  k.solid(x0, 0, x1, d, 0, 3.05);
}
function builtInFridge(k, x0, x1) {
  const d = 2.1;
  k.box('steel', x0, 0, 0, x1, 6.9, d);
  const xm = (x0 + x1) / 2;
  k.box('black', xm - 0.01, 2.5, d, xm + 0.01, 6.85, d + 0.01); k.box('black', x0, 2.45, d, x1, 2.5, d + 0.01);
  for (const x of [xm - 0.15, xm + 0.15]) k.box('black', x - 0.03, 3.4, d + 0.04, x + 0.03, 5.8, d + 0.16);
  k.box('rcab', x0, 6.9, 0, x1, H.ceil1 - 0.02, 2.1); shaker(k, x0 + 0.02, x1 - 0.02, 6.92, H.ceil1 - 0.04, 2.1);
  k.solid(x0, 0, x1, d, 0, 7);
}
function tallPantry(k, x0, x1, top = H.ceil1 - 0.02) {
  k.box('rcab', x0, 0.35, 0, x1, top, 2.0); k.box('blackMatte', x0, 0, 0, x1, 0.35, 1.75);
  const xm = (x0 + x1) / 2;
  for (const [a, b] of [[x0 + 0.02, xm - 0.01], [xm + 0.01, x1 - 0.02]]) { shaker(k, a, b, 3.6, top - 0.03, 2.0); shaker(k, a, b, 0.4, 3.55, 2.0); }
  pull(k, xm - 0.15, 3.6, 2.0, true); pull(k, xm + 0.15, 3.6, 2.0, true);
  k.solid(x0, 0, x1, 2.0, 0, top);
}
function island(k, w = 9, d = 4.2, seat = 1.2) { // centered; working side faces +z, seating overhang on -z
  k.box('island', -w / 2 + 0.1, 0.35, -d / 2 + seat, w / 2 - 0.1, 2.92, d / 2);
  k.box('blackMatte', -w / 2 + 0.2, 0, -d / 2 + seat + 0.1, w / 2 - 0.2, 0.35, d / 2 - 0.25);
  const n = Math.round(w / 1.8), cw = (w - 0.2) / n;
  for (let i = 0; i < n; i++) {
    const a = -w / 2 + 0.1 + i * cw + 0.02, b = a + cw - 0.04;
    shaker(k, a, b, 2.3, 2.88, d / 2, 'island', 'island'); pull(k, (a + b) / 2, 2.6, d / 2);
    shaker(k, a, b, 0.4, 2.26, d / 2, 'island', 'island'); pull(k, (a + b) / 2, 2.0, d / 2);
  }
  k.box('rcounter', -w / 2, 2.92, -d / 2, w / 2, 3.1, d / 2 + 0.08);
  k.box('rcounter', -w / 2, 0, -d / 2, -w / 2 + 0.18, 2.92, d / 2 + 0.08);
  k.box('rcounter', w / 2 - 0.18, 0, -d / 2, w / 2, 2.92, d / 2 + 0.08);
  k.solid(-w / 2, -d / 2 + seat - 0.4, w / 2, d / 2, 0, 3.1);
}
function stool(k, color = '#c9b8a0') { // counter stool, 26" seat, faces +z
  for (const [x, z] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) k.cyl('black', x, z, 0.04, 0.05, 0, 1.95, 6);
  k.box('black', -0.5, 0.75, -0.5, 0.5, 0.8, 0.5);
  k.soft(fab(color), -0.7, 1.92, -0.65, 0.7, 2.15, 0.65, 0.1); // 26" seat top for a 36" counter
  k.soft(fab(color), -0.65, 2.1, -0.72, 0.65, 3.05, -0.55, 0.08);
  k.solid(-0.7, -0.72, 0.7, 0.65, 0, 2.15);
}
function pendant(k, ceilY, hang, key = 'black') {
  const y = ceilY - hang;
  k.cyl(key, 0, 0, 0.2, 0.2, ceilY - 0.06, ceilY, 10);
  k.cyl(key, 0, 0, 0.015, 0.015, y + 0.9, ceilY - 0.06, 4);
  k.cyl('shade', 0, 0, 0.12, 0.55, y + 0.4, y + 0.9, 14); k.cyl('shade', 0, 0, 0.55, 0.35, y, y + 0.4, 14);
}
function orb(k, ceilY, hang, r = 1.0) { // frosted globe pendant on a black stem
  const y = ceilY - hang;
  k.cyl('black', 0, 0, 0.25, 0.25, ceilY - 0.08, ceilY, 10); k.cyl('black', 0, 0, 0.03, 0.03, y + r, ceilY - 0.08, 6);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI, r0 = Math.sin(a) * r, r1 = Math.sin(a + Math.PI / 6) * r; k.cyl('shade', 0, 0, r0, r1, y + r - Math.cos(a) * r, y + r - Math.cos(a + Math.PI / 6) * r, 16, 1, false); }
}
function linearPendant(k, ceilY, hang, len = 5) {
  const y = ceilY - hang;
  for (const x of [-len / 2 + 0.3, len / 2 - 0.3]) k.box('black', x - 0.01, y, -0.01, x + 0.01, ceilY, 0.01);
  k.box('black', -len / 2, y - 0.25, -0.25, len / 2, y, 0.25); k.box('shade', -len / 2 + 0.1, y - 0.27, -0.2, len / 2 - 0.1, y - 0.24, 0.2);
}

// ------------------------------------------------------------------ kitchen opened to the family room
function lockers(k, len, n) { // back at z = 0: open lockers over a bench, cubbies above
  const cw = len / n;
  k.box('rcab', 0, 0, 0, len, 7.2, 0.15);
  for (let i = 0; i <= n; i++) k.box('rcabDoor', i * cw - 0.04, 0, 0, i * cw + 0.04, 7.2, 1.6);
  k.box('rcabDoor', 0, 1.45, 0, len, 1.6, 1.6); k.soft('fab:#7c8a8f', 0.05, 1.6, 0.25, len - 0.05, 1.8, 1.55, 0.06);
  k.box('rcabDoor', 0, 5.6, 0, len, 5.7, 1.6); k.box('rcabDoor', 0, 7.1, 0, len, 7.25, 1.7);
  for (let i = 0; i < n; i++) { k.box('brass', i * cw + cw / 2 - 0.15, 4.6, 0.15, i * cw + cw / 2 + 0.15, 4.7, 0.4); k.box('fab:#6b5a48', i * cw + 0.2, 0.05, 0.25, i * cw + cw - 0.2, 1.0, 1.4); for (let j = 0; j < 2; j++) k.soft(fab(['#5d6b73', '#a9895f', '#7a4f44', '#3d4c5e'][(i + j) % 4]), i * cw + 0.25 + j * 0.6, 2.4, 0.2, i * cw + 0.75 + j * 0.6, 4.55, 0.5, 0.08); }
  k.solid(0, 0, len, 1.6, 0, 7.2);
}
function pergola(k, x0, x1, z0, z1, top = 8.6) {
  const W = wood('#8a5a34');
  for (const x of [x0, x1]) for (const z of [z0, z1]) { k.cbox(W, x, z, 0.5, 0.5, 0, top + 0.6); k.cbox('foundation', x, z, 0.9, 0.9, 0, 0.3); k.solid(x - 0.3, z - 0.3, x + 0.3, z + 0.3, 0, top); }
  for (const z of [z0, z1]) for (const dz of [-0.33, 0.33]) k.box(W, x0 - 1.2, top - 0.2, z + dz - 0.08, x1 + 1.2, top + 0.65, z + dz + 0.08);
  for (let x = x0 - 0.9; x <= x1 + 0.9; x += 1.4) k.box(W, x - 0.08, top + 0.65, z0 - 1.4, x + 0.08, top + 1.25, z1 + 1.4);
  for (let z = z0 - 1.0; z <= z1 + 1.0; z += 0.9) k.box(W, x0 - 1.3, top + 1.25, z - 0.06, x1 + 1.3, top + 1.4, z + 0.06);
  for (let x = x0; x <= x1; x += 1.3) for (const z of [z0 + (z1 - z0) / 4, z0 + (z1 - z0) / 2, z0 + (3 * (z1 - z0)) / 4]) k.cyl('bulb', x, z, 0.08, 0.08, top - 0.25, top - 0.1, 6);
}

// ------------------------------------------------------------------ 3-car garages with a rec room above
// Built in a local frame: u runs along the door wall (left to right seen from the drive), v from the back wall (0)
// to the door wall (D). Two bays for cars; the third (house side) is the gym / bike bay with the walk-in door.
// The stair runs up the far side wall from the back toward the ridge. Styled after the house: steep gable roof
// (10/12, 3'7" knee walls upstairs), a street-style cross gable over the middle door, fish-scale shingles in the
// gable peaks and under the windows, dentil belt course, burgundy sashes.
export const GAR = {
  A: { x0: 3.5, x1: 27.5, y0: 26.5, y1: 62.5, face: 'E', label: 'A · faces east, at the end of the drive', dims: "36' x 24'" },
  B: { x0: 8, x1: 44, y0: 3.5, y1: 29.5, face: 'S', label: 'B · faces south, along the north line', dims: "36' x 26'" },
  C: { x0: 3.5, x1: 35.5, y0: 3.5, y1: 27.5, face: 'S', label: 'C · faces south, compact, rear corner', dims: "32' x 24'" },
};
const garageGeom = (id) => {
  const g = GAR[id], S = g.face === 'S';
  const Lw = S ? g.x1 - g.x0 : g.y1 - g.y0, D = S ? g.y1 - g.y0 : g.x1 - g.x0;
  const M = S ? (u, v) => [g.x0 + u, g.y0 + v] : (u, v) => [g.x0 + v, g.y1 - u];
  const GF = H.grade + 0.12, UF = GF + 9.8;
  return { g, S, Lw, D, M, rot: S ? 0 : 90, dU: S ? [1, 0] : [0, -1], dV: S ? [0, 1] : [1, 0], GF, UF, kn: 3.6, pg: 10 / 12, door: M(Lw, D - 4.6), bridge: M(Lw, D / 2) };
};
function buildGarage(id) {
  const { g, Lw, D, M, rot, dU, dV, GF, UF, kn, pg } = garageGeom(id), tag = 'gar:' + id;
  const K = UF + kn, uc = Lw / 2, cw = 7, OV = 1.0, o = M(0, 0);
  const b1 = renoBat(tag, 'f1'), b2 = renoBat(tag, 'f2'), br = renoBat(tag, 'roof');
  const k1 = new Kit(b1, tag).at(o[0], o[1], 0, rot), k2 = new Kit(b2, tag).at(o[0], o[1], 0, rot), kr = new Kit(br, tag).at(o[0], o[1], 0, rot);
  const rect = [M(0, 0), M(Lw, 0), M(Lw, D), M(0, D)];
  const neg = ([a, b]) => [-a, -b];
  const L1 = { ...LV.f1, floor: GF, extBottom: 0, extTop: UF - GF, intTop: UF - GF - 0.5, ceiling: UF - GF - 0.5, sill: 3.6, head: 6.9, grille: 'dh', _foot: [], _holes: [] };
  const L2 = { ...LV.f2, floor: UF, extBottom: 0, extTop: kn, intTop: 8, ceiling: 8, sill: 1.8, head: 5.9, grille: 'dh', _foot: [], _holes: [] };
  const sq = Math.round(Lw * D);
  const rooms1 = [roleRoom(L1, { name: 'Garage (new)', dims: `${g.dims} · 2 cars + gym / bike bay`, floor: 'concrete', wall: 'paint:#e9e6df', bare: true, poly: rect }, 0, 'g' + id)];
  const rooms2 = [roleRoom(L2, { name: 'Rec Room (new)', dims: `${g.dims} · ~${Math.round(sq * 0.78)} sq ft with headroom`, floor: 'lvp:#b39468', wall: 'paint:#f1efe9', poly: rect }, 0, 'g' + id)];
  const into = (du, dv) => { const x = du * dU[0] + dv * dV[0], y = du * dU[1] + dv * dV[1]; return Math.abs(x) > Math.abs(y) ? (x > 0 ? '+x' : '-x') : (y > 0 ? '+y' : '-y'); };
  const W = (L, rooms, u0, v0, u1, v1, ops = [], opts = {}) => {
    const [ax, ay] = M(u0, v0), [bx, by] = M(u1, v1), len = Math.hypot(u1 - u0, v1 - v0), horiz = Math.abs(bx - ax) >= Math.abs(by - ay);
    const cv = (t) => (horiz ? ax + ((bx - ax) * t) / len : ay + ((by - ay) * t) / len);
    CTX.rooms = rooms; CTX.foot = [rect];
    buildWall(L, [ax, ay, bx, by, 'e', ops.map(([a, b, ty, oo]) => [cv(a), cv(b), ty, oo]), { rs: tag, ...opts }]);
    CTX.rooms = null; CTX.foot = null;
  };
  const win = { g: 'dh', red: true, apron: true }, gap = (Lw - 28.5) / 4;
  // ---- ground floor
  W(L1, rooms1, 0, D, Lw, D, [0, 1, 2].map((i) => [gap + i * (9.5 + gap), gap + i * (9.5 + gap) + 9.5, 'g', { sill: 0, head: 7.5 }]));
  W(L1, rooms1, Lw, 0, 0, 0, [[Lw * 0.28 - 1.2, Lw * 0.28 + 1.2, 'w', { g: 'dh', red: true }], [Lw * 0.72 - 1.2, Lw * 0.72 + 1.2, 'w', { g: 'dh', red: true }]]);
  W(L1, rooms1, 0, 0, 0, D, [[D - 6.8, D - 4.2, 'w', win]]);
  W(L1, rooms1, Lw, D, Lw, 0, [[3.2, 6.0, 'x', { hinge: 'lo', into: into(-1, 0), style: 'half', color: RED }], [D / 2 + 1, D / 2 + 3.6, 'w', win]]);
  b1.prism({ top: 'floor:concrete', side: 'foundation' }, rect, H.grade - 0.3, GF);
  addFloorPoly(rect, [], GF, tag);
  // ---- stair: up the far side wall from the back toward the ridge
  const n = 15, r = (UF - GF) / n, d = 0.85, sv = 1.5, su0 = 0.45, su1 = 3.9;
  const aabb = (u0, v0, u1, v1) => { const a = M(u0, v0), b = M(u1, v1); return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])]; };
  for (let i = 1; i < n; i++) {
    const va = sv + (i - 1) * d, vb = sv + i * d, top = GF + i * r;
    k1.box(wood('#8a6a48'), su0, top - 0.14, va - 0.08, su1, top, vb); k1.box('white', su0, Math.max(GF, top - r - 0.14), vb - 0.06, su1, top - 0.14, vb);
    addFloorRect(...aabb(su0, va, su1, vb), top, tag);
  }
  { const a = M(su1 + 0.05, sv + 0.4), b = M(su1 + 0.05, sv + (n - 1) * d - 0.2); railing(b1, a, b, GF + r + 0.3, UF - 0.3, { rail: wood('#5c3b26'), bal: 'trim' }, tag, 'square', false); }
  const hole = [M(su0 - 0.2, sv + 5 * d), M(su1 + 0.05, sv + 5 * d), M(su1 + 0.05, sv + (n - 1) * d), M(su0 - 0.2, sv + (n - 1) * d)];
  // ---- upper floor: rec room under the roof
  b2.prism({ top: 'subfloor', bottom: 'ceiling', side: 'white' }, rect, UF - 0.5, UF, [hole]);
  b2.poly(rooms2[0].floorKey, rect, UF + 0.012, [hole]);
  addFloorPoly(rect, [hole], UF, tag);
  W(L2, rooms2, Lw, 0, 0, 0);
  W(L2, rooms2, 0, D, uc - cw, D);
  W(L2, rooms2, uc - cw, D, uc, D, [[cw - 3.1, cw - 0.6, 'w', win]], { slope: [K, K + pg * cw] });
  W(L2, rooms2, uc, D, uc + cw, D, [[0.6, 3.1, 'w', win]], { slope: [K + pg * cw, K] });
  W(L2, rooms2, uc + cw, D, Lw, D);
  const hm = kn + pg * (D / 2 - 2);
  W(L2, rooms2, 0, 0, 0, D / 2 - 2, [], { slope: [K, UF + hm] });
  W(L2, rooms2, 0, D / 2 - 2, 0, D / 2 + 2, [[0.7, 3.3, 'w', win]], { top: hm });
  W(L2, rooms2, 0, D / 2 + 2, 0, D, [], { slope: [UF + hm, K] });
  W(L2, rooms2, Lw, D, Lw, D / 2 + 2, [], { slope: [K, UF + hm] });
  W(L2, rooms2, Lw, D / 2 + 2, Lw, D / 2 - 2, [[0.7, 3.3, 'w', win]], { top: hm, rs: `${tag}&not:brg` });
  W(L2, rooms2, Lw, D / 2 + 2, Lw, D / 2 - 2, [[0.6, 3.4, 'x', { hinge: 'lo', into: into(-1, 0), style: 'half', color: RED }]], { top: hm, rs: `${tag}&brg` }); // door to the footbridge
  W(L2, rooms2, Lw, D / 2 - 2, Lw, 0, [], { slope: [UF + hm, K] });
  railing(b2, M(su1 + 0.05, sv + 5 * d), M(su1 + 0.05, sv + (n - 1) * d), UF, UF, { rail: wood('#5c3b26'), bal: 'trim' }, tag, 'square');
  railing(b2, M(su0, sv + 5 * d), M(su1 + 0.05, sv + 5 * d), UF, UF, { rail: wood('#5c3b26'), bal: 'trim' }, tag, 'square', false);
  // ceiling: flat at 8 ft, following the roof down to the knee walls, higher under the cross gable
  const gc = (u, v) => Math.min(8, Math.max(kn + pg * Math.min(v, D - v), Math.abs(u - uc) < cw && v > D / 2 ? kn + pg * (cw - Math.abs(u - uc)) : 0));
  for (let v = 0; v < D - 1e-6; v += 0.5) {
    let run = null;
    const flush = () => { if (run) { br.face('ceiling', [kr.P(run[0], UF + 8, v), kr.P(run[1], UF + 8, v), kr.P(run[1], UF + 8, v + 0.5), kr.P(run[0], UF + 8, v + 0.5)], V(0, -1, 0)); run = null; } };
    for (let u = 0; u < Lw - 1e-6; u += 0.5) {
      const h = [[u, v], [u + 0.5, v], [u + 0.5, v + 0.5], [u, v + 0.5]].map(([a, b]) => gc(a + (a === u ? 1e-3 : -1e-3), b + (b === v ? 1e-3 : -1e-3)));
      if (h.every((q) => q > 7.999)) { if (run) run[1] = u + 0.5; else run = [u, u + 0.5]; continue; }
      flush();
      br.face('ceiling', [kr.P(u, UF + h[0], v), kr.P(u + 0.5, UF + h[1], v), kr.P(u + 0.5, UF + h[2], v + 0.5), kr.P(u, UF + h[3], v + 0.5)], V(0, -1, 0));
    }
    flush();
  }
  // ---- roofs
  const E = K + ROOFT;
  const main = roofMass(br, [M(-OV, -OV), M(Lw + OV, -OV), M(Lw + OV, D + OV), M(-OV, D + OV)], [{ o: M(0, 0), up: dV, h0: E, p: pg }, { o: M(0, D), up: neg(dV), h0: E, p: pg }]);
  roofMass(br, [M(uc - cw - OV, D / 2), M(uc + cw + OV, D / 2), M(uc + cw + OV, D + OV), M(uc - cw - OV, D + OV)], [{ o: M(uc - cw, 0), up: dU, h0: E, p: pg }, { o: M(uc + cw, 0), up: neg(dU), h0: E, p: pg }], { skip: [0] });
  for (const u of [0, Lw]) gableFill(br, M(u, D / 2 - 2), M(u, D / 2 + 2), () => UF + hm, (x, y) => main(x, y) - ROOFT - 0.02, 'siding', 8, 'white');
  // ---- trim: corner boards, dentil belt course, fish-scale gable peaks, eave frieze, lanterns between the doors
  for (const [u, v] of [[0, 0], [Lw, 0], [Lw, D], [0, D]]) { const [x, z] = M(u, v); b1.aabox('extTrim', x - 0.3, GF, z - 0.3, x + 0.3, UF, z + 0.3); b2.aabox('extTrim', x - 0.3, UF, z - 0.3, x + 0.3, K, z + 0.3); }
  for (const [a, b, out] of [[M(0, D), M(Lw, D), dV], [M(Lw, 0), M(0, 0), neg(dV)], [M(0, 0), M(0, D), neg(dU)], [M(Lw, D), M(Lw, 0), dU]]) dentilBand(b2, a, b, UF - 0.4, out, { h: 0.55 });
  for (const [a, b] of [[M(0, D), M(uc - cw, D)], [M(uc + cw, D), M(Lw, D)]]) dentilBand(b2, a, b, K - 0.5, dV, { dent: false, cap: false });
  dentilBand(b2, M(Lw, 0), M(0, 0), K - 0.5, neg(dV), { dent: false, cap: false });
  gablePeak(br, M(0, 0), M(0, D), neg(dU), K, pg, UF + 7.4);
  gablePeak(br, M(Lw, D), M(Lw, 0), dU, K, pg, UF + 7.4);
  gablePeak(br, M(uc - cw, D), M(uc + cw, D), dV, K, pg, UF + 6.55, false);
  for (const i of [1, 2]) { const [x, z] = M(gap / 2 + i * (9.5 + gap), D); exteriorLantern(new Kit(b1, tag).at(x + dV[0] * 0.27, z + dV[1] * 0.27, GF, rot), 6.6); }
  // ---- inside: two cars, the gym / bike bay, storage; upstairs a lounge with room for a guest bed
  const F1b = renoBat(tag + '&furn', 'f1'), F2b = renoBat(tag + '&furn', 'f2'), ftag = tag + '&furn';
  const at1 = (u, v, r2 = 0) => { const [x, z] = M(u, v); return new Kit(F1b, ftag).at(x, z, GF, rot + r2); };
  const at2 = (u, v, r2 = 0) => { const [x, z] = M(u, v); return new Kit(F2b, ftag).at(x, z, UF, rot + r2); };
  const bay = (i) => gap + 4.75 + i * (9.5 + gap);
  item(at1(bay(0) + 0.5, D - 9.6), (k) => { car(k, '#5a6b5a'); k.solid(-3.05, -7.8, 3.05, 7.8, 0, 4.6); }, null, 'car');
  item(at1(bay(1), D - 9.6), (k) => { car(k, '#2b2f36'); k.solid(-3.05, -7.8, 3.05, 7.8, 0, 4.6); }, null, 'car');
  item(at1(bay(2) - 0.3, D / 2 + 1.5), (k) => rubberFloor(k, 10, D - 9));
  item(at1(bay(2) + 0.6, 0.45), (k) => powerRack(k));
  item(at1(bay(2) - 3.2, D / 2 + 2, 180), (k) => pelotonBike(k));
  item(at1(Lw - 0.5, D / 2 - 3, -90), (k) => dumbbellRack(k, 5));
  item(at1(bay(2) + 0.6, 6.5), (k) => liftBench(k));
  item(at1(bay(1), 0.45), (k) => shelving(k, 7, 1.6, 6.5));
  // bikes hung on the gym bay's back wall, a mower-and-bins corner
  for (const du of [-4.2, -2.9]) { const k = at1(bay(2) + du, 0.5); k.box('col:#2f3d52', -0.08, 2.2, 0, 0.08, 5.6, 0.12); for (const y of [2.5, 5.0]) k.cyl('black', 0, 1.2, 1.1, 1.1, y - 0.06, y + 0.06, 16); k.box('col:#b33a2f', -0.05, 3.4, 0.6, 0.05, 4.2, 1.8); }
  item(at2(uc, D - 4.4, 180), (k) => swap(k, { glb: 'Sofa08', w: 8, d: 3.15, back: true }, (h) => sofa(h, 8, { color: '#8a8f86', cushion: '#959a90', pillows: ['#6e2a2a', '#d8cfbd'] })));
  item(at2(uc, D / 2 + 1.5), (k) => rug(k, 10, 7.5, '#c9bfae', '#8e8576'));
  item(at2(uc, D / 2 + 1.8), (k) => coffeeTable(k, 4, 2.2, '#6b4a33'));
  item(at2(uc - 5.2, D / 2 + 2.2, 90), (k) => armchair(k, { color: '#b9a98f' }));
  item(at2(uc + 5.2, D / 2 + 2.2, -90), (k) => armchair(k, { color: '#b9a98f' }));
  // TV on a low wall across from the sofa (a media wall standing just clear of the back slope)
  { const k = at2(uc, 5.6); k.box(rooms2[0].wall, -4.5, 0, -0.25, 4.5, 6.6, 0.25); k.box('trim', -4.5, 0, 0.25, 4.5, 0.3, 0.3); k.solid(-4.5, -0.25, 4.5, 0.25, 0, 6.6); }
  item(at2(uc, 5.9), (k) => wallTV(k, 65));
  item(at2(uc, 5.9), (k) => mediaConsole(k, 6));
  // a daybed corner (a guest room later) and a game table
  item(at2(Lw - 0.6, 6.6, -90), (k) => bed(k, 'full', { frame: '#6b4a33', duvet: '#e7e2d6', accent: '#6e2a2a' }));
  item(at2(Lw - 7.6, D / 2 + 4.6), (k) => { diningTable(k, 4, 4, { color: '#6b4a33' }); k.solid(-2, -2, 2, 2, 0, 2.5); });
  for (const [du, dv2, r3] of [[-2.9, 0, 90], [2.9, 0, -90], [0, 2.9, 180], [0, -2.9, 0]]) item(at2(Lw - 7.6 + du, D / 2 + 4.6 + dv2, r3), (k) => patioChair(k));
  for (const [u, v] of [[uc - 6, D / 2], [uc + 6, D / 2], [uc, D / 2 + 5], [uc - 12, D / 2], [uc + 12, D / 2]]) if (u > 1 && u < Lw - 1) recessed(new Kit(b2, tag).at(...M(u, v), 0, 0), UF + 8);
  for (const u of [bay(0), bay(1), bay(2)]) flushDome(new Kit(b1, tag).at(...M(u, D / 2), 0, 0), UF - 0.5);
  // ---- apron: concrete from the drive's end to the three doors
  const sb = renoBat(tag, 'site');
  const apron = id === 'A' ? rounded([[DRIVE.rear + 0.2, 38.75], [DRIVE.rear + 0.2, DRIVE.south], [44, 55.5, 6], [g.x1, g.y1 - 0.6], [g.x1, g.y0 + 0.6], [44, 33.5, 6]])
    : rounded([[DRIVE.rear + 0.2, 38.75], [DRIVE.rear + 0.2, DRIVE.south], [g.x0 - 1.2, DRIVE.south], [g.x0 - 1.2, g.y1], [g.x1 + 1.2, g.y1], [g.x1 + 4.5, 38.75, 5]]);
  sb.poly('paving', apron, G + 0.04);
  addFloorPoly(apron, [], G + 0.04, tag);
  // labels + walk-mode room names
  for (const [L, rooms, lv] of [[L1, rooms1, 'f1'], [L2, rooms2, 'f2']]) {
    for (const rm of rooms) RENO_ROOMS.push({ rs: tag, level: lv, room: rm });
    RENO_LABELS.push(...buildLabels(L, renoGroup(tag, lv), rooms).map((l) => ((l.userData.rs = tag), (l.userData.level = lv), l)));
  }
}

// ------------------------------------------------------------------ mudroom addition (where the rear deck is)
// One story, 11 x 12'6", floor at grade like the back entry (three steps up into the laundry through a new opening
// where the washer and dryer are). Doors to the driveway (south) and toward the garage (west).
const MUD = { x0: 62, x1: 73, y0: 18, y1: 30.5, plate: 7.7, pitch: 6 / 12 };
function buildMudroom() {
  const rs = 'on:mud', m = MUD, b = renoBat(rs, 'f1'), br = renoBat(`${rs}&not:brg`, 'roof'), bd = renoBat(`${rs}&brg`, 'roof');
  const rect = [[m.x0, m.y0], [m.x1, m.y0], [m.x1, m.y1], [m.x0, m.y1]];
  const LM = { ...LV.f1, floor: ENTRY, extBottom: H.grade - ENTRY, extTop: m.plate - ENTRY, intTop: m.plate - ENTRY, ceiling: m.plate - ENTRY - 0.1, sill: 3.2, head: 6.9, grille: 'dh', _foot: [], _holes: [] };
  const room = roleRoom(LM, { name: 'Mudroom (new)', dims: "10'6\" x 12' · lockers + bench · 3 steps up to the laundry", floor: null, wall: 'paint:#eeece6', poly: rect }, 0, 'mud');
  const wall = (L, w, rooms = [room]) => { CTX.rooms = rooms; CTX.foot = [rect]; buildWall(L, w); CTX.rooms = null; CTX.foot = null; };
  const win = { g: 'dh', red: true, apron: true };
  wall(LM, [m.x0, m.y0, m.x1, m.y0, 'e', [[65.2, 67.8, 'w', win]], { rs }]);
  wall(LM, [m.x0, m.y1, m.x0, m.y0, 'e', [[23.0, 25.8, 'x', { hinge: 'lo', into: '+x', style: 'half', color: RED }]], { rs }]);
  wall(LM, [m.x1, m.y1, m.x0, m.y1, 'e', [[64.0, 66.8, 'x', { hinge: 'hi', into: '-y', style: 'half', color: RED }], [68.6, 71.0, 'w', win]], { rs }]);
  // the old laundry wall, now inside: a cased opening where the washer and dryer were
  wall(LV.f1, [73, 30.7, 73, 18.5, 'e', [[21.3, 26.3, 'o', { head: 7.0, cased: true }]], { rs, bottom: ENTRY }], [...LV.f1._rooms, room]);
  // slate floor on a slab, the steps up to the laundry
  b.prism({ top: 'slate', side: 'foundation' }, rect, H.grade - 0.3, ENTRY);
  addFloorPoly(rect, [], ENTRY, rs);
  for (let i = 0; i < 2; i++) { const xb = 72.83 - i * 0.95, xa = xb - 0.95, top = -(i + 1) * 0.6; b.aabox({ def: 'trim', pv: wood('#7a4f2e') }, xa, ENTRY, 21.3, xb, top, 26.3); addFloorRect(xa, 21.3, xb, 26.3, top, rs); }
  for (const z of [21.2, 26.4]) railing(b, [70.9, z], [72.8, z], ENTRY + 0.4, 0, wood('#5c3b26'), rs, 'hand');
  // ceiling, lights
  b.poly('ceiling', rect, m.plate - 0.1, [], true);
  for (const z of [21, 27.5]) recessed(new Kit(b, rs).at(66.5, z, 0, 0), m.plate - 0.1);
  // lockers with a bench on the north wall, hooks + boot tray by the driveway door, a closet-depth cabinet
  { const k = new Kit(b, rs).at(62.4, m.y0 + 0.28, ENTRY, 0); lockers(k, 6.8, 4); }
  { const k = new Kit(b, rs).at(72.6, 29.2, ENTRY, -90); k.box('rcab', -1.0, 0, 0, 2.4, 7.2, 1.5); for (const [a, c] of [[-0.95, 0.68], [0.72, 2.35]]) { k.box('rcabDoor', a, 0.4, 1.5, c, 7.1, 1.56); k.box('brass', (a + c) / 2 - 0.03, 3.4, 1.56, (a + c) / 2 + 0.03, 4.0, 1.62); } k.solid(-1.0, 0, 2.4, 1.5, 0, 7.2); }
  { const k = new Kit(b, rs).at(64.9, m.y1 - 0.3, ENTRY, 180); k.box(wood('#6b4a33'), -2.3, 5.2, 0, -0.5, 5.5, 0.1); for (let i = 0; i < 4; i++) k.box('brass', -2.1 + i * 0.5, 5.0, 0.1, -2.0 + i * 0.5, 5.2, 0.3); }
  item(new Kit(renoBat(rs + '&furn', 'f1'), rs + '&furn').at(69.6, m.y1 - 1.1, ENTRY, 180), (k) => { k.box('blackMatte', -1.3, 0.02, -0.6, 1.3, 0.1, 0.6); for (const [x, c] of [[-0.8, '#6b4a33'], [0, '#2f3d52'], [0.75, '#7a4f44']]) k.box('col:' + c, x - 0.3, 0.1, -0.45, x + 0.3, 0.8, 0.45); }, null, 'boot tray');
  item(new Kit(renoBat(rs + '&furn', 'f1'), rs + '&furn').at(66.3, 24.4, ENTRY, 90), (k) => rug(k, 5.5, 3, '#7c6a58', '#4b4038'));
  // stoops at the two doors
  for (const [x0, z0, x1, z1] of [[63.6, m.y1 + 0.25, 67.2, m.y1 + 3.2], [m.x0 - 3.2, 22.6, m.x0 - 0.25, 26.2]]) { b.aabox('floor:paving', x0, H.grade - 0.2, z0, x1, ENTRY - 0.28, z1); addFloorRect(x0, z0, x1, z1, ENTRY - 0.28, rs); }
  exteriorLantern(new Kit(b, rs).at(m.x0 - 0.27, 26.6, ENTRY, -90), 6.2); exteriorLantern(new Kit(b, rs).at(67.5, m.y1 + 0.27, ENTRY, 0), 6.2);
  for (const [x, z] of [[m.x0, m.y0], [m.x0, m.y1]]) b.aabox('extTrim', x - 0.3, H.grade, z - 0.3, x + 0.3, m.plate, z + 0.3);
  // roof: a small gable matching the house (fish-scale peak) ...
  const E = m.plate + ROOFT, ym = (m.y0 + m.y1) / 2;
  const rf = roofMass(br, [[m.x0 - 1, m.y0 - 1], [m.x1 - 0.25, m.y0 - 1], [m.x1 - 0.25, m.y1 + 1], [m.x0 - 1, m.y1 + 1]], [{ o: [0, m.y0], up: [0, 1], h0: E, p: m.pitch }, { o: [0, m.y1], up: [0, -1], h0: E, p: m.pitch }], { skip: [1] });
  gableFill(br, [m.x0, m.y0], [m.x0, m.y1], () => m.plate, (x, y) => rf(x, y) - ROOFT - 0.02, 'siding', 24, 'white');
  gablePeak(br, [m.x0, m.y1], [m.x0, m.y0], [-1, 0], m.plate, m.pitch, m.plate + 0.55, false);
  gableFill(br, [m.x1 - 0.27, m.y0], [m.x1 - 0.27, m.y1], (x, y) => rf(x, y) - 0.4, () => H.f2 - 0.3, 'siding', 24);
  // ... or, with the footbridge, a flat roof deck it lands on (the office keeps its door)
  { const top = H.f2 - 0.08;
    for (const [x0, z0, x1, z1] of [[m.x0 - 0.25, m.y0 - 0.25, m.x1 - 0.25, m.y0 + 0.25], [m.x0 - 0.25, m.y1 - 0.25, m.x1 - 0.25, m.y1 + 0.25], [m.x0 - 0.25, m.y0, m.x0 + 0.25, m.y1]]) bd.aabox('siding', x0, m.plate, z0, x1, top - 0.3, z1);
    bd.aabox({ def: 'extTrim', pv: 'col:#8b8478' }, m.x0 - 0.5, top - 0.3, m.y0 - 0.5, m.x1 - 0.25, top, m.y1 + 0.5);
    addFloorRect(m.x0 - 0.5, m.y0 - 0.5, m.x1, m.y1 + 0.5, top, `${rs}&brg`);
    const WR = { rail: 'extTrim', bal: 'extTrim' }, tg = `${rs}&brg`;
    railing(bd, [m.x0 - 0.3, m.y0 - 0.3], [m.x1 - 0.4, m.y0 - 0.3], top, top, WR, tg, 'square', true, 3.0);
    railing(bd, [m.x0 - 0.3, m.y1 + 0.3], [m.x1 - 0.4, m.y1 + 0.3], top, top, WR, tg, 'square', true, 3.0);
    railing(bd, [m.x0 - 0.3, m.y0 - 0.3], [m.x0 - 0.3, 23.0], top, top, WR, tg, 'square', false, 3.0);
    railing(bd, [m.x0 - 0.3, 26.6], [m.x0 - 0.3, m.y1 + 0.3], top, top, WR, tg, 'square', false, 3.0);
  }
  RENO_ROOMS.push({ rs, level: 'f1', room });
  RENO_LABELS.push(...buildLabels(LM, renoGroup(rs, 'f1'), [room]).map((l) => ((l.userData.rs = rs), (l.userData.level = 'f1'), l)));
}

// ------------------------------------------------------------------ breezeway + footbridge (garage <-> mudroom / office)
function buildLinks() {
  for (const id of ['A', 'B', 'C']) {
    const gg = garageGeom(id), tag = `gar:${id}&link:walk|gar:${id}&link:bridge`, b = renoBat(tag, 'site');
    const [dx, dz] = gg.door, zc = id === 'A' ? 23.6 : dz, x0 = id === 'A' ? dx - 2.5 : dx + 0.3, x1 = MUD.x0 - 0.3, w = 5.6;
    // paver walk under it (and for garage A a short leg from the garage's side door up to it)
    const walk = [[x0, zc - w / 2 + 0.3], [x1, zc - w / 2 + 0.3], [x1, zc + w / 2 - 0.3], [x0, zc + w / 2 - 0.3]];
    b.poly('pavers', walk, G + 0.06); addFloorPoly(walk, [], G + 0.06, tag);
    if (id === 'A') { const leg = [[dx - 2.5, zc], [dx + 2.5, zc], [dx + 2.5, dz - 0.3], [dx - 2.5, dz - 0.3]]; b.poly('pavers', leg, G + 0.06); addFloorPoly(leg, [], G + 0.06, tag); }
    // posts, beams, a little gable roof with the house's shingles; scroll brackets like the porch
    const eave = G + 8.4, n = Math.max(2, Math.round((x1 - x0) / 8.5));
    for (let i = 0; i <= n; i++) for (const s of [-1, 1]) {
      const x = x0 + 0.4 + ((x1 - x0 - 0.8) * i) / n, z = zc + s * (w / 2 - 0.3);
      b.aabox('extTrim', x - 0.25, G, z - 0.25, x + 0.25, eave, z + 0.25); b.aabox('extTrim', x - 0.32, G, z - 0.32, x + 0.32, G + 0.7, z + 0.32);
      for (let j = 0; j < 3; j++) for (const sx of [-1, 1]) if ((sx < 0 && i > 0) || (sx > 0 && i < n)) b.aabox('extTrim', x + sx * (0.25 + j * 0.22) - 0.11, eave - 0.3 - (2 - j) * 0.22, z - 0.05, x + sx * (0.25 + j * 0.22) + 0.11, eave - 0.3, z + 0.05);
      addSolid(V(x - 0.25, 0, z - 0.25), V(0.5, 0, 0), V(0, 0, 0.5), G, eave, tag);
    }
    for (const s of [-1, 1]) b.aabox('extTrim', x0, eave - 0.3, zc + s * (w / 2 - 0.3) - 0.2, x1, eave + 0.25, zc + s * (w / 2 - 0.3) + 0.2);
    roofMass(b, [[x0 - 0.6, zc - w / 2 - 0.6], [x1 + 0.2, zc - w / 2 - 0.6], [x1 + 0.2, zc + w / 2 + 0.6], [x0 - 0.6, zc + w / 2 + 0.6]], [{ o: [0, zc - w / 2], up: [0, 1], h0: eave + 0.6, p: 8 / 12 }, { o: [0, zc + w / 2], up: [0, -1], h0: eave + 0.6, p: 8 / 12 }], { gutter: false });
    b.poly('col:#b9c7c4', [[x0, zc - w / 2 + 0.3], [x1, zc - w / 2 + 0.3], [x1, zc + w / 2 - 0.3], [x0, zc + w / 2 - 0.3]], eave + 0.2, [], true);
    // without the mudroom: a paver path on around the deck to the back entry door
    { const t2 = `(${tag})`.replace(/[()]/g, ''), bp = renoBat(`gar:${id}&link:walk&off:mud|gar:${id}&link:bridge&off:mud`, 'site');
      ribbon(bp, 'pavers', [[x1, zc], [64.5, 27], [63.5, 33], [66, 38.2], [70, 40.2]], 4, G + 0.055, `gar:${id}&link:walk&off:mud|gar:${id}&link:bridge&off:mud`); void t2; }
    // footbridge from the rec room's gable door to the office door: lands on the deck, or on the mudroom's roof deck
    if (id === 'A') continue;
    for (const [mud, xe] of [['off:mud', DECK.x0], ['on:mud', MUD.x0 - 0.5]]) {
      const bt = `gar:${id}&brg&${mud}`, bb = renoBat(bt, 'f2'), [bx, bz] = gg.bridge, a = [bx + 0.25, bz], e = [xe, 24.6], ya = gg.UF - 0.02, ye = H.f2 - 0.08;
      const L = Math.hypot(e[0] - a[0], e[1] - a[1]), ux = (e[0] - a[0]) / L, uz = (e[1] - a[1]) / L, hw = 2.1;
      bb.box({ def: 'extTrim', pv: 'col:#8b8478' }, V(a[0] + uz * hw, ya - 0.7, a[1] - ux * hw), V(e[0] - a[0], ye - ya, e[1] - a[1]), V(0, 0.7, 0), V(-uz * 2 * hw, 0, ux * 2 * hw));
      const steps = Math.ceil(L / 1.5);
      for (let i = 0; i < steps; i++) { const s0 = (i / steps) * L, s1 = ((i + 1) / steps) * L, q = (s) => [[a[0] + ux * s + uz * hw, a[1] + uz * s - ux * hw], [a[0] + ux * s - uz * hw, a[1] + uz * s + ux * hw]]; const [p0, p1] = q(s0), [p3, p2] = q(s1); addFloorPoly([p0, p1, p2, p3], [], ya + ((ye - ya) * (i + 0.5)) / steps, bt); }
      const WR = { rail: 'extTrim', bal: 'extTrim' };
      for (const s of [-1, 1]) railing(bb, [a[0] + uz * s * (hw - 0.15), a[1] - ux * s * (hw - 0.15)], [e[0] + uz * s * (hw - 0.15), e[1] - ux * s * (hw - 0.15)], ya, ye, WR, bt, 'square', true, 3.0);
      // covered: posts off the deck, a beam each side and a small gable roof that follows the walkway's slope
      { const rb = renoBat(bt, 'roof'), Hp = 7.3, np = Math.max(2, Math.round(L / 6.5)), dir = V(e[0] - a[0], ye - ya, e[1] - a[1]);
        for (const s of [-1, 1]) {
          const ox = uz * s * (hw - 0.15), oz = -ux * s * (hw - 0.15);
          for (let i = 0; i <= np; i++) { const f = (i + 0.04 * (i === 0) - 0.04 * (i === np)) / np, x = a[0] + ux * L * f + ox, z = a[1] + uz * L * f + oz, y = ya + (ye - ya) * f; bb.aabox('extTrim', x - 0.17, y, z - 0.17, x + 0.17, y + Hp, z + 0.17); }
          bb.box('extTrim', V(a[0] + ox - Math.abs(uz) * 0.15, ya + Hp - 0.5, a[1] + oz - Math.abs(ux) * 0.15), dir, V(0, 0.5, 0), V(Math.abs(uz) * 0.3, 0, Math.abs(ux) * 0.3));
          // one roof slope: from the eave (0.7 ft past the posts) up to the ridge over the centerline
          const ex = uz * s * (hw + 0.7), ez = -ux * s * (hw + 0.7);
          rb.box({ def: 'extTrim', pv: 'shingle', nv: 'col:#b9c7c4' }, V(a[0] + ex - ux * 0.4, ya + Hp - 0.25, a[1] + ez - uz * 0.4), dir.clone().multiplyScalar((L + 0.8) / L), V(0, 0.3, 0), V(-ex, 1.9, -ez));
        }
        for (const f of [0, 1]) rb.face('scallop', [V(a[0] + ux * L * f + uz * (hw + 0.2), ya + (ye - ya) * f + Hp, a[1] + uz * L * f - ux * (hw + 0.2)), V(a[0] + ux * L * f - uz * (hw + 0.2), ya + (ye - ya) * f + Hp, a[1] + uz * L * f + ux * (hw + 0.2)), V(a[0] + ux * L * f, ya + (ye - ya) * f + Hp + 1.75, a[1] + uz * L * f)], V(f ? ux : -ux, 0, f ? uz : -uz));
      }
      // two trestle posts under the span
      for (const f of [0.34, 0.68]) for (const s of [-1, 1]) { const x = a[0] + ux * L * f + uz * s * 1.6, z = a[1] + uz * L * f - ux * s * 1.6, top = ya + (ye - ya) * f - 0.7; bb.aabox('extTrim', x - 0.25, G, z - 0.25, x + 0.25, top, z + 0.25); addSolid(V(x - 0.25, 0, z - 0.25), V(0.5, 0, 0), V(0, 0, 0.5), G, top, bt); }
    }
  }
}

// ------------------------------------------------------------------ yard plans
function soloStove(k) { // stainless smokeless fire pit (27" across) on its stand, centered
  k.cyl('col:#55524d', 0, 0, 1.25, 1.25, 0, 0.12, 20);
  k.cyl('steel', 0, 0, 1.12, 1.12, 0.12, 1.5, 24);
  k.cyl('col:#2a2927', 0, 0, 1.0, 1.0, 1.5, 1.52, 24);
  k.cyl('steel', 0, 0, 1.16, 1.16, 1.36, 1.52, 24, 1, false);
  for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; k.cbox('col:#3a3936', Math.cos(a) * 1.125, Math.sin(a) * 1.125, 0.09, 0.09, 0.3, 0.38); }
  for (const [x, z, r2] of [[0.2, 0.1, 20], [-0.3, 0.2, 70], [0.05, -0.3, 130]]) { const q = new Kit(k.bat, k.tag).at(k.P(x, 0, z).x, k.P(x, 0, z).z, k.oy + 1.42, r2); q.box(wood('#5b4332'), -0.7, 0, -0.12, 0.7, 0.24, 0.12); }
  k.cyl('bulb', 0, 0, 0.55, 0.15, 1.6, 2.3, 8);
  k.solid(-1.15, -1.15, 1.15, 1.15, 0, 1.5);
}
function firePitArea(tag, cx, cz, R, chairs = 5) {
  const b = renoBat(tag, 'site'), ftag = tag + '&furn', fb = renoBat(ftag, 'site');
  const ring = (r, n = 36) => [...Array(n)].map((_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * r, cz + Math.sin((i / n) * Math.PI * 2) * r]);
  b.poly('col:#b3aa98', ring(R), G + 0.07); b.poly('col:#6f6b62', ring(R + 0.3), G + 0.05);
  addFloorPoly(ring(R + 0.3, 16), [], G + 0.07, tag);
  b.poly('pavers', ring(2.6, 20), G + 0.09);
  item(new Kit(fb, ftag).at(cx, cz, G + 0.09, 0), (k) => soloStove(k), null, 'Solo Stove fire pit');
  for (let i = 0; i < chairs; i++) {
    const a = ((i + 0.5) / chairs) * Math.PI * 2, x = cx + Math.cos(a) * (R - 2.6), z = cz + Math.sin(a) * (R - 2.6);
    item(new Kit(fb, ftag).at(x, z, G + 0.07, (Math.atan2(cx - x, cz - z) * 180) / Math.PI), (k) => swap(k, { glb: 'Chair44' }, (h) => adirondack(h, i % 2 ? '#f1efe9' : '#6e2a2a')));
  }
  // firewood rack and two stump tables
  { const k = new Kit(b, tag).at(cx + R * 0.72, cz - R * 0.72, G, 45); for (const x of [-1.6, 1.6]) k.box('black', x - 0.05, 0, -0.5, x + 0.05, 3, 0.5); k.box('black', -1.6, 0.2, -0.5, 1.6, 0.3, 0.5); for (let r2 = 0; r2 < 4; r2++) for (let c = 0; c < 7; c++) k.cyl(wood(r2 % 2 ? '#8a6a48' : '#6f5238'), -1.3 + c * 0.44, 0, 0.2, 0.2, 0.3 + r2 * 0.42, 0.7 + r2 * 0.42, 8); k.solid(-1.6, -0.5, 1.6, 0.5, 0, 2.2); }
  // string lights on four posts
  const posts = [0.25, 0.75, 1.25, 1.75].map((f) => [cx + Math.cos(f * Math.PI) * (R + 0.6), cz + Math.sin(f * Math.PI) * (R + 0.6)]);
  for (const [x, z] of posts) { b.aabox(wood('#4a3a2c'), x - 0.15, G, z - 0.15, x + 0.15, G + 9.5, z + 0.15); addSolid(V(x - 0.15, 0, z - 0.15), V(0.3, 0, 0), V(0, 0, 0.3), G, G + 9.5, tag); }
  posts.forEach(([x, z], i) => { const [x2, z2] = posts[(i + 1) % 4]; for (let j = 1; j < 9; j++) { const t = j / 9, sag = Math.sin(t * Math.PI) * 1.1; b.aabox('bulb', x + (x2 - x) * t - 0.09, G + 9.2 - sag, z + (z2 - z) * t - 0.09, x + (x2 - x) * t + 0.09, G + 9.4 - sag, z + (z2 - z) * t + 0.09); } });
  label(tag, 'Fire pit', 'Solo Stove · Adirondack chairs · pea gravel', cx, cz + 2);
}
function playArea(tag, cx, cz, w, d, rot) {
  const b = renoBat(tag, 'site');
  const kk = new Kit(b, tag).at(cx, cz, G, rot);
  kk.prism({ top: 'mulch', side: 'cedar' }, [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]], 0, 0.12);
  for (const [x0, z0, x1, z1] of [[-w / 2 - 0.3, -d / 2 - 0.3, w / 2 + 0.3, -d / 2], [-w / 2 - 0.3, d / 2, w / 2 + 0.3, d / 2 + 0.3], [-w / 2 - 0.3, -d / 2, -w / 2, d / 2], [w / 2, -d / 2, w / 2 + 0.3, d / 2]]) kk.box('cedar', x0, 0, z0, x1, 0.45, z1);
  const k = new Kit(b, tag).at(cx, cz, G + 0.1, rot + 90);
  const Wd = 'cedar', fx = -6.0;
  for (const x of [fx - 2.5, fx + 2.5]) for (const z of [-2.5, 2.5]) k.cbox(Wd, x, z, 0.33, 0.33, 0, 10.2);
  k.box(Wd, fx - 2.6, 4.8, -2.6, fx + 2.6, 5.05, 2.6);
  for (const z of [-2.5, 2.5]) for (let y = 5.3; y < 7.6; y += 0.45) k.box(Wd, fx - 2.5, y, z - 0.05, fx + 2.5, y + 0.3, z + 0.05);
  k.box(Wd, fx - 2.5, 5.05, -2.5, fx - 2.45, 7.6, 2.5);
  k.prof('col:#6e2a2a', [[-3.1, 10.0], [3.1, 10.0], [0, 12.4]], fx - 3.0, fx + 3.0);
  for (let y = 0.9; y < 4.8; y += 0.95) k.box(Wd, fx + 2.55, y, -1.0, fx + 2.75, y + 0.15, 1.0);
  k.box(Wd, fx + 2.55, 0, -1.1, fx + 2.75, 5.0, -0.95); k.box(Wd, fx + 2.55, 0, 0.95, fx + 2.75, 5.0, 1.1);
  b.box('col:#3f9a46', k.P(fx - 1.0, 4.85, 2.6), k.ez().multiplyScalar(Math.min(8.0, w / 2 - 3.2)).add(V(0, -4.7, 0)), V(0, 0.15, 0), k.ex().multiplyScalar(2.0));
  k.box(Wd, fx + 2.5, 8.6, -0.25, 8.6, 9.1, 0.25);
  for (const s of [-1, 1]) b.box(Wd, k.P(8.4, 0, s * 3.0), k.ez().multiplyScalar(-s * 2.8).add(V(0, 8.9, 0)), k.ex().multiplyScalar(0.33), k.ez().multiplyScalar(0.33));
  for (const [x, kind] of [[0.2, 'swing'], [3.2, 'swing'], [6.2, 'glider']]) {
    for (const dz of [-0.75, 0.75]) k.box('col:#8c8c8c', x - 0.03, 1.8, dz - 0.03, x + 0.03, 8.6, dz + 0.03);
    k.box(kind === 'swing' ? 'col:#1e1e1e' : 'col:#2f6fbf', x - 0.4, 1.6, -0.85, x + 0.4, 1.8, 0.85);
  }
  k.solid(fx - 2.8, -2.8, fx + 2.8, 2.8, 0, 10);
  label(tag, 'Play area', 'play fort · slide · swings', cx, cz);
}
function pergolaPatio(tag, cx, cz, w, d) {
  const b = renoBat(tag, 'site'), ftag = tag + '&furn', fb = renoBat(ftag, 'site'), y = G + 0.12;
  const poly = [[cx - w / 2, cz - d / 2], [cx + w / 2, cz - d / 2], [cx + w / 2, cz + d / 2], [cx - w / 2, cz + d / 2]];
  b.prism({ top: 'pavers', side: 'foundation' }, poly, G - 0.1, y); addFloorPoly(poly, [], y, tag);
  pergola(new Kit(b, tag).at(cx, cz, y, 0), -w / 2 + 1, w / 2 - 1, -d / 2 + 1, d / 2 - 1, 8.4);
  const t = new Kit(fb, ftag).at(cx, cz, y, 0);
  for (const [px, pz, r2] of swap(t, { glb: 'Table03', w: 6, d: 3.4, h: 2.5 }, (h) => diningTable(h, 6, 3.4, { color: '#5a5148' }))) { const p = t.P(px, 0, pz); swap(new Kit(fb, ftag).at(p.x, p.z, y, r2), { glb: 'Chair04' }, (h) => patioChair(h)); }
  label(tag, 'Dining pergola', 'pavers · cedar pergola · string lights', cx, cz);
}
function gardenBeds(tag, list) {
  const b = renoBat(tag, 'site');
  for (const [x, z, rot] of list) { const k = new Kit(b, tag).at(x, z, G, rot); k.box('cedar', -4, 0, -1.6, 4, 1.3, 1.6); k.box('col:#4a3628', -3.85, 1.0, -1.45, 3.85, 1.2, 1.45); for (let i = 0; i < 9; i++) k.cyl('col:#4c7a3a', -3.3 + i * 0.82, i % 2 ? 0.5 : -0.5, 0.3, 0.12, 1.2, 1.9 + (i % 3) * 0.3, 6); k.solid(-4, -1.6, 4, 1.6, 0, 1.3); }
}
function label(tag, name, dims, x, z) {
  const L = { ...LV.f1, id: 'site' };
  RENO_LABELS.push(...buildLabels(L, renoGroup(tag, 'site'), [{ name, dims, pts: [[x - 3, z - 3], [x + 3, z - 3], [x + 3, z + 3], [x - 3, z + 3]], y: G + 1 }]).map((l) => ((l.userData.rs = tag), (l.userData.level = 'ext'), l)));
}
// Where things go depends on which garage is there: [fire pit near the house, fire pit in the far corner,
// play area for plan A, play area for plan B, pergola, garden beds, hedge line]
const ZONES = {
  0: { fire: [49.5, 11.5, 7.2], fire2: [15, 54, 6.5], play: [30, 57.5, 24, 13, 0], play2: [49, 11.5, 20, 14, 0], perg: [55, 58.5, 13, 10], beds: [[44, 4.2, 0], [54, 4.2, 0]] },
  A: { fire: [45, 12.5, 7.5], fire2: [13.5, 13, 6.5], play: [16, 13.5, 22, 15, 0], play2: [45, 12, 22, 15, 0], perg: [58, 60.6, 13, 9], beds: [[30, 4.2, 0], [40, 4.2, 0]] },
  B: { fire: [53.5, 12, 6.3], fire2: [18, 58.6, 5.4], play: [26, 58.6, 26, 10.5, 0], play2: [53.5, 12, 13, 18, 90], perg: [52, 58.6, 13, 9.5], beds: [[49, 3.6, 0], [58, 3.6, 0]] },
  C: { fire: [49, 12.5, 7.5], fire2: [18, 58.6, 5.4], play: [26, 58.6, 26, 10.5, 0], play2: [49.5, 12, 21, 15, 0], perg: [52, 58.6, 13, 9.5], beds: [[42, 3.6, 0], [51.5, 3.6, 0]] },
};
function buildYards() {
  for (const gid of ['0', 'A', 'B', 'C']) {
    const z = ZONES[gid], gt = `gar:${gid}`;
    // A: fire pit courtyard near the house, play area in the far part of the yard
    firePitArea(`yard:A&${gt}`, z.fire[0], z.fire[1], z.fire[2]);
    playArea(`yard:A&${gt}`, ...z.play);
    // B: fire pit in the back corner under the trees, play area close to the house
    firePitArea(`yard:B&${gt}`, z.fire2[0], z.fire2[1], z.fire2[2], z.fire2[2] < 6 ? 4 : 5);
    playArea(`yard:B&${gt}`, ...z.play2);
    // C: garden rooms, no play set: fire pit courtyard, dining pergola, raised beds
    firePitArea(`yard:C&${gt}`, z.fire[0], z.fire[1], z.fire[2]);
    pergolaPatio(`yard:C&${gt}`, ...z.perg);
    gardenBeds(`yard:C&${gt}`, z.beds);
    // planting that comes with every plan: a hedge to screen the fire pit, hydrangeas along the back of the house
    for (const y of ['A', 'B', 'C']) {
      const tag = `yard:${y}&${gt}`, grp = renoGroup(tag, 'site'), P = new Plants();
      const f = y === 'B' ? z.fire2 : z.fire;
      for (let i = 0; i < 6; i++) { const a = Math.PI * (1.15 + i * 0.14); shrub(P, f[0] + Math.cos(a) * (f[2] + 2.2), Math.max(2.2, Math.min(63.5, f[1] + Math.sin(a) * (f[2] + 2.2))), 2.6, 2.6, i % 2 ? 'hydrangea' : 'box', 500 + i + gid.charCodeAt(0)); }
      if (y === 'C') for (const [bx, bz] of z.beds) shrub(P, bx + 6, bz, 2.2, 2.0, 'box', 620 + Math.round(bx));
      P.build(grp);
    }
  }
}


// ---- more yard pieces. Each takes a rectangle [x0, z0, x1, z1] and fits itself into it.
function diningPatio(tag, [x0, z0, x1, z1]) {
  const b = renoBat(tag, 'site'), ftag = tag + '&furn', fb = renoBat(ftag, 'site'), y = G + 0.12;
  const w = Math.min(18, x1 - x0), d = Math.min(15, z1 - z0), cx = x1 - w / 2, cz = (z0 + z1) / 2;
  const poly = rounded([[cx - w / 2, cz - d / 2, 2], [cx + w / 2, cz - d / 2, 2], [cx + w / 2, cz + d / 2, 2], [cx - w / 2, cz + d / 2, 2]]);
  b.prism({ top: 'pavers', side: 'foundation' }, poly, G - 0.1, y); addFloorPoly(poly, [], y, tag);
  const t = new Kit(fb, ftag).at(cx - 1.5, cz + 0.5, y, w > d ? 0 : 90);
  for (const [px, pz, r2] of swap(t, { glb: 'Table03', w: 6.5, d: 3.4, h: 2.5 }, (h) => diningTable(h, 6.5, 3.4, { color: '#6b5a48' }))) { const p = t.P(px, 0, pz); swap(new Kit(fb, ftag).at(p.x, p.z, y, r2), { glb: 'Chair04' }, (h) => patioChair(h)); }
  // umbrella over the table
  { const k = new Kit(b, tag).at(cx - 1.5, cz + 0.5, y, 0); k.cyl('col:#3a3a3a', 0, 0, 0.08, 0.08, 0, 8.2, 8); k.cyl('fab:#e9e2d2', 0, 0, 4.6, 0.2, 7.2, 8.4, 8); }
  // grill station at the edge
  item(new Kit(fb, ftag).at(cx + w / 2 - 1.4, cz - d / 2 + 2.6, y, -90), (k) => { k.box('col:#2b2b2b', -1.4, 0, -1.0, 1.4, 2.9, 1.0); k.box('steel', -1.3, 2.9, -0.95, 1.3, 3.9, 0.95); k.box('col:#8a6a48', -2.6, 2.75, -0.9, -1.4, 2.9, 0.9); k.box('col:#8a6a48', 1.4, 2.75, -0.9, 2.6, 2.9, 0.9); k.solid(-1.4, -1, 1.4, 1, 0, 3.9); }, null, 'grill');
  label(tag, 'Dining patio', 'pavers · table for six · grill', cx, cz);
}
function spaDeck(tag, [x0, z0, x1, z1]) {
  const b = renoBat(tag, 'site'), w = Math.min(15, x1 - x0), d = Math.min(15, z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, y = G + 0.5;
  const k = new Kit(b, tag).at(cx - w / 2, cz - d / 2, G, 0);
  k.box({ def: 'cedar', pv: 'col:#a98863' }, 0, 0, 0, w, 0.5, d); addFloorRect(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, y, tag);
  // hot tub (7 ft square) sunk half into the deck's corner
  k.box('col:#5a4a3c', 0.8, 0.5, d - 7.8, 7.8, 3.0, d - 0.8); k.box('col:#e9e6df', 1.0, 3.0, d - 7.6, 7.6, 3.1, d - 1.0); k.box('col:#4f9fb3', 1.5, 3.02, d - 7.1, 7.1, 3.14, d - 1.5);
  k.solid(0.8, d - 7.8, 7.8, d - 0.8, 0, 3.1);
  for (let i = 0; i < 2; i++) k.box('cedar', 7.8, 0.5, d - 5.5, 8.8 + i * 0.9, 1.3 + (1 - i) * 0.8, d - 3.0);
  // barrel sauna (6 ft across, 7 ft long) with a glass door end
  const sx = w - 7.6, R = 3.2, oct = [...Array(14)].map((_, i) => [3.6 + Math.cos((i / 14) * Math.PI * 2) * R, 0.5 + R + 0.25 + Math.sin((i / 14) * Math.PI * 2) * R]);
  k.prof('cedar', oct, sx, sx + 7, 'col:#8a6a48'); k.box('col:#2f3a3d', sx - 0.04, 1.0, 2.6, sx, 6.2, 4.6);
  for (const x of [sx + 1.2, sx + 5.8]) k.box('col:#4a3a2c', x - 0.25, 0.5, 1.2, x + 0.25, 1.3, 6.0);
  k.solid(sx, 0.5, sx + 7, 6.9, 0, 7.5);
  // slatted privacy screen on the two outer sides, string of planters
  for (let yy = 1.0; yy < 6.6; yy += 0.5) { k.box('cedar', 0, yy, d - 0.15, w, yy + 0.32, d); k.box('cedar', 0, yy, 0, 0.15, yy + 0.32, d); }
  for (const [xx, zz] of [[0.07, 0], [0.07, d], [w, d], [w / 2, d]]) k.cbox('col:#4a3a2c', xx, zz === d ? d - 0.07 : 0.07, 0.3, 0.3, 0.5, 6.9);
  k.solid(0, d - 0.2, w, d, 0, 6.6); k.solid(0, 0, 0.2, d, 0, 6.6);
  label(tag, 'Hot tub + sauna', 'cedar deck · barrel sauna · privacy screen', cx, cz);
}
function bocce(tag, [x0, z0, x1, z1]) { // court along the rectangle's long side
  const b = renoBat(tag, 'site'), long = x1 - x0 >= z1 - z0, len = Math.min(48, (long ? x1 - x0 : z1 - z0) - 1), wd = 9, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const k = new Kit(b, tag).at(cx, cz, G, long ? 0 : 90);
  k.box('cedar', -len / 2 - 0.4, 0, -wd / 2 - 0.4, len / 2 + 0.4, 0.55, wd / 2 + 0.4); k.box('col:#c9bfa6', -len / 2, 0.3, -wd / 2, len / 2, 0.56, wd / 2);
  for (const [bx, bz, c] of [[len * 0.3, 0.6, '#b33a2f'], [len * 0.33, -1.1, '#b33a2f'], [len * 0.27, 1.8, '#2f5a8b'], [len * 0.36, 0.2, '#2f5a8b'], [len * 0.31, -0.2, '#f1efe9']]) k.cyl('col:' + c, bx, bz, c === '#f1efe9' ? 0.08 : 0.18, 0.02, 0.56, c === '#f1efe9' ? 0.72 : 0.92, 10);
  { const p = k.P(0, 0, 0), a = k.P(-len / 2 - 0.4, 0, -wd / 2 - 0.4), c2 = k.P(len / 2 + 0.4, 0, wd / 2 + 0.4); addFloorRect(Math.min(a.x, c2.x), Math.min(a.z, c2.z), Math.max(a.x, c2.x), Math.max(a.z, c2.z), G + 0.56, tag); void p; }
  // a bench at one end
  k.box('cedar', -len / 2 - 3.2, 1.3, -2.5, -len / 2 - 1.8, 1.5, 2.5); for (const z of [-2.2, 2.2]) k.box('col:#4a3a2c', -len / 2 - 3.1, 0, z - 0.15, -len / 2 - 1.9, 1.3, z + 0.15); k.solid(-len / 2 - 3.2, -2.5, -len / 2 - 1.8, 2.5, 0, 1.5);
  label(tag, 'Bocce court', `${Math.round(len)} × ${wd} ft · crushed stone`, cx, cz);
}
function hoop(tag, x, z, rot) { // basketball hoop on the edge of the apron, backboard facing local +z
  const b = renoBat(tag, 'site'), k = new Kit(b, tag).at(x, z, G, rot);
  k.cbox('col:#2b2b2b', 0, -1.2, 0.5, 0.5, 0, 10.6); k.box('col:#2b2b2b', -0.2, 9.9, -1.2, 0.2, 10.3, 2.0);
  k.box('col:#f4f4f1', -3, 9.0, 2.0, 3, 12.5, 2.12); k.box('col:#c8452f', -1, 9.6, 2.12, 1, 11.1, 2.14); k.box('col:#f4f4f1', -0.9, 9.7, 2.13, 0.9, 11.0, 2.15);
  k.cyl('col:#d8642a', 0, 2.95, 0.78, 0.78, 10.0, 10.06, 16, 1, false); k.cyl('col:#f1efe9', 0, 2.95, 0.74, 0.5, 8.7, 10.0, 12, 1, false);
  k.solid(-0.3, -1.5, 0.3, -0.9, 0, 10.6);
  // painted key on the concrete
  for (const [x0, z0, x1, z1] of [[-6, 2.2, -5.8, 17], [5.8, 2.2, 6, 17], [-6, 16.8, 6, 17]]) k.box('col:#f1efe9', x0, 0.045, z0, x1, 0.055, z1);
  label(tag, 'Hoop', 'on the apron', k.P(0, 0, 9).x, k.P(0, 0, 9).z);
}
function kitchenGarden(tag, [x0, z0, x1, z1]) {
  const b = renoBat(tag, 'site'), w = x1 - x0, d = z1 - z0, cols = Math.max(2, Math.min(3, Math.floor((w - 9) / 5))), rows = Math.max(1, Math.min(3, Math.floor(d / 6)));
  b.poly('col:#b3aa98', [[x0, z0], [x1 - 9.5, z0], [x1 - 9.5, z1], [x0, z1]], G + 0.06);
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const k = new Kit(b, tag).at(x0 + 2.6 + i * ((w - 12) / Math.max(1, cols - 1) || 0), z0 + 2.6 + j * ((d - 5.2) / Math.max(1, rows - 1) || 0), G, 90);
    k.box('cedar', -2.2, 0, -1.6, 2.2, 1.3, 1.6); k.box('col:#4a3628', -2.05, 1.0, -1.45, 2.05, 1.2, 1.45);
    for (let q = 0; q < 6; q++) k.cyl(['col:#4c7a3a', 'col:#6a8f3c', 'col:#3f6a33'][(i + j + q) % 3], -1.6 + (q % 3) * 1.6, q < 3 ? -0.7 : 0.7, 0.42, 0.15, 1.2, 1.8 + ((i + q) % 3) * 0.35, 6);
    k.solid(-2.2, -1.6, 2.2, 1.6, 0, 1.3);
  }
  // small greenhouse (8 x 10) at the house end
  { const k = new Kit(b, tag).at(x1 - 4.5, (z0 + z1) / 2, G, 0), gw = 4, gl = Math.min(5, d / 2 - 0.5);
    k.box('foundation', -gw, 0, -gl, gw, 0.5, gl);
    for (const [a, c, e, f] of [[-gw, -gl, -gw + 0.12, gl], [gw - 0.12, -gl, gw, gl], [-gw, -gl, gw, -gl + 0.12], [-gw, gl - 0.12, gw, gl]]) k.box('glass', a, 0.5, c, e, 6.5, f);
    for (const xx of [-gw, gw - 0.15]) for (let zz = -gl; zz <= gl; zz += gl / 2) k.box('extTrim', xx, 0.5, zz - 0.08, xx + 0.15, 6.5, zz + 0.08);
    k.prof('glass', [[-gl, 6.5], [gl, 6.5], [gl, 6.62], [-gl, 6.62]], -gw, gw);
    for (const sg of [-1, 1]) b.box('glass', k.P(sg * gw, 6.5, -gl), k.ez().multiplyScalar(2 * gl), V(0, 0.08, 0), k.ex().multiplyScalar(-sg * gw).add(V(0, 2.6, 0)));
    for (const zz of [-gl, gl - 0.12]) k.prof('extTrim', [[zz, 6.5], [zz + 0.12, 6.5], [zz + 0.12, 6.6], [zz, 6.6]], -gw, gw);
    k.box('extTrim', -0.1, 9.0, -gl, 0.1, 9.2, gl);
    k.box('extTrim', -1.3, 0.5, gl - 0.02, 1.3, 6.4, gl + 0.06); k.box('glass', -1.1, 0.7, gl + 0.02, 1.1, 6.2, gl + 0.08);
    k.solid(-gw, -gl, gw, gl, 0, 6.5); }
  label(tag, 'Kitchen garden', 'raised beds · greenhouse · fruit trees', (x0 + x1) / 2 - 4, (z0 + z1) / 2);
}
function lawnGames(tag, x, z, rot) {
  const b = renoBat(tag, 'site'), k = new Kit(b, tag).at(x, z, G, rot);
  for (const xx of [-6, 6]) k.cbox('extTrim', xx, 0, 0.25, 0.25, 0, 6.5); k.box('extTrim', -6, 6.3, -0.12, 6, 6.55, 0.12);
  for (const xx of [-6, 6]) b.box('extTrim', k.P(xx - 0.1, 0, -4), k.ez().multiplyScalar(4).add(V(0, 6.4, 0)), V(0, 0.15, 0), k.ex().multiplyScalar(0.2));
  for (const [cx2, cz2] of [[-3, 14], [3, 14]]) { b.box('wood:#d9c9a8', k.P(cx2 - 1, 0.25, cz2 - 2), k.ex().multiplyScalar(2), V(0, 0.12, 0), k.ez().multiplyScalar(4).add(V(0, 0.75, 0))); }
}
// rectangles per garage: `near` = the yard by the back of the house, `far` = the other open part; hoop = [x, z, rot]
const RECTS = {
  0: { near: [40, 3, 60.5, 20], far: [5, 46, 44, 64], hoop: [70, 52.3, 180] },
  A: { near: [36, 3, 60.5, 21], far: [4, 4, 31, 22], hoop: [47, 57.2, 180] },
  B: { near: [46.5, 3.2, 60.5, 21], far: [3, 53.2, 60, 64.4], hoop: [26, 52.2, 180] },
  C: { near: [38, 3.2, 60.5, 21], far: [3, 53.2, 60, 64.4], hoop: [20, 52.2, 180] },
};
function buildYardsMore() {
  for (const gid of ['0', 'A', 'B', 'C']) {
    const z = ZONES[gid], r = RECTS[gid], gt = `gar:${gid}`, [fx0, fz0, fx1, fz1] = r.far;
    // D: dining patio by the house, fire pit out in the yard, open lawn with a goal and cornhole
    diningPatio(`yard:D&${gt}`, r.near);
    firePitArea(`yard:D&${gt}`, z.fire2[0], z.fire2[1], z.fire2[2], z.fire2[2] < 6 ? 4 : 5);
    if (fx1 - fx0 > 30) lawnGames(`yard:D&${gt}`, fx1 - 9, (fz0 + fz1) / 2, 90);
    // E: game yard: hoop on the apron, bocce court, fire pit by the house
    hoop(`yard:E&${gt}`, ...r.hoop);
    bocce(`yard:E&${gt}`, fx1 - fx0 >= fz1 - fz0 ? [fx0, (fz0 + fz1) / 2 - 5, fx1, (fz0 + fz1) / 2 + 5] : r.far);
    firePitArea(`yard:E&${gt}`, z.fire[0], z.fire[1], z.fire[2]);
    // F: spa retreat: hot tub + barrel sauna on a deck by the house, fire pit in the far corner
    spaDeck(`yard:F&${gt}`, r.near);
    firePitArea(`yard:F&${gt}`, z.fire2[0], z.fire2[1], z.fire2[2], z.fire2[2] < 6 ? 4 : 5);
    // G: kitchen garden: beds on gravel + greenhouse by the house, fruit trees, fire pit in the far corner
    kitchenGarden(`yard:G&${gt}`, r.near);
    firePitArea(`yard:G&${gt}`, z.fire2[0], z.fire2[1], z.fire2[2], z.fire2[2] < 6 ? 4 : 5);
    { const tag = `yard:G&${gt}`, P = new Plants(); for (let i = 0; i < 3; i++) shadeTree(P, fx0 + (fx1 - fx0) * (0.55 + i * 0.17), fz1 - 3 - (i % 2) * 1.5, { h: 11, R: 4.2, seed: 140 + i, lod: 1, trunk: 3, rt: 0.22, leaders: 3, leaves: ['oval:linden'], card: 1.3, density: 1.5 }); P.build(renoGroup(tag, 'site')); }
    { const tag = `yard:F&${gt}`, P = new Plants(); for (let i = 0; i < 5; i++) arborvitae(P, r.near[0] - 1.5, r.near[1] + 2 + i * 3.4, 9, 200 + i); P.build(renoGroup(tag, 'site')); }
  }
}

// ------------------------------------------------------------------ front yard
function buildFront() {
  const rs = 'on:front', b = renoBat(rs, 'site'), grp = renoGroup(rs, 'site');
  // deeper, curved beds around the street gable and north side, and one along the porch
  b.poly('mulch', rounded([[113.9, 12, 2], [121, 10.5, 4], [123, 22, 5], [121.5, 32.6, 4], [114, 32.6]]), G + 0.05);
  b.poly('mulch', rounded([[99.6, 9.8], [113.9, 9.8, 2], [113.9, 15.6], [99.6, 15.6]]), G + 0.05);
  b.poly('mulch', rounded([[111, 38.9], [116.5, 39.4, 2], [116.5, 41.6, 2], [100, 41.4, 1], [100, 38.9]].slice(0, 0).concat([[76, 51.2], [100, 51.4, 1], [100, 53.6, 1], [76, 53.4]])), G + 0.05);
  // brick-paver front walk laid over the concrete one, with a landing at the steps
  ribbon(b, 'pavers', [[113.6, 35.4], [118, 35.5], [126, 36.6], [133.4, 37.3]], 4.6, G + 0.07, rs);
  // white picket fence along the front line with a gate at the walk, returning a few feet up the north line
  const picket = (a, c) => {
    const l = Math.hypot(c[0] - a[0], c[1] - a[1]), ux = (c[0] - a[0]) / l, uz = (c[1] - a[1]) / l;
    for (const y of [0.7, 2.2]) b.box('extTrim', V(a[0] - uz * 0.04, G + y, a[1] + ux * 0.04), V(ux * l, 0, uz * l), V(0, 0.25, 0), V(uz * 0.08, 0, -ux * 0.08));
    for (let s = 0.2; s < l; s += 0.42) b.box('extTrim', V(a[0] + ux * s - uz * 0.08, G + 0.15, a[1] + uz * s + ux * 0.08), V(ux * 0.24, 0, uz * 0.24), V(0, 2.85, 0), V(uz * 0.07, 0, -ux * 0.07));
    for (const s of [0, l]) b.aabox('extTrim', a[0] + ux * s - 0.2, G, a[1] + uz * s - 0.2, a[0] + ux * s + 0.2, G + 3.5, a[1] + uz * s + 0.2);
    addSolid(V(a[0] - uz * 0.1, 0, a[1] + ux * 0.1), V(ux * l, 0, uz * l), V(uz * 0.2, 0, -ux * 0.2), G, G + 3, rs);
  };
  picket([131.6, 1], [131.6, 34.6]); picket([131.6, 1], [112, 1]);
  // an arbor over the gate
  { const k = new Kit(b, rs).at(131.6, 37.2, G, 0); for (const z of [-2.5, 2.5]) for (const x of [-0.9, 0.9]) k.cbox('extTrim', x, z, 0.3, 0.3, 0, 7.6); for (const z of [-2.5, 2.5]) k.box('extTrim', -1.4, 7.4, z - 0.12, 1.4, 7.8, z + 0.12); for (let x = -1.2; x <= 1.2; x += 0.6) k.box('extTrim', x - 0.08, 7.8, -3.1, x + 0.08, 8.05, 3.1); }
  const P = new Plants();
  // boxwood hedge under the gable windows, white hydrangeas behind and at the corners, columnar evergreens at the house corners
  for (let z = 17.2, i = 0; z < 31.5; z += 2.3, i++) shrub(P, 115.9, z, 2.2, 2.0, 'box', 700 + i);
  for (const [x, z] of [[118.6, 13.5], [119.8, 19], [120.2, 25], [119.6, 30.2], [110.5, 12.2], [105.5, 12.3], [101.2, 12.3]]) shrub(P, x, z, 3.2, 2.9, 'hydrangea', Math.round(x * 7 + z));
  arborvitae(P, 115.2, 14.2, 9, 71); arborvitae(P, 115.4, 33.9, 7, 73);
  for (let x = 78, i = 0; x < 99; x += 3.4, i++) shrub(P, x, 52.4, 2.4, 2.2, i % 2 ? 'hydrangea' : 'box', 760 + i);
  // an ornamental tree (serviceberry) in the north-east lawn
  shadeTree(P, 124.5, 9.5, { h: 16, R: 6.5, seed: 91, lod: 1, trunk: 4.5, rt: 0.3, leaders: 3, leaves: ['oval:linden'], card: 1.5, density: 1.4 });
  P.build(grp);
  label(rs, 'Front garden', 'boxwood + hydrangea beds · picket fence · paver walk', 122, 22);
}

export function buildRenovations() {
  for (const id of ['A', 'B', 'C']) buildGarage(id);
  buildMudroom();
  buildLinks();
  buildYards();
  buildYardsMore();
  buildFront();
}
export { shaker, pendant, orb, linearPendant };
