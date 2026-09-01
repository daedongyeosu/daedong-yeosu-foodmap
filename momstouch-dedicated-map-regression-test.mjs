import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';

const storeId = '10db3b0db6ebf8c5';
const campaigns = JSON.parse(readFileSync('data/hero-campaigns.json', 'utf8'));
const links = JSON.parse(readFileSync('data/store-campaign-links.json', 'utf8'));
const html = readFileSync('index.html', 'utf8');
const finalExperience = readFileSync('final-experience.js', 'utf8');
const intro = readFileSync('turtle-ship-hero.js', 'utf8');
const mukkebi = readFileSync('mukkebi-summer-event.js', 'utf8');

const campaign = campaigns.campaigns[storeId];
assert.ok(campaign, '맘스터치 문수점이 전용 가게 캠페인에 등록되어야 합니다.');
assert.equal(campaign.storeId, storeId);
assert.equal(campaign.title, '맘스터치 문수점');
assert.equal(campaign.slides.length, 1, '현재 확인된 맘스터치 대표 배너 한 장을 정확히 사용해야 합니다.');
assert.equal(campaign.slides[0].storeId, storeId);
assert.equal(campaign.slides[0].image, 'images/14.png');
assert.ok(existsSync(campaign.slides[0].image), '맘스터치 대표 배너 파일이 없습니다.');

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
