import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('./store-service-info.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const matcher = source.match(/function entryMatchesQuery\(entry\) \{([\s\S]*?)\n  \}/)?.[1] || '';

assert.match(source, /function overviewIdentitySearchText\(entry\)/);
assert.match(source, /function overviewMenuContextText\(entry\)/);
assert.match(matcher, /if \(spec && MENU_FAMILIES\.includes\(spec\)\) \{[\s\S]*const isExactFamilyQuery = compact === normalize\(spec\.key\);[\s\S]*return entry\.menuMatches\.length > 0/);
assert.match(matcher, /if \(!isExactFamilyQuery && identityText\.includes\(compact\)\) return true;/);
assert.ok(matcher.indexOf('MENU_FAMILIES.includes(spec)') < matcher.lastIndexOf('if (identityText.includes(compact)) return true'));
assert.ok(matcher.indexOf('MENU_FAMILIES.includes(spec)') < matcher.indexOf('if (text.includes(compact)) return true'));
assert.match(html, /store-service-info\.js\?v=[^"\s]*grounded-menu-search-2/);

console.log('grounded menu search regression: PASS');
