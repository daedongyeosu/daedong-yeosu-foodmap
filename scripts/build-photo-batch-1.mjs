import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'data/photo-manifest.json'),'utf8'));
const config=manifest.packages.find(item=>item.id==='photo-batch-1-final');
if(!config)throw new Error('photo-batch-1-final 설정이 없습니다.');

const selected=[];const missing=[];
for(let number=1;number<=config.expectedParts;number++){
  const filename=`sprite-part-${String(number).padStart(2,'0')}.txt`;
  const preferred=path.join(root,config.preferredPath,filename);
  const fallback=path.join(root,config.fallbackPath,filename);
  if(fs.existsSync(preferred))selected.push({number,file:preferred,source:'preferred'});
  else if(fs.existsSync(fallback))selected.push({number,file:fallback,source:'fallback'});
  else missing.push(number);
}

console.log(`[1차 사진 조립] 선택 ${selected.length}/${config.expectedParts}`);
for(const item of selected)console.log(`${String(item.number).padStart(2,'0')} ${item.source} ${path.relative(root,item.file).replaceAll('\\','/')}`);
if(missing.length){
  console.log(`누락 조각: ${missing.join(', ')}`);
  console.log('불완전 패키지는 이미지 파일을 생성하지 않습니다.');
  process.exitCode=2;
}else{
  const base64=selected.map(item=>fs.readFileSync(item.file,'utf8').trim()).join('').replace(/\s+/g,'');
  if(!/^[A-Za-z0-9+/]*={0,2}$/.test(base64))throw new Error('결합 데이터가 올바른 Base64가 아닙니다.');
  const output=Buffer.from(base64,'base64');
  const isWebp=output.length>=12&&output.subarray(0,4).toString()==='RIFF'&&output.subarray(8,12).toString()==='WEBP';
  if(!isWebp)throw new Error('결합 결과가 WebP가 아닙니다.');
  const declaredSize=output.readUInt32LE(4)+8;
  if(declaredSize!==output.length)throw new Error(`WebP 크기 불일치: 헤더 ${declaredSize}, 실제 ${output.length}`);
  const buildDir=path.join(root,'build');fs.mkdirSync(buildDir,{recursive:true});
  const destination=path.join(buildDir,'photo-batch-1.webp');fs.writeFileSync(destination,output);
  console.log(`생성: ${path.relative(root,destination)}, ${output.length} bytes, sha256=${crypto.createHash('sha256').update(output).digest('hex')}`);
  console.log('주의: 고객 화면 연결 전 가게별 스프라이트 좌표 색인이 별도로 필요합니다.');
}
