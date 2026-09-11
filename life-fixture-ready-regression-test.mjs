import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./scripts/browser-yeosu-life-chak.mjs', import.meta.url), 'utf8');
const loaded = source.indexOf("await page.waitForLoadState('load')");
const catalog = source.indexOf('window.__daedongCatalogProgress?.complete === true');
const positioned = source.indexOf("await section.evaluate(element => element.scrollIntoView({block: 'start', behavior: 'instant'}))");
const navigated = source.indexOf("await page.keyboard.press('ArrowDown')");
assert.ok(loaded > 0 && catalog > loaded && positioned > catalog && navigated > positioned,
  'fresh-entry reset and initial catalog layout must finish before trusted navigation');
assert.doesNotMatch(source, /waitForTimeout\(700\)/, 'a fixed short delay cannot prove the page is ready');
assert.doesNotMatch(source, /scrollIntoView\(\{block: 'start'\}\)/, 'fixture positioning must not inherit smooth scrolling');
assert.match(source, /querySelectorAll\('#yeosuLifeHighlights \.yeosu-life-highlight'\)\.length === 3/);
assert.match(source, /homeAudit\.highlightCount !== 3/);
assert.match(source, /lifeModal\.locator\('\.yeosu-life-tabs button'\)\.count\(\) !== 6/);
assert.match(source, /if \(pageErrors\.length\) throw new Error/);
console.log('life fixture readiness: PASS (real page lifecycle, trusted navigation, original content checks)');
