import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { Look } from './render.js';
import { buildHouse, roomAtPoint, DOORS } from './build.js';
import { CONTROLS, PRESETS as STYLE_PRESETS, DEFAULT_PRESET, applyStyle } from './themes.js';
import { EXT_CONTROLS, EXT_PRESETS, applyExterior } from './exterior.js';
import { RENO_LABELS, RENO_ROOMS } from './reno.js';
import { buildSite } from './site.js';
import { PHYS, pip, V, addSolid, addFloorPoly, applyFinish, ORIGIN } from './geom.js';
import { LOT, LATITUDE, X_AZ, toFt } from './data.js';

// ------------------------------------------------------------------ renderer & scene
const app = document.getElementById('app');
// tone mapping, exposure, shadows and the post pipeline are set up by Look (render.js)
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
app.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.className = 'labels';
app.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene(); // sky dome, fog and environment maps come from Look

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.2, 2000);
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.maxPolarAngle = Math.PI * 0.495;
orbit.minDistance = 4;
orbit.maxDistance = 500;

const hemi = new THREE.HemisphereLight('#dbe9f6', '#b3a68e', 0.55);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff4e0', 2.4);
sun.castShadow = true; // shadow camera bounds, bias and map size: Look.fitShadow / setQuality
const sunTarget = new THREE.Object3D();
sunTarget.position.set(30, 0, 25);
scene.add(sunTarget);
sun.target = sunTarget;
scene.add(sun);
const fill = new THREE.AmbientLight('#fff8ee', 0.2); // a little extra interior bounce light
scene.add(fill);

// ------------------------------------------------------------------ model
const { house, groups, furn, labels, renos } = buildHouse();
scene.add(house);
const site = buildSite();
scene.add(site);
const trees = site.getObjectByName('trees');
// the shadow camera covers the lot (house + yard), not the neighbours
const lotBox = new THREE.Box3().setFromObject(house);
lotBox.expandByPoint(V(LOT.xSouth - 12, -12, LOT.zBack - 12)).expandByPoint(V(LOT.xNorth + 12, lotBox.max.y + 4, LOT.zFront + 12));
const gfx = new Look({ renderer, scene, camera, sun, hemi, fill, house, bounds: lotBox });
const lotLines = site.getObjectByName('lotLines');

// ------------------------------------------------------------------ state & UI wiring
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const state = {
  view: 'ext', labels: true, furniture: true, mode: 'orbit', layout: '0',
  reno: { kitchen: false, openLiving: false, frontOffice: false, frontDining: false, refresh: false, pbath: false, mud: false, facade: false, classic: false, patio: false, play: false },
  style: { ...STYLE_PRESETS[DEFAULT_PRESET].values },
  ext: { ...EXT_PRESETS.listed.values },
};
const STORE = 'creekside-options';
// renovations always start off so the house opens as it is today; the interior style is remembered
try { const saved = JSON.parse(localStorage.getItem(STORE) || 'null'); if (saved && saved.style) for (const k of Object.keys(state.style)) if (saved.style[k] !== undefined) state.style[k] = saved.style[k]; if (saved && saved.ext) for (const k of Object.keys(state.ext)) if (saved.ext[k] !== undefined) state.ext[k] = saved.ext[k]; } catch {}
const saveOptions = () => { try { localStorage.setItem(STORE, JSON.stringify({ reno: state.reno, layout: state.layout, style: state.style, ext: state.ext })); } catch {} };

