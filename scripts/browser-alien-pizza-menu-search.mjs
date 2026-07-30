import fs from 'node:fs';
import {chromium} from 'playwright';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const report = {success: false, checks: [], errors: []};
const browser = await chromium.launch({headless: true});
const context = await browser.newContext({
  viewport: {width: 390, height: 844},
  locale: 'ko-KR'
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
  await page.waitForFunction(() => typeof fxStoreById === 'function' && typeof openStore === 'function');
  await page.evaluate(() => openStore(fxStoreById('a089d1d54720b48e')));
  await page.waitForSelector('#modal:not([hidden]) .store-detail[data-store-id="a089d1d54720b48e"]', {timeout: 5000});
  await page.locator('[data-store-menu-preview="a089d1d54720b48e"]').click();
  await page.waitForSelector('.store-menu-preview', {timeout: 5000});

  const preview = page.locator('.store-menu-preview');
  const scroll = page.locator('.store-menu-scroll');
  const search = page.locator('[data-menu-search]');
  const maxScroll = await scroll.evaluate(node => {
    node.scrollTop = node.scrollHeight - node.clientHeight;
    return node.scrollTop;
  });
  await page.waitForTimeout(600);

  await search.focus();
  await page.waitForFunction(() => document.querySelector('.store-menu-scroll')?.scrollTop === 0);
  await check(preview.evaluate(node => node.classList.contains('menu-search-active')), '검색 포커스 시 전용 검색 모드 진입');
  await check(scroll.evaluate(node => node.scrollTop === 0), '검색 모드 진입 시 결과 시작 위치로 이동');
  await check(page.locator('.store-menu-hero').evaluate(node => getComputedStyle(node).display === 'none'), '검색 중 가게 소개 영역 숨김');
  await check(page.locator('.store-menu-tools nav').evaluate(node => getComputedStyle(node).display === 'none'), '검색 중 카테고리 버튼 숨김');
  await check(page.locator('.store-menu-sticky-actions').evaluate(node => getComputedStyle(node).pointerEvents === 'none'), '검색 중 주문 버튼이 결과를 가리지 않음');

  await search.fill('베지');
  await page.waitForFunction(() => document.querySelector('[data-menu-result-count]')?.textContent === '1');
  await check(page.locator('[data-menu-card]:visible').count().then(count => count === 1), '베지 검색 결과 한 개만 표시');
  await check(page.locator('[data-menu-card]:visible h3').innerText().then(value => value.includes('베지테리언')), '검색 결과 메뉴를 즉시 확인');
  await check(page.locator('[data-menu-card]:visible mark').count().then(count => count > 0), '메뉴명에서 일치 검색어 강조');
  await check(page.locator('[data-menu-card]:visible').boundingBox().then(box => Boolean(box && box.y < 500)), '키보드 위에서도 첫 검색 결과가 보이는 위치에 표시');
  await page.screenshot({path: 'browser-alien-pizza-menu-search.png', fullPage: false});

  await page.locator('[data-menu-search-clear]').click();
  await check(page.locator('[data-menu-result-count]').innerText().then(value => value.trim() === '53'), '검색어 지우기 시 전체 53개 메뉴 복원');
  await check(preview.evaluate(node => node.classList.contains('menu-search-active')), '검색어를 지워도 검색 모드 유지');

  await page.locator('[data-menu-search-cancel]').click();
  await page.waitForFunction(() => !document.querySelector('.store-menu-preview')?.classList.contains('menu-search-active'));
  await page.waitForTimeout(100);
  await check(scroll.evaluate((node, expected) => Math.abs(node.scrollTop - expected) <= 2, maxScroll), '검색 취소 시 이전 메뉴 위치 복귀');
  await check(page.locator('[data-menu-card]:visible').count().then(count => count === 53), '검색 취소 후 전체 메뉴와 기존 분류 상태 복원');
  await check(page.locator('.store-menu-sticky-actions').evaluate(node => getComputedStyle(node).pointerEvents !== 'none'), '검색 취소 후 주문 버튼 복원');

  report.success = report.errors.length === 0;
} catch (error) {
  report.failure = error.stack || String(error);
  await page.screenshot({path: 'browser-alien-pizza-menu-search-failure.png', fullPage: false}).catch(() => {});
} finally {
  fs.writeFileSync('browser-alien-pizza-menu-search-report.json', `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}

if (!report.success) process.exit(1);
