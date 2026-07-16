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
const normalizeId = value => String(value || '').replace(/-/g, '').trim();

async function notion(endpoint, options = {}) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const res = await fetch(`${API}${endpoint}`, {
      ...options,
      headers: {...headers, ...(options.headers || {})}
    });
    if (res.ok) return res.json();
    const body = await res.text();
    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get('retry-after') || 0);
      await sleep(Math.max(retryAfter * 1000, 1200 * (attempt + 1)));
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

async function searchWorkspacePages() {
  const result = [];
  let cursor;
  do {
    const body = {
      page_size: 100,
      filter: {property: 'object', value: 'page'},
      sort: {direction: 'descending', timestamp: 'last_edited_time'}
    };
    if (cursor) body.start_cursor = cursor;

    const data = await notion('/search', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    result.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
    await sleep(180);
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

function parentInfo(page) {
  const parent = page?.parent || {};
  if (parent.type === 'page_id') return {type: 'page_id', id: parent.page_id || ''};
  if (parent.type === 'database_id') return {type: 'database_id', id: parent.database_id || ''};
  if (parent.type === 'workspace') return {type: 'workspace', id: ''};
  if (parent.type === 'block_id') return {type: 'block_id', id: parent.block_id || ''};
  return {type: parent.type || 'unknown', id: ''};
}

const report = {
  startedAt: new Date().toISOString(),
  rootPageId: ROOT_PAGE_ID,
  rootAccessible: false,
  pages: [],
  databases: [],
  workspaceSearch: {
    accessiblePageCount: 0,
    rootTreePageCount: 0,
    outsideRootCount: 0,
    outsideRootPages: []
  },
  errors: []
};

const visited = new Set();

async function walk(parentId, depth = 0, parentTitle = '') {
  const normalized = normalizeId(parentId);
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
      const resolvedTitle = pageTitle(page) || title;
      report.pages.push({
        id: block.id,
        title: resolvedTitle,
        url: page?.url || '',
        depth: depth + 1,
        parentId,
        parentTitle
      });
      await walk(block.id, depth + 1, resolvedTitle);
      await sleep(100);
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

if (report.rootAccessible) {
  try {
    const workspacePages = await searchWorkspacePages();
    const rootTreeIds = new Set([ROOT_PAGE_ID, ...report.pages.map(page => normalizeId(page.id))]);
    const outsideRootPages = workspacePages
      .filter(page => !rootTreeIds.has(normalizeId(page.id)))
      .map(page => ({
        id: page.id,
        title: pageTitle(page) || '제목 없음',
        url: page.url || '',
        archived: Boolean(page.archived),
        inTrash: Boolean(page.in_trash),
        lastEditedTime: page.last_edited_time || '',
        parent: parentInfo(page)
      }))
      .sort((a, b) => a.title.localeCompare(b.title, 'ko'));

    report.workspaceSearch = {
      accessiblePageCount: workspacePages.length,
      rootTreePageCount: report.pages.length + 1,
      outsideRootCount: outsideRootPages.length,
      outsideRootPages
    };
  } catch (error) {
    report.errors.push({stage: 'workspace-search', error: error.message});
  }
}

report.finishedAt = new Date().toISOString();
report.pageCount = report.pages.length;
report.databaseCount = report.databases.length;
report.errorCount = report.errors.length;

const focusKeywords = ['오워래', '해인이네', '수라상궁', '바오탕수', '바로탕수'];
report.focus = focusKeywords.map(keyword => ({
  keyword,
  rootMatches: report.pages.filter(page => page.title.includes(keyword)),
  outsideRootMatches: report.workspaceSearch.outsideRootPages.filter(page => page.title.includes(keyword))
}));

await fs.mkdir(path.dirname(REPORT_PATH), {recursive: true});
await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`루트 진단 완료: 하위 페이지 ${report.pageCount}, 데이터베이스 ${report.databaseCount}, 오류 ${report.errorCount}`);
console.log(`워크스페이스 검색: 접근 가능 페이지 ${report.workspaceSearch.accessiblePageCount}, 루트 밖 ${report.workspaceSearch.outsideRootCount}`);
for (const item of report.focus) {
  console.log(`[집중 확인] ${item.keyword}: 루트 안 ${item.rootMatches.length}개 / 루트 밖 ${item.outsideRootMatches.length}개`);
}

if (!report.rootAccessible) process.exit(1);
