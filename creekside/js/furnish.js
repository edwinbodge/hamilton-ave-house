// Fixtures (kitchen, baths, fireplace, lights...) and staged furniture, built to real
// dimensions in feet. Components use a Kit (see geom.js): local x = width, z = depth with
// the front at +z, y = up. Wall-mounted pieces have their back at z = 0.
import { LEVELS, toFt, F2, H, PX, vaultUnder } from './data.js';
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
const BEDS = { king: [6.33, 6.67, 4.4], queen: [5.0, 6.67, 4.0], full: [4.5, 6.25, 3.8], twin: [3.25, 6.25, 3.4] }; // mattress w x l, headboard h
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
    k.box('blackGloss', x0 + 0.03, 0.4, d, x1 - 0.03, 2.85, d + 0.05);
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
  k.box('blackGloss', x0, 0, 0, x1, 2.95, d);
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
  k.box('blackGloss', x0, 0, 0, x1, h, d);
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

// ------------------------------------------------------------------ Creekside: kitchen as built
// Oak cabinets with arched raised-panel uppers, gray laminate counters with a 4" laminate splash,
// black appliances, white double sink under the bump window, angled island (all from the plan + photos).
const F = (x, y) => toFt([x, y]);
const G2 = (x, y) => toFt(F2(x, y));
function archUpper(k, x0, x1, o = {}) { // oak upper with a cathedral-arch raised panel
  upperCab(k, x0, x1, { y0: o.y0 || 4.5 });
  const w = x1 - x0, n = Math.max(1, Math.round(w / 1.4)), cw = w / n;
  for (let i = 0; i < n; i++) { const a = x0 + i * cw + 0.25, b = x0 + (i + 1) * cw - 0.25; k.box(OAKPANEL, a + 0.15, 6.45, 1.14, b - 0.15, 6.6, 1.16); }
}
function openShelves(k, x0, x1, y0 = 4.5) { // the open quarter-round end shelves in the photos
  k.box(OAKCAB, x0, y0, 0, x1, 7.0, 0.06);
  for (let y = y0; y < 7.0; y += 0.62) k.box(OAKCAB, x0, y, 0, x1, y + 0.05, 0.95);
}
function splash4(k, x0, x1) { k.box('splashTrim', x0, 3.05, 0, x1, 3.4, 0.05); }
export function buildKitchen(bat, tag) {
  // bump wall (sink under the window), run from the south corner northward
  {
    const { k, len } = runKit(bat, tag, F(294.9, 354.6), F(294.9, 491.4), [1, 0]);
    baseCab(k, 2.05, 4.35, { drawers: true }); baseCab(k, 4.35, 6.9); baseCab(k, 6.9, 8.9, { dw: true }); baseCab(k, 8.9, len);
    k.box('cab', 6.9, 0.33, 0, 8.9, 2.92, 1.9);
    counter(k, 0, len); splash4(k, 0, len);
    for (const s of [-1, 1]) k.box('porcelain', 5.62 + (s < 0 ? -1.55 : 0.05), 2.4, 0.35, 5.62 + (s < 0 ? -0.05 : 1.55), 3.06, 1.65); // white double bowl
    k.cyl('chrome', 5.62, 0.25, 0.06, 0.05, 3.05, 4.2, 8); k.box('chrome', 5.58, 4.1, 0.25, 5.66, 4.17, 0.9);
    archUpper(k, 0, 2.6); openShelves(k, 2.6, 3.1); openShelves(k, 8.1, 8.6); archUpper(k, 8.6, len);
    k.solid(0, 0, len, 2.08, 0, 3.05);
  }
  // south run with the range and microwave
  {
    const { k, len } = runKit(bat, tag, F(294.9, 491.4), F(406, 491.4), [0, -1]);
    baseCab(k, 0, 2.81); range(k, 2.81, 5.29); baseCab(k, 5.29, len);
    counter(k, 0, 2.81); counter(k, 5.29, len); splash4(k, 0, 2.81); splash4(k, 5.29, len);
    k.box('splashTrim', 2.81, 3.05, 0, 5.29, 5.2, 0.03);
    // uppers hang on the kitchen | living wall: they go if that wall is opened (the run then reads as a peninsula)
    const UB = tag === 'off:kitchen' ? renoBat('off:kitchen&off:openLiving', 'f1') : bat;
    const { k: ku } = runKit(UB, tag, F(294.9, 491.4), F(406, 491.4), [0, -1]);
    archUpper(ku, 0, 2.81); archUpper(ku, 5.29, len - 1.1);
    const PB = renoBat('off:kitchen&on:openLiving', 'f1');
    const { k: kp } = runKit(PB, 'off:kitchen&on:openLiving', F(294.9, 491.4), F(406, 491.4), [0, -1]);
    kp.box('cabPanel', 0, 0.2, -0.06, len, 3.05, 0); kp.box('counter', 0, 2.92, -0.9, len, 3.05, 0);
    k.solid(0, 0, 2.81, 2.08, 0, 3.05); k.solid(5.29, 0, len, 2.08, 0, 3.05);
  }
  // fridge and the coffee counter on the hall wall
  {
    const { k, len } = runKit(bat, tag, F(473.4, 390), F(473.4, 491.4), [-1, 0]);
    fridge(k, 0.1, 3.0);
    baseCab(k, 3.0, len); counter(k, 3.0, len); splash4(k, 3.0, len); archUpper(k, 3.0, len);
    k.cyl('black', 4.0, 0.7, 0.35, 0.35, 3.05, 4.15, 12); k.box('black', 3.7, 3.05, 0.4, 4.3, 4.3, 0.75);
    k.solid(3.0, 0, len, 2.08, 0, 3.05);
  }
  // angled island: oak, gray laminate top with a 1" overhang, stools on the dining side
  {
    const pts = [[362.8, 355.9], [393.1, 325.6], [410, 342.2], [410, 361.3], [399.7, 373.1], [399.7, 426.3], [362.8, 426.3]].map(([x, y]) => F(x, y));
    const k = new Kit(bat, tag).at(0, 0, 0, 0);
    const c = pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length], [0, 0]);
    const grow = (d) => pts.map(([x, z]) => { const dx = x - c[0], dz = z - c[1], l = Math.hypot(dx, dz); return [x + (dx / l) * d, z + (dz / l) * d]; });
    k.prism({ top: OAKCAB, side: OAKCAB }, pts, 0.33, 2.92);
    k.prism({ top: 'counter', side: 'counter', bottom: 'counter' }, grow(0.12), 2.92, 3.05);
    k.prism({ side: 'blackMatte' }, grow(-0.2), 0, 0.33);
    for (let i = 0; i < pts.length; i++) {
      const A = pts[i], B = pts[(i + 1) % pts.length], len = Math.hypot(B[0] - A[0], B[1] - A[1]);
      if (len < 1.3) continue;
      const out = [B[1] - A[1], -(B[0] - A[0])].map((v) => v / len);
      const mid = [(A[0] + B[0]) / 2 - c[0], (A[1] + B[1]) / 2 - c[1]], sgn = out[0] * mid[0] + out[1] * mid[1] > 0 ? 1 : -1;
      const { k: fk } = runKit(bat, tag, A, B, [out[0] * sgn, out[1] * sgn]);
      const n = Math.max(1, Math.round(len / 1.5)), cw = len / n;
      for (let j = 0; j < n; j++) { raisedPanel(fk, j * cw + 0.06, (j + 1) * cw - 0.06, 2.3, 2.85, -0.01); raisedPanel(fk, j * cw + 0.06, (j + 1) * cw - 0.06, 0.42, 2.24, -0.01); }
    }
    k.solid(c[0] - 1.1, c[1] - 1.8, c[0] + 0.9, c[1] + 2.4, 0, 3.05);
    for (const [x, y] of [[366, 340], [380, 326], [356, 356]]) {
      const [sx, sz] = F(x, y);
      const sk = new Kit(bat, tag).at(sx - 0.4, sz - 0.4, 0, 135);
      for (const [lx, lz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) sk.cyl(wood('#c9944f'), lx, lz, 0.05, 0.06, 0, 2.3, 6);
      sk.cyl(wood('#c9944f'), 0, 0, 0.6, 0.6, 2.3, 2.45, 14); sk.box(wood('#c9944f'), -0.5, 0.8, -0.5, 0.5, 0.86, 0.5);
    }
  }
}

