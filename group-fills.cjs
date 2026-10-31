const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'logos-opt');

for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.svg')) continue;
  const p = path.join(dir, f);
  let svg = fs.readFileSync(p, 'utf8');

  // Normalize style="fill:#xxx" (fill-only styles) to a fill attribute
  svg = svg.replace(/ style="([^"]*)"/g, (m, decls) => {
    const parts = decls.split(';').filter(Boolean);
    if (!parts.length) return '';
    if (parts.every(d => /^fill:/i.test(d.trim()))) {
      return ' ' + parts.map(d => d.trim().replace(/^fill:(.*)$/, 'fill="$1"')).join(' ');
    }
    return m;
  });

  // Simpler robust approach: find runs like: fill="X" appears identically on consecutive sibling self-closing paths
  const lines = svg;
  const re = /<(path)[^<>]*?(?<!\/)>|<([a-z]+)[^<>]*?\/>|<\/([a-z]+)>/g;
  // Too risky; use a conservative tokenizer over the whole document preserving text
  const tokens = [];
  let last = 0, m;
  const r = /<\/?[a-zA-Z][^<>]*>/g;
  while ((m = r.exec(svg))) {
    if (m.index > last) tokens.push({ t: 'text', s: svg.slice(last, m.index) });
    tokens.push({ t: 'tag', s: m[0] });
    last = r.lastIndex;
  }
  if (last < svg.length) tokens.push({ t: 'text', s: svg.slice(last) });

  const out = [];
  // Build runs of identical fill attributes on consecutive sibling paths
  const runs = [];
  let cur = null;
  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    const pm = tk.t === 'tag' ? tk.s.match(/^<path ((?:[^<>]*?))\/>$/) : null;
    if (pm) {
      const attrs = pm[1];
      const fm = attrs.match(/\sfill="([^"]*)"/);
      const rest = attrs.replace(/\sfill="[^"]*"/, '').replace(/\sd="[^"]*"/, '').replace(/^\s+|\s+$/g, '');
      if (fm) {
        const fill = fm[1];
        if (cur && cur.fill === fill && cur.rest === rest) cur.fillItems.push(tk);
        else { cur = { fill, rest, fillItems: [tk] }; runs.push(cur); }
        continue;
      }
      // path without fill (or with style attr) breaks the run
      cur = null;
    } else {
      cur = null;
    }
  }

  // Rebuild: replace each run (>=2 items) with g-wrapped version. Runs are token spans; walk again tracking run membership
  const runOf = new Map();
  runs.forEach(run => run.fillItems.forEach(tk => runOf.set(tk, run)));
  const emitted = new Set();
  let i2 = 0;
  while (i2 < tokens.length) {
    const tk = tokens[i2];
    const run = runOf.get(tk);
    if (run && !emitted.has(run)) {
      // measure span until run ends
      let j = i2, count = 0;
      while (j < tokens.length && runOf.get(tokens[j]) === run) { j++; count++; }
      if (count >= 2) {
        const inner = [];
        let j2 = i2;
        while (j2 < tokens.length && runOf.get(tokens[j2]) === run) {
          inner.push(tokens[j2].s.replace(/\sfill="[^"]*"/, '').replace(/(<path)\s+(.*?)\s*\/>/, '$1 $2/>'));
          j2++;
        }
        out.push(`<g fill="${run.fill}">${inner.join('')}</g>`);
        emitted.add(run);
        i2 = j2;
        continue;
      } else {
        emitted.add(run); // still emit tokens normally below
      }
    } else if (run && emitted.has(run) && runOf.get(tokens[i2 - 1]) !== run) {
      // start of an already-emitted run shouldn't happen when span>1
    }
    out.push(tk.s);
    i2++;
  }
  // drop placeholder artifact if any
  fs.writeFileSync(p, out.join(''));
  const bytes = Buffer.byteLength(out.join(''));
  console.log(f, Math.round(bytes / 1024 * 10) / 10, 'KiB');
}
