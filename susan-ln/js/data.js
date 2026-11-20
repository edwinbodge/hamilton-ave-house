// Susan Ln house (Cedarburg, WI; 2017) geometry, from the listing's Zillow 3D-tour floor map (vector plans in
// meters, one per floor) and the listing photos.
//
// Every level is written in 1st-floor plan inches ("px", 12 px/ft). The three floor maps are drawn in their own
// frames; they are aligned here on shared features:
//   2nd floor -> 1st: +0.45 m east, +0.98 m north. The open-to-below outline then sits exactly on the living room
//       (rear wall, west edge, and the chimney chase notch over the fireplace), and the upper stair flight on the
//       1st-floor stair well. The 2nd floor's front wall comes out ~4.5 ft past the 1st floor's, over the porch
//       (the short pent roof across the front in photo 01).
//   basement -> 1st: +2.25 m east, +3.80 m north (side walls, the dining bump and the stair under the main stair).
// Local frame (feet): x = plan right (EAST on the plan = WEST in reality), z = plan down (toward Susan Ln, which is
// NORTH), y = up. 1st floor = 0, 2nd floor = 10, basement = -9.4, grade ~ -0.7. Main floor ceilings 9 ft.
export const PX = 12;
export const toFt = ([x, y]) => [x / PX, y / PX];
export const F1 = (x, y) => [x, y];
export const F2 = F1, BS = F1;
export const F2inv = F1;

// Wall entry: [x0, y0, x1, y1, kind ('e' exterior | 'i' interior), openings?, opts?]
// Opening: [a, b, type, opts?]  a,b = plan coordinate along the wall's main axis
// Types: w window, d door, o opening, x exterior door, e entry door w/ sidelights, g garage door, s slider, f french, c closet bypass
// Window opts g: 'cs' casement, 'cs2' pair, 'cs3' picture window between two casements, 'dh' double hung
export const H = {
  f2: 10, ceil1: 9, ceil2: 18, basement: -9.4, grade: -0.7, garage: -0.5, plate1: 9.5, wallTop2: 18,
  pitch: 10 / 12, garagePitch: 7 / 12, wingPitch: 8 / 12,
};
export const ROOFT = 0.55;
export const RY = H.wallTop2 + ROOFT;
export const RR = 0, vaultTop = () => 0, vaultUnder = () => 0; // (Creekside's family-room vault; unused here)

