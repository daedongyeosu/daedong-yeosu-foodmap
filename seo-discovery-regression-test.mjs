import assert from 'node:assert/strict';
import fs from 'node:fs';

const home = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const robots = fs.readFileSync(new URL('./robots.txt', import.meta.url), 'utf8');
const sitemap = fs.readFileSync(new URL('./sitemap.xml', import.meta.url), 'utf8');

const jsonLdBlocks = [...home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(match => JSON.parse(match[1]));

assert.ok(jsonLdBlocks.length >= 1, '메인 페이지 구조화 데이터가 유효한 JSON이어야 합니다.');
assert.match(home, /<title>여수맛지도 \| 여수 음식점·메뉴·주문앱 한눈에<\/title>/);
assert.match(home, /<meta name="description" content="여수 음식점의 메뉴·혜택과 먹깨비·땡겨요·요기요·쿠팡이츠·배달의민족·전화주문 등 주문방법을 한눈에 찾는 여수맛지도">/);
assert.match(home, /<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">/);
assert.match(home, /<meta name="googlebot" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">/);
assert.match(home, /<meta name="Yeti" content="index,follow">/);
assert.match(home, /<meta name="google-site-verification" content="zOe2jMBSOTpM42gDQ_GEpuJlYXAoi4xjSE4LT2rjdb0">/);
assert.match(home, /<meta name="naver-site-verification" content="1653d70cee24450257a5da2a72405e105415af5c">/);
assert.match(home, /<link rel="canonical" href="https:\/\/daedongmap\.com\/">/);
assert.match(home, /"@type": "WebSite"/);
assert.match(home, /"name": "여수맛지도"/);

assert.match(robots, /^User-agent: \*$/m);
assert.match(robots, /^Allow: \/$/m);
assert.match(robots, /^Sitemap: https:\/\/daedongmap\.com\/sitemap\.xml$/m);
assert.doesNotMatch(robots, /^Disallow: \/s\/$/m);
assert.doesNotMatch(robots, /^Disallow: \/m\/$/m);

assert.match(sitemap, /<loc>https:\/\/daedongmap\.com\/<\/loc><lastmod>2026-10-02<\/lastmod>/);
assert.match(sitemap, /<loc>https:\/\/daedongmap\.com\/guide\/<\/loc>/);
assert.match(sitemap, /<loc>https:\/\/daedongmap\.com\/privacy\/<\/loc>/);
assert.doesNotMatch(sitemap, /https:\/\/daedongmap\.com\/s\//);
assert.doesNotMatch(sitemap, /https:\/\/daedongmap\.com\/m\//);

console.log('Production SEO discovery regression checks passed');
