// Fixtures (kitchen, baths, fireplace, lights...) and staged furniture, built to real
// dimensions in feet. Components use a Kit (see geom.js): local x = width, z = depth with
// the front at +z, y = up. Wall-mounted pieces have their back at z = 0.
import { LEVELS, toFt, F2, H, ceilAt, ENTRY } from './data.js';
import { Kit, V, swap, item } from './geom.js';
import { renoBat } from './build.js';

const LV = Object.fromEntries(LEVELS.map((L) => [L.id, L]));
const P = (lv, x, y) => toFt(LV[lv].map(x, y));
const fab = (c) => 'fab:' + c;
const wood = (c) => 'wood:' + c;
const OAKCAB = 'cab', OAKDOOR = 'cabDoor', OAKPANEL = 'cabPanel'; // themeable cabinet finishes
const DARKWOOD = wood('#4e3324'), MIDWOOD = wood('#7a5234');

// ------------------------------------------------------------------ small parts
function knob(k, x, y, z, key = 'steel') { k.cyl(key, x, z + 0.015, 0.03, 0.03, y - 0.03, y + 0.03, 8); k.cbox(key, x, z + 0.06, 0.1, 0.03, y - 0.05, y + 0.05); } // brushed-nickel round knob (photo 12)
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
  if (o.style === 'iron') { // painted metal headboard: two posts with finials, rails and pickets (bedroom 3)
    const m = 'col:' + hb, ih = hh + 0.7;
    for (const s of [-1, 1]) { k.cyl(m, s * (W / 2 - 0.05), z0 - 0.12, 0.07, 0.07, 0, ih, 8); k.cyl(m, s * (W / 2 - 0.05), z0 - 0.12, 0.12, 0.03, ih, ih + 0.2, 8); }
    for (const y of [2.0, ih - 0.3]) k.box(m, -W / 2, y, z0 - 0.15, W / 2, y + 0.07, z0 - 0.09);
    for (let i = 1; i < 8; i++) { const x = -W / 2 + (W * i) / 8; k.box(m, x - 0.025, 2.06, z0 - 0.14, x + 0.025, ih - 0.3, z0 - 0.1); }
  } else if (o.style === 'arch') { // painted wood headboard with an arched top rail and corner posts (primary bed, photo 27)
    const wd = wood(hb), hk = new Kit(k.bat, k.tag).at(k.ox, k.oz, k.oy, k.rot + 90), r = W / 2, y1 = hh - 0.55;
    const arc = (rr, dy) => [...Array(11)].map((_, i) => { const a = Math.PI * (i / 10); return [Math.cos(a) * rr, y1 + dy + Math.sin(a) * 0.55 * (rr / r)]; });
    hk.prof(wd, [[-r, 0], [r, 0], ...arc(r, 0)], -z0 + 0.03, -z0 + 0.2);
    hk.prof(wood(shadeHex(hb, 0.95)), [[-r + 0.35, 1.4], [r - 0.35, 1.4], ...arc(r - 0.35, -0.3)], -z0 - 0.01, -z0 + 0.03);
    for (const s of [-1, 1]) k.box(wd, s * r - 0.12, 0, z0 - 0.24, s * r + 0.12, y1 + 0.1, z0 - 0.0);
  } else if (o.style === 'pine') { // solid pine bed: turned posts, panel headboard and footboard (bedroom 2)
    const wd = wood(hb);
    for (const s of [-1, 1]) { k.cyl(wd, s * (W / 2 - 0.05), z0 - 0.1, 0.13, 0.13, 0, hh, 10); k.cyl(wd, s * (W / 2 - 0.05), z0 - 0.1, 0.16, 0.05, hh, hh + 0.35, 10); k.cyl(wd, s * (W / 2 - 0.05), z1 + 0.05, 0.12, 0.12, 0, 2.3, 10); k.cyl(wd, s * (W / 2 - 0.05), z1 + 0.05, 0.15, 0.04, 2.3, 2.6, 10); }
    k.box(wd, -W / 2 + 0.1, 1.6, z0 - 0.17, W / 2 - 0.1, hh - 0.25, z0 - 0.03);
    k.box(wd, -W * 0.3, hh - 0.3, z0 - 0.17, W * 0.3, hh + 0.05, z0 - 0.03);
    k.box(wd, -W / 2 + 0.1, 1.0, z1 - 0.05, W / 2 - 0.1, 1.9, z1 + 0.1);                     // footboard
  } else {
  // channel-tufted upholstered headboard on wood legs
  k.box(wood(frame), -W / 2 - 0.05, 0, 0.05, -W / 2 + 0.12, 1.0, z0 - 0.05);
  k.box(wood(frame), W / 2 - 0.12, 0, 0.05, W / 2 + 0.05, 1.0, z0 - 0.05);
  k.soft(fab(hb), -W / 2 - 0.1, 0.95, 0, W / 2 + 0.1, hh, z0, 0.14);
  const ch = Math.max(4, Math.round(W / 1.1));
  for (let i = 1; i < ch; i++) { const x = -W / 2 + (W * i) / ch; k.box(fab(shadeHex(hb, 0.82)), x - 0.02, 1.15, z0 - 0.01, x + 0.02, hh - 0.18, z0 + 0.012); }
  }
  // upholstered platform frame on tapered legs
  if (o.skirt) k.box(fab(o.skirt), -mw / 2 - 0.04, 0.02, z0 + 0.05, mw / 2 + 0.04, 1.0, z1 - 0.05); // box spring + bed skirt to the floor
  else {
    for (const [x, z] of [[-W / 2 + 0.2, z0 + 0.25], [W / 2 - 0.2, z0 + 0.25], [-W / 2 + 0.2, z1 - 0.25], [W / 2 - 0.2, z1 - 0.25]]) taperLeg(k, wood(frame), x, z, 0.45);
    k.soft(fab(o.base || hb), -W / 2, 0.42, z0, W / 2, 1.05, z1, 0.08);
  }
  // mattress, duvet draped over the sides and foot, folded-back sheet
  k.soft(fab('#f4f2ed'), -mw / 2, 0.98, z0 + 0.08, mw / 2, 1.9, z1 - 0.08, 0.22);
  const dz0 = z0 + 1.6;
  k.soft(fab(duvet), -mw / 2 - 0.13, 1.22, dz0, mw / 2 + 0.13, 2.07, z1 + 0.05, 0.2);
  k.soft(fab('#fbfaf6'), -mw / 2 - 0.1, 1.84, dz0 - 0.38, mw / 2 + 0.1, 2.12, dz0 + 0.16, 0.13);
  if (o.quilt) k.soft(fab(o.quilt), -mw / 2 - 0.22, 0.9, dz0 + 0.5, mw / 2 + 0.22, 2.14, z1 + 0.12, 0.12); // patterned quilt over most of the bed
  else k.soft(fab(accent), -mw / 2 - 0.17, 1.45, z1 - 1.6, mw / 2 + 0.17, 2.13, z1 - 0.55, 0.14); // throw
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
  if (o.mirror && o.arch) { // arched-top mirror (primary bedroom set, photos 27-28)
    const mk = new Kit(k.bat, k.tag).at(k.ox, k.oz, k.oy, k.rot + 90), mw = w * 0.3, y0 = h + 0.1, y1 = h + 2.2, ya = h + 2.9;
    const arc = (r) => [...Array(9)].map((_, i) => { const a = Math.PI * (i / 8); return [Math.cos(a) * r, y1 + Math.sin(a) * (ya - y1) * (r / mw)]; });
    mk.prof(c, [[-mw, y0], [mw, y0], ...arc(mw)], -0.12, 0);
    mk.prof('mirror', [[-mw + 0.2, y0 + 0.2], [mw - 0.2, y0 + 0.2], ...arc(mw - 0.2)], -0.14, -0.12);
  } else if (o.mirror) {
    k.box(wood('#5b3a26'), -w * 0.35, h + 0.6, 0, w * 0.35, h + 3.6, 0.12);
    k.box('mirror', -w * 0.35 + 0.15, h + 0.75, 0.12, w * 0.35 - 0.15, h + 3.45, 0.14);
  }
  if (o.lamp) tableLamp(k, -w / 2 + 0.7, d / 2, h + 0.08);
  if (o.lamps) for (const s of [-1, 1]) { const x = s * (w / 2 - 0.75); k.cyl('col:#d9cfb8', x, d / 2, 0.3, 0.42, h + 0.08, h + 1.25, 14); k.cyl('brass', x, d / 2, 0.04, 0.04, h + 1.25, h + 1.6, 6); k.cyl('shade', x, d / 2, 0.75, 0.45, h + 1.5, h + 2.3, 14, 1, false); } // ceramic urn lamps
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
  const d = o.roll ? 3.3 : 3.15, base = fab(o.color || '#dcd3c6'), cush = fab(o.cushion || o.color || '#e3dbcf'), arm = o.roll ? 0.78 : 0.62;
  if (o.roll) { // 90s traditional: skirted to the floor, big outward-rolled arms, pillow back (family room, photos 07-10)
    k.soft(base, -len / 2 + 0.06, 0.0, 0.08, len / 2 - 0.06, 0.62, d - 0.02, 0.06);                  // skirt
    k.soft(base, -len / 2 + 0.08, 0.5, 0.05, len / 2 - 0.08, 1.12, d - 0.04, 0.14);                 // deck
    k.soft(base, -len / 2 + 0.12, 0.9, 0, len / 2 - 0.12, 2.6, 0.75, 0.26);                         // back frame
    for (const sd of [-1, 1]) {
      const x0 = sd < 0 ? -len / 2 + 0.06 : len / 2 - arm + 0.02, x1 = sd < 0 ? -len / 2 + arm - 0.02 : len / 2 - 0.06;
      k.soft(base, x0 + (sd < 0 ? 0.08 : 0), 0.3, 0.05, x1 - (sd > 0 ? 0.08 : 0), 1.9, d - 0.05, 0.22);   // arm body
      k.soft(base, x0 - (sd < 0 ? 0.06 : 0) , 1.55, 0.02, x1 + (sd > 0 ? 0.06 : 0), 2.28, d + 0.02, 0.36, 18, 10); // the roll, flaring out
      k.soft(base, x0 + 0.05, 0.55, d - 0.12, x1 - 0.05, 2.15, d + 0.04, 0.3);                       // rounded arm front
    }
  } else {
    for (const x of [-len / 2 + 0.3, len / 2 - 0.3]) for (const z of [0.3, d - 0.3]) taperLeg(k, DARKWOOD, x, z, 0.4, 0.05, 0.08);
    k.soft(base, -len / 2, 0.38, 0.05, len / 2, 1.1, d, 0.12);                       // base
    k.soft(base, -len / 2 + 0.05, 0.9, 0, len / 2 - 0.05, 2.75, 0.85, 0.24);          // back frame
    k.soft(base, -len / 2, 0.9, 0.05, -len / 2 + arm, 2.12, d, 0.26);                 // rolled arms
    k.soft(base, len / 2 - arm, 0.9, 0.05, len / 2, 2.12, d, 0.26);
  }
  const seats = len > 6.5 ? 3 : 2, sw = (len - 2 * arm) / seats;
  for (let i = 0; i < seats; i++) {
    const x = -len / 2 + arm + i * sw;
    k.soft(cush, x + 0.02, 1.0, 0.72, x + sw - 0.02, 1.5, d + 0.03, o.roll ? 0.2 : 0.16);         // seat cushion (18" seat)
    if (o.roll) k.soft(cush, x - 0.02, 1.4, 0.45, x + sw + 0.02, 2.95, 1.35, 0.42);       // overstuffed pillow back
    else k.soft(cush, x + 0.04, 1.45, 0.6, x + sw - 0.04, 2.72, 1.25, 0.28);            // back cushion
  }
  const pc = o.pillows || ['#a77b6b', '#c9b49a', '#8d6e5d'];
  for (let i = 0; i < 2; i++) {
    const p = k.P((i ? 1 : -1) * (len / 2 - arm - 0.8), 0, 1.4);
    const sub = new Kit(k.bat, k.tag).at(p.x, p.z, k.oy, k.rot + (i ? -20 : 20));
    sub.soft(fab(pc[i % pc.length]), -0.66, 1.52, -0.17, 0.66, 2.8, 0.17, 0.22);
  }
  k.solid(-len / 2, 0, len / 2, d, 0, 2.85);
}

// L-shaped sectional: main run along local x from 0 to a (back at z = 0, facing +z) with an arm at x = 0; the return
// runs from the x = a end along +z to b (back on the x = a side). Seat 18", depth 38", back 33".
function sectional(k, a, b, o = {}) {
  const d = 3.15, base = fab(o.color || '#6d6458'), cush = fab(o.cushion || o.color || '#766c60'), arm = 0.62;
  k.soft(base, 0, 0.3, 0, a, 1.1, d, 0.12); k.soft(base, a - d, 0.3, d - 0.2, a, 1.1, b, 0.12);
  k.soft(base, 0.05, 0.9, 0, a, 2.75, 0.85, 0.22); k.soft(base, a - 0.85, 0.9, 0.85, a, 2.75, b - 0.05, 0.22);
  k.soft(base, 0, 0.9, 0.05, arm, 2.12, d, 0.24); k.soft(base, a - d, 0.9, b - arm, a - 0.05, 2.12, b, 0.24);
  const nA = Math.max(1, Math.round((a - arm - 0.85) / 2.6)), wA = (a - arm - 0.85) / nA;
  for (let i = 0; i < nA; i++) { const x = arm + i * wA; k.soft(cush, x + 0.03, 1.0, 0.75, x + wA - 0.03, 1.5, d + 0.03, 0.15); k.soft(cush, x + 0.05, 1.4, 0.6, x + wA - 0.05, 2.7, 1.2, 0.26); }
  k.soft(cush, a - d + 0.03, 1.0, 0.75, a - 0.75, 1.5, d - 0.03, 0.15);                    // corner seat
  const nB = Math.max(1, Math.round((b - d - arm) / 2.6)), wB = (b - d - arm) / nB;
  for (let i = 0; i < nB; i++) { const z = d + i * wB; k.soft(cush, a - d - 0.03, 1.0, z + 0.03, a - 0.75, 1.5, z + wB - 0.03, 0.15); k.soft(cush, a - 1.2, 1.4, z + 0.05, a - 0.6, 2.7, z + wB - 0.05, 0.26); }
  const pc = o.pillows || ['#b48a5a', '#5d6b73'];
  for (let i = 0; i < 2; i++) k.soft(fab(pc[i % pc.length]), i ? a - 2.3 : arm + 0.25, 1.5, 0.75, i ? a - 0.95 : arm + 1.6, 2.75, 1.1, 0.2);
  k.solid(0, 0, a, d, 0, 2.8); k.solid(a - d, d, a, b, 0, 2.8);
}
function armchair(k, o = {}) { // centered, faces +z
  const w = 2.7, d = 2.9, c = fab(o.color || '#ebe6dc');
  for (const x of [-w / 2 + 0.22, w / 2 - 0.22]) for (const z of [-d / 2 + 0.22, d / 2 - 0.22]) taperLeg(k, DARKWOOD, x, z, 0.5, 0.05, 0.08);
  k.soft(c, -w / 2, 0.48, -d / 2, w / 2, 1.2, d / 2, 0.12);
  k.soft(c, -w / 2 + 0.05, 1.0, -d / 2, w / 2 - 0.05, 2.85, -d / 2 + 0.6, 0.24);
  k.soft(c, -w / 2, 1.0, -d / 2, -w / 2 + 0.45, 2.2, d / 2, 0.2);
  k.soft(c, w / 2 - 0.45, 1.0, -d / 2, w / 2, 2.2, d / 2, 0.2);
  k.soft(c, -w / 2 + 0.43, 1.05, -d / 2 + 0.5, w / 2 - 0.43, 1.5, d / 2 + 0.02, 0.15); // 18" seat
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
  k.box(fab(border), -w / 2, 0.01, -d / 2, w / 2, 0.035, d / 2);       // (layers kept well apart so they never flicker)
  k.box(fab(field), -w / 2 + 0.5, 0.012, -d / 2 + 0.5, w / 2 - 0.5, 0.06, d / 2 - 0.5);
}
function chair(k, color = '#a59f94', woodc = '#6b4a33') { // dining chair, centered, faces +z
  const w = 1.55, d = 1.65;
  for (const x of [-w / 2 + 0.12, w / 2 - 0.12]) for (const z of [-d / 2 + 0.12, d / 2 - 0.12]) taperLeg(k, wood(woodc), x, z, 1.32, 0.05, 0.07);
  k.soft(fab(color), -w / 2, 1.28, -d / 2, w / 2, 1.52, d / 2, 0.1); // 18" seat
  k.soft(fab(color), -w / 2 + 0.04, 1.45, -d / 2 - 0.02, w / 2 - 0.04, 3.15, -d / 2 + 0.26, 0.11);
  k.solid(-w / 2, -d / 2, w / 2, d / 2, 0, 1.52);
}

