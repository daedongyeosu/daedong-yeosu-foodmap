import fs from 'node:fs/promises';
import path from 'node:path';

const DB_PATH = process.env.STORES_PATH || 'data/stores.json';
const REPORT_PATH = process.env.STORE_DEDUP_REPORT_PATH || 'data/store-dedup-report.json';
const BACKUP_PATH = process.env.STORE_DEDUP_BACKUP_PATH || 'data/stores.before-dedup.json';
const APPLY_CHANGES = !/^(0|false|no)$/i.test(String(process.env.APPLY_CHANGES ?? 'true'));

const clean = value => String(value ?? '').trim();

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

function hasCopySuffix(value) {
  const original = clean(value);
  return Boolean(original) && stripCopySuffix(original) !== original;
}

function normalize(value, {stripCopy = true} = {}) {
  const source = stripCopy ? stripCopySuffix(value) : clean(value);
  return source
    .toLowerCase()
    .replace(/여수시/g, '')
    .replace(/[()（）\[\]{}<>·ㆍ,.!?\'"`~@#$%^&*_+=|\\/:;\-–—]/g, '')
    .replace(/\s+/g, '');
}

function uniqueStrings(values) {
  const seen = new Set();
  const output = [];
  for (const value of values.flat(Infinity)) {
    const text = clean(value);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(text);
  }
  return output;
}

function routeKey(route) {
  const name = clean(route?.name);
  const url = clean(route?.url);
  const hay = `${name} ${url}`;
  if (/가게\s*바로|바로\s*주문|자동\s*접수|직접\s*주문/i.test(hay)) return 'direct';
  if (/먹깨비/i.test(hay)) return 'mukkebi';
  if (/땡겨요/i.test(hay)) return 'ddangyo';
  if (/요기요|yogiyo/i.test(hay)) return 'yogiyo';
  if (/쿠팡|coupang/i.test(hay)) return 'coupang';
  if (/배달의\s*민족|배민|baemin/i.test(hay)) return 'baemin';
  if (/chak|섬섬페이|지역상품권/i.test(hay)) return 'chak';
  if (/네이버|naver\.me|map\.naver/i.test(hay)) return 'naver';
  if (/^tel:/i.test(url) || /전화|통화|tel/i.test(hay)) return 'phone';
  return `other:${normalize(name, {stripCopy: false})}:${url}`;
}

function isGenericField(field, value) {
  const text = clean(value).toLowerCase();
  if (!text) return true;
  if (field === 'district') return ['여수', '여수시', '미정', '기타'].includes(text);
  if (field === 'category') return ['음식점', '기타', '미분류', ''].includes(text);
  if (field === 'managementStatus') return ['unconfirmed', 'unknown', '미확인'].includes(text);
  return false;
}

function validRouteCount(store) {
  const keys = new Set();
  for (const route of store?.routes || []) {
    if (!clean(route?.url)) continue;
    keys.add(routeKey(route));
  }
  return keys.size;
}

function completenessScore(record) {
  const store = record.store;
  let score = validRouteCount(store) * 12;
  if (clean(store.phone)) score += 5;
  if (clean(store.naverMap)) score += 5;
  if (clean(store.image)) score += 4;
  if (clean(store.address)) score += 3;
  if (!isGenericField('district', store.district)) score += 3;
  if (!isGenericField('category', store.category)) score += 3;
  if ((store.categories || []).length) score += 2;
  if (store.managed) score += 12;
  if (store.sharedManaged) score += 6;
  if (!isGenericField('managementStatus', store.managementStatus)) score += 2;
  if (clean(store.notionPageId)) score += 2;
  if (clean(store.notionUrl)) score += 1;
  if (!hasCopySuffix(store.name)) score += 4;
  return score;
}

function latestTime(store) {
  const value = Date.parse(store?.notionSyncedAt || store?.updatedAt || 0);
  return Number.isFinite(value) ? value : 0;
}

function pickPrimary(records) {
  return [...records].sort((a, b) => {
    const scoreDiff = completenessScore(b) - completenessScore(a);
    if (scoreDiff) return scoreDiff;
    const cleanDiff = Number(hasCopySuffix(a.store.name)) - Number(hasCopySuffix(b.store.name));
    if (cleanDiff) return cleanDiff;
    const timeDiff = latestTime(b.store) - latestTime(a.store);
    if (timeDiff) return timeDiff;
    return a.index - b.index;
  })[0];
}

function canonicalDisplayName(records, primary) {
  const unsuffixed = records
    .filter(record => !hasCopySuffix(record.store.name))
    .sort((a, b) => completenessScore(b) - completenessScore(a) || a.index - b.index);
  return clean(unsuffixed[0]?.store?.name) || stripCopySuffix(primary.store.name) || clean(primary.store.name);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeRoutes(records, primaryId) {
  const ordered = [
    ...records.filter(record => record.store.id === primaryId),
    ...records.filter(record => record.store.id !== primaryId)
      .sort((a, b) => completenessScore(b) - completenessScore(a) || a.index - b.index)
  ];
  const routes = new Map();
  const added = [];
  const conflicts = [];

  for (const record of ordered) {
    for (const route of record.store.routes || []) {
      const url = clean(route?.url);
      if (!url) continue;
      const key = routeKey(route);
      const existing = routes.get(key);
      if (!existing) {
        routes.set(key, clone(route));
        if (record.store.id !== primaryId) added.push({key, from: record.store.name, url});
        continue;
      }
      if (clean(existing.url) === url) {
        existing.enabled = existing.enabled !== false || route.enabled !== false;
        if (!existing.source && route.source) existing.source = route.source;
        continue;
      }
      conflicts.push({
        key,
        keptUrl: clean(existing.url),
        otherUrl: url,
        otherStore: record.store.name
      });
    }
  }
  return {routes: [...routes.values()], added, conflicts};
}

function mergeEvents(records) {
  const seen = new Set();
  const events = [];
  for (const record of records) {
    for (const event of record.store.events || []) {
      const key = JSON.stringify(event);
      if (seen.has(key)) continue;
      seen.add(key);
      events.push(clone(event));
    }
  }
  return events;
}

function mergeGroup(records, groupKey) {
  const primaryRecord = pickPrimary(records);
  const primary = clone(primaryRecord.store);
  const canonicalName = canonicalDisplayName(records, primaryRecord);
  const filledFields = [];
  const scalarFields = ['address', 'phone', 'naverMap', 'image', 'district', 'category', 'managementStatus'];

  for (const field of scalarFields) {
    const currentIsWeak = isGenericField(field, primary[field]);
    if (!currentIsWeak) continue;
    const candidate = records
      .filter(record => record.store.id !== primary.id)
      .sort((a, b) => completenessScore(b) - completenessScore(a) || a.index - b.index)
      .find(record => !isGenericField(field, record.store[field]));
    if (!candidate) continue;
    primary[field] = clone(candidate.store[field]);
    filledFields.push({field, from: candidate.store.name});
  }

  primary.name = canonicalName;
  const realName = stripCopySuffix(primary.realBusinessName || '');
  primary.realBusinessName = realName || canonicalName;
  primary.managed = records.some(record => Boolean(record.store.managed));
  primary.sharedManaged = records.some(record => Boolean(record.store.sharedManaged));
  primary.forceBottom = records.some(record => Boolean(record.store.forceBottom));
  if (primary.pinPosition == null) {
    const pinSource = records.find(record => record.store.pinPosition != null);
    if (pinSource) primary.pinPosition = clone(pinSource.store.pinPosition);
  }

  const routeMerge = mergeRoutes(records, primary.id);
  primary.routes = routeMerge.routes;
  primary.events = mergeEvents(records);
  primary.categories = uniqueStrings(records.map(record => record.store.categories || []));
  if (!primary.categories.length && clean(primary.category)) primary.categories = [primary.category];

  primary.shopInShopNames = uniqueStrings(records.map(record => record.store.shopInShopNames || []))
    .filter(name => normalize(name) !== groupKey);

  const originalNames = uniqueStrings(records.flatMap(record => [
    record.store.name,
    record.store.realBusinessName,
    ...(record.store.searchTerms || [])
  ]));
  primary.searchTerms = uniqueStrings([
    primary.searchTerms || [],
    originalNames,
    canonicalName,
    primary.realBusinessName,
    primary.district,
    primary.category,
    primary.categories || []
  ]);

  const notionIds = uniqueStrings(records.map(record => record.store.notionPageId));
  const notionUrls = uniqueStrings(records.map(record => record.store.notionUrl));
  primary.notionPageAliases = notionIds.filter(id => id !== clean(primary.notionPageId));
  primary.notionUrlAliases = notionUrls.filter(url => url !== clean(primary.notionUrl));
  const latestSynced = records
    .map(record => clean(record.store.notionSyncedAt))
    .filter(Boolean)
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];
  if (latestSynced) primary.notionSyncedAt = latestSynced;
  primary.deduplicatedAt = new Date().toISOString();
  primary.deduplicatedFrom = uniqueStrings(records.map(record => record.store.id)).filter(id => id !== clean(primary.id));

  return {
    store: primary,
    primaryRecord,
    canonicalName,
    filledFields,
    addedRoutes: routeMerge.added,
    routeConflicts: routeMerge.conflicts
  };
}

async function main() {
  const stores = JSON.parse(await fs.readFile(DB_PATH, 'utf8'));
  if (!Array.isArray(stores)) throw new Error(`${DB_PATH} 형식이 배열이 아닙니다.`);

  const grouped = new Map();
  stores.forEach((store, index) => {
    const key = normalize(store?.name || store?.realBusinessName || '');
    if (!key) return;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push({store, index});
  });

  const mergeable = new Map();
  const suspiciousGroups = [];
  for (const [key, records] of grouped) {
    if (records.length < 2) continue;
    const hasExplicitCopy = records.some(record => hasCopySuffix(record.store.name));
    const exactNames = records.map(record => normalize(record.store.name, {stripCopy: false}));
    const hasExactDuplicate = new Set(exactNames).size < exactNames.length;
    if (hasExplicitCopy || hasExactDuplicate) mergeable.set(key, records);
    else suspiciousGroups.push({
      key,
      names: records.map(record => record.store.name),
      reason: '복사본 표시는 없지만 정규화한 이름이 같음 — 자동 통합하지 않음'
    });
  }

  const mergedByKey = new Map();
  const groupReports = [];
  let removedCount = 0;
  for (const [key, records] of mergeable) {
    const result = mergeGroup(records, key);
    mergedByKey.set(key, result.store);
    removedCount += records.length - 1;
    groupReports.push({
      key,
      canonicalName: result.canonicalName,
      primary: {
        id: result.primaryRecord.store.id,
        originalName: result.primaryRecord.store.name,
        score: completenessScore(result.primaryRecord),
        notionPageId: result.primaryRecord.store.notionPageId || ''
      },
      merged: records
        .filter(record => record.store.id !== result.primaryRecord.store.id)
        .map(record => ({
          id: record.store.id,
          name: record.store.name,
          score: completenessScore(record),
          notionPageId: record.store.notionPageId || ''
        })),
      filledFields: result.filledFields,
      addedRoutes: result.addedRoutes,
      routeConflicts: result.routeConflicts
    });
  }

  const emitted = new Set();
  const output = [];
  for (const store of stores) {
    const key = normalize(store?.name || store?.realBusinessName || '');
    if (!mergeable.has(key)) {
      output.push(store);
      continue;
    }
    if (emitted.has(key)) continue;
    emitted.add(key);
    output.push(mergedByKey.get(key));
  }

  const report = {
    startedAt: new Date().toISOString(),
    mode: APPLY_CHANGES ? 'apply' : 'report-only',
    rules: {
      autoMerge: '끝의 (1), (2), (3), 복사본, 사본, copy 또는 완전히 같은 가게명',
      safeGuard: '복사본 표시 없이 구두점만 다른 후보는 자동 통합하지 않음',
      primarySelection: '주문경로·전화·지도·사진·분류 정보 완성도가 높은 항목 우선, 동점이면 원본 이름 우선',
      routeConflict: '대표 항목의 링크를 유지하고 충돌은 보고서에 기록'
    },
    totalBefore: stores.length,
    duplicateGroupCount: groupReports.length,
    removedCount,
    totalAfter: output.length,
    groups: groupReports,
    suspiciousGroups,
    finishedAt: new Date().toISOString()
  };

  await fs.mkdir(path.dirname(REPORT_PATH), {recursive: true});
  if (APPLY_CHANGES && removedCount > 0) {
    await fs.writeFile(BACKUP_PATH, `${JSON.stringify(stores, null, 2)}\n`, 'utf8');
    await fs.writeFile(DB_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  }
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`가게 복사본 정리 완료: ${stores.length}곳 → ${output.length}곳, 중복 그룹 ${groupReports.length}개, 제거 ${removedCount}곳`);
  for (const group of groupReports.slice(0, 30)) {
    console.log(`[통합] ${group.merged.map(item => item.name).join(', ')} → ${group.canonicalName}`);
  }
  if (groupReports.length > 30) console.log(`외 ${groupReports.length - 30}개 그룹은 보고서에서 확인`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
