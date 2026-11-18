// Renovation options. Each one adds geometry to an 'on:<name>' set; the as-built parts it replaces
// are tagged 'off:<name>' elsewhere (data.js walls, furnish.js fixtures, build.js roofs, site.js).
//   open      open floor plan: sun room / family / living / foyer walls come out, beams stay
//   kitchen   kitchen remodel: shaker cabinets, 36" range + hood, built-in fridge wall, 9 ft island
//   pbath     primary bath remodel: walk-in shower, water closet, 66" double vanity, linen tower
//   addition  rear addition: mudroom + scullery behind the garage, dining addition off the kitchen,
//             sun room stretched 12 ft, new patio
//   garage2   detached 2-car garage/studio at the end of a longer driveway (golf / pottery / gym)
import * as THREE from 'three';
import { toFt, LEVELS } from './data.js';
import { Kit, V, addFloorPoly, addSolid, pip } from './geom.js';
import { LV, P, CTX, renoBat, renoGroup, roleRoom, buildWall, buildLabels, gableRoof, leanRoof, gableTri, buildSunroomGable, ROOFT } from './build.js';
import {
  toilet, vanity, lightBar, diningTable, chair, buffet, firePit, adirondack, patioDining, patioChair, powerRack, liftBench, dumbbellRack,
  pelotonBike, rubberFloor, shelving, recessed, flushDome, rug, sofa, armchair, coffeeTable, floorLamp, plant, runKit, IRON, RUBBER, disc,
  bar, taperLeg, knob, bench,
} from './furnish.js';

const fab = (c) => 'fab:' + c;
export const RENO_LABELS = [];
export const RENO_ROOMS = []; // { rs, level, room } for the walk-mode room readout

