// Fixtures (kitchen, baths, fireplace, lights...) and staged furniture, built to real
// dimensions in feet. Components use a Kit (see geom.js): local x = width, z = depth with
// the front at +z, y = up. Wall-mounted pieces have their back at z = 0.
import { LEVELS, toFt } from './data.js';
import { Kit, V } from './geom.js';
import { renoBat } from './build.js';

const LV = Object.fromEntries(LEVELS.map((L) => [L.id, L]));
const P = (lv, x, y) => toFt(LV[lv].map(x, y));
const fab = (c) => 'fab:' + c;
const wood = (c) => 'wood:' + c;
const OAKCAB = 'cab', OAKDOOR = 'cabDoor', OAKPANEL = 'cabPanel'; // themeable cabinet finishes
const DARKWOOD = wood('#4e3324'), MIDWOOD = wood('#7a5234');

// ------------------------------------------------------------------ small parts
function knob(k, x, y, z) { k.cbox('brass', x, z + 0.03, 0.07, 0.06, y - 0.035, y + 0.035); }
function raisedPanel(k, x0, x1, y0, y1, z, key = OAKDOOR, pkey = OAKPANEL) {
  k.box(key, x0, y0, z, x1, y1, z + 0.06);
  const m = Math.min(0.2, (x1 - x0) * 0.18, (y1 - y0) * 0.18);
  k.box(pkey, x0 + m, y0 + m, z + 0.06, x1 - m, y1 - m, z + 0.09);
}
function tableLamp(k, x, z, y) {
  k.cyl('col:#d9d2c4', x, z, 0.22, 0.18, y, y + 0.9, 12);
  k.cyl('brass', x, z, 0.04, 0.04, y + 0.9, y + 1.3, 6);
  k.cyl('shade', x, z, 0.55, 0.4, y + 1.2, y + 2.0, 14, 1, false);
}
function floorLamp(k, x, z) {
  k.cyl('black', x, z, 0.5, 0.5, 0, 0.08, 12);
  k.cyl('black', x, z, 0.05, 0.05, 0.08, 4.8, 6);
  k.cyl('shade', x, z, 0.65, 0.5, 4.6, 5.6, 14, 1, false);
}
function plant(k, x, z, h = 5.5) {
  k.cyl('col:#d8d4cc', x, z, 0.55, 0.65, 0, 1.0, 12);
  k.cyl('col:#5a4a36', x, z, 0.06, 0.06, 1.0, h * 0.55, 5);
  for (let i = 0; i < 4; i++) {
    const yy = h * (0.45 + i * 0.14), r = 1.1 - i * 0.18;
    k.cyl(i % 2 ? 'col:#4f7a3a' : 'col:#3f6a31', x + (i % 2 ? 0.2 : -0.15), z + (i % 2 ? -0.1 : 0.15), r, r * 0.3, yy, yy + h * 0.2, 7);
  }
}


// darken/lighten a #hex color by factor f (e.g. 0.85 = 15% darker)
function shadeHex(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}
function taperLeg(k, key, x, z, h, r0 = 0.07, r1 = 0.1) { k.cyl(key, x, z, r0, r1, 0, h, 8); }

// ------------------------------------------------------------------ beds & bedroom
const BEDS = { king: [6.33, 6.67, 4.4], queen: [5.0, 6.67, 4.0], full: [4.5, 6.25, 3.8] }; // mattress w x l, headboard h
function bed(k, size, o = {}) {
  const [mw, ml, hh] = BEDS[size];
  const frame = o.frame || '#5b3a26', duvet = o.duvet || '#ece7dc', accent = o.accent || '#7d6a5a';
  const hb = o.headboard || '#cfc6b8';
  const W = mw + 0.35, z0 = 0.3, z1 = z0 + ml + 0.25;
  // channel-tufted upholstered headboard on wood legs
  k.box(wood(frame), -W / 2 - 0.05, 0, 0.05, -W / 2 + 0.12, 1.0, z0 - 0.05);
  k.box(wood(frame), W / 2 - 0.12, 0, 0.05, W / 2 + 0.05, 1.0, z0 - 0.05);
  k.soft(fab(hb), -W / 2 - 0.1, 0.95, 0, W / 2 + 0.1, hh, z0, 0.14);
  const ch = Math.max(4, Math.round(W / 1.1));
  for (let i = 1; i < ch; i++) { const x = -W / 2 + (W * i) / ch; k.box(fab(shadeHex(hb, 0.82)), x - 0.02, 1.15, z0 - 0.01, x + 0.02, hh - 0.18, z0 + 0.012); }
  // upholstered platform frame on tapered legs
  for (const [x, z] of [[-W / 2 + 0.2, z0 + 0.25], [W / 2 - 0.2, z0 + 0.25], [-W / 2 + 0.2, z1 - 0.25], [W / 2 - 0.2, z1 - 0.25]]) taperLeg(k, wood(frame), x, z, 0.45);
  k.soft(fab(o.base || hb), -W / 2, 0.42, z0, W / 2, 1.05, z1, 0.08);
  // mattress, duvet draped over the sides and foot, folded-back sheet
  k.soft(fab('#f4f2ed'), -mw / 2, 0.98, z0 + 0.08, mw / 2, 1.9, z1 - 0.08, 0.22);
  const dz0 = z0 + 1.6;
  k.soft(fab(duvet), -mw / 2 - 0.13, 1.22, dz0, mw / 2 + 0.13, 2.07, z1 + 0.05, 0.2);
  k.soft(fab('#fbfaf6'), -mw / 2 - 0.1, 1.84, dz0 - 0.38, mw / 2 + 0.1, 2.12, dz0 + 0.16, 0.13);
  k.soft(fab(accent), -mw / 2 - 0.17, 1.45, z1 - 1.6, mw / 2 + 0.17, 2.13, z1 - 0.55, 0.14); // throw
  // sleeping pillows, standing shams, throw pillows (slightly angled)
  const n = 2, pw = (mw - 0.2) / n;
  for (let i = 0; i < n; i++) {
    const x = -mw / 2 + 0.1 + pw * i;
    k.soft(fab('#fbfaf7'), x + 0.05, 1.84, z0 + 0.22, x + pw - 0.05, 2.36, z0 + 1.22, 0.24);
    k.soft(fab(o.sham || '#e2d8c9'), x + 0.1, 1.86, z0 + 0.1, x + pw - 0.1, 3.3, z0 + 0.5, 0.22);
  }
  const tp = Math.min(3, Math.floor(mw / 1.6));
  for (let i = 0; i < tp; i++) {
    const x = -((tp - 1) * 1.45) / 2 + i * 1.45;
    const p = k.P(x, 0, z0 + 1.42);
    const sub = new Kit(k.bat, k.tag).at(p.x, p.z, k.oy, k.rot + (i - (tp - 1) / 2) * 9);
    sub.soft(fab(i === Math.floor(tp / 2) ? accent : o.pillow || '#b49a7c'), -0.64, 1.88, -0.17, 0.64, 2.98, 0.17, 0.2);
  }
  k.solid(-W / 2 - 0.12, 0, W / 2 + 0.12, z1, 0, 2.2);
  return z1;
}

function nightstand(k, o = {}) {
  const w = 1.9, d = 1.5, h = 2.15, c = wood(o.color || '#5b3a26');
  for (const x of [-w / 2 + 0.12, w / 2 - 0.12]) for (const z of [0.12, d - 0.12]) taperLeg(k, c, x, z, 0.35, 0.05, 0.07);
  k.soft(c, -w / 2, 0.33, 0, w / 2, h - 0.08, d, 0.05);
  k.soft(c, -w / 2 - 0.03, h - 0.1, -0.02, w / 2 + 0.03, h, d + 0.03, 0.03);
  k.soft(wood(o.front || '#6d4630'), -w / 2 + 0.08, 1.5, d - 0.02, w / 2 - 0.08, 2.0, d + 0.04, 0.03);
  k.soft(wood(o.front || '#6d4630'), -w / 2 + 0.08, 0.45, d - 0.02, w / 2 - 0.08, 1.42, d + 0.04, 0.03);
  knob(k, 0, 1.75, d + 0.04);
  tableLamp(k, 0, d / 2, h);
  k.solid(-w / 2, 0, w / 2, d, 0, h);
}

function dresser(k, w, o = {}) {
  const d = 1.65, h = o.h || 2.9, c = wood(o.color || '#5b3a26'), f = wood(o.front || '#6b442d');
  k.box(c, -w / 2, 0.3, 0, w / 2, h, d);
  k.box(c, -w / 2 - 0.04, h, 0, w / 2 + 0.04, h + 0.08, d + 0.05);
  const cols = w > 4.6 ? 2 : 1, rows = 3;
  const cw = (w - 0.2) / cols, rh = (h - 0.5) / rows;
  for (let c2 = 0; c2 < cols; c2++) for (let r = 0; r < rows; r++) {
    const x0 = -w / 2 + 0.1 + c2 * cw, y0 = 0.4 + r * rh;
    k.box(f, x0 + 0.03, y0 + 0.03, d, x0 + cw - 0.03, y0 + rh - 0.03, d + 0.05);
    knob(k, x0 + cw / 2 - 0.4, y0 + rh / 2, d + 0.05); knob(k, x0 + cw / 2 + 0.4, y0 + rh / 2, d + 0.05);
  }
  if (o.mirror) {
    k.box(wood('#5b3a26'), -w * 0.35, h + 0.6, 0, w * 0.35, h + 3.6, 0.12);
    k.box('mirror', -w * 0.35 + 0.15, h + 0.75, 0.12, w * 0.35 - 0.15, h + 3.45, 0.14);
  }
  if (o.lamp) tableLamp(k, -w / 2 + 0.7, d / 2, h + 0.08);
  k.solid(-w / 2, 0, w / 2, d, 0, h);
}
function bench(k, w, d, color) {
  for (const x of [-w / 2 + 0.18, w / 2 - 0.18]) for (const z of [-d / 2 + 0.18, d / 2 - 0.18]) taperLeg(k, DARKWOOD, x, z, 1.1, 0.05, 0.08);
  k.soft(fab(color), -w / 2, 1.05, -d / 2, w / 2, 1.6, d / 2, 0.14);
  k.solid(-w / 2, -d / 2, w / 2, d / 2, 0, 1.6);
}

function desk(k, w = 4) {
  const d = 2, h = 2.5;
  k.box(wood('#f1ede4'), -w / 2, h - 0.12, 0, w / 2, h, d);
  k.box(wood('#f1ede4'), -w / 2, 0, 0, -w / 2 + 0.12, h - 0.12, d);
  k.box(wood('#f1ede4'), w / 2 - 0.12, 0, 0, w / 2, h - 0.12, d);
  k.box(wood('#f1ede4'), w / 2 - 1.5, 1.6, 0, w / 2 - 0.12, h - 0.12, d - 0.1);
  tableLamp(k, -w / 2 + 0.5, 0.5, h);
  k.solid(-w / 2, 0, w / 2, d, 0, h);
}

// ------------------------------------------------------------------ seating & tables
function sofa(k, len, o = {}) {
  const d = 3.15, base = fab(o.color || '#dcd3c6'), cush = fab(o.cushion || o.color || '#e3dbcf'), arm = 0.62;
  for (const x of [-len / 2 + 0.3, len / 2 - 0.3]) for (const z of [0.3, d - 0.3]) taperLeg(k, DARKWOOD, x, z, 0.4, 0.05, 0.08);
  k.soft(base, -len / 2, 0.38, 0.05, len / 2, 1.15, d, 0.12);                      // base
  k.soft(base, -len / 2 + 0.05, 0.9, 0, len / 2 - 0.05, 2.75, 0.85, 0.24);          // back frame
  k.soft(base, -len / 2, 0.9, 0.05, -len / 2 + arm, 2.12, d, 0.26);                 // rolled arms
  k.soft(base, len / 2 - arm, 0.9, 0.05, len / 2, 2.12, d, 0.26);
  const seats = len > 6.5 ? 3 : 2, sw = (len - 2 * arm) / seats;
  for (let i = 0; i < seats; i++) {
    const x = -len / 2 + arm + i * sw;
    k.soft(cush, x + 0.02, 1.05, 0.72, x + sw - 0.02, 1.58, d + 0.03, 0.16);       // seat cushion
    k.soft(cush, x + 0.04, 1.45, 0.6, x + sw - 0.04, 2.72, 1.25, 0.28);            // back cushion
  }
  const pc = o.pillows || ['#a77b6b', '#c9b49a', '#8d6e5d'];
  for (let i = 0; i < 2; i++) {
    const p = k.P((i ? 1 : -1) * (len / 2 - arm - 0.8), 0, 1.4);
    const sub = new Kit(k.bat, k.tag).at(p.x, p.z, k.oy, k.rot + (i ? -20 : 20));
    sub.soft(fab(pc[i % pc.length]), -0.66, 1.52, -0.17, 0.66, 2.8, 0.17, 0.22);
  }
  k.solid(-len / 2, 0, len / 2, d, 0, 2.85);
}

