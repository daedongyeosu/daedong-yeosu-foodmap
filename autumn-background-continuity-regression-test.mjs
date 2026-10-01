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
assert.match(css, /sea-through-order-grid/, 'continuous sea asset cache key is current');
assert.match(index, /autumn-dolsan-20260928-6-sea-through-order-grid/, 'homepage stylesheet cache key is current');

console.log('autumn background continuity regression: PASS');
