// W61N669 Mequon Ave (Cedarburg, WI; built 1890, remodeled) geometry.
// Sources: the county parcel + listing aerial (site spec: lot 132 x 66 ft, roof outlines to ~2 ft), the listing's
// 20 photos, 25 exterior photos taken on site, the listing's room sizes, and the owner's walk-through of the layout.
// There are no floor plans yet, so the inside is a best fit to those: room sizes are good to a foot or two.
//
// Frame (feet, the site spec's): x runs EAST toward Mequon Ave, y (three.js z) runs SOUTH, origin at the lot's
// NW (rear) corner. 1st floor = 0, 2nd floor = 9.5, basement = -8.2, grade = -2.4 (four risers up to the porch).
//
// The house is three masses:
//   front wing   x 99-113.5, y 16-32   steep gable facing the street (living room / front bedroom)
//   core         x 83-99,    y 9.5-38.5    steep cross gable, ridge north-south (family + stair + kitchen / bedroom 3, primary)
//   rear part    x 73-83,    y 9.5-38.5    later 2-story addition, low gable facing the back yard (bath, laundry, entry / bath, office)
// plus the porch strip along the wing's south wall (x 99-110.5, y 32-39.3) whose west end is enclosed as the
// breakfast nook. Upstairs the steep roofs come down to ~4.8 ft knee walls, the rear roof to ~6.3 ft.
export const PX = 1;
export const toFt = ([x, y]) => [x / PX, y / PX];
export const F1 = (x, y) => [x, y];
export const F2 = F1, BS = F1;
export const F2inv = F1;

export const H = {
  f2: 9.5, ceil1: 8.5, ceil2: 17.5, basement: -8.2, grade: -2.4, garage: -2.3,
  knee: 4.8, kneeRear: 6.3, pitch: 13 / 12, pitchRear: 5.8 / 12, pitchPorch: 7 / 12, porchEave: 9.2,
};
export const ROOFT = 0.5;
export const RY = H.f2 + H.knee + ROOFT;
export const RR = 0, vaultTop = () => 0, vaultUnder = () => 0;

// masses
export const WING = { x0: 99, x1: 113.5, y0: 16, y1: 32, ridge: 24 };
export const CORE = { x0: 83, x1: 99, y0: 9.5, y1: 38.5, ridge: 91 };
export const REAR = { x0: 73, x1: 83, y0: 9.5, y1: 38.5, ridge: 24 };
export const PORCH = { x0: 99, x1: 110.5, y0: 32, y1: 38.7, nookX: 104.5, nookY: 38.5 };
export const DECK = { x0: 67, x1: 73, y0: 19, y1: 30 };

// 2nd-floor ceiling height above the 2nd floor (flat 8 ft, lower under the roof slopes)
const wingH = (y) => H.knee + H.pitch * Math.min(y - WING.y0, WING.y1 - y);
const coreH = (x) => H.knee + H.pitch * Math.min(x - CORE.x0, CORE.x1 - x);
const rearH = (y) => H.kneeRear + H.pitchRear * Math.min(y - REAR.y0, REAR.y1 - y);
// the rear roof's ridge runs into the core roof (valleys): headroom in the band around it, where the vestibule is
const rearBand = (y) => 8 + (2.4 - Math.abs(y - REAR.ridge)) * 1.5;
export function ceilAt(x, y) {
  let h;
  if (x >= CORE.x1) h = wingH(y);
  else if (x >= CORE.x0) {
    h = coreH(x);
    if (y > WING.y0 && y < WING.y1 && x > CORE.ridge) h = Math.max(h, wingH(y));
    if (x < CORE.ridge) h = Math.max(h, rearBand(y));
  } else h = rearH(y);
  return Math.max(0.5, Math.min(8, h));
}

