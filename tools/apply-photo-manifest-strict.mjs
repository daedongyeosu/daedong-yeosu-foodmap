import fs from 'node:fs/promises';
import path from 'node:path';

const STORES_PATH = process.env.STORES_PATH || 'data/stores.json';
const MANIFEST_PATH = process.env.PHOTO_MANIFEST_PATH || 'data/photo-manifest.json';
const REPORT_PATH = process.env.PHOTO_APPLY_REPORT_PATH || 'data/photo-apply-report.json';
const BACKUP_PATH = process.env.PHOTO_APPLY_BACKUP_PATH || 'data/stores.before-photo-apply.json';

const clean = value => String(value ?? '').normalize('NFKC').trim();
const unique = values => [...new Set(values.flat(Infinity).map(clean).filter(Boolean))];

function stripNoise(value) {
  return clean(value)
    .replace(/\b(?:0?61[-\s]?\d{3,4}[-\s]?\d{4}|01\d[-\s]?\d{3,4}[-\s]?\d{4})\b/g, ' ')
    .replace(/\s*[\(（]\s*\d+\s*[\)）]\s*$/u, '')
    .replace(/\s*(?:[-_–—]\s*)?(?:복사본|사본|copy)(?:\s*\d+)?\s*$/iu, '')
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

function titleTokens(value) {
  return stripNoise(value)
    .toLowerCase()
    .replace(/여수시|여수/g, ' ')
    .replace(/[()（）\[\]{}<>·ㆍ,.!?\'"`~@#$%^&*_+=|\\/:;\-–—]/g, ' ')
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token.length >= 2 && !['점','본점','가게','매장','사진','음식'].includes(token));
}

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

function locationTokens(value) {
  const text = normalize(value);
  const result = new Set();
  for (const aliases of LOCATION_ALIASES) {
    if (aliases.some(alias => text.includes(normalize(alias)))) result.add(normalize(aliases[0]));
  }
  return result;
}

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
].map(([key, aliases]) => ({key, aliases: aliases.map(normalize).sort((a,b) => b.length - a.length)}));

function brandOf(value) {
  const text = normalize(value);
  for (const brand of BRANDS) if (brand.aliases.some(alias => text.includes(alias))) return brand.key;
  return '';
}

// 사진 매칭은 오직 노션에서 가져온 고객 표시 가게명(store.name)만 사용한다.
// 실제 사업자명, 숍인숍 관계, 관리 가게 목록, 검색용 별칭은 절대 사진 매칭 근거로 쓰지 않는다.
function displayTitle(store) {
  return clean(store?.name);
}

function locationCompatible(folderName, store) {
  const folderLocations = locationTokens(folderName);
  const titleLocations = locationTokens(displayTitle(store));
  if (!folderLocations.size || !titleLocations.size) return true;
  return [...folderLocations].some(token => titleLocations.has(token));
}

function tokenOverlapScore(leftRaw, rightRaw) {
  const left = new Set(titleTokens(leftRaw));
  const right = new Set(titleTokens(rightRaw));
  if (!left.size || !right.size) return 0;
  const common = [...left].filter(token => right.has(token)).length;
  return common / Math.max(left.size, right.size);
}

function strictNameScore(folderName, store) {
  const folder = normalize(folderName);
  const titleRaw = displayTitle(store);
  const title = normalize(titleRaw);
  if (!folder || !title || folder.length < 3 || title.length < 3) return 0;

  const folderBrand = brandOf(folderName);
  const titleBrand = brandOf(titleRaw);
  if (folderBrand || titleBrand) {
    if (!folderBrand || !titleBrand || folderBrand !== titleBrand) return 0;
  }
  if (!locationCompatible(folderName, store)) return 0;

  if (folder === title) return 100;

  const shorter = Math.min(folder.length, title.length);
  const longer = Math.max(folder.length, title.length);
  const ratio = shorter / Math.max(1, longer);
  if ((folder.startsWith(title) || folder.endsWith(title) || title.startsWith(folder) || title.endsWith(folder)) && shorter >= 5 && ratio >= 0.64) {
    return Math.round((90 + ratio * 8) * 10) / 10;
  }
  if ((folder.includes(title) || title.includes(folder)) && shorter >= 6 && ratio >= 0.72) {
    return Math.round((87 + ratio * 8) * 10) / 10;
  }

  const overlap = tokenOverlapScore(folderName, titleRaw);
  if (overlap >= 0.66) return Math.round((80 + overlap * 12) * 10) / 10;
  return 0;
}

function normalizeImages(folder) {
  return unique((folder.images || []).map(image => image?.src || image?.card || image?.url || image)).map(src => ({card: src, detail: src}));
}

function stableHash(value) {
  let hash = 2166136261;
  for (const char of clean(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rotate(values, offset) {
  if (!values.length) return values;
  const index = ((offset % values.length) + values.length) % values.length;
  return [...values.slice(index), ...values.slice(0, index)];
}

async function main() {
  const stores = JSON.parse(await fs.readFile(STORES_PATH, 'utf8'));
  const manifestData = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
  const folders = Array.isArray(manifestData) ? manifestData : (manifestData.folders || []);
  const report = {
    startedAt: new Date().toISOString(),
    policy: 'notion-display-title-to-photo-folder-only',
    storeCount: stores.length,
    manifestFolderCount: folders.length,
    exactMatches: [],
    brandPools: [],
    ambiguousFolders: [],
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

    // 지점명이 없는 순수 프랜차이즈 사진 묶음만 같은 브랜드 지점들에 나눠 쓴다.
    if (folderBrand && !folderLocations.size) {
      brandPools.set(folderBrand, [...(brandPools.get(folderBrand) || []), ...images]);
      continue;
    }

    const ranked = stores
      .map(store => ({store, score: strictNameScore(folder.folderName, store)}))
      .filter(item => item.score >= 84)
      .sort((a,b) => b.score - a.score || clean(a.store.name).localeCompare(clean(b.store.name), 'ko'));
    const best = ranked[0];
    const second = ranked[1];

    if (!best) {
      report.unmatchedFolders.push({folderName: folder.folderName, imageCount: images.length});
      continue;
    }
    if (second && best.score - second.score < 5) {
      report.ambiguousFolders.push({
        folderName: folder.folderName,
        imageCount: images.length,
        candidates: ranked.slice(0,3).map(item => ({store: item.store.name, score: item.score}))
      });
      continue;
    }

    directByStoreId.set(String(best.store.id), [...(directByStoreId.get(String(best.store.id)) || []), ...images]);
    report.exactMatches.push({folderName: folder.folderName, store: best.store.name, score: best.score, imageCount: images.length});
  }

  for (const [brand, imagesRaw] of brandPools) {
    const seen = new Set();
    const images = imagesRaw.filter(image => image.card && !seen.has(image.card) && seen.add(image.card)).slice(0,18);
    const brandStores = stores.filter(store => brandOf(displayTitle(store)) === brand);
    if (!images.length || brandStores.length < 2) continue;
    brandStores.sort((a,b) => clean(a.id || a.name).localeCompare(clean(b.id || b.name), 'ko'));
    brandStores.forEach((store,index) => {
      if (directByStoreId.has(String(store.id))) return;
      store.images = rotate(images, index).slice(0, Math.min(6, images.length));
      store.image = store.images[0]?.card || '';
      store.img = store.image;
      store.photoGroup = `brand:${brand}`;
      store.photoSource = 'notion-title-brand-pool';
    });
    report.brandPools.push({brand, storeCount: brandStores.length, imageCount: images.length, stores: brandStores.map(store => store.name)});
  }

  const pooled = new Set(report.brandPools.map(item => item.brand));
  for (const store of stores) {
    const storeBrand = brandOf(displayTitle(store));
    const direct = directByStoreId.get(String(store.id));
    if (direct?.length) {
      const seen = new Set();
      const images = direct.filter(image => image.card && !seen.has(image.card) && seen.add(image.card)).slice(0,8);
      const offset = stableHash(`${store.id}|${store.name}`) % images.length;
      store.images = rotate(images, offset);
      store.image = store.images[0]?.card || '';
      store.img = store.image;
      store.photoGroup = `store:${store.id}`;
      store.photoSource = 'notion-title-photo-folder-match';
    } else if (!pooled.has(storeBrand)) {
      // 이전 오매칭 사진이 남지 않도록, 이번 규칙에서 매칭되지 않은 자동사진은 제거한다.
      const autoPhoto = String(store.photoSource || '').includes('photo') || String(store.photoSource || '').includes('match') || String(store.photoGroup || '').startsWith('store:');
      if (autoPhoto) {
        delete store.images;
        delete store.photoPool;
        delete store.imagePool;
        delete store.gallery;
        delete store.photoGroup;
        delete store.photoSource;
        store.image = '';
        store.img = '';
      }
    }

    if (Array.isArray(store.images) && store.images.length) report.updatedStores.push({store: store.name, imageCount: store.images.length, photoGroup: store.photoGroup || ''});
    else report.unchangedStores.push(store.name);
  }

  report.finishedAt = new Date().toISOString();
  report.updatedStoreCount = report.updatedStores.length;
  report.exactMatchCount = report.exactMatches.length;
  report.brandPoolCount = report.brandPools.length;
  report.ambiguousFolderCount = report.ambiguousFolders.length;
  report.unmatchedFolderCount = report.unmatchedFolders.length;
  report.coverageRate = stores.length ? Math.round((report.updatedStoreCount / stores.length) * 1000) / 10 : 0;

  await fs.mkdir(path.dirname(REPORT_PATH), {recursive: true});
  await fs.copyFile(STORES_PATH, BACKUP_PATH);
  await fs.writeFile(STORES_PATH, `${JSON.stringify(stores, null, 2)}\n`, 'utf8');
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({stores: stores.length, updatedStores: report.updatedStoreCount, coverageRate: report.coverageRate, directMatches: report.exactMatchCount, brandPools: report.brandPoolCount, ambiguousFolders: report.ambiguousFolderCount, unmatchedFolders: report.unmatchedFolderCount}, null, 2));
}

main().catch(error => { console.error(error); process.exit(1); });
