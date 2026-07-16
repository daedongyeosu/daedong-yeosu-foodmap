import fs from 'node:fs/promises';

const STORES_PATH = process.env.STORES_PATH || 'data/stores.json';
const MANIFEST_PATH = process.env.PHOTO_MANIFEST_PATH || 'data/photo-manifest.json';
const ACTION_PATH = process.env.PHOTO_ACTION_REPORT_PATH || 'data/photo-match-action-report.json';
const OUTPUT_PATH = process.env.PHOTO_COVERAGE_REPORT_PATH || 'data/photo-coverage-resolution.json';

const clean = value => String(value ?? '').normalize('NFKC').trim();
const NOISE = /(여수시|여수|가게|매장|사진모음|사진파일|음식사진|사진|배달전문점|배달전문|전문점|공산소|복사본|사본|copy)/gi;
const LOCATION_WORDS = ['여서동','여서','문수동','문수','미평동','미평','국동','봉산동','봉산','웅천동','웅천','학동','신기동','신기','무선','선원','화장동','화장','죽림','돌산','교동','중앙동','중앙','충무동','충무','공화동','공화','덕충동','덕충','엑스포','소호동','소호','둔덕동','둔덕','봉계동','봉계','율촌','여천','오림동','오림','서교동','서교','광무동','광무','고소동','고소','종화동','종화','신월동','신월','월호동','월호','안산동','안산','관문동','관문','남산동','남산','연등동','연등','동문동','동문','만흥동','만흥','주삼동','주삼','삼일동','삼일','봉강동','봉강'];
const NON_STORE_WORDS = /(광고|정책|제안서|유튜브|동영상|손금|제록스|프린터|오토바이|복사기|새\s*폴더|홍보사진|지도홍보|소상공인연합회)/i;

function normalize(value) {
  let text = clean(value)
    .replace(/\b(?:0?61[-\s]?\d{3,4}[-\s]?\d{4}|01\d[-\s]?\d{3,4}[-\s]?\d{4})\b/g, ' ')
    .replace(/\s*[\(（]\s*\d+\s*[\)）]\s*$/u, ' ')
    .replace(NOISE, ' ')
    .toLowerCase()
    .replace(/[()（）\[\]{}<>·ㆍ,.!?\'"`~@#$%^&*_+=|\\/:;\-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

function compact(value) {
  return normalize(value).replace(/\s+/g, '');
}

function core(value) {
  let text = compact(value);
  for (const word of LOCATION_WORDS.sort((a,b) => b.length - a.length)) text = text.split(compact(word)).join('');
  text = text.replace(/(?:직영점|여수점|본점|지점|분점|점)$/g, '');
  return text;
}

function bigramDice(aRaw, bRaw) {
  const a = core(aRaw), b = core(bRaw);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const grams = value => {
    const map = new Map();
    for (let i = 0; i < value.length - 1; i += 1) {
      const gram = value.slice(i, i + 2);
      map.set(gram, (map.get(gram) || 0) + 1);
    }
    return map;
  };
  const A = grams(a), B = grams(b);
  let common = 0;
  for (const [gram, count] of A) common += Math.min(count, B.get(gram) || 0);
  const totalA = [...A.values()].reduce((sum, count) => sum + count, 0);
  const totalB = [...B.values()].reduce((sum, count) => sum + count, 0);
  return (2 * common) / Math.max(1, totalA + totalB);
}

function score(storeName, folderName) {
  const s = compact(storeName), f = compact(folderName);
  const sc = core(storeName), fc = core(folderName);
  if (!s || !f || !sc || !fc) return 0;
  if (s === f) return 100;
  if (sc === fc) return 98;
  const shorter = Math.min(sc.length, fc.length);
  const longer = Math.max(sc.length, fc.length);
  const ratio = shorter / Math.max(1, longer);
  if ((sc.includes(fc) || fc.includes(sc)) && shorter >= 4) return 82 + ratio * 14;
  return bigramDice(storeName, folderName) * 92;
}

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { return fallback; }
}

const stores = await readJson(STORES_PATH, []);
const manifest = await readJson(MANIFEST_PATH, {folders: []});
const action = await readJson(ACTION_PATH, {});
const folders = (Array.isArray(manifest) ? manifest : manifest.folders || []).map(folder => clean(folder.folderName)).filter(Boolean);
const unmatchedFolderNames = new Set((action.notionActions || []).map(item => clean(item.folderName)).filter(Boolean));

const sourceMissing = [];
const candidateReview = [];
const likelyAutoFix = [];

for (const store of stores) {
  if (Array.isArray(store.images) && store.images.length) continue;
  const ranked = folders
    .map(folderName => ({folderName, score: Math.round(score(store.name, folderName) * 10) / 10}))
    .filter(item => item.score >= 35)
    .sort((a,b) => b.score - a.score || a.folderName.localeCompare(b.folderName, 'ko'))
    .slice(0,5);
  const best = ranked[0];
  const second = ranked[1];
  if (!best || best.score < 55) {
    sourceMissing.push({store: store.name, reason: '업로드된 사진 폴더에서 이 가게와 비슷한 이름을 찾지 못함'});
  } else if (best.score >= 86 && best.score - (second?.score || 0) >= 8) {
    likelyAutoFix.push({store: store.name, candidate: best.folderName, score: best.score});
  } else {
    candidateReview.push({store: store.name, candidates: ranked});
  }
}

const notionStoreMissing = [];
const ignoredNonStoreFolders = [];
for (const folderName of unmatchedFolderNames) {
  if (NON_STORE_WORDS.test(folderName)) ignoredNonStoreFolders.push(folderName);
  else notionStoreMissing.push(folderName);
}

const report = {
  createdAt: new Date().toISOString(),
  summary: {
    totalStores: stores.length,
    storesWithPhotos: stores.filter(store => Array.isArray(store.images) && store.images.length).length,
    storesWithoutPhotos: stores.filter(store => !Array.isArray(store.images) || !store.images.length).length,
    likelyAutoFix: likelyAutoFix.length,
    candidateReview: candidateReview.length,
    sourceMissing: sourceMissing.length,
    photoFolderWithoutNotionStore: notionStoreMissing.length,
    ignoredNonStoreFolders: ignoredNonStoreFolders.length
  },
  explanation: {
    likelyAutoFix: '가게와 사진 폴더 이름이 매우 비슷해 다음 매칭 규칙 보강으로 자동 연결 가능한 항목',
    candidateReview: '후보가 둘 이상이거나 이름 차이가 커서 한 번 선택이 필요한 항목',
    sourceMissing: '업로드 사진에 해당 가게 폴더가 없어 알고리즘만으로는 만들 수 없는 항목',
    photoFolderWithoutNotionStore: '사진은 있지만 같은 이름의 노션 가게가 없거나 연동 권한에서 보이지 않는 항목'
  },
  likelyAutoFix,
  candidateReview,
  sourceMissing,
  photoFolderWithoutNotionStore: notionStoreMissing,
  ignoredNonStoreFolders
};

await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report.summary, null, 2));