// ------------------------------------------------------------------ shaker cabinetry
function shaker(k, x0, x1, y0, y1, z, frame = 'cabDoor', panel = 'cabPanel') {
  const m = Math.min(0.22, (x1 - x0) * 0.2, (y1 - y0) * 0.2);
  k.box(frame, x0, y0, z, x0 + m, y1, z + 0.07); k.box(frame, x1 - m, y0, z, x1, y1, z + 0.07);
  k.box(frame, x0 + m, y0, z, x1 - m, y0 + m, z + 0.07); k.box(frame, x0 + m, y1 - m, z, x1 - m, y1, z + 0.07);
  k.box(panel, x0 + m, y0 + m, z, x1 - m, y1 - m, z + 0.035);
}
const pull = (k, x, y, z, vertical = false) => (vertical ? k.box('black', x - 0.025, y - 0.35, z + 0.07, x + 0.025, y + 0.35, z + 0.13) : k.box('black', x - 0.3, y - 0.025, z + 0.07, x + 0.3, y + 0.025, z + 0.13));
function baseRun(k, x0, x1, o = {}) {
  const d = 1.95, cab = o.cab || 'cab', fr = o.frame || 'cabDoor', pn = o.panel || 'cabPanel';
  k.box(cab, x0, 0.35, 0, x1, 2.92, d);
  k.box('blackMatte', x0, 0, 0, x1, 0.35, d - 0.25);
  const w = x1 - x0, n = Math.max(1, Math.round(w / 1.6)), cw = w / n;
  for (let i = 0; i < n; i++) {
    const a = x0 + i * cw + 0.02, b = x0 + (i + 1) * cw - 0.02;
    if (o.drawers) { for (const [ya, yb] of [[2.2, 2.88], [1.3, 2.16], [0.4, 1.26]]) { shaker(k, a, b, ya, yb, d, fr, pn); pull(k, (a + b) / 2, yb - 0.18, d); } }
    else { shaker(k, a, b, 2.3, 2.88, d, fr, pn); pull(k, (a + b) / 2, 2.6, d); shaker(k, a, b, 0.4, 2.26, d, fr, pn); pull(k, i % 2 ? a + 0.18 : b - 0.18, 1.95, d, true); }
  }
}
function upperRun(k, x0, x1, y0 = 4.55, y1 = 7.25) {
  const d = 1.05;
  k.box('cab', x0, y0, 0, x1, y1, d);
  k.box('cabDoor', x0 - 0.04, y1, 0, x1 + 0.04, y1 + 0.18, d + 0.1);
  const w = x1 - x0, n = Math.max(1, Math.round(w / 1.4)), cw = w / n;
  for (let i = 0; i < n; i++) { const a = x0 + i * cw + 0.02, b = x0 + (i + 1) * cw - 0.02; shaker(k, a, b, y0 + 0.05, y1 - 0.05, d); pull(k, i % 2 ? a + 0.18 : b - 0.18, y0 + 0.45, d, true); }
}
function counterTop(k, x0, x1, d = 2.1, splashTop = 4.55) {
  k.box('counter', x0, 2.92, 0, x1, 3.08, d);
  if (splashTop) k.box('backsplash', x0, 3.08, 0, x1, splashTop, 0.04);
}
function farmSink(k, xc) {
  k.box('porcelain', xc - 1.5, 1.95, 1.7, xc + 1.5, 3.0, 2.02);
  k.box('col:#e3e1dc', xc - 1.35, 3.081, 0.35, xc + 1.35, 3.086, 1.75);
  k.cyl('black', xc, 0.25, 0.06, 0.05, 3.08, 4.2, 8); k.box('black', xc - 0.04, 4.1, 0.25, xc + 0.04, 4.18, 0.95);
}
function proRange(k, x0, x1) { // 36" range with a chimney hood
  const d = 2.2;
  k.box('steel', x0, 0, 0, x1, 3.0, d);
  k.box('black', x0, 3.0, 0, x1, 3.05, d);
  for (const zz of [0.6, 1.6]) for (let i = 0; i < 3; i++) k.cbox('blackMatte', x0 + 0.5 + i * ((x1 - x0 - 1) / 2), zz, 0.85, 0.85, 3.05, 3.12);
  k.box('black', x0 + 0.25, 0.55, d, x1 - 0.25, 2.2, d + 0.02);
  k.box('chrome', x0 + 0.3, 2.3, d + 0.02, x1 - 0.3, 2.37, d + 0.15);
  for (let i = 0; i < 6; i++) k.cyl('chrome', x0 + 0.35 + i * ((x1 - x0 - 0.7) / 5), d + 0.06, 0.09, 0.09, 2.6, 2.75, 10);
  k.prof('steel', [[0, 5.6], [2.0, 5.6], [2.0, 5.85], [0.9, 6.5], [0, 6.5]], x0 - 0.1, x1 + 0.1);
  k.box('steel', (x0 + x1) / 2 - 0.55, 6.5, 0, (x0 + x1) / 2 + 0.55, 8.0, 0.9);
  k.box('backsplash', x0, 3.05, 0, x1, 5.6, 0.04);
  k.solid(x0, 0, x1, d, 0, 3.05);
}
function builtInFridge(k, x0, x1) {
  const d = 2.1;
  k.box('steel', x0, 0, 0, x1, 6.9, d);
  const xm = (x0 + x1) / 2;
  k.box('black', xm - 0.01, 2.5, d, xm + 0.01, 6.85, d + 0.01); k.box('black', x0, 2.45, d, x1, 2.5, d + 0.01);
  for (const x of [xm - 0.15, xm + 0.15]) k.box('black', x - 0.03, 3.4, d + 0.04, x + 0.03, 5.8, d + 0.16);
  k.box('black', x0 + 0.4, 2.1, d + 0.04, x1 - 0.4, 2.16, d + 0.16);
  k.box('cab', x0, 6.9, 0, x1, 7.43, 2.1);
  shaker(k, x0 + 0.02, x1 - 0.02, 6.92, 7.41, 2.1);
  k.solid(x0, 0, x1, d, 0, 7);
}
function tallPantry(k, x0, x1) {
  k.box('cab', x0, 0.35, 0, x1, 7.43, 2.0); k.box('blackMatte', x0, 0, 0, x1, 0.35, 1.75);
  const xm = (x0 + x1) / 2;
  for (const [a, b] of [[x0 + 0.02, xm - 0.01], [xm + 0.01, x1 - 0.02]]) { shaker(k, a, b, 3.6, 7.4, 2.0); shaker(k, a, b, 0.4, 3.55, 2.0); }
  pull(k, xm - 0.15, 3.6, 2.0, true); pull(k, xm + 0.15, 3.6, 2.0, true);
  k.solid(x0, 0, x1, 2.0, 0, 7.4);
}
function island(k, w = 9, d = 4) { // centered; working side faces +z, seating overhang on -z
  k.box('island', -w / 2 + 0.1, 0.35, -d / 2 + 1.0, w / 2 - 0.1, 2.92, d / 2);
  k.box('blackMatte', -w / 2 + 0.2, 0, -d / 2 + 1.1, w / 2 - 0.2, 0.35, d / 2 - 0.25);
  const n = Math.round(w / 1.8), cw = (w - 0.2) / n;
  for (let i = 0; i < n; i++) {
    const a = -w / 2 + 0.1 + i * cw + 0.02, b = a + cw - 0.04;
    shaker(k, a, b, 2.3, 2.88, d / 2, 'island', 'island'); pull(k, (a + b) / 2, 2.6, d / 2);
    shaker(k, a, b, 0.4, 2.26, d / 2, 'island', 'island'); pull(k, (a + b) / 2, 2.0, d / 2);
  }
  k.box('counter', -w / 2, 2.92, -d / 2, w / 2, 3.1, d / 2 + 0.08);
  k.box('counter', -w / 2, 0, -d / 2, -w / 2 + 0.18, 2.92, d / 2 + 0.08); // waterfall ends
  k.box('counter', w / 2 - 0.18, 0, -d / 2, w / 2, 2.92, d / 2 + 0.08);
  k.solid(-w / 2, -d / 2 + 0.6, w / 2, d / 2, 0, 3.1);
}
function stool(k, color = '#c9b8a0') { // counter stool, 26" seat, faces +z
  for (const [x, z] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) k.cyl('black', x, z, 0.04, 0.05, 0, 2.15, 6);
  k.box('black', -0.5, 0.8, -0.5, 0.5, 0.85, 0.5);
  k.soft(fab(color), -0.7, 2.1, -0.65, 0.7, 2.35, 0.65, 0.1);
  k.soft(fab(color), -0.65, 2.3, -0.72, 0.65, 3.25, -0.55, 0.08);
}
function pendant(k, ceilY, hang) {
  const y = ceilY - hang;
  k.cyl('black', 0, 0, 0.2, 0.2, ceilY - 0.06, ceilY, 10);
  k.cyl('black', 0, 0, 0.015, 0.015, y + 0.9, ceilY - 0.06, 4);
  k.cyl('shade', 0, 0, 0.12, 0.55, y + 0.4, y + 0.9, 14); k.cyl('shade', 0, 0, 0.55, 0.35, y, y + 0.4, 14);
}