function armchair(k, o = {}) { // centered, faces +z
  const w = 2.7, d = 2.9, c = fab(o.color || '#ebe6dc');
  for (const x of [-w / 2 + 0.22, w / 2 - 0.22]) for (const z of [-d / 2 + 0.22, d / 2 - 0.22]) taperLeg(k, DARKWOOD, x, z, 0.5, 0.05, 0.08);
  k.soft(c, -w / 2, 0.48, -d / 2, w / 2, 1.2, d / 2, 0.12);
  k.soft(c, -w / 2 + 0.05, 1.0, -d / 2, w / 2 - 0.05, 2.85, -d / 2 + 0.6, 0.24);
  k.soft(c, -w / 2, 1.0, -d / 2, -w / 2 + 0.45, 2.2, d / 2, 0.2);
  k.soft(c, w / 2 - 0.45, 1.0, -d / 2, w / 2, 2.2, d / 2, 0.2);
  k.soft(c, -w / 2 + 0.43, 1.1, -d / 2 + 0.5, w / 2 - 0.43, 1.6, d / 2 + 0.02, 0.15);
  if (o.pillow) k.soft(fab(o.pillow), -0.6, 1.55, -d / 2 + 0.58, 0.6, 2.62, -d / 2 + 0.92, 0.2);
  k.solid(-w / 2, -d / 2, w / 2, d / 2, 0, 2.8);
}

function coffeeTable(k, w = 4, d = 2, color = '#cbbba5') {
  k.soft(wood(color), -w / 2, 1.28, -d / 2, w / 2, 1.44, d / 2, 0.05);
  k.soft(wood(color), -w / 2, 0, -d / 2, -w / 2 + 0.14, 1.32, d / 2, 0.04);
  k.soft(wood(color), w / 2 - 0.14, 0, -d / 2, w / 2, 1.32, d / 2, 0.04);
  k.cyl('col:#e9e5dc', 0.3, 0, 0.22, 0.28, 1.44, 1.95, 12);
  k.cyl('col:#e9e5dc', 0.3, 0, 0.28, 0.12, 1.95, 2.35, 12);
  k.cyl('col:#cfc7b8', -0.9, 0.15, 0.45, 0.4, 1.44, 1.6, 16);
  k.solid(-w / 2, -d / 2, w / 2, d / 2, 0, 1.44);
}

function sideTable(k, s = 1.6) {
  k.cyl(wood('#5b3a26'), 0, 0, s / 2, s / 2, 1.85, 1.95, 20);
  k.cyl(wood('#5b3a26'), 0, 0, 0.08, 0.1, 0.1, 1.85, 8);
  k.cyl(wood('#5b3a26'), 0, 0, 0.5, 0.55, 0, 0.1, 16);
  tableLamp(k, 0, 0, 1.95);
  k.solid(-s / 2, -s / 2, s / 2, s / 2, 0, 1.95);
}

function rug(k, w, d, field, border) {
  k.box(fab(border), -w / 2, 0.003, -d / 2, w / 2, 0.025, d / 2);
  k.box(fab(field), -w / 2 + 0.5, 0.004, -d / 2 + 0.5, w / 2 - 0.5, 0.028, d / 2 - 0.5);
}
function chair(k, color = '#a59f94', woodc = '#6b4a33') { // dining chair, centered, faces +z
  const w = 1.55, d = 1.65;
  for (const x of [-w / 2 + 0.12, w / 2 - 0.12]) for (const z of [-d / 2 + 0.12, d / 2 - 0.12]) taperLeg(k, wood(woodc), x, z, 1.48, 0.05, 0.07);
  k.soft(fab(color), -w / 2, 1.42, -d / 2, w / 2, 1.72, d / 2, 0.1);
  k.soft(fab(color), -w / 2 + 0.04, 1.65, -d / 2 - 0.02, w / 2 - 0.04, 3.15, -d / 2 + 0.26, 0.11);
}

function diningTable(k, w, d, o = {}) { // centered; long side along local x
  const top = wood(o.color || '#6b4a33');
  k.soft(top, -w / 2, 2.36, -d / 2, w / 2, 2.5, d / 2, 0.05);
  k.box(top, -w / 2 + 0.3, 2.1, -d / 2 + 0.3, w / 2 - 0.3, 2.38, d / 2 - 0.3);
  for (const x of [-w / 2 + 0.4, w / 2 - 0.4]) for (const z of [-d / 2 + 0.4, d / 2 - 0.4]) k.cbox(top, x, z, 0.25, 0.25, 0, 2.1);
  k.solid(-w / 2, -d / 2, w / 2, d / 2, 0, 2.5);
  const chairs = [];
  const n = Math.max(1, Math.round((w - 1) / 2.3));
  for (let i = 0; i < n; i++) {
    const x = -((n - 1) * 2.2) / 2 + i * 2.2;
    chairs.push([x, d / 2 + 0.55, 180], [x, -d / 2 - 0.55, 0]);
  }
  chairs.push([w / 2 + 0.55, 0, -90], [-w / 2 - 0.55, 0, 90]);
  return chairs; // in table-local coords
}
function roundTable(k, r, o = {}) {
  const top = wood(o.color || '#f1efea');
  k.cyl(top, 0, 0, r, r, 2.4, 2.5, 24);
  k.cyl(o.base ? wood(o.base) : top, 0, 0, 0.12, 0.12, 0.1, 2.4, 10);
  k.cyl(o.base ? wood(o.base) : top, 0, 0, 0.9, 0.7, 0, 0.1, 16);
  k.solid(-r * 0.75, -r * 0.75, r * 0.75, r * 0.75, 0, 2.5);
  return [0, 90, 180, 270].map((a) => [Math.sin((a * Math.PI) / 180) * (r + 0.45), Math.cos((a * Math.PI) / 180) * (r + 0.45), a + 180]);
}
function buffet(k, w = 5) {
  const d = 1.6, h = 2.9;
  k.box(DARKWOOD, -w / 2, 0.4, 0, w / 2, h, d);
  for (const x of [-w / 2 + 0.15, w / 2 - 0.15]) for (const z of [0.15, d - 0.15]) k.cbox(DARKWOOD, x, z, 0.15, 0.15, 0, 0.4);
  const n = 3, cw = (w - 0.2) / n;
  for (let i = 0; i < n; i++) raisedPanel(k, -w / 2 + 0.1 + i * cw + 0.03, -w / 2 + 0.1 + (i + 1) * cw - 0.03, 0.5, h - 0.1, d, wood('#5d3e2b'), wood('#6d4a33'));
  k.cyl('col:#2e2e2e', -1.4, 0.8, 0.35, 0.25, h, h + 1.3, 12);
  k.solid(-w / 2, 0, w / 2, d, 0, h);
}
function loungeChair(k, color) { // sun room chair
  armchair(k, { color });
}

// ------------------------------------------------------------------ basement & garage
function poolTable(k) { // centered, 8 ft table (outer 4.6 x 8.3), long side along local x
  const W = 8.3, D = 4.6, felt = 'felt', rail = wood('#4b2c1c');
  for (const x of [-W / 2 + 0.5, W / 2 - 0.5]) for (const z of [-D / 2 + 0.5, D / 2 - 0.5]) k.cbox(rail, x, z, 0.5, 0.5, 0, 2.2);
  k.box(rail, -W / 2 + 0.15, 1.95, -D / 2 + 0.15, W / 2 - 0.15, 2.5, D / 2 - 0.15);
  k.box(felt, -W / 2 + 0.4, 2.5, -D / 2 + 0.4, W / 2 - 0.4, 2.55, D / 2 - 0.4);
  k.box(rail, -W / 2, 2.5, -D / 2, W / 2, 2.72, -D / 2 + 0.4);
  k.box(rail, -W / 2, 2.5, D / 2 - 0.4, W / 2, 2.72, D / 2);
  k.box(rail, -W / 2, 2.5, -D / 2 + 0.4, -W / 2 + 0.4, 2.72, D / 2 - 0.4);
  k.box(rail, W / 2 - 0.4, 2.5, -D / 2 + 0.4, W / 2, 2.72, D / 2 - 0.4);
  k.cyl('porcelain', 1.8, 0.2, 0.1, 0.1, 2.55, 2.75, 8);
  k.cyl('col:#b8282c', 2.1, -0.3, 0.1, 0.1, 2.55, 2.75, 8);
  k.solid(-W / 2, -D / 2, W / 2, D / 2, 0, 2.72);
}
function car(k, color) { // centered, length along local z, front at +z
  const W = 6.1, L = 15.6, body = 'col:' + color;
  const lower = [[-L / 2, 1.0], [L / 2 - 0.3, 1.0], [L / 2, 1.6], [L / 2 - 0.2, 2.55], [L / 2 - 3.2, 2.95], [-L / 2 + 0.6, 3.05], [-L / 2, 2.6]];
  k.prof(body, lower, -W / 2, W / 2);
  const cabin = [[L / 2 - 3.5, 2.95], [1.9, 4.55], [-3.9, 4.6], [-L / 2 + 0.9, 3.05]];
  k.prof('col:#2a323a', cabin, -W / 2 + 0.35, W / 2 - 0.35, body);
  k.box(body, -W / 2 + 0.45, 4.55, -3.7, W / 2 - 0.45, 4.65, 1.8);
  for (const z of [L / 2 - 2.8, -L / 2 + 2.6]) for (const s of [-1, 1]) {
    const oct = [...Array(10)].map((_, i) => [z + Math.cos((i / 10) * Math.PI * 2) * 1.1, 1.1 + Math.sin((i / 10) * Math.PI * 2) * 1.1]);
    k.prof('black', oct, s > 0 ? W / 2 - 0.75 : -W / 2 - 0.05, s > 0 ? W / 2 + 0.05 : -W / 2 + 0.75);
    const hub = oct.map(([zz, yy]) => [z + (zz - z) * 0.55, 1.1 + (yy - 1.1) * 0.55]);
    k.prof('chrome', hub, s > 0 ? W / 2 + 0.05 : -W / 2 - 0.08, s > 0 ? W / 2 + 0.08 : -W / 2 - 0.05);
  }
  for (const s of [-1, 1]) {
    k.box('col:#f3f1e2', s * (W / 2 - 1.0) - 0.6, 2.0, L / 2 - 0.1, s * (W / 2 - 1.0) + 0.6, 2.35, L / 2 + 0.02);
    k.box('col:#a3161c', s * (W / 2 - 0.9) - 0.6, 2.2, -L / 2 - 0.02, s * (W / 2 - 0.9) + 0.6, 2.55, -L / 2 + 0.05);
  }
  k.solid(-W / 2, -L / 2, W / 2, L / 2, 0, 4.6);
}
function shelving(k, w = 6, d = 1.5, h = 6) {
  for (const x of [-w / 2, w / 2 - 0.1]) for (const z of [0.05, d - 0.1]) k.box('col:#7b7f82', x, 0, z, x + 0.1, h, z + 0.05);
  for (let y = 0.4; y < h; y += 1.4) k.box('col:#9aa0a3', -w / 2, y, 0, w / 2, y + 0.06, d);
  const boxes = ['#b88b5c', '#c79d6e', '#9c7650', '#e6e1d8'];
  for (let y = 0.46, i = 0; y < h - 1; y += 1.4) for (let x = -w / 2 + 0.3; x < w / 2 - 1.2; x += 1.5, i++) if ((i * 7) % 3) k.box('col:' + boxes[i % 4], x, y, 0.15, x + 1.2, y + 0.9, d - 0.15);
  k.solid(-w / 2, 0, w / 2, d, 0, h);
}


