import assert from 'node:assert/strict';
import fs from 'node:fs';

const rider = fs.readFileSync(new URL('./scripts/browser-rider-evergreen-banner.mjs', import.meta.url), 'utf8');
const returnFlow = fs.readFileSync(new URL('./scripts/browser-all-order-app-exact-return.mjs', import.meta.url), 'utf8');
const menuSearch = fs.readFileSync(new URL('./scripts/browser-alien-pizza-menu-search.mjs', import.meta.url), 'utf8');

assert.match(rider, /sessionStorage\.setItem\('daedongCommunityIntroPlayedV4', '1'\)/);
assert.doesNotMatch(rider, /#communityIntro:not\(\[hidden\]\)/);
assert.doesNotMatch(rider, /#communityIntroClose/);
assert.match(returnFlow, /sessionStorage\.setItem\('daedongMukkebiSummerEventSeenSessionV1', '1'\)/);
assert.match(returnFlow, /homeBootVisible: document\.documentElement\.classList\.contains\('daedong-external-return-pending'\)/);
assert.match(menuSearch, /sessionStorage\.setItem\('daedongMukkebiSummerEventSeenSessionV1', '1'\)/);
assert.match(menuSearch, /waitForSelector\('#storeGrid \.store-card'/);

console.log('browser dialog setup regression test passed');