function buildKitchenRemodel() {
  const bat = renoBat('on:kitchen', 'f1'), TAG = 'on:kitchen';
  const f = (x, y) => P(LV.f1, x, y);
  // sink wall: farmhouse sink under the window, dishwasher, uppers flanking the window
  {
    const { k } = runKit(bat, TAG, f(846.6, 360.4), f(1052, 360.4), [0, 1]);
    baseRun(k, 0, 2.2); baseRun(k, 2.2, 5.65); baseRun(k, 7.6, 8.72, { drawers: true });
    k.box('steel', 5.65, 0.4, 1.95, 7.6, 2.88, 2.0); k.box('black', 5.75, 2.55, 2.0, 7.5, 2.85, 2.01); // dishwasher
    k.box('cab', 5.65, 0.35, 0, 7.6, 2.92, 1.95);
    counterTop(k, 0, 8.72, 2.1, 0);
    k.box('backsplash', 0, 3.08, 0, 2.2, 4.55, 0.04); k.box('backsplash', 2.2, 3.08, 0, 5.65, 3.45, 0.04); k.box('backsplash', 5.65, 3.08, 0, 8.72, 4.55, 0.04);
    farmSink(k, 3.92);
    upperRun(k, 0, 2.1); upperRun(k, 5.75, 8.0);
    k.solid(0, 0, 8.72, 2.1, 0, 3.08);
  }
  // range wall: 36" range + chimney hood centered, drawers either side
  {
    const { k, u } = runKit(bat, TAG, f(846.6, 407.6), f(846.6, 581), [1, 0]);
    const s = (y) => u(f(846.6, y));
    const r0 = Math.min(s(440), s(516)), r1 = Math.max(s(440), s(516));
    const a = Math.min(s(407.6), s(440)), b = Math.max(s(407.6), s(440)), c = Math.min(s(516), s(578)), d = Math.max(s(516), s(578));
    baseRun(k, a, b, { drawers: true }); counterTop(k, a, b); upperRun(k, a, b);
    proRange(k, r0, r1);
    baseRun(k, c, d, { drawers: true }); counterTop(k, c, d); upperRun(k, c, d);
    k.solid(a, 0, d, 2.1, 0, 3.08);
  }
  // fridge / pantry wall (where the old pantry was), with a coffee counter
  {
    const { k, u } = runKit(bat, TAG, f(846.6, 699.9), f(1039, 699.9), [0, -1]);
    const s = (x) => u(f(x, 699.9));
    const p = (x0, x1) => [Math.min(s(x0), s(x1)), Math.max(s(x0), s(x1))];
    builtInFridge(k, ...p(846.6, 933));
    tallPantry(k, ...p(933, 990));
    const [c0, c1] = p(990, 1039);
    baseRun(k, c0, c1); counterTop(k, c0, c1); k.box('cabDoor', c0, 4.6, 0, c1, 4.7, 1.0); k.box('cabDoor', c0, 5.6, 0, c1, 5.7, 1.0);
    k.cyl('black', c0 + 1.0, 0.8, 0.35, 0.35, 3.08, 4.2, 12);
    k.solid(c0, 0, c1, 2.1, 0, 3.08);
  }
  // 9 ft island with waterfall ends, seating on the nook side
  const [ix, iz] = f(1116, 530);
  const ik = new Kit(bat, TAG).at(ix, iz, 0, 180);
  island(ik, 9, 4);
  for (const dx of [-2.2, 0, 2.2]) {
    const p = ik.P(dx, 0, -2.6);
    stool(new Kit(bat, TAG).at(p.x, p.z, 0, 0));
    pendant(new Kit(bat, TAG).at(ix + dx, iz, 0), 8, 2.15);
  }
}