// black marble surround, oak mantel with fluted legs, flush black marble hearth (family room)
function fireplace2(k) {
  k.box('fpBrick', -2.6, 0, 0, 2.6, 3.9, 0.22);
  k.box('black', -1.45, 0.25, 0.22, 1.45, 2.75, 0.24);
  for (const s of [-1, 1]) k.box('brass', s * 1.45 - 0.05, 0.25, 0.22, s * 1.45 + 0.05, 2.8, 0.29);
  k.box('brass', -1.5, 2.75, 0.22, 1.5, 2.85, 0.29);
  k.box('glass', -1.4, 0.3, 0.25, 1.4, 2.7, 0.26);
  k.box('ember', -0.7, 0.35, 0.05, 0.7, 0.6, 0.2);
  for (const s of [-1, 1]) {
    k.box('mantel', s * 2.9 - 0.32, 0, 0, s * 2.9 + 0.32, 4.15, 0.5);
    for (const f of [-0.15, 0, 0.15]) k.box('mantelPanel', s * 2.9 + f - 0.03, 0.4, 0.5, s * 2.9 + f + 0.03, 3.7, 0.54);
  }
  k.box('mantel', -3.25, 3.9, 0, 3.25, 4.35, 0.55);
  k.box('mantelPanel', -2.5, 4.0, 0.55, 2.5, 4.25, 0.59);
  k.box('mantel', -3.55, 4.35, 0, 3.55, 4.55, 0.85);
  k.box('fpBrick', -3.2, 0, 0.22, 3.2, 0.04, 1.9);
  k.solid(-3.55, 0, 3.55, 0.9, 0, 4.55);
}
function tub(k, w, l, o = {}) { // alcove tub, back at z = 0, length along x
  k.box('porcelain', -l / 2, 0, 0, l / 2, 1.5, w);
  k.box('col:#eef1f2', -l / 2 + 0.3, 1.5, 0.3, l / 2 - 0.3, 1.505, w - 0.3);
  if (o.curtain) { k.box('chrome', -l / 2, 6.6, w - 0.05, l / 2, 6.68, w + 0.05); k.box('fab:#efe9df', -l / 2 + 0.05, 1.6, w, -l / 2 + l * 0.45, 6.55, w + 0.05); for (let i = 0; i < 4; i++) k.box('col:#c2b8ad', -l / 2 + 0.2 + i * 0.6, 2.0, w + 0.05, -l / 2 + 0.45 + i * 0.6, 6.4, w + 0.06); }
  k.cyl('chrome', 0, 0.25, 0.05, 0.05, 2.0, 2.2, 6);
  k.solid(-l / 2, 0, l / 2, w, 0, 1.5);
}
function whirlpool(k, w, l) { // drop-in whirlpool on a tiled deck with a border band, back at z = 0
  k.box('tile:#e6dccb', -l / 2, 0, 0, l / 2, 1.75, w);
  k.box('col:#8d7c69', -l / 2 - 0.01, 1.35, w, l / 2 + 0.01, 1.5, w + 0.01);
  k.box('porcelain', -l / 2 + 0.45, 1.75, 0.4, l / 2 - 0.45, 1.76, w - 0.35);
  k.box('col:#eef1f2', -l / 2 + 0.7, 1.761, 0.6, l / 2 - 0.7, 1.765, w - 0.55);
  k.box('tile:#e6dccb', -l / 2, 1.75, 0, l / 2, 2.6, 0.12);
  k.box('col:#8d7c69', -l / 2, 2.3, 0.12, l / 2, 2.45, 0.13);
  for (const x of [-0.4, 0.4]) k.cyl('chrome', x, 0.25, 0.05, 0.05, 1.75, 2.05, 6);
  k.solid(-l / 2, 0, l / 2, w, 0, 1.75);
}
function goldShower(k, w, d) { // framed glass shower, corner: glass on the two open sides (front at z = d, end at x = 0)
  k.box('col:#ebe3d4', 0, 0, 0, w, 0.25, d);
  for (const [x0, z0, x1, z1] of [[0, d - 0.04, w, d + 0.04], [-0.04, 0, 0.04, d]]) { k.box('showerGlass', x0, 0.25, z0, x1, 6.6, z1); }
  for (const [x, z] of [[0, d], [w, d], [0, 0]]) k.box('goldFrame', x - 0.05, 0.25, z - 0.05, x + 0.05, 6.65, z + 0.05);
  k.box('goldFrame', 0, 6.6, d - 0.05, w, 6.68, d + 0.05); k.box('goldFrame', -0.05, 6.6, 0, 0.05, 6.68, d);
  k.box('goldFrame', w * 0.5, 3.0, d + 0.04, w * 0.5 + 0.06, 4.0, d + 0.12);
  k.box('tile:#e9e2d5', 0, 0.25, 0, w, 7.2, 0.05);
  k.solid(-0.05, 0, w, d + 0.05, 0, 6.6);
}
function looseChair(k, color) { armchair(k, { color }); }
function recliner(k, color = '#28324a') { // leather recliner, centered, faces +z
  const c = 'col:' + color;
  k.soft(c, -1.5, 0.3, -1.4, 1.5, 1.55, 1.5, 0.25);
  k.soft(c, -1.2, 1.2, -1.6, 1.2, 3.4, -0.6, 0.35);
  for (const s of [-1, 1]) k.soft(c, s * 1.5 - 0.35, 0.3, -1.4, s * 1.5 + 0.35, 2.3, 1.3, 0.25);
  k.soft(c, -1.0, 1.4, -0.7, 1.0, 1.8, 1.4, 0.2);
  k.solid(-1.6, -1.6, 1.6, 1.5, 0, 3.2);
}

