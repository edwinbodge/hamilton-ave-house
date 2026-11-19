// Hamilton Rd house geometry, transcribed from the listing's CubiCasa floor plans (no printed dimensions) and photos.
//
// Every level is written in the pixel coordinates of its own plan image, mapped into 1st-floor plan pixels
// (the 1st-floor plan image, 1280 px wide), then into feet:
//   1st floor:  13.2 px/ft. The plans carry no dimensions, so the scale comes from the MLS room sizes:
//               dining 14 x 14, office 13 x 11, kitchen 26 long, great room 21 x 17, front living room 14 x 14 all
//               land within ~5% at 13.2 px/ft. House 59'8" wide (without the garage), 31'5" deep; garage 23'6" x 32'8".
//   2nd floor:  its own plan image, x 0.6607 / y 0.6613 to 1st-floor px, aligned on the outside walls (the 2nd floor
//               covers the whole 1st floor except the kitchen's one-story octagon and the garage). Bedroom 2 comes out
//               20' x 11'8" (listed 20 x 11), bedroom 3 13'10" x 12'5" (listed 14 x 12).
//   basement:   its own plan image, x/y 0.7604 to 1st-floor px, aligned on the rear wall, front wall, both side
//               walls and the octagon under the kitchen.
// Local frame (feet): x = plan right, z = plan down (toward the street), y = up. Origin = great room's back-left corner.
// Compass (from the satellite view): Hamilton Rd runs NW-SE and the house faces it to the southwest.
// +z (plan down, the front) = SW (azimuth ~218), +x (plan right, the garage side) = SE, -z (the back yard) = NE.
// 1st floor = 0, 2nd floor = 10, basement = -9.25 (8'+ ceiling, walk-out), front grade = -1, rear grade ~ -9.6.

export const PX = 13.2;
export const toFt = ([x, y]) => [(x - 177.5) / PX, (y - 171) / PX];
export const F1 = (x, y) => [x, y];
export const F2 = (x, y) => [177.5 + (x - 43) * 0.6607, 171 + (y - 120) * 0.6613];
export const BS = (x, y) => [177.5 + (x - 121) * 0.7604, 31.5 + (y - 32.5) * 0.7604];
export const F2inv = (x, y) => [43 + (x - 177.5) / 0.6607, 120 + (y - 171) / 0.6613];

// Wall entry: [x0, y0, x1, y1, kind ('e' exterior | 'i' interior), openings?, opts?]
// Opening: [a, b, type, opts?]  a,b = plan coordinate along the wall's main axis
// (x for walls flatter than 45 deg, y otherwise).
// Types: w window, d door, o drywall opening, x exterior door, e entry door w/ sidelights,
//        g garage door, s sliding patio door, f french door(s), c closet bypass doors
// Window opts: arch (half-round head, the rest of the opening a rectangle), g grille style, cols/rows grid.
// Wall opts: top (ft above the level's floor), slope [hStart, hEnd] (sloped top, absolute ft),
//            reno: 'name' (wall removed by renovation 'name')

// heights. 9 ft 1st-floor ceilings (photos 06, 10, 18: door heads ~2 ft below the ceiling), 10 ft floor to floor
// (17 stair risers), 8 ft upstairs, basement "8'+ ceiling" per the listing.
export const H = {
  f2: 10, ceil1: 9, ceil2: 18, basement: -9.25, grade: -1, rearGrade: -9.6, garage: -1.2,
  plate2: 18, pitch: 10 / 12, kitchenPlate: 9.4, kitchenPitch: 6 / 12, garagePlate: 9.0, garagePitch: 12 / 12,
  wingPlate: 15.0, wingPitch: 12 / 12, gablePitch: 12 / 12,
};
export const ROOFT = 0.55;
// ground: flat at the front, sloping down along the sides to the walk-out level behind the house
// On the living-room side the slope runs from 22 ft (front corner) down to 3 ft (the walk-out wall); on the garage side
// it is pushed back (12 ft down to -8 ft) so the garage apron and service door stay at the driveway level.
export const GROUND = { zMin: -8, zMax: 22 };
const band = (x) => { const t = Math.max(0, Math.min(1, (x - 44) / 8)); return [3 - 11 * t, 22 - 10 * t]; };
export const groundAt = (x, z) => { const [zL, zH] = band(x); return z >= zH ? H.grade : z <= zL ? H.rearGrade : H.rearGrade + ((z - zL) / (zH - zL)) * (H.grade - H.rearGrade); };