// ------------------------------------------------------------------ open plan
function buildOpenPlan() {
  const bat = renoBat('on:open', 'f1');
  const k = new Kit(bat, 'on:open');
  const f = (x, y) => toFt([x, y]);
  // dropped beams where the bearing walls were
  const [a0, za] = f(1420.5, 310.5), [a1] = f(1703.5, 0);
  k.box('ceiling', a0, 7.25, za - 0.3, a1, 8.0, za + 0.3);
  const [b0, zb] = f(1422, 626.5), [b1] = f(1703.5, 0);
  k.box('ceiling', b0, 7.4, zb - 0.3, b1, 8.0, zb + 0.3);
  const [xc, zc0] = f(1422, 626.5), [, zc1] = f(0, 866);
  k.box('ceiling', xc - 0.3, 7.4, zc0, xc + 0.3, 8.0, zc1);
  for (const [x, z] of [[a0, za], [a1, za], [b1, zb]]) { k.cbox('trim', x + (x > 55 ? -0.3 : 0.3), z, 0.6, 0.6, 0, 7.3); addSolid(V(x - 0.3, 0, z - 0.3), V(0.6, 0, 0), V(0, 0, 0.6), 0, 8, 'on:open'); }
}

// ------------------------------------------------------------------ primary bath remodel
function buildPrimaryBath() {
  const L = LV.f2, rs = 'on:pbath', bat = renoBat(rs, 'f2');
  const rooms = [
    { name: 'Shower', floor: 'tile4', wall: 'tile:#ecebe7', noLabel: true, poly: [[384, 52.5], [673, 52.5], [673, 240], [400, 240], [400, 111.5], [384, 111.5]] },
    { name: 'Water Closet', dims: "3'7\" x 4'4\"", floor: 'tileBeige', wall: 'paint:#f2f0ea', poly: [[270, 111.5], [400, 111.5], [400, 270], [270, 270]] },
    { name: 'Primary Bath', dims: 'remodel: walk-in shower, WC, double vanity', floor: 'tileBeige', wall: 'paint:#f2f0ea', poly: [[270, 270], [400, 270], [400, 240], [673, 240], [673, 477], [270, 477]] },
  ].map((r, i) => roleRoom(L, r, i, 'pb'));
  const drop = new Set(['Shower', 'Primary Bath']);
  CTX.rooms = [...rooms, ...L._rooms.filter((r) => !drop.has(r.name) && !(r.name === 'Linen' && r.poly[0][0] === 581))];
  for (const w of [
    [673, 111.5, 673, 477, 'i'],
    [400, 111.5, 400, 270, 'i'],
    [270, 270, 400, 270, 'i', [[292, 378, 'd', { hinge: 'lo', into: '+y' }]]],
  ]) buildWall(L, [...w.slice(0, 5), w[5] || [], { rs }], bat);
  CTX.rooms = null;
  for (const r of rooms) { bat.poly(r.floorKey, r.pts, 9.035); RENO_ROOMS.push({ rs, level: 'f2', room: r }); }
  RENO_LABELS.push(...buildLabels(L, renoGroup(rs, 'f2'), rooms).map((l) => ((l.userData.rs = rs), l)));
  const at = (x, y, rot = 0) => { const [lx, lz] = P(L, x, y); return new Kit(bat, rs).at(lx, lz, 9, rot); };
  // curbless walk-in shower: glass panel with a black frame, open entry at the vanity end, bench, rain head
  {
    const A = P(L, 400, 240), B = P(L, 600, 240);
    const { k, len } = runKit(bat, rs, A, B, [0, -1], 9);
    k.box('showerGlass', 0, 0.05, -0.02, len, 7.0, 0.02);
    for (const x of [0, len - 0.05]) k.box('black', x, 0.05, -0.03, x + 0.05, 7.0, 0.03);
    k.box('black', 0, 7.0, -0.03, len, 7.05, 0.03);
    k.solid(0, -0.05, len, 0.05, 0, 7);
    const bk = at(560, 58.9, 0); bk.box('tile:#ecebe7', -2.6, 0, 0, 2.6, 1.5, 1.3); bk.solid(-2.6, 0, 2.6, 1.3, 0, 1.5);
    const hk = at(536, 160, 0); hk.cyl('black', 0, 0, 0.02, 0.02, 7.3, 8, 4); hk.cyl('chrome', 0, 0, 0.55, 0.55, 7.25, 7.3, 18);
    const vk = at(666.6, 160, -90); vk.box('black', -0.1, 3.4, 0, 0.1, 3.8, 0.12); vk.box('black', -0.04, 3.6, 0.12, 0.04, 5.6, 0.16);
  }
  toilet(at(279.2, 190, 90));
  vanity(at(666.6, 362, -90), 5.6, 2, { mirrorTop: 7.0, faucet: 'black', frame: 'black' });
  lightBar(at(666.6, 362, -90), 5.0, 7.3, 3, 'black');
  { const k = at(279.2, 330, 90); k.box('cab', -1.1, 0.35, 0, 1.1, 7.3, 1.6); k.box('blackMatte', -1.1, 0, 0, 1.1, 0.35, 1.4);
    k.box('cabDoor', -1.08, 3.7, 1.6, -0.01, 7.25, 1.67); k.box('cabDoor', 0.01, 3.7, 1.6, 1.08, 7.25, 1.67); k.box('cabDoor', -1.08, 0.4, 1.6, 1.08, 3.6, 1.67);
    k.solid(-1.1, 0, 1.1, 1.6, 0, 7.3); }
  recessed(at(536, 160), 8); recessed(at(470, 380), 8); recessed(at(335, 190), 8);
}

