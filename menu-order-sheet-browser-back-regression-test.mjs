import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('./store-menu-preview.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const popstate = source.match(/window\.addEventListener\('popstate', event => \{([\s\S]*?)\n  \}, true\);/)?.[1] || '';

assert.match(popstate, /if \(sheet && !sheet\.hidden\) \{[\s\S]*closeMenuOrderSheet\(preview\);[\s\S]*event\.stopImmediatePropagation\(\);[\s\S]*return;/);
assert.match(popstate, /if \(preview\.classList\.contains\('menu-search-active'\)\) \{[\s\S]*exitMenuSearch\(preview\);[\s\S]*return;/);
assert.ok(popstate.indexOf('closeMenuOrderSheet(preview)') < popstate.indexOf("if (!event.state?.[MENU_HISTORY.preview])"));
assert.match(html, /store-menu-preview\.js\?v=[^"\s]*order-back-layer-1/);

console.log('menu order sheet browser back regression: PASS');
