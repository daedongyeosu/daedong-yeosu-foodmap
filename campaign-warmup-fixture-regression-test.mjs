import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./scripts/browser-store-campaign-nine.mjs', import.meta.url), 'utf8');
const fixture = source.slice(source.indexOf('const corsHeaders ='), source.indexOf("await context.route('**/api/events'"));
const routes = new Map();
const stores = [{id: 'existing-id', name: 'Existing store'}];
await vm.runInNewContext(`(async () => { ${fixture} })()`, {
  context: {route: async (pattern, handler) => routes.set(pattern, handler)}, stores,
});
for (const [pattern, expected] of [
  ['**/api/catalog', stores],
  ['**/api/native/public/catalog*', {items: [], cursor: null}],
]) {
  assert.ok(routes.has(pattern), `${pattern} must not reach a live server`);
  let response;
  await routes.get(pattern)({fulfill: value => {response = value;}});
  assert.equal(response.status, 200);
  assert.equal(response.headers['Access-Control-Allow-Origin'], '*');
  assert.deepEqual(JSON.parse(response.body), expected);
}
assert.match(source, /report\.errors\.length === 0/);
assert.match(source, /report\.stores\.length === selectedCampaigns\.length/);
assert.match(source, /if \(message\.type\(\) === 'error'\) report\.errors\.push/);
console.log('campaign warmup fixture regression: PASS (isolated requests, strict errors and full campaign count)');
