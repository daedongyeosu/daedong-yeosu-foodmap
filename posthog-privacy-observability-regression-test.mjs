import fs from 'node:fs';
import assert from 'node:assert/strict';

const index = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const moduleSource = fs.readFileSync('posthog-observability.js', 'utf8');
const privacy = fs.readFileSync('privacy/index.html', 'utf8');

const posthogIndex = index.indexOf('posthog-observability.js?v=privacy-safe-1');
const appIndex = index.indexOf('src="app.js?');
assert.ok(posthogIndex >= 0, 'PostHog 관측 모듈이 index.html에 포함되어야 합니다.');
assert.ok(posthogIndex < appIndex, '관측 모듈은 app.js보다 먼저 로드되어야 합니다.');

for (const contract of [
  "autocapture: false",
  "capture_pageview: false",
  "capture_pageleave: false",
  "capture_exceptions: false",
  "person_profiles: 'never'",
  "disable_session_recording: true",
  "disable_surveys: true",
  "advanced_disable_flags: true"
]) {
  assert.ok(moduleSource.includes(contract), `개인정보 보호 설정 누락: ${contract}`);
}

assert.ok(moduleSource.includes("new Set(['daedongmap.com', 'www.daedongmap.com'])"), '운영 도메인에서만 전송해야 합니다.');
assert.ok(moduleSource.includes('ALLOWED_PROPERTIES'), '전송 속성 허용목록이 필요합니다.');
assert.ok(!moduleSource.includes("'storeName'"), '가게명은 PostHog로 보내지 않아야 합니다.');
assert.ok(!moduleSource.includes("'visitorId'"), '기존 방문자 식별값은 PostHog로 보내지 않아야 합니다.');
assert.ok(!moduleSource.includes("'sessionId'"), '기존 세션 식별값은 PostHog로 보내지 않아야 합니다.');
assert.ok(!moduleSource.includes("'region3'"), '동 단위 위치는 PostHog로 보내지 않아야 합니다.');
assert.ok(app.includes('window.daedongPostHogCapture?.(eventType'), '기존 검증된 이벤트 경로를 PostHog에 연결해야 합니다.');
assert.ok(app.includes('window.daedongPostHogSetOwnerExcluded?.(true)'), '운영자 제외 모드가 PostHog에도 적용되어야 합니다.');
assert.ok(privacy.includes('PostHog'), '개인정보처리방침에 외부 분석 처리자를 밝혀야 합니다.');
assert.ok(privacy.includes('자동 클릭 수집과 화면 녹화는 사용하지 않습니다.'), '비활성화한 수집 기능을 명확히 안내해야 합니다.');

console.log('PASS: PostHog 개인정보 최소수집·오류 관측 계약');
