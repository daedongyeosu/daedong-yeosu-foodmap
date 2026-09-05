import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const expected = [
  ['2017de4f9111f3ce', '김사장 삼겹 통김치찜'],
  ['93ae27237a8e75c4', '메밀꽃 필 막국수'],
  ['1d691d8e74499d31', '조쉐프의 쌀국수'],
  ['67a9e4f14c8c7ea4', '손수김밥 양지점'],
  ['cfde2617224f33a0', '콩산소 (음식 연구소)'],
  ['421ecef35a879687', '탐나는피자 여수점'],
  ['10db3b0db6ebf8c5', '맘스터치 문수점'],
  ['068b2ae8fe32874a', '1인피자 피자먹다 여수여서점'],
  ['0abd7147b7d6b1dd', '비비큐 미평둔덕점'],
  ['f8a71a5a2344ee7f', '프랭크버거 미평점'],
  ['fb798d3119a28415', '60계치킨 여수미평점'],
  ['a089d1d54720b48e', '외계인피자 여수점'],
  ['aa0a00258c22f377', '뽕뜨락피자 여수여서점'],
  ['7bc7239e6b509c44', '수라상궁조선국밥 여서점'],
  ['d86586aaef8454c9', '조선밀면&냉면 여수여서점'],
  ['84c118675c0caa4c', '바오탕수 여서점'],
  ['04910f606ba038a6', '오워래 수제돈까스 여서점'],
];

const kongsansoFamilyStoreIds = [
  'cfde2617224f33a0',
  '1d691d8e74499d31',
  '2017de4f9111f3ce',
  '93ae27237a8e75c4',
  '3f441930b8d18783',
  'f3cb61dd45ba9b8b',
  '665953a0453afc52',
  '7ed65c8f086f11f2',
];

const manifest = JSON.parse(readFileSync('data/store-campaign-links.json', 'utf8'));
const heroData = JSON.parse(readFileSync('data/hero-campaigns.json', 'utf8'));
const rc6 = readFileSync('rc6-fixes.js', 'utf8');
const loader = readFileSync('final-experience.js', 'utf8');
const index = readFileSync('index.html', 'utf8');
const dataApiContext = { window: {} };
runInNewContext(readFileSync('data-api.js', 'utf8'), dataApiContext);
const isCustomerHiddenStoreId = dataApiContext.window.daedongDataApi?.isCustomerHiddenStoreId;
assert.equal(typeof isCustomerHiddenStoreId, 'function', 'Campaign entry points must share the customer visibility policy.');
for (const storeId of ['2da10529e7fb987c', '421ecef35a879687']) {
  assert.equal(isCustomerHiddenStoreId(storeId), true, '탐나는피자의 실제·가상 ID는 고객 화면에서 모두 숨겨야 합니다.');
}
for (const [storeId, name] of expected.filter(([id]) => id !== '421ecef35a879687')) {
  assert.equal(isCustomerHiddenStoreId(storeId), false, `${name}: unrelated approved campaigns must remain visible.`);
}

assert.equal(manifest.campaigns.length, expected.length, 'The public campaign-link list must contain exactly the approved stores.');
assert.equal(Object.keys(heroData.campaigns).length, expected.length, 'Each approved store must have one hero campaign.');
assert.deepEqual(
  manifest.campaigns.map(({ storeId, name }) => [storeId, name]),
  expected,
  'Store IDs and canonical names must not be renamed or reordered accidentally.',
);

