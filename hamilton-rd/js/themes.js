// Interior color styles for Hamilton Rd. Each control maps a choice onto the themeable materials
// (walls by room category, floor groups, trim, doors, cabinets, counters, backsplash, fireplace...).
// Remodel finishes (rcab*, rcounter, rsplash, island) keep their own defaults under "As listed".
import { applyFinish, ORIGIN } from './geom.js';
import { ROLES } from './build.js';

const O = 'original';
export const CONTROLS = [
  { id: 'walls', label: 'Walls', options: [[O, 'As listed (tan great room, red dining)'], ['#ece8df', 'Warm white'], ['#f3f2ee', 'Soft white'], ['#ddd5c8', 'Greige'], ['#d3d8c9', 'Pale sage'], ['#dfe2e0', 'Light gray']] },
  { id: 'bedWalls', label: 'Bedroom walls', options: [[O, 'As listed (mustard bedroom 2)'], ['match', 'Same as walls'], ['#e4ddd0', 'Oatmeal'], ['#cdd6da', 'Dusty blue'], ['#c8cfbe', 'Sage'], ['#e6d8cf', 'Blush']] },
  { id: 'bathWalls', label: 'Bath walls', options: [[O, 'As listed'], ['#f2f2ee', 'White'], ['#d3d8c9', 'Pale sage'], ['#d6dde0', 'Blue-gray']] },
  { id: 'trim', label: 'Trim & stair rail', options: [['#b5793f', 'Golden oak (as listed)'], ['#f4f2ec', 'Warm white'], ['#c49a62', 'Natural oak'], ['#2a2a2a', 'Black']] },
  { id: 'doors', label: 'Interior doors', options: [['#a8693a', 'Oak (as listed)'], ['#f4f2ec', 'White'], ['#2a2a2a', 'Black'], ['#c49a62', 'Natural oak'], ['trim', 'Match trim']] },
  { id: 'floors', label: 'Hardwood (dining, powder, upstairs hall)', options: [['oak', 'Red oak (as listed)'], ['plank:#c8a57a', 'White oak'], ['plank:#d8c3a0', 'Pale ash'], ['plank:#6e4b33', 'Walnut'], ['plank:#a89f92', 'Gray-washed']] },
  { id: 'foyer', label: 'Foyer & hall', options: [['marbleRose', 'Rose marble (as listed)'], ['match', 'Hardwood'], ['tile:#d9d5ce', 'Large warm gray tile'], ['marbleTile', 'White marble']] },
  { id: 'kitchenFloor', label: 'Kitchen floor', options: [['tile:#e4d9c6', 'Beige tile (as listed)'], ['match', 'Hardwood'], ['tile:#d9d5ce', 'Large warm gray tile']] },
  { id: 'carpetMain', label: 'Great room & office', options: [['original', 'Carpet (as listed)'], ['match', 'Hardwood'], ['carpet:#cfc8bd', 'New carpet, greige']] },
  { id: 'living', label: 'Living room floor', options: [['carpet:#e2dbcc', 'Carpet (as listed)'], ['match', 'Hardwood'], ['carpet:#cfc8bd', 'New carpet, greige']] },
  { id: 'carpetBed', label: 'Bedrooms', options: [['original', 'Carpet (as listed)'], ['match', 'Hardwood'], ['carpet:#dcd4c5', 'Oatmeal carpet'], ['carpet:#c8c6c1', 'Gray carpet']] },
  { id: 'bathTile', label: 'Bath & laundry floors', options: [['original', 'As listed (green marble, white tile)'], ['tile:#d9d5ce', 'Large warm gray'], ['marbleTile', 'White marble'], ['tile:#5b5d60', 'Charcoal']] },
  { id: 'stair', label: 'Stair runner', options: [['carpet', 'Patterned runner (as listed)'], ['oak', 'Bare oak treads']] },
  { id: 'cabinets', label: 'Cabinets & vanities', options: [['#b98545', 'Golden oak (as listed)'], ['#efece5', 'Painted white'], ['#8a9a87', 'Sage green'], ['#2f3d52', 'Navy'], ['#2b2b2b', 'Black'], ['#c9a879', 'White oak'], ['#b8ae9f', 'Greige']] },
  { id: 'island', label: 'Island (kitchen remodel)', options: [['#46555e', 'Blue-gray (remodel default)'], ['match', 'Same as cabinets'], ['#5f6f5c', 'Deep green'], ['#c9a879', 'White oak'], ['#2b2b2b', 'Black']] },
  { id: 'counters', label: 'Counters', options: [['laminate:#cfc5b4', 'Light granite (as listed)'], ['marble', 'White quartz'], ['#3c3f42', 'Soapstone'], ['plank:#b07a45', 'Butcher block']] },
  { id: 'backsplash', label: 'Backsplash', options: [['paint:#efede7', 'Painted wall (as listed)'], ['subway:#f3f1ec', 'White subway'], ['subway:#6f8f7a', 'Green zellige'], ['marble', 'Marble slab']] },
  { id: 'fireplace', label: 'Fireplace surround', options: [['brick', 'Red brick (as listed)'], ['marble', 'White marble'], ['stone', 'Limestone'], ['paintbrick:#2d2d2d', 'Black brick']] },
  { id: 'mantel', label: 'Fireplace paneling & mantel', options: [['#b5793f', 'Oak (as listed)'], ['trim', 'Match trim'], ['#c9a06a', 'Natural oak'], ['#2a2a2a', 'Black']] },
];

