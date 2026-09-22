import assert from 'node:assert/strict';
import fs from 'node:fs';

const icon = fs.readFileSync('assets/app-icons/daedong-app-icon-512.png');
const maskableIcon = fs.readFileSync('assets/app-icons/daedong-app-icon-maskable-512.png');
const manifest = JSON.parse(fs.readFileSync('android/twa-manifest.json', 'utf8'));

for (const image of [icon, maskableIcon]) {
  assert.equal(image.subarray(1, 4).toString('ascii'), 'PNG');
  assert.deepEqual([image.readUInt32BE(16), image.readUInt32BE(20)], [512, 512]);
}
assert.notDeepEqual(maskableIcon, icon, '마스커블 로고는 중앙 축소 안전영역이 있는 별도 PNG여야 합니다.');
assert.equal(manifest.maskableIconUrl, 'http://127.0.0.1:8765/assets/app-icons/daedong-app-icon-maskable-512.png');

console.log('Android maskable icon safe-zone regression: PASS');