// ------------------------------------------------------------------ gym (scale: feet)
const IRON = 'col:#1e1e20', RUBBER = 'col:#202022';
function disc(k, x, y, z, r, th, key = RUBBER, seg = 18) { // vertical disc facing local x
  const pts = [...Array(seg)].map((_, i) => [z + Math.cos((i / seg) * Math.PI * 2) * r, y + Math.sin((i / seg) * Math.PI * 2) * r]);
  k.prof(key, pts, x - th / 2, x + th / 2);
}
function bar(k, x0, x1, y, z, r = 0.05, key = 'chrome') { // horizontal bar along local x
  const pts = [...Array(8)].map((_, i) => [z + Math.cos((i / 8) * Math.PI * 2) * r, y + Math.sin((i / 8) * Math.PI * 2) * r]);
  k.prof(key, pts, x0, x1);
}
function rubberFloor(k, w, d) {
  k.box(RUBBER, -w / 2, 0.005, -d / 2, w / 2, 0.045, d / 2);
  for (let x = -w / 2 + 4; x < w / 2; x += 4) k.box('col:#151516', x - 0.015, 0.045, -d / 2, x + 0.015, 0.047, d / 2);
  for (let z = -d / 2 + 4; z < d / 2; z += 4) k.box('col:#151516', -w / 2, 0.045, z - 0.015, w / 2, 0.047, z + 0.015);
}
function powerRack(k) { // back against the wall at z = 0; 4 ft wide, 4 ft deep, 7.5 ft tall
  for (const x of [-1.85, 1.85]) {
    for (const z of [0.35, 3.75]) k.cbox(IRON, x, z, 0.25, 0.25, 0, 7.5);
    k.box(IRON, x - 0.13, 0, 0.1, x + 0.13, 0.25, 4.0);                 // foot
    k.box(IRON, x - 0.13, 7.25, 0.35, x + 0.13, 7.5, 3.75);             // top side rail
    k.box('chrome', x - 0.08, 2.2, 0.5, x + 0.08, 2.35, 3.9);           // safety arm
    k.box(IRON, x - 0.1, 4.35, 3.75, x + 0.1, 4.45, 4.05);               // J-hook
    k.box(IRON, x - 0.1, 4.45, 3.95, x + 0.1, 4.62, 4.05);
  }
  k.box(IRON, -1.85, 7.25, 0.22, 1.85, 7.5, 0.48);
  bar(k, -1.85, 1.85, 7.05, 3.85, 0.05, IRON);                             // pull-up bar
  bar(k, -3.6, 3.6, 4.55, 3.95, 0.05);                                     // 7.2 ft Olympic bar
  for (const sx of [-1, 1]) {
    bar(k, sx * 2.15, sx * 3.6, 4.55, 3.95, 0.085);
    disc(k, sx * 2.3, 4.55, 3.95, 0.74, 0.2);                             // 45 lb plates (17.7" dia)
    disc(k, sx * 2.52, 4.55, 3.95, 0.55, 0.16);                           // 25s
    // plate storage horns on the back uprights
    bar(k, sx * 1.98, sx * 2.6, 1.3, 0.35, 0.07, IRON);
    for (let i = 0; i < 3; i++) disc(k, sx * (2.1 + i * 0.17), 1.3, 0.35, i ? 0.74 : 0.74, 0.15);
    bar(k, sx * 1.98, sx * 2.6, 3.1, 0.35, 0.07, IRON);
    for (let i = 0; i < 2; i++) disc(k, sx * (2.1 + i * 0.15), 3.1, 0.35, 0.37, 0.12);
  }
  k.solid(-2.6, 0, 2.6, 4.05, 0, 7.5);
}
function liftBench(k) { // centered, adjustable FID bench: 4.3 ft long (z), 1.6 ft wide
  k.box(IRON, -0.12, 0, -2.1, 0.12, 0.2, 2.1);
  k.box(IRON, -0.8, 0, -2.0, 0.8, 0.15, -1.75); k.box(IRON, -0.8, 0, 1.75, 0.8, 0.15, 2.0);
  k.box(IRON, -0.1, 0.2, -1.6, 0.1, 1.35, -1.4); k.box(IRON, -0.1, 0.2, 1.4, 0.1, 1.35, 1.6);
  k.box(IRON, -0.15, 1.3, -1.9, 0.15, 1.42, 1.9);
  k.box('col:#151515', -0.48, 1.42, -1.95, 0.48, 1.68, -0.85);  // seat pad
  k.box('col:#151515', -0.48, 1.42, -0.75, 0.48, 1.68, 1.95);   // back pad
  k.solid(-0.8, -2.1, 0.8, 2.1, 0, 1.7);
}
function dumbbellRack(k, len = 5.5) { // back at z = 0; two angled tiers of hex dumbbells, 5-50 lb
  for (const x of [-len / 2 + 0.1, 0, len / 2 - 0.1]) {
    k.box(IRON, x - 0.08, 0, 0.1, x + 0.08, 0.15, 1.9);
    k.prof(IRON, [[0.3, 0.15], [0.5, 0.15], [0.5, 2.7], [0.3, 2.7]], x - 0.08, x + 0.08);
    k.prof(IRON, [[1.5, 0.15], [1.7, 0.15], [1.7, 1.75], [1.5, 1.75]], x - 0.08, x + 0.08);
  }
  for (const [y, z] of [[2.6, 0.4], [1.65, 1.6]]) k.box(IRON, -len / 2, y, z - 0.35, len / 2, y + 0.1, z + 0.35);
  const n = 5;
  for (let tier = 0; tier < 2; tier++) {
    const [y, z] = tier ? [2.7, 0.4] : [1.75, 1.6];
    for (let i = 0; i < n * 2; i++) {
      const weight = 5 + (tier * n + Math.floor(i / 2)) * 5;           // pairs from 5 to 50 lb
      const hr = 0.17 + weight * 0.0028, hl = 0.18 + weight * 0.003;
      const x = -len / 2 + 0.35 + i * ((len - 0.7) / (n * 2 - 1));
      const sub = new Kit(k.bat, k.tag);
      const p = k.P(x, 0, z);
      sub.at(p.x, p.z, k.oy, k.rot + 90);                                // local x now runs front-to-back
      const hex = (zz) => [...Array(6)].map((_, j) => [zz + Math.cos((j / 6) * Math.PI * 2) * hr, y + hr + Math.sin((j / 6) * Math.PI * 2) * hr]);
      sub.prof(RUBBER, hex(0), -0.42 - hl, -0.42);
      sub.prof(RUBBER, hex(0), 0.42, 0.42 + hl);
      bar(sub, -0.42, 0.42, y + hr, 0, 0.055);
    }
  }
  k.solid(-len / 2, 0, len / 2, 1.9, 0, 2.9);
}
function pelotonBike(k) { // centered; 4 ft long (front +z), 2 ft wide, screen at the front
  k.box(IRON, -0.95, 0, -1.75, 0.95, 0.15, -1.45); k.box(IRON, -0.95, 0, 1.45, 0.95, 0.15, 1.75);
  k.prof(IRON, [[-1.55, 0.15], [-1.25, 0.15], [0.9, 2.3], [0.6, 2.4]], -0.1, 0.1);   // main frame
  k.prof(IRON, [[1.45, 0.15], [1.75, 0.15], [0.9, 2.3], [0.7, 2.1]], -0.1, 0.1);
  k.box(IRON, -0.06, 2.0, -1.0, 0.06, 3.0, -0.85);                                      // seat post
  k.prof('col:#111111', [[-1.4, 3.0], [-0.55, 3.0], [-0.8, 3.18], [-1.4, 3.15]], -0.32, 0.32); // saddle
  k.box(IRON, -0.06, 2.3, 0.9, 0.06, 3.7, 1.05);                                        // handlebar post
  k.box(IRON, -0.75, 3.6, 0.85, 0.75, 3.72, 1.15);                                      // handlebar
  disc(k, 0, 1.25, 1.0, 0.68, 0.2, 'col:#2b2b2d');                                      // flywheel (with red guard)
  disc(k, 0, 1.25, 1.0, 0.72, 0.12, 'col:#c42a2a');
  k.box(IRON, -0.05, 3.7, 1.25, 0.05, 4.1, 1.35);
  k.box('black', -0.9, 4.05, 1.3, 0.9, 5.15, 1.42);                                     // 22" touchscreen
  k.box('col:#1a2735', -0.82, 4.12, 1.42, 0.82, 5.08, 1.43);
  for (const s of [-1, 1]) k.box(IRON, s * 0.45, 1.1, 0.35, s * 0.45 + s * 0.35, 1.18, 0.6);           // pedals
  k.solid(-1, -1.75, 1, 1.75, 0, 4);
}
function bodyPumpArea(k) { // centered: mat, step with risers, BodyPump bar with color plates, plate rack
  k.box('col:#3a3d40', -3.2, 0.045, -2.0, 3.2, 0.09, 2.0);
  k.box('col:#3d3f42', -1.8, 0.09, -1.75, 1.8, 0.5, -1.0); k.box('col:#7b8287', -1.75, 0.5, -1.72, 1.75, 0.62, -1.03); // step
  bar(k, -2.3, 2.3, 0.55, 0.6, 0.05);                                                      // 4.6 ft bar on the floor
  for (const sx of [-1, 1]) {
    disc(k, sx * 1.8, 0.55, 0.6, 0.52, 0.12, 'col:#c33b2e');
    disc(k, sx * 1.95, 0.55, 0.6, 0.42, 0.1, 'col:#2f6db5');
    disc(k, sx * 2.08, 0.55, 0.6, 0.32, 0.08, 'col:#e1b12c');
    k.cbox('col:#c33b2e', sx * 2.18, 0.6, 0.12, 0.25, 0.47, 0.6);                          // collar
  }
  // plate tree with BodyPump plates
  k.cbox(IRON, 2.6, 1.3, 1.3, 1.0, 0.09, 0.2);
  k.cbox(IRON, 2.6, 1.3, 0.12, 0.12, 0.2, 2.6);
  for (const [y, r, c] of [[0.85, 0.52, '#c33b2e'], [1.6, 0.42, '#2f6db5'], [2.2, 0.32, '#e1b12c']]) {
    bar(k, 2.4, 2.8, y, 1.3, 0.04, IRON);
    disc(k, 2.42, y, 1.3, r, 0.1, 'col:' + c); disc(k, 2.78, y, 1.3, r, 0.1, 'col:' + c);
  }
  k.solid(-1.8, -1.75, 1.8, -1.0, 0, 0.62);
  k.solid(2.1, 0.8, 3.1, 1.8, 0, 2.6);
}

