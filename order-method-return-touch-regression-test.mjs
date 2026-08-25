import assert from 'node:assert/strict';
import fs from 'node:fs';

const rc2 = fs.readFileSync('rc2-fixes.js', 'utf8');
const rc3 = fs.readFileSync('rc3-fixes.js', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert.match(rc3, /const rc3OrderMethodsPointers = new Map\(\)/,
  '복원된 DOM에도 적용되는 문서 단위 포인터 추적이 필요합니다.');
assert.match(rc3, /const rc3OrderMethodsTouches = new Map\(\)/,
  'Android WebView 복귀용 문서 단위 터치 추적이 필요합니다.');
assert.match(rc3, /document\.addEventListener\('pointerdown', rc3OnOrderMethodsPointerDown, true\)/);
assert.match(rc3, /document\.addEventListener\('touchend', rc3OnOrderMethodsTouchEnd, \{capture: true, passive: false\}\)/);
assert.match(rc3, /window\.addEventListener\('pageshow', rc3ResetOrderMethodsTouchState, true\)/);
assert.match(rc3, /trigger\.removeAttribute\('data-rc3-direct-bound'\)/,
  '직렬화된 과거 직접 바인딩 표시는 제거해야 합니다.');
assert.doesNotMatch(rc3, /trigger\.addEventListener\('pointer(?:down|up|move|cancel)'/,
  '복원 시 사라지는 노드 전용 포인터 리스너를 다시 사용하면 안 됩니다.');
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*order-methods-return-stable-dom-1/);
assert.match(finalExperience, /rc3-fixes\.js\?v=[^'\n]*order-methods-return-touch-5/);
assert.match(html, /final-experience\.js\?v=[^"\n]*order-methods-return-touch-5/);

console.log('order-method-return-touch-regression-test: pass');
