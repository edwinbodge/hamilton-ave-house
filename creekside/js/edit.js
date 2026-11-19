// Point-and-click editing: click a piece of furniture, a wall or the floor (in walk mode, whatever is under
// the crosshair) and a small menu opens next to it: recolor / resize / remove / move / turn a piece, repaint a
// room's walls, add a TV, a plant or other furniture, or type what you want ("make these chairs white").
// Edits are kept in this browser (localStorage) and can be undone or reset.
import * as THREE from 'three';
import { ITEMS, Kit, Batcher, loadGLB, placeModel, applyFinish } from './geom.js';
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

// things you can add: a hand-built piece (fn on a Kit) or an asset-pack model; wall: true = back against a wall
const ADDS = {
  tv: { label: 'TV', wall: (k) => wallTV(k, 65), floor: (k) => { mediaConsole(k, 5.5); standTV(k, 55, 1.8); }, back: true },
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
    g.position.set(it.x + (s.dx || 0), it.y, it.z + (s.dz || 0));
    g.rotation.y = (it.rot + (s.spin || 0)) * R;
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
    const it = { id: a.id, x: a.x, y: a.y, z: a.z, rot: a.rot, label: def.label === 'TV' ? 'TV' : def.label.toLowerCase(), added: true, kind: a.kind, solids: [] };
    const g = new THREE.Group(); g.name = 'item'; g.userData.item = it; it.group = g;
    g.position.set(a.x, a.y, a.z); g.rotation.y = a.rot * R; g.updateMatrix();
    const inner = new THREE.Group(); inner.applyMatrix4(g.matrix.clone().invert()); g.add(inner);
    const { PHYS } = await import('./geom.js');
    const n0 = PHYS.solids.length;
    if (def.glb) {
      const src = await loadGLB(def.glb), o = placeModel(src, def.spec || {}, a.x, a.y, a.z, a.rot);
      inner.add(o);
      const sz = new THREE.Vector3(); new THREE.Box3().setFromObject(o).getSize(sz);
      const rr = a.rot * R, w = Math.abs(sz.x * Math.cos(rr)) + Math.abs(sz.z * Math.sin(rr)), d = Math.abs(sz.z * Math.cos(rr)) + Math.abs(sz.x * Math.sin(rr));
      if (sz.y > 1.2 && a.kind !== 'rug') { const k = new Kit(null, 'edit').at(a.x, a.z, a.y, a.rot); const z0 = def.spec && def.spec.back ? 0 : -d / 2; k.solid(-w / 2, z0, w / 2, z0 + d, 0, sz.y); }
    } else {
      const b = new Batcher(), k = new Kit(b, 'edit').at(a.x, a.z, a.y, a.rot);
      (a.where === 'wall' && def.wall ? def.wall : def.floor || def.fn)(k);
      b.build(inner);
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
      row.append(btn('Recolor', '◐', () => render('color'), view === 'color' ? 'on' : ''), btn('Resize', '⤢', () => render('size'), view === 'size' ? 'on' : ''), btn('Remove', '✕', () => act('remove')));
      if (view === 'main' || view === 'more') {
        const more = document.createElement('div'); more.className = 'ep-more';
        more.append(btn('Move', '✥', () => startMove()), btn('Turn', '↻', () => act('spin', 90)), btn('Copy', '⧉', () => copyHere()), btn('Reset', '⟲', () => act('reset')));
        sub.appendChild(more);
      }
      if (view === 'color') sub.appendChild(swatches((hex) => act('color', hex), true));
      if (view === 'size') {
        const g = document.createElement('div'); g.className = 'ep-grid';
        for (const [l, a] of [['Taller', ['sy', 1.15]], ['Shorter', ['sy', 1 / 1.15]], ['Wider', ['sx', 1.15]], ['Narrower', ['sx', 1 / 1.15]], ['Bigger', ['all', 1.12]], ['Smaller', ['all', 1 / 1.12]]]) g.appendChild(btn(l, '', () => act('scale', a)));
        sub.appendChild(g);
      }
    } else if (cur.kind === 'wall') {
      row.append(btn('Repaint', '◐', () => render('paint'), view === 'paint' ? 'on' : ''), btn('Hang a TV', '▭', () => addHere('tv')), btn('Add item', '+', () => render('add'), view === 'add' ? 'on' : ''));
      if (view === 'paint') {
        if (!cur.key) sub.innerHTML = '<p class="muted">This surface isn\'t a painted room wall.</p>';
        else { sub.appendChild(swatches((hex) => paint(hex), false, PAINTS)); }
      }
    } else {
      row.append(btn('Add item', '+', () => render('add'), view === 'add' ? 'on' : ''), btn('Add a TV', '▭', () => addHere('tv')), btn('Add a plant', '✿', () => addHere('plant')));
    }
    if (view === 'add') {
      const g = document.createElement('div'); g.className = 'ep-grid';
      for (const [k, d] of Object.entries(ADDS)) g.appendChild(btn(d.label, '', () => addHere(k)));
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
      if (op === 'scale') { const [ax, f] = arg; for (const k of ax === 'all' ? ['sx', 'sy', 'sz'] : [ax]) s[k] = Math.max(0.3, Math.min(3, (s[k] || 1) * f)); }
      applyItem(it);
    }
    syncAdded(); save(); gfx.dirty();
    const n = list.length > 1 ? `${list.length} pieces` : nameOf(list[0]);
    if (op === 'remove') { say(`Removed ${n}.`); setTimeout(() => close(), 450); return; }
    highlight(list);
    say({ color: `Recolored ${n}.`, spin: `Turned ${n}.`, scale: `Resized ${n}.`, reset: `Put ${n} back as it was.` }[op] || 'Done.');
    const v = op === 'color' ? 'color' : op === 'scale' ? 'size' : 'main'; const m = pop.querySelector('.ep-msg').textContent; render(v); say(m);
  }
  function paint(hex) {
    if (!cur || !cur.key) return say('Click a painted wall to repaint a room.');
    snapshot(); E.paint[cur.key] = hex; applyFinish(cur.key, 'paint:' + hex); save(); gfx.dirty();
    say(`Repainted the ${roomName(cur.point, cur.normal) || 'room'} walls.`);
  }
  let nextId = () => 'a' + Date.now().toString(36) + Math.floor(Math.random() * 99);
  async function addHere(kind, at) {
    const def = ADDS[kind], t = at || cur;
    if (!def || !t) return;
    const p = t.point.clone(), toCam = new THREE.Vector3().subVectors(camera.position, p);
    let rot, where = 'floor', y = p.y;
    if (t.kind === 'wall') { // back against the wall, facing into the room, on that room's floor
      where = 'wall'; rot = Math.atan2(t.normal.x, t.normal.z) / R;
      p.addScaledVector(t.normal, def.back || where === 'wall' && def.wall ? 0.02 : 1.6);
      y = env.floorAt(p.x, p.z, p.y + 0.5); if (y === -Infinity) y = p.y - 4;
    } else rot = Math.round((Math.atan2(toCam.x, toCam.z) / R) / 15) * 15;
    snapshot();
    const a = { id: nextId(), kind, x: p.x, y, z: p.z, rot, where };
    E.added.push(a); save();
    const it = await buildAdded(a);
    cur = { ...t, item: it, kind: 'item' }; all = false; render('main'); highlight([it]);
    say(`Added a ${def.label === 'TV' ? 'TV' : def.label.toLowerCase()}. Use Move or Turn to adjust it.`);
  }
  async function copyHere() {
    const it = cur && cur.item; if (!it) return;
    startMove(true);
  }
  function startMove(copy = false) {
    pending = { items: targets(), copy };
    const n = pending.items.length;
    close(true);
    hint.hidden = false; hint.textContent = `${copy ? 'Copy' : 'Move'} ${n > 1 ? n + ' pieces' : nameOf(pending.items[0])}: click the floor where it should go (Esc to cancel).`;
  }
  async function finishMove(t) {
    const { items, copy } = pending; pending = null; hint.hidden = true;
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
  });
  pop.addEventListener('pointerdown', (e) => e.stopPropagation());
  document.querySelector('#edit-undo')?.addEventListener('click', () => doUndo());
  document.querySelector('#edit-reset')?.addEventListener('click', () => { if (confirm('Remove all your point-and-click edits to this house?')) resetAll(); });
  // start: rebuild what was saved
  (async () => { await syncAdded(); applyAll(); updateCount(); })();
  return { clickAt, isOpen: () => !pop.hidden, isPending: () => !!pending, close, refresh: () => { rebuildCopies(); applyAll(); }, reapplyPaint, command: (s) => command(s), open, pickAt, E: () => E };
}
