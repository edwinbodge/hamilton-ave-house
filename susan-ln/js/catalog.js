// The catalog of interchangeable things ("families"). Every editable piece belongs to a family, and a family
// lists its options: an asset-pack model (glb) or a hand-built generator (build(k, ctx) on a Kit). "Change"
// on a piece shows its family's options; "Add" lists the families that go on the surface you clicked.
//   family: { name, place: 'floor' | 'wall' | 'ceiling', back (back at z = 0, against a wall), add (show in the
//             add menu), paintable (recolor rebuilds the option with ctx.color instead of tinting materials),
//             colors (swatches for paintable families), size (the option is sized to the piece's footprint),
//             options: [{ id, name, glb?, spec?, build?(k, ctx) }] }
// ctx: { ceil, hang } for ceiling lights (relative to the piece's origin), { w, d, h } footprint, { color }.
import * as THREE from 'three';
import { Kit, Batcher, MODEL_BASE } from './geom.js';
import {
  rug, plant, floorLamp, recessed, tableLamp, bookcase, wallTV, mediaConsole, standTV, chandelier, bellChandelier, globePendant, lantern, flushDome, crystalFlush,
  ceilingFan, sconce, sideTable, rivianR2, acuraMDX, teslaModelY, hondaOdyssey, fordF150, toyotaCamry, porsche911,
} from './furnish.js';
import { pendant, orb, linearPendant } from './reno.js';

