import fs from 'node:fs/promises';
import path from 'node:path';

const outputDir = path.resolve('ddangyo-shop-data-output');
const normalizedPath = path.join(outputDir, 'normalized-all.json');
const reportPath = path.join(outputDir, 'match-report.json');

const existingOverrides = new Map([
  ['1169335', {storeId: '6d48c7e2bca79c18', storeName: '계동치킨 여문점(먹깨비,땡겨요로 주문시 음료스 서비스)', reason: 'same unique store name; current address missing'}],
  ['1138825', {storeId: 'b2b796461ee30ef2', storeName: '예원닭강정 여수1호점(문수동)', reason: 'same unique store name; current address missing'}],
  ['1179539', {storeId: 'e53db0006339f439', storeName: '60계치킨 웅천점', reason: 'same road address and normalized branch name'}],
  ['1171956', {storeId: 'ce40f493bcd2ca2b', storeName: '노랑통닭 죽림점', reason: 'same road address; Ddangyo omits 소라면'}],
  ['1159213', {storeId: 'c6b947813051ac38', storeName: '자담치킨 여수죽림점', reason: 'same road address; Ddangyo omits 소라면'}],
  ['1224280', {storeId: '8e930495e2e94c21', storeName: '교촌치킨 죽림무선점', reason: 'same road address; Ddangyo omits 소라면'}],
  ['1238086', {storeId: '51b657cc3416c67d', storeName: '여수강촌토종닭숯불구이 죽림직영점', reason: 'same road address; Ddangyo omits 소라면'}],
  ['1212165', {storeId: '5535998cfac3846a', storeName: '김종구식 맛치킨 전기바베큐 옛날통닭 학동점', reason: 'same brand and 학동 branch; Ddangyo includes 여수 in branch name'}],
  ['1120968', {storeId: '9846929c4427576a', storeName: '푸라닭치킨 여수문수점', reason: 'same 푸라닭 문수 branch; current name includes 치킨'}],
  ['1216976', {storeId: '57ae8848b4ccc2a1', storeName: '본스치킨 미평점', reason: 'same brand and 미평 branch; Ddangyo includes 여수'}],
  ['1130868', {storeId: '9a94c05bdeca2d9e', storeName: '아주커치킨 학동점', reason: 'same 아주커 학동 branch; Ddangyo uses 여천학동'}],
  ['1147605', {storeId: '72e0104c30277686', storeName: '굽네치킨&피자 죽림점', reason: 'same brand and 죽림 branch; Ddangyo includes 여수'}],
  ['1171853', {storeId: '724adc8d9593fe05', storeName: '가마치통닭 죽림점', reason: 'same brand and 죽림 branch; Ddangyo includes 여수'}],
  ['1171100', {storeId: '87fd57845e1c58b5', storeName: '60계치킨 죽림점', reason: 'same brand and 죽림 branch; Ddangyo includes 여수'}],
  ['1177925', {storeId: 'aea70baec8c61d25', storeName: '노랑통닭 웅천점', reason: 'same brand and 웅천 branch; Ddangyo includes 여수'}],
  ['1154876', {storeId: '1894da97ed277235', storeName: '자담치킨 여수학동점', reason: 'same exact branch; current sources and Ddangyo confirm 소호로 658 while stored coordinate 662 is stale'}]
]);

const newShopInShopOverrides = new Map([
  ['1273822', {reason: 'distinct Ddangyo shop at a shared address; no same-name current store', naverEligible: false}],
  ['1304058', {reason: 'distinct shop-in-shop at a shared address; no same-name current store', naverEligible: false}]
]);

const extracted = JSON.parse(await fs.readFile(normalizedPath, 'utf8'));
const decisions = [];

for (const row of extracted) {
  const patstoNo = String(row.patstoNo || '');
  const existing = existingOverrides.get(patstoNo);
  if (existing) {
    row.match = {
      status: 'existing',
      method: 'manual-verified-existing',
      storeId: existing.storeId,
      storeName: existing.storeName,
      ddangyoAddress: row.address,
      reason: existing.reason
    };
    decisions.push({patstoNo, name: row.name, decision: 'existing', ...existing});
    continue;
  }

  const shopInShop = newShopInShopOverrides.get(patstoNo);
  if (shopInShop) {
    row.match = {
      status: 'new',
      method: 'manual-verified-new-shop-in-shop',
      naverEligible: false,
      reason: shopInShop.reason
    };
    row.naverEligible = false;
    decisions.push({patstoNo, name: row.name, decision: 'new-shop-in-shop', ...shopInShop});
  }
}

const previous = JSON.parse(await fs.readFile(reportPath, 'utf8'));
const matchByPatsto = new Map(extracted.map(row => [String(row.patstoNo || ''), row.match]));
const stores = previous.stores.map(row => ({
  ...row,
  match: matchByPatsto.get(String(row.patstoNo || '')) || row.match
}));

const matchSummary = {
  existing: stores.filter(row => row.match?.status === 'existing').length,
  review: stores.filter(row => row.match?.status === 'review').length,
  new: stores.filter(row => row.match?.status === 'new').length,
  failed: stores.filter(row => row.error).length
};

const report = {
  ...previous,
  generatedAt: new Date().toISOString(),
  matchSummary,
  manualDecisionCount: decisions.length,
  stores
};

await fs.writeFile(normalizedPath, JSON.stringify(extracted, null, 2));
await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
await fs.writeFile(path.join(outputDir, 'manual-decisions.json'), JSON.stringify(decisions, null, 2));
await fs.writeFile(
  path.join(outputDir, 'review-only.json'),
  JSON.stringify(stores.filter(row => row.match?.status === 'review'), null, 2)
);
await fs.writeFile(
  path.join(outputDir, 'new-only.json'),
  JSON.stringify(stores.filter(row => row.match?.status === 'new'), null, 2)
);

console.log(JSON.stringify({manualDecisionCount: decisions.length, matchSummary}, null, 2));
