// Interior color styles. Each control maps a choice onto the themeable materials
// (walls by room category, floor groups, trim, doors, cabinets, counters, backsplash, fireplace...).
import { applyFinish, ORIGIN } from './geom.js';
import { ROLES } from './build.js';

const O = 'original';
// value: '#hex' paint/flat color, a texture name, 'original', or 'match' (follow another control)
export const CONTROLS = [
  { id: 'walls', label: 'Walls', options: [[O, 'As listed (sponge paint, wallpaper)'], ['#ece8df', 'Warm white'], ['#f3f2ee', 'Soft white'], ['#ddd5c8', 'Greige'], ['#d3d8c9', 'Pale sage'], ['#dfe2e0', 'Light gray']] },
  { id: 'bedWalls', label: 'Bedroom walls', options: [[O, 'As listed'], ['match', 'Same as walls'], ['#e4ddd0', 'Oatmeal'], ['#cdd6da', 'Dusty blue'], ['#c8cfbe', 'Sage'], ['#e6d8cf', 'Blush']] },
  { id: 'kitchenWalls', label: 'Kitchen walls', options: [[O, 'Ivy wallpaper (as listed)'], ['match', 'Same as walls'], ['#f3f2ee', 'Soft white']] },
  { id: 'bathWalls', label: 'Bath walls', options: [[O, 'As listed'], ['#f2f2ee', 'White'], ['#d3d8c9', 'Pale sage'], ['#d6dde0', 'Blue-gray']] },
  { id: 'wainscot', label: 'Office wainscot', options: [['#2c3a55', 'Navy (as listed)'], ['trim', 'Match trim'], ['walls', 'Match walls'], ['#7f8c78', 'Sage'], ['#3b3d40', 'Charcoal']] },
  { id: 'trim', label: 'Trim & stair rail', options: [['#a5652c', 'Stained oak (as listed)'], ['#f4f2ec', 'Warm white'], ['#c49a62', 'Natural oak'], ['#2a2a2a', 'Black']] },
  { id: 'doors', label: 'Interior doors', options: [['#8a3f1f', 'Cherry (as listed)'], ['#f4f2ec', 'White'], ['#2a2a2a', 'Black'], ['#c49a62', 'Natural oak'], ['trim', 'Match trim']] },
  { id: 'floors', label: 'Hardwood', options: [['oak', 'Honey red oak (as listed)'], ['plank:#c8a57a', 'White oak'], ['plank:#d8c3a0', 'Pale ash'], ['plank:#6e4b33', 'Walnut'], ['plank:#a89f92', 'Gray-washed']] },
  { id: 'carpetMain', label: 'Living & family floor', options: [['carpet:#e4ddcf', 'Carpet (as listed)'], ['match', 'Hardwood'], ['carpet:#d6d0c6', 'New carpet, greige']] },
  { id: 'carpetBed', label: 'Bedroom & upstairs floor', options: [['carpet:#e7e1d6', 'Carpet (as listed)'], ['match', 'Hardwood'], ['carpet:#dcd4c5', 'Oatmeal carpet'], ['carpet:#c8c6c1', 'Gray carpet']] },
  { id: 'bathTile', label: 'Bath & laundry tile', options: [['tileBeige', 'Beige (as listed)'], ['tile:#d9d5ce', 'Large warm gray'], ['marbleTile', 'White marble'], ['tile:#5b5d60', 'Charcoal']] },
  { id: 'sunFloor', label: 'Sun room floor', options: [['slate', 'Slate (as listed)'], ['match', 'Hardwood'], ['tile:#d2cbbf', 'Light stone']] },
  { id: 'cabinets', label: 'Cabinets & vanities', options: [['#a8682f', 'Oak (as listed)'], ['#efece5', 'Painted white'], ['#8a9a87', 'Sage green'], ['#2f3d52', 'Navy'], ['#2b2b2b', 'Black'], ['#c9a879', 'White oak'], ['#b8ae9f', 'Greige']] },
  { id: 'island', label: 'Island (kitchen remodel)', options: [['match', 'Same as cabinets'], ['#2f3d52', 'Navy'], ['#5f6f5c', 'Deep green'], ['#c9a879', 'White oak'], ['#2b2b2b', 'Black']] },
  { id: 'counters', label: 'Counters', options: [['#f1eee6', 'White solid surface (as listed)'], ['marble', 'White quartz'], ['#3c3f42', 'Soapstone'], ['plank:#b07a45', 'Butcher block']] },
  { id: 'backsplash', label: 'Backsplash', options: [['backsplash', 'Diagonal tile (as listed)'], ['subway:#f3f1ec', 'White subway'], ['subway:#6f8f7a', 'Green zellige'], ['marble', 'Marble slab']] },
  { id: 'fireplace', label: 'Fireplace', options: [['brick', 'Red brick (as listed)'], ['paintbrick:#f1eee8', 'Painted white brick'], ['paintbrick:#d8d0c2', 'Limewash'], ['paintbrick:#2d2d2d', 'Black brick']] },
  { id: 'mantel', label: 'Mantel', options: [['#b5743a', 'Oak (as listed)'], ['trim', 'Match trim'], ['#c9a06a', 'Natural oak'], ['#2a2a2a', 'Black']] },
];