function isVisible(o) {
  for (let p = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}

const PRESETS = {
  ext: { pos: [100, 46, 122], tgt: [28, 8, 30] },
  f2: { pos: [30, 96, 92], tgt: [30, 10, 30] },
  f1: { pos: [30, 86, 90], tgt: [30, 0, 30] },
  b: { pos: [30, 74, 84], tgt: [30, -9, 28] },
};
let tween = null;
function flyTo(p) {
  tween = { t: 0, fromP: camera.position.clone(), fromT: orbit.target.clone(), toP: V(...p.pos), toT: V(...p.tgt) };
}

function applyView() {
  const v = state.view;
  groups.roof.visible = v === 'ext';
  groups.f2.visible = v === 'ext' || v === 'f2';
  groups.f1.visible = v !== 'b';
  groups.b.visible = true;
  const showLabels = (lv) => state.labels && state.mode === 'orbit' && v === lv;
  for (const id of ['b', 'f1', 'f2']) {
    furn[id].visible = state.furniture;
    for (const l of labels[id]) l.visible = showLabels(id) && !HIDE_LABELS.some(([r, n]) => state.reno[r] && n.test(l.userData.name)) && !(id === 'b' && state.layout === 'D' && /^(Hall|Recreation Room)$/.test(l.userData.name)) && !(id === 'b' && state.layout !== '0' && /roughed in/.test(l.userData.name));
  }
  for (const l of RENO_LABELS) l.visible = showLabels(l.userData.level) && activeTag(l.userData.rs);
  $$('.views button').forEach((b) => b.classList.toggle('on', b.dataset.view === v));
  gfx.dirty();
}
function setView(v, fly = true) {
  state.view = v;
  applyView();
  if (fly) flyTo(PRESETS[v]);
}
$$('.views button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
$('#tgl-furn').addEventListener('change', (e) => { state.furniture = e.target.checked; applyReno(); });
$('#tgl-labels').addEventListener('change', (e) => { state.labels = e.target.checked; applyView(); });
$('#tgl-trees').addEventListener('change', (e) => { trees.visible = e.target.checked; gfx.dirty(); });
$('#tgl-lot').addEventListener('change', (e) => { lotLines.visible = e.target.checked; });
$('#panel-toggle').addEventListener('click', () => document.body.classList.toggle('collapsed'));

// ------------------------------------------------------------------ renovations
const renoSets = [...renos, ...(site.userData.renos || [])];
// labels of as-built rooms a renovation relabels
const HIDE_LABELS = [['kitchen', /^(Kitchen|Dining Area)$/], ['pbath', /^Primary Bath$/], ['mud', /^Laundry$/]];
// exterior finishes come from the exterior style (exterior.js); the facade renovations pick their matching preset
function applyReno() {
  for (const g of renoSets) g.visible = activeTag(g.userData.rs);
  document.querySelectorAll('[data-reno]').forEach((el) => { el.checked = !!state.reno[el.dataset.reno]; });
  document.querySelectorAll('[name=basement-layout]').forEach((r) => { r.checked = r.value === state.layout; });
  $('#suggested').checked = isSuggested();
  applyView();
  saveOptions();
}
document.querySelectorAll('[data-reno]').forEach((el) => el.addEventListener('change', () => {
  state.reno[el.dataset.reno] = el.checked;
  // the two exterior looks are alternatives
  if (el.checked && el.dataset.reno === 'facade') state.reno.classic = false;
  if (el.checked && el.dataset.reno === 'classic') state.reno.facade = false;
  // so are the two front-room uses
  if (el.checked && el.dataset.reno === 'frontOffice') state.reno.frontDining = false;
  if (el.checked && el.dataset.reno === 'frontDining') state.reno.frontOffice = false;
  if (el.dataset.reno === 'facade' || el.dataset.reno === 'classic') syncExtToFacade();
  applyReno();
}));
// one switch for the whole suggested plan (basement: open plan, layout D)
const SUGGESTED = ['kitchen', 'frontOffice', 'refresh', 'pbath', 'mud', 'classic', 'patio', 'play'];
const isSuggested = () => Object.keys(state.reno).every((k) => !!state.reno[k] === SUGGESTED.includes(k)) && state.layout === 'D';
$('#suggested').addEventListener('change', (e) => {
  for (const k of Object.keys(state.reno)) state.reno[k] = e.target.checked && SUGGESTED.includes(k);
  state.layout = e.target.checked ? 'D' : '0';
  syncExtToFacade();
  applyReno();
});
// turning a facade renovation on picks its exterior preset; turning both off returns an untouched preset to As listed
function syncExtToFacade() {
  const is = (id) => Object.entries(EXT_PRESETS[id].values).every(([k, v]) => state.ext[k] === v);
  if (state.reno.facade) state.ext = { ...EXT_PRESETS.modern.values };
  else if (state.reno.classic) state.ext = { ...EXT_PRESETS.classic.values };
  else if (is('modern') || is('classic')) state.ext = { ...EXT_PRESETS.listed.values };
  applyExterior(state.ext); renderExt();
}

// ------------------------------------------------------------------ interior style
function renderStyle() {
  const pre = $('#style-presets');
  pre.innerHTML = '';
  for (const [id, p] of Object.entries(STYLE_PRESETS)) {
    const b = document.createElement('button');
    b.textContent = p.label;
    const match = Object.entries(p.values).every(([k, v]) => state.style[k] === v);
    b.className = match ? 'on' : '';
    b.addEventListener('click', () => { state.style = { ...p.values }; applyStyle(state.style); renderStyle(); saveOptions(); });
    pre.appendChild(b);
  }
  const box = $('#style-controls');
  box.innerHTML = '';
  for (const c of CONTROLS) {
    const lab = document.createElement('label');
    lab.textContent = c.label;
    const sel = document.createElement('select');
    for (const [val, name] of c.options) { const o = document.createElement('option'); o.value = val; o.textContent = name; sel.appendChild(o); }
    sel.value = state.style[c.id];
    sel.addEventListener('change', () => { state.style[c.id] = sel.value; applyStyle(state.style); renderStyle(); saveOptions(); });
    lab.appendChild(sel);
    box.appendChild(lab);
  }
}
applyStyle(state.style);
renderStyle();

// ------------------------------------------------------------------ exterior style
function renderExt() {
  const pre = $('#ext-presets');
  pre.innerHTML = '';
  for (const [id, p] of Object.entries(EXT_PRESETS)) {
    const b = document.createElement('button');
    b.textContent = p.label;
    b.className = Object.entries(p.values).every(([k, v]) => state.ext[k] === v) ? 'on' : '';
    b.addEventListener('click', () => { state.ext = { ...p.values }; applyExterior(state.ext); renderExt(); saveOptions(); gfx.dirty(); });
    pre.appendChild(b);
  }
  const box = $('#ext-controls');
  box.innerHTML = '';
  for (const c of EXT_CONTROLS) {
    const lab = document.createElement('label');
    lab.textContent = c.label;
    const sel = document.createElement('select');
    for (const [val, name] of c.options) { const o = document.createElement('option'); o.value = val; o.textContent = name; sel.appendChild(o); }
    sel.value = state.ext[c.id];
    sel.addEventListener('change', () => { state.ext[c.id] = sel.value; applyExterior(state.ext); renderExt(); saveOptions(); gfx.dirty(); });
    lab.appendChild(sel);
    box.appendChild(lab);
  }
}
applyExterior(state.ext);
renderExt();
function setLayout(l) {
  state.layout = l;
  applyReno();
}
document.querySelectorAll('[name=basement-layout]').forEach((r) => r.addEventListener('change', () => setLayout(r.value)));

// ------------------------------------------------------------------ sun
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function updateSun() {
  const month = +$('#sun-month').value, hour = +$('#sun-hour').value;
  const doy = [15, 46, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349][month];
  const d2r = Math.PI / 180;
  const dec = 23.44 * Math.sin((2 * Math.PI * (284 + doy)) / 365) * d2r;
  const lat = LATITUDE * d2r, ha = (hour - 12) * 15 * d2r;
  const el = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha));
  const az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat)) + Math.PI;
  // local frame: +x points X_AZ (southwest), +z points X_AZ + 90 (northwest, the front)
  const la = az - X_AZ * d2r;
  const dir = V(Math.cos(el) * Math.cos(la), Math.sin(el), Math.cos(el) * Math.sin(la));
  gfx.setSun(dir, el);
  const h12 = ((Math.floor(hour) + 11) % 12) + 1, mm = String(Math.round((hour % 1) * 60)).padStart(2, '0');
  $('#sun-label').textContent = `${MONTHS[month]} 15 · ${h12}:${mm} ${hour < 12 ? 'am' : 'pm'} · sun ${Math.max(0, Math.round(el / d2r))}° up, from the ${compass(az / d2r)}`;
}
function compass(deg) {
  return ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}
