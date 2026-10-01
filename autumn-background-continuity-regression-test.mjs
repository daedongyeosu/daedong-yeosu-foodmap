import assert from 'node:assert/strict';
import fs from 'node:fs';

const asset = fs.readFileSync('assets/seasonal/autumn-dolsan-bridge-2026-extended.svg', 'utf8');
const css = fs.readFileSync('app.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

const photoHeight = Number(asset.match(/id="autumn-photo"[\s\S]*?height="(\d+)"/)?.[1]);
const mirrorTranslate = Number(asset.match(/<g transform="translate\(0 (\d+)\) scale\(1 -1\)"/)?.[1]);

assert.equal(photoHeight, 1672, 'extended autumn photo height remains explicit');
assert.equal(mirrorTranslate, photoHeight * 2, 'mirrored continuation starts exactly where the first photo ends');
assert.doesNotMatch(asset, /translate\(0 3784\)/, 'old 440px blank band is removed');
const mobileBackgroundRule = css.match(/\.autumn-continuous-shell\{[^}]+\}/)?.[0] ?? '';
assert.match(mobileBackgroundRule, /autumn-dolsan-bridge-2026\.webp\?v=20261001-mobile-sea-solid/, 'mobile sea uses the opaque source photograph');
assert.doesNotMatch(mobileBackgroundRule, /extended\.svg/, 'mobile sea does not use the transparent extended SVG');
assert.match(mobileBackgroundRule, /background-size:100% 100%,100% 100%/, 'mobile sea fills the entire continuous shell');
assert.match(css, /@media\(min-width:761px\)[\s\S]*?width:100vw/, 'desktop sea background spans the full viewport');
assert.match(css, /background-size:100% 100%,cover/, 'desktop sea photograph covers the side gutters without letterboxing');
assert.match(css, /20261001-sea-full-viewport/, 'desktop full-width sea asset cache key is current');
assert.match(index, /autumn-dolsan-20261001-8-mobile-sea-solid/, 'homepage stylesheet cache key is current');

console.log('autumn background continuity regression: PASS');