// Wall entry: [x0, y0, x1, y1, kind ('e' exterior | 'i' interior), openings?, opts?]
// Opening: [a, b, type, opts?]  a,b = plan coordinate along the wall's main axis
export const ENTRY = -1.8; // the back entry's floor: a landing just above the driveway
const DH = { g: 'dh', apron: true };
const RED = '#6e2a2a';

// 2nd-floor interior walls are cut to the ceiling: split where the ceiling line bends, each piece gets a sloped top
function clip(w) {
  const [x0, y0, x1, y1, kind, openings = [], opts = {}] = w;
  const len = Math.hypot(x1 - x0, y1 - y0), nx = -(y1 - y0) / len, ny = (x1 - x0) / len, N = Math.max(2, Math.round(len / 0.25));
  const hAt = (t) => { const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; return Math.max(ceilAt(x + nx * 0.3, y + ny * 0.3), ceilAt(x - nx * 0.3, y - ny * 0.3)); };
  const hs = []; for (let i = 0; i <= N; i++) hs.push(hAt(i / N));
  const cuts = [0];
  for (let i = 1; i < N; i++) if (Math.abs(hs[i + 1] - 2 * hs[i] + hs[i - 1]) > 0.02) { if (cuts[cuts.length - 1] !== i - 1 || true) cuts.push(i); }
  cuts.push(N);
  // merge runs of bends (curved bits) into single cut points
  const cc = cuts.filter((c, i) => i === 0 || c - cuts[i - 1] > 2 || i === cuts.length - 1);
  if (cc[cc.length - 1] !== N) cc.push(N);
  const horiz = Math.abs(x1 - x0) >= Math.abs(y1 - y0), out = [];
  for (let i = 0; i < cc.length - 1; i++) {
    const ta = cc[i] / N, tb = cc[i + 1] / N; if (tb - ta < 1e-6) continue;
    const ax = x0 + (x1 - x0) * ta, ay = y0 + (y1 - y0) * ta, bx = x0 + (x1 - x0) * tb, by = y0 + (y1 - y0) * tb;
    const lo = Math.min(horiz ? ax : ay, horiz ? bx : by), hi = Math.max(horiz ? ax : ay, horiz ? bx : by);
    const ops = openings.filter((o) => (o[0] + o[1]) / 2 >= lo && (o[0] + o[1]) / 2 < hi);
    const ha = hs[cc[i]], hb = hs[cc[i + 1]], o2 = { ...opts };
    if (ha < 7.99 || hb < 7.99) o2.slope = [H.f2 + ha, H.f2 + hb];
    out.push([ax, ay, bx, by, kind, ops, o2]);
  }
  return out;
}
const K = H.f2 + H.knee, KR = H.f2 + H.kneeRear;
const gy = (d) => K + H.pitch * d;          // steep gable wall top, d ft in from the eave
const gr = (d) => KR + H.pitchRear * d;     // rear gable wall top

