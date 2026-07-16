import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const TOKEN = process.env.NOTION_TOKEN;
const DB_PATH = process.env.STORES_PATH || 'data/stores.json';
const REPORT_PATH = process.env.NOTION_IMPORT_REPORT_PATH || 'data/notion-import-missing-report.json';
const API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

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
    throw new Error(`${endpoint} 실패: ${response.status} ${await response.text()}`);
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
  async function walk(parentId, depth = 0) {
    if (depth > 6) return;
    for (const block of await childBlocks(parentId)) {
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
  return lines;
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
  for (const line of lines) {
    for (const link of line.links) {
      const result = classify(link.label, link.url, line.plain);
      if (!result) continue;
      const [key, name] = result;
      if (!routes.has(key)) routes.set(key, {name, url: link.url, enabled: true, source: 'notion'});
    }
  }
  return [...routes.values()];
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

async function main() {
  const stores = JSON.parse(await fs.readFile(DB_PATH, 'utf8'));
  const known = new Set(stores.flatMap(existingKeys));
  const pages = await searchPages();
  const report = {startedAt: new Date().toISOString(), pagesScanned: pages.length, added: [], skipped: [], errors: []};

  for (const page of pages) {
    const title = titleFromPage(page);
    const key = norm(title);
    if (!looksLikeStoreTitle(title) || !key || known.has(key)) continue;
    try {
      const lines = await flattenPage(page.id);
      const routes = extractRoutes(lines);
      const orderKeys = routes.map(route => classify(route.name, route.url)?.[0]).filter(Boolean);
      const hasOrderSignal = orderKeys.some(routeKey => ['direct','brand','mukkebi','ddangyo','yogiyo','coupang','baemin'].includes(routeKey));
      if (!hasOrderSignal) {
        report.skipped.push({title, reason: '주문 링크 없음'});
        continue;
      }
      const searchTerms = [...new Set([title, title.replace(/\s+/g, ''), ...title.split(/\s+/).filter(word => word.length >= 2)])];
      const store = {
        id: makeId(page.id),
        name: title,
        realBusinessName: title,
        shopInShopNames: [],
        district: '여수',
        category: '음식점',
        address: '',
        phone: '',
        naverMap: '',
        image: '',
        routes,
        events: [],
        managed: false,
        sharedManaged: false,
        managementStatus: 'unconfirmed',
        pinPosition: null,
        forceBottom: false,
        searchTerms,
        categories: ['음식점'],
        notionPageId: page.id,
        notionUrl: page.url,
        notionSyncedAt: new Date().toISOString(),
        importedFromNotion: true
      };
      stores.push(store);
      known.add(key);
      report.added.push({title, routes: orderKeys});
      await sleep(120);
    } catch (error) {
      report.errors.push({title, error: error.message});
    }
  }

  await fs.writeFile(DB_PATH, `${JSON.stringify(stores, null, 2)}\n`, 'utf8');
  report.finishedAt = new Date().toISOString();
  report.addedCount = report.added.length;
  report.skippedCount = report.skipped.length;
  report.errorCount = report.errors.length;
  report.totalStores = stores.length;
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`노션 누락 가게 추가 완료: 신규 ${report.addedCount}, 전체 ${report.totalStores}, 오류 ${report.errorCount}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
