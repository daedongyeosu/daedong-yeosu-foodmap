import fs from 'node:fs';
import {chromium} from 'playwright';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const report = {success: false, checks: [], warnings: [], errors: []};
const browser = await chromium.launch({headless: true});
const context = await browser.newContext({
  viewport: {width: 390, height: 844},
  locale: 'ko-KR',
  geolocation: {latitude: 34.7604, longitude: 127.6622},
  permissions: ['geolocation']
});
await context.route('**/api/events', route => route.fulfill({status: 204, body: ''}));
await context.route('**/*.woff2', route => route.abort());
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));

const check = async (condition, message) => {
  const ok = await condition;
  report.checks.push({message, ok});
  if (!ok) throw new Error(message);
};

try {
  await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('#storeGrid .store-card', {timeout: 15000});
  await check(page.locator('#locationBtn').isVisible(), '위치 버튼 표시');
  await check(page.locator('#homeShareBtn').isVisible(), '공유 버튼 표시');
  await check(page.locator('#heroTrack .carousel-slide').count().then(count => count > 2), '메인 슬라이드 표시');
  await check(page.locator('#storeGrid .store-card').count().then(count => count > 0), '가게 목록 표시');
  await check(page.locator('#startupAd').isHidden(), '첫 접속 모집 팝업 중단');
  await check(page.getByText('가게카드 보기', {exact: true}).count().then(count => count === 0), '가게카드 보기 문구 제거');
  await page.locator('#storeGrid .store-card').first().click();
  await page.waitForSelector('#modal:not([hidden])', {timeout: 5000});
  await check(page.locator('#modalContent').isVisible(), '가게 상세 팝업 작동');
  await page.locator('.modal-close').click();
  await page.locator('#locationBtn').click();
  await page.waitForSelector('#modal:not([hidden])', {timeout: 5000});
  await check(page.locator('#modalContent').isVisible(), '위치 설정 팝업 작동');
  await page.addStyleTag({content: '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'});
  await page.evaluate(() => {
    for (let id = 1; id < 10000; id += 1) {
      clearInterval(id);
      cancelAnimationFrame(id);
    }
  });
  await page.locator('.topbar').screenshot({path: 'browser-mobile.png'});
  report.success = report.errors.length === 0;
} catch (error) {
  report.failure = error.stack || String(error);
  await page.locator('.topbar').screenshot({path: 'browser-mobile-failure.png'}).catch(() => {});
} finally {
  fs.writeFileSync('browser-smoke-report.json', `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}

if (!report.success) process.exit(1);