$('#sun-month').addEventListener('input', updateSun);
$('#sun-hour').addEventListener('input', updateSun);

// ------------------------------------------------------------------ walk mode
const plc = new PointerLockControls(camera, renderer.domElement);
// request pointer lock directly so a refusal (embedded previews, some browsers) is caught instead of
// surfacing as an unhandled promise rejection; PointerLockControls still tracks the lock state
function lockPointer() {
  try {
    const p = renderer.domElement.requestPointerLock();
    if (p && p.catch) p.catch(() => document.body.classList.add('draglook'));
  } catch { document.body.classList.add('draglook'); }
}
const keys = {};
addEventListener('keydown', (e) => { keys[e.code] = true; onKey(e); });
addEventListener('keyup', (e) => { keys[e.code] = false; });
const walk = { feet: -1, vy: 0, camY: 4.4, saved: null };
const EYE = 5.4, RADIUS = 0.8, STEP = 1.35;

function activeTag(tag) {
  if (tag.includes('|')) return tag.split('|').some(activeTag);
  if (tag.includes('&')) return tag.split('&').every(activeTag);
  if (tag.startsWith('on:') || tag.startsWith('off:')) { const [st, name] = tag.split(':'); return st === 'on' ? !!state.reno[name] : !state.reno[name]; }
  if (tag.startsWith('not:')) return !activeTag(tag.slice(4));
  if (tag.startsWith('lay:')) return state.layout === tag.slice(4);
  if (tag === 'furn' || tag.endsWith('F')) return state.furniture;
  return true;
}
// the room the (orbit) camera is standing in, if it is down inside the house: interior lighting applies there too
let camRoomAt = null, camRoomVal = null;
function roomAtCam() {
  const p = camera.position, key = `${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)},${state.view}`;
  if (key === camRoomAt) return camRoomVal;
  camRoomAt = key; camRoomVal = null;
  const f = floorAt(p.x, p.z, p.y);
  if (f === -Infinity || p.y - f > 8.5) return null;
  const lvl = f < -4.5 ? 'b' : f < 5.5 ? 'f1' : 'f2';
  if (!groups[lvl].visible) return null;
  const r = roomAtPoint(lvl, p.x, p.z);
  if (r && r.pts && !r.void) camRoomVal = { r, f };
  return camRoomVal;
}
function floorAt(x, z, maxY) {
  let best = -Infinity;
  for (const f of PHYS.floors) {
    if (f.y > maxY || f.y <= best || !activeTag(f.tag)) continue;
    if (pip(f.pts, x, z) && !f.holes.some((h) => pip(h, x, z))) best = f.y;
  }
  return best;
}
function resolve(p, feet) {
  for (let it = 0; it < 4; it++) {
    let moved = false;
    for (const s of PHYS.solids) {
      if (s.y1 < feet + STEP || s.y0 > feet + 5.8 || !activeTag(s.tag)) continue;
      const dx = p.x - s.cx, dz = p.z - s.cz;
      if (Math.abs(dx) > s.hl + s.ht + RADIUS + 1 && Math.abs(dz) > s.hl + s.ht + RADIUS + 1) continue;
      const lu = dx * s.ux + dz * s.uz, lv = -dx * s.uz + dz * s.ux;
      const cu = Math.max(-s.hl, Math.min(s.hl, lu)), cv = Math.max(-s.ht, Math.min(s.ht, lv));
      let du = lu - cu, dv = lv - cv, d = Math.hypot(du, dv);
      if (d >= RADIUS) continue;
      if (d < 1e-6) { // center inside the box: push out along the shallow axis
        const ou = s.hl - Math.abs(lu), ov = s.ht - Math.abs(lv);
        if (ou < ov) { du = Math.sign(lu) || 1; dv = 0; d = -ou; } else { dv = Math.sign(lv) || 1; du = 0; d = -ov; }
        const k = RADIUS - d;
        p.x += (du * s.ux - dv * s.uz) * k; p.z += (du * s.uz + dv * s.ux) * k;
      } else {
        const k = (RADIUS - d) / d;
        p.x += (du * s.ux - dv * s.uz) * k; p.z += (du * s.uz + dv * s.ux) * k;
      }
      moved = true;
    }
    if (!moved) break;
  }
}
function enterWalk() {
  if (state.mode === 'walk') return;
  walk.saved = { pos: camera.position.clone(), tgt: orbit.target.clone(), view: state.view };
  state.mode = 'walk';
  stopMeasure();
  select(null);
  setView('ext', false);
  const [doorX, doorZ] = toFt([517, 563.5]);
  camera.position.set(doorX + 6, -1 + EYE, doorZ + 17);
  walk.feet = -1; walk.vy = 0; walk.camY = -1 + EYE;
  camera.lookAt(doorX, 4, doorZ);
  orbit.enabled = false;
  walk.paused = false;
  document.body.classList.add('walking');
  lockPointer();
}
function exitWalk() {
  if (state.mode !== 'walk') return;
  state.mode = 'orbit';
  walk.room = null;
  if (plc.isLocked) plc.unlock();
  document.body.classList.remove('walking', 'draglook', 'walk-panel');
  orbit.enabled = true;
  camera.position.copy(walk.saved.pos);
  orbit.target.copy(walk.saved.tgt);
  setView(walk.saved.view, false);
  applyView();
}
plc.addEventListener('unlock', () => { if (state.mode === 'walk' && !document.body.classList.contains('walk-panel')) { walk.paused = true; $('#walk-paused').hidden = false; } });
function toggleWalkPanel(force) {
  const on = force ?? !document.body.classList.contains('walk-panel');
  document.body.classList.toggle('walk-panel', on);
  if (on && plc.isLocked) plc.unlock();
  if (!on && state.mode === 'walk' && !document.body.classList.contains('draglook')) lockPointer();
}
$('#hud-options').addEventListener('click', () => toggleWalkPanel());
plc.addEventListener('lock', () => { walk.paused = false; $('#walk-paused').hidden = true; });
// Pointer lock isn't available everywhere (embedded previews, some browsers): fall back to drag-to-look.
document.addEventListener('pointerlockerror', () => { walk.paused = false; document.body.classList.add('draglook'); });
$('#btn-walk').addEventListener('click', enterWalk);
$('#walk-resume').addEventListener('click', () => { walk.paused = false; $('#walk-paused').hidden = true; lockPointer(); });
$('#walk-exit').addEventListener('click', () => { $('#walk-paused').hidden = true; exitWalk(); });
$('#hud-exit').addEventListener('click', exitWalk);