export const PRESETS = {
  original: { label: 'As listed', values: { walls: O, bedWalls: O, kitchenWalls: O, bathWalls: O, wainscot: '#2c3a55', trim: '#a5652c', doors: '#8a3f1f', floors: 'oak', carpetMain: 'carpet:#e4ddcf', carpetBed: 'carpet:#e7e1d6', bathTile: 'tileBeige', sunFloor: 'slate', cabinets: '#a8682f', island: 'match', counters: '#f1eee6', backsplash: 'backsplash', fireplace: 'brick', mantel: '#b5743a' } },
  warm: { label: 'Warm modern', values: { walls: '#ece8df', bedWalls: '#e4ddd0', kitchenWalls: 'match', bathWalls: '#f2f2ee', wainscot: 'trim', trim: '#f4f2ec', doors: '#f4f2ec', floors: 'plank:#c8a57a', carpetMain: 'match', carpetBed: 'carpet:#dcd4c5', bathTile: 'tile:#d9d5ce', sunFloor: 'tile:#d2cbbf', cabinets: '#8a9a87', island: '#c9a879', counters: 'marble', backsplash: 'subway:#f3f1ec', fireplace: 'paintbrick:#f1eee8', mantel: '#c9a06a' } },
  coastal: { label: 'Coastal light', values: { walls: '#f3f2ee', bedWalls: '#cdd6da', kitchenWalls: 'match', bathWalls: '#d6dde0', wainscot: 'trim', trim: '#f4f2ec', doors: '#f4f2ec', floors: 'plank:#d8c3a0', carpetMain: 'match', carpetBed: 'carpet:#c8c6c1', bathTile: 'marbleTile', sunFloor: 'match', cabinets: '#efece5', island: '#2f3d52', counters: 'marble', backsplash: 'subway:#f3f1ec', fireplace: 'paintbrick:#d8d0c2', mantel: 'trim' } },
  classic: { label: 'Classic moody', values: { walls: '#ddd5c8', bedWalls: '#c8cfbe', kitchenWalls: 'match', bathWalls: '#f2f2ee', wainscot: '#2c3a55', trim: '#f4f2ec', doors: '#2a2a2a', floors: 'plank:#6e4b33', carpetMain: 'match', carpetBed: 'carpet:#dcd4c5', bathTile: 'marbleTile', sunFloor: 'tile:#d2cbbf', cabinets: '#2f3d52', island: 'match', counters: 'marble', backsplash: 'subway:#f3f1ec', fireplace: 'paintbrick:#2d2d2d', mantel: 'trim' } },
  scandi: { label: 'Scandi oak', values: { walls: '#f3f2ee', bedWalls: 'match', kitchenWalls: 'match', bathWalls: '#f2f2ee', wainscot: 'walls', trim: '#f4f2ec', doors: '#c49a62', floors: 'plank:#d8c3a0', carpetMain: 'match', carpetBed: 'match', bathTile: 'tile:#d9d5ce', sunFloor: 'match', cabinets: '#c9a879', island: '#2b2b2b', counters: '#f1eee6', backsplash: 'subway:#f3f1ec', fireplace: 'paintbrick:#d8d0c2', mantel: '#c9a06a' } },
};
export const DEFAULT_PRESET = 'warm';

