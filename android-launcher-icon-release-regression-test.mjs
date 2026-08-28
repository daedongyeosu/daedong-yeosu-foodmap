import assert from 'node:assert/strict';
import fs from 'node:fs';

const manifest = JSON.parse(fs.readFileSync('android/twa-manifest.json', 'utf8'));
const icon = fs.readFileSync('app-icon.svg', 'utf8');
const maskableIcon = fs.readFileSync('app-icon-maskable.svg', 'utf8');
const workflow = fs.readFileSync('.github/workflows/build-android-bundle.yml', 'utf8');

assert.equal(manifest.packageId, 'com.daedongmap.foodmap');
assert.equal(manifest.appVersionName, manifest.appVersion, 'Android 표시 버전은 두 필드가 같아야 합니다.');
assert.ok(manifest.appVersionCode >= 12, '최종 로고를 포함한 Android 번들은 versionCode 12 이상이어야 합니다.');
assert.equal(manifest.iconUrl, 'http://127.0.0.1:8765/app-icon.svg');
assert.equal(manifest.maskableIconUrl, 'http://127.0.0.1:8765/app-icon-maskable.svg');
assert.notEqual(manifest.maskableIconUrl, manifest.iconUrl, '마스커블 런처 아이콘은 로고가 잘리지 않도록 별도 안전영역 원본을 사용해야 합니다.');

assert.match(icon, /fill="#fff"/, '최종 로고는 흰색 배경을 유지해야 합니다.');
assert.match(icon, /fill="#ff5a1f"/, '최종 로고는 주황색 번개를 유지해야 합니다.');
assert.match(icon, /#0b2b57/, '최종 로고는 남색 포크를 유지해야 합니다.');
assert.doesNotMatch(icon, /linearGradient|radialGradient/i, '무지개 테두리나 그라데이션을 다시 넣지 않습니다.');
assert.match(maskableIcon, /scale\(\.72\)/, '마스커블 아이콘은 삼성 런처에서도 포크가 잘리지 않는 72% 안전영역을 유지해야 합니다.');
assert.doesNotMatch(maskableIcon, /rx="112"/, '마스커블 배경은 기기 마스크가 적용하므로 자체 둥근 모서리를 넣지 않습니다.');

assert.match(workflow, /android\/twa-manifest\.json/);
assert.match(workflow, /app-icon\.svg/);
assert.match(workflow, /app-icon-maskable\.svg/);
assert.match(workflow, /cp android\/twa-manifest\.json android-build\/twa-manifest\.json/);
assert.match(workflow, /APP_VERSION_NAME=.*android-build\/twa-manifest\.json/,
  'Android 표시 버전은 twa-manifest.json에서 읽어야 합니다.');
assert.match(workflow, /printf '%s\\n' "\$APP_VERSION_NAME" \| bubblewrap/,
  'Bubblewrap에는 manifest의 표시 버전을 전달해야 합니다.');
assert.doesNotMatch(workflow, /printf '1\.0\.0\\n' \| bubblewrap/,
  '표시 버전을 1.0.0으로 되돌리는 하드코딩을 허용하지 않습니다.');

console.log('Android launcher icon release regression: PASS');
