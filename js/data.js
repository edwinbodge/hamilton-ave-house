// House geometry, transcribed from the CubiCasa floor plans and listing photos.
//
// Every level is written in the pixel coordinates of its own plan image
// (1st floor = image 1, 2nd floor = image 4, basement = image 2), then mapped
// into 1st-floor pixel space, then into feet. Measured from the plans:
//   1st floor: 23.55 px/ft   2nd floor: 36.75 px/ft   basement: 27.2 px/ft
// The floors were aligned on the main stair (1st <-> 2nd) and the exterior
// walls + fireplace chase (1st <-> basement).
//
// Local frame (feet): x = plan right (= NORTH), z = plan down (= EAST, toward
// Harrison Ave), y = up. 1st floor = 0, 2nd floor = 9, basement = -9, grade = -1.

export const PX = 23.55;
export const toFt = ([x, y]) => [(x - 255) / PX, (y - 44) / PX];
export const F1 = (x, y) => [x, y];
export const F2 = (x, y) => [1138 + (x - 848) * 0.6408, 705 + (y - 600) * 0.6408];
export const BS = (x, y) => [835 + (x - 642) * 0.8658, 1034 - (1187 - y) * 0.8658];

// Wall entry: [x0, y0, x1, y1, kind ('e' exterior | 'i' interior), openings?, opts?]
// Opening: [a, b, type, opts?]  a,b = plan coordinate along the wall's main axis
// (x for walls flatter than 45°, y otherwise).
// Types: w window, d door, o drywall opening, x exterior door, e entry door w/ sidelights,
//        g garage door, s sliding patio door, f french door(s), c closet bypass doors, k closed door
// Window opts: g = grille style: dh (double-hung), dh2 (pair of double-hung), cs (casement),
//              cs2 (pair of casements); cols/rows per sash; sill/head override; sh = shutters
// Door opts:   hinge 'lo'|'hi' (end with the smaller/larger plan coordinate),
//              into '+x'|'-x'|'+y'|'-y' (plan direction the door swings into), pair, style, color
// Heights (ft) are relative to the level's floor.

const CHERRY = '#8a3f1f', OAK = '#b77a3c', BROWN = '#6a4632';

