import { readFileSync } from 'node:fs';
const p = JSON.parse(readFileSync('./package.json', 'utf8'));
console.log('build scripts:');
for (const s of Object.keys(p.scripts)) {
  if (/build|webpack|mfrs/i.test(s)) console.log(`  ${s}: ${p.scripts[s]}`);
}
