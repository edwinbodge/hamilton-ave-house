// Point-and-click editing. Click a piece, a wall, the floor or the ceiling (in the walk-through: walk up to it
// and press F or click) and a small menu opens beside it. What it offers comes from the catalog (catalog.js):
// every piece belongs to a family (sofas, cars, ceiling lights, lamps, art, TVs, rugs...), "Change" swaps it
// for another option of that family, and "Add" places a new option of a family that goes on that surface.
// Edits are kept in this browser (localStorage) and can be undone (Ctrl+Z) or reset.
import * as THREE from 'three';
import { ITEMS, Kit, Batcher, loadGLB, placeModel, applyFinish, modelsShown, PHYS } from './geom.js';
import { FAMILIES, LABEL_FAMILY, optionOf, familyOfGlb, thumbURL } from './catalog.js';

const KEY = 'creekside-edits', POSKEY = 'creekside-edit-pos';
const R = Math.PI / 180;
const COLORS = {
  white: '#f2f0ea', 'off-white': '#ece6da', cream: '#e9dfc9', ivory: '#eee8d6', beige: '#d9cbb2', tan: '#c2a57f', greige: '#cfc6b8',
  gray: '#9a9a96', grey: '#9a9a96', silver: '#c9ccce', 'light gray': '#c9c9c4', charcoal: '#3d3f42', black: '#1d1d1f',
  navy: '#22324f', blue: '#3f6a9a', 'light blue': '#a9c1d6', 'dusty blue': '#8fa5b5', teal: '#2f6f73', green: '#3f6b48',
  sage: '#a3b19a', olive: '#6b6b3f', emerald: '#1f6a4f', red: '#9e2f2f', burgundy: '#6b1f2a', pink: '#e2b3b5', blush: '#e6cfc6',
  orange: '#d07a35', rust: '#a4502a', yellow: '#e2c25a', mustard: '#c99a2e', purple: '#5d4a78', lavender: '#b9aed0',
  brown: '#6b4a33', walnut: '#5a3b26', oak: '#b88a55', espresso: '#33231a', natural: '#c49a6c',
};
const SWATCHES = ['white', 'cream', 'beige', 'greige', 'gray', 'charcoal', 'black', 'navy', 'dusty blue', 'sage', 'green', 'emerald', 'blush', 'rust', 'mustard', 'walnut', 'oak'];
const PAINTS = { 'Warm white': '#ece8df', 'Soft white': '#f3f2ee', Greige: '#ddd5c8', 'Pale sage': '#d3d8c9', 'Light gray': '#dfe2e0', Oatmeal: '#e4ddd0', 'Dusty blue': '#cdd6da', Sage: '#c8cfbe', Blush: '#e6d8cf', Navy: '#2f3d52', 'Forest green': '#3e5446', Charcoal: '#4a4b4d' };
const SINGULAR = { sofa: 'sofa', armchair: 'armchair', chair: 'chair', stool: 'stool', office: 'office chair', outdoor: 'chair', bed: 'bed', nightstand: 'nightstand', dresser: 'dresser',
  console: 'console', dining: 'table', coffee: 'coffee table', side: 'side table', desk: 'desk', toilet: 'toilet', car: 'car', ceiling: 'light', lamp: 'lamp', sconce: 'wall light',
  tv: 'TV', art: 'art', rug: 'rug', plant: 'plant', bookcase: 'bookcase' };
const NAMED = new Set(['car', 'ceiling', 'lamp', 'sconce', 'tv', 'art']); // families whose option name is the piece's name ("Rivian R2")
// words in a typed request -> family to add
const ADD_WORDS = [['tv', /\b(tv|television)\b/], ['sofa', /\b(sofa|couch|sectional|loveseat)\b/], ['armchair', /\barm ?chair|accent chair|recliner\b/],
  ['office', /\b(office|desk) chair\b/], ['chair', /\bchairs?\b/], ['coffee', /\bcoffee table\b/], ['dining', /\b(dining|kitchen) table\b/],
  ['side', /\b(side|end|accent) table\b/], ['desk', /\bdesk\b/], ['bed', /\bbed\b/], ['dresser', /\b(dresser|chest|drawers)\b/],
  ['bookcase', /\b(book ?case|book ?shelf|shelves|shelving)\b/], ['plant', /\b(plant|tree|ficus)\b/], ['ceiling', /\b(chandelier|pendant|ceiling light|fan)\b/],
  ['sconce', /\b(sconce|wall light)\b/], ['lamp', /\blamp\b/], ['rug', /\b(rug|carpet)\b/], ['art', /\b(art|painting|print|picture|photo|mirror|poster)\b/], ['car', /\bcar\b/], ['dining', /\btable\b/]];
// older saved additions used "kind"
const LEGACY = { tv: ['tv', 'tv65'], sofa: ['sofa', 'Sofa08'], armchair: ['armchair', 'Chair12'], chair: ['chair', 'Chair03'], 'coffee table': ['coffee', 'Table39'], 'dining table': ['dining', 'Table17'],
  'side table': ['side', 'Table37'], desk: ['desk', 'Table49'], 'office chair': ['office', 'Chair31'], bed: ['bed', 'Bed15'], dresser: ['dresser', 'Drawer38'], bookcase: ['bookcase', 'bcWalnut'],
  plant: ['plant', 'plant45'], lamp: ['lamp', 'floorLamp'], rug: ['rug', 'rugCream'] };
