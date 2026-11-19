// Point-and-click editing: click a piece of furniture, a wall or the floor (in walk mode, whatever is under
// the crosshair) and a small menu opens next to it: recolor / resize / remove / move / turn a piece, repaint a
// room's walls, add a TV, a plant or other furniture, or type what you want ("make these chairs white").
// Edits are kept in this browser (localStorage) and can be undone or reset.
import * as THREE from 'three';
import { ITEMS, Kit, Batcher, loadGLB, placeModel, applyFinish, MODEL_BASE, modelsShown } from './geom.js';
import { plant, floorLamp, rug, bookcase, wallTV, standTV, mediaConsole } from './furnish.js';

const KEY = 'creekside-edits';
const R = Math.PI / 180;
const COLORS = {
  white: '#f2f0ea', 'off-white': '#ece6da', cream: '#e9dfc9', ivory: '#eee8d6', beige: '#d9cbb2', tan: '#c2a57f', greige: '#cfc6b8',
  gray: '#9a9a96', grey: '#9a9a96', 'light gray': '#c9c9c4', charcoal: '#3d3f42', black: '#1d1d1f',
  navy: '#22324f', blue: '#3f6a9a', 'light blue': '#a9c1d6', 'dusty blue': '#8fa5b5', teal: '#2f6f73', green: '#3f6b48',
  sage: '#a3b19a', olive: '#6b6b3f', emerald: '#1f6a4f', red: '#9e2f2f', burgundy: '#6b1f2a', pink: '#e2b3b5', blush: '#e6cfc6',
  orange: '#d07a35', rust: '#a4502a', yellow: '#e2c25a', mustard: '#c99a2e', purple: '#5d4a78', lavender: '#b9aed0',
  brown: '#6b4a33', walnut: '#5a3b26', oak: '#b88a55', espresso: '#33231a', natural: '#c49a6c',
};
const SWATCHES = ['white', 'cream', 'beige', 'greige', 'gray', 'charcoal', 'black', 'navy', 'dusty blue', 'sage', 'green', 'emerald', 'blush', 'rust', 'mustard', 'walnut', 'oak'];
const PAINTS = { 'Warm white': '#ece8df', 'Soft white': '#f3f2ee', Greige: '#ddd5c8', 'Pale sage': '#d3d8c9', 'Light gray': '#dfe2e0', Oatmeal: '#e4ddd0', 'Dusty blue': '#cdd6da', Sage: '#c8cfbe', Blush: '#e6d8cf', Navy: '#2f3d52', 'Forest green': '#3e5446', Charcoal: '#4a4b4d' };

// framed art, back at z = 0 on a wall, centered about 5'3" up
const ARTS = {
  abstract: { label: 'Abstract', w: 2.6, h: 3.3, frame: '#1d1d1f', bg: '#efe8dc', marks: [['#c46a4a', 0.15, 0.55, 0.55, 0.3], ['#2f4a5e', 0.42, 0.2, 0.45, 0.42], ['#d9b26a', 0.1, 0.12, 0.3, 0.25]] },
  landscape: { label: 'Landscape', w: 4, h: 2.7, frame: '#b88a55', bg: '#bcd0db', bands: [['#9db3a0', 0.28, 0.45], ['#6f8a6a', 0, 0.3], ['#e9e3d3', 0.45, 0.55]] },
  botanical: { label: 'Botanical', w: 1.8, h: 2.4, frame: '#c9a75a', bg: '#f3efe5', marks: [['#5f7d55', 0.47, 0.15, 0.06, 0.62], ['#7f9b6d', 0.25, 0.45, 0.22, 0.1], ['#7f9b6d', 0.53, 0.55, 0.22, 0.1], ['#7f9b6d', 0.27, 0.68, 0.2, 0.09]] },
  bw: { label: 'Black & white photo', w: 3, h: 2.2, frame: '#1d1d1f', bg: '#d8d8d6', bands: [['#4a4a4a', 0, 0.35], ['#8a8a88', 0.35, 0.55], ['#bdbdbb', 0.55, 1]] },
  canvas: { label: 'Large canvas', w: 5, h: 3.4, frame: null, bg: '#e7ddd0', marks: [['#a9b8c4', 0.05, 0.08, 0.9, 0.35], ['#c9a48a', 0.05, 0.5, 0.6, 0.4], ['#f4efe6', 0.55, 0.55, 0.38, 0.36]] },
  mirror: { label: 'Round mirror', w: 2.8, h: 2.8, mirror: true },
};
function art(k, v = 'abstract') {
  const a = ARTS[v] || ARTS.abstract, { w, h } = a, y0 = 5.3 - h / 2;
  if (a.mirror) { // round brass mirror: a stack of thin squares approximating a disc
    for (let i = 0; i < 12; i++) { const t = (i / 12) * Math.PI; const hw = Math.sin(t + Math.PI / 24) * w / 2; k.box('brass', -hw, y0 + h / 2 - Math.cos(t) * h / 2 - 0.12, 0, hw, y0 + h / 2 - Math.cos(t + Math.PI / 12) * h / 2 + 0.12, 0.06); }
    for (let i = 0; i < 12; i++) { const t = (i / 12) * Math.PI; const hw = Math.sin(t + Math.PI / 24) * (w / 2 - 0.12); k.box('mirror', -hw, y0 + h / 2 - Math.cos(t) * (h / 2 - 0.12), 0.06, hw, y0 + h / 2 - Math.cos(t + Math.PI / 12) * (h / 2 - 0.12), 0.08); }
    return;
  }
  const f = a.frame ? 0.1 : 0, m = a.frame ? 0.22 : 0;
  if (a.frame) k.box('col:' + a.frame, -w / 2, y0, 0, w / 2, y0 + h, 0.12);
  if (a.frame) k.box('col:#f5f2ea', -w / 2 + f, y0 + f, 0.12, w / 2 - f, y0 + h - f, 0.125);
  const x0 = -w / 2 + f + m, x1 = w / 2 - f - m, b0 = y0 + f + m, b1 = y0 + h - f - m, z = a.frame ? 0.13 : 0.16;
  k.box('col:' + a.bg, x0, b0, a.frame ? 0.125 : 0, x1, b1, z);
  const W = x1 - x0, H = b1 - b0;
  for (const [c, lo, hi] of a.bands || []) k.box('col:' + c, x0, b0 + lo * H, z, x1, b0 + hi * H, z + 0.005);
  for (const [c, px, py, pw, ph] of a.marks || []) k.box('col:' + c, x0 + px * W, b0 + py * H, z, x0 + (px + pw) * W, b0 + (py + ph) * H, z + 0.005);
}
// things you can add: a hand-built piece (fn on a Kit) or an asset-pack model; wall: hangs on a wall
const ADDS = {
  tv: { label: 'TV', wall: (k) => wallTV(k, 65), floor: (k) => { mediaConsole(k, 5.5); standTV(k, 55, 1.8); }, back: true },
  art: { label: 'Art', wall: (k, a) => art(k, a.v), floor: null, back: true, wallOnly: true },
  sofa: { label: 'Sofa', glb: 'Sofa08', spec: { w: 7.5, back: true }, back: true },
  armchair: { label: 'Armchair', glb: 'Chair12' },
  chair: { label: 'Dining chair', glb: 'Chair03' },
  'coffee table': { label: 'Coffee table', glb: 'Table39', spec: { w: 4, d: 2 } },
  'dining table': { label: 'Dining table', glb: 'Table17', spec: { w: 6, d: 3.4, h: 2.5 } },
  'side table': { label: 'Side table', glb: 'Table37', spec: { h: 1.9 } },
  desk: { label: 'Desk', glb: 'Table49', spec: { w: 5, d: 2.4, h: 2.5, back: true }, back: true },
  'office chair': { label: 'Office chair', glb: 'Chair31' },
  bed: { label: 'Queen bed', glb: 'Bed15', spec: { w: 5.35, d: 7.2, back: true }, back: true },
  dresser: { label: 'Dresser', glb: 'Drawer38', spec: { w: 5, back: true }, back: true },
  bookcase: { label: 'Bookcase', fn: (k) => bookcase(k, 2.8, 6.5, 7), back: true },
  plant: { label: 'Plant', fn: (k) => plant(k, 0, 0, 5) },
  lamp: { label: 'Floor lamp', fn: (k) => floorLamp(k, 0, 0) },
  rug: { label: 'Rug', fn: (k) => rug(k, 8, 10, '#d8cfc0', '#7d6a55') },
};
const ADD_WORDS = [['tv', /\b(tv|television)\b/], ['sofa', /\b(sofa|couch|sectional|loveseat)\b/], ['armchair', /\barm ?chair|accent chair|recliner\b/],
  ['office chair', /\b(office|desk) chair\b/], ['chair', /\bchairs?\b/], ['coffee table', /\bcoffee table\b/], ['dining table', /\b(dining|kitchen) table\b/],
  ['side table', /\b(side|end|accent) table\b/], ['desk', /\bdesk\b/], ['bed', /\bbed\b/], ['dresser', /\b(dresser|chest|drawers)\b/],
  ['bookcase', /\b(book ?case|book ?shelf|shelves|shelving)\b/], ['plant', /\b(plant|tree|ficus)\b/], ['lamp', /\blamp\b/], ['rug', /\b(rug|carpet)\b/], ['dining table', /\btable\b/]];
