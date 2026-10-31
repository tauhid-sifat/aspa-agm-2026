/* Build script (locked): assembles the single self-contained index.html */
'use strict';
const fs = require('fs');
const path = require('path');

const read = f => fs.readFileSync(path.join(__dirname, 'logos-opt', f), 'utf8');
const b64 = f => fs.readFileSync(path.join(__dirname, f)).toString('base64');

// Grid order: RTI, ASPA, RTBD, Five Clubs(raster), DRT1, DMRT2, DJRT3, DYRT4
// RTITM.svg excluded: it is the 2026/27 theme banner, not the brand Rondel.
const LOGOS = ['RTI.svg', 'ASPA.svg', 'RTBD.svg', 'DRT1.svg', 'DMRT2.svg', 'DJRT3.svg', 'DYRT4.svg']
  .map(f => {
    const markup = read(f).replace(/\r?\n/g, ' ').replace(/>\s+</g, '><').trim();
    const m = markup.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    return { k: 'svg', n: f.replace('.svg', ''), vw: +m[1], vh: +m[2], s: markup };
  });

LOGOS.splice(3, 0, { k: 'png', n: 'fiveclubs', w: 399, h: 416, s: 'data:image/png;base64,' + b64('logos-opt/fiveclubs.png') });

const fontB64 = b64('nunito.woff2');
const logosJson = JSON.stringify(LOGOS);
const engine = fs.readFileSync(path.join(__dirname, 'engine.js'), 'utf8');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ASPA AGM 2026 — Round Table Bangladesh</title>
<style>
@font-face{
  font-family:'Nunito Sans';
  font-style:normal;
  font-weight:200 1000;
  font-display:block;
  src:url(data:font/woff2;base64,${fontB64}) format('woff2');
}
html,body{margin:0;padding:0;height:100%;background:#010506;overflow:hidden}
body{display:flex;align-items:center;justify-content:center}
#c{display:block;background:#07120E}
</style>
</head>
<body>
<canvas id="c" width="2160" height="1080"></canvas>
<script>
"use strict";
var LOGOS = ${logosJson};
${engine}
</script>
</body>
</html>
`;

const out = process.argv[2] || path.join(process.cwd(), 'index.html');
fs.writeFileSync(out, html);
console.log('written:', out, (fs.statSync(out).size / 1024).toFixed(1) + ' KB');