const look = new THREE.Euler(0, 0, 0, 'YXZ');
let dragLook = null;
renderer.domElement.addEventListener('mousedown', () => {
  if (state.mode === 'walk' && plc.isLocked) { const i = doorAhead(); if (i >= 0) toggleDoor(i); }
});
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (state.mode !== 'walk' || plc.isLocked) return;
  dragLook = [e.clientX, e.clientY];
  renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (!dragLook) return;
  look.setFromQuaternion(camera.quaternion);
  look.y -= (e.clientX - dragLook[0]) * 0.004;
  look.x = Math.max(-1.45, Math.min(1.45, look.x - (e.clientY - dragLook[1]) * 0.004));
  camera.quaternion.setFromEuler(look);
  dragLook = [e.clientX, e.clientY];
});
addEventListener('pointerup', () => { dragLook = null; });

function updateWalk(dt) {
  if (walk.paused && !walk.force) return;
  const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
  const right = V(-fwd.z, 0, fwd.x);
  const mv = V(0, 0, 0);
  if (keys.KeyW || keys.ArrowUp) mv.add(fwd);
  if (keys.KeyS || keys.ArrowDown) mv.sub(fwd);
  if (keys.KeyD || keys.ArrowRight) mv.add(right);
  if (keys.KeyA || keys.ArrowLeft) mv.sub(right);
  const speed = keys.ShiftLeft || keys.ShiftRight ? 11 : 5;
  if (mv.lengthSq()) mv.normalize().multiplyScalar(speed * dt);
  const p = V(camera.position.x + mv.x, 0, camera.position.z + mv.z);
  resolve(p, walk.feet);
  const g = floorAt(p.x, p.z, walk.feet + STEP);
  if (g === -Infinity) { p.x = camera.position.x; p.z = camera.position.z; } // never walk off the world
  else if (g >= walk.feet - 0.05) { walk.feet = g; walk.vy = 0; }
  else { walk.vy -= 32 * dt; walk.feet = Math.max(g, walk.feet + walk.vy * dt); if (walk.feet === g) walk.vy = 0; }
  walk.camY += (walk.feet + EYE - walk.camY) * (1 - Math.exp(-dt * 14));
  camera.position.set(p.x, walk.camY, p.z);
  // HUD
  const lvl = walk.feet < -4.5 ? 'b' : walk.feet < 5.5 ? 'f1' : 'f2';
  const rr = RENO_ROOMS.find((q) => q.level === lvl && activeTag(q.rs) && pip(q.room.pts, p.x, p.z));
  const r = rr ? rr.room : roomAtPoint(lvl, p.x, p.z);
  const lvlName = { b: 'Basement', f1: '1st floor', f2: '2nd floor' }[lvl];
  walk.room = r && !r.void && r.pts ? r : null;
  $('#hud-room').textContent = r && !r.void ? `${r.name} · ${lvlName}` : walk.feet < 4 && walk.feet > -2 && !r ? 'Outside' : lvlName;
  const di = doorAhead(7);
  $('#hud-door').hidden = di < 0;
  if (di >= 0) $('#hud-door').textContent = `${DOORS[di].target > 0.5 ? 'Close' : 'Open'} ${DOORS[di].kind === 'garage' ? 'garage door' : 'door'}: press E${plc.isLocked ? ' or click' : ''}`;
}

