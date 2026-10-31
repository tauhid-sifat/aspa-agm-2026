/* Build script: assembles the single self-contained index.html
   - three.js (Living Delta background) embedded inline
   - all 9 logos embedded (8 SVG + fiveclubs webp)
   - fonts embedded; engine.js drives bg + foreground scenes */
'use strict';
const fs = require('fs');
const path = require('path');

const read = f => fs.readFileSync(path.join(__dirname, 'logos-opt', f), 'utf8');
const b64file = f => fs.readFileSync(path.join(__dirname, f)).toString('base64');

const LOGOS = fs.readdirSync(path.join(__dirname, 'logos-opt'))
  .filter(f => f.endsWith('.svg'))
  .sort((a, b) => {
    const order = ['RTI.svg', 'ASPA.svg', 'RTBD.svg', 'DRT1.svg', 'DMRT2.svg', 'DJRT3.svg', 'DYRT4.svg', 'RTITM.svg'];
    return order.indexOf(a) - order.indexOf(b);
  })
  .map(f => {
    const markup = read(f).replace(/\r?\n/g, ' ').replace(/>\s+</g, '><').trim();
    const m = markup.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    return { k: 'svg', n: f.replace('.svg', ''), vw: +m[1], vh: +m[2], s: markup };
  });

const fiveclubs = b64file('logos-opt/fiveclubs.png');
LOGOS.splice(3, 0, { k: 'png', n: 'fiveclubs', s: 'data:image/png;base64,' + fiveclubs });

const fontB64 = b64file('nunito.woff2');
const frauncesB64 = b64file('fraunces-900.woff2');
const threeJS = fs.readFileSync(path.join(__dirname, 'three.min.js'), 'utf8')
  .replace(/<\/script/gi, '<\\/script');

const logosJson = JSON.stringify(LOGOS);

