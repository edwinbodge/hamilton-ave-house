// Procedural canvas textures. Geometry carries UVs in feet, and each texture's
// repeat is set so one tile = `size` feet, so patterns stay to scale.
// Parameterized names: 'faux:#hex' (sponge-painted wall), 'carpet:#hex', 'paint:#hex', 'plank:#hex' ...
// A trailing ':r' (e.g. 'oak::r', 'plank:#c8a57a:r') turns the pattern a quarter turn (floor boards along z).
//
// Besides the color map, a texture may carry companion maps in texture.userData:
//   normalMap (from a drawn height field), roughnessMap (multiplies material.roughness), normalScale.
// geom.js picks them up; textures stay shared and cached by name. Sizes are powers of two (<= 1024).
// Patterns are seeded by name, so they look the same on every load.
//
// This file is shared by both houses (js/ and creekside/js/); only HOUSE differs.
import * as THREE from 'three';

const HOUSE = 'harrison';

// ---------------------------------------------------------------- helpers
let rnd = Math.random;
function seeded(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const R = (a = 0, b = 1) => a + (b - a) * rnd();
// wrap a draw callback so every wrapped copy replays the same random sequence (seamless edges)
function fixed(fn) { const s = String(rnd()); return (...a) => { const save = rnd; rnd = seeded(s); try { return fn(...a); } finally { rnd = save; } }; }
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// height field -> tangent-space normal map (OpenGL convention, canvas flipY like the color map)
function normalFromHeight(hctx, w, h, strength) {
  const src = hctx.getImageData(0, 0, w, h).data;
  const c = canvas(w, h), g = c.getContext('2d');
  const out = g.createImageData(w, h), d = out.data;
  const k = strength / 255;
  for (let y = 0; y < h; y++) {
    const yu = ((y + h - 1) % h) * w, yd = ((y + 1) % h) * w, y0 = y * w;
    for (let x = 0; x < w; x++) {
    const xl = (x + w - 1) % w, xr = (x + 1) % w;
    const dx = (src[(y0 + xr) << 2] - src[(y0 + xl) << 2]) * k, dy = (src[(yd + x) << 2] - src[(yu + x) << 2]) * k;
    // canvas rows run down while v runs up (flipY), so +dh/drow means the surface rises toward -v
    let nx = -dx, ny = dy, nz = 1;
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * w + x) << 2;
    d[i] = (nx * 0.5 + 0.5) * 255; d[i + 1] = (ny * 0.5 + 0.5) * 255; d[i + 2] = (nz * 0.5 + 0.5) * 255; d[i + 3] = 255;
    }
  }
  g.putImageData(out, 0, 0);
  return c;
}

function dataTex(c, sizeFt, color) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  t.repeat.set(1 / sizeFt[0], 1 / sizeFt[1]);
  return t;
}

// draw(g, w, h, H, Rf): g = color context; H(base=128) lazily creates a gray height context;
// Rf(base=255) lazily creates a roughness context (white = full material roughness)
function canvasTex(w, h, draw, sizeFt, { bump = 2, normalScale = 1 } = {}) {
  const c = canvas(w, h), g = c.getContext('2d');
  let hc = null, rc = null;
  const H = (base = 128) => {
    if (!hc) { const x = canvas(w, h).getContext('2d', { willReadFrequently: true }); x.fillStyle = `rgb(${base},${base},${base})`; x.fillRect(0, 0, w, h); hc = x; }
    return hc;
  };
  const Rf = (base = 255) => {
    if (!rc) { const x = canvas(w, h).getContext('2d'); x.fillStyle = `rgb(${base},${base},${base})`; x.fillRect(0, 0, w, h); rc = x; }
    return rc;
  };
  draw(g, w, h, H, Rf);
  const t = dataTex(c, sizeFt, true);
  if (hc) { t.userData.normalMap = dataTex(normalFromHeight(hc, w, h, bump), sizeFt, false); t.userData.normalScale = normalScale; }
  if (rc) t.userData.roughnessMap = dataTex(rc.canvas, sizeFt, false);
  return t;
}
function noise(g, w, h, amt, alpha = 0.08, size = 2) {
  for (let i = 0; i < amt; i++) {
    const v = rnd() < 0.5 ? 0 : 255;
    g.fillStyle = `rgba(${v},${v},${v},${rnd() * alpha})`;
    g.fillRect(rnd() * w, rnd() * h, size, size);
  }
}
// soft blotches (low-frequency variation), balanced light/dark so the average color is kept
function mottle(g, w, h, n, rMin, rMax, alpha, tint = [255, 255, 255], dark = [0, 0, 0]) {
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y = rnd() * h, r = R(rMin, rMax), a = rnd() * alpha, col = rnd() < 0.5 ? tint : dark;
    wrapDraw(w, h, x, y, (xx, yy) => {
      if (xx + r < 0 || yy + r < 0 || xx - r > w || yy - r > h) return;
      const grd = g.createRadialGradient(xx, yy, 0, xx, yy, r);
      grd.addColorStop(0, `rgba(${col},${a})`); grd.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = grd; g.fillRect(xx - r, yy - r, 2 * r, 2 * r);
    });
  }
}
// draw so the pattern wraps seamlessly
function wrapDraw(w, h, x, y, fn) {
  for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) fn(x + dx, y + dy);
}
// run fn(ox) for each horizontal copy of a span [x, x+len) that touches the canvas, clipped to the row
function rowSpan(g, w, x, y, len, rh, fn) {
  for (const ox of [-w, 0, w]) {
    if (x + ox + len < 0 || x + ox > w) continue;
    g.save(); g.beginPath(); g.rect(x + ox, y, len, rh); g.clip(); fn(x + ox); g.restore();
  }
}
function shade(hex, f) {
  const c = new THREE.Color(hex);
  const hsl = {}; c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + f)));
  return '#' + c.getHexString();
}
const gray = (v) => { v = Math.max(0, Math.min(255, Math.round(v))); return `rgb(${v},${v},${v})`; };

// wood grain streaks along a board (x = along the grain) inside the current clip
function boardGrain(g, x, y, len, rh, hex, { lines = 18, contrast = 0.12, cathedral = 0.5, H = null } = {}) {
  // a broad, slightly darker "heart" band and cathedral arches
  if (rnd() < cathedral) {
    const cx = x + R(0.15, 0.85) * len, arcs = 3 + Math.floor(rnd() * 4), span = R(0.25, 0.6) * len;
    for (let k = 0; k < arcs; k++) {
      const f = (k + 1) / (arcs + 1), hh = rh * (0.15 + 0.7 * f);
      g.strokeStyle = shade(hex, -contrast * R(0.6, 1.1)) + '66'; g.lineWidth = R(0.6, 1.6);
      g.beginPath(); g.moveTo(cx - span * f, y + rh / 2 - hh / 2); g.quadraticCurveTo(cx + span * 0.5, y + rh / 2, cx - span * f, y + rh / 2 + hh / 2); g.stroke();
    }
  }
  for (let i = 0; i < lines; i++) {
    const yy = y + rnd() * rh, amp = R(0.3, 1.6), ph = rnd() * 6, fr = R(0.004, 0.012);
    const dark = rnd() < 0.7;
    g.strokeStyle = (dark ? shade(hex, -contrast * R(0.4, 1)) : shade(hex, contrast * R(0.2, 0.6))) + (dark ? '55' : '40');
    g.lineWidth = R(0.5, 1.4);
    g.beginPath(); g.moveTo(x, yy);
    for (let s = 0; s <= len; s += 16) g.lineTo(x + s, yy + Math.sin(s * fr * 6.283 + ph) * amp);
    g.stroke();
    if (H && dark && rnd() < 0.5) { // open grain pores: tiny dents
      H.strokeStyle = 'rgba(0,0,0,0.25)'; H.lineWidth = 0.8;
      H.beginPath(); H.moveTo(x, yy); for (let s = 0; s <= len; s += 16) H.lineTo(x + s, yy + Math.sin(s * fr * 6.283 + ph) * amp); H.stroke();
    }
  }
  // pores / ticks
  for (let i = 0; i < len * rh / 90; i++) { g.fillStyle = shade(hex, -contrast * 1.4) + '40'; g.fillRect(x + rnd() * len, y + rnd() * rh, R(2, 7), 0.8); }
}

