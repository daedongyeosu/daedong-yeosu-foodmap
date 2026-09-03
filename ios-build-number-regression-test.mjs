import fs from 'node:fs';
import assert from 'node:assert/strict';

const workflow = fs.readFileSync('.github/workflows/build-ios.yml', 'utf8');

assert.match(workflow, /BUILD_NUMBER:\s*\$\{\{ github\.run_number \}\}/, 'GitHub 실행 번호를 iOS 빌드 번호로 사용해야 합니다.');
assert.match(workflow, /CURRENT_PROJECT_VERSION="\$BUILD_NUMBER"/, '서명 아카이브에 고유 빌드 번호를 전달해야 합니다.');

console.log('PASS: iOS App Store Connect 빌드 번호 자동 증가');
