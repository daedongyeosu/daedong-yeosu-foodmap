import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {NEW_NOTION_STORES} from './nine-notion-store-config.mjs';

const TOKEN = process.env.NOTION_TOKEN;
const API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const STORES_PATH = 'data/stores.json';
const MANIFEST_PATH = 'data/photo-manifest.json';
const CHECKSUM_PATH = 'SHA256SUMS.txt';

if (!TOKEN) throw new Error('NOTION_TOKEN 환경변수가 필요합니다.');

const notionHeaders = {
  Authorization: `Bearer ${TOKEN}`,
  'Notion-Version': NOTION_VERSION,
  'Content-Type': 'application/json'
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const normalize = value => String(value ?? '')
  .toLowerCase()
  .replace(/[()\[\]{}<>·ㆍ,.!?'"`~@#$%^&*_+=|\\/:;\-\s]/g, '');

async function notion(endpoint) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(`${API}${endpoint}`, {headers: notionHeaders});
    if (response.ok) return response.json();
    if (response.status === 429 || response.status >= 500) {
      await sleep(800 * (attempt + 1));
      continue;
    }
    throw new Error(`${endpoint} 실패: ${response.status} ${await response.text()}`);
  }
  throw new Error(`${endpoint} 재시도 초과`);
}

function titleFromPage(page) {
  for (const property of Object.values(page?.properties || {})) {
    if (property?.type === 'title') {
      return (property.title || []).map(item => item.plain_text || '').join('').trim();
    }
  }
  return '';
}

async function childBlocks(parentId) {
  const blocks = [];
  let cursor;
  do {
    const params = new URLSearchParams({page_size: '100'});
    if (cursor) params.set('start_cursor', cursor);
    const data = await notion(`/blocks/${parentId}/children?${params}`);
    blocks.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return blocks;
}

function imageUrl(block) {
  if (block?.type !== 'image') return '';
  if (block.image?.type === 'file') return block.image.file?.url || '';
  if (block.image?.type === 'external') return block.image.external?.url || '';
  return '';
}

function fileUrl(block) {
  if (block?.type !== 'file') return '';
  if (block.file?.type === 'file') return block.file.file?.url || '';
  if (block.file?.type === 'external') return block.file.external?.url || '';
  return '';
}

function pageCoverUrl(page) {
  if (page?.cover?.type === 'file') return page.cover.file?.url || '';
  if (page?.cover?.type === 'external') return page.cover.external?.url || '';
  return '';
}

async function pageMediaReport(pageId, page) {
  const imageUrls = [];
  const fileUrls = [];
  const blockTypes = new Map();
  async function walk(parentId, depth = 0) {
    if (depth > 6) throw new Error(`${pageId}: 이미지 블록 중첩 깊이가 너무 큽니다.`);
    for (const block of await childBlocks(parentId)) {
      blockTypes.set(block.type, (blockTypes.get(block.type) || 0) + 1);
      const url = imageUrl(block);
      if (url) imageUrls.push(url);
      const attachmentUrl = fileUrl(block);
      if (attachmentUrl) fileUrls.push(attachmentUrl);
      if (block.has_children && !['child_page', 'child_database'].includes(block.type)) {
        await walk(block.id, depth + 1);
      }
    }
  }
  await walk(pageId);
  return {
    imageUrls: [...new Set(imageUrls)],
    fileUrls: [...new Set(fileUrls)],
    coverUrl: pageCoverUrl(page),
    blockTypes: Object.fromEntries([...blockTypes.entries()].sort(([left], [right]) => left.localeCompare(right)))
  };
}

function extensionFor(contentType, url) {
  const type = String(contentType || '').toLowerCase().split(';')[0].trim();
  const known = new Map([
    ['image/jpeg', '.jpg'],
    ['image/jpg', '.jpg'],
    ['image/png', '.png'],
    ['image/webp', '.webp'],
    ['image/gif', '.gif'],
    ['image/avif', '.avif']
  ]);
  if (known.has(type)) return known.get(type);
  const pathname = new URL(url).pathname.toLowerCase();
  const match = pathname.match(/\.(jpe?g|png|webp|gif|avif)$/);
  if (match) return match[1] === 'jpeg' ? '.jpg' : `.${match[1]}`;
  throw new Error(`지원하지 않는 사진 형식입니다: ${contentType || 'unknown'}`);
}

async function downloadImage(url, targetBase) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`사진 다운로드 실패: ${response.status}`);
  const extension = extensionFor(response.headers.get('content-type'), url);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 1024) throw new Error(`사진 파일이 너무 작습니다: ${buffer.length} bytes`);
  const target = `${targetBase}${extension}`;
  await fs.writeFile(target, buffer, {flag: 'wx'});
  return target.replaceAll(path.sep, '/');
}

