// Renovation options for the Hamilton Rd house. Each adds geometry to an 'on:<name>' set; the as-built parts it
// replaces are tagged 'off:<name>' (data.js walls, furnish.js fixtures, site.js deck).
// Tags may combine: 'a&b' = both active, 'a|b' = either ('furn' = furniture shown).
//
//   kitchen   Kitchen opened to the dining room + remodel: the kitchen | dining wall comes out on a flush beam, so the
//             formal dining room becomes the kitchen's dining end. White shaker cabinets, quartz, a 36" range with a
//             plaster hood on the laundry-side wall, built-in fridge + pantry towers, farmhouse sink under the corner
//             window, a 10 ft island with seating for four, white oak floors through kitchen and dinette.
//   refresh   Cosmetic refresh of the dated fixed parts: the oak-paneled fireplace breast painted with a limestone
//             surround, black iron stair spindles, white crown in place of the blue one, modern light fixtures
//             (foyer, dinette, dining). Paint, floors, cabinets: pick a style preset.
//   pbath     Primary bath: green-tile whirlpool deck, small shower and linen closet out; a 5' x 6' glass walk-in
//             shower in the corner, freestanding tub under the window, new double vanity, large porcelain tile.
//   mud       Laundry becomes a laundry/mudroom open to the back hall at the garage door: lockers + bench, stacked
//             washer/dryer, folding counter, slate-look tile.
//   exterior  Exterior refresh (the brick stays): black window sashes and trim, black gutters, charcoal carriage-style
//             garage doors, black glass double front door, coach lanterns. Finishes swap in app.js.
//   patio     Deck + patio upgrade: the deck is re-decked in composite with black aluminum rails, and a paver patio
//             at the walk-out under and beyond it gets a fire pit lounge.
//   play      Playground on the flat back lawn: cedar play fort with slide and swings, sandbox.
import * as THREE from 'three';
import { toFt, F2, H, PX } from './data.js';
import { Kit, V, addFloorPoly, addSolid } from './geom.js';
import { LV, P, F, CTX, renoBat, renoGroup, roleRoom, buildWall, buildLabels, railing, stairGeom, ROOF } from './build.js';
import {
  toilet, vanity, lightBar, diningTable, chair, sofa, sectional, armchair, coffeeTable, floorLamp, plant, rug, runKit, recessed, flushDome,
  bed, nightstand, dresser, wallTV, mediaConsole, officeDesk, officeChair, bookcase, desk, shelving, firePit, adirondack, patioChair,
  exteriorLantern, taperLeg, knob, raisedPanel, sideTable, tableLamp, chandelier, bellChandelier, globePendant,
} from './furnish.js';

const fab = (c) => 'fab:' + c;
const wood = (c) => 'wood:' + c;
export const RENO_LABELS = [];
export const RENO_ROOMS = []; // { rs, level, room } for the walk-mode room readout
const G2 = (x, y) => toFt(F2(x, y));
const ftPoly = (pts) => pts.map(([x, y]) => toFt([x, y]));

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


function fireplaceNew(k, top = 9.2) { // limewash plaster breast to the ceiling, floating oak beam mantel, linear firebox, stone ledge hearth
  k.box('plaster', -3.4, 0, 0, 3.4, top, 0.7);
  k.box('black', -2.0, 0.9, 0.7, 2.0, 2.5, 0.72);
  k.box('ember', -1.6, 1.0, 0.6, 1.6, 1.15, 0.71);
  k.box(wood('#a87a4c'), -3.0, 4.2, 0.7, 3.0, 4.7, 1.35);
  k.box('col:#b8b2a6', -3.6, 0, 0.7, 3.6, 0.55, 2.0);
  k.solid(-3.6, 0, 3.6, 2.0, 0, 9);
}
function ironSpindles(bat, a, b, h0, h1) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), cnt = Math.max(2, Math.round(len / 0.38));
  for (let i = 1; i < cnt; i++) { const f = i / cnt, x = a[0] + dx * f, z = a[1] + dz * f, h = h0 + (h1 - h0) * f; bat.aabox('black', x - 0.03, h, z - 0.03, x + 0.03, h + 2.9, z + 0.03); }
}

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