function spindleChair(k, seat = '#9c9a96', woodc = '#d0a065') { // oak pressed-back spindle chair with a seat pad (photo 16), centered, faces +z
  const w = 1.5, d = 1.55, c = wood(woodc);
  for (const x of [-w / 2 + 0.12, w / 2 - 0.12]) for (const z of [-d / 2 + 0.12, d / 2 - 0.12]) taperLeg(k, c, x, z, 1.45, 0.05, 0.07);
  for (const z of [-d / 2 + 0.12, d / 2 - 0.12]) k.box(c, -w / 2 + 0.12, 0.5, z - 0.03, w / 2 - 0.12, 0.56, z + 0.03);
  k.box(c, -w / 2, 1.42, -d / 2, w / 2, 1.52, d / 2);                                          // seat (18")
  k.soft(fab(seat), -w / 2 + 0.1, 1.52, -d / 2 + 0.15, w / 2 - 0.1, 1.62, d / 2 - 0.05, 0.05); // pad
  for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) k.cyl(c, x, -d / 2 + 0.08, 0.05, 0.05, 1.5, 3.45, 8); // back posts
  for (let i = 1; i < 5; i++) { const x = -w / 2 + 0.1 + ((w - 0.2) * i) / 5; k.cyl(c, x, -d / 2 + 0.08, 0.025, 0.025, 1.52, 2.65, 6); }
  k.box(c, -w / 2 + 0.08, 2.6, -d / 2 + 0.02, w / 2 - 0.08, 3.4, -d / 2 + 0.13);               // pressed crest
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
// straight rod of square section between two local points (for tilted or curved parts: chain several)
function rod(k, key, a, b, r = 0.03) {
  const A = k.P(...a), B = k.P(...b), d = B.clone().sub(A);
  if (d.lengthSq() < 1e-8) return;
  const up = Math.abs(d.y) / d.length() > 0.9 ? V(1, 0, 0) : V(0, 1, 0);
  const u = d.clone().cross(up).normalize().multiplyScalar(2 * r), w = d.clone().cross(u).normalize().multiplyScalar(2 * r);
  k.bat.box(key, A.clone().addScaledVector(u, -0.5).addScaledVector(w, -0.5), u, d, w);
}
// ---- true-size vehicles for planning the garage. Centered, length along local z, nose at +z.
// The body is lofted from cross-sections every 3": a side outline (bottom with wheel-arch cut-outs,
// beltline, greenhouse roof line), a plan outline with rounded nose and tail corners, shoulders and
// tumblehome. Glass, pillars and roof are picked per section segment.
const TIRE = 'col:#161718', TRIMBLK = 'col:#1b1c1e', CARGLASS = 'col:#1a2027';
function ring(cz, cy, r, n = 20) { return [...Array(n)].map((_, i) => [cz + Math.cos((i / n) * Math.PI * 2) * r, cy + Math.sin((i / n) * Math.PI * 2) * r]); }
function lerpPts(pts, z) { // piecewise-linear y(z); pts sorted by z
  if (z <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (z <= pts[i][0]) { const [z0, y0] = pts[i - 1], [z1, y1] = pts[i]; return y0 + ((y1 - y0) * (z - z0)) / (z1 - z0 || 1); }
  return pts[pts.length - 1][1];
}
function vehicle(k, o) {
  const { L, W, H, r } = o, body = 'col:' + o.color, h = L / 2, HW = W / 2, rc = o.rc;
  const zf = h - o.fo, zr = zf - o.wb, belt = o.belt, roof = o.roof.slice().sort((a, b) => a[0] - b[0]);
  const g0 = roof[0][0], g1 = roof[roof.length - 1][0];
  const inR = (z, [a, b]) => z >= a && z <= b;
  const hwAt = (z) => { const d = h - Math.abs(z); return d >= rc ? HW : HW - (rc - Math.sqrt(Math.max(0, rc * rc - (rc - d) * (rc - d)))); };
  const botAt = (z) => { let y = o.base; for (const w of [zf, zr]) { const dz = Math.abs(z - w), R = r + 0.22; if (dz < R) y = Math.max(y, r * 0.95 + Math.sqrt(R * R - dz * dz)); } return Math.min(y, lerpPts(belt, z) - 0.6); };
  const section = (z) => {
    const hw = hwAt(z), yb = botAt(z), yt = lerpPts(belt, z), gr = z > g0 && z < g1 ? Math.max(yt, lerpPts(roof, z)) : yt, gh = gr - yt;
    const half = [[hw - 0.28, yb], [hw, Math.min(yb + 0.35, yt - 0.5)], [hw, yt - 0.55], [hw - 0.06, yt - 0.12], [hw - 0.3, yt],
      [hw - 0.32 - gh * 0.24, yt + gh * 0.92], [hw - 0.5 - gh * 0.3, gr], [0, gr + (gh > 0.1 ? 0.05 : 0.04)]];
    return half.map(([x, y]) => [-x, y]).concat(half.slice(0, -1).reverse());
  };
  const segKey = (j, z, gh) => { // j: 0..14 over the section (7 = center)
    const m = j < 7 ? j : 13 - j + 0; // mirror index 0..6
    if (m <= 0) return o.rocker || body;
    if (m <= 3) return body;
    if (gh < 0.08) return body;                                     // hood / rear deck
    const ws = inR(z, o.ws), rg = inR(z, o.rg);
    if (m === 4) return o.pillars.some((p) => inR(z, p)) ? (o.pillarKey || body) : CARGLASS; // side windows
    if (m === 5) return ws || rg ? (o.pillarKey || body) : (o.roofKey || body);               // A / D pillars, roof edge
    return ws || rg ? CARGLASS : (o.roofKey || body);                                          // windshield, rear glass, roof
  };
  const N = Math.ceil(L / 0.25), Z = [...Array(N + 1)].map((_, i) => -h + (L * i) / N);
  const S = Z.map((z) => section(z).map(([x, y]) => [x, y, z]));
  const M = S[0].length, cen = (i) => [0, (botAt(Z[i]) + lerpPts(belt, Z[i])) / 2, Z[i]];
  const nrm = (a, b, c) => { const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]; const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; const l = Math.hypot(...n) || 1; return n.map((t) => t / l); };
  // vertex normals: average of adjacent face normals, oriented away from the section center
  const FN = [];
  for (let i = 0; i < N; i++) { FN.push([]); for (let j = 0; j < M - 1; j++) { let n = nrm(S[i][j], S[i + 1][j], S[i][j + 1]); const c = cen(i), p = S[i][j]; if (n[0] * (p[0] - c[0]) + n[1] * (p[1] - c[1]) < 0 && Math.abs(n[2]) < 0.9) n = n.map((t) => -t); FN[i].push(n); } }
  const VN = (i, j) => { let s = [0, 0, 0]; for (const ii of [i - 1, i]) for (const jj of [j - 1, j]) { const f = FN[ii] && FN[ii][jj]; if (f) s = s.map((t, q) => t + f[q]); } const l = Math.hypot(...s) || 1; return s.map((t) => t / l); };
  const W3 = (p) => k.P(p[0], p[1], p[2]), WN = (n) => k.P(n[0], n[1], n[2]).sub(k.P(0, 0, 0));
  for (let i = 0; i < N; i++) {
    const zm = (Z[i] + Z[i + 1]) / 2, gh = Math.max(0, (zm > g0 && zm < g1 ? lerpPts(roof, zm) : 0) - lerpPts(belt, zm));
    for (let j = 0; j < M - 1; j++) {
      const key = segKey(j, zm, gh), a = S[i][j], b = S[i + 1][j], c = S[i + 1][j + 1], d = S[i][j + 1];
      const raw = nrm(a, b, d), flip = raw[0] * FN[i][j][0] + raw[1] * FN[i][j][1] + raw[2] * FN[i][j][2] < 0;
      const [na, nb, nc, nd] = [VN(i, j), VN(i + 1, j), VN(i + 1, j + 1), VN(i, j + 1)].map(WN);
      if (!flip) { k.bat.triN(key, W3(a), W3(b), W3(c), na, nb, nc); k.bat.triN(key, W3(a), W3(c), W3(d), na, nc, nd); }
      else { k.bat.triN(key, W3(a), W3(c), W3(b), na, nc, nb); k.bat.triN(key, W3(a), W3(d), W3(c), na, nd, nc); }
    }
    k.bat.face(TRIMBLK, [W3(S[i][0]), W3(S[i + 1][0]), W3(S[i + 1][M - 1]), W3(S[i][M - 1])], WN([0, -1, 0])); // underbody
  }
  for (const [i, s] of [[0, -1], [N, 1]]) { // nose and tail caps (fan around the center)
    const c = W3(cen(i)), n = WN([0, 0, s]);
    for (let j = 0; j < M; j++) k.bat.face(o.capKey || body, [c, W3(S[i][j]), W3(S[i][(j + 1) % M])], n);
  }
  const noseZ = (x, s = 1) => { const ax = Math.abs(x); if (ax <= HW - rc) return s * h; const t = rc - (HW - ax); return s * (h - (rc - Math.sqrt(Math.max(0, rc * rc - t * t)))); };
  for (const z of [zf, zr]) for (const s of [-1, 1]) { // tires and wheels
    k.prof(TIRE, ring(z, r, r, 24), s > 0 ? HW - 0.9 : -HW + 0.08, s > 0 ? HW - 0.08 : -HW + 0.9);
    k.prof('col:#2a2c2e', ring(z, r, r * 0.68, 20), s > 0 ? HW - 0.1 : -HW + 0.07, s > 0 ? HW - 0.07 : -HW + 0.1);
    for (let i = 0; i < (o.spokes || 5); i++) {
      const a = (i / (o.spokes || 5)) * Math.PI * 2, sw = o.spokeW || 0.2;
      k.prof(o.rim || 'col:#b9bcbf', [[z + Math.cos(a) * 0.14, r + Math.sin(a) * 0.14], [z + Math.cos(a + sw) * r * 0.66, r + Math.sin(a + sw) * r * 0.66], [z + Math.cos(a - sw) * r * 0.66, r + Math.sin(a - sw) * r * 0.66]], s > 0 ? HW - 0.07 : -HW + 0.04, s > 0 ? HW - 0.04 : -HW + 0.07);
    }
    k.prof(o.rim || 'col:#b9bcbf', ring(z, r, 0.2, 10), s > 0 ? HW - 0.07 : -HW + 0.03, s > 0 ? HW - 0.03 : -HW + 0.07);
  }
  for (const s of [-1, 1]) { // mirrors and door handles
    const yb = lerpPts(belt, o.mirrorZ);
    k.soft(body, s > 0 ? HW - 0.3 : -HW - 0.5, yb + 0.05, o.mirrorZ - 0.15, s > 0 ? HW + 0.5 : -HW + 0.3, yb + 0.55, o.mirrorZ + 0.3, 0.12, 10, 6);
    for (const z of o.handles) k.box(o.handleKey || 'col:#cfd2d4', s > 0 ? HW - 0.02 : -HW - 0.03, lerpPts(belt, z) - 0.42, z - 0.4, s > 0 ? HW + 0.03 : -HW + 0.02, lerpPts(belt, z) - 0.32, z + 0.1);
  }
  o.details(k, { h, HW, body, zf, zr, noseZ });
  k.solid(-HW, -h, HW, h, 0, H);
}
// thin panel lying on the nose (s = 1) or tail (s = -1) surface between x0 and x1
function noseLamp(k, key, ctx, x0, x1, y0, y1, s = 1, t = 0.04) {
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = x0 + ((x1 - x0) * i) / n, b = x0 + ((x1 - x0) * (i + 1)) / n, z = ctx.noseZ((a + b) / 2, s);
    k.box(key, a, y0, s > 0 ? z - 0.15 : z - t, b, y1, s > 0 ? z + t : z + 0.15);
  }
}
// Rivian R2: 185.6" L x 75.9" W x 66.9" H, 115.6" wheelbase. Upright two-row with short overhangs, a
// near-vertical tailgate glass, black wheel-arch cladding, oval "stadium" headlights joined by a light bar,
// and a full-width tail bar.
function rivianR2(k, color = '#56634a') {
  const L = 15.47, W = 6.33, H = 5.58, h = L / 2;
  vehicle(k, {
    L, W, H, color, wb: 9.63, fo: 2.9, r: 1.3, rc: 0.75, base: 1.05, rocker: TRIMBLK, mirrorZ: h - 4.7, spokes: 6, spokeW: 0.16, rim: 'col:#8d9196',
    belt: [[-h, 3.25], [-h + 0.25, 3.55], [h - 4.2, 3.5], [h - 2.2, 3.38], [h - 0.55, 3.22], [h, 2.75]],
    roof: [[h - 4.2, 3.5], [h - 6.05, 5.4], [h - 6.5, 5.52], [-h + 0.9, 5.55], [-h + 0.32, 5.25], [-h + 0.2, 3.56]],
    ws: [h - 6.1, h - 4.2], rg: [-h + 0.15, -h + 0.5], pillars: [[0.05, 0.45], [-h + 0.5, -h + 1.75]],
    pillarKey: TRIMBLK, handles: [0.9, -1.6],
    details(k, c) {
      for (const s of [-1, 1]) {                                                           // stadium headlights
        const x = s * (c.HW - 1.15), z = c.noseZ(x);
        k.soft('col:#f4f3ea', x - 0.42, 2.38, z - 0.2, x + 0.42, 2.92, z + 0.05, 0.26, 14, 8);
        k.soft('col:#2b2d30', x - 0.3, 2.47, z - 0.15, x + 0.3, 2.83, z + 0.06, 0.18, 12, 6);
      }
      noseLamp(k, 'col:#eceadf', c, -c.HW + 1.6, c.HW - 1.6, 2.6, 2.68);                   // light bar
      noseLamp(k, TRIMBLK, c, -c.HW + 0.5, c.HW - 0.5, 1.05, 1.75);                          // lower bumper
      noseLamp(k, 'col:#b3141b', c, -c.HW + 0.35, c.HW - 0.35, 3.08, 3.2, -1);               // full-width tail bar
      noseLamp(k, TRIMBLK, c, -c.HW + 0.5, c.HW - 0.5, 1.05, 1.6, -1);
      for (const s of [-1, 1]) k.box('col:#2a2c2f', s > 0 ? c.HW - 0.75 : -c.HW + 0.6, 5.55, -h + 1.2, s > 0 ? c.HW - 0.6 : -c.HW + 0.75, 5.66, h - 6.6); // roof rails
    },
  });
}
// Acura MDX (2025): 198.7" L x 78.7" W x 67.6" H, 113.8" wheelbase. Longer three-row: long hood, raked
// windshield, roof falling toward a sloped hatch, pentagon grille, Jewel Eye LED headlights, chrome window trim.
function acuraMDX(k, color = '#c9ccce') {
  const L = 16.56, W = 6.56, H = 5.63, h = L / 2;
  vehicle(k, {
    L, W, H, color, wb: 9.48, fo: 3.15, r: 1.24, rc: 1.0, base: 0.95, mirrorZ: h - 5.35, spokes: 10, spokeW: 0.11, rim: 'col:#8e9296',
    belt: [[-h, 3.2], [-h + 0.25, 3.82], [-h + 1.4, 3.9], [h - 4.8, 3.62], [h - 2.0, 3.35], [h - 0.75, 3.12], [h, 2.55]],
    roof: [[h - 4.8, 3.62], [h - 7.2, 5.45], [h - 7.6, 5.55], [-h + 2.9, 5.45], [-h + 2.2, 5.3], [-h + 0.45, 3.86]],
    ws: [h - 7.25, h - 4.8], rg: [-h + 0.4, -h + 2.25], pillars: [[-0.7, -0.3], [-h + 3.3, -h + 3.75]],
    pillarKey: TRIMBLK, handles: [0.5, -2.2],
    details(k, c) {
      const z = c.noseZ(0);
      k.prof('col:#232528', [[z + 0.03, 1.1], [z + 0.03, 2.25], [z - 0.12, 2.25], [z - 0.12, 1.1]], -1.15, 1.15);  // pentagon grille
      k.prof('col:#232528', [[z + 0.03, 0.85], [z + 0.03, 1.1], [z - 0.12, 1.1], [z - 0.12, 0.85]], -0.7, 0.7);
      noseLamp(k, 'chrome', c, -1.22, 1.22, 2.25, 2.32);
      for (const s of [-1, 1]) {
        for (let i = 0; i < 5; i++) { const x = s * (1.45 + i * 0.27); noseLamp(k, 'col:#f4f3ec', c, x - 0.1, x + 0.1, 2.36 - i * 0.025, 2.54 - i * 0.025); } // Jewel Eye
        noseLamp(k, 'col:#f4f3ec', c, s > 0 ? 1.35 : -2.95, s > 0 ? 2.95 : -1.35, 2.58, 2.62);                              // DRL strip
        noseLamp(k, 'col:#a8121a', c, s > 0 ? c.HW - 1.7 : -c.HW + 0.15, s > 0 ? c.HW - 0.15 : -c.HW + 1.7, 3.38, 3.52, -1);  // slim tails
      }
      noseLamp(k, 'chrome', c, -c.HW + 1.7, c.HW - 1.7, 3.42, 3.47, -1);
      noseLamp(k, TRIMBLK, c, -c.HW + 0.4, c.HW - 0.4, 0.95, 1.25, -1);
      for (const s of [-1, 1]) k.box('chrome', s > 0 ? c.HW - 0.33 : -c.HW + 0.29, 3.62, -h + 0.6, s > 0 ? c.HW - 0.29 : -c.HW + 0.33, 3.66, h - 4.9); // window trim
    },
  });
}
// More cars for the "Change" picker, true size (L x W x H, wheelbase), same lofted body as above.
const simpleFace = (k, c, o) => { // headlights, grille, tails and bumpers from a few numbers
  for (const s of [-1, 1]) {
    noseLamp(k, o.lamp || 'col:#f4f3ec', c, s > 0 ? c.HW - o.lw - 0.25 : -c.HW + 0.25, s > 0 ? c.HW - 0.25 : -c.HW + o.lw + 0.25, o.ly, o.ly + o.lh);
    noseLamp(k, 'col:#a8121a', c, s > 0 ? c.HW - (o.tw || 1.3) - 0.2 : -c.HW + 0.2, s > 0 ? c.HW - 0.2 : -c.HW + (o.tw || 1.3) + 0.2, o.ty, o.ty + (o.th || 0.25), -1);
  }
  if (o.grille) noseLamp(k, 'col:#202224', c, -o.grille[0], o.grille[0], o.grille[1], o.grille[2]);
  noseLamp(k, TRIMBLK, c, -c.HW + 0.4, c.HW - 0.4, o.base, o.base + 0.4);
  noseLamp(k, TRIMBLK, c, -c.HW + 0.4, c.HW - 0.4, o.base, o.base + 0.35, -1);
};
// Tesla Model Y: 187" x 75.6" x 63.9", 113.8" wb. Smooth nose, no grille, fastback glass roof.
function teslaModelY(k, color = '#e9e9e6') {
  const L = 15.6, W = 6.3, H = 5.33, h = L / 2;
  vehicle(k, { L, W, H, color, wb: 9.48, fo: 2.95, r: 1.32, rc: 0.95, base: 0.85, mirrorZ: h - 4.6, spokes: 5, spokeW: 0.22, rim: 'col:#3a3c3f', roofKey: CARGLASS,
    belt: [[-h, 3.0], [-h + 0.3, 3.4], [h - 4.3, 3.32], [h - 2.2, 3.05], [h - 0.6, 2.75], [h, 2.3]],
    roof: [[h - 4.3, 3.32], [h - 6.7, 5.2], [h - 7.3, 5.32], [-h + 3.6, 5.25], [-h + 1.2, 4.35], [-h + 0.4, 3.45]],
    ws: [h - 6.8, h - 4.3], rg: [-h + 0.4, -h + 3.4], pillars: [[-0.45, -0.1]], pillarKey: TRIMBLK, handles: [0.6, -1.9],
    details(k, c) { simpleFace(k, c, { lw: 1.0, ly: 2.35, lh: 0.14, ty: 3.0, tw: 1.6, th: 0.18, base: 0.85 }); } });
}
// Honda Odyssey: 205.2" x 78.5" x 69.6", 118.1" wb. Tall minivan, short hood, sliding-door track.
function hondaOdyssey(k, color = '#5b6670') {
  const L = 17.1, W = 6.54, H = 5.8, h = L / 2;
  vehicle(k, { L, W, H, color, wb: 9.84, fo: 3.4, r: 1.25, rc: 1.0, base: 0.8, mirrorZ: h - 4.7, spokes: 10, spokeW: 0.1, rim: 'col:#a3a6a9',
    belt: [[-h, 3.15], [-h + 0.3, 3.6], [h - 4.6, 3.45], [h - 2.3, 3.15], [h - 0.7, 2.85], [h, 2.35]],
    roof: [[h - 4.6, 3.45], [h - 6.9, 5.62], [h - 7.3, 5.78], [-h + 1.0, 5.72], [-h + 0.4, 5.3], [-h + 0.25, 3.62]],
    ws: [h - 6.95, h - 4.6], rg: [-h + 0.2, -h + 0.6], pillars: [[0.6, 0.95], [-2.6, -2.25], [-h + 0.6, -h + 1.4]], pillarKey: TRIMBLK, handles: [1.2, -0.6],
    details(k, c) { simpleFace(k, c, { lw: 1.15, ly: 2.2, lh: 0.3, ty: 3.4, tw: 1.0, th: 0.5, base: 0.8, grille: [1.4, 1.35, 2.15] });
      for (const s of [-1, 1]) k.box('chrome', s > 0 ? c.HW - 0.02 : -c.HW - 0.02, 3.3, -h + 1.3, s > 0 ? c.HW + 0.02 : -c.HW + 0.02, 3.36, -2.4); } });
}
// Ford F-150 SuperCrew, 5.5 ft bed: 231.7" x 79.9" x 77.2", 145.4" wb. Tall boxy cab, bed under a tonneau cover.
function fordF150(k, color = '#2f3a48') {
  const L = 19.3, W = 6.66, H = 6.4, h = L / 2;
  vehicle(k, { L, W, H, color, wb: 12.1, fo: 3.1, r: 1.6, rc: 0.5, base: 1.35, mirrorZ: h - 5.3, spokes: 6, spokeW: 0.18, rim: 'col:#9a9da0',
    belt: [[-h, 4.3], [h - 5.1, 4.3], [h - 1.6, 4.2], [h - 0.3, 4.05], [h, 3.5]],
    roof: [[h - 5.1, 4.3], [h - 7.1, 6.25], [h - 7.5, 6.4], [-h + 6.1, 6.4], [-h + 5.75, 6.25], [-h + 5.6, 4.32]],
    ws: [h - 7.15, h - 5.1], rg: [-h + 5.55, -h + 5.8], pillars: [[h - 10.9, h - 10.55]], pillarKey: TRIMBLK, handles: [h - 7.8, h - 11.2],
    details(k, c) { simpleFace(k, c, { lw: 0.95, ly: 3.2, lh: 0.55, ty: 3.4, tw: 0.35, th: 0.8, base: 1.35, grille: [1.9, 2.0, 3.75] });
      k.box('col:#1c1d1f', -c.HW + 0.1, 4.3, -h + 0.05, c.HW - 0.1, 4.36, -h + 5.55); } }); // tonneau cover
}
// Toyota Camry: 193.5" x 72.4" x 56.9", 111.2" wb. Low sedan with a trunk.
function toyotaCamry(k, color = '#8a1f24') {
  const L = 16.1, W = 6.03, H = 4.74, h = L / 2;
  vehicle(k, { L, W, H, color, wb: 9.27, fo: 3.25, r: 1.15, rc: 1.1, base: 0.6, mirrorZ: h - 5.2, spokes: 5, spokeW: 0.25, rim: 'col:#4b4e52',
    belt: [[-h, 2.95], [-h + 0.4, 3.18], [h - 5.1, 3.05], [h - 2.3, 2.75], [h - 0.6, 2.42], [h, 2.05]],
    roof: [[h - 5.1, 3.05], [h - 7.7, 4.6], [h - 8.4, 4.74], [-h + 5.0, 4.65], [-h + 2.7, 3.28], [-h + 2.4, 3.18]],
    ws: [h - 7.75, h - 5.1], rg: [-h + 2.7, -h + 5.0], pillars: [[-1.0, -0.7]], pillarKey: TRIMBLK, handles: [0.2, -2.6],
    details(k, c) { simpleFace(k, c, { lw: 1.3, ly: 2.05, lh: 0.22, ty: 2.85, tw: 1.4, th: 0.22, base: 0.6, grille: [1.7, 0.7, 1.5] }); } });
}
// Porsche 911 (992): 177.9" x 72.9" x 51.2", 96.5" wb. Low sloped nose, fastback rear, round headlights.
function porsche911(k, color = '#c8c3b4') {
  const L = 14.83, W = 6.07, H = 4.27, h = L / 2;
  vehicle(k, { L, W, H, color, wb: 8.04, fo: 2.75, r: 1.18, rc: 1.2, base: 0.45, mirrorZ: h - 5.0, spokes: 10, spokeW: 0.1, rim: 'col:#2e3033',
    belt: [[-h, 2.8], [-h + 1.6, 2.95], [h - 4.7, 2.8], [h - 2.0, 2.4], [h - 0.6, 1.95], [h, 1.55]],
    roof: [[h - 4.7, 2.8], [h - 6.6, 4.1], [h - 7.2, 4.27], [-h + 5.5, 4.1], [-h + 2.0, 3.05], [-h + 1.6, 2.95]],
    ws: [h - 6.65, h - 4.7], rg: [-h + 2.0, -h + 5.3], pillars: [], pillarKey: TRIMBLK, handles: [-0.3],
    details(k, c) {
      for (const s of [-1, 1]) { const x = s * (c.HW - 1.05), z = c.noseZ(x) - 0.55; k.soft('col:#f4f3ea', x - 0.42, 2.0, z - 0.2, x + 0.42, 2.42, z + 0.08, 0.2, 12, 6); }
      noseLamp(k, 'col:#a8121a', c, -c.HW + 0.3, c.HW - 0.3, 2.55, 2.68, -1); noseLamp(k, TRIMBLK, c, -c.HW + 0.4, c.HW - 0.4, 0.45, 0.85); noseLamp(k, TRIMBLK, c, -c.HW + 0.4, c.HW - 0.4, 0.45, 0.85, -1);
    } });
}
// ---- garage sport storage
function golfBag(k, color = '#20324d') { // standing cart bag, about 36" tall with clubs, back at z = 0
  k.cyl('col:' + color, 0, 0.45, 0.42, 0.45, 0, 2.9, 16);
  k.cyl('col:#e8e6e0', 0, 0.45, 0.43, 0.43, 2.6, 2.75, 16);
  k.cyl('col:#1d1d1f', 0, 0.45, 0.46, 0.46, 0.05, 0.25, 16);
  for (let i = 0; i < 12; i++) {                                                          // club heads + headcovers
    const a = (i / 12) * Math.PI * 2, x = Math.cos(a) * 0.24, z = 0.45 + Math.sin(a) * 0.24, tall = i < 4;
    k.cyl('steel', x, z, 0.025, 0.025, 2.9, tall ? 3.55 : 3.25, 5);
    if (tall) k.csoft('col:' + ['#1d1d1f', '#c43a2f', '#1d1d1f', '#e8e6e0'][i], x, z, 0.32, 0.22, 3.5, 3.9, 0.1);
    else k.box('chrome', x - 0.12, 3.2, z - 0.04, x + 0.08, 3.38, z + 0.05);
  }
  k.box('col:#1d1d1f', -0.08, 1.0, 0.0, 0.08, 2.5, 0.06);                                 // strap
  k.solid(-0.45, 0, 0.45, 0.9, 0, 3.9);
}
function tennisRacket(k, x, y, z, color) { // hanging flat against the wall (face parallel to the wall), head up
  const rim = ring(0, 0, 1, 22).map(([a, b]) => [x + a * 0.43, y + 1.2 + b * 0.55]);
  for (let i = 0; i < rim.length; i++) { const [ax, ay] = rim[i], [bx, by] = rim[(i + 1) % rim.length]; rod(k, 'col:' + color, [ax, ay, z], [bx, by, z], 0.022); }
  k.box('col:#e9e8e2', x - 0.38, y + 0.75, z - 0.005, x + 0.38, y + 1.65, z + 0.005);    // string bed
  rod(k, 'col:' + color, [x - 0.12, y + 0.68, z], [x, y + 0.45, z], 0.022); rod(k, 'col:' + color, [x + 0.12, y + 0.68, z], [x, y + 0.45, z], 0.022);
  k.box('col:#202022', x - 0.05, y, z - 0.04, x + 0.05, y + 0.46, z + 0.04);             // grip
}
function racketRack(k) { // wall rack with 4 rackets and a ball hopper below; back at z = 0
  k.box('wood:#a77d52', -1.6, 4.2, 0, 1.6, 4.45, 0.12);
  ['#c8d22a', '#1e4e8c', '#c43a2f', '#2b2b2b'].forEach((c, i) => { const x = -1.2 + i * 0.8; k.box('steel', x - 0.03, 4.3, 0.12, x + 0.03, 4.36, 0.3); tennisRacket(k, x, 2.1, 0.25, c); });
  k.box('steel', -0.55, 0, 0.15, 0.55, 1.6, 1.25);
  for (let i = 0; i < 14; i++) k.csoft('col:#d6e64a', -0.4 + (i % 4) * 0.27, 0.4 + Math.floor(i / 4) * 0.25, 0.12, 0.12, 1.5 + (i % 3) * 0.02, 1.62 + (i % 3) * 0.02, 0.06); // balls in the hopper
  k.solid(-0.55, 0.15, 0.55, 1.25, 0, 1.6);
}
// bicycle, facing local +z (wheels on the ground), or with o.hang hung vertically by the front wheel from a
// wall hook o.hang ft up: the frame then sticks straight out from a wall at z = 0 toward +z.
function bike(k, o = {}) {
  const c = 'col:' + (o.color || '#2b4f7a'), R = o.r || 1.13, WB = o.wb || 3.4, zr = -WB / 2, zf = WB / 2, y = R;
  const T = o.hang ? ([x, yy, zz]) => [x, o.hang - (zf + R - zz), yy + 0.25] : (p) => p;
  const r = (key, a, b, w) => rod(k, key, T(a), T(b), w);
  for (const z of [zr, zf]) {
    const rim = ring(z, y, R, 26);
    for (let i = 0; i < rim.length; i++) { const [az, ay] = rim[i], [bz, by] = rim[(i + 1) % rim.length]; r(TIRE, [0, ay, az], [0, by, bz], 0.04); }
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI; r('steel', [0, y - Math.sin(a) * R * 0.92, z - Math.cos(a) * R * 0.92], [0, y + Math.sin(a) * R * 0.92, z + Math.cos(a) * R * 0.92], 0.008); }
  }
  const bb = [0, y - 0.1, -0.15], st = [0, y + 1.25, -0.55], ht = [0, y + 1.25, zf - 0.55];
  r(c, bb, st, 0.06); r(c, st, ht, 0.06); r(c, bb, [0, y + 1.05, zf - 0.5], 0.065);
  r(c, bb, [0, y, zr], 0.035); r(c, st, [0, y, zr], 0.035); r(c, ht, [0, y, zf], 0.045);
  r('col:#1d1d1f', st, [0, y + 1.55, -0.7], 0.035); r('col:#1d1d1f', [0, y + 1.6, -0.95], [0, y + 1.6, -0.4], 0.07);   // seatpost + saddle
  r('col:#1d1d1f', ht, [0, y + 1.6, zf - 0.7], 0.03); r('col:#1d1d1f', [-0.8, y + 1.62, zf - 0.7], [0.8, y + 1.62, zf - 0.7], 0.03); // stem + bar
  const cr = ring(bb[2], bb[1], 0.3, 12);
  for (let i = 0; i < cr.length; i++) r('col:#1d1d1f', [0.13, cr[i][1], cr[i][0]], [0.13, cr[(i + 1) % 12][1], cr[(i + 1) % 12][0]], 0.03); // chainring
  if (o.hang) { k.box('steel', -0.03, o.hang - 0.1, 0, 0.03, o.hang, 0.35); k.solid(-0.5, 0, 0.5, y + 1.8, o.hang - WB - 2 * R, o.hang); }
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
  k.box(IRON, -0.1, 0.2, -1.6, 0.1, 1.12, -1.4); k.box(IRON, -0.1, 0.2, 1.4, 0.1, 1.12, 1.6);
  k.box(IRON, -0.15, 1.1, -1.9, 0.15, 1.2, 1.9);
  k.box('col:#151515', -0.48, 1.2, -1.95, 0.48, 1.45, -0.85);  // seat pad (17.5" pad height)
  k.box('col:#151515', -0.48, 1.2, -0.75, 0.48, 1.45, 1.95);   // back pad
  k.solid(-0.8, -2.1, 0.8, 2.1, 0, 1.45);
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
      const hr = 0.17 + weight * 0.0028, hl = 0.12 + weight * 0.0026; // hex heads: 5 lb ~4" dia, 50 lb ~6.5" dia; 5" grip, 12-16" overall
      const x = -len / 2 + 0.35 + i * ((len - 0.7) / (n * 2 - 1));
      const sub = new Kit(k.bat, k.tag);
      const p = k.P(x, 0, z);
      sub.at(p.x, p.z, k.oy, k.rot + 90);                                // local x now runs front-to-back
      const hex = (zz) => [...Array(6)].map((_, j) => [zz + Math.cos((j / 6) * Math.PI * 2) * hr, y + hr + Math.sin((j / 6) * Math.PI * 2) * hr]);
      sub.prof(RUBBER, hex(0), -0.22 - hl, -0.22);
      sub.prof(RUBBER, hex(0), 0.22, 0.22 + hl);
      bar(sub, -0.22, 0.22, y + hr, 0, 0.055);
    }
  }
  k.solid(-len / 2, 0, len / 2, 1.9, 0, 2.9);
}
function pelotonBike(k) { // centered; Peloton Bike: 59" L x 23" W x 53" H. Rider faces +z; flywheel + 22" screen at the front, screen tilted back toward the rider
  k.box(IRON, -0.95, 0, -2.45, 0.95, 0.14, -2.15); k.box(IRON, -0.95, 0, 2.15, 0.95, 0.14, 2.45); // stabilizer feet
  k.box(IRON, -0.1, 0.05, -2.3, 0.1, 0.28, 2.3);                                                   // base spine
  k.prof(IRON, [[-2.25, 0.2], [-1.9, 0.2], [-0.8, 2.35], [-1.1, 2.45]], -0.1, 0.1);                 // rear strut up to the seat post
  k.prof(IRON, [[1.95, 0.2], [2.3, 0.2], [1.25, 3.0], [0.95, 2.9]], -0.1, 0.1);                     // front strut up to the bar post
  k.prof(IRON, [[-1.0, 2.2], [1.05, 2.62], [1.05, 2.86], [-1.0, 2.46]], -0.08, 0.08);               // top tube
  k.box(IRON, -0.06, 2.35, -1.05, 0.06, 3.05, -0.9);                                                // seat post
  k.prof('col:#111111', [[-1.5, 3.05], [-0.6, 3.05], [-0.62, 3.2], [-0.85, 3.25], [-1.5, 3.22]], -0.3, 0.3); // saddle (narrow nose forward)
  k.prof(IRON, [[0.95, 2.9], [1.15, 2.9], [1.2, 3.6], [1.0, 3.6]], -0.07, 0.07);                    // handlebar post
  k.box(IRON, -0.72, 3.55, 0.85, 0.72, 3.66, 1.25); for (const s of [-1, 1]) k.box(IRON, s * 0.66 - 0.06, 3.55, 0.45, s * 0.66 + 0.06, 3.66, 0.9); // bars + horns
  disc(k, 0, 1.35, 1.55, 0.62, 0.22, 'col:#2b2b2d');                                              // flywheel (black) under a red-trimmed cover
  disc(k, 0, 1.35, 1.55, 0.66, 0.1, 'col:#c42a2a');
  disc(k, 0, 1.1, 0.15, 0.28, 0.12, IRON);                                                          // crank
  for (const s of [-1, 1]) k.box(IRON, s * 0.2, 0.75, 0.05, s * 0.2 + s * 0.4, 0.82, 0.4);          // pedals
  k.box(IRON, -0.05, 3.62, 1.12, 0.05, 3.85, 1.24);                                                 // screen mount
  k.prof('black', [[1.12, 3.78], [1.27, 3.78], [1.39, 4.42], [1.24, 4.42]], -0.82, 0.82);            // 22" touchscreen (1.6 x 0.9 ft)
  k.prof('col:#1a2735', [[1.105, 3.83], [1.125, 3.83], [1.235, 4.37], [1.215, 4.37]], -0.76, 0.76);  // its glass faces the rider
  k.solid(-0.95, -2.45, 0.95, 2.45, 0, 4.4);
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
  const w = inches * 0.0727, h = inches * 0.0409, y0 = 4.2 - h / 2; // screen center at ~50" (seated eye height + a little)
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
function bowDesk(k) { // office (photo 17): black bow-front top on a maple pedestal + panel leg; user on the straight side (z < 0), centered
  const h = 2.5, arc = [...Array(17)].map((_, i) => { const a = Math.PI * (i / 16); return [-Math.cos(a) * 2.7, Math.sin(a) * 1.25]; });
  k.prism({ top: 'col:#1e1e1f', bottom: 'col:#1e1e1f', side: 'col:#2a2a2a' }, [[2.7, -0.15], ...[...arc].reverse(), [-2.7, -0.15]], h - 0.1, h);
  const m = wood('#d9b98a');
  k.box(m, 1.15, 0, -0.05, 2.25, h - 0.1, 0.95);                                          // pedestal: drawer + file drawer
  for (const [y0, y1] of [[0.12, 1.25], [1.3, 2.3]]) { k.box(wood('#d1ae7d'), 1.2, y0, -0.09, 2.2, y1, -0.05); k.box('steel', 1.55, (y0 + y1) / 2 - 0.02, -0.12, 1.85, (y0 + y1) / 2 + 0.02, -0.09); }
  k.box(m, -2.35, 0, -0.05, -2.2, h - 0.1, 0.95);                                         // panel leg
  k.box(m, -2.2, 0.8, 0.55, 1.15, h - 0.1, 0.62);                                         // modesty panel
  k.box('black', 1.2, h, 0.1, 1.55, h + 1.25, 0.18); k.box('col:#1a2735', 1.22, h + 0.35, 0.18, 1.53, h + 1.2, 0.19); // tower + monitor at the end
  k.box('black', -0.6, h, 0.35, 1.0, h + 0.05, 0.75); k.box('col:#cfcfcf', -1.6, h, -0.05, -0.6, h + 0.05, 0.55); // keyboard, laptop
  k.solid(-2.7, -0.15, 2.7, 1.3, 0, h);
}
function hutchDesk(k, w = 4.2, o = {}) { // office (photo 18): white desk + cubby hutch, black work surface; back at z = 0 (o.part: 'desk' | 'hutch' draws one half)
  const h = 2.5, d = 2.0, wt = 'col:#f2f1ec';
  if (o.part !== 'hutch') {
    for (const x of [-w / 2, w / 2 - 0.08]) k.box(wt, x, 0, 0, x + 0.08, h - 0.08, d);
    k.box(wt, -w / 2 + 0.08, 0.35, 0.02, w / 2 - 0.08, h - 0.08, 0.1);
    k.box('col:#1c1c1d', -w / 2, h - 0.08, 0, w / 2, h, d + 0.05);
    k.solid(-w / 2, 0, w / 2, d, 0, h);
  }
  if (o.part === 'desk') return;
  const H0 = h + 0.9, H1 = h + 3.4, hd = 1.0;
  for (const x of [-w / 2, -w / 6, w / 6, w / 2 - 0.07]) k.box(wt, x, H0, 0, x + 0.07, H1, hd);
  for (const y of [H0, H0 + 1.25, H1 - 0.07]) k.box(wt, -w / 2, y, 0, w / 2, y + 0.07, hd);
  k.box(wt, -w / 2, H0, 0, w / 2, H1, 0.04);
  for (const x of [-w / 2 + 0.07, w / 2 - 0.07]) k.box(wt, x - 0.04, h, 0.2, x + 0.04, H0, hd - 0.1); // hutch posts
  for (const x of [-0.95, 0.95]) { k.box('black', x - 0.85, h + 0.45, 0.55, x + 0.85, h + 1.55, 0.62); k.box('col:#1a2735', x - 0.8, h + 0.5, 0.62, x + 0.8, h + 1.5, 0.63); k.cbox('black', x, 0.55, 0.12, 0.12, h, h + 0.45); }
  k.box('col:#2a2a2a', -0.75, h, 1.1, 0.75, h + 0.05, 1.5);
  for (let i = 0; i < 6; i++) k.box('col:' + ['#e8e3d6', '#cfc6b2', '#9a8f7c', '#e4dfd2', '#b8ad97', '#efe9dc'][i], -w / 2 + 0.2 + i * 0.6, H0 + 1.32, 0.15, -w / 2 + 0.55 + i * 0.6, H0 + 1.32 + 0.4 + (i % 3) * 0.15, 0.85); // binders and boxes
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
function bookcase(k, w = 2.8, h = 6.5, seed = 3, color = '#5a3a26') { // back at z = 0
  const d = 1.05, c = wood(color);
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
  const nb = o.blades || 5;
  for (let i = 0; i < nb; i++) {
    const kb = new Kit(k.bat, k.tag).at(k.ox, k.oz, k.oy, k.rot + (i * 360) / nb + 15);
    kb.box(o.blade || wood('#6e4b32'), 0.45, y + 0.1, -0.24, 2.35, y + 0.14, 0.24);
  }
  if (o.disc) k.cyl('shade', 0, 0, 0.26, 0.4, y - 0.12, y, 16); // low-profile: one flat light disc
  else if (o.lights !== false) {
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
function crystalFlush(k, c) { k.cyl('chrome', 0, 0, 0.5, 0.5, c - 0.08, c, 12); for (let i = 0; i < 3; i++) k.cyl('frosted', 0, 0, 0.75 - i * 0.18, 0.6 - i * 0.18, c - 0.6 + i * 0.18, c - 0.4 + i * 0.18, 12); }
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
  const d = 1.95, C = o.cab || OAKCAB, D = o.door || OAKDOOR, PN = o.panel || OAKPANEL, pull = o.pull || 'steel';
  k.box(C, x0, 0.33, 0, x1, 2.92, d);
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
      for (const [ya, yb] of [[2.25, 2.85], [1.4, 2.2], [0.42, 1.35]]) { raisedPanel(k, a, b, ya, yb, d, D, PN); knob(k, (a + b) / 2, (ya + yb) / 2, d + 0.09, pull); }
    } else {
      raisedPanel(k, a, b, 2.3, 2.85, d, D, PN); knob(k, (a + b) / 2, 2.58, d + 0.09, pull);
      raisedPanel(k, a, b, 0.42, 2.24, d, D, PN); knob(k, i % 2 ? a + 0.2 : b - 0.2, 2.0, d + 0.09, pull);
    }
  }
}
function upperCab(k, x0, x1, o = {}) {
  const d = 1.05, y0 = o.y0 || 4.55, y1 = o.y1 || 7.0, C = o.cab || OAKCAB, D = o.door || OAKDOOR, PN = o.panel || OAKPANEL;
  k.box(C, x0, y0, 0, x1, y1, d);
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
    } else raisedPanel(k, a, b, y0 + 0.07, y1 - 0.07, d, D, PN);
    knob(k, i % 2 ? a + 0.2 : b - 0.2, y0 + 0.3, d + 0.09, o.pull || 'steel');
  }
}
function counter(k, x0, x1, o = {}) {
  k.box('counter', x0, 2.92, 0, x1, 3.05, 2.06);
  k.box(OAKDOOR, x0, 2.91, 2.06, x1, 3.06, 2.11); // oak edge band on the laminate (photo 12)
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
  k.box('black', x0, 4.65, 0, x1, 6.05, 1.3);                                         // 30" OTR microwave, 17" tall
  k.box('col:#2a2c2e', x0 + 0.12, 4.82, 1.3, x1 - 0.75, 5.88, 1.315);                  // glass door
  k.box('col:#3a3a3a', x1 - 0.68, 4.82, 1.3, x1 - 0.12, 5.88, 1.315);                  // keypad
  k.box('chrome', x0 + 0.05, 4.9, 1.3, x0 + 0.1, 5.8, 1.4);                            // handle
  upperCab(k, x0, x1, { y0: 6.07 });
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
  const d = o.d || 1.85, h = o.h || 2.65, C = o.cab || OAKCAB, D = o.door || OAKDOOR, PN = o.panel || OAKPANEL;
  k.box(C, -w / 2, 0.33, 0, w / 2, h, d);
  k.box('blackMatte', -w / 2, 0, 0, w / 2, 0.33, d - 0.25);
  const n = Math.max(2, Math.round(w / 1.3)), cw = w / n;
  for (let i = 0; i < n; i++) { const a = -w / 2 + i * cw + 0.03, b = -w / 2 + (i + 1) * cw - 0.03; raisedPanel(k, a, b, 0.42, h - 0.08, d, D, PN); knob(k, i % 2 ? a + 0.2 : b - 0.2, h - 0.4, d + 0.09, o.pull || 'brass'); }
  const top = o.top || 'vanityTop';
  k.box(top, -w / 2 - 0.04, h, 0, w / 2 + 0.04, h + 0.12, d + 0.08);
  k.box(top, -w / 2 - 0.04, h + 0.12, 0, w / 2 + 0.04, h + 0.45, 0.06);
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
function washerDryer(k) { // white top-load washer + matching dryer (27" W x 28" D x 43" to the console top each), back at z = 0
  for (const [x, washer] of [[-1.17, true], [1.17, false]]) {
    k.soft('porcelain', x - 1.12, 0.05, 0.25, x + 1.12, 3.0, 2.6, 0.06);
    k.box('col:#c9ccce', x - 1.08, 0, 0.35, x + 1.08, 0.12, 2.45);                       // toe kick
    k.soft('porcelain', x - 1.12, 2.9, 0.15, x + 1.12, 3.6, 0.7, 0.08);                  // control console
    k.box('col:#cfd3d6', x - 0.7, 3.15, 0.7, x + 0.7, 3.45, 0.71);                       // display strip
    for (const dx of [-0.85, 0.85]) k.cyl('col:#b9bec2', x + dx, 0.72, 0.12, 0.12, 3.25, 3.3, 12, 1, true);
    if (washer) { k.box('col:#e9ebec', x - 0.95, 3.0, 0.85, x + 0.95, 3.03, 2.45); k.box('col:#7f8a92', x - 0.7, 3.03, 1.0, x + 0.7, 3.04, 2.25); } // lid with a tinted window
    else { k.box('col:#eceeef', x - 0.95, 0.55, 2.6, x + 0.95, 2.75, 2.64); k.box('col:#d4d7d9', x - 0.6, 2.45, 2.64, x + 0.6, 2.55, 2.68); } // dryer: full-width front door + pull
  }
  k.solid(-2.3, 0, 2.3, 2.6, 0, 3.6);
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
    k.prism({ side: OAKDOOR }, grow(0.15), 2.91, 3.05); // oak edge band
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
      // oak counter stools (photo 13): 25" round seat, splayed legs, two rungs
      for (const [lx, lz] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) sk.cyl(wood('#c9944f'), lx, lz, 0.05, 0.06, 0, 1.97, 6);
      sk.cyl(wood('#c9944f'), 0, 0, 0.62, 0.6, 1.97, 2.08, 16);
      for (const y of [0.75, 1.3]) { sk.box(wood('#c9944f'), -0.45, y, -0.48, 0.45, y + 0.05, -0.42); sk.box(wood('#c9944f'), -0.45, y, 0.42, 0.45, y + 0.05, 0.48); }
      sk.solid(-0.6, -0.6, 0.6, 0.6, 0, 2.08);
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
  for (const [x0, z0, x1, z1] of [[0, d - 0.04, w, d + 0.04], [-0.04, 0, 0.04, d]]) { k.box('smokeGlass', x0, 0.25, z0, x1, 6.6, z1); }
  for (const [x, z] of [[0, d], [w, d], [0, 0]]) k.box('goldFrame', x - 0.05, 0.25, z - 0.05, x + 0.05, 6.65, z + 0.05);
  k.box('goldFrame', 0, 6.6, d - 0.05, w, 6.68, d + 0.05); k.box('goldFrame', -0.05, 6.6, 0, 0.05, 6.68, d);
  k.box('goldFrame', w * 0.5, 3.0, d + 0.04, w * 0.5 + 0.06, 4.0, d + 0.12);
  k.box('tile:#e9e2d5', 0, 0.25, 0, w, 7.2, 0.05);
  k.solid(-0.05, 0, w, d + 0.05, 0, 6.6);
}
function looseChair(k, color) { armchair(k, { color }); }
function recliner(k, color = '#28324a') { // overstuffed leather rocker-recliner, centered, faces +z (photos 07, 09, 10)
  const c = 'col:' + color, cd = 'col:' + shadeHex(color, -0.25);
  k.soft(cd, -1.3, 0.0, -1.3, 1.3, 0.35, 1.25, 0.1);                                   // rocker base
  k.soft(c, -1.35, 0.3, -1.4, 1.35, 1.35, 1.45, 0.3);                                  // seat box
  k.soft(c, -0.95, 1.2, -0.85, 0.95, 1.75, 1.45, 0.24);                                // seat cushion, rolled front
  k.soft(c, -1.05, 0.25, 1.18, 1.05, 1.25, 1.55, 0.2);                                 // closed footrest
  for (const [y0, y1, z0, z1] of [[1.25, 2.15, -1.55, -0.7], [2.0, 2.85, -1.6, -0.85], [2.7, 3.5, -1.62, -0.98]]) k.soft(c, -1.05, y0, z0, 1.05, y1, z1, 0.36); // three channel rolls up the back
  for (const s of [-1, 1]) {
    k.soft(c, s * 1.38 - 0.42, 0.3, -1.45, s * 1.38 + 0.42, 2.05, 1.25, 0.35);         // padded arms
    k.soft(c, s * 1.38 - 0.46, 1.6, -1.2, s * 1.38 + 0.46, 2.35, 1.4, 0.37);           // pillow-top arm rest
  }
  k.solid(-1.6, -1.6, 1.6, 1.5, 0, 3.2);
}

// ------------------------------------------------------------------ as-listed details (from the listing photos)
// dining: brushed-nickel five-arm chandelier with white glass bell shades (photo 16)
function bellChandelier(k, ceilY, hang, arms = 5) {
  const y = ceilY - hang;
  k.cyl('chrome', 0, 0, 0.28, 0.22, ceilY - 0.1, ceilY, 12);
  k.cyl('chrome', 0, 0, 0.025, 0.025, y + 0.9, ceilY - 0.1, 6);
  k.cyl('chrome', 0, 0, 0.1, 0.18, y + 0.55, y + 0.9, 10); k.cyl('chrome', 0, 0, 0.18, 0.06, y + 0.3, y + 0.55, 10);
  for (let i = 0; i < arms; i++) {
    const a = (i / arms) * Math.PI * 2, r = 1.15, ca = Math.cos(a) * r, sa = Math.sin(a) * r;
    const kb = new Kit(k.bat, k.tag).at(k.ox, k.oz, k.oy, k.rot + (a * 180) / Math.PI);
    kb.prof('chrome', [[0, y + 0.42], [0, y + 0.48], [r * 0.6, y + 0.3], [r, y + 0.62], [r, y + 0.56], [r * 0.6, y + 0.24]].map(([z, yy]) => [z, yy]), -0.025, 0.025);
    k.cyl('chrome', ca, sa, 0.05, 0.05, y + 0.56, y + 0.66, 6);
    k.cyl('shade', ca, sa, 0.42, 0.12, y + 0.08, y + 0.62, 14, 1, false);                       // white glass bell, open downward
    k.cyl('bulb', ca, sa, 0.05, 0.05, y + 0.25, y + 0.5, 6);
  }
}
// HVAC grilles: wall return (back at z = 0) and a floor supply register (centered)
function wallGrille(k, y0, w = 1.2, h = 0.6) {
  k.box('white', -w / 2, y0, 0, w / 2, y0 + h, 0.03);
  for (let x = -w / 2 + 0.08; x < w / 2 - 0.05; x += 0.08) k.box('col:#c9c9c4', x, y0 + 0.06, 0.03, x + 0.03, y0 + h - 0.06, 0.035);
}
function floorRegister(k, w = 1.1, d = 0.4) {
  k.box('col:#d8d4cb', -w / 2, 0, -d / 2, w / 2, 0.02, d / 2);
  for (let x = -w / 2 + 0.07; x < w / 2 - 0.05; x += 0.07) k.box('col:#8d8a84', x, 0.02, -d / 2 + 0.05, x + 0.03, 0.022, d / 2 - 0.05);
}
// tabletop TV on a center pedestal (centered on z = 0.4)
function standTV(k, inches, y0) {
  const w = inches * 0.0727, h = inches * 0.0409;
  k.box('black', -0.7, y0, 0.15, 0.7, y0 + 0.04, 0.75); k.box('black', -0.08, y0 + 0.04, 0.38, 0.08, y0 + 0.35, 0.48);
  k.box('black', -w / 2, y0 + 0.3, 0.35, w / 2, y0 + 0.3 + h, 0.5);
  k.box('col:#10161d', -w / 2 + 0.05, y0 + 0.35, 0.5, w / 2 - 0.05, y0 + 0.25 + h, 0.505);
}
// gray steel 2-drawer lateral files with a shelf unit between (family room TV stand, photo 08)
function fileCabinetStand(k) {
  for (const x of [-2.15, 2.15]) {
    k.box('col:#9aa0a6', x - 1.2, 0, 0, x + 1.2, 2.25, 1.55);
    for (let i = 0; i < 2; i++) { k.box('col:#b2b7bc', x - 1.13, 0.12 + i * 1.05, 1.55, x + 1.13, 1.08 + i * 1.05, 1.58); k.box('col:#6e7378', x - 0.3, 0.85 + i * 1.05, 1.58, x + 0.3, 0.92 + i * 1.05, 1.62); }
  }
  k.box('col:#9aa0a6', -0.95, 0, 0, 0.95, 2.25, 0.08); k.box('col:#9aa0a6', -0.95, 2.17, 0, 0.95, 2.25, 1.5); k.box('col:#9aa0a6', -0.95, 1.0, 0, 0.95, 1.06, 1.5);
  k.box('col:#2b2b2b', -0.6, 1.06, 0.2, 0.6, 1.5, 1.2);                                   // DVD player / box on the shelf
  k.solid(-3.35, 0, 3.35, 1.6, 0, 2.25);
}
// burgundy leather reclining sofa (living room, photo 19): ~87" L x 40" D x 40" H, 3 pillow-top seats
function leatherSofa(k, len = 7.2, color = '#5e2426') {
  const c = 'col:' + color, d = 3.3, arm = 0.75, n = 3, sw = (len - 2 * arm) / n;
  k.soft(c, -len / 2 + 0.1, 0.25, 0.1, len / 2 - 0.1, 1.2, d - 0.15, 0.2);                    // base
  for (const s of [-1, 1]) k.soft(c, s * (len / 2 - arm / 2) - arm / 2, 0.15, 0.05, s * (len / 2 - arm / 2) + arm / 2, 2.2, d, 0.3); // padded arms
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + arm + i * sw;
    k.soft(c, x + 0.03, 1.0, 0.75, x + sw - 0.03, 1.55, d + 0.02, 0.2);                       // seat (18")
    k.soft(c, x + 0.05, 1.4, 0.1, x + sw - 0.05, 2.45, 1.0, 0.3);                             // lower back pillow
    k.soft(c, x + 0.05, 2.3, 0.0, x + sw - 0.05, 3.3, 0.85, 0.32);                            // upper back pillow
  }
  k.soft(fab('#eee6d6'), len / 2 - arm - 1.5, 1.5, 0.75, len / 2 - arm - 0.3, 1.68, 2.4, 0.06);   // cream throw on the seat
  k.soft(fab('#eee6d6'), len / 2 - arm - 1.5, 1.6, 0.55, len / 2 - arm - 0.3, 2.6, 0.95, 0.08);
  k.solid(-len / 2, 0, len / 2, d, 0, 3.3);
}
// window treatment: rod + side panels + swag valance (living room west window), back at z = 0, centered on the window
function drapes(k, w, top, color) {
  k.cyl('col:#6b5a48', 0, 0.3, 0.03, 0.03, top, top + 0.06, 6);
  k.box('col:#6b5a48', -w / 2 - 0.6, top, 0.27, w / 2 + 0.6, top + 0.07, 0.33);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const x0 = s < 0 ? -w / 2 - 0.6 + i * 0.22 : w / 2 - 0.05 + i * 0.22; k.soft(fab(color), x0, 0.05, 0.18 + (i % 2) * 0.08, x0 + 0.4, top, 0.42 + (i % 2) * 0.08, 0.12); } // gathered side panels
  k.soft(fab(color), -w / 2 - 0.3, top - 1.2, 0.2, w / 2 + 0.3, top + 0.05, 0.5, 0.35);
}
// white Windsor rocking chair (bedroom 3, photo 34), faces +z
function rockingChair(k, color = '#efe9dd') {
  const c = wood(color);
  for (const s of [-1, 1]) {
    k.prof(c, [[-1.5, 0.12], [-0.6, 0.0], [0.6, 0.0], [1.4, 0.14], [1.4, 0.2], [0.6, 0.08], [-0.6, 0.08], [-1.5, 0.2]], s * 0.85 - 0.05, s * 0.85 + 0.05); // rocker
    for (const z of [-0.65, 0.75]) k.cyl(c, s * 0.82, z, 0.05, 0.05, 0.08, 1.45, 6);
    k.box(c, s * 0.82 - 0.06, 2.15, -0.7, s * 0.82 + 0.06, 2.22, 0.9);                         // arm
    k.cyl(c, s * 0.82, 0.8, 0.04, 0.04, 1.45, 2.15, 6);
  }
  k.prof(c, [[-0.8, 1.42], [0.85, 1.42], [0.85, 1.52], [-0.8, 1.52]], -0.9, 0.9);               // seat
  for (let i = 0; i < 7; i++) { const x = -0.6 + i * 0.2; k.box(c, x - 0.025, 1.5, -0.82, x + 0.025, 3.7 - Math.abs(i - 3) * 0.05, -0.77); }
  k.box(c, -0.8, 3.55, -0.86, 0.8, 3.8, -0.74);                                                // crest rail
  k.solid(-0.9, -1.0, 0.9, 1.0, 0, 3.8);
}
// tall chest of drawers (primary bedroom, photos 27-28), back at z = 0
function tallChest(k, w = 2.6, h = 4.3, o = {}) {
  const d = 1.55, c = wood(o.color || '#efece6'), f = wood(o.front || '#f4f2ec');
  k.box(c, -w / 2, 0.25, 0, w / 2, h, d); k.box(c, -w / 2 - 0.04, h, 0, w / 2 + 0.04, h + 0.07, d + 0.05);
  const n = 6, rh = (h - 0.4) / n;
  for (let i = 0; i < n; i++) { const y0 = 0.32 + i * rh; k.box(f, -w / 2 + 0.08, y0 + 0.03, d, w / 2 - 0.08, y0 + rh - 0.03, d + 0.05); k.box('chrome', -0.3, y0 + rh / 2 - 0.03, d + 0.05, 0.3, y0 + rh / 2 + 0.03, d + 0.1); }
  k.solid(-w / 2, 0, w / 2, d, 0, h);
}
// clothes / TV armoire: two doors over two drawers, back at z = 0
function armoire(k, w = 3.2, h = 5.4, o = {}) {
  const d = 1.8, c = wood(o.color || '#9a6a3e'), f = wood(o.front || '#a8774a');
  k.box(c, -w / 2, 0.2, 0, w / 2, h, d); k.box(c, -w / 2 - 0.06, h, 0, w / 2 + 0.06, h + 0.12, d + 0.08);
  raisedPanel(k, -w / 2 + 0.08, -0.02, 1.75, h - 0.1, d, c, f); raisedPanel(k, 0.02, w / 2 - 0.08, 1.75, h - 0.1, d, c, f);
  for (const y of [0.3, 1.0]) { raisedPanel(k, -w / 2 + 0.08, w / 2 - 0.08, y, y + 0.62, d, c, f); knob(k, 0, y + 0.31, d + 0.09); }
  knob(k, -0.12, 3.3, d + 0.09); knob(k, 0.12, 3.3, d + 0.09);
  k.solid(-w / 2, 0, w / 2, d, 0, h);
}
// drop-leaf table desk (primary bedroom bump, photo 26), back at z = 0
function dropLeafDesk(k) {
  const c = wood('#b98d5f');
  k.box(c, -1.5, 2.38, 0, 1.5, 2.48, 1.8); k.box(c, -1.4, 2.0, 0.05, 1.4, 2.38, 1.6);
  for (const [x, z] of [[-1.35, 0.15], [1.35, 0.15], [-1.35, 1.55], [1.35, 1.55]]) k.cyl(c, x, z, 0.05, 0.07, 0, 2.0, 6);
  k.box(c, 1.5, 1.4, 0, 1.53, 2.48, 1.8);                                                      // the dropped leaf
  k.solid(-1.5, 0, 1.5, 1.8, 0, 2.48);
}
// porcelain keyless light fixture with a bare bulb (basement rough-in bath, photo 41)
function bareBulb(k, ceilY) { k.cyl('porcelain', 0, 0, 0.22, 0.18, ceilY - 0.12, ceilY, 12); k.cyl('bulb', 0, 0, 0.1, 0.06, ceilY - 0.42, ceilY - 0.12, 10); }

