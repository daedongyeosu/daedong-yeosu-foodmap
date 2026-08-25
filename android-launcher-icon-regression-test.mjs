import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const icon = fs.readFileSync(path.join(root, 'app-icon.svg'), 'utf8');
const twa = JSON.parse(fs.readFileSync(path.join(root, 'android', 'twa-manifest.json'), 'utf8'));

assert.match(icon, /<rect width="512" height="512" rx="112" fill="#fff"\/>/);
assert.match(icon, /M294 34 169 242h83l-45 236 142-247h-86z/);
assert.match(icon, /M53 272c74-17 161-27 261-27h91l50-25v25h25v22h-25v25l-50-25h-91c-100 0-187 8-261 24z/);
assert.match(icon, /M421 231h61M421 249h67M421 267h67M421 285h61/);
assert.match(icon, /#ff5a1f/);
assert.match(icon, /#0b2b57/);

assert.equal(twa.iconUrl, 'http://127.0.0.1:8765/app-icon.svg');
assert.equal(twa.maskableIconUrl, twa.iconUrl, '일반·maskable 설치 아이콘은 같은 원본을 사용해야 합니다.');
assert.equal(twa.appVersionCode, 12);
assert.equal(twa.appVersionName, '1.0.10');
assert.equal(twa.appVersion, '1.0.10');

console.log('Android launcher icon final-design regression: PASS');
