import fs from 'node:fs';
import vm from 'node:vm';

const checks=[];const warnings=[];const errors=[];
const check=(condition,message)=>condition?checks.push(message):errors.push(message);
const warn=(condition,message)=>{if(condition)warnings.push(message);};
const exists=file=>fs.existsSync(file);
const read=file=>fs.readFileSync(file,'utf8');

const required=['index.html','app.css','app.js','data/stores.json','data/photo-manifest.json','data/photo-policy.json'];
for(const file of required)check(exists(file),`필수 파일 존재: ${file}`);
const legacy=['app-v7.js','app-v8.js','app-v9.js','styles-v7.css','styles-v8.css','styles-v9.css','fix-v9.css','fix-v9.js'];
for(const file of legacy)check(!exists(file),`구형·중복 실행 파일 제거: ${file}`);

const index=read('index.html');
const css=read('app.css');
const app=read('app.js');
check((index.match(/<link\s+[^>]*rel="stylesheet"/g)||[]).length===1,'스타일시트 진입점 1개');
check((index.match(/<script\s+[^>]*src=/g)||[]).length===1,'자바스크립트 진입점 1개');
check(/href="app\.css\?v=approved-ux-1"/.test(index),'정식 CSS 진입점 app.css');
check(/src="app\.js\?v=approved-ux-1"/.test(index),'정식 JS 진입점 app.js');
check(!/app-v[789]\.js|styles-v[789]\.css|fix-v9/i.test(index),'HTML 구형 실행 참조 없음');
check(/<header class="topbar">[\s\S]*id="locationBtn"[\s\S]*class="brand"[\s\S]*id="noticeBtn"/.test(index),'위치·로고·알림 상단 배치');
check(!/data-open="phone"/.test(index),'메인 전화주문 버튼 제거');
check(!/정보수정요청/.test(index),'메인 정보수정요청 문구 없음');
try{new vm.Script(app,{filename:'app.js'});checks.push('app.js 문법 검사 통과');}catch(error){errors.push(`app.js 문법 오류: ${error.message}`);}
check(app.includes('interval = 3500')&&app.includes('setInterval(() => this.move(1), this.interval)'),'3.5초 자동전환 구현');
check(app.includes("this.track.prepend")&&app.includes("this.track.append")&&app.includes('normalizePosition()'),'무한순환 복제 구조');
check(app.includes("pointerdown")&&app.includes("pointerup")&&app.includes('Math.abs(delta) > 38'),'손가락 이동 구현');
check(app.includes('galleryMarkup(store)')&&app.includes('detailPhotoCarousel'),'가게 상세사진 갤러리 구현');
check(app.includes('feeGuideMarkup(store, selectedRoute')&&app.includes('openCommunityChoice(store'),'동일 상세 팝업 저수수료 안내 구현');
check(app.includes("savedLocation")&&app.includes('saveLocationState'),'위치·주소 저장 구현');
check(app.includes("event.key === 'Escape'")&&app.includes("event.target === $('#modal')")&&app.includes("popstate"),'X·바깥·ESC·뒤로가기 닫기 구현');
check(app.includes("const keys = ['direct', 'mukkebi', 'ddangyo', 'ondongne', 'brand', 'yogiyo', 'coupang', 'baemin']"),'메인카드 상세전용 경로 제외');
check(css.includes('-webkit-line-clamp:2'),'긴 가게명 두 줄 표시');
check(css.includes('.topbar .brand{position:absolute;left:50%'),'상단 로고 정확한 정중앙 CSS');
check(css.includes('.detail-photo-carousel')&&css.includes('.fee-guide-panel'),'상세 갤러리·안내 스타일');
check(css.includes('overflow:auto')&&css.includes('overscroll-behavior:contain'),'팝업 스크롤 작동');
warn(true,'1차 스프라이트 패키지는 원본·좌표 색인 부재로 비활성 유지');

check(index.includes('id="topFavoriteBtn"')&&index.includes('id="topRecentBtn"'),'검색 옆 찜·최근 버튼 복원');
check(app.includes('function openAppBrowser(key')&&app.includes('data-app-store-id'),'앱별 실제 등록 가게 목록 구현');
check(app.includes('function openCommunityChoice(store')&&app.includes('community-guide'),'선택 앱과 지역 주문방법 동일 안내팝업 구현');
check(app.includes('detail-personal-actions')&&app.includes('data-feedback-store'),'상세에만 찜·정보수정 동작 구현');
check(!index.includes('정보 수정 제안'),'메인·푸터 정보수정요청 제거');
check(css.includes('.topbar .brand{position:absolute;left:50%')&&css.includes('.app-browser-card')&&css.includes('.community-guide'),'정중앙 로고·앱목록·지역안내 스타일');

console.log('\n[정적검사 결과]');
for(const item of checks)console.log('PASS ',item);
for(const item of warnings)console.log('WARN ',item);
for(const item of errors)console.log('FAIL ',item);
const report={success:errors.length===0,pass:checks.length,warn:warnings.length,fail:errors.length,checks,warnings,errors};
fs.writeFileSync('static-validation-report.json',JSON.stringify(report,null,2)+'\n');
console.log(`\nPASS ${report.pass} / WARN ${report.warn} / FAIL ${report.fail}`);
if(errors.length)process.exit(1);