const NICE = { swap: 'piece', piece: 'piece', leatherSofa: 'leather sofa', spindleChair: 'chair', officeChair: 'office chair', officeDesk: 'desk', bowDesk: 'desk',
  hutchDesk: 'desk', dropLeafDesk: 'desk', diningTable: 'dining table', roundTable: 'round table', coffeeTable: 'coffee table', tallChest: 'tall chest', patioChair: 'patio chair',
  mediaConsole: 'media console', wallTV: 'TV', standTV: 'TV', fileCabinetStand: 'TV stand', floorLamp: 'floor lamp', projectionScreen: 'projection screen', towerSpeaker: 'speaker',
  rockingChair: 'rocking chair', firePit: 'fire pit', golfBag: 'golf bag', racketRack: 'racket rack', acuraMDX: 'Acura MDX', rivianR2: 'Rivian R2', rubberFloor: 'gym floor',
  powerRack: 'power rack', liftBench: 'weight bench', dumbbellRack: 'dumbbell rack', pelotonBike: 'Peloton' };
const nice = (l) => NICE[l] || (/^[A-Z]{2}/.test(l) ? l : l.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase());

const CATS = {
  sofa: ['Sofa08', 'Sofa01', 'Sofa03', 'Sofa11', 'Sofa16', 'Sofa17', 'Sofa18', 'Sofa31', 'Sofa33', 'Sofa35', 'Sofa36'],
  armchair: ['Chair11', 'Chair12', 'Chair13', 'Chair14', 'Chair15', 'Chair16', 'Chair20', 'Chair45', 'Sofa37'],
  chair: ['Chair01', 'Chair03', 'Chair04', 'Chair05', 'Chair06', 'Chair07', 'Chair08', 'Chair17', 'Chair29'],
  stool: ['Chair22', 'Chair24'], office: ['Chair31', 'Chair32', 'Chair33'], outdoor: ['Chair44', 'Chair39', 'Chair04', 'Chair29', 'Chair07'],
  bed: ['Bed02', 'Bed04', 'Bed09', 'Bed10', 'Bed12', 'Bed15', 'Bed16', 'Bed18', 'Bed20'],
  nightstand: ['Drawer01', 'Drawer02', 'Drawer04', 'Drawer14'],
  dresser: ['Drawer12', 'Drawer13', 'Drawer34', 'Drawer37', 'Drawer35', 'Drawer36', 'Drawer38', 'Drawer39', 'Drawer40'],
  console: ['Drawer31', 'Drawer32', 'Drawer36', 'Drawer39', 'Drawer40', 'Drawer38'],
  dining: ['Table03', 'Table04', 'Table06', 'Table07', 'Table11', 'Table17', 'Table19', 'Table22', 'Table23', 'Table24', 'Table29'],
  coffee: ['Table34', 'Table36', 'Table38', 'Table39', 'Table40'], side: ['Table37', 'Table36', 'Drawer02', 'Drawer04'],
  desk: ['Table43', 'Table44', 'Table49'], toilet: ['Toilet01', 'Toilet03'],
};
const LABEL_CAT = { sofa: 'sofa', leatherSofa: 'sofa', sectional: 'sofa', armchair: 'armchair', recliner: 'armchair', tuxedoChair: 'armchair', rockingChair: 'armchair',
  loungeChair: 'armchair', spindleChair: 'chair', chair: 'chair', tulipChair: 'chair', patioChair: 'outdoor', adirondack: 'outdoor', officeChair: 'office', stool: 'stool',
  bed: 'bed', nightstand: 'nightstand', dresser: 'dresser', tallChest: 'dresser', armoire: 'dresser', diningTable: 'dining', roundTable: 'dining', coffeeTable: 'coffee',
  sideTable: 'side', desk: 'desk', officeDesk: 'desk', bowDesk: 'desk', dropLeafDesk: 'desk', hutchDesk: 'desk', toilet: 'toilet', buffet: 'console', mediaConsole: 'console',
  sofa_: 'sofa', armchair_: 'armchair', 'dining chair': 'chair', 'coffee table': 'coffee', 'dining table': 'dining', 'side table': 'side', 'office chair': 'office', 'queen bed': 'bed' };
