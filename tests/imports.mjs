import fs from 'node:fs';
const dir = new URL('../js/', import.meta.url).pathname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
const exportsOf = {};
for (const f of files) {
  const src = fs.readFileSync(dir + f, 'utf8'); const set = new Set();
  for (const m of src.matchAll(/export\s+(?:async\s+)?(?:class|function|const|let)\s+(\w+)/g)) set.add(m[1]);
  exportsOf[f] = set;
}
let bad = 0;
for (const f of files) {
  const src = fs.readFileSync(dir + f, 'utf8');
  for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*'\.\/(\w+\.js)'/g)) {
    for (const name of m[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]).filter(Boolean))
      if (!exportsOf[m[2]]?.has(name)) { console.log(`  ! ${f}: '${name}' no se exporta desde ${m[2]}`); bad++; }
  }
}
if (bad) process.exit(1);
console.log(`Imports/exports consistentes en ${files.length} módulos.`);
