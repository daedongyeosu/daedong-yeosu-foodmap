import fs from 'node:fs';
import crypto from 'node:crypto';
const files=[
'assets/photo-batch-2-vetted/082.webp','assets/photo-batch-2-vetted/083.webp','assets/photo-batch-2-vetted/084.webp','assets/photo-batch-2-vetted/089.webp','assets/photo-batch-2-vetted/107.webp','assets/photo-batch-2-vetted/108.webp','assets/photo-batch-2-vetted/109.webp','assets/photo-batch-2-vetted/282.webp','assets/photo-batch-2-vetted/284.webp',
'data/stores.json','data/photo-manifest.json','data/photo-batch2-structure-report.json','data/photo-batch2-vetted-assets.json','data/photo-batch2-vetted-assignments.json','data/photo-batch2-vetted-report.json','data/photo-batch2-vetted-review-decisions.json',
'scripts/seed-photo-batch2-vetted.mjs','scripts/apply-photo-batch2-vetted.mjs','scripts/generate-photo-batch2-payload-manifest.mjs','scripts/validate-photo-batch2-vetted.mjs','scripts/export-photo-review-bundle.mjs',
'.github/workflows/apply-photo-batch2-vetted.yml','.github/workflows/integration-validation.yml'
];
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const entries=files.map(path=>{if(!fs.existsSync(path))throw new Error(`패키지 파일 누락: ${path}`);return{path,bytes:fs.statSync(path).size,sha256:sha(path)};});
const manifest={version:3,generatedAt:new Date().toISOString(),algorithm:'SHA-256',sourceOfTruth:'actual-package-files',fileCount:entries.length,files:entries};
fs.writeFileSync('payload-manifest.json',`${JSON.stringify(manifest,null,2)}\n`);
const sums=[...entries,{path:'payload-manifest.json',sha256:sha('payload-manifest.json')}].map(x=>`${x.sha256}  ${x.path}`).join('\n')+'\n';
fs.writeFileSync('SHA256SUMS.txt',sums);
console.log(`[무결성 매니페스트 생성] ${entries.length}/${entries.length} 파일`);
console.log(`[SHA256SUMS 생성] ${entries.length+1}/${entries.length+1} 파일`);