const catOf = (it) => LABEL_CAT[it.label] || (() => { const g = it.model?.glb; return g && Object.keys(CATS).find((c) => CATS[c].includes(g)); })() || null;
const WALL_LABELS = new Set(['wallTV', 'TV', 'art', 'projectionScreen', 'racketRack']);
const GLB_NAMES = { Sofa: 'sofa', Chair: 'chair', Table: 'table', Bed: 'bed', Drawer: 'dresser', Toilet: 'toilet' };
const nameOf = (it) => (it.label && it.label !== 'piece' ? nice(it.label) : it.model ? GLB_NAMES[it.model.glb.replace(/\d+$/, '')] || 'piece' : 'piece');
export function initEditor(env) {
  const { scene, camera, renderer, house, site, gfx, isVisible, roomName, reapplyStyle, onOpen, onClose } = env;
  let E = { items: {}, paint: {}, added: [] };
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.items) E = { items: s.items, paint: s.paint || {}, added: s.added || [] }; } catch {}
  const undo = [];
  const addedGroup = new THREE.Group(); addedGroup.name = 'added items'; scene.add(addedGroup);
  const ADDED = new Map(); // id -> item
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(E)); } catch {} updateCount(); };
  const snapshot = () => { undo.push(JSON.stringify(E)); if (undo.length > 60) undo.shift(); };
  const itemById = (id) => (typeof id === 'string' && id[0] === 'a' ? ADDED.get(id) : ITEMS[id]);
  const st = (id) => (E.items[id] = E.items[id] || {});

  // ---------------------------------------------------------------- applying edits to the scene
  const recolorCache = new Map();
  function recolor(g, hex) {
    g.traverse((m) => {
      if (!m.isMesh) return;
      if (!m.userData.origMat) { if (!hex) return; m.userData.origMat = m.material; }
      const o = m.userData.origMat;
      if (!hex || o.transparent || /glass|bulb|screen|chrome|mirror/i.test(m.name)) { m.material = o; return; }
      const k = o.uuid + hex;
      if (!recolorCache.has(k)) {
        const c = o.clone(); c.map = null; c.color.set(hex); c.metalness = Math.min(c.metalness, 0.1);
        if (c.emissiveMap) { c.emissiveMap = null; c.emissive.set('#000'); }
        c.needsUpdate = true; recolorCache.set(k, c);
      }
      m.material = recolorCache.get(k);
    });
  }
  function applyItem(it) {
    const s = E.items[it.id] || {}, g = it.group;
    if (!g) return;
    g.visible = !s.removed;
    g.scale.set(s.sx || 1, s.sy || 1, s.sz || 1);
    g.position.set(it.x + (s.dx || 0), it.y + (s.dl || 0) + (s.dy || 0), it.z + (s.dz || 0));
    g.rotation.y = (it.rot + (s.spin || 0)) * R;
    // "Change item": a different model in the same spot
    if (s.glb && it.altGlb !== s.glb) setItemGlb(it, s.glb);
    const alt = !!s.glb && it.altGlb === s.glb;
    if (it.altGroup) it.altGroup.visible = alt;
    if (it.modelGroup) it.modelGroup.visible = !alt && (it.added || modelsShown());
    if (it.hand) it.hand.visible = !alt && !(it.modelGroup && it.modelGroup.visible);
    recolor(g, s.color);
    // collision boxes follow the piece
    const r0 = it.rot * R, r1 = (it.rot + (s.spin || 0)) * R, c0 = Math.cos(r0), s0 = Math.sin(r0), c1 = Math.cos(r1), s1 = Math.sin(r1);
    const sx = s.sx || 1, sy = s.sy || 1, sz = s.sz || 1;
    for (const { s: so, o } of it.solids || []) {
      if (s.removed) { so.y0 = so.y1 = -1e6; continue; }
      const vx = o.cx - it.x, vz = o.cz - it.z, lx = (vx * c0 - vz * s0) * sx, lz = (vx * s0 + vz * c0) * sz;
      so.cx = it.x + (s.dx || 0) + lx * c1 + lz * s1; so.cz = it.z + (s.dz || 0) - lx * s1 + lz * c1;
      const ux = o.ux * c0 - o.uz * s0, uz = o.ux * s0 + o.uz * c0; // axis in the item frame
      so.ux = ux * c1 + uz * s1; so.uz = -ux * s1 + uz * c1;
      so.hl = o.hl * Math.hypot(ux * sx, uz * sz); so.ht = o.ht * Math.hypot(uz * sx, ux * sz);
      so.y0 = it.y + (o.y0 - it.y) * sy; so.y1 = it.y + (o.y1 - it.y) * sy;
    }
  }
  // the footprint of a hand-built piece in its own frame: what a replacement model is sized to
  function footprint(it) {
    if (it.model) return it.model;
    const inv = new THREE.Matrix4().makeRotationY(-it.rot * R).multiply(new THREE.Matrix4().makeTranslation(-it.x, -it.y, -it.z));
    const box = new THREE.Box3();
    (it.hand || it.group).traverse((m) => { if (m.isMesh && m.geometry) { m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox.clone().applyMatrix4(inv)); } });
    if (box.isEmpty()) return {};
    const back = Math.abs(box.min.z) < 0.4;
    return { w: box.max.x - box.min.x, d: back ? box.max.z : box.max.z - box.min.z, back, dx: (box.min.x + box.max.x) / 2, dz: back ? 0 : (box.min.z + box.max.z) / 2 };
  }
  async function setItemGlb(it, glb) {
    it.altGlb = glb;
    if (!it.altGroup) { it.altGroup = new THREE.Group(); it.altGroup.name = 'chosen model'; (it.inner || it.group).add(it.altGroup); }
    const fp = it.fp || (it.fp = footprint(it));
    const spec = { w: fp.w, d: fp.d, back: fp.back, dx: fp.dx, dz: fp.dz };
    const src = await loadGLB(glb);
    if (it.altGlb !== glb) return;
    it.altGroup.clear();
    it.altGroup.add(placeModel(src, spec, it.x, it.y, it.z, it.rot));
    applyItem(it); gfx.dirty();
    if (cur && cur.item === it) highlight(targets());
  }
  function buildCopy(a) {
    const src = itemById(a.src);
    if (!src || !src.group) return;
    const it = { id: a.id, x: src.x, y: src.y, z: src.z, rot: src.rot, label: src.label, model: src.model, added: true, kind: 'copy', src: a.src, solids: [] };
    const g = new THREE.Group(); g.name = 'item'; g.userData.item = it; it.group = g;
    const inner = src.inner || src.group.children[0];
    const c = inner.clone(true); c.traverse((m) => { if (m.isMesh && m.userData.origMat) { m.material = m.userData.origMat; delete m.userData.origMat; } }); g.add(c);
    c.traverse((o) => { if (o.name === 'hand-built' || o.name === 'models') o.visible = src.modelGroup ? (o.name === 'models') === src.modelGroup.visible : true; });
    addedGroup.add(g); ADDED.set(a.id, it); applyItem(it); gfx.dirty();
    return it;
  }
  async function buildAdded(a) {
    if (a.kind === 'copy') return buildCopy(a);
    const def = ADDS[a.kind];
    if (!def) return;
    const it = { id: a.id, x: a.x, y: a.y, z: a.z, rot: a.rot, label: def.label === 'TV' ? 'TV' : def.label.toLowerCase(), added: true, kind: a.kind, wall: a.where === 'wall', solids: [] };
    const g = new THREE.Group(); g.name = 'item'; g.userData.item = it; it.group = g;
    g.position.set(a.x, a.y, a.z); g.rotation.y = a.rot * R; g.updateMatrix();
    const inner = new THREE.Group(); inner.applyMatrix4(g.matrix.clone().invert()); g.add(inner);
    const { PHYS } = await import('./geom.js');
    const n0 = PHYS.solids.length;
    it.inner = inner;
    if (def.glb) {
      const src = await loadGLB(def.glb), o = placeModel(src, def.spec || {}, a.x, a.y, a.z, a.rot);
      it.model = { glb: def.glb, ...(def.spec || {}) };
      it.modelGroup = new THREE.Group(); it.modelGroup.name = 'models'; it.modelGroup.add(o); inner.add(it.modelGroup);
      const sz = new THREE.Vector3(); new THREE.Box3().setFromObject(o).getSize(sz);
      const rr = a.rot * R, w = Math.abs(sz.x * Math.cos(rr)) + Math.abs(sz.z * Math.sin(rr)), d = Math.abs(sz.z * Math.cos(rr)) + Math.abs(sz.x * Math.sin(rr));
      if (sz.y > 1.2 && a.kind !== 'rug') { const k = new Kit(null, 'edit').at(a.x, a.z, a.y, a.rot); const z0 = def.spec && def.spec.back ? 0 : -d / 2; k.solid(-w / 2, z0, w / 2, z0 + d, 0, sz.y); }
    } else {
      const b = new Batcher(), k = new Kit(b, 'edit').at(a.x, a.z, a.y, a.rot);
      (a.where === 'wall' && def.wall ? def.wall : def.floor || def.fn)(k, a);
      it.hand = new THREE.Group(); it.hand.name = 'hand-built'; b.build(it.hand); inner.add(it.hand);
    }
    it.solids = PHYS.solids.slice(n0).map((s) => ({ s, o: { ...s } }));
    addedGroup.add(g); ADDED.set(a.id, it);
    applyItem(it); gfx.dirty();
    return it;
  }
  function rebuildCopies() {
    for (const a of E.added) if (a.kind === 'copy' && ADDED.has(a.id)) { addedGroup.remove(ADDED.get(a.id).group); ADDED.delete(a.id); buildCopy(a); }
  }
  function applyAll() {
    for (const it of ITEMS) if (E.items[it.id] || it.group?.userData.edited) { applyItem(it); if (it.group) it.group.userData.edited = !!E.items[it.id]; }
    for (const it of ADDED.values()) applyItem(it);
    reapplyPaint();
    gfx.dirty();
  }
  function reapplyPaint() { for (const [k, hex] of Object.entries(E.paint)) applyFinish(k, 'paint:' + hex); }
  async function syncAdded() {
    const want = new Set(E.added.map((a) => a.id));
    for (const [id, it] of ADDED) if (!want.has(id)) { addedGroup.remove(it.group); for (const { s } of it.solids) s.y0 = s.y1 = -1e6; ADDED.delete(id); }
    for (const a of E.added) if (!ADDED.has(a.id)) await buildAdded(a);
  }
  async function restore(json) { // undo / reset
    const hadPaint = Object.keys(E.paint).length;
    E = JSON.parse(json);
    if (hadPaint) reapplyStyle();
    await syncAdded();
    for (const it of ITEMS) if (it.group) applyItem(it);
    applyAll(); save();
  }

  // ---------------------------------------------------------------- picking
  const ray = new THREE.Raycaster();
  function pickAt(ndc) {
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects([house, site, addedGroup], true).filter((h) => h.object.isMesh && isVisible(h.object) && !(h.object.material && h.object.material.transparent && h.object.material.opacity < 0.9) && h.object.userData.measurable !== false);
    const h = hits[0];
    if (!h || h.distance > 120) return null;
    let it = null;
    for (let o = h.object; o; o = o.parent) if (o.name === 'item' && o.userData.item) { it = o.userData.item; break; }
    const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
    if (n.dot(ray.ray.direction) > 0) n.negate();
    const key = h.object.name || '';
    const kind = it ? 'item' : key.startsWith('W:') ? 'wall' : n.y > 0.7 ? 'floor' : Math.abs(n.y) < 0.3 ? 'wall' : 'other';
    return { hit: h, point: h.point.clone(), normal: n, item: it, kind, key: key.startsWith('W:') ? key : null };
  }
  const matching = (it) => [...ITEMS, ...ADDED.values()].filter((o) => o.group && isVisible(o.group) && o.label === it.label && (o.model?.glb || '') === (it.model?.glb || ''));

  // ---------------------------------------------------------------- the popup
  const pop = document.createElement('div'); pop.id = 'edit-pop'; pop.hidden = true; document.body.appendChild(pop);
  const hint = document.createElement('div'); hint.id = 'edit-hint'; hint.hidden = true; document.body.appendChild(hint);
  const boxes = new THREE.Group(); scene.add(boxes);
  let cur = null, all = false, pending = null;
  function highlight(list) {
    boxes.clear();
    for (const it of list || []) { const b = new THREE.BoxHelper(it.group, 0xffb020); b.material.depthTest = false; b.renderOrder = 20; boxes.add(b); }
    gfx.dirty();
  }
  const targets = () => (cur && cur.item ? (all ? matching(cur.item) : [cur.item]) : []);
  function open(target, sx, sy) {
    cur = target; all = false;
    render('main');
    pop.hidden = false;
    const w = pop.offsetWidth, h = pop.offsetHeight;
    pop.style.left = Math.max(8, Math.min(innerWidth - w - 8, sx + 18)) + 'px';
    pop.style.top = Math.max(8, Math.min(innerHeight - h - 8, sy - h / 2)) + 'px';
    highlight(targets());
    onOpen && onOpen();
    if (matchMedia('(pointer: fine)').matches) setTimeout(() => pop.querySelector('input.cmd')?.focus({ preventScroll: true }), 30);
  }
  function close(relock = true) {
    if (pop.hidden) return;
    pop.hidden = true; cur = null; highlight([]);
    onClose && onClose(relock);
  }
  function title() {
    if (!cur) return '';
    const room = roomName(cur.point, cur.normal);
    if (cur.item) { const n = matching(cur.item).length; return `${cap(nameOf(cur.item))}${room ? ' · ' + room : ''}` + (n > 1 ? `<small>${n} like this in view</small>` : ''); }
    if (cur.kind === 'wall') return `Wall${room ? ' · ' + room : ''}`;
    if (cur.kind === 'floor') return `Floor${room ? ' · ' + room : ''}`;
    return room || 'Here';
  }
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  function btn(label, icon, fn, cls = '') { const b = document.createElement('button'); b.className = cls; b.innerHTML = `<span class="ic">${icon}</span>${label}`; b.addEventListener('click', (e) => { e.stopPropagation(); fn(); }); return b; }
  function render(view) {
    pop.innerHTML = '';
    const head = document.createElement('div'); head.className = 'ep-head';
    head.innerHTML = `<b>${title()}</b>`;
    const x = document.createElement('button'); x.className = 'ep-x'; x.textContent = '×'; x.title = 'Close (Esc)'; x.addEventListener('click', () => close()); head.appendChild(x);
    pop.appendChild(head);
    const row = document.createElement('div'); row.className = 'ep-row';
    const sub = document.createElement('div'); sub.className = 'ep-sub';
    if (cur.item) {
      const n = matching(cur.item).length;
      if (n > 1) {
        const l = document.createElement('label'); l.className = 'ep-all';
        l.innerHTML = `<input type="checkbox" ${all ? 'checked' : ''}> Apply to all ${n} ${nameOf(cur.item)}${/s$/.test(nameOf(cur.item)) ? '' : 's'}`;
        l.querySelector('input').addEventListener('change', (e) => { all = e.target.checked; highlight(targets()); });
        pop.appendChild(l);
      }
      const cat = catOf(cur.item);
      row.classList.toggle('four', !!cat);
      row.append(btn('Recolor', '◐', () => render('color'), view === 'color' ? 'on' : ''));
      if (cat) row.append(btn('Change', '⇄', () => render('change'), view === 'change' ? 'on' : ''));
      row.append(btn('Resize', '⤢', () => render('size'), view === 'size' ? 'on' : ''), btn('Remove', '✕', () => act('remove')));
      if (view === 'main') {
        const more = document.createElement('div'); more.className = 'ep-more';
        more.append(btn('Move', '✥', () => startMove()), btn('Turn', '↻', () => act('spin', 90)), btn('Copy', '⧉', () => copyHere()), btn('Reset', '⟲', () => act('reset')));
        sub.appendChild(more);
        const wallish = isWallItem(cur.item);
        const nudge = document.createElement('div'); nudge.className = 'ep-nudge';
        nudge.append(Object.assign(document.createElement('span'), { className: 'muted', textContent: 'Nudge 6"' }));
        for (const [l, d] of wallish ? [['←', 'left'], ['→', 'right'], ['↑', 'up'], ['↓', 'down']] : [['←', 'left'], ['→', 'right'], ['↑', 'away'], ['↓', 'closer']]) nudge.appendChild(btn(l, '', () => act('nudge', d)));
        sub.appendChild(nudge);
      }
      if (view === 'change') {
        const g = document.createElement('div'); g.className = 'ep-thumbs';
        const curGlb = (E.items[cur.item.id] || {}).glb || cur.item.model?.glb;
        for (const name of CATS[cat]) {
          const b = document.createElement('button'); b.title = name; if (name === curGlb) b.className = 'on';
          b.innerHTML = `<img src="${MODEL_BASE}thumbs/${name}.png" alt="" loading="lazy">`;
          b.addEventListener('click', (e) => { e.stopPropagation(); act('glb', name); });
          g.appendChild(b);
        }
        if ((E.items[cur.item.id] || {}).glb) g.appendChild(btn('Original', '', () => act('glb', null)));
        sub.appendChild(g);
      }
      if (view === 'color') sub.appendChild(swatches((hex) => act('color', hex), true));
      if (view === 'size') {
        const g = document.createElement('div'); g.className = 'ep-grid';
        for (const [l, a] of [['Taller', ['sy', 1.15]], ['Shorter', ['sy', 1 / 1.15]], ['Wider', ['sx', 1.15]], ['Narrower', ['sx', 1 / 1.15]], ['Bigger', ['all', 1.12]], ['Smaller', ['all', 1 / 1.12]]]) g.appendChild(btn(l, '', () => act('scale', a)));
        sub.appendChild(g);
      }
    } else if (cur.kind === 'wall') {
      row.append(btn('Repaint', '◐', () => render('paint'), view === 'paint' ? 'on' : ''), btn('Hang a TV', '▭', () => addHere('tv')), btn('Hang art', '▣', () => render('art'), view === 'art' ? 'on' : ''));
      if (view === 'main') { const more = document.createElement('div'); more.className = 'ep-more'; more.append(btn('Add furniture here', '+', () => render('add'))); sub.appendChild(more); }
      if (view === 'art') {
        const g = document.createElement('div'); g.className = 'ep-grid';
        for (const [k, a] of Object.entries(ARTS)) g.appendChild(btn(a.label, '', () => addHere('art', null, { v: k })));
        sub.appendChild(g);
      }
      if (view === 'paint') {
        if (!cur.key) sub.innerHTML = '<p class="muted">This surface isn\'t a painted room wall.</p>';
        else { sub.appendChild(swatches((hex) => paint(hex), false, PAINTS)); }
      }
    } else {
      row.append(btn('Add item', '+', () => render('add'), view === 'add' ? 'on' : ''), btn('Add a TV', '▭', () => addHere('tv')), btn('Add a plant', '✿', () => addHere('plant')));
    }
    if (view === 'add') {
      const g = document.createElement('div'); g.className = 'ep-grid';
      for (const [k, d] of Object.entries(ADDS)) if (!d.wallOnly) g.appendChild(btn(d.label, '', () => addHere(k)));
      sub.appendChild(g);
    }
    pop.append(row, sub);
    const f = document.createElement('form'); f.className = 'ep-cmd';
    f.innerHTML = `<input class="cmd" type="text" placeholder="${cur.item ? 'e.g. make these chairs white, taller, remove' : cur.kind === 'wall' ? 'e.g. paint this sage, add a TV' : 'e.g. add a sofa, put a plant here'}" autocomplete="off">`;
    f.addEventListener('submit', (e) => { e.preventDefault(); command(f.querySelector('input').value); });
    pop.appendChild(f);
    const msg = document.createElement('div'); msg.className = 'ep-msg'; pop.appendChild(msg);
    const foot = document.createElement('div'); foot.className = 'ep-foot';
    const u = document.createElement('button'); u.textContent = 'Undo'; u.disabled = !undo.length; u.addEventListener('click', () => doUndo());
    foot.append(u, Object.assign(document.createElement('span'), { className: 'muted', textContent: countText() }));
    pop.appendChild(foot);
    if (!pop.hidden) requestAnimationFrame(clamp);
  }
  function clamp() { // keep the menu on screen as it grows
    const r = pop.getBoundingClientRect();
    if (r.bottom > innerHeight - 8) pop.style.top = Math.max(8, innerHeight - r.height - 8) + 'px';
    if (r.right > innerWidth - 8) pop.style.left = Math.max(8, innerWidth - r.width - 8) + 'px';
  }
  function swatches(fn, withNone, named) {
    const w = document.createElement('div'); w.className = 'ep-sw';
    const list = named ? Object.entries(named) : SWATCHES.map((n) => [n, COLORS[n]]);
    for (const [n, hex] of list) { const b = document.createElement('button'); b.title = n; b.style.background = hex; b.addEventListener('click', (e) => { e.stopPropagation(); fn(hex); }); w.appendChild(b); }
    const pick = document.createElement('input'); pick.type = 'color'; pick.title = 'Any color'; pick.addEventListener('change', () => fn(pick.value)); w.appendChild(pick);
    if (withNone) { const b = document.createElement('button'); b.className = 'none'; b.textContent = 'Original'; b.addEventListener('click', (e) => { e.stopPropagation(); fn(null); }); w.appendChild(b); }
    return w;
  }
  function say(t) { const m = pop.querySelector('.ep-msg'); if (m) m.textContent = t; requestAnimationFrame(clamp); }
  const countText = () => { const n = Object.keys(E.items).length + Object.keys(E.paint).length + E.added.length; return n ? `${n} edit${n > 1 ? 's' : ''} saved in this browser` : ''; };
  function updateCount() {
    const el = document.querySelector('#edit-count'); if (el) el.textContent = countText() || 'No edits yet.';
    const f = pop.querySelector('.ep-foot'); if (f) { f.querySelector('span').textContent = countText(); f.querySelector('button').disabled = !undo.length; }
  }

  // ---------------------------------------------------------------- actions
  let quiet = false; // inside a typed command: one undo step for the whole command
  function act(op, arg) {
    const list = targets();
    if (!list.length) return;
    if (!quiet) snapshot();
    for (const it of list) {
      if (op === 'reset') { delete E.items[it.id]; if (it.added) E.added = E.added.filter((a) => a.id !== it.id); applyItem(it); continue; }
      const s = st(it.id);
      if (op === 'remove') { if (it.added) { E.added = E.added.filter((a) => a.id !== it.id); delete E.items[it.id]; } else s.removed = true; }
      if (op === 'color') { if (arg) s.color = arg; else delete s.color; }
      if (op === 'spin') s.spin = ((s.spin || 0) + arg) % 360;
      if (op === 'glb') { if (arg) s.glb = arg; else delete s.glb; }
      if (op === 'nudge') {
        const r = (it.rot + (s.spin || 0)) * R, tx = Math.cos(r), tz = -Math.sin(r), step = 0.5;
        const cr = new THREE.Vector3(); camera.getWorldDirection(cr); const fx = cr.x, fz = cr.z, fl = Math.hypot(fx, fz) || 1;
        const rx = -fz / fl, rz = fx / fl; // camera right on the floor
        if (isWallItem(it) && (arg === 'left' || arg === 'right')) { const sg = Math.sign(tx * rx + tz * rz) || 1, k = (arg === 'right' ? 1 : -1) * sg * step; s.dx = (s.dx || 0) + tx * k; s.dz = (s.dz || 0) + tz * k; }
        else if (arg === 'left' || arg === 'right') { const k = arg === 'right' ? step : -step; s.dx = (s.dx || 0) + rx * k; s.dz = (s.dz || 0) + rz * k; }
        else if (arg === 'up' || arg === 'down') s.dy = (s.dy || 0) + (arg === 'up' ? step : -step);
        else { const k = arg === 'away' ? step : -step; s.dx = (s.dx || 0) + (fx / fl) * k; s.dz = (s.dz || 0) + (fz / fl) * k; }
      }
      if (op === 'scale') { const [ax, f] = arg; for (const k of ax === 'all' ? ['sx', 'sy', 'sz'] : [ax]) s[k] = Math.max(0.3, Math.min(3, (s[k] || 1) * f)); }
      applyItem(it);
    }
    syncAdded(); save(); gfx.dirty();
    const n = list.length > 1 ? `${list.length} pieces` : nameOf(list[0]);
    if (op === 'remove') { close(true); toast(`Removed ${n}. Press Ctrl+Z (or Undo in the panel) to bring it back.`); return; }
    highlight(list);
    say({ color: `Recolored ${n}.`, spin: `Turned ${n}.`, scale: `Resized ${n}.`, reset: `Put ${n} back as it was.`, glb: arg ? `Changed ${n}.` : `Back to the original ${n}.`, nudge: `Nudged ${n}.` }[op] || 'Done.');
    const v = { color: 'color', scale: 'size', glb: 'change' }[op] || 'main'; const m = pop.querySelector('.ep-msg').textContent; render(v); say(m);
  }
  function paint(hex) {
    if (!cur || !cur.key) return say('Click a painted wall to repaint a room.');
    snapshot(); E.paint[cur.key] = hex; applyFinish(cur.key, 'paint:' + hex); save(); gfx.dirty();
    say(`Repainted the ${roomName(cur.point, cur.normal) || 'room'} walls.`);
  }
  let nextId = () => 'a' + Date.now().toString(36) + Math.floor(Math.random() * 99);
  async function addHere(kind, at, extra = {}) {
    const def = ADDS[kind], t = at || cur;
    if (!def || !t) return;
    if (def.wallOnly && t.kind !== 'wall') return say('Art hangs on a wall: click a wall first.');
    const p = t.point.clone(), toCam = new THREE.Vector3().subVectors(camera.position, p);
    let rot, where = 'floor', y = p.y;
    if (t.kind === 'wall') { // back against the wall, facing into the room, on that room's floor
      where = 'wall'; rot = Math.atan2(t.normal.x, t.normal.z) / R;
      p.addScaledVector(t.normal, def.back || where === 'wall' && def.wall ? 0.02 : 1.6);
      y = env.floorAt(p.x, p.z, p.y + 0.5); if (y === -Infinity) y = p.y - 4;
    } else rot = Math.round((Math.atan2(toCam.x, toCam.z) / R) / 15) * 15;
    snapshot();
    const a = { id: nextId(), kind, x: p.x, y, z: p.z, rot, where, ...extra };
    E.added.push(a); save();
    const it = await buildAdded(a);
    cur = { ...t, item: it, kind: 'item' }; all = false; render('main'); highlight([it]);
    say(`Added ${kind === 'art' ? (ARTS[extra.v]?.label || 'art').toLowerCase() : 'a ' + (def.label === 'TV' ? 'TV' : def.label.toLowerCase())}. Move it, or nudge it with the arrows.`);
  }
  async function copyHere() {
    const it = cur && cur.item; if (!it) return;
    startMove(true);
  }
  function startMove(copy = false) {
    pending = { items: targets(), copy };
    const n = pending.items.length;
    close(true);
    const wall = isWallItem(pending.items[0]);
    hint.hidden = false; hint.textContent = `${copy ? 'Copy' : 'Move'} ${n > 1 ? n + ' pieces' : nameOf(pending.items[0])}: click ${wall ? 'a spot on a wall' : 'the floor (or a wall to back it against)'} where it should go · Esc cancels`;
  }
  function isWallItem(it) { return !!it && (it.wall || WALL_LABELS.has(it.label)); }
  let toastT = null;
  function toast(t, ms = 3500) { hint.hidden = false; hint.textContent = t; clearTimeout(toastT); toastT = setTimeout(() => { if (!pending) hint.hidden = true; }, ms); }
  async function finishMove(t) {
    const { items, copy } = pending;
    const first0 = items[0];
    if (t && (t.kind === 'wall' || (t.kind === 'item' && Math.abs(t.normal.y) < 0.3 && isWallItem(first0))) && !copy) { pending = null; hint.hidden = true; return moveToWall(items, t); }
    if (isWallItem(first0)) { toast('Click a spot on a wall to hang it there · Esc cancels', 4000); return false; }
    pending = null; hint.hidden = true;
    if (!t || t.kind !== 'floor') return false;
    const first = items[0], s0 = E.items[first.id] || {};
    const bx = first.x + (s0.dx || 0), bz = first.z + (s0.dz || 0), ddx = t.point.x - bx, ddz = t.point.z - bz;
    snapshot();
    if (copy) {
      for (const it of items) {
        const s = E.items[it.id] || {}, id = nextId();
        if (it.added && it.kind !== 'copy') E.added.push({ id, kind: it.kind, x: it.x, y: it.y, z: it.z, rot: it.rot, where: 'floor' });
        else E.added.push({ id, kind: 'copy', src: it.kind === 'copy' ? it.src : it.id });
        E.items[id] = { ...s, removed: false, dx: (s.dx || 0) + ddx, dz: (s.dz || 0) + ddz };
      }
      await syncAdded(); save();
      return true;
    }
    for (const it of items) { const s = st(it.id); s.dx = (s.dx || 0) + ddx; s.dz = (s.dz || 0) + ddz; applyItem(it); }
    save(); gfx.dirty();
    return true;
  }
  // back a piece against the clicked wall, facing into the room (TVs and art keep their height)
  function moveToWall(items, t) {
    const n = t.normal.clone().setY(0).normalize(), rot = Math.atan2(n.x, n.z) / R;
    snapshot();
    for (const it of items.slice(0, 1)) {
      const s = st(it.id), wall = isWallItem(it), fp = wall ? { back: true } : (it.fp || (it.fp = footprint(it)));
      const off = fp.back ? 0.02 : (fp.d || 2) / 2 + 0.05;
      const px = t.point.x + n.x * off, pz = t.point.z + n.z * off;
      const f = env.floorAt(px, pz, t.point.y + 0.5);
      s.dx = px - it.x; s.dz = pz - it.z; s.spin = rot - it.rot; s.dl = f === -Infinity ? 0 : f - it.y;
      applyItem(it);
    }
    save(); gfx.dirty();
    return true;
  }
  async function doUndo() { if (!undo.length) return; await restore(undo.pop()); if (cur) { render('main'); say('Undone.'); highlight(targets()); } }
  async function resetAll() { snapshot(); await restore(JSON.stringify({ items: {}, paint: {}, added: [] })); }

  // ---------------------------------------------------------------- typed commands (a small rule-based parser)
  function command(text) {
    const t = ' ' + text.toLowerCase().trim() + ' ';
    if (!t.trim()) return;
    if (/\bundo\b/.test(t)) return doUndo();
    if (cur?.item && !/\b(add|put|place|hang|move)\b/.test(t)) { snapshot(); quiet = true; try { return runCommand(t); } finally { quiet = false; } }
    return runCommand(t);
  }
  function runCommand(t) {
    if (/\b(these|those|all|every|both)\b/.test(t) && cur?.item) { all = true; highlight(targets()); }
    const color = Object.keys(COLORS).sort((a, b) => b.length - a.length).find((c) => new RegExp(`\\b${c}\\b`).test(t));
    const addM = /\b(add|put|place|hang|get me|i want|give me)\b/.test(t) && ADD_WORDS.find(([, re]) => re.test(t));
    if (addM) return addHere(addM[0]);
    if (cur?.kind === 'wall' && (/\b(paint|repaint|color|colour)\b/.test(t) || color) && color) { if (cur.key) return paint(COLORS[color]); return say('That surface isn\'t a painted room wall.'); }
    if (!cur?.item) return say('Try: "add a sofa", "add a TV", "put a plant here"' + (cur?.kind === 'wall' ? ', or "paint this sage".' : '.'));
    if (/\b(remove|delete|get rid|take (it|this|them) (away|out)|throw|toss|lose)\b/.test(t)) return act('remove');
    if (/\b(reset|original|put (it|them) back|as it was)\b/.test(t)) return act('reset');
    let did = false;
    const amt = /\b(much|a lot|way)\b/.test(t) ? 1.35 : /\b(slightly|a bit|a little|bit)\b/.test(t) ? 1.07 : 1.15;
    for (const [re, a] of [[/\b(taller|higher|raise)\b/, ['sy', amt]], [/\b(shorter|lower)\b/, ['sy', 1 / amt]], [/\b(wider|longer)\b/, ['sx', amt]], [/\b(narrower|thinner|skinnier)\b/, ['sx', 1 / amt]],
      [/\b(deeper)\b/, ['sz', amt]], [/\b(bigger|larger|scale up)\b/, ['all', amt]], [/\b(smaller|scale down|tiny|little smaller)\b/, ['all', 1 / amt]]]) if (re.test(t)) { act('scale', a); did = true; }
    if (/\b(turn|rotate|spin|flip|face)\b/.test(t)) { act('spin', /\b(around|180|flip|other way)\b/.test(t) ? 180 : /\bleft\b/.test(t) ? 90 : /\b45\b/.test(t) ? 45 : -90); did = true; }
    if (color) { act('color', COLORS[color]); did = true; }
    if (/\b(move|put it|over there|somewhere else)\b/.test(t) && !did) return startMove();
    if (!did) say('I can recolor (e.g. "white", "navy"), resize ("taller", "smaller"), turn, move or remove it, or add things ("add a lamp").');
  }

  // ---------------------------------------------------------------- entry points used by app.js
  const ndc = (x, y) => { const r = renderer.domElement.getBoundingClientRect(); return new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); };
  async function clickAt(x, y, center = false) {
    if (!pop.hidden) { close(true); return true; }
    const t = pickAt(center ? new THREE.Vector2(0, 0) : ndc(x, y));
    if (pending) { await finishMove(t); return true; }
    if (!t) return false;
    open(t, center ? innerWidth / 2 : x, center ? innerHeight / 2 : y);
    return true;
  }
  addEventListener('keydown', (e) => {
    if (e.code === 'Escape') { if (pending) { pending = null; hint.hidden = true; } if (!pop.hidden) close(false); }
    if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey) && !(e.target.matches && e.target.matches('input, textarea'))) { e.preventDefault(); doUndo(); toast('Undone.', 1500); }
  });
  // walk mode: what the crosshair is on, if it is close enough to edit
  const REACH = 12;
  function aim() {
    const t = pickAt(new THREE.Vector2(0, 0));
    if (!t || t.hit.distance > REACH) return null;
    t.label = t.item ? `edit ${nameOf(t.item)}` : t.kind === 'wall' ? (t.key ? 'paint wall · hang a TV or art' : 'hang a TV or art') : t.kind === 'floor' ? 'add something here' : null;
    return t.label ? t : null;
  }
  function openAhead() {
    if (!pop.hidden) { close(true); return true; }
    const t = aim();
    if (pending) { finishMove(pickAt(new THREE.Vector2(0, 0))); return true; }
    if (!t) return false;
    open(t, innerWidth / 2, innerHeight / 2);
    return true;
  }
  pop.addEventListener('pointerdown', (e) => e.stopPropagation());
  document.querySelector('#edit-undo')?.addEventListener('click', () => doUndo());
  document.querySelector('#edit-reset')?.addEventListener('click', () => { if (confirm('Remove all your point-and-click edits to this house?')) resetAll(); });
  // start: rebuild what was saved
  (async () => { await syncAdded(); applyAll(); updateCount(); })();
  return { clickAt, aim, openAhead, isOpen: () => !pop.hidden, isPending: () => !!pending, close, refresh: () => { rebuildCopies(); applyAll(); }, reapplyPaint, command: (s) => command(s), open, pickAt, E: () => E };
}
