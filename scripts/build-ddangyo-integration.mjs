import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const sourceDir = path.resolve('ddangyo-shop-data-output');
const outputDir = path.resolve('ddangyo-integration-output');
await fs.rm(outputDir, {recursive: true, force: true});
await fs.mkdir(outputDir, {recursive: true});

const extracted = JSON.parse(await fs.readFile(path.join(sourceDir, 'normalized-all.json'), 'utf8'));

function deterministicNewStoreId(patstoNo) {
  return crypto.createHash('sha256').update(`ddangyo:${patstoNo}`).digest('hex').slice(0, 16);
}

function targetStoreId(row) {
  if (row?.match?.status === 'existing' && row.match.storeId) return String(row.match.storeId);
  if (row?.match?.status === 'new') return deterministicNewStoreId(row.patstoNo);
  throw new Error(`unresolved store cannot be built: ${row?.patstoNo} ${row?.name}`);
}

function clean(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function unique(values) {
  return [...new Set((values || []).map(value => String(value || '').trim()).filter(Boolean))];
}

function menuItem(item) {
  return {
    id: String(item.id || ''),
    name: clean(item.name),
    description: clean(item.description),
    category: clean(item.category) || '기타',
    image: String(item.image || '').trim(),
    ...(item.alcohol ? {adultOnly: true} : {})
  };
}

function genericMenuCategory(value) {
  const category = clean(value);
  return !category
    || category === '전체'
    || category === '기타'
    || /대표|인기|추천/.test(category);
}

function menuIdentity(raw, item) {
  const sourceMenuId = clean(raw?.sourceMenuId);
  if (sourceMenuId) return `source:${sourceMenuId}`;
  return `text:${clean(item.name).toLocaleLowerCase('ko-KR')}|${clean(item.description).toLocaleLowerCase('ko-KR')}`;
}

function deduplicateMenuItems(rawItems) {
  const orderedKeys = [];
  const byKey = new Map();

  for (const raw of Array.isArray(rawItems) ? rawItems : []) {
    const item = menuItem(raw);
    if (!item.name) continue;
    const key = menuIdentity(raw, item);
    const existing = byKey.get(key);
    if (!existing) {
      orderedKeys.push(key);
      byKey.set(key, item);
      continue;
    }

    const existingGeneric = genericMenuCategory(existing.category);
    const incomingGeneric = genericMenuCategory(item.category);
    if (existingGeneric && !incomingGeneric) {
      byKey.set(key, {
        ...item,
        description: item.description || existing.description,
        image: item.image || existing.image,
        ...(item.adultOnly || existing.adultOnly ? {adultOnly: true} : {})
      });
      continue;
    }

    byKey.set(key, {
      ...existing,
      description: existing.description || item.description,
      image: existing.image || item.image,
      ...(existing.adultOnly || item.adultOnly ? {adultOnly: true} : {})
    });
  }

  return orderedKeys.map(key => byKey.get(key));
}

function orderedCategories(sourceCategories, items) {
  const used = new Set(items.map(item => clean(item.category)).filter(Boolean));
  const sourceOrder = unique(sourceCategories)
    .filter(category => category !== '전체' && used.has(category));
  const remaining = [...used].filter(category => !sourceOrder.includes(category));
  return ['전체', ...sourceOrder, ...remaining];
}

const menuMap = {};
const enrichmentStores = [];
const seenStoreIds = new Set();
const seenPatsto = new Set();
let totalRawMenuItems = 0;
let totalRawMenuImages = 0;
let totalMenuItems = 0;
let totalMenuImages = 0;
let existingCount = 0;
let newCount = 0;

for (const row of extracted) {
  if (row.error) throw new Error(`extraction failure remains: ${row.patstoNo} ${row.error}`);
  if (!['existing', 'new'].includes(row?.match?.status)) {
    throw new Error(`review decision remains: ${row.patstoNo} ${row.name}`);
  }

  const patstoNo = String(row.patstoNo || '');
  const storeId = targetStoreId(row);
  if (!patstoNo || seenPatsto.has(patstoNo)) throw new Error(`duplicate patsto number: ${patstoNo}`);
  if (!storeId || seenStoreIds.has(storeId)) throw new Error(`duplicate target store id: ${storeId}`);
  seenPatsto.add(patstoNo);
  seenStoreIds.add(storeId);

  const rawItems = Array.isArray(row.items) ? row.items : [];
  const items = deduplicateMenuItems(rawItems);
  const categories = orderedCategories(row.categories || [], items);
  const mainImage = String(row.mainImage || items.find(item => item.image)?.image || '').trim();
  const menu = {
    storeId,
    storeName: clean(row.name),
    displayName: clean(row.name),
    mainImage,
    categories,
    items,
    source: {
      type: 'ddangyo',
      patstoNo,
      sourceUrls: unique(row.sourceUrls),
      rawItemCount: rawItems.length,
      duplicateItemsRemoved: rawItems.length - items.length
    }
  };

  const menuDir = path.join(outputDir, 'store-menu-content', storeId);
  await fs.mkdir(menuDir, {recursive: true});
  await fs.writeFile(path.join(menuDir, 'menu.json'), JSON.stringify(menu, null, 2));

  menuMap[storeId] = {
    path: `store-menu-content/${storeId}/menu.json`,
    entryImage: mainImage,
    itemCount: items.length
  };

  const isNew = row.match.status === 'new';
  if (isNew) newCount += 1;
  else existingCount += 1;

  const phone = String(row.phone || '').replace(/\D/g, '');
  const approvedPhone = /^0\d{8,10}$/.test(phone) && row.phoneSource === 'ddangyo' ? phone : '';

  enrichmentStores.push({
    targetStoreId: storeId,
    isNew,
    patstoNo,
    name: clean(row.name),
    address: clean(row.address),
    latitude: String(row.latitude || ''),
    longitude: String(row.longitude || ''),
    category: clean(row.category) || '치킨',
    mainImage,
    shopImages: unique(row.shopImages).slice(0, 3),
    ddangyoUrl: unique(row.sourceUrls)[0] || '',
    phone: approvedPhone,
    phoneSource: approvedPhone ? 'ddangyo' : '',
    naverMap: '',
    naverEligible: row.naverEligible !== false && row.match.naverEligible !== false,
    sourceMatch: row.match
  });

  totalRawMenuItems += rawItems.length;
  totalRawMenuImages += rawItems.filter(item => item.image).length;
  totalMenuItems += items.length;
  totalMenuImages += items.filter(item => item.image).length;
}

const enrichment = {
  schemaVersion: 1,
  batchId: 'ddangyo-chicken-batch-01',
  generatedAt: new Date().toISOString(),
  policy: {
    mode: 'add-missing-only',
    identity: 'verified-address-and-existing-store-id',
    phonePriority: ['ddangyo', 'mukkebi', 'naver'],
    prohibitedPhoneSources: ['yogiyo', 'coupang-eats', 'baemin'],
    naver: 'exact-store-and-address-only',
    pricesVisible: false,
    duplicateMenuPolicy: 'same source menu id appears once; prefer specific category over representative category'
  },
  stores: enrichmentStores
};

await fs.mkdir(path.join(outputDir, 'data'), {recursive: true});
await fs.writeFile(
  path.join(outputDir, 'data', 'ddangyo-store-enrichment.json'),
  JSON.stringify(enrichment, null, 2)
);

await fs.writeFile(
  path.join(outputDir, 'store-menu-content', 'ddangyo-menu-map.js'),
  `'use strict';\nwindow.DAEDONG_DDANGYO_MENU_STORES = Object.freeze(${JSON.stringify(menuMap, null, 2)});\n`
);

const summary = {
  generatedAt: enrichment.generatedAt,
  stores: enrichmentStores.length,
  existingStores: existingCount,
  newStores: newCount,
  unresolvedStores: 0,
  menuFiles: Object.keys(menuMap).length,
  rawMenuItems: totalRawMenuItems,
  duplicateMenuItemsRemoved: totalRawMenuItems - totalMenuItems,
  totalMenuItems,
  rawMenuImages: totalRawMenuImages,
  duplicateMenuImagesRemoved: totalRawMenuImages - totalMenuImages,
  totalMenuImages,
  pricesIncluded: false,
  phoneValuesIncluded: enrichmentStores.filter(row => row.phone).length,
  naverValuesIncluded: enrichmentStores.filter(row => row.naverMap).length,
  duplicateStoreIds: enrichmentStores.length - seenStoreIds.size,
  duplicatePatstoNumbers: enrichmentStores.length - seenPatsto.size
};

await fs.writeFile(path.join(outputDir, 'integration-summary.json'), JSON.stringify(summary, null, 2));
await fs.writeFile(
  path.join(outputDir, 'new-stores.json'),
  JSON.stringify(enrichmentStores.filter(row => row.isNew), null, 2)
);
await fs.writeFile(
  path.join(outputDir, 'existing-stores.json'),
  JSON.stringify(enrichmentStores.filter(row => !row.isNew), null, 2)
);

if (summary.stores !== 73) throw new Error(`expected 73 stores, got ${summary.stores}`);
if (summary.existingStores !== 46) throw new Error(`expected 46 existing stores, got ${summary.existingStores}`);
if (summary.newStores !== 27) throw new Error(`expected 27 new stores, got ${summary.newStores}`);
if (summary.rawMenuItems !== 4585) throw new Error(`expected 4585 raw menu items, got ${summary.rawMenuItems}`);
if (summary.duplicateMenuItemsRemoved !== 315) throw new Error(`expected 315 duplicate menu items removed, got ${summary.duplicateMenuItemsRemoved}`);
if (summary.totalMenuItems !== 4270) throw new Error(`expected 4270 unique menu items, got ${summary.totalMenuItems}`);
if (summary.rawMenuImages !== 3294) throw new Error(`expected 3294 raw menu images, got ${summary.rawMenuImages}`);
if (summary.totalMenuImages !== 2979) throw new Error(`expected 2979 unique menu images, got ${summary.totalMenuImages}`);
if (summary.duplicateStoreIds || summary.duplicatePatstoNumbers) throw new Error('duplicate identity detected');

console.log(JSON.stringify(summary, null, 2));