const paint = (hex) => 'paint:' + hex;
const shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, '0')).join('');
};

// stained-wood choices get a wood-grain texture (the photos show strong oak/cherry grain on the
// doors, cabinets and mantel); painted colors stay flat
const STAINED = new Set(['#8a3f1f', '#c49a62', '#a8682f', '#c9a879', '#b5743a', '#c9a06a', '#b07a45', '#a5652c']);
const grain = (base, hex) => (STAINED.has(base) ? 'grain:' + hex : hex);

export function applyStyle(v) {
  const wallFor = (cat, orig) => {
    const main = v.walls === O ? null : paint(v.walls);
    if (cat === 'showerTile') return orig;
    if (cat === 'kitchen') return v.kitchenWalls === O ? (v.walls === O ? orig : main) : v.kitchenWalls === 'match' ? main || orig : paint(v.kitchenWalls);
    if (cat === 'bed') return v.bedWalls === O ? orig : v.bedWalls === 'match' ? main || orig : paint(v.bedWalls);
    if (cat === 'bath') return v.bathWalls === O ? orig : paint(v.bathWalls);
    return main || orig; // main, rec
  };
  for (const w of ROLES.walls) applyFinish(w.key, wallFor(w.cat, w.orig));
  const trim = v.trim;
  applyFinish('trim', trim);
  applyFinish('W:wainscot', v.wainscot === 'trim' ? trim : v.wainscot === 'walls' ? (v.walls === O ? '#efdba6' : v.walls) : v.wainscot);
  const door = v.doors === 'trim' ? trim : v.doors;
  applyFinish('door', grain(door, shade(door, 1.08))); applyFinish('doorPanel', grain(door, shade(door, door === '#2a2a2a' ? 1.25 : 1.15))); applyFinish('doorLine', shade(door, 0.6));
  const wood = v.floors;
  applyFinish('F:wood', wood);
  applyFinish('F:carpetMain', v.carpetMain === 'match' ? wood : v.carpetMain);
  applyFinish('F:carpetBed', v.carpetBed === 'match' ? wood : v.carpetBed);
  applyFinish('stairCarpet', v.carpetMain === 'match' ? wood : '#d8d1c4');
  applyFinish('F:tileBath', v.bathTile);
  applyFinish('F:sun', v.sunFloor === 'match' ? wood : v.sunFloor);
  applyFinish('F:shower', v.bathTile === 'tileBeige' ? 'tile4' : v.bathTile);
  const cab = v.cabinets;
  applyFinish('cab', grain(cab, shade(cab, 0.94))); applyFinish('cabDoor', grain(cab, cab)); applyFinish('cabPanel', grain(cab, shade(cab, 1.07)));
  const isl = v.island === 'match' ? cab : v.island;
  applyFinish('island', grain(isl, isl));
  applyFinish('counter', v.counters); applyFinish('vanityTop', v.counters === '#f1eee6' ? ORIGIN.vanityTop : v.counters);
  applyFinish('backsplash', v.backsplash);
  applyFinish('splashTrim', v.backsplash === 'backsplash' ? ORIGIN.splashTrim : v.backsplash.startsWith('subway') ? v.backsplash : '#e6e4df');
  // the dated plaid / floral valances only belong to the as-listed look; restyled rooms get plain linen
  applyFinish('curtain', v.kitchenWalls === O ? 'plaid' : '#e8e3d9');
  applyFinish('curtain2', v.bedWalls === O ? 'floral' : '#e8e3d9');
  applyFinish('fpBrick', v.fireplace);
  const mantel = v.mantel === 'trim' ? trim : v.mantel;
  applyFinish('mantel', grain(mantel, mantel)); applyFinish('mantelPanel', grain(mantel, shade(mantel, 1.07)));
}