export const LEVELS = [
  {
    id: 'b', name: 'Basement', map: BS, floor: H.basement, extBottom: 0, extTop: 7.3, intTop: 7.3,
    sill: 5.3, head: 6.7, ceiling: 7.3, grille: 'cs',
    walls: [
      [73, 9.5, 99, 9.5, 'e'], [99, 9.5, 99, 16, 'e'], [99, 16, 113.5, 16, 'e'],
      [113.5, 16, 113.5, 32, 'e', [[22.6, 25.4, 'w', { g: 'cs', block: true }]]],
      [113.5, 32, 99, 32, 'e'], [99, 32, 99, 38.5, 'e'],
      [99, 38.5, 73, 38.5, 'e', [[86.2, 89.4, 'w', { g: 'cs', block: true }], [74.7, 77.5, 'v', { sill: 6.4, head: 7.3 }]]],
      [73, 38.5, 73, 9.5, 'e', [[26.5, 29.5, 'w', { g: 'cs', block: true }], [13, 15.4, 'w', { g: 'cs', block: true }]]],
      // partition under the kitchen / stair wall, with the furnace + water heater behind it
      [83, 25.8, 99, 25.8, 'i', [[84, 87, 'o', { head: 6.6 }]]],
    ],
    footprint: [[[73, 9.5], [99, 9.5], [99, 16], [113.5, 16], [113.5, 32], [99, 32], [99, 38.5], [73, 38.5]]],
    rooms: [
      { name: 'Basement', dims: 'unfinished · stubbed for a bath', floor: 'concrete', wall: 'block', bare: true,
        poly: [[73, 9.5], [99, 9.5], [99, 16], [113.5, 16], [113.5, 32], [99, 32], [99, 38.5], [73, 38.5]] },
    ],
  },
  {
    id: 'f1', name: '1st Floor', map: F1, floor: 0, extBottom: -0.9, extTop: H.f2, intTop: H.ceil1,
    sill: 2.2, head: 7.3, ceiling: H.ceil1, grille: 'dh',
    walls: [
      // ---- exterior, clockwise from the NW corner
      [73, 9.5, 99, 9.5, 'e', [[89.7, 92.3, 'w', DH]]],                                    // north: family room window
      [99, 9.5, 99, 16, 'e'],
      [99, 16, 113.5, 16, 'e'],
      [113.5, 16, 113.5, 32, 'e', [[18.7, 21.3, 'w', { g: 'dh', red: true, apron: true }], [26.7, 29.3, 'w', { g: 'dh', red: true, apron: true }]]], // street gable
      [113.5, 32, 104.5, 32, 'e', [[105.3, 108.1, 'x', { hinge: 'lo', into: '-y', style: 'victorian', color: '#b9783f', keep: true }]]], // front door, onto the porch
      [104.5, 32, 104.5, 38.5, 'e', [[34.3, 36.9, 'w', { g: 'dh', red: true }]]],          // nook, looking down the porch
      [104.5, 38.5, 99, 38.5, 'e', [[99.8, 103.9, 'w', { g: 'cs', sill: 2.7, head: 7.3 }]]], // nook picture window (south)
      [99, 38.5, 83, 38.5, 'e', [[89.7, 92.3, 'w', DH]]],                                  // kitchen window
      [83, 38.5, 73, 38.5, 'e', [[74.7, 77.5, 'x', { hinge: 'hi', into: '-y', style: 'half', color: '#f2f0ea', drop: ENTRY }]]], // back entry door, at grade (driveway side)
      [73, 38.5, 73, 30.7, 'e', [[33.8, 36.2, 'w', { g: 'dh', red: true }]]],
      [73, 30.7, 73, 18.5, 'e', [[22.9, 25.5, 'w', { g: 'dh', sill: 3.7 }]], { rs: 'off:mud' }], // laundry window over the machines (opens to the mudroom addition)
      [73, 18.5, 73, 9.5, 'e', [[12.9, 15.3, 'w', { g: 'dh', sill: 2.9, frost: true }]]],
      // ---- interior
      [83, 9.5, 83, 18.5, 'i', [[14.2, 16.9, 'd', { hinge: 'hi', into: '-x', style: 'panel2' }]]],              // bath | family room
      [83, 18.5, 83, 30.7, 'i', [[26.5, 29.1, 'd', { hinge: 'lo', into: '-x', style: 'panel2' }]]],             // laundry | stair foot, kitchen
      [83, 30.7, 83, 38.5, 'i', [[31.6, 34.4, 'd', { hinge: 'hi', into: '+x', style: 'half', color: '#5a3826', closed: true }]], { bottom: ENTRY }], // back entry | kitchen (old glazed door, three steps down)
      [73, 18.5, 83, 18.5, 'i'],
      [73, 30.7, 83, 30.7, 'i', [], { bottom: ENTRY }],                                                         // laundry | back entry
      [83, 25.8, 99, 25.8, 'i'],                                                                               // stair | kitchen (range wall)
      [92.6, 22, 99, 22, 'i'],                                                                                 // around the top of the basement stair
      [99, 16, 99, 22, 'i', [[16.3, 21.4, 'o', { head: 7.2, cased: true }]]],                                 // family room | living room
      [99, 22, 99, 25.8, 'i', [[22.5, 25.3, 'd', { hinge: 'lo', into: '+x', style: 'panel2', closed: true }]]], // basement door
      [99, 25.8, 99, 38.5, 'i', [[27.1, 38.0, 'o', { head: 7.3, cased: true }]]],                               // kitchen | living room + nook
      [99, 32, 104.5, 32, 'i', [[99.5, 104.1, 'o', { head: 7.3 }]]],                                        // living room | nook (header under the wing wall)
    ],
    footprint: [[[73, 9.5], [99, 9.5], [99, 16], [113.5, 16], [113.5, 32], [104.5, 32], [104.5, 38.5], [73, 38.5]]],
    slab: [[73, 9.5], [99, 9.5], [99, 16], [113.5, 16], [113.5, 32], [104.5, 32], [104.5, 38.5], [83, 38.5], [83, 30.7], [73, 30.7]],
    entry: [[73, 30.7], [83, 30.7], [83, 38.5], [73, 38.5]],
    slabHoles: [[[87.8, 22.2], [98.7, 22.2], [98.7, 25.6], [87.8, 25.6]]],
    porch: [[104.5, 32], [110.5, 32], [110.5, 38.7], [104.5, 38.7]],
    rooms: [
      { name: 'Living Room', dims: "13' x 16'", floor: 'oak', wall: 'paint:#f1efe9', poly: [[99, 16], [113.5, 16], [113.5, 32], [99, 32]] },
      { name: 'Breakfast Nook', dims: "5' x 5'6\" · built-in bench", floor: 'oak', wall: 'paint:#f1efe9', poly: [[99, 32], [104.5, 32], [104.5, 38.5], [99, 38.5]] },
      { name: 'Kitchen', dims: "15' x 12'6\" · island", floor: 'oak', wall: 'paint:#f1efe9', poly: [[83, 25.8], [99, 25.8], [99, 38.5], [83, 38.5]] },
      { name: 'Family Room', dims: "15' x 12'6\"", floor: 'oak', wall: 'paint:#f1efe9', poly: [[83, 9.5], [99, 9.5], [99, 22], [85.6, 22], [85.6, 25.8], [83, 25.8]] },
      { name: 'Stair', floor: null, wall: 'paint:#f1efe9', noLabel: true, poly: [[85.6, 22], [99, 22], [99, 25.8], [85.6, 25.8]] },
      { name: 'Bath', dims: "9'6\" x 8'6\" · tub", floor: 'tile:#b8b9b6', wall: 'paint:#f1efe9', poly: [[73, 9.5], [83, 9.5], [83, 18.5], [73, 18.5]] },
      { name: 'Laundry', dims: "9'6\" x 12' · pantry", floor: 'oak', wall: 'paint:#f1efe9', poly: [[73, 18.5], [83, 18.5], [83, 30.7], [73, 30.7]] },
      { name: 'Back Entry', dims: "9'6\" x 7'6\" · at grade, 3 steps up", floor: 'tile:#77736b', y: ENTRY, wall: 'paint:#f1efe9', poly: [[73, 30.7], [83, 30.7], [83, 38.5], [73, 38.5]] },
      { name: 'Front Porch', dims: "6' x 6'6\"", floor: null, wall: 'paint:#f1efe9', porch: true, noLabel: true, poly: [[104.75, 32.25], [110.5, 32.25], [110.5, 38.7], [104.75, 38.7]] },
    ],
  },
  {
    id: 'f2', name: '2nd Floor', map: F2, floor: H.f2, extBottom: 0, extTop: H.knee, intTop: 8,
    sill: 2.0, head: 6.6, ceiling: 8, grille: 'dh',
    walls: [
      // ---- exterior: knee walls under the eaves, gable ends up to the roof
      [99, 16, 113.5, 16, 'e'],
      [113.5, 16, 113.5, 24, 'e', [[18.7, 21.3, 'w', { g: 'dh', red: true, apron: true }]], { slope: [gy(0), gy(8)] }],
      [113.5, 24, 113.5, 32, 'e', [[26.7, 29.3, 'w', { g: 'dh', red: true, apron: true }]], { slope: [gy(8), gy(0)] }],
      [113.5, 32, 99, 32, 'e'],
      [99, 32, 99, 38.5, 'e'],
      [99, 38.5, 93, 38.5, 'e', [], { slope: [gy(0), gy(6)] }],
      [93, 38.5, 89, 38.5, 'e', [[89.7, 92.3, 'w', { g: 'dh', red: true, apron: true }]], { top: H.knee + H.pitch * 6 }],
      [89, 38.5, 83, 38.5, 'e', [], { slope: [gy(6), gy(0)] }],
      [83, 38.5, 73, 38.5, 'e', [], { top: H.kneeRear }],
      [73, 38.5, 73, 28, 'e', [[33.5, 36, 'w', { g: 'dh', red: true }]], { slope: [gr(0), gr(10.5)] }],
      [73, 28, 73, 20, 'e', [[22, 27.6, 's']], { top: H.kneeRear + H.pitchRear * 10.5, rs: 'off:mud|brg' }],   // slider onto the deck
      [73, 28, 73, 20, 'e', [[23.4, 26, 'w', { g: 'dh', red: true }]], { top: H.kneeRear + H.pitchRear * 10.5, rs: 'on:mud&not:brg' }], // (deck removed: a window)
      [73, 20, 73, 9.5, 'e', [[13.4, 15.8, 'w', { g: 'dh', red: true }]], { slope: [gr(10.5), gr(0)] }],
      [73, 9.5, 83, 9.5, 'e', [], { top: H.kneeRear }],
      [83, 9.5, 89, 9.5, 'e', [], { slope: [gy(0), gy(6)] }],
      [89, 9.5, 93, 9.5, 'e', [[89.7, 92.3, 'w', { g: 'dh', red: true, apron: true }]], { top: H.knee + H.pitch * 6 }],
      [93, 9.5, 99, 9.5, 'e', [], { slope: [gy(6), gy(0)] }],
      [99, 9.5, 99, 16, 'e'],
      // ---- interior (cut to the sloped ceilings)
      ...[
        [102, 16, 102, 32, 'i', [[22.7, 25.3, 'd', { hinge: 'lo', into: '+x', style: 'panel2' }]]],            // landing | front bedroom
        [99, 21, 102, 21, 'i', [[99.3, 101.7, 'd', { hinge: 'hi', into: '-y', style: 'panel2' }]]],                // landing | bedroom 3 (entry alcove)
        [99, 27, 102, 27, 'i', [[99.3, 101.7, 'd', { hinge: 'hi', into: '+y', style: 'panel2' }]]],                // landing | primary bedroom (entry alcove)
        [99, 21, 99, 21.9, 'i'], [99, 25.8, 99, 27, 'i'],
        [83, 21.9, 99, 21.9, 'i', [[84.1, 86.7, 'd', { hinge: 'lo', into: '-y', style: 'panel6', color: '#a8743a', closed: true }]]], // bedroom 3 | vestibule + stair
        [83, 25.8, 99, 25.8, 'i', [[83.6, 86.6, 'o', { head: 6.8 }]]],                                             // primary bedroom | vestibule + stair
        [83, 9.5, 83, 21.9, 'i'],
        [83, 21.9, 83, 25.8, 'i', [[22.6, 25.2, 'o', { head: 6.8, cased: true }]]],                                // vestibule | office
        [83, 25.8, 83, 38.5, 'i'],                                                                                 // behind the headboard: the office
        [73, 19.15, 83, 19.15, 'i', [[76.8, 79.4, 'd', { hinge: 'lo', into: '-y', style: 'panel2' }]]],            // primary bath | office
      ].flatMap(clip),
    ],
    footprint: [[[73, 9.5], [99, 9.5], [99, 16], [113.5, 16], [113.5, 32], [99, 32], [99, 38.5], [73, 38.5]]],
    slabHoles: [[[88, 22.1], [97.2, 22.1], [97.2, 25.6], [88, 25.6]]],
    rooms: [
      { name: 'Stair (open to below)', floor: null, wall: 'paint:#f1efe9', void: 'Stair', noLabel: true, poly: [[88, 21.9], [97.2, 21.9], [97.2, 25.8], [88, 25.8]] },
      { name: 'Bedroom 2', dims: "11'6\" x 16'6\"", floor: 'carpet:#cfc8bd', wall: 'paint:#f1efe9', poly: [[102, 16], [113.5, 16], [113.5, 32], [102, 32]] },
      { name: 'Landing', floor: 'carpet:#cfc8bd', wall: 'paint:#f1efe9', noLabel: true, poly: [[97.2, 21.9], [99, 21.9], [99, 21], [102, 21], [102, 27], [99, 27], [99, 25.8], [97.2, 25.8]] },
      { name: 'Bedroom 3', dims: "15' x 12'", floor: 'carpet:#cfc8bd', wall: 'paint:#f1efe9', poly: [[83, 9.5], [99, 9.5], [99, 16], [102, 16], [102, 21], [99, 21], [99, 21.9], [83, 21.9]] },
      { name: 'Primary Bedroom', dims: "15' x 12'6\"", floor: 'carpet:#cfc8bd', wall: 'paint:#f1efe9', poly: [[83, 25.8], [99, 25.8], [99, 27], [102, 27], [102, 32], [99, 32], [99, 38.5], [83, 38.5]] },
      { name: 'Vestibule', floor: 'carpet:#cfc8bd', wall: 'paint:#f1efe9', noLabel: true, poly: [[83, 21.9], [88, 21.9], [88, 25.8], [83, 25.8]] },
      { name: 'Office', dims: "9'6\" x 19' · deck door", floor: 'carpet:#cfc8bd', wall: 'paint:#f1efe9', poly: [[73, 19.15], [83, 19.15], [83, 38.5], [73, 38.5]] },
      { name: 'Primary Bath', dims: "9'6\" x 9' · walk-in shower", floor: 'tile:#e6e3dd', wall: 'paint:#f1efe9', poly: [[73, 9.5], [83, 9.5], [83, 19.15], [73, 19.15]] },
    ],
  },
];