for (const [storeId, name] of expected) {
  const item = manifest.campaigns.find((entry) => entry.storeId === storeId);
  const campaign = heroData.campaigns[storeId];
  assert.ok(item, `${name}: campaign link is missing.`);
  assert.equal(item.url, `https://daedongmap.com/?hero=${storeId}`, `${name}: production link is wrong.`);
  assert.equal(item.previewUrl, `https://preview.daedongmap.com/?hero=${storeId}`, `${name}: preview link is wrong.`);
  assert.ok(campaign, `${name}: hero campaign is missing.`);
  assert.equal(campaign.storeId, storeId, `${name}: hero campaign points at another store.`);
  assert.ok(Array.isArray(campaign.slides) && campaign.slides.length > 0, `${name}: standardized menu slides are missing.`);
  assert.ok(campaign.slides.length <= 14, `${name}: store menu slides must not exceed the fourteen-card campaign limit.`);
  assert.equal(campaign.images, undefined, `${name}: legacy image-only campaigns are not allowed.`);
  assert.equal(campaign.copySlides, undefined, `${name}: legacy copy-slide selection is not allowed.`);
  assert.equal(campaign.specialBannerKeys, undefined, `${name}: the shared three-ad standard must not be duplicated per campaign.`);

  for (const slide of campaign.slides) {
    assert.ok(String(slide.storeId || '').trim(), `${name}: a slide has no store ID.`);
    assert.ok(String(slide.image || '').trim(), `${name}: a slide has no menu photo.`);
    assert.ok(String(slide.title || '').trim(), `${name}: a slide has no store name.`);
    assert.ok(String(slide.meta || '').trim(), `${name}: a slide has no menu name.`);
  }

  const slideStoreIds = [...new Set(campaign.slides.map((slide) => slide.storeId))];
  if (storeId === 'cfde2617224f33a0') {
    assert.deepEqual(
      campaign.slides.map((slide) => slide.storeId),
      kongsansoFamilyStoreIds,
      '콩산소는 본점과 기존 연계 7곳의 구성과 순서를 그대로 유지해야 합니다.',
    );
  } else {
    assert.deepEqual(slideStoreIds, [storeId], `${name}: another store must not appear in this dedicated campaign.`);
  }

  assert.ok(existsSync(item.qrAsset), `${name}: QR asset is missing.`);
  const qr = readFileSync(item.qrAsset, 'utf8');
  assert.match(qr, /<svg\b/, `${name}: QR asset is not SVG.`);
  assert.match(qr, /viewBox=/, `${name}: QR asset has no scalable viewBox.`);
}

