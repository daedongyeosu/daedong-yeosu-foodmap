import fs from 'node:fs/promises';
import path from 'node:path';

const STORES_PATH = process.env.STORES_PATH || 'data/stores.json';
const MANIFEST_PATH = process.env.PHOTO_MANIFEST_PATH || 'data/photo-manifest.json';
const REPORT_PATH = process.env.PHOTO_APPLY_REPORT_PATH || 'data/photo-apply-report.json';
const BACKUP_PATH = process.env.PHOTO_APPLY_BACKUP_PATH || 'data/stores.before-photo-apply.json';
const APPLY_CHANGES = !/^(0|false|no)$/i.test(String(process.env.APPLY_CHANGES ?? 'true'));

const clean = value => String(value ?? '').trim();
const unique = values => [...new Set(values.flat(Infinity).map(clean).filter(Boolean))];

function stripNoise(value) {
  return clean(value)
    .replace(/\b(?:0?61[-\s]?\d{3,4}[-\s]?\d{4}|01\d[-\s]?\d{3,4}[-\s]?\d{4})\b/g, ' ')
    .replace(/\s*[\(（]\s*\d+\s*[\)）]\s*$/u, '')
    .replace(/\s*(?:[-_–—]\s*)?(?:복사본|사본|copy)(?:\s*\d+)?\s*$/iu, '')
    .replace(/(?:가게|매장)?\s*사진(?:모음|파일)?/gi, ' ')
    .replace(/배달\s*(?:전문점?|전문)/g, ' ')
    .replace(/\s*[-–—]\s*(?:치킨|피자|한식|중식|분식|카페|족발|보쌈|야식)\s*$/g, ' ')
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

function diceSimilarity(a, b) {
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.length < 2 || right.length < 2) return 0;
  const grams = text => {
    const result = new Map();
    for (let index = 0; index < text.length - 1; index += 1) {
      const gram = text.slice(index, index + 2);
      result.set(gram, (result.get(gram) || 0) + 1);
    }
    return result;
  };
  const A = grams(left);
  const B = grams(right);
  let common = 0;
  for (const [gram, count] of A) common += Math.min(count, B.get(gram) || 0);
  const totalA = [...A.values()].reduce((sum, count) => sum + count, 0);
  const totalB = [...B.values()].reduce((sum, count) => sum + count, 0);
  return (2 * common) / (totalA + totalB);
}

const STATIC_BRANDS = [
  ['60계치킨',['60계치킨','60계']], ['BBQ',['bbq','비비큐']], ['BHC',['bhc']],
  ['교촌치킨',['교촌치킨','교촌']], ['굽네치킨',['굽네치킨','굽네']], ['맘스터치',['맘스터치']],
  ['롯데리아',['롯데리아']], ['배스킨라빈스',['배스킨라빈스','베스킨라빈스','배라']],
  ['처갓집양념치킨',['처갓집양념치킨','처갓집']], ['페리카나',['페리카나']],
  ['네네치킨',['네네치킨','네네']], ['멕시카나',['멕시카나']], ['호식이두마리치킨',['호식이두마리치킨','호식이']],
  ['티바두마리치킨',['티바두마리치킨','티바']], ['치킨아이',['치킨아이']], ['치킨마루',['치킨마루']],
  ['아주커치킨',['아주커치킨','아주커']], ['또래오래',['또래오래']], ['노랑통닭',['노랑통닭']],
  ['푸라닭',['푸라닭']], ['자담치킨',['자담치킨']], ['바른치킨',['바른치킨']],
  ['가마치통닭',['가마치통닭','가마치']], ['가장맛있는족발',['가장맛있는족발']],
  ['피자스쿨',['피자스쿨']], ['피자나라치킨공주',['피자나라치킨공주','피나치공']],
  ['도미노피자',['도미노피자','도미노']], ['피자헛',['피자헛']], ['미스터피자',['미스터피자']],
  ['반올림피자샵',['반올림피자샵','반올림피자']], ['청년피자',['청년피자']],
  ['메가MGC커피',['메가mgc커피','메가커피']], ['컴포즈커피',['컴포즈커피']], ['빽다방',['빽다방']],
  ['이디야커피',['이디야커피','이디야']], ['투썸플레이스',['투썸플레이스','투썸']], ['파리바게뜨',['파리바게뜨','파리바게트']],
  ['본죽&비빔밥',['본죽비빔밥']], ['본죽',['본죽']], ['죠스떡볶이',['죠스떡볶이']],
  ['신전떡볶이',['신전떡볶이']], ['엽기떡볶이',['동대문엽기떡볶이','엽기떡볶이']],
  ['홍콩반점',['홍콩반점']], ['탕화쿵푸마라탕',['탕화쿵푸마라탕','탕화쿵푸']],
  ['공차',['공차']], ['더벤티',['더벤티']], ['요아정',['카페요아정','요아정']], ['던킨',['던킨']], ['두찜',['두마리찜닭두찜','두찜']],
  ['여수강촌토종닭숯불구이',['여수강촌토종닭숯불구이','강촌토종닭숯불구이']]
].map(([key, aliases]) => ({key, aliases: aliases.map(normalize).sort((a,b) => b.length-a.length)}));