// ------------------------------------------------------------------ rear addition
const ADD_ROOMS = [
  { name: 'Mudroom', dims: "12'8\" x 11'9\" (addition)", floor: 'slate', wall: 'paint:#ece4d4', poly: [[260.5, 115.5], [560, 115.5], [560, 392.5], [260.5, 392.5]] },
  { name: 'Scullery / Pantry', dims: "12'1\" x 11'9\" (addition)", floor: 'oak', wall: 'paint:#ece4d4', poly: [[560, 115.5], [845, 115.5], [845, 392.5], [560, 392.5]] },
  { name: 'Dining (addition)', dims: "24'5\" x 15' added", floor: 'oak', wall: 'paint:#ece4d4',
    poly: [[845, -100], [1420.5, -100], [1420.5, 310.5], [1308, 310.5], [1250, 250], [1112, 250], [1054, 308], [1054, 354.5], [845, 354.5]] },
  { name: 'Sun Room (extended)', dims: "11'6\" x 22'9\"", floor: 'slate', wall: 'paint:#c3d0c6', poly: [[1420.5, -238], [1703.5, -238], [1703.5, 49.5], [1420.5, 49.5]] },
];
const ADD_FOOT = [[[255, 110], [851, 110], [851, 392.5], [255, 392.5]], [[839.5, -105.5], [1426, -105.5], [1426, 360], [839.5, 360]], [[1415, -243], [1709, -243], [1709, 60], [1415, 60]]];
const ADD_WALLS = [
  [260.5, 110, 260.5, 392.5, 'e', [[150, 215, 'x', { hinge: 'lo', into: '+x', style: 'half', color: '#f2f2ee' }], [270, 340, 'w']]],
  [255, 115.5, 851, 115.5, 'e', [[320, 400, 'w'], [640, 720, 'w', { g: 'cs2', sill: 3.6, head: 6.8 }]]],
  [560, 115.5, 560, 392.5, 'i', [[200, 310, 'o']]],
  [255, 392.5, 847, 392.5, 'i', [[300, 365, 'd', { hinge: 'lo', into: '-y' }], [587, 649, 'd', { hinge: 'lo', into: '+y' }]]],
  [845, 115.5, 845, 392.5, 'i', [[170, 330, 'o']]],
  [845, -105.5, 845, 115.5, 'e', [[-60, 20, 'w'], [35, 100, 'w']]],
  [839.5, -100, 1426, -100, 'e', [[880, 990, 'w', { sill: 1.6, g: 'cs2', rows: 5 }], [1050, 1230, 's'], [1280, 1390, 'w', { sill: 1.6, g: 'cs2', rows: 5 }]]],
  [1420.5, -100, 1420.5, 310.5, 'i', [[-40, 280, 'o']]],
  [1420.5, -243, 1420.5, -100, 'e', [[-215, -125, 'w', { g: 'cs', rows: 5, sill: 1.6, head: 7.4 }]]],
  [1703.5, -243, 1703.5, 44, 'e', [[-205, -115, 'w', { g: 'cs', rows: 5, sill: 1.6, head: 7.4 }], [-60, 30, 'w', { g: 'cs', rows: 5, sill: 1.6, head: 7.4 }]]],
];
function buildAddition() {
  const L = LV.f1, rs = 'on:addition', bat = renoBat(rs, 'f1');
  const rooms = ADD_ROOMS.map((r, i) => roleRoom(L, r, i, 'add'));
  CTX.rooms = [...rooms, ...L._rooms];
  CTX.foot = ADD_FOOT.map((poly) => poly.map(([x, y]) => toFt([x, y])));
  for (const w of ADD_WALLS) buildWall(L, [...w.slice(0, 5), w[5] || [], { rs }], bat);
  CTX.rooms = null; CTX.foot = null;
  for (const r of rooms) {
    RENO_ROOMS.push({ rs, level: 'f1', room: r });
    bat.prism({ top: 'subfloor', side: 'foundation' }, r.pts, -1, 0);
    bat.poly(r.floorKey, r.pts, 0.03);
    addFloorPoly(r.pts, [], 0, rs);
  }
  RENO_LABELS.push(...buildLabels(L, renoGroup(rs, 'f1'), rooms).map((l) => ((l.userData.rs = rs), l)));
  // ceilings (flat) for the mudroom wing and the dining addition; the sun room stays vaulted
  const cb = renoBat(rs, 'f2');
  cb.poly('ceiling', [[255, 110], [851, 110], [851, 392.5], [255, 392.5]].map(([x, y]) => toFt([x, y])), 8, [], true);
  cb.poly('ceiling', [[845, -100], [1420.5, -100], [1420.5, 392], [1031, 392], [1031, 354.5], [845, 354.5]].map(([x, y]) => toFt([x, y])), 8, [], true);
  // roofs
  const rb = renoBat(rs, 'roof');
  const [gx0] = toFt([255, 0]), [gx1] = toFt([847, 0]), [, gz0] = toFt([0, 115.5]), [, gzBack] = toFt([0, 392.5]);
  gableRoof(rb, { x0: gx0, x1: gx1, z0: gz0, z1: gzBack + 0.5, y: 9, p: 8 / 12, o: 1.0, rake: [1.0, 0], gable: [true, false] });
  const [dx0, dz1a] = toFt([845, 354.5]), [dxm] = toFt([1032, 0]), [dx1] = toFt([1420.5, 0]), [, dzE] = toFt([0, -100]), [, mz0] = toFt([0, 392]);
  const pp = 0.14;
  leanRoof(rb, { x0: dx0, x1: dxm, zWall: dz1a, zEave: dzE, y: 9, p: pp, o: 1.0, hip0: false, hip1: false });
  leanRoof(rb, { x0: dxm, x1: dx1, zWall: mz0, zEave: dzE, y: 9, p: pp, o: 1.0, hip0: false, hip1: false });
  gableTri(rb, [V(dx0, 9, dzE), V(dx0, 9, dz1a), V(dx0, 9 + (dz1a - dzE) * pp, dz1a)]);
  const [sx0] = toFt([1420.5, 0]), [sx1] = toFt([1703.5, 0]), [, sz0] = toFt([0, -238]);
  const sp = 10 / 12;
  gableRoof(rb, { x0: sx0, x1: sx1, z0: sz0, z1: mz0, y: 9, p: sp, o: 1.0, rake: [1.0, 0], gable: [false, false] });
  for (const za of [-9.5, -4.5, 3.3, 7.6]) {
    const zb = za + 2.3, xa = sx0 + 1.2, xb = sx0 + 3.6, ya = 9 + (xa - sx0) * sp + 0.06, yb = 9 + (xb - sx0) * sp + 0.06;
    rb.face('skylight', [V(xa, ya, za), V(xb, yb, za), V(xb, yb, zb), V(xa, ya, zb)], V(-0.6, 1, 0));
    bat.face('white', [V(xa, ya - ROOFT - 0.02, za), V(xb, yb - ROOFT - 0.02, za), V(xb, yb - ROOFT - 0.02, zb), V(xa, ya - ROOFT - 0.02, zb)], V(0.6, -1, 0));
  }
  buildSunroomGable(renoGroup(rs, 'f1'), -238, rs);
  // mudroom lockers, scullery counters, dining set, sun room seating
  const at = (x, y, rot = 0, y0 = 0) => { const [lx, lz] = P(L, x, y); return new Kit(bat, rs).at(lx, lz, y0, rot); };
  {
    const { k, len } = runKit(bat, rs, toFt([272, 121.4]), toFt([548, 121.4]), [0, 1]);
    const n = 7, cw = len / n;
    k.box('cab', 0, 0, 0, len, 7.2, 0.15);
    for (let i = 0; i <= n; i++) k.box('cabDoor', i * cw - 0.04, 0, 0, i * cw + 0.04, 7.2, 1.6);
    k.box('cabDoor', 0, 1.45, 0, len, 1.6, 1.6); k.soft('fab:#7c8a8f', 0.05, 1.6, 0.25, len - 0.05, 1.8, 1.55, 0.06);
    k.box('cabDoor', 0, 5.6, 0, len, 5.7, 1.6); k.box('cabDoor', 0, 7.1, 0, len, 7.25, 1.7);
    for (let i = 0; i < n; i++) { k.box('brass', i * cw + cw / 2 - 0.15, 4.6, 0.15, i * cw + cw / 2 + 0.15, 4.7, 0.4); k.box('fab:#6b5a48', i * cw + 0.2, 0.05, 0.25, i * cw + cw - 0.2, 1.0, 1.4); }
    k.solid(0, 0, len, 1.6, 0, 7.2);
    rug(at(410, 300), 3, 5, '#4f5a5e', '#3a4245');
  }
  {
    const { k, len } = runKit(bat, rs, toFt([566, 121.4]), toFt([839, 121.4]), [0, 1]);
    baseRun(k, 0, len - 3.0); counterTop(k, 0, len - 3.0); farmSink(k, (680 - 566) / 23.55);
    builtInFridge(k, len - 3.0, len);
    k.box('cabDoor', 0, 4.6, 0, len - 3.2, 4.7, 1.0); k.box('cabDoor', 0, 5.8, 0, len - 3.2, 5.9, 1.0);
    k.solid(0, 0, len - 3.0, 2.1, 0, 3.1);
  }
  {
    // table sits west of the slider so the path from the kitchen out to the patio stays clear
    const k = at(985, 20, 0);
    for (const [cx, cz, r] of diningTable(k, 7, 3.6, { color: '#6e5038' })) { const p = k.P(cx, 0, cz); chair(new Kit(bat, rs).at(p.x, p.z, 0, r), '#cfc6b6'); }
    rug(at(985, 20, 0), 9, 12, '#cfc7ba', '#9c9284');
    for (const dx of [-2.3, 0, 2.3]) pendant(new Kit(bat, rs).at(k.ox + dx, k.oz, 0), 8, 2.4);
  }
  { const k = at(1562, -150, 180); sofa(k, 7.5, { color: '#d9d2b8' }); }
  coffeeTable(at(1562, -205, 90), 4, 2);
  plant(at(1680, -220), 0, 0, 5);
  // new patio off the dining addition's slider, with the fire pit, chairs and dining set moved out
  const patio = [];
  for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; patio.push([36 + Math.cos(a) * 14, -14 + Math.sin(a) * 7.8]); }
  bat.prism({ top: 'paving', side: 'foundation' }, patio, -1, -0.62);
  addFloorPoly(patio, [], -0.62, rs);
  const pk = (x, z, rot, fn) => fn(new Kit(bat, rs).at(x, z, -0.62, rot));
  pk(40, -15.5, 0, firePit);
  for (const [dx, dz] of [[-3.8, -3.8], [3.8, -3.8], [-3.8, 3.8], [3.8, 3.8]]) pk(40 + dx, -15.5 + dz, (Math.atan2(-dx, -dz) * 180) / Math.PI, (k) => adirondack(k));
  { const k = new Kit(bat, rs).at(27, -13, -0.62, 0); for (const [cx, cz, r] of patioDining(k)) pk(27 + cx, -13 + cz, r, patioChair); }
}