export const LEVELS = [
  {
    id: 'b', name: 'Basement', map: BS, floor: H.basement, extBottom: 0, extTop: 8.4, intTop: 8.4,
    sill: 5.6, head: 7.2, ceiling: 8.4, grille: 'cs',
    walls: [
      [599.3, 301.5, 599.3, 361.4, 'i'],
      [507.4, 301.5, 599.3, 301.5, 'i'],
      [599.3, 361.4, 599.3, 452, 'i'],
      [715.2, 361.4, 715.2, 350.5, 'i'],
      [715.2, 350.5, 704.4, 350.5, 'i'],
      [704.4, 350.5, 704.4, 361.4, 'i'],
      [704.4, 361.4, 599.3, 361.4, 'i'],
      [201.2, 284.7, 201.2, 221.3, 'e'],
      [201.2, 221.3, 355.4, 221.3, 'i'],
      [355.4, 221.3, 355.4, 284.7, 'i'],
      [225.3, 368, 225.3, 351, 'i'],
      [201.2, 422, 231.6, 422, 'i'],
      [336.2, 538.8, 336.2, 398.6, 'i'],
      [231.6, 422, 231.6, 368, 'i', [[375.6, 415.5, 'd', { hinge: 'lo', into: '+x', style: 'panel6' }]]],
      [393.9, 284.7, 393.9, 221.3, 'i', [[237.6, 269.5, 'd', { hinge: 'lo', into: '-x', closed: true }]]],
      [704.4, 361.4, 715.2, 361.4, 'i'],
      [805.1, 452, 805.1, 532.7, 'e'],
      [225.3, 351, 201.2, 351, 'i'],
      [201.2, 284.7, 355.4, 284.7, 'i', [[311.2, 341.6, 'd', { hinge: 'hi', into: '-y' }]]],
      [201.2, 351, 201.2, 284.7, 'e'],
      [386.4, 351, 426.2, 351, 'i', [[393, 422.8, 'o', { head: 6.9 }]]],
      [355.4, 284.7, 393.9, 284.7, 'i'],
      [507.4, 351, 426.2, 351, 'i', [[442, 474.6, 'd', { hinge: 'lo', into: '+y', style: 'panel6' }]]],
      [507.4, 301.5, 507.4, 351, 'i'],
      [377.1, 22.1, 377.1, 145.4, 'e'],
      [201.2, 221.3, 201.2, 22.1, 'e'],
      [201.2, 22.1, 377.1, 22.1, 'e'],
      [181.7, 422, 181.7, 368, 'e'],
      [386.4, 351, 386.4, 532.7, 'i'],
      [386.4, 594.4, 386.4, 532.7, 'e'],
      [201.2, 422, 181.7, 422, 'e'],
      [426.2, 532.7, 805.1, 532.7, 'e'],
      [393.9, 221.3, 355.4, 221.3, 'i'],
      [181.7, 368, 201.2, 368, 'e'],
      [386.4, 351, 225.3, 351, 'i', [[251.8, 300.7, 'o', { head: 6.9 }]]],
      [201.2, 351, 201.2, 368, 'e'],
      [599.3, 452, 805.1, 452, 'i'],
      [201.2, 594.4, 201.2, 422, 'e'],
      [426.2, 351, 426.2, 532.7, 'i'],
      [386.4, 594.4, 201.2, 594.4, 'e'],
      [201.2, 368, 225.3, 368, 'i'],
      [377.1, 145.4, 805.1, 145.4, 'e'],
      [231.6, 368, 225.3, 368, 'i'],
      [426.2, 532.7, 386.4, 532.7, 'e'],
      [805.1, 145.4, 805.1, 452, 'e', [[229.8, 260.9, 'w', { sill: 5.6, head: 7.2, g: 'cs' }], [419.5, 446.6, 'w', { sill: 5.6, head: 7.2, g: 'cs' }]]],
    ],
    footprint: [
      [[181.7, 368], [201.2, 368], [201.2, 22.1], [377.1, 22.1], [377.1, 145.4], [805.1, 145.4], [805.1, 532.7], [386.4, 532.7], [386.4, 594.4], [201.2, 594.4], [201.2, 422], [181.7, 422]],
    ],
    rooms: [
      { name: 'Bath', dims: "12'6\" x 4'11\" · full", floor: 'lvp:#9a7a5c', wall: 'paint:#e6dfd2', poly: [[203.5, 282.5], [203.5, 223.5], [353.2, 223.5], [353.2, 282.5]] },
      { name: 'Storage', floor: 'concrete', wall: 'paint:#e6dfd2', noLabel: true, poly: [[357.7, 282.5], [357.7, 223.5], [391.6, 223.5], [391.6, 282.5]] },
      { name: 'Stair', floor: 'carpet:#b9b0a3', wall: 'paint:#e6dfd2', noLabel: true, poly: [[388.6, 530.5], [388.6, 353.2], [424, 353.2], [424, 530.5]] },
      { name: 'Stair to Garage', floor: 'concrete', wall: 'paint:#e6dfd2', noLabel: true, bare: true, poly: [[183.9, 419.8], [183.9, 370.3], [229.4, 370.3], [229.4, 419.8]] },
      { name: 'Workshop', dims: "15'0\" x 19'11\" · unfinished", floor: 'concrete', wall: 'block', bare: true,
        poly: [[203.5, 592.1], [203.5, 424.3], [233.9, 424.3], [233.9, 365.8], [227.6, 365.8], [227.6, 353.2], [384.1, 353.2], [384.1, 592.1]] },
      { name: 'Storage (unfinished)', dims: "31'2\" x 18'11\"", floor: 'concrete', wall: 'block', bare: true,
        poly: [[428.5, 530.5], [428.5, 353.2], [509.7, 353.2], [509.7, 303.8], [597, 303.8], [597, 454.3], [802.8, 454.3], [802.8, 530.5]] },
      { name: 'Game Area', dims: "14'3\" x 16'3\"", floor: 'lvp:#9a7a5c', wall: 'paint:#e6dfd2', accent: '#c4954e', poly: [[203.5, 24.4], [374.9, 24.4], [374.9, 219], [203.5, 219]] },
      { name: 'Rec Room', dims: "33'11\" x 25'2\" · bar", floor: 'lvp:#9a7a5c', wall: 'paint:#e6dfd2',
        poly: [[601.5, 449.8], [601.5, 363.7], [717.4, 363.7], [717.4, 348.3], [702.2, 348.3], [702.2, 359.2], [601.5, 359.2], [601.5, 299.3], [505.2, 299.3], [505.2, 348.7], [396.1, 348.7], [396.1, 219], [374.9, 219], [374.9, 147.7], [802.8, 147.7], [802.8, 449.8]] },
      { name: 'Hall', floor: 'lvp:#9a7a5c', wall: 'paint:#e6dfd2', noLabel: true, poly: [[203.5, 348.7], [203.5, 287], [396.1, 287], [396.1, 348.7]] },
    ],
  },
  {
    id: 'f1', name: '1st Floor', map: F1, floor: 0, extBottom: -0.9, extTop: H.f2, intTop: H.ceil1,
    sill: 2.0, head: 7.8, ceiling: H.ceil1, grille: 'cs',
    walls: [
      [572.1, 350.2, 602.1, 350.2, 'i'],
      [602.1, 350.2, 602.1, 307.9, 'i'],
      [602.1, 307.9, 650.6, 307.9, 'i', [[612.2, 642.5, 'o', { head: 6.8, cased: true }]]],
      [650.6, 307.9, 650.6, 391.8, 'i', [[323.2, 353.3, 'd', { hinge: 'lo', into: '+x', style: 'panel2' }]]],
      [273.3, 481, 273.3, 584.6, 'i', [[526.9, 561.9, 'd', { hinge: 'hi', into: '+x', style: 'panel2' }]]],
      [273.3, 584.6, 197.6, 584.6, 'i', [[230.1, 266.4, 'd', { hinge: 'lo', into: '-y', style: 'panel2' }]]],
      [197.6, 584.6, 197.6, 481, 'i'],
      [197.6, 481, 226.4, 481, 'i'],
      [338.2, 481, 273.3, 481, 'i'],
      [273.3, 481, 273.3, 398.2, 'i'],
      [273.3, 398.2, 338.2, 398.2, 'i', [[286.3, 316.4, 'd', { hinge: 'lo', into: '+y', style: 'panel2', closed: true }]]],
      [376.8, 140.2, 602.1, 140.2, 'e', [[424.1, 530.3, 'w', { g: 'cs3', sill: 1.6, head: 7.9 }]]],
      [602.1, 140.2, 602.1, 197.1, 'i'],
      [602.1, 197.1, 577.5, 197.1, 'i'],
      [577.5, 276.3, 602.1, 276.3, 'i'],
      [602.1, 276.3, 602.1, 307.9, 'i'],
      [197.6, 410.7, 197.6, 481, 'i'],
      [764.8, 403.5, 764.8, 427.9, 'i'],
      [764.8, 427.9, 808.4, 427.9, 'i'],
      [808.4, 427.9, 808.4, 508, 'e'],
      [808.4, 508, 678.4, 508, 'e', [[729.1, 755.2, 'w']]],
      [678.4, 508, 678.4, 403.5, 'i'],
      [678.4, 403.5, 693.2, 403.5, 'i'],
      [693.2, 403.5, 764.8, 403.5, 'i', [[726.3, 757.8, 'd', { hinge: 'lo', into: '+y', style: 'panel2' }]]],
      [602.1, 276.3, 602.1, 197.1, 'i'],
      [602.1, 140.2, 808.4, 140.2, 'e', [[658.5, 755.6, 'w', { g: 'cs3', sill: 1.6, head: 7.9 }]]],
      [808.4, 140.2, 808.4, 284.7, 'e', [[169.3, 252.3, 'w', { g: 'cs', sill: 6.0, head: 7.9 }]]], // transom over the bed (photo 20),
      [808.4, 284.7, 764.9, 284.7, 'i'],
      [764.9, 284.7, 693.2, 284.7, 'i', [[725.4, 755.8, 'd', { hinge: 'lo', into: '+y', style: 'panel2' }]]],
      [693.2, 284.7, 650.6, 284.7, 'i'],
      [650.6, 284.7, 650.6, 307.9, 'i'],
      [428, 584.6, 428, 508, 'e', [[544.4, 567.4, 'w', { g: 'cs', sill: 3.0, blind: true }]]],
      [428, 508, 520, 508, 'e', [[447.1, 506, 'e', { hinge: 'hi', into: '-y', sl: 0.62 }]]],
      [520, 508, 678.4, 508, 'e', [[564.4, 627.4, 'w', { g: 'cs2', blind: true }]]],
      [197.6, 22.3, 376.8, 22.3, 'e', [[239.6, 332.9, 'w', { g: 'cs3', sill: 1.6, head: 7.9 }]]],
      [376.8, 22.3, 376.8, 140.2, 'e', [[47.2, 111.9, 's']]],
      [273.3, 398.2, 226.4, 398.2, 'i', [[235.5, 266.4, 'd', { hinge: 'hi', into: '+y', style: 'panel2' }]]],
      [226.4, 398.2, 197.6, 398.2, 'i'],
      [650.6, 391.8, 678.4, 391.8, 'i'],
      [678.4, 391.8, 678.4, 403.5, 'i'],
      [520, 508, 520, 391.8, 'i', [[420.6, 482.9, 'f', { pair: true, into: '+x' }]]],
      [693.2, 284.7, 693.2, 391.8, 'i'],
      [693.2, 391.8, 678.4, 391.8, 'i'],
      [338.2, 481, 338.2, 508, 'i'],
      [428, 584.6, 273.3, 584.6, 'i'],
      [764.9, 319.1, 764.9, 284.7, 'i'],
      [808.4, 284.7, 808.4, 357.6, 'e'],
      [808.4, 357.6, 764.8, 357.6, 'i'],
      [764.8, 357.6, 764.8, 403.5, 'i', [[365.5, 394.5, 'd', { hinge: 'hi', into: '+x', style: 'panel2' }]]],
      [693.2, 403.5, 693.2, 391.8, 'i'],
      [428, 842, 172.3, 842, 'e', [[206.2, 397.7, 'g']]],
      [172.3, 842, 172.3, 822.6, 'e'],
      [172.3, 822.6, 23.4, 822.6, 'e', [[41.1, 152.8, 'g']]],
      [226.4, 481, 226.4, 398.2, 'i', [[411.4, 468.9, 'c']]],
      [808.4, 357.6, 808.4, 427.9, 'e', [[368.9, 391.6, 'w']]],
      [650.6, 391.8, 520, 391.8, 'i'],
      [23.4, 353.1, 23.4, 822.6, 'e', [[385, 421, 'x', { hinge: 'lo', into: '+x', style: 'half', color: '#ece6d6' }], [718.2, 743.9, 'w', { g: 'dh', sill: 3.6, head: 7.4 }]]],
      [577.5, 197.1, 577.5, 276.3, 'i'],
      [428, 584.6, 428, 842, 'e', [[650.6, 676.5, 'w', { g: 'dh', sill: 3.6, head: 7.4 }], [769.7, 794.7, 'w', { g: 'dh', sill: 3.6, head: 7.4 }]]],
      // (the stair's foyer side is an open rail on a knee wall, built with the stair)
      [338.2, 398.2, 338.2, 481, 'i'],
      [338.2, 508, 382.5, 508, 'i', [], { top: 5.4 }], // under the stair landing
      [382.5, 400.1, 382.5, 508, 'i'],
      [197.6, 22.3, 197.6, 353.1, 'e', [[48.4, 108.8, 'w', { g: 'cs2' }]]],
      [197.6, 410.7, 197.6, 398.2, 'i'],
      [197.6, 353.1, 197.6, 398.2, 'i'],
      [23.4, 353.1, 197.6, 353.1, 'e', [[60, 96, 'w', { g: 'dh', sill: 3.6, head: 7.4 }]]],
      [69.9, 410.7, 197.6, 410.7, 'i'],
    ],
    footprint: [
      [[23.4, 353.1], [197.6, 353.1], [197.6, 22.3], [376.8, 22.3], [376.8, 140.2], [808.4, 140.2], [808.4, 508], [428, 508], [428, 842], [172.3, 842], [172.3, 822.6], [23.4, 822.6]],
    ],
    // the house deck at 0 (everything but the garage); holes: main stair well down to the basement
    slab: [[197.6, 22.3], [376.8, 22.3], [376.8, 140.2], [808.4, 140.2], [808.4, 508], [428, 508], [428, 584.6], [197.6, 584.6]],
    slabHoles: [[[388.6, 400], [424, 400], [424, 530.5], [388.6, 530.5]]],
    garage: [[23.4, 353.1], [197.6, 353.1], [197.6, 584.6], [428, 584.6], [428, 842], [172.3, 842], [172.3, 822.6], [23.4, 822.6]],
    garageHole: [[76, 355.4], [195.4, 355.4], [195.4, 408.5], [76, 408.5]],
    porch: [[428, 508], [678.4, 508], [678.4, 598.3], [428, 598.3]],
    rooms: [
      { name: 'Garage', dims: "33'4\" x 40'4\" · 3 + tandem", floor: 'concrete', wall: 'paint:#ece9e2', y: H.garage, bare: true,
        poly: [[25.6, 820.4], [25.6, 355.4], [195.4, 355.4], [195.4, 586.9], [425.8, 586.9], [425.8, 839.7], [174.5, 839.7], [174.5, 820.4]] },
      { name: 'Dining Room', dims: "14'7\" x 9'5\"", floor: 'lvp:#7a6150', wall: 'paint:#cbbfae', poly: [[199.9, 24.6], [374.5, 24.6], [374.5, 142.5], [199.9, 142.5]] },
      { name: 'Kitchen', dims: "15'0\" x 22'5\" · island", floor: 'lvp:#7a6150', wall: 'paint:#cbbfae',
        poly: [[199.9, 142.5], [382.5, 142.5], [382.5, 400.1], [380.2, 400.1], [380.2, 413.2], [340.4, 413.2], [340.4, 395.9], [199.9, 395.9]] },
      { name: 'Living Room', dims: "17'11\" x 20'7\" · vaulted, open to the loft", floor: 'lvp:#7a6150', wall: 'paint:#cbbfae', vault: true,
        poly: [[382.5, 142.5], [599.8, 142.5], [599.8, 194.9], [575.2, 194.9], [575.2, 278.5], [599.8, 278.5], [599.8, 347.9], [572.1, 347.9], [572.1, 352.4], [604.3, 352.4], [604.3, 310.1], [648.3, 310.1], [648.3, 389.5], [517.7, 389.5], [517.7, 391.8], [425.8, 391.8], [425.8, 400.6], [382.5, 400.6]] },
      { name: 'Foyer', dims: "7'3\" x 9'4\"", floor: 'lvp:#7a6150', wall: 'paint:#cbbfae', poly: [[430.3, 391.8], [517.7, 391.8], [517.7, 505.8], [430.3, 505.8]] },
      { name: 'Stair', floor: null, wall: 'paint:#cbbfae', noLabel: true, poly: [[384.7, 505.8], [384.7, 400.6], [425.8, 400.6], [425.8, 505.8]] },
      { name: 'Closet', floor: 'lvp:#7a6150', wall: 'paint:#cbbfae', noLabel: true, poly: [[340.4, 505.8], [340.4, 414.2], [380.2, 414.2], [380.2, 505.8]] },
      { name: 'Office', dims: "12'10\" x 9'4\" · French doors", floor: 'lvp:#7a6150', wall: 'paint:#cbbfae', poly: [[522.2, 505.8], [522.2, 394], [676.2, 394], [676.2, 505.8]] },
      { name: 'Mudroom', dims: "12'6\" x 8'3\" · laundry", floor: 'tile:#8f857a', wall: 'paint:#cbbfae',
        poly: [[275.5, 582.4], [275.5, 483.3], [335.9, 483.3], [335.9, 510.3], [425.8, 510.3], [425.8, 582.4]] },
      { name: 'Back Hall', dims: 'to the garage', floor: 'lvp:#7a6150', wall: 'paint:#cbbfae', noLabel: true,
        poly: [[199.9, 582.4], [199.9, 483.3], [228.6, 483.3], [228.6, 400.4], [271, 400.4], [271, 582.4]] },
      { name: 'Closet', floor: 'lvp:#7a6150', wall: 'paint:#cbbfae', noLabel: true, poly: [[199.9, 478.8], [199.9, 400.4], [224.1, 400.4], [224.1, 478.8]] },
      { name: 'Pantry', dims: "5'0\" x 6'6\"", floor: 'lvp:#7a6150', wall: 'paint:#cbbfae', poly: [[275.5, 478.8], [275.5, 400.4], [335.9, 400.4], [335.9, 478.8]] },
      { name: 'Primary Bedroom', dims: "16'10\" x 11'8\"", floor: 'lvp:#7a6150', wall: 'paint:#8fa3b7', poly: [[648.3, 282.4], [648.3, 305.6], [604.3, 305.6], [604.3, 142.5], [806.2, 142.5], [806.2, 282.4]] },
      { name: 'Half Bath', dims: "3'2\" x 8'7\"", floor: 'tile:#8f857a', wall: 'paint:#6f88a3', poly: [[652.8, 389.5], [652.8, 286.9], [690.9, 286.9], [690.9, 389.5]] },
      { name: 'Primary Bath', dims: "9'3\" x 9'6\" · walk-in shower", floor: 'tile:#9b8c7b', wall: 'paint:#c9bba8',
        poly: [[762.5, 355.4], [762.5, 401.2], [695.4, 401.2], [695.4, 286.9], [806.2, 286.9], [806.2, 355.4]] },
      { name: 'WC', floor: 'tile:#9b8c7b', wall: 'paint:#c9bba8', noLabel: true, poly: [[767, 425.6], [767, 359.9], [806.2, 359.9], [806.2, 425.6]] },
      { name: 'Primary Closet', dims: "10'5\" x 8'4\"", floor: 'carpet:#cfc8bd', wall: 'paint:#cbbfae', poly: [[680.7, 505.8], [680.7, 405.7], [762.5, 405.7], [762.5, 430.1], [806.2, 430.1], [806.2, 505.8]] },
      { name: 'Covered Porch', dims: "20'8\" x 7'4\"", floor: null, wall: 'paint:#cbbfae', noLabel: false, porch: true, poly: [[430.3, 597.8], [430.3, 510.3], [678.4, 510.3], [678.4, 597.8]] },
    ],
  },
  {
    id: 'f2', name: '2nd Floor', map: F2, floor: H.f2, extBottom: 0, extTop: 8, intTop: 8,
    sill: 2.0, head: 6.9, ceiling: 8, grille: 'cs',
    walls: [
      [195.1, 396.2, 195.1, 365.2, 'e'],
      [195.1, 365.2, 293.2, 365.2, 'i'],
      [293.2, 365.2, 293.2, 396.2, 'i'],
      [195.1, 562.2, 195.1, 396.2, 'e', [[403.8, 480, 'w', { g: 'cs2' }]]],
      [195.1, 396.2, 293.2, 396.2, 'i', [[207.9, 280.1, 'c']]],
      [293.2, 396.2, 339.2, 396.2, 'i'],
      [339.2, 562.2, 195.1, 562.2, 'e'],
      [383, 263.4, 383, 396.2, 'i'],
      [537, 562.2, 430.9, 562.2, 'e', [[464.4, 492.2, 'w', { g: 'cs' }]]],
      [503.4, 442.2, 503.4, 495.2, 'i', [[457.7, 483.2, 'd', { hinge: 'lo', into: '+x', style: 'panel2', closed: true }]]],
      [430.9, 562.2, 430.9, 442.2, 'i'],
      [503.4, 495.2, 537, 495.2, 'i'],
      [537, 396.2, 537, 442.2, 'i', [[404, 436.1, 'd', { hinge: 'hi', into: '+x', style: 'panel2' }]]],
      [537, 442.2, 503.4, 442.2, 'i'],
      [503.4, 442.2, 430.9, 442.2, 'i', [[462.6, 494.5, 'd', { hinge: 'lo', into: '+y', style: 'panel2' }]]],
      [195.1, 365.2, 195.1, 263.4, 'e', [[321.3, 357.3, 'w', { g: 'cs' }]]],
      [537, 562.2, 537, 495.2, 'i'],
      [677.1, 396.2, 677.1, 562.2, 'e'],
      [537, 396.2, 588.9, 396.2, 'i', [], { top: 8 }],
      [537, 495.2, 537, 442.2, 'i'],
      [677.1, 562.2, 537, 562.2, 'e', [[574.4, 641.2, 'w', { g: 'cs2' }]]],
      [588.9, 396.2, 677.1, 396.2, 'i', [[596.6, 662.6, 'c']]],
      [588.9, 366.1, 677.1, 366.1, 'e'],
      [588.9, 396.2, 588.9, 366.1, 'e'],
      [677.1, 366.1, 677.1, 396.2, 'e'],
      [430.9, 562.2, 384.1, 562.2, 'e'],
      [383, 263.4, 195.1, 263.4, 'i'],
      [339.2, 562.2, 384.1, 562.2, 'e'],
      [339.2, 396.2, 339.2, 562.2, 'i', [[403.2, 435.2, 'd', { hinge: 'lo', into: '-x', style: 'panel2' }]]],
    ],
    footprint: [
      [[192.8, 261.1], [383, 261.1], [383, 396.2], [588.9, 396.2], [588.9, 363.9], [679.4, 363.9], [679.4, 564.4], [192.8, 564.4]],
    ],
    // floor holes: the living room (open to below) and the stair well
    slabHoles: [[[385.2, 142.4], [586.6, 142.4], [586.6, 394], [385.2, 394]], [[341.5, 442.7], [428.7, 442.7], [428.7, 559.9], [341.5, 559.9]]],
    rooms: [
      { name: 'Living Room (open to below)', floor: null, wall: 'paint:#cbbfae', void: 'Living Room', noLabel: true,
        poly: [[385.2, 142.4], [586.6, 142.4], [586.6, 394], [385.2, 394]] },
      { name: 'Stair (open to below)', floor: null, wall: 'paint:#cbbfae', void: 'Foyer', noLabel: true, poly: [[341.5, 442.7], [428.7, 442.7], [428.7, 559.9], [341.5, 559.9]] },
      { name: 'Reading Nook', dims: "15'3\" x 10'8\" · loft", floor: 'carpet:#cfc8bd', wall: 'paint:#cbbfae',
        poly: [[197.3, 265.6], [380.7, 265.6], [380.7, 398.5], [534.8, 398.5], [534.8, 440], [381.9, 440], [381.9, 441.7], [341.5, 441.7], [341.5, 394], [295.5, 394], [295.5, 363], [197.3, 363]] },
      { name: 'Bedroom 2', dims: "11'8\" x 13'5\"", floor: 'carpet:#cfc8bd', wall: 'paint:#b7ccd5', poly: [[197.3, 559.9], [197.3, 398.5], [337, 398.5], [337, 559.9]] },
      { name: 'Bedroom 3', dims: "11'4\" x 13'5\"", floor: 'carpet:#cfc8bd', wall: 'paint:#a9c4cf', poly: [[539.3, 559.9], [539.3, 398.5], [674.9, 398.5], [674.9, 559.9]] },
      { name: 'Bath', dims: "8'6\" x 9'7\" · tub/shower", floor: 'tile:#8f857a', wall: 'paint:#c9bba8',
        poly: [[433.2, 559.9], [433.2, 444.5], [501.1, 444.5], [501.1, 497.4], [534.8, 497.4], [534.8, 559.9]] },
      { name: 'Closet', floor: 'carpet:#cfc8bd', wall: 'paint:#cbbfae', noLabel: true, poly: [[197.3, 394], [197.3, 367.5], [291, 367.5], [291, 394]] },
      { name: 'Closet', floor: 'carpet:#cfc8bd', wall: 'paint:#cbbfae', noLabel: true, poly: [[591.1, 394], [591.1, 368.4], [674.9, 368.4], [674.9, 394]] },
      { name: 'Linen', floor: 'tile:#8f857a', wall: 'paint:#c9bba8', noLabel: true, poly: [[505.6, 492.9], [505.6, 444.5], [534.8, 444.5], [534.8, 492.9]] },
    ],
  },
];

