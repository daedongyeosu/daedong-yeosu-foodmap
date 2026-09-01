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
const storeId = '10db3b0db6ebf8c5';
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

try {
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(`${baseURL}?store=${storeId}`, {waitUntil: 'domcontentloaded'});
  await page.locator(`#modal:not([hidden]) .store-detail[data-store-id="${storeId}"]`).waitFor({timeout: 15000});
  const entryState = await page.evaluate(() => ({
    introHidden: document.querySelector('#communityIntro')?.hidden,
    mukkebiHidden: document.querySelector('#mukkebiSummerEvent')?.hidden,
    dedicatedEntryStoreId: window.daedongDedicatedEntryStoreId,
  }));
  if (!entryState.introHidden || !entryState.mukkebiHidden || entryState.dedicatedEntryStoreId !== storeId) {
    throw new Error(`가게전용 진입보다 일반 팝업이 앞섰습니다: ${JSON.stringify(entryState)}`);
  }
  report.checks.push('기존 store형 QR에서 맘스터치 상세만 먼저 표시');

  await page.locator('#modal .modal-close').tap();
  await page.waitForFunction(expected => {
    const params = new URLSearchParams(location.search);
    return document.querySelector('#modal')?.hidden && !params.has('store') && params.get('hero') === expected;
  }, storeId, {timeout: 5000});
  await page.locator(`.rc6-campaign-hero[data-rc6-banner-store="${storeId}"]`).waitFor({timeout: 10000});
  await page.waitForTimeout(7000);
  const homeState = await page.evaluate(expected => ({
    introHidden: document.querySelector('#communityIntro')?.hidden,
    mukkebiHidden: document.querySelector('#mukkebiSummerEvent')?.hidden,
    heroStoreIds: [...document.querySelectorAll('.rc6-campaign-hero')].map(card => card.dataset.rc6BannerStore),
    heroParam: new URLSearchParams(location.search).get('hero'),
    expected,
  }), storeId);
  if (!homeState.introHidden || !homeState.mukkebiHidden) throw new Error('상세를 닫은 뒤 일반 팝업이 뒤늦게 나타났습니다.');
  if (homeState.heroParam !== storeId || homeState.heroStoreIds.length !== 1 || homeState.heroStoreIds[0] !== storeId) {
    throw new Error(`맘스터치 전용 배너가 유지되지 않았습니다: ${JSON.stringify(homeState)}`);
  }
  report.checks.push('상세 닫기 뒤에도 일반 안내 없이 맘스터치 전용 배너 유지');
  report.success = report.errors.length === 0;
} catch (error) {
  report.errors.push(error.message);
} finally {
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
if (!report.success) process.exitCode = 1;
