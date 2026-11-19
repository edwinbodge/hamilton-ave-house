// Creekside Ln house geometry, transcribed from the CubiCasa floor plans and listing photos.
//
// Every level is written in the pixel coordinates of its own plan image, mapped into 1st-floor
// plan pixels (main_floor_floor_plan.png), then into feet:
//   1st floor (main plan, 1280 px wide):  12.1 px/ft  (garage 23'3" x 28'1", family room 18'4" x 20'2",
//                                                    dining 12'2" x 8'7", kitchen 14'9" x 15'9" all agree within 1%)
//   2nd floor (small 3-floor plan):        5.95 px/ft (x 2.035 / y 2.04 to 1st-floor px). Aligned on the family
//                                                    room walls (two-story, so the same walls on both plans) and the stair.
//   basement (basement plan):             12.95 px/ft (x0.9344 to 1st-floor px). Aligned on the kitchen bump,
//                                                    the chimney/utility chase, the front wall and the east room.
// Local frame (feet): x = plan right, z = plan down (toward the street), y = up.
// Compass (from the aerial): the front faces northwest. +z (plan down, toward the street) = NW, +x (plan right,
// the garage/driveway side) = SW, -x = NE, -z (the back) = SE.
// 1st floor = 0, 2nd floor = 10, basement = -9.2, grade = -1. The family room is sunken one step (-0.6).

export const PX = 12.1;
export const toFt = ([x, y]) => [(x - 292) / PX, (y - 28.5) / PX];
export const F1 = (x, y) => [x, y];
export const F2 = (x, y) => [474 + (x - 751) * 2.035, 57.5 + (y - 41) * 2.04];
export const BS = (x, y) => [474 + (x - 541) * 0.9344, 351.5 + (y - 374.5) * 0.9344];
// inverse of F2 (to write 2nd-floor items in 1st-floor px)
export const F2inv = (x, y) => [751 + (x - 474) / 2.035, 41 + (y - 57.5) / 2.04];

// Wall entry: [x0, y0, x1, y1, kind ('e' exterior | 'i' interior), openings?, opts?]
// Opening: [a, b, type, opts?]  a,b = plan coordinate along the wall's main axis
// (x for walls flatter than 45 deg, y otherwise).
// Types: w window, d door, o drywall opening, x exterior door, e entry door w/ sidelights,
//        g garage door, s sliding patio door, f french door(s), c closet bypass doors
// Openings that share the same span stack (e.g. the family room's lower windows and transoms).
// Wall opts: top (ft above the level's floor), slope [hStart, hEnd] (sloped top, absolute ft),
//            reno: 'name' (wall removed by renovation 'name')
const OAK = '#b9843f';

// heights
// Floor-to-floor is 9 ft (8 ft 1st-floor ceilings), not 10: the door/window-head to ceiling ratios in photos 12 (uppers
// 30" with ~6" to the ceiling), 16 (patio door) and 17 (office closet + window) all give ~8 ft, and a camera fit on the
// rear photo 45 puts the 2nd-floor sills ~1.7 ft above a 9 ft floor (photo 34 shows the same 1.7 ft from inside).
export const H = {
  f2: 9, ceil1: 8, ceil2: 17, basement: -9.2, grade: -1, family: -0.6, garage: -0.6,
  pitch: 9 / 12, rearPitch: 10 / 12, garagePitch: 7 / 12, wallTop2: 17, plate1: 9,
};
export const ROOFT = 0.55;
export const RY = H.wallTop2 + ROOFT; // main roof surface at the 2nd-floor side/front wall lines (underside meets the 17 ft ceiling)
// The rear slope is a separate, steeper plane set ~3 ft higher: it is the family room's catslide carried straight up
// (photo 45 fit: family eave fascia 9.8 ft, rear 2nd-floor fascia 19.5 ft one plane apart = 10/12). Where it meets the
// lower 9/12 side slopes the rear walls show the short raked corners of photos 02/03/45/64.
export const RR = 20.3; // rear plane surface at the 2nd-floor rear wall line (y = 197.5 px)
// Family room vault: the rear plane's underside. yPx in 1st-floor plan px.
export const vaultTop = (yPx) => RR + ((yPx - 197.5) / PX) * H.rearPitch;
export const vaultUnder = (yPx) => vaultTop(yPx) - ROOFT;
const FAMTOP = vaultUnder(57.5) - 0.02; // family room rear wall: up to the vault at its line

// stacked family-room windows (both side walls): lower casements + stepped transoms that follow the roof
const famWin = () => [
  [82, 114, 'w', { g: 'cs', sill: 1.4, head: 7.0 }], [117, 148, 'w', { g: 'cs', sill: 1.4, head: 7.0 }], [151, 184, 'w', { g: 'cs', sill: 1.4, head: 7.0 }],
  [82, 114, 'w', { g: 'cs', sill: 8.0, head: 10.8 }], [117, 148, 'w', { g: 'cs', sill: 8.0, head: 11.8 }], [151, 184, 'w', { g: 'cs', sill: 8.0, head: 13.0 }], // heads measured on photo 02
];

