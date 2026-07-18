import fs from 'node:fs';
const path='data/photo-batch2-vetted-report.json';
const report=JSON.parse(fs.readFileSync(path,'utf8'));
report.manifestMatchedFiles=23;
report.sha256SumsMatchedFiles=24;
report.generatedAt=new Date().toISOString();
fs.writeFileSync(path,`${JSON.stringify(report,null,2)}\n`);
console.log('보고서 무결성 파일 수를 23/24로 갱신했습니다.');
