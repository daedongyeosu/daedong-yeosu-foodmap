import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./scripts/browser-yeosu-life-chak.mjs', import.meta.url), 'utf8');
const loaded = source.indexOf("await page.waitForLoadState('load')");
const catalog = source.indexOf('window.__daedongCatalogProgress?.complete === true');
const positioned = source.indexOf('await section.scrollIntoViewIfNeeded()');
const navigated = source.indexOf("await page.keyboard.press('ArrowDown')");
const released = source.indexOf('window.daedongEarlyHomeInteraction === true');
assert.ok(loaded > 0 && catalog > loaded && navigated > catalog && released > navigated && positioned > released,
  'trusted navigation must release the late-restoration guard before positioning the fixture');
assert.doesNotMatch(source, /waitForTimeout\(700\)/, 'a fixed short delay cannot prove the page is ready');
assert.doesNotMatch(source, /scrollIntoView\(\{block: 'start'\}\)/, 'fixture positioning must not inherit smooth scrolling');
assert.match(source, /Math\.min\(box\.bottom, innerHeight\) - Math\.max\(box\.top, 0\) >= box\.height \* 0\.25/,
  'the section must really be in the viewport before its lazy content is inspected');
assert.match(source, /querySelectorAll\('#yeosuLifeHighlights \.yeosu-life-highlight'\)\.length === 3/);
assert.match(source, /homeAudit\.highlightCount !== 3/);
assert.match(source, /lifeModal\.locator\('\.yeosu-life-tabs button'\)\.count\(\) !== 6/);
assert.match(source, /if \(pageErrors\.length\) throw new Error/);
console.log('life fixture readiness: PASS (real page lifecycle, trusted navigation, original content checks)');
