const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'logos-opt');

for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.svg')) continue;
  const p = path.join(dir, f);
  let svg = fs.readFileSync(p, 'utf8');

  // Extract the <style> block
  const sm = svg.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  if (!sm) continue;
  const css = sm[1];

  // Parse rules: selector(s){decls} — split on }
  const rules = [];
  for (const chunk of css.split('}')) {
    const r = chunk.match(/([^{}]+)\{([^{}]*)/);
    if (!r) continue;
    rules.push({ sels: r[1].split(',').map(s => s.trim()).filter(Boolean), decls: r[2].trim() });
  }

  const declToAttrs = (decls) => {
    const attrs = [];
    for (const d of decls.split(';')) {
      const i = d.indexOf(':');
      if (i < 0) continue;
      const k = d.slice(0, i).trim();
      let v = d.slice(i + 1).trim().replace(/;+$/, '');
      if (!k) continue;
      attrs.push(`${k}="${v}"`);
    }
    return attrs.join(' ');
  };

  // Apply: replace class="...cls..." with presentation attributes
  svg = svg.replace(/<([a-zA-Z][\w-]*)((?:[^<>"]|"[^"]*")*?)\s*class="([^"]*)"\s*((?:[^<>"]|"[^"]*")*?)(\/?)>/g, (m, tag, pre, cls, post, slash) => {
    const classes = cls.split(/\s+/);
    const decls = [];
    for (const rule of rules) {
      for (const sel of rule.sels) {
        const cs = sel.match(/\.([A-Za-z0-9_-]+)$/);
        if (cs && classes.includes(cs[1])) decls.push(rule.decls);
      }
    }
    if (!decls.length) return m; // leave untouched (non-cls classes)
    // merge with an existing style attribute if present (post side)
    let extra = post.replace(/\s*style="([^"]*)"/, (mm, existing) => {
      decls.push(existing.replace(/^;|;$/g, ''));
      return '';
    });
    const attrStr = declToAttrs(decls.join(';'));
    return `<${tag}${pre} ${attrStr}${extra}${slash ? ' /' : ''}>`;
  });

  // Remove the now-superfluous class attributes without matching rules
  svg = svg.replace(/\s*class="[^"]*cls-[^"]*"/g, '');

  // Delete the whole <style> block
  svg = svg.replace(/<style[^>]*>[\s\S]*?<\/style>/, '');

  fs.writeFileSync(p, svg);
  console.log(f, 'inlined & class-stripped');
}