// strip / plank flooring: rows of boards with random lengths, end joints, per-board tone & sheen
function boards(g, w, h, H, Rf, { rows, hue, base, vary = 0.07, minLen, maxLen, lines, contrast, gap = 1.5, bevel = 0, sheen = [190, 240] }) {
  const rh = h / rows, hg = H(150), rg = Rf(220);
  g.fillStyle = shade(base, -0.25); g.fillRect(0, 0, w, h);
  for (let r = 0; r < rows; r++) {
    const y = r * rh;
    let x = -rnd() * maxLen;
    const end = x + w;
    while (x < end) {
      const len = Math.min(R(minLen, maxLen), end - x < minLen * 1.3 ? end - x : Infinity);
      const col = hue ? hue() : shade(base, (rnd() - 0.5) * vary * 2);
      const rough = R(sheen[0], sheen[1]);
      rowSpan(g, w, x, y, len, rh, fixed((xx) => {
        g.fillStyle = col; g.fillRect(xx, y, len, rh);
        // tone falls off a touch toward the board ends (wire-brushed / sanded look)
        const grd = g.createLinearGradient(xx, 0, xx + len, 0);
        grd.addColorStop(0, 'rgba(0,0,0,0.05)'); grd.addColorStop(0.5, 'rgba(255,255,255,0.03)'); grd.addColorStop(1, 'rgba(0,0,0,0.05)');
        g.fillStyle = grd; g.fillRect(xx, y, len, rh);
        boardGrain(g, xx, y, len, rh, col, { lines, contrast, H: null });
        rg.fillStyle = gray(rough); rg.fillRect(xx, y, len, rh);
      }));
      // end joint (dark line + groove)
      for (const ox of [-w, 0, w]) {
        g.fillStyle = 'rgba(30,15,5,0.55)'; g.fillRect(x + ox, y, gap * 0.8, rh);
        hg.fillStyle = gray(40); hg.fillRect(x + ox - 0.5, y, gap + 0.5, rh);
        rg.fillStyle = gray(255); rg.fillRect(x + ox, y, gap, rh);
      }
      x += len;
    }
    // long-edge seam (and an eased edge for beveled planks)
    g.fillStyle = 'rgba(30,15,5,0.5)'; g.fillRect(0, y, w, gap * 0.8);
    hg.fillStyle = gray(30); hg.fillRect(0, y - 0.5, w, gap + 0.5);
    if (bevel) { hg.fillStyle = gray(95); hg.fillRect(0, y + gap, w, bevel); hg.fillRect(0, y + rh - bevel, w, bevel); }
    rg.fillStyle = gray(255); rg.fillRect(0, y, w, gap);
  }
  noise(g, w, h, w * h / 160, 0.035, 1);
}

// running-bond units (brick, block, subway) with recessed joints
function bond(g, w, h, H, Rf, { rows, cols, joint, unit, mortar, offset = 0.5, relief = 60, rough = null, chip = 0.3 }) {
  const rh = h / rows, cw = w / cols, hg = H(110), rg = rough ? Rf(rough[1]) : null;
  g.fillStyle = mortar; g.fillRect(0, 0, w, h);
  noise(g, w, h, w * h / 30, 0.1, 1);
  for (let r = 0; r < rows; r++) for (let c = -1; c <= cols; c++) {
    const x = c * cw + (r % 2) * cw * offset + joint / 2, y = r * rh + joint / 2, bw = cw - joint, bh = rh - joint;
    const col = unit(r, c);
    wrapDraw(w, h, x, y, fixed((xx, yy) => {
      if (xx > w || xx + bw < 0 || yy > h || yy + bh < 0) return;
      g.fillStyle = col; g.fillRect(xx, yy, bw, bh);
      // face texture: speckles and a slightly lighter top edge (catching sky light)
      g.save(); g.beginPath(); g.rect(xx, yy, bw, bh); g.clip();
      for (let i = 0; i < bw * bh / 25; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)'; g.fillRect(xx + rnd() * bw, yy + rnd() * bh, R(1, 2.5), R(1, 2.5)); }
      g.restore();
      hg.fillStyle = gray(110 + relief + R(-8, 8)); hg.fillRect(xx, yy, bw, bh);
      if (rnd() < chip) { hg.fillStyle = gray(110 + relief * 0.4); hg.beginPath(); const cx = xx + (rnd() < 0.5 ? 0 : bw), cy = yy + (rnd() < 0.5 ? 0 : bh); hg.arc(cx, cy, R(2, 5), 0, 7); hg.fill(); }
      if (rg) { rg.fillStyle = gray(R(rough[0], rough[0] + 25)); rg.fillRect(xx, yy, bw, bh); }
    }));
  }
}

// grid tile with grout; tile(i, j) -> color
function tiles(g, w, h, H, Rf, { n, m = n, grout, groutW, tile, rough = [70, 255], relief = 50, speck = 0.04, cut = null }) {
  const sw = w / n, sh = h / m, hg = H(100), rg = Rf(rough[1]);
  g.fillStyle = grout; g.fillRect(0, 0, w, h); noise(g, w, h, w * h / 40, 0.08, 1);
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    const x = i * sw + groutW / 2, y = j * sh + groutW / 2, tw = sw - groutW, th = sh - groutW;
    g.fillStyle = tile(i, j); g.fillRect(x, y, tw, th);
    g.save(); g.beginPath(); g.rect(x, y, tw, th); g.clip();
    mottle(g, w, h, 6, tw * 0.1, tw * 0.4, 0.06);
    noise(g, w, h, tw * th / 30, speck, 1);
    g.restore();
    // pillowed edges: the tile face is high, easing down to the grout
    hg.fillStyle = gray(100 + relief); hg.fillRect(x, y, tw, th);
    hg.fillStyle = gray(100 + relief * 0.6); hg.fillRect(x, y, tw, 1.5); hg.fillRect(x, y, 1.5, th); hg.fillRect(x, y + th - 1.5, tw, 1.5); hg.fillRect(x + tw - 1.5, y, 1.5, th);
    rg.fillStyle = gray(R(rough[0], rough[0] + 12)); rg.fillRect(x, y, tw, th);
  }
  if (cut) cut(hg, rg);
}

