import fs from 'node:fs/promises';
import path from 'node:path';

const STORES_PATH = process.env.STORES_PATH || 'data/stores.json';
const MANIFEST_PATH = process.env.PHOTO_MANIFEST_PATH || 'data/photo-manifest.json';
const REPORT_PATH = process.env.PHOTO_APPLY_REPORT_PATH || 'data/photo-apply-report.json';
const REVIEW_PATH = process.env.PHOTO_REVIEW_PATH || 'data/photo-match-review.json';
const BACKUP_PATH = process.env.PHOTO_APPLY_BACKUP_PATH || 'data/stores.before-photo-apply.json';

const clean = value => String(value ?? '').normalize('NFKC').trim();
const unique = values => [...new Set(values.flat(Infinity).map(clean).filter(Boolean))];
const STOP_WORDS = new Set(['여수','여수시','가게','매장','사진','사진모음','사진파일','음식사진','배달','배달전문점','전문점','공산소','전화','자동주문','준비중','복사본','사본','copy']);

const LOCATION_ALIASES = [
  ['여서','여서동'], ['문수','문수동'], ['미평','미평동'], ['국동'], ['봉산','봉산동'],
  ['웅천','웅천동'], ['학동'], ['신기','신기동'], ['무선','선원','화장','화장동'], ['죽림'],
  ['돌산'], ['교동'], ['중앙','중앙동'], ['충무','충무동'], ['공화','공화동'],
  ['덕충','덕충동','엑스포'], ['소호','소호동'], ['둔덕','둔덕동'], ['봉계','봉계동'],
  ['율촌'], ['여천'], ['오림','오림동'], ['서교','서교동'], ['광무','광무동'],
  ['고소','고소동'], ['종화','종화동'], ['신월','신월동'], ['월호','월호동'],
  ['안산','안산동'], ['관문','관문동'], ['남산','남산동'], ['연등','연등동'],
  ['동문','동문동'], ['만흥','만흥동'], ['주삼','주삼동'], ['삼일','삼일동'], ['봉강','봉강동']
];

const BRANDS = [
  ['60계치킨',['60계치킨','60계']], ['BBQ',['bbq','비비큐']], ['BHC',['bhc']],
  ['교촌치킨',['교촌치킨','교촌']], ['굽네치킨',['굽네치킨','굽네']], ['맘스터치',['맘스터치']],
  ['롯데리아',['롯데리아']], ['배스킨라빈스',['배스킨라빈스','베스킨라빈스','배라']],
  ['처갓집양념치킨',['처갓집양념치킨','처갓집']], ['페리카나',['페리카나']],
  ['네네치킨',['네네치킨','네네']], ['멕시카나',['멕시카나']], ['호식이두마리치킨',['호식이두마리치킨','호식이']],
  ['티바두마리치킨',['티바두마리치킨','티바']], ['푸라닭',['푸라닭']], ['자담치킨',['자담치킨']],
  ['가마치통닭',['가마치통닭','가마치']], ['피자스쿨',['피자스쿨']], ['피자나라치킨공주',['피자나라치킨공주','피나치공']],
  ['도미노피자',['도미노피자','도미노']], ['피자헛',['피자헛']], ['미스터피자',['미스터피자']],
  ['반올림피자샵',['반올림피자샵','반올림피자']], ['청년피자',['청년피자']],
  ['메가MGC커피',['메가mgc커피','메가커피']], ['컴포즈커피',['컴포즈커피']], ['빽다방',['빽다방']],
  ['이디야커피',['이디야커피','이디야']], ['투썸플레이스',['투썸플레이스','투썸']], ['파리바게뜨',['파리바게뜨','파리바게트']],
  ['본죽',['본죽']], ['신전떡볶이',['신전떡볶이']], ['엽기떡볶이',['동대문엽기떡볶이','엽기떡볶이']],
  ['홍콩반점',['홍콩반점']], ['탕화쿵푸마라탕',['탕화쿵푸마라탕','탕화쿵푸']],
  ['공차',['공차']], ['더벤티',['더벤티']], ['요아정',['카페요아정','요아정']], ['던킨',['던킨']], ['두찜',['두마리찜닭두찜','두찜']]
].map(([key, aliases]) => ({key, aliases: aliases.map(value => normalize(value))}));

