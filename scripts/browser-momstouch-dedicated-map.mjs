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
  viewport: {width: 344, height: 844},
  isMobile: true,
  hasTouch: true,
  serviceWorkers: 'block',
  locale: 'ko-KR',
  userAgent: 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36 KAKAOTALK 25.6.0',
});

if (/^https?:\/\/(?:127\.0\.0\.1|localhost)/.test(baseURL)) {
  const store = {
    id: storeId,
    store_id: storeId,
    name: '맘스터치 문수점',
    district: '여서,문수',
    category: '햄버거/샌드위치/토스트/핫도그',
    categories: ['햄버거/샌드위치/토스트/핫도그'],
    image: 'assets/notion-recovery-180/10db3b0db6ebf8c5/01.jpg',
    images: [{card: 'assets/notion-recovery-180/10db3b0db6ebf8c5/01.jpg', detail: 'assets/notion-recovery-180/10db3b0db6ebf8c5/01.jpg'}],
    routes: [
      {name: '먹깨비', key: 'mukkebi', url: 'https://example.com/mukkebi', enabled: true},
      {name: '땡겨요', key: 'ddangyo', url: 'https://example.com/ddangyo', enabled: true},
      {name: '전화주문', key: 'phone', url: 'https://example.com/phone', enabled: true},
    ],
  };
  const json = body => ({status: 200, contentType: 'application/json', body: JSON.stringify(body)});
  await context.route('**/api/catalog', route => route.fulfill(json([store])));
  await context.route('**/api/services', route => route.fulfill(json({programs: [], stores: {}})));
  await context.route(`**/api/store/${storeId}`, route => route.fulfill(json(store)));
}

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
  await page.locator(`.rc6-campaign-hero[data-rc6-banner-store="${storeId}"]`).first().waitFor({timeout: 10000});
  const firstSlide = Number(await page.locator('#heroDots button.active').getAttribute('data-slide'));
  const footerState = await page.locator('.rc6-campaign-hero').first().evaluate(card => ({
    labels: [...card.querySelectorAll('.rc6-hero-order-method b')].map(label => ({
      text: label.textContent.trim(),
      clientWidth: label.clientWidth,
      scrollWidth: label.scrollWidth,
    })),
    dense: card.querySelector('.rc6-hero-order-footer')?.dataset.orderDensity === 'dense',
    copy: (() => {
      const media = card.querySelector('.rc6-store-hero-media')?.getBoundingClientRect();
      const copy = card.querySelector('.rc6-store-hero-copy')?.getBoundingClientRect();
      return media && copy ? {
        topGap: Math.round(copy.top - media.top),
        leftGap: Math.round(copy.left - media.left),
        copyBottomRatio: Number(((copy.bottom - media.top) / media.height).toFixed(2)),
      } : null;
    })(),
  }));
  if (!footerState.dense || footerState.labels.some(label => label.scrollWidth > label.clientWidth)) {
    throw new Error(`344px 화면에서 주문방법 이름이 잘렸습니다: ${JSON.stringify(footerState)}`);
  }
  if (!footerState.labels.some(label => label.text === '전화주문') || !footerState.labels.some(label => label.text === '브랜드앱')) {
    throw new Error(`필수 주문방법 이름이 온전히 표시되지 않았습니다: ${JSON.stringify(footerState.labels)}`);
  }
  if (!footerState.copy || footerState.copy.topGap > 24 || footerState.copy.leftGap > 24 || footerState.copy.copyBottomRatio > 0.48) {
    throw new Error(`가게명·메뉴명이 음식 중앙을 가리지 않고 왼쪽 위에 있어야 합니다: ${JSON.stringify(footerState.copy)}`);
  }
  report.checks.push('344px 휴대전화에서도 전화주문·브랜드앱 이름을 생략 없이 표시');
  report.checks.push('모든 메인배너 공통 가게명·메뉴명을 사진 왼쪽 위에 표시');
  if (process.env.SCREENSHOT_PATH) {
    await page.screenshot({path: process.env.SCREENSHOT_PATH, fullPage: false});
  }
  await page.waitForTimeout(7000);
  const homeState = await page.evaluate(expected => ({
    introHidden: document.querySelector('#communityIntro')?.hidden,
    mukkebiHidden: document.querySelector('#mukkebiSummerEvent')?.hidden,
    heroStoreIds: [...document.querySelectorAll('.rc6-campaign-hero')].map(card => card.dataset.rc6BannerStore),
    heroIndexes: [...document.querySelectorAll('.rc6-campaign-hero')].map(card => Number(card.dataset.heroIndex)),
    heroTitles: [...document.querySelectorAll('.rc6-campaign-hero .rc6-store-hero-copy')].map(copy => copy.textContent.trim()),
    activeSlide: Number(document.querySelector('#heroDots button.active')?.dataset.slide),
    heroParam: new URLSearchParams(location.search).get('hero'),
    expected,
  }), storeId);
  if (!homeState.introHidden || !homeState.mukkebiHidden) throw new Error('상세를 닫은 뒤 일반 팝업이 뒤늦게 나타났습니다.');
  if (homeState.heroParam !== storeId || new Set(homeState.heroIndexes).size !== 14 || homeState.heroStoreIds.some(id => id !== storeId)) {
    throw new Error(`맘스터치 전용 배너가 유지되지 않았습니다: ${JSON.stringify(homeState)}`);
  }
  if (new Set(homeState.heroTitles).size !== 14 || homeState.heroTitles.some(value => !value.startsWith('맘스터치 문수점'))) {
    throw new Error(`맘스터치 메뉴명 14개가 배너에 표시되지 않았습니다: ${JSON.stringify(homeState.heroTitles)}`);
  }
  if (homeState.activeSlide === firstSlide) throw new Error('맘스터치 대표메뉴 배너가 자동으로 이동하지 않았습니다.');
  report.checks.push('상세 닫기 뒤에도 일반 안내 없이 맘스터치 대표메뉴 14장 자동 순환');
  report.success = report.errors.length === 0;
} catch (error) {
  report.errors.push(error.message);
} finally {
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
if (!report.success) process.exitCode = 1;
