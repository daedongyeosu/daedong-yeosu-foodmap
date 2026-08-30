import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('store-service-info.css', 'utf8');
const service = fs.readFileSync('store-service-info.js', 'utf8');
const menu = fs.readFileSync('store-menu-preview.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

const storeNameRule = css.match(/\.store-service-overview-card-main strong \{([\s\S]*?)\}/)?.[1] || '';
assert.match(storeNameRule, /white-space:\s*normal/);
assert.match(storeNameRule, /overflow-wrap:\s*anywhere/);
assert.doesNotMatch(storeNameRule, /text-overflow:\s*ellipsis|white-space:\s*nowrap|-webkit-line-clamp/);
assert.match(menu, /if \(wasOpen\) document\.dispatchEvent\(new CustomEvent\('daedong:menu-preview-closed'\)\)/);
assert.match(service, /document\.addEventListener\('daedong:menu-preview-closed',[\s\S]*?history\.state\?\.\[HISTORY_KEY\][\s\S]*?overviewSuspendedForChild[\s\S]*?resumeOverviewAfterChild\(\)/);
assert.match(html, /store-service-info\.css\?v=[^"\n]*full-store-name-1/);
assert.match(html, /store-service-info\.js\?v=[^"\n]*menu-return-1/);
assert.match(html, /store-menu-preview\.js\?v=[^"\n]*search-return-1/);

console.log('store service menu return regression: PASS');