for (const campaign of Object.values(heroData.campaigns)) {
  const images = campaign.slides.map((slide) => slide.image);
  assert.equal(new Set(images).size, images.length, `${campaign.label}: duplicate hero photos are not allowed.`);
  for (const image of images) {
    if (/^https:\/\//.test(image)) continue;
    assert.ok(existsSync(image), `${campaign.label}: local photo is missing: ${image}`);
  }
}

const tamnaneun = heroData.campaigns['421ecef35a879687'];
assert.deepEqual(
  tamnaneun.entryStoreIds,
  ['421ecef35a879687', '2da10529e7fb987c'],
  '탐나는피자를 고객 화면에서 숨겨도 복구용 통합 ID와 이전 요기요 QR ID 연결은 보존해야 합니다.',
);
assert.match(rc6, /params\.get\('hero'\)\|\|params\.get\('store'\)/, '가게 상세 QR도 전용 배너 모드로 인식해야 합니다.');
assert.match(loader, /daedongResolveHeroCampaignStoreId/, '가게 상세 QR은 통합 가게 ID로 교정되어야 합니다.');
assert.match(loader, /params\.get\(FX_STORE_SHARE_PARAM\)\|\|params\.get\('hero'\)/, '전용 hero QR도 가게 상세를 즉시 열어야 합니다.');
assert.match(rc6, /hero-campaigns\.json\?v=store-campaign-standard-1/, 'The hero campaign data cache must be refreshed.');
assert.match(loader, /rc6-fixes\.js\?v=[^'\n]*store-campaign-standard-1/, 'The RC6 script cache must be refreshed.');
assert.match(index, /final-experience\.js\?v=[^"\n]*store-campaign-standard-1/, 'The final loader cache must be refreshed.');

const ppongtteurak = heroData.virtualStores['aa0a00258c22f377'];
assert.ok(ppongtteurak, '뽕뜨락피자는 기본 목록 반영이 늦어도 전용 화면에서 열리는 보조 가게정보가 있어야 합니다.');
assert.equal(ppongtteurak.phone, '061-655-1082', '뽕뜨락피자 전화번호가 실제 가게 번호와 일치해야 합니다.');
assert.equal(ppongtteurak.trustedDetail, true, '뽕뜨락피자 전용 화면은 검증된 주문경로를 즉시 사용해야 합니다.');
const ppongtteurakCampaign = heroData.campaigns['aa0a00258c22f377'];
assert.equal(ppongtteurakCampaign.slides.length, 14, '뽕뜨락피자는 검증된 메뉴사진 14장을 모두 사용해야 합니다.');
assert.equal(
  new Set(ppongtteurakCampaign.slides.map(slide => slide.image)).size,
  14,
  '뽕뜨락피자 배너에는 같은 메뉴사진을 중복 사용하면 안 됩니다.',
);
assert.ok(
  ppongtteurakCampaign.slides.every(slide => slide.storeId === 'aa0a00258c22f377'),
  '뽕뜨락피자 전용 배너에는 다른 가게가 섞이면 안 됩니다.',
);
const auditedStoreSlideCounts = new Map([
  ['67a9e4f14c8c7ea4', 14],
  ['421ecef35a879687', 14],
  ['068b2ae8fe32874a', 14],
  ['0abd7147b7d6b1dd', 14],
  ['f8a71a5a2344ee7f', 14],
  ['fb798d3119a28415', 14],
  ['a089d1d54720b48e', 14],
  ['aa0a00258c22f377', 14],
  ['10db3b0db6ebf8c5', 14],
  ['cfde2617224f33a0', 8],
]);
for (const [storeId, expectedSlideCount] of auditedStoreSlideCounts) {
  assert.equal(
    heroData.campaigns[storeId].slides.length,
    expectedSlideCount,
    `${heroData.campaigns[storeId].title}: 검증 사진 보유량에 맞춘 표준 배너 수를 유지해야 합니다.`,
  );
}
assert.deepEqual(
  new Set(ppongtteurak.routes.filter(route => route.enabled).map(route => route.key)),
  new Set(['direct', 'mukkebi', 'ddangyo', 'chak', 'phone', 'yogiyo', 'coupang', 'baemin']),
  '뽕뜨락피자의 확인된 전체 주문경로가 빠지면 안 됩니다.',
);
assert.match(rc6, /const RC6_CAMPAIGN_STORE_HERO_LIMIT=14;/, '전용 화면의 가게·메뉴 사진은 최대 14장이어야 합니다.');
assert.match(rc6, /const RC6_CAMPAIGN_SPECIAL_HERO_KEYS=\['18','19','20'\];/, '모든 전용 화면에 일반광고 3장이 공통 적용되어야 합니다.');
assert.match(rc6, /\.filter\(Boolean\)\.slice\(0,RC6_CAMPAIGN_STORE_HERO_LIMIT\)/, '사진이 많아도 전용 화면 전체가 17장을 넘으면 안 됩니다.');
assert.match(rc6, /RC6_CAMPAIGN_SPECIAL_HERO_KEYS\.map\(/, '가게별 설정 누락과 관계없이 일반광고 3장을 붙여야 합니다.');
assert.match(rc6, /hero-campaigns\.json\?v=store-campaign-standard-1-dedicated-hero-14-plus-3-1/, 'The standardized campaign data cache must be refreshed.');
assert.match(loader, /rc6-fixes\.js\?v=[^'\n]*dedicated-hero-14-plus-3-1/, 'The RC6 loader cache must include the standardized campaign release.');
assert.match(index, /final-experience\.js\?v=[^"\n]*dedicated-hero-14-plus-3-1/, 'The page loader cache must include the standardized campaign release.');
assert.match(rc6, /hero-campaigns\.json\?v=[^'\n]*ppongtteurak-14-1/, 'The fourteen-photo Bbungtteurak data cache must be refreshed.');
assert.match(loader, /rc6-fixes\.js\?v=[^'\n]*ppongtteurak-14-1/, 'The RC6 loader cache must include the fourteen-photo Bbungtteurak release.');
assert.match(index, /final-experience\.js\?v=[^"\n]*ppongtteurak-14-1/, 'The page loader cache must include the fourteen-photo Bbungtteurak release.');
assert.match(rc6, /hero-campaigns\.json\?v=[^'\n]*all-photo-capacity-audit-1/, 'The audited campaign data cache must be refreshed.');
assert.match(loader, /rc6-fixes\.js\?v=[^'\n]*all-photo-capacity-audit-1/, 'The RC6 loader cache must include the audited campaign release.');
assert.match(index, /final-experience\.js\?v=[^"\n]*all-photo-capacity-audit-1/, 'The page loader cache must include the audited campaign release.');
assert.match(rc6, /hero-campaigns\.json\?v=[^'\n]*bbq-menu-photos-14-1/, 'The BBQ fourteen-photo campaign data cache must be refreshed.');
assert.match(loader, /rc6-fixes\.js\?v=[^'\n]*bbq-menu-photos-14-1/, 'The RC6 loader cache must include the BBQ fourteen-photo release.');
assert.match(index, /final-experience\.js\?v=[^"\n]*bbq-menu-photos-14-1/, 'The page loader cache must include the BBQ fourteen-photo release.');
assert.match(index, /final-experience\.js\?v=[^"\n]*hero-qr-auto-popup-1/, 'The page loader cache must include the hero QR popup release.');

console.log('store-campaign-nine-regression-test: pass');