// ------------------------------------------------------------------ Susan Ln pieces (from the listing photos)
const ESP = { cab: wood('#3b2a20'), door: wood('#46322a'), panel: wood('#523b2e'), pull: 'black' };   // espresso-stained maple (baths, basement bar)
const WHITE_CAB = { pull: 'black' };                                                                      // white shaker, matte black pulls (kitchen)
const BRONZE = 'col:#2b2522';
// disc facing local +z, centered at (cx, cy) in the local x/y plane, from z0 to z1
function discZ(k, key, cx, cy, r, z0, z1, n = 20) { new Kit(k.bat, k.tag).at(k.ox, k.oz, k.oy, k.rot + 90).prof(key, ring(cx, cy, r, n), -z1, -z0); }
function barPull(k, x, y, z, vertical = false) { if (vertical) k.box('black', x - 0.02, y - 0.3, z, x + 0.02, y + 0.3, z + 0.08); else k.box('black', x - 0.3, y - 0.02, z, x + 0.3, y + 0.02, z + 0.08); }
function ssFridge(k, x0, x1, o = WHITE_CAB) { // stainless French-door fridge, bottom freezer drawer; back at z = 0
  const d = 2.5, h = 5.9, xm = (x0 + x1) / 2;
  k.box('steel', x0, 0.06, 0, x1, h, d);
  k.box('black', x0 + 0.05, 0, 0.3, x1 - 0.05, 0.06, d - 0.1);
  k.box('col:#7d8184', x0 + 0.02, 2.0, d, x1 - 0.02, 2.03, d + 0.01);
  k.box('col:#7d8184', xm - 0.012, 2.03, d, xm + 0.012, h - 0.02, d + 0.01);
  for (const x of [xm - 0.18, xm + 0.18]) k.box('chrome', x - 0.03, 2.6, d + 0.06, x + 0.03, 5.3, d + 0.13);
  k.box('chrome', x0 + 0.5, 1.72, d + 0.06, x1 - 0.5, 1.78, d + 0.13);
  k.box('col:#25272a', x0 + 0.35, 3.7, d, x0 + 0.95, 4.7, d + 0.02); // dispenser
  upperCab(k, x0, x1, { y0: 6.25, ...o });
  k.solid(x0, 0, x1, d, 0, h);
}
function gasRange(k, x0, x1, ceil = 9, hood = true) { // stainless slide-in gas range (5 burners) + chimney hood up to the ceiling; back at z = 0
  const d = 2.15, xc = (x0 + x1) / 2, hw = (x1 - x0) / 2 + 0.05;
  k.box('steel', x0, 0.1, 0, x1, 3.0, d);
  k.box('black', x0 + 0.05, 0, 0.2, x1 - 0.05, 0.1, d - 0.1);
  k.box('col:#202226', x0 + 0.25, 0.55, d, x1 - 0.25, 2.05, d + 0.02);
  k.box('chrome', x0 + 0.25, 2.22, d + 0.04, x1 - 0.25, 2.28, d + 0.16);
  for (let i = 0; i < 5; i++) k.box('black', x0 + 0.3 + i * ((x1 - x0 - 0.6) / 4) - 0.07, 2.55, d, x0 + 0.3 + i * ((x1 - x0 - 0.6) / 4) + 0.07, 2.75, d + 0.1);
  k.box('blackMatte', x0, 3.0, 0, x1, 3.03, d);
  for (const xx of [x0 + 0.62, x1 - 0.62]) for (const zz of [0.55, 1.6]) k.cbox('black', xx, zz, 1.1, 0.95, 3.03, 3.1);
  if (hood) {
    k.prof('steel', [[0, 5.5], [1.75, 5.5], [1.75, 5.72], [0.6, 6.35], [0, 6.35]], xc - hw, xc + hw);
    k.box('col:#3a3c3e', xc - hw + 0.1, 5.49, 0.1, xc + hw - 0.1, 5.5, 1.65);
    k.box('steel', xc - 0.5, 6.35, 0, xc + 0.5, ceil, 0.8);
  }
  k.solid(x0, 0, x1, d, 0, 3.1);
}
function micWineTower(k, x0, x1) { // tall cabinet (photos 10, 16): drawers, built-in microwave, open wine lattice, door on top; back at z = 0
  const d = 2.0, H1 = 7.6, a = x0 + 0.04, b = x1 - 0.04, xc = (x0 + x1) / 2;
  k.box(OAKCAB, x0, 0.33, 0, x1, 4.45, d); k.box(OAKCAB, x0, 5.95, 0, x1, H1, d);
  k.box('blackMatte', x0, 0, 0, x1, 0.33, d - 0.25);
  k.box('trim', x0 - 0.05, H1, 0, x1 + 0.05, H1 + 0.22, d + 0.12);
  for (const [ya, yb] of [[0.42, 1.6], [1.65, 2.85]]) { raisedPanel(k, a, b, ya, yb, d); barPull(k, xc, yb - 0.2, d + 0.09); }
  k.box('steel', x0 + 0.12, 3.05, d - 0.2, x1 - 0.12, 4.35, d + 0.02);                  // microwave
  k.box('col:#1c1e21', x0 + 0.22, 3.15, d + 0.02, x1 - 0.65, 4.25, d + 0.03);
  k.box('col:#2a2c2e', x1 - 0.55, 3.2, d + 0.02, x1 - 0.22, 4.2, d + 0.03);
  for (const x of [x0, x1 - 0.08]) k.box(OAKCAB, x, 4.45, 0, x + 0.08, 5.95, d);       // wine cubby: sides, back, lattice, bottles
  k.box('cabPanel', x0, 4.45, 0, x1, 5.95, 0.3);
  { const cw = (x1 - x0 - 0.16) / 2, xa = x0 + 0.08; // diamond lattice: both diagonals of each square cell
    for (let y = 4.45; y + cw <= 5.96; y += cw) for (let c = 0; c < 2; c++) { const u = xa + c * cw; rod(k, 'black', [u, y, d - 0.15], [u + cw, y + cw, d - 0.15], 0.012); rod(k, 'black', [u, y + cw, d - 0.15], [u + cw, y, d - 0.15], 0.012); } }
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const x = x0 + 0.35 + c * ((x1 - x0 - 0.7) / 3), y = 4.7 + r * 0.45; discZ(k, r % 2 ? 'col:#3d1218' : 'col:#1f2a1c', x, y, 0.1, d - 0.5, d - 0.2, 10); }
  raisedPanel(k, a, b, 6.0, H1 - 0.05, d); barPull(k, xc, 6.15, d + 0.09);
  k.solid(x0, 0, x1, d, 0, H1);
}
function barStool(k, seatH = 2.1, seat = '#2c2724', back = true) { // centered, faces +z: square upholstered seat on a black frame
  const F = 'col:#1e1e20', t = 0.04;
  for (const x of [-0.6, 0.6]) for (const z of [-0.6, 0.6]) k.box(F, x - t, 0, z - t, x + t, seatH, z + t);
  for (const z of [-0.6, 0.6]) k.box(F, -0.6, seatH * 0.33, z - 0.03, 0.6, seatH * 0.33 + 0.06, z + 0.03);
  for (const x of [-0.6, 0.6]) k.box(F, x - 0.03, seatH * 0.33, -0.6, x + 0.03, seatH * 0.33 + 0.06, 0.6);
  k.soft('col:' + seat, -0.74, seatH - 0.04, -0.74, 0.74, seatH + 0.28, 0.74, 0.08);
  if (back) { k.soft('col:' + seat, -0.7, seatH + 0.25, -0.82, 0.7, seatH + 1.55, -0.62, 0.08); for (const x of [-0.6, 0.6]) k.box(F, x - t, seatH, -0.74, x + t, seatH + 0.4, -0.66); }
  k.solid(-0.75, -0.75, 0.75, 0.75, 0, seatH + 0.28);
}
function orbChandelier(k, ceilY, hang, r = 1.0, lights = 5, fin = BRONZE) { // open iron sphere of crossed rings around a candle cluster
  const cy = ceilY - hang + r, n = 28;
  k.cyl(fin, 0, 0, 0.22, 0.18, ceilY - 0.1, ceilY, 10);
  k.cyl(fin, 0, 0, 0.02, 0.02, cy + r, ceilY - 0.1, 6);
  for (let i = 0; i < 3; i++) { // three vertical rings, 60 degrees apart
    const a = (i * Math.PI) / 3, ca = Math.cos(a), sa = Math.sin(a);
    const pts = ring(0, cy, r, n);
    for (let j = 0; j < n; j++) { const [u0, y0] = pts[j], [u1, y1] = pts[(j + 1) % n]; rod(k, fin, [u0 * ca, y0, u0 * sa], [u1 * ca, y1, u1 * sa], 0.02); }
  }
  const eq = ring(0, 0, r, n);
  for (let j = 0; j < n; j++) { const [x0, z0] = eq[j], [x1, z1] = eq[(j + 1) % n]; rod(k, fin, [x0, cy, z0], [x1, cy, z1], 0.02); }
  k.cyl(fin, 0, 0, 0.25 * r, 0.05, cy - 0.25 * r, cy, 10);
  for (let i = 0; i < lights; i++) {
    const a = (i / lights) * Math.PI * 2, x = Math.cos(a) * 0.45 * r, z = Math.sin(a) * 0.45 * r;
    rod(k, fin, [0, cy - 0.1 * r, 0], [x, cy - 0.1 * r, z], 0.015);
    k.cyl('white', x, z, 0.045, 0.045, cy - 0.1 * r, cy + 0.1, 6);
    k.cyl('bulb', x, z, 0.035, 0.01, cy + 0.1, cy + 0.28, 6);
  }
}
function candleChandelier(k, ceilY, hang, arms = 5, fin = BRONZE) { // dining (photo 18): curled iron arms with candle lights
  const y = ceilY - hang;
  k.cyl(fin, 0, 0, 0.22, 0.18, ceilY - 0.1, ceilY, 10);
  k.cyl(fin, 0, 0, 0.025, 0.025, y + 0.9, ceilY - 0.1, 6);
  k.cyl(fin, 0, 0, 0.08, 0.16, y + 0.3, y + 0.9, 10); k.cyl(fin, 0, 0, 0.16, 0.04, y, y + 0.3, 10);
  for (let i = 0; i < arms; i++) {
    const a = (i / arms) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), P2 = (rr, yy) => [ca * rr, yy, sa * rr];
    const path = [[0.1, y + 0.4], [0.6, y + 0.15], [1.05, y + 0.3], [1.2, y + 0.65], [1.25, y + 0.75]];
    for (let j = 0; j < path.length - 1; j++) rod(k, fin, P2(...path[j]), P2(...path[j + 1]), 0.025);
    k.cyl(fin, ca * 1.25, sa * 1.25, 0.09, 0.07, y + 0.72, y + 0.8, 8);
    k.cyl('white', ca * 1.25, sa * 1.25, 0.045, 0.045, y + 0.8, y + 1.05, 6);
    k.cyl('bulb', ca * 1.25, sa * 1.25, 0.035, 0.01, y + 1.05, y + 1.22, 6);
  }
}
function barnPendant(k, ceilY, hang, fin = BRONZE) { // basement bar (photo 36): bronze dome shade over a clear seeded-glass bulb
  const y = ceilY - hang;
  k.cyl(fin, 0, 0, 0.2, 0.16, ceilY - 0.08, ceilY, 10);
  k.cyl('black', 0, 0, 0.012, 0.012, y + 0.6, ceilY - 0.08, 5);
  k.cyl(fin, 0, 0, 0.08, 0.08, y + 0.5, y + 0.65, 8);
  k.cyl(fin, 0, 0, 0.75, 0.12, y + 0.2, y + 0.55, 16, 1, false);
  k.cyl('frosted', 0, 0, 0.3, 0.32, y - 0.25, y + 0.2, 12);
  k.cyl('bulb', 0, 0, 0.07, 0.05, y - 0.1, y + 0.15, 6);
}
function pipePendant(k, ceilY, hang, n = 3, fin = 'col:#1c1c1d') { // game area (photos 38-39): black pipe bar with clear glass globes
  const y = ceilY - hang, w = 1.1;
  k.cyl(fin, 0, 0, 0.2, 0.16, ceilY - 0.08, ceilY, 10);
  k.cyl(fin, 0, 0, 0.04, 0.04, y + 0.55, ceilY - 0.08, 6);
  k.box(fin, -w - 0.05, y + 0.5, -0.05, w + 0.05, y + 0.6, 0.05);
  for (let i = 0; i < n; i++) { const x = -w + (2 * w * i) / (n - 1); k.cyl(fin, x, 0, 0.04, 0.04, y + 0.25, y + 0.5, 6); k.cyl('frosted', x, 0, 0.18, 0.28, y - 0.2, y + 0.25, 12); k.cyl('bulb', x, 0, 0.06, 0.06, y - 0.1, y + 0.15, 6); }
}
function geoPendant(k, ceilY, hang) { // upstairs hall (photo 26): small open geometric cage with a bulb
  const y = ceilY - hang, fin = 'col:#3a3632';
  k.cyl(fin, 0, 0, 0.18, 0.15, ceilY - 0.08, ceilY, 8);
  k.cyl(fin, 0, 0, 0.012, 0.012, y + 1.0, ceilY - 0.08, 5);
  const top = [...Array(5)].map((_, i) => [Math.cos((i / 5) * 6.283) * 0.35, Math.sin((i / 5) * 6.283) * 0.35]);
  for (let i = 0; i < 5; i++) {
    const [x, z] = top[i], [x2, z2] = top[(i + 1) % 5];
    rod(k, fin, [x, y + 0.75, z], [x2, y + 0.75, z2], 0.012); rod(k, fin, [x, y + 0.75, z], [0, y + 1.0, 0], 0.012);
    rod(k, fin, [x, y + 0.75, z], [x * 0.6, y + 0.2, z * 0.6], 0.012); rod(k, fin, [x * 0.6, y + 0.2, z * 0.6], [0, y, 0], 0.012);
  }
  k.cyl('bulb', 0, 0, 0.12, 0.1, y + 0.3, y + 0.65, 10);
}
function shopLight(k, ceilY, len = 4) { // LED shop light, long axis along local x
  k.box('col:#e8e8e4', -len / 2, ceilY - 0.2, -0.25, len / 2, ceilY - 0.05, 0.25);
  k.box('recessed', -len / 2 + 0.05, ceilY - 0.22, -0.18, len / 2 - 0.05, ceilY - 0.2, 0.18);
  for (const x of [-len / 3, len / 3]) k.box('steel', x - 0.01, ceilY - 0.05, -0.01, x + 0.01, ceilY, 0.01);
}
function livingBuiltIn(k, w, o = {}) { // white built-in beside the fireplace (photos 04-06): closed base, open shelves above (o.tv: TV bay); back at z = 0
  const d = 1.95, top = o.top || 8.5, wh = 'cabDoor';
  baseCab(k, -w / 2, w / 2, WHITE_CAB);
  k.box(wh, -w / 2 - 0.03, 2.92, 0, w / 2 + 0.03, 3.05, d + 0.05);
  for (const x of [-w / 2, w / 2 - 0.08]) k.box(wh, x, 3.05, 0, x + 0.08, top, 1.3);
  k.box(wh, -w / 2, top - 0.25, 0, w / 2, top, 1.4); k.box('trim', -w / 2 - 0.06, top, 0, w / 2 + 0.06, top + 0.18, 1.5);
  k.box('cabPanel', -w / 2, 3.05, 0, w / 2, top, 0.04);
  const shelfYs = o.tv ? [6.6, 7.55] : [4.25, 5.3, 6.35, 7.4];
  for (const y of shelfYs) k.box(wh, -w / 2 + 0.08, y - 0.06, 0.04, w / 2 - 0.08, y, 1.25);
  const cols = ['#7a2e2a', '#2d4a6b', '#c9b48a', '#3f5a3c', '#e3dccb', '#b07a3a', '#262626'];
  let r = o.seed || 7; const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  for (const y of o.tv ? [6.6] : [3.05, 4.25, 5.3, 6.35]) { // books, bowls and plates on the shelves
    let x = -w / 2 + 0.2;
    while (x < w / 2 - 0.5) {
      if (rnd() < 0.35) { const pr = 0.22 + rnd() * 0.12; k.cyl('col:' + ['#2f5c8a', '#e9e4d8', '#c9a46a'][Math.floor(rnd() * 3)], x + pr, 0.6, pr * 0.6, pr, y, y + 0.35 + rnd() * 0.3, 12); x += 2 * pr + 0.25; continue; }
      const n = 4 + Math.floor(rnd() * 6);
      for (let i = 0; i < n && x < w / 2 - 0.3; i++) { const bw = 0.08 + rnd() * 0.08; k.box('col:' + cols[Math.floor(rnd() * cols.length)], x, y, 0.2, x + bw, y + 0.65 + rnd() * 0.3, 0.95); x += bw + 0.01; }
      x += 0.3;
    }
  }
  if (o.tv) { // TV standing in the open bay, soundbar below
    const tw = 4.4, th = 2.5, y0 = 3.35;
    k.box('black', -0.5, 3.05, 0.4, 0.5, 3.12, 0.9); k.box('black', -0.08, 3.12, 0.55, 0.08, y0 + 0.2, 0.65);
    k.box('black', -tw / 2, y0, 0.55, tw / 2, y0 + th, 0.68); k.box('col:#10161d', -tw / 2 + 0.05, y0 + 0.05, 0.68, tw / 2 - 0.05, y0 + th - 0.05, 0.685);
    for (const x of [-1.95, 1.95]) k.box('black', x - 0.18, 3.05, 0.4, x + 0.18, 3.6, 0.8);
  }
  k.solid(-w / 2, 0, w / 2, d, 0, 3.05);
}
function trestleTable(k, w, d, color = '#5b3a26') { // farmhouse trestle table (photo 18), centered, long side along local x; returns chair spots
  const c = wood(color), cd = wood(shadeHex(color, 0.8));
  k.soft(c, -w / 2, 2.35, -d / 2, w / 2, 2.5, d / 2, 0.04);
  for (const s of [-1, 1]) {
    const x = s * (w / 2 - 0.9);
    k.box(cd, x - 0.15, 0.25, -0.12, x + 0.15, 2.35, 0.12);
    k.box(cd, x - 0.2, 0, -d / 2 + 0.3, x + 0.2, 0.25, d / 2 - 0.3);
    k.box(cd, x - 0.2, 2.15, -d / 2 + 0.35, x + 0.2, 2.35, d / 2 - 0.35);
  }
  k.box(cd, -w / 2 + 0.9, 0.9, -0.08, w / 2 - 0.9, 1.15, 0.08);
  k.solid(-w / 2, -d / 2, w / 2, d / 2, 0, 2.5);
  const chairs = [], n = Math.max(1, Math.round((w - 1) / 2.4));
  for (let i = 0; i < n; i++) { const x = -((n - 1) * 2.3) / 2 + i * 2.3; chairs.push([x, d / 2 + 0.6, 180], [x, -d / 2 - 0.6, 0]); }
  chairs.push([w / 2 + 0.6, 0, -90], [-w / 2 - 0.6, 0, 90]);
  return chairs;
}
function wingChair(k, color = '#8b8a87', legs = '#2f2119') { // upholstered dining host chair (photo 18), centered, faces +z
  const w = 1.75, d = 1.9, c = fab(color);
  for (const x of [-w / 2 + 0.12, w / 2 - 0.12]) for (const z of [-d / 2 + 0.12, d / 2 - 0.12]) taperLeg(k, wood(legs), x, z, 1.4, 0.05, 0.07);
  k.soft(c, -w / 2, 1.3, -d / 2, w / 2, 1.6, d / 2, 0.1);
  k.soft(c, -w / 2, 1.5, -d / 2 - 0.05, w / 2, 3.5, -d / 2 + 0.3, 0.14);
  k.solid(-w / 2, -d / 2, w / 2, d / 2, 0, 1.6);
}
function frontLoaders(k) { // graphite front-load washer + dryer on pedestal drawers (photo 30), back at z = 0
  for (const x of [-1.2, 1.2]) {
    k.box('col:#3d4044', x - 1.12, 0, 0.1, x + 1.12, 1.1, 2.55);                       // pedestal
    k.box('col:#4a4e52', x - 1.0, 0.2, 2.55, x + 1.0, 0.9, 2.57);
    k.soft('col:#4a4e52', x - 1.12, 1.1, 0.1, x + 1.12, 4.25, 2.6, 0.06);
    k.box('col:#2b2d30', x - 1.0, 3.75, 2.6, x + 1.0, 4.1, 2.62);                       // control strip
    discZ(k, 'col:#6e7378', x, 2.4, 0.78, 2.6, 2.68, 24);                                // door ring
    discZ(k, 'col:#1d2227', x, 2.4, 0.6, 2.68, 2.7, 24);                                 // glass
  }
  k.solid(-2.35, 0.1, 2.35, 2.6, 0, 4.25);
}
function workbench(k, w = 6, d = 2.2) { // 2x4 workbench with a plywood top and a lower shelf (photos 42-44), back at z = 0
  const W = wood('#c8a26e'), P = wood('#d9bb8a');
  for (const x of [-w / 2 + 0.1, w / 2 - 0.3]) for (const z of [0.1, d - 0.3]) k.box(W, x, 0, z, x + 0.2, 2.95, z + 0.2);
  k.box(P, -w / 2, 2.95, 0, w / 2, 3.08, d); k.box(P, -w / 2 + 0.1, 0.5, 0.1, w / 2 - 0.1, 0.58, d - 0.1);
  k.box('col:#3c4f6b', -w / 2 + 0.5, 0.58, 0.4, -w / 2 + 2.0, 1.4, d - 0.4); k.box('col:#d6672a', w / 2 - 1.6, 0.58, 0.5, w / 2 - 0.6, 1.5, d - 0.5); // bins, bucket
  k.box('col:#e9b43a', -0.6, 3.08, 0.5, 0.6, 3.6, 1.5);                                  // a tool on the top
  k.solid(-w / 2, 0, w / 2, d, 0, 3.08);
}
function slatWall(k, w, y0 = 0.4, y1 = 8.0) { // natural-wood slatwall panel with a few hooks, back at z = 0, centered on x
  k.box(wood('#d2a868'), -w / 2, y0, 0, w / 2, y1, 0.06);
  for (let y = y0 + 0.25; y < y1 - 0.1; y += 0.25) k.box(wood('#a97f45'), -w / 2, y, 0.06, w / 2, y + 0.03, 0.065);
  for (let x = -w / 2 + 0.8; x < w / 2 - 0.5; x += 1.6) { k.box('steel', x - 0.02, y0 + 3.0, 0.06, x + 0.02, y0 + 3.05, 0.4); k.box('col:#5b6b7a', x - 0.2, y0 + 2.4, 0.1, x + 0.2, y0 + 3.0, 0.3); }
}
function toolChest(k) { // red rolling tool chest with a top box, back at z = 0
  k.box('col:#b0201f', -1.3, 0.25, 0, 1.3, 3.2, 1.6); k.box('col:#9a1b1a', -1.25, 3.25, 0.05, 1.25, 4.6, 1.5);
  for (let i = 0; i < 6; i++) k.box('chrome', -1.1, 0.6 + i * 0.45, 1.6, 1.1, 0.64 + i * 0.45, 1.66);
  for (const x of [-1.1, 1.1]) k.cyl('black', x, 0.8, 0.12, 0.12, 0, 0.25, 8);
  k.solid(-1.3, 0, 1.3, 1.6, 0, 4.6);
}
function pantryShelves(k, len, seed = 3) { // white pantry shelves with jars, cans and boxes, back at z = 0
  const goods = ['#c8352b', '#e8c34a', '#3a6b3a', '#f1ede4', '#7a4b2a', '#2f5c8a', '#d9822b', '#efe0c0'];
  let r = seed; const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  for (const y of [0.6, 2.0, 3.4, 4.8, 6.2]) {
    k.box('white', 0, y - 0.06, 0, len, y, 1.25);
    for (let x = 0.15; x < len - 0.5;) {
      const bw = 0.3 + rnd() * 0.4, bh = 0.4 + rnd() * 0.6;
      if (rnd() < 0.4) k.cyl('col:' + goods[Math.floor(rnd() * goods.length)], x + bw / 2, 0.55, bw / 2, bw / 2, y, y + bh * 0.8, 10);
      else k.box('col:' + goods[Math.floor(rnd() * goods.length)], x, y, 0.2, x + bw, y + bh, 1.0);
      x += bw + 0.08;
    }
  }
}
function benchHooks(k, w = 4) { // mudroom bench with a cubby shelf below and a hook rail above, back at z = 0
  const W = 'cabDoor';
  for (const x of [-w / 2, w / 2 - 0.1]) k.box(W, x, 0, 0, x + 0.1, 1.55, 1.4);
  k.box(wood('#6d4a33'), -w / 2, 1.5, 0, w / 2, 1.62, 1.45); k.box(W, -w / 2 + 0.1, 0.35, 0, w / 2 - 0.1, 0.42, 1.35);
  for (let x = -w / 2 + 0.4; x < w / 2 - 0.3; x += 1.0) k.box('col:' + ['#3b2a20', '#111111', '#7a5a3a'][Math.floor(x + 3) % 3], x, 0.42, 0.3, x + 0.6, 0.75, 1.2);
  k.box(W, -w / 2, 5.0, 0, w / 2, 5.5, 0.08);
  for (let x = -w / 2 + 0.4; x < w / 2; x += 0.8) k.box('black', x - 0.03, 5.15, 0.08, x + 0.03, 5.22, 0.3);
  k.box('fab:#2e3d55', -w / 2 + 0.3, 3.6, 0.1, -w / 2 + 1.1, 5.15, 0.4); k.box('fab:#8a7d6a', -w / 2 + 1.9, 3.8, 0.1, -w / 2 + 2.6, 5.15, 0.4);
  k.solid(-w / 2, 0, w / 2, 1.45, 0, 1.62);
}
function pokerTable(k, r = 2.2) { // round game table on a turned pedestal (photos 38-39), centered
  const c = wood('#9a5a2a');
  k.cyl(wood('#3b2416'), 0, 0, r, r, 2.3, 2.5, 28);
  k.cyl(c, 0, 0, r - 0.35, r - 0.35, 2.5, 2.51, 28);
  k.cyl(wood('#3b2416'), 0, 0, 0.35, 0.25, 0.3, 2.3, 12); k.cyl(wood('#3b2416'), 0, 0, 0.5, 0.35, 1.0, 1.6, 12);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * 6.283 + 0.785; rod(k, wood('#3b2416'), [0, 0.35, 0], [Math.cos(a) * 1.2, 0.08, Math.sin(a) * 1.2], 0.08); }
  k.solid(-r * 0.7, -r * 0.7, r * 0.7, r * 0.7, 0, 2.5);
}
function gameChair(k) { // black leather club chair on casters with wood arms (photos 38-39), centered, faces +z
  for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.283; rod(k, wood('#5a3420'), [0, 0.3, 0], [Math.cos(a) * 1.0, 0.15, Math.sin(a) * 1.0], 0.05); k.cyl('black', Math.cos(a) * 1.0, Math.sin(a) * 1.0, 0.09, 0.09, 0, 0.15, 6); }
  k.cyl('chrome', 0, 0, 0.07, 0.07, 0.3, 1.3, 8);
  k.soft('col:#1d1c1c', -0.95, 1.3, -0.9, 0.95, 1.75, 0.95, 0.12);
  k.soft('col:#1d1c1c', -0.9, 1.65, -1.05, 0.9, 3.4, -0.7, 0.18);
  for (const s of [-1, 1]) k.box(wood('#6b3a20'), s * 0.95 - 0.1, 2.15, -0.9, s * 0.95 + 0.1, 2.3, 0.75);
  k.solid(-1, -1, 1, 1, 0, 3.4);
}
function pubTable(k) { // bar-height round table on a black base (photo 37), centered
  k.cyl(wood('#7a4b2a'), 0, 0, 1.5, 1.5, 3.4, 3.5, 20);
  k.cyl('black', 0, 0, 0.08, 0.08, 0.1, 3.4, 8); k.cyl('black', 0, 0, 0.9, 0.9, 0, 0.1, 16);
  k.solid(-1.1, -1.1, 1.1, 1.1, 0, 3.5);
}
function ottoman(k, w = 4.2, d = 3.0, color = '#5e2426') { // tufted leather cocktail ottoman, centered
  for (const x of [-w / 2 + 0.2, w / 2 - 0.2]) for (const z of [-d / 2 + 0.2, d / 2 - 0.2]) taperLeg(k, wood('#2a1a14'), x, z, 0.4, 0.06, 0.06);
  k.soft('col:' + color, -w / 2, 0.35, -d / 2, w / 2, 1.45, d / 2, 0.14);
  for (let i = 1; i < 4; i++) for (let j = 1; j < 3; j++) k.cyl('col:' + shadeHex(color, 0.7), -w / 2 + (w * i) / 4, -d / 2 + (d * j) / 3, 0.05, 0.05, 1.44, 1.46, 6);
  k.solid(-w / 2, -d / 2, w / 2, d / 2, 0, 1.45);
}
function walkInShower(k, w, d, o = {}) { // tiled walk-in shower: back wall at z = 0, side walls at x = 0 and x = w, glass panel on the front (z = d) from x0g to w
  const T = o.tile || 'tile:#a89886', H = o.h || 7.8;
  k.box(T, 0, 0, 0, w, 0.03, d);
  k.box(T, 0, 0.03, 0, w, H, 0.06); k.box(T, w - 0.06, 0.03, 0, w, H, d); if (o.left !== false) k.box(T, 0, 0.03, 0, 0.06, H, d);
  k.box('backsplash', 0.06, 4.2, 0.06, w - 0.06, 4.45, 0.08);                               // mosaic band (photo 23)
  k.box('col:#8b7d6c', 0.06, 0.25, 0.06, w - 0.06, 0.03, 0.06);
  k.box(T, 0, 0, d - 0.25, w, 0.35, d);                                                     // curb
  const g0 = o.glass0 ?? 0;
  k.box('showerGlass', g0, 0.35, d - 0.15, w, 6.8, d - 0.12); k.box('chrome', g0, 6.8, d - 0.16, w, 6.84, d - 0.11);
  k.box('chrome', w * 0.5 - 0.05, 6.4, 0.06, w * 0.5 + 0.05, 6.5, 0.9); k.cyl('chrome', w * 0.5, 0.9, 0.35, 0.35, 6.35, 6.4, 14); // rain head
  k.box('col:#cfc4b4', w * 0.3, 3.8, 0.0, w * 0.3 + 1.0, 4.9, 0.06);                      // niche
  k.solid(0, 0, w, d, 0, 0.35); k.solid(g0, d - 0.2, w, d - 0.1, 0, 6.8);
}
function utilityMech(k, top = 7.6) { // gas furnace + water heater + softener, centered on the furnace
  k.box('col:#c9c9c4', -1.2, 0, -1.3, 1.2, 4.6, 1.3); k.box('col:#b0b4b6', -0.9, 4.6, -0.9, 0.9, top, 0.9);
  k.box('col:#bfc0bc', -1.15, 0.4, 1.3, 1.15, 2.2, 1.32); k.box('col:#bfc0bc', -1.15, 2.4, 1.3, 1.15, 4.4, 1.32);
  k.cyl('col:#e4e4df', 3.0, -0.2, 0.95, 0.95, 0, 5.0, 18); k.cyl('chrome', 3.0, -0.2, 0.15, 0.15, 5.0, top, 8);
  k.cyl('col:#2d4f86', 3.0, 1.6, 0.45, 0.45, 0, 3.6, 12); k.cyl('col:#e3e3df', 4.2, 1.6, 0.6, 0.6, 0, 2.6, 12);
  k.solid(-1.2, -1.3, 1.2, 1.3, 0, 4.6); k.solid(2.05, -1.15, 3.95, 0.75, 0, 5.0);
}

