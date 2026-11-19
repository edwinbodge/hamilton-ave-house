// Rendering look: sky, sun & sky light, environment maps, fitted soft shadows, interior
// adaptation (exposure, bounce light, ceiling fixtures), and the optional high-quality
// ambient occlusion (range-checked, blurred, multiplied onto the canvas). Shared by both houses
// (js/render.js and creekside/js/render.js are the same file).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { material } from './geom.js';

const lerp = THREE.MathUtils.lerp;

// Tone mapping: ACES filmic plus a mild saturation lift. ACES washes light, warm colors (cream
// paint, honey oak) toward white; HDR listing photos keep them, so the grade puts some back.
const GRADE_SAT = 1.12;
THREE.ShaderChunk.tonemapping_pars_fragment = THREE.ShaderChunk.tonemapping_pars_fragment.replace(
  'vec3 CustomToneMapping( vec3 color ) { return color; }',
  `vec3 CustomToneMapping( vec3 color ) {
    vec3 c = ACESFilmicToneMapping( color );
    float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
    return clamp( mix( vec3( l ), c, ${GRADE_SAT.toFixed(3)} ), 0.0, 1.0 );
  }`);
const C = (c) => new THREE.Color(c);

// ---------------------------------------------------------------- tuning
// Exterior: a clear-sky day. Interior: the eye (camera) adapts, bounce light goes warm-neutral.
export const TUNE = {
  exposureOut: 1.0, exposureIn: 1.1, exposureView: 1.0, // orbit (outside), walking inside, cut-away floor views
  sun: 2.8, // direct sun at high elevation
  // sky + ground bounce: a wall in shade should read like soft daylight (Creekside's NW front, photo 55)
  hemiOut: { sky: '#dce0e5', ground: '#a9a493', i: 1.45 },
  hemiIn: { sky: '#e2d6c4', ground: '#f8eedc', i: 1.1 },
  envOut: 0.62, envIn: 0.42, // scaled into each material's envMapIntensity via scene.userData
  fill: 0.06,
  fixtures: { recessed: 9, bulb: 14, shade: 6, none: 8 },
  // contact-only ambient occlusion: only geometry within `radius` ft (true 3D distance) occludes
  ao: { radius: 1.1, intensity: 1.5, bias: 0.12, samples: 12, strength: 0.85 },
  shadowMap: { high: 4096, standard: 2048 },
};

// ---------------------------------------------------------------- sky
const SKY_VS = `varying vec3 vDir; void main(){ vDir = normalize((modelMatrix * vec4(position, 0.0)).xyz); gl_Position = projectionMatrix * viewMatrix * vec4((modelMatrix * vec4(position, 1.0)).xyz, 1.0); gl_Position.z = gl_Position.w * 0.99999; }`;
const SKY_FS = `uniform vec3 zenith, horizon, ground, sunDir, sunCol; uniform float glow, haze, expo; varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir); float h = d.y;
  vec3 c = mix(horizon, zenith, pow(clamp(h, 0.0, 1.0), 0.55));
  c = mix(c, horizon * 1.04, haze * exp(-max(h, 0.0) * 14.0));
  float s = max(dot(d, sunDir), 0.0);
  c += sunCol * (glow * pow(s, 9.0) * 0.35 + glow * pow(s, 400.0) * 3.0);
  if (h < 0.0) c = mix(horizon * 0.92, ground, clamp(-h * 6.0, 0.0, 1.0));
  gl_FragColor = vec4(c * expo, 1.0);
}`; // (colors are authored for display directly; expo follows the camera exposure)
function skyMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { zenith: { value: C('#4d86c8') }, horizon: { value: C('#d4e2ee') }, ground: { value: C('#5d6650') }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: C('#fff1d8') }, glow: { value: 1 }, haze: { value: 0.6 }, expo: { value: 1 } },
  });
}