// great room cathedral ceiling (photos 13-16): symmetric vault over the room, ridge along x at the room's middle
export const GR = { x0: 177.5, x1: 433, y0: 171, y1: 391, spring: 16.5, pitch: 8 / 12 };
export const grVault = (yPx) => GR.spring + (Math.min(yPx - GR.y0, GR.y1 - yPx) / PX) * GR.pitch;

const dh = (o = {}) => ({ g: 'dh', ...o });

export const LEVELS = [
  {
    id: 'b', name: 'Basement', map: BS, floor: H.basement, extBottom: 0, extTop: 9.25, intTop: 8.25,
    sill: 5.0, head: 7.6, ceiling: 8.25, grille: 'cs2',
    walls: [
      // rec room back wall: patio slider to the walk-out patio under the deck
      [121, 216, 458, 216, 'e', [[255, 352, 's']]],
      [458, 125, 458, 216, 'e'],
      [458, 125, 552, 32.5, 'e'],
      [552, 32.5, 712, 32.5, 'e', [[575, 630, 'w', { g: 'cs2' }], [635, 690, 'w', { g: 'cs2' }]]],
      [712, 32.5, 712, 141, 'e'],
      [712, 141, 825, 141, 'e'],
      [825, 141, 825, 262, 'e'],
      [825, 262, 1158, 262, 'e', [[880, 935, 'w', { g: 'cs2' }], [935, 990, 'w', { g: 'cs2' }]]],
      [1158, 262, 1158, 492, 'e'],
      [966, 492, 1158, 492, 'e'],
      [966, 492, 966, 703, 'e'],
      [846, 703, 966, 703, 'e'],
      [846, 703, 846, 760, 'e'],
      [121, 760, 846, 760, 'e'],
      [121, 216, 121, 760, 'e', [[290, 360, 'w', { g: 'cs2' }]]],
      // interior
      [405, 216, 405, 412.5, 'i'],
      [458, 268, 559, 356, 'i'],
      [559, 356, 559, 412.5, 'i'],
      [405, 412.5, 825, 412.5, 'i', [[412, 452, 'd', { hinge: 'lo', into: '-y' }], [645, 693, 'd', { pair: true, into: '-y' }], [745, 785, 'd', { hinge: 'hi', into: '-y', closed: true }]]],
      [712, 141, 712, 412.5, 'i'],
      [825, 262, 825, 412.5, 'i', [[312, 360, 'd', { hinge: 'lo', into: '-x', closed: true }]]],
      [825, 412.5, 907, 492, 'i', [[845, 882, 'd', { hinge: 'lo', into: '+y' }]]],
      [907, 492, 907, 640, 'i'],
      [121, 475.5, 254, 475.5, 'i', [[140, 236, 'o', { head: 7.0 }]]],
      [254, 475.5, 254, 565.5, 'i', [[498, 546, 'd', { hinge: 'lo', into: '-x' }]]],
      [254, 565.5, 511, 565.5, 'i'],
      [423, 565.5, 423, 760, 'i', [[585, 630, 'd', { hinge: 'lo', into: '+x' }]]],
      [423, 475.5, 775, 475.5, 'i', [[440, 500, 'o', { head: 7.0 }]]],
      [508.5, 475.5, 508.5, 565.5, 'i'],
      [775, 475.5, 846, 545, 'i', [[792, 830, 'd', { pair: true, into: '+y' }]]],
      [846, 545, 846, 703, 'i', [], { top: 9.25 }],
    ],
    footprint: [
      [[121, 216], [458, 216], [458, 125], [552, 32.5], [712, 32.5], [712, 141], [825, 141], [825, 262], [1158, 262], [1158, 492], [966, 492], [966, 703], [846, 703], [846, 760], [121, 760]],
    ],
    rooms: [
      { name: 'Recreation Room', dims: "21'7\" x 19'8\" · walk-out", floor: 'carpet:#c4b298', wall: 'paint:#d9ccb4', poly: [[121, 216], [405, 216], [405, 475.5], [121, 475.5]] },
      { name: 'Bath', dims: "4' x 15' · shower", floor: 'tile:#ddd3c4', wall: 'paint:#cbbfa9', poly: [[405, 216], [458, 216], [458, 268], [559, 356], [559, 412.5], [405, 412.5]] },
      { name: 'Conference Room', dims: "19'4\" x 28'8\" · built-ins", floor: 'carpet:#d6ccba', wall: 'paint:#e4dccd', poly: [[458, 125], [552, 32.5], [712, 32.5], [712, 412.5], [559, 412.5], [559, 356], [458, 268]] },
      { name: 'Utility', dims: "8'7\" x 20'7\"", floor: 'concrete', wall: 'block', bare: true, poly: [[712, 141], [825, 141], [825, 412.5], [712, 412.5]] },
      { name: 'Computer Room', dims: "25'4\" x 17'6\"", floor: 'checker', wall: 'paint:#d8322c', poly: [[825, 262], [1158, 262], [1158, 492], [907, 492], [825, 412.5]] },
      { name: 'Hall', dims: '', floor: 'carpet:#c4b298', wall: 'paint:#e4dccd', noLabel: true, poly: [[405, 412.5], [825, 412.5], [907, 492], [907, 703], [846, 703], [846, 545], [775, 475.5], [405, 475.5]] },
      { name: 'Exercise Room', dims: "23' x 21'8\" (listed as bedroom 4, 22 x 14)", floor: 'speckle', wall: 'paint:#cdbb9a', poly: [[121, 475.5], [254, 475.5], [254, 565.5], [423, 565.5], [423, 760], [121, 760]] },
      { name: 'Stair', floor: null, wall: 'paint:#e4dccd', noLabel: true, poly: [[254, 475.5], [508.5, 475.5], [508.5, 565.5], [254, 565.5]] },
      { name: 'Workshop', dims: "32'2\" x 21'8\"", floor: 'concrete', wall: 'paint:#efede6', poly: [[423, 475.5], [775, 475.5], [846, 545], [846, 760], [423, 760]] },
    ],
  },
  {
    id: 'f1', name: '1st Floor', map: F1, floor: 0, extBottom: -1.0, extTop: H.f2, intTop: H.ceil1,
    sill: 2.4, head: 7.6, ceiling: H.ceil1, grille: 'dh',
    walls: [
      // great room back wall: two sliding patio doors with transoms (photos 13-17)
      [177.5, 171, 433, 171, 'e', [[246, 308.5, 's'], [246, 308.5, 'w', { sill: 7.25, head: 8.7, g: 'cs' }], [311.5, 374, 's'], [311.5, 374, 'w', { sill: 7.25, head: 8.7, g: 'cs' }]]],
      // fireplace wall (exterior chimney), living room side window
      [177.5, 171, 177.5, 585, 'e', [[488, 534, 'w', dh()]]],
      // front: living room, entry (door with oval glass, sidelights, leaded transom), dining
      [177.5, 585, 721, 585, 'e', [[200, 238, 'w', dh()], [286, 324, 'w', dh()], [415, 481, 'e', { hinge: 'lo', into: '-y' }], [415, 481, 'w', { sill: 7.15, head: 8.2, g: 'lead' }], [553, 591, 'w', dh()], [637, 675, 'w', dh()]]],
      [721, 538.5, 721, 585, 'e'],
      [721, 538.5, 820, 538.5, 'e', [[757, 795, 'w', dh({ sill: 4.0 })]]],
      // garage: two windows on the front gable wall, doors on the side (driveway) wall, service door at the back
      [820, 538.5, 820, 812, 'e', [], { top: H.garagePlate }],
      [820, 812, 1130, 812, 'e', [[870, 918, 'w', dh({ sill: 3.0, head: 7.8 })], [1027, 1079, 'w', dh({ sill: 3.0, head: 7.8 })]], { top: H.garagePlate }],
      [1130, 381, 1130, 812, 'e', [[392, 523, 'g'], [574, 784, 'g']], { top: H.garagePlate }],
      [966, 381, 1130, 381, 'e', [[1001, 1041, 'x', { hinge: 'hi', into: '+y', style: 'half', color: '#ece6d6' }]], { top: H.garagePlate }],
      // office + laundry back wall, kitchen side wall
      [966, 206, 966, 381, 'e'],
      [712.5, 206, 966, 206, 'e', [[745, 791, 'w', { g: 'cs', sill: 3.6 }], [855, 894, 'w', { g: 'cs' }], [894, 933, 'w', { g: 'cs' }]]],
      [712.5, 102, 712.5, 171, 'e', [], { top: H.kitchenPlate }],
      [712.5, 171, 712.5, 206, 'e'],
      // kitchen octagon: sink window, dinette window, deck slider (photos 21-23)
      [644, 31.5, 712.5, 102, 'e', [[46, 88, 'w', { g: 'cs2', sill: 3.5 }]], { top: H.kitchenPlate }],
      [502, 31.5, 644, 31.5, 'e', [[528, 616, 'w', { g: 'cs2', cols: 3, rows: 2 }]], { top: H.kitchenPlate }],
      [433, 102, 502, 31.5, 'e', [[44, 90, 's']], { top: H.kitchenPlate }],
      [433, 102, 433, 171, 'e', [], { top: H.kitchenPlate }],
      // ---- interior
      // pantry (angled door into the kitchen) and powder room behind the great room's wet bar
      [433, 171, 476, 171, 'i'],
      [476, 171, 531, 226, 'i', [[485, 522, 'd', { hinge: 'lo', into: '+y' }]], { reno: 'kitchen' }],
      [433, 171, 433, 250, 'i'],
      [433, 250, 531, 250, 'i'],
      [531, 226, 531, 322, 'i', [], { reno: 'kitchen' }],
      [456, 250, 456, 322, 'i'],
      [456, 322, 531, 322, 'i', [[468, 505, 'd', { hinge: 'lo', into: '-y' }]]],
      // living room: closed off from the great room, cased doorway from the foyer near the front
      [177.5, 391, 358, 391, 'i'],
      [358, 391, 358, 585, 'i', [[520, 576, 'o', { cased: true, head: 7.6 }]]],
      // stair wall facing the great room
      [358, 391, 493, 391, 'i', [], { top: H.f2 }],
      // basement stair under the main stair: door at the foyer end
      [493, 391, 493, 437, 'i', [[396, 432, 'd', { hinge: 'lo', into: '-x', closed: true, color: '#f2efe8' }]]],
      [405, 437, 493, 437, 'i', [], { top: 6.0 }],
      // dining: cased opening from the foyer (photo 09), doorway to the kitchen (photo 26)
      [537, 382, 537, 585, 'i', [[518, 578, 'o', { cased: true, head: 7.8 }]]],
      [537, 382, 677, 382, 'i', [[604, 644, 'o', { head: 7.0 }]], { reno: 'kitchen' }],
      [677, 362, 677, 382, 'i'],
      [677, 382, 721, 382, 'i'],
      [721, 382, 721, 538.5, 'i'],
      // laundry, back hall, office
      [712.5, 206, 712.5, 322, 'i'],
      [712.5, 322, 820, 322, 'i', [[746, 784, 'd', { hinge: 'hi', into: '-y' }]], { reno: 'mud' }],
      [820, 206, 820, 381, 'i', [[332, 370, 'd', { hinge: 'lo', into: '+x' }]]],
      [820, 381, 966, 381, 'i'],
      [820, 381, 820, 538.5, 'i', [[386, 420, 'x', { hinge: 'lo', into: '+x', style: 'panel6', color: '#f2efe8' }]]],
      [928, 206, 928, 252, 'i'], [880, 252, 928, 252, 'i', [[884, 924, 'c']]], // office closet
    ],
    footprint: [
      [[177.5, 171], [433, 171], [433, 102], [502, 31.5], [644, 31.5], [712.5, 102], [712.5, 206], [966, 206], [966, 381], [1130, 381], [1130, 812], [820, 812], [820, 538.5], [721, 538.5], [721, 585], [177.5, 585]],
    ],
    // (the back-hall stair well is cut out of the outline; the basement stair under the main stair is a hole)
    slab: [[177.5, 171], [433, 171], [433, 102], [502, 31.5], [644, 31.5], [712.5, 102], [712.5, 206], [966, 206], [966, 381], [820, 381], [820, 425], [731, 425], [731, 538.5], [721, 538.5], [721, 585], [177.5, 585]],
    slabHoles: [[[358.5, 391.5], [493, 391.5], [493, 437], [358.5, 437]]],
    garage: [[820, 381], [1130, 381], [1130, 812], [820, 812]],
    rooms: [
      { name: 'Great Room', dims: "19'4\" x 16'8\" · 2-story cathedral, wet bar", floor: 'carpet:#d9ceb7', wall: 'paint:#d8c6a5', vault: true, poly: [[177.5, 171], [433, 171], [433, 250], [456, 250], [456, 322], [433, 322], [433, 391], [177.5, 391]] },
      { name: 'Pantry', dims: 'walk-in', floor: 'tile:#e4d9c6', wall: 'paint:#f1efe9', noLabel: true, poly: [[433, 171], [476, 171], [531, 226], [531, 250], [433, 250]] },
      { name: 'Powder Room', dims: "5'8\" x 5'5\"", floor: 'oak', wall: 'paint:#e9e8e4', poly: [[456, 250], [531, 250], [531, 322], [456, 322]] },
      { name: 'Kitchen', dims: "26' x 15' · island, dinette octagon", floor: 'tile:#e4d9c6', wall: 'paint:#efede7',
        poly: [[433, 102], [502, 31.5], [644, 31.5], [712.5, 102], [712.5, 322], [677, 322], [677, 382], [537, 382], [537, 322], [531, 322], [531, 226], [476, 171], [433, 171]] },
      { name: 'Hall', dims: '', floor: 'marbleRose', wall: 'paint:#e9e8e4', noLabel: true, poly: [[433, 322], [537, 322], [537, 391], [433, 391]] },
      { name: 'Living Room', dims: "13'8\" x 14'8\"", floor: 'carpet:#e2dbcc', wall: 'paint:#f1ebdf', trim: 'white', crown: true, crownKey: 'crownBlue', poly: [[177.5, 391], [358, 391], [358, 585], [177.5, 585]] },
      { name: 'Foyer', dims: "13'7\" x 14'8\" · 2-story", floor: 'marbleRose', wall: 'paint:#e6e5e2', trim: 'white', poly: [[358, 437], [493, 437], [493, 391], [537, 391], [537, 585], [358, 585]] },
      { name: 'Stair', floor: null, wall: 'paint:#e6e5e2', noLabel: true, poly: [[358, 391], [493, 391], [493, 437], [358, 437]] },
      { name: 'Dining Room', dims: "13'9\" x 15'4\"", floor: 'oak', wall: 'paint:#b9432f', lower: 'paint:#f4f2ec', trim: 'white', chair: true, crown: true, poly: [[537, 382], [721, 382], [721, 585], [537, 585]] },
      { name: 'Back Hall', dims: '', floor: 'tile:#e4d9c6', wall: 'paint:#efede7', noLabel: true, poly: [[677, 322], [820, 322], [820, 425], [731, 425], [731, 538.5], [721, 538.5], [721, 382], [677, 382]] },
      { name: 'Stair', floor: null, wall: 'paint:#efede7', noLabel: true, poly: [[731, 425], [820, 425], [820, 538.5], [731, 538.5]] },
      { name: 'Laundry', dims: "8'2\" x 8'9\"", floor: 'tile:#ebe6dc', wall: 'paint:#efe4dc', poly: [[712.5, 206], [820, 206], [820, 322], [712.5, 322]] },
      { name: 'Office', dims: "11' x 13'3\"", floor: 'carpet:#7e8893', wall: 'paint:#f0ebe1', poly: [[820, 206], [966, 206], [966, 381], [820, 381]] },
      { name: 'Garage', dims: "23'6\" x 32'8\" · 3 car", floor: 'concrete', wall: 'paint:#eceae4', y: H.garage, bare: true, poly: [[820, 381], [1130, 381], [1130, 812], [820, 812]] },
    ],
  },
  {
    id: 'f2', name: '2nd Floor', map: F2, floor: H.f2, extBottom: 0, extTop: 8, intTop: 8,
    sill: 2.4, head: 7.0, ceiling: 8, grille: 'dh',
    walls: [
      // back: great room upper windows, hall bath, primary bedroom
      [43, 120, 857, 120, 'e', [[122, 186, 'w', { g: 'cs', sill: 1.2, head: 6.6 }], [188, 262, 'w', { g: 'cs', sill: 1.2, head: 6.6 }], [264, 330, 'w', { g: 'cs', sill: 1.2, head: 6.6 }],
        [478, 532, 'w', { g: 'cs', sill: 4.4 }], [785, 845, 'w', { g: 'cs2' }]]],
      [857, 120, 857, 173, 'e', [[128, 165, 'w', { g: 'cs' }]]],
      // the wing over the laundry, office and the back of the garage is a lower side gable (ridge parallel to the main
      // ridge, photos 81, 84): 5 ft knee walls front and back with short windows (photo 39), gable end facing the driveway
      [857, 173, 1236, 173, 'e', [[867, 925, 'w', { g: 'cs2', sill: 1.4, head: 4.5 }], [1050, 1145, 'w', { g: 'cs2', sill: 1.5, head: 4.5 }]], { top: H.wingPlate - H.f2 }],
      [1236, 173, 1236, 232.8, 'e', [], { slope: [15, 18] }],
      [1236, 232.8, 1236, 615.1, 'e', [[300, 350, 'w', { g: 'cs', sill: 3.0 }]]],
      [1236, 615.1, 1236, 676, 'e', [], { slope: [18, 15] }],
      [878, 676, 1236, 676, 'e', [[925, 962, 'w', { g: 'cs', sill: 1.4, head: 4.5 }]], { top: H.wingPlate - H.f2 }],
      [878, 676, 878, 746, 'e'],
      // front: bedrooms, the arched Palladian window over the entry (photos 03, 04, 06)
      [43, 746, 878, 746, 'e', [[82, 143, 'w', dh()], [212, 273, 'w', dh()], [372, 412, 'w', dh({ sill: 1.4, head: 6.4 })], [415, 487, 'w', { g: 'dh', sill: 1.4, head: 6.6, arch: true }], [490, 530, 'w', dh({ sill: 1.4, head: 6.4 })], [622, 688, 'w', dh()], [742, 798, 'w', dh()]]],
      // great room side: half-round windows high up either side of the chimney breast (photo 13)
      [43, 120, 43, 746, 'e', [[149, 217, 'w', { g: 'cs', sill: 2.4, head: 5.2, arch: true }], [357, 415, 'w', { g: 'cs', sill: 2.4, head: 5.2, arch: true }]]],
      // ---- interior
      // hall bath + chimney, primary bedroom entry
      [425, 120, 425, 253, 'i'],
      [425, 253, 533, 349, 'i', [[450, 490, 'd', { hinge: 'lo', into: '-y' }]]],
      [533, 209, 533, 349, 'i'],
      [533, 209, 593, 209, 'i'],
      [593, 120, 593, 209, 'i'],
      [593, 209, 593, 300, 'i'],
      [593, 300, 593, 403, 'i'],
      [533, 300, 593, 300, 'i'],
      [533, 349, 593, 403, 'i', [[541, 580, 'd', { hinge: 'lo', into: '-y', closed: true }]]],
      [593, 403, 660, 460, 'i', [[604, 650, 'd', { pair: true, into: '-y' }]]],
      // great room balcony rail (diagonal) + wall down to the left bedroom
      [350, 343, 265, 445, 'i'],
      // left bedroom (bedroom 3) + its closet
      [43, 421, 247, 421, 'i'], [247, 421, 265, 445, 'i'],
      [43, 499, 225, 499, 'i', [[60, 192, 'c']]], [225, 499, 265, 445, 'i'],
      [265, 445, 318, 495, 'i', [[276, 309, 'd', { hinge: 'hi', into: '+y' }]]],
      [318, 495, 318, 746, 'i'],
      // right bedroom (bedroom 2): door off the hall, closet, alcove under the roof
      [572, 522, 572, 746, 'i'],
      [572, 522, 603, 522, 'i'],
      [603, 522, 660, 460, 'i', [[470, 512, 'd', { hinge: 'lo', into: '+y' }]]],
      [660, 460, 972, 460, 'i'],
      [706, 460, 706, 512, 'i'], [706, 512, 837, 512, 'i', [[712, 832, 'c']]], [837, 460, 837, 512, 'i'],
      // primary bath, its linen closet and water closet; walk-in closet
      [972, 173, 972, 232.8, 'i', [], { slope: [15, 18] }], [972, 232.8, 972, 385, 'i'],
      [972, 385, 1236, 385, 'i', [[1013, 1067, 'd', { hinge: 'lo', into: '-y' }]]],
      [972, 289, 1008, 289, 'i', [], { reno: 'pbath' }], [1008, 289, 1008, 385, 'i', [[300, 352, 'd', { hinge: 'hi', into: '+x', closed: true }]], { reno: 'pbath' }],
      [1162, 173, 1162, 232.8, 'i', [], { slope: [15, 18] }], [1162, 232.8, 1162, 259, 'i'], [1162, 259, 1192, 294, 'i', [[263, 290, 'd', { hinge: 'lo', into: '-y', closed: true }]]], [1192, 294, 1236, 294, 'i'],
      [972, 460, 972, 615.1, 'i'], [972, 615.1, 972, 676, 'i', [], { slope: [18, 15] }],
      [972, 460, 1236, 460, 'i', [[1015, 1070, 'd', { hinge: 'lo', into: '+y' }]]],
    ],
    footprint: [
      [[43, 120], [857, 120], [857, 173], [1236, 173], [1236, 676], [878, 676], [878, 746], [43, 746]],
    ],
    // floor outline: the footprint minus the great room void, the foyer void and the stair well
    slab: [[425, 120], [857, 120], [857, 173], [1236, 173], [1236, 676], [878, 676], [878, 746], [572, 746], [572, 522], [500, 522], [500, 455], [386, 455], [386, 450], [322, 450], [322, 522], [318, 522], [318, 746], [43, 746], [43, 421], [247, 421], [265, 445], [350, 343], [425, 253]],
    rooms: [
      { name: 'Great Room (open to below)', floor: null, wall: 'paint:#d8c6a5', void: 'Great Room', noLabel: true, poly: [[43, 120], [425, 120], [425, 253], [350, 343], [265, 445], [247, 421], [43, 421]] },
      { name: 'Foyer (open to below)', floor: null, wall: 'paint:#e6e5e2', void: 'Foyer', noLabel: true, poly: [[318, 522], [572, 522], [572, 746], [318, 746]] },
      { name: 'Hall', dims: '', floor: 'oak', wall: 'paint:#ece9e2', noLabel: true,
        poly: [[425, 253], [533, 349], [593, 403], [660, 460], [603, 522], [500, 522], [500, 455], [386, 455], [386, 450], [322, 450], [322, 522], [318, 522], [318, 495], [265, 445], [350, 343]] },
      { name: 'Stair', floor: null, wall: 'paint:#ece9e2', noLabel: true, void: 'Foyer', poly: [[322, 450], [386, 450], [386, 455], [500, 455], [500, 522], [322, 522]] },
      { name: 'Bath', dims: "8'2\" x 11' · tub/shower", floor: 'vinylDiamond', wall: 'paint:#f3f2ee', poly: [[425, 120], [593, 120], [593, 209], [533, 209], [533, 349], [425, 253]] },
      { name: 'Linen', floor: 'oak', wall: 'paint:#ece9e2', noLabel: true, poly: [[533, 300], [593, 300], [593, 403], [533, 349]] },
      { name: 'Bedroom 3', dims: "13'10\" x 12'5\"", floor: 'carpet:#d8d0bf', wall: 'paint:#efe7d8', poly: [[43, 499], [225, 499], [265, 445], [318, 495], [318, 746], [43, 746]] },
      { name: 'Closet', floor: 'carpet:#d8d0bf', wall: 'paint:#efe7d8', noLabel: true, poly: [[43, 421], [247, 421], [265, 445], [225, 499], [43, 499]] },
      { name: 'Bedroom 2', dims: "20' x 11'8\" · TV alcove", floor: 'carpet:#cfc6b5', wall: 'paint:#d6a33d',
        poly: [[572, 522], [603, 522], [660, 460], [706, 460], [706, 512], [837, 512], [837, 460], [972, 460], [972, 676], [878, 676], [878, 746], [572, 746]] },
      { name: 'Closet', floor: 'carpet:#cfc6b5', wall: 'paint:#d6a33d', noLabel: true, poly: [[706, 460], [837, 460], [837, 512], [706, 512]] },
      { name: 'Primary Bedroom', dims: "19' x 17' · fireplace, tray ceiling", floor: 'carpet:#d9ceb8', wall: 'paint:#efe5d2',
        poly: [[593, 120], [857, 120], [857, 173], [972, 173], [972, 385], [1236, 385], [1236, 460], [660, 460], [593, 403]] },
      { name: 'Primary Bath', dims: "17'5\" x 14' · whirlpool, shower, skylights", floor: 'tile:#2f5a4f', wall: 'paint:#d8b689',
        poly: [[972, 173], [1162, 173], [1162, 259], [1192, 294], [1236, 294], [1236, 385], [1008, 385], [1008, 289], [972, 289]] },
      { name: 'Linen', floor: 'tile:#2f5a4f', wall: 'paint:#d8b689', noLabel: true, poly: [[972, 289], [1008, 289], [1008, 385], [972, 385]] },
      { name: 'WC', floor: 'tile:#2f5a4f', wall: 'paint:#7a5a3e', noLabel: true, poly: [[1162, 173], [1236, 173], [1236, 294], [1192, 294], [1162, 259]] },
      { name: 'Walk-in Closet', dims: "17'5\" x 14'4\" · built-ins", floor: 'carpet:#d9ceb8', wall: 'paint:#f2efe8', poly: [[972, 460], [1236, 460], [1236, 676], [972, 676]] },
    ],
  },
];
// chimney masses (1st-floor px): great room fireplace (outside the left wall) and the primary bedroom fireplace flue
export const CHIMNEYS = [
  { px: [149, 241, 177.5, 322], base: -1.0, top: 34.5 },
  { px: [...F2(533, 209), ...F2(607, 300)], base: H.f2, top: 33.5 },
];