function coachLantern(k, y) { // black coach lantern, back at z = 0
  k.box('black', -0.2, y - 0.9, 0, 0.2, y + 0.4, 0.1);
  k.box('black', -0.04, y - 0.1, 0.1, 0.04, y - 0.02, 0.55);
  k.cyl('black', 0, 0.75, 0.28, 0.4, y + 0.45, y + 0.8, 4); k.cyl('black', 0, 0.75, 0.05, 0.05, y + 0.8, y + 1.0, 4);
  k.cyl('bulb', 0, 0.75, 0.24, 0.3, y - 0.65, y + 0.45, 4);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; k.box('black', Math.cos(a) * 0.3 - 0.03, y - 0.7, 0.75 + Math.sin(a) * 0.3 - 0.03, Math.cos(a) * 0.3 + 0.03, y + 0.45, 0.75 + Math.sin(a) * 0.3 + 0.03); }
  k.cyl('black', 0, 0.75, 0.32, 0.22, y - 0.85, y - 0.65, 4);
}

function buildPlay() {
  const rs = 'on:play', bat = renoBat(rs, 'site'), G = H.rearGrade;
  const cx = 72, cz = -62; // back yard, beyond the deck on the garage side, flat lawn (photos 73-74)
  bat.poly('mulch', [[cx - 13, cz - 9], [cx + 13, cz - 9], [cx + 13, cz + 9], [cx - 13, cz + 9]], G + 0.05);
  for (const [x0, z0, x1, z1] of [[cx - 13.3, cz - 9.3, cx + 13.3, cz - 9], [cx - 13.3, cz + 9, cx + 13.3, cz + 9.3], [cx - 13.3, cz - 9, cx - 13, cz + 9], [cx + 13, cz - 9, cx + 13.3, cz + 9]]) bat.aabox('cedar', x0, G, z0, x1, G + 0.45, z1);
  const k = new Kit(bat, rs).at(cx, cz, G, 90);
  const W = 'cedar', fx = -6.5;
  for (const x of [fx - 2.5, fx + 2.5]) for (const z of [-2.5, 2.5]) k.cbox(W, x, z, 0.33, 0.33, 0, 10.2);
  k.box(W, fx - 2.6, 4.8, -2.6, fx + 2.6, 5.05, 2.6);
  for (const z of [-2.5, 2.5]) for (let y = 5.3; y < 7.6; y += 0.45) k.box(W, fx - 2.5, y, z - 0.05, fx + 2.5, y + 0.3, z + 0.05);
  k.box(W, fx - 2.5, 5.05, -2.5, fx - 2.45, 7.6, 2.5);
  k.prof('col:#3f7a3c', [[-3.1, 10.0], [3.1, 10.0], [0, 12.4]], fx - 3.0, fx + 3.0);
  for (let y = 0.9; y < 4.8; y += 0.95) k.box(W, fx + 2.55, y, -1.0, fx + 2.75, y + 0.15, 1.0);
  k.box(W, fx + 2.55, 0, -1.1, fx + 2.75, 5.0, -0.95); k.box(W, fx + 2.55, 0, 0.95, fx + 2.75, 5.0, 1.1);
  for (let i = 0; i < 14; i++) k.cbox(['col:#d9452f', 'col:#2f6fbf', 'col:#f2b632', 'col:#3a9b4a'][i % 4], fx - 2.6 - 0.12, -1.8 + (i % 4) * 1.1, 0.25, 0.4, 0.6 + Math.floor(i / 4) * 1.1, 0.95 + Math.floor(i / 4) * 1.1);
  bat.box('col:#3f9a46', k.P(fx - 1.0, 4.85, 2.6), k.ez().multiplyScalar(9.0).add(V(0, -4.45, 0)), V(0, 0.15, 0), k.ex().multiplyScalar(2.0));
  k.box(W, fx + 2.5, 8.6, -0.25, 9.5, 9.1, 0.25);
  for (const s of [-1, 1]) bat.box(W, k.P(9.3, 0, s * 3.4), k.ez().multiplyScalar(-s * 3.2).add(V(0, 8.9, 0)), k.ex().multiplyScalar(0.33), k.ez().multiplyScalar(0.33));
  for (const [x, kind] of [[0.8, 'swing'], [3.8, 'swing'], [7.0, 'glider']]) {
    for (const dz of [-0.75, 0.75]) k.box('col:#8c8c8c', x - 0.03, 1.8, dz - 0.03, x + 0.03, 8.6, dz + 0.03);
    k.box(kind === 'swing' ? 'col:#1e1e1e' : 'col:#2f6fbf', x - 0.4, 1.6, -0.85, x + 0.4, 1.8, 0.85);
  }
  k.solid(fx - 2.8, -2.8, fx + 2.8, 2.8, 0, 10);
  k.solid(9.0, -3.6, 9.6, -3.2, 0, 9); k.solid(9.0, 3.2, 9.6, 3.6, 0, 9);
  // sandbox
  const sb = new Kit(bat, rs).at(cx - 4, cz + 13, G, 0); sb.box('cedar', -3, 0, -3, 3, 0.8, 3); sb.box('col:#e2d3ae', -2.8, 0.6, -2.8, 2.8, 0.7, 2.8); sb.solid(-3, -3, 3, 3, 0, 0.8);
  const L = { ...LV.f1, id: 'site' };
  RENO_LABELS.push(...buildLabels(L, renoGroup(rs, 'site'), [{ name: 'Playground (new)', dims: 'play fort, slide, swings, sandbox', pts: [[cx - 4, cz - 4], [cx + 4, cz - 4], [cx + 4, cz + 4], [cx - 4, cz + 4]], y: G + 1 }]).map((l) => ((l.userData.rs = rs), (l.userData.level = 'ext'), l)));
}