// ---------------------------------------------------------------- small hand-built pieces used only here
function arcLamp(k) { // arching floor lamp: marble base, brass arc over to a dome shade out front
  k.cyl('col:#e9e6df', 0, -1.4, 0.45, 0.45, 0, 0.35, 16);
  const P0 = [-1.4, 0.35], C = [-1.0, 7.6], P1 = [1.5, 6.1], at = (t) => [(1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * C[0] + t * t * P1[0], (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * C[1] + t * t * P1[1]];
  for (let i = 0; i < 14; i++) { const [z0, y0] = at(i / 14), [z1, y1] = at((i + 1) / 14); k.box('brass', -0.04, Math.min(y0, y1) - 0.04, Math.min(z0, z1) - 0.04, 0.04, Math.max(y0, y1) + 0.04, Math.max(z0, z1) + 0.04); }
  k.cyl('brass', 0, 1.5, 0.12, 0.8, 5.5, 6.1, 18); k.cyl('bulb', 0, 1.5, 0.12, 0.12, 5.4, 5.55, 8);
}
function tripodLamp(k) { // wooden tripod legs, linen drum shade
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; k.cyl(woodKey('#7a5638'), Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0.05, 0.05, 0, 4.4, 6); }
  k.cyl(woodKey('#7a5638'), 0, 0, 0.06, 0.06, 3.6, 4.6, 6);
  k.cyl('shade', 0, 0, 0.85, 0.85, 4.5, 5.6, 20, 1, false);
}
function sideLamp(k) { sideTable(k, 1.6); tableLamp(k, 0, 0, 1.95); }
function globeSconce(k, y = 5.6) { // wall plate + arm + opal globe
  k.box('black', -0.15, y - 0.3, 0, 0.15, y + 0.3, 0.06); k.box('black', -0.03, y - 0.03, 0.06, 0.03, y + 0.03, 0.55);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI, r0 = Math.sin(a) * 0.35, r1 = Math.sin(a + Math.PI / 5) * 0.35; k.cyl('shade', 0, 0.62, r0, r1, y - 0.35 + (1 - Math.cos(a)) * 0.35, y - 0.35 + (1 - Math.cos(a + Math.PI / 5)) * 0.35, 14, 1, false); }
}
function swingSconce(k, y = 5.2) { // swing-arm reading light with a cone shade
  k.box('brass', -0.12, y - 0.25, 0, 0.12, y + 0.25, 0.05); k.box('brass', -0.025, y - 0.02, 0.05, 0.025, y + 0.02, 1.4);
  k.cyl('brass', 0, 1.4, 0.02, 0.02, y - 0.25, y, 6); k.cyl('col:#2f4a3e', 0, 1.4, 0.12, 0.45, y - 0.75, y - 0.25, 16);
}
function drumPendant(k, ceilY, hang) { const y = ceilY - hang; k.cyl('black', 0, 0, 0.2, 0.2, ceilY - 0.06, ceilY, 10); k.cyl('black', 0, 0, 0.015, 0.015, y + 1.1, ceilY - 0.06, 4); k.cyl('shade', 0, 0, 1.2, 1.2, y, y + 1.1, 24, 1, false); }
function rattanPendant(k, ceilY, hang) { const y = ceilY - hang; k.cyl('col:#2a2a2a', 0, 0, 0.015, 0.015, y + 1.0, ceilY, 4); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI, r0 = Math.sin(a) * 0.9, r1 = Math.sin(a + Math.PI / 6) * 0.9; k.cyl('col:#b88a55', 0, 0, r0, r1, y + 1.0 - (1 - Math.cos(a)) * 0.6, y + 1.0 - (1 - Math.cos(a + Math.PI / 6)) * 0.6, 18, 1, false); } }
const woodKey = (hex) => 'wood:' + hex;
function tv(k, inches, where) { if (where === 'floor') { mediaConsole(k, Math.max(4.5, inches * 0.075)); standTV(k, inches, 1.8); } else wallTV(k, inches); }
function textRug(k, ctx, field, border, stripe) {
  const w = ctx.w || 8, d = ctx.d || 10;
  rug(k, w, d, field, border);
  if (stripe) for (const z of [-d / 2 + 0.9, d / 2 - 1.1]) k.box('fab:' + stripe, -w / 2 + 0.45, 0.04, z, w / 2 - 0.45, 0.075, z + 0.2);
}
// framed art, back at z = 0, centered about 5'3" up (or ctx.y)
const ARTS = {
  abstract: { name: 'Abstract', w: 2.6, h: 3.3, frame: '#1d1d1f', bg: '#efe8dc', marks: [['#c46a4a', 0.15, 0.55, 0.55, 0.3], ['#2f4a5e', 0.42, 0.2, 0.45, 0.42], ['#d9b26a', 0.1, 0.12, 0.3, 0.25]] },
  landscape: { name: 'Landscape', w: 4, h: 2.7, frame: '#b88a55', bg: '#bcd0db', bands: [['#9db3a0', 0.28, 0.45], ['#6f8a6a', 0, 0.3], ['#e9e3d3', 0.45, 0.55]] },
  botanical: { name: 'Botanical', w: 1.8, h: 2.4, frame: '#c9a75a', bg: '#f3efe5', marks: [['#5f7d55', 0.47, 0.15, 0.06, 0.62], ['#7f9b6d', 0.25, 0.45, 0.22, 0.1], ['#7f9b6d', 0.53, 0.55, 0.22, 0.1], ['#7f9b6d', 0.27, 0.68, 0.2, 0.09]] },
  bw: { name: 'Black & white photo', w: 3, h: 2.2, frame: '#1d1d1f', bg: '#d8d8d6', bands: [['#4a4a4a', 0, 0.35], ['#8a8a88', 0.35, 0.55], ['#bdbdbb', 0.55, 1]] },
  canvas: { name: 'Large canvas', w: 5, h: 3.4, frame: null, bg: '#e7ddd0', marks: [['#a9b8c4', 0.05, 0.08, 0.9, 0.35], ['#c9a48a', 0.05, 0.5, 0.6, 0.4], ['#f4efe6', 0.55, 0.55, 0.38, 0.36]] },
  diptych: { name: 'Pair of prints', w: 4.6, h: 2.6, pair: true, frame: '#f2efe8', bg: '#efe8dc', marks: [['#7b8f9e', 0.06, 0.15, 0.38, 0.7], ['#c8a98a', 0.56, 0.15, 0.38, 0.7]] },
  mirror: { name: 'Round mirror', w: 2.8, h: 2.8, mirror: true },
};
export function art(k, v = 'abstract', yc = 5.3) {
  const a = ARTS[v] || ARTS.abstract, { w, h } = a, y0 = yc - h / 2;
  if (a.mirror) {
    for (let i = 0; i < 12; i++) { const t = (i / 12) * Math.PI; const hw = Math.sin(t + Math.PI / 24) * w / 2; k.box('brass', -hw, y0 + h / 2 - Math.cos(t) * h / 2 - 0.12, 0, hw, y0 + h / 2 - Math.cos(t + Math.PI / 12) * h / 2 + 0.12, 0.06); }
    for (let i = 0; i < 12; i++) { const t = (i / 12) * Math.PI; const hw = Math.sin(t + Math.PI / 24) * (w / 2 - 0.12); k.box('mirror', -hw, y0 + h / 2 - Math.cos(t) * (h / 2 - 0.12), 0.06, hw, y0 + h / 2 - Math.cos(t + Math.PI / 12) * (h / 2 - 0.12), 0.08); }
    return;
  }
  if (a.pair) { for (const s of [-1, 1]) { const x0 = s < 0 ? -w / 2 : 0.15, x1 = s < 0 ? -0.15 : w / 2; k.box('col:#1d1d1f', x0, y0, 0, x1, y0 + h, 0.1); k.box('col:' + a.bg, x0 + 0.25, y0 + 0.25, 0.08, x1 - 0.25, y0 + h - 0.25, 0.13); k.box('col:' + (s < 0 ? '#7b8f9e' : '#c8a98a'), x0 + 0.5, y0 + 0.5, 0.11, x1 - 0.5, y0 + h - 0.5, 0.16); } return; }
  const f = a.frame ? 0.1 : 0, m = a.frame ? 0.22 : 0;
  if (a.frame) k.box('col:' + a.frame, -w / 2, y0, 0, w / 2, y0 + h, 0.12);
  if (a.frame) k.box('col:#f5f2ea', -w / 2 + f, y0 + f, 0.1, w / 2 - f, y0 + h - f, 0.13);
  const x0 = -w / 2 + f + m, x1 = w / 2 - f - m, b0 = y0 + f + m, b1 = y0 + h - f - m, z = a.frame ? 0.15 : 0.16;
  k.box('col:' + a.bg, x0, b0, a.frame ? 0.11 : 0, x1, b1, z);
  const W = x1 - x0, H = b1 - b0;
  for (const [c, lo, hi] of a.bands || []) k.box('col:' + c, x0, b0 + lo * H, z - 0.02, x1, b0 + hi * H, z + 0.02);
  for (const [c, px, py, pw, ph] of a.marks || []) k.box('col:' + c, x0 + px * W, b0 + py * H, z - 0.02, x0 + (px + pw) * W, b0 + (py + ph) * H, z + 0.025);
}

