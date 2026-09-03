import fs from 'node:fs';
import assert from 'node:assert/strict';

const workflow = fs.readFileSync('.github/workflows/build-ios.yml', 'utf8');
const workflowFiles = [
  '.github/workflows/build-ios.yml',
  '.github/workflows/preview-api-client-checks.yml',
  '.github/workflows/post-deploy-preview-checks.yml',
  '.github/workflows/build-android-bundle.yml',
];

assert.match(workflow, /BUILD_NUMBER:\s*\$\{\{ github\.run_number \}\}/, 'GitHub 실행 번호를 iOS 빌드 번호로 사용해야 합니다.');
assert.match(workflow, /CURRENT_PROJECT_VERSION="\$BUILD_NUMBER"/, '서명 아카이브에 고유 빌드 번호를 전달해야 합니다.');

for (const workflowFile of workflowFiles) {
  const source = fs.readFileSync(workflowFile, 'utf8');
  assert.doesNotMatch(source, /actions\/(?:checkout|setup-node|setup-java|upload-artifact)@v4\b/, `${workflowFile}에 Node.js 20 기반 GitHub Action이 남아 있으면 안 됩니다.`);
  assert.match(source, /actions\/checkout@v6\b/, `${workflowFile}은 Node.js 24 기반 checkout을 사용해야 합니다.`);
  if (source.includes('actions/setup-node@')) assert.match(source, /actions\/setup-node@v6\b/);
  if (source.includes('actions/setup-java@')) assert.match(source, /actions\/setup-java@v6\b/);
  assert.match(source, /actions\/upload-artifact@v7\b/, `${workflowFile}은 Node.js 24 기반 upload-artifact를 사용해야 합니다.`);
}

console.log('PASS: iOS 빌드 번호 자동 증가 및 Actions Node.js 24 전환');
