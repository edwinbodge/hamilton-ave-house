// Fixtures (kitchen, baths, fireplace, lights...) and staged furniture, built to real
// dimensions in feet. Components use a Kit (see geom.js): local x = width, z = depth with
// the front at +z, y = up. Wall-mounted pieces have their back at z = 0.
import { LEVELS, toFt, F2, H, PX, vaultUnder, trayOct } from './data.js';
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
  k.box(fab(border), -w / 2, 0.003, -d / 2, w / 2, 0.025, d / 2);
  k.box(fab(field), -w / 2 + 0.5, 0.004, -d / 2 + 0.5, w / 2 - 0.5, 0.028, d / 2 - 0.5);
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
  const d = 1.85, h = 2.65;
  k.box(OAKCAB, -w / 2, 0.33, 0, w / 2, h, d);
  k.box('blackMatte', -w / 2, 0, 0, w / 2, 0.33, d - 0.25);
  const n = Math.max(2, Math.round(w / 1.3)), cw = w / n;
  for (let i = 0; i < n; i++) { const a = -w / 2 + i * cw + 0.03, b = -w / 2 + (i + 1) * cw - 0.03; raisedPanel(k, a, b, 0.42, h - 0.08, d); knob(k, i % 2 ? a + 0.2 : b - 0.2, h - 0.4, d + 0.09, 'brass'); }
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