function projectionScreen(k, inches = 110) { // back at z = 0
  const w = inches * 0.0727, h = inches * 0.0409, y0 = 2.0;
  k.box('black', -w / 2 - 0.2, y0 - 0.2, 0, w / 2 + 0.2, y0 + h + 0.2, 0.12);
  k.box('screen', -w / 2, y0, 0.12, w / 2, y0 + h, 0.14);
  k.box(wood('#4b3426'), -2.5, 0, 0, 2.5, 1.6, 1.4);
  k.solid(-2.5, 0, 2.5, 1.4, 0, 1.6);
}
function towerSpeaker(k) {
  k.box(wood('#5a3423'), -0.45, 0, 0, 0.45, 3.6, 1.1);
  k.box('black', -0.4, 0.3, 1.1, 0.4, 3.4, 1.12);
  k.solid(-0.45, 0, 0.45, 1.1, 0, 3.6);
}
function treadmill(k) { // centered, 6.5 ft long (z), 2.8 ft wide
  k.box(IRON, -1.4, 0, -3.25, 1.4, 0.55, 2.4);
  k.box('col:#2c2c2c', -0.95, 0.55, -3.1, 0.95, 0.62, 2.2);
  for (const s of [-1, 1]) { k.box(IRON, s * 1.3 - 0.1, 0.55, 2.2, s * 1.3 + 0.1, 4.2, 2.4); k.box(IRON, s * 1.3 - 0.08, 3.3, 1.2, s * 1.3 + 0.08, 3.4, 2.4); }
  k.box(IRON, -1.4, 3.9, 2.25, 1.4, 4.7, 2.55);
  k.box('col:#1a2735', -0.9, 4.0, 2.2, 0.9, 4.6, 2.25);
  k.solid(-1.4, -3.25, 1.4, 2.55, 0, 4.7);
}
// ------------------------------------------------------------------ TV & office
function wallTV(k, inches = 65) { // back at z = 0
  const w = inches * 0.0727, h = inches * 0.0409, y0 = 3.3;
  k.box('black', -0.6, y0 + h / 2 - 0.4, 0, 0.6, y0 + h / 2 + 0.4, 0.12);
  k.box('black', -w / 2, y0, 0.12, w / 2, y0 + h, 0.27);
  k.box('col:#10161d', -w / 2 + 0.06, y0 + 0.06, 0.27, w / 2 - 0.06, y0 + h - 0.06, 0.275);
}
function mediaConsole(k, w = 5.5) {
  const d = 1.4, h = 1.8, c = wood('#4b3426');
  k.box(c, -w / 2, 0.3, 0, w / 2, h, d);
  for (const x of [-w / 2 + 0.15, w / 2 - 0.15]) for (const z of [0.15, d - 0.15]) k.cbox(c, x, z, 0.12, 0.12, 0, 0.3);
  for (let i = 0; i < 3; i++) { const a = -w / 2 + 0.1 + i * ((w - 0.2) / 3); k.box(wood('#5a3f2e'), a + 0.03, 0.4, d, a + (w - 0.2) / 3 - 0.03, h - 0.1, d + 0.04); }
  k.box('black', -1.5, h, 0.3, 1.5, h + 0.25, 0.7);                                      // soundbar
  k.solid(-w / 2, 0, w / 2, d, 0, h);
}
function officeDesk(k, w = 5.5) { // back at z = 0
  const d = 2.5, h = 2.5, c = wood('#5a3a26'), f = wood('#6b4630');
  k.box(c, -w / 2, h - 0.12, 0, w / 2, h, d);
  k.box(c, w / 2 - 1.45, 0, 0.1, w / 2 - 0.05, h - 0.12, d - 0.05);
  for (const [y0, y1] of [[0.15, 0.95], [1.0, 1.65], [1.7, 2.3]]) { k.box(f, w / 2 - 1.4, y0, d - 0.05, w / 2 - 0.1, y1, d - 0.01); knob(k, w / 2 - 0.75, (y0 + y1) / 2, d - 0.01); }
  k.box(c, -w / 2 + 0.05, 0, 0.1, -w / 2 + 0.2, h - 0.12, d - 0.05);
  k.box(c, -w / 2 + 0.2, 0.9, 0.1, w / 2 - 1.45, h - 0.12, 0.2);
  k.cbox('black', 0, 0.55, 0.9, 0.5, h, h + 0.05); k.cbox('black', 0, 0.55, 0.12, 0.12, h + 0.05, h + 0.6);
  k.box('black', -1.0, h + 0.5, 0.5, 1.0, h + 1.7, 0.6);                                  // 27" monitor
  k.box('col:#1a2735', -0.95, h + 0.55, 0.6, 0.95, h + 1.65, 0.61);
  k.box('col:#2a2a2a', -0.7, h, 1.3, 0.7, h + 0.06, 1.75);                                // keyboard
  k.box('col:#2a2a2a', 0.95, h, 1.45, 1.15, h + 0.06, 1.75);
  tableLamp(k, -w / 2 + 0.6, 0.6, h);
  k.solid(-w / 2, 0, w / 2, d, 0, h);
}
function officeChair(k) { // centered, faces +z
  for (let i = 0; i < 5; i++) {
    const sub = new Kit(k.bat, k.tag).at(k.ox, k.oz, k.oy, k.rot + i * 72);
    sub.box('black', -0.05, 0.15, 0, 0.05, 0.28, 1.15);
    sub.cyl('black', 0, 1.1, 0.1, 0.1, 0, 0.15, 8);
  }
  k.cyl('chrome', 0, 0, 0.08, 0.08, 0.28, 1.45, 8);
  k.soft('col:#2b2b2b', -0.85, 1.42, -0.8, 0.85, 1.8, 0.85, 0.14);
  k.soft('col:#2b2b2b', -0.8, 1.9, -0.98, 0.8, 3.75, -0.72, 0.16);
  k.box('black', -0.08, 1.6, -0.9, 0.08, 2.0, -0.75);
  for (const s of [-1, 1]) { k.box('black', s * 0.85 - 0.06, 1.75, -0.4, s * 0.85 + 0.06, 2.4, -0.3); k.box('black', s * 0.85 - 0.12, 2.4, -0.5, s * 0.85 + 0.12, 2.48, 0.35); }
  k.solid(-1, -1, 1, 1, 0, 3.7);
}
function bookcase(k, w = 2.8, h = 6.5, seed = 3) { // back at z = 0
  const d = 1.05, c = wood('#5a3a26');
  k.box(c, -w / 2, 0, 0, -w / 2 + 0.08, h, d); k.box(c, w / 2 - 0.08, 0, 0, w / 2, h, d);
  k.box(c, -w / 2, 0, 0, w / 2, h, 0.05); k.box(c, -w / 2, h - 0.1, 0, w / 2, h, d);
  const cols = ['#7a2e2a', '#2d4a6b', '#c9b48a', '#3f5a3c', '#e3dccb', '#5b4a7a', '#b07a3a', '#262626'];
  let r = seed;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  for (let y = 0.3; y < h - 0.6; y += 1.25) {
    k.box(c, -w / 2, y - 0.06, 0, w / 2, y, d);
    let x = -w / 2 + 0.12;
    while (x < w / 2 - 0.4) {
      const bw = 0.08 + rnd() * 0.1, bh = 0.7 + rnd() * 0.35;
      if (rnd() < 0.1) { x += 0.3; continue; }
      k.box('col:' + cols[Math.floor(rnd() * cols.length)], x, y, 0.15, x + bw, y + bh, 0.15 + 0.6 + rnd() * 0.15);
      x += bw + 0.01;
    }
  }
  k.solid(-w / 2, 0, w / 2, d, 0, h);
}
// ------------------------------------------------------------------ closet clothes
function hangingClothes(k, len, seed, mix, opts = {}) { // rod at z ~0.9 from a wall at z = 0, rod height 5.35
  let r = seed;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  const shirts = ['#f4f4f2', '#a9c4de', '#2e3d55', '#d9d2c3', '#8c2f39', '#6b7f5d', '#e6e0d4', '#3a3a3a', '#c58b5d', '#9db7c9'];
  const dresses = ['#2b2b2b', '#7a1f2b', '#2c4a6e', '#c2a585', '#5b6b4f', '#d5b8c8', '#efe8da'];
  const coats = ['#2b2f36', '#5a4636', '#8a7d6a', '#1f2a3d', '#6b2e2e', '#3c3c3c', '#b39b78'];
  const rodY = 5.35, zc = 0.9;
  let x = 0.35;
  while (x < len - 0.35) {
    const kind = opts.coats ? 'coat' : rnd() < mix ? 'dress' : rnd() < 0.2 ? 'pants' : 'shirt';
    const top = rodY - 0.12, th = kind === 'coat' ? 0.24 : kind === 'pants' ? 0.14 : 0.1;
    const pal = kind === 'dress' ? dresses : kind === 'coat' ? coats : shirts;
    const c = 'fab:' + pal[Math.floor(rnd() * pal.length)];
    k.box('col:#c9a36b', x - 0.02, top - 0.04, zc - 0.68, x + 0.02, top + 0.02, zc + 0.68);      // hanger
    k.box('chrome', x - 0.01, top, zc - 0.02, x + 0.01, rodY + 0.08, zc + 0.02);
    let prof;
    if (kind === 'shirt') { const L = 2.35 + rnd() * 0.25; prof = [[-0.2, top], [0.2, top], [0.74, top - 0.22], [0.7, top - L], [-0.7, top - L], [-0.74, top - 0.22]]; }
    else if (kind === 'coat') { const L = 3.2 + rnd() * 0.5; prof = [[-0.24, top], [0.24, top], [0.82, top - 0.26], [0.8, top - L], [-0.8, top - L], [-0.82, top - 0.26]]; }
    else if (kind === 'pants') { prof = [[-0.62, top - 0.02], [0.62, top - 0.02], [0.6, top - 2.3], [-0.6, top - 2.3]]; }
    else { const L = 3.4 + rnd() * 0.9; prof = [[-0.18, top], [0.18, top], [0.58, top - 0.22], [0.42, top - 1.15], [0.85, top - L], [-0.85, top - L], [-0.42, top - 1.15], [-0.58, top - 0.22]]; }
    k.prof(c, prof.map(([z, y]) => [zc + z, y]), x - th / 2, x + th / 2);
    x += th + 0.1 + rnd() * 0.08;
  }
  // folded sweaters on the shelf above, shoes on the floor
  for (let sx = 0.4; sx < len - 1.2; sx += 1.5) for (let j = 0; j < 3; j++) k.soft('fab:' + shirts[(Math.floor(sx) + j * 3) % shirts.length], sx, 5.66 + j * 0.2, 0.15, sx + 1.0, 5.86 + j * 0.2, 1.0, 0.06);
  for (let sx = 0.4; sx < len - 0.6; sx += 0.8) { const c = 'col:' + ['#3b2a20', '#111111', '#7a5a3a', '#c9c2b5'][Math.floor(sx * 3) % 4]; k.box(c, sx, 0, 0.3, sx + 0.3, 0.35, 1.25); k.box(c, sx + 0.35, 0, 0.3, sx + 0.65, 0.35, 1.25); }
}

function linenShelves(k, len, seed = 5) { // back at z = 0: four shelves of folded towels and sheets
  const cols = ['#f4f2ec', '#dfe4e6', '#b9c8d4', '#e8dccb', '#9fb0a0', '#f4f2ec'];
  let r = seed;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  for (const y of [1.4, 2.9, 4.4, 5.9]) {
    k.box('white', 0, y - 0.06, 0, len, y, 1.4);
    for (let x = 0.15; x < len - 0.9; x += 1.05) {
      const c = 'fab:' + cols[Math.floor(rnd() * cols.length)], n = 2 + Math.floor(rnd() * 3);
      for (let j = 0; j < n; j++) k.soft(c, x, y + j * 0.22, 0.2, x + 0.95, y + j * 0.22 + 0.21, 1.2, 0.07);
    }
  }
}
// ------------------------------------------------------------------ patio
function firePit(k) { // centered, 3.5 ft stone fire pit
  k.cyl('col:#8b8073', 0, 0, 1.75, 1.7, 0, 1.1, 20);
  k.cyl('col:#a39785', 0, 0, 1.85, 1.85, 1.1, 1.25, 20);
  k.cyl('col:#2a2523', 0, 0, 1.3, 1.3, 1.25, 1.26, 20);
  k.cyl('ember', 0, 0, 0.8, 0.8, 1.26, 1.3, 14);
  for (let i = 0; i < 4; i++) { const sub = new Kit(k.bat, k.tag).at(k.ox, k.oz, k.oy, i * 45); sub.box('col:#4b3426', -0.9, 1.3, -0.12, 0.9, 1.5, 0.12); }
  for (const [x, z, h] of [[0, 0, 1.0], [0.3, 0.2, 0.7], [-0.3, -0.15, 0.8]]) k.cyl('flame', x, z, 0.28, 0.02, 1.4, 1.4 + h, 7);
  k.solid(-1.85, -1.85, 1.85, 1.85, 0, 1.25);
}
function adirondack(k, color = '#1f2d4d') { // centered, faces +z: slanted seat, fanned back, wide arms
  const c = 'wood:' + color;
  for (const s of [-1, 1]) {
    k.prof(c, [[1.25, 0], [1.25, 1.35], [1.05, 1.35], [1.05, 0]], s * 1.05 - 0.08, s * 1.05 + 0.08);   // front legs
    k.prof(c, [[-1.3, 0], [-1.0, 0], [1.2, 1.15], [1.2, 1.35]], s * 1.05 - 0.06, s * 1.05 + 0.06);     // side stringer
    k.box(c, s * 1.05 - 0.25, 2.0, -0.75, s * 1.05 + 0.25, 2.1, 1.45);                                // arm
  }
  k.prof(c, [[1.15, 1.3], [1.15, 1.45], [-0.6, 1.0], [-0.6, 0.85]], -0.95, 0.95);                     // seat
  for (let i = 0; i < 5; i++) { const x = -0.8 + i * 0.4; k.prof(c, [[-0.55, 0.9], [-0.35, 0.95], [-1.25, 3.3 + (2 - Math.abs(i - 2)) * 0.18], [-1.45, 3.2 + (2 - Math.abs(i - 2)) * 0.18]], x - 0.16, x + 0.16); }
  k.solid(-1.3, -1.3, 1.3, 1.45, 0, 3.3);
}
function patioDining(k) { // centered: 48" round table, umbrella, four chairs
  k.cyl('glass', 0, 0, 2.0, 2.0, 2.38, 2.45, 24);
  k.cyl('black', 0, 0, 2.02, 2.02, 2.3, 2.38, 24, 1, false);
  for (let i = 0; i < 4; i++) { const sub = new Kit(k.bat, k.tag).at(k.ox, k.oz, k.oy, 45 + i * 90); sub.box('black', -0.05, 0, 1.3, 0.05, 2.3, 1.4); }
  k.cyl('col:#e8e2d4', 0, 0, 0.06, 0.06, 0, 7.6, 8);
  k.cyl('fab:#c8b28e', 0, 0, 4.4, 0.25, 6.6, 7.6, 16);
  k.solid(-1.5, -1.5, 1.5, 1.5, 0, 2.45);
  return [0, 90, 180, 270].map((a) => [Math.sin((a * Math.PI) / 180) * 2.9, Math.cos((a * Math.PI) / 180) * 2.9, a + 180]);
}
function patioChair(k) { // black metal sling chair, centered, faces +z
  for (const x of [-0.85, 0.85]) { k.box('black', x - 0.05, 0, -0.9, x + 0.05, 1.5, -0.8); k.box('black', x - 0.05, 0, 0.8, x + 0.05, 2.2, 0.9); k.box('black', x - 0.05, 2.1, -0.9, x + 0.05, 2.2, 0.9); }
  k.soft('fab:#8f8a7d', -0.82, 1.38, -0.8, 0.82, 1.6, 0.8, 0.08);
  k.soft('fab:#8f8a7d', -0.82, 1.55, -0.98, 0.82, 3.1, -0.8, 0.08);
  k.solid(-0.9, -0.95, 0.9, 0.9, 0, 3.1);
}

