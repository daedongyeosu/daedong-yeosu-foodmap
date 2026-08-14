import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const rc2 = fs.readFileSync('rc2-fixes.js', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const service = fs.readFileSync('store-service-info.js', 'utf8');
const css = fs.readFileSync('store-service-info.css', 'utf8');

assert.match(service, /daedongRecentSearchStoresV1/);
assert.match(service, /const RECENT_SEARCH_LIMIT = 10/);
assert.match(service, /function rememberRecentSearchStore\(storeId, query = overviewQuery\)/);
assert.match(service, /\[item, \.\.\.readRecentSearchStores\(\)\.filter\(saved => String\(saved\.storeId\) !== id\)\]/);
assert.match(service, /최근 검색한 가게/);
assert.match(service, /data-store-service-recent-store-id/);
assert.match(service, /data-store-service-recent-clear/);
assert.match(service, /showOverview,\s*captureSearchState/);
assert.match(css, /\.store-service-recent-search/);
assert.match(css, /\.store-service-recent-list/);

assert.match(app, /sessionStorage\.setItem\(EXTERNAL_APP_DEPARTURE_KEY, '1'\)/);
assert.match(app, /localStorage\.setItem\(EXTERNAL_APP_DEPARTURE_KEY, payload\)/);
assert.match(rc2, /function rc2ReadDepartureMarker\(\)/);
assert.match(rc2, /persistentSaved\.returnToken === marker\?\.returnToken/);
assert.match(rc2, /const departureMarker = \{returnToken, savedAt: payload\.savedAt\}/);
assert.match(rc2, /searchState: window\.daedongStoreServiceInfo\?\.captureSearchState\?\.\(\) \|\| null/);
assert.match(rc2, /selectedAppKey: rc2ExternalAppKey\(sourceElement\)/);
assert.match(finalExperience, /searchState:window\.daedongStoreServiceInfo\?\.captureSearchState\?\.\(\)\|\|null/);
assert.match(rc2, /if \(rc2StoreRestorePromise\) return rc2StoreRestorePromise/);
assert.match(rc2, /if \(rc2SurfaceRestorePromise\) return rc2SurfaceRestorePromise/);
assert.match(rc2, /if \(modal\?\.hidden \|\| String\(restoredStoreId \|\| ''\) !== String\(saved\.storeId\)\) return false;[\s\S]*?rc2ClearReturnState/);
assert.match(finalExperience, /if\(modal\?\.hidden\|\|modal\.dataset\.appBrowserKey!==saved\.key\)return false;[\s\S]*?daedongClearExternalReturnState/);

const bootScript = html.match(/<script>\s*([\s\S]*?daedongFinishExternalReturnBoot[\s\S]*?)<\/script>/)?.[1] || '';
assert.ok(bootScript);

function bootWithMarker(markerToken) {
  const classes = new Set();
  const saved = {storeId: 'friend-chicken', returnToken: 'return-token-2', savedAt: Date.now()};
  const marker = {returnToken: markerToken, savedAt: Date.now()};
  const context = {
    document: {documentElement: {classList: {add: value => classes.add(value), remove: value => classes.delete(value)}}},
    sessionStorage: {getItem() { return null; }},
    localStorage: {getItem: key => {
      if (key === 'daedongExternalReturnRc2') return JSON.stringify(saved);
      if (key === 'daedongExternalAppDepartureV1') return JSON.stringify(marker);
      return null;
    }},
    history: {state: null}, window: {}, Date, JSON
  };
  vm.createContext(context);
  vm.runInContext(bootScript, context);
  return classes.has('daedong-external-return-pending');
}

assert.equal(bootWithMarker('return-token-2'), true);
assert.equal(bootWithMarker('old-token'), false);

assert.match(html, /store-service-info\.css\?v=[^"\n]*recent-search-return-1/);
assert.match(html, /store-service-info\.js\?v=[^"\n]*recent-search-return-1/);
assert.match(html, /app\.js\?v=[^"\n]*sequential-app-return-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*sequential-app-return-1/);
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*sequential-app-return-1/);
assert.doesNotMatch(html, /collector-review|요기요 수집 검수|PREVIEW 전용/);

console.log('recent-search-sequential-return-regression-test: pass');