// ---------------------------------------------------------------- the families
const G = (ids, names) => ids.map((id, i) => ({ id, name: names[i] || id, glb: id }));
const C = (c) => c.ceil ?? 8, HG = (c, d) => c.hang ?? d;
export const FAMILIES = {
  sofa: { name: 'Sofas', place: 'floor', back: true, add: 'Sofa', options: G(['Sofa08', 'Sofa01', 'Sofa03', 'Sofa11', 'Sofa16', 'Sofa17', 'Sofa18', 'Sofa31', 'Sofa33', 'Sofa35', 'Sofa36'],
    ['Greige track arm', 'Olive leather', 'Charcoal low', 'Gray chesterfield', 'Green velvet', 'Navy velvet', 'Charcoal tight back', 'Blue roll arm', 'Long blue', 'Black leather loveseat', 'Brown leather']) },
  armchair: { name: 'Armchairs', place: 'floor', add: 'Armchair', options: G(['Chair11', 'Chair12', 'Chair13', 'Chair14', 'Chair15', 'Chair16', 'Chair20', 'Chair45', 'Sofa37'],
    ['Beige mid-century', 'Taupe club', 'Wood frame', 'Black leather tub', 'Gray roll arm', 'Leather chesterfield', 'Quilted recliner', 'Red egg chair', 'Brown leather club']) },
  chair: { name: 'Dining chairs', place: 'floor', add: 'Dining chair', options: G(['Chair01', 'Chair03', 'Chair04', 'Chair05', 'Chair06', 'Chair07', 'Chair08', 'Chair17', 'Chair29'],
    ['Dark slat', 'Oak upholstered', 'Gray parsons', 'Walnut spindle', 'Windsor', 'White shell', 'Walnut mid-century', 'Quilted leather', 'Charcoal side chair']) },
  stool: { name: 'Stools', place: 'floor', options: G(['Chair24', 'Chair22'], ['Counter stool', 'Saddle stool']) },
  office: { name: 'Office chairs', place: 'floor', add: 'Office chair', options: G(['Chair31', 'Chair32', 'Chair33'], ['Mesh task', 'Gray leather', 'Black executive']) },
  outdoor: { name: 'Outdoor seating', place: 'floor', options: G(['Chair44', 'Chair39', 'Chair04', 'Chair29', 'Chair07'], ['Adirondack', 'Teak bench', 'Parsons', 'Side chair', 'Shell chair']) },
  bed: { name: 'Beds', place: 'floor', back: true, add: 'Bed', options: G(['Bed15', 'Bed16', 'Bed18', 'Bed12', 'Bed20', 'Bed02', 'Bed04', 'Bed09', 'Bed10'],
    ['Gray wingback', 'Gray wingback king', 'Black upholstered', 'Wood panel', 'Walnut storage', 'Pine slat', 'Dark wood', 'Metal platform', 'Metal platform king']) },
  nightstand: { name: 'Nightstands', place: 'floor', back: true, options: G(['Drawer02', 'Drawer01', 'Drawer04', 'Drawer14'], ['Wood', 'Light oak', 'White', 'Black + brass']) },
  dresser: { name: 'Dressers', place: 'floor', back: true, add: 'Dresser', options: G(['Drawer38', 'Drawer36', 'Drawer35', 'Drawer39', 'Drawer40', 'Drawer12', 'Drawer13', 'Drawer34', 'Drawer37'],
    ['White long', 'Walnut long', 'Light wood long', 'Black long', 'Dark wood long', 'Wood 6-drawer', 'White 6-drawer', 'White tall chest', 'Wood tall chest']) },
  console: { name: 'Consoles & sideboards', place: 'floor', back: true, options: G(['Drawer31', 'Drawer32', 'Drawer36', 'Drawer39', 'Drawer40', 'Drawer38'], ['Black + wood top', 'Red', 'Walnut', 'Black', 'Dark wood', 'White']) },
  dining: { name: 'Dining tables', place: 'floor', add: 'Dining table', options: G(['Table17', 'Table03', 'Table04', 'Table06', 'Table07', 'Table11', 'Table19', 'Table22', 'Table23', 'Table24', 'Table29'],
    ['Oak turned leg', 'Gray trestle', 'Oak', 'Wood + black legs', 'Dark wood + frame', 'Dark turned leg', 'Whitewashed', 'Round marble', 'Round wood', 'Round pedestal', 'Marble tulip']) },
  coffee: { name: 'Coffee tables', place: 'floor', add: 'Coffee table', options: G(['Table39', 'Table34', 'Table36', 'Table38', 'Table40'], ['Marble + walnut', 'Light wood block', 'Round wood + ring', 'Curved walnut', 'Round marble']) },
  side: { name: 'Side tables', place: 'floor', add: 'Side table', options: G(['Table37', 'Table36', 'Drawer02', 'Drawer04'], ['Marble + black', 'Round wood', 'Wood drawers', 'White drawers']) },
  desk: { name: 'Desks', place: 'floor', back: true, add: 'Desk', options: G(['Table49', 'Table43', 'Table44'], ['Walnut + drawers', 'Black', 'White']) },
  toilet: { name: 'Toilets', place: 'floor', back: true, options: G(['Toilet03', 'Toilet01'], ['Elongated', 'Compact']) },
  car: { name: 'Cars', place: 'floor', paintable: true, colors: ['#56634a', '#e9e9e6', '#c9ccce', '#5b6670', '#2f3a48', '#1d1e20', '#8a1f24', '#2f4f7a', '#c8c3b4'],
    options: [
      { id: 'rivianR2', name: 'Rivian R2', build: (k, c) => rivianR2(k, c.color) }, { id: 'acuraMDX', name: 'Acura MDX', build: (k, c) => acuraMDX(k, c.color) },
      { id: 'teslaModelY', name: 'Tesla Model Y', build: (k, c) => teslaModelY(k, c.color) }, { id: 'hondaOdyssey', name: 'Honda Odyssey', build: (k, c) => hondaOdyssey(k, c.color) },
      { id: 'fordF150', name: 'Ford F-150', build: (k, c) => fordF150(k, c.color) }, { id: 'toyotaCamry', name: 'Toyota Camry', build: (k, c) => toyotaCamry(k, c.color) },
      { id: 'porsche911', name: 'Porsche 911', build: (k, c) => porsche911(k, c.color) }] },
  ceiling: { name: 'Ceiling lights', place: 'ceiling', add: 'Ceiling light', options: [
    { id: 'chandelier8', name: 'Brass chandelier', build: (k, c) => chandelier(k, C(c), HG(c, 2.6), 8) },
    { id: 'chandelier6', name: 'Small chandelier', build: (k, c) => chandelier(k, C(c), HG(c, 2.4), 6) },
    { id: 'bell', name: 'Glass bells', build: (k, c) => bellChandelier(k, C(c), HG(c, 2.6), 5) },
    { id: 'globe', name: 'Brass domes', build: (k, c) => globePendant(k, C(c), HG(c, 2.4)) },
    { id: 'lantern', name: 'Lantern', build: (k, c) => lantern(k, C(c), Math.max(3.2, HG(c, 3.2))) },
    { id: 'drum', name: 'Linen drum', build: (k, c) => drumPendant(k, C(c), HG(c, 2.4)) },
    { id: 'rattan', name: 'Rattan dome', build: (k, c) => rattanPendant(k, C(c), HG(c, 2.4)) },
    { id: 'orb', name: 'Opal globe', build: (k, c) => orb(k, C(c), HG(c, 2.4), 0.8) },
    { id: 'pendant', name: 'Schoolhouse', build: (k, c) => pendant(k, C(c), HG(c, 2.4)) },
    { id: 'linear', name: 'Linear bar', build: (k, c) => linearPendant(k, C(c), HG(c, 2.4), 4.5) },
    { id: 'flushDome', name: 'Flush dome', build: (k, c) => flushDome(k, C(c)) },
    { id: 'recessed', name: 'Recessed can', build: (k, c) => recessed(k, C(c)) },
    { id: 'crystal', name: 'Crystal flush', build: (k, c) => crystalFlush(k, C(c)) },
    { id: 'fanWhite', name: 'Fan, white', build: (k, c) => ceilingFan(k, C(c), { body: 'steel', blade: 'col:#ebe9e4', drop: 0.75 }) },
    { id: 'fanWood', name: 'Fan, wood', build: (k, c) => ceilingFan(k, C(c), { body: 'black', drop: 0.75 }) }] },
  lamp: { name: 'Lamps', place: 'floor', add: 'Lamp', options: [
    { id: 'floorLamp', name: 'Black floor lamp', build: (k) => floorLamp(k, 0, 0) }, { id: 'arc', name: 'Arc lamp', build: arcLamp },
    { id: 'tripod', name: 'Tripod lamp', build: tripodLamp }, { id: 'sideLamp', name: 'Side table + lamp', build: sideLamp }] },
  sconce: { name: 'Wall lights', place: 'wall', back: true, add: 'Wall light', options: [
    { id: 'candle', name: 'Brass candle', build: (k) => sconce(k, 5.8) }, { id: 'globeSconce', name: 'Opal globe', build: (k) => globeSconce(k) },
    { id: 'swing', name: 'Swing arm', build: (k) => swingSconce(k) }] },
  tv: { name: 'TVs', place: 'wall', back: true, add: 'TV', options: [50, 55, 65, 75, 85].map((n) => ({ id: 'tv' + n, name: `${n}"`, build: (k, c) => tv(k, n, c.where) })) },
  art: { name: 'Art', place: 'wall', back: true, add: 'Art', options: Object.entries(ARTS).map(([id, a]) => ({ id, name: a.name, build: (k) => art(k, id) })) },
  rug: { name: 'Rugs', place: 'floor', add: 'Rug', size: true, options: [
    { id: 'rugCream', name: 'Cream + brown border', build: (k, c) => textRug(k, c, '#d8cfc0', '#7d6a55') }, { id: 'rugGray', name: 'Gray', build: (k, c) => textRug(k, c, '#c9c4bb', '#8d8a85') },
    { id: 'rugNavy', name: 'Navy + ivory', build: (k, c) => textRug(k, c, '#2f3d52', '#e9e2d3') }, { id: 'rugRust', name: 'Rust', build: (k, c) => textRug(k, c, '#b36a45', '#6d3c27') },
    { id: 'rugSage', name: 'Sage stripe', build: (k, c) => textRug(k, c, '#c3cbb6', '#8a9878', '#f2eee4') }, { id: 'rugBlush', name: 'Blush', build: (k, c) => textRug(k, c, '#e3cfc6', '#b89a8e') }] },
  plant: { name: 'Plants', place: 'floor', add: 'Plant', options: [
    { id: 'plant6', name: 'Tall tree, 6 ft', build: (k) => plant(k, 0, 0, 6) }, { id: 'plant45', name: 'Medium, 4.5 ft', build: (k) => plant(k, 0, 0, 4.5) }, { id: 'plant3', name: 'Small, 3 ft', build: (k) => plant(k, 0, 0, 3) }] },
  bookcase: { name: 'Bookcases', place: 'floor', back: true, add: 'Bookcase', size: true, options: [
    { id: 'bcWalnut', name: 'Walnut', build: (k, c) => bookcase(k, c.w || 2.8, c.h || 6.5, 7, '#5a3a26') }, { id: 'bcWhite', name: 'White', build: (k, c) => bookcase(k, c.w || 2.8, c.h || 6.5, 7, '#efece5') },
    { id: 'bcBlack', name: 'Black', build: (k, c) => bookcase(k, c.w || 2.8, c.h || 6.5, 7, '#2a2a2c') }, { id: 'bcOak', name: 'Oak', build: (k, c) => bookcase(k, c.w || 2.8, c.h || 6.5, 7, '#b88a55') }] },
};
for (const [id, f] of Object.entries(FAMILIES)) f.id = id;
export const optionOf = (fam, id) => FAMILIES[fam]?.options.find((o) => o.id === id) || null;
// what family (and which option) a piece built by a hand-built function belongs to
export const LABEL_FAMILY = {
  sofa: ['sofa'], leatherSofa: ['sofa'], sectional: ['sofa'], armchair: ['armchair'], recliner: ['armchair'], tuxedoChair: ['armchair'], rockingChair: ['armchair'], loungeChair: ['armchair'],
  spindleChair: ['chair'], chair: ['chair'], tulipChair: ['chair'], patioChair: ['outdoor'], adirondack: ['outdoor', 'Chair44'], officeChair: ['office'], stool: ['stool'],
  bed: ['bed'], nightstand: ['nightstand'], dresser: ['dresser'], tallChest: ['dresser'], armoire: ['dresser'], diningTable: ['dining'], roundTable: ['dining'], coffeeTable: ['coffee'],
  sideTable: ['side'], desk: ['desk'], officeDesk: ['desk'], bowDesk: ['desk'], dropLeafDesk: ['desk'], hutchDesk: ['desk'], toilet: ['toilet'], buffet: ['console'], mediaConsole: ['console'],
  rivianR2: ['car', 'rivianR2'], acuraMDX: ['car', 'acuraMDX'], chandelier: ['ceiling', 'chandelier8'], bellChandelier: ['ceiling', 'bell'], globePendant: ['ceiling', 'globe'],
  lantern: ['ceiling', 'lantern'], flushDome: ['ceiling', 'flushDome'], crystalFlush: ['ceiling', 'crystal'], ceilingFan: ['ceiling', 'fanWhite'], pendant: ['ceiling', 'pendant'],
  linearPendant: ['ceiling', 'linear'], recessed: ['ceiling', 'recessed'], orb: ['ceiling', 'orb'], floorLamp: ['lamp', 'floorLamp'], sconce: ['sconce', 'candle'], wallTV: ['tv', 'tv65'], rug: ['rug'], plant: ['plant'],
  bookcase: ['bookcase', 'bcWalnut'],
};
export function familyOfGlb(glb) { for (const f of Object.values(FAMILIES)) if (f.options.some((o) => o.glb === glb)) return f.id; return null; }

