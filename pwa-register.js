'use strict';

// 주문앱 지문등록 자료는 기존 가게 데이터를 덮어쓰지 않고 빈 항목에만 합칩니다.
const fingerprintRuntime = document.createElement('script');
fingerprintRuntime.src = '/order-app-fingerprint-runtime.js?v=20260802-1';
fingerprintRuntime.async = false;
document.head.append(fingerprintRuntime);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', {scope: '/'})
      .catch(() => {
        // 앱 설치 지원 실패가 음식지도 이용을 막지 않도록 조용히 무시합니다.
      });
  });
}
