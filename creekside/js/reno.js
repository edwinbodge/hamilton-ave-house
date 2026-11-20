// Renovation options for the Creekside Ln house. Each adds geometry to an 'on:<name>' set; the as-built
// parts it replaces are tagged 'off:<name>' (data.js walls, furnish.js fixtures, build.js canopy, site.js).
// Tags may combine: 'a&b' = both active, 'a|b' = either ('furn' = furniture shown, 'lay:A' = basement layout A).
//
//   kitchen     Kitchen opened to the family room. The kitchen and dining area swap: the new kitchen goes into
//               the dining area, right on the family-room opening, with a 9 ft island facing the family room;
//               the stub wall and the pier at the family-room corner come out (a beam stays for the bedroom
//               wall above) and the sunken family room is leveled, so there is no step. The old kitchen becomes
//               the dining area with a built-in banquette in the window bump; the fridge/pantry wall stays on
//               the hall side, which also keeps the kitchen out of sight of the front door. The sink moves ~7 ft
//               north (easy with the open basement below); the dining windows become counter-height.
//   openLiving  Kitchen | living room wall: the 3 ft doorway becomes an 11 ft cased opening on a flush beam.
//   refresh     Cosmetic refresh of the fixed, dated parts: limewash fireplace breast with a floating oak mantel
//               (replaces black marble + oak mantel), black iron balusters (turned oak spindles go), modern light
//               fixtures in the foyer and dining. Paint, floors, cabinets: pick a style preset.
//   pbath       Primary bath: whirlpool + small gold-framed shower out; 5'4" x 5'6" walk-in shower in the
//               corner, freestanding tub under the window, 6 ft floating double vanity + linen tower. Same room.
//   mud         Laundry becomes a laundry/mudroom: washer + dryer stack into the existing closet niche, lockers
//               and a bench on the stair wall, slate-look tile. No garage space lost.
//   facade      Modern facade: charcoal board-and-batten, limewashed brick, black windows/trim/gutters,
//               cedar garage doors with a glass band, cedar accent wall at the entry, black steel canopy, darker roof.
//   patio       ~900 sq ft paver patio off the dining slider and behind the family room: wide steps, dining
//               under a cedar pergola, lounge around a fire pit, grill counter.
//   play        Playground in the back yard: cedar play fort with slide and swings, on a bordered mulch bed.
//   basement    (layout choice, below) finishes the lower level: LVP floors, finished bath, furniture.
import * as THREE from 'three';
import { toFt, F2, H, PX, vaultUnder } from './data.js';
import { Kit, V, addFloorPoly, addSolid, swap, item } from './geom.js';
import { LV, P, F, CTX, renoBat, renoGroup, roleRoom, buildWall, buildLabels, rplane, railing, stairGeom, ROOF } from './build.js';
import {
  toilet, vanity, lightBar, diningTable, chair, sofa, sectional, armchair, coffeeTable, floorLamp, plant, rug, runKit, recessed, flushDome,
  bed, nightstand, dresser, wallTV, mediaConsole, projectionScreen, towerSpeaker, officeDesk, officeChair, bookcase, desk,
  powerRack, liftBench, dumbbellRack, pelotonBike, rubberFloor, treadmill, shelving, firePit, adirondack, patioChair, exteriorLantern,
  taperLeg, knob, raisedPanel, sideTable, tableLamp, chandelier, bellChandelier,
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

// ------------------------------------------------------------------ kitchen opened to the family room
function buildKitchen() {
  const rs = 'on:kitchen', bat = renoBat(rs, 'f1'), L = LV.f1;
  const at = (x, y, rot = 0, y0 = 0, b = bat, t = rs) => { const [lx, lz] = F(x, y); return new Kit(b, t).at(lx, lz, y0, rot); };
  // walls: the stub wall and pier go; a beam carries the bedroom wall above. Counter-height window over the new sink.
  buildWall(L, [474, 197.5, 474, 305, 'i', [[197.5, 305, 'o', { head: 7.6 }]], { top: H.f2, rs }]);
  buildWall(L, [323.5, 197.5, 323.5, 351.5, 'e', [[257, 313, 'w', { g: 'cs2', sill: 3.6 }]], { rs }]);
  // family room floor leveled to the kitchen (no step)
  const famRoom = L._rooms.find((r) => r.vault);
  bat.prism({ top: 'subfloor', bottom: 'joist', side: 'joist' }, famRoom.pts, -1.5, 0);
  bat.poly(famRoom.floorKey, famRoom.pts, 0.012);
  addFloorPoly(famRoom.pts, [], 0, rs);
  // west wall: sink under the window, dishwasher, 36" range + plaster hood at the north end
  {
    const { k, len } = runKit(bat, rs, F(326.5, 200.5), F(326.5, 351.5), [1, 0]);
    baseRun(k, 0, 4.4, { drawers: true }); baseRun(k, 4.4, 6.4);
    k.box('steel', 6.4, 0.4, 1.95, 8.4, 2.88, 2.0); k.box('rcab', 6.4, 0.35, 0, 8.4, 2.92, 1.95);
    baseRun(k, 8.4, 9.1, { drawers: true });
    counterTop(k, 0, 9.1); farmSink(k, 5.4);
    k.box('rsplash', 0, 3.08, 0, 2.7, 4.6, 0.04); k.box('rsplash', 8.1, 3.08, 0, 9.1, 4.6, 0.04);
    upperRun(k, 0, 2.6); shelf(k, 8.25, 8.85, 5.0); shelf(k, 8.25, 8.85, 6.4);
    proRange(k, 9.1, 12.1); baseRun(k, 12.1, len); counterTop(k, 12.1, len);
    k.solid(0, 0, 9.1, 2.1, 0, 3.08); k.solid(12.1, 0, len, 2.1, 0, 3.08);
  }
  // tall pantry beside the patio slider
  { const { k } = runKit(bat, rs, F(440, 200.5), F(472, 200.5), [0, 1]); tallPantry(k, 0, 2.6); }
  // 9 ft island facing the family room, seating on the family-room side, three pendants
  {
    const [ix, iz] = F(428.5, 299.5);
    const ik = new Kit(bat, rs).at(ix, iz, 0, -90); // working side faces west (the sink + range), seats face it from the east
    island(ik, 9, 4.2, 1.25);
    for (const dx of [-3.0, -1.0, 1.0, 3.0]) { const p = ik.P(dx, 0, -2.7); swap(new Kit(renoBat('on:kitchen&furn', 'f1'), 'on:kitchen&furn').at(p.x, p.z, 0, -90), { glb: 'Chair24' }, (h) => stool(h, '#c9bba6')); }
    for (const dz of [-3, 0, 3]) item(new Kit(bat, rs).at(ix, iz + dz, 0), (k) => pendant(k, H.ceil1, 2.4), null, null, { ceil: H.ceil1, hang: 2.4 });
  }
  for (const [x, y] of [[360, 220], [360, 330], [470, 230]]) item(at(x, y), (k) => recessed(k, H.ceil1), null, 'recessed', { ceil: H.ceil1 });
  // old kitchen -> dining: banquette in the window bump, table for six, fridge + pantry wall on the hall side
  {
    const { k, len } = runKit(bat, rs, F(294.9, 360), F(294.9, 488), [1, 0]);
    // built-in banquette: 18" seat (box 15", 3" cushion) for a 30" table, 22" deep, upholstered back
    k.box('rcab', 0, 0, 0, len, 1.15, 1.8); k.box('rcabDoor', 0, 1.15, 0, len, 1.25, 1.9);
    k.soft(fab('#7d8a86'), 0.05, 1.25, 0.05, len - 0.05, 1.5, 1.85, 0.08);
    k.soft(fab('#7d8a86'), 0.05, 1.5, 0.0, len - 0.05, 3.15, 0.45, 0.12);
    for (let i = 0; i < 3; i++) k.soft(fab(['#c9a96e', '#e9e3d6', '#a35d4b'][i]), 1.5 + i * 3.4, 1.5, 0.3, 2.9 + i * 3.4, 2.75, 0.7, 0.15);
    k.solid(0, 0, len, 1.9, 0, 1.5);
    const t = at(345, 424, 90, 0, renoBat('on:kitchen&furn', 'f1'), 'on:kitchen&furn');
    for (const [cx, cz, r] of swap(t, { glb: 'Table07', w: 7, d: 3.5, h: 2.5 }, (h) => diningTable(h, 7, 3.5, { color: '#8a6a4a' }))) { if (cz < -0.1) continue; const p = t.P(cx, 0, cz); swap(new Kit(renoBat('on:kitchen&furn', 'f1'), 'on:kitchen&furn').at(p.x, p.z, 0, r), { glb: 'Chair04' }, (h) => chair(h, '#d8d2c6', '#2b2b2b')); }
  }
  {
    const { k, u } = runKit(bat, rs, F(473.4, 390), F(473.4, 491.4), [-1, 0]);
    builtInFridge(k, 0.1, 3.1); tallPantry(k, 3.1, 5.6); baseRun(k, 5.6, 8.3); counterTop(k, 5.6, 8.3); upperRun(k, 5.6, 8.3);
    k.cyl('black', 6.5, 0.8, 0.35, 0.35, 3.08, 4.2, 12);
    k.solid(5.6, 0, 8.3, 2.1, 0, 3.08); void u;
  }
  // family room restaged around the (now level) fireplace wall: sofa + two chairs, TV over the mantel
  const FK = renoBat('on:kitchen&furn', 'f1'), fk = (x, y, rot, fn) => { const [lx, lz] = F(x, y); item(new Kit(FK, 'on:kitchen&furn').at(lx, lz, 0, rot), fn); };
  fk(588, 150, 0, (k) => rug(k, 9, 12, '#d8d3ca', '#9c9284'));
  fk(588, 205, 180, (k) => swap(k, { glb: 'Sofa08', w: 8.5, d: 3.15, back: true }, (h) => sofa(h, 8.5, { color: '#cfc6b8', cushion: '#d8d0c3', pillows: ['#5d6b73', '#b48a5a'] })));
  fk(588, 150, 180, (k) => swap(k, { glb: 'Table38', w: 4.5, d: 2.2 }, (h) => coffeeTable(h, 4.5, 2.4, '#8a6a4a')));
  fk(520, 120, 70, (k) => swap(k, { glb: 'Chair12' }, (h) => armchair(h, { color: '#8c7b68' })));
  fk(656, 120, -70, (k) => swap(k, { glb: 'Chair12' }, (h) => armchair(h, { color: '#8c7b68' })));
  // the dining chandelier over the new table (style follows the refresh option)
  { const [lx, lz] = F(345, 424); item(new Kit(renoBat('on:kitchen&off:refresh', 'f1'), 'on:kitchen&off:refresh').at(lx, lz, 0), (k) => bellChandelier(k, H.ceil1, 2.6, 5), null, null, { ceil: H.ceil1, hang: 2.6 }); item(new Kit(renoBat('on:kitchen&on:refresh', 'f1'), 'on:kitchen&on:refresh').at(lx, lz, 0, 90), (k) => linearPendant(k, H.ceil1, 2.6, 5), null, null, { ceil: H.ceil1, hang: 2.6 }); }
  // labels: the swapped rooms
  const rooms = [
    { name: 'Kitchen (remodel)', dims: "open to the family room · 9' island", floor: 'oak', wall: 'paint:#f3f2ee', poly: [[323.5, 197.5], [474, 197.5], [474, 340], [323.5, 340]] },
    { name: 'Dining (remodel)', dims: 'banquette in the bump · seats 6', floor: 'oak', wall: 'paint:#f3f2ee', poly: [[323.5, 340], [474, 340], [474, 494.5], [292, 494.5], [292, 351.5], [323.5, 351.5]] },
  ].map((r, i) => roleRoom(L, r, i, 'kr'));
  for (const r of rooms) RENO_ROOMS.push({ rs, level: 'f1', room: r });
  RENO_LABELS.push(...buildLabels(L, renoGroup(rs, 'f1'), rooms).map((l) => ((l.userData.rs = rs), l)));
}

// ------------------------------------------------------------------ kitchen | living room opening
function buildOpenLiving() {
  const rs = 'on:openLiving', L = LV.f1;
  buildWall(L, [323.5, 494.5, 476, 494.5, 'i', [[333, 467, 'o', { head: 7.4, cased: true }]], { rs }]);
}

// ------------------------------------------------------------------ cosmetic refresh (fixed elements)
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
function buildRefresh() {
  const rs = 'on:refresh';
  { const [lx, lz] = F(593, 60.5); for (const [tag, y] of [['on:refresh&off:kitchen', H.family], ['on:refresh&on:kitchen', 0]]) fireplaceNew(new Kit(renoBat(tag, 'f1'), tag).at(lx, lz, y, 0), vaultUnder(58) - y - 0.05); }
  // stair + balcony: square black iron spindles in place of the turned oak ones
  const S = stairGeom(), t2 = S.treads[2], b1 = renoBat(rs, 'f1'), b2 = renoBat(rs, 'f2');
  ironSpindles(b1, [S.x0 + 0.05, t2.z1 - 0.1], [S.x0 + 0.05, S.zTop], t2.top, H.f2);
  ironSpindles(b2, [S.x0 + 0.05, S.zTop + 0.05], G2(752.5, 215.5), H.f2, H.f2);
  ironSpindles(b2, G2(752.5, 215.5), G2(752.5, 245.5), H.f2, H.f2);
  ironSpindles(b2, G2(783.5, 163), G2(835.5, 163), H.f2, H.f2);
  // light fixtures: big frosted orb in the two-story foyer, linear pendant over the dining table
  { const [lx, lz] = F(520, 500); orb(new Kit(b1, rs).at(lx, lz, 0), H.ceil2, 6.5, 1.3); }
  { const [lx, lz] = F(398, 250); linearPendant(new Kit(renoBat('on:refresh&off:kitchen', 'f1'), 'on:refresh&off:kitchen').at(lx, lz, 0), H.ceil1, 2.6, 5); }
}

// ------------------------------------------------------------------ primary bath remodel
function buildPrimaryBath() {
  const rs = 'on:pbath', bat = renoBat(rs, 'f2');
  const at = (x, y, rot = 0) => { const [lx, lz] = G2(x, y); return new Kit(bat, rs).at(lx, lz, H.f2, rot); };
  // new large-format floor
  bat.poly('tile:#d9d5ce', ftPoly([[863, 129], [893, 129], [893, 109.5], [931, 109.5], [931, 185], [863, 185]].map(([x, y]) => F2(x, y))), H.f2 + 0.03);
  // 5'4" x 5'6" walk-in shower in the corner: glass on two sides, bench, rain head
  {
    const [x0, z0] = G2(899, 110.5), [x1, z1] = G2(930, 143);
    const k = new Kit(bat, rs).at(0, 0, H.f2, 0);
    k.box('tile:#ecebe7', x0, 0, z0, x1, 0.06, z1);
    k.box('tile:#ecebe7', x0 + 0.05, 0, z0, x1, 8.0, z0 + 0.05); k.box('tile:#ecebe7', x1 - 0.05, 0, z0, x1, 8.0, z1);
    k.box('showerGlass', x0, 0.06, z1 - 0.02, x1, 7.0, z1 + 0.02); k.box('black', x0, 7.0, z1 - 0.03, x1, 7.05, z1 + 0.03);
    const zg = z0 + (z1 - z0) * 0.45;
    k.box('showerGlass', x0 - 0.02, 0.06, z0, x0 + 0.02, 7.0, zg); k.box('black', x0 - 0.03, 0.06, zg - 0.03, x0 + 0.03, 7.0, zg + 0.03);
    k.solid(x0 - 0.05, z1 - 0.05, x1, z1 + 0.05, 0, 7); k.solid(x0 - 0.05, z0, x0 + 0.05, zg, 0, 7);
    k.box('tile:#ecebe7', x0 + 0.5, 0, z0 + 0.05, x1 - 0.1, 1.5, z0 + 1.3); k.solid(x0 + 0.5, z0, x1, z0 + 1.3, 0, 1.5);
    const hk = new Kit(bat, rs).at((x0 + x1) / 2, (z0 + z1) / 2, H.f2); hk.cyl('black', 0, 0, 0.02, 0.02, 7.3, 8, 4); hk.cyl('chrome', 0, 0, 0.55, 0.55, 7.25, 7.3, 18);
  }
  // freestanding soaking tub under the window
  { const k = at(914, 161.5, 0); k.cyl('porcelain', 0, 0, 1.35, 1.25, 0, 1.9, 24, 2.05); k.cyl('col:#eef1f2', 0, 0, 1.15, 1.15, 1.9, 1.905, 24, 2.1); k.cyl('black', 0, -2.6, 0.05, 0.05, 0, 3.4, 6); k.box('black', -0.04, 3.3, -2.6, 0.04, 3.36, -2.0); k.solid(-1.3, -2.7, 1.3, 2.7, 0, 1.9); }
  // 6 ft floating double vanity + linen tower on the west wall
  { const k = at(864, 162, 90);
    k.box('rcab', -3, 1.0, 0, 3, 2.75, 1.8); for (const s of [-1, 1]) { shaker(k, s > 0 ? 0.05 : -2.95, s > 0 ? 2.95 : -0.05, 1.05, 2.7, 1.8); pull(k, s * 1.5, 2.5, 1.8); }
    k.box('rcounter', -3.05, 2.75, 0, 3.05, 2.9, 1.9);
    for (const x of [-1.5, 1.5]) { k.cyl('porcelain', x, 0.95, 0.7, 0.6, 2.9, 3.25, 18, 0.75); k.cyl('black', x, 0.2, 0.04, 0.04, 2.9, 3.6, 6); k.box('black', x - 0.03, 3.5, 0.2, x + 0.03, 3.56, 0.6); k.box('mirror', x - 1.1, 3.9, 0, x + 1.1, 6.6, 0.05); k.box('black', x - 1.15, 3.85, -0.01, x + 1.15, 6.65, 0.03); }
    for (const x of [-2.75, 0, 2.75]) { k.box('black', x - 0.06, 5.0, 0, x + 0.06, 6.1, 0.15); k.cyl('shade', x, 0.3, 0.14, 0.14, 5.2, 5.9, 10); }
    k.solid(-3, 0, 3, 1.9, 1, 2.9); }
  { const k = at(864, 135, 90); k.box('rcab', -0.85, 0, 0, 0.85, 7.0, 1.7); shaker(k, -0.8, 0.8, 3.6, 6.9, 1.7); shaker(k, -0.8, 0.8, 0.4, 3.5, 1.7); k.solid(-0.85, 0, 0.85, 1.7, 0, 7); }
  { const k = at(914, 161.5); k.cyl('black', 0, 0, 0.02, 0.02, 5.6, 8, 4); for (let i = 0; i < 4; i++) k.cyl('shade', 0, 0, 0.5 - i * 0.1, 0.4 - i * 0.1, 5.4 + i * 0.12, 5.52 + i * 0.12, 14); }
  const rooms = [{ name: 'Primary Bath (remodel)', dims: "5'4\" x 5'6\" shower · soaking tub · 6' vanity", floor: 'tileBeige', wall: 'paint:#f4f3f0', poly: [[863, 129], [893, 129], [893, 109.5], [931, 109.5], [931, 185], [863, 185]] }].map((r, i) => roleRoom(LV.f2, r, i, 'pb'));
  for (const r of rooms) RENO_ROOMS.push({ rs, level: 'f2', room: r });
  RENO_LABELS.push(...buildLabels(LV.f2, renoGroup(rs, 'f2'), rooms).map((l) => ((l.userData.rs = rs), l)));
}

// ------------------------------------------------------------------ laundry / mudroom
function lockers(k, len, n) { // back at z = 0: open lockers over a bench, cubbies above
  const cw = len / n;
  k.box('rcab', 0, 0, 0, len, 7.2, 0.15);
  for (let i = 0; i <= n; i++) k.box('rcabDoor', i * cw - 0.04, 0, 0, i * cw + 0.04, 7.2, 1.6);
  k.box('rcabDoor', 0, 1.45, 0, len, 1.6, 1.6); k.soft('fab:#7c8a8f', 0.05, 1.6, 0.25, len - 0.05, 1.8, 1.55, 0.06);
  k.box('rcabDoor', 0, 5.6, 0, len, 5.7, 1.6); k.box('rcabDoor', 0, 7.1, 0, len, 7.25, 1.7);
  for (let i = 0; i < n; i++) { k.box('brass', i * cw + cw / 2 - 0.15, 4.6, 0.15, i * cw + cw / 2 + 0.15, 4.7, 0.4); k.box('fab:#6b5a48', i * cw + 0.2, 0.05, 0.25, i * cw + cw - 0.2, 1.0, 1.4); for (let j = 0; j < 2; j++) k.soft(fab(['#5d6b73', '#a9895f', '#7a4f44', '#3d4c5e'][(i + j) % 4]), i * cw + 0.25 + j * 0.6, 2.4, 0.2, i * cw + 0.75 + j * 0.6, 4.55, 0.5, 0.08); }
  k.solid(0, 0, len, 1.6, 0, 7.2);
}
function buildMudroom() {
  const rs = 'on:mud', bat = renoBat(rs, 'f1'), L = LV.f1;
  buildWall(L, [688, 378, 688, 451.5, 'i', [[384, 447, 'o', { cased: true, head: 7.6 }]], { rs }]);
  // slate-look tile for the whole laundry/mudroom
  const room = L._rooms.find((r) => r.name === 'Laundry');
  bat.poly('slate', room.pts, 0.03);
  bat.poly('slate', ftPoly([[688, 378], [725.5, 378], [725.5, 451.5], [688, 451.5]]), 0.03);
  // stacked washer + dryer in the old closet, shelf + cabinet above
  { const [x, z] = F(723.4, 414); const k = new Kit(bat, rs).at(x, z, 0, -90);
    for (const [y0, y1, front] of [[0, 3.0, true], [3.05, 6.0, false]]) { k.box('porcelain', -1.25, y0, 0.1, 1.25, y1, 2.45); k.cyl('col:#b9c0c6', 0, 2.46, 0.75, 0.75, y0 + 1.5 - 0.0, y0 + 1.5 + 0.0 + 0.01, 18); k.box('col:#d9dcdf', -1.0, y1 - 0.45, 2.45, 1.0, y1 - 0.15, 2.47); void front; }
    k.box('rcab', -1.4, 6.1, 0, 1.4, H.ceil1 - 0.03, 1.4); shaker(k, -1.35, -0.02, 6.15, H.ceil1 - 0.08, 1.4); shaker(k, 0.02, 1.35, 6.15, H.ceil1 - 0.08, 1.4); k.solid(-1.25, 0.1, 1.25, 2.45, 0, 6); }
  // lockers + bench on the stair wall, hooks, boot tray
  { const { k, len } = runKit(bat, rs, F(612.6, 428), F(612.6, 492), [1, 0]); lockers(k, len, 4); }
  { const [x, z] = F(650, 515); new Kit(bat, rs).at(x, z, 0, 0).box('blackMatte', -1.2, 0.03, -0.7, 1.2, 0.12, 0.7); }
  const rooms = [{ name: 'Laundry / Mudroom', dims: 'stacked W/D in the niche · 4 lockers', floor: 'slate', wall: 'paint:#f1f0ec', poly: room.poly }].map((r, i) => roleRoom(L, r, i, 'md'));
  for (const r of rooms) RENO_ROOMS.push({ rs, level: 'f1', room: r });
  RENO_LABELS.push(...buildLabels(L, renoGroup(rs, 'f1'), rooms).map((l) => ((l.userData.rs = rs), l)));
}

// ------------------------------------------------------------------ modern facade (geometry; finishes swap in app.js)
function buildFacade() {
  const rs = 'on:facade', bat = renoBat(rs, 'f1'), rb = renoBat(rs, 'roof');
  // cedar garage doors get a band of frosted glass and black frames (overlay just outside the doors)
  for (const [y0, y1] of [[403, 594], [613, 711]]) {
    const [x, za] = F(988.5, y0 + 3), [, zb] = F(0, y1 - 3);
    const k = new Kit(bat, rs);
    // (the glass band itself rides on the door sections: build.js garageDoor)
    k.box('black', x + 0.1, -0.6, za - 0.25, x + 0.2, 6.65, za); k.box('black', x + 0.1, -0.6, zb, x + 0.2, 6.65, zb + 0.25); k.box('black', x + 0.1, 6.4, za - 0.25, x + 0.2, 6.65, zb + 0.25);
  }
  // cedar slat accent wall at the entry (between the door and the stacked windows), full height
  { const [x0, z] = F(556, 566.6), [x1] = F(634, 0); const k = new Kit(bat, rs);
    k.box('col:#2b2c2e', x0, 2.6, z, x1, H.wallTop2, z + 0.05);
    for (let x = x0 + 0.1; x < x1 - 0.1; x += 0.33) k.box(wood('#a66d3c'), x, 2.6, z + 0.05, x + 0.22, H.wallTop2, z + 0.2); }
  // flat black steel entry canopy with a cedar soffit, no post
  { const [x0, z0] = F(476, 566.6), [x1, z1] = F(566, 616); const k = new Kit(bat, rs);
    k.box('col:#1f2022', x0, 8.6, z0, x1, 9.1, z1); k.box(wood('#a66d3c'), x0 + 0.15, 8.5, z0, x1 - 0.15, 8.6, z1 - 0.15);
    for (const x of [x0 + 0.8, x1 - 0.8]) k.box('col:#1f2022', x - 0.03, 9.1, z0, x + 0.03, 12.0, z0 + 0.05); }
  // modern sconces + house number at the door
  { const [x, z] = F(474.2, 590); const k = new Kit(bat, rs).at(x, z, 0, 90); k.box('col:#1f2022', -0.12, 5.6, 0, 0.12, 7.0, 0.3); k.box('bulb', -0.08, 5.5, 0.1, 0.08, 5.6, 0.25); k.box('bulb', -0.08, 7.0, 0.1, 0.08, 7.1, 0.25); }
  void rb;
}

// ------------------------------------------------------------------ backyard: bigger patio + playground
function pergola(k, x0, x1, z0, z1, top = 8.6) {
  const W = wood('#8a5a34');
  for (const x of [x0, x1]) for (const z of [z0, z1]) { k.cbox(W, x, z, 0.5, 0.5, 0, top + 0.6); k.cbox('foundation', x, z, 0.9, 0.9, 0, 0.3); k.solid(x - 0.3, z - 0.3, x + 0.3, z + 0.3, 0, top); }
  for (const z of [z0, z1]) for (const dz of [-0.33, 0.33]) k.box(W, x0 - 1.2, top - 0.2, z + dz - 0.08, x1 + 1.2, top + 0.65, z + dz + 0.08);
  for (let x = x0 - 0.9; x <= x1 + 0.9; x += 1.4) k.box(W, x - 0.08, top + 0.65, z0 - 1.4, x + 0.08, top + 1.25, z1 + 1.4);
  for (let z = z0 - 1.0; z <= z1 + 1.0; z += 0.9) k.box(W, x0 - 1.3, top + 1.25, z - 0.06, x1 + 1.3, top + 1.4, z + 0.06);
  for (let x = x0; x <= x1; x += 1.3) for (const z of [z0 + (z1 - z0) / 4, z0 + (z1 - z0) / 2, z0 + (3 * (z1 - z0)) / 4]) k.cyl('bulb', x, z, 0.08, 0.08, top - 0.25, top - 0.1, 6);
}
function buildPatio() {
  const rs = 'on:patio', bat = renoBat(rs, 'site'), y = -0.97;
  // L-shaped paver patio: off the dining slider and along the back of the family room
  const poly = [[-0.5, 13.6], [14.7, 13.6], [14.7, 2.2], [36.5, 2.2], [36.5, -15], [-0.5, -15]];
  bat.prism({ top: 'pavers', side: 'foundation' }, poly, -1.05, y);
  addFloorPoly(poly, [], y, rs);
  for (const [a, b] of [[[-0.5, -15], [36.5, -15]], [[-0.5, -15], [-0.5, 13.6]], [[36.5, -15], [36.5, 2.2]]]) { const k = new Kit(bat, rs); k.box('tile:#57534d', Math.min(a[0], b[0]) - 0.6, -1.05, Math.min(a[1], b[1]) - 0.6, Math.max(a[0], b[0]) + 0.6, y + 0.005, Math.max(a[1], b[1]) + 0.6); }
  // wide steps down from the slider
  { const [sx0] = F(350, 0), [sx1] = F(442, 0), [, sz] = F(0, 197.5); const k = new Kit(bat, rs);
    k.box('pavers', sx0, y, sz - 2.2, sx1, -0.66, sz); k.box('pavers', sx0 + 0.3, y, sz - 1.1, sx1 - 0.3, -0.33, sz); addFloorPoly([[sx0, sz - 2.2], [sx1, sz - 2.2], [sx1, sz - 1.1], [sx0, sz - 1.1]], [], -0.66, rs); addFloorPoly([[sx0 + 0.3, sz - 1.1], [sx1 - 0.3, sz - 1.1], [sx1 - 0.3, sz], [sx0 + 0.3, sz]], [], -0.33, rs); }
  const k = new Kit(bat, rs).at(0, 0, y, 0);
  pergola(k, 1.0, 13.5, 0.5, 9.5);
  const FB = renoBat('on:patio&furn', 'site'), fk = (x, z, rot, fn) => item(new Kit(FB, 'on:patio&furn').at(x, z, y, rot), fn);
  { const t = new Kit(FB, 'on:patio&furn').at(7.2, 5, y, 90); for (const [cx, cz, r] of swap(t, { glb: 'Table03', w: 7, d: 3.5, h: 2.5 }, (h) => diningTable(h, 7, 3.5, { color: '#4a4a4a' }))) { const p = t.P(cx, 0, cz); swap(new Kit(FB, 'on:patio&furn').at(p.x, p.z, y, r), { glb: 'Chair04' }, (h) => patioChair(h)); } }
  // lounge: outdoor sectional + chairs around a fire pit
  fk(26, -6.5, 0, firePit);
  fk(26, -12.6, 0, (k2) => swap(k2, { glb: 'Sofa08', w: 8.5, d: 3.15, back: true }, (h) => sofa(h, 8.5, { color: '#c8c1b4', cushion: '#d6d0c4', pillows: ['#2f5d6e', '#c98a3a'] })));
  for (const [dx, rot] of [[-5.2, 90], [5.2, -90]]) fk(26 + dx, -6.5, rot, (k2) => swap(k2, { glb: 'Chair44' }, (h) => adirondack(h, '#2f4a5a')));
  // grill counter along the family room wall
  fk(32, 1.5, 180, (k2) => { k2.box('stone', -4, 0, 0, 4, 3.0, 2.4); k2.box('col:#3a3a3a', -4.05, 3.0, -0.05, 4.05, 3.15, 2.5); k2.box('steel', -1.6, 3.15, 0.3, 1.6, 4.0, 2.2); k2.solid(-4, 0, 4, 2.4, 0, 3); });
  const L = { ...LV.f1, id: 'site' };
  RENO_LABELS.push(...buildLabels(L, renoGroup(rs, 'site'), [{ name: 'Patio (new)', dims: '~900 sq ft · pergola dining · fire pit lounge', pts: [[3, -10], [20, -10], [20, 0], [3, 0]], y: -0.9 }]).map((l) => ((l.userData.rs = rs), (l.userData.level = 'ext'), l)));
}
function buildPlay() {
  const rs = 'on:play', bat = renoBat(rs, 'site'), G = -1;
  const cx = 58, cz = -30;
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
  RENO_LABELS.push(...buildLabels(L, renoGroup(rs, 'site'), [{ name: 'Playground (new)', dims: 'play fort, slide, swings, sandbox', pts: [[cx - 4, cz - 4], [cx + 4, cz - 4], [cx + 4, cz + 4], [cx - 4, cz + 4]], y: 0 }]).map((l) => ((l.userData.rs = rs), (l.userData.level = 'ext'), l)));
}

// ------------------------------------------------------------------ basement finish + layouts
// lay:A  rec room + guest suite + gym, lay:B  theater + playroom + office, lay:C  open rec + ping-pong + craft room
function buildBasement() {
  const ALL = 'lay:A|lay:B|lay:C|lay:D', bat = renoBat(ALL, 'b'), Lb = LV.b, y0 = H.basement;
  const rooms = Lb._rooms.filter((r) => !/Utility|^Closet$/.test(r.name));
  for (const r of rooms) bat.poly(/Bath/.test(r.name) ? 'tile:#cfcac1' : 'lvp:#b49b7d', r.pts, y0 + 0.025);
  // the street-side closet off the bath comes out: its floor is bath tile now
  bat.poly('tile:#cfcac1', [P(LV.b, 687.5, 571.5), P(LV.b, 784, 571.5), P(LV.b, 784, 601.5), P(LV.b, 687.5, 601.5)], y0 + 0.025);
  // the roughed-in bath, finished: toilet, vanity, 3 x 4 ft shower
  const at = (b, t, x, y, rot = 0) => { const [lx, lz] = P(LV.b, x, y); return new Kit(b, t).at(lx, lz, y0, rot); };
  swap(at(bat, ALL, 690, 525, 90), { glb: 'Toilet03', back: true }, toilet);
  { const k = at(bat, ALL, 762.5, 474.8, 0); vanity(k, 3.0, 1, { faucet: 'black', frame: 'black', mirrorTop: 6.8, top: 'rcounter' }); lightBar(k, 2.4, 7.0, 3, 'black'); }
  // the walk-mode readout and the plan label follow the finished bath (as listed it reads "Bath (roughed in)")
  {
    const bathR = roleRoom(Lb, { name: 'Bath', dims: "7'1\" x 10'0\" · closet taken in: toilet, vanity, 3' x 4' shower", floor: 'concrete', wall: 'paint:#efefec', poly: [[687.5, 472.5], [784, 472.5], [784, 601.5], [687.5, 601.5]] }, 0, 'bb');
    RENO_ROOMS.push({ rs: ALL, level: 'b', room: bathR });
    RENO_LABELS.push(...buildLabels(Lb, renoGroup(ALL, 'b'), [bathR]).map((l) => ((l.userData.rs = ALL), l)));
  }
  // shower in the old closet's corner against the street wall: glass along the side, door gap on the room end
  { const [x0, z0] = P(LV.b, 742, 546), [x1, z1] = P(LV.b, 782, 596); const k = new Kit(bat, ALL).at(0, 0, y0, 0);
    k.box('tile:#ecebe7', x0, 0, z0, x1, 0.25, z1);
    k.box('showerGlass', x0 - 0.02, 0.25, z0 + 1.7, x0 + 0.02, 6.8, z1); k.box('black', x0 - 0.03, 6.8, z0, x0 + 0.03, 6.85, z1); k.solid(x0 - 0.05, z0 + 1.7, x0 + 0.05, z1, 0, 6.8);
    k.box('showerGlass', x0, 0.25, z0 - 0.02, x1, 6.8, z0 + 0.02); k.box('black', x0, 6.8, z0 - 0.03, x1, 6.85, z0 + 0.03); k.solid(x0, z0 - 0.05, x1, z0 + 0.05, 0, 6.8); }
  const lay = (L, x, y, rot, fn) => { const t = 'lay:' + L; item(at(renoBat(t, 'b'), t, x, y, rot), fn); };
  // ---- A: TV on the brown accent wall with a sectional, game table in the bay, wet bar, gym in the north room, guest bedroom east
  lay('A', 532.2, 430, -90, (k) => wallTV(k, 75));
  lay('A', 532.2, 430, -90, (k) => swap(k, { glb: 'Drawer40', w: 6, d: 1.4, h: 2.2, back: true }, (h) => mediaConsole(h, 6)));
  lay('A', 383, 430, 90, (k) => swap(k, { glb: 'Sofa36', w: 9, d: 3.15, back: true }, (h) => sofa(h, 9, { color: '#5e5348', cushion: '#665a4e', pillows: ['#8b6f4e', '#a1886a'] })));
  lay('A', 455, 430, 90, (k) => swap(k, { glb: 'Table38', w: 4.5, d: 2.2 }, (h) => coffeeTable(h, 4.5, 2.2, '#4b3426')));
  lay('A', 455, 430, 0, (k) => rug(k, 9, 12, '#bfb3a2', '#8a7d6c'));
  lay('A', 455, 655, 0, (k) => { for (const [cx, cz, r] of [[0, 2.7, 180], [0, -2.7, 0], [2.7, 0, -90], [-2.7, 0, 90]]) { const p = k.P(cx, 0, cz); swap(new Kit(k.bat, k.tag).at(p.x, p.z, k.oy, r), { glb: 'Chair29' }, (h) => chair(h, '#3e4a54', '#2b2b2b')); } swap(k, { glb: 'Table23', w: 4, d: 4, h: 2.5 }, (h) => { h.cyl(wood('#2f2219'), 0, 0, 2.0, 2.0, 2.4, 2.5, 20); h.cyl(wood('#2f2219'), 0, 0, 0.2, 0.25, 0, 2.4, 8); h.solid(-1.5, -1.5, 1.5, 1.5, 0, 2.5); }); });
  lay('A', 615, 210.8, 0, (k) => { k.box('rcab', -5, 0.35, 0, 5, 2.92, 2.0); k.box('rcounter', -5.05, 2.92, 0, 5.05, 3.08, 2.1); k.box('rcab', -5, 4.6, 0, 5, 7.0, 1.1); for (let i = -3; i <= 3; i += 2) shaker(k, i - 0.95, i + 0.95, 0.45, 2.85, 2.0); k.solid(-5, 0, 5, 2.1, 0, 3.08); });
  lay('A', 615, 262, 180, (k) => { for (const x of [-3, -1, 1, 3]) { const p = k.P(x, 0, -0.2); swap(new Kit(k.bat, k.tag).at(p.x, p.z, k.oy, 0), { glb: 'Chair22' }, (h) => stool(h, '#7d6a5a')); } });
  lay('A', 652.5, 138, 0, (k) => rubberFloor(k, 17, 9.5)); // mat from the west wall so the rack stands on it
  lay('A', 543.3, 138, 90, (k) => powerRack(k));
  lay('A', 625, 138, 90, (k) => liftBench(k));
  lay('A', 620, 69.8, 0, (k) => dumbbellRack(k, 5.5)); // on the north wall west of the furnace + softener
  lay('A', 766, 148, 0, (k) => pelotonBike(k)); // 59" long, along the east wall, rider facing out toward the rec room (keeps the doorway clear)
  lay('A', 930.7, 320, -90, (k) => swap(k, { glb: 'Bed15', w: 5.35, d: 7.2, back: true }, (h) => bed(h, 'queen', { frame: '#6b4a33', duvet: '#efeae0', accent: '#5f7f8c', headboard: '#cfc6b8' })));
  lay('A', 930.7, 270, -90, (k) => swap(k, { glb: 'Drawer02', back: true }, (h) => nightstand(h))); lay('A', 930.7, 370, -90, (k) => swap(k, { glb: 'Drawer02', back: true }, (h) => nightstand(h))); // clear of the 5.6 ft wide queen
  lay('A', 850, 238.3, 0, (k) => swap(k, { glb: 'Drawer40', w: 4.5, back: true }, (h) => dresser(h, 4.5, { lamp: true })));
  // ---- B: theater in the north room, playroom in the rec room, office in the east room
  lay('B', 782, 140, -90, (k) => projectionScreen(k, 110));
  lay('B', 782, 95, -90, (k) => towerSpeaker(k)); lay('B', 782, 185, -90, (k) => towerSpeaker(k));
  for (const [x, h] of [[680, 0], [575, 0.8]]) for (const y of [100, 140, 180]) lay('B', x, y, 90, (k) => { // theater recliner (faces +x, toward the screen): 35" wide incl. arms (seats on 3.1 ft centers), 38" deep, 40" high; back row on an 10" riser
    if (h) k.box('col:#3a302a', -1.55, 0, -1.9, 1.55, h, 1.9); const kk = new Kit(k.bat, k.tag).at(k.ox, k.oz, k.oy + h, k.rot);
    swap(kk, { glb: 'Chair20', w: 2.9, d: 3.0, dz: -0.05 }, (q) => { q.soft('col:#2c2c2e', -1.1, 0.3, -1.4, 1.1, 1.5, 1.5, 0.25); q.soft('col:#2c2c2e', -1.05, 1.2, -1.6, 1.05, 3.35, -0.6, 0.35);
    for (const s of [-1, 1]) q.soft('col:#2c2c2e', s * 1.27 - 0.18, 0.3, -1.4, s * 1.27 + 0.18, 2.2, 1.3, 0.15);
    q.solid(-1.45, -1.6, 1.45, 1.5, 0, 3.2); }); if (h) k.solid(-1.55, -1.9, 1.55, 1.9, 0, h); });
  lay('B', 457, 420, 0, (k) => rug(k, 10, 14, '#a9c4d6', '#3d6e8a'));
  lay('B', 420, 300, 0, (k) => { k.box(wood('#e8d9bf'), -1.5, 0, -1, 1.5, 1.8, 1); k.box('col:#d9452f', -1.4, 1.8, -0.9, -0.2, 2.6, 0.9); k.box('col:#2f6fbf', 0.2, 1.8, -0.9, 1.4, 2.4, 0.9); });
  lay('B', 348.3, 470, 90, (k) => { for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) k.box('col:' + ['#f2b632', '#3a9b4a', '#d9452f', '#2f6fbf'][(i + j) % 4], -2.6 + i * 1.8, 0.1 + j * 1.3, 0.1, -1.0 + i * 1.8, 1.2 + j * 1.3, 1.3); k.box(wood('#e8d9bf'), -2.8, 0, 0, 2.8, 2.7, 0.1); });
  lay('B', 440, 560, 0, (k) => { k.cyl(wood('#e8d9bf'), 0, 0, 1.6, 1.6, 1.7, 1.8, 18); k.cyl(wood('#e8d9bf'), 0, 0, 0.15, 0.15, 0, 1.7, 8); for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; k.cyl('col:' + ['#f2b632', '#3a9b4a', '#d9452f', '#2f6fbf'][i], Math.cos(a) * 2.2, Math.sin(a) * 2.2, 0.55, 0.55, 0, 1.0, 12); } });
  lay('B', 860, 238.3, 0, (k) => swap(k, { glb: 'Table49', w: 5.5, d: 2.5, h: 2.5, back: true }, (h) => officeDesk(h, 5.5))); lay('B', 860, 272, 180, (k) => swap(k, { glb: 'Chair33' }, (h) => officeChair(h)));
  lay('B', 930.7, 300, -90, (k) => bookcase(k, 3.0, 6.5, 7)); lay('B', 930.7, 345, -90, (k) => bookcase(k, 3.0, 6.5, 9));
  // ---- C: open rec room with a sectional in the bay end, ping-pong in the rec room, gym north, craft room east
  lay('C', 383, 570, 90, (k) => swap(k, { glb: 'Sofa16', w: 9, d: 3.15, back: true }, (h) => sofa(h, 9, { color: '#7d8a86', cushion: '#86938f', pillows: ['#c9a96e', '#e9e3d6'] })));
  lay('C', 455, 570, 90, (k) => swap(k, { glb: 'Table38', w: 4.5, d: 2.2 }, (h) => coffeeTable(h, 4.5, 2.2, '#4b3426')));
  lay('C', 532.2, 570, -90, (k) => wallTV(k, 65));
  // ping-pong: regulation 9 x 5 ft top at 30", ~6.5 ft of play room past each end
  lay('C', 447, 380, 90, (k) => { k.box('col:#1f4e7a', -4.5, 2.4, -2.5, 4.5, 2.5, 2.5); for (const [x0, z0, x1, z1] of [[-4.5, -2.5, 4.5, -2.44], [-4.5, 2.44, 4.5, 2.5], [-4.5, -2.5, -4.44, 2.5], [4.44, -2.5, 4.5, 2.5]]) k.box('white', x0, 2.5, z0, x1, 2.505, z1); k.box('white', -4.5, 2.5, -0.02, 4.5, 2.52, 0.02); k.box('col:#f4f4f2', -0.02, 2.5, -2.6, 0.02, 3.0, 2.6); for (const [x, z] of [[-3.8, -2], [3.8, -2], [-3.8, 2], [3.8, 2]]) k.cbox('black', x, z, 0.25, 0.25, 0, 2.4); k.solid(-4.5, -2.5, 4.5, 2.5, 0, 2.5); });
  lay('C', 652.5, 138, 0, (k) => rubberFloor(k, 17, 9.5));
  lay('C', 543.3, 138, 90, (k) => powerRack(k)); lay('C', 620, 69.8, 0, (k) => dumbbellRack(k, 5.5)); lay('C', 700, 160, -90, (k) => treadmill(k));
  lay('C', 860, 310, 0, (k) => swap(k, { glb: 'Table04', w: 6, d: 3, h: 3 }, (h) => { h.box(wood('#e8d9bf'), -3, 2.9, -1.5, 3, 3.0, 1.5); for (const [x, z] of [[-2.8, -1.3], [2.8, -1.3], [-2.8, 1.3], [2.8, 1.3]]) h.cbox('col:#8a6b4e', x, z, 0.2, 0.2, 0, 2.9); h.solid(-3, -1.5, 3, 1.5, 0, 3); }));
  lay('C', 930.7, 320, -90, (k) => shelving(k, 6, 1.5, 6.5));
}