// ------------------------------------------------------------------ detached garage / studio
// 19 x 24 ft at the end of a lengthened driveway, behind the side-entry pad. Plan px (1st-floor scale).
const GX = (lx) => 255 + lx * 23.55, GZ = (lz) => 44 + lz * 23.55;
function buildDetachedGarage() {
  const rs = 'on:garage2', bat = renoBat(rs, 'site');
  const x0 = -22, x1 = -3, z0 = -22, z1 = 2;
  const L = { ...LV.f1, id: 'f1', extTop: 11, intTop: 11, sill: 3.0, head: 7.0 };
  L._foot = [[[x0, z0], [x1, z0], [x1, z1], [x0, z1]]];
  const room = roleRoom(L, { name: 'Detached garage / studio', dims: "19' x 24'", floor: 'concrete', wall: 'paint:#ebe7df', y: -0.5, poly: [[GX(x0), GZ(z0)], [GX(x1), GZ(z0)], [GX(x1), GZ(z1)], [GX(x0), GZ(z1)]] }, 0, 'g2');
  L._rooms = [room];
  const W = [
    [GX(x0), GZ(z1 - 0.25), GX(x1), GZ(z1 - 0.25), 'e', [[GX(-19.5), GX(-7.5), 'g'], [GX(-6.6), GX(-3.7), 'x', { hinge: 'lo', into: '-y', style: 'half', color: '#f2f2ee' }]]],
    [GX(x0), GZ(z0 + 0.25), GX(x1), GZ(z0 + 0.25), 'e', [[GX(-15.5), GX(-9.5), 'w', { g: 'dh2' }]]],
    [GX(x0 + 0.25), GZ(z0), GX(x0 + 0.25), GZ(z1), 'e', [[GZ(-14), GZ(-10), 'w']]],
    [GX(x1 - 0.25), GZ(z0), GX(x1 - 0.25), GZ(z1), 'e', [[GZ(-16), GZ(-12.5), 'w'], [GZ(-7), GZ(-3.5), 'w']]],
  ];
  for (const w of W) buildWall(L, [...w.slice(0, 5), w[5] || [], { rs }], bat);
  bat.prism({ top: 'floor:concrete', side: 'foundation' }, room.pts, -1, -0.5);
  addFloorPoly(room.pts, [], -0.5, rs);
  RENO_ROOMS.push({ rs, level: 'f1', room });
  const rb = renoBat(rs, 'roof');
  gableRoof(rb, { x0, x1, z0, z1, y: 11, p: 8 / 12, o: 1.0, rake: [1.0, 1.0], gable: [true, true] });
  rb.poly('ceiling', room.pts, 11, [], true);
  // driveway extension from the pad back to the new doors
  const drive = [[-20, 2], [-4, 2], [-4, 25.6], [-20, 25.6]];
  bat.poly('paving', drive, -0.96);
  addFloorPoly(drive, [], -0.96, rs);
  RENO_LABELS.push(...buildLabels(L, renoGroup(rs, 'site'), [room]).map((l) => ((l.userData.rs = rs), l)));
  // uses: each in its own set, chosen in the panel
  const use = (name) => { const b = renoBat('g2:' + name, 'site'); return (x, z, rot, fn, y = -0.5) => fn(new Kit(b, 'g2:' + name).at(x, z, y, rot)); };
  const golf = use('golf');
  golf(-12.5, z0 + 0.3, 0, (k) => {
    k.box('black', -6.4, 0, 0, 6.4, 9.8, 0.15); k.box('screen', -6.0, 0.6, 0.15, 6.0, 9.4, 0.18);
    for (const s of [-1, 1]) { k.box('col:#2b2d2f', s * 6.35 - 0.05, 0, 0.15, s * 6.35 + 0.05, 9.8, 10.5); k.solid(s * 6.35 - 0.1, 0.15, s * 6.35 + 0.1, 10.5, 0, 9.8); }
    k.box('col:#2b2d2f', -6.4, 9.75, 0.15, 6.4, 9.85, 10.5);
    k.box('col:#3d7a3a', -6.2, 0.01, 0.2, 6.2, 0.05, 15.5);   // turf
    k.box('col:#2f6a33', -2.5, 0.05, 11.0, 2.5, 0.12, 16.0);  // hitting mat
    k.box('black', 1.5, 0.12, 13.0, 2.1, 0.6, 13.6);          // launch monitor
    k.box('white', -0.8, 10.4, 12.0, 0.8, 10.8, 13.2); k.cyl('black', 0, 12.0, 0.2, 0.2, 10.45, 10.75, 10);
    k.cyl('col:#2b2b2b', 4.5, 15.5, 0.45, 0.45, 0, 3.0, 12);  // golf bag
  });
  golf(-8.5, -0.8, 180, (k) => armchair(k, { color: '#6d5d4e' }));
  golf(-16.5, -0.8, 180, (k) => armchair(k, { color: '#6d5d4e' }));
  const pottery = use('pottery');
  for (const [x, z] of [[-17.5, -17.5], [-12.5, -17.5]]) pottery(x, z, 0, (k) => {
    k.box('col:#8b9196', -1.0, 0, -1.3, 1.0, 1.4, 1.3); k.cyl('col:#b9bec2', 0, 0, 0.75, 0.75, 1.4, 1.55, 18); k.cyl('col:#a0603c', 0, 0, 0.35, 0.3, 1.55, 2.2, 14);
    k.cyl('col:#7a6a5a', 0, 2.1, 0.55, 0.55, 1.5, 1.7, 12); k.cyl('black', 0, 2.1, 0.08, 0.08, 0, 1.5, 6); k.solid(-1, -1.3, 1, 2.6, 0, 1.6);
  });
  pottery(-6.5, -18.5, 0, (k) => { k.cyl('steel', 0, 0, 1.3, 1.3, 0, 3.0, 8); k.cyl('col:#9a9fa3', 0, 0, 1.3, 1.25, 3.0, 3.2, 8); k.box('col:#40464b', -0.3, 1.2, 1.2, 0.3, 2.0, 1.35); k.solid(-1.3, -1.3, 1.3, 1.3, 0, 3.2); });
  pottery(-12.5, -7.5, 0, (k) => { k.box('col:#d8cdb8', -3, 2.8, -1.5, 3, 3.0, 1.5); for (const [x, z] of [[-2.8, -1.3], [2.8, -1.3], [-2.8, 1.3], [2.8, 1.3]]) k.cbox('col:#8a6b4e', x, z, 0.2, 0.2, 0, 2.8); k.solid(-3, -1.5, 3, 1.5, 0, 3); for (let i = 0; i < 5; i++) k.cyl('col:#a0603c', -2 + i, 0, 0.25 + (i % 2) * 0.1, 0.2, 3.0, 3.6 + (i % 3) * 0.2, 10); });
  pottery(-21.5, -8, 90, (k) => { shelving(k, 7, 1.5, 7); for (let y = 0.46; y < 6; y += 1.4) for (let x = -3; x < 3; x += 0.8) k.cyl(['col:#a0603c', 'col:#c9b49a', 'col:#5f7f8c', 'col:#e3dccb'][Math.floor((x + y * 3) * 2) & 3], x + 0.3, 0.75, 0.25, 0.2, y + 0.06, y + 0.7, 10); });
  pottery(-3.4, -12, -90, (k) => { k.box('col:#e7e2d4', -1.2, 0, 0, 1.2, 3.0, 1.8); k.box('chrome', -1.22, 2.95, -0.02, 1.22, 3.02, 1.82); k.solid(-1.2, 0, 1.2, 1.8, 0, 3); });
  const gym = use('gym');
  gym(-12.5, -10, 0, (k) => rubberFloor(k, 18.5, 23.4));
  gym(-12.5, z0 + 0.3, 0, (k) => powerRack(k));
  gym(-12.5, -13, 0, (k) => liftBench(k));
  gym(-21.7, -8, 90, (k) => dumbbellRack(k, 5.5));
  gym(-5.5, -17, 180, (k) => pelotonBike(k));
  gym(-3.3, -9, -90, (k) => k.box('mirror', -4, 0.6, 0, 4, 7.0, 0.06));
}

export function buildRenovations() {
  buildOpenPlan();
  buildKitchenRemodel();
  buildPrimaryBath();
  buildAddition();
  buildDetachedGarage();
}