// ------------------------------------------------------------------ placement
export function buildFixtures(bats) {
  const at = (lv, x, y, rot = 0, extraY = 0) => { const [lx, lz] = P(lv, x, y); return new Kit(bats[lv], lv).at(lx, lz, LV[lv].floor + extraY, rot); };
  const f1 = (x, y, rot = 0, y0 = 0) => { const [lx, lz] = F(x, y); return new Kit(bats.f1, 'f1').at(lx, lz, y0, rot); };
  // ---- kitchen (replaced by the kitchen remodel)
  buildKitchen(renoBat('off:kitchen', 'f1'), 'off:kitchen');
  // ---- family room: fireplace on the back wall between the windows (replaced by the refresh's surround)
  { const [lx, lz] = F(593, 60.5); for (const [tag, y] of [['off:refresh&off:kitchen', H.family], ['off:refresh&on:kitchen', 0]]) fireplace2(new Kit(renoBat(tag, 'f1'), tag).at(lx, lz, y, 0)); }
  // ---- half bath: oak vanity with gray top + brass-framed mirror, toilet
  { const k = f1(628, 307.2, 0); vanity(k, 3.6, 1, { faucet: 'chrome', frame: 'goldFrame', mirrorTop: 6.8, top: 'counter' }); lightBar(k, 2.8, 7.25, 5, 'brass'); } // gray laminate top, 5-light brass bar (photo 22)
  swap(f1(681, 307.2, 0), { glb: 'Toilet03', back: true }, toilet);
  // ---- laundry: washer + dryer on the stair wall, oak uppers, drawer desk at the front window
  { const MB = renoBat('off:mud', 'f1'); const { k } = runKit(MB, 'off:mud', F(612.6, 428), F(612.6, 492), [1, 0]); washerDryer(new Kit(MB, 'off:mud').at(...F(612.6, 459.5), 0, 90)); upperCab(k, 0.1, 5.2); }
  {
    const { k, len } = runKit(bats.f1, 'f1', F(613, 561.4), F(697.5, 561.4), [0, -1]);
    // built-in desk under the window (photo 21): gray laminate top on dark-brown laminate drawer pedestals, returning along the stair wall
    const ped = (kk, a, b) => { kk.box(DARKWOOD, a, 0, 0, b, 2.45, 1.8); for (let i = 0; i < 4; i++) { kk.box(MIDWOOD, a + 0.04, 0.08 + i * 0.58, 1.8, b - 0.04, 0.6 + i * 0.58, 1.84); kk.box('chrome', (a + b) / 2 - 0.2, 0.42 + i * 0.58, 1.84, (a + b) / 2 + 0.2, 0.46 + i * 0.58, 1.88); } };
    ped(k, 0.3, 1.75); ped(k, 3.4, 4.85); ped(k, len - 1.95, len - 0.05);
    k.box('counter', 0, 2.45, 0, len, 2.58, 1.95); k.solid(0, 0, len, 1.95, 0, 2.58);
    const { k: kr, len: lr } = runKit(bats.f1, 'f1', F(612.6, 525), F(612.6, 537.6), [1, 0]);
    ped(kr, 0, lr); kr.box('counter', 0, 2.45, 0, lr, 2.58, 1.95); kr.solid(0, 0, lr, 1.95, 0, 2.58);
  }
  flushDome(f1(655, 470), H.ceil1);
  // ---- closets
  { const { k, len } = runKit(bats.f1, 'f1', F(564, 309), F(564, 374), [1, 0]); wicRun(k, len); hangingClothes(k, len, 67, 0, { coats: true }); }
  { const { k, len } = runKit(bats.f1, 'f1', F(783, 376.4), F(837, 376.4), [0, -1]); wicRun(k, len); hangingClothes(k, len, 23, 0.2); }
  { const { k, len } = runKit(renoBat('off:mud', 'f1'), 'off:mud', F(723.4, 382), F(723.4, 449), [-1, 0]); linenShelves(k, len, 31); }
  { const { k, len } = runKit(bats.f1, 'f1', F(723.4, 455), F(723.4, 491), [-1, 0]); linenShelves(k, len, 37); }
  // ---- lights, 1st floor (8 ft ceilings)
  for (const [x, y] of [[335, 372], [335, 452], [372, 470], [440, 455], [440, 390], [372, 330], [440, 335]]) recessed(f1(x, y), H.ceil1);
  { const [lx, lz] = F(398, 250); bellChandelier(new Kit(renoBat('off:refresh&off:kitchen', 'f1'), 'off:refresh&off:kitchen').at(lx, lz, 0), H.ceil1, 3.0, 5); }
  for (const [x, y] of [[520, 330], [520, 400], [600, 400]]) recessed(f1(x, y), H.ceil1);
  for (const [x, y] of [[740, 250], [800, 250], [740, 330], [800, 310]]) recessed(f1(x, y), H.ceil1);
  for (const [x, y] of [[530, 90], [645, 90], [530, 200], [645, 200], [588, 270]]) recessed(f1(x, y), vaultUnder(y));
  { const k = f1(400, 575); k.cyl('chrome', 0, 0, 0.5, 0.5, 8.62, 8.7, 12); for (let i = 0; i < 3; i++) k.cyl('frosted', 0, 0, 0.75 - i * 0.18, 0.6 - i * 0.18, 8.1 + i * 0.18, 8.3 + i * 0.18, 12); } // crystal flush mount in the tray
  { const [lx, lz] = F(520, 500); const k = new Kit(renoBat('off:refresh', 'f1'), 'off:refresh').at(lx, lz, 0); chandelier(k, H.ceil2, 5.5, 8); for (let i = 0; i < 3; i++) k.cyl('frosted', 0, 0, 0.9 - i * 0.25, 0.75 - i * 0.25, 11.5 + i * 0.5, 11.9 + i * 0.5, 10, 1, false); } // 2-story foyer crystal chandelier
  flushDome(f1(640, 340), H.ceil1); flushDome(f1(640, 400), H.ceil1); flushDome(f1(845, 550), 8.4); flushDome(f1(845, 650), 8.4);
  // living room tray ceiling: octagonal raised panel with crown, 8 ft 8 in at the center
  {
    const r = LV.f1._rooms.find((q) => q.name === 'Living Room');
    const oct = trayOct();
    { const cx = oct.reduce((q, p) => q + p[0], 0) / 8, cz = oct.reduce((q, p) => q + p[1], 0) / 8; // recess walls face into the tray
      for (let i = 0; i < 8; i++) { const [ax, az] = oct[i], [bx, bz] = oct[(i + 1) % 8], mx = (ax + bx) / 2, mz = (az + bz) / 2;
        bats.f2.face(r.wall, [V(ax, H.ceil1, az), V(bx, H.ceil1, bz), V(bx, H.ceil1 + 0.7, bz), V(ax, H.ceil1 + 0.7, az)], V(cx - mx, 0, cz - mz).normalize()); } }
    bats.f2.poly('ceiling', oct, H.ceil1 + 0.7, [], true);
    const k = new Kit(bats.f2, 'f1');
    for (let i = 0; i < 8; i++) { const [ax, az] = oct[i], [bx, bz] = oct[(i + 1) % 8]; const len = Math.hypot(bx - ax, bz - az), mx = (ax + bx) / 2, mz = (az + bz) / 2; const kk = new Kit(bats.f2, 'f1').at(mx, mz, 0, (Math.atan2(bx - ax, bz - az) * 180) / Math.PI - 90); kk.box('white', -len / 2, H.ceil1, -0.15, len / 2, H.ceil1 + 0.18, 0.0); }
    void k;
  }
  // ---- HVAC grilles as photographed: wall returns (family room, living room) and floor supply registers under windows
  wallGrille(f1(686, 302.9, 180, H.family), 5.6, 1.4, 0.7); wallGrille(f1(657, 302.9, 180, H.family), 0.7, 1.4, 0.7); // the low one stays clear of the leveled floor (kitchen remodel)
  wallGrille(f1(392, 496.6, 0), 7.5, 1.2, 0.55); wallGrille(f1(392, 496.6, 0), 0.4, 1.2, 0.55);
  for (const [x, y, r, fy] of [[516, 63, 0, H.family], [662, 63, 0, H.family], [478.5, 120, 90, H.family], [697, 120, 90, H.family], [398, 671, 0, 0], [330, 600, 90, 0], [772, 202, 0, 0], [836, 300, 90, 0], [327, 286, 90, 0]]) floorRegister(fy === H.family ? new Kit(renoBat('off:kitchen', 'f1'), 'off:kitchen').at(...F(x, y), fy + 0.013, r) : f1(x, y, r, fy + 0.013));
  // ---- 2nd floor
  const f2 = (x, y, rot = 0) => { const [lx, lz] = G2(x, y); return new Kit(bats.f2, 'f2').at(lx, lz, H.f2, rot); };
  // hall bath: long oak vanity on the back wall, toilet beside it, tub/shower with a curtain
  { const k = f2(711, 191.9, 0); vanity(k, 5.0, 1, { faucet: 'chrome', sinkX: -0.6, mirrorW: 4.6, top: 'vanityTop2' }); lightBar(k, 2.5, 7.1, 3, 'chrome'); } // white laminate top (photo 33)
  swap(f2(686, 191.9, 0), { glb: 'Toilet03', back: true }, toilet);
  tub(f2(692, 239.1, 180), 2.5, 4.95, { curtain: true }); // standard 60" x 30" alcove tub, wall to wall
  { const { k, len } = runKit(bats.f2, 'f2', G2(708, 239), G2(732, 239), [0, -1], H.f2); linenShelves(k, len, 13); }
  // primary bath: double oak vanity with a cultured-marble top, water closet, gold-framed shower, whirlpool under the window
  const PB = renoBat('off:pbath', 'f2'), pb2 = (x, y, rot = 0) => { const [lx, lz] = G2(x, y); return new Kit(PB, 'off:pbath').at(lx, lz, H.f2, rot); };
  { const k = pb2(864, 157, 90); vanity(k, 8.6, 2, { faucet: 'chrome', mirrorTop: 7.2 }); lightBar(k, 7.4, 7.5, 6, 'chrome'); }
  swap(f2(864, 119.3, 90), { glb: 'Toilet03', back: true }, toilet);
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
  ceilingFan(f2(897, 236), 8, { body: 'steel', blade: 'col:#ebe9e4', drop: 0.75 }); // 52" brushed-nickel fan, white blades, bowl light (photos 25-28)
  flushDome(f2(714, 150), 8); flushDome(f2(714, 295), 8); flushDome(f2(742, 218), 8); flushDome(f2(840, 250), 8);
  for (const [x, y] of [[790, 178], [815, 200], [770, 200]]) recessed(f2(x, y), 8);
  wallGrille(f2(864.6, 226, 90), 6.4, 1.3, 0.6); // primary bedroom return over the dresser (photo 27)
  for (const [x, y, r] of [[972.5, 222, 90], [713, 340, 0], [714, 114, 0], [680, 290, 90]]) floorRegister(f2(x, y, r).at(...G2(x, y), H.f2 + 0.013, r));
  // ---- basement (as listed: drywall, bare concrete floors, recessed cans, rough-in bath)
  const fb = (x, y, rot = 0) => { const [lx, lz] = P('b', x, y); return new Kit(bats.b, 'b').at(lx, lz, H.basement, rot); };
  for (const [x, y] of [[420, 290], [470, 290], [420, 400], [480, 420], [420, 520], [480, 560], [440, 640], [600, 260], [700, 260], [650, 130], [720, 130], [600, 130], [860, 300], [860, 360], [735, 400], [590, 530]]) recessed(fb(x, y), 8);
  bareBulb(new Kit(renoBat('lay:0', 'b'), 'lay:0').at(...P('b', 735, 520), H.basement), 8); // keyless porcelain fixture in the rough-in bath (photo 41)
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
  // (photo 36): the whole partition face from the north opening to the hall, and the fins ("pilasters") are brown;
  // a drywall soffit runs along the top of the wall, as deep as the fins
  {
    const AB = renoBat('not:lay:D', 'b'), ak = new Kit(AB, 'not:lay:D').at(0, 0, H.basement), BR = 'paint:#8a6448';
    const [x, z0] = P('b', 532.6, 236), [, z1] = P('b', 0, 601.5);
    ak.box(BR, x - 0.03, 0, z0, x, 8.0, z1);
    for (const [fx0, fy] of [[514, 373.5], [514, 458.5], [507, 535.5]]) {
      const [xa, za] = P('b', fx0, fy), t = 0.175;
      ak.box(BR, xa - 0.02, 0, za - t - 0.02, x, 7.0, za - t); ak.box(BR, xa - 0.02, 0, za + t, x, 7.0, za + t + 0.02); ak.box(BR, xa - 0.02, 0, za - t, xa, 7.0, za + t);
    }
    const [xs] = P('b', 515, 0);
    ak.box('plaster', xs, 7.0, z0, x, 8.0, z1); ak.box('white', xs - 0.01, 6.98, z0, x, 7.0, z1);
    // white electric baseboard heater on the west wall (photo 36)
    const [hx, hz0] = P('b', 380, 440), [, hz1] = P('b', 0, 520);
    const hk = new Kit(renoBat('lay:0', 'b'), 'lay:0').at(0, 0, H.basement);
    hk.box('white', hx + 0.25, 0.25, hz0, hx + 0.5, 0.95, hz1); hk.box('col:#cfcfca', hx + 0.5, 0.35, hz0 + 0.1, hx + 0.51, 0.55, hz1 - 0.1);
  }
  // east room: peach ceiling (photos 38-39) and a drywall bulkhead along the south wall
  {
    const pr = LV.b._rooms.find((r) => r.name === 'Room' && r.poly[0][0] === 784);
    if (pr) bats.f1.poly('paint:#e8b98d', pr.pts, H.basement + 8.0 - 0.01, [], true);
    const [ax, az] = P('b', 809.5, 403.5), [bx] = P('b', 933, 0);
    const bk = new Kit(bats.b, 'b').at(0, 0, H.basement); bk.box('paint:#e8b98d', ax, 7.0, az - 1.7, bx - 0.25, 8.0, az - 0.25);
  }
  // sump pit lid in the stair hall corner
  { const k = fb(646, 344); k.cyl('black', 0, 0, 0.9, 0.9, 0, 0.06, 16); }
  // ---- exterior lights
  // front-door lantern on the tower's brick return beside the entry, facing the door, ~66" above the stoop (top at -0.35)
  { const [lx, lz] = F(477, 575); exteriorLantern(new Kit(renoBat('off:classic', 'f1'), 'off:classic').at(lx + 0.58, lz, 0, 90), -0.35 + 5.5); }
  for (const y of [400, 603, 716]) exteriorLantern(f1(990.6, y, 90), 7.2);
  exteriorLantern(f1(905, 375.4, 180), 6.6);
  exteriorLantern(f1(345, 194.4, 180), 6.6);
}