// ------------------------------------------------------------------ classic refresh (finishes swap in app.js)
function coachLantern(k, y) { // black coach lantern, back at z = 0
  k.box('black', -0.2, y - 0.9, 0, 0.2, y + 0.4, 0.1);
  k.box('black', -0.04, y - 0.1, 0.1, 0.04, y - 0.02, 0.55);
  k.cyl('black', 0, 0.75, 0.28, 0.4, y + 0.45, y + 0.8, 4); k.cyl('black', 0, 0.75, 0.05, 0.05, y + 0.8, y + 1.0, 4);
  k.cyl('bulb', 0, 0.75, 0.24, 0.3, y - 0.65, y + 0.45, 4);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; k.box('black', Math.cos(a) * 0.3 - 0.03, y - 0.7, 0.75 + Math.sin(a) * 0.3 - 0.03, Math.cos(a) * 0.3 + 0.03, y + 0.45, 0.75 + Math.sin(a) * 0.3 + 0.03); }
  k.cyl('black', 0, 0.75, 0.32, 0.22, y - 0.85, y - 0.65, 4);
}
function buildClassic() {
  const rs = 'on:classic', bat = renoBat(rs, 'f1');
  const [lx, lz] = F(477, 575); coachLantern(new Kit(bat, rs).at(lx + 0.58, lz, 0, 90), 6.3);   // on the tower's brick return
  const [rx, rz] = F(553, 596.3); coachLantern(new Kit(bat, rs).at(rx, rz, 0, 0), 6.3);           // on the brick pier
  const [px, pz] = F(517, 575); const k = new Kit(bat, rs).at(px, pz, 0); k.cyl('black', 0, 0, 0.02, 0.02, 10, 16.9, 4); coachLantern(new Kit(bat, rs).at(px, pz - 0.75, 0, 0), 9.3); // hanging lantern in the 2-story recess
}

