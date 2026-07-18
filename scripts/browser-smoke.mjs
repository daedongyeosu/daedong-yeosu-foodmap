import fs from 'node:fs';
import {chromium} from 'playwright';

const baseURL=process.env.BASE_URL||'http://127.0.0.1:4173';
const report={startedAt:new Date().toISOString(),checks:[],warnings:[],errors:[]};
const check=(condition,message,details=null)=>{
  if(!condition)throw new Error(details?`${message}: ${JSON.stringify(details)}`:message);
  report.checks.push({message,details});console.log('PASS',message,details??'');
};
const warn=(message,details=null)=>{report.warnings.push({message,details});console.log('WARN',message,details??'');};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const activeSlide=async(page,selector)=>page.locator(`${selector} .carousel-dots button.active`).getAttribute('data-slide');
async function closeStartupByX(page){
  await page.waitForSelector('#startupAd:not([hidden])',{timeout:6000});
  await page.locator('.startup-close').click();
  await page.waitForFunction(()=>document.querySelector('#startupAd')?.hasAttribute('hidden'));
}
async function searchStore(page,name){
  await page.locator('#mainSearch').fill(name);
  await page.locator('#searchBtn').click();
  await page.waitForFunction(value=>document.querySelector('#recommendSection h2')?.textContent?.includes(value),name);
  await page.waitForSelector('#storeGrid .store-card');
}
async function closeModalX(page){
  await page.locator('.modal-close').click();
  await page.waitForFunction(()=>document.querySelector('#modal')?.hasAttribute('hidden'));
}