const addLabels = (rs, level, rooms, prefix) => {
  const rr = rooms.map((r, i) => roleRoom(LV[level], r, i, prefix));
  for (const r of rr) RENO_ROOMS.push({ rs, level, room: r });
  RENO_LABELS.push(...buildLabels(LV[level], renoGroup(rs, level), rr).map((l) => ((l.userData.rs = rs), l)));
};
const siteLabel = (rs, name, dims, pts, y) => RENO_LABELS.push(...buildLabels({ ...LV.f1, id: 'site' }, renoGroup(rs, 'site'), [{ name, dims, pts, y }]).map((l) => ((l.userData.rs = rs), (l.userData.level = 'ext'), l)));

// ------------------------------------------------------------------ kitchen opened to the dining room + remodel
function buildKitchen() {
  const rs = 'on:kitchen', bat = renoBat(rs, 'f1'), L = LV.f1;
  const at = (x, y, rot = 0, y0 = 0, b = bat, t = rs) => { const [lx, lz] = F(x, y); return new Kit(b, t).at(lx, lz, y0, rot); };
  // the kitchen | dining wall comes out; a flush beam carries the 2nd floor (soffit just below the ceiling)
  { const [x0, z] = F(537, 382), [x1] = F(677, 0); new Kit(bat, rs).box('ceiling', x0, H.ceil1 - 0.35, z - 0.25, x1, H.ceil1, z + 0.25); }
  // white oak floor through the kitchen, dinette and the old dining room
  const kr = L._rooms.find((r) => r.name === 'Kitchen'), dr = L._rooms.find((r) => r.name === 'Dining Room');
  bat.poly('plank:#c8a57a', kr.pts, 0.03); bat.poly('plank:#c8a57a', dr.pts, 0.03);
  // laundry-side wall: drawers, 36" range under a plaster hood, built-in fridge, two pantry towers, drawers
  { const { k, len } = runKit(bat, rs, F(709, 104), F(709, 322), [-1, 0]), u = (y) => (y - 104) / PX;
    baseRun(k, 0, u(150), { drawers: true }); counterTop(k, 0, u(150)); upperRun(k, 0, u(150));
    proRange(k, u(150), u(150) + 3.0);
    baseRun(k, u(150) + 3.0, u(205)); counterTop(k, u(150) + 3.0, u(205)); upperRun(k, u(150) + 3.0, u(205));
    builtInFridge(k, u(205), u(205) + 3.0); tallPantry(k, u(205) + 3.0, u(205) + 5.5); tallPantry(k, u(205) + 5.5, u(205) + 8.0);
    baseRun(k, u(205) + 8.0, len, { drawers: true }); counterTop(k, u(205) + 8.0, len, 2.1, 4.4);
    k.solid(0, 0, u(150), 2.1, 0, 3.08); k.solid(u(150) + 3.0, 0, u(205), 2.1, 0, 3.08); k.solid(u(205) + 8.0, 0, len, 2.1, 0, 3.08); }
  // farmhouse sink under the corner window
  { const { k, len } = runKit(bat, rs, F(646, 33.5), F(710, 100), [-0.72, 0.69]); baseRun(k, 0.1, len - 0.1); counterTop(k, 0.1, len - 0.1, 2.1, 3.5); farmSink(k, len / 2); k.solid(0.1, 0, len - 0.1, 2.1, 0, 3.08); }
  // 10 ft island, seating for four on the great-room side, three pendants
  { const [ix, iz] = F(606, 240), ik = new Kit(bat, rs).at(ix, iz, 0, 90);
    island(ik, 10, 4.4, 1.3);
    for (const dx of [-3.6, -1.2, 1.2, 3.6]) { const p = ik.P(dx, 0, -2.9); stool(new Kit(renoBat('on:kitchen&furn', 'f1'), 'on:kitchen&furn').at(p.x, p.z, 0, 90), '#c9bba6'); }
    for (const dz of [-3.3, 0, 3.3]) pendant(new Kit(bat, rs).at(ix, iz + dz, 0), H.ceil1, 2.4); }
  // coffee bar where the dining buffet was, now facing the kitchen
  { const { k, len } = runKit(bat, rs, F(541, 384.7), F(600, 384.7), [0, 1]); baseRun(k, 0, len); counterTop(k, 0, len); upperRun(k, 0, len, 4.6, 7.4); k.solid(0, 0, len, 2.1, 0, 3.08); }
  for (const [x, y] of [[560, 300], [650, 300], [560, 200], [650, 200], [606, 120]]) recessed(at(x, y), H.ceil1);
  addLabels(rs, 'f1', [
    { name: 'Kitchen (remodel)', dims: "white shaker · 10' island · 36\" range", floor: 'plank:#c8a57a', wall: 'paint:#f3f2ee', poly: kr.poly },
    { name: 'Dining (open to kitchen)', dims: 'wall out on a flush beam', floor: 'plank:#c8a57a', wall: 'paint:#f3f2ee', poly: dr.poly },
  ], 'kr');
}