// ------------------------------------------------------------------ lights
function ceilingFan(k, ceilY, o = {}) {
  const drop = o.drop || 0.9, y = ceilY - drop;
  k.cyl(o.body || 'col:#6c6c6a', 0, 0, 0.25, 0.22, ceilY - 0.12, ceilY, 10);
  k.cyl(o.body || 'col:#6c6c6a', 0, 0, 0.04, 0.04, y + 0.3, ceilY - 0.1, 6);
  k.cyl(o.body || 'col:#6c6c6a', 0, 0, 0.42, 0.42, y, y + 0.35, 14);
  for (let i = 0; i < 5; i++) {
    const kb = new Kit(k.bat, k.tag).at(k.ox, k.oz, k.oy, k.rot + i * 72 + 15);
    kb.box(o.blade || wood('#6e4b32'), 0.45, y + 0.1, -0.24, 2.35, y + 0.14, 0.24);
  }
  if (o.lights !== false) {
    k.cyl(o.body || 'col:#6c6c6a', 0, 0, 0.2, 0.25, y - 0.25, y, 10);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; k.cyl('shade', Math.cos(a) * 0.35, Math.sin(a) * 0.35, 0.12, 0.22, y - 0.75, y - 0.2, 10); }
  }
}
function chandelier(k, ceilY, hang, arms = 8) {
  const y = ceilY - hang;
  k.cyl('brass', 0, 0, 0.3, 0.25, ceilY - 0.1, ceilY, 10);
  k.cyl('brass', 0, 0, 0.03, 0.03, y + 1.6, ceilY - 0.1, 6);
  k.cyl('brass', 0, 0, 0.12, 0.25, y + 0.9, y + 1.6, 10);
  k.cyl('brass', 0, 0, 0.3, 0.1, y, y + 0.9, 12);
  for (let i = 0; i < arms; i++) {
    const a = (i / arms) * Math.PI * 2, r = i % 2 ? 1.15 : 0.85, ca = Math.cos(a), sa = Math.sin(a);
    const kb = new Kit(k.bat, k.tag).at(k.ox, k.oz, k.oy, k.rot + (a * 180) / Math.PI);
    kb.box('brass', 0, y + 0.55, -0.03, r, y + 0.6, 0.03);
    k.cyl('brass', ca * r, sa * r, 0.08, 0.1, y + 0.6, y + 0.72, 8);
    k.cyl('bulb', ca * r, sa * r, 0.035, 0.035, y + 0.72, y + 1.05, 6);
  }
}
function globePendant(k, ceilY, hang) { // nook: brass with three glass domes
  const y = ceilY - hang;
  k.cyl('brass', 0, 0, 0.25, 0.2, ceilY - 0.1, ceilY, 10);
  k.cyl('brass', 0, 0, 0.025, 0.025, y + 0.6, ceilY - 0.1, 6);
  k.cyl('brass', 0, 0, 0.18, 0.08, y + 0.2, y + 0.65, 10);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2, ca = Math.cos(a) * 0.75, sa = Math.sin(a) * 0.75;
    const kb = new Kit(k.bat, k.tag).at(k.ox, k.oz, k.oy, k.rot + (a * 180) / Math.PI);
    kb.box('brass', 0, y + 0.42, -0.03, 0.75, y + 0.47, 0.03);
    k.cyl('shade', ca, sa, 0.42, 0.12, y - 0.05, y + 0.42, 14);
  }
}
function lantern(k, ceilY, hang) { // foyer: tall hexagonal glass lantern
  const y = ceilY - hang;
  k.cyl('brass', 0, 0, 0.3, 0.25, ceilY - 0.1, ceilY, 10);
  k.cyl('brass', 0, 0, 0.025, 0.025, y + 2.6, ceilY - 0.1, 6);
  k.cyl('brass', 0, 0, 0.75, 0.25, y + 2.2, y + 2.6, 6);
  k.cyl('frosted', 0, 0, 0.55, 0.75, y + 0.4, y + 2.2, 6, 1, false);
  k.cyl('brass', 0, 0, 0.2, 0.55, y, y + 0.4, 6);
  for (let i = 0; i < 4; i++) k.cyl('bulb', Math.cos(i * 1.57) * 0.25, Math.sin(i * 1.57) * 0.25, 0.03, 0.03, y + 0.6, y + 1.0, 5);
}
function recessed(k, ceilY) { k.cyl('recessed', 0, 0, 0.28, 0.28, ceilY - 0.02, ceilY - 0.005, 14); k.cyl('white', 0, 0, 0.36, 0.36, ceilY - 0.012, ceilY - 0.002, 14, 1, false); }
function flushDome(k, ceilY) { k.cyl('brass', 0, 0, 0.55, 0.55, ceilY - 0.08, ceilY, 14); k.cyl('shade', 0, 0, 0.25, 0.5, ceilY - 0.4, ceilY - 0.08, 14); }
function sconce(k, y) { // wall-mounted, back at z = 0
  k.box('brass', -0.12, y - 0.4, 0, 0.12, y + 0.2, 0.06);
  k.box('brass', -0.03, y - 0.25, 0.06, 0.03, y - 0.2, 0.45);
  k.cyl('brass', 0, 0.45, 0.1, 0.12, y - 0.25, y - 0.1, 8);
  k.cyl('bulb', 0, 0.45, 0.035, 0.035, y - 0.1, y + 0.2, 6);
}
function lightBar(k, w, y, n, finish = 'brass') { // vanity light, back at z = 0
  k.box(finish, -w / 2, y - 0.1, 0, w / 2, y + 0.1, 0.18);
  for (let i = 0; i < n; i++) { const x = -w / 2 + (w / n) * (i + 0.5); k.cyl('shade', x, 0.35, 0.2, 0.25, y - 0.45, y + 0.05, 10); }
}
function exteriorLantern(k, y) { // wall lantern, back at z = 0
  k.box('black', -0.15, y - 0.5, 0, 0.15, y + 0.2, 0.08);
  k.box('black', -0.03, y - 0.2, 0.08, 0.03, y - 0.15, 0.4);
  k.cyl('black', 0, 0.55, 0.18, 0.28, y + 0.3, y + 0.55, 6);
  k.cyl('frosted', 0, 0.55, 0.2, 0.25, y - 0.45, y + 0.3, 6);
  k.cyl('black', 0, 0.55, 0.12, 0.2, y - 0.6, y - 0.45, 6);
}

// ------------------------------------------------------------------ kitchen
// Kit for a run along a wall face from a to b (local ft), with the room on side `inward` ([x,z]).
function runKit(bat, tag, a, b, inward, y = 0) {
  const rot = (Math.atan2(inward[0], inward[1]) * 180) / Math.PI;
  const k = new Kit(bat, tag).at(0, 0, y, rot);
  const ex = k.ex();
  const fwd = (b[0] - a[0]) * ex.x + (b[1] - a[1]) * ex.z > 0;
  const s = fwd ? a : b;
  k.at(s[0], s[1], y, rot);
  return { k, len: Math.hypot(b[0] - a[0], b[1] - a[1]), u: (p) => Math.abs((p[0] - s[0]) * ex.x + (p[1] - s[1]) * ex.z) };
}
function baseCab(k, x0, x1, o = {}) {
  const d = 1.95;
  k.box(OAKCAB, x0, 0.33, 0, x1, 2.92, d);
  k.box('blackMatte', x0, 0, 0, x1, 0.33, d - 0.25);
  if (o.dw) {
    k.box('steel', x0 + 0.03, 0.4, d, x1 - 0.03, 2.85, d + 0.05);
    k.box('black', x0 + 0.03, 2.5, d + 0.05, x1 - 0.03, 2.82, d + 0.06);
    k.box('chrome', x0 + 0.3, 2.35, d + 0.05, x1 - 0.3, 2.42, d + 0.15);
    return;
  }
  const w = x1 - x0, n = Math.max(1, Math.round(w / 1.5)), cw = w / n;
  for (let i = 0; i < n; i++) {
    const a = x0 + i * cw + 0.03, b = x0 + (i + 1) * cw - 0.03;
    if (o.drawers) {
      for (const [ya, yb] of [[2.25, 2.85], [1.4, 2.2], [0.42, 1.35]]) { raisedPanel(k, a, b, ya, yb, d); knob(k, (a + b) / 2, (ya + yb) / 2, d + 0.09); }
    } else {
      raisedPanel(k, a, b, 2.3, 2.85, d); knob(k, (a + b) / 2, 2.58, d + 0.09);
      raisedPanel(k, a, b, 0.42, 2.24, d); knob(k, i % 2 ? a + 0.2 : b - 0.2, 2.0, d + 0.09);
    }
  }
}
function upperCab(k, x0, x1, o = {}) {
  const d = 1.05, y0 = o.y0 || 4.55, y1 = 7.0;
  k.box(OAKCAB, x0, y0, 0, x1, y1, d);
  k.box('trim', x0 - 0.05, y1, 0, x1 + 0.05, y1 + 0.22, d + 0.12);
  const w = x1 - x0, n = Math.max(1, Math.round(w / 1.4)), cw = w / n;
  for (let i = 0; i < n; i++) {
    const a = x0 + i * cw + 0.03, b = x0 + (i + 1) * cw - 0.03;
    if (o.glass) {
      k.box(OAKDOOR, a, y0 + 0.07, d, b, y1 - 0.07, d + 0.06);
      k.box('glass', a + 0.15, y0 + 0.22, d + 0.06, b - 0.15, y1 - 0.22, d + 0.07);
      for (const f of [1 / 3, 2 / 3]) k.box(OAKDOOR, a + 0.15, y0 + 0.22 + (y1 - y0 - 0.44) * f - 0.03, d + 0.06, b - 0.15, y0 + 0.22 + (y1 - y0 - 0.44) * f + 0.03, d + 0.09);
      k.box(OAKDOOR, (a + b) / 2 - 0.03, y0 + 0.22, d + 0.06, (a + b) / 2 + 0.03, y1 - 0.22, d + 0.09);
      k.box('col:#e8e2d6', a + 0.2, y0 + 1.0, 0.2, b - 0.2, y0 + 1.6, d - 0.2); // dishes
    } else raisedPanel(k, a, b, y0 + 0.07, y1 - 0.07, d);
    knob(k, i % 2 ? a + 0.2 : b - 0.2, y0 + 0.3, d + 0.09);
  }
}
function counter(k, x0, x1, o = {}) {
  k.box('counter', x0, 2.92, 0, x1, 3.05, 2.08);
  if (o.splash) {
    for (const [a, b, top] of o.splash) {
      k.box('backsplash', a, 3.05, 0, b, top - 0.18, 0.04);
      k.box('splashTrim', a, top - 0.18, 0, b, top, 0.05); // decorative border
    }
  }
}
function range(k, x0, x1) {
  const d = 2.15, xc = (x0 + x1) / 2;
  k.box('steel', x0, 0, 0, x1, 2.95, d);
  k.box('black', x0, 2.95, 0, x1, 3.0, d);
  k.box('black', x0 + 0.25, 0.5, d, x1 - 0.25, 2.05, d + 0.02);
  k.box('chrome', x0 + 0.3, 2.15, d + 0.02, x1 - 0.3, 2.22, d + 0.14);
  for (const zz of [0.55, 1.6]) for (const xx of [x0 + 0.65, x1 - 0.65]) k.cbox('blackMatte', xx, zz, 0.9, 0.9, 3.0, 3.06);
  for (let i = 0; i < 5; i++) k.cyl('chrome', x0 + 0.4 + i * ((x1 - x0 - 0.8) / 4), d + 0.05, 0.08, 0.08, 2.55, 2.65, 8);
  k.box('black', x0, 3.0, 0, x1, 3.6, 0.3);
  k.solid(x0, 0, x1, d, 0, 3);
  // over-the-range microwave + short upper
  k.box('black', x0, 5.2, 0, x1, 6.6, 1.3);
  k.box('col:#3a3a3a', x0 + 0.15, 5.4, 1.3, x1 - 0.7, 6.4, 1.32);
  upperCab(k, x0, x1, { y0: 6.62 });
  return xc;
}
function fridge(k, x0, x1) {
  const d = 2.55, h = 5.85, xm = (x0 + x1) / 2 - 0.15;
  k.box('steel', x0, 0, 0, x1, h, d);
  k.box('black', xm - 0.01, 0.1, d, xm + 0.01, h - 0.05, d + 0.01);
  for (const x of [xm - 0.15, xm + 0.15]) k.box('chrome', x - 0.04, 2.2, d + 0.05, x + 0.04, 5.0, d + 0.2);
  k.box('black', x0 + 0.35, 3.3, d, xm - 0.4, 4.4, d + 0.02);
  upperCab(k, x0, x1, { y0: 6.2 });
  k.solid(x0, 0, x1, d, 0, h);
}
function sink(k, xc, faucet = 'chrome') {
  for (const s of [-1, 1]) k.box('col:#ddd8cc', xc + (s < 0 ? -0.95 : 0.05), 3.051, 0.35, xc + (s < 0 ? -0.05 : 0.95), 3.056, 1.65);
  k.cyl(faucet, xc, 0.25, 0.07, 0.06, 3.05, 4.0, 8);
  k.box(faucet, xc - 0.04, 3.9, 0.25, xc + 0.04, 3.98, 0.75);
}