export const LEVELS = [
  {
    id: 'b', name: 'Basement', map: BS, floor: -9, extBottom: 0, extTop: 8.1, intTop: 8.0,
    sill: 5.6, head: 7.2, ceiling: 7.4, grille: 'gb',
    walls: [
      [649, 396, 649, 446, 'e'],
      [649, 446, 649, 750, 'i', [[552, 624, 'd', { hinge: 'lo', into: '-x', color: OAK }]]],
      [649, 750, 649, 1187, 'e'],
      [642, 402.5, 902, 402.5, 'e'],
      [895, 410, 895, 350, 'e'],
      [895, 350, 960, 283, 'e'],
      [960, 283, 1128, 283, 'e'],
      [1128, 283, 1188, 351, 'e'],
      [1188, 351, 1318, 351, 'e'],
      [1317.5, 358, 1317.5, 44, 'e'],
      [1311, 50.5, 1652, 50.5, 'e'],
      [1645, 44, 1645, 1187, 'e', [[860, 942, 'w']]], // (the plan shows a door here; it doesn't exist)
      [642, 1180.5, 1652, 1180.5, 'e'],
      [277, 446, 656, 446, 'e', [[508, 590, 'w']]],
      [283.5, 439, 283.5, 757, 'e'],
      [277, 749.5, 656, 749.5, 'e'],
      [1189, 644.5, 1645, 644.5, 'i'],
      [1193, 644.5, 1193, 898.5, 'i'],
      [908, 811, 1198, 811, 'i'],
      [649, 898.5, 1193, 898.5, 'i', [[748, 858, 'd', { pair: true, into: '+y', color: OAK }]]],
    ],
    footprint: [
      [[642, 396], [902, 396], [902, 355], [963, 277], [1125, 277], [1185, 345], [1311, 345], [1311, 44], [1652, 44], [1652, 1187], [642, 1187]],
      [[277, 439], [656, 439], [656, 757], [277, 757]],
    ],
    // single outline (main + utility) used to cut the lawn open in the basement view
    groundHole: [[642, 396], [902, 396], [902, 355], [963, 277], [1125, 277], [1185, 345], [1311, 345], [1311, 44], [1652, 44], [1652, 1187], [642, 1187], [642, 757], [277, 757], [277, 439], [642, 439]],
    rooms: [
      { name: 'Recreation Room', dims: "37'8\" x 21'6\"", floor: 'berber', wall: 'paint:#c7b08b', ceiling: true,
        poly: [[649, 402], [895, 402], [895, 350], [960, 283], [1128, 283], [1188, 351], [1318, 351], [1318, 50], [1645, 50], [1645, 644.5], [1193, 644.5], [1193, 811], [908, 811], [908, 898.5], [649, 898.5]] },
      { name: 'Utility', dims: "13'1\" x 10'8\"", floor: 'concrete', wall: 'block', bare: true,
        poly: [[283.5, 446], [649, 446], [649, 749.5], [283.5, 749.5]] },
      { name: 'Storage (unfinished)', dims: "36'1\" x 19'4\"", floor: 'concrete', wall: 'block', bare: true,
        poly: [[1193, 644.5], [1645, 644.5], [1645, 1180.5], [649, 1180.5], [649, 898.5], [1193, 898.5]] },
    ],
  },
  {
    id: 'f1', name: '1st Floor', map: F1, floor: 0, extBottom: -0.9, extTop: 9, intTop: 8,
    sill: 2.0, head: 7.0, ceiling: 8, grille: 'dh',
    walls: [
      // garage. The plan shows a 3.5 ft notch at the back corner, but the rear photos show a
      // flush wall, so the exterior runs straight across and the notch is an open storage alcove.
      [260.5, 387, 260.5, 1187, 'e', [[557, 619, 'x', { hinge: 'lo', into: '+x', style: 'half', color: '#f2f2ee' }], [711, 923, 'g'], [964, 1176, 'g']]],
      [255, 1181.5, 847, 1181.5, 'e', [[380, 451, 'w', { sh: 1, sill: 2.6 }], [679, 750, 'w', { sh: 1, sill: 2.6 }]]],
      [255, 476.5, 524.5, 476.5, 'i', [[275, 505, 'o']]],
      [524.5, 392.5, 524.5, 654.5, 'i'],
      // laundry / half bath / kitchen rear
      [255, 392.5, 847, 392.5, 'e', [[587, 649, 'x', { hinge: 'lo', into: '+y', style: 'half', color: BROWN }], [743, 805, 'w', { g: 'cs', sill: 3.7, head: 6.6 }]]],
      [841, 349, 841, 392.5, 'e'],
      [835, 354.5, 1060, 354.5, 'e', [[898, 980, 'w', { g: 'cs2', sill: 3.5, head: 6.9 }]]],
      [1054, 360, 1054, 308, 'e'],
      // breakfast nook bay
      [1054, 308, 1112, 250, 'e', [[1064, 1102, 'x', { hinge: 'hi', into: '+y', style: 'full', color: BROWN }]]],
      [1112, 250, 1250, 250, 'e', [[1125, 1238, 'w', { g: 'cs2', rows: 5, sill: 1.6 }]]],
      [1250, 250, 1308, 310.5, 'e', [[260, 300, 'w', { g: 'cs', rows: 5, sill: 1.6 }]]], // steeper than 45°: opening in plan y
      [1308, 310.5, 1420.5, 310.5, 'e'],
      // sun room (west gable wall with the arched window is built separately)
      [1420.5, 310.5, 1420.5, 44, 'e', [[122, 247, 's']]],
      [1703.5, 44, 1703.5, 1034, 'e', [[903, 979, 'w']]],
      // front
      [835, 1028.5, 1709, 1028.5, 'e', [[875, 946, 'w', { sh: 1 }], [1015, 1085, 'w', { sh: 1 }], [1197, 1331, 'e', { hinge: 'hi', into: '-y' }], [1458, 1534, 'w', { sh: 1 }], [1598, 1674, 'w', { sh: 1 }]]],
      [841, 654.5, 841, 1028.5, 'i'],
      // garage side wall facing the front porch
      [841, 1028.5, 841, 1187, 'e'],
      // interior
      [524.5, 654.5, 841, 654.5, 'i', [[581, 644, 'd', { hinge: 'lo', into: '-y' }]]],
      [713, 392.5, 713, 576.5, 'i'],
      [524.5, 576.5, 842.5, 576.5, 'i', [[592, 648, 'd', { hinge: 'hi', into: '-y' }], [768, 830, 'd', { hinge: 'hi', into: '-y' }]]],
      [842.5, 392.5, 842.5, 581, 'i'],
      [841, 704, 1422, 704, 'i', [[1039, 1104, 'o'], [1330, 1394, 'o']]],
      [1134.5, 704, 1134.5, 1028.5, 'i', [[927, 992, 'o']]],
      // (the wall under the upper stair run is built with the stairs; it follows the stair up)
      [1313, 704, 1313, 784, 'i', [[709, 784, 'd', { hinge: 'lo', into: '-x' }]]],
      [1420.5, 310.5, 1703.5, 310.5, 'i', [[1443, 1506, 'f', { hinge: 'lo', into: '+y' }]]],
      [1422, 626.5, 1703.5, 626.5, 'i', [[1489, 1616, 'f', { pair: true, into: '+y' }]]],
      [1422, 626.5, 1422, 1028.5, 'i', [[713, 862, 'o']]],
      [1366.5, 866, 1422, 866, 'i'],
      [1366.5, 866, 1366.5, 1028.5, 'i', [[889, 1009, 'c']]],
    ],
    footprint: [
      [[255, 387], [847, 387], [847, 349], [1060, 349], [1060, 308], [1110, 250], [1252, 250], [1308, 305], [1415, 305], [1415, 44], [1709, 44], [1709, 387], [1745, 387], [1745, 538], [1709, 538], [1709, 1034], [835, 1034], [835, 1187], [255, 1187]],
    ],
    slab: [[519, 387], [847, 387], [847, 349], [1060, 349], [1060, 308], [1110, 250], [1252, 250], [1308, 305], [1415, 305], [1415, 44], [1709, 44], [1709, 1034], [841, 1034], [841, 654.5], [519, 654.5]],
    slabHoles: [[[1140, 709], [1300, 709], [1300, 784], [1140, 784]]],
    garage: [[255, 392.5], [524.5, 392.5], [524.5, 654.5], [841, 654.5], [841, 1187], [255, 1187]],
    // flat ceilings for the 1-story parts (the rest is the underside of the 2nd floor)
    ceilings: [
      [[1031, 354.5], [1054, 354.5], [1054, 308], [1112, 250], [1250, 250], [1308, 310.5], [1703.5, 310.5], [1703.5, 392], [1031, 392]],
      [[519, 392.5], [767, 392.5], [767, 654.5], [519, 654.5]],
    ],
    // wall finishes: 'faux:#' sponge paint, 'paint:#', 'ivy' / 'grid' wallpaper; crown = oak crown molding
    rooms: [
      { name: 'Coat Closet', floor: 'oak', wall: 'paint:#ece3cc', noLabel: true, poly: [[1366.5, 866], [1422, 866], [1422, 1028.5], [1366.5, 1028.5]] },
      { name: 'Garage', dims: "24'2\" x 29'5\"", floor: 'concrete', wall: 'paint:#dcd7ca', y: -0.5, bare: true,
        poly: [[260.5, 392.5], [524.5, 392.5], [524.5, 654.5], [841, 654.5], [841, 1181.5], [260.5, 1181.5]] },
      { name: 'Laundry', dims: "7'7\" x 7'5\"", floor: 'tileBeige', wall: 'paint:#958c80', poly: [[524.5, 392.5], [713, 392.5], [713, 576.5], [524.5, 576.5]] },
      { name: 'Half Bath', dims: "5'2\" x 7'5\"", floor: 'tileBeige', wall: 'paint:#a8845e', poly: [[713, 392.5], [842.5, 392.5], [842.5, 576.5], [713, 576.5]] },
      { name: 'Hall', dims: "12'8\" x 2'11\"", floor: 'oak', wall: 'grid', poly: [[524.5, 576.5], [841, 576.5], [841, 654.5], [524.5, 654.5]] },
      { name: 'Kitchen', dims: "9'10\" x 14'8\"", floor: 'oak', wall: 'ivy', crown: true, poly: [[842.5, 354.5], [1054, 354.5], [1054, 704], [841, 704], [841, 581], [842.5, 581]] },
      { name: 'Breakfast Nook', dims: "10'7\" x 19'0\"", floor: 'oak', wall: 'ivy', crown: true,
        poly: [[1054, 354.5], [1054, 308], [1112, 250], [1250, 250], [1308, 310.5], [1310, 310.5], [1310, 704], [1054, 704]] },
      { name: 'Family Room', dims: "16'6\" x 16'6\"", floor: 'carpet:#e4ddcf', wall: 'faux:#ecd9b4', crown: true,
        poly: [[1310, 310.5], [1703.5, 310.5], [1703.5, 626.5], [1422, 626.5], [1422, 704], [1310, 704]] },
      { name: 'Sun Room', dims: "11'6\" x 10'9\"", floor: 'slate', wall: 'paint:#c3d0c6', vaulted: true, poly: [[1420.5, 49.5], [1703.5, 49.5], [1703.5, 310.5], [1420.5, 310.5]] },
      { name: 'Living Room', dims: "11'6\" x 16'8\"", floor: 'carpet:#e4ddcf', wall: 'faux:#ecd9b4', crown: true, poly: [[1422, 626.5], [1703.5, 626.5], [1703.5, 1028.5], [1422, 1028.5]] },
      { name: 'Office', dims: "12'1\" x 13'2\" (listed as dining)", floor: 'oak', wall: 'paint:#eedba6', wainscot: '#2c3a55', crown: true, poly: [[841, 704], [1134.5, 704], [1134.5, 1028.5], [841, 1028.5]] },
      { name: 'Foyer', dims: "12'2\" x 13'2\" (2-story)", floor: 'oak', wall: 'paint:#ebe1c7', poly: [[1134.5, 704], [1422, 704], [1422, 866], [1366.5, 866], [1366.5, 1028.5], [1134.5, 1028.5]] },
    ],
  },
  {
    id: 'f2', name: '2nd Floor', map: F2, floor: 9, extBottom: 0, extTop: 8, intTop: 8,
    sill: 2.6, head: 6.8, ceiling: 8, grille: 'dh',
    walls: [
      [270, 102, 270, 1114, 'e'],
      [261, 111.5, 384, 111.5, 'e'],
      [384, 52.5, 384, 111.5, 'e'],
      [375, 52.5, 682, 52.5, 'e', [[449, 595, 'w', { g: 'cs2', sill: 4.0, head: 6.9 }]]],
      [673, 52.5, 673, 111.5, 'e'],
      [663, 111.5, 1738, 111.5, 'e', [[1017, 1121, 'w', { g: 'cs', sill: 3.6 }], [1334, 1438, 'w', { g: 'cs', sill: 3.2 }]]],
      [1729, 102, 1729, 1114, 'e', [[464, 567, 'w'], [897, 1015, 'w']]],
      [1290, 1105, 1738, 1105, 'e', [[1350, 1468, 'w', { sh: 1 }], [1561, 1678, 'w', { sh: 1 }]]],
      [1293.5, 1105, 1293.5, 1178, 'e'],
      [830, 1178, 1303, 1178, 'e', [[981, 1163, 'w', { sh: 1, g: 'dh2' }]]],
      [839.5, 1105, 839.5, 1178, 'e'],
      [261, 1105, 849, 1105, 'e', [[468, 578, 'w', { sh: 1 }], [674, 784, 'w', { sh: 1 }]]],
      // interior
      [270, 477, 1315, 477, 'i', [[377, 466, 'd', { hinge: 'hi', into: '-y' }], [737, 826, 'd', { hinge: 'lo', into: '-y' }], [1026, 1114, 'd', { hinge: 'lo', into: '-y' }], [1231, 1299, 'd', { hinge: 'hi', into: '+y' }]]],
      [842, 477, 842, 1105, 'i', [[498, 594, 'd', { hinge: 'lo', into: '-x' }]]],
      // primary bath: shower partition, neo-angle shower front, linen closet
      [512, 382, 512, 477, 'i'],
      [563, 332, 673, 332, 'i'],
      [581, 240, 673, 240, 'i'],
      [581, 240, 581, 332, 'i', [[252, 322, 'd', { hinge: 'hi', into: '-x' }]]],
      [673, 111.5, 673, 477, 'i'],
      [943, 111.5, 943, 477, 'i'],
      [1221, 111.5, 1221, 477, 'i'],
      // hall bath: tub alcove end wall + linen cabinet
      [1119, 300, 1221, 300, 'i'],
      [1119, 300, 1119, 384, 'i'],
      [1119, 384, 1221, 384, 'i', [[1128, 1212, 'd', { hinge: 'hi', into: '+y' }]]],
      [1315, 111.5, 1315, 477, 'i', [[151, 346, 'c']]],
      [1221, 380, 1315, 380, 'i'],
      [1315, 477, 1450, 590, 'i', [[1335, 1425, 'd', { hinge: 'hi', into: '+x' }]]],
      [1450, 580, 1729, 580, 'i'],
      [1450, 580, 1450, 666, 'i'],
      [1292, 666, 1729, 666, 'i', [[1316, 1413, 'd', { hinge: 'lo', into: '+y' }], [1475, 1672, 'c']]],
      [1292, 666, 1292, 1105, 'i'],
    ],
    footprint: [
      [[261, 102], [375, 102], [375, 43], [682, 43], [682, 102], [1738, 102], [1738, 1114], [1303, 1114], [1303, 1187], [830, 1187], [830, 1114], [261, 1114]],
    ],
    // one opening over the stairs and the 2-story foyer (stairs + open-to-below)
    slabHoles: [[[848, 600], [1120, 600], [1120, 724], [1137, 724], [1137, 1030], [848, 1030]]],
    rooms: [
      { name: 'Shower', floor: 'tile4', wall: 'tile4', noLabel: true, poly: [[512, 382], [563, 332], [673, 332], [673, 477], [512, 477]] },
      { name: 'Linen', floor: 'tileBeige', wall: 'paint:#f1eee8', noLabel: true, poly: [[581, 240], [673, 240], [673, 332], [581, 332]] },
      { name: 'Tub', floor: 'tileBeige', wall: 'tileGray', noLabel: true, poly: [[1119, 111.5], [1221, 111.5], [1221, 300], [1119, 300]] },
      { name: 'Linen', floor: 'tileBeige', wall: 'paint:#eeeae0', noLabel: true, poly: [[1119, 300], [1221, 300], [1221, 384], [1119, 384]] },
      { name: 'Closet', floor: 'carpet:#e6e1d8', wall: 'paint:#f0e8d6', noLabel: true, poly: [[1221, 111.5], [1315, 111.5], [1315, 380], [1221, 380]] },
      { name: 'Linen Closet', floor: 'carpet:#e6e1d8', wall: 'paint:#f0e8d6', noLabel: true, poly: [[1221, 380], [1315, 380], [1315, 477], [1221, 477]] },
      { name: 'Closet', floor: 'carpet:#e6e1d8', wall: 'paint:#f3e3bf', noLabel: true, poly: [[1450, 580], [1729, 580], [1729, 666], [1450, 666]] },
      { name: 'Primary Bedroom', dims: "15'2\" x 16'8\"", floor: 'carpet:#e7e1d6', wall: 'faux:#cda676', poly: [[270, 477], [842, 477], [842, 1105], [270, 1105]] },
      { name: 'Primary Bath', dims: "8'3\" x 9'7\"", floor: 'tileBeige', wall: 'paint:#f2f0ea',
        poly: [[270, 111.5], [384, 111.5], [384, 52.5], [673, 52.5], [673, 332], [563, 332], [512, 382], [512, 477], [270, 477]] },
      { name: 'Walk-in Closet', dims: "7'1\" x 9'7\"", floor: 'carpet:#e7e1d6', wall: 'paint:#f2e9d8', poly: [[673, 111.5], [943, 111.5], [943, 477], [673, 477]] },
      { name: 'Bath', dims: "7'3\" x 9'7\"", floor: 'tileBeige', wall: 'paint:#efe9dc', poly: [[943, 111.5], [1221, 111.5], [1221, 477], [943, 477]] },
      { name: 'Bedroom', dims: "10'10\" x 12'6\" · full bed", floor: 'carpet:#e7e1d6', wall: 'paint:#d5b38d', crown: true, poly: [[1315, 111.5], [1729, 111.5], [1729, 580], [1450, 580], [1315, 477]] },
      { name: 'Bedroom', dims: "11'6\" x 11'6\" · queen bed", floor: 'carpet:#e7e1d6', wall: 'paint:#f4e2b8', poly: [[1292, 666], [1729, 666], [1729, 1105], [1292, 1105]] },
      { name: 'Hall', dims: "15'11\" x 18'8\"", floor: 'carpet:#e7e1d6', wall: 'paint:#e3d2ae', poly: [[842, 477], [1315, 477], [1450, 590], [1450, 666], [1292, 666], [1292, 1178], [842, 1178]] },
    ],
  },
];

