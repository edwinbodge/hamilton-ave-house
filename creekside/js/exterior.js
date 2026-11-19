// Exterior color styles for Creekside Ln: siding, bay/gable panels, brick, trim, windows, roof, garage and front
// doors, gutters. Each control maps a choice onto a themeable exterior material (see ORIGIN in geom.js).
// The Modern facade and Classic refresh renovations add geometry (canopy, cedar wall, glass band / black double
// door, lanterns, plantings) and pick their matching preset here; any preset can be used with or without them.
import { applyFinish } from './geom.js';

const WHITE = '#f4f2ec', WARMWHITE = '#ece7dc', CREAM = '#ebe5d6', BLACK = '#1c1c1d', BRONZE = '#3b3128';
export const EXT_CONTROLS = [
  { id: 'siding', label: 'Siding', options: [['lap:#6a5f56', 'Taupe lap (as listed)'], ['lap:#aa9e8d', 'Warm greige lap'], ['lap:#efece4', 'White lap'], ['lap:#c9d1d3', 'Pale blue-gray lap'], ['lap:#8b9a8a', 'Sage lap'], ['lap:#4f5b66', 'Slate blue lap'], ['lap:#2e3135', 'Charcoal lap'], ['bnb:#f1efe9', 'White board & batten'], ['bnb:#2e3135', 'Charcoal board & batten'], ['bnb:#6f7a6a', 'Olive board & batten']] },
  { id: 'shake', label: 'Bay & gable panels', options: [['shake:#544941', 'Brown shake (as listed)'], ['shake:#b0a493', 'Greige shake'], ['shake:#efece4', 'White shake'], ['shake:#8a6a48', 'Natural cedar shake'], ['shake:#2e3135', 'Charcoal shake'], ['plank:#a66d3c', 'Cedar boards']] },
  { id: 'brickExt', label: 'Brick', options: [['brickTan', 'Tan brick (as listed)'], ['paintbrick:#ebe7df', 'Limewashed white'], ['paintbrick:#c9c2b6', 'Limewashed greige'], ['paintbrick:#2d2e30', 'Painted black'], ['stone', 'Limestone veneer']] },
  { id: 'extTrim', label: 'Fascia & corner trim', options: [[CREAM, 'Cream (as listed)'], [WARMWHITE, 'Warm white'], [WHITE, 'Bright white'], [BLACK, 'Black'], [BRONZE, 'Dark bronze']] },
  { id: 'winTrim', label: 'Window casings', options: [[CREAM, 'Cream (as listed)'], [WHITE, 'White'], [BLACK, 'Black'], [BRONZE, 'Dark bronze']] },
  { id: 'winExt', label: 'Window sashes', options: [['#e6dfcf', 'Almond (as listed)'], [WHITE, 'White'], [BLACK, 'Black'], [BRONZE, 'Dark bronze']] },
  { id: 'shingle', label: 'Roof', options: [['shingle', 'Weathered gray (as listed)'], ['shingleDark', 'Charcoal'], ['shingleBrown', 'Brown'], ['shingleSlate', 'Slate blue-gray']] },
  { id: 'garageDoor', label: 'Garage doors', options: [['#7b6e60', 'Taupe (as listed)'], ['#8a7e70', 'Greige'], ['#f1efe9', 'White'], ['#1f2022', 'Black'], ['plank:#a66d3c', 'Cedar']] },
  { id: 'frontDoor', label: 'Front door', options: [['#8c5e30', 'Stained oak (as listed)'], ['#1f2022', 'Black'], ['#2f3d52', 'Navy'], ['#5f6f5c', 'Deep green'], ['#8b2e2a', 'Red'], ['#c9a879', 'Natural white oak']] },
  { id: 'gutter', label: 'Gutters', options: [[CREAM, 'Cream (as listed)'], [WHITE, 'White'], [BLACK, 'Black'], [BRONZE, 'Dark bronze']] },
];
const LISTED = { siding: 'lap:#6a5f56', shake: 'shake:#544941', brickExt: 'brickTan', extTrim: CREAM, winTrim: CREAM, winExt: '#e6dfcf', shingle: 'shingle', garageDoor: '#7b6e60', frontDoor: '#8c5e30', gutter: CREAM };
export const EXT_PRESETS = {
  listed: { label: 'As listed', values: LISTED },
  classic: { label: 'Classic refresh', values: { ...LISTED, siding: 'lap:#aa9e8d', shake: 'shake:#b0a493', extTrim: WARMWHITE, winTrim: BLACK, winExt: BLACK, garageDoor: '#8a7e70', gutter: BLACK } },
  modern: { label: 'Modern', values: { siding: 'bnb:#2e3135', shake: 'plank:#a66d3c', brickExt: 'paintbrick:#ebe7df', extTrim: '#1f2022', winTrim: '#1f2022', winExt: '#1f2022', shingle: 'shingleDark', garageDoor: 'plank:#a66d3c', frontDoor: '#1f2022', gutter: '#1f2022' } },
  farmhouse: { label: 'Modern farmhouse', values: { siding: 'bnb:#f1efe9', shake: 'shake:#efece4', brickExt: 'paintbrick:#ebe7df', extTrim: WHITE, winTrim: BLACK, winExt: BLACK, shingle: 'shingleDark', garageDoor: '#1f2022', frontDoor: '#c9a879', gutter: BLACK } },
  coastal: { label: 'Coastal', values: { siding: 'lap:#c9d1d3', shake: 'shake:#efece4', brickExt: 'paintbrick:#c9c2b6', extTrim: WHITE, winTrim: WHITE, winExt: WHITE, shingle: 'shingle', garageDoor: '#f1efe9', frontDoor: '#2f3d52', gutter: WHITE } },
  craftsman: { label: 'Sage craftsman', values: { siding: 'lap:#8b9a8a', shake: 'shake:#8a6a48', brickExt: 'brickTan', extTrim: WARMWHITE, winTrim: WARMWHITE, winExt: BRONZE, shingle: 'shingleBrown', garageDoor: 'plank:#a66d3c', frontDoor: '#8c5e30', gutter: BRONZE } },
  moody: { label: 'Dark & moody', values: { siding: 'lap:#2e3135', shake: 'shake:#2e3135', brickExt: 'paintbrick:#2d2e30', extTrim: BLACK, winTrim: BLACK, winExt: BLACK, shingle: 'shingleDark', garageDoor: 'plank:#a66d3c', frontDoor: '#c9a879', gutter: BLACK } },
};
export function applyExterior(v) { for (const c of EXT_CONTROLS) applyFinish(c.id, v[c.id]); }
