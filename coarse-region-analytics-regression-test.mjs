import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const app = await readFile(new URL('./app.js', import.meta.url), 'utf8');
const addressMap = await readFile(new URL('./rc7-address-map.js', import.meta.url), 'utf8');
const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');

const parserEnd = app.indexOf('function sendAnalyticsEvent');
assert.ok(parserEnd > 0, 'analytics parser boundary must exist');
const context = vm.createContext({
  URL,
  URLSearchParams,
  Map,
  Set,
  console,
  localStorage: {getItem: () => null, setItem: () => {}},
  sessionStorage: {getItem: () => null, setItem: () => {}},
  location: new URL('https://daedongmap.com/'),
  document: {querySelector: () => null, querySelectorAll: () => [], addEventListener: () => {}, referrer: ''},
  navigator: {},
  globalThis: {},
});
vm.runInContext(app.slice(0, parserEnd), context);

function parse(input) {
  context.__regionInput = input;
  return vm.runInContext('analyticsCoarseRegion(__regionInput)', context);
}

assert.deepEqual(
  {...parse({address: '전라남도 여수시 여서동 쌍봉로 368', type: 'postcode'})},
  {
    region1: '전남광주통합특별시',
    region2: '여수시',
    region3: '여서동',
    regionSource: 'address_search',
  },
);

assert.deepEqual(
  {...parse({address: '전남광주통합특별시 여수시 미평동 미평3길 42', type: 'postcode'})},
  {
    region1: '전남광주통합특별시',
    region2: '여수시',
    region3: '미평동',
    regionSource: 'address_search',
  },
  '새 통합특별시 명칭을 여수시 칸으로 잘못 분류하면 안 됩니다.',
);

assert.deepEqual(
  {...parse({
    address: '전남광주통합특별시 여수시 문수동 허문정1길 52',
    region1: '',
    region2: '전남광주통합특별시',
    region3: '문수동',
    type: 'postcode',
  })},
  {
    region1: '전남광주통합특별시',
    region2: '여수시',
    region3: '문수동',
    regionSource: 'address_search',
  },
  '주소검색 서비스가 광역명을 시군구 칸에 보내도 바로잡아야 합니다.',
);

assert.deepEqual(
  {...parse({address: '경기도 수원시 영통구 매탄동 123', type: 'postcode'})},
  {
    region1: '경기도',
    region2: '수원시 영통구',
    region3: '매탄동',
    regionSource: 'address_search',
  },
);

assert.deepEqual(
  {...parse({address: '경기도 광주시 경안동 1', type: 'postcode'})},
  {
    region1: '경기도',
    region2: '광주시',
    region3: '경안동',
    regionSource: 'address_search',
  },
  '광주시를 광주광역시로 잘못 분류하면 안 됩니다.',
);

const senderStart = app.indexOf('function sendAnalyticsEvent');
const senderEnd = app.indexOf('function analyticsStoreForElement');
const sender = app.slice(senderStart, senderEnd);
assert.match(sender, /region1: region\.region1/);
assert.match(sender, /region2: region\.region2/);
assert.match(sender, /region3: region\.region3/);
assert.doesNotMatch(sender, /\b(?:address|coords|latitude|longitude)\s*:/);

assert.match(addressMap, /region1: data\.sido/);
assert.match(addressMap, /region2: data\.sigungu/);
assert.match(addressMap, /data\.bname/);
assert.match(addressMap, /nominatim\.openstreetmap\.org\/reverse/);
assert.match(addressMap, /Math\.hypot\(latDistance, lngDistance\) <= 12/);
assert.match(html, /anonymous-analytics-1-coarse-region-1/);
assert.match(html, /region-current-canonical-1/);

console.log('coarse region analytics regression: PASS');