// ------------------------------------------------------------------ measuring
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const measureGroup = new THREE.Group();
scene.add(measureGroup);
let measuring = false, mStart = null, mStartDot = null;
const dotGeo = new THREE.SphereGeometry(0.25, 12, 8);
const dotMat = new THREE.MeshBasicMaterial({ color: '#e0412b', depthTest: false });
const lineMat = new THREE.LineBasicMaterial({ color: '#e0412b', depthTest: false });

function ftIn(d) {
  const inches = Math.round(d * 12);
  return `${Math.floor(inches / 12)}' ${inches % 12}"`;
}
function pick(e, objects) {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects(objects, true).filter((h) => isVisible(h.object) && h.object.isMesh && (h.object.userData.measurable || h.object.userData.addition !== undefined));
}
function startMeasure() {
  measuring = true; mStart = null;
  document.body.classList.add('measuring');
  $('#btn-measure').classList.add('on');
  $('#measure-hint').textContent = 'Click the first point.';
}
function stopMeasure() {
  measuring = false; mStart = null;
  if (mStartDot) { measureGroup.remove(mStartDot); mStartDot = null; }
  document.body.classList.remove('measuring');
  $('#btn-measure').classList.remove('on');
  $('#measure-hint').textContent = '';
}
function measureClick(e) {
  const hit = pick(e, [house, site, additionsGroup])[0];
  if (!hit) return;
  const p = hit.point.clone();
  const dot = new THREE.Mesh(dotGeo, dotMat); dot.position.copy(p); dot.renderOrder = 10;
  measureGroup.add(dot);
  if (!mStart) { mStart = p; mStartDot = dot; $('#measure-hint').textContent = 'Click the second point.'; return; }
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([mStart, p]), lineMat); line.renderOrder = 10;
  measureGroup.add(line);
  const d = mStart.distanceTo(p), dh = Math.hypot(p.x - mStart.x, p.z - mStart.z);
  const div = document.createElement('div');
  div.className = 'measure-label';
  div.textContent = Math.abs(p.y - mStart.y) > 0.5 ? `${ftIn(d)} (level ${ftIn(dh)})` : ftIn(d);
  const lbl = new CSS2DObject(div); lbl.position.copy(mStart).add(p).multiplyScalar(0.5);
  measureGroup.add(lbl);
  mStart = null; mStartDot = null;
  $('#measure-hint').textContent = `${div.textContent}. Click to measure again.`;
}
$('#btn-measure').addEventListener('click', () => (measuring ? stopMeasure() : startMeasure()));
$('#btn-measure-clear').addEventListener('click', () => {
  for (const c of [...measureGroup.children]) { measureGroup.remove(c); if (c.element) c.element.remove(); }
  mStart = null; mStartDot = null;
});

