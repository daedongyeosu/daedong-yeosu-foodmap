import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime = fs.readFileSync(new URL('./store-service-info.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

assert.match(runtime, /if \(serviceLoadState === 'error'\) \{\s*return \{\s*state: 'unknown',\s*label: '정보 연결 지연',\s*detail: '영업시간 정보를 불러오지 못했습니다\.',\s*today: '주문앱 또는 전화로 확인해 주세요\.'/s,
  '서비스 API 오류를 실제 영업시간 미등록 상태와 구분해야 한다.');
assert.match(runtime, /const missingHoursCopy = serviceLoadState === 'error'\s*\? '영업시간 정보를 불러오지 못했습니다\.'\s*: '확인된 영업시간이 없습니다\.'/s,
  '상세 패널도 통신 실패를 영업시간 없음으로 표시하면 안 된다.');
assert.match(runtime, /serviceLoadState = 'error';[\s\S]*refreshServiceSurfaces\(\)/,
  '서비스 API 오류 직후 카드와 상세 화면을 오류 문구로 다시 그려야 한다.');
assert.match(html, /store-service-info\.js\?v=[^"\n]*service-read-error-state-1/,
  '운영 브라우저가 수정된 영업시간 화면 코드를 즉시 받도록 캐시 버전을 갱신해야 한다.');

console.log('PASS: 영업시간 API 장애와 실제 미등록 상태를 고객 화면에서 구분');
