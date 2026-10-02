import assert from 'node:assert/strict';
import fs from 'node:fs';

const assetPath = 'assets/seasonal/autumn-dolsan-bridge-2026-tall.webp';
const css = fs.readFileSync('app.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

assert.ok(fs.existsSync(assetPath), 'one-piece autumn raster background exists');
assert.ok(fs.statSync(assetPath).size > 100_000, 'one-piece autumn raster background is not an empty placeholder');
const mobileBackgroundRule = css.match(/\.autumn-continuous-shell\{[^}]+\}/)?.[0] ?? '';
assert.match(mobileBackgroundRule, /autumn-dolsan-bridge-2026-tall\.webp\?v=20261003-production-raster-sea-to-banner/, 'home uses the approved one-piece opaque photograph');
assert.match(mobileBackgroundRule, /background-size:100% 100%,100% 100%/, 'mobile sea fills the entire continuous shell');
assert.doesNotMatch(css, /autumn-dolsan-bridge-2026-extended\.svg/, 'home no longer assembles the background from an SVG extension');
assert.equal((css.match(/autumn-dolsan-bridge-2026-tall\.webp/g) || []).length, 1, 'the Dolsan bridge scene appears only once');
assert.match(css, /\.autumn-continuous-shell \.turtle-ship-passage\{height:0;background:transparent\}/, 'no hidden strip remains before the main banner');
assert.match(index, /autumn-dolsan-20261003-production-raster-sea-to-banner/, 'homepage stylesheet cache key is current');

console.log('autumn background continuity regression: PASS');
