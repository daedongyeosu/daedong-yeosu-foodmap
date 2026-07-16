import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const TOKEN = process.env.NOTION_TOKEN;
const DB_PATH = process.env.STORES_PATH || 'data/stores.json';
const REPORT_PATH = 'data/notion-complete-import-report.json';
const API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

if (!TOKEN) throw new Error('NOTION_TOKEN 환경변수가 필요합니다.');

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Notion-Version': NOTION_VERSION,
  'Content-Type': 'application/json'
};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const clean = value => String(value ?? '').trim();
const normalizeId = value => clean(value).replace(/-/g, '').toLowerCase();
const normalizeName = value => clean(value)
  .toLowerCase()
  .replace(/여수시/g, '')
  .replace(/[()\[\]{}<>·ㆍ,.!?\'"`~@#$%^&*_+=|\\/:;-]/g, '')
  .replace(/\s+/g, '');

async function notion(endpoint, options = {}) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await fetch(`${API}${endpoint}`, {
      ...options,
      headers: {...headers, ...(options.headers || {})}
    });
    if (response.ok) return response.json();
    const body = await response.text();
    if (response.status === 429 || response.status >= 500) {
      const retryAfter = Number(response.headers.get('retry-after') || 0);
      await sleep(Math.max(retryAfter * 1000, 1000 * (attempt + 1)));
      continue;
    }
    throw new Error(`${endpoint} 실패: ${response.status} ${body}`);
  }
  throw new Error(`${endpoint} 재시도 초과`);
}

async function searchAllPages() {
  const pages = [];
  let cursor;
  do {
    const body = {
      page_size: 100,
      filter: {property: 'object', value: 'page'},
      sort: {direction: 'descending', timestamp: 'last_edited_time'}
    };
    if (cursor) body.start_cursor = cursor;
    const data = await notion('/search', {method: 'POST', body: JSON.stringify(body)});
    pages.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
    await sleep(180);
  } while (cursor);
  return pages;
}