function makeStore(definition, imagePaths) {
  const aliases = [definition.name, definition.name.replace(/\s+/g, '')];
  const searchTerms = [...new Set([
    ...aliases,
    definition.brandName,
    definition.branchName,
    definition.district,
    definition.category,
    ...definition.categories
  ].filter(Boolean))];
  return {
    id: definition.id,
    store_id: definition.id,
    notionPageId: definition.notionPageId,
    notionUrl: definition.notionUrl,
    name: definition.name,
    realBusinessName: definition.name,
    brandName: definition.brandName,
    branchName: definition.branchName,
    aliases,
    searchAliases: aliases,
    shopInShopNames: [],
    district: definition.district,
    category: definition.category,
    address: '',
    phone: definition.phone,
    naverMap: definition.naverMap,
    image: imagePaths[0],
    img: imagePaths[0],
    images: imagePaths.map(src => ({card: src, detail: src})),
    routes: definition.routes,
    latitude: null,
    longitude: null,
    coordinateStatus: 'unverified',
    coordinateVerified: false,
    managed: false,
    sharedManaged: false,
    pinPosition: null,
    forceBottom: false,
    source: {
      type: 'notion_new_store_sync',
      notionPageId: definition.notionPageId
    },
    searchTerms,
    categories: definition.categories
  };
}

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function updateChecksums() {
  const files = [STORES_PATH, MANIFEST_PATH];
  let checksumText = await fs.readFile(CHECKSUM_PATH, 'utf8');
  for (const file of files) {
    const digest = sha256(await fs.readFile(file));
    const linePattern = new RegExp(`^[a-f0-9]{64}  ${file.replaceAll('/', '\\/')}\\s*$`, 'm');
    if (!linePattern.test(checksumText)) throw new Error(`${CHECKSUM_PATH}에 ${file} 항목이 없습니다.`);
    checksumText = checksumText.replace(linePattern, `${digest}  ${file}`);
  }
  await fs.writeFile(CHECKSUM_PATH, `${checksumText.trimEnd()}\n`, 'utf8');
}

async function main() {
  const stores = JSON.parse(await fs.readFile(STORES_PATH, 'utf8'));
  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
  const existingIds = new Set(stores.map(store => store.id));
  const existingNames = new Set(stores.map(store => normalize(store.name)));
  const manifestIds = new Set(manifest.entries.map(entry => entry.storeId));

  for (const definition of NEW_NOTION_STORES) {
    if (existingIds.has(definition.id)) throw new Error(`${definition.name}: ID가 이미 존재합니다.`);
    if (existingNames.has(normalize(definition.name))) throw new Error(`${definition.name}: 이름이 이미 존재합니다.`);
    if (manifestIds.has(definition.id)) throw new Error(`${definition.name}: 사진 manifest가 이미 존재합니다.`);
  }

  const mediaReports = [];
  for (const definition of NEW_NOTION_STORES) {
    const page = await notion(`/pages/${definition.pageId}`);
    const actualTitle = titleFromPage(page);
    if (normalize(actualTitle) !== normalize(definition.name)) {
      throw new Error(`${definition.name}: 노션 제목 불일치 (${actualTitle || '제목 없음'})`);
    }

    const media = await pageMediaReport(definition.pageId, page);
    mediaReports.push({definition, ...media});
    console.log(
      `[노션 사진 진단] ${definition.name}: 이미지 블록 ${media.imageUrls.length}장, ` +
      `파일 첨부 ${media.fileUrls.length}개, 표지 ${media.coverUrl ? '1개' : '없음'}, ` +
      `블록 ${JSON.stringify(media.blockTypes)}`
    );
  }

  const invalidMedia = mediaReports.filter(report => report.imageUrls.length !== 3);
  if (invalidMedia.length > 0) {
    throw new Error(
      `노션 본문에 사진 3장이 확인되지 않은 가게: ` +
      invalidMedia.map(report => `${report.definition.name}(${report.imageUrls.length}장)`).join(', ')
    );
  }

  for (const {definition, imageUrls: urls} of mediaReports) {
    const photoDir = `assets/notion-store-photos/${definition.id.slice(0, 14)}`;
    await fs.mkdir(photoDir, {recursive: false});
    const imagePaths = [];
    for (let index = 0; index < urls.length; index += 1) {
      imagePaths.push(await downloadImage(urls[index], `${photoDir}/${String(index + 1).padStart(2, '0')}`));
    }

    stores.push(makeStore(definition, imagePaths));
    manifest.entries.push({
      storeId: definition.id,
      src: imagePaths[0],
      additionalSrcs: imagePaths.slice(1),
      gallery: imagePaths,
      source: 'notion-new-store-sync',
      classification: 'food',
      blocked: false
    });
    console.log(`${definition.name}: 노션 사진 3장 등록`);
  }

  await fs.writeFile(STORES_PATH, `${JSON.stringify(stores, null, 2)}\n`, 'utf8');
  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await updateChecksums();
  console.log(`신규 가게 ${NEW_NOTION_STORES.length}곳, 사진 ${NEW_NOTION_STORES.length * 3}장 동기화 완료`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
