import assert from 'node:assert/strict';
import fs from 'node:fs';

const svg = fs.readFileSync('app-icon-maskable.svg', 'utf8');
const manifest = JSON.parse(fs.readFileSync('android/twa-manifest.json', 'utf8'));

const scaleMatch = svg.match(/scale\((\.?\d+)\)/);
assert.ok(scaleMatch, '마스커블 로고에 중앙 축소 변환이 필요합니다.');
const scale = Number(scaleMatch[1]);
assert.ok(scale <= 0.72, `마스커블 로고 배율 ${scale}은 안전영역 최대 0.72를 넘습니다.`);
assert.ok(scale >= 0.68, `마스커블 로고 배율 ${scale}은 식별하기에 지나치게 작습니다.`);
assert.match(svg, /translate\(256 256\).*translate\(-256 -256\)/s,
  '로고 축소는 512px 캔버스 정중앙을 기준으로 적용해야 합니다.');
assert.equal(manifest.maskableIconUrl, 'http://127.0.0.1:8765/app-icon-maskable.svg');

console.log('Android maskable icon safe-zone regression: PASS');