let browser;let page;
try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,locale:'ko-KR',permissions:['geolocation'],geolocation:{latitude:34.7604,longitude:127.6622}});
  page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(`pageerror: ${error.message}`));
  page.on('console',message=>{if(message.type()==='error')report.errors.push(`console: ${message.text()}`);});
  await page.goto(baseURL,{waitUntil:'networkidle',timeout:120000});
  await page.waitForSelector('#storeGrid .store-card',{timeout:120000});

  check(await page.title()==='대동여수음식지도','문서 제목');
  const initialCards=await page.locator('#storeGrid .store-card').count();
  check(initialCards===40,'첫 화면 가게 40개 표시',{initialCards});
  const layout=await page.evaluate(()=>({innerWidth:window.innerWidth,scrollWidth:document.documentElement.scrollWidth,appWidth:document.querySelector('#app')?.getBoundingClientRect().width}));
  check(layout.scrollWidth<=layout.innerWidth+1,'모바일 가로 넘침 없음',layout);
  const headerLayout=await page.evaluate(()=>{const location=document.querySelector('#locationBtn').getBoundingClientRect(),logo=document.querySelector('.topbar .brand').getBoundingClientRect(),notice=document.querySelector('#noticeBtn').getBoundingClientRect(),header=document.querySelector('.topbar').getBoundingClientRect(),hero=document.querySelector('.hero').getBoundingClientRect();return{locationRight:location.right,logoLeft:logo.left,logoRight:logo.right,noticeLeft:notice.left,gap:Math.round(hero.top-header.bottom)};});
  check(headerLayout.locationRight<=headerLayout.logoRight&&headerLayout.logoLeft<headerLayout.noticeLeft,'위치·로고·알림 상단 배치',headerLayout);
  check(headerLayout.gap<=8,'로고와 메인 배너 상단 여백 정리',headerLayout);

  await page.waitForSelector('#startupAd:not([hidden])',{timeout:6000});
  check(await page.locator('#startupAd').isVisible(),'시작 팝업 표시');
  await closeStartupByX(page);
  check(!(await page.locator('#startupAd').isVisible()),'시작 팝업 X 닫기');
  await page.reload({waitUntil:'networkidle'});await page.waitForSelector('#startupAd:not([hidden])',{timeout:6000});
  await page.locator('#startupAd').click({position:{x:4,y:4}});await page.waitForFunction(()=>document.querySelector('#startupAd')?.hasAttribute('hidden'));
  check(true,'시작 팝업 바깥 터치 닫기');
  await page.reload({waitUntil:'networkidle'});await page.waitForSelector('#startupAd:not([hidden])',{timeout:6000});
  await page.evaluate(()=>history.back());await page.waitForFunction(()=>document.querySelector('#startupAd')?.hasAttribute('hidden'));
  check(true,'시작 팝업 휴대전화 뒤로가기 닫기');
  await page.waitForSelector('#storeGrid .store-card');

  const heroInfo=await page.evaluate(()=>({slides:document.querySelectorAll('#heroTrack .carousel-slide').length,dots:document.querySelectorAll('#heroDots button').length,active:document.querySelector('#heroDots button.active')?.dataset.slide}));
  check(heroInfo.slides===19&&heroInfo.dots===17,'메인 배너 무한순환 복제·점 표시',heroInfo);
  await wait(3800);const heroAuto=await activeSlide(page,'#heroCarousel');
  check(heroAuto!==heroInfo.active,'메인 배너 3.5초 자동전환',{before:heroInfo.active,after:heroAuto});
  const heroBox=await page.locator('#heroCarousel .carousel-shell').boundingBox();
  await page.mouse.move(heroBox.x+heroBox.width*.8,heroBox.y+heroBox.height*.5);await page.mouse.down();await page.mouse.move(heroBox.x+heroBox.width*.2,heroBox.y+heroBox.height*.5,{steps:5});await page.mouse.up();await wait(550);
  const heroSwipe=await activeSlide(page,'#heroCarousel');
  check(heroSwipe!==heroAuto,'메인 배너 손가락 이동',{before:heroAuto,after:heroSwipe});
  const promoInfo=await page.evaluate(()=>({slides:document.querySelectorAll('#promoTrack .carousel-slide').length,dots:document.querySelectorAll('#promoCarousel .carousel-dots button').length,active:document.querySelector('#promoCarousel .carousel-dots button.active')?.dataset.slide}));
  check(promoInfo.slides===7&&promoInfo.dots===5,'소식 슬라이드 무한순환',promoInfo);

  await page.locator('#moreAppsBtn').click();
  check(await page.locator('#moreAppsPopover').isVisible(),'다른 주문앱 팝오버 표시');
  await page.locator('[data-global-external="yogiyo"]').click();await page.waitForSelector('#modal:not([hidden]) .global-fee-guide');
  check((await page.locator('.global-fee-guide').getAttribute('data-selected-app'))==='yogiyo','선택 앱과 저수수료 안내 같은 팝업');
  check(await page.locator('.global-fee-guide .selected-app-continue').isVisible(),'원래 선택 앱 계속하기 표시');
  await closeModalX(page);

  const categoryCount=await page.locator('#categoryGrid [data-cat]').count();
  check(categoryCount>0&&categoryCount<=12,'메인 음식 카테고리 표시',{categoryCount});
  await page.locator('#allCategoryBtn').click();await page.waitForSelector('#modal:not([hidden]) .all-category-list');
  const allCategoryCount=await page.locator('.all-category-list [data-modal-cat]').count();
  const dataCategoryCount=await page.evaluate(async()=>new Set((await fetch('data/stores.json').then(r=>r.json())).map(s=>s.category||s.cat).filter(Boolean)).size);
  check(allCategoryCount===dataCategoryCount,'전체 음식 카테고리 모두 표시',{allCategoryCount,dataCategoryCount});
  await closeModalX(page);

  await page.locator('#locationBtn').click();await page.waitForSelector('#modal:not([hidden]) #gpsLocationBtn');
  check((await page.locator('#modal input[aria-label="지역 주소 검색"]').count())===1,'주소 입력창 중복 제거');
  check((await page.locator('#areaResults [data-location]').count())>0,'동네 선택 목록 표시');
  await page.locator('#gpsLocationBtn').click();
  await page.waitForFunction(()=>document.querySelector('#locationText')?.textContent==='현재 위치 기준');
  const savedLocation=await page.evaluate(()=>JSON.parse(localStorage.getItem('savedLocation')||'null'));
  check(savedLocation?.label==='현재 위치 기준'&&savedLocation?.sortByDistance===true&&Number.isFinite(savedLocation?.coords?.lat),'위치 권한 결과·주소 저장',savedLocation);
  check(await page.locator('#modal').getAttribute('hidden')!==null,'GPS 선택 후 팝업 닫기');
  const firstCategory=await page.locator('#categoryGrid [data-cat]').first().getAttribute('data-cat');
  await page.locator('#categoryGrid [data-cat]').first().click();
  await page.waitForFunction(category=>document.querySelector('#recommendSection h2')?.textContent?.includes(category)&&document.querySelector('#recommendSection h2')?.textContent?.includes('가까운'),firstCategory);
  check((await page.locator('#storeGrid .distance-note').count())>0,'카테고리별 가까운 가게 추천',{firstCategory});
  await page.locator('#resetCategoryBtn').click();

  const auditTargets=await page.evaluate(async()=>{
    const stores=await fetch('data/stores.json').then(r=>r.json());
    const routeKey=name=>{const text=String(name||'').replace(/\s/g,'');if(text.includes('요기요'))return'yogiyo';if(text.includes('쿠팡'))return'coupang';if(text.includes('배달의민족')||text==='배민')return'baemin';if(text.includes('가게바로'))return'direct';if(text.includes('먹깨비'))return'mukkebi';if(text.includes('땡겨요'))return'ddangyo';if(text.includes('온동네'))return'ondongne';if(text.includes('브랜드앱'))return'brand';if(text.includes('전화'))return'phone';if(text.toLowerCase().includes('chak')||text.includes('지역상품권'))return'chak';return'other';};
    const images=s=>[s.image,s.img,...(Array.isArray(s.images)?s.images.map(v=>typeof v==='string'?v:(v.detail||v.card||v.src)):[])].filter(Boolean);
    const detail=stores.find(s=>images(s).length>1&&(s.routes||[]).some(r=>['yogiyo','coupang','baemin'].includes(routeKey(r.name)))&&(s.routes||[]).some(r=>['direct','mukkebi','ddangyo','ondongne','brand'].includes(routeKey(r.name)))&&(s.routes||[]).some(r=>['phone','chak'].includes(routeKey(r.name))));
    const naver=stores.find(s=>s.naverMap);
    const noPhoto=stores.find(s=>!String(s.image||s.img||'').trim()&&!(Array.isArray(s.images)&&s.images.length));
    return{detail:detail?.name,naver:naver?.name,noPhoto:noPhoto?.name};
  });
  check(Boolean(auditTargets.detail&&auditTargets.naver&&auditTargets.noPhoto),'브라우저 검증 대상 가게 확보',auditTargets);

  await searchStore(page,auditTargets.detail);
  const mainCardText=await page.locator('#storeGrid .store-card').first().innerText();
  const mainDetailLinks=await page.locator('#storeGrid a[href^="tel:"],#storeGrid a[href*="naver"],#storeGrid [data-detail-only]').count();
  check(!/정보수정요청|네이버지도|전화주문|지역상품권/.test(mainCardText)&&mainDetailLinks===0,'메인 가게카드 상세전용 정보 제거',{mainCardText,mainDetailLinks});
  const longName=await page.locator('#storeGrid .store-card h3').evaluate(element=>({text:element.textContent.trim(),clamp:getComputedStyle(element).webkitLineClamp}));
  check(longName.clamp==='2','긴 가게명 두 줄 표시',longName);
  await page.locator('#storeGrid .store-card').first().click();await page.waitForSelector('#modal:not([hidden]) .detail-route');
  check((await page.locator('#detailPhotoCarousel').count())===1,'가게 상세 다중사진 슬라이드 표시');
  const galleryInfo=await page.evaluate(()=>{const root=document.querySelector('#detailPhotoCarousel');return{original:Number(root?.dataset.originalCount||0),slides:root?.querySelectorAll('.carousel-slide').length||0,dots:root?.querySelectorAll('.carousel-dots button').length||0,active:root?.querySelector('.carousel-dots button.active')?.dataset.slide};});
  check(galleryInfo.original>1&&galleryInfo.slides===galleryInfo.original+2&&galleryInfo.dots===galleryInfo.original,'상세사진 무한순환 복제',galleryInfo);
  await wait(3800);const detailAuto=await activeSlide(page,'#detailPhotoCarousel');
  check(detailAuto!==galleryInfo.active,'상세사진 3.5초 자동전환',{before:galleryInfo.active,after:detailAuto});
  const detailBox=await page.locator('#detailPhotoCarousel .carousel-shell').boundingBox();
  await page.mouse.move(detailBox.x+detailBox.width*.8,detailBox.y+detailBox.height*.5);await page.mouse.down();await page.mouse.move(detailBox.x+detailBox.width*.2,detailBox.y+detailBox.height*.5,{steps:5});await page.mouse.up();await wait(550);
  check((await activeSlide(page,'#detailPhotoCarousel'))!==detailAuto,'상세사진 손가락 이동');
  const detailText=await page.locator('#modalContent').innerText();
  check(/전화주문|지역상품권/.test(detailText),'전화·지역상품권 상세 팝업 표시',detailText.slice(0,260));
  await page.locator('.store-other-toggle').click();await page.waitForSelector('.store-other-popover:not([hidden]) [data-external-route]');
  const selectedExternal=await page.locator('.store-other-popover [data-external-route]').first().innerText();
  await page.locator('.store-other-popover [data-external-route]').first().click();await page.waitForSelector('#feeGuidePanel');
  check((await page.locator('#modal:not([hidden])').count())===1&&await page.locator('#feeGuidePanel').isVisible(),'배달 3사 안내를 같은 상세 팝업에 표시',{selectedExternal});
  check((await page.locator('#feeGuidePanel .low-fee-route').count())>0,'저수수료 주문경로 함께 표시');
  check((await page.locator('#feeGuidePanel .selected-app-continue').innerText()).includes(selectedExternal.trim()),'원래 선택 앱 함께 표시');
  await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('#modal')?.hasAttribute('hidden'));
  check(true,'상세 팝업 ESC 닫기');

  await page.locator('#storeGrid .store-card').first().click();await page.waitForSelector('#modal:not([hidden])');
  await page.locator('#overlay').click({position:{x:6,y:6}});await page.waitForFunction(()=>document.querySelector('#modal')?.hasAttribute('hidden'));
  check(true,'상세 팝업 바깥 터치 닫기');
  await page.locator('#storeGrid .store-card').first().click();await page.waitForSelector('#modal:not([hidden])');
  await page.evaluate(()=>history.back());await page.waitForFunction(()=>document.querySelector('#modal')?.hasAttribute('hidden'));
  check(true,'상세 팝업 휴대전화 뒤로가기 닫기');

  await searchStore(page,auditTargets.naver);await page.locator('#storeGrid .store-card').first().click();await page.waitForSelector('#modal:not([hidden])');
  check(await page.locator('#modal a[data-detail-only="naver"]').isVisible(),'네이버지도 상세 팝업에서만 표시');
  await closeModalX(page);

  await searchStore(page,auditTargets.noPhoto);
  check(await page.locator('#storeGrid .photo-placeholder-card').isVisible(),'사진 없는 가게 중립 준비 중 이미지');
  check((await page.locator('#storeGrid .photo-placeholder-card').innerText()).includes('검수된 음식 사진 준비 중'),'사진 준비 중 문구');

  await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=650){window.scrollTo(0,y);await new Promise(resolve=>setTimeout(resolve,15));}window.scrollTo(0,0);});
  check((await page.evaluate(()=>document.scrollingElement.scrollHeight))>844,'페이지 스크롤 작동');

  const dataAudit=await page.evaluate(async()=>{
    const [stores,manifest,policy]=await Promise.all([fetch('data/stores.json').then(r=>r.json()),fetch('data/photo-manifest.json').then(r=>r.json()),fetch('data/photo-policy.json').then(r=>r.json())]);
    const normalize=value=>String(value??'').trim().toLowerCase().replace(/[\s·&()\-_/.,]/g,'');
    const hasPhoto=store=>Boolean(String(store.image||store.img||'').trim()||(Array.isArray(store.images)&&store.images.length));
    const invalidRoutes=[];const suspiciousPhotos=[];
    for(const store of stores){for(const route of store.routes||[])if(!/^(https?:\/\/|tel:)/i.test(String(route.url||'')))invalidRoutes.push([store.name,route.name,route.url]);const hay=normalize([store.image,store.name,store.realBusinessName].join(' '));if((policy.blockedPathKeywords||[]).some(keyword=>hay.includes(normalize(keyword))))suspiciousPhotos.push([store.name,store.image]);}
    const withPhoto=stores.filter(hasPhoto).length;const first=(manifest.packages||[]).find(item=>item.id==='photo-batch-1-final');const second=(manifest.packages||[]).find(item=>item.id==='photo-batch-2');
    return{count:stores.length,uniqueIds:new Set(stores.map(s=>String(s.id))).size,uniqueNames:new Set(stores.map(s=>normalize(s.name))).size,withPhoto,awaiting:stores.length-withPhoto,coverage:manifest.coverage,first,second,invalidRoutes,suspiciousPhotos};
  });
  check(dataAudit.count===471&&dataAudit.uniqueIds===471&&dataAudit.uniqueNames===471,'브라우저 데이터 471개·중복 없음',dataAudit);
  check(dataAudit.withPhoto===386&&dataAudit.awaiting===85&&dataAudit.coverage.storesWithPhoto===386&&dataAudit.coverage.storesAwaitingPhoto===85,'사진 보유 386·준비 중 85 유지');
  check(dataAudit.second.runtimeEnabled===true&&dataAudit.second.revalidatedApprovedImages===9&&dataAudit.second.appliedStores===14,'검증 완료 2차 사진 9장·14곳 유지');
  check(dataAudit.first.runtimeEnabled===false&&JSON.stringify(dataAudit.first.missingPartNumbers)==='[18,19,20,21,22]','1차 스프라이트 비활성 유지');
  check(dataAudit.invalidRoutes.length===0,'전체 주문주소 형식 정상');
  check(dataAudit.suspiciousPhotos.length===0,'민감서류·가격표·영수증·개인정보·비음식 경로 차단');

  const legacyStatus=await page.evaluate(async()=>{const files=['app-v7.js','app-v8.js','app-v9.js','styles-v7.css','styles-v8.css','styles-v9.css','fix-v9.css','fix-v9.js'];return Object.fromEntries(await Promise.all(files.map(async file=>[file,(await fetch(file,{cache:'no-store'})).status])));});
  check(Object.values(legacyStatus).every(status=>status===404),'구형·중복 파일 실제 제거',legacyStatus);
  const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(entry=>entry.name));
  check(resources.filter(url=>/app-v[789]\.js|styles-v[789]\.css|fix-v9/i.test(url)).length===0,'구버전 런타임 자원 미사용');
  const brokenVisible=await page.locator('img:visible').evaluateAll(images=>images.map(image=>({src:image.getAttribute('src'),complete:image.complete,naturalWidth:image.naturalWidth})).filter(item=>item.complete&&item.naturalWidth===0));
  check(brokenVisible.length===0,'현재 표시 이미지 깨짐 없음',brokenVisible);
  check(report.errors.length===0,'브라우저 콘솔·스크립트 오류 없음',report.errors);

  warn('1차 원본 사진 부재는 기능 통합 실패로 처리하지 않음',{awaiting:85});
  report.finishedAt=new Date().toISOString();report.success=true;
  await page.screenshot({path:'browser-mobile.png',fullPage:true});
  fs.writeFileSync('browser-smoke-report.json',JSON.stringify(report,null,2)+'\n');
  console.log(`PASS browser smoke tests: ${report.checks.length} / WARN ${report.warnings.length}`);
}catch(error){
  report.finishedAt=new Date().toISOString();report.success=false;report.failure=error.stack||String(error);
  if(page){try{await page.screenshot({path:'browser-mobile-failure.png',fullPage:true});}catch{}}
  fs.writeFileSync('browser-smoke-report.json',JSON.stringify(report,null,2)+'\n');
  console.error(error);process.exitCode=1;
}finally{if(browser)await browser.close();}
