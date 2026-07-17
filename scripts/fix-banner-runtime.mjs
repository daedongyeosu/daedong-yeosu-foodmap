import fs from 'node:fs';

function replaceExact(file,from,to,label){
  const original=fs.readFileSync(file,'utf8');
  if(original.includes(to)){
    console.log(`ALREADY ${label}`);
    return;
  }
  if(!original.includes(from))throw new Error(`Expected text not found: ${label}`);
  fs.writeFileSync(file,original.replace(from,to));
  console.log(`UPDATED ${label}: ${file}`);
}

replaceExact(
  'app.js',
  "const HERO_BANNERS = Array.from({length:17},(_,index)=>{const number=String(index+1).padStart(2,'0');return {desktop:`images/${number}.webp`,mobile:`images/${number}.webp`,fallback:`images/${number}.png`,alt:`대동여수음식지도 배너 ${index+1}`};});",
  "const HERO_BANNERS = Array.from({length:17},(_,index)=>{const number=String(index+1).padStart(2,'0');return {desktop:`images/${number}.png`,mobile:`images/${number}.png`,fallback:`images/${number}.png`,alt:`대동여수음식지도 배너 ${index+1}`};});",
  'use restored PNG hero banners'
);

replaceExact(
  'scripts/browser-smoke.mjs',
  `  const heroInfo=await page.evaluate(()=>({slides:document.querySelectorAll('#heroTrack .carousel-slide').length,dots:document.querySelectorAll('#heroDots button').length,transform:getComputedStyle(document.querySelector('#heroTrack')).transform}));
  check(heroInfo.slides===19&&heroInfo.dots===17,'메인 무한 슬라이드 복제·점 표시',heroInfo);
  await page.locator('#heroCarousel [data-carousel-next]').click();
  await wait(650);
  const heroAfter=await page.locator('#heroTrack').evaluate(element=>getComputedStyle(element).transform);
  check(heroAfter!==heroInfo.transform,'메인 슬라이드 다음 이동',{before:heroInfo.transform,after:heroAfter});
  const promoBefore=await page.locator('#promoTrack').evaluate(element=>getComputedStyle(element).transform);
  await page.locator('#promoCarousel [data-carousel-next]').click();
  await wait(650);
  const promoAfter=await page.locator('#promoTrack').evaluate(element=>getComputedStyle(element).transform);
  check(promoAfter!==promoBefore,'소식 무한 슬라이드 다음 이동');`,
  `  const heroInfo=await page.evaluate(()=>({slides:document.querySelectorAll('#heroTrack .carousel-slide').length,dots:document.querySelectorAll('#heroDots button').length,active:document.querySelector('#heroDots button.active')?.dataset.slide}));
  check(heroInfo.slides===19&&heroInfo.dots===17,'메인 무한 슬라이드 복제·점 표시',heroInfo);
  await page.locator('#heroCarousel [data-carousel-next]').click();
  await page.waitForFunction(before=>document.querySelector('#heroDots button.active')?.dataset.slide!==before,heroInfo.active);
  const heroAfter=await page.locator('#heroDots button.active').getAttribute('data-slide');
  check(heroAfter!==heroInfo.active,'메인 슬라이드 다음 이동',{before:heroInfo.active,after:heroAfter});
  const promoBefore=await page.locator('#promoCarousel .carousel-dots button.active').getAttribute('data-slide');
  await page.locator('#promoCarousel [data-carousel-next]').click();
  await page.waitForFunction(before=>document.querySelector('#promoCarousel .carousel-dots button.active')?.dataset.slide!==before,promoBefore);
  const promoAfter=await page.locator('#promoCarousel .carousel-dots button.active').getAttribute('data-slide');
  check(promoAfter!==promoBefore,'소식 무한 슬라이드 다음 이동',{before:promoBefore,after:promoAfter});`,
  'test carousel logical active index'
);

console.log('Banner runtime fixes applied.');
