import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const errors=[];const warnings=[];const pass=[];
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const exists=file=>fs.existsSync(path.join(root,file));
const check=(condition,message,bucket=errors)=>condition?pass.push(message):bucket.push(message);

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

const blocked=(policy.blockedPathKeywords||[]).map(value=>String(value).toLowerCase());const suspicious=stores.filter(store=>blocked.some(keyword=>String(store.image||'').toLowerCase().includes(keyword)));if(suspicious.length)warnings.push(`차단 키워드가 포함된 기존 사진 경로 ${suspicious.length}개 — 런타임에서 대체사진 처리`);else pass.push('기존 사진 경로 차단 키워드 미검출');

const package1=(manifest.packages||[]).find(item=>item.id==='photo-batch-1-final');if(package1){let detected=0;for(let i=1;i<=package1.expectedParts;i++){const file=`data/photo-batch-1-final/sprite-part-${String(i).padStart(2,'0')}.txt`;if(exists(file))detected++;}check(detected===package1.detectedParts,`1차 사진 패키지 조각 수 일치: ${detected}/${package1.expectedParts}`);if(detected<package1.expectedParts)warnings.push(`1차 사진 패키지 미완성: ${detected}/${package1.expectedParts} — 런타임 비활성 유지`);}
check((manifest.packages||[]).some(item=>item.id==='photo-batch-2'),'2차 사진 패키지 항목 존재');
check((manifest.packages||[]).some(item=>item.id==='notion'),'노션 사진 패키지 항목 존재');
check((policy.blockedClassifications||[]).includes('sensitive_document'),'민감서류 차단 분류 존재');
check((policy.blockedClassifications||[]).includes('price_list'),'가격표 차단 분류 존재');
check((policy.blockedClassifications||[]).includes('non_food'),'비음식 사진 차단 분류 존재');

console.log('\n[통합 검증 결과]');for(const item of pass)console.log(`PASS  ${item}`);for(const item of warnings)console.log(`WARN  ${item}`);for(const item of errors)console.log(`FAIL  ${item}`);console.log(`\nPASS ${pass.length} / WARN ${warnings.length} / FAIL ${errors.length}`);process.exitCode=errors.length?1:0;
