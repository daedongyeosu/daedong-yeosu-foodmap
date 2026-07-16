import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const TOKEN = process.env.NOTION_TOKEN;
const DB_PATH = process.env.STORES_PATH || 'data/stores.json';
const REPORT_PATH = process.env.NOTION_IMPORT_REPORT_PATH || 'data/notion-import-missing-report.json';
const API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const APPLY_CHANGES = /^(1|true|yes)$/i.test(String(process.env.APPLY_CHANGES || 'false'));
const DIAGNOSTIC_KEYWORDS = String(process.env.DIAGNOSTIC_KEYWORDS || '오워래,해인이네,수라상궁,바로탕수,바오탕수')
  .split(',').map(value => value.trim()).filter(Boolean);

if (!TOKEN) throw new Error('NOTION_TOKEN 환경변수가 필요합니다.');

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Notion-Version': NOTION_VERSION,
  'Content-Type': 'application/json'
};
const clean = value => String(value ?? '').trim();
const norm = value => clean(value).toLowerCase()
  .replace(/여수시/g, '')
  .replace(/[()\[\]{}<>·ㆍ,.!?\'"`~@#$%^&*_+=|\\/:;-]/g, '')
  .replace(/\s+/g, '');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function notion(endpoint, options = {}) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${API}${endpoint}`, {
      ...options,
      headers: {...headers, ...(options.headers || {})}
    });
    if (response.ok) return response.json();
    if (response.status === 429 || response.status >= 500) {
      await sleep(700 * (attempt + 1));
      continue;
    }
    const error = new Error(`${endpoint} 실패: ${response.status} ${await response.text()}`);
    error.status = response.status;
    throw error;
  }
  throw new Error(`${endpoint} 재시도 초과`);
}

function titleFromPage(page) {
  for (const value of Object.values(page?.properties || {})) {
    if (value?.type === 'title') {
      return (value.title || []).map(item => item.plain_text || '').join('').trim();
    }
  }
  return '';
}

async function searchPages() {
  const pages = [];
  let cursor;
  do {
    const body = {page_size: 100, filter: {property: 'object', value: 'page'}};
    if (cursor) body.start_cursor = cursor;
    const data = await notion('/search', {method: 'POST', body: JSON.stringify(body)});
    pages.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return pages;
}

async function childBlocks(blockId) {
  const blocks = [];
  let cursor;
  do {
    const params = new URLSearchParams({page_size: '100'});
    if (cursor) params.set('start_cursor', cursor);
    const data = await notion(`/blocks/${blockId}/children?${params}`);
    blocks.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return blocks;
}

async function flattenPage(pageId) {
  const lines = [];
  let blockCount = 0;
  async function walk(parentId, depth = 0) {
    if (depth > 6) return;
    for (const block of await childBlocks(parentId)) {
      blockCount += 1;
      const value = block?.[block.type];
      const richText = Array.isArray(value?.rich_text) ? value.rich_text : [];
      const plain = richText.map(item => item.plain_text || '').join(' ').trim();
      const links = richText.map(item => ({
        label: clean(item.plain_text),
        url: clean(item.href || item.text?.link?.url)
      })).filter(link => link.url);
      if (plain || links.length) lines.push({plain, links});
      if (block.has_children) await walk(block.id, depth + 1);
    }
  }
  await walk(pageId);
  return {lines, blockCount};
}

function classify(label, url, context = '') {
  const hay = `${label} ${context} ${url}`;
  if (/^tel:/i.test(url) || /(전화|통화|tel)/i.test(hay)) return ['phone', '전화'];
  if (/(가게\s*바로|바로\s*주문|자동\s*접수|직접\s*주문)/i.test(hay)) return ['direct', '가게바로주문'];
  if (/먹깨비/i.test(hay)) return ['mukkebi', '먹깨비'];
  if (/땡겨요/i.test(hay)) return ['ddangyo', '땡겨요'];
  if (/요기요|yogiyo/i.test(hay)) return ['yogiyo', '요기요'];
  if (/쿠팡|coupang/i.test(hay)) return ['coupang', '쿠팡이츠'];
  if (/배달의\s*민족|배민|baemin/i.test(hay)) return ['baemin', '배달의민족'];
  if (/네이버|naver\.me|map\.naver/i.test(hay)) return ['naver', '네이버지도'];
  if (/chak|섬섬페이|지역상품권/i.test(hay)) return ['chak', 'CHAK'];
  if (/notion\.so|notion\.site|notion\.com/i.test(url)) return null;
  if (/^https?:\/\//i.test(url)) return ['brand', '브랜드앱'];
  return null;
}

function extractRoutes(lines) {
  const routes = new Map();
  let rawLinkCount = 0;
  for (const line of lines) {
    for (const link of line.links) {
      rawLinkCount += 1;
      const result = classify(link.label, link.url, line.plain);
      if (!result) continue;
      const [key, name] = result;
      if (!routes.has(key)) routes.set(key, {name, url: link.url, enabled: true, source: 'notion'});
    }
  }
  return {routes: [...routes.values()], rawLinkCount};
}

function existingKeys(store) {
  return [store.name, store.realBusinessName, ...(store.shopInShopNames || [])]
    .map(norm).filter(Boolean);
}

function looksLikeStoreTitle(title) {
  const value = clean(title);
  if (!value || value.length < 2) return false;
  if (/^(대동여수음식지도|음식주문운영기사|제목 없음|새 페이지)$/i.test(value)) return false;
  if (/(전화\s*주문$|가게\s*바로\s*주문\s*준비중|자동\s*주문\s*준비중)/i.test(value)) return false;
  return true;
}

function makeId(pageId) {
  return crypto.createHash('sha1').update(pageId).digest('hex').slice(0, 16);
}

function keywordMatches(title) {
  const normalizedTitle = norm(title);
  return DIAGNOSTIC_KEYWORDS.filter(keyword => normalizedTitle.includes(norm(keyword)) || norm(keyword).includes(normalizedTitle));
}

async function main() {
  const stores = JSON.parse(await fs.readFile(DB_PATH, 'utf8'));
  const known = new Set(stores.flatMap(existingKeys));
  const pages = await searchPages();
  const report = {
    startedAt: new Date().toISOString(),
    mode: APPLY_CHANGES ? 'apply' : 'diagnostic-only',
    explanation: '이 보고서에 제목이 전혀 나타나지 않는 페이지는 현재 Notion API 연결이 발견하지 못한 페이지일 가능성이 큽니다.',
    diagnosticKeywords: DIAGNOSTIC_KEYWORDS,
    pagesVisibleToIntegration: pages.length,
    added: [], existing: [], skipped: [], errors: [], pageDiagnostics: [], targetDiagnostics: []
  };

  const visibleTitles = pages.map(page => titleFromPage(page)).filter(Boolean);
  for (const keyword of DIAGNOSTIC_KEYWORDS) {
    const matches = visibleTitles.filter(title => norm(title).includes(norm(keyword)) || norm(keyword).includes(norm(title)));
    report.targetDiagnostics.push({
      keyword,
      visibleToIntegration: matches.length > 0,
      matchedTitles: matches,
      conclusion: matches.length ? 'API 검색에서 발견됨. 아래 pageDiagnostics에서 처리 결과 확인.' : 'API 검색에서 발견되지 않음. 해당 페이지 또는 상위 페이지의 연결 권한을 확인해야 함.'
    });
  }

  for (const page of pages) {
    const title = titleFromPage(page);
    const key = norm(title);
    const diagnostic = {
      title,
      pageId: page.id,
      pageUrl: page.url,
      keywordMatches: keywordMatches(title),
      titleAccepted: false,
      existingInStores: false,
      bodyReadable: false,
      blockCount: 0,
      rawLinkCount: 0,
      routes: [],
      result: '',
      reason: ''
    };

    if (!looksLikeStoreTitle(title) || !key) {
      diagnostic.result = 'excluded';
      diagnostic.reason = '가게 제목 규칙에 맞지 않음';
      if (diagnostic.keywordMatches.length) report.pageDiagnostics.push(diagnostic);
      continue;
    }
    diagnostic.titleAccepted = true;

    if (known.has(key)) {
      diagnostic.existingInStores = true;
      diagnostic.result = 'existing';
      diagnostic.reason = '이미 stores.json에 존재';
      report.existing.push({title, pageId: page.id});
      if (diagnostic.keywordMatches.length) report.pageDiagnostics.push(diagnostic);
      continue;
    }

    try {
      const flattened = await flattenPage(page.id);
      diagnostic.bodyReadable = true;
      diagnostic.blockCount = flattened.blockCount;
      const extracted = extractRoutes(flattened.lines);
      diagnostic.rawLinkCount = extracted.rawLinkCount;
      diagnostic.routes = extracted.routes.map(route => route.name);
      const orderKeys = extracted.routes.map(route => classify(route.name, route.url)?.[0]).filter(Boolean);
      const hasOrderSignal = orderKeys.some(routeKey => ['direct','brand','mukkebi','ddangyo','yogiyo','coupang','baemin'].includes(routeKey));

      if (!hasOrderSignal) {
        diagnostic.result = 'skipped';
        diagnostic.reason = `주문 링크 없음(전체 링크 ${diagnostic.rawLinkCount}개, 분류 경로 ${diagnostic.routes.length}개)`;
        report.skipped.push({title, pageId: page.id, reason: diagnostic.reason, routes: diagnostic.routes});
        report.pageDiagnostics.push(diagnostic);
        continue;
      }

      const searchTerms = [...new Set([title, title.replace(/\s+/g, ''), ...title.split(/\s+/).filter(word => word.length >= 2)])];
      const store = {
        id: makeId(page.id), name: title, realBusinessName: title, shopInShopNames: [],
        district: '여수', category: '음식점', address: '', phone: '', naverMap: '', image: '',
        routes: extracted.routes, events: [], managed: false, sharedManaged: false,
        managementStatus: 'unconfirmed', pinPosition: null, forceBottom: false,
        searchTerms, categories: ['음식점'], notionPageId: page.id, notionUrl: page.url,
        notionSyncedAt: new Date().toISOString(), importedFromNotion: true
      };
      stores.push(store);
      known.add(key);
      diagnostic.result = APPLY_CHANGES ? 'added' : 'would-add';
      diagnostic.reason = `주문 경로 ${orderKeys.length}개 발견`;
      report.added.push({title, pageId: page.id, result: diagnostic.result, routes: orderKeys});
      report.pageDiagnostics.push(diagnostic);
      await sleep(120);
    } catch (error) {
      diagnostic.result = 'error';
      diagnostic.reason = error.message;
      report.errors.push({title, pageId: page.id, status: error.status || null, error: error.message});
      report.pageDiagnostics.push(diagnostic);
    }
  }

  if (APPLY_CHANGES) {
    await fs.writeFile(DB_PATH, `${JSON.stringify(stores, null, 2)}\n`, 'utf8');
  }
  report.finishedAt = new Date().toISOString();
  report.addedCount = report.added.length;
  report.existingCount = report.existing.length;
  report.skippedCount = report.skipped.length;
  report.errorCount = report.errors.length;
  report.totalStoresAfterRun = stores.length;
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`노션 정밀 진단 완료: API 노출 ${pages.length}, ${APPLY_CHANGES ? '신규 추가' : '추가 예정'} ${report.addedCount}, 제외 ${report.skippedCount}, 오류 ${report.errorCount}`);
  for (const target of report.targetDiagnostics) {
    console.log(`[진단] ${target.keyword}: ${target.conclusion} ${target.matchedTitles.join(', ')}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
