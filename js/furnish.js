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
// basement theater bay: electrical panel and tall oak cabinet on the north wall (basement plan px)
const BPANEL = [1638.2, 360], BCAB = [1638.2, 557];
const DARKWOOD = wood('#4e3324'), MIDWOOD = wood('#7a5234');

// ------------------------------------------------------------------ small parts
function knob(k, x, y, z) { k.cbox('brass', x, z + 0.03, 0.07, 0.06, y - 0.035, y + 0.035); }
function raisedPanel(k, x0, x1, y0, y1, z, key = OAKDOOR, pkey = OAKPANEL) { // frame + beveled raised panel
  k.box(key, x0, y0, z, x1, y1, z + 0.06);
  const m = Math.min(0.2, (x1 - x0) * 0.18, (y1 - y0) * 0.18);
  k.box(key, x0 + m * 0.98, y0 + m * 0.98, z + 0.06, x1 - m * 0.98, y1 - m * 0.98, z + 0.065);         // sticking (inner edge of the frame)
  k.box(pkey, x0 + m * 1.1, y0 + m * 1.1, z + 0.055, x1 - m * 1.1, y1 - m * 1.1, z + 0.075);          // bevel
  k.box(pkey, x0 + m * 1.55, y0 + m * 1.55, z + 0.075, x1 - m * 1.55, y1 - m * 1.55, z + 0.095);      // raised field
}
function tableLamp(k, x, z, y) {
  k.cyl('col:#d9d2c4', x, z, 0.22, 0.18, y, y + 0.9, 12);
  k.cyl('brass', x, z, 0.04, 0.04, y + 0.9, y + 1.3, 6);
  k.cyl('shade', x, z, 0.55, 0.4, y + 1.2, y + 2.0, 14, 1, false);
}
// straight rod of square section between two local points (for tilted or curved parts: chain several)
function rod(k, key, a, b, r = 0.03) {
  const A = k.P(...a), B = k.P(...b), d = B.clone().sub(A);
  if (d.lengthSq() < 1e-8) return;
  const up = Math.abs(d.y) / d.length() > 0.9 ? V(1, 0, 0) : V(0, 1, 0);
  const u = d.clone().cross(up).normalize().multiplyScalar(2 * r), w = d.clone().cross(u).normalize().multiplyScalar(2 * r);
  k.bat.box(key, A.clone().addScaledVector(u, -0.5).addScaledVector(w, -0.5), u, d, w);
}
// thin double-sided leaf (a pointed oval) at local point p, pointing along dir [dx, dy, dz], width axis side
function leaf(k, key, p, dir, side, len, wid) {
  const P0 = k.P(...p), D = k.P(p[0] + dir[0], p[1] + dir[1], p[2] + dir[2]).sub(P0).normalize().multiplyScalar(len);
  const S = k.P(p[0] + side[0], p[1] + side[1], p[2] + side[2]).sub(P0).normalize().multiplyScalar(wid / 2);
  const pts = [P0, P0.clone().addScaledVector(D, 0.3).add(S), P0.clone().addScaledVector(D, 0.65).addScaledVector(S, 0.85), P0.clone().add(D),
    P0.clone().addScaledVector(D, 0.65).addScaledVector(S, -0.85), P0.clone().addScaledVector(D, 0.3).sub(S)];
  const n = D.clone().cross(S).normalize();
  k.bat.face(key, pts, n); k.bat.face(key, pts.slice().reverse(), n.clone().negate());
}
// arc floor lamp (living room photos 7, 8, 15, 16): round black base, slim pole that bends forward
// at the top into a hook, white drum shade hanging from it. The arm reaches toward local +z.
function floorLamp(k, x, z, o = {}) {
  if (o.straight) {
    k.cyl('black', x, z, 0.5, 0.5, 0, 0.08, 12);
    k.cyl('black', x, z, 0.05, 0.05, 0.08, 4.8, 6);
    k.cyl('shade', x, z, 0.65, 0.5, 4.6, 5.6, 14, 1, false);
    return;
  }
  k.cyl('black', x, z, 0.42, 0.45, 0, 0.06, 18); k.cyl('black', x, z, 0.12, 0.3, 0.06, 0.12, 14);
  const H = o.h || 5.6, R = 0.55, pts = [];
  pts.push([x, 0.1, z], [x, H - R, z]);
  for (let i = 1; i <= 6; i++) { const a = (i / 6) * Math.PI * 0.9; pts.push([x, H - R + Math.sin(a) * R, z + R - Math.cos(a) * R]); }
  for (let i = 0; i < pts.length - 1; i++) rod(k, 'black', pts[i], pts[i + 1], 0.025);
  const [, hy, hz] = pts[pts.length - 1];
  rod(k, 'black', [x, hy, hz], [x, hy - 0.35, hz], 0.02);
  k.cyl('shade', x, hz, 0.42, 0.42, hy - 1.15, hy - 0.35, 18, 1, false);
  k.cyl('col:#f1eee6', x, hz, 0.42, 0.42, hy - 0.37, hy - 0.35, 18);
  k.cyl('bulb', x, hz, 0.1, 0.1, hy - 0.75, hy - 0.5, 8);
}
function plant(k, x, z, h = 5.5) { // potted ficus / fiddle-leaf tree: pot, branching trunk, leaves along the branches
  const s = Math.min(1, h / 5.5), pr = 0.42 + 0.16 * s, ph = 0.55 + 0.55 * s;
  k.cyl('col:#e2ddd3', x, z, pr * 0.78, pr, 0, ph, 18);                           // tapered pot
  k.cyl('col:#e9e5dc', x, z, pr + 0.02, pr + 0.02, ph - 0.06, ph, 18);           // rolled rim
  k.cyl('col:#4a3b2c', x, z, pr * 0.92, pr * 0.92, ph - 0.08, ph - 0.03, 18);     // soil
  let r = 11 + Math.round(h * 10);
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  const trunkTop = h * 0.55;
  rod(k, 'col:#6a5641', [x, ph - 0.05, z], [x + 0.05, trunkTop, z - 0.03], 0.035 + 0.02 * s);
  const nb = Math.round(7 + 6 * s);
  for (let b = 0; b < nb; b++) { // branches fan up and out from the upper trunk
    const a = b * 2.39 + rnd() * 0.5, y0 = trunkTop * (0.75 + 0.25 * rnd()), reach = (0.55 + 0.5 * rnd()) * (0.5 + 0.5 * s);
    const tip = [x + Math.cos(a) * reach, Math.min(h - 0.2, y0 + (h - y0) * (0.55 + 0.45 * rnd())), z + Math.sin(a) * reach];
    rod(k, 'col:#6a5641', [x + 0.03, y0, z], tip, 0.018);
    const nl = Math.round(9 + 7 * s);
    for (let i = 0; i < nl; i++) { // leaves alternate along the outer two thirds of the branch, larger lower down
      const t = 0.3 + 0.7 * (i / nl), px = x + (tip[0] - x) * t, py = y0 + (tip[1] - y0) * t, pz = z + (tip[2] - z) * t;
      const la = a + (i % 2 ? 1 : -1) * (0.9 + 0.5 * rnd()), up = 0.2 + 0.7 * rnd();
      const dir = [Math.cos(la), up, Math.sin(la)], side = [-Math.sin(la), 0.25 * (rnd() - 0.5), Math.cos(la)];
      const L = (0.38 + 0.2 * rnd()) * (0.75 + 0.25 * s) * (1.15 - 0.3 * t);
      leaf(k, rnd() < 0.55 ? 'col:#3d6630' : 'col:#4d7a3a', [px, py, pz], dir, side, L, L * 0.62);
    }
  }
}
// ------------------------------------------------------------------ wall & floor details (back at z = 0)
function wallArt(k, w, h, yc, o = {}) { // framed print with a mat, centered at height yc
  const fr = o.frame || 'col:#d9cfbf';
  k.box(fr, -w / 2, yc - h / 2, 0, w / 2, yc + h / 2, 0.08);
  k.box('col:#f5f2ea', -w / 2 + 0.08, yc - h / 2 + 0.08, 0.08, w / 2 - 0.08, yc + h / 2 - 0.08, 0.085);
  const iw = w - 0.5, ih = h - 0.5;
  k.box(o.art || 'col:#c9a6a0', -iw / 2, yc - ih / 2, 0.085, iw / 2, yc + ih / 2, 0.09);
  if (o.motif) for (let i = 0; i < 7; i++) { // a few soft botanical shapes
    const x = (((i * 37) % 11) / 11 - 0.5) * iw * 0.8, y = yc + (((i * 53) % 13) / 13 - 0.5) * ih * 0.8;
    k.box(o.motif, x - 0.07, y - 0.12, 0.09, x + 0.07, y + 0.12, 0.093);
  }
}
function outlet(k, y = 1.25, double = false) { // duplex receptacle (or switch) cover plate
  k.box('col:#f1eee6', -0.115 * (double ? 2 : 1), y - 0.19, 0, 0.115 * (double ? 2 : 1), y + 0.19, 0.02);
  for (const dx of double ? [-0.12, 0.12] : [0]) for (const dy of [-0.07, 0.07]) k.box('col:#d8d3c6', dx - 0.05, y + dy - 0.035, 0.02, dx + 0.05, y + dy + 0.035, 0.026);
}
function switchPlate(k, y = 4.0, n = 1, brass = false) {
  const w = 0.115 + (n - 1) * 0.08;
  k.box(brass ? 'brass' : 'col:#f1eee6', -w, y - 0.19, 0, w, y + 0.19, 0.02);
  for (let i = 0; i < n; i++) { const x = -w + 0.115 + i * 0.16; k.box('col:#e9e5da', x - 0.025, y - 0.05, 0.02, x + 0.025, y + 0.05, 0.05); }
}
function floorRegister(k, w = 1.0, d = 0.4) { // centered floor grille (forced-air heat, as in the photos)
  k.box('col:#cdbfa7', -w / 2, 0.012, -d / 2, w / 2, 0.03, d / 2);
  for (let x = -w / 2 + 0.07; x < w / 2 - 0.05; x += 0.07) k.box('col:#5d5246', x, 0.025, -d / 2 + 0.05, x + 0.03, 0.031, d / 2 - 0.05);
}
function wallRegister(k, y = 7.2, w = 1.1, h = 0.45) { // high-wall return grille
  k.box('col:#ece8df', -w / 2, y - h / 2, 0, w / 2, y + h / 2, 0.03);
  for (let yy = y - h / 2 + 0.06; yy < y + h / 2 - 0.05; yy += 0.06) k.box('col:#8f8a80', -w / 2 + 0.06, yy, 0.03, w / 2 - 0.06, yy + 0.025, 0.035);
}
function valance(k, w, y0, y1, key, o = {}) { // window valance mounted over the casing; back at z = 0
  const d = o.depth || 0.35;
  if (o.scallop) { // gathered swags with a scalloped hem
    k.soft(key, -w / 2, y0 + 0.35, 0.03, w / 2, y1, d, 0.08);
    const n = Math.max(2, Math.round(w / 1.3)), sw = w / n;
    for (let i = 0; i < n; i++) k.soft(key, -w / 2 + i * sw, y0, 0.05, -w / 2 + (i + 1) * sw, y0 + 0.6, d + 0.04, 0.22);
  } else { // flat roman / box valance
    k.soft(key, -w / 2, y0, 0.02, w / 2, y1, d, 0.04);
  }
}
function rollerShade(k, w, y) { // white cassette for a rolled-up shade, under the window head
  k.soft('col:#f4f3ef', -w / 2, y - 0.28, 0.02, w / 2, y, 0.3, 0.06);
}
function spindleChair(k, o = {}) { // white upholstered armchair with turned (bobbin) wood arms, centered, faces +z
  const w = 2.35, d = 2.55, c = fab(o.color || '#efece4'), wd = wood(o.wood || '#5a3423');
  for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) {
    for (const z of [-d / 2 + 0.12, d / 2 - 0.12]) for (let y = 0; y < 2.0; y += 0.13) k.cyl(wd, x, z, 0.065, 0.065, y, y + 0.13, 8, 1, false), k.cyl(wd, x, z, 0.085, 0.085, y + 0.03, y + 0.1, 8);
    for (let z = -d / 2 + 0.12; z < d / 2 - 0.1; z += 0.13) k.cyl(wd, x, z, 0.075, 0.075, 1.93, 2.07, 8); // bobbin arm rail
  }
  k.box(wd, -w / 2 + 0.1, 0.3, -d / 2 + 0.1, w / 2 - 0.1, 0.42, d / 2 - 0.1);
  k.soft(c, -w / 2 + 0.17, 0.42, -d / 2 + 0.15, w / 2 - 0.17, 1.5, d / 2, 0.14);                 // seat (18")
  k.soft(c, -w / 2 + 0.17, 1.2, -d / 2, w / 2 - 0.17, 2.9, -d / 2 + 0.55, 0.22);                 // back
  if (o.pillow) k.soft(fab(o.pillow), -0.62, 1.45, -d / 2 + 0.55, 0.62, 2.45, -d / 2 + 0.88, 0.2);
  k.solid(-w / 2, -d / 2, w / 2, d / 2, 0, 2.9);
}
function potPlant(k, x, z, y, s = 1) { // small trailing plant in a pot (counters, shelves, vanities)
  k.cyl('col:#d9c6a8', x, z, 0.2 * s, 0.15 * s, y, y + 0.32 * s, 10);
  for (let i = 0; i < 6; i++) { const a = i * 1.05, r = 0.16 * s; k.soft(i % 2 ? 'col:#4f7a3a' : 'col:#6b8f4e', x + Math.cos(a) * r - 0.13 * s, y + 0.28 * s, z + Math.sin(a) * r - 0.13 * s, x + Math.cos(a) * r + 0.13 * s, y + (0.5 + (i % 3) * 0.08) * s, z + Math.sin(a) * r + 0.13 * s, 0.08 * s); }
}
function texRug(k, w, d, key) { // rug with a printed pattern
  k.box(key, -w / 2, 0.003, -d / 2, w / 2, 0.03, d / 2);
}
function wallClock(k, y, r = 0.36) { // round kitchen clock, back at z = 0, z0 = offset from the wall
  const p = k.P(0, 0, 0), sub = new Kit(k.bat, k.tag).at(p.x, p.z, k.oy, k.rot + 90); // sub local x = -z
  disc(sub, -0.05, y, 0, r, 0.1, 'black', 24);
  disc(sub, -0.105, y, 0, r - 0.05, 0.01, 'col:#f4f1e8', 24);
  sub.box('black', -0.12, y - 0.01, -0.02, -0.11, y + 0.2, 0.02);
  sub.box('black', -0.12, y - 0.015, -0.02, -0.11, y + 0.015, 0.24);
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
  const d = 3.15, base = fab(o.color || '#dcd3c6'), cush = fab(o.cushion || o.color || '#e3dbcf'), arm = o.plinth ? 0.45 : 0.62;
  if (o.plinth) { // living room sofa (photos 8, 16): walnut rail base on short tapered legs, slim track arms
    k.soft(wood(o.plinth), -len / 2 - 0.02, 0.3, 0.03, len / 2 + 0.02, 0.5, d + 0.02, 0.04);
    for (const x of [-len / 2 + 0.15, len / 2 - 0.15]) for (const z of [0.15, d - 0.15]) taperLeg(k, wood(o.plinth), x, z, 0.32, 0.04, 0.06);
  } else for (const x of [-len / 2 + 0.3, len / 2 - 0.3]) for (const z of [0.3, d - 0.3]) taperLeg(k, DARKWOOD, x, z, 0.4, 0.05, 0.08);
  // 38" deep, 18" seat, 25" arms, 33" back
  k.soft(base, -len / 2, o.plinth ? 0.48 : 0.38, 0.05, len / 2, 1.08, d, o.plinth ? 0.06 : 0.12); // base
  k.soft(base, -len / 2 + 0.05, 0.9, 0, len / 2 - 0.05, 2.75, 0.85, 0.24);          // back frame
  k.soft(base, -len / 2, 0.9, 0.05, -len / 2 + arm, 2.08, d, 0.2);                  // track arms
  k.soft(base, len / 2 - arm, 0.9, 0.05, len / 2, 2.08, d, 0.2);
  const seats = len > 6.5 ? 3 : 2, sw = (len - 2 * arm) / seats;
  for (let i = 0; i < seats; i++) {
    const x = -len / 2 + arm + i * sw;
    k.soft(cush, x + 0.02, 1.0, 0.72, x + sw - 0.02, 1.5, d + 0.03, 0.16);         // seat cushion
    k.soft(cush, x + 0.04, 1.4, 0.6, x + sw - 0.04, 2.72, 1.25, 0.28);             // back cushion
  }
  const pc = o.pillows || ['#a77b6b', '#c9b49a', '#8d6e5d'];
  for (let i = 0; i < 2; i++) {
    const p = k.P((i ? 1 : -1) * (len / 2 - arm - 0.8), 0, 1.4);
    const sub = new Kit(k.bat, k.tag).at(p.x, p.z, k.oy, k.rot + (i ? -20 : 20));
    sub.soft(fab(pc[i % pc.length]), -0.66, 1.52, -0.17, 0.66, 2.8, 0.17, 0.22);
    if (pc.length > 2) { // a second, smaller pillow in front of the first
      const q = k.P((i ? 1 : -1) * (len / 2 - arm - 1.45), 0, 1.55), s2 = new Kit(k.bat, k.tag).at(q.x, q.z, k.oy, k.rot + (i ? 12 : -12));
      s2.soft(fab(pc[(i + 2) % pc.length]), -0.55, 1.52, -0.15, 0.55, 2.55, 0.15, 0.2);
    }
  }
  if (o.throw) { // knit throw draped over the left arm, spilling onto the seat and down the side
    const tx = -len / 2;
    k.soft(fab(o.throw), tx - 0.04, 1.75, 1.0, tx + arm + 0.08, 2.14, 2.3, 0.08);
    k.soft(fab(o.throw), tx - 0.07, 0.7, 1.05, tx + 0.02, 2.05, 2.25, 0.03);
    k.soft(fab(o.throw), tx + arm, 1.42, 1.0, tx + arm + 0.9, 1.58, 2.4, 0.06);
  }
  k.solid(-len / 2, 0, len / 2, d, 0, 2.85);
}