// ------------------------------------------------------------------ cosmetic refresh
function paintedBreast(k, w, top) { // the great room breast painted, limestone surround, floating oak mantel
  k.box('plaster', -w / 2, 0, 0, w / 2, top, 1.4);
  for (let y = 4.9; y < top - 1.2; y += 2.1) for (const [a, b] of [[-w / 2 + 0.35, -0.12], [0.12, w / 2 - 0.35]]) k.box('col:#f1eee7', a, y, 1.4, b, y + 1.75, 1.44);
  k.box('stone', -2.6, 0, 1.4, 2.6, 4.0, 1.62); k.box('black', -1.6, 0.6, 1.62, 1.6, 3.0, 1.64); k.box('ember', -1.0, 0.7, 1.4, 1.0, 0.95, 1.6);
  k.box(wood('#a87a4c'), -3.0, 4.4, 1.4, 3.0, 4.85, 2.05);
  k.box('stone', -2.8, 0, 1.6, 2.8, 0.45, 3.0);
  k.solid(-w / 2, 0, w / 2, 3.0, 0, top);
}
function buildRefresh() {
  const rs = 'on:refresh', b1 = renoBat(rs, 'f1'), b2 = renoBat(rs, 'f2');
  { const [lx, lz] = F(181, 281.5); paintedBreast(new Kit(b1, rs).at(lx, lz, 0, 90), 6.4, 17.2); }
  // stair + balcony: square black iron spindles replace the turned oak ones (rails stay)
  const { M, r } = stairGeom(), [xo] = F(M.lower.x1, 0), [, zc] = F(0, M.upper.y1), [xe] = F(M.upper.xEnd, 0), [, zb] = F(0, M.lower.yBottom - 8);
  ironSpindles(b1, [xo - 0.1, zb], [xo - 0.1, zc], r, (M.lower.n + 1) * r);
  ironSpindles(b1, [xo, zc - 0.1], [xe, zc - 0.1], (M.lower.n + M.wind.n + 1) * r, H.f2);
  for (const [a, b] of [[[425, 253], [350, 343]], [[326, 452], [386, 452]], [[386, 456], [500, 456]], [[500, 523], [570, 523]]]) ironSpindles(b2, G2(...a), G2(...b), H.f2, H.f2);
  // light fixtures: frosted orb in the foyer, linear pendant over the dining table, black globe cluster in the dinette
  { const [lx, lz] = F(447, 500); orb(new Kit(b1, rs).at(lx, lz, 0), H.ceil2, 7.0, 1.4); }
  { const [lx, lz] = F(629, 483); linearPendant(new Kit(b1, rs).at(lx, lz, 0, 90), H.ceil1, 2.8, 5.5); }
  { const [lx, lz] = F(573, 92); orb(new Kit(b1, rs).at(lx, lz, 0), 11.5, 4.4, 0.9); }
}

