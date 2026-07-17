import fs from 'node:fs';
import {chromium} from 'playwright';

const baseURL=process.env.BASE_URL||'http://127.0.0.1:4173';
const report={startedAt:new Date().toISOString(),checks:[],errors:[]};
const check=(condition,message,details=null)=>{
  if(!condition)throw new Error(details?`${message}: ${JSON.stringify(details)}`:message);
  report.checks.push({message,details});
  console.log('PASS',message,details??'');
};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser;let page;
try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({
    viewport:{width:390,height:844},
    deviceScaleFactor:1,
    locale:'ko-KR',
    permissions:['geolocation'],
    geolocation:{latitude:34.7604,longitude:127.6622}
  });
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

  await page.waitForSelector('#startupAd:not([hidden])',{timeout:5000});
  check(await page.locator('#startupAd').isVisible(),'시작 팝업 표시');
  await page.locator('.startup-close').click();
  await page.waitForFunction(()=>document.querySelector('#startupAd')?.hasAttribute('hidden'));
  check(!(await page.locator('#startupAd').isVisible()),'시작 팝업 닫기');

  const heroInfo=await page.evaluate(()=>({slides:document.querySelectorAll('#heroTrack .carousel-slide').length,dots:document.querySelectorAll('#heroDots button').length,active:document.querySelector('#heroDots button.active')?.dataset.slide}));
  check(heroInfo.slides===19&&heroInfo.dots===17,'메인 무한 슬라이드 복제·점 표시',heroInfo);
  await page.locator('#heroCarousel [data-carousel-next]').click();
  await page.waitForFunction(before=>document.querySelector('#heroDots button.active')?.dataset.slide!==before,heroInfo.active);
  const heroAfter=await page.locator('#heroDots button.active').getAttribute('data-slide');
  check(heroAfter!==heroInfo.active,'메인 슬라이드 다음 이동',{before:heroInfo.active,after:heroAfter});
  const promoBefore=await page.locator('#promoCarousel .carousel-dots button.active').getAttribute('data-slide');
  await page.locator('#promoCarousel [data-carousel-next]').click();
  await page.waitForFunction(before=>document.querySelector('#promoCarousel .carousel-dots button.active')?.dataset.slide!==before,promoBefore);
  const promoAfter=await page.locator('#promoCarousel .carousel-dots button.active').getAttribute('data-slide');
  check(promoAfter!==promoBefore,'소식 무한 슬라이드 다음 이동',{before:promoBefore,after:promoAfter});

  await page.locator('#moreAppsBtn').click();
  check(await page.locator('#moreAppsPopover').isVisible(),'다른 주문앱 팝오버 표시');
  await page.locator('#moreAppsPopover .popover-close').click();
  check(!(await page.locator('#moreAppsPopover').isVisible()),'다른 주문앱 팝오버 닫기');

  const categoryCount=await page.locator('#categoryGrid [data-cat]').count();
  check(categoryCount>0&&categoryCount<=12,'메인 카테고리 표시',{categoryCount});
  const firstCategory=await page.locator('#categoryGrid [data-cat]').first().getAttribute('data-cat');
  await page.locator('#categoryGrid [data-cat]').first().click();
  await page.waitForFunction(category=>document.querySelector('#recommendSection h2')?.textContent?.includes(category),firstCategory);
  check((await page.locator('#storeGrid .store-card').count())>0,'카테고리 필터 결과 표시',{firstCategory});
  await page.locator('#resetCategoryBtn').click();
  await page.waitForFunction(()=>document.querySelector('#recommendSection h2')?.textContent==='오늘의 추천');

  await page.locator('#locationBtn').click();
  await page.waitForSelector('#modal:not([hidden]) #gpsLocationBtn');
  check((await page.locator('#areaResults [data-location]').count())>0,'동네 선택 목록 표시');
  await page.locator('#gpsLocationBtn').click();
  await page.waitForFunction(()=>document.querySelector('#locationText')?.textContent==='현재 위치 기준');
  check(await page.locator('#modal').getAttribute('hidden')!==null,'GPS 위치 선택 후 팝업 닫힘');
  await page.locator('#resetCategoryBtn').click();

  const firstName=await page.locator('#storeGrid .store-card h3').first().innerText();
  await page.locator('#mainSearch').fill(firstName);
  await page.locator('#searchBtn').click();
  await page.waitForFunction(name=>document.querySelector('#recommendSection h2')?.textContent?.includes(name),firstName);
  check((await page.locator('#storeGrid .store-card').count())>=1,'가게명 검색 결과 표시',{firstName});

  const longName=await page.locator('#storeGrid .store-card h3').evaluateAll(elements=>elements.map(element=>({text:element.textContent.trim(),length:element.textContent.trim().length,clamp:getComputedStyle(element).webkitLineClamp})).sort((a,b)=>b.length-a.length)[0]);
  check(longName.clamp==='2','긴 가게명 두 줄 제한 적용',longName);

  await page.locator('#storeGrid .store-card').first().click();
  await page.waitForSelector('#modal:not([hidden]) .detail-route');
  const detailRoutes=await page.locator('#modal .detail-route').count();
  const invalidDetailRoutes=await page.locator('#modal a.detail-route').evaluateAll(links=>links.filter(link=>!/^https?:\/\/|^tel:/i.test(link.href)).map(link=>link.href));
  check(detailRoutes>0,'가게 상세 주문방법 표시',{detailRoutes});
  check(invalidDetailRoutes.length===0,'상세 주문주소 절대경로',invalidDetailRoutes);
  await page.locator('.modal-close').click();
  await page.waitForFunction(()=>document.querySelector('#modal')?.hasAttribute('hidden'));

  await page.evaluate(async()=>{
    for(let y=0;y<document.body.scrollHeight;y+=700){window.scrollTo(0,y);await new Promise(resolve=>setTimeout(resolve,20));}
    window.scrollTo(0,0);
  });
  await wait(500);
  const visiblePhotoState=await page.locator('#storeGrid img[data-photo-kind="card"]').evaluateAll(images=>images.map(image=>({src:image.getAttribute('src'),complete:image.complete,naturalWidth:image.naturalWidth})).filter(item=>item.complete&&item.naturalWidth===0));
  check(visiblePhotoState.length===0,'현재 표시 가게사진 깨짐 없음',visiblePhotoState);

  const dataAudit=await page.evaluate(async()=>{
    const [stores,policy]=await Promise.all([fetch('data/stores.json').then(response=>response.json()),fetch('data/photo-policy.json').then(response=>response.json())]);
    const normalize=value=>String(value??'').trim().toLowerCase().replace(/[\s·&()\-_/.,]/g,'');
    const management=stores.filter(store=>/^대동여수음식지도(?:\s|\(|$)/.test(String(store.name||'').trim())).map(store=>store.name);
    const invalidRoutes=[];const suspiciousPhotos=[];
    for(const store of stores){
      for(const route of store.routes||[])if(!/^(https?:\/\/|tel:)/i.test(String(route.url||'')))invalidRoutes.push([store.name,route.name,route.url]);
      const hay=normalize([store.image,store.name,store.realBusinessName].join(' '));
      if((policy.blockedPathKeywords||[]).some(keyword=>hay.includes(normalize(keyword))))suspiciousPhotos.push([store.name,store.image]);
    }
    return {count:stores.length,uniqueIds:new Set(stores.map(store=>String(store.id))).size,uniqueNames:new Set(stores.map(store=>normalize(store.name))).size,management,invalidRoutes,suspiciousPhotos};
  });
  check(dataAudit.count===471&&dataAudit.uniqueIds===471&&dataAudit.uniqueNames===471,'브라우저 데이터 471개·중복 없음',dataAudit);
  check(dataAudit.management.length===0,'관리용 노션 페이지 차단');
  check(dataAudit.invalidRoutes.length===0,'전체 주문주소 형식 정상');
  check(dataAudit.suspiciousPhotos.length===0,'민감서류·가격표 경로 차단');

  const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(entry=>entry.name));
  const legacyRuntime=resources.filter(url=>/app-v[789]\.js|styles-v[789]\.css|fix-v9/i.test(url));
  check(legacyRuntime.length===0,'구버전 실행 파일 미사용',legacyRuntime);
  check(report.errors.length===0,'브라우저 콘솔·스크립트 오류 없음',report.errors);

  report.finishedAt=new Date().toISOString();report.success=true;
  await page.screenshot({path:'browser-mobile.png',fullPage:true});
  fs.writeFileSync('browser-smoke-report.json',JSON.stringify(report,null,2));
  console.log(`PASS browser smoke tests: ${report.checks.length}`);
}catch(error){
  report.finishedAt=new Date().toISOString();report.success=false;report.failure=error.stack||String(error);
  if(page){try{await page.screenshot({path:'browser-mobile-failure.png',fullPage:true});}catch{}}
  fs.writeFileSync('browser-smoke-report.json',JSON.stringify(report,null,2));
  console.error(error);
  process.exitCode=1;
}finally{if(browser)await browser.close();}