function buildKitchen(bat, tag) {
  const f = (x, y) => P('f1', x, y);
  // back (sink) wall: face at plan y 360.4, room toward +y
  {
    const { k } = runKit(bat, tag, f(846.6, 360.4), f(1052, 360.4), [0, 1]);
    baseCab(k, 0, 2.0); baseCab(k, 2.0, 2.9, { drawers: true }); baseCab(k, 2.9, 4.95); baseCab(k, 4.95, 6.95, { dw: true }); baseCab(k, 6.95, 8.72);
    counter(k, 0, 8.72, { splash: [[0, 2.1, 4.55], [2.1, 5.75, 3.48], [5.75, 8.72, 4.55]] });
    sink(k, 3.92);
    upperCab(k, 0, 2.1); upperCab(k, 5.75, 7.4);
    k.box('col:#7b2f2f', 5.85, 6.0, 1.09, 6.0, 6.85, 1.14); // plate rack accent
    k.solid(0, 0, 8.72, 2.08, 0, 3.05);
  }
  // left (range) wall: face at plan x 846.6, room toward +x
  {
    const { k, u } = runKit(bat, tag, f(846.6, 360.4), f(846.6, 581), [1, 0]);
    const s = (y) => u(f(846.6, y));
    const a = s(407.6), b = s(440), c = s(500), d0 = s(503), d1 = s(578);
    const [lo, hi] = [Math.min(a, b), Math.max(a, b)];
    baseCab(k, lo, hi); counter(k, lo, hi, { splash: [[lo, hi, 4.55]] });
    const [r0, r1] = [Math.min(b, c), Math.max(b, c)];
    range(k, r0, r1);
    k.box('backsplash', r0, 3.6, 0, r1, 5.2, 0.04);
    const [g0, g1] = [Math.min(d0, d1), Math.max(d0, d1)];
    fridge(k, g0, g1);
    const [c0, c1] = [Math.min(s(360.4), s(440)), Math.max(s(360.4), s(440))];
    upperCab(k, c0, c1);
    k.solid(lo, 0, hi, 2.08, 0, 3.05);
  }
  // pantry wall (dining side): face at plan y 699.9, room toward -y
  {
    const { k, u } = runKit(bat, tag, f(846.6, 699.9), f(1039, 699.9), [0, -1]);
    const s = (x) => u(f(x, 699.9));
    const [p0, p1] = [Math.min(s(846.6), s(904)), Math.max(s(846.6), s(904))];
    k.box(OAKCAB, p0, 0.33, 0, p1, 7.0, 2.0);
    k.box('blackMatte', p0, 0, 0, p1, 0.33, 1.75);
    raisedPanel(k, p0 + 0.03, p1 - 0.03, 4.0, 6.95, 2.0); raisedPanel(k, p0 + 0.03, p1 - 0.03, 0.42, 3.95, 2.0);
    knob(k, p0 + 0.2, 3.97, 2.09);
    k.box('trim', p0 - 0.05, 7.0, 0, p1 + 0.05, 7.22, 2.12);
    const [q0, q1] = [Math.min(s(904), s(1039)), Math.max(s(904), s(1039))];
    baseCab(k, q0, q1); counter(k, q0, q1, { splash: [[q0, q1, 4.55]] }); upperCab(k, q0, q1, { glass: true });
    k.cyl('porcelain', q0 + 1.6, 0.9, 0.35, 0.3, 3.05, 3.8, 12); k.cyl('porcelain', q0 + 2.5, 0.9, 0.35, 0.3, 3.05, 3.8, 12);
    k.solid(p0, 0, q1, 2.08, 0, 7);
  }
  // angled peninsula, joined to the sink run
  {
    const k = new Kit(bat, tag);
    const pts = [[1000, 407.6], [1000, 462], [1078, 566], [1142, 515], [1052, 407.6]].map(([x, y]) => f(x, y));
    k.at(0, 0, 0, 0);
    k.prism({ top: OAKCAB, side: OAKCAB }, pts, 0.33, 2.92);
    // counter overhangs 3"
    const c = pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length], [0, 0]);
    const grow = pts.map(([x, z]) => { const dx = x - c[0], dz = z - c[1], l = Math.hypot(dx, dz); return [x + (dx / l) * 0.25, z + (dz / l) * 0.25]; });
    k.prism({ top: 'counter', side: 'counter', bottom: 'counter' }, grow, 2.92, 3.05);
    const shrink = pts.map(([x, z]) => { const dx = x - c[0], dz = z - c[1], l = Math.hypot(dx, dz); return [x - (dx / l) * 0.2, z - (dz / l) * 0.2]; });
    k.prism({ side: 'blackMatte' }, shrink, 0, 0.33);
    // door panels on the long kitchen-side face and the family-room face
    for (const [a, b] of [[1, 2], [3, 4]]) {
      const A = pts[a], B = pts[b], len = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const out = [B[1] - A[1], -(B[0] - A[0])].map((v) => v / len);
      const mid = [(A[0] + B[0]) / 2 - c[0], (A[1] + B[1]) / 2 - c[1]];
      const sgn = out[0] * mid[0] + out[1] * mid[1] > 0 ? 1 : -1;
      const { k: fk } = runKit(bat, tag, A, B, [out[0] * sgn, out[1] * sgn]);
      const n = Math.max(1, Math.round(len / 1.5)), cw = len / n;
      for (let i = 0; i < n; i++) { raisedPanel(fk, i * cw + 0.05, (i + 1) * cw - 0.05, 2.3, 2.85, -0.01); raisedPanel(fk, i * cw + 0.05, (i + 1) * cw - 0.05, 0.42, 2.24, -0.01); }
    }
    const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
    const kk = new Kit(bat, tag);
    kk.solid(Math.min(...xs) + 0.3, Math.min(...zs) + 0.3, Math.max(...xs) - 0.3, Math.max(...zs) - 0.3, 0, 3.05);
  }
}

// ------------------------------------------------------------------ baths & laundry
function toilet(k) { // back at z = 0
  k.box('porcelain', -0.85, 1.35, 0, 0.85, 2.55, 0.72);
  k.box('porcelain', -0.9, 2.55, -0.02, 0.9, 2.65, 0.76);
  k.cyl('porcelain', 0, 1.25, 0.35, 0.65, 0, 1.3, 16, 1.25);
  k.cyl('porcelain', 0, 1.35, 0.72, 0.72, 1.3, 1.42, 18, 1.3);
  k.cyl('chrome', 0.6, 0.73, 0.05, 0.05, 2.35, 2.42, 6);
  k.solid(-0.85, 0, 0.85, 2.3, 0, 2.6);
}
function vanity(k, w, sinks = 1, o = {}) { // back at z = 0
  const d = 1.85, h = 2.65;
  k.box(OAKCAB, -w / 2, 0.33, 0, w / 2, h, d);
  k.box('blackMatte', -w / 2, 0, 0, w / 2, 0.33, d - 0.25);
  const n = Math.max(2, Math.round(w / 1.3)), cw = w / n;
  for (let i = 0; i < n; i++) { const a = -w / 2 + i * cw + 0.03, b = -w / 2 + (i + 1) * cw - 0.03; raisedPanel(k, a, b, 0.42, h - 0.08, d); knob(k, i % 2 ? a + 0.2 : b - 0.2, h - 0.4, d + 0.09); }
  k.box('vanityTop', -w / 2 - 0.04, h, 0, w / 2 + 0.04, h + 0.12, d + 0.08);
  k.box('vanityTop', -w / 2 - 0.04, h + 0.12, 0, w / 2 + 0.04, h + 0.45, 0.06);
  const xs = sinks === 2 ? [-w / 4, w / 4] : [o.sinkX ?? 0];
  for (const x of xs) {
    k.cyl('col:#e2dbcd', x, 0.95, 0.65, 0.65, h + 0.121, h + 0.126, 18, 0.75);
    k.cyl(o.faucet || 'brass', x, 0.25, 0.06, 0.06, h + 0.12, h + 0.6, 8);
    k.box(o.faucet || 'brass', x - 0.03, h + 0.52, 0.25, x + 0.03, h + 0.58, 0.6);
  }
  if (o.mirror !== false) {
    const mw = o.mirrorW || w;
    if (o.frame) k.box(o.frame, -mw / 2 - 0.12, 3.5 - 0.12, 0, mw / 2 + 0.12, (o.mirrorTop || 6.9) + 0.12, 0.06);
    k.box('mirror', -mw / 2, 3.5, 0.06, mw / 2, o.mirrorTop || 6.9, 0.08);
  }
  k.solid(-w / 2, 0, w / 2, d, 0, h);
}
function pedestalSink(k) {
  k.cyl('porcelain', 0, 0.75, 0.25, 0.32, 0, 2.5, 12, 0.8);
  k.cyl('porcelain', 0, 0.85, 0.85, 1.0, 2.5, 2.85, 16, 0.75);
  k.cyl('col:#e2dbcd', 0, 0.9, 0.6, 0.6, 2.851, 2.855, 16, 0.7);
  k.cyl('brass', 0, 0.3, 0.05, 0.05, 2.85, 3.25, 8);
  k.box('wood:#7c2a1e', -0.9, 3.6, 0, 0.9, 5.7, 0.08); k.box('mirror', -0.75, 3.75, 0.08, 0.75, 5.55, 0.1);
  k.solid(-0.9, 0, 0.9, 1.7, 0, 2.85);
}
function washerDryer(k) { // pair side by side, back at z = 0, 5.6 ft wide
  for (const [x, top] of [[-1.4, true], [1.4, false]]) {
    k.box('porcelain', x - 1.35, 0, 0.1, x + 1.35, 3.0, 2.45);
    k.box('porcelain', x - 1.35, 3.0, 0.1, x + 1.35, 3.6, 0.55);
    for (let i = 0; i < 3; i++) k.cyl('col:#9aa0a6', x + 0.5 + i * 0.25, 0.4, 0.07, 0.07, 3.6, 3.65, 8);
    if (!top) k.box('col:#d9dcdf', x - 1.0, 1.9, 2.45, x + 1.0, 2.6, 2.47);
  }
  k.solid(-2.75, 0, 2.75, 2.45, 0, 3.6);
}
function laundrySink(k) {
  k.box('col:#e7e2d4', -1.0, 0, 0.1, 1.0, 3.0, 1.9);
  k.box('chrome', -1.02, 2.95, 0.08, 1.02, 3.02, 1.92);
  k.cyl('chrome', 0, 0.3, 0.05, 0.05, 3.0, 3.8, 8);
  k.solid(-1, 0, 1, 1.9, 0, 3);
}
function fireplace(k) { // oak mantel + brick surround + raised brick hearth; back at z = 0
  k.box('fpBrick', -2.75, 0, 0, 2.75, 3.8, 0.35);
  k.box('black', -1.45, 0.55, 0.35, 1.45, 2.95, 0.37);
  k.box('brass', -1.55, 2.95, 0.35, 1.55, 3.05, 0.4);
  k.box('brass', -1.55, 0.55, 0.35, -1.45, 3.05, 0.4); k.box('brass', 1.45, 0.55, 0.35, 1.55, 3.05, 0.4);
  k.box('col:#4b2f22', -0.8, 0.65, 0.2, 0.8, 0.95, 0.34);
  for (const s of [-1, 1]) { k.box('mantel', s * 2.75 - 0.35, 0, 0, s * 2.75 + 0.35, 4.35, 0.55); k.box('mantelPanel', s * 2.75 - 0.2, 0.6, 0.55, s * 2.75 + 0.2, 3.9, 0.6); }
  k.box('mantel', -3.1, 3.8, 0, 3.1, 4.35, 0.55);
  k.box('mantelPanel', -2.2, 3.9, 0.55, 2.2, 4.25, 0.6);
  k.box('mantel', -3.35, 4.35, 0, 3.35, 4.5, 0.95);
  k.box('fpBrick', -3.0, 0, 0.35, 3.0, 0.55, 1.9);
  k.solid(-3.35, 0, 3.35, 1.9, 0, 4.5);
}
function wicRun(k, len) { // closet shelf + rod along a wall, back at z = 0
  k.box('white', 0, 5.6, 0, len, 5.66, 1.15);
  k.box('oakLight', 0.1, 5.3, 0.85, len - 0.1, 5.38, 0.93);
  for (let x = 0.2; x < len; x += 3.2) k.box('col:#9da1a3', x, 5.0, 0, x + 0.06, 5.6, 0.7);
}

