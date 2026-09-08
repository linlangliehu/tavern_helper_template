import fs from 'node:fs';
import path from 'node:path';

const manifestDir = '.planning/magic-worldbook-implementation-20260908';
const packageIds = process.argv.slice(2).length > 0 ? process.argv.slice(2) : [
  'TALENT-WORKSHOP',
  'FANTASY-HAND',
  'AUGUST-31',
  'GENESIS-07',
  'GENESIS-10',
  'GENESIS-14',
];

const manifests = fs.readdirSync(manifestDir)
  .filter((fileName) => fileName.startsWith('worker-') && fileName.endsWith('.json'))
  .map((fileName) => ({
    fileName,
    data: JSON.parse(fs.readFileSync(path.join(manifestDir, fileName), 'utf8')),
  }));

for (const packageId of packageIds) {
  const manifest = manifests.find(({ data }) =>
    (data.files || []).some((record) => record.packageId === packageId),
  );
  const record = manifest?.data.files.find((candidate) => candidate.packageId === packageId);
  if (!record) throw new Error(`Missing package manifest: ${packageId}`);

  const source = fs.readFileSync(record.path, 'utf8');
  const match = source.match(/== 4\. 节点推进表 ==[\s\S]*?(?=\n== 5\.|$)/);
  console.log(`\n### ${packageId} (${manifest.fileName})`);
  console.log(`title: ${record.title}`);
  console.log(`entry: ${record.entryNode}`);
  console.log(`nodes: ${record.nodeIds.join(', ')}`);
  if (!match) {
    console.log('node table: not found');
    continue;
  }

  const nodeBlocks = match[0].split(/(?=^[A-Z][A-Z0-9-]+ )/m).slice(1);
  for (const block of nodeBlocks) {
    console.log(block.split('\n').slice(0, 9).join('\n').trimEnd());
  }
}