function staticBrand(value) {
  const text = normalize(value);
  for (const brand of STATIC_BRANDS) {
    if (brand.aliases.some(alias => text.includes(alias))) return brand.key;
  }
  return '';
}

function storeAliases(store) {
  return unique([store.name, store.realBusinessName, ...(store.shopInShopNames || []), ...(store.searchTerms || [])]);
}

function scoreFolderToStore(folderName, store) {
  const folder = normalize(folderName);
  if (!folder) return 0;
  let best = 0;
  for (const aliasRaw of storeAliases(store)) {
    const alias = normalize(aliasRaw);
    if (!alias) continue;
    if (folder === alias) best = Math.max(best, 100);
    else if (folder.includes(alias) || alias.includes(folder)) {
      const ratio = Math.min(folder.length, alias.length) / Math.max(folder.length, alias.length);
      best = Math.max(best, 83 + ratio * 14);
    } else best = Math.max(best, diceSimilarity(folder, alias) * 92);
  }
  const folderLocations = locationTokens(folderName);
  const storeLocations = locationTokens([store.name, store.realBusinessName, store.district].join(' '));
  if (folderLocations.size && storeLocations.size && ![...folderLocations].some(token => storeLocations.has(token))) best -= 28;
  const folderBrand = staticBrand(folderName);
  const storeBrand = staticBrand(store.name || store.realBusinessName);
  if (folderBrand && storeBrand && folderBrand !== storeBrand) best -= 35;
  return Math.max(0, Math.min(100, Math.round(best * 10) / 10));
}