// ------------------------------------------------------------------ Mequon Ave: pieces from the listing photos
const QUARTZ = 'marble', ZELLIGE = 'subway:#b7c5c6';                                                       // white quartz counters, pale gray-blue zellige (photos 06-09)
const CREAM = { pull: 'brass' };                                                                           // cream shaker (the themeable cabinet finish), brass knobs
const WALNUT = { cab: wood('#3f2a20'), door: wood('#4a3226'), panel: wood('#553a2c'), pull: 'brass' };     // dark walnut stain (island, primary bath vanity)
const NAVY = { cab: 'col:#222a39', door: 'col:#283143', panel: 'col:#2e384b', pull: 'steel' };             // 1st-floor bath vanity (photo 12)
const OLIVE = ['col:#6f7f58', 'col:#5d6e4c', 'col:#7f8c66'];

function oliveTree(k, h = 6.5, pot = '#b5754f', basket = false) { // faux olive tree in a terracotta pot (or a woven basket), centered
  if (basket) { k.cyl('col:#b8935f', 0, 0, 0.55, 0.7, 0, 1.2, 14); k.cyl('col:#9a7748', 0, 0, 0.71, 0.71, 0.55, 0.62, 14); }
  else { k.cyl('col:' + pot, 0, 0, 0.5, 0.7, 0, 1.25, 14); k.cyl('col:' + shadeHex(pot, 0.9), 0, 0, 0.74, 0.74, 1.12, 1.27, 14); }
  k.cyl('col:#4a3a2a', 0, 0, 0.6, 0.6, 1.2, 1.24, 12);
  const m = h * 0.5, T = 'col:#6b5b48';
  rod(k, T, [0, 1.2, 0], [0.1, m, 0.05], 0.05);
  const tips = [[0.48, h * 0.72, 0.2], [-0.42, h * 0.78, -0.15], [0.08, h * 0.88, -0.36], [-0.15, h * 0.7, 0.48], [0.35, h * 0.84, -0.22]]; // canopy stays within 1.15 ft of the trunk
  tips.forEach((t, i) => { rod(k, T, [0.1, m - i * 0.12, 0.05], t, 0.025); const r = 0.62 - (i % 3) * 0.08; k.soft(OLIVE[i % 3], t[0] - r, t[1] - r * 0.7, t[2] - r, t[0] + r, t[1] + r * 0.7, t[2] + r, r * 0.9, 10, 6); });
  k.soft(OLIVE[1], -0.65, h * 0.8, -0.6, 0.65, h, 0.6, 0.6, 10, 6);
  k.solid(-0.7, -0.7, 0.7, 0.7, 0, h);
}
function barrelChair(k, color = '#a8927c', pillow = '#59616b') { // velvet barrel chair to the floor (photo 02), centered, faces +z
  const c = fab(color);
  k.soft(c, -1.3, 0.03, -1.2, 1.3, 1.3, 1.25, 0.3);                                   // drum base
  k.soft(c, -1.3, 0.3, -1.25, 1.3, 2.5, -0.7, 0.3);                                   // back
  for (const s of [-1, 1]) k.soft(c, s < 0 ? -1.3 : 0.8, 0.3, -1.2, s < 0 ? -0.8 : 1.3, 2.35, 1.05, 0.26); // wrap-around arms
  k.soft(c, -0.82, 1.15, -0.75, 0.82, 1.55, 1.22, 0.16);                              // seat cushion
  k.soft(fab(pillow), -0.6, 1.55, -0.72, 0.6, 2.55, -0.4, 0.18);
  k.solid(-1.3, -1.25, 1.3, 1.25, 0, 2.5);
}
function pedestalTable(k, r = 1.5, color = '#d8c4a2') { // round pale-oak table on a drum pedestal (photo 05), centered
  const w = wood(color);
  k.cyl(w, 0, 0, r, r, 2.38, 2.5, 28); k.cyl(w, 0, 0, 0.5, 0.42, 0.12, 2.38, 16); k.cyl(w, 0, 0, 0.95, 0.85, 0, 0.14, 20);
  k.cyl('col:#e9e5dc', 0.1, 0, 0.3, 0.36, 2.5, 3.0, 12); k.soft('col:#f4f1ea', -0.25, 3.0, -0.35, 0.45, 3.5, 0.35, 0.3, 8, 5); // vase of white flowers
  k.solid(-r * 0.75, -r * 0.75, r * 0.75, r * 0.75, 0, 2.5);
}
function slipChair(k, color = '#ece7dc', stripe = null) { // skirted slipcovered dining chair, optional ticking stripe (photos 02, 16); centered, faces +z
  const c = fab(color), w = 0.82, d = 0.85;
  k.soft(c, -w, 0.03, -d, w, 1.5, d, 0.1); k.soft(c, -w + 0.02, 1.4, -d, w - 0.02, 3.05, -d + 0.32, 0.12);
  if (stripe) for (let x = -w + 0.16; x < w - 0.05; x += 0.22) { k.box(fab(stripe), x - 0.025, 0.1, d - 0.005, x + 0.025, 1.42, d + 0.012); k.box(fab(stripe), x - 0.025, 1.55, -d + 0.31, x + 0.025, 2.95, -d + 0.33); k.box(fab(stripe), x - 0.025, 1.495, -d + 0.34, x + 0.025, 1.51, d - 0.06); }
  k.solid(-w, -d, w, d, 0, 1.52);
}
// built-in L bench: white base and back, dark wood seat. The main run has its back at z = 0 from x = 0 to a; the
// return runs along the x = 0 wall from z = d to b (photos 05, 08)
function nookBench(k, a, b, d = 1.7, back1 = 2.65, back2 = 2.2) {
  const S = wood('#4a3224');
  k.box('trim', 0, 0, 0, a, 1.4, d - 0.08); k.box('trim', 0, 0, d - 0.08, d - 0.08, 1.4, b);
  k.box(S, 0, 1.4, 0, a + 0.04, 1.55, d); k.box(S, 0, 1.4, d, d, 1.55, b + 0.04);
  k.box('trim', 0, 1.55, 0, a, back1, 0.14); k.box('trim', 0, 1.55, 0.14, 0.14, back2, b);
  k.box('trim', a - 0.06, 0, 0, a, 1.4, d); k.box('trim', 0, 0, b - 0.06, d, 1.4, b);                     // end panels
  for (const [x, c] of [[1.2, '#e9e3d6'], [3.0, '#cfd3d2']]) k.soft(fab(c), x - 0.6, 1.55, 0.14, x + 0.6, 2.6, 0.5, 0.18);
  k.soft(fab('#dcd5c6'), 0.14, 1.55, 2.6, 0.5, 2.5, 3.8, 0.18);
  k.solid(0, 0, a, d, 0, 1.55); k.solid(0, d, d, b, 0, 1.55);
}
function woodHood(k, x0, x1, y0 = 5.1, y1 = 7.9) { // stained-wood range hood with two shaker panels (photo 06), back at z = 0
  const W = wood('#5a3a26'), Pn = wood('#674530'), xm = (x0 + x1) / 2;
  k.box(W, x0 - 0.04, y0 + 0.3, 0, x1 + 0.04, y1, 1.45); k.box(W, x0 - 0.1, y0, 0, x1 + 0.1, y0 + 0.32, 1.6);
  for (const [a, b] of [[x0 + 0.1, xm - 0.05], [xm + 0.05, x1 - 0.1]]) { k.box(Pn, a, y0 + 0.5, 1.45, b, y1 - 0.15, 1.48); k.box(W, a + 0.18, y0 + 0.68, 1.48, b - 0.18, y1 - 0.33, 1.5); }
  k.box('col:#2c2d2f', x0, y0 - 0.01, 0.1, x1, y0, 1.5);
}
function schoolhousePendant(k, ceilY, hang) { // white fluted-glass schoolhouse shade on a brass chain (photos 06-08)
  const y = ceilY - hang;
  k.cyl('brass', 0, 0, 0.25, 0.2, ceilY - 0.1, ceilY, 12); k.cyl('brass', 0, 0, 0.02, 0.02, y + 1.05, ceilY - 0.1, 5);
  k.cyl('brass', 0, 0, 0.3, 0.1, y + 0.78, y + 1.05, 12); k.cyl('brass', 0, 0, 0.36, 0.3, y + 0.7, y + 0.78, 12);
  k.cyl('shade', 0, 0, 0.82, 0.4, y + 0.5, y + 0.72, 20); k.cyl('shade', 0, 0, 0.86, 0.82, y + 0.08, y + 0.5, 20); k.cyl('shade', 0, 0, 0.5, 0.86, y, y + 0.08, 20);
}
function conePendant(k, ceilY, hang) { // brass cone on a chain (nook, photo 02)
  const y = ceilY - hang;
  k.cyl('brass', 0, 0, 0.22, 0.18, ceilY - 0.08, ceilY, 10); k.cyl('brass', 0, 0, 0.018, 0.018, y + 0.75, ceilY - 0.08, 5);
  k.cyl('brass', 0, 0, 0.72, 0.1, y, y + 0.7, 18); k.cyl('brass', 0, 0, 0.1, 0.06, y + 0.7, y + 0.8, 8); k.cyl('bulb', 0, 0, 0.12, 0.12, y + 0.02, y + 0.2, 8);
}
function gooseSconce(k, y) { // brass gooseneck with a white glass shade, back at z = 0 (photos 06, 08)
  discZ(k, 'brass', 0, y, 0.2, 0, 0.05, 14);
  rod(k, 'brass', [0, y, 0.05], [0, y + 0.4, 0.3], 0.025); rod(k, 'brass', [0, y + 0.4, 0.3], [0, y + 0.42, 0.65], 0.025); rod(k, 'brass', [0, y + 0.42, 0.65], [0, y + 0.22, 0.85], 0.025);
  k.cyl('brass', 0, 0.85, 0.12, 0.08, y + 0.12, y + 0.24, 8); k.cyl('shade', 0, 0.85, 0.36, 0.12, y - 0.22, y + 0.12, 14);
}
function doubleGlobe(k, x, y) { // brass bar sconce with two white glass domes (photo 17), back at z = 0
  discZ(k, 'brass', x, y, 0.2, 0, 0.05, 14); k.box('brass', x - 0.02, y - 0.02, 0.05, x + 0.02, y + 0.02, 0.4); k.box('brass', x - 0.62, y - 0.02, 0.38, x + 0.62, y + 0.02, 0.42);
  for (const s of [-1, 1]) { k.cyl('brass', x + s * 0.6, 0.4, 0.1, 0.06, y - 0.12, y, 8); k.cyl('shade', x + s * 0.6, 0.4, 0.3, 0.12, y - 0.42, y - 0.12, 14); }
}
function shadeChandelier(k, ceilY, hang, arms = 5) { // brass arms with white cone shades (living room, photos 02, 04)
  const y = ceilY - hang;
  k.cyl('brass', 0, 0, 0.25, 0.2, ceilY - 0.1, ceilY, 12); k.cyl('brass', 0, 0, 0.022, 0.022, y + 0.5, ceilY - 0.1, 6); k.cyl('brass', 0, 0, 0.09, 0.05, y, y + 0.5, 10);
  for (let i = 0; i < arms; i++) {
    const a = (i / arms) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), Q = (r, yy) => [ca * r, yy, sa * r];
    const path = [[0.05, y + 0.3], [0.7, y + 0.08], [1.25, y + 0.3], [1.3, y + 0.7]];
    for (let j = 0; j < path.length - 1; j++) rod(k, 'brass', Q(...path[j]), Q(...path[j + 1]), 0.022);
    k.cyl('white', ca * 1.3, sa * 1.3, 0.04, 0.04, y + 0.7, y + 0.95, 6);
    k.cyl('shade', ca * 1.3, sa * 1.3, 0.42, 0.14, y + 0.85, y + 1.35, 14, 1, false);
  }
}
function drumFlush(k, ceilY) { k.cyl('white', 0, 0, 0.8, 0.8, ceilY - 0.05, ceilY, 20); k.cyl('shade', 0, 0, 0.75, 0.75, ceilY - 0.5, ceilY - 0.05, 20); } // white drum flush mount (photo 16)
function consoleTable(k, w = 4.5, color = '#33261f') { // dark console with a low shelf, baskets below, a leaning print (photo 04); back at z = 0
  const c = wood(color), d = 1.25;
  k.box(c, -w / 2, 2.5, 0, w / 2, 2.62, d); k.box(c, -w / 2 + 0.06, 2.05, 0.04, w / 2 - 0.06, 2.5, d - 0.04);
  for (const x of [-w / 2 + 0.04, w / 2 - 0.14]) for (const z of [0.04, d - 0.14]) k.box(c, x, 0, z, x + 0.1, 2.5, z + 0.1);
  k.box(c, -w / 2 + 0.06, 0.4, 0.06, w / 2 - 0.06, 0.47, d - 0.06);
  for (const x of [-w / 4, w / 4]) { k.cyl('col:#b8935f', x, d / 2, 0.42, 0.52, 0.47, 1.25, 12); k.cyl('col:#a07c4c', x, d / 2, 0.54, 0.54, 1.2, 1.27, 12); }
  k.box('col:#1d1d1f', -w / 2 + 0.3, 2.62, 0.02, -w / 2 + 2.2, 5.2, 0.1); k.box('col:#b9b8ae', -w / 2 + 0.42, 2.74, 0.1, -w / 2 + 2.08, 5.08, 0.11);
  k.cyl('col:#7a5a36', w / 4, d / 2, 0.12, 0.3, 2.62, 2.95, 12); for (const [x, hh] of [[w / 2 - 0.55, 1.5], [w / 2 - 0.35, 1.15]]) k.cyl('black', x, 0.45, 0.025, 0.06, 2.62, 2.62 + hh, 6);
  k.solid(-w / 2, 0, w / 2, d, 0, 2.62);
}
function framedArt(k, w, h, yc = 5.2, o = {}) { // small framed picture, back at z = 0; o.bands = [[color, from, to]] bottom-up fractions
  const y0 = yc - h / 2, m = o.mat ?? 0.12, f = 0.09;
  k.box('col:' + (o.frame || '#b08a48'), -w / 2, y0, 0, w / 2, y0 + h, 0.07);
  k.box('col:' + (o.paper || '#ece6d8'), -w / 2 + f, y0 + f, 0.07, w / 2 - f, y0 + h - f, 0.078);
  const ih = h - 2 * (f + m);
  for (const [c, a, b] of o.bands || [['#6f7f58', 0, 0.4], ['#9aa68a', 0.4, 0.6], ['#c9d3d6', 0.6, 1]]) k.box('col:' + c, -w / 2 + f + m, y0 + f + m + ih * a, 0.078, w / 2 - f - m, y0 + f + m + ih * b, 0.084);
}
function stoolTable(k, r = 0.65, h = 1.9, color = '#7a4a2e') { // small round three-legged wood side table (photo 04), centered
  const c = wood(color);
  k.cyl(c, 0, 0, r, r, h - 0.08, h, 18); k.cyl(c, 0, 0, r * 0.55, r * 0.55, h * 0.4, h * 0.4 + 0.05, 14);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.5; rod(k, c, [Math.cos(a) * r * 0.5, h - 0.08, Math.sin(a) * r * 0.5], [Math.cos(a) * r * 0.85, 0, Math.sin(a) * r * 0.85], 0.04); }
  k.solid(-r, -r, r, r, 0, h);
}
function pharmacyLamp(k) { // brass swing-arm floor lamp (photo 04), centered, arm toward +z
  k.cyl('brass', 0, 0, 0.42, 0.42, 0, 0.06, 14); k.cyl('brass', 0, 0, 0.03, 0.03, 0.06, 4.4, 6);
  k.box('brass', -0.02, 4.3, 0, 0.02, 4.34, 1.0); k.box('brass', -0.3, 4.12, 0.75, 0.3, 4.3, 1.25); k.box('bulb', -0.24, 4.11, 0.8, 0.24, 4.12, 1.2);
  k.solid(-0.3, -0.3, 0.3, 0.3, 0, 4.4);
}
function wovenCube(k, s = 1.65, color = '#8a4a2c') { // woven-leather cube ottoman (photo 13), centered
  const h = 1.45, c = 'col:' + color, dk = 'col:' + shadeHex(color, 0.72), n = 5, st = s / n;
  k.soft(c, -s / 2, 0.04, -s / 2, s / 2, h, s / 2, 0.08);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if ((i + j) % 2) k.box(dk, -s / 2 + i * st + 0.03, h - 0.004, -s / 2 + j * st + 0.03, -s / 2 + (i + 1) * st - 0.03, h + 0.008, -s / 2 + (j + 1) * st - 0.03);
  for (let i = 0; i < n; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) { const a = -s / 2 + i * st + 0.03, b = a + st - 0.06, y0 = 0.12 + j * 0.33, y1 = y0 + 0.27; k.box(dk, a, y0, s / 2 - 0.004, b, y1, s / 2 + 0.008); k.box(dk, a, y0, -s / 2 - 0.008, b, y1, -s / 2 + 0.004); k.box(dk, s / 2 - 0.004, y0, a, s / 2 + 0.008, y1, b); k.box(dk, -s / 2 - 0.008, y0, a, -s / 2 + 0.004, y1, b); }
  k.solid(-s / 2, -s / 2, s / 2, s / 2, 0, h);
}
function frameChair(k, woodc = '#b98e62', cushion = '#f1eee6') { // open wood-frame lounge chair with loose white cushions (photo 13), centered, faces +z
  const W = wood(woodc), w = 1.15, d = 1.3;
  for (const s of [-1, 1]) { const x0 = s < 0 ? -w : w - 0.12, x1 = x0 + 0.12; k.box(W, x0, 0, -d, x1, 2.0, -d + 0.12); k.box(W, x0, 0, d - 0.12, x1, 2.0, d); k.box(W, x0, 1.9, -d, x1, 2.02, d); k.box(W, x0, 0.25, -d, x1, 0.35, d); }
  k.box(W, -w, 0.75, -d + 0.05, w, 0.85, d - 0.1);
  k.prof(W, [[-d, 0.8], [-d + 0.1, 0.8], [-d - 0.25, 2.8], [-d - 0.35, 2.8]], -w + 0.12, w - 0.12);
  k.soft(fab(cushion), -w + 0.14, 0.85, -d + 0.15, w - 0.14, 1.45, d + 0.05, 0.16);
  k.soft(fab(cushion), -w + 0.16, 1.3, -d - 0.12, w - 0.16, 2.85, -d + 0.5, 0.2);
  k.soft(fab('#d9cdb8'), -0.55, 1.45, -d + 0.45, 0.55, 2.4, -d + 0.75, 0.16);
  k.solid(-w, -d - 0.3, w, d, 0, 2.8);
}
function blanketLadder(k) { // rustic leaning ladder with a throw (photo 13), foot at z = 0.95, top against the wall at z = 0
  const W = wood('#c2a078');
  for (const x of [-0.75, 0.75]) rod(k, W, [x, 0, 0.95], [x, 6.2, 0.08], 0.06);
  for (const y of [1.2, 2.5, 3.8, 5.1]) { const z = 0.95 - (y / 6.2) * 0.87; rod(k, W, [-0.75, y, z], [0.75, y, z], 0.045); }
  k.soft(fab('#f1ede3'), -0.6, 2.2, 0.28, 0.6, 3.95, 0.5, 0.1);
  k.solid(-0.8, 0, 0.8, 1.0, 0, 6.2);
}
function lampTable(k) { // small white-top table on a dark bobbin leg with a rattan lamp (photo 13), centered
  k.cyl('col:#f1efe9', 0, 0, 0.65, 0.65, 1.9, 2.0, 18); for (let i = 0; i < 7; i++) k.cyl(wood('#3a2a20'), 0, 0, 0.1, 0.1, 0.1 + i * 0.26, 0.32 + i * 0.26, 8); k.cyl(wood('#3a2a20'), 0, 0, 0.45, 0.4, 0, 0.1, 14);
  const R = 'col:#b98a58';
  k.cyl(R, 0, 0, 0.2, 0.36, 2.0, 2.35, 12); k.cyl(R, 0, 0, 0.36, 0.14, 2.35, 2.8, 12); k.cyl('bulb', 0, 0, 0.08, 0.08, 2.8, 3.15, 6); k.cyl(R, 0, 0, 0.6, 0.3, 2.95, 3.75, 14, 1, false);
  k.solid(-0.65, -0.65, 0.65, 0.65, 0, 2.0);
}
function stackedLaundry(k) { // stacked front-load washer + dryer, back at z = 0 (27" x 30" x 77")
  for (const y of [0.05, 3.25]) { k.soft('porcelain', -1.12, y, 0.1, 1.12, y + 3.15, 2.55, 0.06); discZ(k, 'col:#c9cdd0', 0, y + 1.45, 0.8, 2.55, 2.62, 24); discZ(k, 'col:#1d2227', 0, y + 1.45, 0.62, 2.62, 2.64, 24); k.box('col:#2b2d30', -1.0, y + 2.65, 2.55, 1.0, y + 3.0, 2.57); }
  k.solid(-1.12, 0.1, 1.12, 2.6, 0, 6.4);
}
// tiled shower in its own alcove: back wall at z = 0, side partitions at x = 0 and x = w, a front wall at z = d with a
// cased glass door. capH(z) = ceiling height at depth z (the room's ceiling slopes down toward the back wall). (photo 17)
function alcoveShower(k, w, d, capH, o = {}) {
  const T = o.tile || 'subway:#5f675e', t = 0.3, n = 8, dw = o.door || 2.3, x0 = (w - dw) / 2, x1 = x0 + dw, hd = 6.7, hf = capH(d - t / 2);
  const wallP = (z0, z1) => { const p = [[z0, 0], [z1, 0]]; for (let i = n; i >= 0; i--) { const z = z0 + ((z1 - z0) * i) / n; p.push([z, capH(z)]); } return p; };
  k.prof('plaster', wallP(0, d), 0, t); k.prof('plaster', wallP(0, d), w - t, w);                                    // side partitions
  k.prof(T, wallP(0.03, d - t), t, t + 0.04); k.prof(T, wallP(0.03, d - t), w - t - 0.04, w - t);                    // tile linings
  k.box(T, t, 0, 0, w - t, capH(0.06), 0.05);                                                                        // back wall
  k.box('tile:#b9b7b0', t, 0, 0.05, w - t, 0.08, d - t);                                                             // mosaic floor
  k.box(T, t + 0.04, 0.08, 0.05, w - t - 0.04, 2.9, 0.8); k.box(QUARTZ, t + 0.04, 2.9, 0.05, w - t - 0.04, 3.0, 0.85); // tiled ledge with a marble cap
  k.box('plaster', t, 0, d - t, x0, hf, d); k.box('plaster', x1, 0, d - t, w - t, hf, d); k.box('plaster', x0, hd, d - t, x1, hf, d); // front wall
  k.box(T, t, 0.08, d - t - 0.04, x0, hf, d - t); k.box(T, x1, 0.08, d - t - 0.04, w - t, hf, d - t);
  k.box('trim', x0 - 0.3, 0, d, x0, hd + 0.3, d + 0.06); k.box('trim', x1, 0, d, x1 + 0.3, hd + 0.3, d + 0.06); k.box('trim', x0 - 0.3, hd, d, x1 + 0.3, hd + 0.3, d + 0.06);
  k.box(QUARTZ, x0, 0, d - t, x1, 0.4, d + 0.02);                                                                    // marble curb
  k.box('showerGlass', x0 + 0.03, 0.4, d - 0.18, x1 - 0.03, hd - 0.05, d - 0.15); k.box('brass', x0 + 0.25, 3.0, d - 0.15, x0 + 0.31, 4.2, d - 0.04);
  k.box('brass', t + 0.04, 6.2, d / 2 - 0.03, t + 0.6, 6.26, d / 2 + 0.03); k.cyl('brass', t + 0.6, d / 2, 0.3, 0.3, 6.1, 6.16, 12);
  k.solid(0, 0, t, d, 0, 7); k.solid(w - t, 0, w, d, 0, 7); k.solid(t, d - t, w - t, d, 0, 7); k.solid(t, 0, w - t, 0.85, 0, 3.0);
}
function reededNightstand(k, w = 2.1, color = '#6a4630') { // reeded walnut 3-drawer chest with a black urn lamp (photos 14-15), back at z = 0
  const d = 1.55, h = 2.4, c = wood(color), f = wood(shadeHex(color, 1.12));
  k.box(c, -w / 2 + 0.1, 0.3, 0.03, w / 2 - 0.1, h - 0.08, d - 0.03); k.box(c, -w / 2 - 0.03, h - 0.1, 0, w / 2 + 0.03, h, d + 0.03);
  for (const x of [-w / 2 + 0.09, w / 2 - 0.09]) for (const z of [0.09, d - 0.09]) for (let i = 0; i < 6; i++) k.cyl(c, x, z, i % 2 ? 0.06 : 0.085, i % 2 ? 0.06 : 0.085, i * 0.385, (i + 1) * 0.385, 8);
  for (let i = 0; i < 3; i++) { const y0 = 0.42 + i * 0.63; k.box(f, -w / 2 + 0.22, y0, d - 0.03, w / 2 - 0.22, y0 + 0.57, d + 0.02); for (const x of [-w / 4, w / 4]) knob(k, x, y0 + 0.29, d + 0.02, 'brass'); }
  const lz = d / 2;
  k.cyl('black', 0, lz, 0.18, 0.4, h, h + 0.3, 12); k.cyl('black', 0, lz, 0.4, 0.42, h + 0.3, h + 0.6, 12); k.cyl('black', 0, lz, 0.42, 0.16, h + 0.6, h + 0.95, 12); k.cyl('black', 0, lz, 0.16, 0.2, h + 0.95, h + 1.05, 10);
  k.cyl('shade', 0, lz, 0.62, 0.36, h + 1.15, h + 1.95, 16, 1, false);
  k.solid(-w / 2, 0, w / 2, d, 0, h);
}
function checkStool(k, base = '#ece7dc', check = '#c9c1b1') { // upholstered buffalo-check stool (photo 14), centered
  const w = 0.95, d = 0.75, h = 1.5;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.soft(fab(base), sx * w - (sx > 0 ? 0.26 : 0), 0, sz * d - (sz > 0 ? 0.26 : 0), sx * w + (sx < 0 ? 0.26 : 0), 1.0, sz * d + (sz < 0 ? 0.26 : 0), 0.06);
  k.soft(fab(base), -w, 0.85, -d, w, h, d, 0.1);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) if ((i + j) % 2 === 0) k.box(fab(check), -w + 0.05 + i * 0.3, h - 0.004, -d + 0.05 + j * 0.28, -w + 0.05 + (i + 1) * 0.3, h + 0.006, -d + 0.05 + (j + 1) * 0.28);
  k.solid(-w, -d, w, d, 0, h);
}
function writingDesk(k, w = 5, d = 2.2, color = '#3d2a1f') { // dark wood writing desk with two drawers (photo 16), centered, long side along local x
  const c = wood(color), h = 2.5;
  k.box(c, -w / 2, h - 0.1, -d / 2, w / 2, h, d / 2); k.box(c, -w / 2 + 0.12, h - 0.55, -d / 2 + 0.1, w / 2 - 0.12, h - 0.1, d / 2 - 0.1);
  for (const x of [-w / 2 + 0.2, w / 2 - 0.2]) for (const z of [-d / 2 + 0.2, d / 2 - 0.2]) taperLeg(k, c, x, z, h - 0.1, 0.06, 0.1);
  for (const x of [-w / 4, w / 4]) knob(k, x, h - 0.33, d / 2 - 0.1, 'brass');
  k.box('col:#e9e5dc', -w / 2 + 0.5, h, -0.5, -w / 2 + 1.7, h + 0.12, 0.3); k.cyl('col:#d9d2c4', w / 2 - 0.7, -0.3, 0.22, 0.28, h, h + 0.6, 12);
  k.solid(-w / 2, -d / 2, w / 2, d / 2, 0, h);
}
function pouf(k, r = 0.9, color = '#d9d3c6') { k.soft(fab(color), -r, 0.02, -r, r, 1.15, r, 0.55, 14, 8); k.solid(-r * 0.8, -r * 0.8, r * 0.8, r * 0.8, 0, 1.15); } // knit pouf, centered

