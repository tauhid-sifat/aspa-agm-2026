/* ============================================================
   "Delta Dawn" — 30 s seamless LED loop, ASPA AGM 2026
   Backing store 2160x1080; design space 2000x1000; u = 1.08.
   Every visual property is a pure function of t (seconds, 0..30).
   ============================================================ */
var DUR = 30;
window.__DUR = DUR;

var canvas = document.getElementById('c');
var ctx = canvas.getContext('2d', { alpha: false });
var U = 2160 / 2000; // design-to-device unit, fixed

var FIELD = '#07120E', WHITE = '#FFFFFF', ORANGE = '#EFA841', YELLOW = '#F7C546';

/* ---------- utilities ---------- */
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function ss(a, b, x) {                 // smoothstep, 0 at both ends
  if (b <= a) return x < a ? 0 : 1;
  var k = clamp((x - a) / (b - a), 0, 1);
  return k * k * (3 - 2 * k);
}
function mulberry32(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeSprite(w, h, draw) {
  var c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  return c;
}
function frac01(v) { var f = v - Math.floor(v); return f < 0 ? f + 1 : f; }

/* ---------- caches ---------- */
var CAP = 0.705;
var texSun, texDot, texRing, texSweep, texNoise;
var TXT = null;
var logoAssets = [];   // per logo: {tex, cx, cy, cw, ch}
var assetsReady = false;
var RTI = null;

/* ---------- optical bbox measurement ---------- */
var MEASURE_HOST = document.createElement('div');
MEASURE_HOST.style.cssText = 'position:absolute;left:-99999px;top:0;width:1px;height:1px;overflow:hidden';
document.body.appendChild(MEASURE_HOST);

function measureOptical(markup) {
  MEASURE_HOST.innerHTML = markup;
  var svg = MEASURE_HOST.querySelector('svg');
  var bb = svg ? svg.getBBox() : { x: 0, y: 0, width: 591, height: 591 };
  MEASURE_HOST.innerHTML = '';
  return bb;
}

/* ---------- rasterisation (startup only) ---------- */
function rasterizeSvg(markup, vw, vh, R) {
  return new Promise(function (resolve, reject) {
    var W = Math.ceil(vw * R), H = Math.ceil(vh * R);
    var big = markup.replace(/<svg\b([^>]*)>/i, function (m, attrs) {
      attrs = attrs.replace(/\s(?:width|height)="[^"]*"/g, '');
      return '<svg' + attrs + ' width="' + W + '" height="' + H + '">';
    });
    var img = new Image();
    img.onload = function () {
      var tex = makeSprite(W, H, function (g) { g.drawImage(img, 0, 0, W, H); });
      resolve(tex);
    };
    img.onerror = reject;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(big);
  });
}
function loadRaster(src) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    img.onload = function () { resolve(img); };
    img.onerror = reject;
    img.src = src;
  });
}

