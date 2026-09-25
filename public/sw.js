/*
 * 최소 서비스 워커 — 설치 가능 요건 충족용 (Phase 5A).
 * fetch 핸들러 없음: 캐시·오프라인 동작 없이 모든 요청은 평소처럼 네트워크로 간다.
 * 오프라인 입력 큐는 Phase 5C에서 다룬다.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
