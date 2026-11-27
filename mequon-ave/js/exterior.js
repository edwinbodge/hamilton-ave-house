// Exterior color styles for Mequon Ave: lap siding, fish-scale shingle panels, trim, window casings and sashes, the
// accent color (old sashes + the front door's outside face), roof, garage doors, gutters. Each control maps a choice
// onto a themeable exterior material (see ORIGIN in geom.js). The new garage options use the same materials, so a
// color scheme carries across the house and the garage.
import { applyFinish } from './geom.js';

const WHITE = '#f4f2ec', WARMWHITE = '#ece7dc', CREAM = '#ebe5d6', BLACK = '#1c1c1d', BRONZE = '#3b3128', RED = '#6e2a2a';
export const EXT_CONTROLS = [
  { id: 'siding', label: 'Siding', options: [['lap:#7d7971', 'Warm gray lap (as listed)'], ['lap:#6a5f56', 'Taupe lap'], ['lap:#aa9e8d', 'Greige lap'], ['lap:#efece4', 'White lap'], ['lap:#c9d1d3', 'Pale blue-gray lap'], ['lap:#8b9a8a', 'Sage lap'], ['lap:#5f6f5c', 'Deep green lap'], ['lap:#4f5b66', 'Slate blue lap'], ['lap:#2f3d52', 'Navy lap'], ['lap:#2e3135', 'Charcoal lap'], ['lap:#d9c98f', 'Butter yellow lap']] },
  { id: 'scallop', label: 'Fish-scale shingles', options: [['scallop:#f4f2ec', 'White (as listed)'], ['scallop:#ebe5d6', 'Cream'], ['scallop:#7d7971', 'Match the gray siding'], ['scallop:#6e2a2a', 'Burgundy'], ['scallop:#5f6f5c', 'Deep green'], ['scallop:#c9a44a', 'Ochre'], ['scallop:#2f3d52', 'Navy'], ['scallop:#2e3135', 'Charcoal']] },
  { id: 'extTrim', label: 'Trim, belt course & porch', options: [[WHITE, 'White (as listed)'], [CREAM, 'Cream'], [WARMWHITE, 'Warm white'], [BLACK, 'Black'], [BRONZE, 'Dark bronze']] },
  { id: 'winTrim', label: 'Window casings', options: [[WHITE, 'White (as listed)'], [CREAM, 'Cream'], [BLACK, 'Black'], [BRONZE, 'Dark bronze']] },
  { id: 'sashAccent', label: 'Accent (old sashes, front door)', options: [[RED, 'Burgundy (as listed)'], ['#8b2e2a', 'Brick red'], ['#2f4a3a', 'Forest green'], ['#2f3d52', 'Navy'], [BLACK, 'Black'], [WHITE, 'White'], ['#c9a44a', 'Ochre']] },
  { id: 'winExt', label: 'Newer sashes', options: [[WHITE, 'White (as listed)'], ['#e6dfcf', 'Almond'], [BLACK, 'Black'], [BRONZE, 'Dark bronze'], [RED, 'Burgundy']] },
  { id: 'shingle', label: 'Roof', options: [['shingle', 'Weathered gray (as listed)'], ['shingleDark', 'Charcoal'], ['shingleBrown', 'Brown'], ['shingleSlate', 'Slate blue-gray']] },
  { id: 'garageDoor', label: 'Garage doors', options: [['#f2f0ea', 'White carriage'], [RED, 'Burgundy'], ['#7d7971', 'Match the siding'], ['#3a3835', 'Charcoal brown'], ['#1f2022', 'Black'], ['plank:#a66d3c', 'Cedar'], ['#5b3b2a', 'Walnut brown']] },
  { id: 'gutter', label: 'Gutters', options: [[WHITE, 'White (as listed)'], [CREAM, 'Cream'], [BLACK, 'Black'], [BRONZE, 'Dark bronze']] },
];
const LISTED = { siding: 'lap:#7d7971', scallop: 'scallop:#f4f2ec', extTrim: WHITE, winTrim: WHITE, sashAccent: RED, winExt: WHITE, shingle: 'shingle', garageDoor: '#f2f0ea', gutter: WHITE };
export const EXT_PRESETS = {
  listed: { label: 'As listed', values: LISTED },
  lady: { label: 'Painted lady', values: { ...LISTED, siding: 'lap:#8b9a8a', scallop: 'scallop:#c9a44a', extTrim: CREAM, winTrim: CREAM, sashAccent: '#8b2e2a', winExt: CREAM, garageDoor: '#8b2e2a'.replace('#8b2e2a', RED), gutter: CREAM } },
  navy: { label: 'Navy & white', values: { ...LISTED, siding: 'lap:#2f3d52', sashAccent: '#8b2e2a', shingle: 'shingleDark' } },
  green: { label: 'Deep green', values: { ...LISTED, siding: 'lap:#5f6f5c', scallop: 'scallop:#ebe5d6', extTrim: CREAM, winTrim: CREAM, winExt: CREAM, sashAccent: RED, shingle: 'shingleBrown', garageDoor: 'plank:#a66d3c', gutter: CREAM } },
  white: { label: 'White farmhouse', values: { ...LISTED, siding: 'lap:#efece4', sashAccent: BLACK, winExt: BLACK, shingle: 'shingleDark', garageDoor: '#1f2022', gutter: WHITE } },
  moody: { label: 'Dark & moody', values: { ...LISTED, siding: 'lap:#2e3135', scallop: 'scallop:#2e3135', extTrim: BLACK, winTrim: BLACK, sashAccent: '#8b2e2a', winExt: BLACK, shingle: 'shingleDark', garageDoor: 'plank:#a66d3c', gutter: BLACK } },
};
export function applyExterior(v) { for (const c of EXT_CONTROLS) applyFinish(c.id, v[c.id]); }