async function childBlocks(blockId) {
  const blocks = [];
  let cursor;
  do {
    const query = new URLSearchParams({page_size: '100'});
    if (cursor) query.set('start_cursor', cursor);
    const data = await notion(`/blocks/${blockId}/children?${query}`);
    blocks.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return blocks;
}

function pageTitle(page) {
  for (const property of Object.values(page?.properties || {})) {
    if (property?.type === 'title') {
      return (property.title || []).map(item => item.plain_text || '').join('').trim();
    }
  }
  return '';
}

function richTextOf(block) {
  const value = block?.[block?.type];
  return Array.isArray(value?.rich_text) ? value.rich_text : [];
}

async function flattenPage(pageId) {
  const lines = [];
  async function walk(parentId, depth = 0) {
    if (depth > 7) return;
    const blocks = await childBlocks(parentId);
    for (const block of blocks) {
      const richText = richTextOf(block);
      const plain = richText.map(item => item.plain_text || '').join(' ').trim();
      const links = richText
        .map(item => ({label: clean(item.plain_text), url: clean(item.href || item.text?.link?.url)}))
        .filter(item => item.url);
      if (plain || links.length) lines.push({plain, links});
      if (block.has_children && block.type !== 'child_page' && block.type !== 'child_database') {
        await walk(block.id, depth + 1);
      }
    }
  }
  await walk(pageId);
  return lines;
}

const routePatterns = [
  ['direct', /(가게\s*바로|바로\s*주문|자동\s*접수|직접\s*주문)/i, '가게바로주문'],
  ['mukkebi', /먹깨비/i, '먹깨비'],
  ['ddangyo', /땡겨요/i, '땡겨요'],
  ['yogiyo', /요기요/i, '요기요'],
  ['coupang', /(쿠팡|coupang)/i, '쿠팡이츠'],
  ['baemin', /(배달의\s*민족|배민)/i, '배달의민족'],
  ['chak', /(chak|섬섬페이|지역상품권)/i, 'CHAK'],
  ['naverMap', /(네이버\s*지도|가게\s*위치|사진\s*리뷰)/i, '네이버지도'],
  ['phone', /(전화|통화|tel)/i, '전화']
];

function classifyLink(label, url, context = '') {
  if (!url) return null;
  if (/^tel:/i.test(url)) return {key: 'phone', name: '전화'};
  const haystack = `${label} ${context} ${url}`;
  for (const [key, pattern, name] of routePatterns) {
    if (pattern.test(haystack)) return {key, name};
  }
  return null;
}

function extractRoutes(lines) {
  const routes = new Map();
  for (const line of lines) {
    for (const link of line.links) {
      const classified = classifyLink(link.label, link.url, line.plain);
      if (!classified || routes.has(classified.key)) continue;
      routes.set(classified.key, {
        name: classified.name,
        url: link.url,
        enabled: true,
        source: 'notion'
      });
    }
  }
  return [...routes.values()];
}

function inferDistrict(text) {
  const matches = clean(text).match(/[가-힣0-9]+(?:동|면|읍)/g) || [];
  const excluded = new Set(['봉사동', '운동']);
  return matches.find(item => !excluded.has(item)) || '';
}

function inferCategory(text) {
  const rules = [
    [/치킨|닭강정|통닭/, '치킨'], [/피자/, '피자'], [/버거|햄버거/, '버거'],
    [/돈까스|돈가스/, '돈까스'], [/마라|중화|짜장|짬뽕|탕수/, '중식'],
    [/카페|커피|디저트|빙수|베이커리/, '카페/디저트'], [/회|횟집|해산물|수산/, '회/해산물'],
    [/족발|보쌈/, '족발/보쌈'], [/국밥|한식|백반|집밥|찌개|갈비탕|곰탕/, '한식'],
    [/분식|떡볶이|김밥/, '분식'], [/고기|구이|삼겹|갈비/, '고기/구이'],
    [/면|냉면|국수/, '면요리']
  ];
  for (const [pattern, category] of rules) if (pattern.test(text)) return category;
  return '기타';
}

function stableId(pageId) {
  return crypto.createHash('sha256').update(normalizeId(pageId)).digest('hex').slice(0, 16);
}

const stores = JSON.parse(await fs.readFile(DB_PATH, 'utf8'));
const existingPageIds = new Set(stores.map(store => normalizeId(store.notionPageId)).filter(Boolean));
const existingNames = new Set(stores.flatMap(store => [store.name, store.realBusinessName, ...(store.shopInShopNames || [])]).map(normalizeName).filter(Boolean));
const pages = await searchAllPages();

const report = {
  startedAt: new Date().toISOString(),
  accessiblePages: pages.length,
  inspected: 0,
  added: [],
  alreadyPresent: [],
  excluded: [],
  errors: []
};

for (const page of pages) {
  const title = pageTitle(page);
  if (!title || page.archived || page.in_trash) continue;
  if (/^(대동여수음식지도|새로운음식점|한식|중식|치킨|피자|분식|카페|디저트|전체)$/i.test(title)) continue;

  const pageId = normalizeId(page.id);
  if (existingPageIds.has(pageId)) {
    report.alreadyPresent.push({title, pageId: page.id, reason: 'same-page-id'});
    continue;
  }

  report.inspected += 1;
  try {
    const lines = await flattenPage(page.id);
    const routes = extractRoutes(lines);
    if (!routes.length) {
      report.excluded.push({title, pageId: page.id, reason: 'no-order-or-store-link'});
      continue;
    }

    const normalizedTitle = normalizeName(title);
    if (existingNames.has(normalizedTitle)) {
      report.alreadyPresent.push({title, pageId: page.id, reason: 'same-normalized-name'});
      continue;
    }

    const text = `${title} ${lines.map(line => line.plain).join(' ')}`;
    const naverMapRoute = routes.find(route => route.name === '네이버지도');
    const newStore = {
      id: stableId(page.id),
      name: title,
      realBusinessName: title,
      shopInShopNames: [],
      district: inferDistrict(text),
      category: inferCategory(text),
      address: '',
      phone: '',
      naverMap: naverMapRoute?.url || '',
      image: '',
      routes: routes.filter(route => route.name !== '네이버지도'),
      events: [],
      managed: false,
      sharedManaged: false,
      managementStatus: 'unconfirmed',
      pinPosition: null,
      forceBottom: false,
      searchTerms: [...new Set([title, inferDistrict(text), inferCategory(text)].filter(Boolean))],
      categories: [inferCategory(text)],
      source: {type: 'notion_live'},
      notionPageId: page.id,
      notionUrl: page.url || '',
      notionSyncedAt: new Date().toISOString()
    };

    stores.push(newStore);
    existingPageIds.add(pageId);
    existingNames.add(normalizedTitle);
    report.added.push({title, pageId: page.id, routes: newStore.routes.map(route => route.name)});
  } catch (error) {
    report.errors.push({title, pageId: page.id, error: error.message});
  }
  await sleep(120);
}

await fs.writeFile(DB_PATH, `${JSON.stringify(stores, null, 2)}\n`, 'utf8');
report.finishedAt = new Date().toISOString();
report.addedCount = report.added.length;
report.excludedCount = report.excluded.length;
report.errorCount = report.errors.length;
await fs.mkdir(path.dirname(REPORT_PATH), {recursive: true});
await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`노션 완전 수집 완료: 접근 ${report.accessiblePages}, 신규 ${report.addedCount}, 제외 ${report.excludedCount}, 오류 ${report.errorCount}`);
