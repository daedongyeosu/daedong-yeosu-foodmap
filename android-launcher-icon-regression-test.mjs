import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const icon = fs.readFileSync(path.join(root, 'assets', 'app-icons', 'daedong-app-icon-512.png'));
const maskableIcon = fs.readFileSync(path.join(root, 'assets', 'app-icons', 'daedong-app-icon-maskable-512.png'));
const twa = JSON.parse(fs.readFileSync(path.join(root, 'android', 'twa-manifest.json'), 'utf8'));

for (const image of [icon, maskableIcon]) {
  assert.equal(image.subarray(1, 4).toString('ascii'), 'PNG');
  assert.deepEqual([image.readUInt32BE(16), image.readUInt32BE(20)], [512, 512]);
}
assert.notDeepEqual(maskableIcon, icon, 'Android 마스커블 아이콘은 안전 여백이 있는 별도 원본을 사용해야 합니다.');

assert.equal(twa.iconUrl, 'http://127.0.0.1:8765/assets/app-icons/daedong-app-icon-512.png');
assert.equal(twa.maskableIconUrl, 'http://127.0.0.1:8765/assets/app-icons/daedong-app-icon-maskable-512.png');
assert.notEqual(twa.maskableIconUrl, twa.iconUrl, 'Android 마스커블 아이콘은 안전 여백이 있는 별도 원본을 사용해야 합니다.');
assert.equal(twa.name, '여수맛지도');
assert.equal(twa.launcherName, '여수맛지도');
assert.equal(twa.appVersionCode, 17);
assert.equal(twa.appVersionName, '1.0.14');
assert.equal(twa.appVersion, '1.0.14');

console.log('Android launcher icon final-design regression: PASS');
