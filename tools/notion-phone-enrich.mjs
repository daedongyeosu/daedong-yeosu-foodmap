import fs from 'node:fs/promises';

const TOKEN = process.env.NOTION_TOKEN;
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
const clean = value => String(value ?? '').trim();

async function notion(endpoint) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${API}${endpoint}`, {headers});
    if (response.ok) return response.json();
    if (response.status === 429 || response.status >= 500) {
      await sleep(700 * (attempt + 1));
      continue;
    }
    throw new Error(`${endpoint} 실패: ${response.status} ${await response.text()}`);
  }
  throw new Error(`${endpoint} 재시도 초과`);
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

function normalizePageId(value) {
  const match = clean(value).match(/([0-9a-f]{32})(?:\?|$)/i);
  if (!match) return '';
  const id = match[1].toLowerCase();
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}

function normalizePhone(value) {
  const digits = clean(value).replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 11) return '';
  if (digits.startsWith('061')) {
    if (digits.length === 9) return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
    if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.startsWith('01') && digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return digits;
}

function phoneFromText(text) {
  const source = clean(text);
  const candidates = source.match(/(?:061|01\d)(?:[^0-9]*\d){6,8}/g) || [];
  for (const candidate of candidates) {
    const phone = normalizePhone(candidate);
    if (phone) return phone;
  }
  return '';
}

function textFromBlock(block) {
  const value = block?.[block?.type];
  const rich = Array.isArray(value?.rich_text) ? value.rich_text : [];
  const parts = rich.map(item => item.plain_text || '');
  if (block?.type === 'child_page') parts.push(block.child_page?.title || '');
  if (block?.type === 'bookmark') parts.push(block.bookmark?.url || '');
  if (block?.type === 'link_preview') parts.push(block.link_preview?.url || '');
  return parts.join(' ');
}

async function findPhoneInPage(pageId) {
  const visited = new Set();
  async function walk(parentId, depth = 0) {
    if (depth > 4 || visited.has(parentId)) return '';
    visited.add(parentId);
    const blocks = await childBlocks(parentId);
    for (const block of blocks) {
      const phone = phoneFromText(textFromBlock(block));
      if (phone) return phone;
      if (block.has_children) {
        const nested = await walk(block.id, depth + 1);
        if (nested) return nested;
      }
    }
    return '';
  }
  return walk(pageId);
}

const stores = JSON.parse(await fs.readFile(DB_PATH, 'utf8'));
const stats = {checked: 0, updated: 0, unresolved: 0, errors: []};

for (const store of stores) {
  const phoneRoute = (store.routes || []).find(route => /전화|통화|tel/i.test(route?.name || ''));
  if (!phoneRoute?.url) continue;
  const direct = /^tel:/i.test(phoneRoute.url)
    ? normalizePhone(phoneRoute.url.replace(/^tel:/i, ''))
    : phoneFromText(phoneRoute.url);
  if (direct) {
    stats.checked += 1;
    if (store.phone !== direct) {
      store.phone = direct;
      store.phoneSource = 'notion';
      stats.updated += 1;
    }
    continue;
  }

  const pageId = normalizePageId(phoneRoute.url);
  if (!pageId || !/notion\.(?:so|site|com)|notion\.com/i.test(phoneRoute.url)) continue;
  stats.checked += 1;
  try {
    const phone = await findPhoneInPage(pageId);
    if (phone) {
      if (store.phone !== phone) stats.updated += 1;
      store.phone = phone;
      store.phoneSource = 'notion';
    } else {
      stats.unresolved += 1;
    }
    await sleep(120);
  } catch (error) {
    stats.errors.push({store: store.name, error: error.message});
  }
}

await fs.writeFile(DB_PATH, `${JSON.stringify(stores, null, 2)}\n`, 'utf8');

try {
  const report = JSON.parse(await fs.readFile(REPORT_PATH, 'utf8'));
  report.phoneEnrichment = {
    ...stats,
    errorCount: stats.errors.length
  };
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
} catch {
  // 보고서가 없는 독립 실행도 허용합니다.
}

console.log(`노션 전화번호 보강 완료: 검사 ${stats.checked}, 변경 ${stats.updated}, 미확인 ${stats.unresolved}, 오류 ${stats.errors.length}`);
