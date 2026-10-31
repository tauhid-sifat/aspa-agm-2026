const fs = require('fs');
const s = fs.readFileSync('index.html', 'utf8');
let p = 0, positions = [];
while ((p = s.indexOf('@font-face', p)) !== -1) { positions.push(p); p += 1; }
console.log('fontface positions:', positions);
let q = 0, urls = [];
while ((q = s.indexOf('url(', q)) !== -1) { urls.push(q); q += 1; }
console.log('url( positions:', urls, 'count', urls.length);
console.log('nearest non-b64 before LOGOS:');
console.log(JSON.stringify(s.slice(111000, 112400)));
