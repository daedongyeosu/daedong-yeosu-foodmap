import fs from 'node:fs/promises';
import path from 'node:path';

const TOKEN = process.env.NOTION_TOKEN;
const ROOT_PAGE_ID = process.env.NOTION_ROOT_PAGE_ID || '';
const DB_PATH = process.env.STORES_PATH || 'data/stores.json';
const REPORT_PATH = process.env.NOTION_REPORT_PATH || 'data/notion-sync-report.json';
const API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

if (!TOKEN) {
  console.error('NOTION_TOKEN 환경변수가 필요합니다.');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Notion-Version': NOTION_VERSION,
  'Content-Type': 'application/json'
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const clean = v => String(v ?? '').trim();
const norm = v => clean(v)
  .toLowerCase()
  .replace(/여수시/g, '')
  .replace(/[()\[\]{}<>·ㆍ,.!?\'"`~@#$%^&*_+=|\\/:;-]/g, '')
  .replace(/\s+/g, '');

const AUTHORITATIVE_ROUTE_KEYS = new Set([
  'direct', 'mukkebi', 'ddangyo', 'yogiyo', 'coupang', 'baemin', 'chak', 'phone'
]);

function titleFromPage(page) {
  const props = page?.properties || {};
  for (const value of Object.values(props)) {
    if (value?.type === 'title') {
      return (value.title || []).map(x => x.plain_text || '').join('').trim();
    }
  }
  return '';
}

async function notion(endpoint, options = {}) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await fetch(`${API}${endpoint}`, {
      ...options,
      headers: {...headers, ...(options.headers || {})}
    });
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) {
      await sleep(700 * (attempt + 1));
      continue;
    }
    throw new Error(`${endpoint} 실패: ${res.status} ${await res.text()}`);
  }
  throw new Error(`${endpoint} 재시도 초과`);
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
    const qs = new URLSearchParams({page_size: '100'});
    if (cursor) qs.set('start_cursor', cursor);
    const data = await notion(`/blocks/${blockId}/children?${qs}`);
    blocks.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return blocks;
}

function richTexts(block) {
  const type = block?.type;
  const value = block?.[type];
  return Array.isArray(value?.rich_text) ? value.rich_text : [];
}

function linksFromRichText(items) {
  const links = [];
  for (const item of items) {
    const label = clean(item.plain_text);
    const url = clean(item.href || item.text?.link?.url);
    if (url) links.push({label, url});
  }
  return links;
}

async function flattenPage(pageId) {
  const out = [];
  async function walk(parentId, depth = 0) {
    if (depth > 6) return;
    const blocks = await childBlocks(parentId);
    for (const block of blocks) {
      const texts = richTexts(block);
      const plain = texts.map(x => x.plain_text || '').join(' ').trim();
      const links = linksFromRichText(texts);
      if (plain || links.length) out.push({plain, links});
      if (block.has_children) await walk(block.id, depth + 1);
    }
  }
  await walk(pageId);
  return out;
}

const routePatterns = [
  ['direct', /(가게\s*바로|바로\s*주문|자동\s*접수|직접\s*주문)/i, '가게바로주문'],
  ['mukkebi', /먹깨비/i, '먹깨비'],
  ['ddangyo', /땡겨요/i, '땡겨요'],
  ['yogiyo', /요기요/i, '요기요'],
  ['coupang', /(쿠팡|coupang)/i, '쿠팡이츠'],
  ['baemin', /(배달의\s*민족|배민)/i, '배달의민족'],
  ['chak', /(chak|섬섬페이|지역상품권)/i, 'CHAK'],
  ['phone', /(전화|통화|tel)/i, '전화']
];

function classifyLink(label, url, context = '') {
  if (!url) return null;
  const hay = `${label} ${context}`;
  if (/^tel:/i.test(url)) return {key: 'phone', name: '전화'};
  for (const [key, rx, name] of routePatterns) {
    if (rx.test(hay)) return {key, name};
  }
  return null;
}

function normalizePhone(value) {
  const digits = clean(value).replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 11) return '';
  if (digits.startsWith('061')) {
    if (digits.length === 9) return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`;
    if (digits.length === 10) return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`;
    if (digits.length === 11) return `${digits.slice(0,3)}-${digits.slice(3,7)}-${digits.slice(7)}`;
  }
  if (digits.startsWith('01') && digits.length === 11) {
    return `${digits.slice(0,3)}-${digits.slice(3,7)}-${digits.slice(7)}`;
  }
  return digits;
}

function phoneFromLink(label, url, context = '') {
  if (/^tel:/i.test(url)) return normalizePhone(url.replace(/^tel:/i, ''));
  const candidates = [label, context, decodeURIComponent(url)];
  for (const text of candidates) {
    const match = clean(text).match(/(?:061[-\s]?\d{3,4}[-\s]?\d{4}|01\d[-\s]?\d{3,4}[-\s]?\d{4})/);
    if (match) return normalizePhone(match[0]);
    const slugDigits = clean(text).match(/(?:tel|전화)[^\d]*(\d{9,11})/i);
    if (slugDigits) return normalizePhone(slugDigits[1]);
  }
  return '';
}