// ---------------------------------------------------------------- look
export class Look {
  constructor({ renderer, scene, camera, sun, hemi, fill, house, bounds }) {
    Object.assign(this, { renderer, scene, camera, sun, hemi, fill, house, bounds });
    this.inside = 0; this.insideTarget = 0; this.view = 'ext';
    this.day = 1; this.sunDir = new THREE.Vector3(0, 1, 0);
    this.stats = { fps: 0, ms: 0 };
    renderer.toneMapping = /mix\( vec3\( l \), c,/.test(THREE.ShaderChunk.tonemapping_pars_fragment) ? THREE.CustomToneMapping : THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = TUNE.exposureOut;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    this.shadowAge = 0;

    // sky dome + fog matched to the horizon
    this.skyMat = skyMaterial();
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), this.skyMat);
    this.sky.scale.setScalar(1800); this.sky.frustumCulled = false; this.sky.renderOrder = -10;
    this.sky.userData.noAO = true; this.sky.name = 'sky';
    scene.add(this.sky);
    scene.background = null;
    scene.fog = new THREE.Fog('#d4e2ee', 380, 1500);

    // environment maps: an outdoor sky probe (rebuilt as the sun moves) and a neutral room probe
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.roomEnv = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.envScene = new THREE.Scene();
    this.envSkyMat = skyMaterial();
    this.envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), this.envSkyMat));
    this.skyEnv = null; this.envDirty = true;

    // ceiling fixtures / lamps light the room you are standing in (walk mode)
    this.pool = [];
    // (hidden unless you are standing in a room: point lights cost every pixel of every material)
    for (let i = 0; i < 3; i++) {
      const l = new THREE.PointLight('#ffe7c4', 0, 22, 2);
      l.castShadow = false; l.visible = false; l.userData.want = 0; scene.add(l); this.pool.push(l);
    }
    this.fixtures = null; this.room = null; this.poolTimer = 0;

    sun.shadow.bias = -0.00015;
    sun.shadow.normalBias = 0.045;
    sun.shadow.radius = 1;
    this.quality = null;
    this.ui = null;
  }

  // ------------------------------------------------ sun & sky
  setSun(dir, elevation) {
    const sun = this.sun, d = this.sunDir.copy(dir).normalize();
    const day = THREE.MathUtils.smoothstep(elevation, -0.04, 0.2);
    const low = 1 - THREE.MathUtils.smoothstep(elevation, 0.05, 0.6); // warm, dimmer light near the horizon
    const twi = Math.sqrt(THREE.MathUtils.smoothstep(elevation, -0.24, -0.01)); // civil + nautical twilight: the blue hour
    this.day = day; this.twi = twi;
    sun.intensity = TUNE.sun * day * (1 - 0.45 * low);
    sun.color.set('#fff6e8').lerp(C('#ffc58a'), low * 0.85);
    const u = this.skyMat.uniforms;
    u.zenith.value.set('#070b14').lerp(C('#3b5cb0'), twi).lerp(C('#4d86c8'), day);
    u.horizon.value.set('#141a26').lerp(C('#b49ab8'), twi).lerp(C('#d4e2ee'), day).lerp(C('#f1d2b0'), low * day * 0.55);
    u.ground.value.set('#0b0d0a').lerp(C('#262b24'), twi).lerp(C('#5d6650'), day);
    u.sunDir.value.copy(d); u.sunCol.value.copy(sun.color); u.glow.value = day;
    this.scene.fog.color.copy(u.horizon.value);
    for (const k of ['zenith', 'horizon', 'ground', 'sunDir', 'sunCol']) this.envSkyMat.uniforms[k].value.copy(u[k].value);
    this.envSkyMat.uniforms.glow.value = day * 0.6;
    this.envDirty = true;
    this.fitShadow();
    this.applyMix();
  }

  // ortho shadow camera fitted to the lot (house + yard) in light space: ~0.6" texels at 4096
  fitShadow() {
    const sun = this.sun, d = this.sunDir;
    const b = [this.bounds.min, this.bounds.max].every((v) => Number.isFinite(v.x + v.y + v.z)) ? this.bounds : new THREE.Box3(new THREE.Vector3(-150, -15, -150), new THREE.Vector3(150, 50, 150));
    const ctr = b.getCenter(new THREE.Vector3());
    const R = b.getSize(new THREE.Vector3()).length() / 2 + 10;
    sun.position.copy(ctr).addScaledVector(d, R + 50);
    sun.target.position.copy(ctr);
    sun.target.updateMatrixWorld(); sun.updateMatrixWorld();
    const view = new THREE.Matrix4().lookAt(sun.position, ctr, new THREE.Vector3(0, 1, 0)).setPosition(sun.position).invert();
    const p = new THREE.Vector3(), lo = new THREE.Vector3(Infinity, Infinity, Infinity), hi = lo.clone().negate();
    for (let i = 0; i < 8; i++) {
      p.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).applyMatrix4(view);
      lo.min(p); hi.max(p);
    }
    const cam = sun.shadow.camera;
    cam.left = lo.x - 2; cam.right = hi.x + 2; cam.bottom = lo.y - 2; cam.top = hi.y + 2;
    cam.near = Math.max(0.5, -hi.z - 30); cam.far = -lo.z + 10;
    cam.updateProjectionMatrix();
    this.dirty();
  }

  dirty() { this.renderer.shadowMap.needsUpdate = true; this.shadowAge = 0; }

  // ------------------------------------------------ interior / exterior adaptation
  // inside: 0 = outdoors, 1 = standing in a room; view: the orbit view ('ext' | 'f1' | 'f2' | 'b')
  setContext({ walking, inside, room, floorY, view }) {
    this.walking = walking; this.view = view;
    this.insideTarget = walking ? (inside ? 1 : 0) : view === 'ext' ? 0 : 0.55;
    this.room = walking && inside ? { room, floorY } : null;
  }

  applyMix() {
    const k = this.inside, day = this.day, T = TUNE;
    const exp = this.walking ? lerp(T.exposureOut, T.exposureIn, k) : lerp(T.exposureOut, T.exposureView, k / 0.55);
    // at night interiors are lit by their fixtures; keep the exposure from collapsing
    // night: the eye adapts more indoors (fixtures on) than out, where only lit windows should read
    this.renderer.toneMappingExposure = exp * lerp(lerp(1.15, 2.2, k), 1, day);
    this.skyMat.uniforms.expo.value = Math.min(2, this.renderer.toneMappingExposure / T.exposureOut);
    this.hemi.color.set(T.hemiOut.sky).lerp(C(T.hemiIn.sky), k);
    this.hemi.groundColor.set(T.hemiOut.ground).lerp(C(T.hemiIn.ground), k);
    const twi = this.twi ?? 1;
    this.hemi.intensity = lerp(T.hemiOut.i, T.hemiIn.i, k) * Math.max(lerp(lerp(0.015, 0.25, k), 1, day), lerp(0.18, 0.4, k) * twi * twi);
    this.fill.intensity = T.fill * lerp(lerp(0.05, 0.6, k), 1, day);
    const env = lerp(T.envOut, T.envIn, k) * Math.max(lerp(lerp(0.02, 0.15, k), 1, day), 0.2 * twi * twi);
    // environment strength: each material's base (geom.js may set userData.envBase) times the mix;
    // re-applied every second too, since restyling can change a material's base
    this.envAge = (this.envAge || 0) + 1;
    if (Math.abs((this.envScale ?? -1) - env) > 0.004 || this.envAge > 60) {
      this.envScale = env; this.envAge = 0;
      this.scene.traverse((o) => { if (o.material) for (const m of [].concat(o.material)) if (m.isMeshStandardMaterial) { m.userData.envBase ??= m.envMapIntensity; m.envMapIntensity = m.userData.envBase * env / 0.5; } });
    }
    // window glass: from outside, rooms are far darker than daylight, so glass reads dark and reflective;
    // from inside it is nearly clear
    const glass = material('glass');
    glass.color.set('#2c3a44').lerp(C('#c4d8e4'), k); glass.opacity = lerp(0.55, 0.1, k);
    // after dusk the house has its lights on: windows glow warm from outside (listing photos 1 and 3, Creekside)
    glass.emissive.set('#ffb766'); glass.emissiveIntensity = (1 - day) * (1 - k) * 1.6;
    const wantRoom = k > 0.5;
    if (this.envDirty && !wantRoom) {
      this.envDirty = false;
      if (this.skyEnvRT) this.skyEnvRT.dispose();
      this.skyEnvRT = this.pmrem.fromScene(this.envScene, 0, 0.1, 100);
      this.skyEnv = this.skyEnvRT.texture;
    }
    this.scene.environment = wantRoom ? this.roomEnv : this.skyEnv || this.roomEnv;
  }

  // ------------------------------------------------ fixtures
  collectFixtures() {
    const cell = new Map(), p = new THREE.Vector3();
    this.house.updateMatrixWorld(true);
    this.house.traverse((o) => {
      if (!o.isMesh || !['recessed', 'bulb', 'shade'].includes(o.name)) return;
      const pos = o.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        const key = o.uuid + ':' + Math.round(p.x / 1.5) + ',' + Math.round(p.y / 1.5) + ',' + Math.round(p.z / 1.5);
        let c = cell.get(key);
        if (!c) cell.set(key, (c = { sum: new THREE.Vector3(), n: 0, mesh: o, kind: o.name }));
        c.sum.add(p); c.n++;
      }
    });
    // merge neighbouring cells of the same fixture into one light position
    const raw = [...cell.values()].map((c) => ({ p: c.sum.divideScalar(c.n), mesh: c.mesh, kind: c.kind }));
    const out = [];
    for (const f of raw) {
      const m = out.find((g) => g.mesh === f.mesh && g.p.distanceTo(f.p) < 1.6);
      if (m) m.p.lerp(f.p, 0.5); else out.push(f);
    }
    this.fixtures = out;
  }

  updatePool(dt, pip) {
    this.poolTimer -= dt;
    if (this.poolTimer <= 0) {
      this.poolTimer = 0.25;
      for (const l of this.pool) l.userData.want = 0;
      if (this.room) {
        if (!this.fixtures) this.collectFixtures();
        const { room, floorY } = this.room, cam = this.camera.position;
        const vis = (o) => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
        const inRoom = this.fixtures.filter((f) => f.p.y > floorY && f.p.y < floorY + 14 && pip(room.pts, f.p.x, f.p.z) && vis(f.mesh));
        // prefer ceiling fixtures, then lamps; nearest first
        inRoom.sort((a, b) => (a.kind === 'shade') - (b.kind === 'shade') || a.p.distanceToSquared(cam) - b.p.distanceToSquared(cam));
        const pick = inRoom.slice(0, this.pool.length);
        if (!pick.length) { // no fixture in the photos: a soft light at the middle of the ceiling
          let cx = 0, cz = 0; for (const [x, z] of room.pts) { cx += x; cz += z; }
          pick.push({ p: new THREE.Vector3(cx / room.pts.length, floorY + 7.6, cz / room.pts.length), kind: 'none' });
        }
        pick.forEach((f, i) => {
          const l = this.pool[i];
          l.position.copy(f.p); if (f.kind !== 'none') l.position.y -= f.kind === 'shade' ? 0.2 : 1.6; // below the ceiling: no hot spot on it
          l.userData.want = TUNE.fixtures[f.kind] * (f.kind === 'shade' ? 1 : 1 / Math.sqrt(Math.max(1, pick.length * 0.6)));
          l.distance = f.kind === 'shade' ? 12 : 20;
        });
      }
    }
    const k = 1 - Math.exp(-dt * 6);
    for (const l of this.pool) { l.intensity += (l.userData.want - l.intensity) * k; l.visible = !!this.room || l.intensity > 0.05; }
  }

  // ------------------------------------------------ quality
  // high: ambient occlusion + 4096 shadows + pixel ratio up to 2; standard: no AO, 2048 shadows, pixel ratio up to 1.5
  setQuality(q, { persist = false } = {}) {
    if (q === this.quality) return;
    this.quality = q;
    if (persist) try { localStorage.setItem('render-quality', q); } catch {}
    const r = this.renderer, sun = this.sun;
    this.prCap = q === 'high' ? 2 : 1.5;
    r.setPixelRatio(Math.min(devicePixelRatio, this.prCap));
    const size = TUNE.shadowMap[q];
    if (sun.shadow.mapSize.x !== size) {
      sun.shadow.mapSize.set(size, size);
      if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
      sun.shadow.normalBias = q === 'high' ? 0.045 : 0.08;
    }
    if (q === 'high' && !this.aoMat) this.makeAO();
    this.resize();
    this.dirty();
    if (this.ui) this.ui.checked = q === 'high';
    this.frameTimes = [];
  }

  // Ambient occlusion (high quality): a normal + depth pass of the scene at one sample per CSS pixel,
  // a range-checked hemisphere AO (only geometry within TUNE.ao.radius ft in 3D occludes, so objects
  // never cast halos onto walls behind them), a separable depth/normal-aware blur that removes the
  // per-pixel noise, then a multiply onto the canvas. AO fades out where the radius covers only a few
  // pixels (distant exteriors), which would otherwise speckle.
  makeAO() {
    const dt = new THREE.DepthTexture(1, 1);
    this.aoNormal = new THREE.WebGLRenderTarget(1, 1, { depthTexture: dt, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    this.aoA = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
    this.aoB = this.aoA.clone();
    this.aoNormalMat = new THREE.MeshNormalMaterial();
    const common = {
      tNormal: { value: this.aoNormal.texture }, tDepth: { value: dt }, res: { value: new THREE.Vector2() },
      projInv: { value: new THREE.Matrix4() }, proj: { value: new THREE.Matrix4() },
    };
    const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
    const HEAD = `uniform sampler2D tNormal, tDepth; uniform vec2 res; uniform mat4 projInv, proj; varying vec2 vUv;
      vec3 viewPos(vec2 uv){ float d = texture2D(tDepth, uv).x; vec4 p = projInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return p.xyz / p.w; }
      vec3 viewNormal(vec2 uv){ return normalize(texture2D(tNormal, uv).xyz * 2.0 - 1.0); }`;
    const T = TUNE.ao;
    this.aoMat = new THREE.ShaderMaterial({
      uniforms: { ...common, radius: { value: T.radius }, bias: { value: T.bias }, intensity: { value: T.intensity } },
      defines: { SAMPLES: T.samples }, vertexShader: VS, depthTest: false, depthWrite: false,
      fragmentShader: HEAD + `
      uniform float radius, bias, intensity;
      float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
      void main(){
        if (texture2D(tDepth, vUv).x >= 1.0) { gl_FragColor = vec4(1.0); return; }
        vec3 P = viewPos(vUv), N = viewNormal(vUv);
        float pxR = radius * proj[1][1] * 0.5 * res.y / max(-P.z, 0.01); // radius in pixels
        float fade = smoothstep(2.0, 5.0, pxR);
        if (fade <= 0.0) { gl_FragColor = vec4(1.0); return; }
        pxR = min(pxR, 90.0);
        float a0 = ign(gl_FragCoord.xy) * 6.2831853, j = ign(gl_FragCoord.yx + 17.0);
        float occ = 0.0, r2 = radius * radius;
        for (int i = 0; i < SAMPLES; i++) {
          float t = (float(i) + j) / float(SAMPLES);
          float ang = a0 + float(i) * 2.39996323;
          vec2 uv = vUv + vec2(cos(ang), sin(ang)) * (pxR * t * t + 1.0) / res;
          vec3 v = viewPos(uv) - P;
          float vv = dot(v, v);
          float w = max(0.0, 1.0 - vv / r2);  // range check: nothing beyond the radius in 3D counts
          occ += w * w * max(0.0, dot(v, N) * inversesqrt(vv + 1e-4) - bias);
        }
        float ao = clamp(1.0 - intensity * occ * (2.0 / float(SAMPLES)), 0.0, 1.0);
        gl_FragColor = vec4(vec3(mix(1.0, ao, fade)), 1.0);
      }`,
    });
    this.aoBlurMat = new THREE.ShaderMaterial({
      uniforms: { ...common, tAO: { value: null }, dir: { value: new THREE.Vector2(1, 0) } },
      vertexShader: VS, depthTest: false, depthWrite: false,
      fragmentShader: HEAD + `
      uniform sampler2D tAO; uniform vec2 dir;
      void main(){
        if (texture2D(tDepth, vUv).x >= 1.0) { gl_FragColor = vec4(1.0); return; }
        float z0 = viewPos(vUv).z; vec3 n0 = viewNormal(vUv);
        float sum = 0.0, wsum = 0.0;
        for (int i = -5; i <= 5; i++) {
          vec2 uv = vUv + dir * float(i) / res;
          float z = viewPos(uv).z; vec3 n = viewNormal(uv);
          float w = exp(-float(i * i) / 18.0)
            * max(0.0, 1.0 - abs(z - z0) / (0.02 * abs(z0) + 0.05))   // same surface depth
            * pow(max(dot(n, n0), 0.0), 8.0);                        // same orientation
          sum += texture2D(tAO, uv).r * w; wsum += w;
        }
        gl_FragColor = vec4(vec3(wsum > 1e-4 ? sum / wsum : 1.0), 1.0);
      }`,
    });
    this.aoBlendMat = new THREE.ShaderMaterial({
      uniforms: { tAO: { value: null }, strength: { value: T.strength } },
      vertexShader: VS, depthTest: false, depthWrite: false, transparent: true,
      blending: THREE.CustomBlending, blendSrc: THREE.DstColorFactor, blendDst: THREE.ZeroFactor, blendEquation: THREE.AddEquation,
      blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
      fragmentShader: 'uniform sampler2D tAO; uniform float strength; varying vec2 vUv; void main(){ gl_FragColor = vec4(vec3(mix(1.0, texture2D(tAO, vUv).r, strength)), 1.0); }',
    });
    this.aoQuad = new FullScreenQuad(null);
    this.aoHidden = [];
    this.sizeAO();
  }
  sizeAO() { // one AO sample per CSS pixel (half the drawing buffer on a 2x screen)
    const w = Math.max(1, Math.round(innerWidth)), h = Math.max(1, Math.round(innerHeight));
    for (const rt of [this.aoNormal, this.aoA, this.aoB]) rt.setSize(w, h);
    for (const m of [this.aoMat, this.aoBlurMat]) m.uniforms.res.value.set(w, h);
  }
  renderAO() {
    const r = this.renderer, cam = this.camera, scene = this.scene;
    // normal/depth pass: skip glass and other see-through surfaces (rooms seen through windows get
    // their own occlusion), alpha-tested foliage cards, lines and the sky dome
    const hidden = this.aoHidden; hidden.length = 0;
    scene.traverse((o) => {
      if (!o.visible) return;
      if (o.isPoints || o.isLine || o.isSprite || o.userData.noAO || (o.isMesh && o.material && (o.material.transparent || o.material.alphaTest > 0))) { o.visible = false; hidden.push(o); }
    });
    const bg = scene.background, fog = scene.fog, cc = r.getClearColor(new THREE.Color()), ca = r.getClearAlpha(), ac = r.autoClear;
    scene.overrideMaterial = this.aoNormalMat; scene.background = null; scene.fog = null;
    r.setRenderTarget(this.aoNormal); r.setClearColor(0x8080ff, 1); r.autoClear = true; r.clear();
    const sm = r.shadowMap.needsUpdate; r.shadowMap.needsUpdate = false;
    r.render(scene, cam);
    r.shadowMap.needsUpdate = sm;
    scene.overrideMaterial = null; scene.background = bg; scene.fog = fog;
    for (const o of hidden) o.visible = true;
    for (const m of [this.aoMat, this.aoBlurMat]) { m.uniforms.projInv.value.copy(cam.projectionMatrixInverse); m.uniforms.proj.value.copy(cam.projectionMatrix); }
    const pass = (mat, target) => { this.aoQuad.material = mat; r.setRenderTarget(target); this.aoQuad.render(r); };
    pass(this.aoMat, this.aoA);
    this.aoBlurMat.uniforms.tAO.value = this.aoA.texture; this.aoBlurMat.uniforms.dir.value.set(1, 0); pass(this.aoBlurMat, this.aoB);
    this.aoBlurMat.uniforms.tAO.value = this.aoB.texture; this.aoBlurMat.uniforms.dir.value.set(0, 1); pass(this.aoBlurMat, this.aoA);
    r.autoClear = false;
    this.aoBlendMat.uniforms.tAO.value = this.aoA.texture;
    this.aoBlendMat.blending = this.aoDebug ? THREE.NoBlending : THREE.CustomBlending; // aoDebug: show the AO buffer
    this.aoBlendMat.uniforms.strength.value = this.aoDebug ? 1 : TUNE.ao.strength;
    pass(this.aoBlendMat, null); // multiply onto the canvas
    r.autoClear = ac; r.setClearColor(cc, ca);
  }

  resize() {
    this.renderer.setSize(innerWidth, innerHeight);
    if (this.aoMat) this.sizeAO();
  }

  // ------------------------------------------------ per frame
  update(dt, pip) {
    this.inside += (this.insideTarget - this.inside) * (1 - Math.exp(-dt * 3));
    if (Math.abs(this.inside - this.insideTarget) < 0.002) this.inside = this.insideTarget;
    this.applyMix();
    this.updatePool(dt, pip);
    // the scene is mostly static: redraw the shadow map on change, and every half second anyway
    this.shadowAge += dt; // (doors, views, renovations, additions and the sun mark it dirty right away)
    if (this.shadowAge > 2) this.dirty();
  }

  render() {
    const t0 = performance.now();
    this.renderer.render(this.scene, this.camera);
    if (this.quality === 'high' && this.aoMat && this.aoOn !== false) this.renderAO();
    this.trackFrame(t0);
  }

  // adapt to the machine: if high quality misses 60 fps on a high-DPI screen, render at a 1.5 pixel
  // ratio first; if it is still slow (and the user has not chosen high explicitly), drop to standard
  trackFrame() {
    const now = performance.now();
    if (this.lastFrame) {
      const dt = now - this.lastFrame;
      if (dt < 250) { (this.frameTimes ||= []).push(dt); if (this.frameTimes.length > 240) this.frameTimes.shift(); }
    }
    this.lastFrame = now;
    const ft = this.frameTimes || [];
    if (this.quality === 'high' && ft.length >= 120) {
      const med = [...ft].sort((a, b) => a - b)[ft.length >> 1];
      if (med > 19 && this.renderer.getPixelRatio() > 1.5) {
        this.prCap = 1.5; this.renderer.setPixelRatio(1.5); this.resize(); this.frameTimes = [];
      } else if (this.auto && med > 30) {
        this.auto = false; this.setQuality('standard');
        if (this.note) this.note.textContent = 'Switched to standard: this computer was drawing high quality slowly.';
      } else if (ft.length >= 240) this.auto = false; // passed: stop watching for the fallback
    }
  }

  // synchronous benchmark (works even when requestAnimationFrame is paused): ms per frame
  bench(n = 30) {
    const gl = this.renderer.getContext(), px = new Uint8Array(4);
    const one = () => { this.renderer.shadowMap.needsUpdate = false; this.render(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
    one(); one();
    const t0 = performance.now();
    for (let i = 0; i < n; i++) one();
    return (performance.now() - t0) / n;
  }

  // quality UI: a checkbox under "Show"; default from a stored choice, else from the GPU
  mountUI(anchor) {
    let stored = null;
    try { stored = localStorage.getItem('render-quality'); } catch {}
    let q = stored;
    if (!q) {
      const gl = this.renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
      const gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
      const weak = /SwiftShader|llvmpipe|Software|Intel\(R\) (HD|UHD) Graphics [0-6]|Mali|Adreno|PowerVR|Apple GPU/i.test(gpu) || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      q = weak ? 'standard' : 'high';
      this.auto = q === 'high';
    }
    this.setQuality(q);
    if (!anchor) return;
    const lab = document.createElement('label');
    lab.innerHTML = '<input type="checkbox" id="tgl-hq"> High quality <small style="opacity:.7">(ambient occlusion, sharper shadows)</small>';
    anchor.appendChild(lab);
    this.ui = lab.querySelector('input');
    this.ui.checked = q === 'high';
    this.ui.addEventListener('change', (e) => { this.auto = false; this.setQuality(e.target.checked ? 'high' : 'standard', { persist: true }); if (this.note) this.note.textContent = ''; });
    this.note = document.createElement('small'); this.note.style.cssText = 'display:block;opacity:.7';
    anchor.appendChild(this.note);
  }
}