// ------------------------------------------------------------------ primary bath remodel
function buildPrimaryBath() {
  const rs = 'on:pbath', bat = renoBat(rs, 'f2');
  const at = (x, y, rot = 0) => { const [lx, lz] = G2(x, y); return new Kit(bat, rs).at(lx, lz, H.f2, rot); };
  const poly = [[972, 173], [1162, 173], [1162, 259], [1192, 294], [1236, 294], [1236, 385], [972, 385]];
  bat.poly('tile:#d9d5ce', poly.map(([x, y]) => G2(x, y)), H.f2 + 0.03);
  // 5' x 6' walk-in shower in the old shower + linen corner: glass on the room side, bench, rain head
  { const [x0, z0] = G2(974, 176), [x1, z1] = G2(1030, 380), k = new Kit(bat, rs).at(0, 0, H.f2, 0), zg = z0 + (z1 - z0) * 0.6;
    k.box('tile:#ecebe7', x0, 0, z0, x1, 0.06, z1); k.box('tile:#ecebe7', x0, 0, z0, x0 + 0.05, 8.0, z1); k.box('tile:#ecebe7', x0, 0, z0, x1, 8.0, z0 + 0.05);
    k.box('showerGlass', x1 - 0.02, 0.06, z0, x1 + 0.02, 7.0, zg); k.box('black', x1 - 0.03, 7.0, z0, x1 + 0.03, 7.05, zg); k.box('black', x1 - 0.03, 0.06, zg - 0.03, x1 + 0.03, 7.0, zg + 0.03);
    k.solid(x1 - 0.05, z0, x1 + 0.05, zg, 0, 7);
    k.box('tile:#ecebe7', x0 + 0.05, 0, z0 + 1.0, x0 + 1.3, 1.5, z0 + 4.0); k.solid(x0, z0 + 1.0, x0 + 1.3, z0 + 4.0, 0, 1.5);
    const hk = new Kit(bat, rs).at((x0 + x1) / 2, z0 + 2.2, H.f2); hk.cyl('black', 0, 0, 0.02, 0.02, 7.3, 8, 4); hk.cyl('chrome', 0, 0, 0.55, 0.55, 7.25, 7.3, 18); }
  // freestanding tub under the window
  { const k = at(1098, 205, 90); k.cyl('porcelain', 0, 0, 1.35, 1.25, 0, 1.9, 24, 2.05); k.cyl('col:#eef1f2', 0, 0, 1.15, 1.15, 1.9, 1.905, 24, 2.1); k.cyl('black', -2.8, 0, 0.05, 0.05, 0, 3.4, 6); k.solid(-1.3, -2.7, 1.3, 2.7, 0, 1.9); }
  // floating double vanity on the side wall, mirrors, sconces
  { const k = at(1232.7, 340, -90);
    k.box('rcab', -2.2, 1.0, 0, 2.2, 2.75, 1.8); for (const s of [-1, 1]) { shaker(k, s > 0 ? 0.05 : -2.15, s > 0 ? 2.15 : -0.05, 1.05, 2.7, 1.8); pull(k, s * 1.1, 2.5, 1.8); }
    k.box('rcounter', -2.25, 2.75, 0, 2.25, 2.9, 1.9);
    for (const x of [-1.1, 1.1]) { k.cyl('porcelain', x, 0.95, 0.6, 0.5, 2.9, 3.2, 18, 0.75); k.cyl('black', x, 0.2, 0.04, 0.04, 2.9, 3.6, 6); k.box('mirror', x - 0.85, 3.9, 0, x + 0.85, 6.4, 0.05); }
    k.solid(-2.2, 0, 2.2, 1.9, 1, 2.9); }
  addLabels(rs, 'f2', [{ name: 'Primary Bath (remodel)', dims: "5' x 6' glass shower · freestanding tub · double vanity", floor: 'tile:#d9d5ce', wall: 'paint:#f4f3f0', poly }], 'pb');
}

