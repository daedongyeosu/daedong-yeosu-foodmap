import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('scripts/browser-all-order-app-exact-return.mjs', 'utf8');
const readyPage = source.slice(source.indexOf('const readyPage ='), source.indexOf('const coldReturnPage ='));
assert.ok(!readyPage.includes('await page.evaluate('), 'readiness must survive entry navigation');
assert.match(readyPage, /page\.waitForFunction\(\(\) =>/);
assert.match(readyPage, /if \(!catalogPromise\) return false/);
assert.match(readyPage, /Promise\.resolve\(catalogPromise\)\.then/);
assert.match(readyPage, /return window\.__orderReturnQaCatalog\.settled/);
assert.match(readyPage, /typeof window\.openAppBrowser === 'function'/);
assert.match(readyPage, /querySelectorAll\('#storeGrid \.store-card'\)\.length > 0/);
assert.match(readyPage, /timeout: 20000/);
console.log('order-return-readiness-regression-test: navigation-safe bounded readiness requirements preserved');
