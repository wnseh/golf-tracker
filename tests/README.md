# 테스트

두 종류가 한 러너(Playwright) 안에 있다.

| 프로젝트 | 위치 | 필요한 것 | 내용 |
|---|---|---|---|
| `lib` | `tests/lib/` | 없음 | `stats.ts` / `sg.ts` / `insights.ts` / `retry.ts` / `save-errors.ts` / `pending-holes.ts` 순수 함수 검증. 브라우저·서버 없이 돈다. |
| `e2e` | `tests/e2e/` | 테스트 계정 + 백엔드 | UI 만 통해서 로그인 → 라운드 → 홀 입력 → Card → Analysis 흐름 검증. |

```bash
npm run test:lib     # 계산 로직만
npm run test:e2e     # 브라우저 (next dev 를 자동으로 띄움)
npm test             # 전부
BASE_URL=https://... npm run test:e2e   # 배포본 대상
```

## e2e 준비
1. `.env.local` 에 `TEST_EMAIL` / `TEST_PASSWORD` (실제 로그인 가능한 계정).
2. 백엔드에 007 마이그레이션이 적용돼 있어야 한다.
3. 테스트가 만드는 라운드는 코스명이 `[E2E]` 로 시작하며, setup 전과 teardown 에서 자동 삭제된다 (`tests/e2e/cleanup.ts`).

## 저장 실패 시뮬레이션
- `tests/e2e/hole-save-resilience.spec.ts` 는 `page.route(/\/rest\/v1\/holes/)` 로 PostgREST 의 holes **POST(upsert)만** 실패시킨다.
  `abort('failed')` = 네트워크 실패(재시도 → 보관), `fulfill(403 + code 42501)` = 권한 오류(즉시 문구, 보관 없음).
- 보관 키: `localStorage['golf-tracker:pending-holes:<roundId>']` (`src/lib/pending-holes.ts`).
- Sentry 는 DSN 이 없으면 no-op 이라 e2e 는 DSN 없이 돈다.

## 주요 testid (원장)
`shot-row[data-lie|data-dist|data-pen|data-strike]`, `strike-toggle-N`, `pen-toggle-N`, `driver-toggle[data-driver=true|false|'']`(파4·5 티에서 친 줄만), `remove-last-shot`,
`lie-HZ`, `lie-OB` → `ob-replay`(다시 치기 +1) / `ob-drop`(특설티·드롭 +2, 이어서 `dist-*`), `auto-pen-N`(HZ/OB 줄의 고정 벌타 배지).

## 주요 testid (저장 복원력 / 에러 페이지)
`save-hole[data-saving|data-retrying]`, `save-retrying`, `pending-notice[data-count]`, `hole-nav-N[data-state=pending]`,
`error-page`, `error-retry`, `error-home`, `global-error-page`, `global-error-retry`, `not-found-page`, `not-found-home`,
`signup-error`, `edit-round-error`, `new-round-error`, `login-error`.

## 프론트/백엔드 분리 시
- 테스트는 `data-testid` 와 화면 텍스트만 본다. API 형태가 바뀌어도 UI 동작이 같으면 통과해야 한다.
- 백엔드에 직접 닿는 파일은 `tests/e2e/cleanup.ts` 와 저장 실패 스펙의 라우트 패턴 둘이다. Supabase 를 교체하면 그 둘만 바꾼다.
- `BASE_URL` 로 분리된 프론트 배포본을 가리키면 그대로 돌릴 수 있다.