// ------------------------------------------------------------------ additions sandbox
const additionsGroup = new THREE.Group();
scene.add(additionsGroup);
const tc = new TransformControls(camera, renderer.domElement);
tc.showY = false;
tc.setTranslationSnap(0.5);
tc.addEventListener('dragging-changed', (e) => { orbit.enabled = !e.value && state.mode === 'orbit'; });
scene.add(tc);

const PRESET_ADDS = {
  room: { name: 'Bump-out room', w: 12, d: 14, h: 9, y: 0, x: 8, z: 7, color: '#e3a33b' },
  deck: { name: 'Deck', w: 14, d: 20, h: 2, y: -1, x: 10, z: -8, color: '#a0703f' },
  screen: { name: 'Screen porch', w: 14, d: 16, h: 10, y: -1, x: 40, z: 6, color: '#7a9cc6' },
  overGarage: { name: 'Bonus over garage', w: 15, d: 12, h: 8, y: 10, x: 50, z: 49, color: '#c46a9b' },
  shed: { name: 'Shed', w: 10, d: 12, h: 9, y: -1, x: 70, z: -34, color: '#8fae6a' },
  box: { name: 'Box', w: 12, d: 12, h: 9, y: -1, x: 30, z: -25, color: '#9b8bd4' },
};
let additions = [];
let selected = null;
try { additions = JSON.parse(localStorage.getItem('creekside-additions') || '[]'); } catch { additions = []; }

function save() { try { localStorage.setItem('creekside-additions', JSON.stringify(additions)); } catch {} }