const STOP = new Set(['gray', 'black', 'white', 'brass', 'small', 'tall', 'round', 'dark', 'light', 'green', 'navy', 'blue', 'brown', 'olive', 'charcoal', 'long', 'metal', 'wood', 'walnut', 'oak', 'pine', 'red', 'fan,', 'glass', 'opal', 'large', 'pair', 'medium']);
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

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

  // ---------------------------------------------------------------- what a piece is
  const famOf = (it) => it.fam || (LABEL_FAMILY[it.label] || [])[0] || (it.model && familyOfGlb(it.model.glb)) || null;
  const baseOpt = (it) => it.opt || (LABEL_FAMILY[it.label] || [])[1] || it.model?.glb || null;
  const curOpt = (it) => { const s = E.items[it.id] || {}; return s.opt || s.glb || baseOpt(it); };
  const isWallItem = (it) => !!it && (it.wall || FAMILIES[famOf(it)]?.place === 'wall' || ['racketRack', 'projectionScreen'].includes(it.label));
  const isCeilingItem = (it) => !!it && FAMILIES[famOf(it)]?.place === 'ceiling';
  function nameOf(it) {
    const f = famOf(it), o = f && optionOf(f, curOpt(it));
    if (f && NAMED.has(f) && o) return o.name.replace(/^(\d+)"$/, '$1" TV');
    if (f) return SINGULAR[f];
    return it.label && it.label !== 'piece' ? it.label.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase() : 'piece';
  }
  const plural = (n) => (/(s|art)$/.test(n) ? n : n.replace(/y$/, 'ie') + 's');

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
    g.visible = !s.removed && shown(it);
    g.scale.set(s.sx || 1, s.sy || 1, s.sz || 1);
    g.position.set(it.x + (s.dx || 0), it.y + (s.dl || 0) + (s.dy || 0), it.z + (s.dz || 0));
    g.rotation.y = (it.rot + (s.spin || 0)) * R;
    // a different option of the family in the same spot ("Change"), or a repainted car
    const fam = FAMILIES[famOf(it)], paintable = !!fam?.paintable;
    const want = s.opt || s.glb || (paintable && s.color ? baseOpt(it) : null);
    const key = want ? want + '|' + (paintable ? s.color || '' : '') : null;
    if (key && it.altKey !== key) setItemOption(it, want, key);
    const alt = !!key && it.altKey === key && it.altReady;
    if (it.altGroup) it.altGroup.visible = alt;
    if (it.modelGroup) it.modelGroup.visible = !alt && (it.added || modelsShown());
    if (it.hand) it.hand.visible = !alt && !(it.modelGroup && it.modelGroup.visible);
    recolor(g, paintable ? null : s.color);
    // collision boxes follow the piece
    const r0 = it.rot * R, r1 = (it.rot + (s.spin || 0)) * R, c0 = Math.cos(r0), s0 = Math.sin(r0), c1 = Math.cos(r1), s1 = Math.sin(r1);
    const sx = s.sx || 1, sy = s.sy || 1, sz = s.sz || 1, yo = (s.dl || 0) + (s.dy || 0);
    for (const { s: so, o } of it.solids || []) {
      if (s.removed) { so.y0 = so.y1 = -1e6; continue; }
      const vx = o.cx - it.x, vz = o.cz - it.z, lx = (vx * c0 - vz * s0) * sx, lz = (vx * s0 + vz * c0) * sz;
      so.cx = it.x + (s.dx || 0) + lx * c1 + lz * s1; so.cz = it.z + (s.dz || 0) - lx * s1 + lz * c1;
      const ux = o.ux * c0 - o.uz * s0, uz = o.ux * s0 + o.uz * c0;
      so.ux = ux * c1 + uz * s1; so.uz = -ux * s1 + uz * c1;
      so.hl = o.hl * Math.hypot(ux * sx, uz * sz); so.ht = o.ht * Math.hypot(uz * sx, ux * sz);
      so.y0 = it.y + yo + (o.y0 - it.y) * sy; so.y1 = it.y + yo + (o.y1 - it.y) * sy;
    }
  }
  // which floor a piece is on, and whether that floor (and, for ceiling lights, the ceiling above it) is shown
  const levelOf = (it) => { const s = E.items[it.id] || {}, y = it.y + (s.dl || 0) - (isCeilingItem(it) && !(it.ctx?.ceil) ? 6 : 0); return y < -4.5 ? 'b' : y < 5.5 ? 'f1' : 'f2'; };
  function shown(it) {
    if (!env.levelShown) return true;
    const lvl = levelOf(it);
    if (it.added && !env.levelShown(lvl)) return false;
    if (isCeilingItem(it) && !env.ceilingShown(lvl)) return false;
    return true;
  }
  function applyLevels() {
    for (const it of ITEMS) if (it.group && (E.items[it.id] || isCeilingItem(it))) it.group.visible = !(E.items[it.id] || {}).removed && shown(it);
    for (const it of ADDED.values()) it.group.visible = !(E.items[it.id] || {}).removed && shown(it);
    gfx.dirty();
  }
  // the original piece's box in its own frame (what a replacement is sized and placed to)
  function footprint(it) {
    if (it.fp) return it.fp;
    const g = it.group; g.updateMatrixWorld(true);
    const inv = g.matrixWorld.clone().invert(), box = new THREE.Box3();
    const src = it.modelGroup && it.modelGroup.children.length ? it.modelGroup : it.hand || g;
    src.traverse((m) => { if (m.isMesh && m.geometry) { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox.clone().applyMatrix4(inv.clone().multiply(m.matrixWorld))); } });
    if (box.isEmpty()) return {};
    const back = Math.abs(box.min.z) < 0.4;
    const fp = { w: box.max.x - box.min.x, d: back ? box.max.z : box.max.z - box.min.z, h: box.max.y - box.min.y, cy: (box.min.y + box.max.y) / 2, top: box.max.y, back, dx: (box.min.x + box.max.x) / 2, dz: back ? 0 : (box.min.z + box.max.z) / 2 };
    if (it.modelGroup && !it.modelGroup.children.length) return fp; // models not loaded yet: don't cache
    return (it.fp = fp);
  }
  const ctxOf = (it, s = E.items[it.id] || {}) => {
    const fam = FAMILIES[famOf(it)], fp = fam?.size ? footprint(it) : {};
    return { ...(it.ctx || {}), w: fp.w, d: fp.d, h: fp.h, color: s.color, where: isWallItem(it) ? 'wall' : 'floor' };
  };
  async function setItemOption(it, optId, key) {
    it.altKey = key; it.altReady = false;
    const famId = famOf(it), opt = optionOf(famId, optId) || { glb: optId };
    if (!it.altGroup) { it.altGroup = new THREE.Group(); it.altGroup.name = 'chosen'; (it.inner || it.group).add(it.altGroup); }
    let content;
    if (opt.glb) {
      const fp = footprint(it), src = await loadGLB(opt.glb);
      if (it.altKey !== key) return;
      content = placeModel(src, { w: fp.w, d: fp.d, back: fp.back, dx: fp.dx, dz: fp.dz }, it.x, it.y, it.z, it.rot);
    } else {
      const b = new Batcher(), n0 = PHYS.solids.length;
      opt.build(new Kit(b, 'edit').at(it.x, it.z, it.y, it.rot), ctxOf(it));
      PHYS.solids.length = n0; // the original piece keeps its collision box
      content = new THREE.Group(); b.build(content);
    }
    it.altGroup.clear(); it.altGroup.add(content);
    it.altReady = true;
    applyItem(it); gfx.dirty();
    if (cur && targets().includes(it)) highlight(targets());
  }
  function buildCopy(a) {
    const src = itemById(a.src);
    if (!src || !src.group) return;
    const it = { id: a.id, x: src.x, y: src.y, z: src.z, rot: src.rot, label: src.label, model: src.model, fam: famOf(src), opt: curOpt(src), ctx: src.ctx, added: true, kind: 'copy', src: a.src, wall: src.wall, solids: [] };
    const g = new THREE.Group(); g.name = 'item'; g.userData.item = it; it.group = g;
    const c = (src.inner || src.group.children[0]).clone(true);
    c.traverse((m) => { if (m.isMesh && m.userData.origMat) { m.material = m.userData.origMat; delete m.userData.origMat; } });
    c.traverse((o) => { if (o.name === 'chosen') o.visible = !!(src.altGroup && src.altGroup.visible); else if (o.name === 'models') o.visible = !!(src.modelGroup && src.modelGroup.visible); else if (o.name === 'hand-built') o.visible = !!(src.hand && src.hand.visible); });
    g.add(c); addedGroup.add(g); ADDED.set(a.id, it); applyItem(it); gfx.dirty();
    return it;
  }
  async function buildAdded(a) {
    if (a.kind === 'copy') return buildCopy(a);
    let [famId, optId] = a.fam ? [a.fam, a.opt] : a.kind === 'art' ? ['art', a.v || 'abstract'] : LEGACY[a.kind] || [];
    const fam = FAMILIES[famId], opt = optionOf(famId, optId);
    if (!fam || !opt) return;
    const it = { id: a.id, x: a.x, y: a.y, z: a.z, rot: a.rot, label: famId, fam: famId, opt: optId, ctx: a.ctx || null, added: true, wall: a.where === 'wall' && fam.place !== 'floor' ? true : fam.place === 'wall', solids: [] };
    const g = new THREE.Group(); g.name = 'item'; g.userData.item = it; it.group = g;
    g.position.set(a.x, a.y, a.z); g.rotation.y = a.rot * R; g.updateMatrix();
    const inner = new THREE.Group(); inner.applyMatrix4(g.matrix.clone().invert()); g.add(inner); it.inner = inner;
    const n0 = PHYS.solids.length;
    if (opt.glb) {
      const spec = { back: !!fam.back }, src = await loadGLB(opt.glb), o = placeModel(src, spec, a.x, a.y, a.z, a.rot);
      it.model = { glb: opt.glb, ...spec };
      it.modelGroup = new THREE.Group(); it.modelGroup.name = 'models'; it.modelGroup.add(o); inner.add(it.modelGroup);
      const sz = new THREE.Vector3(); new THREE.Box3().setFromObject(src).getSize(sz).multiplyScalar(3.28084);
      if (sz.y > 1.2) new Kit(null, 'edit').at(a.x, a.z, a.y, a.rot).solid(-sz.x / 2, spec.back ? 0 : -sz.z / 2, sz.x / 2, spec.back ? sz.z : sz.z / 2, 0, sz.y);
    } else {
      const b = new Batcher();
      opt.build(new Kit(b, 'edit').at(a.x, a.z, a.y, a.rot), { ...(a.ctx || {}), where: a.where });
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
    const kind = it ? 'item' : key.startsWith('W:') ? 'wall' : n.y > 0.7 ? 'floor' : n.y < -0.7 ? 'ceiling' : Math.abs(n.y) < 0.3 ? 'wall' : 'other';
    return { hit: h, point: h.point.clone(), normal: n, item: it, kind, key: key.startsWith('W:') ? key : null };
  }
  const matching = (it) => { const f = famOf(it), o = curOpt(it); return [...ITEMS, ...ADDED.values()].filter((x) => x.group && isVisible(x.group) && (f ? famOf(x) === f && curOpt(x) === o : x.label === it.label)); };

  // ---------------------------------------------------------------- the popup
  const pop = document.createElement('div'); pop.id = 'edit-pop'; pop.hidden = true; document.body.appendChild(pop);
  const hint = document.createElement('div'); hint.id = 'edit-hint'; hint.hidden = true; document.body.appendChild(hint);
  const boxes = new THREE.Group(); scene.add(boxes);
  let cur = null, all = false, pending = null, view = 'main';
  let dragPos = null; try { dragPos = JSON.parse(localStorage.getItem(POSKEY) || 'null'); } catch {}
  function highlight(list) {
    boxes.clear();
    for (const it of list || []) { const b = new THREE.BoxHelper(it.group, 0xffb020); b.material.depthTest = false; b.renderOrder = 20; boxes.add(b); }
    gfx.dirty();
  }
  const targets = () => (cur && cur.item ? (all ? matching(cur.item) : [cur.item]) : []);
  // where the menu goes: where you last dragged it; otherwise off to the side so the piece stays in view
  function position(sx, sy, centered) {
    const w = pop.offsetWidth, h = pop.offsetHeight;
    let x, y;
    if (dragPos) { x = dragPos[0] * innerWidth; y = dragPos[1] * innerHeight; }
    else if (centered) { x = innerWidth - w - Math.max(24, innerWidth * 0.04); y = (innerHeight - h) / 2; }
    else { x = sx + 80 + w < innerWidth - 8 ? sx + 80 : sx - w - 80; y = sy - h / 2; }
    pop.style.left = Math.max(8, Math.min(innerWidth - w - 8, x)) + 'px';
    pop.style.top = Math.max(8, Math.min(innerHeight - h - 8, y)) + 'px';
  }
  function open(target, sx, sy, centered = false) {
    cur = target; all = false; view = 'main';
    render();
    pop.hidden = false;
    position(sx, sy, centered);
    highlight(targets());
    onOpen && onOpen();
    if (matchMedia('(pointer: fine)').matches) setTimeout(() => pop.querySelector('input.cmd')?.focus({ preventScroll: true }), 30);
  }
  function close(relock = true) {
    if (pop.hidden) return;
    pop.hidden = true; cur = null; highlight([]);
    if (document.activeElement && pop.contains(document.activeElement)) document.activeElement.blur();
    onClose && onClose(relock);
  }
  function title() {
    if (!cur) return '';
    const room = roomName(cur.point, cur.normal);
    if (cur.item) {
      const it = cur.item, f = famOf(it), o = f && optionOf(f, curOpt(it)), n = matching(it).length;
      const sub = [o && !NAMED.has(f) ? o.name : null, n > 1 ? `${n} like this in view` : null].filter(Boolean).join(' · ');
      return `${cap(nameOf(it))}${room ? ' · ' + room : ''}` + (sub ? `<small>${sub}</small>` : '');
    }
    return `${cap(cur.kind === 'other' ? 'here' : cur.kind)}${room ? ' · ' + room : ''}`;
  }
  function btn(label, icon, fn, cls = '') { const b = document.createElement('button'); b.className = cls; b.innerHTML = `<span class="ic">${icon}</span>${label}`; b.addEventListener('click', (e) => { e.stopPropagation(); fn(); }); return b; }
  const go = (v) => { view = view === v ? 'main' : v; render(); }; // tapping an open tab closes it
  function optionGrid(famId, onPick, currentId) {
    const g = document.createElement('div'); g.className = 'ep-thumbs';
    for (const o of FAMILIES[famId].options) {
      const b = document.createElement('button'); b.title = o.name; if (o.id === currentId) b.className = 'on';
      const img = document.createElement('img'); img.alt = ''; b.appendChild(img);
      const cap_ = document.createElement('span'); cap_.textContent = o.name; b.appendChild(cap_);
      thumbURL(famId, o).then((u) => { img.src = u; });
      b.addEventListener('click', (e) => { e.stopPropagation(); onPick(o.id); });
      g.appendChild(b);
    }
    return g;
  }
  function render() {
    pop.innerHTML = '';
    const head = document.createElement('div'); head.className = 'ep-head'; head.title = 'Drag to move this menu';
    head.innerHTML = `<span class="ep-grip">⠿</span><b>${title()}</b>`;
    const x = document.createElement('button'); x.className = 'ep-x'; x.textContent = '×'; x.title = 'Close (Esc)'; x.addEventListener('click', () => close()); head.appendChild(x);
    pop.appendChild(head);
    const row = document.createElement('div'); row.className = 'ep-row';
    const sub = document.createElement('div'); sub.className = 'ep-sub';
    const it = cur.item;
    if (it) {
      const famId = famOf(it), fam = FAMILIES[famId];
      const n = matching(it).length;
      if (n > 1) {
        const l = document.createElement('label'); l.className = 'ep-all';
        l.innerHTML = `<input type="checkbox" ${all ? 'checked' : ''}> Apply to all ${n} ${plural(nameOf(it))}`;
        l.querySelector('input').addEventListener('change', (e) => { all = e.target.checked; highlight(targets()); });
        pop.appendChild(l);
      }
      row.append(btn(fam?.paintable ? 'Paint' : 'Recolor', '◐', () => go('color'), view === 'color' ? 'on' : ''));
      if (fam) row.append(btn('Swap', '⇄', () => go('change'), view === 'change' ? 'on' : ''));
      row.append(btn('Resize', '⤢', () => go('size'), view === 'size' ? 'on' : ''), btn('Remove', '✕', () => act('remove')));
      { // always there, whatever tab is open: move / turn / copy / reset and the nudge arrows
        const more = document.createElement('div'); more.className = 'ep-more';
        more.append(btn('Move', '✥', () => startMove()), btn('Turn', '↻', () => act('spin', 90)), btn('Copy', '⧉', () => startMove(true)), btn('Reset', '⟲', () => act('reset')));
        sub.appendChild(more);
        const wallish = isWallItem(it);
        const nudge = document.createElement('div'); nudge.className = 'ep-nudge';
        nudge.append(Object.assign(document.createElement('span'), { className: 'muted', textContent: 'Nudge 6"' }));
        for (const [l, d, t] of wallish ? [['←', 'left', 'Left'], ['→', 'right', 'Right'], ['↑', 'up', 'Up'], ['↓', 'down', 'Down']] : [['←', 'left', 'Left'], ['→', 'right', 'Right'], ['↑', 'away', 'Away from you'], ['↓', 'closer', 'Toward you']]) { const b = btn(l, '', () => act('nudge', d)); b.title = t; nudge.appendChild(b); }
        sub.appendChild(nudge);
        if (view !== 'main') sub.appendChild(Object.assign(document.createElement('div'), { className: 'ep-div' }));
      }
      if (view === 'change') {
        sub.appendChild(optionGrid(famId, (id) => act('opt', id), curOpt(it)));
        if ((E.items[it.id] || {}).opt || (E.items[it.id] || {}).glb) sub.appendChild(btn('Back to the original', '', () => act('opt', null), 'ep-link'));
      }
      if (view === 'color') sub.appendChild(fam?.paintable ? swatches((hex) => act('color', hex), true, Object.fromEntries(fam.colors.map((c) => [c, c]))) : swatches((hex) => act('color', hex), true));
      if (view === 'size') {
        const g = document.createElement('div'); g.className = 'ep-grid';
        for (const [l, a] of [['Taller', ['sy', 1.15]], ['Shorter', ['sy', 1 / 1.15]], ['Wider', ['sx', 1.15]], ['Narrower', ['sx', 1 / 1.15]], ['Bigger', ['all', 1.12]], ['Smaller', ['all', 1 / 1.12]]]) g.appendChild(btn(l, '', () => act('scale', a)));
        sub.appendChild(g);
      }
    } else {
      const surf = cur.kind === 'wall' ? 'wall' : cur.kind === 'ceiling' ? 'ceiling' : 'floor';
      if (surf === 'wall') row.append(btn('Repaint', '◐', () => go('paint'), view === 'paint' ? 'on' : ''), btn('TV', '▭', () => go('add:tv'), view === 'add:tv' ? 'on' : ''), btn('Art', '▣', () => go('add:art'), view === 'add:art' ? 'on' : ''));
      else if (surf === 'ceiling') row.append(btn('Add a light', '✺', () => go('add:ceiling'), view === 'add:ceiling' ? 'on' : ''));
      else row.append(btn('Furniture', '+', () => go('add'), view === 'add' ? 'on' : ''), btn('Lamp', '✺', () => go('add:lamp'), view === 'add:lamp' ? 'on' : ''), btn('Plant', '✿', () => go('add:plant'), view === 'add:plant' ? 'on' : ''), btn('Rug', '▦', () => go('add:rug'), view === 'add:rug' ? 'on' : ''));
      row.classList.add('n' + row.children.length);
      if (view === 'main' && surf === 'wall') { const more = document.createElement('div'); more.className = 'ep-more'; more.append(btn('Wall light', '✺', () => go('add:sconce')), btn('Furniture against this wall', '+', () => go('add'))); sub.appendChild(more); }
      if (view === 'paint') { if (!cur.key) sub.innerHTML = '<p class="muted">This surface isn\'t a painted room wall.</p>'; else sub.appendChild(swatches((hex) => paint(hex), false, PAINTS)); }
      if (view === 'add') {
        const g = document.createElement('div'); g.className = 'ep-grid';
        for (const [id, f] of Object.entries(FAMILIES)) if (f.add && f.place === 'floor' && !['lamp', 'plant', 'rug'].includes(id) && (surf === 'floor' || f.back)) g.appendChild(btn(f.add, '', () => go('add:' + id)));
        sub.appendChild(g);
      }
      if (view.startsWith('add:')) { const famId = view.slice(4); sub.appendChild(Object.assign(document.createElement('p'), { className: 'muted ep-cap', textContent: `${FAMILIES[famId].name}: pick one to place it here` })); sub.appendChild(optionGrid(famId, (id) => addHere(famId, id))); }
    }
    if (!row.classList.contains('n1') && !row.classList.contains('n2') && !row.classList.contains('n3') && row.children.length === 4) row.classList.add('four');
    pop.append(row, sub);
    const f = document.createElement('form'); f.className = 'ep-cmd';
    f.innerHTML = `<input class="cmd" type="text" placeholder="${it ? 'e.g. make these white, taller, a Tesla, remove' : cur.kind === 'wall' ? 'e.g. paint this sage, add a TV, hang a mirror' : cur.kind === 'ceiling' ? 'e.g. add a chandelier' : 'e.g. add a sofa, put a plant here'}" autocomplete="off">`;
    f.addEventListener('submit', (e) => { e.preventDefault(); command(f.querySelector('input').value); });
    pop.appendChild(f);
    const msg = document.createElement('div'); msg.className = 'ep-msg'; pop.appendChild(msg);
    const foot = document.createElement('div'); foot.className = 'ep-foot';
    const u = document.createElement('button'); u.textContent = 'Undo'; u.disabled = !undo.length; u.addEventListener('click', () => doUndo());
    foot.append(u, Object.assign(document.createElement('span'), { className: 'muted', textContent: countText() }));
    if (dragPos) { const r = document.createElement('button'); r.textContent = 'Re-dock menu'; r.title = 'Put the menu back in its default spot'; r.addEventListener('click', () => { dragPos = null; try { localStorage.removeItem(POSKEY); } catch {} position(innerWidth / 2, innerHeight / 2, true); render(); }); foot.appendChild(r); }
    pop.appendChild(foot);
    head.addEventListener('pointerdown', startDrag);
    if (!pop.hidden) requestAnimationFrame(clamp);
  }
  // drag the menu by its header; it stays where you leave it (also next time it opens)
  function startDrag(e) {
    if (e.target.closest('button')) return;
    e.preventDefault();
    const r = pop.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top;
    const move = (ev) => { pop.style.left = Math.max(0, Math.min(innerWidth - 60, ev.clientX - ox)) + 'px'; pop.style.top = Math.max(0, Math.min(innerHeight - 40, ev.clientY - oy)) + 'px'; };
    const up = () => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up);
      const rr = pop.getBoundingClientRect(); dragPos = [rr.left / innerWidth, rr.top / innerHeight];
      try { localStorage.setItem(POSKEY, JSON.stringify(dragPos)); } catch {}
      render();
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
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
  let toastT = null;
  function toast(t, ms = 3500) { hint.hidden = false; hint.textContent = t; clearTimeout(toastT); toastT = setTimeout(() => { if (!pending) hint.hidden = true; }, ms); }

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
      if (op === 'spin') s.spin = (arg % 90 ? (s.spin || 0) + arg : Math.round((it.rot + (s.spin || 0) + arg) / 90) * 90 - it.rot) % 360; // turns land square to the house
      if (op === 'opt') { delete s.glb; if (arg && arg !== baseOpt(it)) s.opt = arg; else delete s.opt; }
      if (op === 'scale') { const [ax, f] = arg; for (const k of ax === 'all' ? ['sx', 'sy', 'sz'] : [ax]) s[k] = Math.max(0.3, Math.min(3, (s[k] || 1) * f)); }
      if (op === 'nudge') {
        const r = (it.rot + (s.spin || 0)) * R, tx = Math.cos(r), tz = -Math.sin(r), step = 0.5;
        const cr = new THREE.Vector3(); camera.getWorldDirection(cr);
        const [fx, fz] = axisOf(cr.x, cr.z), rx = -fz, rz = fx; // the house axis closest to where you're looking (and to your right)
        if (isWallItem(it) && (arg === 'left' || arg === 'right')) { const [ax, az] = axisOf(tx, tz), k = (arg === 'right' ? 1 : -1) * (Math.sign(ax * rx + az * rz) || 1) * step; s.dx = (s.dx || 0) + ax * k; s.dz = (s.dz || 0) + az * k; }
        else if (arg === 'left' || arg === 'right') { const k = arg === 'right' ? step : -step; s.dx = (s.dx || 0) + rx * k; s.dz = (s.dz || 0) + rz * k; }
        else if (arg === 'up' || arg === 'down') s.dy = (s.dy || 0) + (arg === 'up' ? step : -step);
        else { const k = arg === 'away' ? step : -step; s.dx = (s.dx || 0) + fx * k; s.dz = (s.dz || 0) + fz * k; }
      }
      if (!Object.keys(s).length) delete E.items[it.id];
      applyItem(it);
    }
    syncAdded(); save(); gfx.dirty();
    const n = list.length > 1 ? `${list.length} ${plural(nameOf(list[0]))}` : `the ${nameOf(list[0])}`;
    if (op === 'remove') { close(true); toast(`Removed ${n}. Ctrl+Z (or Undo in the panel) brings it back.`); return; }
    highlight(list);
    const msg = { color: `Recolored ${n}.`, spin: `Turned ${n}.`, scale: `Resized ${n}.`, reset: `Put ${n} back as it was.`, opt: arg ? `Changed to ${optionOf(famOf(list[0]), arg)?.name || 'that one'}.` : `Back to the original.`, nudge: `Nudged ${n}.` }[op] || 'Done.';
    if (op === 'color' || op === 'scale' || op === 'opt') view = { color: 'color', scale: 'size', opt: 'change' }[op]; render(); say(msg);
  }
  function paint(hex) {
    if (!cur || !cur.key) return say('Click a painted wall to repaint a room.');
    snapshot(); E.paint[cur.key] = hex; applyFinish(cur.key, 'paint:' + hex); save(); gfx.dirty();
    say(`Repainted the ${roomName(cur.point, cur.normal) || 'room'} walls.`);
  }
  const nextId = () => 'a' + Date.now().toString(36) + Math.floor(Math.random() * 99);
  async function addHere(famId, optId) {
    const fam = FAMILIES[famId], t = cur;
    if (!fam || !t) return;
    optId = optId || fam.options[0].id;
    if (fam.place === 'wall' && t.kind !== 'wall') return say(`${fam.name} go on a wall: click a wall first.`);
    if (fam.place === 'ceiling' && t.kind !== 'ceiling') return say('Lights go on the ceiling: look up and click the ceiling.');
    const p = t.point.clone(), toCam = new THREE.Vector3().subVectors(camera.position, p);
    let rot, where = 'floor', y = p.y, ctx = null;
    if (fam.place === 'ceiling') { rot = 0; where = 'ceiling'; ctx = { ceil: 0, hang: Math.min(2.6, Math.max(1.2, (p.y - env.floorAt(p.x, p.z, p.y - 0.5)) - 6.2)) }; }
    else if (t.kind === 'wall') { // back against the wall, facing into the room, on that room's floor
      const n = t.normal.clone().setY(0).normalize();
      where = fam.place === 'wall' ? 'wall' : 'floor'; rot = snapRot(Math.atan2(n.x, n.z) / R, 12);
      p.addScaledVector(n, fam.back || fam.place === 'wall' ? 0.02 : 1.6);
      y = env.floorAt(p.x, p.z, p.y + 0.5); if (y === -Infinity) y = p.y - 4;
    } else rot = snapRot(Math.atan2(toCam.x, toCam.z) / R); // square to the house, facing you
    snapshot();
    const a = { id: nextId(), fam: famId, opt: optId, x: p.x, y, z: p.z, rot, where, ctx };
    E.added.push(a); save();
    const it = await buildAdded(a);
    if (!it) return;
    if (t.kind === 'wall') snapToWall(it, t, false); else if (fam.place === 'floor') snapBack(it);
    cur = { ...t, item: it, kind: 'item' }; all = false; view = 'main'; render(); highlight([it]);
    say(`Added ${NAMED.has(famId) ? optionOf(famId, optId).name : 'a ' + SINGULAR[famId]}. Move it, or nudge it with the arrows.`);
  }
  function startMove(copy = false) {
    pending = { items: targets(), copy };
    const n = pending.items.length, it = pending.items[0];
    close(true);
    const where = isWallItem(it) ? 'a spot on a wall' : isCeilingItem(it) ? 'a spot on the ceiling' : 'the floor (or a wall to back it against)';
    hint.hidden = false; hint.textContent = `${copy ? 'Copy' : 'Move'} ${n > 1 ? n + ' pieces' : 'the ' + nameOf(it)}: click ${where} · Esc cancels`;
  }
  async function finishMove(t) {
    const { items, copy } = pending, first = items[0];
    const wallTarget = t && (t.kind === 'wall' || (t.kind === 'item' && Math.abs(t.normal.y) < 0.3 && isWallItem(first)));
    if (isCeilingItem(first)) {
      if (!t || t.kind !== 'ceiling') { toast('Click a spot on the ceiling · Esc cancels', 4000); return false; }
    } else if (isWallItem(first) && !wallTarget) { toast('Click a spot on a wall to hang it there · Esc cancels', 4000); return false; }
    pending = null; hint.hidden = true;
    if (!t) return false;
    if (wallTarget && !copy) return moveToWall(items, t);
    if (!copy && t.kind !== 'floor' && t.kind !== 'ceiling') return false;
    const s0 = E.items[first.id] || {};
    const ddx = t.point.x - (first.x + (s0.dx || 0)), ddz = t.point.z - (first.z + (s0.dz || 0));
    const dl = isCeilingItem(first) ? t.point.y - (first.y + (first.ctx?.ceil || 0)) : 0;
    snapshot();
    if (copy) {
      for (const it of items) {
        const s = E.items[it.id] || {}, id = nextId();
        E.added.push({ id, kind: 'copy', src: it.kind === 'copy' ? it.src : it.id });
        E.items[id] = { ...s, removed: false, dx: (s.dx || 0) + ddx, dz: (s.dz || 0) + ddz, dl: (s.dl || 0) + dl };
      }
      await syncAdded(); save();
      return true;
    }
    for (const it of items) { const s = st(it.id); s.dx = (s.dx || 0) + ddx; s.dz = (s.dz || 0) + ddz; if (dl) s.dl = (s.dl || 0) + dl; applyItem(it); }
    if (items.length === 1 && !isCeilingItem(first)) snapBack(first);
    save(); gfx.dirty();
    return true;
  }
  function moveToWall(items, t) { snapshot(); snapToWall(items[0], t, true); save(); return true; }

  // ---------------------------------------------------------------- snapping: the house's axes, walls, furniture
  // the house is laid out on its x / z axes: placements face along them and nudges move along them
  function snapRot(deg, tol = 360) { const r = Math.round(deg / 90) * 90, d = Math.abs((((deg - r) % 360) + 540) % 360 - 180); return d <= tol ? r : deg; }
  const axisOf = (x, z) => (Math.abs(x) >= Math.abs(z) ? [Math.sign(x) || 1, 0] : [0, Math.sign(z) || 1]);
  const probe = new THREE.Raycaster();
  const inItem = (o) => { for (let p = o; p; p = p.parent) if (p.name === 'item' || p.name === 'added items') return true; return false; };
  function cast(o, d, far) { probe.set(o, d); probe.far = far; return probe.intersectObject(house, true).find((h) => h.object.isMesh && isVisible(h.object) && !(h.object.material && h.object.material.transparent) && !inItem(h.object)) || null; }
  // the stretch of plain wall around P (no openings, corners or trim), as offsets [lo, hi] along the wall
  function wallSpan(P, n, tg, ys) {
    const out = [0, 0], back = n.clone().negate();
    for (const dir of [-1, 1]) {
      let last = 0;
      for (let d = 0.25; d <= 14; d += 0.25) {
        const ok = ys.every((y) => { const o = P.clone().addScaledVector(tg, dir * d).addScaledVector(n, 0.45); o.y = y; const h = cast(o, back, 0.9); return h && Math.abs(h.distance - 0.45) < 0.12; });
        if (!ok) break;
        last = d;
      }
      out[dir < 0 ? 0 : 1] = dir * last;
    }
    return out;
  }
  // a low piece standing against this wall (sofa, console, bed, dresser) for art / a TV to center over
  function furnitureBelow(P, n, tg, lo, hi, floorY, self) {
    let best = null;
    const box = new THREE.Box3();
    for (const o of [...ITEMS, ...ADDED.values()]) {
      if (o === self || !o.group || !isVisible(o.group) || isWallItem(o) || isCeilingItem(o)) continue;
      box.setFromObject(o.group); if (box.isEmpty()) continue;
      const top = box.max.y - floorY; if (top < 1 || top > 4.4 || box.min.y > floorY + 1) continue;
      const cs = [[box.min.x, box.min.z], [box.max.x, box.min.z], [box.min.x, box.max.z], [box.max.x, box.max.z]].map(([x, z]) => [(x - P.x) * tg.x + (z - P.z) * tg.z, (x - P.x) * n.x + (z - P.z) * n.z]);
      const t0 = Math.min(...cs.map((c) => c[0])), t1 = Math.max(...cs.map((c) => c[0])), d0 = Math.min(...cs.map((c) => c[1]));
      if (d0 > 2.5 || d0 < -0.6 || t1 < lo - 0.5 || t0 > hi + 0.5 || t1 - t0 < 1.5) continue;
      const c = (t0 + t1) / 2;
      if (!best || Math.abs(c) < Math.abs(best.c)) best = { c, top: box.max.y, w: t1 - t0 };
    }
    return best;
  }
  // put a piece on the wall at t (a pick on a wall): square to it, centered on the plain stretch of wall (or over
  // the sofa / console / bed below it), at a sensible height. Floor pieces back up against the wall.
  function snapToWall(it, t, keepClick) {
    const n = t.normal.clone().setY(0).normalize(); { const [ax, az] = axisOf(n.x, n.z); if (Math.abs(ax ? n.x : n.z) > 0.96) n.set(ax, 0, az); }
    const rot = Math.atan2(n.x, n.z) / R, tg = new THREE.Vector3(n.z, 0, -n.x), s = st(it.id), wall = isWallItem(it);
    const fl = env.floorAt(t.point.x + n.x * 0.6, t.point.z + n.z * 0.6, t.point.y + 0.5), floorY = fl === -Infinity ? t.point.y - 4 : fl;
    const fp = footprint(it), w = (fp.w || 2) * (s.sx || 1), h = (fp.h || 2) * (s.sy || 1);
    const P = t.point.clone(); P.y = floorY;
    let c = 0, dy = s.dy || 0;
    if (wall) {
      const yc = floorY + (fp.cy ?? 4.5) * (s.sy || 1) + dy;
      const [lo, hi] = wallSpan(P, n, tg, [Math.max(floorY + 0.8, yc - h / 2 + 0.15), Math.min(floorY + 7.6, yc + h / 2 - 0.15)]);
      const under = furnitureBelow(P, n, tg, lo, hi, floorY, it);
      if (under) { c = Math.max(lo + w / 2, Math.min(hi - w / 2, under.c)); const gap = famOf(it) === 'tv' ? 1.0 : 0.75; dy = under.top + gap + h / 2 - (floorY + (fp.cy ?? 4.5) * (s.sy || 1)); }
      else c = (lo + hi) / 2;
      if (hi - lo < w && !under) c = (lo + hi) / 2;
    } else {
      const [lo, hi] = wallSpan(P, n, tg, [floorY + 1.0, floorY + 2.6]);
      c = hi - lo <= w * 2.2 ? (lo + hi) / 2 : Math.max(lo + w / 2, Math.min(hi - w / 2, 0)); // a bed / sofa centers on a short wall
      dy = 0;
    }
    const off = wall || fp.back ? 0.03 : (fp.d || 2) / 2 + 0.05;
    const pos = P.clone().addScaledVector(tg, c).addScaledVector(n, off - (fp.back || wall ? 0 : 0));
    const ix = fp.dx || 0; // a hand-built piece whose box is off-center: keep the box (not the origin) where it belongs
    pos.addScaledVector(tg, wall || fp.back ? -ix * (s.sx || 1) : 0);
    s.dx = pos.x - it.x; s.dz = pos.z - it.z; s.spin = rot - it.rot; s.dl = floorY - it.y; s.dy = dy || undefined;
    if (!s.dy) delete s.dy;
    applyItem(it); gfx.dirty();
  }
  // a piece set on the floor with its back near a wall (within a foot or so) backs right up to it
  function snapBack(it) {
    const fp = footprint(it); if (!fp.back) return;
    const s = st(it.id), r = (it.rot + (s.spin || 0)) * R, f = new THREE.Vector3(Math.sin(r), 0, Math.cos(r));
    const o = new THREE.Vector3(it.x + (s.dx || 0), it.y + (s.dl || 0) + 1.6, it.z + (s.dz || 0)).addScaledVector(f, Math.min(1, (fp.d || 2) / 2));
    const h = cast(o, f.clone().negate(), Math.min(1, (fp.d || 2) / 2) + 1.6);
    if (!h || h.face.normal.clone().transformDirection(h.object.matrixWorld).dot(f) < 0.85) return;
    const gap = h.distance - Math.min(1, (fp.d || 2) / 2) - 0.03;
    s.dx = (s.dx || 0) - f.x * gap; s.dz = (s.dz || 0) - f.z * gap;
    applyItem(it);
  }
  async function doUndo() { if (!undo.length) return; await restore(undo.pop()); if (cur) { render(); say('Undone.'); highlight(targets()); } }
  async function resetAll() { snapshot(); await restore(JSON.stringify({ items: {}, paint: {}, added: [] })); }

  // ---------------------------------------------------------------- typed commands (a small rule-based parser)
  function command(text) {
    const t = ' ' + text.toLowerCase().trim() + ' ';
    if (!t.trim()) return;
    if (/\bundo\b/.test(t)) return doUndo();
    if (cur?.item && !/\b(add|put|place|hang|move)\b/.test(t)) { snapshot(); quiet = true; try { return runCommand(t); } finally { quiet = false; } }
    return runCommand(t);
  }
  function optionInText(famId, t) {
    if (!famId) return null;
    for (const o of FAMILIES[famId].options) { const nm = o.name.toLowerCase(); if (t.includes(nm)) return o.id; }
    for (const o of FAMILIES[famId].options) { const w = o.name.toLowerCase().split(/[\s,+]+/).find((x) => x.length >= 4 && !STOP.has(x)); if (w && new RegExp(`\\b${w}\\b`).test(t)) return o.id; }
    return null;
  }
  function runCommand(t) {
    if (/\b(these|those|all|every|both)\b/.test(t) && cur?.item) { all = true; highlight(targets()); }
    const color = Object.keys(COLORS).sort((a, b) => b.length - a.length).find((c) => new RegExp(`\\b${c}\\b`).test(t));
    const addM = /\b(add|put|place|hang|get me|i want|give me)\b/.test(t) && ADD_WORDS.find(([, re]) => re.test(t));
    if (addM) { const fam = addM[0]; return addHere(fam, optionInText(fam, t)); }
    if (cur?.kind === 'wall' && color && /\b(paint|repaint|color|colour|make)\b|^\s*\w+\s*$/.test(t)) { if (cur.key) return paint(COLORS[color]); return say('That surface isn\'t a painted room wall.'); }
    if (!cur?.item) return say('Try: "add a sofa", "add a TV", "put a plant here"' + (cur?.kind === 'wall' ? ', "hang a mirror", or "paint this sage".' : cur?.kind === 'ceiling' ? ', or "add a chandelier".' : '.'));
    if (/\b(remove|delete|get rid|take (it|this|them) (away|out)|throw|toss|lose)\b/.test(t)) return act('remove');
    if (/\b(reset|original|put (it|them) back|as it was)\b/.test(t)) return act('reset');
    let did = false;
    const opt = optionInText(famOf(cur.item), t);
    if (opt) { act('opt', opt); did = true; }
    const amt = /\b(much|a lot|way)\b/.test(t) ? 1.35 : /\b(slightly|a bit|a little|bit)\b/.test(t) ? 1.07 : 1.15;
    for (const [re, a] of [[/\b(taller|higher|raise)\b/, ['sy', amt]], [/\b(shorter|lower)\b/, ['sy', 1 / amt]], [/\b(wider|longer)\b/, ['sx', amt]], [/\b(narrower|thinner|skinnier)\b/, ['sx', 1 / amt]],
      [/\b(deeper)\b/, ['sz', amt]], [/\b(bigger|larger|scale up)\b/, ['all', amt]], [/\b(smaller|scale down|tiny|little smaller)\b/, ['all', 1 / amt]]]) if (re.test(t)) { act('scale', a); did = true; }
    if (/\b(turn|rotate|spin|flip|face)\b/.test(t)) { act('spin', /\b(around|180|flip|other way)\b/.test(t) ? 180 : /\bleft\b/.test(t) ? 90 : /\b45\b/.test(t) ? 45 : -90); did = true; }
    if (color && !(opt && optionOf(famOf(cur.item), opt)?.name.toLowerCase().includes(color))) { act('color', COLORS[color]); did = true; }
    if (/\b(move|put it|over there|somewhere else)\b/.test(t) && !did) return startMove();
    if (!did) say(`I can recolor it ("white", "navy"), swap it for another ${nameOf(cur.item)} (try a name from Swap), resize, turn, move or remove it.`);
  }

  // ---------------------------------------------------------------- entry points used by app.js
  const ndc = (x, y) => { const r = renderer.domElement.getBoundingClientRect(); return new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); };
  async function clickAt(x, y) {
    if (!pop.hidden) { close(true); return true; }
    const t = pickAt(ndc(x, y));
    if (pending) { await finishMove(t); return true; }
    if (!t) return false;
    open(t, x, y);
    return true;
  }
  // walk mode: what the crosshair is on, if it is close enough to edit
  const REACH = 12;
  function aim() {
    const t = pickAt(new THREE.Vector2(0, 0));
    if (!t || t.hit.distance > REACH) return null;
    t.label = t.item ? `edit ${nameOf(t.item)}` : t.kind === 'wall' ? (t.key ? 'paint wall · TV · art' : 'TV · art · wall light') : t.kind === 'floor' ? 'add something here' : t.kind === 'ceiling' ? 'add a light' : null;
    return t.label ? t : null;
  }
  function openAhead() {
    if (!pop.hidden) { close(true); return true; }
    if (pending) { finishMove(pickAt(new THREE.Vector2(0, 0))); return true; }
    const t = aim();
    if (!t) return false;
    open(t, innerWidth / 2, innerHeight / 2, true);
    return true;
  }
  addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && (pending || !pop.hidden)) { e.preventDefault(); e.stopPropagation(); if (pending) { pending = null; hint.hidden = true; } if (!pop.hidden) close(false); }
    if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey) && !(e.target.matches && e.target.matches('input, textarea'))) { e.preventDefault(); doUndo(); toast('Undone.', 1500); }
  }, true);
  pop.addEventListener('pointerdown', (e) => e.stopPropagation());
  pop.addEventListener('mousedown', (e) => e.stopPropagation());
  document.querySelector('#edit-undo')?.addEventListener('click', () => doUndo());
  document.querySelector('#edit-reset')?.addEventListener('click', () => { if (confirm('Remove all your point-and-click edits to this house?')) resetAll(); });
  addEventListener('resize', () => { if (!pop.hidden) clamp(); });
  // start: rebuild what was saved
  (async () => { await syncAdded(); applyAll(); updateCount(); })();
  return { clickAt, aim, openAhead, applyLevels, isOpen: () => !pop.hidden, isPending: () => !!pending, close, refresh: () => { rebuildCopies(); applyAll(); }, reapplyPaint, command: (s) => command(s), open, pickAt, E: () => E, toast };
}
