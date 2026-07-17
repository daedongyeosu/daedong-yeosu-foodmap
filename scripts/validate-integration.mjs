import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const errors=[];const warnings=[];const pass=[];
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const exists=file=>fs.existsSync(path.join(root,file));
const check=(condition,message,bucket=errors)=>condition?pass.push(message):bucket.push(message);
const listFiles=directory=>{
  const absolute=path.join(root,directory);
  if(!fs.existsSync(absolute))return [];
  return fs.readdirSync(absolute,{withFileTypes:true}).filter(entry=>entry.isFile()).map(entry=>`${directory}/${entry.name}`).sort();
};

for(const file of ['index.html','app.css','app.js','data/stores.json','data/photo-manifest.json','data/photo-policy.json'])check(exists(file),`필수 파일 존재: ${file}`);

const index=read('index.html');
check(index.includes('href="app.css'),'index.html이 app.css를 사용');
check(index.includes('src="app.js'),'index.html이 app.js를 사용');
check(!/app-v[789]\.js|styles-v[789]\.css|fix-v9/i.test(index),'index.html에서 구버전 실행 참조 제거');

try{new vm.Script(read('app.js'),{filename:'app.js'});pass.push('app.js 문법 검사 통과');}catch(error){errors.push(`app.js 문법 오류: ${error.message}`);}
const css=read('app.css');
check(css.includes('-webkit-line-clamp:2'),'긴 가게명 두 줄 표시 규칙 존재');
check(css.includes('.carousel-track.is-animated'),'무한 슬라이드 전환 규칙 존재');

let stores=[];try{stores=JSON.parse(read('data/stores.json'));pass.push(`stores.json 파싱 통과: ${stores.length}개`);}catch(error){errors.push(`stores.json 파싱 실패: ${error.message}`);}
let manifest={};try{manifest=JSON.parse(read('data/photo-manifest.json'));pass.push('photo-manifest.json 파싱 통과');}catch(error){errors.push(`photo-manifest.json 파싱 실패: ${error.message}`);}
let policy={};try{policy=JSON.parse(read('data/photo-policy.json'));pass.push('photo-policy.json 파싱 통과');}catch(error){errors.push(`photo-policy.json 파싱 실패: ${error.message}`);}

const ids=new Set();for(const store of stores){if(ids.has(String(store.id)))errors.push(`중복 가게 ID: ${store.id}`);ids.add(String(store.id));if(!store.name)errors.push(`가게명 누락 ID: ${store.id}`);}
check(ids.size===stores.length,'가게 ID 중복 없음');

const blocked=(policy.blockedPathKeywords||[]).map(value=>String(value).toLowerCase());
const suspicious=stores.filter(store=>blocked.some(keyword=>String(store.image||'').toLowerCase().includes(keyword)));
if(suspicious.length)warnings.push(`차단 키워드가 포함된 기존 사진 경로 ${suspicious.length}개 — 런타임에서 대체사진 처리`);else pass.push('기존 사진 경로 차단 키워드 미검출');

const imageStats={empty:0,existing:0,broken:0,external:0,nonImage:0};
for(const store of stores){
  const image=String(store.image||'').trim();
  if(!image){imageStats.empty++;continue;}
  if(/^https?:\/\//i.test(image)){imageStats.external++;continue;}
  if(!/\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(image)){imageStats.nonImage++;continue;}
  if(exists(image))imageStats.existing++;else imageStats.broken++;
}
pass.push(`가게 사진 상태: 정상 ${imageStats.existing}, 빈값 ${imageStats.empty}, 깨진경로 ${imageStats.broken}, 외부 ${imageStats.external}, 비이미지 ${imageStats.nonImage}`);
if(imageStats.empty||imageStats.broken||imageStats.nonImage)warnings.push('사진 누락·깨진 경로·비이미지 경로는 고객 화면에서 검수 대기 이미지로 대체');

const package1=(manifest.packages||[]).find(item=>item.id==='photo-batch-1-final');
if(package1){
  const preferredNumbers=[];const recoverableNumbers=[];
  for(let number=1;number<=package1.expectedParts;number++){
    const filename=`sprite-part-${String(number).padStart(2,'0')}.txt`;
    const preferred=`${package1.preferredPath}/${filename}`;
    const fallback=`${package1.fallbackPath}/${filename}`;
    if(exists(preferred))preferredNumbers.push(number);
    if(exists(preferred)||exists(fallback))recoverableNumbers.push(number);
  }
  const missingNumbers=Array.from({length:package1.expectedParts},(_,index)=>index+1).filter(number=>!recoverableNumbers.includes(number));
  check(preferredNumbers.length===package1.preferredPartsDetected,`1차 최종 폴더 조각 수 일치: ${preferredNumbers.length}/${package1.expectedParts}`);
  check(recoverableNumbers.length===package1.recoverableParts,`1차 원본 보충 가능 조각 수 일치: ${recoverableNumbers.length}/${package1.expectedParts}`);
  check(JSON.stringify(missingNumbers)===JSON.stringify(package1.missingPartNumbers),`1차 누락 조각 목록 일치: ${missingNumbers.join(', ')}`);
  check(package1.runtimeEnabled===false,'불완전 1차 사진 패키지 런타임 비활성');
  if(missingNumbers.length)warnings.push(`1차 사진 패키지 미완성: 복구 가능 ${recoverableNumbers.length}/${package1.expectedParts}, 누락 ${missingNumbers.join(', ')}`);
}
const package2=(manifest.packages||[]).find(item=>item.id==='photo-batch-2');
check(Boolean(package2),'2차 사진 패키지 항목 존재');
if(package2){const detected=exists(package2.basePath);check(detected===Boolean(package2.detected),`2차 사진 실제 존재 상태 일치: ${detected?'발견':'미발견'}`);check(package2.runtimeEnabled===false,'미발견 2차 사진 패키지 런타임 비활성');if(!detected)warnings.push('2차 사진 패키지 파일이 저장소에 없음');}
const notion=(manifest.packages||[]).find(item=>item.id==='notion');
check(Boolean(notion),'노션 사진 패키지 항목 존재');
if(notion){const notionCount=listFiles(notion.basePath).length;check(notionCount===notion.detectedFiles,`노션 사진 파일 수 일치: ${notionCount}개`);}
check((policy.blockedClassifications||[]).includes('sensitive_document'),'민감서류 차단 분류 존재');
check((policy.blockedClassifications||[]).includes('price_list'),'가격표 차단 분류 존재');
check((policy.blockedClassifications||[]).includes('non_food'),'비음식 사진 차단 분류 존재');

console.log('\n[통합 검증 결과]');for(const item of pass)console.log(`PASS  ${item}`);for(const item of warnings)console.log(`WARN  ${item}`);for(const item of errors)console.log(`FAIL  ${item}`);console.log(`\nPASS ${pass.length} / WARN ${warnings.length} / FAIL ${errors.length}`);process.exitCode=errors.length?1:0;
