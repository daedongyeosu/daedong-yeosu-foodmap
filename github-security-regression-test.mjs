import fs from 'node:fs';
import assert from 'node:assert/strict';

const app = fs.readFileSync('app.js', 'utf8');
const orderLinkTest = fs.readFileSync('kakao-order-link-regression-test.mjs', 'utf8');
const workflowFiles = [
  '.github/workflows/preview-api-client-checks.yml',
  '.github/workflows/post-deploy-preview-checks.yml',
  '.github/workflows/build-android-bundle.yml',
];

const analyticsStart = app.indexOf('function visitorKey()');
const analyticsEnd = app.indexOf('function analyticsOwnerExcluded()', analyticsStart);
assert.ok(analyticsStart >= 0 && analyticsEnd > analyticsStart, '분석 식별값 생성 구간을 찾을 수 없습니다.');
assert.doesNotMatch(app.slice(analyticsStart, analyticsEnd), /Math\.random\(/, '분석 식별값에 보안용이 아닌 난수를 사용하면 안 됩니다.');
assert.match(app.slice(analyticsStart, analyticsEnd), /crypto\?\.randomUUID/, '지원 브라우저에서는 보안 난수 UUID를 사용해야 합니다.');
assert.match(orderLinkTest, /endsWith\(encodedFallbackSuffix/, '주문앱 fallback URL은 정규식이 아닌 정확한 접미사로 검사해야 합니다.');
assert.doesNotMatch(orderLinkTest, /new RegExp\(.*coupangeats/s, '호스트명이 불완전한 정규식으로 해석되면 안 됩니다.');

for (const workflowFile of workflowFiles) {
  const workflow = fs.readFileSync(workflowFile, 'utf8');
  assert.doesNotMatch(workflow, /actions\/(?:checkout|setup-node|setup-java|upload-artifact)@v4\b/, `${workflowFile}에 Node.js 20 기반 GitHub Action이 남아 있으면 안 됩니다.`);
  assert.match(workflow, /actions\/checkout@v6\b/, `${workflowFile}은 Node.js 24 기반 checkout을 사용해야 합니다.`);
  if (workflow.includes('actions/setup-node@')) {
    assert.match(workflow, /actions\/setup-node@v6\b/, `${workflowFile}은 Node.js 24 기반 setup-node를 사용해야 합니다.`);
  }
  if (workflow.includes('actions/setup-java@')) {
    assert.match(workflow, /actions\/setup-java@v6\b/, `${workflowFile}은 Node.js 24 기반 setup-java를 사용해야 합니다.`);
  }
  assert.match(workflow, /actions\/upload-artifact@v7\b/, `${workflowFile}은 Node.js 24 기반 upload-artifact를 사용해야 합니다.`);
}

console.log('PASS: GitHub CodeQL 보안 및 Actions Node.js 24 회귀검사');