// Main stair (photos 06, 08, 32): L-shaped, 17 risers (7.06"). Bottom run rises toward the back along the living-room
// wall, three winders in the back corner, top run rises toward the garage side along the great-room wall.
export const STAIRS = {
  main: { risers: 17, lower: { x0: 362, x1: 405, yBottom: 512, yTop: 437, n: 6 }, wind: { x0: 362, x1: 405, y0: 391, y1: 437, n: 3 }, upper: { y0: 391, y1: 437, xStart: 405, xEnd: 493, n: 7 } },
  // basement stair stacked under it, rising toward the foyer end (13 risers)
  front: { y0: 393, y1: 435, xBottom: 360, xTop: 482, risers: 13 },
  // back-hall U stair to the basement (15 risers): first flight down toward the front, landing, second flight back
  back: { xa0: 731, xa1: 774, xb0: 776, xb1: 819, yTop: 425, yLand0: 491, yLand1: 538.5, risers: 15, nA: 7 },
};

// Lot: 0.88 acre (38,332 sq ft) drawn as a 141 x 272 ft rectangle (the shape outlined in the listing's drone photo,
// sides ~1.93 : 1). From the satellite view: the house sits well back from Hamilton Rd (~105 ft from the pavement to the
// front wall), roughly centered side to side with room for the side-load garage apron on the SE side; the lot runs
// back NE into the woods.
export const LOT = { zBack: -156, zFront: 116, xSouth: -32, xNorth: 109 };
// compass azimuth (degrees clockwise from north) of local +x; local +z is X_AZ + 90 (the front faces SW = 218)
export const X_AZ = 128;
export const STREET = { curb: 137, width: 24 };
const nb = (x0, z0, x1, z1, eave, ridge, type, wall, roof = '#62666b', doors) => ({ x0, z0, x1, z1, eave, ridge, type, wall, roof, doors });
// Neighboring houses from the satellite view (positions only; sizes and colors approximate)
export const NEIGHBORS = [
  nb(170, 40, 228, 88, 19, 31, 'hip', '#b9a48c', '#55585c', [[228, 50, 9, 1, 0], [228, 62, 9, 1, 0]]), // SE, past the terraced lawn
  nb(205, -100, 258, -58, 18, 30, 'gx', '#c9c2b4', '#4f5357'),                                         // E, behind
  nb(160, -232, 205, -196, 17, 28, 'gx', '#d7d1c4', '#4f5357'),                                         // NE, with the pool
  nb(-60, 250, -10, 285, 17, 28, 'gx', '#d2c8b6', '#55585c'),                                           // across Hamilton Rd
  nb(150, 228, 190, 262, 17, 28, 'hip', '#c6c0b4', '#55585c'),
];
export const LATITUDE = 43.29;
