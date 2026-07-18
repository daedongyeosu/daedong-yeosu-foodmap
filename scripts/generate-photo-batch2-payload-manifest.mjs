import fs from 'node:fs';
import crypto from 'node:crypto';

const files=[
  'assets/photo-batch-2-vetted/082.webp',
  'assets/photo-batch-2-vetted/083.webp',
  'assets/photo-batch-2-vetted/084.webp',
  'assets/photo-batch-2-vetted/089.webp',
  'assets/photo-batch-2-vetted/107.webp',
  'assets/photo-batch-2-vetted/108.webp',
  'assets/photo-batch-2-vetted/109.webp',
  'assets/photo-batch-2-vetted/282.webp',
  'assets/photo-batch-2-vetted/284.webp',
  'data/stores.json',
  'data/photo-manifest.json',
  'data/photo-policy.json',
  'data/photo-batch2-structure-report.json',
  'data/photo-batch2-vetted-assets.json',
  'data/photo-batch2-vetted-assignments.json',
  'data/photo-batch2-vetted-report.json',
  'data/photo-batch2-vetted-review-decisions.json',
  'scripts/seed-photo-batch2-vetted.mjs',
  'scripts/apply-photo-batch2-vetted.mjs',
  'scripts/generate-photo-batch2-payload-manifest.mjs',
  'scripts/validate-photo-batch2-vetted.mjs',
  '.github/workflows/photo-batch2-final-verification.yml',
  '.github/workflows/integration-validation.yml'
];
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const entries=files.map(file=>{
  if(!fs.existsSync(file))throw new Error(`패키지 파일 누락: ${file}`);
  return{path:file,bytes:fs.statSync(file).size,sha256:sha(file)};
});
const manifest={
  version:4,
  generatedAt:new Date().toISOString(),
  algorithm:'SHA-256',
  sourceOfTruth:'actual-agent-main-unification-files',
  fileCount:entries.length,
  files:entries
};
fs.writeFileSync('payload-manifest.json',`${JSON.stringify(manifest,null,2)}\n`);
const sums=[...entries,{path:'payload-manifest.json',sha256:sha('payload-manifest.json')}]
  .map(item=>`${item.sha256}  ${item.path}`).join('\n')+'\n';
fs.writeFileSync('SHA256SUMS.txt',sums);
console.log(`[무결성 매니페스트 생성] ${entries.length}/${entries.length} 파일`);
console.log(`[SHA256SUMS 생성] ${entries.length+1}/${entries.length+1} 파일`);
