import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const approvedAppStoreHash = '4898dee0a002ef790de6b7228bbfc23165141d3df23b383c351fcb107380f83c';

assert.equal(sha256('ios/AppIcon.png'), approvedAppStoreHash, 'iOS 아이콘 원본은 승인된 맛지도 C안이어야 합니다.');
assert.equal(
  sha256('ios/DaedongYeosuFoodMap/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png'),
  approvedAppStoreHash,
  'App Store 1024 아이콘은 승인된 맛지도 C안이어야 합니다.'
);

const androidManifest = JSON.parse(fs.readFileSync('android/twa-manifest.json', 'utf8'));
assert.equal(androidManifest.packageId, 'com.daedongmap.foodmap');
assert.equal(androidManifest.appVersionName, '1.0.15');
assert.equal(androidManifest.appVersion, '1.0.15');
assert.equal(androidManifest.appVersionCode, 22);

const iosProject = fs.readFileSync('ios/project.yml', 'utf8');
assert.match(iosProject, /MARKETING_VERSION: "1\.3"/);

console.log('Matjido Play Store / App Store icon regression: PASS');
