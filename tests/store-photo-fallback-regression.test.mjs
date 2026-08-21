import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const app = readFileSync(join(root, 'app.js'), 'utf8');
const menu = readFileSync(join(root, 'store-menu-preview.js'), 'utf8');
const html = readFileSync(join(root, 'index.html'), 'utf8');

test('broken store photos recover from the same store menu payload', () => {
  assert.match(app, /const menuPhotoFallbackCache = new Map\(\)/);
  assert.match(app, /window\.daedongDataApi\.menu\(key\)/);
  assert.match(app, /store\.__menuPhotoFallbacks = photos/);
  assert.match(app, /verified-menu-photo-fallback/);
});

test('failed URLs are remembered and never retried in a loop', () => {
  assert.match(app, /store\.__failedPhotoPaths instanceof Set/);
  assert.match(app, /failed\.has\(photoUrlKey\(path\)\)/);
  assert.match(app, /store\.__failedPhotoPaths\.add\(failedKey\)/);
});

test('all customer photo surfaces identify the owning store', () => {
  assert.match(app, /data-photo-store-id=/);
  assert.match(app, /data-photo-kind="menu-entry"/);
  assert.match(menu, /data-photo-kind="menu-entry"/);
  assert.match(menu, /data-photo-kind="detail"/);
  assert.match(menu, /data-photo-kind="card"/);
});

test('asset cache keys include the photo recovery release', () => {
  assert.match(html, /broken-photo-menu-fallback-1/);
  assert.match(html, /broken-photo-fallback-1/);
});