// Main stair: a U. Flight 1 rises south from the living room (bottom at y 400) to a landing over the mudroom
// (y 508-548), flight 2 rises north back to the loft at y 442. 16 risers of 7.5". The basement stair runs under
// flight 1, from the mudroom (top at y 530) down north to the rec room. The garage stair drops east from the
// garage floor into the workshop.
export const STAIRS = {
  main: { f1x: [386, 425], f2x: [342, 381], yBottom: 400, yLand: 508, yLand2: 548, yTop: 442, risers1: 10, risers2: 6 },
  basement: { x0: 389, x1: 424, yTop: 530, yBottom: 407, risers: 15 },
  garage: { xTop: 76, xBottom: 229, y0: 357, y1: 408, risers: 14 },
};

// ---------------------------------------------------------------- lot, street, neighbors, trees
// From the satellite view (Susan Ln runs along the top, the house faces it; ~1.78 px/ft at the zoom used),
// fitted to this house's own outline (garage front, dining bump). Plan +x points WEST, +z points NORTH.
// Lot: 0.41 ac listed. Side lines between the houses (a row of arborvitae on the garage side), the front line
// ~10 ft behind the curb; 82 x 216 ft = 17,700 sq ft.
export const LOT = { zBack: -120, zFront: 96, xSouth: -5, xNorth: 77.5 };
export const X_AZ = 270;
export const STREET = { sidewalk: null, curb: 106, width: 30 };
export const STREETS = {};
export const CH = (p, q) => [p, q];
const nb = (name, [x, z], rot, wall, parts, o = {}) => ({ name, x, z, rot, wall, parts, roof: 'shingle:n', ...o });
export const NEIGHBORS = [
  // west (plan +x): 2-story with an attached garage toward us, brick-paver patio behind
  nb('N100W6725', [118, 44], 0, '#d9d4c8', [[-30, -18, 18, 18, 18.5, 'gx', 0.75], [18, -14, 32, 20, 10, 'hip'], [-8, 12, 10, 20, 18.5, 'gz', 0.75]],
    { doors: [[32, 4, 9, '+x'], [32, 14, 9, '+x']], entry: [0, 20, '+z'], patio: [[96, 14], [116, 14], [116, 2], [96, 2]], dist: 'side wall' }),
  // east (plan -x): big 2-story, garage facing the street, round stamped patio + fire pit behind
  nb('N100W6705', [-40, 40], 0, '#cfd0cc', [[-28, -26, 22, 22, 19, 'hip', 0.75], [-16, 16, 6, 30, 11, 'gz', 0.6], [6, 4, 26, 30, 10, 'hip']],
    { doors: [[10, 30, 16, '+z']], entry: [-6, 22, '+z'], patio: [[-38, -2], [-20, -2], [-16, -12], [-24, -18], [-36, -16]], drive: [[4, 60], [24, 60], [24, 106], [4, 106]], dist: 'garage side' }),
  nb('', [-150, 44], 0, '#d8d3c6', [[-28, -20, 28, 20, 19, 'hip']], { doors: [[18, 20, 16, '+z']], drive: [[-140, 64], [-124, 64], [-124, 106], [-140, 106]], assumed: true }),
  nb('', [205, 40], 0, '#e1ddd2', [[-26, -20, 26, 20, 18.5, 'gx']], { doors: [[-16, 20, 16, '+z']], drive: [[180, 60], [196, 60], [196, 106], [180, 106]], assumed: true }),
  // across Susan Ln
  nb('', [20, 170], 180, '#d6d0c2', [[-30, -22, 30, 22, 19, 'hip'], [-12, 14, 6, 26, 19, 'gz']], { doors: [[22, 22, 16, '+z']], drive: [[-10, 124], [8, 124], [8, 148], [-10, 148]], assumed: true }),
  nb('', [120, 170], 180, '#cfcfca', [[-28, -22, 28, 22, 18.5, 'gx']], { doors: [[-18, 22, 16, '+z']], drive: [[130, 124], [148, 124], [148, 148], [130, 148]], assumed: true }),
  nb('', [-90, 170], 180, '#ddd6c6', [[-28, -22, 28, 22, 19, 'hip']], { doors: [[18, 22, 16, '+z']], drive: [[-116, 124], [-100, 124], [-100, 148], [-116, 148]], assumed: true }),
  // behind (the next street south), past the trees at the back of the lot
  nb('', [30, -175], 180, '#d4cfc4', [[-26, -22, 26, 22, 19, 'hip']], { assumed: true }),
  nb('', [-60, -170], 180, '#d9d5cb', [[-24, -20, 24, 20, 18.5, 'gx']], { assumed: true }),
];
// Trees: [kind, x, z, height, canopy radius]. From the satellite view: a wooded band across the back of the lot,
// a row of arborvitae on the garage-side line, a few ornamentals near the house.
export const TREES = [
  ['maple', 70, -75, 50, 18], ['linden', 25, -95, 52, 17], ['maple', -15, -88, 48, 16], ['oak', 50, -112, 55, 19], ['maple', 92, -100, 46, 15],
  ['locust', 0, -125, 50, 16], ['linden', -40, -110, 46, 15], ['maple', 115, -60, 44, 14], ['spruce', 98, -40, 40], ['spruce', 88, -28, 36],
  ['spruce', -8, -40, 34], ['blue', 2, -55, 30], ['maple', 130, -20, 42, 14], ['linden', -70, -60, 48, 15],
  ['purple', 74, 62, 22, 8], ['shrubTree', 70, 47, 13, 4.5],
  ['maple', -120, -40, 46, 15], ['oak', 160, -90, 52, 17], ['spruce', -100, -120, 44],
];
export const ARBORVITAE = { x: -6, z0: 8, z1: 70, step: 4.5 };
export const GROUND = { duff: [], redBed: [] };
export const TRAY = { px: [0, 0, 1, 1], c: 0, depth: 0 };
export const trayOct = () => [];
export const LATITUDE = 43.31;
