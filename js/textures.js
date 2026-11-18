// Procedural canvas textures. Geometry carries UVs in feet, and each texture's
// repeat is set so one tile = `size` feet, so patterns stay to scale.
// Parameterized names: 'faux:#hex' (sponge-painted wall), 'carpet:#hex', 'paint:#hex'.
import * as THREE from 'three';

function canvasTex(w, h, draw, sizeFt) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.repeat.set(1 / sizeFt[0], 1 / sizeFt[1]);
  return t;
}
function noise(g, w, h, amt, alpha = 0.08, size = 2) {
  for (let i = 0; i < amt; i++) {
    const v = Math.random() < 0.5 ? 0 : 255;
    g.fillStyle = `rgba(${v},${v},${v},${Math.random() * alpha})`;
    g.fillRect(Math.random() * w, Math.random() * h, size, size);
  }
}
// draw on a canvas so the pattern wraps seamlessly
function wrapDraw(w, h, x, y, fn) {
  for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) fn(x + dx, y + dy);
}
function shade(hex, f) {
  const c = new THREE.Color(hex);
  const hsl = {}; c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + f)));
  return '#' + c.getHexString();
}

const cache = {};
export function tex(name) {
  if (cache[name]) return cache[name];
  const [kind, arg] = name.split(':');
  let t;
  switch (kind) {
    case 'siding': // white vinyl lap siding, ~4.5" exposure, with a faint woodgrain
      t = canvasTex(128, 128, (g, w, h) => {
        for (let i = 0; i < 4; i++) {
          const y = i * 32;
          const grd = g.createLinearGradient(0, y, 0, y + 32);
          grd.addColorStop(0, '#cfd0cb'); grd.addColorStop(0.12, '#f8f8f4'); grd.addColorStop(1, '#ebebe6');
          g.fillStyle = grd; g.fillRect(0, y, w, 32);
        }
        noise(g, w, h, 500, 0.04, 1);
      }, [1.5, 1.5]);
      break;
    case 'shingle': // architectural (laminated) shingles, weathered wood gray
      t = canvasTex(256, 128, (g, w, h) => {
        g.fillStyle = '#4f5359'; g.fillRect(0, 0, w, h);
        for (let r = 0; r < 4; r++) {
          let x = -Math.random() * 40;
          while (x < w) {
            const tw = 18 + Math.random() * 30;
            g.fillStyle = `hsl(215,${4 + Math.random() * 5}%,${27 + Math.random() * 14}%)`;
            g.fillRect(x + 1, r * 32 + 1, tw - 2, 30 - Math.random() * 8);
            x += tw;
          }
          g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(0, r * 32 + 29, w, 3);
        }
        noise(g, w, h, 2500, 0.18, 1);
      }, [3, 1.66]);
      break;
    case 'oak': // red oak strip flooring, 2.25" boards, honey-orange finish
      t = canvasTex(256, 256, (g, w, h) => {
        const rows = 14, rh = h / rows;
        for (let r = 0; r < rows; r++) {
          let x = -Math.random() * 200;
          while (x < w + 200) {
            const len = 90 + Math.random() * 170;
            g.fillStyle = `hsl(${24 + Math.random() * 7},${58 + Math.random() * 12}%,${44 + Math.random() * 12}%)`;
            wrapDraw(w, h, x, r * rh, (xx, yy) => g.fillRect(xx, yy, len, rh));
            g.fillStyle = 'rgba(70,30,10,0.45)';
            wrapDraw(w, h, x, r * rh, (xx, yy) => g.fillRect(xx, yy, 1, rh));
            x += len;
          }
          g.fillStyle = 'rgba(70,30,10,0.35)'; g.fillRect(0, r * rh, w, 1);
        }
        for (let i = 0; i < 500; i++) {
          g.strokeStyle = `rgba(100,45,15,${Math.random() * 0.18})`;
          g.beginPath(); const y = Math.random() * h; g.moveTo(0, y); g.bezierCurveTo(w / 3, y + 2, (2 * w) / 3, y - 2, w, y); g.stroke();
        }
      }, [4, 2.6]);
      break;
    case 'carpet':
      t = canvasTex(128, 128, (g, w, h) => {
        g.fillStyle = arg; g.fillRect(0, 0, w, h);
        noise(g, w, h, 6000, 0.1, 1);
      }, [2, 2]);
      break;
    case 'berber':
      t = canvasTex(128, 128, (g, w, h) => {
        g.fillStyle = '#d6c0a2'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 5000; i++) {
          g.fillStyle = Math.random() < 0.5 ? 'rgba(140,100,60,0.18)' : 'rgba(255,245,230,0.25)';
          g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
        }
      }, [2, 2]);
      break;
    case 'faux': // sponge-painted walls (living, family, primary bedroom)
      t = canvasTex(256, 256, (g, w, h) => {
        g.fillStyle = arg; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 260; i++) {
          const x = Math.random() * w, y = Math.random() * h, r = 8 + Math.random() * 30;
          const col = Math.random() < 0.5 ? shade(arg, 0.06) : shade(arg, -0.07);
          wrapDraw(w, h, x, y, (xx, yy) => {
            const grd = g.createRadialGradient(xx, yy, 0, xx, yy, r);
            grd.addColorStop(0, col + 'aa'); grd.addColorStop(1, col + '00');
            g.fillStyle = grd; g.beginPath(); g.arc(xx, yy, r, 0, Math.PI * 2); g.fill();
          });
        }
        noise(g, w, h, 1500, 0.04, 1);
      }, [5, 5]);
      break;
    case 'paint': // flat paint with the faintest orange-peel texture
      t = canvasTex(64, 64, (g, w, h) => {
        g.fillStyle = arg; g.fillRect(0, 0, w, h); noise(g, w, h, 500, 0.025, 1);
      }, [2, 2]);
      break;
    case 'ivy': // kitchen & nook wallpaper: small trailing vine on cream
      t = canvasTex(256, 256, (g, w, h) => {
        g.fillStyle = '#f2eee4'; g.fillRect(0, 0, w, h);
        const leaf = (x, y, a, col) => wrapDraw(w, h, x, y, (xx, yy) => {
          g.save(); g.translate(xx, yy); g.rotate(a); g.fillStyle = col;
          g.beginPath(); g.ellipse(0, 0, 4.5, 2.0, 0, 0, Math.PI * 2); g.fill(); g.restore();
        });
        for (let v = 0; v < 16; v++) {
          let x = Math.random() * w, y = Math.random() * h, a = Math.random() * Math.PI * 2;
          g.strokeStyle = 'rgba(125,116,102,0.7)'; g.lineWidth = 0.8;
          for (let s = 0; s < 16; s++) {
            const nx = x + Math.cos(a) * 5, ny = y + Math.sin(a) * 5;
            wrapDraw(w, h, 0, 0, (ox, oy) => { g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(nx + ox, ny + oy); g.stroke(); });
            if (s % 2 === 0) leaf(nx, ny, a + (Math.random() < 0.5 ? 0.9 : -0.9), Math.random() < 0.7 ? '#66625a' : '#8a857a');
            if (s % 7 === 3) wrapDraw(w, h, nx + 3, ny + 3, (xx, yy) => { g.fillStyle = '#8c3b3b'; g.beginPath(); g.arc(xx, yy, 1.8, 0, 7); g.fill(); });
            x = nx; y = ny; a += (Math.random() - 0.5) * 0.9;
          }
        }
      }, [2, 2]);
      break;
    case 'grid': // garage hall wallpaper: fine burgundy grid on beige
      t = canvasTex(128, 128, (g, w, h) => {
        g.fillStyle = '#e8dcc6'; g.fillRect(0, 0, w, h);
        g.fillStyle = 'rgba(120,50,45,0.55)';
        for (let i = 0; i < 4; i++) { g.fillRect(i * 32, 0, 2, h); g.fillRect(0, i * 32, w, 2); }
        g.fillStyle = 'rgba(120,50,45,0.2)';
        for (let i = 0; i < 4; i++) { g.fillRect(i * 32 + 16, 0, 1, h); g.fillRect(0, i * 32 + 16, w, 1); }
      }, [1, 1]);
      break;
    case 'tileBeige': // 12" ceramic floor tile
      t = canvasTex(128, 128, (g, w, h) => {
        g.fillStyle = '#e1cfb1'; g.fillRect(0, 0, w, h); noise(g, w, h, 1500, 0.06);
        g.fillStyle = '#b8a487'; g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h);
      }, [1, 1]);
      break;
    case 'tile4': // 4" wall tile, peach-beige (primary bath tub deck & shower)
      t = canvasTex(128, 128, (g, w, h) => {
        g.fillStyle = '#ddbfa3'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
          g.fillStyle = `hsl(28,${38 + Math.random() * 8}%,${73 + Math.random() * 6}%)`;
          g.fillRect(i * 42.6 + 2, j * 42.6 + 2, 39, 39);
        }
      }, [1, 1]);
      break;
    case 'tileGray': // hall bath tub surround: large gray stone-look tile with a border
      t = canvasTex(128, 128, (g, w, h) => {
        g.fillStyle = '#b7b2aa'; g.fillRect(0, 0, w, h); noise(g, w, h, 2500, 0.08);
        g.fillStyle = '#9b968e'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h);
      }, [1, 1]);
      break;
    case 'backsplash': // kitchen: diagonal beige tile
      t = canvasTex(128, 128, (g, w, h) => {
        g.fillStyle = '#a99c8b'; g.fillRect(0, 0, w, h);
        g.save(); g.translate(w / 2, h / 2); g.rotate(Math.PI / 4);
        for (let i = -3; i < 3; i++) for (let j = -3; j < 3; j++) {
          g.fillStyle = `hsl(35,${12 + Math.random() * 6}%,${66 + Math.random() * 8}%)`;
          g.fillRect(i * 45 + 2, j * 45 + 2, 41, 41);
        }
        g.restore();
      }, [0.9, 0.9]);
      break;
    case 'slate':
      t = canvasTex(128, 128, (g, w, h) => {
        g.fillStyle = '#353b40'; g.fillRect(0, 0, w, h);
        noise(g, w, h, 2500, 0.12);
        g.strokeStyle = '#8f979c'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w / 2, 0); g.moveTo(w / 2, h); g.lineTo(w, h / 2);
        g.moveTo(0, h / 2); g.lineTo(w / 2, h); g.moveTo(w / 2, 0); g.lineTo(w, h / 2); g.stroke();
      }, [2.2, 2.2]);
      break;
    case 'concrete':
      t = canvasTex(128, 128, (g, w, h) => {
        g.fillStyle = '#b7b5b0'; g.fillRect(0, 0, w, h); noise(g, w, h, 3000, 0.08);
      }, [6, 6]);
      break;
    case 'paving':
      t = canvasTex(128, 128, (g, w, h) => {
        g.fillStyle = '#cfcbc3'; g.fillRect(0, 0, w, h); noise(g, w, h, 3000, 0.07);
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 0, w, 1); g.fillRect(0, 0, 1, h);
      }, [8, 8]);
      break;
    case 'asphalt':
      t = canvasTex(128, 128, (g, w, h) => {
        g.fillStyle = '#4a4b4d'; g.fillRect(0, 0, w, h); noise(g, w, h, 5000, 0.15);
      }, [6, 6]);
      break;
    case 'grass':
      t = canvasTex(256, 256, (g, w, h) => {
        g.fillStyle = '#5c8d37'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 12000; i++) {
          g.fillStyle = `hsla(${85 + Math.random() * 25},${40 + Math.random() * 25}%,${24 + Math.random() * 26}%,0.5)`;
          g.fillRect(Math.random() * w, Math.random() * h, 1, 3);
        }
      }, [10, 10]);
      break;
    case 'mulch':
      t = canvasTex(128, 128, (g, w, h) => {
        g.fillStyle = '#5e4130'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 2500; i++) {
          g.fillStyle = `hsl(${18 + Math.random() * 10},${35 + Math.random() * 20}%,${20 + Math.random() * 20}%)`;
          g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 4, 1 + Math.random() * 2);
        }
      }, [3, 3]);
      break;
    case 'brick':
      t = canvasTex(128, 128, (g, w, h) => {
        g.fillStyle = '#cfc4b2'; g.fillRect(0, 0, w, h);
        for (let r = 0; r < 8; r++) for (let c = -1; c < 3; c++) {
          g.fillStyle = `hsl(${10 + Math.random() * 8},${45 + Math.random() * 10}%,${30 + Math.random() * 10}%)`;
          g.fillRect(c * 64 + (r % 2) * 32 + 2, r * 16 + 2, 60, 13);
        }
      }, [1.4, 1.4]);
      break;
    case 'block':
      t = canvasTex(128, 128, (g, w, h) => {
        g.fillStyle = '#8f8f8a'; g.fillRect(0, 0, w, h);
        for (let r = 0; r < 4; r++) for (let c = -1; c < 2; c++) {
          g.fillStyle = `hsl(40,3%,${62 + Math.random() * 8}%)`;
          g.fillRect(c * 128 + (r % 2) * 64 + 2, r * 32 + 2, 124, 29);
        }
        noise(g, w, h, 1500, 0.1);
      }, [2.66, 2.66]);
      break;
    case 'droptile':
      t = canvasTex(64, 64, (g, w, h) => {
        g.fillStyle = '#efe6d6'; g.fillRect(0, 0, w, h); noise(g, w, h, 600, 0.06);
        g.fillStyle = '#d8ccb6'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h);
      }, [2, 2]);
      break;
    case 'plank': // wide-plank hardwood in a given base color (5" boards)
      t = canvasTex(256, 256, (g, w, h) => {
        const rows = 10, rh = h / rows;
        for (let r = 0; r < rows; r++) {
          let x = -Math.random() * 200;
          while (x < w + 200) {
            const len = 140 + Math.random() * 220;
            g.fillStyle = shade(arg, (Math.random() - 0.5) * 0.08);
            wrapDraw(w, h, x, r * rh, (xx, yy) => g.fillRect(xx, yy, len, rh));
            g.fillStyle = 'rgba(40,25,10,0.28)';
            wrapDraw(w, h, x, r * rh, (xx, yy) => g.fillRect(xx, yy, 1, rh));
            x += len;
          }
          g.fillStyle = 'rgba(40,25,10,0.22)'; g.fillRect(0, r * rh, w, 1);
        }
        for (let i = 0; i < 380; i++) {
          g.strokeStyle = `rgba(60,35,15,${Math.random() * 0.1})`;
          g.beginPath(); const y = Math.random() * h; g.moveTo(0, y); g.bezierCurveTo(w / 3, y + 2, (2 * w) / 3, y - 2, w, y); g.stroke();
        }
      }, [5, 4.2]);
      break;
    case 'tile': // large-format 2 ft tile in a given color
      t = canvasTex(128, 128, (g, w, h) => {
        g.fillStyle = arg; g.fillRect(0, 0, w, h); noise(g, w, h, 1200, 0.05);
        g.fillStyle = shade(arg, -0.1); g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h);
      }, [2, 2]);
      break;
    case 'marble': // white quartz/marble with soft gray veining
    case 'marbleTile':
      t = canvasTex(256, 256, (g, w, h) => {
        g.fillStyle = '#f2f1ee'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 9; i++) {
          g.strokeStyle = `rgba(120,120,125,${0.08 + Math.random() * 0.18})`; g.lineWidth = 0.6 + Math.random() * 1.6;
          let x = Math.random() * w, y = Math.random() * h;
          g.beginPath(); g.moveTo(x, y);
          for (let s = 0; s < 8; s++) { x += 20 + Math.random() * 30; y += (Math.random() - 0.4) * 40; g.lineTo(x % (w + 40), y); }
          g.stroke();
        }
        if (kind === 'marbleTile') { g.fillStyle = '#d6d6d2'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h); g.fillRect(0, h / 2, w, 2); }
      }, kind === 'marble' ? [4, 4] : [2, 2]);
      break;
    case 'subway': // 3x6 subway / zellige tile in a given color
      t = canvasTex(128, 128, (g, w, h) => {
        g.fillStyle = shade(arg, -0.15); g.fillRect(0, 0, w, h);
        for (let r = 0; r < 4; r++) for (let c = -1; c < 3; c++) {
          g.fillStyle = shade(arg, (Math.random() - 0.5) * 0.07);
          g.fillRect(c * 64 + (r % 2) * 32 + 1.5, r * 32 + 1.5, 61, 29);
        }
      }, [1, 1]);
      break;
    case 'paintbrick': // painted / limewashed brick
      t = canvasTex(128, 128, (g, w, h) => {
        g.fillStyle = shade(arg, -0.08); g.fillRect(0, 0, w, h);
        for (let r = 0; r < 8; r++) for (let c = -1; c < 3; c++) {
          g.fillStyle = shade(arg, (Math.random() - 0.5) * 0.06);
          g.fillRect(c * 64 + (r % 2) * 32 + 2, r * 16 + 2, 60, 13);
        }
        noise(g, w, h, 900, 0.05);
      }, [1.4, 1.4]);
      break;
    case 'pavers': // bluestone-look rectangular pavers in a running ashlar pattern
      t = canvasTex(256, 256, (g, w, h) => {
        g.fillStyle = '#6f6c66'; g.fillRect(0, 0, w, h);
        const rows = [64, 42, 64, 86];
        let y = 0;
        for (const rh of rows) {
          let x = -Math.random() * 60;
          while (x < w) {
            const pw = [64, 86, 106][Math.floor(Math.random() * 3)];
            g.fillStyle = `hsl(${200 + Math.random() * 25},${6 + Math.random() * 6}%,${52 + Math.random() * 12}%)`;
            wrapDraw(w, h, x, y, (xx, yy) => g.fillRect(xx + 2, yy + 2, pw - 4, rh - 4));
            x += pw;
          }
          y += rh;
        }
        noise(g, w, h, 2500, 0.07);
      }, [6, 6]);
      break;
    case 'felt':
      t = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#1f6b46'; g.fillRect(0, 0, w, h); noise(g, w, h, 900, 0.08, 1); }, [2, 2]);
      break;
    default:
      throw new Error('unknown texture ' + name);
  }
  cache[name] = t;
  return t;
}
