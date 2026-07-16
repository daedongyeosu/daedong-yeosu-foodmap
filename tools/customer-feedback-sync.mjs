import fs from 'node:fs/promises';

const TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.FEEDBACK_DATABASE_ID || '8ae3728176e344fdaee3475a97d03740';
const STORES_PATH = process.env.STORES_PATH || 'data/stores.json';
const REPORT_PATH = process.env.FEEDBACK_REPORT_PATH || 'data/customer-feedback-report.json';
const API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

if (!TOKEN) {
  console.error('NOTION_TOKEN 환경변수가 필요합니다.');
  process.exit(1);
}

const headers = {Authorization: `Bearer ${TOKEN}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json'};
const clean = value => String(value ?? '').trim();
const norm = value => clean(value).toLowerCase().replace(/여수시|여수/g, '').replace(/[()（）\[\]{}<>·ㆍ,.!?\'"`~@#$%^&*_+=|\\/:;\-–—]/g, '').replace(/\s+/g, '');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function notion(endpoint, options = {}) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${API}${endpoint}`, {...options, headers: {...headers, ...(options.headers || {})}});
    if (response.ok) return response.json();
    if (response.status === 429 || response.status >= 500) {
      await sleep(800 * (attempt + 1));
      continue;
    }
    throw new Error(`${endpoint} 실패: ${response.status} ${await response.text()}`);
  }
  throw new Error(`${endpoint} 재시도 초과`);
}

