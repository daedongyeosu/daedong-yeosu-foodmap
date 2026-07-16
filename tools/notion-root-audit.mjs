import fs from 'node:fs/promises';
import path from 'node:path';

const TOKEN = process.env.NOTION_TOKEN;
const ROOT_PAGE_ID = String(process.env.NOTION_ROOT_PAGE_ID || '').replace(/-/g, '').trim();
const REPORT_PATH = 'data/notion-root-audit.json';
const API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

if (!TOKEN) throw new Error('NOTION_TOKEN 환경변수가 필요합니다.');
if (!ROOT_PAGE_ID) throw new Error('NOTION_ROOT_PAGE_ID가 비어 있습니다. GitHub Actions Secret을 확인하세요.');

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Notion-Version': NOTION_VERSION,
  'Content-Type': 'application/json'
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function notion(endpoint, options = {}) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const res = await fetch(`${API}${endpoint}`, {
      ...options,
      headers: {...headers, ...(options.headers || {})}
    });
    if (res.ok) return res.json();
    const body = await res.text();
    if (res.status === 429 || res.status >= 500) {
      await sleep(900 * (attempt + 1));
      continue;
    }
    throw new Error(`${endpoint} 실패: ${res.status} ${body}`);
  }
  throw new Error(`${endpoint} 재시도 초과`);
}

async function children(blockId) {
  const result = [];
  let cursor;
  do {
    const qs = new URLSearchParams({page_size: '100'});
    if (cursor) qs.set('start_cursor', cursor);
    const data = await notion(`/blocks/${blockId}/children?${qs}`);
    result.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return result;
}

function pageTitle(page) {
  for (const prop of Object.values(page?.properties || {})) {
    if (prop?.type === 'title') {
      return (prop.title || []).map(item => item.plain_text || '').join('').trim();
    }
  }
  return '';
}

const report = {
  startedAt: new Date().toISOString(),
  rootPageId: ROOT_PAGE_ID,
  rootAccessible: false,
  pages: [],
  databases: [],
  errors: []
};

const visited = new Set();

async function walk(parentId, depth = 0, parentTitle = '') {
  const normalized = String(parentId).replace(/-/g, '');
  if (visited.has(normalized)) return;
  visited.add(normalized);

  let blocks;
  try {
    blocks = await children(parentId);
  } catch (error) {
    report.errors.push({id: parentId, depth, parentTitle, stage: 'children', error: error.message});
    return;
  }

  for (const block of blocks) {
    if (block.type === 'child_page') {
      const title = block.child_page?.title || '';
      let page = null;
      try {
        page = await notion(`/pages/${block.id}`);
      } catch (error) {
        report.errors.push({id: block.id, depth: depth + 1, title, stage: 'page', error: error.message});
      }
      report.pages.push({
        id: block.id,
        title: pageTitle(page) || title,
        url: page?.url || '',
        depth: depth + 1,
        parentId,
        parentTitle
      });
      await walk(block.id, depth + 1, pageTitle(page) || title);
      await sleep(80);
    } else if (block.type === 'child_database') {
      report.databases.push({
        id: block.id,
        title: block.child_database?.title || '',
        depth: depth + 1,
        parentId,
        parentTitle
      });
    } else if (block.has_children) {
      await walk(block.id, depth + 1, parentTitle);
    }
  }
}

try {
  const root = await notion(`/pages/${ROOT_PAGE_ID}`);
  report.rootAccessible = true;
  report.rootTitle = pageTitle(root);
  report.rootUrl = root.url || '';
  await walk(ROOT_PAGE_ID, 0, report.rootTitle);
} catch (error) {
  report.errors.push({id: ROOT_PAGE_ID, stage: 'root', error: error.message});
}

report.finishedAt = new Date().toISOString();
report.pageCount = report.pages.length;
report.databaseCount = report.databases.length;
report.errorCount = report.errors.length;
report.focus = ['오워래', '해인이네', '수라상궁', '바오탕수', '바로탕수'].map(keyword => ({
  keyword,
  matches: report.pages.filter(page => page.title.includes(keyword))
}));

await fs.mkdir(path.dirname(REPORT_PATH), {recursive: true});
await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`루트 진단 완료: 하위 페이지 ${report.pageCount}, 데이터베이스 ${report.databaseCount}, 오류 ${report.errorCount}`);
for (const item of report.focus) {
  console.log(`[집중 확인] ${item.keyword}: ${item.matches.length}개`);
}

if (!report.rootAccessible) process.exit(1);
