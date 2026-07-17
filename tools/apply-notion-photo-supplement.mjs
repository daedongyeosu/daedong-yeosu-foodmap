import fs from 'node:fs/promises';
import path from 'node:path';

const STORES_PATH = process.env.STORES_PATH || 'data/stores.json';
const MANIFEST_PATH = process.env.NOTION_PHOTO_MANIFEST_PATH || 'data/notion-photo-manifest.json';
const REPORT_PATH = process.env.NOTION_PHOTO_REPORT_PATH || 'data/notion-photo-apply-report.json';

const clean = value => String(value ?? '').normalize('NFKC').trim();
const unique = values => [...new Set(values.flat(Infinity).map(clean).filter(Boolean))];

function stripCopySuffix(value) {
  let text = clean(value);
  let previous = '';
  while (text && text !== previous) {
    previous = text;
    text = text
      .replace(/\s*[\(（]\s*\d+\s*[\)）]\s*$/u, '')
      .replace(/\s*(?:[-_–—]\s*)?(?:복사본|사본|copy)(?:\s*\d+)?\s*$/iu, '')
      .trim();
  }
  return text;
}

function normalize(value) {
  return stripCopySuffix(value)
    .toLowerCase()
    .replace(/[()（）\[\]{}<>·ㆍ,.!?\'"`~@#$%^&*_+=|\\/:;\-–—]/g, '')
    .replace(/\s+/g, '');
}

function hasRealPhoto(store) {
  const imageItems = Array.isArray(store?.images) ? store.images : [];
  const paths = unique([
    ...imageItems.map(item => item?.card || item?.src || item?.url || item),
    store?.image,
    store?.img
  ]);
  return paths.some(value => {
    const src = clean(value);
    if (!src) return false;
    if (/^assets\/store\d+\.(?:jpg|jpeg|png|webp)$/i.test(src)) return false;
    if (/사진\s*준비\s*중/i.test(src)) return false;
    return true;
  });
}

async function exists(filePath) {
  try { await fs.access(filePath); return true; } catch { return false; }
}

async function main() {
  if (!(await exists(MANIFEST_PATH))) {
    console.log(JSON.stringify({skipped: true, reason: `${MANIFEST_PATH} 없음`}, null, 2));
    return;
  }

  const stores = JSON.parse(await fs.readFile(STORES_PATH, 'utf8'));
  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
  const folders = Array.isArray(manifest) ? manifest : (manifest.folders || []);
  const duplicateSha = new Set((manifest.duplicateGroups || []).map(group => clean(group.sha256)).filter(Boolean));

  const byTitle = new Map();
  for (const store of stores) {
    const key = normalize(store?.name);
    if (!key) continue;
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key).push(store);
  }

  const report = {
    startedAt: new Date().toISOString(),
    policy: 'fill-missing-only-from-notion-html-export; exact-display-title; never-overwrite-existing-photo',
    storeCount: stores.length,
    manifestFolderCount: folders.length,
    applied: [],
    skippedExistingPhoto: [],
    unmatchedFolders: [],
    ambiguousFolders: [],
    missingFiles: []
  };

  for (const folder of folders) {
    const folderName = stripCopySuffix(folder?.folderName || folder?.notionExportTitle || '');
    const candidates = byTitle.get(normalize(folderName)) || [];
    if (!candidates.length) {
      report.unmatchedFolders.push({folderName});
      continue;
    }
    if (candidates.length !== 1) {
      report.ambiguousFolders.push({folderName, stores: candidates.map(store => store.name)});
      continue;
    }

    const store = candidates[0];
    if (hasRealPhoto(store)) {
      report.skippedExistingPhoto.push({folderName, store: store.name});
      continue;
    }

    const images = [];
    for (const raw of folder.images || []) {
      const src = clean(raw?.src || raw?.card || raw?.url || raw);
      if (!src) continue;
      if (!(await exists(src))) {
        report.missingFiles.push({folderName, store: store.name, src});
        continue;
      }
      images.push({card: src, detail: src, sha256: clean(raw?.sha256)});
    }
    const deduped = [];
    const seen = new Set();
    for (const image of images) {
      if (seen.has(image.card)) continue;
      seen.add(image.card);
      deduped.push(image);
    }
    if (!deduped.length) continue;

    store.images = deduped.slice(0, 4).map(({card, detail}) => ({card, detail}));
    store.image = store.images[0].card;
    store.img = store.image;
    const firstSha = clean((folder.images || [])[0]?.sha256);
    store.photoGroup = firstSha && duplicateSha.has(firstSha)
      ? `notion-shared:${firstSha.slice(0, 12)}`
      : `notion-store:${store.id || normalize(store.name)}`;
    store.photoSource = 'notion-export-supplement';
    report.applied.push({folderName, store: store.name, imageCount: store.images.length, photoGroup: store.photoGroup});
  }

  report.finishedAt = new Date().toISOString();
  report.appliedStoreCount = report.applied.length;
  report.skippedExistingPhotoCount = report.skippedExistingPhoto.length;
  report.unmatchedFolderCount = report.unmatchedFolders.length;
  report.ambiguousFolderCount = report.ambiguousFolders.length;
  report.missingFileCount = report.missingFiles.length;

  await fs.mkdir(path.dirname(REPORT_PATH), {recursive: true});
  await fs.writeFile(STORES_PATH, `${JSON.stringify(stores, null, 2)}\n`, 'utf8');
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    stores: report.storeCount,
    notionPhotoFolders: report.manifestFolderCount,
    appliedMissingStores: report.appliedStoreCount,
    preservedExistingPhotos: report.skippedExistingPhotoCount,
    unmatchedFolders: report.unmatchedFolderCount,
    ambiguousFolders: report.ambiguousFolderCount,
    missingFiles: report.missingFileCount
  }, null, 2));
}

main().catch(error => { console.error(error); process.exit(1); });