function makeAdditionMesh(a) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: a.color, transparent: true, opacity: 0.6, roughness: 0.7 }));
  m.castShadow = true; m.receiveShadow = true;
  m.userData.addition = a.id;
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: '#222' }));
  g.add(m, edges);
  g.userData.addition = a.id;
  return g;
}
function syncAddition(a) {
  let g = additionsGroup.children.find((c) => c.userData.addition === a.id);
  if (!g) { g = makeAdditionMesh(a); additionsGroup.add(g); }
  g.position.set(a.x, a.y + a.h / 2, a.z);
  g.rotation.y = (a.rot * Math.PI) / 180;
  g.children.forEach((c) => c.scale.set(a.d, a.h, a.w)); // x = north-south depth, z = east-west width
  g.children[0].material.color.set(a.color);
}
function rebuildAdditionPhysics() {
  gfx.dirty();
  PHYS.solids = PHYS.solids.filter((s) => s.tag !== 'add');
  PHYS.floors = PHYS.floors.filter((f) => f.tag !== 'add');
  for (const a of additions) {
    const r = (a.rot * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
    // box local x (size d) and z (size w), rotated about y
    const ax = V(c, 0, -s).multiplyScalar(a.d), az = V(s, 0, c).multiplyScalar(a.w);
    const o = V(a.x, 0, a.z).addScaledVector(ax, -0.5).addScaledVector(az, -0.5);
    if (a.h <= 3) {
      const pts = [o, o.clone().add(ax), o.clone().add(ax).add(az), o.clone().add(az)].map((p) => [p.x, p.z]);
      addFloorPoly(pts, [], a.y + a.h, 'add');
    } else addSolid(o, ax, az, a.y, a.y + a.h, 'add');
  }
}
function lotDistances(a) {
  const r = (a.rot * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => [a.x + (c * a.d * i + s * a.w * j) / 2, a.z + (-s * a.d * i + c * a.w * j) / 2]);
  const xs = corners.map((p) => p[0]), zs = corners.map((p) => p[1]);
  return {
    'southwest, driveway side': LOT.xNorth - Math.max(...xs), 'northeast side': Math.min(...xs) - LOT.xSouth,
    'northwest, street': LOT.zFront - Math.max(...zs), 'southeast, back': Math.min(...zs) - LOT.zBack,
  };
}
function renderAdditions() {
  const list = $('#add-list');
  list.innerHTML = '';
  if (!additions.length) list.innerHTML = '<p class="muted">Nothing added yet. Pick a starting shape above, then drag it around or type exact sizes.</p>';
  for (const a of additions) {
    const row = document.createElement('button');
    row.className = 'add-row' + (selected === a.id ? ' on' : '');
    row.innerHTML = `<i style="background:${a.color}"></i><span>${a.name}</span><small>${Math.round(a.w * a.d)} sq ft</small>`;
    row.addEventListener('click', () => select(a.id));
    list.appendChild(row);
  }
  const ed = $('#add-editor');
  const a = additions.find((x) => x.id === selected);
  ed.hidden = !a;
  if (!a) return;
  for (const k of ['name', 'w', 'd', 'h', 'y', 'rot', 'color']) {
    const el = ed.querySelector(`[name=${k}]`);
    if (document.activeElement !== el) el.value = a[k];
  }
  const dist = lotDistances(a);
  const near = Object.entries(dist).sort((p, q) => p[1] - q[1])[0];
  ed.querySelector('.add-stats').innerHTML =
    `<b>${Math.round(a.w * a.d).toLocaleString()} sq ft</b> footprint · top at ${ftIn(a.y + a.h + 1)} above grade<br>` +
    `Closest lot line: <b>${near[1] < 0 ? 'over the line by ' + ftIn(-near[1]) : ftIn(near[1])}</b> (${near[0]})`;
}
function select(id) {
  selected = id;
  const g = additionsGroup.children.find((c) => c.userData.addition === id);
  if (g) tc.attach(g); else tc.detach();
  renderAdditions();
}
function addPreset(key) {
  const a = { ...PRESET_ADDS[key], id: 'a' + Date.now().toString(36), rot: 0 };
  additions.push(a);
  syncAddition(a); rebuildAdditionPhysics(); save(); select(a.id);
}
$$('[data-add]').forEach((b) => b.addEventListener('click', () => addPreset(b.dataset.add)));
$('#add-editor').addEventListener('input', (e) => {
  const a = additions.find((x) => x.id === selected);
  if (!a || !e.target.name) return;
  const k = e.target.name;
  a[k] = k === 'name' || k === 'color' ? e.target.value : parseFloat(e.target.value) || 0;
  if (['w', 'd', 'h'].includes(k)) a[k] = Math.max(0.5, a[k]);
  syncAddition(a); rebuildAdditionPhysics(); save(); renderAdditions();
});
$('#add-delete').addEventListener('click', () => {
  const g = additionsGroup.children.find((c) => c.userData.addition === selected);
  if (g) additionsGroup.remove(g);
  additions = additions.filter((x) => x.id !== selected);
  tc.detach(); selected = null; rebuildAdditionPhysics(); save(); renderAdditions();
});
$('#add-dup').addEventListener('click', () => {
  const a = additions.find((x) => x.id === selected);
  if (!a) return;
  const b = { ...a, id: 'a' + Date.now().toString(36), name: a.name + ' copy', x: a.x + 4, z: a.z + 4 };
  additions.push(b); syncAddition(b); rebuildAdditionPhysics(); save(); select(b.id);
});
tc.addEventListener('objectChange', () => {
  const a = additions.find((x) => x.id === selected);
  if (!a) return;
  a.x = tc.object.position.x; a.z = tc.object.position.z;
  rebuildAdditionPhysics(); save(); renderAdditions();
});
additions.forEach(syncAddition);
rebuildAdditionPhysics();
renderAdditions();

// ------------------------------------------------------------------ doors
function toggleDoor(i) {
  const d = DOORS[i];
  const target = d.target > 0.5 ? 0 : 1;
  for (const o of DOORS) if (o === d || (d.pair && o.pair === d.pair)) o.target = target;
}
function setAllDoors(target) { for (const d of DOORS) d.target = target; }
function doorAhead(maxDist = 9) { // the door under the crosshair / screen center
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hit = raycaster.intersectObjects([house], true).find((h) => isVisible(h.object) && h.object.isMesh && !h.object.material.transparent);
  return hit && hit.distance < maxDist && hit.object.userData.door !== undefined ? hit.object.userData.door : -1;
}
$('#doors-open').addEventListener('click', () => setAllDoors(1));
$('#doors-close').addEventListener('click', () => setAllDoors(0));

// ------------------------------------------------------------------ pointer handling
let downAt = null;
renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (state.mode !== 'orbit' || !downAt || tc.dragging) return;
  if (Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return; // it was a drag
  if (measuring) return measureClick(e);
  const hit = pick(e, [additionsGroup])[0];
  if (hit) return select(hit.object.userData.addition);
  const h2 = pick(e, [house])[0];
  if (h2 && h2.object.userData.door !== undefined) return toggleDoor(h2.object.userData.door);
  if (selected) select(null);
});