export function buildFurniture(bats) {
  const at = (lv, x, y, rot = 0, y0) => { const [lx, lz] = P(lv, x, y); return new Kit(bats[lv + 'F'], lv + 'F').at(lx, lz, y0 ?? LV[lv].floor, rot); };
  const place = (lv, x, y, rot, fn, y0) => item(at(lv, x, y, rot, y0), fn);
  const fam = H.family;
  const placeK = (x, y, rot, fn, y0 = 0) => item(atK(x, y, rot, y0), fn);
  const KF = renoBat('off:kitchen&furn', 'f1'), atK = (x, y, rot = 0, y0 = 0) => { const [lx, lz] = F(x, y); return new Kit(KF, 'off:kitchen&furn').at(lx, lz, y0, rot); };
  // ---- family room (staged like the photos: patterned sofa + loveseat, blue leather recliners, TV on gray cabinets)
  placeK(479, 150, 90, (k) => swap(k, { glb: 'Sofa17', w: 7.6, d: 3.1, back: true }, (h) => sofa(h, 7.6, { roll: true, color: '#4b4262', cushion: '#54486c', pillows: ['#b0283a', '#c9b49a', '#8d2f3a'] })), fam);
  placeK(696.5, 165, -90, (k) => swap(k, { glb: 'Sofa17', w: 5.8, d: 3.1, back: true }, (h) => sofa(h, 5.8, { roll: true, color: '#4b4262', cushion: '#54486c', pillows: ['#b0283a', '#c9b49a'] })), fam);
  placeK(668, 84, -150, (k) => swap(k, { glb: 'Chair20', w: 3.1, d: 2.8 }, (h) => recliner(h)), fam); // navy leather recliner by the fireplace (photos 07, 09, 24)
  // 50" TV on gray lateral files under the loft balcony (photo 08)
  placeK(606, 302.6, 180, (k) => { fileCabinetStand(k); standTV(k, 50, 2.25); }, fam);
  // ---- dining area: oak table for six under the chandelier
  {
    const t = atK(398, 250, 0);
    rug(t, 8, 10, '#d9cfbd', '#8d6e4f');
    for (const [cx, cz, r] of swap(t, { glb: 'Table17', w: 6, d: 3.4, h: 2.5 }, (h) => diningTable(h, 6, 3.4, { color: '#d2a86e' }))) { const p = t.P(cx, 0, cz); swap(new Kit(KF, 'off:kitchen&furn').at(p.x, p.z, 0, r), { glb: 'Chair03' }, (h) => spindleChair(h)); }
    drapes(new Kit(KF, 'off:kitchen&furn').at(...F(396, 200.6), 0, 0), 7.4, 7.5, '#dcdad5'); // sheer gray panels at the slider (photo 16)
  }
  // ---- living room (photos 19-20): burgundy leather reclining sofa under the side window, iron-and-glass console; no rug
  // (as listed only: the front-room options below bring their own furniture)
  const LR = 'off:frontOffice&off:frontDining&furn', placeL = (x, y, rot, fn, tag = LR) => { const [lx, lz] = F(x, y); item(new Kit(renoBat(tag, 'f1'), tag).at(lx, lz, 0, rot), fn); };
  placeL(327.5, 578, 90, (k) => swap(k, { glb: 'Sofa36', w: 7.2, d: 3.2, back: true }, (h) => leatherSofa(h, 7.2)));
  place('f1', 326.6, 577.5, 90, (k) => drapes(k, 5.2, 7.7, '#5d4d5a'));
  placeL(473.5, 615, -90, (k) => { k.box('glass', -2.0, 2.5, 0, 2.0, 2.56, 1.2); k.box('glass', -1.85, 0.5, 0.15, 1.85, 0.53, 1.05); for (const x of [-1.9, 1.9]) for (const z of [0.12, 1.08]) k.box('col:#7d7a72', x - 0.04, 0, z - 0.04, x + 0.04, 2.5, z + 0.04); k.box('col:#7d7a72', -1.95, 2.35, 0.08, 1.95, 2.5, 0.16); k.solid(-2, 0, 2, 1.2, 0, 2.5); });
  // ---- front room option: home office. Desk floats in front of the bay so the screen faces away from the window and
  // the seat looks at the foyer opening; bookcases flank the side window, credenza on the tower wall, reading chair
  { const OF = 'on:frontOffice&furn';
    placeL(400, 585, 0, (k) => rug(k, 8, 9, '#d8cfc0', '#7d6a55'), OF);
    placeL(400, 602, 0, (k) => swap(k, { glb: 'Table49', w: 5.5, d: 2.5, h: 2.5, back: true }, (h) => officeDesk(h, 5.5)), OF);
    placeL(400, 645, 180, (k) => swap(k, { glb: 'Chair33' }, (h) => officeChair(h)), OF);
    placeL(400, 585, 0, (k) => swap(k, { glb: 'Chair17' }, (h) => chair(h, '#8a7f72', '#5a3a26')), OF);                    // guest chair across the desk
    placeL(326.8, 520, 90, (k) => bookcase(k, 2.8, 6.5, 5, '#5a3a26'), OF);
    placeL(326.8, 632, 90, (k) => bookcase(k, 2.8, 6.5, 8, '#5a3a26'), OF);
    placeL(473.5, 610, -90, (k) => swap(k, { glb: 'Drawer31', w: 5, d: 1.6, h: 2.9, back: true }, (h) => buffet(h, 5)), OF);                                   // credenza / printer + files
    placeL(352, 527, 45, (k) => swap(k, { glb: 'Chair12' }, (h) => armchair(h, { color: '#9a8a74' })), OF);
    placeL(372, 512, 0, (k) => floorLamp(k, 0, 0), OF);
    placeL(355, 568, 0, (k) => plant(k, 0, 0, 4.5), OF); }
  // ---- front room option: formal dining. 60" round pedestal table for six centered under the tray, chandelier, buffet
  { const DF = 'on:frontDining&furn', cx = 400, cy = 575, [tx, tz] = F(cx, cy), R = 3.15;
    placeL(cx, cy, 0, (k) => rug(k, 9, 9, '#d6cdbd', '#6f5e4d'), DF);
    placeL(cx, cy, 0, (k) => swap(k, { glb: 'Table23', w: 5, d: 5, h: 2.5 }, (h) => roundTable(h, 2.5, { color: '#6b4a33', base: '#5a3a26' })), DF);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; swap(new Kit(renoBat(DF, 'f1'), DF).at(tx + Math.sin(a) * R, tz + Math.cos(a) * R, 0, (a * 180) / Math.PI + 180), { glb: 'Chair08' }, (h) => chair(h, '#cfc6b6', '#5a3a26')); }
    chandelier(new Kit(renoBat('on:frontDining', 'f1'), 'on:frontDining').at(tx, tz, 0), H.ceil1 + 0.7, 2.6, 6);
    placeL(473.5, 610, -90, (k) => swap(k, { glb: 'Drawer31', w: 5, d: 1.6, h: 2.9, back: true }, (h) => buffet(h, 5)), DF);
    placeL(326.8, 630, 90, (k) => plant(k, 0.8, 0.8, 5), DF); }
  // ---- office / bedroom 4
  // photos 17-18: black bow-front desk under the back window, white hutch desk + light maple bookcase in the front corner,
  // a dark three-drawer file cabinet with the printer beside the French doors
  place('f1', 752, 232, 0, (k) => swap(k, { glb: 'Table43', w: 5.4, d: 1.45, h: 2.5, dz: 0.575, turn: 180 }, (h) => bowDesk(h)));
  place('f1', 752, 214, 0, (k) => swap(k, { glb: 'Chair31' }, (h) => officeChair(h)));
  place('f1', 703.8, 322, 90, (k) => { swap(k, { glb: 'Table44', w: 4.0, d: 2.05, h: 2.5, back: true }, (h) => hutchDesk(h, 4.0, { part: 'desk' })); hutchDesk(k, 4.0, { part: 'hutch' }); });
  place('f1', 728, 322, -90, (k) => swap(k, { glb: 'Chair31' }, (h) => officeChair(h)));
  place('f1', 718, 376.2, 180, (k) => bookcase(k, 2.6, 6.2, 5, '#d4ab74'));
  place('f1', 703.8, 222, 90, (k) => { k.box(wood('#4e3524'), -1.3, 0, 0, 1.3, 2.4, 1.7); for (let i = 0; i < 3; i++) { k.box(wood('#5c4030'), -1.22, 0.12 + i * 0.75, 1.7, 1.22, 0.8 + i * 0.75, 1.73); k.box('steel', -0.3, 0.6 + i * 0.75, 1.73, 0.3, 0.65 + i * 0.75, 1.78); } k.box('col:#2b2b2b', -0.9, 2.4, 0.2, 0.9, 3.05, 1.45); k.box('col:#d9d9d6', -0.7, 3.05, 0.4, 0.7, 3.1, 1.2); k.solid(-1.3, 0, 1.3, 1.7, 0, 3.1); });
  // ---- foyer: pewter console against the wall under the stair (photo 06)
  place('f1', 561.2, 512, -90, (k) => { k.box('col:#8c8c86', -1.8, 2.45, 0, 1.8, 2.6, 0.95); for (const x of [-1.65, 1.65]) for (const z of [0.12, 0.83]) k.box('col:#8c8c86', x - 0.04, 0, z - 0.04, x + 0.04, 2.45, z + 0.04); k.solid(-1.8, 0, 1.8, 0.95, 0, 2.6); });
  // ---- garage: Acura MDX and Rivian R2 at true size in the double bay, nosed in 1.2 ft past the door;
  // bikes, rackets and golf bags along the back side wall of the single bay (clear of its window)
  place('f1', 873, 445, -90, (k) => acuraMDX(k), H.garage);
  place('f1', 879, 553, -90, (k) => rivianR2(k), H.garage);
  place('f1', 745, 719, 180, (k) => bike(k, { color: '#2b4f7a', hang: 6.6 }), H.garage);
  place('f1', 765, 719, 180, (k) => bike(k, { color: '#b3332b', hang: 6.6 }), H.garage);
  place('f1', 785, 719, 180, (k) => bike(k, { color: '#d8d6cf', hang: 6.6 }), H.garage);
  place('f1', 808, 719, 180, (k) => racketRack(k), H.garage);
  place('f1', 908, 719, 180, (k) => golfBag(k, '#20324d'), H.garage);
  place('f1', 936, 719, 180, (k) => golfBag(k, '#6b1f2a'), H.garage);
  place('f1', 703, 640, 90, (k) => shelving(k, 8, 1.6, 6), H.garage);
  place('f1', 703, 700, 90, (k) => shelving(k, 3, 1.6, 6), H.garage);
  // ---- 2nd floor
  const p2 = (x, y, rot, fn) => { const [lx, lz] = G2(x, y); item(new Kit(bats.f2F, 'f2F').at(lx, lz, H.f2, rot), fn); };
  // primary (photos 25-28): queen bed with a white arched headboard on the front wall, one nightstand (bump side),
  // white dresser with an arched mirror + two urn lamps and a tall chest on the closet wall, white armoire beside the
  // bath door, floral sofa and a drop-leaf desk in the bump
  p2(897, 274.4, 180, (k) => swap(k, { glb: 'Bed12', w: 5.35, d: 7.2, back: true }, (h) => bed(h, 'queen', { style: 'arch', quilt: '#3d4c70', frame: '#efece6', headboard: '#f1eee8', skirt: '#9fb3aa', duvet: '#f3f2ee', accent: '#2d3f66', sham: '#f4f2ee', pillow: '#f4f2ee' })));
  p2(920, 274.4, 180, (k) => swap(k, { glb: 'Drawer04', back: true }, (h) => nightstand(h, { color: '#efece6', front: '#f4f2ec' })));
  p2(864.6, 240, 90, (k) => swap(k, { glb: 'Drawer38', w: 5.2, back: true }, (h) => dresser(h, 5.2, { color: '#efece6', front: '#f4f2ec', mirror: true, arch: true, lamps: true })));
  p2(864.6, 266, 90, (k) => swap(k, { glb: 'Drawer34', w: 2.5, d: 1.55, h: 4.3, back: true }, (h) => tallChest(h, 2.5, 4.3)));
  p2(913, 186.6, 0, (k) => armoire(k, 3.0, 5.2, { color: '#efece6', front: '#f4f2ec' }));
  p2(953.5, 266.4, 180, (k) => swap(k, { glb: 'Sofa08', w: 6.2, d: 3.15, back: true }, (h) => sofa(h, 6.2, { color: '#ebe2d6', cushion: '#efe6da', pillows: ['#e3c9bd', '#c9d3d6'] })));
  p2(945, 200.4, 0, (k) => swap(k, { glb: 'Table17', w: 3.0, d: 1.8, h: 2.48, back: true }, (h) => dropLeafDesk(h)));
  p2(945, 207.5, 180, (k) => swap(k, { glb: 'Chair29' }, (h) => chair(h, '#24304a', '#24304a')));
  // bedroom 3 (pink carpet, photos 34-35): twin bed with a metal headboard in the front-right corner, oak TV armoire
  // beside the north window, white Windsor rocker
  p2(738.8, 111.1, 0, (k) => swap(k, { glb: 'Bed09', w: 3.6, d: 6.9, back: true }, (h) => bed(h, 'twin', { style: 'iron', frame: '#6f7f72', headboard: '#7d8a80', skirt: '#f4efe8', duvet: '#efe3d6', accent: '#c98f8f', sham: '#f1e9df', pillow: '#d8b6a6' })));
  p2(688.5, 111.1, 0, (k) => armoire(k, 2.6, 4.8));
  p2(690, 168, 160, (k) => rockingChair(k));
  // bedroom 2 (bay, photos 31-32): pine bed on the hall wall, white nightstand, dark chest beside the side window
  p2(749.5, 300, -90, (k) => swap(k, { glb: 'Bed02', w: 4.85, d: 7.0, back: true }, (h) => bed(h, 'full', { style: 'pine', frame: '#b98a52', headboard: '#c08a4e', skirt: '#9a8a7c', duvet: '#efe4e6', accent: '#b8a2c2', sham: '#efe8e0', pillow: '#c9b2cc' })));
  p2(749.5, 278, -90, (k) => swap(k, { glb: 'Drawer04', back: true }, (h) => nightstand(h, { color: '#efece6', front: '#f4f2ec' })));
  p2(678.5, 265, 90, (k) => swap(k, { glb: 'Drawer37', w: 2.6, d: 1.55, h: 3.9, back: true }, (h) => tallChest(h, 2.6, 3.9, { color: '#4e3324', front: '#5b3c2a' })));
  // loft: built-in desk with bookshelves at the balcony rail, white chair
  p2(810, 166, 0, (k) => { k.box(wood('#e8d9bf'), -3.0, 2.45, 0, 3.0, 2.55, 2.0); for (const x of [-3.0, 1.8]) { k.box(wood('#e8d9bf'), x, 0, 0, x + 1.2, 2.45, 2.0); for (let y = 0.6; y < 2.4; y += 0.6) k.box('col:' + ['#7a3b2e', '#2e4a6e', '#c9a96e', '#3e5a3c'][Math.floor(y * 3) % 4], x + 0.1, y - 0.5, 0.3, x + 1.1, y - 0.05, 1.6); } tableLamp(k, -2.4, 1.0, 2.55); tableLamp(k, 2.4, 1.0, 2.55); k.solid(-3, 0, 3, 2, 0, 2.55); });
  p2(810, 178, 180, (k) => swap(k, { glb: 'Chair07' }, (h) => chair(h, '#f4f2ee', '#f4f2ee')));
  // ---- basement as listed: a pair of cream swivel chairs and carpet remnants in the rec room, a dresser in the north room
  const pb = (x, y, rot, fn) => { const [lx, lz] = P('b', x, y); item(new Kit(renoBat('lay:0&furn', 'b'), 'lay:0&furn').at(lx, lz, H.basement, rot), fn); };
  pb(500, 300, -100, (k) => swap(k, { glb: 'Chair11' }, (h) => armchair(h, { color: '#efe9dd' })));
  pb(500, 360, -80, (k) => swap(k, { glb: 'Chair11' }, (h) => armchair(h, { color: '#efe9dd' })));
  pb(450, 330, 0, (k) => rug(k, 7, 12, '#cdbd9f', '#cdbd9f'));
  pb(660, 200, 180, (k) => swap(k, { glb: 'Drawer40', w: 4, d: 1.6, h: 2.6, back: true }, (h) => { h.box(wood('#2f2219'), -2.0, 0, 0, 2.0, 1.6, 1.6); h.solid(-2, 0, 2, 1.6, 0, 1.6); }));
  // ---- back patio as it is: four cast-aluminum chairs around a fire bowl, grill
  const pat = (x, z, rot, fn) => item(new Kit(renoBat('off:patio', 'site'), 'off:patio').at(x, z, -0.96, rot), fn);
  pat(10.5, 8, 0, (k) => { k.cyl('col:#5a3a2a', 0, 0, 1.2, 0.8, 0, 1.2, 14); k.cyl('ember', 0, 0, 0.9, 0.9, 1.15, 1.2, 12); k.solid(-1, -1, 1, 1, 0, 1.2); });
  for (const [dx, dz] of [[-2.6, -2.2], [2.6, -2.2], [-2.6, 2.2], [2.6, 2.2]]) pat(10.5 + dx, 8 + dz, (Math.atan2(-dx, -dz) * 180) / Math.PI, (k) => swap(k, { glb: 'Chair04' }, (h) => patioChair(h)));
  // gas grill (photo 46): ~4 ft wide with side shelves x 2 ft deep x 4 ft tall lid closed; on the patio by the
  // family-room wall (wall face at x 14.8), clear of the slider steps (x 5.5-11.7)
  pat(12.5, 3.75, 0, (k) => {
    k.box('black', -1.1, 0.35, -0.85, 1.1, 0.45, 0.85); k.box('black', -1.1, 2.55, -0.85, 1.1, 2.9, 0.85);          // cart bottom shelf + frame
    for (const x of [-1.05, 1.05]) for (const z of [-0.8, 0.8]) k.box('black', x - 0.05, 0.15, z - 0.05, x + 0.05, 2.6, z + 0.05);
    for (const x of [-1.05, 1.05]) k.cyl('black', x, 0.8, 0.17, 0.17, 0, 0.12, 10);                              // casters
    k.cyl('col:#e8e8e4', 0.45, -0.1, 0.5, 0.5, 0.45, 1.85, 12); k.cyl('col:#cfcfca', 0.45, -0.1, 0.2, 0.2, 1.85, 2.1, 8); // 20 lb propane tank
    k.box('col:#2a2a2c', -1.1, 2.9, -0.85, 1.1, 3.3, 0.85);                                                      // cookbox + control panel
    for (let i = 0; i < 3; i++) k.cyl('chrome', -0.6 + i * 0.6, 0.88, 0.07, 0.07, 3.05, 3.15, 8);
    k.prof('col:#1c1c1e', [[-0.85, 3.3], [0.85, 3.3], [0.75, 3.7], [0.35, 3.97], [-0.35, 3.97], [-0.75, 3.7]], -1.1, 1.1); // domed lid
    k.box('chrome', -0.75, 3.62, 0.95, 0.75, 3.68, 1.0); for (const x of [-0.7, 0.7]) k.box('chrome', x - 0.03, 3.55, 0.8, x + 0.03, 3.62, 1.0); // handle
    for (const sx of [-1, 1]) k.box('black', sx > 0 ? 1.1 : -2.0, 2.88, -0.75, sx > 0 ? 2.0 : -1.1, 2.95, 0.75); // side shelves
    k.solid(-2.0, -0.85, 2.0, 1.0, 0, 4.0);
  });
}
export { exteriorLantern, raisedPanel };
export {
  bed, nightstand, dresser, bench, sofa, armchair, coffeeTable, sideTable, rug, chair, diningTable, roundTable, buffet, plant,
  floorLamp, tableLamp, knob, toilet, vanity, lightBar, wicRun, linenShelves, hangingClothes, recessed, flushDome, globePendant,
  chandelier, ceilingFan, firePit, adirondack, patioDining, patioChair, powerRack, liftBench, dumbbellRack, pelotonBike,
  bodyPumpArea, treadmill, rubberFloor, shelving, runKit, disc, bar, officeChair, officeDesk, bookcase, IRON, RUBBER, shadeHex, taperLeg,
  wallTV, mediaConsole, projectionScreen, towerSpeaker, desk, baseCab, upperCab, counter, range, fridge, tub, recliner, goldShower, whirlpool,
  sectional, bellChandelier, wallGrille, floorRegister, standTV, leatherSofa, tallChest, armoire, rockingChair,
};
