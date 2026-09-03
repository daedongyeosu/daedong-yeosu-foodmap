import fs from 'node:fs';
import assert from 'node:assert/strict';

const app = fs.readFileSync('app.js', 'utf8');
const orderLinkTest = fs.readFileSync('kakao-order-link-regression-test.mjs', 'utf8');

const analyticsStart = app.indexOf('function visitorKey()');
const analyticsEnd = app.indexOf('function analyticsOwnerExcluded()', analyticsStart);
assert.ok(analyticsStart >= 0 && analyticsEnd > analyticsStart, '분석 식별값 생성 구간을 찾을 수 없습니다.');
assert.doesNotMatch(app.slice(analyticsStart, analyticsEnd), /Math\.random\(/, '분석 식별값에 보안용이 아닌 난수를 사용하면 안 됩니다.');
assert.match(app.slice(analyticsStart, analyticsEnd), /crypto\?\.randomUUID/, '지원 브라우저에서는 보안 난수 UUID를 사용해야 합니다.');
assert.match(orderLinkTest, /endsWith\(encodedFallbackSuffix/, '주문앱 fallback URL은 정규식이 아닌 정확한 접미사로 검사해야 합니다.');
assert.doesNotMatch(orderLinkTest, /new RegExp\(.*coupangeats/s, '호스트명이 불완전한 정규식으로 해석되면 안 됩니다.');

console.log('PASS: GitHub CodeQL 난수·호스트 정규식 보안 회귀검사');