function onKey(e) {
  if (e.target.matches && e.target.matches('input, select, textarea')) return;
  if (state.mode === 'walk') {
    if (e.code === 'Escape' && !plc.isLocked) exitWalk();
    if (e.code === 'KeyE') { const i = doorAhead(); if (i >= 0) toggleDoor(i); }
    if (e.code === 'KeyO') toggleWalkPanel();
    return;
  }
  if (e.code === 'Digit1') setView('ext');
  if (e.code === 'Digit2') setView('f2');
  if (e.code === 'Digit3') setView('f1');
  if (e.code === 'Digit4') setView('b');
  if (e.code === 'KeyM') measuring ? stopMeasure() : startMeasure();
  if (e.code === 'Escape') { stopMeasure(); select(null); }
  if ((e.code === 'Delete' || e.code === 'Backspace') && selected) $('#add-delete').click();
}

// ------------------------------------------------------------------ loop
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  gfx.resize();
  labelRenderer.setSize(innerWidth, innerHeight);
});

camera.position.set(...PRESETS.ext.pos);
orbit.target.set(...PRESETS.ext.tgt);
const now = new Date();
$('#sun-month').value = now.getMonth();
$('#sun-hour').value = 14;
updateSun();
applyView();

gfx.mountUI($('#tgl-lot').closest('.toggles'));
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (tween) {
    tween.t = Math.min(1, tween.t + dt / 0.9);
    const k = 1 - Math.pow(1 - tween.t, 3);
    camera.position.lerpVectors(tween.fromP, tween.toP, k);
    orbit.target.lerpVectors(tween.fromT, tween.toT, k);
    if (tween.t >= 1) tween = null;
  }
  for (const d of DOORS) {
    if (d.t === d.target) continue;
    d.t = d.target > d.t ? Math.min(d.target, d.t + dt / (d.dur || 0.7)) : Math.max(d.target, d.t - dt / (d.dur || 0.7));
    d.apply();
    gfx.dirty();
  }
  if (state.mode === 'walk') updateWalk(dt);
  else orbit.update();
  const cr = state.mode === 'walk' ? (walk.room ? { r: walk.room, f: walk.feet } : null) : roomAtCam();
  gfx.setContext({ walking: state.mode === 'walk' || !!cr, inside: !!cr, room: cr && cr.r, floorY: cr ? cr.f : 0, view: state.view });
  gfx.update(dt, pip);
  gfx.render();
  labelRenderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();
document.body.classList.add('ready');
// Debug/test hook: walk a scripted path without pointer lock, e.g.
// __house.simWalk([[x, z], ...]) returns the feet height reached at each waypoint.
function simWalk(path, start) {
  walk.force = true;
  state.mode = 'walk';
  setView('ext', false);
  const out = [];
  camera.position.set(start[0], 0, start[1]);
  walk.feet = floorAt(start[0], start[1], start[2] ?? 20);
  walk.camY = walk.feet + EYE;
  for (const [x, z] of path) {
    for (let i = 0; i < 400; i++) {
      const dx = x - camera.position.x, dz = z - camera.position.z;
      if (Math.hypot(dx, dz) < 0.3) break;
      camera.lookAt(camera.position.x + dx, camera.position.y, camera.position.z + dz);
      keys.KeyW = true; updateWalk(1 / 60); keys.KeyW = false;
    }
    out.push({ want: [x, z], at: [+camera.position.x.toFixed(1), +camera.position.z.toFixed(1)], feet: +walk.feet.toFixed(2), room: $('#hud-room').textContent });
  }
  walk.force = false;
  state.mode = 'orbit';
  return out;
}
window.__house = { gfx, renderer, scene, camera, orbit, PHYS, setView, state, simWalk, floorAt, DOORS, setAllDoors, setLayout, applyReno, applyStyle, applyExterior, activeTag, groups, renos };
applyReno();