// Main stair (1st floor pixel coords). 14 risers, 9 ft floor-to-floor.
export const STAIRS = {
  main: { lowerX: [1140, 1210], lowerY: [905, 784], landing: [1140, 705, 1210, 784], upperX: [1210, 1313], upperY: [705, 784] },
  basement: { x: [1140, 1313], y: [709, 784] },
};

// Railings: [x0,y0,x1,y1, h0,h1] in 1st-floor px, heights = walking surface at each end
export const RAILINGS = [
  [1212, 905, 1212, 786, 0.64, 4.5],
  [1212, 786, 1313, 786, 4.5, 9.0],
  // 2nd floor balcony / open-to-below (converted from 2nd floor px at build time)
  { f2: [[848, 603], [1118, 603]] },
  // balcony: an L along the east side and the front of the opening, ending at the primary bedroom wall
  { f2: [[1120, 724], [1137, 724], [1137, 1030], [848, 1030]] },
  // short rail (about 2 ft) between the breakfast nook and family room, ending at an oak column
  [1312, 316, 1312, 362, 0, 0], // off the sun-room wall
];

// Lot: 0.39 acre (~16,990 sq ft). Proportions measured from the aerial photo:
// ~170.6 ft deep (east-west) x ~99.5 ft wide (north-south).
// In local feet: lz runs west->east, lx runs south->north.
export const LOT = { zWest: -98.6, zEast: 72, xSouth: -25, xNorth: 74.5 };
// Neighboring houses, roughly located from the aerial (0.355 ft per aerial pixel): [x0, z0, x1, z1, ridge height]
export const NEIGHBORS = [
  [-98, -31, -64, 33, 26],   // south, across the side lot line
  [122, -24, 150, 33, 26],   // north (red roof)
  [-98, -166, -60, -130, 26], // southwest
];
export const LATITUDE = 43.3;
export { CHERRY, OAK, BROWN };