// ------------------------------------------------------------------ placement
export function buildFixtures(bats) {
  const at = (lv, x, y, rot = 0, extraY = 0) => { const [lx, lz] = P(lv, x, y); return new Kit(bats[lv], lv).at(lx, lz, LV[lv].floor + extraY, rot); };
  const f1 = (x, y, rot = 0, y0 = 0) => { const [lx, lz] = F(x, y); return new Kit(bats.f1, 'f1').at(lx, lz, y0, rot); };
  // ---- kitchen (replaced by the kitchen remodel)
  buildKitchen(renoBat('off:kitchen', 'f1'), 'off:kitchen');
  // ---- family room: fireplace on the back wall between the windows (replaced by the refresh's surround)
  { const [lx, lz] = F(593, 60.5); for (const [tag, y] of [['off:refresh&off:kitchen', H.family], ['off:refresh&on:kitchen', 0]]) fireplace2(new Kit(renoBat(tag, 'f1'), tag).at(lx, lz, y, 0)); }
  // ---- half bath: oak vanity with gray top + brass-framed mirror, toilet
  { const k = f1(628, 307.2, 0); vanity(k, 3.6, 1, { faucet: 'chrome', frame: 'goldFrame', mirrorTop: 6.8 }); lightBar(k, 2.6, 7.2, 4, 'brass'); }
  toilet(f1(681, 307.2, 0));
  // ---- laundry: washer + dryer on the stair wall, oak uppers, drawer desk at the front window
  { const MB = renoBat('off:mud', 'f1'); const { k } = runKit(MB, 'off:mud', F(612.6, 428), F(612.6, 492), [1, 0]); washerDryer(new Kit(MB, 'off:mud').at(...F(612.6, 459.5), 0, 90)); upperCab(k, 0.1, 5.2); }
  {
    const { k, len } = runKit(bats.f1, 'f1', F(613, 561.4), F(697.5, 561.4), [0, -1]);
    for (const [a, b] of [[0.2, 1.7], [len - 1.7, len - 0.2]]) { k.box(OAKCAB, a, 0, 0, b, 2.45, 1.8); for (let i = 0; i < 4; i++) raisedPanel(k, a + 0.05, b - 0.05, 0.1 + i * 0.58, 0.62 + i * 0.58, 1.8); }
    k.box('counter', 0, 2.45, 0, len, 2.58, 1.95); k.solid(0, 0, len, 1.95, 0, 2.58);
  }
  flushDome(f1(655, 470), 9);
  // ---- closets
  { const { k, len } = runKit(bats.f1, 'f1', F(564, 309), F(564, 374), [1, 0]); wicRun(k, len); hangingClothes(k, len, 67, 0, { coats: true }); }
  { const { k, len } = runKit(bats.f1, 'f1', F(783, 376.4), F(837, 376.4), [0, -1]); wicRun(k, len); hangingClothes(k, len, 23, 0.2); }
  { const { k, len } = runKit(renoBat('off:mud', 'f1'), 'off:mud', F(723.4, 382), F(723.4, 449), [-1, 0]); linenShelves(k, len, 31); }
  { const { k, len } = runKit(bats.f1, 'f1', F(723.4, 455), F(723.4, 491), [-1, 0]); linenShelves(k, len, 37); }
  // ---- lights, 1st floor (9 ft ceilings)
  for (const [x, y] of [[335, 372], [335, 452], [372, 470], [440, 455], [440, 390], [372, 330], [440, 335]]) recessed(f1(x, y), 9);
  { const [lx, lz] = F(398, 250); chandelier(new Kit(renoBat('off:refresh&off:kitchen', 'f1'), 'off:refresh&off:kitchen').at(lx, lz, 0), 9, 3.0, 5); }
  for (const [x, y] of [[520, 330], [520, 400], [600, 400]]) recessed(f1(x, y), 9);
  for (const [x, y] of [[740, 250], [800, 250], [740, 330], [800, 310]]) recessed(f1(x, y), 9);
  for (const [x, y] of [[530, 90], [645, 90], [530, 200], [645, 200], [588, 270]]) recessed(f1(x, y), vaultUnder(y));
  { const k = f1(400, 575); k.cyl('chrome', 0, 0, 0.5, 0.5, 9.62, 9.7, 12); for (let i = 0; i < 3; i++) k.cyl('frosted', 0, 0, 0.75 - i * 0.18, 0.6 - i * 0.18, 9.1 + i * 0.18, 9.3 + i * 0.18, 12); } // crystal flush mount in the tray
  { const [lx, lz] = F(520, 500); const k = new Kit(renoBat('off:refresh', 'f1'), 'off:refresh').at(lx, lz, 0); chandelier(k, 18, 5.5, 8); for (let i = 0; i < 3; i++) k.cyl('frosted', 0, 0, 0.9 - i * 0.25, 0.75 - i * 0.25, 12.5 + i * 0.5, 12.9 + i * 0.5, 10, 1, false); } // 2-story foyer crystal chandelier
  flushDome(f1(640, 340), 9); flushDome(f1(640, 400), 9); flushDome(f1(845, 550), 9.39); flushDome(f1(845, 650), 9.39);
  // living room tray ceiling: octagonal raised panel with crown, 9 ft 8 in at the center
  {
    const r = LV.f1._rooms.find((q) => q.name === 'Living Room');
    const [x0, z0] = F(338, 509), [x1, z1] = F(462, 641), c = 1.3;
    const oct = [[x0 + c, z0], [x1 - c, z0], [x1, z0 + c], [x1, z1 - c], [x1 - c, z1], [x0 + c, z1], [x0, z1 - c], [x0, z0 + c]];
    bats.f2.prism({ side: r.wall, top: 'ceiling' }, oct, 9, 9.7);
    bats.f2.poly('ceiling', oct, 9.7, [], true);
    const k = new Kit(bats.f2, 'f1');
    for (let i = 0; i < 8; i++) { const [ax, az] = oct[i], [bx, bz] = oct[(i + 1) % 8]; const len = Math.hypot(bx - ax, bz - az), mx = (ax + bx) / 2, mz = (az + bz) / 2; const kk = new Kit(bats.f2, 'f1').at(mx, mz, 0, (Math.atan2(bx - ax, bz - az) * 180) / Math.PI - 90); kk.box('white', -len / 2, 9.0, -0.15, len / 2, 9.18, 0.0); }
    void k;
  }
  // ---- 2nd floor
  const f2 = (x, y, rot = 0) => { const [lx, lz] = G2(x, y); return new Kit(bats.f2, 'f2').at(lx, lz, H.f2, rot); };
  // hall bath: long oak vanity on the back wall, toilet beside it, tub/shower with a curtain
  { const k = f2(711, 191.9, 0); vanity(k, 5.0, 1, { faucet: 'chrome', sinkX: -0.6, mirrorW: 4.6 }); lightBar(k, 2.5, 7.1, 3, 'chrome'); }
  toilet(f2(686, 191.9, 0));
  tub(f2(692, 239.1, 180), 2.6, 4.55, { curtain: true });
  { const { k, len } = runKit(bats.f2, 'f2', G2(708, 239), G2(732, 239), [0, -1], H.f2); linenShelves(k, len, 13); }
  // primary bath: double oak vanity with a cultured-marble top, water closet, gold-framed shower, whirlpool under the window
  const PB = renoBat('off:pbath', 'f2'), pb2 = (x, y, rot = 0) => { const [lx, lz] = G2(x, y); return new Kit(PB, 'off:pbath').at(lx, lz, H.f2, rot); };
  { const k = pb2(864, 157, 90); vanity(k, 8.6, 2, { faucet: 'chrome', mirrorTop: 7.2 }); lightBar(k, 7.4, 7.5, 6, 'chrome'); }
  toilet(f2(864, 119.3, 90));
  { const [sx, sz] = G2(911, 110.5); goldShower(new Kit(PB, 'off:pbath').at(sx, sz, H.f2, 0), G2(930, 0)[0] - sx, G2(0, 140)[1] - sz); }
  whirlpool(pb2(930.5, 160.5, -90), 3.1, 6.4);
  for (const [x, y] of [[880, 150], [880, 175], [895, 118]]) recessed(f2(x, y), 8);
  // closets
  { const { k, len } = runKit(bats.f2, 'f2', G2(752, 163), G2(782, 163), [0, 1], H.f2); wicRun(k, len); hangingClothes(k, len, 41, 0.3); }
  { const { k, len } = runKit(bats.f2, 'f2', G2(678, 241), G2(732, 241), [0, 1], H.f2); wicRun(k, len); hangingClothes(k, len, 53, 0.4); }
  { const { k, len } = runKit(bats.f2, 'f2', G2(820, 220), G2(820, 288), [1, 0], H.f2); wicRun(k, len); hangingClothes(k, len, 11, 0.1); }
  { const { k, len } = runKit(bats.f2, 'f2', G2(862, 220), G2(862, 288), [-1, 0], H.f2); wicRun(k, len); hangingClothes(k, len, 29, 0.6); }
  { const { k, len } = runKit(bats.f2, 'f2', G2(862, 163), G2(862, 184), [-1, 0], H.f2); linenShelves(k, len, 19); }
  // lights, 2nd floor (8 ft)
  ceilingFan(f2(905, 236), 8, { body: 'brass', blade: wood('#d8d2c6'), drop: 0.8 });
  flushDome(f2(714, 150), 8); flushDome(f2(714, 295), 8); flushDome(f2(742, 218), 8); flushDome(f2(840, 250), 8);
  for (const [x, y] of [[790, 178], [815, 200], [770, 200]]) recessed(f2(x, y), 8);
  // ---- basement (as listed: drywall, bare concrete floors, recessed cans, rough-in bath)
  const fb = (x, y, rot = 0) => { const [lx, lz] = P('b', x, y); return new Kit(bats.b, 'b').at(lx, lz, H.basement, rot); };
  for (const [x, y] of [[420, 290], [470, 290], [420, 400], [480, 420], [420, 520], [480, 560], [440, 640], [600, 260], [700, 260], [650, 130], [720, 130], [600, 130], [860, 300], [860, 360], [735, 400], [735, 520], [590, 530]]) recessed(fb(x, y), 8);
  { // rough-in bath: stub-outs and a capped drain (photo)
    const k = fb(700, 520, 90); k.box('white', 0.0, 1.6, 0, 0.12, 1.75, 0.4); k.cyl('white', 0.5, 0.5, 0.18, 0.18, 0, 0.05, 10); k.box('chrome', 0, 1.9, 0.6, 0.05, 2.0, 0.9);
    const d = fb(740, 548); d.cyl('col:#3a3a3a', 0, 0, 0.2, 0.2, 0, 0.03, 10);
  }
  { // utility closet: water heater; furnace + softener in the north room corner by the chase
    const k = fb(668, 48); k.cyl('col:#e4e4df', 0, 0, 0.95, 0.95, 0, 5.0, 18); k.cyl('chrome', 0, 0, 0.18, 0.18, 5.0, 7.6, 10); k.solid(-0.95, -0.95, 0.95, 0.95, 0, 5);
    const f = fb(760, 90, 0); f.box('col:#c9c9c4', -1.2, 0, -1.3, 1.2, 5.2, 1.3); f.box('col:#b0b4b6', -0.9, 5.2, -0.9, 0.9, 7.6, 0.9); f.solid(-1.2, -1.3, 1.2, 1.3, 0, 5.2);
    const s = fb(720, 90); s.cyl('col:#2d4f86', 0, 0, 0.45, 0.45, 0, 3.6, 12); s.cyl('col:#e3e3df', 1.1, 0, 0.6, 0.6, 0, 2.6, 12);
  }
  // brown accent paint + pilasters on the rec room's long partition (photo)
  { const [x, z0] = P('b', 532.1, 330.5), [, z1] = P('b', 0, 537); new Kit(bats.b, 'b').at(0, 0, H.basement).box('paint:#8a6448', x - 0.03, 0, z0, x, 8.0, z1); }
  // sump pit lid in the stair hall corner
  { const k = fb(646, 344); k.cyl('black', 0, 0, 0.9, 0.9, 0, 0.06, 16); }
  // ---- exterior lights
  exteriorLantern(f1(480, 566.6, 0), 6.0);
  for (const y of [400, 603, 716]) exteriorLantern(f1(990.6, y, 90), 7.2);
  exteriorLantern(f1(905, 375.4, 180), 6.6);
  exteriorLantern(f1(345, 194.4, 180), 6.6);
}