function read2(f) { return fs.readFileSync(path.join(__dirname, f), 'utf8'); }
const engine = read2('engine.js');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ASPA AGM 2026 — Round Table Bangladesh</title>
<style>
@font-face{font-family:'Nunito Sans';font-style:normal;font-weight:200 1000;font-display:block;src:url(data:font/woff2;base64,${fontB64}) format('woff2')}
@font-face{font-family:'Fraunces';font-style:normal;font-weight:600 900;font-display:block;src:url(data:font/woff2;base64,${frauncesB64}) format('woff2')}
html,body{margin:0;padding:0;height:100%;background:#020805;overflow:hidden}
body{position:fixed;inset:0}
#bg{position:fixed;inset:0;width:100%;height:100%;display:block}
#bg2d{position:fixed;inset:0;width:100%;height:100%;display:none}
#vignette{position:fixed;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 44%,rgba(0,0,0,0) 52%,rgba(0,0,0,.58) 100%)}
#rest{position:fixed;left:50%;top:50%;width:120vmin;height:72vmin;transform:translate(-50%,-50%);pointer-events:none;background:radial-gradient(ellipse at center,rgba(1,6,4,.62) 0%,rgba(1,6,4,.38) 45%,rgba(1,6,4,0) 72%)}
#fg{position:fixed;inset:0;pointer-events:none;overflow:hidden}
.scene{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;visibility:hidden;transition:opacity .9s ease,visibility 0s linear .9s}
.scene.on{opacity:1;visibility:visible;transition:opacity .9s ease}
.scene.leaving{opacity:0;visibility:visible;transition:opacity .8s ease,visibility 0s linear .8s}
/* ---------- headline ---------- */
.lockup{text-align:center;padding:0 6vw}
.kick{font:800 min(3.4vw,44px)/1 'Nunito Sans';letter-spacing:.9em;text-indent:.9em;color:#F2C14E;opacity:0}
.scene.on .kick,.scene.leaving .kick{animation:kick 1.3s cubic-bezier(.16,1,.3,1) .1s both}
@keyframes kick{from{opacity:0;letter-spacing:.9em;transform:translateY(18px)}to{opacity:1;letter-spacing:.42em;transform:none}}
.m{display:block;overflow:hidden;padding:.02em 0}
.m>span{display:block;font:900 min(12.5vw,236px)/1.02 'Fraunces';letter-spacing:-.01em;color:#F4EDDE;transform:translateY(112%)}
.scene.on .m>span,.scene.leaving .m>span{animation:rise 1.05s cubic-bezier(.16,1,.3,1) both;animation-delay:var(--d,0s)}
@keyframes rise{to{transform:none}}
.rule{width:min(34vw,620px);height:min(.5vw,6px);margin:min(2.6vw,34px) auto 0;background:linear-gradient(90deg,#F2C14E 0 92%,#B4232A 92% 100%);transform:scaleX(0);transform-origin:50% 50%}
.scene.on .rule,.scene.leaving .rule{animation:rule 1s cubic-bezier(.16,1,.3,1) .75s both}
@keyframes rule{to{transform:scaleX(1)}}
.sub{margin-top:min(2vw,26px);font:800 min(3vw,40px)/1 'Nunito Sans';letter-spacing:.34em;text-indent:.34em;color:#F4EDDE;opacity:0}
.scene.on .sub,.scene.leaving .sub{animation:fadeup 1s ease 1s both}
@keyframes fadeup{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
/* ---------- logos ---------- */
.logos{gap:min(3vw,54px);width:min(90vw,1690px)}
#s-trio img,#s-five img{flex:1 1 0;min-width:0;width:100%;object-fit:contain}
.logos img{object-fit:contain;filter:drop-shadow(0 8px 34px rgba(0,0,0,.65));opacity:0;transform:translateY(30px) scale(.955)}
.scene.logos.on img,.scene.logos.leaving img{animation:logoIn 1s cubic-bezier(.16,1,.3,1) both;animation-delay:var(--d,0s)}
#s-rti img{height:min(46vh,44vw)}
#s-trio img{height:min(32vh,330px)}
#s-five img{height:min(28vh,300px)}
@keyframes logoIn{to{opacity:1;transform:none}}
.sweep{position:absolute;top:-25%;bottom:-25%;left:0;width:36%;background:linear-gradient(100deg,rgba(255,250,235,0) 0%,rgba(255,250,235,.30) 50%,rgba(255,250,235,0) 100%);transform:translateX(-260%) skewX(-12deg)}
.scene.on .sweep{animation:sweep 1.15s ease .2s both}
@keyframes sweep{to{transform:translateX(380%) skewX(-12deg)}}
.clubs{position:relative;display:inline-block;line-height:0}
.clubs img{position:relative;z-index:1;width:min(40vw,620px)}
.ring{position:absolute;left:50%;top:50%;width:118%;aspect-ratio:1/1;transform:translate(-50%,-50%);opacity:.9;z-index:0}
.ring circle{fill:none;stroke:#F2C14E;stroke-width:1.5;stroke-dasharray:100;stroke-dashoffset:100;transform:rotate(-90deg);transform-origin:center}
.scene.on .ring circle{animation:draw 1.6s cubic-bezier(.4,0,.2,1) .15s both}
@keyframes draw{to{stroke-dashoffset:0}}
/* frozen (screenshot / reduced-motion): jump to end states */
.frozen .m>span,.frozen .kick,.frozen .rule,.frozen .sub,.frozen .logos img{animation-duration:.01s !important;animation-delay:0s !important}
.frozen .sweep{display:none}
.frozen .ring circle{stroke-dashoffset:0;animation:none}
#frame{position:fixed;inset:2.4vmin;border:1px solid rgba(242,193,78,.38);pointer-events:none}
</style>
</head>
<body>
<canvas id="bg"></canvas>
<canvas id="bg2d"></canvas>
<div id="vignette"></div>
<div id="rest"></div>
<div id="fg">
  <section class="scene" id="s-headline">
    <div class="lockup">
      <div class="kick">3RD ANNUAL</div>
      <div class="m" style="margin-top:min(1.6vw,22px)"><span style="--d:.15s">GENERAL</span></div>
      <div class="m"><span style="--d:.3s">MEETING</span></div>
      <div class="rule"></div>
      <div class="sub">ROUND TABLE BANGLADESH</div>
    </div>
  </section>
  <section class="scene logos" id="s-rti"><div class="sweep"></div><img data-logo="RTI" alt="RTI"></section>
  <section class="scene logos" id="s-trio"><img data-logo="ASPA" style="--d:.05s" alt="ASPA"><img data-logo="RTBD" style="--d:.2s" alt="RTBD"><img data-logo="RTITM" style="--d:.35s" alt="RTITM"></section>
  <section class="scene logos" id="s-five"><img data-logo="RTBD" style="--d:.05s" alt="RTBD"><img data-logo="DRT1" style="--d:.17s" alt="DRT1"><img data-logo="DMRT2" style="--d:.29s" alt="DMRT2"><img data-logo="DJRT3" style="--d:.41s" alt="DJRT3"><img data-logo="DYRT4" style="--d:.53s" alt="DYRT4"></section>
  <section class="scene logos" id="s-clubs"><div class="clubs"><svg class="ring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" pathLength="100"/></svg><img data-logo="fiveclubs" alt="5 Clubs Round Table 2022"></div></section>
</div>
<div id="frame"></div>
<script>${threeJS}</script>
<script>
"use strict";
var LOGOS = ${logosJson};
${engine}
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, 'index.html'), html);
const bytes = fs.statSync(path.join(__dirname, 'index.html')).size;
console.log('index.html written:', (bytes / 1024).toFixed(1) + ' KB, lines:', html.split('\n').length);