function stripNoise(value) {
  return clean(value)
    .replace(/\b(?:0?61[-\s]?\d{3,4}[-\s]?\d{4}|01\d[-\s]?\d{3,4}[-\s]?\d{4})\b/g, ' ')
    .replace(/\s*[\(（]\s*\d+\s*[\)）]\s*$/u, ' ')
    .replace(/\s*(?:[-_–—]\s*)?(?:복사본|사본|copy)(?:\s*\d+)?\s*$/iu, ' ')
    .replace(/(?:가게|매장)?\s*사진(?:모음|파일)?/gi, ' ')
    .replace(/배달\s*(?:전문점?|전문)/g, ' ')
    .replace(/공산소/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalize(value) {
  return stripNoise(value)
    .toLowerCase()
    .replace(/여수시|여수/g, '')
    .replace(/[()（）\[\]{}<>·ㆍ,.!?\'"`~@#$%^&*_+=|\\/:;\-–—]/g, '')
    .replace(/\s+/g, '');
}

function tokens(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[()（）\[\]{}<>·ㆍ,.!?\'"`~@#$%^&*_+=|\\/:;\-–—]/g, ' ')
    .split(/\s+/)
    .map(token => token.replace(/\d+$/,'').trim())
    .filter(token => token.length >= 2 && !STOP_WORDS.has(token));
}

function locationTokens(value) {
  const text = normalize(value);
  const result = new Set();
  for (const aliases of LOCATION_ALIASES) {
    if (aliases.some(alias => text.includes(normalize(alias)))) result.add(normalize(aliases[0]));
  }
  return result;
}

function brandOf(value) {
  const text = normalize(value);
  for (const brand of BRANDS) if (brand.aliases.some(alias => text.includes(alias))) return brand.key;
  return '';
}

function dice(a, b) {
  const left = normalize(a), right = normalize(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.length < 2 || right.length < 2) return 0;
  const grams = text => {
    const map = new Map();
    for (let i = 0; i < text.length - 1; i += 1) {
      const gram = text.slice(i, i + 2);
      map.set(gram, (map.get(gram) || 0) + 1);
    }
    return map;
  };
  const A = grams(left), B = grams(right);
  let common = 0;
  for (const [gram, count] of A) common += Math.min(count, B.get(gram) || 0);
  const totalA = [...A.values()].reduce((sum, count) => sum + count, 0);
  const totalB = [...B.values()].reduce((sum, count) => sum + count, 0);
  return (2 * common) / Math.max(1, totalA + totalB);
}

function tokenScore(a, b) {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (!A.size || !B.size) return 0;
  const common = [...A].filter(token => B.has(token)).length;
  return common / Math.max(A.size, B.size);
}

function storeAliases(store) {
  return unique([
    store.name,
    store.realBusinessName,
    ...(store.shopInShopNames || []),
    ...(store.searchTerms || [])
  ]).filter(alias => normalize(alias).length >= 3 && !STOP_WORDS.has(normalize(alias)));
}

function branchCompatible(folderName, store) {
  const folderLocations = locationTokens(folderName);
  const storeLocations = locationTokens([store.name, store.realBusinessName, store.district, store.area].join(' '));
  if (folderLocations.size && storeLocations.size && ![...folderLocations].some(token => storeLocations.has(token))) return false;
  return true;
}

function scoreFolder(folderName, store) {
  if (!branchCompatible(folderName, store)) return {score: 0, reason: 'branch-conflict'};
  const folderBrand = brandOf(folderName);
  const storeBrand = brandOf([store.name, store.realBusinessName].join(' '));
  if (folderBrand && storeBrand && folderBrand !== storeBrand) return {score: 0, reason: 'brand-conflict'};

  let best = 0;
  let reason = '';
  for (const alias of storeAliases(store)) {
    const folder = normalize(folderName);
    const target = normalize(alias);
    if (!folder || !target) continue;
    let score = 0;
    let currentReason = '';
    if (folder === target) {
      score = 100;
      currentReason = 'exact-alias';
    } else if ((folder.includes(target) || target.includes(folder)) && Math.min(folder.length, target.length) >= 4) {
      const ratio = Math.min(folder.length, target.length) / Math.max(folder.length, target.length);
      score = 86 + ratio * 11;
      currentReason = 'strong-containment';
    } else {
      const d = dice(folderName, alias);
      const t = tokenScore(folderName, alias);
      score = Math.max(d * 92, t * 94);
      currentReason = d * 92 >= t * 94 ? 'bigram-similarity' : 'token-overlap';
    }
    if (score > best) {
      best = score;
      reason = currentReason;
    }
  }

  const folderLocations = locationTokens(folderName);
  const storeLocations = locationTokens([store.name, store.realBusinessName, store.district, store.area].join(' '));
  if (folderLocations.size && !storeLocations.size) best -= 6;
  if (folderBrand && !storeBrand) best -= 8;
  return {score: Math.max(0, Math.min(100, Math.round(best * 10) / 10)), reason};
}

function normalizeImages(folder) {
  return unique((folder.images || []).map(item => item?.src || item?.card || item?.url || item)).map(src => ({card: src, detail: src}));
}

function rotate(values, offset) {
  if (!values.length) return values;
  const index = ((offset % values.length) + values.length) % values.length;
  return [...values.slice(index), ...values.slice(0, index)];
}

function stableHash(value) {
  let hash = 2166136261;
  for (const char of clean(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

async function main() {
  const stores = JSON.parse(await fs.readFile(STORES_PATH, 'utf8'));
  const manifestData = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
  const folders = Array.isArray(manifestData) ? manifestData : (manifestData.folders || []);

  const report = {
    startedAt: new Date().toISOString(),
    policy: 'smart-safe-alias-branch-brand-match',
    storeCount: stores.length,
    manifestFolderCount: folders.length,
    autoMatched: [],
    brandPools: [],
    reviewNeeded: [],
    unmatchedFolders: [],
    updatedStores: [],
    unchangedStores: []
  };

  const directByStoreId = new Map();
  const brandPools = new Map();

  for (const folder of folders) {
    const images = normalizeImages(folder);
    if (!images.length) continue;
    const folderBrand = brandOf(folder.folderName);
    const folderLocations = locationTokens(folder.folderName);

    if (folderBrand && !folderLocations.size) {
      brandPools.set(folderBrand, [...(brandPools.get(folderBrand) || []), ...images]);
      continue;
    }

    const ranked = stores
      .map(store => ({store, ...scoreFolder(folder.folderName, store)}))
      .filter(item => item.score >= 72)
      .sort((a, b) => b.score - a.score || clean(a.store.name).localeCompare(clean(b.store.name), 'ko'));

    const best = ranked[0];
    const second = ranked[1];
    if (!best) {
      report.unmatchedFolders.push({folderName: folder.folderName, imageCount: images.length});
      continue;
    }

    const margin = best.score - (second?.score || 0);
    const safeAuto = best.score >= 96 || (best.score >= 88 && margin >= 5) || (best.score >= 84 && margin >= 9);
    if (!safeAuto) {
      report.reviewNeeded.push({
        folderName: folder.folderName,
        imageCount: images.length,
        candidates: ranked.slice(0, 5).map(item => ({store: item.store.name, storeId: item.store.id, score: item.score, reason: item.reason}))
      });
      continue;
    }

    const current = directByStoreId.get(String(best.store.id)) || [];
    directByStoreId.set(String(best.store.id), [...current, ...images]);
    report.autoMatched.push({folderName: folder.folderName, store: best.store.name, storeId: best.store.id, score: best.score, margin, reason: best.reason, imageCount: images.length});
  }

  for (const [brand, rawImages] of brandPools) {
    const seen = new Set();
    const images = rawImages.filter(image => image.card && !seen.has(image.card) && seen.add(image.card)).slice(0, 24);
    const brandStores = stores.filter(store => brandOf([store.name, store.realBusinessName].join(' ')) === brand);
    if (!images.length || brandStores.length < 2) continue;
    brandStores.sort((a,b) => clean(a.id || a.name).localeCompare(clean(b.id || b.name), 'ko'));
    brandStores.forEach((store, index) => {
      if (directByStoreId.has(String(store.id))) return;
      store.images = rotate(images, index).slice(0, Math.min(6, images.length));
      store.image = store.images[0]?.card || '';
      store.img = store.image;
      store.photoGroup = `brand:${brand}`;
      store.photoSource = 'smart-brand-pool';
    });
    report.brandPools.push({brand, storeCount: brandStores.length, imageCount: images.length, stores: brandStores.map(store => store.name)});
  }

  for (const store of stores) {
    const direct = directByStoreId.get(String(store.id));
    if (direct?.length) {
      const seen = new Set();
      const images = direct.filter(image => image.card && !seen.has(image.card) && seen.add(image.card)).slice(0, 8);
      const offset = stableHash(`${store.id}|${store.name}`) % images.length;
      store.images = rotate(images, offset);
      store.image = store.images[0]?.card || '';
      store.img = store.image;
      store.photoGroup = `store:${store.id}`;
      store.photoSource = 'smart-safe-match';
    }
    if (Array.isArray(store.images) && store.images.length) report.updatedStores.push({store: store.name, storeId: store.id, imageCount: store.images.length, photoGroup: store.photoGroup || ''});
    else report.unchangedStores.push({store: store.name, storeId: store.id});
  }

  report.finishedAt = new Date().toISOString();
  report.autoMatchedCount = report.autoMatched.length;
  report.reviewNeededCount = report.reviewNeeded.length;
  report.unmatchedFolderCount = report.unmatchedFolders.length;
  report.updatedStoreCount = report.updatedStores.length;
  report.coverageRate = stores.length ? Math.round((report.updatedStoreCount / stores.length) * 1000) / 10 : 0;

  await fs.mkdir(path.dirname(REPORT_PATH), {recursive: true});
  await fs.copyFile(STORES_PATH, BACKUP_PATH);
  await fs.writeFile(STORES_PATH, `${JSON.stringify(stores, null, 2)}\n`, 'utf8');
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(REVIEW_PATH, `${JSON.stringify({createdAt: report.finishedAt, reviewNeeded: report.reviewNeeded, unmatchedFolders: report.unmatchedFolders}, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({stores: stores.length, folders: folders.length, autoMatched: report.autoMatchedCount, updatedStores: report.updatedStoreCount, coverageRate: report.coverageRate, reviewNeeded: report.reviewNeededCount, unmatchedFolders: report.unmatchedFolderCount}, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