export function buildFurniture(bats) {
  const at = (lv, x, y, rot = 0, y0) => { const [lx, lz] = P(lv, x, y); return new Kit(bats[lv + 'F'], lv + 'F').at(lx, lz, y0 ?? LV[lv].floor, rot); };
  const place = (lv, x, y, rot, fn, y0) => fn(at(lv, x, y, rot, y0));
  const fam = H.family;
  const placeK = (x, y, rot, fn, y0 = 0) => fn(atK(x, y, rot, y0));
  const KF = renoBat('off:kitchen&furn', 'f1'), atK = (x, y, rot = 0, y0 = 0) => { const [lx, lz] = F(x, y); return new Kit(KF, 'off:kitchen&furn').at(lx, lz, y0, rot); };
  // ---- family room (staged like the photos: patterned sofa + loveseat, blue leather recliners, TV on gray cabinets)
  placeK(479, 150, 90, (k) => sofa(k, 7.6, { color: '#4b4262', cushion: '#54486c', pillows: ['#b0283a', '#c9b49a', '#8d2f3a'] }), fam);
  placeK(696.5, 150, -90, (k) => sofa(k, 5.8, { color: '#4b4262', cushion: '#54486c', pillows: ['#b0283a', '#c9b49a'] }), fam);
  placeK(668, 82, -150, (k) => recliner(k), fam);
  placeK(515, 255, 45, (k) => recliner(k), fam);
  placeK(640, 302, 180, (k) => { k.box('col:#9aa0a6', -2.8, 0, 0, 2.8, 2.3, 1.6); for (let i = 0; i < 3; i++) k.box('col:#b7bcc1', -2.7, 0.3 + i * 0.65, 1.6, 2.7, 0.85 + i * 0.65, 1.63); k.solid(-2.8, 0, 2.8, 1.6, 0, 2.3); }, fam);
  placeK(640, 297, 180, (k) => wallTV(k, 55), fam - 0.7);
  // ---- dining area: oak table for six under the chandelier
  {
    const t = atK(398, 250, 0);
    rug(t, 8, 10, '#d9cfbd', '#8d6e4f');
    for (const [cx, cz, r] of diningTable(t, 6, 3.4, { color: '#c99c62' })) { const p = t.P(cx, 0, cz); chair(new Kit(KF, 'off:kitchen&furn').at(p.x, p.z, 0, r), '#d7cfc0', '#c99c62'); }
  }
  // ---- living room: burgundy leather sofa under the side window, glass console, side table
  place('f1', 327, 578, 90, (k) => sofa(k, 7, { color: '#5a2424', cushion: '#622a29', pillows: ['#e9e1d3', '#e9e1d3'] }));
  place('f1', 473.5, 615, -90, (k) => { k.box('glass', -2.0, 2.5, 0, 2.0, 2.56, 1.2); for (const x of [-1.9, 1.9]) k.box('col:#8c8c86', x - 0.04, 0, 0.1, x + 0.04, 2.5, 1.1); k.solid(-2, 0, 2, 1.2, 0, 2.5); });
  place('f1', 400, 600, 0, (k) => rug(k, 6, 8, '#cfc3bc', '#8b6f74'));
  place('f1', 440, 552, -120, (k) => armchair(k, { color: '#e6dfd2' }));
  // ---- office / bedroom 4
  place('f1', 745, 230, 180, (k) => officeDesk(k, 5.0));
  place('f1', 745, 262, 0, (k) => officeChair(k));
  place('f1', 704, 335, 90, (k) => bookcase(k, 2.6, 5.5, 5));
  place('f1', 836.5, 220, -90, (k) => { k.box(wood('#6b4a33'), -1.5, 0, 0, 1.5, 2.4, 1.6); for (let i = 0; i < 3; i++) k.box(wood('#7a5a40'), -1.4, 0.15 + i * 0.75, 1.6, 1.4, 0.8 + i * 0.75, 1.63); k.solid(-1.5, 0, 1.5, 1.6, 0, 2.4); });
  // ---- foyer: wrought-iron console
  place('f1', 479, 470, 90, (k) => { k.box('glass', -1.8, 2.6, 0, 1.8, 2.66, 0.9); for (const x of [-1.7, 1.7]) k.box('col:#8c8c86', x - 0.04, 0, 0.1, x + 0.04, 2.6, 0.8); });
  // ---- garage: two cars in the double bay, storage + bikes in the single bay
  place('f1', 860, 450, -90, (k) => car(k, '#5f6b78'), H.garage);
  place('f1', 860, 548, -90, (k) => car(k, '#d8d8d3'), H.garage);
  place('f1', 703, 640, 90, (k) => shelving(k, 8, 1.6, 6), H.garage);
  place('f1', 703, 700, 90, (k) => shelving(k, 3, 1.6, 6), H.garage);
  // ---- 2nd floor
  const p2 = (x, y, rot, fn) => { const [lx, lz] = G2(x, y); fn(new Kit(bats.f2F, 'f2F').at(lx, lz, H.f2, rot)); };
  // primary: queen bed on the front wall, white dressers, loveseat in the bump under the windows
  p2(895, 275.5, 180, (k) => bed(k, 'queen', { frame: '#efece6', headboard: '#efece6', base: '#7f9aa3', duvet: '#f2efe9', accent: '#243a5e', sham: '#f4f2ee', pillow: '#2f4a6e' }));
  p2(875, 275.5, 180, (k) => nightstand(k, { color: '#efece6', front: '#f4f2ec' }));
  p2(915, 275.5, 180, (k) => nightstand(k, { color: '#efece6', front: '#f4f2ec' }));
  p2(913, 186, 0, (k) => dresser(k, 4.8, { color: '#efece6', front: '#f4f2ec', mirror: true }));
  p2(866, 245, 90, (k) => dresser(k, 2.6, { color: '#efece6', front: '#f4f2ec', h: 4.4 }));
  p2(974, 235, -90, (k) => sofa(k, 5.6, { color: '#ebe4d8', cushion: '#efe9df', pillows: ['#cdbfae', '#b9c3c7'] }));
  p2(945, 200, 0, (k) => desk(k, 3.2));
  // bedroom 3 (pink carpet): twin bed, armoire between the windows, rocking chair
  p2(749.5, 140, -90, (k) => bed(k, 'twin', { frame: '#6f7f72', headboard: '#8a9a8c', duvet: '#efe6dc', accent: '#c58a7a', sham: '#f1e9df', pillow: '#d8b6a6' }));
  p2(680, 175, 90, (k) => { k.box(wood('#9a6a3e'), -1.6, 0, 0, 1.6, 5.4, 1.8); raisedPanel(k, -1.5, -0.03, 2.4, 5.2, 1.8, wood('#9a6a3e'), wood('#a8774a')); raisedPanel(k, 0.03, 1.5, 2.4, 5.2, 1.8, wood('#9a6a3e'), wood('#a8774a')); k.solid(-1.6, 0, 1.6, 1.8, 0, 5.4); });
  p2(700, 125, 160, (k) => armchair(k, { color: '#efe9dd' }));
  // bedroom 2 (bay): full pine bed, dark dresser
  p2(749.5, 300, -90, (k) => bed(k, 'full', { frame: '#b98a52', headboard: '#c49460', duvet: '#efe4e6', accent: '#b8a2c2', sham: '#efe8e0', pillow: '#c9b2cc' }));
  p2(678, 262, 90, (k) => dresser(k, 2.6, { color: '#4e3324', front: '#5b3c2a', h: 3.6 }));
  // loft: built-in desk with bookshelves at the balcony rail, white chair
  p2(810, 166, 0, (k) => { k.box(wood('#e8d9bf'), -3.0, 2.45, 0, 3.0, 2.55, 2.0); for (const x of [-3.0, 1.8]) { k.box(wood('#e8d9bf'), x, 0, 0, x + 1.2, 2.45, 2.0); for (let y = 0.6; y < 2.4; y += 0.6) k.box('col:' + ['#7a3b2e', '#2e4a6e', '#c9a96e', '#3e5a3c'][Math.floor(y * 3) % 4], x + 0.1, y - 0.5, 0.3, x + 1.1, y - 0.05, 1.6); } tableLamp(k, -2.4, 1.0, 2.55); tableLamp(k, 2.4, 1.0, 2.55); k.solid(-3, 0, 3, 2, 0, 2.55); });
  p2(810, 178, 180, (k) => chair(k, '#f4f2ee', '#f4f2ee'));
  // ---- basement as listed: a pair of cream swivel chairs and carpet remnants in the rec room, a dresser in the north room
  const pb = (x, y, rot, fn) => { const [lx, lz] = P('b', x, y); fn(new Kit(renoBat('lay:0&furn', 'b'), 'lay:0&furn').at(lx, lz, H.basement, rot)); };
  pb(500, 300, -100, (k) => armchair(k, { color: '#efe9dd' }));
  pb(500, 360, -80, (k) => armchair(k, { color: '#efe9dd' }));
  pb(450, 330, 0, (k) => rug(k, 7, 12, '#cdbd9f', '#cdbd9f'));
  pb(660, 200, 180, (k) => { k.box(wood('#2f2219'), -2.0, 0, 0, 2.0, 1.6, 1.6); k.solid(-2, 0, 2, 1.6, 0, 1.6); });
  // ---- back patio as it is: four cast-aluminum chairs around a fire bowl, grill
  const pat = (x, z, rot, fn) => fn(new Kit(renoBat('off:patio', 'site'), 'off:patio').at(x, z, -0.96, rot));
  pat(10.5, 8, 0, (k) => { k.cyl('col:#5a3a2a', 0, 0, 1.2, 0.8, 0, 1.2, 14); k.cyl('ember', 0, 0, 0.9, 0.9, 1.15, 1.2, 12); k.solid(-1, -1, 1, 1, 0, 1.2); });
  for (const [dx, dz] of [[-2.6, -2.2], [2.6, -2.2], [-2.6, 2.2], [2.6, 2.2]]) pat(10.5 + dx, 8 + dz, (Math.atan2(-dx, -dz) * 180) / Math.PI, (k) => patioChair(k));
  pat(13.6, 2.8, 0, (k) => { k.box('black', -1.2, 2.6, -0.8, 1.2, 3.6, 0.8); k.box('black', -1.2, 0, -0.6, 1.2, 2.6, 0.6); k.cyl('col:#e8e8e4', 0.6, 0.0, 0.5, 0.5, 0.0, 1.6, 10); k.solid(-1.2, -0.8, 1.2, 0.8, 0, 3.6); });
}
export { exteriorLantern, raisedPanel };
export {
  bed, nightstand, dresser, bench, sofa, armchair, coffeeTable, sideTable, rug, chair, diningTable, roundTable, buffet, plant,
  floorLamp, tableLamp, knob, toilet, vanity, lightBar, wicRun, linenShelves, hangingClothes, recessed, flushDome, globePendant,
  chandelier, ceilingFan, firePit, adirondack, patioDining, patioChair, powerRack, liftBench, dumbbellRack, pelotonBike,
  bodyPumpArea, treadmill, rubberFloor, shelving, runKit, disc, bar, officeChair, officeDesk, bookcase, IRON, RUBBER, shadeHex, taperLeg,
  wallTV, mediaConsole, projectionScreen, towerSpeaker, desk, baseCab, upperCab, counter, range, fridge, tub, recliner, goldShower, whirlpool,
};
