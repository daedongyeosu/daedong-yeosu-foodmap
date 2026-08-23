import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const home = read('./index.html');
const hub = read('./guide/index.html');
const ko = read('./guide/yeosu-breakfast-restaurants/index.html');
const en = read('./en/guide/yeosu-breakfast-restaurants/index.html');
const sitemap = read('./sitemap.xml');
const robots = read('./robots.txt');

const parseJsonLd = (html, label) => {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.ok(blocks.length > 0, `${label} must include JSON-LD`);
  for (const block of blocks) assert.doesNotThrow(() => JSON.parse(block[1]), `${label} contains invalid JSON-LD`);
};

assert.match(home, /href="\/guide\/"[^>]*>여수 여행가이드/);
assert.match(hub, /rel="canonical" href="https:\/\/daedongmap\.com\/guide\/"/);
assert.match(ko, /rel="canonical" href="https:\/\/daedongmap\.com\/guide\/yeosu-breakfast-restaurants\/"/);
assert.match(en, /rel="canonical" href="https:\/\/daedongmap\.com\/en\/guide\/yeosu-breakfast-restaurants\/"/);
assert.match(ko, /hreflang="en"/);
assert.match(en, /hreflang="ko-KR"/);
assert.match(ko, /"@type":"ItemList"/);
assert.match(ko, /"numberOfItems":7/);
parseJsonLd(hub, 'guide hub');
parseJsonLd(ko, 'Korean guide');
parseJsonLd(en, 'English guide');

for (const name of ['내조국국밥 관문점','여수광장국밥','아라식당','울엄니식당','콩시루 전국본점','양대감갈비탕','일등 진 국밥']) {
  assert.ok(ko.includes(name), `missing Korean restaurant: ${name}`);
}
for (const phone of ['061-665-5251','061-665-7333','061-642-9490','061-682-5982','0507-1426-6026','061-682-8788','061-681-9933']) {
  assert.ok(ko.includes(phone), `missing phone: ${phone}`);
}
for (const url of ['https://daedongmap.com/guide/','https://daedongmap.com/guide/yeosu-breakfast-restaurants/','https://daedongmap.com/en/guide/yeosu-breakfast-restaurants/']) {
  assert.ok(sitemap.includes(`<loc>${url}</loc>`), `missing sitemap URL: ${url}`);
}
assert.match(robots, /Sitemap: https:\/\/daedongmap\.com\/sitemap\.xml/);
assert.ok(fs.statSync(new URL('./guide/assets/yeosu-breakfast-7.webp', import.meta.url)).size < 250_000, 'guide hero image must stay under 250 KB');

console.log('google guide regression test passed');
