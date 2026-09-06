import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const index = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const rc2 = readFileSync(new URL('./rc2-fixes.js', import.meta.url), 'utf8');
const finalExperience = readFileSync(new URL('./final-experience.js', import.meta.url), 'utf8');
const serviceWorker = readFileSync(new URL('./sw.js', import.meta.url), 'utf8');

const dedicatedEntryAssignment = index.indexOf('window.daedongDedicatedEntryStoreId = dedicatedEntryStoreId;');
const pendingReturnRead = index.indexOf("window.daedongReadEarlyExternalReturn = readSaved;");
assert.ok(
  dedicatedEntryAssignment >= 0 && dedicatedEntryAssignment < pendingReturnRead,
  'The requested QR store must be known before any previous return snapshot is considered.',
);
assert.match(
  index,
  /pending\.storageKey !== 'daedongExternalReturnRc2'[\s\S]*String\(pending\.saved\?\.storeId \|\| ''\) !== dedicatedEntryStoreId/,
  'A fresh store QR must reject saved state for another store or app-browser surface.',
);
assert.match(
  index,
  /if \(dedicatedEntryStoreId && String\(storeSaved\?\.storeId \|\| ''\) !== dedicatedEntryStoreId\) storeSaved = null;/,
  'The early snapshot renderer must independently reject a different saved store.',
);
assert.match(
  index,
  /const browserSaved = storeSaved \|\| dedicatedEntryStoreId[\s\S]*\? null/,
  'A dedicated store QR must not restore an unrelated app-browser snapshot.',
);

assert.match(
  rc2,
  /const replacingDedicatedStore = Boolean\([\s\S]*activeStoreId !== dedicatedStoreId[\s\S]*openingStoreId === dedicatedStoreId/,
  'Opening the requested QR store over a stale store must be treated as replacement, not navigation stacking.',
);
assert.match(
  rc2,
  /if \(replacingDedicatedStore\) \{[\s\S]*rc2ModalStack\.length = 0;[\s\S]*rc2InvalidatePendingReturnRestores\(\);/,
  'Replacing a stale QR store must clear both modal history and delayed return work.',
);

assert.match(index, /final-experience\.js\?v=[^"']*cross-store-qr-history-1/);
assert.match(finalExperience, /rc2-fixes\.js\?v=[^"']*cross-store-qr-history-1/);
assert.match(serviceWorker, /daedong-yeosu-app-shell-v32-cross-store-qr-history/);
assert.match(serviceWorker, /daedong-yeosu-runtime-v5-cross-store-qr-history/);

console.log('cross-store-qr-history-regression-test: pass');
