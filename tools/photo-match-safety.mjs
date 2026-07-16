import fs from 'node:fs/promises';

const STORES_PATH = process.env.STORES_PATH || 'data/stores.json';
const MANIFEST_PATH = process.env.PHOTO_MANIFEST_PATH || 'data/photo-manifest.json';
const APPLY_REPORT_PATH = process.env.PHOTO_APPLY_REPORT_PATH || 'data/photo-apply-report.json';
const SAFETY_REPORT_PATH = process.env.PHOTO_MATCH_SAFETY_REPORT_PATH || 'data/photo-match-safety-report.json';
const PHASE = process.env.PHOTO_SAFETY_PHASE || 'post';

const clean = value => String(value ?? '').trim();
const unique = values => [...new Set(values.map(clean).filter(Boolean))];

function stripNoise(value) {
  return clean(value)
    .replace(/\b(?:0?61[-\s]?\d{3,4}[-\s]?\d{4}|01\d[-\s]?\d{3,4}[-\s]?\d{4})\b/g, ' ')
    .replace(/\s*[\(（]\s*\d+\s*[\)）]\s*$/u, '')
    .replace(/\s*(?:[-_–—]\s*)?(?:복사본|사본|copy)(?:\s*\d+)?\s*$/iu, '')
    .replace(/(?:가게|매장)?\s*사진(?:모음|파일)?/gi, ' ')
    .replace(/배달\s*(?:전문점?|전문)/g, ' ')
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

const LOCATION_ALIASES = [
  ['여서','여서동'], ['문수','문수동'], ['미평','미평동'], ['국동'], ['봉산','봉산동'],
  ['웅천','웅천동'], ['학동'], ['신기','신기동'], ['무선','선원','화장'], ['죽림'],
  ['돌산'], ['교동'], ['중앙','중앙동'], ['충무','충무동'], ['공화','공화동'],
  ['덕충','덕충동','엑스포'], ['소호','소호동'], ['둔덕','둔덕동'], ['봉계','봉계동'],
  ['율촌'], ['여천'], ['오림','오림동'], ['서교','서교동'], ['광무','광무동'],
  ['고소','고소동'], ['종화','종화동'], ['신월','신월동'], ['월호','월호동'],
  ['안산','안산동'], ['관문','관문동'], ['남산','남산동'], ['연등','연등동'],
  ['동문','동문동'], ['만흥','만흥동'], ['주삼','주삼동'], ['삼일','삼일동']
];

function locationTokens(value) {
  const text = normalize(value);
  const tokens = new Set();
  for (const aliases of LOCATION_ALIASES) {
    if (aliases.some(alias => text.includes(normalize(alias)))) tokens.add(normalize(aliases[0]));
  }
  return tokens;
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
  ['반올림피자샵',['반올림피자샵','반올림피자']], ['메가MGC커피',['메가mgc커피','메가커피']],
  ['컴포즈커피',['컴포즈커피']], ['빽다방',['빽다방']], ['이디야커피',['이디야커피','이디야']],
  ['투썸플레이스',['투썸플레이스','투썸']], ['파리바게뜨',['파리바게뜨','파리바게트']],
  ['본죽',['본죽']], ['신전떡볶이',['신전떡볶이']], ['엽기떡볶이',['동대문엽기떡볶이','엽기떡볶이']],
  ['홍콩반점',['홍콩반점']], ['탕화쿵푸마라탕',['탕화쿵푸마라탕','탕화쿵푸']],
  ['공차',['공차']], ['더벤티',['더벤티']], ['요아정',['카페요아정','요아정']], ['던킨',['던킨']], ['두찜',['두마리찜닭두찜','두찜']]
].map(([key, aliases]) => ({key, aliases: aliases.map(normalize)}));

function brand(value) {
  const text = normalize(value);
  for (const item of BRANDS) if (item.aliases.some(alias => text.includes(alias))) return item.key;
  return '';
}

const GENERIC_WORDS = new Set(['음식점','한식','중식','치킨','피자','분식','카페','족발','보쌈','야식','배달','여수','전문점','맛집','공산소']);

function strictMatch(folderName, storeName) {
  const folder = normalize(folderName);
  const store = normalize(storeName);
  if (!folder || !store) return {safe: false, reason: 'empty-name'};
  if (folder === store) return {safe: true, reason: 'exact-name'};

  const folderBrand = brand(folderName);
  const storeBrand = brand(storeName);
  if (folderBrand || storeBrand) {
    if (!folderBrand || !storeBrand || folderBrand !== storeBrand) return {safe: false, reason: 'brand-conflict'};
    const folderLocations = locationTokens(folderName);
    const storeLocations = locationTokens(storeName);
    if (folderLocations.size && storeLocations.size && ![...folderLocations].some(token => storeLocations.has(token))) return {safe: false, reason: 'branch-conflict'};
    if (folderLocations.size && !storeLocations.size) return {safe: false, reason: 'branch-missing-on-store'};
    return {safe: true, reason: folderLocations.size ? 'same-brand-same-branch' : 'same-brand-pool'};
  }

  const folderLocations = locationTokens(folderName);
  const storeLocations = locationTokens(storeName);
  if (folderLocations.size && storeLocations.size && ![...folderLocations].some(token => storeLocations.has(token))) return {safe: false, reason: 'location-conflict'};

  const shorter = folder.length <= store.length ? folder : store;
  const longer = folder.length > store.length ? folder : store;
  const ratio = shorter.length / longer.length;
  if (shorter.length >= 6 && ratio >= 0.82 && longer.includes(shorter) && !GENERIC_WORDS.has(shorter)) return {safe: true, reason: 'strong-name-containment'};
  return {safe: false, reason: 'name-not-certain'};
}

function imagePaths(folder) {
  return unique((folder?.images || []).map(item => item?.src || item?.card || item?.url || item));
}

function clearAutoPhotos(store) {
  const auto = String(store.photoSource || '').includes('photo') || String(store.photoGroup || '').startsWith('brand:') || String(store.photoGroup || '').startsWith('store:') || String(store.image || '').startsWith('assets/store-photos/');
  if (!auto) return false;
  delete store.images;
  delete store.photoPool;
  delete store.imagePool;
  delete store.gallery;
  delete store.photoGroup;
  delete store.photoSource;
  store.image = 'assets/store1.jpg';
  store.img = 'assets/store1.jpg';
  return true;
}

async function preclean() {
  const stores = JSON.parse(await fs.readFile(STORES_PATH, 'utf8'));
  let cleared = 0;
  for (const store of stores) cleared += Number(clearAutoPhotos(store));
  await fs.writeFile(STORES_PATH, `${JSON.stringify(stores, null, 2)}\n`, 'utf8');
  await fs.writeFile(SAFETY_REPORT_PATH, `${JSON.stringify({phase: 'pre', clearedAutoPhotoStores: cleared, at: new Date().toISOString()}, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({phase: 'pre', cleared}, null, 2));
}

async function postclean() {
  const stores = JSON.parse(await fs.readFile(STORES_PATH, 'utf8'));
  const manifestData = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
  const folders = Array.isArray(manifestData) ? manifestData : (manifestData.folders || []);
  const applyReport = JSON.parse(await fs.readFile(APPLY_REPORT_PATH, 'utf8'));
  const folderMap = new Map(folders.map(folder => [folder.folderName, folder]));
  const storeMap = new Map(stores.map(store => [store.name, store]));
  const removed = [];

  for (const match of applyReport.exactMatches || []) {
    const verdict = strictMatch(match.folderName, match.store);
    if (verdict.safe) continue;
    const store = storeMap.get(match.store);
    const folder = folderMap.get(match.folderName);
    if (!store || !folder) continue;
    const bad = new Set(imagePaths(folder));
    const before = Array.isArray(store.images) ? store.images.length : 0;
    if (Array.isArray(store.images)) {
      store.images = store.images.filter(item => !bad.has(item?.card || item?.src || item?.url || item));
      if (!store.images.length) delete store.images;
    }
    if (bad.has(store.image) || !Array.isArray(store.images)) {
      store.image = store.images?.[0]?.card || 'assets/store1.jpg';
      store.img = store.image;
    }
    if (!store.images) {
      delete store.photoGroup;
      delete store.photoSource;
    }
    removed.push({folderName: match.folderName, store: match.store, reason: verdict.reason, removedImageCount: Math.max(0, before - (store.images?.length || 0))});
  }

  await fs.writeFile(STORES_PATH, `${JSON.stringify(stores, null, 2)}\n`, 'utf8');
  const report = {phase: 'post', at: new Date().toISOString(), removedUnsafeMatchCount: removed.length, removed};
  await fs.writeFile(SAFETY_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({phase: 'post', removedUnsafeMatches: removed.length}, null, 2));
}

if (PHASE === 'pre') await preclean();
else await postclean();
