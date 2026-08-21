import assert from 'node:assert/strict';
import fs from 'node:fs';

const rc2 = fs.readFileSync('rc2-fixes.js', 'utf8');
const rc3 = fs.readFileSync('rc3-fixes.js', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert.match(rc3, /const rc3BoundOrderMethodsTriggers = new WeakSet\(\)/,
  '복원된 새 DOM 노드는 데이터 속성이 남아 있어도 다시 터치 이벤트를 연결해야 합니다.');
assert.match(rc3, /if \(!trigger \|\| rc3BoundOrderMethodsTriggers\.has\(trigger\)\) return/);
assert.doesNotMatch(rc3, /trigger\.dataset\.rc3DirectBound === '1'/,
  '직렬화되어 남은 data 속성을 실제 이벤트 연결 여부로 사용하면 안 됩니다.');
assert.doesNotMatch(rc3, /rc3OrderMethodsGhostClickUntil/,
  '한 버튼의 중복 터치 방지가 화면 전체 클릭을 차단하면 안 됩니다.');
assert.match(rc3, /const other = event\.target\.closest\('\[data-rc3-other-methods\]'\)[\s\S]*?other\.dataset\.rc3LastTouchActivation/,
  '중복 클릭 차단은 같은 주문방법 버튼에만 적용해야 합니다.');
assert.match(rc3, /window\.daedongRestoreModalInteractions = rc3RestoreModalInteractions/);
assert.match(rc2, /function rc2RestoreSnapshot\(snapshot\)[\s\S]*?window\.daedongRestoreModalInteractions\?\.\(modal\)/,
  '뒤로가기로 HTML 스냅샷을 복원한 직후 터치 이벤트를 다시 연결해야 합니다.');
assert.match(rc3, /window\.addEventListener\('pageshow',[\s\S]*?rc3RestoreModalInteractions/);
assert.match(rc3, /visibilitychange[\s\S]*?rc3RestoreModalInteractions/);
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*order-method-return-touch-1/);
assert.match(finalExperience, /rc3-fixes\.js\?v=[^'\n]*order-method-return-touch-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*order-method-return-touch-1/);

console.log('order-method-return-touch-regression-test: pass');