// ------------------------------------------------------------------ placement
// Plan coordinates are feet (x east toward the street, y south). A Kit's rot faces: 0 = south, 90 = east,
// 180 = north, -90 = west; a piece with its back at z = 0 goes on the wall opposite to the way it faces.
// lv: 'f1' | 'f2' | 'b'. yo lifts the Kit's origin (the back entry floor is at ENTRY).
const lvBat = (lv) => lv;
const lvFloor = (lv) => LV[lv].floor;
const C1 = H.ceil1, CB = LV.b.ceiling;
const cap2 = (x, y) => ceilAt(x, y) - 0.01; // 2nd-floor ceiling height at a plan point (sloped under the roofs)
export function buildFixtures(bats) {
  const at = (lv, x, y, rot = 0, yo = 0) => { const L = lvBat(lv), [lx, lz] = P(L, x, y); return new Kit(bats[L], L).at(lx, lz, lvFloor(lv) + yo, rot); };
  const put = (lv, x, y, rot, fn, label, ctx, yo = 0) => item(at(lv, x, y, rot, yo), fn, null, label, ctx);
  // rs: a renovation set ('off:mud' = gone when the mudroom is built, 'on:mud' = only then)
  const rput = (rs, x, y, rot, fn, label) => { const [lx, lz] = P('f1', x, y); return item(new Kit(renoBat(rs, 'f1'), rs).at(lx, lz, 0, rot), fn, null, label); };
  const run = (lv, a, b, inward, fn, label, rs = null) => { const L = lvBat(lv), { k, len } = runKit(rs ? renoBat(rs, L) : bats[L], rs || L, P(L, ...a), P(L, ...b), inward, lvFloor(lv)); return item(k, (h) => fn(h, len), null, label); };
  const can = (lv, x, y, c) => put(lv, x, y, 0, (k) => recessed(k, c), 'recessed', { ceil: c });
  const can2 = (x, y) => can('f2', x, y, cap2(x, y));
  const whiteFan = (x, y) => { const c = cap2(x, y); put('f2', x, y, 0, (k) => ceilingFan(k, c, { body: 'col:#f1f0ec', blade: 'col:#f1f0ec', drop: 0.4, blades: 3, disc: true }), 'ceilingFan', { ceil: c }); };

  // ================================================================ 1st floor (8.5 ft ceilings)
  // ---- kitchen (photos 06-09): cream shaker with brass knobs, white quartz, zellige splash. Range wall (north), west
  // to east: drawer base, 30" gas range under a stained-wood hood, base, French-door fridge, narrow tall cabinet
  // (the run starts 2 ft in from the west wall so the laundry door beside it stays usable)
  run('f1', [85.0, 25.98], [96.8, 25.98], [0, 1], (k) => {
    baseCab(k, 0, 2.3, { drawers: true, ...CREAM }); gasRange(k, 2.3, 4.8, C1, false); baseCab(k, 4.8, 7.6, CREAM);
    for (const [a, b] of [[0, 2.3], [4.8, 7.6]]) { k.box(QUARTZ, a, 2.92, 0, b, 3.05, 2.06); k.box(ZELLIGE, a, 3.05, 0, b, 4.55, 0.03); k.solid(a, 0, b, 2.06, 0, 3.05); }
    k.box(ZELLIGE, 2.3, 3.05, 0, 4.8, 5.1, 0.03);
    upperCab(k, 0, 2.2, { ...CREAM, y1: 7.9 }); upperCab(k, 4.9, 7.6, { ...CREAM, y1: 7.9 });
    woodHood(k, 2.3, 4.8, 5.1, 7.9);
    ssFridge(k, 7.65, 10.55, { ...CREAM, y1: 7.9 });
    k.box('cab', 10.6, 0.33, 0, 11.8, 7.9, 2.1); k.box('blackMatte', 10.6, 0, 0, 11.8, 0.33, 1.85); k.box('trim', 10.55, 7.9, 0, 11.85, 8.12, 2.22); // tall cabinet
    raisedPanel(k, 10.63, 11.77, 0.42, 4.4, 2.1); raisedPanel(k, 10.63, 11.77, 4.46, 7.83, 2.1); knob(k, 10.78, 4.0, 2.19, 'brass'); knob(k, 10.78, 4.86, 2.19, 'brass');
    k.solid(10.6, 0, 11.8, 2.1, 0, 7.9);
    k.box('col:#2a2320', 0.2, 3.05, 0.1, 1.5, 3.95, 0.16); k.box('col:#5a4a3a', 0.28, 3.13, 0.16, 1.42, 3.87, 0.17);    // small still life leaning on the splash
    k.cyl('col:#8f8a80', 6.7, 0.6, 0.2, 0.22, 3.05, 3.6, 10); for (const dx of [-0.08, 0.05, 0.12]) k.cyl(wood('#8a5a34'), 6.7 + dx, 0.6, 0.02, 0.03, 3.6, 4.1, 5); // utensil crock
  }, 'kitchen cabinets');
  // island: dark walnut base, quartz top, sink + brass bridge faucet and the dishwasher on the range (north) side,
  // overhang for three stools on the south side
  put('f1', 90.0, 32.5, 180, (k) => {
    const I = WALNUT, zf = 1.66, zb = -0.7;
    k.box('blackMatte', -3.3, 0, zb + 0.2, 3.3, 0.33, zf - 0.2); k.box(I.cab, -3.4, 0.33, zb, 3.4, 2.92, zf);
    for (const [a, b] of [[-3.37, -2.42], [-2.38, -1.43]]) { raisedPanel(k, a, b, 2.3, 2.85, zf, I.door, I.panel); raisedPanel(k, a, b, 0.42, 2.24, zf, I.door, I.panel); knob(k, (a + b) / 2, 2.58, zf + 0.09, 'brass'); knob(k, b - 0.2, 2.0, zf + 0.09, 'brass'); }
    for (const [a, b] of [[-1.37, -0.22], [-0.18, 0.97]]) { raisedPanel(k, a, b, 0.42, 2.85, zf, I.door, I.panel); knob(k, a < -1 ? b - 0.2 : a + 0.2, 2.5, zf + 0.09, 'brass'); } // sink base
    k.box('steel', 1.03, 0.4, zf, 2.97, 2.85, zf + 0.05); k.box('chrome', 1.3, 2.5, zf + 0.05, 2.7, 2.56, zf + 0.15);  // dishwasher
    raisedPanel(k, 3.0, 3.37, 0.42, 2.85, zf, I.door, I.panel);
    for (const s of [-1, 1]) { const x = s * 3.4; k.box(I.door, Math.min(x, x + s * 0.06), 0.4, zb, Math.max(x, x + s * 0.06), 2.88, zf); for (const [z0, z1] of [[zb + 0.2, 0.4], [0.56, zf - 0.2]]) k.box(I.panel, Math.min(x + s * 0.06, x + s * 0.085), 0.6, z0, Math.max(x + s * 0.06, x + s * 0.085), 2.68, z1); }
    for (let i = 0; i < 4; i++) { const a = -3.4 + i * 1.7 + 0.04, b = a + 1.62; k.box(I.door, a, 0.4, zb - 0.06, b, 2.88, zb); k.box(I.panel, a + 0.2, 0.6, zb - 0.085, b - 0.2, 2.68, zb - 0.06); }
    k.box(QUARTZ, -3.5, 2.92, -1.75, 3.5, 3.07, 1.75);
    k.box('col:#dcd9d2', -1.25, 3.071, 0.3, 0.85, 3.077, 1.42);                                                       // undermount sink
    for (const x of [-0.5, 0.1]) k.cyl('brass', x, 1.56, 0.04, 0.04, 3.07, 3.38, 8); k.box('brass', -0.5, 3.34, 1.54, 0.1, 3.38, 1.58);
    k.cyl('brass', -0.2, 1.56, 0.03, 0.03, 3.38, 4.35, 8); rod(k, 'brass', [-0.2, 4.35, 1.56], [-0.2, 4.5, 1.3], 0.03); rod(k, 'brass', [-0.2, 4.5, 1.3], [-0.2, 4.2, 1.05], 0.03);
    k.cyl('col:#7b806c', -2.0, 0.2, 0.3, 0.42, 3.07, 3.75, 12); k.soft('col:#b99a8a', -2.6, 3.7, -0.4, -1.4, 4.7, 0.8, 0.5, 8, 5); // vase of dried flowers
    k.solid(-3.5, -1.75, 3.5, 1.75, 0, 3.07);
  }, 'island');
  for (const x of [88.3, 91.7]) put('f1', x, 32.5, 0, (k) => schoolhousePendant(k, C1, 2.6), 'pendant', { ceil: C1, hang: 2.6 });
  for (const x of [88.9, 93.1]) put('f1', x, 38.25, 180, (k) => gooseSconce(k, 6.6), 'sconce');
  for (const [x, y] of [[86.3, 29.3], [95.2, 29.3], [86.3, 36.2], [95.6, 36.2]]) can('f1', x, y, C1);
  // ---- breakfast nook (photos 02, 05, 08): built-in L bench under the windows, brass cone pendant, sconce
  put('f1', 104.25, 38.25, 180, (k) => nookBench(k, 4.65, 5.25), 'built-in bench');
  put('f1', 101.5, 35.3, 0, (k) => conePendant(k, C1, 2.9), 'pendant', { ceil: C1, hang: 2.9 });
  put('f1', 104.25, 33.3, -90, (k) => sconce(k, 6.0), 'sconce');
  // ---- living room (photos 02-04): brass chandelier with white shades, six cans
  put('f1', 106.3, 24, 0, (k) => shadeChandelier(k, C1, 2.5, 5), 'chandelier', { ceil: C1, hang: 2.5 });
  for (const x of [102.6, 109.9]) for (const y of [18.6, 24, 29.4]) can('f1', x, y, C1);
  // ---- family room (photo 13): brass candle chandelier, cans
  put('f1', 92.5, 15.6, 0, (k) => candleChandelier(k, C1, 2.4, 6, 'brass'), 'chandelier', { ceil: C1, hang: 2.4 });
  for (const [x, y] of [[87, 12.2], [96, 12.2], [87, 19.4], [96, 19.4]]) can('f1', x, y, C1);
  // ---- bath (photo 12): tub/shower alcove in the SW corner (cream subway tile, a marble-trimmed stub wall, striped
  // curtain), navy vanity with a white top and a round mirror beside it, toilet on the north wall
  put('f1', 75.8, 18.32, 180, (k) => {
    const T = 'subway:#efe9dc';
    k.box(T, -2.5, 1.5, 0, 2.5, 7.2, 0.04); k.box(T, 2.46, 1.5, 0, 2.5, 7.2, 2.6);
    k.box('plaster', -2.85, 0, 0, -2.5, C1, 2.75); k.box(T, -2.5, 1.5, 0, -2.46, 7.2, 2.6); k.box(QUARTZ, -2.87, 0, 2.75, -2.48, C1, 2.8);
    k.box('col:#e3dccd', -0.6, 4.0, 0.04, 0.6, 5.1, 0.05);                                                            // niche
    tub(k, 2.5, 5.0, { curtain: true });
    k.solid(-2.85, 0, -2.5, 2.8, 0, C1);
  }, 'tub');
  put('f1', 80.75, 18.32, 180, (k) => { vanity(k, 4.0, 1, { ...NAVY, top: QUARTZ, faucet: 'chrome', mirror: false, d: 1.5 }); discZ(k, 'chrome', 0, 5.4, 1.34, 0, 0.05, 28); discZ(k, 'mirror', 0, 5.4, 1.28, 0.05, 0.07, 28); }, 'vanity');
  put('f1', 79.4, 9.75, 0, (k) => swap(k, { glb: 'Toilet03', back: true }, toilet));
  can('f1', 78.5, 13.6, C1); can('f1', 75.8, 17.0, C1);
  // ---- laundry (photos 10-11): top-load washer + dryer under the west window with a ledge behind them (they go when
  // the mudroom addition opens that wall; a stacked pair on the north wall takes their place, where the first 2.5 ft
  // of the east-wall cabinets were); cream cabinets + quartz on the east wall, a base run and a shelf on the south wall
  rput('off:mud', 73.25, 24.2, 90, (k) => {
    washerDryer(k);
    k.box('trim', -2.8, 3.62, 0, 2.8, 3.7, 0.6); k.box('trim', -2.8, 0, 0, 2.8, 3.62, 0.12);
    for (const x of [1.6, 2.1]) { k.cyl('frosted', x, 0.3, 0.17, 0.17, 3.7, 4.15, 10); k.cyl('steel', x, 0.3, 0.12, 0.12, 4.15, 4.2, 8); }
  }, 'washer + dryer');
  rput('on:mud', 81.3, 18.68, 0, (k) => stackedLaundry(k), 'stacked washer + dryer');
  const laundryCab = (k, len) => { baseCab(k, 0, len, CREAM); k.box(QUARTZ, 0, 2.92, 0, len, 3.05, 2.06); upperCab(k, 0, len, { ...CREAM, y0: 4.8, y1: 7.9 }); k.solid(0, 0, len, 2.06, 0, 3.05); };
  run('f1', [82.82, 18.9], [82.82, 21.4], [-1, 0], laundryCab, 'laundry cabinets', 'off:mud');
  run('f1', [82.82, 21.4], [82.82, 24.5], [-1, 0], laundryCab, 'laundry cabinets');
  run('f1', [78.5, 30.52], [74.0, 30.52], [0, -1], (k, len) => {
    baseCab(k, 0, len, CREAM); k.box(QUARTZ, 0, 2.92, 0, len, 3.05, 2.06); k.solid(0, 0, len, 2.06, 0, 3.05);
    k.box(wood('#4a3224'), 0.15, 5.0, 0, len - 0.15, 5.14, 0.8);
    for (const [x, c] of [[0.9, '#e9e5dc'], [1.5, '#c9b08a'], [3.2, '#8f9a8a']]) k.cyl('col:' + c, x, 0.4, 0.18, 0.2, 5.14, 5.7, 10);
  }, 'laundry cabinets');
  can('f1', 78, 22, C1); can('f1', 78, 27.2, C1);
  // ---- back entry (floor at grade, three steps below the kitchen): bench + hooks on the laundry wall
  put('f1', 76.9, 30.88, 0, (k) => benchHooks(k, 4.0), 'bench', null, ENTRY);
  put('f1', 77, 34.8, 0, (k) => flushDome(k, C1 - ENTRY), 'flushDome', { ceil: C1 - ENTRY }, ENTRY);

  // ================================================================ 2nd floor (8 ft flat ceilings, lower under the roof slopes)
  // ---- primary bath (photo 17): tiled shower alcove on the north wall, toilet in the NW corner, 6 ft walnut double
  // vanity on the east wall under a wide mirror and two double-globe sconces
  put('f2', 75.8, 9.75, 0, (k) => alcoveShower(k, 3.8, 3.85, (z) => ceilAt(77.7, 9.75 + z) - 0.03), 'shower');
  put('f2', 74.5, 9.75, 0, (k) => swap(k, { glb: 'Toilet03', back: true }, toilet));
  put('f2', 82.82, 14.5, -90, (k) => {
    vanity(k, 6.0, 2, { ...WALNUT, top: QUARTZ, faucet: 'brass', mirrorW: 5.0, frame: 'col:#d9d9d5', mirrorTop: 6.5 });
    for (const x of [-1.5, 1.5]) doubleGlobe(k, x, 7.3);
  }, 'vanity');
  can2(77.9, 16.4); can2(74.6, 14.6); can2(77.7, 13.05); // (all under the flat part of the ceiling)
  // ---- lights: white low-profile fans in the bedrooms (photos 14, 18, 19), a drum flush mount in the office (photo 16),
  // flush lights on the landing and in the vestibule
  whiteFan(107.7, 24); whiteFan(91, 15.7); whiteFan(91, 32.2);
  { const c = cap2(78, 28.8); put('f2', 78, 28.8, 0, (k) => drumFlush(k, c), 'flushDome', { ceil: c }); }
  for (const [x, y] of [[99.6, 24], [85.5, 23.85]]) { const c = cap2(x, y); put('f2', x, y, 0, (k) => flushDome(k, c), 'flushDome', { ceil: c }); }

  // ================================================================ basement (unfinished, 7.3 ft to the joists)
  // furnace + water heater south of the partition, a utility sink, storage shelving along the north wall, bare bulbs
  // (the stair comes down along y 22.2-25.6: x 84-99, y 21.5-26 stays clear)
  put('b', 95.6, 28.6, 180, (k) => utilityMech(k, CB - 0.05), 'furnace + water heater');
  put('b', 88.5, 38.0, 180, (k) => laundrySink(k), 'utility sink');
  for (const [x, w] of [[77.5, 6], [85, 6], [92.5, 6]]) put('b', x, 10.0, 0, (k) => shelving(k, w, 1.6, 6), 'shelving');
  put('b', 104.5, 16.6, 0, (k) => { for (const [x, y, w, h] of [[-1.6, 0, 1.6, 1.2], [0.1, 0, 1.8, 1.4], [-1.4, 1.2, 1.4, 1.0], [0.3, 1.4, 1.3, 0.9]]) k.box('col:' + (y ? '#c79d6e' : '#b88b5c'), x, y, 0.1, x + w, y + h, 1.5); k.solid(-1.6, 0, 1.9, 1.5, 0, 2.4); }, 'boxes');
  for (const [x, y] of [[78, 15], [91, 15.5], [78, 31], [90, 32.5], [106, 24]]) put('b', x, y, 0, (k) => bareBulb(k, CB), 'bulb', { ceil: CB });
}