function armchair(k, o = {}) { // centered, faces +z
  const w = 2.7, d = 2.9, c = fab(o.color || '#ebe6dc');
  for (const x of [-w / 2 + 0.22, w / 2 - 0.22]) for (const z of [-d / 2 + 0.22, d / 2 - 0.22]) taperLeg(k, DARKWOOD, x, z, 0.5, 0.05, 0.08);
  k.soft(c, -w / 2, 0.48, -d / 2, w / 2, 1.1, d / 2, 0.12);
  k.soft(c, -w / 2 + 0.05, 1.0, -d / 2, w / 2 - 0.05, 2.85, -d / 2 + 0.6, 0.24);
  k.soft(c, -w / 2, 1.0, -d / 2, -w / 2 + 0.45, 2.1, d / 2, 0.2);
  k.soft(c, w / 2 - 0.45, 1.0, -d / 2, w / 2, 2.1, d / 2, 0.2);
  k.soft(c, -w / 2 + 0.43, 1.02, -d / 2 + 0.5, w / 2 - 0.43, 1.5, d / 2 + 0.02, 0.15); // 18" seat
  if (o.pillow) k.soft(fab(o.pillow), -0.6, 1.47, -d / 2 + 0.58, 0.6, 2.55, -d / 2 + 0.92, 0.2);
  if (o.throw) { // throw blanket folded over one arm
    k.soft(fab(o.throw), w / 2 - 0.55, 1.2, -d / 2 + 0.3, w / 2 + 0.04, 2.16, d / 2 - 0.5, 0.06);
    k.soft(fab(o.throw), -w / 2 + 0.45, 1.45, -d / 2 + 0.55, w / 2 - 0.45, 1.53, 0.2, 0.03);
  }
  k.solid(-w / 2, -d / 2, w / 2, d / 2, 0, 2.8);
}

// boxy "tuxedo" armchair (family room, photos 20-21): arms flush with the back, slim dark tapered legs,
// optional button-tufted inside back and a fringed plaid throw over the front. Centered, faces +z.
function tuxedoChair(k, o = {}) {
  const w = 2.55, d = 2.6, H = 2.45, c = fab(o.color || '#ebe7df'), aw = 0.38;
  for (const x of [-w / 2 + 0.2, w / 2 - 0.2]) for (const z of [-d / 2 + 0.2, d / 2 - 0.2]) taperLeg(k, wood('#2e2420'), x, z, 0.5, 0.035, 0.06);
  k.soft(c, -w / 2, 0.48, -d / 2, w / 2, 1.2, d / 2, 0.07);                         // deck
  k.soft(c, -w / 2, 0.48, -d / 2, -w / 2 + aw, H - 0.05, d / 2, 0.07);              // arms
  k.soft(c, w / 2 - aw, 0.48, -d / 2, w / 2, H - 0.05, d / 2, 0.07);
  k.soft(c, -w / 2 + 0.02, 0.48, -d / 2, w / 2 - 0.02, H, -d / 2 + 0.42, 0.07);     // back
  k.soft(c, -w / 2 + aw, 1.18, -d / 2 + 0.4, w / 2 - aw, 1.55, d / 2 + 0.02, 0.1);  // seat cushion
  if (o.tufted) for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) k.cyl('col:#cfc9bd', -0.42 + i * 0.42, -d / 2 + 0.43, 0.03, 0.03, 1.75 + j * 0.35, 1.78 + j * 0.35, 6);
  if (o.pillow) k.soft(fab(o.pillow), -0.58, 1.5, -d / 2 + 0.45, 0.58, 2.5, -d / 2 + 0.78, 0.2);
  if (o.pillow2) k.soft(fab(o.pillow2), -0.48, 1.5, -d / 2 + 0.8, 0.52, 2.3, -d / 2 + 1.08, 0.18);
  if (o.throw) { // buffalo-plaid throw over the seat front, hanging to the floor with a fringe
    const [base, band] = o.throw;
    k.soft(fab(base), -w / 2 + 0.3, 1.5, -d / 2 + 0.8, 0.5, 1.6, d / 2 + 0.08, 0.04);
    k.box(fab(base), -w / 2 + 0.3, 0.3, d / 2 + 0.06, 0.5, 1.6, d / 2 + 0.12);
    for (const y of [0.55, 1.05]) k.box(fab(band), -w / 2 + 0.3, y, d / 2 + 0.121, 0.5, y + 0.22, d / 2 + 0.125);
    for (const x of [-0.75, -0.2, 0.3]) k.box(fab(band), x, 0.3, d / 2 + 0.121, x + 0.14, 1.6, d / 2 + 0.126);
    for (let x = -w / 2 + 0.32; x < 0.5; x += 0.06) k.box(fab(base), x, 0.12, d / 2 + 0.08, x + 0.02, 0.3, d / 2 + 0.1);
  }
  k.solid(-w / 2, -d / 2, w / 2, d / 2, 0, H);
}
function coffeeTable(k, w = 4, d = 2, color = '#cbbba5') { // waterfall table, reeded (cord-wrapped) faces
  k.soft(wood(color), -w / 2, 1.28, -d / 2, w / 2, 1.44, d / 2, 0.05);
  k.soft(wood(color), -w / 2, 0, -d / 2, -w / 2 + 0.14, 1.32, d / 2, 0.04);
  k.soft(wood(color), w / 2 - 0.14, 0, -d / 2, w / 2, 1.32, d / 2, 0.04);
  const g = wood(shadeHex(color, 0.86));
  for (let y = 0.1; y < 1.38; y += 0.1) for (const sx of [-1, 1]) k.box(g, sx * w / 2 - 0.006, y, -d / 2 + 0.03, sx * w / 2 + 0.006, y + 0.02, d / 2 - 0.03);
  for (let x = -w / 2 + 0.1; x < w / 2 - 0.05; x += 0.1) for (const sz of [-1, 1]) k.box(g, x, 1.3, sz * d / 2 - 0.006, x + 0.02, 1.42, sz * d / 2 + 0.006);
  k.cyl('col:#e9e5dc', 0.3, 0, 0.22, 0.28, 1.44, 1.95, 12);
  k.cyl('col:#e9e5dc', 0.3, 0, 0.28, 0.12, 1.95, 2.35, 12);
  k.cyl('col:#cfc7b8', -0.9, 0.15, 0.45, 0.4, 1.44, 1.6, 16);
  k.solid(-w / 2, -d / 2, w / 2, d / 2, 0, 1.44);
}