// lap siding: n courses per tile; each board is thin at its top (under the course above) and thick at the butt
function lapSiding(g, w, h, H, n, hex, { grainAmt = 0.25, lip = 0.12 } = {}) {
  const ch = h / n, hg = H(0);
  for (let i = 0; i < n; i++) {
    const y = i * ch;
    const grd = g.createLinearGradient(0, y, 0, y + ch);
    grd.addColorStop(0, shade(hex, -lip)); grd.addColorStop(0.07, shade(hex, -0.02)); grd.addColorStop(0.2, shade(hex, 0.015)); grd.addColorStop(1, shade(hex, -0.01));
    g.fillStyle = grd; g.fillRect(0, y, w, ch);
    const hgrd = hg.createLinearGradient(0, y, 0, y + ch);
    // canvas row y (top of course) is the thin edge tucked under the board above; y + ch is the butt
    hgrd.addColorStop(0, gray(30)); hgrd.addColorStop(0.97, gray(150)); hgrd.addColorStop(1, gray(155));
    hg.fillStyle = hgrd; hg.fillRect(0, y, w, ch);
  }
  // embossed woodgrain (vinyl) / brush marks (paint)
  for (let i = 0; i < w * h / 400; i++) {
    const x = rnd() * w, y = rnd() * h, l = R(20, 90);
    g.strokeStyle = `rgba(0,0,0,${rnd() * 0.03})`; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + R(-0.6, 0.6)); g.stroke();
    hg.strokeStyle = `rgba(0,0,0,${rnd() * grainAmt})`; hg.beginPath(); hg.moveTo(x, y); hg.lineTo(x + l, y + R(-0.6, 0.6)); hg.stroke();
  }
  noise(g, w, h, w * h / 60, 0.03, 1);
}

// architectural (laminated) asphalt shingles: courses of random-width tabs with dark shadow-band patches
// architectural (laminated) asphalt shingles: 14 courses of random-width tabs. Tab tones follow a
// smooth "blend" field (clusters of lighter and darker tabs, as on a real roof) plus per-tab jitter,
// so the 6.5 ft tile does not read as a repeating checker.
function shingles(g, w, h, H, Rf, { hue, sat, light, spread, rows = 14 }) {
  const ch = h / rows, hg = H(0);
  const blobs = [...Array(14)].map(() => [rnd() * w, rnd() * h, R(0.08, 0.22) * w, R(-1, 1)]);
  const blend = (x, y) => {
    let v = 0;
    for (const [bx, by, br, s] of blobs) for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) {
      const d2 = ((x - bx - dx) ** 2 + (y - by - dy) ** 2) / (br * br);
      if (d2 < 4) v += s * Math.exp(-d2);
    }
    return Math.max(-1.5, Math.min(1.5, v));
  };
  g.fillStyle = `hsl(${hue},${sat}%,${light - 14}%)`; g.fillRect(0, 0, w, h);
  for (let r = 0; r < rows; r++) {
    const y = r * ch;
    let x = -rnd() * 60;
    const x0 = x;
    while (x < x0 + w) {
      const tw = Math.min(R(0.045, 0.12) * w, x0 + w - x);
      const l = light + blend(x + tw / 2, y + ch / 2) * spread * 0.6 + R(-spread, spread) * 0.55;
      const top = y + R(0, ch * 0.2); // laminated tabs: some sit lower, giving the dimensional look
      const col = `hsl(${hue + R(-6, 6)},${Math.max(0, sat + R(-2, 2))}%,${l}%)`;
      wrapDraw(w, h, x, 0, (xx) => {
        g.fillStyle = col; g.fillRect(xx + 1, top, tw - 2, y + ch - top);
        const hgrd = hg.createLinearGradient(0, top, 0, y + ch);
        hgrd.addColorStop(0, gray(60)); hgrd.addColorStop(1, gray(170));
        hg.fillStyle = hgrd; hg.fillRect(xx + 1, top, tw - 2, y + ch - top);
        hg.fillStyle = gray(40); hg.fillRect(xx, top, 1.5, y + ch - top);
      });
      x += tw;
    }
    // shadow under the butt edge of the course above
    const sg = g.createLinearGradient(0, y, 0, y + ch * 0.22);
    sg.addColorStop(0, 'rgba(0,0,0,0.45)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sg; g.fillRect(0, y, w, ch * 0.22);
    hg.fillStyle = gray(20); hg.fillRect(0, y, w, 2);
  }
  // granules
  for (let i = 0; i < w * h / 5; i++) {
    const v = rnd(); g.fillStyle = v < 0.5 ? `rgba(0,0,0,${rnd() * 0.22})` : `rgba(255,255,255,${rnd() * 0.12})`;
    g.fillRect(rnd() * w, rnd() * h, 1, 1);
  }
  noise(H(), w, h, w * h / 8, 0.25, 1);
}

