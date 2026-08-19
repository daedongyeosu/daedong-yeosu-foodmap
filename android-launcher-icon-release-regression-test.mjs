import assert from 'node:assert/strict';
import fs from 'node:fs';

const manifest = JSON.parse(fs.readFileSync('android/twa-manifest.json', 'utf8'));
const icon = fs.readFileSync('app-icon.svg', 'utf8');
const workflow = fs.readFileSync('.github/workflows/build-android-bundle.yml', 'utf8');

assert.equal(manifest.packageId, 'com.daedongmap.foodmap');
assert.equal(manifest.appVersionName, manifest.appVersion, 'Android 표시 버전은 두 필드가 같아야 합니다.');
assert.ok(manifest.appVersionCode >= 12, '최종 로고를 포함한 Android 번들은 versionCode 12 이상이어야 합니다.');
assert.equal(manifest.iconUrl, 'http://127.0.0.1:8765/app-icon.svg');
assert.equal(manifest.maskableIconUrl, manifest.iconUrl, '일반·마스커블 런처 아이콘은 같은 최종 로고 원본을 사용해야 합니다.');

assert.match(icon, /fill="#fff"/, '최종 로고는 흰색 배경을 유지해야 합니다.');
assert.match(icon, /fill="#ff5a1f"/, '최종 로고는 주황색 번개를 유지해야 합니다.');
assert.match(icon, /#0b2b57/, '최종 로고는 남색 포크를 유지해야 합니다.');
assert.doesNotMatch(icon, /linearGradient|radialGradient/i, '무지개 테두리나 그라데이션을 다시 넣지 않습니다.');

assert.match(workflow, /android\/twa-manifest\.json/);
assert.match(workflow, /app-icon\.svg/);
assert.match(workflow, /cp android\/twa-manifest\.json android-build\/twa-manifest\.json/);

console.log('Android launcher icon release regression: PASS');
