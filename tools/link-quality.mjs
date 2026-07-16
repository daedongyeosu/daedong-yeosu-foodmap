import fs from 'node:fs/promises';
import path from 'node:path';

const DB_PATH = process.env.STORES_PATH || 'data/stores.json';
const REPORT_PATH = process.env.LINK_QUALITY_REPORT_PATH || 'data/link-quality-report.json';
const TIMEOUT_MS = 12000;

const APP_KEYS = new Map([
  ['먹깨비', 'mukkebi'],
  ['땡겨요', 'ddangyo'],
  ['배달의민족', 'baemin'],
  ['배민', 'baemin'],
  ['쿠팡이츠', 'coupang'],
  ['쿠팡', 'coupang'],
  ['요기요', 'yogiyo']
]);

const SHORTENER_HOSTS = new Set([
  'bit.ly',
  'www.bit.ly',
  'tinyurl.com',
  'www.tinyurl.com',
  't.co',
  'goo.gl',
  'is.gd',
  'v.gd',
  'cutt.ly',
  'han.gl'
]);

function appKey(name = '') {
  const text = String(name).replace(/\s+/g, '');
  for (const [label, key] of APP_KEYS) if (text.includes(label)) return key;
  return '';
}

function isShortener(urlString) {
  try {
    return SHORTENER_HOSTS.has(new URL(urlString).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function genericHomeReason(key, urlString) {
  let url;
  try { url = new URL(urlString); } catch { return 'invalid-url'; }
  const host = url.hostname.toLowerCase();
  const pathName = url.pathname.replace(/\/+$/, '').toLowerCase();
  const query = url.search.toLowerCase();

  if (host.includes('play.google.com') || host.includes('apps.apple.com')) return 'app-install-page';

  if (key === 'yogiyo') {
    if (/^(www\.)?yogiyo\.co\.kr$/.test(host) && ['', '/', '/mobile'].includes(pathName || '/')) return 'service-home';
    if (host.includes('yogiyo') && !/(restaurant|store|shop|menu|vendor|place|id=|restaurant_id)/.test(`${pathName}${query}`)) return 'service-home-or-unknown';
  }
  if (key === 'baemin') {
    if ((host.includes('baemin') || host.includes('woowahan')) && !/(shop|store|restaurant|menu|id=|shopno|shop_no)/.test(`${pathName}${query}`)) return 'service-home-or-unknown';
  }
  if (key === 'coupang') {
    if (host.includes('coupang') && !/(store|merchant|restaurant|shop|menu|id=)/.test(`${pathName}${query}`)) return 'service-home-or-unknown';
  }
  if (key === 'mukkebi') {
    if (host.includes('mukkebi') && !/(shop|store|merchant|restaurant|data=|id=)/.test(`${pathName}${query}`)) return 'service-home-or-unknown';
  }
  if (key === 'ddangyo') {
    if ((host.includes('ddangyo') || host.includes('shinhan')) && !/(shop|store|merchant|restaurant|id=|storeid)/.test(`${pathName}${query}`)) return 'service-home-or-unknown';
  }
  return '';
}

async function resolveUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {'user-agent': 'Mozilla/5.0 DaedongLinkChecker/1.0'}
    });
    return {finalUrl: response.url || url, status: response.status, ok: response.ok};
  } catch (error) {
    return {finalUrl: url, status: 0, ok: false, error: error.name === 'AbortError' ? 'timeout' : error.message};
  } finally {
    clearTimeout(timer);
  }
}

async function inspectRoute(route) {
  const key = appKey(route?.name);
  if (!key || !route?.url) return null;

  if (isShortener(route.url)) {
    return {
      app: key,
      name: route.name,
      sourceUrl: route.url,
      finalUrl: route.url,
      httpStatus: null,
      quality: 'short-link-skipped',
      reason: 'analytics-protection',
      skipped: true
    };
  }

  const resolved = await resolveUrl(route.url);
  const reason = genericHomeReason(key, resolved.finalUrl);
  let quality = 'direct-or-unknown';
  if (!resolved.ok) quality = 'unreachable';
  else if (reason) quality = 'home-or-install';
  else quality = 'direct-likely';

  return {
    app: key,
    name: route.name,
    sourceUrl: route.url,
    finalUrl: resolved.finalUrl,
    httpStatus: resolved.status,
    quality,
    reason: reason || null
  };
}

async function main() {
  const stores = JSON.parse(await fs.readFile(DB_PATH, 'utf8'));
  const report = {
    generatedAt: new Date().toISOString(),
    rules: {
      'direct-likely': '가게 상세 경로로 보이는 링크',
      'home-or-install': '앱 설치 또는 서비스 메인화면으로 보이는 링크',
      'short-link-skipped': 'Bitly 등 단축주소는 클릭 통계 보호를 위해 접속하지 않음',
      unreachable: '접속 실패 또는 시간 초과'
    },
    totals: {},
    stores: []
  };

  for (const store of stores) {
    const links = [];
    for (const route of store.routes || []) {
      const result = await inspectRoute(route);
      if (result) {
        links.push(result);
        report.totals[result.quality] = (report.totals[result.quality] || 0) + 1;
      }
    }
    if (links.length) report.stores.push({store: store.name, links});
  }

  await fs.mkdir(path.dirname(REPORT_PATH), {recursive: true});
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log('주문링크 품질검사 완료', report.totals);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});