// ------------------------------------------------------------------ laundry / mudroom
function buildMudroom() {
  const rs = 'on:mud', bat = renoBat(rs, 'f1'), L = LV.f1;
  // wide cased opening from the back hall (the garage entry) instead of the laundry door
  buildWall(L, [712.5, 322, 820, 322, 'i', [[726, 806, 'o', { cased: true, head: 7.6 }]], { rs }]);
  const room = L._rooms.find((r) => r.name === 'Laundry');
  bat.poly('slate', room.pts, 0.03);
  // lockers + bench on the kitchen-side wall
  { const { k, len } = runKit(bat, rs, F(715.7, 212), F(715.7, 318), [1, 0]); lockers(k, len, 4); }
  // stacked washer + dryer and a folding counter on the office-side wall
  { const [x, z] = F(816.5, 230); const k = new Kit(bat, rs).at(x, z, 0, -90);
    for (const [y0, y1] of [[0, 3.0], [3.05, 6.0]]) { k.box('porcelain', -1.25, y0, 0.1, 1.25, y1, 2.45); k.cyl('col:#b9c0c6', 0, 2.46, 0.75, 0.75, y0 + 1.5, y0 + 1.51, 18); }
    k.solid(-1.25, 0.1, 1.25, 2.45, 0, 6); }
  { const { k, len } = runKit(bat, rs, F(816.5, 252), F(816.5, 318), [-1, 0]); baseRun(k, 0, len); counterTop(k, 0, len, 2.1, 4.4); upperRun(k, 0, len, 4.8, 7.6); k.solid(0, 0, len, 2.1, 0, 3.08); }
  addLabels(rs, 'f1', [{ name: 'Laundry / Mudroom', dims: 'open to the garage hall · 4 lockers · stacked W/D', floor: 'slate', wall: 'paint:#f1f0ec', poly: room.poly }], 'md');
}

