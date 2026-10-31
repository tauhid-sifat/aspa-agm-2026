/* ============================================================
   Living Bengal Delta — LED event animation, ASPA AGM 2026
   Background: continuous Three.js tube-river system (never resets).
   Foreground: DOM scene controller (headline -> RTI -> trio ->
   five -> clubs -> loop). Two independent clocks.
   ============================================================ */
(function () {
'use strict';

var TAU = Math.PI * 2;
var DUR_HEADLINE = 8, DUR_RTI = 6, DUR_TRIO = 8, DUR_FIVE = 10, DUR_CLUBS = 8;
var TRANS_MS = 900;

var SCENES = [
  { id: 's-headline', dur: DUR_HEADLINE },
  { id: 's-rti',      dur: DUR_RTI },
  { id: 's-trio',     dur: DUR_TRIO },
  { id: 's-five',     dur: DUR_FIVE },
  { id: 's-clubs',    dur: DUR_CLUBS }
];
var CYCLE = DUR_HEADLINE + DUR_RTI + DUR_TRIO + DUR_FIVE + DUR_CLUBS; // 40

var qs = location.search || '';
function qmatch(re) { var m = re.exec(qs); return m ? parseFloat(m[1]) : null; }
var FREEZE = qmatch(/[?&]t=([0-9.]+)/);
var LOOP = !(/[?&]loop=0/.test(qs));
var REDUCED = false;
try { REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}

/* ---------------- seeded rand ---------------- */
function mulberry32(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- logo wiring ---------------- */
function wireLogos() {
  var byName = {};
  for (var i = 0; i < LOGOS.length; i++) byName[LOGOS[i].n] = LOGOS[i];
  var imgs = document.querySelectorAll('img[data-logo]');
  for (var j = 0; j < imgs.length; j++) {
    (function (img) {
      var L = byName[img.getAttribute('data-logo')];
      if (!L) { img.style.display = 'none'; return; }
      img.onerror = function () { img.style.display = 'none'; };
      if (L.k === 'svg') img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(L.s);
      else img.src = L.s;
    })(imgs[j]);
  }
}

/* ---------------- glow texture ---------------- */
function makeGlowTexture() {
  var c = document.createElement('canvas');
  c.width = c.height = 128;
  var g = c.getContext('2d');
  var gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,240,200,1)');
  gr.addColorStop(0.35, 'rgba(255,210,130,0.5)');
  gr.addColorStop(1, 'rgba(255,200,120,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  var tex = new THREE.CanvasTexture(c);
  return tex;
}

/* ---------------- WebGL background ---------------- */
function initWebGL() {
  var canvas = document.getElementById('bg');
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x031008, 1);
  try { renderer.outputEncoding = THREE.sRGBEncoding; } catch (e) {}

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x031008, 0.026);
  var camera = new THREE.PerspectiveCamera(50, 2, 0.1, 220);
  var camBase = new THREE.Vector3(0, 1.4, 37);
  var lookAt = new THREE.Vector3(0, -0.6, -6);

  scene.add(new THREE.AmbientLight(0x1d5c40, 0.55));
  var dir = new THREE.DirectionalLight(0xffe2ae, 1.15);
  dir.position.set(14, 20, 24);
  scene.add(dir);
  var pAmber = new THREE.PointLight(0xffbe5a, 1.8, 80);
  var pRed = new THREE.PointLight(0xd8362a, 1.2, 70);
  var pTeal = new THREE.PointLight(0x2fae7d, 0.9, 90);
  pTeal.position.set(-14, -8, 6);
  scene.add(pAmber); scene.add(pRed); scene.add(pTeal);

  var glowTex = makeGlowTexture();
  var sharedTime = { value: 0 };

  var flowVert = 'varying vec2 vUv;\n' +
    'void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  function flowMaterial(hex, speed, mult) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: sharedTime,
        uColor: { value: new THREE.Color(hex) },
        uSpeed: { value: speed },
        uMult: { value: mult }
      },
      vertexShader: flowVert,
      fragmentShader: 'uniform float uTime; uniform vec3 uColor; uniform float uSpeed; uniform float uMult;\n' +
        'varying vec2 vUv;\n' +
        'void main(){\n' +
        '  float w = 0.5 + 0.5 * sin((vUv.x * 8.0 - uTime * uSpeed) * 6.2831853);\n' +
        '  float b = (0.30 + 0.70 * w * w) * uMult;\n' +
        '  float edge = smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.95, vUv.x);\n' +
        '  gl_FragColor = vec4(uColor * b * edge, 1.0);\n' +
        '}',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
  }

  var greens = [0x0b3b28, 0x082a1e, 0x0e4a32, 0x0a3323];
  var tubes = [];   // {curve, mesh}
  var comets = [];  // {curve, sprite, speed, off, size}
  var NT = 16, NL = 0;

  function braidPoint(x, baseY, ph1, ph2, zBase) {
    var y = baseY * 0.45 + 6.5 * Math.sin(x * 0.14 + ph1) + 2.2 * Math.sin(x * 0.42 + ph2);
    var z = zBase + 3.0 * Math.sin(x * 0.2 + ph2 * 1.3);
    return new THREE.Vector3(x, y, z);
  }

  for (var i = 0; i < NT; i++) {
    var r2 = mulberry32(1000 + i * 77);
    // lanes avoid the exact centre: title rest stays calm
    var lane = i / (NT - 1);
    var side = lane < 0.5 ? -1 : 1;
    var baseY = side * (3.5 + 9.5 * ((lane * 2) % 1)) + (r2() - 0.5) * 3;
    var ph1 = r2() * TAU, ph2 = r2() * TAU;
    var zBase = -8 + r2() * 11;
    var pts = [];
    var NP = 7;
    for (var k = 0; k < NP; k++) {
      var x = -36 + (72 * k) / (NP - 1);
      pts.push(braidPoint(x, baseY, ph1, ph2, zBase));
    }
    var curve = new THREE.CatmullRomCurve3(pts);
    var radius = 0.3 + r2() * 0.6 + (i % 5 === 0 ? 0.3 : 0);
    var kind = i % 16;
    var mesh;
    if (kind === 3 || kind === 9 || kind === 14) {
      mesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 220, radius * 0.8, 10, false),
        flowMaterial(0xf2c14e, 0.35 + r2() * 0.3, 0.9)
      );
      NL++;
    } else if (kind === 11) {
      mesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 220, radius * 0.7, 10, false),
        flowMaterial(0xd8362a, 0.5, 0.85)
      );
      NL++;
    } else {
      mesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 200, radius, 10, false),
        new THREE.MeshPhongMaterial({
          color: greens[i % greens.length], specular: 0x8fe3b8, shininess: 80,
          emissive: 0x03130b, emissiveIntensity: 1
        })
      );
    }
    scene.add(mesh);
    tubes.push({ curve: curve, mesh: mesh });
  }

  // comets riding the tubes
  var tmpV = new THREE.Vector3();
  for (var ci = 0; ci < 8; ci++) {
    var r3 = mulberry32(5000 + ci * 131);
    var tube = tubes[(ci * 2 + 1) % tubes.length];
    var sm = new THREE.SpriteMaterial({
      map: glowTex, blending: THREE.AdditiveBlending,
      depthWrite: false, transparent: true, opacity: 0.9,
      color: ci % 4 === 3 ? 0xff9a7a : 0xffe0a0
    });
    var sp = new THREE.Sprite(sm);
    var sz = 2.2 + r3() * 2.4;
    sp.scale.set(sz, sz, 1);
    scene.add(sp);
    comets.push({ curve: tube.curve, sprite: sp, speed: 0.02 + r3() * 0.03, off: r3(), size: sz });
  }

  // kantha rings: tilted gold tori + dashed loops
  var rings = [];
  var ringDefs = [
    { r: 9, x: 14, y: 2, z: -8, rx: 1.1, op: 0.30, sp: 0.05 },
    { r: 12.5, x: 14, y: 2, z: -8, rx: 1.1, op: 0.18, sp: -0.033 },
    { r: 15.5, x: -16, y: -3, z: -10, rx: 0.9, op: 0.14, sp: 0.022 }
  ];
  for (var gi = 0; gi < ringDefs.length; gi++) {
    var RD = ringDefs[gi];
    var torus = new THREE.Mesh(
      new THREE.TorusGeometry(RD.r, 0.055, 8, 140),
      new THREE.MeshBasicMaterial({ color: 0xc9a227, transparent: true, opacity: RD.op })
    );
    torus.position.set(RD.x, RD.y, RD.z);
    torus.rotation.x = RD.rx;
    scene.add(torus);
    rings.push({ mesh: torus, sp: RD.sp });
  }
  var dashRings = [];
  for (var di = 0; di < 2; di++) {
    var pts2 = [];
    var RR = di === 0 ? 10.6 : 14;
    for (var a = 0; a <= 90; a++) {
      var an = (a / 90) * TAU;
      pts2.push(new THREE.Vector3(Math.cos(an) * RR, Math.sin(an) * RR, 0));
    }
    var lg = new THREE.BufferGeometry().setFromPoints(pts2);
    var line = new THREE.LineLoop(lg, new THREE.LineDashedMaterial({
      color: 0xf2c14e, dashSize: 0.7, gapSize: 0.55, transparent: true, opacity: 0.4
    }));
    line.computeLineDistances();
    line.position.set(di === 0 ? 14 : -16, di === 0 ? 2 : -3, di === 0 ? -8 : -10);
    line.rotation.x = 1.1;
    scene.add(line);
    dashRings.push({ mesh: line, sp: di === 0 ? -0.04 : 0.03 });
  }

  // drifting dust, two counter-rotating layers
  function dustLayer(n, size, op, seed) {
    var rr = mulberry32(seed);
    var pos = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      pos[i * 3] = (rr() - 0.5) * 95;
      pos[i * 3 + 1] = (rr() - 0.5) * 52;
      pos[i * 3 + 2] = -22 + rr() * 30;
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var p = new THREE.Points(g, new THREE.PointsMaterial({
      size: size, map: glowTex, transparent: true, opacity: op,
      depthWrite: false, blending: THREE.AdditiveBlending, color: 0xd8e6b0, sizeAttenuation: true
    }));
    scene.add(p);
    return p;
  }
  var dust1 = dustLayer(150, 0.55, 0.4, 42);
  var dust2 = dustLayer(90, 0.9, 0.3, 77);

  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  var bgT = 0;
  function render(dt, t) {
    if (typeof t === 'number') bgT = t; else bgT += dt;
    sharedTime.value = bgT;
    var T = bgT;
    // restrained camera drift (incommensurate periods: never visibly repeats)
    camera.position.set(
      camBase.x + 3.0 * Math.sin(T * 0.050) + 1.1 * Math.sin(T * 0.013 + 2.0),
      camBase.y + 1.1 * Math.sin(T * 0.021 + 1.0),
      camBase.z + 1.8 * Math.sin(T * 0.017 + 0.5)
    );
    camera.lookAt(lookAt);
    pAmber.position.set(19 * Math.cos(T * 0.10), 7 + 4 * Math.sin(T * 0.07), 8 + 6 * Math.sin(T * 0.10));
    pRed.position.set(23 * Math.cos(T * 0.073 + 2.4), -5 + 5 * Math.sin(T * 0.061 + 1), 4);
    for (var i = 0; i < rings.length; i++) rings[i].mesh.rotation.z += dt * rings[i].sp * 10;
    for (var j = 0; j < dashRings.length; j++) dashRings[j].mesh.rotation.z += dt * dashRings[j].sp * 10;
    dust1.rotation.y = T * 0.0045;
    dust2.rotation.y = -T * 0.003;
    dust1.position.y = Math.sin(T * 0.05) * 0.8;
    for (var c = 0; c < comets.length; c++) {
      var C = comets[c];
      var u = (T * C.speed + C.off) % 1;
      C.curve.getPointAt(u < 0 ? u + 1 : u, tmpV);
      C.sprite.position.copy(tmpV);
      var pl = 0.75 + 0.25 * Math.sin(T * 3 + C.off * 20);
      C.sprite.scale.set(C.size * pl, C.size * pl, 1);
    }
    renderer.render(scene, camera);
  }
  return { render: render };
}

