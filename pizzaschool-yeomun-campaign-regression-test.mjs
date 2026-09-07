import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';

const id = 'abb76aa470e26f7a';
const name = '피자스쿨 여문점';
const url = `https://daedongmap.com/?hero=${id}`;
const hero = JSON.parse(readFileSync('data/hero-campaigns.json', 'utf8'));
const campaign = hero.campaigns[id];

assert.ok(campaign, '피자스쿨 여문점 전용 캠페인이 있어야 합니다.');
assert.equal(hero.virtualStores[id], undefined, '실제 가게 정보와 주문 경로를 가상 가게로 덮어쓰면 안 됩니다.');
assert.equal(campaign.storeId, id);
assert.equal(campaign.title, name);
assert.equal(campaign.slug, 'pizzaschool-yeomun');
assert.equal(campaign.layout, 'food14-plus3');
assert.equal(campaign.slides.length, 14, '실제 메뉴 14장과 공통 광고 3장이 섞이는 표준 구성이어야 합니다.');
assert.equal(new Set(campaign.slides.map(slide => slide.image)).size, 14, '메뉴 사진을 반복하면 안 됩니다.');
assert.equal(new Set(campaign.slides.map(slide => slide.meta)).size, 14, '메뉴명을 반복하면 안 됩니다.');
for (const slide of campaign.slides) {
  assert.equal(slide.storeId, id, '다른 가게로 연결되는 배너가 있으면 안 됩니다.');
  assert.equal(slide.title, name);
  assert.match(slide.image, /^https:\/\/dwdwaxgahvp6i\.cloudfront\.net\/shbimg\/biz\/img\//);
  assert.ok(slide.meta.trim());
  assert.doesNotMatch(slide.meta, /\d[\d,]*\s*원|와우\s*회원/);
}
for (const menu of ['불고기피자', '포테이토피자', '콤비네이션피자', '깐쇼새우피자']) {
  assert.ok(campaign.slides.some(slide => slide.meta === menu), `대표 메뉴가 빠졌습니다: ${menu}`);
}

const links = JSON.parse(readFileSync('data/store-campaign-links.json', 'utf8')).campaigns
  .filter(entry => entry.storeId === id);
assert.equal(links.length, 1, '피자스쿨 여문점 링크는 하나만 있어야 합니다.');
assert.equal(links[0].name, name);
assert.equal(links[0].url, url);
assert.equal(links[0].previewUrl, `https://preview.daedongmap.com/?hero=${id}`);
assert.equal(links[0].qrAsset, 'assets/qr/pizzaschool-yeomun.svg');
assert.ok(existsSync(links[0].qrAsset), '피자스쿨 여문점 QR 파일이 없습니다.');
const svg = readFileSync(links[0].qrAsset, 'utf8');
assert.ok(svg.includes(`<desc>${url}</desc>`), 'QR은 미리보기가 아닌 운영 주소를 담아야 합니다.');
assert.doesNotMatch(svg, /NaN/, 'QR 크기 정보가 깨지면 안 됩니다.');
assert.match(svg, /viewBox="0 0 \d+ \d+"/, 'QR은 정상적인 정사각형 좌표를 가져야 합니다.');
assert.match(svg, /<path\s+stroke="#000000"\s+d="M0 0\.5/, 'QR 왼쪽과 위쪽에 넓은 흰 여백을 만들면 안 됩니다.');
assert.match(svg, /m1 0h7M0 1\.5/, 'QR 오른쪽에 넓은 흰 여백을 만들면 안 됩니다.');
assert.match(svg, /M0 40\.5h7/, 'QR 아래쪽에 넓은 흰 여백을 만들면 안 됩니다.');

for (const [file, asset] of [['rc6-fixes.js', 'hero-campaigns.json'], ['final-experience.js', 'rc6-fixes.js'], ['index.html', 'final-experience.js']]) {
  const source = readFileSync(file, 'utf8');
  assert.ok(source.split('\n').some(line => line.includes(`${asset}?v=`) && line.includes('pizzaschool-yeomun-1')), `새 전용 화면을 즉시 읽도록 갱신해야 합니다: ${file}`);
}
assert.ok(readFileSync('docs/STORE_CAMPAIGN_LINKS.md', 'utf8').includes(`| ${name} | <${url}>`));

console.log('pizzaschool-yeomun-campaign-regression-test: pass');
