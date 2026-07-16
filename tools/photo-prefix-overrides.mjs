import fs from 'node:fs/promises';

const STORES_PATH = process.env.STORES_PATH || 'data/stores.json';
const MANIFEST_PATH = process.env.PHOTO_MANIFEST_PATH || 'data/photo-manifest.json';
const OVERRIDES_PATH = process.env.PHOTO_OVERRIDES_PATH || 'data/photo-match-overrides.json';
const REPORT_PATH = process.env.PHOTO_PREFIX_REPORT_PATH || 'data/photo-prefix-match-report.json';

const clean = value => String(value ?? '').normalize('NFKC').trim();

function normalize(value) {
  return clean(value)
    .replace(/\b(?:0?61[-\s]?\d{3,4}[-\s]?\d{4}|01\d[-\s]?\d{3,4}[-\s]?\d{4})\b/g, ' ')
    .replace(/\s*[\(（]\s*\d+\s*[\)）]\s*$/u, ' ')
    .replace(/\s*(?:[-_–—]\s*)?(?:복사본|사본|copy)(?:\s*\d+)?\s*$/iu, ' ')
    .replace(/(?:가게|매장)?\s*사진(?:모음|파일)?/gi, ' ')
    .replace(/공산소/gi, ' ')
    .toLowerCase()
    .replace(/여수시|여수/g, '')
    .replace(/[()（）\[\]{}<>·ㆍ,.!?\'"`~@#$%^&*_+=|\\/:;\-–—]/g, '')
    .replace(/\s+/g, '');
}

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { return fallback; }
}

const stores = await readJson(STORES_PATH, []);
const manifestData = await readJson(MANIFEST_PATH, {folders: []});
const folders = Array.isArray(manifestData) ? manifestData : (manifestData.folders || []);
const overrides = await readJson(OVERRIDES_PATH, {mappings: {}, ignoredFolders: []});
overrides.mappings ||= {};
overrides.ignoredFolders ||= [];

const titles = stores
  .map(store => ({title: clean(store?.name), normalized: normalize(store?.name)}))
  .filter(item => item.normalized.length >= 4)
  .sort((a, b) => b.normalized.length - a.normalized.length || a.title.localeCompare(b.title, 'ko'));

const added = [];
const ambiguous = [];
const existing = [];

for (const folder of folders) {
  const folderName = clean(folder?.folderName);
  const folderNormalized = normalize(folderName);
  if (!folderNormalized) continue;
  if (Object.prototype.hasOwnProperty.call(overrides.mappings, folderName)) {
    existing.push({folderName, store: overrides.mappings[folderName]});
    continue;
  }

  const candidates = titles.filter(item => folderNormalized.startsWith(item.normalized));
  if (!candidates.length) continue;
  const longest = candidates[0].normalized.length;
  const best = candidates.filter(item => item.normalized.length === longest);
  const uniqueTitles = [...new Set(best.map(item => item.title))];
  if (uniqueTitles.length !== 1) {
    ambiguous.push({folderName, candidates: uniqueTitles});
    continue;
  }

  const title = uniqueTitles[0];
  overrides.mappings[folderName] = title;
  added.push({folderName, store: title, ignoredSuffix: folderNormalized.slice(longest)});
}

await fs.writeFile(OVERRIDES_PATH, `${JSON.stringify(overrides, null, 2)}\n`, 'utf8');
await fs.writeFile(REPORT_PATH, `${JSON.stringify({
  createdAt: new Date().toISOString(),
  rule: '사진 폴더의 맨 앞부분이 노션 표시 가게명과 같으면, 지점명 뒤에 붙인 실제 사업자명 메모는 무시한다. 실제 사업자명과 숍인숍 정보는 비교하지 않는다.',
  addedCount: added.length,
  ambiguousCount: ambiguous.length,
  added,
  ambiguous,
  existingCount: existing.length
}, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({added: added.length, ambiguous: ambiguous.length, existing: existing.length}, null, 2));
