// Renovation options. Each one adds geometry to an 'on:<name>' set; the as-built parts it replaces
// are tagged 'off:<name>' elsewhere (data.js walls, furnish.js fixtures, build.js roofs, site.js).
// Every option is independent: any combination can be on.
//
// Wall openings (no new floor area; each keeps wing walls / a header so the rooms still read as rooms)
//   openSun     sun room <-> family room: the single French door becomes an 8'6" cased opening.
//   openLiving  family room <-> living room: the French pair becomes a 9 ft cased opening.
//   openFoyer   living room <-> foyer: the wall goes; a colonnade takes its place: two tapered square
//               columns on paneled pedestals under a cased beam, ~5'10" clear between them.
//   (The short oak rail + column between the nook and family room belongs to none of these walls and stays.)
// Interiors
//   kitchen     shaker cabinets, 36" range + hood, built-in fridge wall, 9 ft island (unchanged).
//   pbath       primary bath, same footprint and door (the walk-in closet is left alone; the small linen
//               closet and the corner tub are absorbed). Fixtures stay near their existing drains:
//               water closet 3'1" x 4'8" where the toilet is (door swings out, ~29" clear in front);
//               shower 4'0" x 4'7" where the old shower + linen closet were, 6 ft from the window, with a
//               30" walk-in entry beside the valve wall; 72" double vanity on the closet wall, side-lit by
//               the window; window seat in the bump (dry zone); built-in linen cabinet by the door.
//               3 ft clear between water closet wall and shower glass, 5 ft in front of the vanity.
// Additions (were one 'rear addition' of ~950 sq ft; now three pieces, ~135 sq ft of new foundation in all)
//   mud         mudroom, 11'0" x 10'11", made from the garage's rear storage bay: no new footprint or roof.
//               Garage door, the existing driveway-side door and a new back-yard door all arrive here;
//               a new door at the end of the hall leads to laundry / half bath / kitchen. The old
//               garage-to-hall door is closed and the laundry's back door becomes a window, so every
//               family entry passes the lockers. It opens to the hall, not to a pantry.
//   bump        breakfast bump-out: the angled bay is squared off and pushed to 5'6" beyond the rear wall,
//               15'7" wide (~65 sq ft new). Seats six at a 7 ft table next to the island; slider to the
//               patio; the sun room's slider wall becomes a cased opening into it.
//   sunext      sun room 6 ft longer (11'6" x 16'9", ~70 sq ft new): the arched gable wall moves west,
//               roof and ridge beam continue, one more skylight.
//   garage2     detached 2-car garage/studio at the end of a longer driveway (golf / pottery / gym).
import * as THREE from 'three';
import { toFt, F2 } from './data.js';
import { Kit, V, addFloorPoly, addSolid, pip } from './geom.js';
import { LV, P, CTX, renoBat, renoGroup, roleRoom, buildWall, buildLabels, gableRoof, leanRoof, gableTri, buildSunroomGable, ROOFT } from './build.js';
import {
  toilet, vanity, lightBar, diningTable, chair, buffet, firePit, adirondack, patioDining, patioChair, powerRack, liftBench, dumbbellRack,
  pelotonBike, rubberFloor, shelving, recessed, flushDome, rug, sofa, armchair, coffeeTable, floorLamp, plant, runKit, IRON, RUBBER, disc,
  bar, taperLeg, knob, bench, exteriorLantern,
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

// ------------------------------------------------------------------ wall openings (three separate options)
function buildOpenings() {
  const L = LV.f1;
  // sun room <-> family room: the French-door wall becomes an 8'6" cased opening (wing walls stay)
  buildWall(L, [1420.5, 310.5, 1703.5, 310.5, 'i', [[1462, 1662, 'o', { cased: true }]], { rs: 'on:openSun' }]);
  // family room <-> living room: the French pair becomes a 9 ft cased opening
  buildWall(L, [1422, 626.5, 1703.5, 626.5, 'i', [[1455, 1670, 'o', { cased: true }]], { rs: 'on:openLiving' }]);
  // living room <-> foyer: colonnade. Tapered square columns on paneled pedestals carry a cased beam.
  const rs = 'on:openFoyer', bat = renoBat(rs, 'f1'), k = new Kit(bat, rs);
  const [x, zN] = toFt([1422, 626.5]), [, zM] = toFt([0, 704]), [, zS] = toFt([0, 866]);
  k.box('trim', x - 0.42, 7.25, zN - 0.17, x + 0.42, 8.0, zS + 0.17);       // beam
  k.box('trim', x - 0.5, 7.17, zN - 0.17, x + 0.5, 7.25, zS + 0.17);
  const pedestal = (z0, z1, colZ) => {
    k.box('trim', x - 0.5, 0, z0, x + 0.5, 3.0, z1);
    k.box('trim', x - 0.56, 0, z0 - 0.04, x + 0.56, 0.45, z1 + 0.04);      // base
    k.box('trim', x - 0.62, 3.0, z0 - 0.1, x + 0.62, 3.14, z1 + 0.1);      // cap
    for (const s of [-1, 1]) k.box('trim', x + s * 0.5 - 0.02, 0.75, z0 + 0.22, x + s * 0.5 + 0.02, 2.7, z1 - 0.22); // panel
    k.solid(x - 0.5, z0, x + 0.5, z1, 0, 3.1);
    const c = new Kit(bat, rs).at(x, colZ, 0, 45), R = Math.SQRT1_2;
    c.cyl('trim', 0, 0, 0.84 * R, 0.84 * R, 3.14, 3.34, 4);                // plinth
    c.cyl('trim', 0, 0, 0.74 * R, 0.52 * R, 3.34, 7.0, 4);                 // tapered shaft
    c.cyl('trim', 0, 0, 0.7 * R, 0.7 * R, 7.0, 7.17, 4);                   // capital
    k.solid(x - 0.37, colZ - 0.37, x + 0.37, colZ + 0.37, 3.1, 7.2);
  };
  pedestal(zN + 0.17, zM + 0.3, zM - 0.15); // fills the short bay beside the family-room passage
  pedestal(zS - 0.75, zS + 0.1, zS - 0.33); // at the coat-closet corner
}

// ------------------------------------------------------------------ primary bath remodel
// Plan (2nd-floor px, 36.75 px/ft). Same room, same door; the wet fixtures stay near their drains:
//   water closet 3'1" x 4'8" in the south-west corner where the toilet already is (door swings out)
//   shower 4'0" x 4'7" in the corner where the old shower + linen closet were, glass toward the room
//   72" double vanity on the closet wall between the window bump and the shower's valve wall
//   window seat under the window (dry zone), built-in linen cabinet on the south wall by the door
function buildPrimaryBath() {
  const L = LV.f2, rs = 'on:pbath', bat = renoBat(rs, 'f2');
  const TILE = 'tile:#ecebe7';
  const rooms = [
    { name: 'Shower', floor: 'tile4', wall: TILE, noLabel: true, poly: [[512, 295], [673, 295], [673, 477], [512, 477]] },
    { name: 'Water Closet', dims: "3'1\" x 4'8\"", floor: 'tileBeige', wall: 'paint:#f2f0ea', poly: [[270, 111.5], [400, 111.5], [400, 300], [270, 300]] },
    { name: 'Primary Bath', dims: "remodel: 4'0\" x 4'7\" shower, WC, 72\" vanity", floor: 'tileBeige', wall: 'paint:#f2f0ea',
      poly: [[384, 52.5], [673, 52.5], [673, 295], [512, 295], [512, 477], [270, 477], [270, 300], [400, 300], [400, 111.5], [384, 111.5]] },
  ].map((r, i) => roleRoom(L, r, i, 'pb'));
  const drop = new Set(['Shower', 'Primary Bath']);
  CTX.rooms = [...rooms, ...L._rooms.filter((r) => !drop.has(r.name) && !(r.name === 'Linen' && r.poly[0][0] === 581))];
  for (const w of [
    [673, 111.5, 673, 477, 'i'],                                              // closet wall (unchanged position)
    [384, 111.5, 403, 111.5, 'i'],                                            // short return at the bump corner
    [400, 111.5, 400, 300, 'i', [[205, 293, 'd', { hinge: 'lo', into: '+x' }]]], // water closet, door swings out
    [270, 300, 403, 300, 'i'],
    [512, 295, 673, 295, 'i'],                                                // shower valve wall; the vanity dies into it
  ]) buildWall(L, [...w.slice(0, 5), w[5] || [], { rs }], bat);
  CTX.rooms = null;
  for (const r of rooms) { bat.poly(r.floorKey, r.pts, 9.035); RENO_ROOMS.push({ rs, level: 'f2', room: r }); }
  RENO_LABELS.push(...buildLabels(L, renoGroup(rs, 'f2'), rooms).map((l) => ((l.userData.rs = rs), l)));
  const at = (x, y, rot = 0) => { const [lx, lz] = P(L, x, y); return new Kit(bat, rs).at(lx, lz, 9, rot); };
  { // curbless shower: 30" walk-in entry beside the valve wall, fixed glass panel beyond it, bench at the back
    const { k, len } = runKit(bat, rs, P(L, 512, 393.5), P(L, 512, 470.6), [-1, 0], 9);
    k.box('showerGlass', 0, 0.05, -0.02, len, 7.0, 0.02);
    k.box('black', 0, 0, -0.03, len, 0.05, 0.03); k.box('black', 0, 7.0, -0.03, len, 7.05, 0.03);
    for (const x of [0, len - 0.05]) k.box('black', x, 0.05, -0.03, x + 0.05, 7.0, 0.03);
    k.box('black', 0.35, 3.3, 0.02, len - 0.35, 3.36, 0.14); k.soft(fab('#e9e5dc'), 0.5, 2.0, 0.1, len - 0.5, 3.4, 0.22, 0.05); // towel bar on the glass
    k.solid(0, -0.05, len, 0.05, 0, 7);
    const bk = at(592.5, 470.6, 180); bk.box(TILE, -2.0, 0, 0, 2.0, 1.5, 1.2); bk.solid(-2.0, 0, 2.0, 1.2, 0, 1.5);
    const hk = at(592.5, 375, 0); hk.cyl('black', 0, 0, 0.02, 0.02, 7.3, 8, 4); hk.cyl('chrome', 0, 0, 0.55, 0.55, 7.25, 7.3, 18); // rain head
    const vk = at(560, 301.4, 0); vk.cyl('black', 0, 0.06, 0.2, 0.2, 3.7, 3.72, 12); vk.box('black', -0.04, 3.9, 0, 0.04, 4.0, 0.14); // valve, reachable from the entry
    vk.box('black', 1.4, 3.4, 0, 1.46, 6.2, 0.06); vk.box('chrome', 1.33, 5.5, 0.06, 1.53, 6.1, 0.14);                          // hand shower on a rail
    const nk = at(666.6, 400, -90); nk.box('col:#c9c6bf', -0.6, 3.6, 0, 0.6, 4.8, 0.02); nk.box('col:#f4f3ef', -0.6, 4.18, 0, 0.6, 4.22, 0.05); // niche
    at(592.5, 420, 0).box('col:#7d8083', -1.7, 0.036, -0.08, 1.7, 0.045, 0.08);                                               // linear drain
  }
  { // window seat in the bump, under the (existing) window: the dry zone
    const k = at(497, 61.7, 0);
    k.box('cab', -2.55, 0, 0, 2.55, 1.4, 1.3); k.box('cabDoor', -2.55, 1.4, 0, 2.55, 1.5, 1.36);
    k.soft(fab('#d9d2c2'), -2.45, 1.5, 0.08, 2.45, 1.75, 1.3, 0.08);
    k.solid(-2.55, 0, 2.55, 1.3, 0, 1.6);
  }
  // 72" double vanity on the closet wall, side-lit by the window
  vanity(at(663.8, 175.5, -90), 6, 2, { mirrorTop: 7.0, faucet: 'black', frame: 'black' });
  lightBar(at(663.8, 175.5, -90), 5.0, 7.3, 3, 'black');
  toilet(at(338, 120.7, 0));
  { const k = at(279.2, 190, 90); k.box('black', -0.15, 2.2, 0, 0.15, 2.26, 0.3); k.cyl('white', 0, 0.3, 0.2, 0.2, 2.03, 2.43, 10); } // paper holder
  { // built-in linen cabinet on the south wall, between the water closet and the bedroom wall
    const k = at(279.2, 392, 90), w = 1.9, d = 1.4;
    k.box('cab', -w, 0.35, 0, w, 7.4, d); k.box('blackMatte', -w, 0, 0, w, 0.35, d - 0.2);
    for (const [a, b] of [[-w + 0.03, -0.02], [0.02, w - 0.03]]) { k.box('cabDoor', a, 3.3, d, b, 7.35, d + 0.07); k.box('cabDoor', a, 0.4, d, b, 3.2, d + 0.07); }
    for (const x of [-0.14, 0.14]) { k.box('black', x - 0.025, 4.0, d + 0.07, x + 0.025, 4.7, d + 0.13); k.box('black', x - 0.025, 2.2, d + 0.07, x + 0.025, 2.9, d + 0.13); }
    k.solid(-w, 0, w, d, 0, 7.4); }
  for (const [x, y] of [[592.5, 385], [470, 170], [470, 330], [335, 215], [380, 420]]) recessed(at(x, y), 8);
}

// ------------------------------------------------------------------ additions (three separate options)
function lockers(k, len, n) { // back at z = 0: open lockers over a bench, cubbies above
  const cw = len / n;
  k.box('cab', 0, 0, 0, len, 7.2, 0.15);
  for (let i = 0; i <= n; i++) k.box('cabDoor', i * cw - 0.04, 0, 0, i * cw + 0.04, 7.2, 1.6);
  k.box('cabDoor', 0, 1.45, 0, len, 1.6, 1.6); k.soft('fab:#7c8a8f', 0.05, 1.6, 0.25, len - 0.05, 1.8, 1.55, 0.06);
  k.box('cabDoor', 0, 5.6, 0, len, 5.7, 1.6); k.box('cabDoor', 0, 7.1, 0, len, 7.25, 1.7);
  for (let i = 0; i < n; i++) { k.box('brass', i * cw + cw / 2 - 0.15, 4.6, 0.15, i * cw + cw / 2 + 0.15, 4.7, 0.4); k.box('fab:#6b5a48', i * cw + 0.2, 0.05, 0.25, i * cw + cw - 0.2, 1.0, 1.4); }
  k.solid(0, 0, len, 1.6, 0, 7.2);
}
// shared by the room-building options: walls, floor (finish + structure + physics), labels
function addRooms(L, rs, prefix, defs, foot, walls, floorBase = -1) {
  const bat = renoBat(rs, L.id);
  const rooms = defs.map((r, i) => roleRoom(L, r, i, prefix));
  CTX.rooms = [...rooms, ...L._rooms];
  CTX.foot = foot.map((poly) => poly.map(([x, y]) => toFt([x, y])));
  for (const w of walls) buildWall(L, [...w.slice(0, 5), w[5] || [], { rs, ...(w[6] || {}) }], bat);
  CTX.rooms = null; CTX.foot = null;
  for (const r of rooms) {
    RENO_ROOMS.push({ rs, level: L.id, room: r });
    bat.prism({ top: 'subfloor', side: 'foundation' }, r.pts, floorBase, 0);
    bat.poly(r.floorKey, r.pts, 0.03);
    addFloorPoly(r.pts, [], 0, rs);
  }
  RENO_LABELS.push(...buildLabels(L, renoGroup(rs, L.id), rooms).map((l) => ((l.userData.rs = rs), l)));
  return bat;
}
const ftPoly = (pts) => pts.map(([x, y]) => toFt([x, y]));
const WHITE = '#f2f2ee';

// Mudroom: the garage's rear storage bay (behind the car bays, beside the laundry) is finished as an
// 11 x 11 ft family entry. No new foundation or roof. Garage, driveway-side door and a new back-yard
// door all arrive here; a new door at the end of the hall leads on to laundry / half bath / kitchen.
function buildMudroom() {
  const L = LV.f1, rs = 'on:mud';
  const poly = [[260.5, 392.5], [524.5, 392.5], [524.5, 654.5], [260.5, 654.5]];
  const bat = addRooms(L, rs, 'mud', [{ name: 'Mudroom', dims: "11'0\" x 10'11\" (in the garage's rear bay)", floor: 'slate', wall: 'paint:#e6e2d6', poly }], [], [
    [260.5, 387, 260.5, 654.5, 'e', [[557, 619, 'x', { hinge: 'lo', into: '+x', style: 'half', color: WHITE }]]],            // driveway-side door (existing)
    [255, 392.5, 847, 392.5, 'e', [[385, 450, 'x', { hinge: 'hi', into: '+y', style: 'half', color: WHITE }],                   // new back-yard door
      [587, 649, 'w', { g: 'cs', sill: 3.7, head: 6.6 }], [743, 805, 'w', { g: 'cs', sill: 3.7, head: 6.6 }]]],                  // laundry door becomes a window
    [524.5, 392.5, 524.5, 654.5, 'i', [[583, 648, 'd', { hinge: 'lo', into: '-x' }]]],                                        // new door at the end of the hall
    [255, 654.5, 524.5, 654.5, 'i', [[415, 480, 'd', { hinge: 'lo', into: '-y' }]]],                                          // from the garage (one step up)
    [524.5, 654.5, 841, 654.5, 'i'],                                                                                          // old garage-to-hall door closed up
  ], -0.5);
  const pts = ftPoly(poly);
  renoBat(rs, 'f2').poly('ceiling', pts, 8, [], true);
  { // close the garage's open rafters above the new partition
    const [xa, z] = toFt([260.5, 654.5]), [xb] = toFt([524.5, 0]), top = (x) => 9 + x * (8 / 12) - ROOFT - 0.02;
    const q = [V(xa, 8, z), V(xb, 8, z), V(xb, top(xb), z), V(xa, top(xa), z)];
    bat.face('paint:#dcd7ca', q, V(0, 0, 1)); bat.face('paint:#dcd7ca', q, V(0, 0, -1));
  }
  // lockers on the south wall, bench + hooks on the laundry wall; the door end stays clear
  { const { k, len } = runKit(bat, rs, toFt([266.4, 400]), toFt([266.4, 548]), [1, 0]); lockers(k, len, 4); }
  {
    const { k, len } = runKit(bat, rs, toFt([520.4, 400]), toFt([520.4, 566]), [-1, 0]);
    k.box('cab', 0, 0, 0, len, 1.45, 1.4); k.box('cabDoor', 0, 1.45, 0, len, 1.6, 1.5);
    for (let i = 1; i < 4; i++) k.box('cabDoor', (len * i) / 4 - 0.03, 0, 0, (len * i) / 4 + 0.03, 1.45, 1.42);
    k.soft('fab:#7c8a8f', 0.05, 1.6, 0.2, len - 0.05, 1.8, 1.45, 0.06);
    k.box('cabDoor', 0, 3.0, 0, len, 5.6, 0.06); k.box('cabDoor', 0, 5.6, 0, len, 5.7, 0.9);
    for (let i = 0; i < 5; i++) { const x = 0.6 + (i * (len - 1.2)) / 4; k.box('brass', x - 0.04, 4.9, 0.06, x + 0.04, 5.0, 0.3); if (i % 2 === 0) k.soft(fab(['#5d6b73', '#a9895f', '#7a4f44'][i / 2]), x - 0.35, 2.6, 0.08, x + 0.35, 4.95, 0.34, 0.08); }
    k.solid(0, 0, len, 1.5, 0, 1.8);
  }
  const at = (x, y, rot = 0, y0 = 0) => { const [lx, lz] = toFt([x, y]); return new Kit(bat, rs).at(lx, lz, y0, rot); };
  rug(at(400, 520, 0), 6, 4, '#4f5a5e', '#3a4245');
  for (const [x, y] of [[330, 470], [455, 470], [392, 590]]) recessed(at(x, y), 8);
  // outside: landing at the yard door joining the patio, wall lantern
  const landing = [[4.2, 14.55], [12.05, 14.55], [12.05, 9.8], [4.2, 9.8]];
  bat.prism({ top: 'paving', side: 'foundation' }, landing, -1, -0.62);
  addFloorPoly(landing, [], -0.62, rs);
  exteriorLantern(at(470, 386.6, 180), 6.6);
}

// Breakfast bump-out: the angled nook bay is squared off and pushed out to 5'6" beyond the rear wall,
// 15'7" wide (kitchen corner to the sun room). About 65 sq ft of new floor, enough to seat six at a real
// table beside the island. Patio slider on the kitchen side; the sun room's old slider wall becomes a
// cased opening so the sun room joins the kitchen circuit.
function buildBumpOut() {
  const L = LV.f1, rs = 'on:bump';
  const poly = [[1054, 180], [1420.5, 180], [1420.5, 310.5], [1054, 310.5]];
  const bat = addRooms(L, rs, 'bump', [{ name: 'Breakfast Nook (bump-out)', dims: "15'1\" x 5'6\" added", floor: 'oak', wall: 'ivy', crown: true, poly }],
    [[[1048.5, 174.5], [1426, 174.5], [1426, 316], [1048.5, 316]]], [
      [1054, 360, 1054, 174.5, 'e', [[212, 288, 'w', { g: 'cs2', rows: 5, sill: 2.6 }]]],
      [1048.5, 180, 1420.5, 180, 'e', [[1085, 1205, 's'], [1243, 1319, 'w', { g: 'cs2', rows: 5, sill: 2.6 }], [1331, 1407, 'w', { g: 'cs2', rows: 5, sill: 2.6 }]]],
      // sun room side wall: exterior west of the bump-out (window replaces the slider), cased opening inside it
      [1420.5, 310.5, 1420.5, 44, 'e', [[210, 292, 'o', { cased: true }], [72, 152, 'w', { g: 'cs2', rows: 5, sill: 1.6, head: 7.4 }]]],
    ]);
  const pts = ftPoly(poly), k = new Kit(bat, rs);
  renoBat(rs, 'f2').poly('ceiling', pts, 7.996, [], true);
  const [x0, zE] = toFt([1054, 180]), [x1, zW] = toFt([1420.5, 310.5]);
  k.box('ceiling', x0, 7.25, zW - 0.3, x1 - 0.25, 8.0, zW + 0.3);           // dropped beam on the old wall line
  k.cbox('white', x0 - 0.23, zE - 0.23, 0.6, 0.6, -0.9, 9);                  // corner board
  // roof: one lean-to from the 2nd-floor wall, same top line as the old nook roof (4:12)
  const mz0 = toFt(F2(0, 111.5))[1];
  leanRoof(renoBat(rs, 'roof'), { x0, x1, zWall: mz0, zEave: zE, y: 9, p: (12 - 9) / (mz0 - zE), o: 1.0, hip0: true, hip1: false });
  const at = (x, y, rot = 0, y0 = 0) => { const [lx, lz] = toFt([x, y]); return new Kit(bat, rs).at(lx, lz, y0, rot); };
  { // 7 ft table for six, centered on the old wall line: it only fits because of the bump-out
    const t = at(1240, 308, 0);
    rug(at(1240, 308, 0), 9.5, 7, '#cfc7ba', '#9c9284');
    for (const [cx, cz, r] of diningTable(t, 7, 3.5, { color: '#6e5038' })) { if (Math.abs(cx) > 3.5) continue; const p = t.P(cx, 0, cz); chair(new Kit(bat, rs).at(p.x, p.z, 0, r), '#cfc6b6'); }
    for (const dx of [-1.7, 1.7]) pendant(new Kit(bat, rs).at(t.ox + dx, t.oz, 0), 8, 2.4);
  }
  for (const x of [1110, 1370]) recessed(at(x, 215), 8);
  exteriorLantern(at(1225, 174.1, 180), 6.6);
  // fire pit group slides south so the new slider opens onto clear patio
  const pk = (x, z, rot, fn) => fn(new Kit(bat, rs).at(x, z, -0.62, rot));
  pk(29.5, -1.4, 0, firePit);
  for (const [dx, dz] of [[-3.8, -3.8], [3.8, -3.8], [-3.8, 3.8], [3.8, 3.8]]) pk(29.5 + dx, -1.4 + dz, (Math.atan2(-dx, -dz) * 180) / Math.PI, (c) => adirondack(c));
}

// Sun room extension: 6 ft longer (11'6" x 16'9", about +70 sq ft). The arched gable wall is rebuilt
// 6 ft west, the vaulted roof and ridge beam carry on, one more skylight, a window each side.
const SUN_EXT = 6;
function buildSunExt() {
  const L = LV.f1, rs = 'on:sunext', d = SUN_EXT * 23.55, yG = 49.5 - d, yW = 44 - d;
  const win = [yW + 34, yW + 110, 'w', { g: 'cs', rows: 5, sill: 1.6, head: 7.4 }];
  const bat = addRooms(L, rs, 'sx', [{ name: 'Sun Room extension', dims: `+${SUN_EXT} ft: 11'6" x 16'9" overall`, floor: 'slate', wall: 'paint:#c3d0c6', vaulted: true,
    poly: [[1420.5, yG], [1703.5, yG], [1703.5, 49.5], [1420.5, 49.5]] }],
    [[[1415, yW], [1709, yW], [1709, 60], [1415, 60]]], [
      [1420.5, 44, 1420.5, yW, 'e', [win]],
      [1703.5, yW, 1703.5, 44, 'e', [win]],
    ]);
  buildSunroomGable(renoGroup(rs, 'f1'), yG, rs);
  const [sx0, zG] = toFt([1420.5, yG]), [sx1, z0] = toFt([1703.5, 49.5]), mz0 = toFt(F2(0, 111.5))[1], sp = 10 / 12;
  const rb = renoBat(rs, 'roof');
  gableRoof(rb, { x0: sx0, x1: sx1, z0: zG, z1: mz0, y: 9, p: sp, o: 1.0, rake: [1.0, 0], gable: [false, false] });
  for (const za of [-3.4, 3.3, 7.6]) {
    const zb = za + 2.3, xa = sx0 + 1.2, xb = sx0 + 3.6, ya = 9 + (xa - sx0) * sp + 0.06, yb = 9 + (xb - sx0) * sp + 0.06;
    rb.face('skylight', [V(xa, ya, za), V(xb, yb, za), V(xb, yb, zb), V(xa, ya, zb)], V(-0.6, 1, 0));
    bat.face('white', [V(xa, ya - ROOFT - 0.02, za), V(xb, yb - ROOFT - 0.02, za), V(xb, yb - ROOFT - 0.02, zb), V(xa, ya - ROOFT - 0.02, zb)], V(0.6, -1, 0));
  }
  const k = new Kit(bat, rs), xc = (sx0 + sx1) / 2, ridge = 9 + ((sx1 - sx0) / 2) * sp - ROOFT;
  k.box('trim', xc - 0.3, ridge - 0.8, zG, xc + 0.3, ridge, z0);            // ridge beam carries on
  for (const x of [1415, 1709]) { const [cx, cz] = toFt([x, yW]); k.cbox('white', cx, cz, 0.6, 0.6, -0.9, 9); }
  const at = (x, y, rot = 0) => { const [lx, lz] = toFt([x, y]); return new Kit(bat, rs).at(lx, lz, 0, rot); };
  // the added length takes a real seating group at the window end
  sofa(at(1697.6, yG + 80, -90), 6, { color: '#d9d2b8' });
  coffeeTable(at(1610, yG + 80, 90), 3.5, 1.8);
  armchair(at(1470, yG + 80, 90), { color: '#e6e0cf' });
  plant(at(1445, yG + 22), 0, 0, 5);
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
  buildOpenings();
  buildKitchenRemodel();
  buildPrimaryBath();
  buildMudroom();
  buildBumpOut();
  buildSunExt();
  buildDetachedGarage();
}