// ---------------------------------------------------------------- the textures
// Color-parameterized patterns are drawn once in a neutral gray (REF) and shared by every color:
// the material color carries the actual color (texTint), so twenty paint colors cost one texture.
// three.js multiplies color x map in linear space, so the average color comes out exactly as given.
const REF = '#bfbfbf';
const TINTABLE = new Set(['grain', 'paint', 'carpet', 'faux', 'plank', 'lvp', 'tile', 'subway', 'paintbrick', 'lap', 'bnb', 'shake', 'laminate']);
function tintSplit(name) {
  const rot = name.endsWith(':r'), base = rot ? name.slice(0, -2).replace(/:$/, '') : name;
  const [kind, arg] = base.split(':');
  if (!TINTABLE.has(kind) || !arg || !arg.startsWith('#')) return null;
  return { shared: kind + ':' + REF + (rot ? ':r' : ''), color: arg };
}
// the material color to use with tex(name): the tint for neutral-drawn patterns, white otherwise
export function texTint(name) {
  const t = name && tintSplit(name);
  if (!t) return new THREE.Color(1, 1, 1);
  const c = new THREE.Color(t.color), r = new THREE.Color(REF);
  return c.setRGB(c.r / r.r, c.g / r.g, c.b / r.b); // linear ratios (may exceed 1)
}
const cache = {};
export function tex(name) {
  if (cache[name]) return cache[name];
  const tint = tintSplit(name);
  if (tint && tint.shared !== name) return (cache[name] = tex(tint.shared));
  let base = name, rot = false;
  if (name.endsWith(':r')) { rot = true; base = name.slice(0, -2).replace(/:$/, ''); }
  if (rot) { // rotated copy of the same pattern (shares nothing but the look)
    const src = tex(base);
    const t = src.clone(); t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; t.needsUpdate = true;
    for (const k of ['normalMap', 'roughnessMap']) if (src.userData[k]) { const c = src.userData[k].clone(); c.center.set(0.5, 0.5); c.rotation = Math.PI / 2; c.needsUpdate = true; t.userData[k] = c; }
    t.userData.normalScale = src.userData.normalScale;
    return (cache[name] = t);
  }
  const [kind, arg] = base.split(':');
  rnd = seeded(name);
  let t;
  switch (kind) {
    case 'siding': // white vinyl lap siding, ~4.5" exposure, with embossed woodgrain
      t = canvasTex(512, 512, (g, w, h, H) => lapSiding(g, w, h, H, 4, '#f4f4f0', { lip: 0.14 }), [4, 1.5], { bump: 5 });
      break;
    case 'lap': // painted lap siding in a given color, ~5" exposure
      t = canvasTex(512, 512, (g, w, h, H) => lapSiding(g, w, h, H, 4, arg, { lip: 0.1, grainAmt: 0.15 }), [4, 1.66], { bump: 5 });
      break;
    case 'shingle': // architectural (laminated) shingles, weathered wood gray
      t = canvasTex(1024, 1024, (g, w, h, H, Rf) => shingles(g, w, h, H, Rf, { hue: 34, sat: 4, light: 45, spread: 8 }), [6.5, 6.5625], { bump: 4 }); // warm gray offsets the blue sky light
      break;
    case 'shingleDark': // charcoal architectural shingles (modern facade)
      t = canvasTex(1024, 1024, (g, w, h, H, Rf) => shingles(g, w, h, H, Rf, { hue: 30, sat: 3, light: 21, spread: 5 }), [6.5, 6.5625], { bump: 4 });
      break;
    case 'oak': // red oak strip flooring, 2.25" boards, honey-orange finish
      t = canvasTex(1024, 1024, (g, w, h, H, Rf) => boards(g, w, h, H, Rf, {
        // Harrison's photos show deep amber red oak; Creekside's (photos 11-15) a lighter honey/natural oak
        rows: 28, base: '#b9773d', hue: HOUSE === 'harrison' ? () => `hsl(${23 + rnd() * 5},${62 + rnd() * 8}%,${39 + rnd() * 7}%)` : () => `hsl(${29 + rnd() * 5},${50 + rnd() * 8}%,${48 + rnd() * 7}%)`,
        minLen: 110, maxLen: 520, lines: 14, contrast: 0.13, gap: 1.2, sheen: [150, 215],
      }), [8, 5.25], { bump: 3, normalScale: 0.6 });
      break;
    case 'plank': // wide-plank hardwood in a given base color (5" boards)
      t = canvasTex(1024, 1024, (g, w, h, H, Rf) => boards(g, w, h, H, Rf, {
        rows: 12, base: arg, vary: 0.05, minLen: 260, maxLen: 900, lines: 26, contrast: 0.09, gap: 1.6, bevel: 1.5, sheen: [170, 230],
      }), [10, 5], { bump: 3, normalScale: 0.6 });
      break;
    case 'lvp': // luxury vinyl plank (7" boards)
      t = canvasTex(1024, 1024, (g, w, h, H, Rf) => boards(g, w, h, H, Rf, {
        rows: 10, base: arg, vary: 0.045, minLen: 300, maxLen: 900, lines: 22, contrast: 0.07, gap: 1.4, bevel: 2, sheen: [200, 235],
      }), [12, 5.83], { bump: 3, normalScale: 0.5 });
      break;
    case 'carpet': { // cut pile: fine fiber speckle, soft tufts and faint traffic shading, average = arg
      t = canvasTex(512, 512, (g, w, h, H) => {
        g.fillStyle = arg; g.fillRect(0, 0, w, h);
        mottle(g, w, h, 70, 30, 110, 0.05);
        const hg = H();
        for (let i = 0; i < w * h / 3; i++) {
          const x = rnd() * w, y = rnd() * h, v = rnd();
          g.fillStyle = v < 0.5 ? `rgba(0,0,0,${rnd() * 0.09})` : `rgba(255,255,255,${rnd() * 0.08})`; g.fillRect(x, y, 1.5, 1.5);
          hg.fillStyle = gray(60 + rnd() * 140); hg.fillRect(x, y, 2, 2);
        }
      }, [2, 2], { bump: 1.2, normalScale: 0.5 });
      break;
    }
    case 'berber':
      t = canvasTex(512, 512, (g, w, h, H) => {
        g.fillStyle = '#d6c0a2'; g.fillRect(0, 0, w, h);
        const hg = H();
        // looped rows
        for (let y = 0; y < h; y += 4) for (let x = (y / 4) % 2 ? 2 : 0; x < w; x += 4) {
          const d = rnd();
          g.fillStyle = d < 0.45 ? 'rgba(140,100,60,0.22)' : d < 0.9 ? 'rgba(255,245,230,0.22)' : 'rgba(90,70,50,0.25)';
          g.beginPath(); g.ellipse(x + 2, y + 2, 2.1, 1.7, 0, 0, 7); g.fill();
          hg.fillStyle = gray(150 + rnd() * 60); hg.beginPath(); hg.ellipse(x + 2, y + 2, 1.6, 1.3, 0, 0, 7); hg.fill();
        }
      }, [2, 2], { bump: 1.5, normalScale: 0.6 });
      break;
    case 'faux': { // sponge-painted walls
      const harrison = HOUSE === 'harrison';
      t = canvasTex(512, 512, (g, w, h, H) => {
        g.fillStyle = arg; g.fillRect(0, 0, w, h);
        // Harrison's listing photos show a fairly bold sponge pattern: pale cream highlights over tan mottling
        const n = harrison ? 1680 : 1040, r0 = harrison ? 12 : 16, r1 = harrison ? 64 : 76, hi = harrison ? 0.085 : 0.06, lo = harrison ? -0.1 : -0.07;
        for (let i = 0; i < n; i++) {
          const x = rnd() * w, y = rnd() * h, r = R(r0, r1) / 1.25;
          const col = rnd() < 0.5 ? shade(arg, hi) : shade(arg, lo);
          wrapDraw(w, h, x, y, (xx, yy) => {
            if (xx + r < 0 || yy + r < 0 || xx - r > w || yy - r > h) return;
            const grd = g.createRadialGradient(xx, yy, 0, xx, yy, r);
            grd.addColorStop(0, col + '88'); grd.addColorStop(1, col + '00');
            g.fillStyle = grd; g.fillRect(xx - r, yy - r, 2 * r, 2 * r);
          });
        }
        const hg = H(); for (let i = 0; i < w * h / 10; i++) { hg.fillStyle = gray(90 + rnd() * 80); hg.fillRect(rnd() * w, rnd() * h, 2, 2); }
        noise(g, w, h, 6000, 0.035, 1);
      }, [5, 5], { bump: 0.6, normalScale: 0.3 });
      break;
    }
    case 'paint': // flat paint with the faintest orange-peel texture
      t = canvasTex(256, 256, (g, w, h, H) => {
        g.fillStyle = arg; g.fillRect(0, 0, w, h); noise(g, w, h, 2000, 0.02, 1);
        const hg = H(); for (let i = 0; i < 9000; i++) { hg.fillStyle = gray(80 + rnd() * 100); hg.beginPath(); hg.arc(rnd() * w, rnd() * h, R(0.8, 2), 0, 7); hg.fill(); }
      }, [2, 2], { bump: 0.5, normalScale: 0.25 });
      break;
    case 'ivy': { // kitchen & nook wallpaper: small trailing vine on cream
      const harrison = HOUSE === 'harrison';
      t = canvasTex(512, 512, (g, w, h) => {
        g.scale(2, 2); const W = w / 2, Hh = h / 2;
        g.fillStyle = '#f2eee4'; g.fillRect(0, 0, W, Hh);
        const leaf = (x, y, a, col) => wrapDraw(W, Hh, x, y, (xx, yy) => {
          g.save(); g.translate(xx, yy); g.rotate(a); g.fillStyle = col;
          g.beginPath(); g.ellipse(0, 0, harrison ? 5.5 : 4.5, harrison ? 2.6 : 2.0, 0, 0, Math.PI * 2); g.fill();
          g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(-4, 0); g.lineTo(4, 0); g.stroke(); g.restore();
        });
        // Harrison: short scattered sprigs (photos 24-29), not long vines; Creekside: fewer, longer vines
        const vines = harrison ? 70 : 16, steps = harrison ? 7 : 16;
        for (let v = 0; v < vines; v++) {
          let x = rnd() * W, y = rnd() * Hh, a = rnd() * Math.PI * 2;
          g.strokeStyle = harrison ? 'rgba(125,116,102,0.3)' : 'rgba(125,116,102,0.7)'; g.lineWidth = harrison ? 0.6 : 0.8;
          for (let s = 0; s < steps; s++) {
            const nx = x + Math.cos(a) * 5, ny = y + Math.sin(a) * 5;
            wrapDraw(W, Hh, 0, 0, (ox, oy) => { g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(nx + ox, ny + oy); g.stroke(); });
            if (harrison) {
              leaf(nx, ny, a + (s % 2 ? 0.9 : -0.9), rnd() < 0.6 ? '#6d6a60' : '#9a958a');
              if (s % 7 === 3) wrapDraw(W, Hh, nx + 3, ny + 3, (xx, yy) => { g.fillStyle = '#8c3b3b'; g.beginPath(); g.arc(xx, yy, 1.8, 0, 7); g.fill(); });
            } else if (s % 2 === 0) leaf(nx, ny, a + (rnd() < 0.5 ? 0.9 : -0.9), rnd() < 0.7 ? '#66625a' : '#8a857a');
            x = nx; y = ny; a += (rnd() - 0.5) * 0.9;
          }
        }
        g.setTransform(1, 0, 0, 1, 0, 0); noise(g, w, h, 4000, 0.025, 1);
      }, [2, 2]);
      break;
    }
    case 'grid': // garage hall wallpaper: fine burgundy grid on beige
      t = canvasTex(256, 256, (g, w, h) => {
        g.fillStyle = '#e8dcc6'; g.fillRect(0, 0, w, h); noise(g, w, h, 1500, 0.025, 1);
        g.fillStyle = 'rgba(120,50,45,0.55)';
        for (let i = 0; i < 4; i++) { g.fillRect(i * 64, 0, 3, h); g.fillRect(0, i * 64, w, 3); }
        g.fillStyle = 'rgba(120,50,45,0.2)';
        for (let i = 0; i < 4; i++) { g.fillRect(i * 64 + 32, 0, 1.5, h); g.fillRect(0, i * 64 + 32, w, 1.5); }
      }, [1, 1]);
      break;
    case 'tileBeige': // 12" ceramic floor tile
      t = canvasTex(512, 512, (g, w, h, H, Rf) => tiles(g, w, h, H, Rf, { n: 2, grout: '#b8a487', groutW: 6, tile: () => `hsl(${36 + R(-2, 2)},${40 + R(-4, 4)}%,${79 + R(-2, 2)}%)`, rough: [80, 255] }), [2, 2], { bump: 3 });
      break;
    case 'tile4': // 4" wall tile, peach-beige (primary bath tub deck & shower)
      t = canvasTex(512, 512, (g, w, h, H, Rf) => tiles(g, w, h, H, Rf, { n: 6, grout: '#c9b39d', groutW: 5, tile: () => `hsl(28,${38 + rnd() * 8}%,${73 + rnd() * 6}%)`, rough: [60, 255] }), [2, 2], { bump: 3 });
      break;
    case 'tileGray': // hall bath tub surround: large gray stone-look tile with a border
      t = canvasTex(512, 512, (g, w, h, H, Rf) => tiles(g, w, h, H, Rf, { n: 1, grout: '#9b968e', groutW: 6, tile: () => '#b7b2aa', speck: 0.1, rough: [90, 255] }), [1, 1], { bump: 3 });
      break;
    case 'backsplash': // kitchen: diagonal beige tile
      t = canvasTex(512, 512, (g, w, h, H, Rf) => {
        const hg = H(100), rg = Rf(255);
        g.fillStyle = '#a99c8b'; g.fillRect(0, 0, w, h); noise(g, w, h, 6000, 0.08, 1);
        for (const ctx of [g, hg, rg]) { ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(Math.PI / 4); }
        const s = (w * Math.SQRT2) / 8;
        for (let i = -6; i < 6; i++) for (let j = -6; j < 6; j++) {
          g.fillStyle = `hsl(35,${12 + rnd() * 6}%,${66 + rnd() * 8}%)`; g.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
          hg.fillStyle = gray(150); hg.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
          rg.fillStyle = gray(80); rg.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
        }
        for (const ctx of [g, hg, rg]) ctx.restore();
      }, [0.9, 0.9], { bump: 3 });
      break;
    case 'slate': // dark slate tile set square (sun room, photos 22-23)
      t = canvasTex(512, 512, (g, w, h, H, Rf) => tiles(g, w, h, H, Rf, {
        n: 2, grout: '#5d6164', groutW: 6, tile: () => `hsl(${205 + R(-8, 8)},${7 + R(0, 5)}%,${22 + R(-3, 4)}%)`, rough: [95, 255], relief: 40, speck: 0.12,
        cut: (hg) => { for (let i = 0; i < 3000; i++) { hg.fillStyle = gray(130 + R(-30, 30)); hg.fillRect(rnd() * w, rnd() * h, R(2, 10), R(1, 3)); } },
      }), [2.2, 2.2], { bump: 2.5 });
      break;
    case 'concrete':
      t = canvasTex(512, 512, (g, w, h, H) => {
        g.fillStyle = '#b7b5b0'; g.fillRect(0, 0, w, h);
        mottle(g, w, h, 60, 20, 120, 0.06);
        noise(g, w, h, 30000, 0.08, 1);
        const hg = H(); for (let i = 0; i < 20000; i++) { hg.fillStyle = gray(60 + rnd() * 140); hg.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); }
      }, [6, 6], { bump: 1.5, normalScale: 0.5 });
      break;
    case 'paving': // poured concrete walk / drive with tooled control joints
      t = canvasTex(512, 512, (g, w, h, H) => {
        g.fillStyle = '#cfcbc3'; g.fillRect(0, 0, w, h);
        mottle(g, w, h, 50, 30, 140, 0.05);
        noise(g, w, h, 30000, 0.07, 1);
        g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h);
        const hg = H(); for (let i = 0; i < 16000; i++) { hg.fillStyle = gray(70 + rnd() * 120); hg.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); }
        hg.fillStyle = gray(10); hg.fillRect(0, 0, w, 3); hg.fillRect(0, 0, 3, h);
      }, [8, 8], { bump: 2, normalScale: 0.6 });
      break;
    case 'asphalt':
      t = canvasTex(512, 512, (g, w, h, H) => {
        g.fillStyle = '#4a4b4d'; g.fillRect(0, 0, w, h);
        mottle(g, w, h, 40, 30, 120, 0.06);
        for (let i = 0; i < 40000; i++) { const v = rnd(); g.fillStyle = v < 0.5 ? `rgba(0,0,0,${rnd() * 0.25})` : `rgba(210,205,195,${rnd() * 0.2})`; g.fillRect(rnd() * w, rnd() * h, 1.2, 1.2); }
        const hg = H(); for (let i = 0; i < 25000; i++) { hg.fillStyle = gray(40 + rnd() * 170); hg.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); }
      }, [6, 6], { bump: 1.5, normalScale: 0.6 });
      break;
    case 'grass':
      t = canvasTex(1024, 1024, (g, w, h) => {
        g.fillStyle = '#5b8236'; g.fillRect(0, 0, w, h);
        mottle(g, w, h, 110, 40, 220, 0.1, [170, 190, 90], [30, 50, 15]);
        for (let i = 0; i < 90000; i++) {
          g.fillStyle = `hsla(${72 + rnd() * 34},${28 + rnd() * 22}%,${20 + rnd() * 26}%,0.5)`;
          const x = rnd() * w, y = rnd() * h; g.fillRect(x, y, 1, R(2, 4));
        }
      }, [16, 16]);
      break;
    case 'mulch':
      t = canvasTex(512, 512, (g, w, h, H) => {
        g.fillStyle = '#5e4130'; g.fillRect(0, 0, w, h);
        const hg = H(60);
        for (let i = 0; i < 9000; i++) {
          const x = rnd() * w, y = rnd() * h, a = rnd() * 3.14, l = R(4, 12), th = R(1.5, 3.5);
          g.save(); g.translate(x, y); g.rotate(a);
          g.fillStyle = `hsl(${18 + rnd() * 10},${35 + rnd() * 20}%,${16 + rnd() * 22}%)`; g.fillRect(-l / 2, -th / 2, l, th); g.restore();
          hg.save(); hg.translate(x, y); hg.rotate(a); hg.fillStyle = gray(80 + rnd() * 160); hg.fillRect(-l / 2, -th / 2, l, th); hg.restore();
        }
      }, [3, 3], { bump: 2 });
      break;
    case 'brick': // red face brick (fireplace), 8" x 2.67" modules with recessed mortar
      t = canvasTex(512, 512, (g, w, h, H, Rf) => bond(g, w, h, H, Rf, {
        rows: 8, cols: 3, joint: 9, mortar: '#cfc4b2', unit: () => `hsl(${10 + rnd() * 8},${45 + rnd() * 10}%,${30 + rnd() * 10}%)`, rough: [215, 255],
      }), [2, 1.78], { bump: 3 });
      break;
    case 'brickTan': // tan/brown modular face brick with light mortar
      t = canvasTex(512, 512, (g, w, h, H, Rf) => bond(g, w, h, H, Rf, {
        rows: 8, cols: 3, joint: 9, mortar: '#b8ad9c', unit: () => `hsl(${27 + rnd() * 9},${15 + rnd() * 9}%,${40 + rnd() * 13}%)`, rough: [215, 255],
      }), [2, 1.78], { bump: 3 });
      break;
    case 'paintbrick': // painted / limewashed brick
      t = canvasTex(512, 512, (g, w, h, H, Rf) => bond(g, w, h, H, Rf, {
        rows: 8, cols: 3, joint: 8, mortar: shade(arg, -0.08), unit: () => shade(arg, (rnd() - 0.5) * 0.06), relief: 45, rough: [200, 240],
      }), [2, 1.78], { bump: 3 });
      break;
    case 'block': // concrete block foundation
      t = canvasTex(512, 512, (g, w, h, H, Rf) => bond(g, w, h, H, Rf, {
        rows: 4, cols: 2, joint: 6, mortar: '#8f8f8a', unit: () => `hsl(40,3%,${62 + rnd() * 8}%)`, relief: 35, chip: 0.6, rough: [230, 255],
      }), [2.66, 2.66], { bump: 2 });
      break;
    case 'subway': // 3x6 subway / zellige tile in a given color
      t = canvasTex(512, 512, (g, w, h, H, Rf) => bond(g, w, h, H, Rf, {
        rows: 8, cols: 4, joint: 5, mortar: shade(arg, -0.15), unit: () => shade(arg, (rnd() - 0.5) * 0.07), relief: 70, rough: [45, 255], chip: 0,
      }), [2, 2], { bump: 3 });
      break;
    case 'droptile':
      t = canvasTex(256, 256, (g, w, h, H) => {
        g.fillStyle = '#efe6d6'; g.fillRect(0, 0, w, h); noise(g, w, h, 6000, 0.06, 1);
        const hg = H(); for (let i = 0; i < 4000; i++) { hg.fillStyle = gray(50 + rnd() * 80); hg.beginPath(); hg.arc(rnd() * w, rnd() * h, R(0.6, 1.4), 0, 7); hg.fill(); }
        g.fillStyle = '#d8ccb6'; g.fillRect(0, 0, w, 6); g.fillRect(0, 0, 6, h);
        hg.fillStyle = gray(30); hg.fillRect(0, 0, w, 6); hg.fillRect(0, 0, 6, h);
      }, [2, 2], { bump: 2, normalScale: 0.6 });
      break;
    case 'tile': // large-format 2 ft tile in a given color
      t = canvasTex(512, 512, (g, w, h, H, Rf) => tiles(g, w, h, H, Rf, { n: 1, grout: shade(arg, -0.1), groutW: 5, tile: () => arg, rough: [85, 255], speck: 0.04 }), [2, 2], { bump: 3 });
      break;
    case 'marble': // white quartz/marble with soft gray veining
    case 'marbleTile':
      t = canvasTex(1024, 1024, (g, w, h, H, Rf) => {
        g.fillStyle = '#f2f1ee'; g.fillRect(0, 0, w, h);
        mottle(g, w, h, 40, 60, 260, 0.04, [255, 255, 255], [150, 150, 155]);
        for (let i = 0; i < 16; i++) {
          let x = rnd() * w, y = rnd() * h;
          const pts = [[x, y]];
          for (let s = 0; s < 14; s++) { x += R(25, 70); y += (rnd() - 0.4) * 70; pts.push([x, y]); }
          for (const [lw, a] of [[R(5, 12), 0.04], [R(0.8, 2.6), 0.1 + rnd() * 0.22]]) {
            g.strokeStyle = `rgba(120,120,128,${a})`; g.lineWidth = lw;
            wrapDraw(w, h, 0, 0, (ox, oy) => { g.beginPath(); pts.forEach(([px, py], k) => (k ? g.lineTo(px % w + ox, py + oy) : g.moveTo(px % w + ox, py + oy))); g.stroke(); });
          }
        }
        if (kind === 'marbleTile') { // polished face, recessed rough joints
          const hg = H(150), rg = Rf(110);
          g.fillStyle = '#d6d6d2'; hg.fillStyle = gray(40); rg.fillStyle = gray(255);
          for (const c of [g, hg, rg]) { c.fillRect(0, 0, w, 4); c.fillRect(0, 0, 4, h); c.fillRect(0, h / 2, w, 4); c.fillRect(w / 2, 0, 4, h); }
        }
      }, kind === 'marble' ? [4, 4] : [2, 2], { bump: 3 });
      break;
    case 'pavers': // bluestone-look rectangular pavers in a running ashlar pattern
      t = canvasTex(512, 512, (g, w, h, H, Rf) => {
        g.fillStyle = '#6f6c66'; g.fillRect(0, 0, w, h);
        const hg = H(40), rg = Rf(255);
        const rows = [128, 84, 128, 172];
        let y = 0;
        for (const rh of rows) {
          let x = -rnd() * 120;
          while (x < w) {
            const pw = [128, 172, 212][Math.floor(rnd() * 3)];
            const col = `hsl(${200 + rnd() * 25},${6 + rnd() * 6}%,${52 + rnd() * 12}%)`;
            const hv = gray(170 + rnd() * 20), rv = gray(200 + rnd() * 40);
            wrapDraw(w, h, x, y, (xx, yy) => {
              g.fillStyle = col; g.fillRect(xx + 3, yy + 3, pw - 6, rh - 6);
              hg.fillStyle = hv; hg.fillRect(xx + 3, yy + 3, pw - 6, rh - 6);
              rg.fillStyle = rv; rg.fillRect(xx + 3, yy + 3, pw - 6, rh - 6);
            });
            x += pw;
          }
          y += rh;
        }
        mottle(g, w, h, 60, 15, 60, 0.06);
        noise(g, w, h, 12000, 0.07, 1);
        noise(hg, w, h, 8000, 0.2, 2);
      }, [6, 6], { bump: 2 });
      break;
    case 'grain': { // stained wood with vertical grain (doors, cabinets, mantel): base color in arg
      t = canvasTex(512, 1024, (g, w, h, H, Rf) => {
        g.fillStyle = arg; g.fillRect(0, 0, w, h);
        const hg = H(128), rg = Rf(235);
        // broad growth-ring bands, then fine streaks; everything runs along v (up the face)
        for (let i = 0; i < 26; i++) {
          const x = rnd() * w, bw = R(14, 54), f = (rnd() - 0.55) * 0.11;
          g.fillStyle = shade(arg, f) + '55';
          wrapDraw(w, h, x, 0, (xx) => {
            g.beginPath(); g.moveTo(xx, 0);
            for (let y = 0; y <= h; y += 32) g.lineTo(xx + Math.sin(y / 140 + i) * 8, y);
            for (let y = h; y >= 0; y -= 32) g.lineTo(xx + bw + Math.sin(y / 140 + i) * 8, y);
            g.fill();
          });
        }
        // cathedral figure (flat-sawn oak, cherry)
        for (let i = 0; i < 5; i++) {
          const cx = rnd() * w, cy = rnd() * h, n = 4 + Math.floor(rnd() * 4);
          for (let k = 1; k <= n; k++) {
            g.strokeStyle = shade(arg, -0.08) + '50'; g.lineWidth = R(1, 2.2);
            const sw = k * R(7, 11), sh = k * R(40, 70);
            wrapDraw(w, h, cx, cy, (xx, yy) => { g.beginPath(); g.moveTo(xx - sw, yy + sh); g.quadraticCurveTo(xx, yy - sh * 0.9, xx + sw, yy + sh); g.stroke(); });
          }
        }
        for (let i = 0; i < 260; i++) {
          const x = rnd() * w, dark = rnd() < 0.75;
          g.strokeStyle = dark ? `rgba(60,25,8,${rnd() * 0.12})` : `rgba(255,230,190,${rnd() * 0.06})`; g.lineWidth = R(0.6, 1.6);
          g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 6, h / 3, x - 6, (2 * h) / 3, x, h); g.stroke();
          if (dark && rnd() < 0.4) { hg.strokeStyle = 'rgba(0,0,0,0.3)'; hg.lineWidth = 1; hg.beginPath(); hg.moveTo(x, 0); hg.bezierCurveTo(x + 6, h / 3, x - 6, (2 * h) / 3, x, h); hg.stroke(); }
        }
        for (let i = 0; i < 40; i++) { rg.fillStyle = gray(R(200, 255)); const x = rnd() * w; rg.fillRect(x, 0, R(10, 50), h); }
        noise(g, w, h, 8000, 0.04, 1);
      }, [1.5, 3], { bump: 1.5, normalScale: 0.4 });
      break;
    }
    case 'plaid': { // kitchen / nook valances: brown, rust and green tartan on tan
      t = canvasTex(256, 256, (g, w, h, H) => {
        g.scale(4, 4);
        g.fillStyle = '#b89a76'; g.fillRect(0, 0, 64, 64);
        const bands = [[0, 14, 'rgba(92,46,32,0.75)'], [20, 4, 'rgba(48,70,52,0.7)'], [30, 10, 'rgba(140,58,40,0.55)'], [46, 2, 'rgba(235,220,190,0.8)'], [52, 6, 'rgba(60,40,30,0.6)']];
        for (const [o, s, c] of bands) { g.fillStyle = c; g.fillRect(o, 0, s, 64); g.fillRect(0, o, 64, s); }
        g.setTransform(1, 0, 0, 1, 0, 0);
        weave(g, H(), w, h);
      }, [0.9, 0.9], { bump: 1.5, normalScale: 0.5 });
      break;
    }
    case 'floral': { // primary bedroom valances: navy ground with dusky roses
      t = canvasTex(256, 256, (g, w, h, H) => {
        g.fillStyle = '#1f2a3f'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 9; i++) {
          const x = rnd() * w, y = rnd() * h, r = (3 + rnd() * 3) * 4;
          wrapDraw(w, h, x, y, (xx, yy) => {
            g.fillStyle = ['#a7525d', '#c98b8c', '#6f7d4e'][i % 3];
            g.beginPath(); g.arc(xx, yy, r, 0, 7); g.fill();
            g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 2; g.beginPath(); g.arc(xx, yy, r * 0.55, 0, 5); g.stroke();
          });
        }
        weave(g, H(), w, h);
      }, [1.2, 1.2], { bump: 1.5, normalScale: 0.5 });
      break;
    }
    case 'gingham': // laundry door shade: green check
      t = canvasTex(64, 64, (g, w, h) => {
        g.fillStyle = '#f2f0e8'; g.fillRect(0, 0, w, h);
        g.fillStyle = 'rgba(30,95,60,0.55)'; g.fillRect(0, 0, 32, h); g.fillRect(0, 0, w, 32);
      }, [0.25, 0.25]);
      break;
    case 'spotRug': // family room rug: soft gray ground with cream "fawn spot" pattern
      t = canvasTex(512, 512, (g, w, h, H) => {
        g.fillStyle = '#9d9991'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 90; i++) {
          const x = rnd() * w, y = rnd() * h, rx = (2 + rnd() * 3.5) * 4, ry = (1.5 + rnd() * 2) * 4, a = rnd() * 3;
          g.fillStyle = '#d6d0c4';
          wrapDraw(w, h, x, y, (xx, yy) => { g.beginPath(); g.ellipse(xx, yy, rx, ry, a, 0, 7); g.fill(); });
        }
        const hg = H();
        for (let i = 0; i < w * h / 3; i++) { const x = rnd() * w, y = rnd() * h; g.fillStyle = rnd() < 0.5 ? `rgba(0,0,0,${rnd() * 0.08})` : `rgba(255,255,255,${rnd() * 0.07})`; g.fillRect(x, y, 1.5, 1.5); hg.fillStyle = gray(60 + rnd() * 140); hg.fillRect(x, y, 2, 2); }
      }, [2.5, 2.5], { bump: 1.2, normalScale: 0.5 });
      break;
    case 'felt':
      t = canvasTex(256, 256, (g, w, h, H) => {
        g.fillStyle = '#1f6b46'; g.fillRect(0, 0, w, h); noise(g, w, h, 12000, 0.06, 1);
        const hg = H(); for (let i = 0; i < 12000; i++) { hg.fillStyle = gray(90 + rnd() * 80); hg.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); }
      }, [2, 2], { bump: 0.8, normalScale: 0.4 });
      break;
    case 'bnb': // vertical board and batten (12" boards, 2" battens)
      t = canvasTex(512, 256, (g, w, h, H) => {
        g.fillStyle = arg; g.fillRect(0, 0, w, h);
        noise(g, w, h, 4000, 0.035, 1);
        const hg = H(60);
        for (let i = 0; i < 2; i++) {
          const x = i * 256;
          g.fillStyle = shade(arg, 0.04); g.fillRect(x, 0, 36, h);
          g.fillStyle = shade(arg, -0.12); g.fillRect(x + 36, 0, 5, h);
          hg.fillStyle = gray(200); hg.fillRect(x, 0, 36, h);
          hg.fillStyle = gray(140); hg.fillRect(x, 0, 3, h); hg.fillRect(x + 33, 0, 3, h);
        }
      }, [2, 1], { bump: 4 });
      break;
    case 'shake': // cedar shake panel, stained
      t = canvasTex(512, 512, (g, w, h, H) => {
        g.fillStyle = shade(arg, -0.1); g.fillRect(0, 0, w, h);
        const hg = H(0);
        for (let r = 0; r < 4; r++) {
          let x = -rnd() * 80;
          while (x < w) {
            const tw = R(48, 120), col = shade(arg, (rnd() - 0.5) * 0.06);
            wrapDraw(w, h, x, 0, fixed((xx) => {
              g.fillStyle = col; g.fillRect(xx + 3, r * 128 + 3, tw - 6, 122);
              for (let k = 0; k < 8; k++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.08})`; g.fillRect(xx + 3 + rnd() * (tw - 8), r * 128 + 3, 1.2, 122); }
              const hgrd = hg.createLinearGradient(0, r * 128, 0, r * 128 + 128);
              hgrd.addColorStop(0, gray(50)); hgrd.addColorStop(1, gray(170));
              hg.fillStyle = hgrd; hg.fillRect(xx + 3, r * 128 + 3, tw - 6, 122);
            }));
            x += tw;
          }
          g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, r * 128 + 120, w, 8);
        }
      }, [2.2, 2.2], { bump: 4 });
      break;
    case 'stone': // light ledgestone / limestone veneer
      t = canvasTex(1024, 512, (g, w, h, H) => {
        g.fillStyle = '#9a948a'; g.fillRect(0, 0, w, h);
        const hg = H(40);
        let y = 0;
        while (y < h) {
          const rh = Math.min(R(40, 96), h - y < 50 ? h - y : Infinity); let x = -rnd() * 120;
          while (x < w) {
            const pw = R(120, 360), col = `hsl(${35 + rnd() * 10},${8 + rnd() * 8}%,${70 + rnd() * 14}%)`, hv = R(150, 210);
            wrapDraw(w, h, x, y, (xx, yy) => {
              g.fillStyle = col; g.fillRect(xx + 5, yy + 5, pw - 10, rh - 10);
              hg.fillStyle = gray(hv); hg.fillRect(xx + 5, yy + 5, pw - 10, rh - 10);
            });
            x += pw;
          }
          y += rh;
        }
        mottle(g, w, h, 80, 20, 80, 0.07);
        noise(g, w, h, 30000, 0.06, 1); noise(hg, w, h, 30000, 0.25, 2);
      }, [4, 2], { bump: 3 });
      break;
    case 'tileFoyer': // 13" pale beige ceramic set square, clipped corners with a 3" taupe diamond insert at every other joint (photos 05-06)
      t = canvasTex(512, 512, (g, w, h, H, Rf) => {
        const n = 2, s = w / n, c = s * 0.13, hg = H(100), rg = Rf(255);
        g.fillStyle = '#c9bfb0'; g.fillRect(0, 0, w, h); // grout
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
          const x = i * s, y = j * s;
          g.fillStyle = `hsl(36,${13 + rnd() * 5}%,${83 + rnd() * 3}%)`;
          g.fillRect(x + 3, y + 3, s - 6, s - 6);
          for (let k = 0; k < 160; k++) { g.fillStyle = `rgba(150,130,105,${rnd() * 0.05})`; g.fillRect(x + rnd() * s, y + rnd() * s, R(12, 28), R(6, 16)); }
          hg.fillStyle = gray(150); hg.fillRect(x + 3, y + 3, s - 6, s - 6);
          rg.fillStyle = gray(R(80, 95)); rg.fillRect(x + 3, y + 3, s - 6, s - 6);
        }
        // the insert joint is at the canvas center (s, s): the four tiles around it are clipped there
        const diamond = (ctx, r, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(s, s - r); ctx.lineTo(s + r, s); ctx.lineTo(s, s + r); ctx.lineTo(s - r, s); ctx.closePath(); ctx.fill(); };
        diamond(g, c + 2, '#c9bfb0'); diamond(hg, c + 2, gray(100)); diamond(rg, c + 2, gray(255));
        diamond(g, c - 3, '#b8aa96'); diamond(hg, c - 3, gray(150)); diamond(rg, c - 3, gray(90));
        noise(g, w, h, 5000, 0.03, 1);
      }, [2.2, 2.2], { bump: 3 });
      break;
    case 'vinylDiamond': // hall bath sheet vinyl: white with gray diamonds
      t = canvasTex(512, 512, (g, w, h, H) => {
        g.scale(4, 4);
        g.fillStyle = '#ecebe6'; g.fillRect(0, 0, 128, 128);
        g.fillStyle = '#8f949a';
        for (const [cx, cy] of [[0, 0], [64, 64], [128, 0], [0, 128], [128, 128]]) { g.beginPath(); g.moveTo(cx, cy - 22); g.lineTo(cx + 22, cy); g.lineTo(cx, cy + 22); g.lineTo(cx - 22, cy); g.fill(); }
        g.fillStyle = '#d6d6d2'; g.fillRect(0, 0, 128, 0.5); g.fillRect(0, 0, 0.5, 128); g.fillRect(0, 64, 128, 0.5); g.fillRect(64, 0, 0.5, 128);
        g.setTransform(1, 0, 0, 1, 0, 0); noise(g, w, h, 8000, 0.03, 1);
        const hg = H(); noise(hg, w, h, 20000, 0.15, 2);
      }, [1.25, 1.25], { bump: 0.8, normalScale: 0.4 }); // ~4.5" gray diamonds on 7.5" centers (photo 33)
      break;
    case 'blackMarble': // black marble with white veining (fireplace surround)
      t = canvasTex(1024, 1024, (g, w, h, H, Rf) => {
        g.fillStyle = '#1b1c1e'; g.fillRect(0, 0, w, h);
        mottle(g, w, h, 40, 60, 200, 0.05, [90, 90, 95], [0, 0, 0]);
        for (let i = 0; i < 22; i++) {
          let x = rnd() * w, y = rnd() * h; const pts = [[x, y]];
          for (let s = 0; s < 10; s++) { x += (rnd() - 0.3) * 120; y += R(40, 100); pts.push([x, y]); }
          for (const [lw, a] of [[R(4, 9), 0.05], [R(0.6, 2.4), 0.12 + rnd() * 0.3]]) {
            g.strokeStyle = `rgba(230,230,230,${a})`; g.lineWidth = lw;
            wrapDraw(w, h, 0, 0, (ox, oy) => { g.beginPath(); pts.forEach(([px, py], k) => (k ? g.lineTo(px + ox, (py % h) + oy) : g.moveTo(px + ox, (py % h) + oy))); g.stroke(); });
          }
        }
      }, [3, 3]); // polish comes from the material roughness
      break;
    case 'laminate': // speckled laminate counter
      t = canvasTex(256, 256, (g, w, h, H) => {
        g.fillStyle = arg || '#8d9093'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 16000; i++) { const v = rnd(); g.fillStyle = v < 0.45 ? `rgba(0,0,0,${rnd() * 0.22})` : v < 0.9 ? `rgba(255,255,255,${rnd() * 0.18})` : `rgba(120,90,60,${rnd() * 0.2})`; g.fillRect(rnd() * w, rnd() * h, R(1, 2.4), R(1, 2.4)); }
        noise(H(), w, h, 6000, 0.2, 2);
      }, [1.5, 1.5], { bump: 0.6, normalScale: 0.3 });
      break;
    case 'vinylBeige': // laundry / half bath sheet vinyl: beige 12" tile look
      t = canvasTex(512, 512, (g, w, h, H, Rf) => tiles(g, w, h, H, Rf, { n: 2, grout: '#cbbfa8', groutW: 4, tile: () => `hsl(40,${30 + R(-3, 3)}%,${84 + R(-1.5, 1.5)}%)`, rough: [120, 200], relief: 20 }), [2, 2], { bump: 1.5 });
      break;
    default:
      throw new Error('unknown texture ' + name);
  }
  t.name = name;
  cache[name] = t;
  return t;
}

// fine plain-weave relief for printed fabrics
function weave(g, hg, w, h) {
  for (let y = 0; y < h; y += 2) { hg.fillStyle = gray(y % 4 ? 110 : 150); hg.fillRect(0, y, w, 1); }
  for (let x = 0; x < w; x += 2) { hg.fillStyle = `rgba(${x % 4 ? '0,0,0' : '255,255,255'},0.3)`; hg.fillRect(x, 0, 1, h); }
  noise(g, w, h, w * h / 8, 0.05, 1);
}