function normalizeImages(folder) {
  return unique((folder.images || []).map(image => image?.src || image?.card || image?.url || image)).map(src => ({card: src, detail: src}));
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
    startedAt: new Date().toISOString(), mode: APPLY_CHANGES ? 'apply' : 'preview',
    storeCount: stores.length, manifestFolderCount: folders.length,
    exactMatches: [], brandPools: [], ambiguousFolders: [], unmatchedFolders: [], updatedStores: [], unchangedStores: []
  };

  const directByStoreId = new Map();
  const genericBrandFolders = new Map();
  const folderBrand = new Map();

  for (const folder of folders) {
    const folderKey = normalize(folder.folderName);
    if (!folderKey || folderKey.length < 4) continue;
    const staticKey = staticBrand(folder.folderName);
    const candidateStores = stores.filter(store => storeAliases(store).some(alias => {
      const storeKey = normalize(alias);
      return storeKey.startsWith(folderKey) || storeKey.includes(folderKey);
    }));
    const noLocation = locationTokens(folder.folderName).size === 0;
    if (staticKey) folderBrand.set(folder, staticKey);
    else if (candidateStores.length >= 2 && noLocation && !/^(한식|중식|치킨|피자|분식|카페|족발|보쌈|야식|음식점)$/i.test(stripNoise(folder.folderName))) {
      const dynamicKey = stripNoise(folder.folderName);
      folderBrand.set(folder, dynamicKey);
      genericBrandFolders.set(normalize(dynamicKey), dynamicKey);
    }
  }

  function brandFor(value) {
    const staticKey = staticBrand(value);
    if (staticKey) return staticKey;
    const text = normalize(value);
    for (const [key, label] of genericBrandFolders) if (text.includes(key)) return label;
    return '';
  }

  for (const folder of folders) {
    const brand = folderBrand.get(folder) || brandFor(folder.folderName);
    const isGenericBrandFolder = Boolean(brand) && locationTokens(folder.folderName).size === 0 && stores.filter(store => brandFor(store.name) === brand).length >= 2;
    if (isGenericBrandFolder) continue;
    const ranked = stores
      .map(store => ({store, score: scoreFolderToStore(folder.folderName, store)}))
      .filter(item => item.score >= 68)
      .sort((a, b) => b.score - a.score || clean(a.store.name).localeCompare(clean(b.store.name), 'ko'));
    const best = ranked[0];
    const second = ranked[1];
    if (!best || best.score < 88) {
      report.unmatchedFolders.push({folderName: folder.folderName, best: best ? {store: best.store.name, score: best.score} : null});
      continue;
    }
    if (second && best.score - second.score < 6 && second.score >= 82) {
      report.ambiguousFolders.push({folderName: folder.folderName, candidates: ranked.slice(0,3).map(item => ({store: item.store.name, score: item.score}))});
      continue;
    }
    const images = normalizeImages(folder);
    if (!images.length) continue;
    const current = directByStoreId.get(String(best.store.id)) || [];
    directByStoreId.set(String(best.store.id), [...current, ...images]);
    report.exactMatches.push({folderName: folder.folderName, store: best.store.name, score: best.score, imageCount: images.length});
  }

  const brandPools = new Map();
  for (const folder of folders) {
    const brand = folderBrand.get(folder) || brandFor(folder.folderName);
    if (!brand) continue;
    const images = normalizeImages(folder);
    if (!images.length) continue;
    brandPools.set(brand, [...(brandPools.get(brand) || []), ...images]);
  }

  for (const [brand, imagesRaw] of brandPools) {
    const seen = new Set();
    const images = imagesRaw.filter(image => {
      if (!image.card || seen.has(image.card)) return false;
      seen.add(image.card);
      return true;
    }).slice(0, 18);
    const brandStores = stores.filter(store => brandFor(store.name || store.realBusinessName) === brand);
    if (!images.length || brandStores.length < 2) continue;
    brandStores.sort((a,b) => clean(a.id || a.name).localeCompare(clean(b.id || b.name), 'ko'));
    brandStores.forEach((store, index) => {
      store.images = images;
      store.photoGroup = `brand:${brand}`;
      store.image = images[index % images.length]?.card || store.image;
      store.photoSource = 'shared-franchise-pool';
    });
    report.brandPools.push({brand, storeCount: brandStores.length, imageCount: images.length, stores: brandStores.map(store => store.name)});
  }

  const pooledBrands = new Set(report.brandPools.map(group => group.brand));
  for (const store of stores) {
    const brand = brandFor(store.name || store.realBusinessName);
    if (!pooledBrands.has(brand)) {
      const direct = directByStoreId.get(String(store.id));
      if (direct?.length) {
        const seen = new Set();
        const images = direct.filter(image => {
          if (!image.card || seen.has(image.card)) return false;
          seen.add(image.card);
          return true;
        }).slice(0, 6);
        const offset = stableHash(`${store.id}|${store.name}`) % images.length;
        store.images = rotate(images, offset);
        store.image = store.images[0]?.card || store.image;
        store.photoGroup = `store:${store.id}`;
        store.photoSource = 'matched-photo-folder';
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

  await fs.mkdir(path.dirname(REPORT_PATH), {recursive: true});
  if (APPLY_CHANGES) {
    await fs.copyFile(STORES_PATH, BACKUP_PATH);
    await fs.writeFile(STORES_PATH, `${JSON.stringify(stores, null, 2)}\n`, 'utf8');
  }
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({mode: report.mode, stores: stores.length, updatedStores: report.updatedStoreCount, directMatches: report.exactMatchCount, brandPools: report.brandPoolCount, ambiguousFolders: report.ambiguousFolderCount, unmatchedFolders: report.unmatchedFolderCount}, null, 2));
}

main().catch(error => { console.error(error); process.exit(1); });
