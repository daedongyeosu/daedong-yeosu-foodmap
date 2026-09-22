import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const icon = fs.readFileSync(path.join(root, 'app-icon.svg'), 'utf8');
const maskableIcon = fs.readFileSync(path.join(root, 'app-icon-maskable.svg'), 'utf8');
const twa = JSON.parse(fs.readFileSync(path.join(root, 'android', 'twa-manifest.json'), 'utf8'));

assert.match(icon, /<title id="title">대동맵 로고<\/title>/);
assert.match(icon, /viewBox="0 -443\.5 1774 1774"/);
assert.match(icon, /fill="#E51B2A" stroke="#211815" stroke-width="18"/);
assert.match(icon, /fill="#211815"/);

assert.match(maskableIcon, /<rect x="0" y="-443\.5" width="1774" height="1774" fill="#FFFFFF"\/>/);
assert.match(maskableIcon, /translate\(887 443\.5\) scale\(\.72\) translate\(-887 -443\.5\)/);
assert.match(maskableIcon, /fill="#E51B2A" stroke="#211815" stroke-width="18"/);

assert.equal(twa.iconUrl, 'http://127.0.0.1:8765/app-icon.svg');
assert.equal(twa.maskableIconUrl, 'http://127.0.0.1:8765/app-icon-maskable.svg');
assert.notEqual(twa.maskableIconUrl, twa.iconUrl, 'Android 마스커블 아이콘은 안전 여백이 있는 별도 원본을 사용해야 합니다.');
assert.equal(twa.name, '대동맵');
assert.equal(twa.launcherName, '대동맵');
assert.equal(twa.appVersionCode, 15);
assert.equal(twa.appVersionName, '1.0.12');
assert.equal(twa.appVersion, '1.0.12');

console.log('Android launcher icon final-design regression: PASS');
