import assert from 'node:assert/strict';
import fs from 'node:fs';

const rider = fs.readFileSync(new URL('./scripts/browser-rider-evergreen-banner.mjs', import.meta.url), 'utf8');
const returnFlow = fs.readFileSync(new URL('./scripts/browser-all-order-app-exact-return.mjs', import.meta.url), 'utf8');
const menuSearch = fs.readFileSync(new URL('./scripts/browser-alien-pizza-menu-search.mjs', import.meta.url), 'utf8');

assert.match(rider, /#communityIntro:not\(\[hidden\]\)/);
assert.match(rider, /#communityIntroClose/);
assert.match(returnFlow, /sessionStorage\.setItem\('daedongCommunityIntroPlayedV4', '1'\)/);
assert.match(menuSearch, /sessionStorage\.setItem\('daedongCommunityIntroPlayedV4', '1'\)/);

console.log('preview browser dialog regression test passed');