export function buildFurniture(bats) {
  const at = (lv, x, y, rot = 0, yo = 0) => { const L = lvBat(lv), [lx, lz] = P(L, x, y); return new Kit(bats[L + 'F'], L + 'F').at(lx, lz, lvFloor(lv) + yo, rot); };
  const place = (lv, x, y, rot, fn, label, yo = 0) => item(at(lv, x, y, rot, yo), fn, null, label);
  const face = (dx, dy) => (Math.atan2(dx, dy) * 180) / Math.PI; // rot that faces plan direction (dx, dy)
  const LAND = [['#6b7a52', 0, 0.38], ['#93a07c', 0.38, 0.6], ['#cdd3c8', 0.6, 1]];

  // ================================================================ 1st floor
  // ---- living room (photos 02-04): white slipcovered sofa under the street windows facing west, two taupe velvet
  // barrel chairs opposite, dark coffee table on a faded Persian rug, olive tree in the NE corner, console on the
  // north wall, brass floor lamp + small round tables. No TV. The front door (south) and the openings (west) stay clear
  place('f1', 106.4, 24, 0, (k) => rug(k, 8, 10, '#b9a595', '#7a5d52'));
  place('f1', 113.25, 24, -90, (k) => swap(k, { glb: 'Sofa08', w: 7.2, d: 3.2, back: true }, (h) => sofa(h, 7.2, { color: '#f1eee6', cushion: '#f5f2eb', pillows: ['#cbb9a2', '#56606e'] })));
  for (const y of [21.6, 26.4]) place('f1', 102.3, y, 90, (k) => swap(k, { glb: 'Chair12', w: 2.6 }, (h) => barrelChair(h)), 'armchair');
  place('f1', 107.1, 24, 90, (k) => swap(k, { glb: 'Table38', w: 4.2, d: 2.0 }, (h) => coffeeTable(h, 4.2, 2.0, '#33261f')));
  place('f1', 101.9, 24, 0, (k) => stoolTable(k), 'sideTable');
  place('f1', 112.2, 28.5, 0, (k) => stoolTable(k), 'sideTable');
  place('f1', 112.6, 29.7, 180, (k) => pharmacyLamp(k), 'floorLamp');
  place('f1', 111.9, 17.6, 0, (k) => oliveTree(k, 6.8), 'plant');
  place('f1', 105.3, 16.25, 0, (k) => consoleTable(k, 4.5), 'console');
  place('f1', 110.9, 31.75, 180, (k) => framedArt(k, 1.5, 1.2, 5.9, { bands: LAND }), 'art');
  place('f1', 110.9, 31.75, 180, (k) => framedArt(k, 2.4, 1.5, 4.3, { frame: '#3a2a1e', bands: LAND }), 'art');
  place('f1', 106.7, 33.3, 0, (k) => k.box(fab('#6f6557'), -1.25, -0.1, -0.75, 1.25, -0.06, 0.75), 'doormat');
  // ---- breakfast nook (photos 02, 05): round pale-oak pedestal table at the bench, two striped chairs on the open sides
  place('f1', 101.5, 35.3, 0, (k) => swap(k, { glb: 'Table24', w: 3.0, d: 3.0, h: 2.5 }, (h) => pedestalTable(h, 1.5)), 'roundTable');
  place('f1', 101.5, 33.25, 0, (k) => swap(k, { glb: 'Chair03' }, (h) => slipChair(h, '#ece7dc', '#9aa3ad')), 'chair');
  place('f1', 99.5, 35.3, 90, (k) => swap(k, { glb: 'Chair03' }, (h) => slipChair(h, '#ece7dc', '#9aa3ad')), 'chair');
  // ---- kitchen (photos 06-09): three white boucle stools at the island's south side, vintage runner at the range
  for (const x of [88.1, 90.0, 91.9]) place('f1', x, 34.6, 180, (k) => swap(k, { glb: 'Chair24', w: 1.5, d: 1.6, h: 3.4 }, (h) => barStool(h, 2.1, '#efece5')), 'stool');
  place('f1', 89.2, 29.4, 0, (k) => rug(k, 6.5, 2.2, '#b99a86', '#7c4a3c'));
  // ---- family room (photo 13): light sofa under the north window, two wood-frame lounge chairs, a pair of woven-leather
  // cubes as the coffee table, cream wool rug, olive tree, rattan lamps at the sofa ends, blanket ladder. The bath door
  // (west), the stair foot (SW) and the opening to the living room (east) stay clear
  place('f1', 91.5, 15.8, 0, (k) => rug(k, 10, 7.5, '#e6dfd0', '#d2c9b6'));
  place('f1', 92.5, 9.75, 0, (k) => swap(k, { glb: 'Sofa08', w: 7.0, d: 3.2, back: true }, (h) => sofa(h, 7.0, { color: '#e8e3d8', cushion: '#ece8de', pillows: ['#f4f1ea', '#4e5d70'] })));
  place('f1', 85.3, 12.5, 55, (k) => swap(k, { glb: 'Chair13', w: 2.3 }, (h) => frameChair(h)), 'armchair');
  place('f1', 95.6, 17.2, face(-1, -1), (k) => swap(k, { glb: 'Chair13', w: 2.3 }, (h) => frameChair(h)), 'armchair');
  place('f1', 91.55, 15.4, 0, (k) => wovenCube(k), 'ottoman');
  place('f1', 93.3, 15.5, 0, (k) => wovenCube(k), 'ottoman');
  place('f1', 88.35, 10.5, 0, (k) => lampTable(k), 'sideTable');
  place('f1', 96.7, 11.45, 0, (k) => lampTable(k), 'sideTable');
  place('f1', 86.95, 11.05, 0, (k) => oliveTree(k, 6.2, '#b5754f', true), 'plant');
  place('f1', 97.85, 9.75, 0, (k) => blanketLadder(k), 'blanket ladder');
  // ---- bath, laundry, back entry: bath mat, a small print over the laundry machines' wall, boot tray by the back door
  place('f1', 76.2, 14.6, 0, (k) => rug(k, 3.2, 2.0, '#e9e3d6', '#d9d1c0'));
  place('f1', 77.2, 18.68, 0, (k) => framedArt(k, 1.6, 1.3, 5.0, { frame: '#1d1d1f', paper: '#3a3a3a', mat: 0.2, bands: [['#6b6a60', 0, 0.45], ['#a9a798', 0.45, 1]] }), 'art');
  place('f1', 73.3, 34.0, 90, (k) => { k.box('col:#2b2b2c', -1.2, 0, 0, 1.2, 0.08, 1.1); for (const [x, c] of [[-0.75, '#5a4632'], [-0.3, '#5a4632'], [0.45, '#2f3d2f'], [0.9, '#2f3d2f']]) { k.soft('col:' + c, x - 0.17, 0.08, 0.15, x + 0.17, 0.5, 0.95, 0.1); k.soft('col:' + c, x - 0.16, 0.3, 0.15, x + 0.16, 1.2, 0.5, 0.1); } }, 'boot tray', ENTRY);

  // ================================================================ 2nd floor
  // ---- bedroom 2 (front, photo 18): queen bed with a low cream headboard on the north knee wall, gray duvet, black
  // nightstands with white lamps
  place('f2', 108.3, 16.25, 0, (k) => swap(k, { glb: 'Bed15', w: 5.35, d: 7.2, back: true }, (h) => bed(h, 'queen', { frame: '#2a2622', headboard: '#e9e4d8', base: '#e3ddd0', duvet: '#b9bcbe', accent: '#8f9498', sham: '#f1efe9', pillow: '#d8d2c6' })));
  for (const x of [104.4, 112.2]) place('f2', x, 16.25, 0, (k) => swap(k, { glb: 'Drawer02', back: true }, (h) => nightstand(h, { color: '#222224', front: '#2c2c2e' })));
  // ---- bedroom 3 (photo 19): two twins with navy channel-tufted frames, heads on the west knee wall, a cane
  // nightstand between them, sheepskin rug
  for (const y of [12.75, 18.65]) place('f2', 83.18, y, 90, (k) => bed(k, 'twin', { frame: '#2a3040', headboard: '#2f3a52', base: '#2f3a52', duvet: '#f2f0ea', accent: '#a38a6a', sham: '#f5f3ee', pillow: '#c9b79a' }));
  place('f2', 83.18, 15.7, 90, (k) => nightstand(k, { color: '#c4a274', front: '#d6bb8e' }));
  place('f2', 87.6, 15.7, 90, (k) => rug(k, 1.9, 3.0, '#f5f2ea', '#ece7db'));
  // ---- primary bedroom (photos 14-15): king bed with a cream upholstered headboard on the west knee wall (clear of the
  // vestibule opening), reeded walnut nightstands with black urn lamps, two buffalo-check stools at the foot, a large
  // abstract on the north wall, olive tree by the entry alcove
  place('f2', 83.18, 32.6, 90, (k) => swap(k, { glb: 'Bed16', w: 6.9, d: 7.3, back: true }, (h) => bed(h, 'king', { frame: '#2a2622', headboard: '#e6e0d3', base: '#e6e0d3', duvet: '#f6f4ef', accent: '#efeae0', sham: '#e9e2d4', pillow: '#a9683e' })));
  for (const y of [27.95, 37.15]) place('f2', 83.18, y, 90, (k) => reededNightstand(k), 'nightstand');
  for (const y of [31.4, 33.8]) place('f2', 91.7, y, 90, (k) => checkStool(k), 'stool');
  place('f2', 92.2, 25.98, 0, (k) => { k.box('col:#e9e4d8', -2.0, 3.4, 0, 2.0, 6.4, 0.12); for (const [c, x0, y0, x1, y1] of [['#b9c0bd', -1.9, 4.9, 1.9, 6.3], ['#c9b59a', -1.9, 3.5, 0.4, 4.9], ['#8d9a9a', 0.4, 3.5, 1.9, 4.5], ['#f2eee4', -0.6, 4.4, 1.2, 5.4]]) k.box('col:' + c, x0, y0, 0.12, x1, y1, 0.125); }, 'art');
  place('f2', 97.4, 27.3, 0, (k) => oliveTree(k, 6.0), 'plant');
  // ---- office (photo 16): dark writing desk near the south end with a slipcovered chair behind it (the sitter looks
  // north, into the room), botanical prints on the south wall, gray swivel armchair + knit pouf by the east wall
  place('f2', 78.5, 35.2, 0, (k) => swap(k, { glb: 'Table49', w: 5.0, d: 2.2, h: 2.5 }, (h) => writingDesk(h, 5.0, 2.2)), 'desk');
  place('f2', 78.5, 36.95, 180, (k) => swap(k, { glb: 'Chair03' }, (h) => slipChair(h, '#eeeae0')), 'chair');
  for (const x of [77.5, 79.5]) place('f2', x, 38.25, 180, (k) => framedArt(k, 1.4, 1.8, 4.4, { frame: '#b08a48', mat: 0.22, bands: [['#f1ede2', 0, 0.2], ['#6f8a5e', 0.2, 0.75], ['#f1ede2', 0.75, 1]] }), 'art');
  place('f2', 80.7, 29.2, face(-1, 0.35), (k) => swap(k, { glb: 'Chair15', w: 2.7 }, (h) => armchair(h, { color: '#9a9a96', pillow: '#e9e5dc' })));
  place('f2', 78.4, 30.6, 0, (k) => pouf(k), 'ottoman');
  // ---- primary bath (photo 17): red vintage runner at the vanity, a small print over the toilet
  place('f2', 79.7, 16.0, 90, (k) => rug(k, 4.6, 2.0, '#8a352c', '#3d2a28'));
  place('f2', 74.5, 9.75, 0, (k) => framedArt(k, 1.5, 1.3, 4.4, { frame: '#b08a48', paper: '#2a2a2a', mat: 0.2, bands: [['#d9d6cc', 0, 1]] }), 'art');
}
export { exteriorLantern, raisedPanel, car };
export {
  bed, nightstand, dresser, bench, sofa, armchair, coffeeTable, sideTable, rug, chair, diningTable, roundTable, buffet, plant,
  floorLamp, tableLamp, knob, toilet, vanity, lightBar, wicRun, linenShelves, hangingClothes, recessed, flushDome, globePendant,
  chandelier, ceilingFan, firePit, adirondack, patioDining, patioChair, powerRack, liftBench, dumbbellRack, pelotonBike,
  bodyPumpArea, treadmill, rubberFloor, shelving, runKit, disc, bar, officeChair, officeDesk, bookcase, IRON, RUBBER, shadeHex, taperLeg,
  wallTV, mediaConsole, projectionScreen, towerSpeaker, desk, baseCab, upperCab, counter, range, fridge, tub, recliner, goldShower, whirlpool,
  sectional, bellChandelier, wallGrille, floorRegister, standTV, leatherSofa, tallChest, armoire, rockingChair,
  lantern, sconce, crystalFlush, vehicle, noseLamp, rivianR2, acuraMDX, teslaModelY, hondaOdyssey, fordF150, toyotaCamry, porsche911, TRIMBLK,
};