// ---------------------------------------------------------------- thumbnails (rendered in the browser for hand-built options)
let tr = null;
const THUMBS = new Map();
export function thumbURL(fam, opt) {
  if (opt.glb) return Promise.resolve(`${MODEL_BASE}thumbs/${opt.glb}.png`);
  const key = fam + '/' + opt.id;
  if (!THUMBS.has(key)) THUMBS.set(key, new Promise((res) => setTimeout(() => res(renderThumb(fam, opt)), 0)));
  return THUMBS.get(key);
}
function renderThumb(fam, opt) {
  if (!tr) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(128, 128); renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8577, 2.2));
    const d = new THREE.DirectionalLight(0xffffff, 1.6); d.position.set(3, 6, 5); scene.add(d);
    tr = { renderer, scene, cam: new THREE.PerspectiveCamera(30, 1, 0.1, 500) };
  }
  const f = FAMILIES[fam], b = new Batcher(), g = new THREE.Group();
  const ctx = { ceil: 0, hang: 2.4, w: 8, d: 10, h: 6.5, color: f.colors ? f.colors[0] : undefined, where: 'wall' };
  opt.build(new Kit(b, 'thumb').at(0, 0, 0, 0), ctx);
  b.build(g); tr.scene.add(g);
  const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3()), r = box.getSize(new THREE.Vector3()).length() / 2;
  const dir = f.place === 'ceiling' ? new THREE.Vector3(0.5, 0.15, 1) : new THREE.Vector3(0.55, 0.45, 1);
  tr.cam.position.copy(c).addScaledVector(dir.normalize(), r / Math.sin((15 * Math.PI) / 180)); tr.cam.lookAt(c);
  tr.renderer.render(tr.scene, tr.cam);
  const url = tr.renderer.domElement.toDataURL('image/png');
  tr.scene.remove(g); g.traverse((m) => m.geometry && m.geometry.dispose());
  return url;
}