const LISTED = { walls: O, bedWalls: O, bathWalls: O, trim: '#b5793f', doors: '#a8693a', floors: 'oak', foyer: 'marbleRose', kitchenFloor: 'tile:#e4d9c6', carpetMain: 'original', living: 'carpet:#e2dbcc', carpetBed: 'original', bathTile: 'original', stair: 'carpet', cabinets: '#b98545', island: '#46555e', counters: 'laminate:#cfc5b4', backsplash: 'paint:#efede7', fireplace: 'brick', mantel: '#b5793f' };
export const PRESETS = {
  original: { label: 'As listed', values: LISTED },
  warm: { label: 'Warm modern', values: { walls: '#ece8df', bedWalls: '#e4ddd0', bathWalls: '#f2f2ee', trim: '#f4f2ec', doors: '#f4f2ec', floors: 'plank:#c8a57a', foyer: 'tile:#d9d5ce', kitchenFloor: 'match', carpetMain: 'match', living: 'match', carpetBed: 'carpet:#dcd4c5', bathTile: 'tile:#d9d5ce', stair: 'oak', cabinets: '#8a9a87', island: '#c9a879', counters: 'marble', backsplash: 'subway:#f3f1ec', fireplace: 'stone', mantel: 'trim' } },
  coastal: { label: 'Coastal light', values: { walls: '#f3f2ee', bedWalls: '#cdd6da', bathWalls: '#d6dde0', trim: '#f4f2ec', doors: '#f4f2ec', floors: 'plank:#d8c3a0', foyer: 'match', kitchenFloor: 'match', carpetMain: 'match', living: 'match', carpetBed: 'carpet:#c8c6c1', bathTile: 'marbleTile', stair: 'oak', cabinets: '#efece5', island: '#2f3d52', counters: 'marble', backsplash: 'subway:#f3f1ec', fireplace: 'marble', mantel: 'trim' } },
  classic: { label: 'Classic moody', values: { walls: '#ddd5c8', bedWalls: '#c8cfbe', bathWalls: '#f2f2ee', trim: '#f4f2ec', doors: '#2a2a2a', floors: 'plank:#6e4b33', foyer: 'marbleTile', kitchenFloor: 'match', carpetMain: 'match', living: 'match', carpetBed: 'carpet:#dcd4c5', bathTile: 'marbleTile', stair: 'oak', cabinets: '#2f3d52', island: 'match', counters: 'marble', backsplash: 'subway:#f3f1ec', fireplace: 'paintbrick:#2d2d2d', mantel: 'trim' } },
  scandi: { label: 'Scandi oak', values: { walls: '#f3f2ee', bedWalls: 'match', bathWalls: '#f2f2ee', trim: '#f4f2ec', doors: '#c49a62', floors: 'plank:#d8c3a0', foyer: 'match', kitchenFloor: 'match', carpetMain: 'match', living: 'match', carpetBed: 'match', bathTile: 'tile:#d9d5ce', stair: 'oak', cabinets: '#c9a879', island: '#2b2b2b', counters: '#f1eee6', backsplash: 'subway:#f3f1ec', fireplace: 'stone', mantel: '#c9a06a' } },
};
export const DEFAULT_PRESET = 'warm';

