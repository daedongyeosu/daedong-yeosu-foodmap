import assert from 'node:assert/strict';
import fs from 'node:fs';

const manifest = JSON.parse(fs.readFileSync('android/twa-manifest.json', 'utf8'));
const icon = fs.readFileSync('assets/app-icons/daedong-app-icon-512.png');
const maskableIcon = fs.readFileSync('assets/app-icons/daedong-app-icon-maskable-512.png');
const workflow = fs.readFileSync('.github/workflows/build-android-bundle.yml', 'utf8');

assert.equal(manifest.packageId, 'com.daedongmap.foodmap');
assert.equal(manifest.appVersionName, manifest.appVersion, 'Android 표시 버전은 두 필드가 같아야 합니다.');
assert.equal(manifest.appVersionCode, 19, '여수맛지도 로고 Android 번들은 Bubblewrap 빌드 전 versionCode 19여야 합니다.');
assert.equal(manifest.iconUrl, 'http://127.0.0.1:8765/assets/app-icons/daedong-app-icon-512.png');
assert.equal(manifest.maskableIconUrl, 'http://127.0.0.1:8765/assets/app-icons/daedong-app-icon-maskable-512.png');
assert.notEqual(manifest.maskableIconUrl, manifest.iconUrl, '마스커블 런처 아이콘은 로고가 잘리지 않도록 별도 안전영역 원본을 사용해야 합니다.');

for (const image of [icon, maskableIcon]) {
  assert.equal(image.subarray(1, 4).toString('ascii'), 'PNG');
  assert.deepEqual([image.readUInt32BE(16), image.readUInt32BE(20)], [512, 512]);
}
assert.notDeepEqual(maskableIcon, icon, '마스커블 런처 아이콘은 별도 안전영역 원본을 사용해야 합니다.');

assert.match(workflow, /android\/twa-manifest\.json/);
assert.match(workflow, /assets\/app-icons\/daedong-app-icon-512\.png/);
assert.match(workflow, /assets\/app-icons\/daedong-app-icon-maskable-512\.png/);
assert.match(workflow, /cp android\/twa-manifest\.json android-build\/twa-manifest\.json/);
assert.match(workflow, /APP_VERSION_NAME=.*android-build\/twa-manifest\.json/,
  'Android 표시 버전은 twa-manifest.json에서 읽어야 합니다.');
assert.match(workflow, /printf '%s\\n' "\$APP_VERSION_NAME" \| bubblewrap/,
  'Bubblewrap에는 manifest의 표시 버전을 전달해야 합니다.');
assert.doesNotMatch(workflow, /printf '1\.0\.0\\n' \| bubblewrap/,
  '표시 버전을 1.0.0으로 되돌리는 하드코딩을 허용하지 않습니다.');

console.log('Android launcher icon release regression: PASS');