async function queryOpenRequests() {
  const results = [];
  let cursor;
  do {
    const body = {page_size: 100, filter: {property: '상태', status: {does_not_equal: '완료'}}};
    if (cursor) body.start_cursor = cursor;
    const data = await notion(`/databases/${DATABASE_ID}/query`, {method: 'POST', body: JSON.stringify(body)});
    results.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return results;
}

function plain(property) {
  if (!property) return '';
  if (property.type === 'title') return (property.title || []).map(item => item.plain_text || '').join('').trim();
  if (property.type === 'rich_text') return (property.rich_text || []).map(item => item.plain_text || '').join('').trim();
  if (property.type === 'select') return property.select?.name || '';
  if (property.type === 'status') return property.status?.name || '';
  if (property.type === 'url') return property.url || '';
  return '';
}

function requestFromPage(page) {
  const p = page.properties || {};
  return {
    pageId: page.id,
    title: plain(p['요청 제목']),
    storeId: plain(p['가게 ID']),
    storeName: plain(p['가게명']),
    issueType: plain(p['요청 유형']),
    app: plain(p['주문앱']) || '해당 없음',
    details: plain(p['상세 내용']),
    reporterKey: plain(p['신고자 식별키']) || page.id,
    pageUrl: plain(p['페이지 URL'])
  };
}

function appKey(label) {
  const value = norm(label);
  if (value.includes('먹깨비')) return 'mukkebi';
  if (value.includes('땡겨요')) return 'ddangyo';
  if (value.includes('온동네')) return 'ondongne';
  if (value.includes('배달의민족') || value.includes('배민')) return 'baemin';
  if (value.includes('쿠팡')) return 'coupang';
  if (value.includes('요기요')) return 'yogiyo';
  if (value.includes('가게바로')) return 'direct';
  if (value.includes('전화')) return 'phone';
  return '';
}

function routeKey(name = '') {
  return appKey(name) || (norm(name).includes('브랜드앱') ? 'brand' : '');
}

function routeUrl(store, key) {
  if (key === 'phone') return store.phone ? `tel:${store.phone}` : '';
  const route = (store.routes || []).find(item => item && item.enabled !== false && item.url && routeKey(item.name) === key);
  return route?.url || '';
}

function findStore(stores, request) {
  if (request.storeId) {
    const exact = stores.find(store => String(store.id) === String(request.storeId));
    if (exact) return exact;
  }
  const key = norm(request.storeName);
  if (!key) return null;
  return stores.find(store => [store.name, store.realBusinessName, ...(store.shopInShopNames || [])].some(name => norm(name) === key)) ||
    stores.find(store => [store.name, store.realBusinessName, ...(store.shopInShopNames || [])].some(name => norm(name).includes(key) || key.includes(norm(name))));
}

const SHORT_HOSTS = new Set(['bit.ly','me2.do','naver.me','lrl.kr','han.gl','url.kr']);
async function hardLinkFailure(url) {
  if (!url || /^tel:/i.test(url)) return !url;
  let parsed;
  try { parsed = new URL(url); } catch { return true; }
  if (SHORT_HOSTS.has(parsed.hostname.toLowerCase())) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {method: 'GET', redirect: 'follow', signal: controller.signal, headers: {'User-Agent':'DaedongFeedbackVerifier/1.0','Range':'bytes=0-2048'}});
    return [404, 410].includes(response.status) || response.status >= 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function updateRequest(pageId, {status, result, action}) {
  await notion(`/pages/${pageId}`, {method: 'PATCH', body: JSON.stringify({properties: {
    '상태': {status: {name: status}},
    '자동 검증 결과': {select: {name: result}},
    '자동 조치': {select: {name: action}},
    '최종 확인 시각': {date: {start: new Date().toISOString()}}
  }})});
}

async function main() {
  const stores = JSON.parse(await fs.readFile(STORES_PATH, 'utf8'));
  const pages = await queryOpenRequests();
  const requests = pages.map(requestFromPage);
  const corroboration = new Map();
  for (const request of requests) {
    if (request.issueType !== '주문앱에서 가게 없음') continue;
    const key = `${request.storeId || norm(request.storeName)}|${appKey(request.app)}`;
    if (!corroboration.has(key)) corroboration.set(key, new Set());
    corroboration.get(key).add(request.reporterKey);
  }

  const report = {startedAt: new Date().toISOString(), requestCount: requests.length, suspendedRoutes: [], adminAlerts: [], normalChecks: [], unmatched: []};
  let changed = false;

  for (const request of requests) {
    const store = findStore(stores, request);
    if (!store) {
      report.unmatched.push(request);
      await updateRequest(request.pageId, {status: '진행 중', result: '오류 가능', action: '관리자 확인 필요'});
      continue;
    }

    if (request.issueType === '주문앱에서 가게 없음') {
      const key = appKey(request.app);
      const url = routeUrl(store, key);
      const groupKey = `${request.storeId || norm(request.storeName)}|${key}`;
      const independentReports = corroboration.get(groupKey)?.size || 0;
      const hardFailure = await hardLinkFailure(url);
      if (key && (!url || hardFailure || independentReports >= 2)) {
        store.suspendedRoutes = [...new Set([...(store.suspendedRoutes || []), key])];
        store.feedbackStatus = `${request.app} 주문경로 검증 보류`;
        changed = true;
        report.suspendedRoutes.push({storeId: store.id, storeName: store.name, app: request.app, key, reason: !url ? '등록 링크 없음' : hardFailure ? '링크 오류 확인' : `서로 다른 고객 ${independentReports}명 신고`});
        await updateRequest(request.pageId, {status: '완료', result: '오류 확인', action: '해당 주문경로 보류'});
      } else {
        report.adminAlerts.push({storeId: store.id, storeName: store.name, type: request.issueType, app: request.app, details: request.details, reason: '웹 링크만으로 앱 내 가게 존재 여부를 확정할 수 없음'});
        await updateRequest(request.pageId, {status: '진행 중', result: '오류 가능', action: '관리자 확인 필요'});
      }
      continue;
    }

    if (request.issueType === '전화번호 오류' || request.issueType === '사진 오류' || request.issueType === '주소·위치 오류' || request.issueType === '폐업·휴업 의심') {
      report.adminAlerts.push({storeId: store.id, storeName: store.name, type: request.issueType, app: request.app, details: request.details});
      store.feedbackStatus = `${request.issueType} 확인 필요`;
      changed = true;
      await updateRequest(request.pageId, {status: '진행 중', result: '오류 가능', action: '관리자 확인 필요'});
      continue;
    }

    report.normalChecks.push({storeId: store.id, storeName: store.name, type: request.issueType});
    await updateRequest(request.pageId, {status: '진행 중', result: '대기', action: '관리자 확인 필요'});
  }

  report.finishedAt = new Date().toISOString();
  report.needsAdminCount = report.adminAlerts.length + report.unmatched.length;
  if (changed) await fs.writeFile(STORES_PATH, `${JSON.stringify(stores, null, 2)}\n`, 'utf8');
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({requests: requests.length, suspendedRoutes: report.suspendedRoutes.length, needsAdmin: report.needsAdminCount, changed}, null, 2));
}

main().catch(error => { console.error(error); process.exit(1); });
