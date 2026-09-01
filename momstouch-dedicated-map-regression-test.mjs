import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';

const storeId = '10db3b0db6ebf8c5';
const campaigns = JSON.parse(readFileSync('data/hero-campaigns.json', 'utf8'));
const links = JSON.parse(readFileSync('data/store-campaign-links.json', 'utf8'));
const html = readFileSync('index.html', 'utf8');
const finalExperience = readFileSync('final-experience.js', 'utf8');
const intro = readFileSync('turtle-ship-hero.js', 'utf8');
const mukkebi = readFileSync('mukkebi-summer-event.js', 'utf8');
const rc6 = readFileSync('rc6-fixes.js', 'utf8');
const rc6Css = readFileSync('rc6-fixes.css', 'utf8');

const campaign = campaigns.campaigns[storeId];
assert.ok(campaign, '맘스터치 문수점이 전용 가게 캠페인에 등록되어야 합니다.');
assert.equal(campaign.storeId, storeId);
assert.equal(campaign.title, '맘스터치 문수점');
assert.equal(campaign.slides.length, 14, '맘스터치 전용 지도는 탐나는피자와 같은 14장 대표메뉴 배너여야 합니다.');
assert.ok(campaign.slides.every(slide => slide.storeId === storeId), '모든 배너는 맘스터치 문수점만 가리켜야 합니다.');
assert.equal(new Set(campaign.slides.map(slide => slide.image)).size, 14, '대표메뉴 사진을 반복 사용하면 안 됩니다.');
assert.equal(new Set(campaign.slides.map(slide => slide.meta)).size, 14, '각 배너에는 서로 다른 실제 메뉴명이 있어야 합니다.');
assert.ok(campaign.slides.every(slide => slide.title === '맘스터치 문수점'));
assert.ok(campaign.slides.every(slide => /^https:\/\/dwdwaxgahvp6i\.cloudfront\.net\/shbimg\/biz\/img\//.test(slide.image)),
  '맘스터치 배너는 수집된 실제 메뉴 사진만 사용해야 합니다.');
assert.ok(campaign.slides.some(slide => slide.meta === '싸이버거 세트'));
assert.ok(campaign.slides.some(slide => slide.meta === '갓빠삭치킨(순살)'));
assert.ok(campaign.slides.some(slide => slide.meta === '케이준양념감자'));

assert.match(rc6, /const density=methods\.length>=4\?'dense':'normal'/,
  '주문방법이 네 개 이상인 배너에는 좁은 화면용 레이아웃 표시가 필요합니다.');
assert.match(rc6Css, /\.rc6-hero-order-footer\[data-order-density="dense"\] \.rc6-hero-order-method\{flex-direction:column/,
  '좁은 휴대전화에서는 아이콘과 주문방법명을 세로로 배치해야 합니다.');
assert.match(rc6Css, /\.rc6-hero-order-footer\[data-order-density="dense"\] \.rc6-hero-order-method b\{overflow:visible;text-overflow:clip\}/,
  '전화주문과 브랜드앱 이름을 말줄임하면 안 됩니다.');

const link = links.campaigns.find(entry => entry.storeId === storeId);
assert.equal(link?.url, `https://daedongmap.com/?hero=${storeId}`);
assert.equal(link?.previewUrl, `https://preview.daedongmap.com/?hero=${storeId}`);
assert.ok(existsSync(link?.qrAsset || ''), '맘스터치 전용 QR 파일이 없습니다.');

assert.match(
  html,
  /daedongDedicatedEntryStoreId = String\(entryParams\.get\('hero'\) \|\| entryParams\.get\('store'\)/,
  '가게전용 진입값은 비동기 초기화 전에 보존되어야 합니다.',
);
assert.match(
  finalExperience,
  /daedongResolveHeroCampaignStoreId\?\.\(requestedStoreId\)[\s\S]*searchParams\.set\('hero',campaignStoreId\)/,
  '기존 store형 QR을 닫은 뒤에도 해당 가게 전용 hero 주소를 유지해야 합니다.',
);
assert.match(intro, /const dedicatedEntryStoreId = String\(window\.daedongDedicatedEntryStoreId/);
assert.match(intro, /if \(dedicatedEntryStoreId\) \{[\s\S]*rememberSequence\(\)[\s\S]*return;/,
  '가게전용 QR 진입 뒤 일반 지역 안내 팝업이 끼어들면 안 됩니다.');
assert.match(mukkebi, /RETURN_QUERY_KEYS = \['store', 'hero'/,
  'hero형 가게전용 주소는 일반 행사 자동 팝업 대상에서 제외해야 합니다.');
assert.match(mukkebi, /!globalThis\.daedongDedicatedEntryStoreId/,
  'store 주소가 초기화 도중 제거되어도 가게전용 진입에는 일반 행사 팝업을 띄우면 안 됩니다.');

console.log('momstouch-dedicated-map-regression-test: pass');