const paint = (hex) => 'paint:' + hex;
const shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, '0')).join('');
};

export function applyStyle(v) {
  const wallFor = (cat, orig) => {
    const main = v.walls === O ? null : paint(v.walls);
    if (cat === 'bed') return v.bedWalls === O ? orig : v.bedWalls === 'match' ? main || orig : paint(v.bedWalls);
    if (cat === 'bath') return v.bathWalls === O ? orig : paint(v.bathWalls);
    if (cat === 'rec') return orig; // the basement keeps its colors
    return main || orig; // main, kitchen, dining, living
  };
  for (const w of ROLES.walls) applyFinish(w.key, w.key.endsWith('L') ? (v.walls === O ? w.orig : paint('#f4f2ec')) : wallFor(w.cat, w.orig)); // (dining wainscot stays white)
  const trim = v.trim;
  applyFinish('trim', trim);
  const door = v.doors === 'trim' ? trim : v.doors;
  applyFinish('door', door); applyFinish('doorPanel', shade(door, door === '#2a2a2a' ? 1.25 : 1.06)); applyFinish('doorLine', shade(door, 0.6));
  const wood = v.floors;
  const set = (k, val) => { if (ROLES.floors[k] !== undefined) applyFinish('F:' + k, val === 'original' ? ORIGIN['F:' + k] : val); };
  set('wood', wood);
  set('foyer', v.foyer === 'match' ? wood : v.foyer);
  set('kitchenTile', v.kitchenFloor === 'match' ? wood : v.kitchenFloor);
  for (const k of ['carpetMain', 'carpetOffice']) set(k, v.carpetMain === 'match' ? wood : v.carpetMain);
  set('carpetLiving', v.living === 'match' ? wood : v.living);
  set('carpetBed', v.carpetBed === 'match' ? wood : v.carpetBed);
  for (const k of ['tileBath', 'laundry', 'hallBath']) set(k, v.bathTile);
  applyFinish('stairCarpet', v.stair === 'oak' ? (wood === 'oak' ? '#b5793f' : wood) : '#7d6a58');
  const cab = v.cabinets, listedCab = cab === '#b98545';
  applyFinish('cab', shade(cab, 0.94)); applyFinish('cabDoor', cab); applyFinish('cabPanel', shade(cab, 1.07));
  // remodel cabinetry: its own white shaker unless a style picks a color
  const rc = listedCab ? ORIGIN.rcabDoor : cab;
  applyFinish('rcab', shade(rc, 0.95)); applyFinish('rcabDoor', rc); applyFinish('rcabPanel', shade(rc, 0.97));
  applyFinish('island', v.island === 'match' ? rc : v.island);
  applyFinish('counter', v.counters); applyFinish('vanityTop', v.counters.startsWith('laminate') ? ORIGIN.vanityTop : v.counters);
  applyFinish('vanityTop2', v.counters.startsWith('laminate') ? ORIGIN.vanityTop2 : v.counters);
  applyFinish('rcounter', v.counters.startsWith('laminate') ? ORIGIN.rcounter : v.counters);
  applyFinish('backsplash', v.backsplash);
  applyFinish('rsplash', v.backsplash.startsWith('paint') ? ORIGIN.rsplash : v.backsplash);
  applyFinish('splashTrim', v.backsplash.startsWith('paint') ? ORIGIN.splashTrim : v.backsplash);
  applyFinish('fpBrick', v.fireplace);
  const mantel = v.mantel === 'trim' ? trim : v.mantel;
  applyFinish('mantel', mantel); applyFinish('mantelPanel', shade(mantel, 1.07));
}