/* ---------- sprite builders (all gradients prebaked once) ---------- */
function buildSun() {
  texSun = makeSprite(1000, 1000, function (g) {
    var R = 500;
    var gr = g.createRadialGradient(R, R, 0, R, R, R);
    gr.addColorStop(0.00, 'rgba(247,197,70,0.98)');
    gr.addColorStop(0.22, 'rgba(247,197,70,0.92)');
    gr.addColorStop(0.46, 'rgba(239,168,65,0.60)');
    gr.addColorStop(0.72, 'rgba(239,168,65,0.22)');
    gr.addColorStop(0.88, 'rgba(239,168,65,0.07)');
    gr.addColorStop(1.00, 'rgba(239,168,65,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 1000, 1000);
  });
  texDot = makeSprite(260, 260, function (g) {
    var R = 130;
    var gr = g.createRadialGradient(R, R, 0, R, R, R);
    gr.addColorStop(0.00, 'rgba(247,197,70,0.95)');
    gr.addColorStop(0.12, 'rgba(247,197,70,0.85)');
    gr.addColorStop(0.30, 'rgba(239,168,65,0.30)');
    gr.addColorStop(1.00, 'rgba(239,168,65,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 260, 260);
  });
}

function buildRing() {
  texRing = makeSprite(1100, 1100, function (g) {
    var R = 550;
    var gr = g.createRadialGradient(R, R, 0, R, R, R);
    gr.addColorStop(0.70, 'rgba(255,255,255,0)');
    gr.addColorStop(0.80, 'rgba(255,255,255,0.55)');
    gr.addColorStop(0.86, 'rgba(255,255,255,0.50)');
    gr.addColorStop(0.94, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 1100, 1100);
  });
}

function buildSweep() {
  texSweep = makeSprite(3800, 2800, function (g) {
    g.translate(1900, 1400);
    g.rotate(-0.55);
    var band = g.createLinearGradient(0, -700, 0, 700);
    band.addColorStop(0.00, 'rgba(255,255,255,0)');
    band.addColorStop(0.50, 'rgba(255,255,255,0.15)');
    band.addColorStop(1.00, 'rgba(255,255,255,0)');
    g.fillStyle = band;
    g.fillRect(-3000, -2200, 6000, 4400);
  });
}

function buildNoise() {              // static 2% dither layer (seeded)
  texNoise = makeSprite(2160, 1080, function (g) {
    var rand = mulberry32(0x20261024);
    var id = g.createImageData(2160, 1080);
    var d = id.data;
    for (var i = 0; i < d.length; i += 4) {
      var v = rand() < 0.5 ? 255 : 0;
      d[i] = v; d[i + 1] = v; d[i + 2] = v;
      d[i + 3] = (0.02 * 255 * rand()) | 0;
    }
    g.putImageData(id, 0, 0);
  });
}

function capRatio(weight) {
  var tc = document.createElement('canvas').getContext('2d');
  tc.font = weight + ' 100px "Nunito Sans"';
  var m = tc.measureText('H');
  return (m.actualBoundingBoxAscent || 70.5) / 100;
}

/* text sprite: rendered once at exact device resolution */
function textSprite(str, capU, color, weight, trackEm) {
  var fp = (capU * U) / CAP;
  var font = weight + ' ' + fp.toFixed(1) + 'px "Nunito Sans"';
  var ls = (trackEm * fp).toFixed(2) + 'px';
  var tc = document.createElement('canvas').getContext('2d');
  tc.font = font;
  if ('letterSpacing' in tc) tc.letterSpacing = ls;
  var m = tc.measureText(str);
  var w = Math.ceil(m.width) + 8;
  var asc = Math.ceil(m.actualBoundingBoxAscent || fp * CAP);
  var desc = Math.ceil(m.actualBoundingBoxDescent || fp * 0.25);
  var c = document.createElement('canvas');
  c.width = w; c.height = asc + desc + 4;
  var g = c.getContext('2d');
  g.font = font;
  if ('letterSpacing' in g) g.letterSpacing = ls;
  g.fillStyle = color;
  g.textBaseline = 'alphabetic';
  g.fillText(str, 4, asc + 1.5);
  return { tex: c, wU: w / U, capOffU: 1.5 / U };
}

function buildText() {
  TXT = {
    motto:   textSprite('ADOPT - ADAPT - IMPROVE', 72, WHITE, 800, 0.015),
    eyebrow: textSprite('3RD ANNUAL', 72, ORANGE, 800, 0.02),
    line1:   textSprite('GENERAL', 200, WHITE, 900, -0.02),
    line2:   textSprite('MEETING', 200, WHITE, 900, -0.02)
  };
}

function buildAssets() {
  CAP = capRatio('900');
  buildSun(); buildRing(); buildSweep(); buildNoise(); buildText();
}

function buildLogoAssets() {
  var jobs = [];
  for (var i = 0; i < LOGOS.length; i++) {
    (function (idx) {
      var L = LOGOS[idx];
      if (L.k === 'png') {
        jobs.push(loadRaster(L.s).then(function (img) {
          logoAssets[idx] = { tex: img, cx: 0, cy: 0, cw: img.naturalWidth, ch: img.naturalHeight };
        }));
      } else {
        jobs.push(rasterizeSvg(L.s, L.vw, L.vh, 3).then(function (tex) {
          var bb = measureOptical(L.s);
          var R = tex.width / L.vw;
          var bx = Math.max(0, bb.x) * R;
          var by = Math.max(0, bb.y) * R;
          var bwid = Math.min(tex.width - bx, bb.width * R);
          var bhei = Math.min(tex.height - by, bb.height * R);
          logoAssets[idx] = { tex: tex, cx: bx, cy: by, cw: bwid, ch: bhei };
        }));
      }
    })(i);
  }
  return Promise.all(jobs).then(function () { assetsReady = true; RTI = logoAssets[0]; });
}

/* ---------- draw helpers (per-frame, zero allocations) ---------- */
function drawSprite(tex, cxU, cyU, dWU, dHU, alpha) {
  if (alpha <= 0.001) return;
  ctx.globalAlpha = alpha;
  ctx.drawImage(tex, (cxU - dWU / 2) * U, (cyU - dHU / 2) * U, dWU * U, dHU * U);
  ctx.globalAlpha = 1;
}
function drawOptical(A, cxU, cyU, wU, hU, alpha, scale) {
  if (alpha <= 0.001) return;
  var k = Math.min((wU * U) / A.cw, (hU * U) / A.ch) * (scale || 1);
  var wDev = A.cw * k, hDev = A.ch * k;
  ctx.globalAlpha = alpha;
  ctx.drawImage(A.tex, A.cx, A.cy, A.cw, A.ch,
    (cxU * U) - wDev / 2, (cyU * U) - hDev / 2, wDev, hDev);
  ctx.globalAlpha = 1;
}
function drawText(T, cxU, capTopU, alpha) {
  if (alpha <= 0.001) return;
  ctx.globalAlpha = alpha;
  ctx.drawImage(T.tex, (cxU - T.wU / 2) * U, (capTopU - T.capOffU) * U);
  ctx.globalAlpha = 1;
}

/* ---------- THE FRAME (pure function of t) ---------- */
var FALLBACK_DONE = false;
function drawFallbackStatic() {
  if (FALLBACK_DONE) return;
  FALLBACK_DONE = true;
  ctx.fillStyle = FIELD;
  ctx.fillRect(0, 0, 2160, 1080);
  try { ctx.drawImage(texDot, (900 - 65) * U, (400 - 65) * U, 130 * U, 130 * U); } catch (e) {}
}

function render(t) {
  try {
    /* field */
    ctx.fillStyle = FIELD;
    ctx.fillRect(0, 0, 2160, 1080);
    if (!assetsReady) { if (DEBUG) drawDebug(t); return; }

    var CX = 1000, CY = 500;

    /* --- anchor point (identical state at t=0 and t=30) --- */
    var pA = 0.9 * (1 - ss(2, 3.5, t)) + 0.9 * ss(28.5, 30, t);
    if (pA > 0.001) {
      ctx.globalAlpha = pA;
      ctx.drawImage(texDot, (CX - 65) * U, (CY - 65) * U, 130 * U, 130 * U);
      ctx.globalAlpha = 1;
    }

    /* --- sun: blooms and rises --- */
    var sunA = ss(2, 4.5, t) * (1 - ss(8, 9.5, t));
    if (sunA > 0.001) {
      var bloom = ss(2, 6.5, t);
      var rU = 60 + 240 * bloom;                       // 60 -> 300 u radius
      var syU = 560 - 70 * bloom;                      // rises 560 -> 490
      drawSprite(texSun, CX, syU, rU * 2, rU * 2, sunA);
    }

    /* --- ambient ripples: 3 rings, 10 s period, 4-6 % --- */
    var env = ss(2, 3.5, t) * (1 - ss(28.5, 29.8, t));
    if (env > 0.001) {
      for (var ri = 0; ri < 3; ri++) {
        var ph = frac01((t - 2 - ri * (10 / 3)) / 10);
        var al = env * 0.055 * Math.sin(Math.PI * ph);
        if (al > 0.004) {
          var rr = ph * 420;                            // max radius 420 u
          var dd = (rr / 0.86) * 2 * U;
          ctx.globalAlpha = al;
          ctx.drawImage(texRing, (CX * U) - dd / 2, (CY * U) - dd / 2, dd, dd);
          ctx.globalAlpha = 1;
        }
      }
    }

    /* --- the Rondel arrives over the sun as a seal --- */
    var rA = ss(2.2, 6.3, t) * (1 - ss(8.3, 9.4, t));
    if (rA > 0.001 && RTI) {
      var rS = 0.96 + 0.04 * ss(2.2, 6.3, t);           // uniform 0.96 -> 1.0, entrance only
      drawOptical(RTI, CX, 490, 500, 500, rA, rS);
    }

    /* --- motto --- */
    var mA = ss(6.6, 7.8, t) * (1 - ss(8.6, 9.4, t));
    if (mA > 0.001) drawText(TXT.motto, CX, 860, mA);

    /* --- white panel + family grid --- */
    var pA2 = ss(9.5, 11.5, t) * (1 - ss(19.5, 21, t));
    if (pA2 > 0.001) {
      ctx.globalAlpha = pA2;
      ctx.fillStyle = WHITE;
      ctx.fillRect(200 * U, 200 * U, 1600 * U, 600 * U);
      ctx.globalAlpha = 1;

      var n = LOGOS.length;
      var cols, rows;
      if (n === 8) { cols = 4; rows = 2; }
      else if (n === 9) { cols = 3; rows = 3; }
      else if (n % 2 === 0) { cols = Math.min(4, n / 2); rows = 2; }
      else { cols = Math.min(4, n); rows = Math.ceil(n / cols); }

      for (var i = 0; i < n; i++) {
        var wi = ss(11.5 + 0.4 * i, 12.1 + 0.4 * i, t);  // 0.4 s apart, 0.6 s each
        if (wi <= 0.001) continue;
        var col = i % cols, row = (i / cols) | 0;
        drawOptical(logoAssets[i], 400 + 400 * col, 350 + 300 * row,
          300, 220, pA2 * wi, 0.96 + 0.04 * wi);
      }
    }

    /* --- headline: 3RD ANNUAL / GENERAL / MEETING --- */
    var fadeAll = 1 - ss(28.3, 29.5, t);
    var aEb  = ss(21.7, 22.7, t) * fadeAll;
    var aL1  = ss(22.0, 23.2, t) * fadeAll;
    var aL2  = ss(22.5, 23.7, t) * fadeAll;
    var aRU  = ss(23.9, 24.9, t) * fadeAll;
    if (aEb > 0.001) drawText(TXT.eyebrow, CX, 176, aEb);
    if (aL1 > 0.001) drawText(TXT.line1, CX, 290, aL1);
    if (aL2 > 0.001) drawText(TXT.line2, CX, 540, aL2);
    if (aRU > 0.001) {
      ctx.globalAlpha = aRU;
      ctx.fillStyle = YELLOW;
      ctx.fillRect((CX - 210) * U, 797 * U, 420 * U, 6 * U);
      ctx.globalAlpha = 1;
    }

    /* --- one slow low-opacity sweep during the hold --- */
    var swK = ss(26.5, 28.5, t);
    if (swK > 0.001 && swK < 1) {
      var bell = Math.sin(Math.PI * swK);
      drawSprite(texSweep, 1000 + (swK - 0.5) * 2600, 500, 3800, 2800, bell * 0.5);
    }

    /* --- static dither (prevents 8-bit banding) --- */
    ctx.drawImage(texNoise, 0, 0);

    if (DEBUG) drawDebug(t);
  } catch (e) {
    drawFallbackStatic();
    throw e;
  }
}

/* ---------- debug overlay ---------- */
var DEBUG = /(?:^|[?&])debug=1/.test(location.search);
var frameCount = 0;
function drawDebug(t) {
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(80 * U, 80 * U, (2000 - 160) * U, (1000 - 160) * U);
  ctx.font = '800 ' + (72 / 0.705).toFixed(0) + 'px "Nunito Sans"';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.textBaseline = 'top';
  ctx.fillText('t=' + t.toFixed(2) + 's  f=' + frameCount, 100, 106);
}

/* ---------- loop ---------- */
var t0 = 0, lastT = 0, running = false, rafID = 0;
var FREEZE = null;
(function () {
  var m = /[?&]t=([0-9.]+)/.exec(location.search);
  if (m) FREEZE = parseFloat(m[1]);
})();

function loop(now) {
  if (!running) return;
  var t = ((now - t0) / 1000) % DUR;
  frameCount++;
  render(t);
  rafID = requestAnimationFrame(loop);
}
document.addEventListener('visibilitychange', function () {
  if (!running) return;
  if (document.hidden) lastT = ((performance.now() - t0) / 1000) % DUR;
  else t0 = performance.now() - lastT * 1000;
});
function startLoop() {
  if (running) return;
  running = true;
  t0 = performance.now();
  rafID = requestAnimationFrame(loop);
}

/* letterbox: canvas CSS size tracks the window, 2:1 preserved */
function fit() {
  var s = Math.min(innerWidth / 2160, innerHeight / 1080);
  if (!isFinite(s) || s <= 0) s = 1;
  canvas.style.width = Math.floor(2160 * s) + 'px';
  canvas.style.height = Math.floor(1080 * s) + 'px';
}
addEventListener('resize', fit);
fit();

/* ---------- self-test harness (?selftest=1) ---------- */
function selftest() {
  try {
    window.__renderFrame(0);
    var d0 = document.getElementById('c').toDataURL();
    window.__renderFrame(30);
    var d30 = document.getElementById('c').toDataURL();
    var ok = d0 === d30;
    var res = performance.getEntriesByType('resource').length;
    var el = document.createElement('pre');
    el.id = 'selftest';
    el.textContent = 'SELFTEST identity=' + ok + ' resources=' + res + ' dur=' + DUR;
    document.body.appendChild(el);
    if (!ok) console.error('SELFTEST FAIL t0!=t30');
  } catch (e) {
    console.error('SELFTEST ERROR ' + e);
  }
}
if (/selftest=1/.test(location.search)) { var _boot = boot; boot = function () { _boot(); setTimeout(selftest, 4000); }; }

/* ---------- boot ---------- */
function boot() {
  try {
    if (document.fonts && document.fonts.load) {
      document.fonts.load('900 100px "Nunito Sans"');
      document.fonts.load('800 100px "Nunito Sans"');
    }
    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    fontsReady.then(function () {
      try { buildAssets(); } catch (e) { drawFallbackStatic(); return; }
      buildLogoAssets().then(function () {
        window.__renderFrame = render;
        if (FREEZE !== null) render(FREEZE);
        else startLoop();
      }).catch(function () { drawFallbackStatic(); });
    });
    window.__renderFrame = function (tt) { if (assetsReady) render(tt); };
  } catch (e) {
    drawFallbackStatic();
  }
}
boot();
