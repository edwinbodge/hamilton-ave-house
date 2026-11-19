import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildHouse, roomAtPoint, DOORS } from './build.js';
import { CONTROLS, PRESETS as STYLE_PRESETS, DEFAULT_PRESET, applyStyle } from './themes.js';
import { RENO_LABELS, RENO_ROOMS } from './reno.js';
import { buildSite } from './site.js';
import { PHYS, pip, V, addSolid, addFloorPoly, applyFinish, ORIGIN } from './geom.js';
import { LOT, LATITUDE, toFt } from './data.js';

// ------------------------------------------------------------------ renderer & scene
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
app.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.className = 'labels';
app.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#b9d3e8');
scene.fog = new THREE.Fog('#b9d3e8', 350, 900);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.2, 2000);
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.maxPolarAngle = Math.PI * 0.495;
orbit.minDistance = 4;
orbit.maxDistance = 500;

// soft image-based light so metals (appliances, brass, mirrors) read correctly
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const hemi = new THREE.HemisphereLight('#dbe9f6', '#b3a68e', 0.55);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff4e0', 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -140, right: 140, top: 140, bottom: -140, near: 1, far: 700 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.15;
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
const lotLines = site.getObjectByName('lotLines');

// ------------------------------------------------------------------ state & UI wiring
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const state = {
  view: 'ext', labels: true, furniture: true, mode: 'orbit', layout: '0',
  reno: { kitchen: false, openLiving: false, refresh: false, pbath: false, mud: false, facade: false, patio: false, play: false },
  style: { ...STYLE_PRESETS[DEFAULT_PRESET].values },
};
const STORE = 'creekside-options';
// renovations always start off so the house opens as it is today; the interior style is remembered
try { const saved = JSON.parse(localStorage.getItem(STORE) || 'null'); if (saved && saved.style) for (const k of Object.keys(state.style)) if (saved.style[k] !== undefined) state.style[k] = saved.style[k]; } catch {}
const saveOptions = () => { try { localStorage.setItem(STORE, JSON.stringify({ reno: state.reno, layout: state.layout, style: state.style })); } catch {} };

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
    for (const l of labels[id]) l.visible = showLabels(id) && !HIDE_LABELS.some(([r, n]) => state.reno[r] && n.test(l.userData.name));
  }
  for (const l of RENO_LABELS) l.visible = showLabels(l.userData.level) && activeTag(l.userData.rs);
  $$('.views button').forEach((b) => b.classList.toggle('on', b.dataset.view === v));
}
function setView(v, fly = true) {
  state.view = v;
  applyView();
  if (fly) flyTo(PRESETS[v]);
}
$$('.views button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
$('#tgl-furn').addEventListener('change', (e) => { state.furniture = e.target.checked; applyReno(); });
$('#tgl-labels').addEventListener('change', (e) => { state.labels = e.target.checked; applyView(); });
$('#tgl-trees').addEventListener('change', (e) => { trees.visible = e.target.checked; });
$('#tgl-lot').addEventListener('change', (e) => { lotLines.visible = e.target.checked; });
$('#panel-toggle').addEventListener('click', () => document.body.classList.toggle('collapsed'));

// ------------------------------------------------------------------ renovations
const renoSets = [...renos, ...(site.userData.renos || [])];
// labels of as-built rooms a renovation relabels
const HIDE_LABELS = [['kitchen', /^(Kitchen|Dining Area)$/], ['pbath', /^Primary Bath$/], ['mud', /^Laundry$/]];
// the modern facade re-finishes the exterior materials
const FACADE = { siding: 'bnb:#2e3135', brickExt: 'paintbrick:#ebe7df', extTrim: '#1f2022', winExt: '#1f2022', shingle: 'shingleDark', garageDoor: 'plank:#a66d3c', frontDoor: '#1f2022', shake: 'plank:#a66d3c', gutter: '#1f2022' };
let facadeOn = false;
function applyReno() {
  for (const g of renoSets) g.visible = activeTag(g.userData.rs);
  if (facadeOn !== state.reno.facade) { facadeOn = state.reno.facade; for (const [k, v] of Object.entries(FACADE)) applyFinish(k, facadeOn ? v : ORIGIN[k]); }
  document.querySelectorAll('[data-reno]').forEach((el) => { el.checked = !!state.reno[el.dataset.reno]; });
  document.querySelectorAll('[name=basement-layout]').forEach((r) => { r.checked = r.value === state.layout; });
  $('#suggested').checked = isSuggested();
  applyView();
  saveOptions();
}
document.querySelectorAll('[data-reno]').forEach((el) => el.addEventListener('change', () => { state.reno[el.dataset.reno] = el.checked; applyReno(); }));
// one switch for the whole suggested plan (basement: layout A)
const SUGGESTED = ['kitchen', 'openLiving', 'refresh', 'pbath', 'mud', 'facade', 'patio', 'play'];
const isSuggested = () => Object.keys(state.reno).every((k) => !!state.reno[k] === SUGGESTED.includes(k)) && state.layout === 'A';
$('#suggested').addEventListener('change', (e) => {
  for (const k of Object.keys(state.reno)) state.reno[k] = e.target.checked && SUGGESTED.includes(k);
  state.layout = e.target.checked ? 'A' : '0';
  applyReno();
});

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
  // local frame: +x north, +z east
  const dir = V(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
  sun.position.copy(sunTarget.position).addScaledVector(dir, 300);
  const day = THREE.MathUtils.smoothstep(el, -0.02, 0.18);
  sun.intensity = 2.6 * day;
  hemi.intensity = 0.2 + 0.35 * day;
  const sky = new THREE.Color('#1d2a3c').lerp(new THREE.Color('#b9d3e8'), day);
  scene.background.copy(sky); scene.fog.color.copy(sky);
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
const keys = {};
addEventListener('keydown', (e) => { keys[e.code] = true; onKey(e); });
addEventListener('keyup', (e) => { keys[e.code] = false; });
const walk = { feet: -1, vy: 0, camY: 4.4, saved: null };
const EYE = 5.4, RADIUS = 0.8, STEP = 1.35;

function activeTag(tag) {
  if (tag.includes('|')) return tag.split('|').some(activeTag);
  if (tag.includes('&')) return tag.split('&').every(activeTag);
  if (tag.startsWith('on:') || tag.startsWith('off:')) { const [st, name] = tag.split(':'); return st === 'on' ? !!state.reno[name] : !state.reno[name]; }
  if (tag.startsWith('lay:')) return state.layout === tag.slice(4);
  if (tag === 'furn' || tag.endsWith('F')) return state.furniture;
  return true;
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
  try { const p = plc.lock(); if (p && p.catch) p.catch(() => document.body.classList.add('draglook')); } catch { document.body.classList.add('draglook'); }
}
function exitWalk() {
  if (state.mode !== 'walk') return;
  state.mode = 'orbit';
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
  if (!on && state.mode === 'walk' && !document.body.classList.contains('draglook')) { try { plc.lock(); } catch {} }
}
$('#hud-options').addEventListener('click', () => toggleWalkPanel());
plc.addEventListener('lock', () => { walk.paused = false; $('#walk-paused').hidden = true; });
// Pointer lock isn't available everywhere (embedded previews, some browsers): fall back to drag-to-look.
document.addEventListener('pointerlockerror', () => { walk.paused = false; document.body.classList.add('draglook'); });
$('#btn-walk').addEventListener('click', enterWalk);
$('#walk-resume').addEventListener('click', () => { walk.paused = false; $('#walk-paused').hidden = true; plc.lock(); });
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
  $('#hud-room').textContent = r && !r.void ? `${r.name} · ${lvlName}` : walk.feet < 4 && walk.feet > -2 && !r ? 'Outside' : lvlName;
  const di = doorAhead(7);
  $('#hud-door').hidden = di < 0;
  if (di >= 0) $('#hud-door').textContent = `${DOORS[di].target > 0.5 ? 'Close' : 'Open'} door: press E${plc.isLocked ? ' or click' : ''}`;
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
    north: LOT.xNorth - Math.max(...xs), south: Math.min(...xs) - LOT.xSouth,
    'east, street': LOT.zFront - Math.max(...zs), 'west, back': Math.min(...zs) - LOT.zBack,
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
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
});

camera.position.set(...PRESETS.ext.pos);
orbit.target.set(...PRESETS.ext.tgt);
const now = new Date();
$('#sun-month').value = now.getMonth();
$('#sun-hour').value = 14;
updateSun();
applyView();

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
    d.t = d.target > d.t ? Math.min(d.target, d.t + dt / 0.7) : Math.max(d.target, d.t - dt / 0.7);
    d.apply();
  }
  if (state.mode === 'walk') updateWalk(dt);
  else orbit.update();
  renderer.render(scene, camera);
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
window.__house = { scene, camera, orbit, PHYS, setView, state, simWalk, floorAt, DOORS, setAllDoors, setLayout, applyReno, applyStyle, activeTag, groups, renos };
applyReno();