// Main stair: one straight run in the middle of the house, up from the family room's back corner toward the
// street (15 risers of 7.6"). The basement stair runs under it, down from a door in the living room.
export const STAIRS = {
  main: { x0: 85.6, x1: 97.2, y0: 22.2, y1: 25.6, risers: 15 },
  basement: { xTop: 98.6, xBottom: 88.4, y0: 22.2, y1: 25.6, risers: 13 },
};

// ---------------------------------------------------------------- lot, street, neighbors, trees
// Lot: 132 ft (east-west) x 66 ft, from the county parcel. Mequon Ave runs along the east line.
export const LOT = { xSouth: 0, xNorth: 132, zBack: 0, zFront: 66, jog: [[-7, 0], [0, 0], [0, 21.5], [-7, 21.5]] };
export const X_AZ = 90; // +x points east (the lot is ~1.3 deg off true east-west)
export const STREET = { walk0: 133.5, walk1: 138.5, curb: 146, width: 32 };
export const STREETS = {};
export const CH = (p, q) => [p, q];
// the garage that is there now: 1.5-story gable, door in the east gable end (to be taken down)
export const OLD_GARAGE = { x0: -3.2, x1: 17.6, y0: 6.2, y1: 18.4, eave: 9.5, pitch: 12 / 12 };
const nb = (name, [x, z], rot, wall, parts, o = {}) => ({ name, x, z, rot, wall, parts, roof: 'shingle:n', ...o });
export const NEIGHBORS = [
  // south: gray stucco house close to the drive, with an asphalt drive of its own and a block garage behind
  nb('South neighbor', [104, 88], 0, '#a9a39a', [[-16, -14, 16, 14, 17, 'gx', 0.8]], { dist: 'south side' }),
  nb('', [52, 82], 0, '#8f8b84', [[-12, -9, 12, 9, 9, 'gx', 0.9]], { assumed: true }),
  // north: 2-story with a porch, a few feet past the lot line
  nb('North neighbor', [100, -22], 0, '#d9d2a8', [[-17, -13, 17, 13, 17, 'gz', 0.8], [17, -6, 24, 8, 9, 'hip']], { dist: 'north side' }),
  nb('', [46, -24], 0, '#cfd0cc', [[-10, -9, 10, 9, 9, 'gx', 0.7]], { assumed: true }),
  // behind (west): houses on the next street, past the fence
  nb('', [-52, 40], 0, '#d8cf8f', [[-16, -13, 16, 13, 10, 'gx', 0.6]], { assumed: true }),
  nb('', [-56, -8], 0, '#b9b3a6', [[-15, -12, 15, 12, 17, 'gz', 0.7]], { assumed: true }),
  nb('', [-48, 92], 0, '#c9c4b8', [[-15, -12, 15, 12, 10, 'hip']], { assumed: true }),
  // across Mequon Ave
  nb('', [208, 30], 0, '#e2ddd0', [[-16, -14, 16, 14, 17, 'gx', 0.9]], { assumed: true }),
  nb('', [208, -40], 0, '#c5ccd0', [[-15, -13, 15, 13, 17, 'gz', 0.8]], { assumed: true }),
  nb('', [210, 98], 0, '#d6cdb6', [[-16, -13, 16, 13, 17, 'hip']], { assumed: true }),
  nb('', [104, 156], 0, '#dcd7cc', [[-16, -13, 16, 13, 17, 'gx', 0.8]], { assumed: true }),
  nb('', [100, -92], 0, '#cfc9bb', [[-16, -13, 16, 13, 17, 'gx', 0.8]], { assumed: true }),
];
// Trees: [kind, x, z, height, canopy radius, tag?]. From the aerial notes and the on-site photos: canopy along the
// north line, big spruces at the back, an ornamental red maple behind the house, a big street tree out front.
// Trees tagged with a garage option's letters are taken out when that garage is built.
export const TREES = [
  ['maple', 30, -6, 46, 15], ['linden', 62, -8, 44, 14], ['maple', 92, -34, 48, 16],
  ['spruce', -14, 34, 52], ['spruce', -18, 52, 48], ['spruce', 4, 60, 46, null, 'not:gar:A'], ['spruce', -10, 8, 44],
  ['purple', 31, 27, 17, 8, 'gar:0'],
  ['locust', 46, 62.5, 30, 8], ['linden', 20, 78, 44, 14], ['maple', 78, 84, 44, 13],
  ['shrubTree', 112, 57, 13, 6.5], ['shrubTree', 122, 60, 11, 5],
  ['oak', 141, 73, 56, 20], ['maple', 142, -12, 44, 14], ['maple', 143, 118, 42, 14],
  ['maple', -40, 70, 44, 15], ['linden', -30, -30, 46, 15],
];
export const ARBORVITAE = { x: 0, z0: 0, z1: -1, step: 4 };
export const GROUND = { duff: [], redBed: [] };
export const TRAY = { px: [0, 0, 1, 1], c: 0, depth: 0 };
export const trayOct = () => [];
export const LATITUDE = 43.3;