// ------------------------------------------------------------------ exterior refresh (geometry; finishes swap in app.js)
function buildExterior() {
  const rs = 'on:exterior', bat = renoBat(rs, 'f1');
  // carriage-style garage doors: black strap hinges, handles and a row of small windows on the charcoal doors
  for (const [y0, y1, n] of [[392, 523, 1], [574, 784, 2]]) {
    const [x, za] = F(1131, y0 + 3), [, zb] = F(0, y1 - 3), k = new Kit(bat, rs), w = (zb - za) / n;
    for (let i = 0; i < n; i++) {
      const a = za + w * i, b = a + w;
      for (let j = 0; j < 4; j++) { const c0 = a + 0.3 + j * ((b - a - 0.6) / 4), c1 = c0 + (b - a - 0.6) / 4 - 0.15; k.box('frosted', x + 0.04, 5.0 - 1.2, c0, x + 0.06, 5.6 - 1.2, c1); }
      k.box('black', x + 0.04, 2.4 - 1.2, (a + b) / 2 - 0.05, x + 0.1, 3.2 - 1.2, (a + b) / 2 + 0.05);
      for (const yy of [1.2, 5.6]) for (const zz of [a + 0.15, b - 1.35]) k.box('black', x + 0.04, yy - 1.2, zz, x + 0.08, yy - 1.05, zz + 1.2);
    }
  }
  // coach lanterns at the entry and the garage doors
  const [lx, lz] = F(398, 585); coachLantern(new Kit(bat, rs).at(lx, lz + 0.58, 0, 0), 6.6);
  const [rx, rz] = F(498, 585); coachLantern(new Kit(bat, rs).at(rx, rz + 0.58, 0, 0), 6.6);
}

// ------------------------------------------------------------------ deck + walk-out patio upgrade
function buildPatio() {
  const rs = 'on:patio', bat = renoBat(rs, 'site'), y = H.rearGrade + 0.08, FB = renoBat('on:patio&furn', 'site');
  // composite decking over the existing frame, black aluminum rails with thin balusters
  const deck = [[165, 171], [433, 171], [433, 102], [475, 58], [475, -30], [165, -30]].map(([x, yy]) => F(x, yy));
  bat.poly('plank:#6e6258', deck, -0.22);
  const rail = [[165, 171], [165, -30], [380, -30]].map(([x, yy]) => F(x, yy)), rail2 = [[430, -30], [475, -30], [475, 58]].map(([x, yy]) => F(x, yy));
  for (const line of [rail, rail2]) for (let i = 0; i < line.length - 1; i++) {
    const a = line[i], b = line[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), n = Math.round(len / 0.33);
    bat.box('black', V(a[0], -0.25 + 3.0, a[1]).add(V(-0.08, 0, -0.08)), V(dx, 0, dz), V(0, 0.18, 0), V(0.16, 0, 0.16));
    for (let j = 0; j <= n; j++) { const x = a[0] + (dx * j) / n, z = a[1] + (dz * j) / n; bat.aabox('black', x - 0.03, -0.25, z - 0.03, x + 0.03, 2.8, z + 0.03); }
  }
  // paver patio at the walk-out: under the deck and out into the yard
  const pat = [[150, 190], [490, 190], [490, -200], [150, -200]].map(([x, yy]) => F(x, yy));
  bat.prism({ top: 'pavers', side: 'foundation' }, pat, H.rearGrade - 0.1, y);
  addFloorPoly(pat, [], y, rs);
  const fk = (x, yy, rot, fn) => { const [lx, lz] = F(x, yy); fn(new Kit(FB, 'on:patio&furn').at(lx, lz, y, rot)); };
  fk(320, -120, 0, firePit);
  fk(320, -170, 0, (k2) => sofa(k2, 8.5, { color: '#c8c1b4', cushion: '#d6d0c4', pillows: ['#2f5d6e', '#c98a3a'] }));
  for (const [dx, rot] of [[-70, 90], [70, -90]]) fk(320 + dx, -120, rot, (k2) => adirondack(k2, '#2f4a5a'));
  fk(260, 60, 0, (k2) => { for (const [cx, cz, r] of diningTable(k2, 6, 3.2, { color: '#4a4a4a' })) { const p = k2.P(cx, 0, cz); patioChair(new Kit(FB, 'on:patio&furn').at(p.x, p.z, y, r)); } });
  siteLabel(rs, 'Deck + walk-out patio (new)', 'composite deck · paver patio · fire pit', [F(250, -150), F(390, -150), F(390, -90), F(250, -90)], y + 0.5);
}

export function buildRenovations() {
  buildKitchen();
  buildRefresh();
  buildPrimaryBath();
  buildMudroom();
  buildExterior();
  buildPatio();
  buildPlay();
}
export { shaker };
