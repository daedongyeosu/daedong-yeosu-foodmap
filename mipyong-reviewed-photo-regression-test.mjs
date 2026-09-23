import assert from 'node:assert/strict';
import fs from 'node:fs';

const storeId = '2cccd02c50e16e55';
const reviewedPhoto = 'assets/notion-store-photos/a0f6eb8bcf7684/01.webp';
const manifest = JSON.parse(fs.readFileSync('data/photo-manifest.json', 'utf8'));
const campaigns = JSON.parse(fs.readFileSync('data/hero-campaigns.json', 'utf8'));
const entry = manifest.entries.find(item => item.storeId === storeId);
const campaign = campaigns.campaigns[storeId];

assert.ok(entry, '79대포 여수미평점 must have an explicit reviewed photo entry');
assert.equal(entry.storeName, '79대포 여수미평점');
assert.equal(entry.src, reviewedPhoto);
assert.deepEqual(entry.gallery, [reviewedPhoto]);
assert.equal(entry.classification, 'food');
assert.equal(entry.blocked, false);
assert.doesNotMatch(entry.src, /coupang/i, 'Coupang photos must not be used');
assert.ok(fs.existsSync(reviewedPhoto), 'reviewed 79대포 여서점 photo must exist');

assert.ok(campaign, '79대포 여수미평점 dedicated campaign must remain available');
assert.equal(campaign.slides.length, 1);
assert.equal(campaign.slides[0].image, reviewedPhoto);

console.log('PASS 79대포 여수미평점 uses the reviewed 여서점 food photo without Coupang imagery');