// ------------------------------------------------------------------ basement "Open plan" (layout D)
// Main beam assumption: a steel/LVL beam on steel posts runs front-to-back under the 1st floor's main bearing line
// (kitchen|hall and living|foyer walls, bedroom 3 / bedroom 2 walls above), i.e. along the long rec-room partition
// whose brown "pilasters" in the listing photo are the wrapped posts. A second line follows the stair's east wall.
const BEAM1 = { x: 534.5, y0: 236, y1: 601.5, posts: [373.5, 458.5, 535.5] };
const BEAM2 = { x: 687.5, y0: 208.5, y1: 458.5, posts: [330.5] };
function buildOpenBasement() {
  const rs = 'lay:D', bat = renoBat(rs, 'b'), Lb = LV.b, y0 = H.basement, ceil = y0 + Lb.ceiling;
  const k = new Kit(bat, rs);
  for (const B of [BEAM1, BEAM2]) {
    const [x, z0] = P(Lb, B.x, B.y0), [, z1] = P(Lb, B.x, B.y1);
    k.box('plaster', x - 0.45, ceil - 0.95, z0, x + 0.45, ceil, z1);                     // dropped soffit around the beam
    k.box('trim', x - 0.5, ceil - 1.0, z0, x + 0.5, ceil - 0.95, z1);
    for (const py of B.posts) {
      const [, z] = P(Lb, B.x, py), c = new Kit(bat, rs).at(x, z, y0);
      c.cbox('plaster', 0, 0, 0.9, 0.9, 0, ceil - 0.95 - y0);                           // post wrapped as a square column
      c.cbox('trim', 0, 0, 1.1, 1.1, 0, 0.45); c.cbox('trim', 0, 0, 1.05, 1.05, ceil - 1.25 - y0, ceil - 0.95 - y0);
      c.solid(-0.55, -0.55, 0.55, 0.55, 0, 8);
    }
  }
  // under-stair storage closed off now that the stair-hall walls are gone
  buildWall(Lb, [636.5, 458.5, 687.5, 458.5, 'i', [[646, 678, 'd', { hinge: 'lo', into: '-y', color: '#d9b98a' }]], { rs }]);
  const room = roleRoom(Lb, { name: 'Open Rec Room', dims: 'partitions removed · beam + 4 wrapped posts', floor: 'concrete', wall: 'paint:#e4e2de',
    poly: [[380, 236], [541, 236], [541, 208.5], [784.5, 208.5], [784, 330.5], [784, 354.5], [809.5, 354.5], [809.5, 403.5], [784, 403.5], [784, 472.5], [687.5, 472.5], [687.5, 601.5], [534, 601.5], [534, 702], [501, 702], [494, 721.5], [426, 721.5], [419, 702], [380, 702], [380, 528.5], [346, 528.5], [346, 374.5], [380, 374.5]] }, 0, 'od');
  RENO_ROOMS.push({ rs, level: 'b', room });
  RENO_LABELS.push(...buildLabels(Lb, renoGroup(rs, 'b'), [{ ...room, pts: [P(Lb, 440, 420), P(Lb, 480, 420), P(Lb, 480, 460), P(Lb, 440, 460)] }]).map((l) => ((l.userData.rs = rs), l)));
  // furniture: sectional + TV on the back wall, game table in the bay, play area in the old hall, gym in the north room
  const at = (x, y, rot = 0) => { const [lx, lz] = P(Lb, x, y); return new Kit(renoBat(rs, 'b'), rs).at(lx, lz, y0, rot); };
  wallTV(at(460, 238.3, 0), 75); swap(at(460, 238.3, 0), { glb: 'Drawer40', w: 6, d: 1.4, h: 2.2, back: true }, (h) => mediaConsole(h, 6));
  // 10 x 7.5 ft L sectional (back to the room, return along the west wall) facing the TV, coffee table between
  sectional(at(515.5, 360, 180), 10, 7.5, { color: '#6d6458', cushion: '#766c60', pillows: ['#b48a5a', '#5d6b73'] });
  swap(at(462, 287.5, 0), { glb: 'Table38', w: 4.5, d: 2.0 }, (h) => coffeeTable(h, 4.5, 2.0, '#4b3426')); rug(at(458, 300, 0), 10, 13, '#c9bda9', '#8a7d6c');
  { const kk = at(455, 655, 0); for (const [cx, cz, r] of [[0, 2.7, 180], [0, -2.7, 0], [2.7, 0, -90], [-2.7, 0, 90]]) { const p = kk.P(cx, 0, cz); swap(new Kit(kk.bat, kk.tag).at(p.x, p.z, kk.oy, r), { glb: 'Chair29' }, (h) => chair(h, '#3e4a54', '#2b2b2b')); } swap(kk, { glb: 'Table23', w: 4, d: 4, h: 2.5 }, (h) => { h.cyl(wood('#2f2219'), 0, 0, 2.0, 2.0, 2.4, 2.5, 20); h.cyl(wood('#2f2219'), 0, 0, 0.2, 0.25, 0, 2.4, 8); h.solid(-1.5, -1.5, 1.5, 1.5, 0, 2.5); }); }
  rug(at(595, 405, 0), 8, 10, '#a9c4d6', '#3d6e8a');
  { const kk = at(600, 390, 0); kk.box(wood('#e8d9bf'), -1.5, 0, -1, 1.5, 1.8, 1); kk.box('col:#d9452f', -1.4, 1.8, -0.9, -0.2, 2.6, 0.9); kk.box('col:#2f6fbf', 0.2, 1.8, -0.9, 1.4, 2.4, 0.9); kk.solid(-1.5, -1, 1.5, 1, 0, 2.6); }
  { const kk = at(634.2, 405, -90); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) kk.box('col:' + ['#f2b632', '#3a9b4a', '#d9452f', '#2f6fbf'][(i + j) % 4], -2.6 + i * 1.8, 0.1 + j * 1.3, 0.1, -1.0 + i * 1.8, 1.2 + j * 1.3, 1.3); kk.box(wood('#e8d9bf'), -2.8, 0, 0, 2.8, 2.7, 0.1); kk.solid(-2.8, 0, 2.8, 1.3, 0, 2.7); }
  rubberFloor(at(652.5, 138, 0), 17, 9.5); powerRack(at(543.3, 138, 90)); liftBench(at(625, 138, 90)); dumbbellRack(at(620, 69.8, 0), 5.5); pelotonBike(at(766, 148, 0));
  // east room as a guest room / office
  swap(at(860, 238.3, 0), { glb: 'Table49', w: 5.5, d: 2.5, h: 2.5, back: true }, (h) => officeDesk(h, 5.5)); swap(at(860, 272, 180), { glb: 'Chair33' }, officeChair);
  swap(at(930.7, 330, -90), { glb: 'Sofa01', w: 7, d: 3.15, back: true }, (h) => sofa(h, 7, { color: '#8a7d6c' }));
}

export function buildRenovations() {
  buildKitchen();
  buildOpenLiving();
  buildRefresh();
  buildPrimaryBath();
  buildMudroom();
  buildFacade();
  buildPatio();
  buildPlay();
  buildBasement();
  buildClassic();
  buildOpenBasement();
}
export { shaker, pendant, orb, linearPendant };
