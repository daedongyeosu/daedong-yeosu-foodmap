import path from 'node:path';
import {pathToFileURL} from 'node:url';

async function loadChromium() {
  try { return (await import('playwright')).chromium; }
  catch {}
  const moduleRoot = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
  if (!moduleRoot) throw new Error('playwright 패키지를 찾을 수 없습니다.');
  return (await import(pathToFileURL(path.join(moduleRoot, 'playwright', 'index.mjs')).href)).chromium;
}

const chromium = await loadChromium();
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173/';
const storeId = '421ecef35a879687';
const report = {success: false, checks: [], errors: []};
const browser = await chromium.launch({headless: true});
const context = await browser.newContext({
  viewport: {width: 390, height: 844},
  isMobile: true,
  hasTouch: true,
  serviceWorkers: 'block',
  locale: 'ko-KR',
  userAgent: 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36 KAKAOTALK 25.6.0',
});
await context.addInitScript(() => {
  sessionStorage.setItem('daedongMukkebiIslandExpoEventSeenSessionV1', '1');
  sessionStorage.setItem('daedongCommunityIntroPlayedV4', '1');
});

try {
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(`${baseURL}?store=${storeId}`, {waitUntil: 'domcontentloaded'});
  await page.locator(`#modal:not([hidden]) .store-detail[data-store-id="${storeId}"]`).waitFor({timeout: 15000});
  await page.locator('#modal .modal-close').tap();
  await page.waitForFunction(() => document.querySelector('#modal')?.hidden && !new URLSearchParams(location.search).has('store'), null, {timeout: 5000});
  await page.waitForTimeout(7000);
  const dismissal = await page.evaluate(() => ({
    hidden: Boolean(document.querySelector('#modal')?.hidden),
    storeParam: new URLSearchParams(location.search).get('store'),
  }));
  if (!dismissal.hidden || dismissal.storeParam) throw new Error('닫은 가게 팝업이 다시 나타났습니다.');
  report.checks.push('가게 팝업 닫기 뒤 URL 표식 제거 및 7초간 재등장 없음');

  await page.goto(`${baseURL}?hero=${storeId}`, {waitUntil: 'domcontentloaded'});
  await page.locator(`.rc6-campaign-hero[data-rc6-banner-store="${storeId}"]`).first().waitFor({timeout: 15000});
  await page.locator(`#modal:not([hidden]) .store-detail[data-store-id="${storeId}"]`).waitFor({timeout: 15000});
  await page.locator('#modal .modal-close').tap();
  await page.waitForFunction((expectedStoreId) => {
    const params = new URLSearchParams(location.search);
    return document.querySelector('#modal')?.hidden
      && params.get('hero') === expectedStoreId
      && !params.has('store');
  }, storeId, {timeout: 5000});
  await page.waitForTimeout(7000);
  const heroDismissal = await page.evaluate((expectedStoreId) => ({
    hidden: Boolean(document.querySelector('#modal')?.hidden),
    heroParam: new URLSearchParams(location.search).get('hero'),
    storeParam: new URLSearchParams(location.search).get('store'),
    expectedStoreId,
  }), storeId);
  if (!heroDismissal.hidden || heroDismissal.storeParam || heroDismissal.heroParam !== storeId) {
    throw new Error(`전용 QR 팝업을 닫은 뒤 상태가 유지되지 않았습니다: ${JSON.stringify(heroDismissal)}`);
  }
  report.checks.push('전용 QR 가게 팝업 자동 열림 및 닫은 뒤 7초간 재등장 없음');
  await page.waitForFunction(() => !document.documentElement.classList.contains('daedong-fresh-entry-settling'), null, {timeout: 10000});
  await page.waitForTimeout(500);
  const scrollState = await page.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    viewport: window.innerHeight,
    bodyClass: document.body.className,
    rootClass: document.documentElement.className,
    modalHidden: document.querySelector('#modal')?.hidden,
    introHidden: document.querySelector('#communityIntro')?.hidden,
  }));
  await page.evaluate(() => {
    document.body.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, clientX: 180, clientY: 650, pointerId: 9}));
    document.body.dispatchEvent(new PointerEvent('pointermove', {bubbles: true, clientX: 180, clientY: 620, pointerId: 9}));
    document.body.dispatchEvent(new PointerEvent('pointerup', {bubbles: true, clientX: 180, clientY: 620, pointerId: 9}));
  });
  await page.evaluate(() => window.scrollTo({top: 520, left: 0, behavior: 'instant'}));
  await page.waitForTimeout(250);
  const before = await page.evaluate(() => ({
    y: Math.round(window.scrollY),
    active: [...document.querySelectorAll('#heroCarousel .carousel-dots [data-slide]')].findIndex(dot => dot.classList.contains('active')),
  }));
  await page.waitForTimeout(6200);
  const after = await page.evaluate(() => ({
    y: Math.round(window.scrollY),
    active: [...document.querySelectorAll('#heroCarousel .carousel-dots [data-slide]')].findIndex(dot => dot.classList.contains('active')),
  }));
  if (before.active < 0 || after.active < 0 || before.active === after.active) throw new Error('메인배너가 자동으로 다음 장으로 움직이지 않았습니다.');
  if (before.y < 100) throw new Error(`비영점 스크롤 검사를 시작하지 못했습니다: ${JSON.stringify(scrollState)}`);
  if (Math.abs(before.y - after.y) > 1) throw new Error(`배너 회전 중 화면 전체가 움직였습니다: ${before.y} -> ${after.y}`);
  report.checks.push(`메인배너 자동회전 ${before.active + 1}→${after.active + 1}`);
  report.checks.push(`배너 회전 중 화면 스크롤 고정 ${before.y}px`);
  report.success = report.errors.length === 0;
} catch (error) {
  report.errors.push(error.message);
} finally {
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
if (!report.success) process.exitCode = 1;