/* ---------------- 2D fallback background ---------------- */
function initFallback2D() {
  var canvas = document.getElementById('bg2d');
  canvas.style.display = 'block';
  document.getElementById('bg').style.display = 'none';
  var g = canvas.getContext('2d');
  var rand = mulberry32(7);
  var lanes = [];
  for (var i = 0; i < 12; i++) {
    lanes.push({ y: rand(), amp: 30 + rand() * 90, f: 1 + rand() * 2, sp: 0.2 + rand() * 0.5, ph: rand() * TAU, gold: i % 4 === 0 });
  }
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();
  var bgT = 0;
  function render(dt, t) {
    if (typeof t === 'number') bgT = t; else bgT += dt;
    var W = canvas.width, H = canvas.height;
    g.fillStyle = '#031008';
    g.fillRect(0, 0, W, H);
    for (var i = 0; i < lanes.length; i++) {
      var L = lanes[i];
      g.strokeStyle = L.gold ? 'rgba(242,193,78,0.5)' : 'rgba(46,140,100,0.4)';
      g.lineWidth = L.gold ? 3 : 5;
      g.beginPath();
      for (var x = 0; x <= W; x += 14) {
        var y = (L.y * H) + Math.sin(x / W * Math.PI * 2 * L.f + bgT * L.sp + L.ph) * L.amp * (H / 960);
        if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
  }
  return { render: render };
}

/* ---------------- foreground scene controller ---------------- */
function initForeground() {
  var els = {};
  for (var i = 0; i < SCENES.length; i++) els[SCENES[i].id] = document.getElementById(SCENES[i].id);
  var fg = document.getElementById('fg');
  var cur = -1;
  var leaving = []; // {el, until}
  var clock = 0;

  function setScene(idx, now) {
    if (idx === cur) return;
    if (cur >= 0) {
      var prev = els[SCENES[cur].id];
      prev.classList.remove('on');
      prev.classList.add('leaving');
      leaving.push({ el: prev, until: now + TRANS_MS });
    }
    cur = idx;
    if (cur >= 0) els[SCENES[cur].id].classList.add('on');
  }
  function update(dt, now) {
    for (var i = leaving.length - 1; i >= 0; i--) {
      if (now >= leaving[i].until) {
        leaving[i].el.classList.remove('leaving');
        leaving.splice(i, 1);
      }
    }
    clock += dt;
    var idx;
    if (!LOOP && clock >= CYCLE) idx = SCENES.length - 1;
    else {
      var ct = clock % CYCLE, acc = 0;
      idx = 0;
      for (var s = 0; s < SCENES.length; s++) {
        acc += SCENES[s].dur;
        if (ct < acc) { idx = s; break; }
      }
    }
    setScene(idx, now);
  }
  function freezeAt(t) {
    fg.classList.add('frozen');
    for (var i = 0; i < SCENES.length; i++) els[SCENES[i].id].classList.remove('on', 'leaving');
    leaving = [];
    var ct = ((t % CYCLE) + CYCLE) % CYCLE, acc = 0, idx = 0;
    for (var s = 0; s < SCENES.length; s++) {
      acc += SCENES[s].dur;
      if (ct < acc) { idx = s; break; }
    }
    cur = idx;
    var on = els[SCENES[cur].id];
    on.classList.add('on');
    // pin the container too: stills must not depend on transition progress
    on.style.transition = 'none';
    on.style.opacity = '1';
    on.style.visibility = 'visible';
    // hard end-states: stills must not depend on the CSS animation clock
    var nodes = on.querySelectorAll('.m>span,.kick,.rule,.sub,img');
    for (var n = 0; n < nodes.length; n++) {
      nodes[n].style.animation = 'none';
      nodes[n].style.opacity = '1';
      nodes[n].style.transform = 'none';
    }
    var kl = on.querySelector('.kick');
    if (kl) kl.style.letterSpacing = '.42em';
    var sw = on.querySelector('.sweep');
    if (sw) sw.style.display = 'none';
    var rc = on.querySelector('.ring circle');
    if (rc) rc.style.strokeDashoffset = '0';
  }
  return { update: update, freezeAt: freezeAt };
}

/* ---------------- boot ---------------- */
function boot() {
  wireLogos();
  var bg = null;
  try {
    if (!window.THREE) throw new Error('three.js unavailable');
    bg = initWebGL();
  } catch (e) {
    try { bg = initFallback2D(); } catch (e2) { bg = null; }
  }
  var fg = initForeground();

  if (REDUCED && FREEZE === null) FREEZE = 4;

  if (FREEZE !== null) {
    // validation stills: pin foreground end-states, but keep the
    // background loop running so the frame is freshly composited
    if (bg) { try { bg.render(0, FREEZE); } catch (e) {} }
    fg.freezeAt(FREEZE);
  }

  var last = performance.now();
  var running = true;
  var fgFrozen = (FREEZE !== null);
  function frame(now) {
    if (!running) return;
    var dt = (now - last) / 1000;
    last = now;
    if (dt > 0.1) dt = 0.1;
    if (dt < 0) dt = 0;
    try { if (bg) bg.render(dt); } catch (e) {}
    if (!fgFrozen) { try { fg.update(dt, now); } catch (e) {} }
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', function () {
    last = performance.now();
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'f' || ev.key === 'F') {
      try {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
      } catch (e) {}
    }
  });
  requestAnimationFrame(frame);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();
