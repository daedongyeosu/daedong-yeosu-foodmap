import assert from 'node:assert/strict';
import fs from 'node:fs';

const campaigns = JSON.parse(fs.readFileSync(new URL('./data/hero-campaigns.json', import.meta.url), 'utf8')).campaigns;
const storeId = '0abd7147b7d6b1dd';
const campaign = campaigns[storeId];
const slides = campaign?.slides || [];
const imagePattern = /^https:\/\/daedong-yeosu-data-api-preview\.sisakim\.workers\.dev\/api\/media\/yogiyo-menu\/v1\/[a-f0-9]{64}\.jpg$/;

assert.ok(campaign, '비비큐 미평둔덕점 전용 배너가 있어야 합니다.');
assert.equal(slides.length, 14, '비비큐 전용 메인배너는 기존 음식사진 14장을 보여야 합니다.');
assert.equal(new Set(slides.map((slide) => slide.image)).size, 14, '비비큐 메인배너 사진이 중복되면 안 됩니다.');
assert.equal(new Set(slides.map((slide) => slide.meta)).size, 14, '비비큐 메인배너 메뉴명이 중복되면 안 됩니다.');
for (const slide of slides) {
  assert.equal(slide.storeId, storeId, '비비큐 배너가 다른 가게로 연결되면 안 됩니다.');
  assert.equal(slide.title, '비비큐 미평둔덕점', '비비큐 가게명이 바뀌면 안 됩니다.');
  assert.ok(slide.meta, '비비큐 배너에 실제 메뉴명이 있어야 합니다.');
  assert.match(slide.image, imagePattern, '비비큐 배너는 승인된 기존 요기요 음식사진만 사용해야 합니다.');
}
assert.equal(slides.some((slide) => slide.image.includes('/assets/store-photos/0abd7147b7d6b1dd/01.jpg')), false, '로고 중심 단일 대표이미지를 다시 사용하면 안 됩니다.');

console.log('비비큐 메인배너 기존 음식사진 14장 회귀검사 통과');