// ------------------------------------------------------------------ placement
export function buildFixtures(bats) {
  const B = (lv) => bats[lv];
  const at = (lv, x, y, rot = 0, extraY = 0) => {
    const [lx, lz] = P(lv, x, y);
    return new Kit(B(lv), lv).at(lx, lz, LV[lv].floor + extraY, rot);
  };
  // ---- kitchen
  buildKitchen(renoBat('off:kitchen', 'f1'), 'off:kitchen'); // as-built kitchen (replaced by the kitchen remodel)
  // ---- half bath (fixtures on the left wall, face at x 717.1)
  toilet(at('f1', 717.1, 432, 90));
  pedestalSink(at('f1', 717.1, 515, 90));
  lightBar(at('f1', 717.1, 515, 90), 1.9, 6.1, 3);
  // ---- laundry: dryer, washer, sink on the right wall (face at x 708.9)
  washerDryer(at('f1', 708.9, 462, -90));
  laundrySink(at('f1', 708.9, 552, -90));
  { const k = at('f1', 708.9, 397, -90); upperCab(k, 0, 6.5); }
  { const k = at('f1', 528.6, 470, 90); k.box(OAKCAB, -2.1, 0.33, 0, 2.1, 2.92, 1.5); k.box('counter', -2.15, 2.92, 0, 2.15, 3.05, 1.6); k.solid(-2.1, 0, 2.1, 1.6, 0, 3.05); }
  { const k = at('f1', 620, 480, 0); k.cbox('white', 0, 0, 2.2, 2.2, 7.9, 8.0); k.cbox('recessed', 0, 0, 1.9, 1.9, 7.88, 7.9); }
  // ---- family room fireplace + sconces
  fireplace(at('f1', 1697.6, 462, -90));
  sconce(at('f1', 1697.6, 375, -90), 5.6);
  sconce(at('f1', 1697.6, 549, -90), 5.6);
  // oak column at the end of the nook rail
  { const [cx, cz] = P('f1', 1312, 368); const k = new Kit(bats.f1, 'f1').at(cx, cz, 0); k.cbox('trim', 0, 0, 0.55, 0.55, 0, 8); k.cbox('trim', 0, 0, 0.75, 0.75, 7.55, 8); k.cbox('trim', 0, 0, 0.7, 0.7, 0, 0.5); }
  // ---- lights, 1st floor
  chandelier(at('f1', 988, 866), 8, 2.6);
  sconce(at('f1', 845.1, 770, 90), 5.7); sconce(at('f1', 845.1, 962, 90), 5.7);
  { const [lx, lz] = P('f1', 1185, 335); globePendant(new Kit(renoBat('off:bump', 'f1'), 'off:bump').at(lx, lz, 0), 8, 2.3); } // replaced by the bump-out's pendants
  for (const [x, y] of [[905, 440], [995, 440], [905, 560], [995, 600], [1110, 600], [1230, 470]]) recessed(at('f1', x, y), 8);
  flushDome(at('f1', 1450, 440), 8); flushDome(at('f1', 1590, 440), 8);
  flushDome(at('f1', 600, 615), 8); flushDome(at('f1', 760, 615), 8);
  flushDome(at('f1', 1560, 830), 8);
  lantern(at('f1', 1268, 885), 17, 6.2);
  { // sun room: oak ridge beam + white fan
    const [x0] = P('f1', 1420.5, 0), [x1, z1] = P('f1', 1703.5, 310.5), [, z0] = P('f1', 0, 49.5);
    const xc = (x0 + x1) / 2, ridge = 9 + ((x1 - x0) / 2) * (10 / 12) - 0.55;
    const k = new Kit(bats.f1, 'f1');
    k.box('trim', xc - 0.3, ridge - 0.8, z0, xc + 0.3, ridge, z1);
    ceilingFan(new Kit(bats.f1, 'f1').at(xc, (z0 + z1) / 2 - 1.5, 0), ridge - 0.8, { body: 'white', blade: 'white', drop: 1.6 });
  }
  // ---- 2nd floor: primary bath as built (replaced by the bath remodel)
  const PB = renoBat('off:pbath', 'f2');
  const atPB = (x, y, rot = 0) => { const [lx, lz] = P('f2', x, y); return new Kit(PB, 'off:pbath').at(lx, lz, 9, rot); };
  // ---- 2nd floor: primary bath
  vanity(atPB(279.2, 361, 90), 5.4, 2, { mirrorTop: 7.0 });
  lightBar(atPB(279.2, 361, 90), 5.0, 7.35, 6);
  toilet(atPB(279.2, 160, 90));
  { // corner whirlpool on a tiled platform, with two steps
    const plat = [[384, 62], [664, 62], [664, 236], [505, 236], [384, 128]].map(([x, y]) => P('f2', x, y));
    const k = new Kit(PB, 'off:pbath').at(0, 0, 9, 0);
    k.prism({ top: 'tile4', side: 'tile4' }, plat, 0, 1.85);
    const [tx, tz] = P('f2', 535, 140);
    const kt = new Kit(PB, 'off:pbath').at(tx, tz, 9, -25);
    kt.cyl('porcelain', 0, 0, 2.7, 2.7, 1.85, 1.9, 28, 0.55);
    kt.cyl('col:#e7eef0', 0, 0, 2.35, 2.35, 1.9, 1.905, 28, 0.5);
    kt.cyl('brass', 0, -1.35, 0.06, 0.06, 1.9, 2.5, 8);
    // steps along the diagonal edge
    const A = P('f2', 384, 128), Bp = P('f2', 505, 236);
    const len = Math.hypot(Bp[0] - A[0], Bp[1] - A[1]);
    const d = [(Bp[0] - A[0]) / len, (Bp[1] - A[1]) / len];
    const o2 = [-d[1], d[0]]; // perpendicular pointing away from the tub (toward -x, +y)
    for (const [off, h] of [[0.0, 1.25], [1.1, 0.62]]) {
      const pts = [[A[0] + d[0] * 0.6, A[1] + d[1] * 0.6], [A[0] + d[0] * (len - 0.6), A[1] + d[1] * (len - 0.6)]];
      const poly = [pts[0], pts[1], [pts[1][0] + o2[0] * (off + 1.1), pts[1][1] + o2[1] * (off + 1.1)], [pts[0][0] + o2[0] * (off + 1.1), pts[0][1] + o2[1] * (off + 1.1)]];
      k.prism({ top: 'tile4', side: 'tile4' }, poly, 0, h);
    }
    const xs = plat.map((p) => p[0]), zs = plat.map((p) => p[1]);
    k.solid(Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), 0, 1.85);
  }
  { // neo-angle shower: tiled curb, glass with brass frame on the diagonal
    const sh = [[512, 382], [563, 332], [673, 332], [673, 477], [512, 477]].map(([x, y]) => P('f2', x, y));
    const k = new Kit(PB, 'off:pbath').at(0, 0, 9, 0);
    k.prism({ top: 'tile4', side: 'tile4' }, sh, 0, 0.35);
    const A = P('f2', 512, 382), Bp = P('f2', 563, 332);
    const { k: g, len } = runKit(PB, 'off:pbath', A, Bp, [1, 1], 9);
    g.box('showerGlass', 0, 0.35, 0.0, len, 6.6, 0.04);
    for (const x of [0, len - 0.06, len / 2 - 0.03]) g.box('brass', x, 0.35, -0.02, x + 0.06, 6.6, 0.06);
    g.box('brass', 0, 6.55, -0.02, len, 6.62, 0.06);
    g.box('brass', len / 2 + 0.2, 3.2, 0.04, len / 2 + 0.25, 4.0, 0.14);
    g.solid(0, -0.1, len, 0.1, 0.35, 6.6);
    const [hx, hz] = P('f2', 666, 405);
    new Kit(PB, 'off:pbath').at(hx, hz, 9, -90).box('chrome', -0.05, 6.0, 0, 0.05, 6.1, 0.6).cyl('chrome', 0, 0.6, 0.18, 0.12, 5.9, 6.05, 10);
  }
  // ---- 2nd floor: hall bath
  vanity(at('f2', 949.4, 345, 90), 6.4, 1, { faucet: 'chrome', mirrorW: 3.4, frame: 'col:#7d776c', sinkX: 0 });
  lightBar(at('f2', 949.4, 345, 90), 2.8, 7.2, 3, 'chrome');
  toilet(at('f2', 949.4, 165, 90));
  { // alcove tub with curtain
    const [x0, z0] = P('f2', 1125, 117), [x1, z1] = P('f2', 1215, 294);
    const k = new Kit(bats.f2, 'f2').at(0, 0, 9, 0);
    k.box('porcelain', x0, 0, z0, x1, 1.5, z1);
    k.box('col:#eef1f2', x0 + 0.3, 1.5, z0 + 0.3, x1 - 0.3, 1.505, z1 - 0.3);
    k.box('chrome', x0 - 0.05, 6.6, z0, x0 + 0.05, 6.68, z1);
    k.box('fab:#f4f2ec', x0 + 0.05, 1.6, z0, x0 + 0.1, 6.55, z0 + (z1 - z0) * 0.45);
    k.box('chrome', (x0 + x1) / 2 - 0.05, 3.0, z0, (x0 + x1) / 2 + 0.05, 3.1, z0 + 0.5);
    k.solid(x0, z0, x1, z1, 0, 1.5);
  }
  // ---- walk-in closet and lights, 2nd floor
  { const { k, len } = runKit(bats.f2, 'f2', P('f2', 679.4, 121), P('f2', 679.4, 470), [1, 0], 9); wicRun(k, len); hangingClothes(k, len, 11, 0.05); }
  { const { k, len } = runKit(bats.f2, 'f2', P('f2', 936.6, 121), P('f2', 936.6, 470), [-1, 0], 9); wicRun(k, len); hangingClothes(k, len, 29, 0.55); }
  // bedroom reach-in closets, the foyer coat closet, and linen closets
  { const { k, len } = runKit(bats.f2, 'f2', P('f2', 1227.4, 120.7), P('f2', 1227.4, 373.6), [1, 0], 9); wicRun(k, len); hangingClothes(k, len, 41, 0.15); }
  { const { k, len } = runKit(bats.f2, 'f2', P('f2', 1456.4, 586.4), P('f2', 1719.8, 586.4), [0, 1], 9); wicRun(k, len); hangingClothes(k, len, 53, 0.3); }
  { const { k, len } = runKit(bats.f1, 'f1', P('f1', 1417.9, 870), P('f1', 1417.9, 1022.6), [-1, 0], 0); wicRun(k, len); hangingClothes(k, len, 67, 0, { coats: true }); }
  { const { k, len } = runKit(bats.f2, 'f2', P('f2', 1227.4, 386.4), P('f2', 1308.6, 386.4), [0, 1], 9); linenShelves(k, len, 7); }
  { const { k, len } = runKit(bats.f2, 'f2', P('f2', 1125.4, 306.4), P('f2', 1214.6, 306.4), [0, 1], 9); linenShelves(k, len, 13); }
  { const { k, len } = runKit(renoBat('off:pbath', 'f2'), 'off:pbath', P('f2', 666.6, 246.4), P('f2', 666.6, 325.6), [-1, 0], 9); linenShelves(k, len, 19); }
  flushDome(at('f2', 808, 290), 8);
  ceilingFan(at('f2', 556, 820), 8, { body: 'brass', blade: wood('#9b6a3c') });
  ceilingFan(at('f2', 1510, 885), 8, { body: 'col:#8c8f91', blade: wood('#c0844a') });
  ceilingFan(at('f2', 1520, 340), 8, { body: 'col:#5f6163', blade: wood('#5a3524') });
  for (const [x, y] of [[1050, 540], [1210, 1110], [1000, 1110]]) recessed(at('f2', x, y), 8);
  // ---- basement
  // drop-ceiling bulkhead over the main beam, ~2 ft off the stair wall; posts sit under it near the walls
  { const [x0, z] = P('b', 649, 762), [x1] = P('b', 1193, 762); new Kit(bats.b, 'b').box('droptile', x0, -2.3, z - 0.45, x1, -1.6, z + 0.45); }
  for (const [x, y] of [[1010, 762], [1150, 762], [690, 850]]) { const k = at('b', x, y); k.cbox('trim', 0, 0, 0.6, 0.6, 0, 7.4); k.cbox('trim', 0, 0, 0.8, 0.8, 0, 0.4); k.cbox('trim', 0, 0, 0.8, 0.8, 7.0, 7.4); k.solid(-0.3, -0.3, 0.3, 0.3, 0, 7.4); }
  { // electrical panel + tall oak cabinet (theater photos)
    const k = at('b', 653.8, 470, 90); k.box('col:#b9bcbd', -0.8, 4.2, 0, 0.8, 6.6, 0.25);
    const c = at('b', 760, 407.3, 0); c.box(wood('#c08a52'), -1.4, 0, 0, 1.4, 7.0, 2.0); raisedPanel(c, -1.35, -0.02, 0.2, 5.3, 2.0, wood('#c08a52'), wood('#cc9862')); raisedPanel(c, 0.02, 1.35, 0.2, 5.3, 2.0, wood('#c08a52'), wood('#cc9862')); c.solid(-1.4, 0, 1.4, 2, 0, 7);
  }
  if (false) { // (pool table removed: the east end is now a home gym)
    const [x, z] = P('b', 1480, 340); const k = new Kit(bats.b, 'b').at(x, z, -9, 90);
    k.box('brass', -2.4, 4.7, -0.08, 2.4, 4.8, 0.08);
    for (const s of [-1.6, 0, 1.6]) { k.cyl('col:#1f4a33', s, 0, 0.55, 0.15, 4.2, 4.7, 12, 1, false); k.cyl('bulb', s, 0, 0.12, 0.12, 4.3, 4.45, 8); k.cyl('brass', s, 0, 0.02, 0.02, 4.7, 7.4, 4); }
  }
  for (let x = 700; x < 1640; x += 165) for (let y = 110; y < 880; y += 165) {
    const [lx, lz] = P('b', x, y);
    if (LV.b._rooms && LV.b._rooms[0] && pip2(LV.b._rooms.find((r) => r.name === 'Recreation Room').pts, lx, lz)) recessed(new Kit(bats.b, 'b').at(lx, lz, -9), 7.4);
  }
  { // utility room: two water heaters, furnace, softener, shelving
    for (const y of [500, 600]) { const [x, z] = P('b', 330, y); const k = new Kit(bats.b, 'b').at(x, z, -9); k.cyl('col:#5a5d61', 0, 0, 0.95, 0.95, 0, 5.0, 18); k.cyl('chrome', 0, 0, 0.18, 0.18, 5.0, 7.8, 10); k.solid(-0.95, -0.95, 0.95, 0.95, 0, 5); }
    const f = at('b', 470, 452.8, 0); f.box('col:#c9c9c4', -1.2, 0, 0, 1.2, 5.2, 2.6); f.box('col:#b0b4b6', -0.9, 5.2, 0.5, 0.9, 7.8, 2.0); f.solid(-1.2, 0, 1.2, 2.6, 0, 5.2);
    const s = at('b', 410, 600); s.cyl('col:#e3e3df', 0, 0, 0.6, 0.6, 0, 3.6, 12);
    const sh = at('b', 560, 744.7, 180); shelving(sh, 5, 1.4, 6.5); // south wall, clear of the door swing
  }
  { // storage: exposed floor joists (2x10 @ 16" o.c.) and the framed stair wall
    const [xa, za] = P('b', 649, 898.5), [xb, zb] = P('b', 1645, 1180.5);
    const k = new Kit(bats.b, 'b');
    for (let x = xa + 0.6; x < xb - 0.3; x += 1.333) k.box('joist', x, -1.85, za, x + 0.13, -1.0, zb);
    const [ua, uza] = P('b', 283.5, 446), [ub, uzb] = P('b', 649, 749.5);
    for (let z = uza + 0.6; z < uzb - 0.3; z += 1.333) k.box('joist', ua, -1.85, z, ub, -1.0, z + 0.13);
  }
  for (const [x, y] of [[900, 1040], [1350, 1040], [1500, 780]]) { const [lx, lz] = P('b', x, y); new Kit(bats.b, 'b').at(lx, lz, -9).cyl('bulb', 0, 0, 0.12, 0.12, 6.9, 7.1, 8); }
  // ---- exterior lights
  for (const x of [1178, 1350]) exteriorLantern(at('f1', x, 1034.4, 0), 6.0);
  // by the laundry door (moves with the mudroom option) and the nook door (goes with the bump-out)
  for (const [x, y, r, rs] of [[560, 386.6, 180, 'off:mud'], [1048.1, 334, -90, 'off:bump']]) { const [lx, lz] = P('f1', x, y); exteriorLantern(new Kit(renoBat(rs, 'f1'), rs).at(lx, lz, 0, r), 6.6); }
  exteriorLantern(at('f1', 254.6, 530, -90), 6.6);
  exteriorLantern(at('f1', 254.6, 1150, -90), 7.4);
}
function pip2(pts, x, z) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export function buildFurniture(bats) {
  const at = (lv, x, y, rot = 0) => { const [lx, lz] = P(lv, x, y); return new Kit(bats[lv + 'F'], lv + 'F').at(lx, lz, LV[lv].floor, rot); };
  const place = (lv, x, y, rot, fn) => fn(at(lv, x, y, rot));
  // ---- living room (staged like the listing photos)
  place('f1', 1563, 828, 0, (k) => rug(k, 8, 10, '#e2ddd3', '#b9b0a2'));
  place('f1', 1697.6, 800, -90, (k) => sofa(k, 7.5, { color: '#ddd5c8', pillows: ['#9d6e64', '#cdb79c', '#7a5c4e'] }));
  place('f1', 1580, 800, 90, (k) => coffeeTable(k, 4, 2));
  place('f1', 1478, 735, 90, (k) => armchair(k, { color: '#ece7dd', pillow: '#d8cdbd' }));
  place('f1', 1478, 872, 90, (k) => armchair(k, { color: '#ece7dd', pillow: '#d8cdbd' }));
  place('f1', 1676, 686, 0, (k) => sideTable(k));
  place('f1', 1676, 918, 0, (k) => floorLamp(k, 0, 0));
  place('f1', 1452, 995, 0, (k) => plant(k, 0, 0, 6));
  // ---- family room, facing the fireplace
  place('f1', 1548, 466, 90, (k) => rug(k, 8, 10, '#d9d6cf', '#a7a196'));
  place('f1', 1350, 466, 90, (k) => sofa(k, 7.5, { color: '#cfc1ab', cushion: '#d8cbb5' }));
  place('f1', 1490, 466, 90, (k) => coffeeTable(k, 4, 2, '#6b4a33'));
  place('f1', 1590, 368, 0, (k) => armchair(k, { color: '#eeeae2', pillow: '#7d6656' }));
  place('f1', 1590, 562, 180, (k) => armchair(k, { color: '#eeeae2', pillow: '#7d6656' }));
  // ---- office (the listing's dining area): desk on the garage-side wall, bookcases, reading chair
  place('f1', 975, 866, 0, (k) => rug(k, 8, 10, '#c9c4bb', '#8d8a85'));
  place('f1', 845.1, 866, 90, (k) => officeDesk(k, 5.5));
  place('f1', 928, 866, -90, (k) => officeChair(k));
  place('f1', 905, 708.1, 0, (k) => bookcase(k, 2.8, 6.5, 5));
  place('f1', 975, 708.1, 0, (k) => bookcase(k, 2.8, 6.5, 9));

  // ---- breakfast nook: 42 in round table, four chairs
  {
    // (in the 'off:bump' set: the bump-out option swaps it for a full dining table)
    const NB = renoBat('off:bump', 'f1'), [nx, nz] = P('f1', 1182, 335);
    const k = new Kit(NB, 'off:bump').at(nx, nz, 0, 0);
    for (const [cx, cz, r] of roundTable(k, 1.75, { base: '#d9d6cf' })) {
      const p = k.P(cx, 0, cz);
      chair(new Kit(NB, 'off:bump').at(p.x, p.z, 0, r), '#ece9e2', '#5c3d2a');
    }
  }
  // ---- sun room
  place('f1', 1520, 165, 180, (k) => loungeChair(k, '#d9d2b8'));
  place('f1', 1612, 165, 180, (k) => loungeChair(k, '#d9d2b8'));
  place('f1', 1566, 150, 0, (k) => sideTable(k, 1.4));
  place('f1', 1680, 285, 0, (k) => plant(k, 0, 0, 4.5));
  // ---- garage: two cars and storage shelving
  place('f1', 470, 817, 90, (k) => car(k, '#6f7d8c'));
  place('f1', 470, 1070, 90, (k) => car(k, '#d9d9d4'));
  { const [lx, lz] = P('f1', 390, 398.4); shelving(new Kit(renoBat('off:mud', 'f1'), 'off:mud').at(lx, lz, LV.f1.floor, 0), 9, 1.6, 6); } // rear storage bay (becomes the mudroom)
  // ---- primary bedroom: king bed on the windowless south wall
  place('f2', 470, 820, 90, (k) => rug(k, 8, 10, '#d8cbb8', '#9f8a72'));
  place('f2', 279.2, 820, 90, (k) => bed(k, 'king', { duvet: '#efe9df', accent: '#6f5a4a', headboard: '#b9aa96', sham: '#d9cbb8' }));
  place('f2', 279.2, 650, 90, (k) => nightstand(k));
  place('f2', 279.2, 990, 90, (k) => nightstand(k));
  place('f2', 601, 483.4, 0, (k) => dresser(k, 6, { mirror: true, lamp: false }));
  place('f2', 584, 820, 90, (k) => bench(k, 4.5, 1.4, '#a99683'));
  place('f2', 772, 1045, -135, (k) => armchair(k, { color: '#c7b49b' }));
  place('f2', 818, 1085, 0, (k) => floorLamp(k, 0, 0));
  // ---- bedroom 11'6" (pale yellow): queen bed on the hall wall
  place('f2', 1440, 885, 90, (k) => rug(k, 5, 8, '#cfd6d8', '#8fa0a6'));
  place('f2', 1298.4, 885, 90, (k) => bed(k, 'queen', { frame: '#e9e4da', duvet: '#dfe7ea', accent: '#5f7f8c', headboard: '#e9e4da', sham: '#f1f0ec', pillow: '#c9d6db' }));
  place('f2', 1298.4, 740, 90, (k) => nightstand(k, { color: '#e9e4da' }));
  place('f2', 1298.4, 1030, 90, (k) => nightstand(k, { color: '#e9e4da' }));
  place('f2', 1719.8, 775, -90, (k) => dresser(k, 4.5, { color: '#e9e4da', front: '#efebe3', lamp: true }));
  // ---- bedroom 10'10" (tan): full bed on the east wall, desk
  place('f2', 1719.8, 290, -90, (k) => bed(k, 'full', { frame: '#6b4a33', duvet: '#e4dccd', accent: '#8a3f3a', headboard: '#6b4a33' }));
  place('f2', 1719.8, 154, -90, (k) => nightstand(k));
  place('f2', 1719.8, 426, -90, (k) => nightstand(k));
  place('f2', 1590, 573.6, 180, (k) => desk(k, 4));
  place('f2', 1590, 525, 0, (k) => chair(k, '#3e4a54', '#2b2b2b'));
  // ---- basement, layout A: TV & couch in the octagonal bay, gym at the east end
  const atL = (lay, x, y, rot = 0) => { const [lx, lz] = P('b', x, y); return new Kit(bats['b' + lay], 'b' + lay).at(lx, lz, -9, rot); };
  const placeA = (x, y, rot, fn) => fn(atL('A', x, y, rot));
  const placeB = (x, y, rot, fn) => fn(atL('B', x, y, rot));
  placeA(1044, 289.8, 0, (k) => wallTV(k, 65));
  placeA(1044, 291, 0, (k) => mediaConsole(k, 5.5));
  placeA(1044, 452, 0, (k) => rug(k, 8, 10, '#bfb3a2', '#8a7d6c'));
  placeA(1044, 548, 180, (k) => sofa(k, 8, { color: '#5e5348', cushion: '#665a4e', pillows: ['#8b6f4e', '#a1886a'] }));
  placeA(1044, 420, 0, (k) => coffeeTable(k, 4, 2, '#4b3426'));
  // ---- basement: home gym at the east end (rubber floor, rack, bench, dumbbells, bike, BodyPump)
  placeA(1481, 345, 0, (k) => rubberFloor(k, 11.6, 21.4));
  placeA(1638.2, 175, -90, (k) => powerRack(k));
  placeA(1455, 175, 90, (k) => liftBench(k));
  placeA(1560, 637.7, 180, (k) => dumbbellRack(k, 5.5));
  placeA(1375, 95, 90, (k) => pelotonBike(k));
  placeA(1455, 470, 90, (k) => bodyPumpArea(k));
  placeA(1638.2, 470, -90, (k) => k.box('mirror', -3.6, 0.6, 0, 3.6, 6.8, 0.06));
  // ---- patio: fire pit with four Adirondack chairs, and a dining set by the family-room windows
  // (the fire pit group shifts over when the breakfast bump-out adds a patio door: see reno.js)
  const PATIO = renoBat('off:bump', 'f1');
  const patio = (x, z, rot, fn) => fn(new Kit(PATIO, 'off:bump').at(x, z, -0.62, rot));
  patio(33, -1, 0, firePit);
  for (const [dx, dz] of [[-3.8, -3.8], [3.8, -3.8], [-3.8, 3.8], [3.8, 3.8]]) {
    const rot = (Math.atan2(-dx, -dz) * 180) / Math.PI;
    patio(33 + dx, -1 + dz, rot, (k) => adirondack(k));
  }
  {
    const PD = (x, z, rot = 0) => new Kit(bats.f1F, 'f1F').at(x, z, -0.62, rot);
    for (const [cx, cz, r] of patioDining(PD(18.5, 6.5))) patioChair(PD(18.5 + cx, 6.5 + cz, r));
  }
  placeA(800, 1173.7, 180, (k) => shelving(k, 6, 1.5, 6));
  placeA(1400, 1173.7, 180, (k) => shelving(k, 6, 1.5, 6));
  // ---- basement, layout B: media room at the east end, gym (with room to run) in the storage space
  placeB(1638.2, 340, -90, (k) => projectionScreen(k, 110));
  placeB(1515, 340, 0, (k) => rug(k, 9, 12, '#bfb3a2', '#8a7d6c'));
  placeB(1395, 340, 90, (k) => sofa(k, 10, { color: '#5e5348', cushion: '#665a4e', pillows: ['#8b6f4e', '#a1886a'] }));
  placeB(1452, 150, 45, (k) => armchair(k, { color: '#5e5348' }));
  placeB(1452, 530, 135, (k) => armchair(k, { color: '#5e5348' }));
  placeB(1532, 340, 90, (k) => coffeeTable(k, 4.5, 2, '#4b3426'));
  placeB(1638.2, 115, -90, (k) => towerSpeaker(k));
  placeB(1638.2, 565, -90, (k) => towerSpeaker(k));
  placeB(1300, 340, 0, (k) => { k.box('white', -0.7, 6.95, -0.6, 0.7, 7.35, 0.6); k.cyl('black', 0.7, 0, 0.18, 0.18, 7.05, 7.25, 10); });
  placeB(1044, 400, 0, (k) => rug(k, 6, 8, '#bfb3a2', '#8a7d6c'));
  placeB(1000, 340, 160, (k) => armchair(k, { color: '#8a6b55' }));
  placeB(1100, 330, -160, (k) => floorLamp(k, 0, 0));
  placeB(1148, 1039.5, 0, (k) => rubberFloor(k, 34, 9.8));
  placeB(1419, 771, 0, (k) => rubberFloor(k, 15.8, 8.6));
  placeB(1000, 1173.7, 180, (k) => powerRack(k));
  placeB(1000, 990, 0, (k) => liftBench(k));
  placeB(780, 1173.7, 180, (k) => dumbbellRack(k, 5.5));
  placeB(1250, 1100, 0, (k) => pelotonBike(k));
  placeB(1430, 1080, 0, (k) => bodyPumpArea(k));
  placeB(1500, 760, 90, (k) => treadmill(k));
  placeB(1450, 1173.7, 180, (k) => k.box('mirror', -3.6, 0.6, 0, 3.6, 6.8, 0.06));
}
export { exteriorLantern, raisedPanel };

export {
  bed, nightstand, dresser, bench, sofa, armchair, coffeeTable, sideTable, rug, chair, diningTable, roundTable, buffet, plant,
  floorLamp, tableLamp, knob, toilet, vanity, lightBar, wicRun, linenShelves, hangingClothes, recessed, flushDome, globePendant,
  chandelier, ceilingFan, firePit, adirondack, patioDining, patioChair, powerRack, liftBench, dumbbellRack, pelotonBike,
  bodyPumpArea, treadmill, rubberFloor, shelving, runKit, disc, bar, officeChair, officeDesk, bookcase, IRON, RUBBER, shadeHex, taperLeg,
};