export const LEVELS = [
  {
    id: 'b', name: 'Basement', map: BS, floor: H.basement, extBottom: 0, extTop: 8.3, intTop: 8.0,
    sill: 5.7, head: 7.3, ceiling: 8.0, grille: 'gb',
    walls: [
      [380, 236, 380, 702, 'e', [[285, 335, 'w'], [586, 635, 'w']]],
      [346, 374.5, 380, 374.5, 'e'], [346, 374.5, 346, 528.5, 'e'], [346, 528.5, 380, 528.5, 'e'],
      [380, 236, 541, 236, 'e'],
      [541, 67.5, 541, 236, 'e'],
      [541, 67.5, 635.5, 67.5, 'e'], [635.5, 28.5, 635.5, 67.5, 'e'], [635.5, 28.5, 701.5, 28.5, 'e'], [701.5, 28.5, 701.5, 67.5, 'e'],
      [635.5, 67.5, 701.5, 67.5, 'i', [[657, 696, 'd', { hinge: 'hi', into: '+y', color: '#d9b98a', style: 'louver' }]]],
      [701.5, 67.5, 784.5, 67.5, 'e'],
      [784.5, 67.5, 784.5, 236, 'e'],
      [784.5, 236, 933, 236, 'e', [[844, 885, 'w']]],
      [933, 236, 933, 403.5, 'e', [[310, 352, 'w']]],
      [784, 403.5, 933, 403.5, 'e'],
      [784, 403.5, 784, 601.5, 'e'],
      [534, 601.5, 784, 601.5, 'e'],
      [534, 601.5, 534, 702, 'e'],
      [380, 702, 419, 702, 'e'], [419, 702, 426, 721.5, 'e'], [426, 721.5, 494, 721.5, 'e'], [494, 721.5, 501, 702, 'e'], [501, 702, 534, 702, 'e'],
      // interior (all drywalled, per the photos; floors are bare concrete)
      [541, 208.5, 784.5, 208.5, 'i', [[698, 742, 'o']]],
      [784, 236, 784, 354.5, 'i', [[255, 325, 'f', { pair: true, into: '-x' }]]],
      [784, 354.5, 809.5, 354.5, 'i'], [809.5, 354.5, 809.5, 403.5, 'i'],
      // ('not:lay:D' = removed by the "Open plan" basement layout)
      [534.5, 330.5, 562.5, 330.5, 'i', [], { rs: 'not:lay:D' }],
      [534.5, 330.5, 534.5, 537, 'i', [], { rs: 'not:lay:D' }],
      [514, 373.5, 534.5, 373.5, 'i', [], { rs: 'not:lay:D' }], [507, 535.5, 534.5, 535.5, 'i', [], { rs: 'not:lay:D' }],
      [562.5, 330.5, 562.5, 458.5, 'i', [[350, 424, 'd', { pair: true, into: '+x', color: '#d9b98a', closed: true }]], { rs: 'not:lay:D' }],
      [514, 458.5, 564, 458.5, 'i', [], { rs: 'not:lay:D' }],
      [622, 330.5, 687.5, 330.5, 'i', [[645, 677, 'd', { hinge: 'lo', into: '-y', color: '#d9b98a' }]], { rs: 'not:lay:D' }],
      [623.5, 330.5, 623.5, 458.5, 'i', [[355, 392, 'd', { hinge: 'lo', into: '-x', color: '#d9b98a' }]], { rs: 'not:lay:D' }],
      [622, 458.5, 636.5, 458.5, 'i'], [636.5, 458.5, 636.5, 519, 'i'],
      [687.5, 330.5, 687.5, 458.5, 'i', [[403, 439, 'd', { hinge: 'lo', into: '+x', color: '#d9b98a' }]], { rs: 'not:lay:D' }],
      [687.5, 458.5, 687.5, 601.5, 'i'],
      [687.5, 472.5, 784, 472.5, 'i', [[705, 743, 'd', { hinge: 'lo', into: '+y', color: '#d9b98a' }]]],
      [687.5, 571.5, 784, 571.5, 'i', [[712, 745, 'd', { hinge: 'hi', into: '-y', color: '#d9b98a' }]]],
      [346, 432, 380, 432, 'i', [], { rs: 'not:lay:D' }], [380, 374.5, 380, 432, 'i', [[380, 405, 'd', { hinge: 'lo', into: '+x', color: '#d9b98a' }]], { rs: 'not:lay:D' }],
      [380, 645, 411, 645, 'i', [], { rs: 'not:lay:D' }], [411, 645, 411, 702, 'i', [[652, 686, 'd', { hinge: 'lo', into: '+x', color: '#d9b98a' }]], { rs: 'not:lay:D' }],
    ],
    footprint: [
      [[380, 236], [541, 236], [541, 67.5], [635.5, 67.5], [635.5, 28.5], [701.5, 28.5], [701.5, 67.5], [784.5, 67.5], [784.5, 236], [933, 236], [933, 403.5], [784, 403.5], [784, 601.5], [534, 601.5], [534, 702], [501, 702], [494, 721.5], [426, 721.5], [419, 702], [380, 702], [380, 528.5], [346, 528.5], [346, 374.5], [380, 374.5]],
    ],
    rooms: [
      { name: 'Closet', floor: 'concrete', wall: 'paint:#ecebe7', noLabel: true, poly: [[346, 374.5], [380, 374.5], [380, 432], [346, 432]] },
      { name: 'Closet', floor: 'concrete', wall: 'paint:#ecebe7', noLabel: true, poly: [[380, 645], [411, 645], [411, 702], [380, 702]] },
      { name: 'Utility', dims: "5'1\" x 3'0\"", floor: 'concrete', wall: 'block', bare: true, poly: [[635.5, 28.5], [701.5, 28.5], [701.5, 67.5], [635.5, 67.5]] },
      { name: 'Room', dims: "18'4\" x 10'5\" · drywalled", floor: 'concrete', wall: 'paint:#e9e8e4', poly: [[541, 67.5], [784.5, 67.5], [784.5, 208.5], [541, 208.5]] },
      { name: 'Room', dims: "11'2\" x 12'6\" · drywalled", floor: 'concrete', wall: 'paint:#e8b98d', poly: [[784, 236], [933, 236], [933, 403.5], [809.5, 403.5], [809.5, 354.5], [784, 354.5]] },
      { name: 'Recreation Room', dims: "18'11\" x 9'2\"", floor: 'concrete', wall: 'paint:#e4e2de', poly: [[541, 208.5], [784.5, 208.5], [784.5, 330.5], [534.5, 330.5], [534.5, 236], [541, 236]] },
      { name: 'Closet', floor: 'concrete', wall: 'paint:#e4e2de', noLabel: true, poly: [[534.5, 330.5], [562.5, 330.5], [562.5, 458.5], [534.5, 458.5]] },
      { name: 'Hall', dims: '', floor: 'concrete', wall: 'paint:#e4e2de', noLabel: true, poly: [[562.5, 330.5], [623.5, 330.5], [623.5, 458.5], [562.5, 458.5]] },
      { name: 'Stair Hall', dims: '', floor: 'concrete', wall: 'paint:#ecebe7', noLabel: true, poly: [[623.5, 330.5], [687.5, 330.5], [687.5, 519], [636.5, 519], [636.5, 458.5], [623.5, 458.5]] },
      { name: 'Hall', dims: "9'2\" x 11'0\"", floor: 'concrete', wall: 'paint:#ecebe7', poly: [[687.5, 330.5], [784, 330.5], [784, 354.5], [809.5, 354.5], [809.5, 403.5], [784, 403.5], [784, 472.5], [687.5, 472.5]] },
      { name: 'Bath (roughed in)', dims: "7'1\" x 7'4\"", floor: 'concrete', wall: 'paint:#efefec', poly: [[687.5, 472.5], [784, 472.5], [784, 571.5], [687.5, 571.5]] },
      { name: 'Closet', floor: 'concrete', wall: 'paint:#efefec', noLabel: true, poly: [[687.5, 571.5], [784, 571.5], [784, 601.5], [687.5, 601.5]] },
      { name: 'Hall', dims: "7'7\" x 20'11\"", floor: 'concrete', wall: 'paint:#e4e2de', poly: [[534.5, 458.5], [636.5, 458.5], [636.5, 519], [687.5, 519], [687.5, 601.5], [534.5, 601.5]] },
      { name: 'Recreation Room', dims: "14'2\" x 37'2\" · brown accent wall", floor: 'concrete', wall: 'paint:#e4e2de', accent: '#8a6448',
        poly: [[380, 236], [534.5, 236], [534.5, 702], [501, 702], [494, 721.5], [426, 721.5], [419, 702], [380, 702], [380, 528.5], [346, 528.5], [346, 374.5], [380, 374.5]] },
    ],
  },
  {
    id: 'f1', name: '1st Floor', map: F1, floor: 0, extBottom: -0.9, extTop: H.f2, intTop: H.ceil1,
    sill: 2.0, head: 7.0, ceiling: H.ceil1, grille: 'cs',
    walls: [
      // two-story family room: rear wall under the low eave, side walls follow the roof slope
      [474, 57.5, 701.5, 57.5, 'e', [[487, 545, 'w', { g: 'cs2', sill: 1.6 }], [633, 691, 'w', { g: 'cs2', sill: 1.6 }]], { top: FAMTOP }],
      [474, 57.5, 474, 197.5, 'e', famWin(), { slope: [FAMTOP, vaultUnder(197.5)] }],
      [701.5, 57.5, 701.5, 197.5, 'e', famWin(), { slope: [FAMTOP, vaultUnder(197.5)] }],
      // dining / kitchen wing
      [323.5, 197.5, 474, 197.5, 'e', [[354, 438, 's']]],
      [323.5, 197.5, 323.5, 351.5, 'e', [[233, 285, 'w', { g: 'cs2' }], [286, 338, 'w', { g: 'cs2' }]], { reno: 'kitchen' }],
      [292, 351.5, 323.5, 351.5, 'e'],
      [292, 351.5, 292, 494.5, 'e', [[397, 450, 'w', { g: 'cs2', sill: 3.6, blind: 0.9 }]]],
      [292, 494.5, 323.5, 494.5, 'e'],
      // living room + two-story bay
      [323.5, 494.5, 323.5, 656.5, 'e', [[550, 605, 'w', { g: 'cs2' }]]],
      [323.5, 656.5, 357, 656.5, 'e'],
      [357, 656.5, 372, 677, 'e', [[660, 673, 'w', { g: 'cs', sill: 2.0, head: 7.4, blind: true }]]],
      [372, 677, 425, 677, 'e', [[377, 420, 'w', { g: 'cs2', sill: 2.0, head: 7.4, blind: true }]]],
      [425, 677, 440, 656.5, 'e', [[660, 673, 'w', { g: 'cs', sill: 2.0, head: 7.4, blind: true }]]],
      [440, 656.5, 477, 656.5, 'e'],
      [477, 563.5, 477, 656.5, 'e'],
      // front: entry door with sidelights, laundry window
      [477, 563.5, 700, 563.5, 'e', [[482, 552, 'e', { hinge: 'hi', into: '-y' }], [646, 685, 'w', { g: 'cs', sill: 3.6 }]]],
      // garage: doors on the north (driveway) side, service door at the back
      [700, 563.5, 700, 722.5, 'e'],
      [700, 722.5, 987.5, 722.5, 'e', [[829, 889, 'w', { g: 'cs2', sill: 2.85, head: 8.8 }]]],
      [987.5, 378.5, 987.5, 722.5, 'e', [[403, 594, 'g'], [613, 711, 'g']]],
      [839.5, 378.5, 987.5, 378.5, 'e', [[863, 899, 'x', { hinge: 'hi', into: '+y', style: 'half', color: '#ece6d6' }]]],
      // office (main-floor bedroom)
      [839.5, 197.5, 839.5, 378.5, 'e', [[265, 326, 'w', { g: 'cs2', blind: true }]]],
      [701.5, 197.5, 839.5, 197.5, 'e', [[743, 804, 'w', { g: 'cs2', blind: true }]]],
      // ---- interior
      [474, 197.5, 474, 305, 'i', [[212, 305, 'o', { head: H.ceil1 }]], { top: H.f2, reno: 'kitchen' }], // dining | family: open, short wing wall
      [474, 305, 474, 318, 'i', [], { top: H.f2, reno: 'kitchen' }],                          // pier at the hall corner
      [475.5, 390, 475.5, 494.5, 'i'],                                                     // kitchen | hall (fridge wall)
      [323.5, 494.5, 476, 494.5, 'i', [[406, 444, 'o']], { reno: 'openLiving' }],          // kitchen | living room
      [477, 494.5, 477, 563.5, 'i', [[499, 552, 'o']]],                                     // living room | foyer
      [562, 305, 701.5, 305, 'i', [], { top: H.f2 }],                                        // closet + half bath | family room
      [562, 305, 562, 378, 'i', [[312, 372, 'c']]],                                        // coat closet
      [597, 305, 597, 378, 'i'],
      [562, 378, 701.5, 378, 'i', [[601, 637, 'd', { hinge: 'lo', into: '-y' }]]],         // half bath door
      [563.5, 422, 645, 422, 'i', [[569, 605, 'd', { hinge: 'hi', into: '-y', closed: true }]]],         // door to the basement stair (swings into the 3'8" hall, so it starts closed)
      [645, 378, 645, 422, 'i', [[383, 416, 'd', { hinge: 'lo', into: '+x' }]]],           // laundry door
      [610.5, 422, 610.5, 563.5, 'i'],                                                     // stair | laundry
      [688, 378, 688, 451.5, 'i', [[384, 447, 'c']], { reno: 'mud' }],                     // laundry closet
      [688, 451.5, 725.5, 451.5, 'i'],
      [701.5, 378.5, 839.5, 378.5, 'i'],                                                   // office | garage
      [725.5, 378.5, 725.5, 493.5, 'i'],
      [698, 493.5, 725.5, 493.5, 'i'],
      [700, 493.5, 700, 563.5, 'i', [[498, 532, 'd', { hinge: 'hi', into: '-x' }]]],      // laundry | garage
      [701.5, 197.5, 701.5, 378.5, 'i', [[242, 302, 'f', { pair: true, into: '+x' }]], { top: H.f2 }], // family | office French doors
      [779, 343, 839.5, 343, 'i', [[783, 835, 'c']]], [779, 343, 779, 378.5, 'i'],          // office closet
    ],
    footprint: [
      [[474, 57.5], [701.5, 57.5], [701.5, 197.5], [839.5, 197.5], [839.5, 378.5], [987.5, 378.5], [987.5, 722.5], [700, 722.5], [700, 563.5], [477, 563.5], [477, 656.5], [440, 656.5], [425, 677], [372, 677], [357, 656.5], [323.5, 656.5], [323.5, 494.5], [292, 494.5], [292, 351.5], [323.5, 351.5], [323.5, 197.5], [474, 197.5]],
    ],
    // 1st-floor deck at 0 (everything but the sunken family room and the garage)
    slab: [[323.5, 197.5], [474, 197.5], [474, 305], [701.5, 305], [701.5, 197.5], [839.5, 197.5], [839.5, 378.5], [725.5, 378.5], [725.5, 493.5], [700, 493.5], [700, 563.5], [477, 563.5], [477, 656.5], [440, 656.5], [425, 677], [372, 677], [357, 656.5], [323.5, 656.5], [323.5, 494.5], [292, 494.5], [292, 351.5], [323.5, 351.5]],
    slabHoles: [[[563.5, 422], [610.5, 422], [610.5, 563.5], [563.5, 563.5]]], // basement stair
    family: [[474, 57.5], [701.5, 57.5], [701.5, 305], [474, 305]],
    garage: [[700, 493.5], [725.5, 493.5], [725.5, 378.5], [987.5, 378.5], [987.5, 722.5], [700, 722.5]],
    // flat ceilings for the 1-story parts (elsewhere the underside of the 2nd floor)
    ceilings: [
      { pts: [[292, 351.5], [323.5, 351.5], [323.5, 494.5], [292, 494.5]], y: H.ceil1 },
      { pts: [[700, 493.5], [725.5, 493.5], [725.5, 378.5], [987.5, 378.5], [987.5, 722.5], [700, 722.5]], y: 8.4 },
    ],
    rooms: [
      { name: 'Stair', floor: null, wall: 'paint:#f3f2ee', noLabel: true, poly: [[563.5, 422], [610.5, 422], [610.5, 563.5], [563.5, 563.5]] },
      { name: 'Coat Closet', floor: 'tileFoyer', wall: 'paint:#f1f0ec', noLabel: true, poly: [[562, 305], [597, 305], [597, 378], [562, 378]] },
      { name: 'Closet', floor: 'vinylBeige', wall: 'paint:#f1f0ec', noLabel: true, poly: [[688, 378], [725.5, 378], [725.5, 451.5], [688, 451.5]] },
      { name: 'Closet', floor: 'carpet:#d9d4cb', wall: 'paint:#f1f0ec', noLabel: true, poly: [[779, 343], [839.5, 343], [839.5, 378.5], [779, 378.5]] },
      { name: 'Garage', dims: "23'3\" x 28'1\" · 3 car", floor: 'concrete', wall: 'paint:#e3e0d8', y: H.garage, bare: true,
        poly: [[700, 493.5], [725.5, 493.5], [725.5, 378.5], [987.5, 378.5], [987.5, 722.5], [700, 722.5]] },
      { name: 'Family Room', dims: "18'4\" x 20'2\" · 2-story, sunken", floor: 'carpet:#d9d4cb', wall: 'paint:#f3f2ee', y: H.family, vault: true, poly: [[474, 57.5], [701.5, 57.5], [701.5, 305], [474, 305]] },
      { name: 'Dining Area', dims: "12'2\" x 8'7\"", floor: 'oak', wall: 'paint:#f3f2ee', poly: [[323.5, 197.5], [474, 197.5], [474, 305], [323.5, 305]] },
      { name: 'Kitchen', dims: "14'9\" x 15'9\"", floor: 'oak', wall: 'paint:#f3f2ee', poly: [[323.5, 305], [474, 305], [474, 494.5], [292, 494.5], [292, 351.5], [323.5, 351.5]] },
      // photos 19-20: painted white trim (casings, base, chair rail, crown), pale gray-lavender walls, a shade darker below the rail
      { name: 'Living Room', dims: "12'2\" x 14'8\" · tray ceiling", floor: 'carpet:#86707a', wall: 'paint:#e8e6e7', lower: 'paint:#d9d5d9', trim: 'white', crown: true, chair: true, tray: true,
        poly: [[323.5, 494.5], [477, 494.5], [477, 656.5], [440, 656.5], [425, 677], [372, 677], [357, 656.5], [323.5, 656.5]] },
      { name: 'Hall', dims: "13'9\" x 6'8\"", floor: 'tileFoyer', wall: 'paint:#f3f2ee', poly: [[475.5, 305], [562, 305], [562, 378], [645, 378], [645, 422], [563.5, 422], [563.5, 430], [475.5, 430]] },
      { name: 'Foyer', dims: "7'0\" x 11'7\" · 2-story", floor: 'tileFoyer', wall: 'paint:#f3f2ee', poly: [[475.5, 430], [563.5, 430], [563.5, 563.5], [477, 563.5], [477, 494.5], [475.5, 494.5]] },
      { name: 'Half Bath', dims: "8'4\" x 5'7\"", floor: 'vinylBeige', wall: 'paint:#d9c6a6', poly: [[597, 305], [701.5, 305], [701.5, 378], [597, 378]] },
      { name: 'Laundry', dims: "12'11\" x 6'5\"", floor: 'vinylBeige', wall: 'paint:#f1f0ec',
        poly: [[610.5, 422], [645, 422], [645, 378], [688, 378], [688, 451.5], [698, 451.5], [698, 493.5], [700, 493.5], [700, 563.5], [610.5, 563.5]] },
      { name: 'Shelves', floor: 'vinylBeige', wall: 'paint:#f1f0ec', noLabel: true, poly: [[698, 451.5], [725.5, 451.5], [725.5, 493.5], [698, 493.5]] },
      { name: 'Office / Bedroom 4', dims: "11'2\" x 14'8\" (listed 11 x 11)", floor: 'carpet:#d9d4cb', wall: 'paint:#f3f2ee',
        poly: [[701.5, 197.5], [839.5, 197.5], [839.5, 343], [779, 343], [779, 378.5], [701.5, 378.5]] },
    ],
  },
  {
    id: 'f2', name: '2nd Floor', map: F2, floor: H.f2, extBottom: 0, extTop: 8, intTop: 8,
    sill: 1.9, head: 6.9, ceiling: 8, grille: 'cs', // bedroom sills ~1.7 ft to the trim (photo 34, and the photo 45 camera fit)
    walls: [
      [677, 109.5, 677, 334.6, 'e', [[128, 158, 'w', { g: 'cs2', blind: true }], [203, 222, 'w', { g: 'cs', sill: 3.0, blind: 1.3 }], [275, 305, 'w', { g: 'cs2', blind: true }]]],
      [677, 109.5, 751, 109.5, 'e', [[698, 727, 'w', { g: 'cs2', blind: true }]]],
      [677, 334.6, 693.5, 334.6, 'e'],
      [693.5, 334.6, 700.9, 344.7, 'e', [[336, 343, 'w', { g: 'cs', sill: 1.8 }]]],
      [700.9, 344.7, 726.9, 344.7, 'e', [[703, 725, 'w', { g: 'cs2', sill: 1.8 }]]],
      [726.9, 344.7, 734.3, 334.6, 'e', [[336, 343, 'w', { g: 'cs', sill: 1.8 }]]],
      [734.3, 334.6, 751, 334.6, 'e'],
      [751, 289, 751, 334.6, 'e'],
      [751, 289, 863, 289, 'e', [[755, 790, 'w', { g: 'cs', sill: 0.4, head: 4.3 }], [835, 855, 'w', { g: 'cs', sill: 3.5, head: 6.2 }]]], // foyer picture window: wide and low over the door (photos 06, 55, 61)
      [863, 276, 863, 289, 'e'],
      [863, 276, 931, 276, 'e'],
      [931, 268, 931, 276, 'e'],
      [931, 268, 976, 268, 'e'],
      [976, 198.8, 976, 268, 'e', [[206, 233, 'w', { g: 'cs2', sill: 2.6, blind: true }], [236, 263, 'w', { g: 'cs2', sill: 2.6, blind: true }]]],
      [931, 198.8, 976, 198.8, 'e'],
      [931, 109.5, 931, 198.8, 'e', [[145, 175, 'w', { g: 'cs2', sill: 3.2, blind: true }]]],
      [863, 109.5, 931, 109.5, 'e'],
      // interior
      [751, 109.5, 751, 191, 'i', [[166, 185, 'd', { pair: true, into: '-x', closed: true }]]],      // bedroom 3 | family void, its closet door
      [751, 162, 783, 162, 'i'], [783, 162, 783, 187, 'i'], [751, 187, 783, 187, 'i'],    // bedroom 3 walk-in closet
      [677, 191, 751, 191, 'i', [[734, 750, 'd', { hinge: 'lo', into: '-y' }]]], // hinged away from the closet corner (photo 35)
      [733, 191, 733, 253, 'i', [[205, 222, 'd', { hinge: 'lo', into: '-x' }]]],        // hall bath door
      [707, 222, 707, 240, 'i'], [707, 222, 733, 222, 'i', [[710, 730, 'd', { hinge: 'lo', into: '-y', closed: true }]]], // linen (swings into the bath, so it starts closed)
      [677, 240, 733, 240, 'i'],
      [677, 253, 733, 253, 'i', [[683, 727, 'c']]],                                       // bedroom 2 closet
      [733, 246, 751, 246, 'i', [[734, 750, 'd', { hinge: 'hi', into: '+y' }]]],
      [751, 246, 751, 289, 'i'],
      [836, 162, 863, 162, 'i'],
      [836, 162, 836, 215, 'i', [[165, 182, 'd', { hinge: 'lo', into: '-x' }], [190, 208, 'd', { hinge: 'lo', into: '+x' }]]], // linen, primary entry
      [836, 185, 863, 185, 'i'],
      [863, 109.5, 863, 185, 'i'],
      [863, 185, 931, 185, 'i', [[878, 895, 'd', { hinge: 'lo', into: '-y' }]]],        // primary bath door
      [893, 109.5, 893, 129, 'i'], [863, 129, 893, 129, 'i', [[874, 889, 'd', { hinge: 'hi', into: '+y' }]]], // water closet
      [819, 215, 863, 215, 'i', [[842, 858, 'd', { hinge: 'hi', into: '+y' }]]],        // primary walk-in closet
      [819, 215, 819, 289, 'i'],
      [863, 215, 863, 276, 'i'],
    ],
    footprint: [
      [[677, 109.5], [751, 109.5], [751, 162], [863, 162], [863, 109.5], [931, 109.5], [931, 198.8], [976, 198.8], [976, 268], [931, 268], [931, 276], [863, 276], [863, 289], [751, 289], [751, 334.6], [734.3, 334.6], [726.9, 344.7], [700.9, 344.7], [693.5, 334.6], [677, 334.6]],
    ],
    slabHoles: [[[751, 215], [819, 215], [819, 289], [751, 289]]], // stair + 2-story foyer
    rooms: [
      { name: 'Family Room (open to below)', floor: null, wall: 'paint:#f3f2ee', void: 'Family Room', noLabel: true, poly: [[751, 41], [863, 41], [863, 162], [751, 162]] },
      { name: 'Foyer (open to below)', floor: null, wall: 'paint:#f3f2ee', void: 'Foyer', noLabel: true, poly: [[751, 215], [795, 215], [795, 289], [751, 289]] },
      { name: 'Closet', floor: 'carpet:#c4bcb1', wall: 'paint:#f2f1ee', noLabel: true, poly: [[751, 162], [783, 162], [783, 187], [751, 187]] },
      { name: 'Linen', floor: 'vinylDiamond', wall: 'paint:#f2f1ee', noLabel: true, poly: [[707, 222], [733, 222], [733, 240], [707, 240]] },
      { name: 'Closet', floor: 'carpet:#c4bcb1', wall: 'paint:#f2f1ee', noLabel: true, poly: [[677, 240], [733, 240], [733, 253], [677, 253]] },
      { name: 'Linen', floor: 'carpet:#c4bcb1', wall: 'paint:#f2f1ee', noLabel: true, poly: [[836, 162], [863, 162], [863, 185], [836, 185]] },
      { name: 'WC', floor: 'tileBeige', wall: 'paint:#f4f3f0', noLabel: true, poly: [[863, 109.5], [893, 109.5], [893, 129], [863, 129]] },
      { name: 'Bedroom 3', dims: "12'2\" x 13'9\"", floor: 'carpet:#c79a9b', wall: 'paint:#f2f1ee', poly: [[677, 109.5], [751, 109.5], [751, 191], [677, 191]] },
      { name: 'Bath', dims: "8'7\" x 7'10\" · tub/shower", floor: 'vinylDiamond', wall: 'paint:#ead9cd', poly: [[677, 191], [733, 191], [733, 222], [707, 222], [707, 240], [677, 240]] },
      { name: 'Hall', dims: '', floor: 'carpet:#c4bcb1', wall: 'paint:#f2f1ee', noLabel: true, poly: [[733, 191], [751, 191], [751, 246], [733, 246]] },
      { name: 'Bedroom 2', dims: "12'2\" x 14'2\" · bay", floor: 'carpet:#c4bcb1', wall: 'paint:#f2f1ee',
        poly: [[677, 253], [733, 253], [733, 246], [751, 246], [751, 334.6], [734.3, 334.6], [726.9, 344.7], [700.9, 344.7], [693.5, 334.6], [677, 334.6]] },
      { name: 'Loft', dims: "14'0\" x 9'9\"", floor: 'carpet:#c4bcb1', wall: 'paint:#f2f1ee', poly: [[783, 162], [836, 162], [836, 215], [751, 215], [751, 187], [783, 187]] },
      { name: 'Primary Bedroom', dims: "23'2\" x 15'9\" (incl. bump over garage)", floor: 'carpet:#c4bcb1', wall: 'paint:#d9d1c9',
        poly: [[836, 185], [863, 185], [931, 185], [931, 198.8], [976, 198.8], [976, 268], [931, 268], [931, 276], [863, 276], [863, 215], [836, 215]] },
      { name: 'Primary Bath', dims: "11'5\" x 12'8\" · whirlpool + shower", floor: 'tileBeige', wall: 'paint:#f4f3f0', poly: [[863, 129], [893, 129], [893, 109.5], [931, 109.5], [931, 185], [863, 185]] },
      { name: 'Walk-in Closet', dims: "7'2\" x 12'7\"", floor: 'carpet:#c4bcb1', wall: 'paint:#f2f1ee', poly: [[819, 215], [863, 215], [863, 289], [819, 289]] },
    ],
  },
];