function extractNotionData(lines) {
  const found = new Map();
  let phone = '';

  for (const line of lines) {
    for (const link of line.links) {
      const classified = classifyLink(link.label, link.url, line.plain);
      if (!classified) continue;

      if (!found.has(classified.key)) {
        found.set(classified.key, {
          key: classified.key,
          name: classified.name,
          url: link.url,
          enabled: true,
          source: 'notion'
        });
      }

      if (classified.key === 'phone' && !phone) {
        phone = phoneFromLink(link.label, link.url, line.plain);
      }
    }

    if (!phone && /(전화|통화)/i.test(line.plain)) {
      const match = line.plain.match(/(?:061[-\s]?\d{3,4}[-\s]?\d{4}|01\d[-\s]?\d{3,4}[-\s]?\d{4})/);
      if (match) phone = normalizePhone(match[0]);
    }
  }

  return {routes: [...found.values()], phone};
}

function storeKeys(store) {
  return [store.name, store.realBusinessName, ...(store.shopInShopNames || [])]
    .map(norm).filter(Boolean);
}

function pageKeys(title) {
  const base = norm(title);
  return [
    base,
    base.replace(/가게바로주문준비중입니다/g, ''),
    base.replace(/가게바로주문/g, ''),
    base.replace(/전화주문/g, '')
  ].filter(Boolean);
}

function matchScore(store, title) {
  const sKeys = storeKeys(store);
  const pKeys = pageKeys(title);
  let best = 0;
  for (const s of sKeys) {
    for (const p of pKeys) {
      if (s === p) best = Math.max(best, 100);
      else if (s.length >= 4 && p.length >= 4 && (s.includes(p) || p.includes(s))) {
        best = Math.max(best, 80);
      }
    }
  }
  return best;
}

function routeKey(route) {
  return classifyLink(route?.name || '', route?.url || '')?.key || '';
}

function replaceAuthoritativeRoutes(oldRoutes = [], notionRoutes = []) {
  const keepUnmanaged = oldRoutes.filter(route => {
    const key = routeKey(route);
    return !key || !AUTHORITATIVE_ROUTE_KEYS.has(key);
  });

  const deduped = new Map();
  for (const route of notionRoutes) {
    if (route.key && route.url) {
      deduped.set(route.key, {
        name: route.name,
        url: route.url,
        enabled: true,
        source: 'notion'
      });
    }
  }
  return [...keepUnmanaged, ...deduped.values()];
}

async function main() {
  const stores = JSON.parse(await fs.readFile(DB_PATH, 'utf8'));
  const pages = await searchPages();
  const candidates = pages
    .map(page => ({page, title: titleFromPage(page)}))
    .filter(x => x.title && !/전화\s*주문$|가게\s*바로\s*주문\s*준비중/i.test(x.title));

  const report = {
    startedAt: new Date().toISOString(),
    rules: {
      routeAuthority: 'notion-main-page',
      phonePriority: 'notion-then-existing',
      appTextWithoutUrl: 'hidden',
      photoAuthority: 'external-photo-folders'
    },
    pagesScanned: candidates.length,
    matched: [],
    unmatched: [],
    errors: []
  };

  for (let i = 0; i < stores.length; i += 1) {
    const store = stores[i];
    let best = null;

    for (const candidate of candidates) {
      if (ROOT_PAGE_ID && candidate.page.parent?.page_id !== ROOT_PAGE_ID && candidate.page.id !== ROOT_PAGE_ID) continue;
      const score = matchScore(store, candidate.title);
      if (!best || score > best.score) best = {...candidate, score};
    }

    if (!best || best.score < 80) {
      report.unmatched.push({store: store.name});
      continue;
    }

    try {
      const lines = await flattenPage(best.page.id);
      const notionData = extractNotionData(lines);

      store.routes = replaceAuthoritativeRoutes(store.routes, notionData.routes);
      if (notionData.phone) store.phone = notionData.phone;

      store.notionPageId = best.page.id;
      store.notionUrl = best.page.url;
      store.notionSyncedAt = new Date().toISOString();

      const routeKeys = notionData.routes.map(r => r.key);
      report.matched.push({
        store: store.name,
        notionTitle: best.title,
        score: best.score,
        routes: routeKeys,
        phone: notionData.phone || null,
        missingRoutes: [...AUTHORITATIVE_ROUTE_KEYS].filter(key => !routeKeys.includes(key))
      });

      await sleep(120);
    } catch (error) {
      report.errors.push({store: store.name, notionTitle: best.title, error: error.message});
    }
  }

  await fs.writeFile(DB_PATH, `${JSON.stringify(stores, null, 2)}\n`, 'utf8');
  report.finishedAt = new Date().toISOString();
  report.matchedCount = report.matched.length;
  report.unmatchedCount = report.unmatched.length;
  report.errorCount = report.errors.length;

  await fs.mkdir(path.dirname(REPORT_PATH), {recursive: true});
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`노션 동기화 완료: 매칭 ${report.matchedCount}, 미매칭 ${report.unmatchedCount}, 오류 ${report.errorCount}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