function sideTable(k, s = 1.6, o = {}) {
  if (o.wire) { // chrome wire drum table with a glass top (living room, photo 15) and a ribbed white ceramic lamp
    const r = s / 2, h = 1.85;
    for (const y of [0.02, h * 0.5, h - 0.04]) for (let i = 0; i < 24; i++) { const a0 = (i / 24) * Math.PI * 2, a1 = ((i + 1) / 24) * Math.PI * 2; rod(k, 'chrome', [Math.cos(a0) * r, y, Math.sin(a0) * r], [Math.cos(a1) * r, y, Math.sin(a1) * r], 0.012); }
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, a2 = a + 0.6; rod(k, 'chrome', [Math.cos(a) * r, 0.02, Math.sin(a) * r], [Math.cos(a2) * r, h - 0.04, Math.sin(a2) * r], 0.01); rod(k, 'chrome', [Math.cos(a2) * r, 0.02, Math.sin(a2) * r], [Math.cos(a) * r, h - 0.04, Math.sin(a) * r], 0.01); }
    k.cyl('glass', 0, 0, r + 0.03, r + 0.03, h - 0.04, h, 24);
    k.cyl('col:#f1eee8', 0, 0, 0.2, 0.32, h, h + 0.25, 16); k.cyl('col:#f1eee8', 0, 0, 0.32, 0.26, h + 0.25, h + 0.75, 16); k.cyl('col:#f1eee8', 0, 0, 0.26, 0.1, h + 0.75, h + 0.95, 16);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; k.cyl('col:#e2ded6', Math.cos(a) * 0.31, Math.sin(a) * 0.31, 0.025, 0.025, h + 0.2, h + 0.75, 4); } // ribs
    k.cyl('brass', 0, 0, 0.03, 0.03, h + 0.95, h + 1.35, 6);
    k.cyl('shade', 0, 0, 0.6, 0.6, h + 1.15, h + 2.0, 20, 1, false);
    k.solid(-r, -r, r, r, 0, h);
    return;
  }
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
  // 18.5" W x 20" D, 18" seat, 34" back; splayed wood legs, curved wood back on two posts
  const w = 1.55, d = 1.65;
  for (const x of [-w / 2 + 0.12, w / 2 - 0.12]) for (const z of [-d / 2 + 0.12, d / 2 - 0.12]) taperLeg(k, wood(woodc), x, z, 1.3, 0.045, 0.065);
  k.box(wood(woodc), -w / 2 + 0.06, 1.18, -d / 2 + 0.08, w / 2 - 0.06, 1.3, d / 2 - 0.08);
  k.soft(fab(color), -w / 2, 1.28, -d / 2, w / 2, 1.5, d / 2, 0.09);
  for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) k.box(wood(woodc), x - 0.05, 1.45, -d / 2 + 0.02, x + 0.05, 2.75, -d / 2 + 0.14);
  k.soft(wood(woodc), -w / 2 + 0.02, 2.15, -d / 2 - 0.04, w / 2 - 0.02, 2.85, -d / 2 + 0.12, 0.06);
}
// white molded "tulip" side chair (nook), centered, faces +z
function tulipChair(k, color = '#f1f0ec') {
  const c = 'col:' + color;
  k.cyl(c, 0, 0, 0.62, 0.55, 0, 0.06, 18); k.cyl(c, 0, 0, 0.09, 0.09, 0.06, 1.25, 10);
  k.soft(c, -0.82, 1.22, -0.8, 0.82, 1.52, 0.82, 0.3);
  k.soft(c, -0.8, 1.4, -0.92, 0.8, 2.75, -0.55, 0.35);
  k.soft('fab:#e6e2da', -0.66, 1.48, -0.6, 0.66, 1.58, 0.7, 0.25);
  k.solid(-0.8, -0.9, 0.8, 0.8, 0, 2.75);
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
  const b = o.base ? wood(o.base) : top; // tulip pedestal: flared foot, slim stem, flared head
  k.cyl(b, 0, 0, 0.85, 0.82, 0, 0.06, 20); k.cyl(b, 0, 0, 0.82, 0.14, 0.06, 0.85, 20);
  k.cyl(b, 0, 0, 0.14, 0.14, 0.85, 2.15, 12); k.cyl(b, 0, 0, 0.14, 0.55, 2.15, 2.4, 16);
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
// Power rack, back against the wall at z = 0: 49" wide x 48" deep. A "short" 81" (6.75 ft) rack,
// since the basement drop ceiling is only 7'5" (a standard 90" rack would not fit).
function powerRack(k, H = 6.75) {
  for (const x of [-1.85, 1.85]) {
    for (const z of [0.35, 3.75]) {
      k.cbox(IRON, x, z, 0.25, 0.25, 0, H);
      for (let y = 1.0; y < H - 0.3; y += 0.18) k.cbox('col:#3a3a3d', x, z + 0.126, 0.07, 0.004, y, y + 0.06); // hole pattern
    }
    k.box(IRON, x - 0.13, 0, 0.1, x + 0.13, 0.25, 4.0);                 // foot
    k.box(IRON, x - 0.13, H - 0.25, 0.35, x + 0.13, H, 3.75);           // top side rail
    k.box('chrome', x - 0.08, 2.2, 0.5, x + 0.08, 2.35, 3.9);           // safety arm
    k.box(IRON, x - 0.1, 4.35, 3.75, x + 0.1, 4.45, 4.05);               // J-hook
    k.box(IRON, x - 0.1, 4.45, 3.95, x + 0.1, 4.62, 4.05);
  }
  k.box(IRON, -1.85, H - 0.25, 0.22, 1.85, H, 0.48);
  bar(k, -1.85, 1.85, H - 0.35, 3.85, 0.05, IRON);                          // pull-up bar
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
  k.solid(-2.6, 0, 2.6, 4.05, 0, H);
}
// Adjustable FID bench, centered: 52" long (z) x 25" wide feet, pads 11" wide, pad top 17.5" (flat)
function liftBench(k) {
  k.box(IRON, -0.12, 0, -2.1, 0.12, 0.2, 2.1);
  k.soft(IRON, -1.0, 0, -2.15, 1.0, 0.16, -1.85, 0.05); k.soft(IRON, -1.0, 0, 1.85, 1.0, 0.16, 2.15, 0.05);
  k.box(IRON, -0.1, 0.2, -1.6, 0.1, 1.12, -1.4); k.box(IRON, -0.1, 0.2, 1.4, 0.1, 1.12, 1.6);
  k.box(IRON, -0.15, 1.08, -1.9, 0.15, 1.2, 1.9);
  k.soft('col:#151515', -0.46, 1.18, -1.95, 0.46, 1.46, -0.88, 0.07);  // seat pad
  k.soft('col:#151515', -0.46, 1.18, -0.8, 0.46, 1.46, 1.95, 0.07);    // back pad
  k.cyl(IRON, 0, 2.05, 0.12, 0.12, 0.05, 0.2, 10);                       // transport wheel / handle end
  k.solid(-1.0, -2.15, 1.0, 2.15, 0, 1.46);
}
function dumbbellRack(k, len = 5.5) { // back at z = 0; two angled tiers of hex dumbbells, 5-50 lb
  for (const x of [-len / 2 + 0.1, 0, len / 2 - 0.1]) {
    k.box(IRON, x - 0.08, 0, 0.1, x + 0.08, 0.15, 1.9);
    k.prof(IRON, [[0.3, 0.15], [0.5, 0.15], [0.5, 2.7], [0.3, 2.7]], x - 0.08, x + 0.08);
    k.prof(IRON, [[1.5, 0.15], [1.7, 0.15], [1.7, 1.75], [1.5, 1.75]], x - 0.08, x + 0.08);
  }
  for (const [y, z] of [[2.6, 0.4], [1.65, 1.6]]) k.box(IRON, -len / 2, y, z - 0.35, len / 2, y + 0.1, z + 0.35);
  const n = Math.min(5, Math.max(3, Math.floor(len / 1.1))); // pairs per tier
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
// Peloton Bike: 59" L x 23" W x 53" H, 135 lb. Centered; the rider sits at -z facing +z, the
// flywheel is at the front (+z) and the 21.5" touchscreen sits on a post above the handlebars,
// its display facing back toward the rider.
function pelotonBike(k) {
  const L = 2.46, W = 0.96;                                                              // half length / half width
  k.soft(IRON, -W, 0, L - 0.32, W, 0.2, L, 0.06);                                        // front stabilizer
  k.soft(IRON, -W, 0, -L, W, 0.2, -L + 0.32, 0.06);                                      // rear stabilizer
  for (const s of [-1, 1]) for (const z of [L - 0.16, -L + 0.16]) k.cyl('blackMatte', s * (W - 0.1), z, 0.08, 0.08, -0.001, 0.04, 8);
  // main frame: one swept beam from the rear foot up to the steering head at the front
  k.prof(IRON, [[-L + 0.15, 0.18], [-L + 0.75, 0.18], [-0.2, 1.05], [1.05, 2.3], [1.32, 2.72], [1.0, 2.82], [0.62, 2.35], [-0.5, 1.45], [-L + 0.15, 0.55]], -0.12, 0.12);
  // front leg from the steering head down to the front stabilizer, behind the flywheel
  k.prof(IRON, [[1.62, 0.18], [L - 0.12, 0.18], [1.52, 1.6], [1.25, 1.6]], -0.1, 0.1);
  disc(k, 0, 1.0, 1.42, 0.66, 0.16, 'col:#2b2b2d');                                     // flywheel, at the front
  disc(k, 0, 1.0, 1.42, 0.2, 0.22, 'steel');
  k.prof('col:#3a3a3c', [[0.95, 0.55], [1.45, 0.35], [2.1, 0.8], [2.1, 1.25], [1.5, 1.55]], -0.13, 0.13); // flywheel guard
  // seat post (angled back) and saddle, ~38" saddle height
  k.prof(IRON, [[-0.62, 1.2], [-0.42, 1.2], [-0.98, 3.0], [-1.18, 3.0]], -0.07, 0.07);
  k.prof(IRON, [[-1.35, 2.98], [-0.9, 2.98], [-0.9, 3.06], [-1.35, 3.06]], -0.06, 0.06); // seat rail
  k.soft('col:#141414', -0.32, 3.04, -1.55, 0.32, 3.24, -0.95, 0.07);                  // saddle (rear, wide)
  k.soft('col:#141414', -0.13, 3.06, -1.05, 0.13, 3.2, -0.5, 0.05);                    // saddle nose
  // handlebar post, bars (~20" wide, ~44" high) and resistance knob
  k.prof(IRON, [[1.0, 2.7], [1.2, 2.7], [0.98, 3.62], [0.8, 3.62]], -0.07, 0.07);
  for (const s of [-1, 1]) {
    k.box(IRON, s * 0.82 - 0.05, 3.56, 0.35, s * 0.82 + 0.05, 3.66, 1.0);                 // side grips
    k.box('blackMatte', s * 0.82 - 0.06, 3.55, 0.2, s * 0.82 + 0.06, 3.67, 0.55);
  }
  k.box(IRON, -0.82, 3.56, 0.9, 0.82, 3.66, 1.0);                                        // crossbar
  k.cyl('col:#b02a2a', 0, 1.02, 0.07, 0.06, 2.75, 2.85, 10);                             // red resistance knob
  // 21.5" touchscreen (19" x 11") on a short post, display toward the rider
  k.box(IRON, -0.05, 3.62, 0.95, 0.05, 3.85, 1.05);
  const sk = new Kit(k.bat, k.tag); const sp = k.P(0, 0, 0.98); sk.at(sp.x, sp.z, k.oy, k.rot);
  sk.box('black', -0.8, 3.75, -0.05, 0.8, 4.42, 0.05);
  sk.box('col:#1a2735', -0.74, 3.8, -0.055, 0.74, 4.37, -0.05);
  // cranks and pedals (with Delta cleats)
  for (const s of [-1, 1]) { // crank arms 180 degrees apart, pedals at their ends
    const [za, zb] = s > 0 ? [0.28, 0.82] : [-0.26, 0.28];
    k.box(IRON, Math.min(s * 0.16, s * 0.21), 0.9, za, Math.max(s * 0.16, s * 0.21), 1.0, zb);
    const zp = s > 0 ? 0.72 : -0.16;
    k.box('blackMatte', Math.min(s * 0.21, s * 0.55), 0.89, zp - 0.15, Math.max(s * 0.21, s * 0.55), 0.99, zp + 0.15);
  }
  disc(k, 0, 0.95, 0.28, 0.2, 0.3, IRON, 14);                                            // crank housing
  k.solid(-W, -L, W, L, 0, 4.42);
}
function bodyPumpArea(k) { // centered: mat, step with risers, BodyPump bar with color plates, plate rack
  k.box('col:#3a3d40', -3.2, 0.045, -2.0, 3.2, 0.09, 2.0);
  // aerobic step, 43" x 16", on two risers (8" high)
  for (const sx of [-1.2, 1.2]) k.box('col:#3d3f42', sx - 0.5, 0.09, -1.85, sx + 0.5, 0.5, -0.57);
  k.soft('col:#7b8287', -1.8, 0.5, -1.9, 1.8, 0.67, -0.55, 0.05);
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
  k.solid(-1.8, -1.9, 1.8, -0.55, 0, 0.67);
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
  const w = inches * 0.0727, h = inches * 0.0409, y0 = 3.0;
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
  // 19" seat, 44" back, arms at 26"
  k.cyl('chrome', 0, 0, 0.08, 0.08, 0.28, 1.3, 8);
  k.soft('col:#2b2b2b', -0.85, 1.27, -0.8, 0.85, 1.6, 0.85, 0.14);
  k.soft('col:#2b2b2b', -0.8, 1.75, -0.98, 0.8, 3.65, -0.72, 0.16);
  k.box('black', -0.08, 1.45, -0.9, 0.08, 1.85, -0.75);
  for (const s of [-1, 1]) { k.box('black', s * 0.85 - 0.06, 1.55, -0.4, s * 0.85 + 0.06, 2.12, -0.3); k.box('black', s * 0.85 - 0.12, 2.12, -0.5, s * 0.85 + 0.12, 2.2, 0.35); }
  k.solid(-1, -1, 1, 1, 0, 3.65);
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
    // each garment hangs slightly turned on its hanger, with soft (rounded) shoulders and body
    const p = k.P(x, 0, zc), g = new Kit(k.bat, k.tag).at(p.x, p.z, k.oy, k.rot + (rnd() - 0.5) * 16);
    rod(g, 'col:#c9a36b', [0, top - 0.02, -0.66], [0, top + 0.2, 0], 0.02); rod(g, 'col:#c9a36b', [0, top + 0.2, 0], [0, top - 0.02, 0.66], 0.02); // hanger
    g.box('chrome', -0.01, top + 0.2, -0.02, 0.01, rodY + 0.08, 0.02);
    const t2 = th / 2;
    if (kind === 'pants') { // folded over the hanger bar
      g.soft(c, -t2 - 0.03, top - 1.25, -0.6, t2 + 0.03, top + 0.02, 0.6, 0.05);
    } else {
      const L = kind === 'shirt' ? 2.35 + rnd() * 0.25 : kind === 'coat' ? 3.2 + rnd() * 0.5 : 3.4 + rnd() * 0.9, sh = kind === 'coat' ? 0.8 : 0.72;
      g.soft(c, -t2, top - 0.55, -sh, t2, top + 0.05, sh, 0.16);                                   // shoulders
      if (kind === 'dress') { g.soft(c, -t2 * 0.8, top - 1.3, -0.45, t2 * 0.8, top - 0.3, 0.45, 0.1); g.soft(c, -t2 * 0.9, top - L, -0.85, t2 * 0.9, top - 1.15, 0.85, 0.12); }
      else g.soft(c, -t2, top - L, -sh + 0.04, t2, top - 0.3, sh - 0.04, 0.08);                    // body
      if (kind === 'coat') g.box('col:#1e1e1e', t2 - 0.005, top - L * 0.8, -0.03, t2 + 0.01, top - 0.4, 0.03); // placket
    }
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
    // real size: ~31" W x 35" D x 38" H, seat front ~14", arms ~23" (was 44" tall with a 17" seat)
    k.prof(c, [[1.25, 0], [1.25, 1.85], [1.05, 1.85], [1.05, 0]], s * 1.05 - 0.08, s * 1.05 + 0.08);   // front legs up to the arms
    k.prof(c, [[-1.3, 0], [-1.0, 0], [1.2, 0.98], [1.2, 1.12]], s * 1.05 - 0.06, s * 1.05 + 0.06);     // side stringer
    k.box(c, s * 1.05 - 0.25, 1.85, -0.75, s * 1.05 + 0.25, 1.95, 1.45);                              // arm
  }
  k.prof(c, [[1.15, 1.06], [1.15, 1.18], [-0.6, 0.72], [-0.6, 0.6]], -0.95, 0.95);                    // seat
  for (let i = 0; i < 5; i++) { const x = -0.8 + i * 0.4; k.prof(c, [[-0.55, 0.62], [-0.35, 0.68], [-1.25, 2.82 + (2 - Math.abs(i - 2)) * 0.18], [-1.45, 2.72 + (2 - Math.abs(i - 2)) * 0.18]], x - 0.16, x + 0.16); }
  k.solid(-1.3, -1.3, 1.3, 1.45, 0, 3.2);
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
    const span = o.span || 2.35; // blade tip radius (2.35 = 56" fan)
    kb.box(o.body || 'col:#6c6c6a', 0.3, y + 0.14, -0.06, 0.62, y + 0.18, 0.06);       // blade iron
    kb.soft(o.blade || wood('#6e4b32'), 0.5, y + 0.1, -0.25, span, y + 0.145, 0.25, 0.02);
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
function sconce(k, y) { // brass candle sconce (photo 20): oval backplate, curved arm, bobeche, candle sleeve, flame bulb
  k.soft('brass', -0.11, y - 0.55, 0, 0.11, y + 0.05, 0.05, 0.06);
  const pts = [[0, y - 0.38, 0.04], [0, y - 0.45, 0.15], [0, y - 0.42, 0.27], [0, y - 0.33, 0.35], [0, y - 0.2, 0.38]];
  for (let i = 0; i < pts.length - 1; i++) rod(k, 'brass', pts[i], pts[i + 1], 0.018);
  k.cyl('brass', 0, 0.38, 0.03, 0.1, y - 0.22, y - 0.17, 10); k.cyl('brass', 0, 0.38, 0.1, 0.1, y - 0.17, y - 0.15, 10);
  k.cyl('col:#f3eee2', 0, 0.38, 0.045, 0.045, y - 0.15, y + 0.12, 8);
  k.cyl('bulb', 0, 0.38, 0.03, 0.005, y + 0.12, y + 0.26, 8);
}
function lightBar(k, w, y, n, finish = 'brass', globes = false) { // vanity light, back at z = 0
  if (globes) { // "Hollywood" strip: a long brass plate with round globe bulbs (primary bath, photo 39)
    k.soft(finish, -w / 2, y - 0.12, 0, w / 2, y + 0.12, 0.12, 0.04);
    for (let i = 0; i < n; i++) { const x = -w / 2 + (w / n) * (i + 0.5); k.cyl(finish, x, 0.16, 0.05, 0.05, y - 0.04, y + 0.04, 8); k.soft('shade', x - 0.21, y - 0.21, 0.14, x + 0.21, y + 0.21, 0.56, 0.21); }
    return;
  }
  k.box(finish, -w / 2, y - 0.1, 0, w / 2, y + 0.1, 0.18);
  for (let i = 0; i < n; i++) { const x = -w / 2 + (w / n) * (i + 0.5); k.box(finish, x - 0.03, y - 0.03, 0.18, x + 0.03, y + 0.03, 0.35); k.cyl('shade', x, 0.38, 0.1, 0.24, y + 0.02, y + 0.42, 12); } // tulip shades, opening up
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
function counter(k, x0, x1, o = {}) { // solid-surface top with a rounded (bullnose) front edge
  k.box('counter', x0, 2.92, 0, x1, 3.05, 2.0);
  k.soft('counter', x0, 2.92, 1.9, x1, 3.05, 2.1, 0.06);
  if (o.splash) {
    for (const [a, b, top] of o.splash) {
      k.box('backsplash', a, 3.05, 0, b, top - 0.18, 0.04);
      k.box('splashTrim', a, top - 0.18, 0, b, top, 0.05); // decorative border
    }
  }
}
function range(k, x0, x1) { // 30" stainless gas range (photo 26): 5 burners under cast-iron grates, front knobs,
  // black glass oven window, bar handle, storage drawer; black over-the-range microwave above
  const d = 2.15, xc = (x0 + x1) / 2;
  k.box('steel', x0, 0.08, 0, x1, 2.95, d - 0.02);
  k.box('blackMatte', x0 + 0.05, 0, 0, x1 - 0.05, 0.08, d - 0.15);                                   // toe
  k.box('black', x0, 2.95, 0, x1, 3.0, d);                                                             // cooktop
  k.box('black', x0, 3.0, 0, x1, 3.18, 0.22);                                                          // low backguard
  k.box('steel', x0 + 0.06, 0.62, d - 0.02, x1 - 0.06, 2.3, d + 0.03);                                 // oven door
  k.box('col:#121212', x0 + 0.3, 0.95, d + 0.03, x1 - 0.3, 2.0, d + 0.035);                           // window
  rod(k, 'chrome', [x0 + 0.3, 2.18, d + 0.17], [x1 - 0.3, 2.18, d + 0.17], 0.03);                     // bar handle
  for (const x of [x0 + 0.33, x1 - 0.33]) rod(k, 'chrome', [x, 2.18, d + 0.03], [x, 2.18, d + 0.17], 0.025);
  k.box('steel', x0 + 0.06, 0.14, d - 0.02, x1 - 0.06, 0.58, d + 0.03);                                // drawer
  k.box('col:#9da1a3', x0 + 0.06, 0.58, d + 0.02, x1 - 0.06, 0.62, d + 0.03);
  k.box('col:#2a2a2b', x0 + 0.06, 2.35, d - 0.1, x1 - 0.06, 2.92, d + 0.01);                          // control strip
  for (let i = 0; i < 5; i++) { const x = x0 + 0.38 + i * ((x1 - x0 - 0.76) / 4); disc(new Kit(k.bat, k.tag).at(...(() => { const p = k.P(x, 0, d + 0.06); return [p.x, p.z]; })(), k.oy, k.rot - 90), 0, 2.64, 0, 0.09, 0.1, 'steel', 12); }
  const g = 'col:#151516';
  for (const [a, b] of [[x0 + 0.05, xc - 0.02], [xc + 0.02, x1 - 0.05]]) { // two continuous grates
    for (const z of [0.3, 1.05, 1.8]) k.box(g, a, 3.08, z - 0.03, b, 3.13, z + 0.03);
    for (const x of [a, (a + b) / 2, b - 0.06]) k.box(g, x, 3.08, 0.27, x + 0.06, 3.13, 1.83);
    for (const z of [0.68, 1.43]) for (const x of [(a * 3 + b) / 4, (a + b * 3) / 4]) k.box(g, x - 0.02, 3.0, z - 0.02, x + 0.02, 3.13, z + 0.02);
  }
  for (const [x, z, r] of [[x0 + 0.62, 0.68, 0.16], [x1 - 0.62, 0.68, 0.13], [x0 + 0.62, 1.43, 0.13], [x1 - 0.62, 1.43, 0.16], [xc, 1.05, 0.2]]) {
    k.cyl('col:#2c2c2e', x, z, r, r, 3.0, 3.05, 14); k.cyl('col:#111', x, z, r * 0.6, r * 0.6, 3.05, 3.07, 12);
  }
  k.solid(x0, 0, x1, d, 0, 3);
  // over-the-range microwave + short upper
  k.box('black', x0, 5.2, 0, x1, 6.6, 1.3);
  k.box('col:#202020', x0 + 0.1, 5.32, 1.3, x1 - 0.75, 6.48, 1.32);                                  // door glass
  k.box('col:#2f2f30', x1 - 0.68, 5.32, 1.3, x1 - 0.08, 6.48, 1.32);                                 // keypad
  rod(k, 'col:#3a3a3b', [x1 - 0.82, 5.45, 1.38], [x1 - 0.82, 6.35, 1.38], 0.03);                      // handle
  for (let i = 0; i < 6; i++) k.box('col:#151515', x0 + 0.2 + i * 0.3, 5.19, 1.0, x0 + 0.35 + i * 0.3, 5.2, 1.2); // vent slots
  upperCab(k, x0, x1, { y0: 6.62 });
  return xc;
}
function fridge(k, x0, x1) {
  const d = 2.75, h = 5.85, xm = (x0 + x1) / 2 - 0.15; // 36" side-by-side, 33" deep (standard depth), 70" tall
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
    // plaid box valance inside the window head, round clock above it, a few things on the counter (photos 26-28)
    { const s2 = new Kit(bat, tag); const p = k.P(3.92, 0, 0); s2.at(p.x, p.z, 0, k.rot); valance(s2, 3.4, 6.15, 6.88, 'curtain', { depth: 0.14 }); wallClock(s2, 7.42, 0.27); }
    k.cyl('col:#f4f1ea', 1.2, 1.3, 0.38, 0.25, 3.05, 3.3, 14); // fruit bowl
    for (const [ax, az] of [[1.08, 1.22], [1.3, 1.35], [1.18, 1.45]]) k.cyl('col:#a3161c', ax, az, 0.12, 0.12, 3.22, 3.42, 8);
    potPlant(k, 6.3, 1.4, 3.05);
    k.cyl('col:#f1eee6', 7.6, 1.0, 0.45, 0.3, 3.05, 3.3, 16); // white serving bowl
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
function toilet(k) { // back at z = 0: two-piece elongated toilet (photos 30, 39, 42)
  k.soft('porcelain', -0.8, 1.35, 0.05, 0.8, 2.52, 0.68, 0.08);                     // tank
  k.soft('porcelain', -0.86, 2.5, 0.0, 0.86, 2.64, 0.74, 0.05);                     // tank lid
  k.cyl('chrome', -0.62, 0.6, 0.05, 0.05, 2.3, 2.38, 8); k.box('chrome', -0.62, 2.31, 0.6, -0.45, 2.35, 0.66); // trip lever
  k.cyl('porcelain', 0, 0.95, 0.3, 0.36, 0, 0.12, 16, 1.6);                         // foot
  k.cyl('porcelain', 0, 0.98, 0.3, 0.42, 0.12, 0.95, 16, 1.55);                     // trapway / pedestal
  k.cyl('porcelain', 0, 1.18, 0.5, 0.66, 0.95, 1.3, 20, 1.35);                       // bowl
  k.cyl('col:#e9e6de', 0, 1.18, 0.5, 0.5, 1.299, 1.302, 20, 1.3);                   // water
  k.cyl('porcelain', 0, 1.2, 0.68, 0.68, 1.31, 1.38, 22, 1.35);                     // seat
  k.cyl('porcelain', 0, 1.18, 0.48, 0.48, 1.305, 1.385, 20, 1.3, false);
  k.soft('porcelain', -0.7, 1.38, 0.38, 0.7, 1.46, 0.72, 0.04);                     // seat hinge block / raised lid edge
  for (const x of [-0.42, 0.42]) k.cyl('porcelain', x, 1.3, 0.05, 0.05, 0.02, 0.07, 6); // bolt caps
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
function pedestalSink(k) { // oval pedestal lavatory with a flared column and a widespread brass faucet (photo 30)
  k.cyl('porcelain', 0, 0.7, 0.3, 0.36, 0, 0.12, 14, 0.85);                         // foot
  k.cyl('porcelain', 0, 0.7, 0.24, 0.2, 0.12, 1.6, 14, 0.85);                        // column
  k.cyl('porcelain', 0, 0.72, 0.2, 0.5, 1.6, 2.45, 16, 0.85);                        // flared top of the column
  k.cyl('porcelain', 0, 0.85, 0.62, 1.0, 2.45, 2.78, 22, 0.78);                       // basin underside
  k.cyl('porcelain', 0, 0.85, 1.0, 1.0, 2.78, 2.86, 22, 0.78);                        // rim
  k.cyl('col:#dcd6ca', 0, 0.92, 0.58, 0.58, 2.861, 2.866, 20, 0.72);
  k.box('porcelain', -0.6, 2.78, 0.02, 0.6, 2.95, 0.4);                               // faucet deck
  k.cyl('brass', 0, 0.25, 0.05, 0.04, 2.95, 3.25, 10); k.box('brass', -0.03, 3.18, 0.25, 0.03, 3.24, 0.62); // spout
  for (const x of [-0.38, 0.38]) { k.cyl('brass', x, 0.22, 0.06, 0.05, 2.95, 3.06, 10); k.box('brass', x - 0.12, 3.06, 0.2, x + 0.12, 3.1, 0.25); } // cross handles
  k.box('wood:#7c2a1e', -0.9, 3.6, 0, 0.9, 5.7, 0.08); k.box('wood:#9a3a28', -0.84, 3.66, 0.08, 0.84, 5.64, 0.1); k.box('mirror', -0.72, 3.78, 0.1, 0.72, 5.52, 0.11);
  k.solid(-0.9, 0, 0.9, 1.7, 0, 2.85);
}
// top-load washer + matching dryer (as in the laundry photo): each 27.5" W x 28" D, 36" top, 43" console
function washerDryer(k) { // pair side by side, back at z = 0
  for (const [x, washer] of [[-1.2, false], [1.2, true]]) {
    k.soft('porcelain', x - 1.14, 0.05, 0.1, x + 1.14, 3.0, 2.45, 0.05);
    k.box('blackMatte', x - 1.05, 0, 0.2, x + 1.05, 0.06, 2.3);
    k.soft('porcelain', x - 1.14, 2.95, 0.1, x + 1.14, 3.6, 0.6, 0.06);                  // control console
    k.box('col:#c9ccd0', x - 0.8, 3.15, 0.6, x + 0.8, 3.45, 0.61);
    for (let i = 0; i < 3; i++) k.cyl('col:#9aa0a6', x - 0.55 + i * 0.55, 0.62, 0.09, 0.09, 3.2, 3.38, 10);
    if (washer) { k.box('col:#f2f2ef', x - 0.95, 3.0, 0.75, x + 0.95, 3.03, 2.3); k.box('col:#c9ccd0', x - 0.3, 3.03, 2.15, x + 0.3, 3.05, 2.28); } // lid
    else { k.box('col:#e2e4e6', x - 0.95, 1.2, 2.45, x + 0.95, 2.75, 2.48); k.box('col:#b8bcc0', x - 0.4, 2.55, 2.48, x + 0.4, 2.62, 2.55); } // dryer door
  }
  k.solid(-2.35, 0, 2.35, 2.45, 0, 3.6);
}
function laundrySink(k) {
  k.box('col:#e7e2d4', -1.0, 0, 0.1, 1.0, 3.0, 1.9);
  k.box('chrome', -1.02, 2.95, 0.08, 1.02, 3.02, 1.92);
  k.cyl('chrome', 0, 0.3, 0.05, 0.05, 3.0, 3.8, 8);
  k.solid(-1, 0, 1, 1.9, 0, 3);
}
function fireplace(k) { // back at z = 0. Photo 20: 7'2" oak mantel, shelf 5'5" up, fluted pilasters on plinths,
  // corner blocks and a paneled frieze under a crowned shelf; red brick surround; black glass-door firebox
  // with a brass band; raised brick hearth running past the pilasters
  k.box('fpBrick', -2.5, 0.55, 0, 2.5, 4.1, 0.3);                                     // brick surround
  k.box('black', -1.75, 0.6, 0.3, 1.75, 3.2, 0.34);                                   // firebox frame
  for (const [x0, x1] of [[-1.62, -0.04], [0.04, 1.62]]) k.box('col:#1c1a19', x0, 0.75, 0.34, x1, 2.88, 0.36); // smoked glass doors
  k.box('brass', -1.75, 2.92, 0.34, 1.75, 3.2, 0.38);                                 // brass top band
  for (const x of [-0.12, 0.12]) k.box('brass', x - 0.025, 1.55, 0.36, x + 0.025, 2.15, 0.42); // door pulls
  k.box('black', -1.75, 0.6, 0.34, 1.75, 0.75, 0.38);                                 // vent grille
  for (const s of [-1, 1]) {
    const cx = s * 3.12;
    k.box('mantel', cx - 0.48, 0, 0, cx + 0.48, 0.62, 0.62);                          // plinth block
    k.box('mantel', cx - 0.42, 0.62, 0, cx + 0.42, 4.1, 0.5);                         // pilaster
    for (let i = 0; i < 4; i++) { const x = cx - 0.3 + i * 0.2; k.box('mantelPanel', x - 0.06, 0.75, 0.5, x + 0.06, 3.95, 0.55); } // reeds (flutes between)
    k.box('mantel', cx - 0.48, 4.1, 0, cx + 0.48, 5.1, 0.6);                          // corner block
    k.box('mantelPanel', cx - 0.3, 4.3, 0.6, cx + 0.3, 4.9, 0.64);
  }
  k.box('mantel', -2.64, 4.1, 0, 2.64, 5.1, 0.5);                                     // frieze
  k.box('mantelPanel', -2.4, 4.3, 0.5, 2.4, 4.9, 0.55); k.box('mantel', -2.3, 4.4, 0.55, 2.3, 4.8, 0.57);
  k.box('mantel', -2.64, 4.02, 0, 2.64, 4.1, 0.56);                                   // bead under the frieze
  k.box('mantel', -3.65, 5.1, 0, 3.65, 5.18, 0.68); k.box('mantel', -3.72, 5.18, 0, 3.72, 5.26, 0.78); // crown steps
  k.soft('mantel', -3.82, 5.24, 0, 3.82, 5.42, 0.95, 0.03);                          // shelf, eased edge
  k.box('fpBrick', -3.9, 0, 0, 3.9, 0.48, 1.9);                                       // raised hearth
  k.box('fpBrick', -3.95, 0.48, 0, 3.95, 0.56, 1.96);                                 // hearth cap course
  // on the shelf: two glass candle holders and a pillar candle (photo 20)
  for (const [x, h] of [[-2.9, 0.55], [-2.55, 0.42]]) { k.cyl('glass', x, 0.5, 0.17, 0.17, 5.42, 5.42 + h, 12); k.cyl('col:#f4f0e6', x, 0.5, 0.12, 0.12, 5.42, 5.42 + h * 0.6, 12); }
  k.cyl('col:#f4f0e6', -2.15, 0.45, 0.13, 0.13, 5.42, 5.95, 12);
  k.solid(-3.95, 0, 3.95, 1.96, 0, 5.42);
}
function wicRun(k, len) { // closet shelf + rod along a wall, back at z = 0 (photo 47: oak shelf and dowel on steel brackets)
  k.box('oakLight', 0, 5.6, 0, len, 5.67, 1.15); k.box('oakLight', 0, 5.5, 0, len, 5.6, 0.06); // shelf + cleat
  rod(k, 'oakLight', [0.02, 5.34, 0.9], [len - 0.02, 5.34, 0.9], 0.045);
  for (let x = 0.25; x < len; x += 3.2) {
    k.box('col:#8d9092', x, 4.95, 0, x + 0.05, 5.6, 0.06);                                        // upright
    k.box('col:#8d9092', x, 5.55, 0.06, x + 0.05, 5.6, 1.0);                                      // arm under the shelf
    rod(k, 'col:#8d9092', [x + 0.025, 5.0, 0.05], [x + 0.025, 5.56, 0.75], 0.018);                // diagonal brace
    rod(k, 'col:#8d9092', [x + 0.025, 5.56, 0.9], [x + 0.025, 5.3, 0.9], 0.02);                   // rod hook
  }
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
  { // photo 30: red-stained wall cabinet with an open shelf over the toilet, towel ring, paper holder, brass switch plate
    const c = at('f1', 717.1, 432, 90), red = wood('#7c2a1e');
    c.box(red, -0.9, 4.75, 0, 0.9, 6.75, 0.62);
    raisedPanel(c, -0.85, 0.05, 4.82, 6.68, 0.62, red, wood('#8a3324')); knob(c, -0.05, 5.6, 0.71);
    c.box(wood('#5e1f16'), 0.12, 4.82, 0.05, 0.85, 6.68, 0.58);
    for (const y of [5.35, 6.0]) c.box(red, 0.1, y, 0.03, 0.88, y + 0.05, 0.6);
    c.box('col:#efe9dc', 0.25, 5.4, 0.15, 0.7, 5.75, 0.5); // folded towels
    const r = at('f1', 717.1, 474, 90); r.box('brass', -0.05, 4.25, 0, 0.05, 4.45, 0.12); r.cyl('brass', 0, 0.2, 0.25, 0.25, 4.0, 4.04, 14, 1, false);
    r.box('fab:#a8665c', -0.18, 3.35, 0.15, 0.18, 4.1, 0.25);
    const t = at('f1', 790, 398.4, 0); for (const s of [-1, 1]) t.box('brass', s * 0.25 - 0.03, 2.0, 0, s * 0.25 + 0.03, 2.12, 0.32);
    disc(t, 0, 2.05, 0.28, 0.19, 0.42, 'col:#f6f4ef', 14);
    switchPlate(at('f1', 838.4, 560, -90), 4.0, 2, true);
    floorRegister(at('f1', 800, 560, 0), 0.9, 0.35);
  }
  // ---- laundry: dryer, washer, sink on the right wall (face at x 708.9)
  washerDryer(at('f1', 708.9, 462, -90));
  laundrySink(at('f1', 708.9, 552, -90));
  { const k = at('f1', 708.9, 397, -90); upperCab(k, 0, 6.5); }
  { const k = at('f1', 528.6, 470, 90); k.box(OAKCAB, -2.1, 0.33, 0, 2.1, 2.92, 1.5); k.box('counter', -2.15, 2.92, 0, 2.15, 3.05, 1.6); k.solid(-2.1, 0, 2.1, 1.6, 0, 3.05); }
  { const k = at('f1', 620, 480, 0); k.cbox('white', 0, 0, 2.2, 2.2, 7.9, 8.0); k.cbox('recessed', 0, 0, 1.9, 1.9, 7.88, 7.9); }
  // ---- family room fireplace + sconces
  fireplace(at('f1', 1697.6, 462, -90));
  sconce(at('f1', 1697.6, 345, -90), 6.3);
  sconce(at('f1', 1697.6, 579, -90), 6.3);
  // oak column at the end of the nook rail
  { const [cx, cz] = P('f1', 1312, 368); const k = new Kit(bats.f1, 'f1').at(cx, cz, 0); k.cbox('trim', 0, 0, 0.55, 0.55, 0, 8); k.cbox('trim', 0, 0, 0.75, 0.75, 7.55, 8); k.cbox('trim', 0, 0, 0.7, 0.7, 0, 0.5); }
  // ---- lights, 1st floor
  chandelier(at('f1', 988, 866), 8, 2.0); // office now: hung higher (bottom at 6 ft) since there's no table under it
  sconce(at('f1', 845.1, 770, 90), 5.7); sconce(at('f1', 845.1, 962, 90), 5.7);
  { const [lx, lz] = P('f1', 1185, 335); globePendant(new Kit(renoBat('off:bump', 'f1'), 'off:bump').at(lx, lz, 0), 8, 2.3); } // replaced by the bump-out's pendants
  for (const [x, y] of [[905, 440], [995, 440], [905, 560], [995, 600], [1110, 600], [1230, 470]]) recessed(at('f1', x, y), 8);
  flushDome(at('f1', 1450, 440), 8); flushDome(at('f1', 1590, 440), 8);
  flushDome(at('f1', 600, 615), 8); flushDome(at('f1', 760, 615), 8);
  // (the living room has no ceiling fixture in the photos: lamps only)
  lantern(at('f1', 1268, 885), 17, 6.2);
  { // sun room: oak ridge beam + white fan
    const [x0] = P('f1', 1420.5, 0), [x1, z1] = P('f1', 1703.5, 310.5), [, z0] = P('f1', 0, 49.5);
    const xc = (x0 + x1) / 2, ridge = 9 + ((x1 - x0) / 2) * (10 / 12) - 0.55;
    const k = new Kit(bats.f1, 'f1');
    k.box('trim', xc - 0.3, ridge - 0.8, z0, xc + 0.3, ridge, z1);
    ceilingFan(new Kit(bats.f1, 'f1').at(xc, (z0 + z1) / 2 - 1.5, 0), ridge - 0.8, { body: 'white', blade: 'white', drop: 1.6 });
  }
  { // sun room (photos 22-23): oak display shelf on scrolled brackets along the north wall, white
    // roller-shade cassettes over the big window and the patio slider
    const s = at('f1', 1697.6, 200, -90);
    s.box('trim', -4.0, 6.05, 0, 4.0, 6.13, 0.8); s.box('trim', -4.0, 5.95, 0, 4.0, 6.05, 0.08);
    for (const x of [-3.6, 0, 3.6]) s.prof('trim', [[0, 5.2], [0.08, 5.2], [0.72, 6.0], [0.72, 6.05], [0, 6.05]], x - 0.05, x + 0.05);
    const [wx] = P('f1', 1577, 0);
    rollerShade(new Kit(renoBat('off:sunext', 'f1'), 'off:sunext').at(wx, P('f1', 0, 55.4)[1], 0, 0), 8.6, 7.6);
    const [sx, sz] = P('f1', 1426.4, 184.5);
    rollerShade(new Kit(renoBat('off:bump', 'f1'), 'off:bump').at(sx, sz, 0, 90), 5.9, 7.5);
  }
  { // plaid valances on the breakfast-bay windows (photos 24-25)
    const NB = renoBat('off:bump', 'f1'), f = (x, y) => P('f1', x, y);
    const v1 = runKit(NB, 'off:bump', f(1125, 255.9), f(1238, 255.9), [0, 1]);
    valance(new Kit(NB, 'off:bump').at(...(() => { const p = v1.k.P(v1.len / 2, 0, 0); return [p.x, p.z]; })(), 0, v1.k.rot), v1.len - 0.1, 6.3, 6.98, 'curtain', { depth: 0.14 });
    const n = [-0.72, 0.69], A = f(1259.6 - 4.26, 260 + 4.07), Bp = f(1297.9 - 4.26, 300 + 4.07);
    const v2 = runKit(NB, 'off:bump', A, Bp, n);
    valance(new Kit(NB, 'off:bump').at(...(() => { const p = v2.k.P(v2.len / 2, 0, 0); return [p.x, p.z]; })(), 0, v2.k.rot), v2.len - 0.1, 6.3, 6.98, 'curtain', { depth: 0.14 });
    // and a matching plaid valance over the nook door (photo 25), above the leaf's swing
    const v3 = runKit(NB, 'off:bump', f(1062, 304.2), f(1108, 258.2), [0.707, 0.707]);
    valance(new Kit(NB, 'off:bump').at(...(() => { const p = v3.k.P(v3.len / 2, 0, 0); return [p.x, p.z]; })(), 0, v3.k.rot), v3.len, 6.92, 7.5, 'curtain', { depth: 0.14 });
  }
  // gathered floral valances over the two front windows of the primary bedroom (photos 36-37)
  for (const x of [523, 729]) valance(at('f2', x, 1095.8, 180), 3.6, 6.55, 7.4, 'curtain2', { scallop: true, depth: 0.42 });
  // forced-air floor registers under the windows and wall outlets / switches (as in the photos)
  for (const [lv, x, y, r] of [
    ['f1', 1496, 1015, 0], ['f1', 1636, 1015, 0], ['f1', 1690, 941, 90], ['f1', 910, 1015, 0], ['f1', 1050, 1015, 0], ['f1', 1350, 330, 0],
    ['f1', 1440, 600, 0], ['f1', 1560, 296, 0], ['f1', 1440, 296, 0], ['f1', 1180, 1015, 0],
    ['f2', 523, 1085, 0], ['f2', 729, 1085, 0], ['f2', 1409, 1085, 0], ['f2', 1712, 956, 90], ['f2', 1712, 515, 90], ['f2', 1386, 128, 0], ['f2', 1040, 1160, 0],
  ]) floorRegister(at(lv, x, y, r));
  for (const [lv, x, y, r, h, dbl] of [
    ['f1', 1697.6, 690, -90], ['f1', 1697.6, 980, -90], ['f1', 1426.1, 690, 90], ['f1', 1555, 1022.6, 180], ['f1', 1640, 630.6, 0, 4.0, 1],
    ['f1', 1697.6, 590, -90], ['f1', 1697.6, 348, -90, 4.0, 1],
    ['f1', 1130.4, 760, -90], ['f1', 845.1, 760, 90], ['f1', 1000, 1022.6, 180],
    ['f2', 279.2, 690, 90], ['f2', 279.2, 960, 90], ['f2', 620, 1095.8, 180], ['f2', 835.6, 900, -90], ['f2', 718, 483.4, 0, 4.0, 1], // (primary bedroom switch on the closet wall, latch side of the entry: photo 38)
    ['f2', 1298.4, 900, 90], ['f2', 1719.8, 680, -90], ['f2', 1690, 1095.8, 180], ['f2', 1440, 672.4, 0, 4.0, 1],
    ['f2', 1719.8, 250, -90], ['f2', 1700, 120.7, 0], ['f2', 1690, 573.6, 180],
  ]) (h === 4.0 ? switchPlate(at(lv, x, y, r), 4.0, dbl ? 2 : 1) : outlet(at(lv, x, y, r)));
  // ---- 2nd floor: primary bath as built (replaced by the bath remodel)
  const PB = renoBat('off:pbath', 'f2');
  const atPB = (x, y, rot = 0) => { const [lx, lz] = P('f2', x, y); return new Kit(PB, 'off:pbath').at(lx, lz, 9, rot); };
  // ---- 2nd floor: primary bath
  vanity(atPB(279.2, 361, 90), 5.4, 2, { mirrorTop: 7.0 });
  lightBar(atPB(279.2, 361, 90), 5.0, 7.3, 8, 'brass', true);
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
    const [x0, z0] = P('f2', 1121.5, 114), [x1, z1] = P('f2', 1218.5, 297.5); // 60" x 32" alcove tub, wall to wall
    const k = new Kit(bats.f2, 'f2').at(0, 0, 9, 0);
    k.box('porcelain', x0, 0, z0, x1, 1.25, z1);                                     // 15" apron height
    k.soft('col:#eef1f2', x0 + 0.25, 1.0, z0 + 0.3, x1 - 0.25, 1.255, z1 - 0.3, 0.2); // basin
    k.box('chrome', x0 - 0.05, 6.6, z0, x0 + 0.05, 6.68, z1);
    k.box('fab:#f4f2ec', x0 + 0.05, 1.6, z0, x0 + 0.1, 6.55, z0 + (z1 - z0) * 0.45);
    k.box('chrome', (x0 + x1) / 2 - 0.05, 3.0, z0, (x0 + x1) / 2 + 0.05, 3.1, z0 + 0.5);
    k.solid(x0, z0, x1, z1, 0, 1.25);
  }
  // ---- walk-in closet and lights, 2nd floor
  { const { k, len } = runKit(bats.f2, 'f2', P('f2', 679.4, 121), P('f2', 679.4, 470), [1, 0], 9); wicRun(k, len); hangingClothes(k, len, 11, 0.05); }
  { const { k, len } = runKit(bats.f2, 'f2', P('f2', 936.6, 121), P('f2', 936.6, 470), [-1, 0], 9); wicRun(k, len); hangingClothes(k, len, 29, 0.55); }
  { // low oak return-air grille on the closet's end wall (photo 47)
    const k = at('f2', 712, 120.7, 0); k.box(OAKPANEL, -0.55, 0.45, 0, 0.55, 1.75, 0.05);
    for (let y = 0.6; y < 1.62; y += 0.11) k.box('col:#3b2a1e', -0.42, y, 0.05, 0.42, y + 0.05, 0.055);
  }
  // bedroom reach-in closets, the foyer coat closet, and linen closets
  { const { k, len } = runKit(bats.f2, 'f2', P('f2', 1227.4, 120.7), P('f2', 1227.4, 373.6), [1, 0], 9); wicRun(k, len); hangingClothes(k, len, 41, 0.15); }
  { const { k, len } = runKit(bats.f2, 'f2', P('f2', 1456.4, 586.4), P('f2', 1719.8, 586.4), [0, 1], 9); wicRun(k, len); hangingClothes(k, len, 53, 0.3); }
  { const { k, len } = runKit(bats.f1, 'f1', P('f1', 1417.9, 870), P('f1', 1417.9, 1022.6), [-1, 0], 0); wicRun(k, len); hangingClothes(k, len, 67, 0, { coats: true }); }
  { const { k, len } = runKit(bats.f2, 'f2', P('f2', 1227.4, 386.4), P('f2', 1308.6, 386.4), [0, 1], 9); linenShelves(k, len, 7); }
  { const { k, len } = runKit(bats.f2, 'f2', P('f2', 1125.4, 306.4), P('f2', 1214.6, 306.4), [0, 1], 9); linenShelves(k, len, 13); }
  { const { k, len } = runKit(renoBat('off:pbath', 'f2'), 'off:pbath', P('f2', 666.6, 246.4), P('f2', 666.6, 325.6), [-1, 0], 9); linenShelves(k, len, 19); }
  flushDome(at('f2', 808, 290), 8);
  ceilingFan(at('f2', 556, 820), 8, { body: 'brass', blade: wood('#9b6a3c') });
  // bedroom fans (photos 32-35): the cream 11'6" room has a 42" hugger fan with dark walnut blades,
  // the 10'10" room (crown molding) a pewter fan with light oak blades
  ceilingFan(at('f2', 1510, 885), 8, { body: 'col:#8c8f91', blade: wood('#4a2c1e'), drop: 0.55, span: 1.75 });
  ceilingFan(at('f2', 1520, 340), 8, { body: 'col:#8c8f91', blade: wood('#c58d52'), span: 2.1 });
  for (const [x, y] of [[1050, 540], [1210, 1110], [1000, 1110]]) recessed(at('f2', x, y), 8);
  // ---- basement
  // drop-ceiling bulkhead over the main beam, ~2 ft off the stair wall; posts sit under it near the walls
  { const [x0, z] = P('b', 649, 762), [x1] = P('b', 1193, 762); new Kit(bats.b, 'b').box('droptile', x0, -2.3, z - 0.45, x1, -1.6, z + 0.45); }
  for (const [x, y] of [[1010, 762], [1150, 762], [690, 850]]) { const k = at('b', x, y); k.cbox('trim', 0, 0, 0.6, 0.6, 0, 7.4); k.cbox('trim', 0, 0, 0.8, 0.8, 0, 0.4); k.cbox('trim', 0, 0, 0.8, 0.8, 7.0, 7.4); k.solid(-0.3, -0.3, 0.3, 0.3, 0, 7.4); }
  { // electrical panel + tall oak cabinet: on the north wall of the theater bay (photos 43, 45: the
    // cabinet ~3 ft from the east corner, the panel ~5 ft further west, a rear speaker between them)
    const k = at('b', BPANEL[0], BPANEL[1], -90);
    k.box('col:#c4c7c8', -0.6, 4.1, 0, 0.6, 6.6, 0.16); k.box('col:#b4b8ba', -0.52, 4.18, 0.16, 0.52, 6.52, 0.18); // 14" x 30" panel + door
    k.box('col:#8d9294', 0.36, 5.2, 0.18, 0.42, 5.5, 0.2); k.box('col:#f2f2ee', -0.25, 6.0, 0.18, 0.05, 6.2, 0.185);   // latch, label
    const c = at('b', BCAB[0], BCAB[1], -90), OK1 = wood('#c08a52'), OK2 = wood('#cc9862');
    c.box('black', -1.5, 0, 0, 1.5, 7.15, 0.08);                                                      // painted black surround
    c.box(OK1, -1.38, 0, 0, 1.38, 7.0, 1.95); c.box('trim', -1.38, 0, 1.9, 1.38, 0.35, 1.97);           // case + toe kick
    for (const [x0, x1] of [[-1.34, -0.02], [0.02, 1.34]]) {
      raisedPanel(c, x0, x1, 0.4, 5.3, 1.95, OK1, OK2);                                                 // tall lower doors
      raisedPanel(c, x0, x1, 5.38, 6.92, 1.95, OK1, OK2);                                               // upper doors
    }
    for (const x of [-0.12, 0.12]) { knob(c, x, 3.6, 2.04); knob(c, x, 5.6, 2.04); }
    c.solid(-1.4, 0, 1.4, 2, 0, 7);
    // the old ceiling-mounted rear speaker between the panel and the cabinet
    const s = at('b', 1638.2, 440, -90); s.box('col:#1a1a1a', -0.4, 6.4, 0.25, 0.4, 7.0, 0.8); s.box(wood('#8a4a28'), -0.42, 6.38, 0.1, 0.42, 7.02, 0.3); s.box(IRON, -0.05, 6.6, 0, 0.05, 6.8, 0.25);
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
    { // south wall, clear of the door swing: pine boards on steel standards and brackets (photo 49)
      const sh = at('b', 560, 744.7, 180), w = 5;
      for (const x of [-2.1, 0, 2.1]) sh.box('col:#9a9ea1', x - 0.04, 1.0, 0, x + 0.04, 7.2, 0.05);
      for (const [i, y] of [1.6, 2.9, 4.2, 5.5, 6.7].entries()) {
        const d = i < 2 ? 1.25 : 1.0;
        sh.box(wood('#c99a62'), -w / 2, y, 0.05, w / 2, y + 0.07, d);
        for (const x of [-2.1, 0, 2.1]) { sh.box('col:#9a9ea1', x - 0.02, y - 0.12, 0.05, x + 0.02, y, d - 0.1); rod(sh, 'col:#9a9ea1', [x, y - 0.4, 0.05], [x, y - 0.02, d - 0.15], 0.012); }
      }
      sh.box('col:#d8cdb6', -2.2, 1.67, 0.15, -1.2, 2.4, 1.1); sh.box('col:#b89a72', -0.9, 2.97, 0.15, 0.2, 3.6, 0.95); sh.box('col:#e8e4da', 1.0, 4.27, 0.15, 1.9, 4.8, 0.9); // boxes
      sh.solid(-w / 2, 0, w / 2, 1.25, 1.5, 7);
    }
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
  for (const x of [1143, 1386]) exteriorLantern(at('f1', x, 1034.4, 0), 6.0); // ~2'4" either side of the entry (front photo)
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
  // ---- living room, staged as in the listing photos (6-8, 14-17): 7'6" sofa on the north wall
  // under two prints, waterfall coffee table, one spindle armchair angled in the front (south-east)
  // corner, floor lamps at the sofa's west end and by the chair, a side table + lamp by the north
  // window, a tall plant in the north-east corner. Bare carpet (no rug in the photos).
  place('f1', 1697.6, 795, -90, (k) => sofa(k, 7.5, { color: '#ddd5c8', plinth: '#6b4a33', pillows: ['#9d6e64', '#cdb79c', '#7a5c4e', '#a88c84'], throw: '#9a8584' }));
  place('f1', 1572, 795, 90, (k) => coffeeTable(k, 4, 2, '#bdae98'));
  { const [ax, az] = P('f1', 1478, 960), [bx, bz] = P('f1', 1660, 800); place('f1', 1478, 960, (Math.atan2(bx - ax, bz - az) * 180) / Math.PI, (k) => spindleChair(k, { pillow: '#e4ddd0' })); }
  place('f1', 1683, 692, 0, (k) => floorLamp(k, 0, 0));
  place('f1', 1440, 1008, 140, (k) => floorLamp(k, 0, 0));
  place('f1', 1680, 897, 0, (k) => sideTable(k, 1.5, { wire: true }));
  place('f1', 1676, 1004, 0, (k) => plant(k, 0, 0, 6));
  place('f1', 1697.6, 760, -90, (k) => wallArt(k, 1.8, 2.3, 5.3, { art: 'col:#e7d7cd', motif: 'col:#b27f78' }));
  place('f1', 1697.6, 840, -90, (k) => wallArt(k, 1.8, 2.3, 5.5, { art: 'col:#ece6dc', motif: 'col:#6d6f7a' }));
  place('f1', 1566, 1022.6, 180, (k) => wallArt(k, 1.4, 1.8, 5.0, { art: 'col:#ece2d7', motif: 'col:#a77468' }));
  // ---- family room, staged as in photos 9 and 18-21: a gray spotted rug in front of the fireplace
  // with two chairs angled toward it (a white armchair with a plaid throw, a tufted track-arm chair)
  place('f1', 1548, 462, 90, (k) => texRug(k, 10, 7.6, 'spotRug'));
  { const [ax, az] = P('f1', 1560, 395), [bx, bz] = P('f1', 1660, 500); place('f1', 1560, 395, (Math.atan2(bx - ax, bz - az) * 180) / Math.PI, (k) => tuxedoChair(k, { color: '#eeeae2', pillow: '#7a5a44', pillow2: '#e6e2da', throw: ['#ece9e2', '#77706a'] })); }
  { const [ax, az] = P('f1', 1622, 572), [bx, bz] = P('f1', 1500, 430); place('f1', 1622, 572, (Math.atan2(bx - ax, bz - az) * 180) / Math.PI, (k) => tuxedoChair(k, { color: '#e9e5dc', tufted: true, pillow: '#7a5a44', pillow2: '#ece8e0' })); }
  { const k = at('f1', 1672, 515, 0); k.oy += 0.55; plant(k, 0, 0, 2.4); }    // small tree on the raised hearth
  { const k = at('f1', 1672, 410, 0); k.oy += 0.55; k.cyl('col:#a07a4e', 0, 0, 0.5, 0.42, 0, 0.75, 12); k.cyl('col:#7a5a38', 0, 0, 0.44, 0.44, 0.7, 0.78, 12, 1, false); } // log basket
  { const k = at('f1', 1697.6, 462, -90), p = k.P(0, 0, 0.16); wallArt(new Kit(k.bat, k.tag).at(p.x, p.z, k.oy, -90), 3.2, 2.0, 6.55, { art: 'col:#d9b6a8', frame: 'col:#d8cdb8', motif: 'col:#a77a6c' }); } // print standing on the mantel shelf
  place('f1', 1365, 316.5, 0, (k) => wallArt(k, 1.5, 1.8, 5.2, { frame: 'black', art: 'col:#ede9df', motif: 'col:#55574e' }));
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
    // photos 24-25: white tulip table on a blue-gray rug, two white tulip chairs and two walnut
    // mid-century chairs with gray seats
    const k = new Kit(NB, 'off:bump').at(nx, nz, 0, 0);
    k.box('fab:#b9c0c4', -3.5, 0.003, -2.6, 3.5, 0.025, 2.6); k.box('fab:#d6d9d6', -3.1, 0.004, -2.2, 3.1, 0.028, 2.2);
    roundTable(k, 1.75, { base: '#f1efea' }).forEach(([cx, cz, r], i) => {
      const p = k.P(cx * 1.05, 0, cz * 1.05), ck = new Kit(NB, 'off:bump').at(p.x, p.z, 0, r);
      if (i % 2) tulipChair(ck); else chair(ck, '#b9b5ad', '#5c3d2a');
    });
  }
  // ---- sun room
  // (empty in the listing photos; two chairs facing the big window. The sun room extension
  // brings its own furniture, so these belong to the as-built set)
  { const SB = renoBat('off:sunext', 'f1'), sp = (x, y, r, fn) => { const [lx, lz] = P('f1', x, y); fn(new Kit(SB, 'off:sunext').at(lx, lz, 0, r)); };
    sp(1520, 165, 180, (k) => loungeChair(k, '#d9d2b8'));
    sp(1612, 165, 180, (k) => loungeChair(k, '#d9d2b8'));
    sp(1566, 150, 0, (k) => sideTable(k, 1.4));
    sp(1680, 285, 0, (k) => plant(k, 0, 0, 4.5)); }
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
  place('f2', 818, 1085, -135, (k) => floorLamp(k, 0, 0));
  // ---- bedroom 11'6" (pale yellow): queen bed on the hall wall
  place('f2', 1514.5, 965, 0, (k) => rug(k, 5, 8, '#cfd6d8', '#8fa0a6'));
  // headboard on the front wall between the two windows
  place('f2', 1514.5, 1095.8, 180, (k) => bed(k, 'queen', { frame: '#e9e4da', duvet: '#dfe7ea', accent: '#5f7f8c', headboard: '#e9e4da', sham: '#f1f0ec', pillow: '#c9d6db' }));
  place('f2', 1371, 1095.8, 180, (k) => nightstand(k, { color: '#e9e4da' }));
  place('f2', 1658, 1095.8, 180, (k) => nightstand(k, { color: '#e9e4da' }));
  place('f2', 1719.8, 775, -90, (k) => dresser(k, 4.5, { color: '#e9e4da', front: '#efebe3', lamp: true }));
  // ---- bedroom 10'10" (tan): full bed on the east wall, desk
  // headboard on the rear wall, clear of the window
  place('f2', 1560, 120.7, 0, (k) => bed(k, 'full', { frame: '#6b4a33', duvet: '#e4dccd', accent: '#8a3f3a', headboard: '#6b4a33' }));
  place('f2', 1430, 120.7, 0, (k) => nightstand(k));
  place('f2', 1684, 120.7, 0, (k) => nightstand(k));
  place('f2', 1590, 573.6, 180, (k) => desk(k, 4));
  place('f2', 1590, 525, 0, (k) => chair(k, '#3e4a54', '#2b2b2b'));
  // ---- basement, layout A: TV & couch in the octagonal bay, gym at the east end
  const atL = (lay, x, y, rot = 0) => { const [lx, lz] = P('b', x, y); return new Kit(bats['b' + lay], 'b' + lay).at(lx, lz, -9, rot); };
  const placeA = (x, y, rot, fn) => fn(atL('A', x, y, rot));
  const placeB = (x, y, rot, fn) => fn(atL('B', x, y, rot));
  const placeC = (x, y, rot, fn) => fn(atL('C', x, y, rot));
  // ---- layout C: gym in the west end of the rec room, TV in the bay with the couch set back, storage left empty
  placeC(1044, 289.8, 0, (k) => wallTV(k, 65));
  placeC(1044, 291, 0, (k) => mediaConsole(k, 5.5));
  placeC(1044, 505, 0, (k) => rug(k, 8, 10, '#bfb3a2', '#8a7d6c'));
  placeC(1044, 640, 180, (k) => sofa(k, 8, { color: '#5e5348', cushion: '#665a4e', pillows: ['#8b6f4e', '#a1886a'] }));
  placeC(1044, 515, 0, (k) => coffeeTable(k, 4, 2, '#4b3426'));
  placeC(772, 600, 0, (k) => rubberFloor(k, 8.6, 14.5));
  // keeps the utility door and the walk from the stairs clear; nothing under the beam bulkhead
  // (the electrical panel and tall cabinet are on the theater bay's north wall, away from the gym)
  placeC(653.8, 695, 90, (k) => powerRack(k));
  placeC(705, 695, 90, (k) => liftBench(k));                   // pulled into the rack for pressing
  placeC(850, 409.3, 0, (k) => k.box('mirror', -1.7, 3.0, 0, 1.7, 6.8, 0.06));
  placeC(850, 409.3, 0, (k) => dumbbellRack(k, 3.4));          // shorter rack under the mirror
  placeC(800, 595, 180, (k) => pelotonBike(k));                // rider faces the mirror, 2.5 ft ahead of the bike
  placeA(1044, 289.8, 0, (k) => wallTV(k, 65));
  placeA(1044, 291, 0, (k) => mediaConsole(k, 5.5));
  placeA(1044, 452, 0, (k) => rug(k, 8, 10, '#bfb3a2', '#8a7d6c'));
  placeA(1044, 548, 180, (k) => sofa(k, 8, { color: '#5e5348', cushion: '#665a4e', pillows: ['#8b6f4e', '#a1886a'] }));
  placeA(1044, 420, 0, (k) => coffeeTable(k, 4, 2, '#4b3426'));
  // ---- basement: home gym at the east end (rubber floor, rack, bench, dumbbells, bike, BodyPump)
  placeA(1481, 345, 0, (k) => rubberFloor(k, 11.6, 21.4));
  placeA(1638.2, 175, -90, (k) => powerRack(k));
  placeA(1455, 175, 90, (k) => liftBench(k));
  // mirror + dumbbells on the east (storage) wall: the north wall keeps 3 ft clear in front of the
  // electrical panel and room to open the tall cabinet
  placeA(1440, 637.7, 180, (k) => dumbbellRack(k, 5.5));
  placeA(1410, 95, 90, (k) => pelotonBike(k)); // rider faces into the gym (toward the rack and mirror)
  placeA(1430, 465, 0, (k) => bodyPumpArea(k));
  placeA(1440, 637.7, 180, (k) => k.box('mirror', -3.2, 3.0, 0, 3.2, 6.8, 0.06));
  // ---- patio: fire pit with four Adirondack chairs, and a dining set by the family-room windows
  // (the fire pit group shifts over when the breakfast bump-out adds a patio door: see reno.js)
  const PATIO = renoBat('off:bump', 'f1');
  const patio = (x, z, rot, fn) => fn(new Kit(PATIO, 'off:bump').at(x, z, -0.62, rot));
  patio(33, 0.4, 0, firePit); // (centered so the outer chairs stay on the slab, not hanging over the lawn)
  for (const [dx, dz] of [[-3.8, -3.8], [3.8, -3.8], [-3.8, 3.8], [3.8, 3.8]]) {
    const rot = (Math.atan2(-dx, -dz) * 180) / Math.PI;
    patio(33 + dx, 0.4 + dz, rot, (k) => adirondack(k));
  }
  {
    const PD = (x, z, rot = 0) => new Kit(bats.f1F, 'f1F').at(x, z, -0.62, rot);
    for (const [cx, cz, r] of patioDining(PD(18.5, 6.5))) patioChair(PD(18.5 + cx, 6.5 + cz, r));
  }
  placeA(800, 1173.7, 180, (k) => shelving(k, 6, 1.5, 6));
  placeA(1400, 1173.7, 180, (k) => shelving(k, 6, 1.5, 6));
  // ---- basement, layout B: media room at the east end, gym (with room to run) in the storage space
  // media room: screen on the west wall (as the house has it today), seating facing west
  placeB(1481, 57.3, 0, (k) => projectionScreen(k, 110));
  // (a 7 ft sofa set a little south of center keeps 3 ft clear in front of the electrical panel)
  placeB(1470, 300, 0, (k) => rug(k, 10, 8, '#bfb3a2', '#8a7d6c'));
  placeB(1460, 365, 180, (k) => sofa(k, 7, { color: '#5e5348', cushion: '#665a4e', pillows: ['#8b6f4e', '#a1886a'] }));
  placeB(1352, 235, 135, (k) => armchair(k, { color: '#5e5348' }));
  // (no armchair on the north side: that aisle is the way to the seats and to the electrical panel)
  placeB(1481, 240, 0, (k) => coffeeTable(k, 4.5, 2, '#4b3426'));
  placeB(1331, 57.3, 0, (k) => towerSpeaker(k));
  placeB(1631, 57.3, 0, (k) => towerSpeaker(k));
  placeB(1481, 420, 0, (k) => { k.box('white', -0.6, 6.95, -0.7, 0.6, 7.35, 0.7); k.cyl('black', 0, -0.7, 0.18, 0.18, 7.05, 7.25, 10); });
  placeB(1044, 400, 0, (k) => rug(k, 6, 8, '#bfb3a2', '#8a7d6c'));
  placeB(1000, 340, 160, (k) => armchair(k, { color: '#8a6b55' }));
  placeB(1100, 330, -160, (k) => floorLamp(k, 0, 0));
  placeB(1148, 1039.5, 0, (k) => rubberFloor(k, 34, 9.8));
  placeB(1419, 771, 0, (k) => rubberFloor(k, 15.8, 8.6));
  placeB(1000, 1173.7, 180, (k) => powerRack(k));
  placeB(1000, 1112, 0, (k) => liftBench(k));                  // pulled into the rack, so the walk east along the storage stays open
  placeB(780, 1173.7, 180, (k) => dumbbellRack(k, 5.5));
  placeB(1250, 1045, 180, (k) => pelotonBike(k)); // rider's back to the south wall, facing into the room
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