// Stairs (1st-floor px). Main: 14 risers (7.7"), 0 -> 9 ft, bottom at the front door, rising toward the back.
// Basement: 14 risers, -9.2 -> 0, under the main stair, top at the door off the back hall.
export const STAIRS = {
  main: { x0: 563.5, x1: 610.5, yBottom: 562, yTop: 412.5, risers: 14, flareX: 549 },
  basement: { x0: 563.5, x1: 610.5, yTop: 422, yBottom: 551, risers: 14 },
};

// ---------------------------------------------------------------- lot, street, neighbors, trees
// Measured from the Google Earth aerial (59.webp, north up) and the oblique view (60.webp). The aerial was fitted to
// this house's own footprint (garage corners, office and family room back corners, the 2nd-floor front corner, roof
// overhang ~1 ft): 3.40 px/ft, residuals ~1 ft. That fit also gives the orientation: +x points 217.5 deg (it was
// 225 before), so the street runs at ~37.5 / 217.5 deg and the front faces ~307 deg (northwest).
// Creekside Ln measures ~33 ft curb to curb at this scale (a little more than the usual 30 ft).
// Lot: 0.29 acre listed. The side lines sit between the houses (NE: ~6 ft off the kitchen bump, where the white
// picket fence is; SW: just past the driveway, at the arborvitae row); the front line is 1 ft behind the sidewalk.
// The rear line isn't visible: it's drawn through the band of tall spruces ~60 ft behind the family room, which
// gives 90 x 143 ft = 12,870 sq ft (0.30 ac). The red-mulch bed and the small lawn past the spruces most likely
// belong to the lot behind (1283 Chickadee): its side line (the row of shrubs) ends right at that bed.
// xSouth / xNorth are historical names for the plan-left (NE) and plan-right (SW, driveway) lot lines.
export const LOT = { zBack: -58, zFront: 85, xSouth: -6, xNorth: 84 };
// compass azimuth (degrees clockwise from north) of local +x; local +z is X_AZ + 90 (the front faces NW)
export const X_AZ = 217.5;
export const STREET = { sidewalk: [85.5, 90], curb: 96, width: 33 };
// Boxelder Ln (T into Creekside past 1252, curving SE to Chickadee Ln) and Chickadee Ln (the street behind), centerlines
export const STREETS = {
  boxelder: [[-128, 96.5], [-134, 70], [-139, 40], [-141, 18], [-152, -22], [-167, -66], [-181, -100], [-190, -114]],
  chickadee: [[-240, -60], [-185, -102], [-60, -197], [90, -312]],
};
// The houses on Chickadee Ln sit at an angle to ours. They were measured in a frame turned 44 deg from ours
// (p = toward our back yard, q = along Chickadee Ln); CH() maps that frame to plan feet.
const C44 = Math.cos((44 * Math.PI) / 180), S44 = Math.sin((44 * Math.PI) / 180);
export const CH = (p, q) => [p * C44 - q * S44, p * S44 + q * C44];
const CHROT = -134; // their fronts face Chickadee Ln
const chRect = (p0, q0, p1, q1) => [CH(p0, q0), CH(p0, q1), CH(p1, q1), CH(p1, q0)];
// Neighboring houses: nb(name, [x, z] center, rot, siding color, parts, options).
//   rot: degrees; the house's local +z (its front) points (sin rot, cos rot) in plan. 0 = faces Creekside from our
//        side, 180 = across the street, -134 = faces Chickadee Ln.
//   part: [lx0, lz0, lx1, lz1, eave (ft above grade), roof, pitch] in the house's own frame (feet from the center).
//         roof: 'hip', 'gx' (gable, ridge along local x), 'gz' (ridge along local z). pitch = rise / run (8/12 default).
//   doors: garage doors [lx, lz, width, face ('+x' | '-x' | '+z' | '-z')]; entry: [lx, lz, face]; chimney: [lx, lz, top]
//   patio / drive / court: plan polygons; deck: [x0, z0, x1, z1, height, open sides]; dist: label for the distance
//   (wall to wall) from this house.
// Most are 2-story (eave ~18.5-19 ft over grade), gray architectural shingles; siding colors from the oblique view
// where it shows them (1252 white, 1282 gray), otherwise light neutrals.
// roof 'shingle:n': the same shingle texture as ours, but not re-finished by the facade options
const nb = (name, [x, z], rot, wall, parts, o = {}) => ({ name, x, z, rot, wall, parts, roof: 'shingle:n', ...o });
export const NEIGHBORS = [
  // 1252: long side-gabled house with two front gables, white siding, chimney at the NE end, garage at the NE end
  // opening onto the drive from Boxelder Ln; brick patio behind; a fenced vegetable garden of raised beds
  nb('1252', [-50, 45], 0, '#ebe8df', [
    [-33, -13, 12, 12, 18.5, 'gx'], [12, -7, 34, 12, 18.5, 'gx'], [-30, 9, -11, 17, 18.5, 'gz'], [-8, 9, 8, 14, 18.5, 'gz'],
  ], { doors: [[-33, -3, 8.5, '-x'], [-33, 6.5, 8.5, '-x']], entry: [0, 12, '+z'], chimney: [-29, 3, 33],
    patio: [[-70, 24], [-56, 24], [-56, 32], [-70, 32]], patioKey: 'col:#9b5e4c',
    drive: [[-123, 34], [-83, 34], [-83, 59], [-123, 59]], garden: [-113, -21, -97, 32], dist: 'side wall' }),
  // 1282: gray, hipped, front-load 2-car garage projecting toward the street, chimney at the SW end, paver patio behind
  nb('1282', [122, 38], 0, '#a8acaf', [
    [-32, -22, -7, 4, 18.5, 'hip'], [-32, 2, -7, 23, 10, 'hip'], [-7, -23, 33, 12, 19, 'hip', 0.75],
    [-1, 8, 13, 14, 19, 'gz', 0.75], [19, 8, 33, 14, 19, 'gz', 0.75],
  ], { doors: [[-25, 23, 9, '+z'], [-14, 23, 9, '+z']], entry: [16, 12, '+z'], chimney: [33.5, -8, 34],
    patio: [[103, -2], [135, -2], [135, 15], [103, 15]], drive: [[90, 61], [115, 61], [117, 92], [119, 96], [88, 96], [90, 92]], dist: 'garage side' }),
  // 1290: hipped, front gable, side-load garage wing on its SW end
  nb('1290', [225, 32], 0, '#d8d0be', [
    [-33, -19, 11, 15, 19, 'hip', 0.75], [-20, 10, 0, 17, 19, 'gz', 0.75], [11, -13, 36, 17, 11, 'hip'],
  ], { doors: [[36, -5, 9, '+x'], [36, 7, 9, '+x']], entry: [-10, 17, '+z'],
    patio: [[203, 3], [226, 3], [226, 13], [203, 13]], drive: [[261, 18], [287, 18], [287, 96], [268, 96], [268, 50], [261, 50]] }),
  // behind 1290, mostly outside the aerial: footprint and orientation rough
  nb('house behind 1290', [241, -80], 180, '#d4cfc4', [[-21, -28, 21, 28, 19, 'hip']], { patio: [[194, -100], [219, -100], [219, -62], [194, -62]] }),
  // across Creekside Ln: 1259 (two front gables, side-load garage off the NE drive, raised deck behind)
  nb('1259', [5, 203], 180, '#d5cebf', [
    [-30, -25, 29, 25, 19, 'hip'], [-9, 11, 7, 25, 19, 'gz'], [-29, 11, -14, 25, 19, 'gz'],
  ], { doors: [[29, -6, 9, '+x'], [29, -16, 9, '+x']], entry: [-1, 25, '+z'],
    deck: [-8, 228, 22, 238, 3.2, '-z'], drive: [[-42, 129], [-24, 129], [-24, 224], [-42, 224]], dist: 'front' }),
  // 1277: front gable on the NE end, side-load garage off the NE drive
  nb('1277', [92, 203], 180, '#e2dccf', [
    [-26, -25, 26, 25, 19, 'hip'], [4, 8, 26, 25, 19, 'gz'],
  ], { doors: [[26, -6, 9, '+x'], [26, -16, 9, '+x']], entry: [-5, 25, '+z'], drive: [[46, 129], [65, 129], [65, 224], [46, 224]], dist: 'front' }),
  // the next houses along the far side are outside the aerial: generic stand-ins so the street isn't empty
  nb('', [-88, 204], 180, '#d9d3c6', [[-26, -24, 26, 24, 19, 'hip'], [-26, 10, -8, 24, 19, 'gz']], { doors: [[14, 24, 16, '+z']], drive: [[-110, 129], [-94, 129], [-94, 180], [-110, 180]], assumed: true }),
  nb('', [176, 204], 180, '#cfd2d0', [[-26, -24, 26, 24, 19, 'hip'], [8, 10, 26, 24, 19, 'gz']], { doors: [[-14, 24, 16, '+z']], drive: [[182, 129], [198, 129], [198, 180], [182, 180]], assumed: true }),
  // behind us, on Chickadee Ln: 1283 (front-load garage, front gable, paver patio with a red play set behind)
  nb('1283', CH(-110, -102), CHROT, '#cfcac0', [
    [-34, -17, -3, 14, 19, 'hip'], [-3, -15, 33, 17, 11, 'hip'], [-26, 14, -2, 23, 19, 'gz'],
  ], { doors: [[9, 17, 8.5, '+z'], [19.5, 17, 8.5, '+z']], entry: [-14, 23, '+z'],
    patio: chRect(-88, -108, -73, -90), play: CH(-86, -114), drive: chRect(-127, -98, -164, -78), dist: 'rear' }),
  // 1301: hipped, side-load garage facing the wide drive on its 1283 side
  nb('1301', CH(-105, -196), CHROT, '#d3d5d3', [
    [-35, -24, 35, 13, 19, 'hip'], [-1, 13, 30, 29, 11, 'gz'],
  ], { doors: [[35, 5, 8.5, '+x'], [35, -4.5, 8.5, '+x']], entry: [-15, 13, '+z'], drive: chRect(-116, -166, -157, -145), dist: 'rear' }),
  // the big unlabeled house on the Boxelder / Chickadee corner: side-load garage onto Boxelder, paver patio toward us,
  // red-paver court at the front
  nb('corner house', CH(-118, -20), CHROT, '#d8d4cb', [
    [-38, -21, 17, 22, 19, 'hip', 0.75], [-35, 16, -10, 25, 19, 'gz', 0.75], [17, -18, 37, 12, 11, 'hip'],
  ], { doors: [[37, -2.5, 9, '+x'], [37, -12.5, 9, '+x']], entry: [-3, 22, '+z'],
    patio: [CH(-97, -45), CH(-97, -15), CH(-88, -12), CH(-80, -22), CH(-82, -40), CH(-90, -47)], court: chRect(-152, -28, -140, -8),
    drive: chRect(-120, 17, -100, 68), dist: 'rear corner' }),
];
// Trees: [kind, x, z, height, canopy radius (deciduous; conifers derive it from the height)]. kinds: maple (green),
// mapleRed / mapleOrange (the two front maples, fall color as in the listing photos), locust, linden, purple
// (crimson-king type), oak, spruce, blue (Colorado blue spruce), shrubTree (small round). Canopies from the aerial;
// heights from the oblique view: the rear spruces stand as tall as or taller than the houses (40-58 ft).
export const TREES = [
  // front yard and street strips
  ['mapleRed', 44, 77, 50, 16.5], ['mapleOrange', 10, 76, 46, 15], ['maple', -17, 80, 44, 13], ['linden', 22, 97, 24, 6],
  ['linden', 120, 92, 38, 11], ['maple', 150, 70, 45, 15], ['purple', 172, 35, 38, 12], ['maple', 270, 66, 40, 12],
  ['linden', -65, 98, 42, 13], ['purple', -75, 74, 34, 11], ['maple', -97, 77, 40, 12],
  ['linden', -152, 80, 42, 13], ['maple', -124, 34, 40, 12], ['maple', -166, 2, 45, 14], ['maple', -131, -38, 46, 16], ['maple', -182, -58, 44, 14],
  ['maple', -193, -24, 42, 13], ['linden', -224, -55, 42, 13],
  ['maple', 4, 146, 44, 14], ['linden', 90, 133, 44, 14], ['maple', 190, 121, 40, 13], ['spruce', 14, 160, 20],
  ['linden', -117, -143, 40, 14], ['linden', -25, -212, 40, 13],
  // NE side and the NE back corner
  ['locust', -24, -10, 52, 18], ['maple', -66, -20, 46, 15], ['locust', -12, -38, 46, 16], ['purple', -3, -57, 30, 9], ['oak', -48, -43, 44, 13],
  ['spruce', -48, -73, 42], ['spruce', -15, -95, 45], ['spruce', 2, -82, 48], ['blue', -24, -76, 40], ['spruce', 6, -106, 44],
  // the band of tall spruces / firs across the back of the lawn, a big maple among them
  ['spruce', 32, -47, 48], ['spruce', 46, -59, 55], ['blue', 36, -73, 46], ['spruce', 58, -50, 52], ['spruce', 71, -61, 58],
  ['spruce', 59, -77, 46], ['spruce', 82, -49, 54], ['blue', 94, -62, 44], ['spruce', 104, -45, 56], ['spruce', 119, -56, 48],
  ['spruce', 127, -38, 52], ['spruce', 112, -24, 46], ['spruce', 135, -18, 44], ['spruce', 19, -60, 44], ['blue', 7, -69, 40],
  ['maple', 112, -77, 50, 16],
  // behind 1282 / 1290
  ['spruce', 141, -37, 46], ['spruce', 153, -53, 48], ['spruce', 167, -40, 44], ['spruce', 183, -22, 46], ['spruce', 162, -16, 40],
  ['spruce', 197, -12, 42], ['maple', 233, -10, 45, 15],
  // deeper: behind 1283 / 1301
  ['spruce', 40, -113, 48], ['spruce', 55, -97, 50], ['spruce', 63, -127, 46], ['spruce', 37, -135, 44],
  ['spruce', 120, -100, 46], ['spruce', 150, -86, 50], ['spruce', 171, -70, 46],
  ['maple', 55, -152, 48, 14], ['linden', 100, -178, 48, 14], ['maple', 78, -165, 44, 12], ['maple', 140, -150, 46, 14],
  ['linden', 160, -118, 46, 14], ['maple', 126, -123, 44, 14],
  // the row of small round shrubs on the 1283 / 1301 line
  ['shrubTree', 86, -108, 11, 3.2], ['shrubTree', 91, -115, 10, 3], ['shrubTree', 96, -121, 11, 3.2], ['shrubTree', 101, -127, 10, 3],
];
// Ground: where the lawn gives way to needle litter under the conifers (plan polygon), and the curving red-mulch bed
export const GROUND = {
  duff: [[-6, -50], [10, -48], [22, -43], [40, -40], [55, -42], [70, -44], [88, -40], [100, -34], [110, -14], [140, -6], [185, -6],
    [204, -26], [176, -64], [132, -72], [110, -64], [100, -70], [82, -66], [60, -84], [44, -100], [22, -114], [-30, -104], [-62, -78], [-40, -58]],
  redBed: [[60, -66], [71, -68], [80, -70.2], [89, -72.8], [95.5, -76.3], [97.5, -81.9], [95.3, -87.7], [92.1, -93.8], [86, -97]],
};
// living room tray ceiling (photos 19-20): octagon inside this px rectangle, corners chamfered by TRAY.c ft, 0.7 ft deep
export const TRAY = { px: [338, 509, 462, 641], c: 1.3, depth: 0.7 };
export const trayOct = () => {
  const [x0, z0] = toFt([TRAY.px[0], TRAY.px[1]]), [x1, z1] = toFt([TRAY.px[2], TRAY.px[3]]), c = TRAY.c;
  return [[x0 + c, z0], [x1 - c, z0], [x1, z0 + c], [x1, z1 - c], [x1 - c, z1], [x0 + c, z1], [x0, z1 - c], [x0, z0 + c]];
};
export const LATITUDE = 43.32;
export { OAK };
