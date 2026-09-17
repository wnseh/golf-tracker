# CLAUDE.md

## 프로젝트 개요
골프 라운드 트래커 웹앱. 홀마다 샷 원장(친 후 라이 + 남은 거리 버킷 + 벌타)을 기록하고,
거기서 Elliott 기본 stat 5개·Riccio 기대 스코어·Strokes Gained(vs Tour)를 파생해 분석한다.

## 기술 스택
- **Frontend**: Next.js 16 App Router, TypeScript
- **Styling**: Tailwind CSS v4 (커스텀 색상 — globals.css `@theme inline` 참조)
- **Backend/DB**: Supabase (PostgreSQL + Auth + RLS)
- **배포**: Vercel (main push 자동 배포, https://golf-tracker-nu.vercel.app)

## 현재 상태
Phase 6 완료 (최소 데이터 재설계). 다음: Phase 5 (PWA → Kakao OAuth → 성능).
- 진행 기록·결정 이유: `claude/progress.md`
- 현행 스펙: `claude/phase6.md`
- 다음 스펙: `claude/phase5.md`

## 참조 문서
- `claude/phase6.md` — 데이터 모델, 버킷표, 파생 계산식, SG 기준표 출처
- `claude/future-improvements.md` — 실력별 기준표, Tier 2 stat, 코스 DB 등
- `claude/*.pdf` — 설계 근거 글 3개 (Elliott, Riccio, Shot Scope)
- `claude/phase1-3.md`, `claude/phase4.md` — 이력 참고용 (폐기된 모드/eSG 설계)

## 폴더 구조
```
src/app/
├── globals.css                 # Tailwind v4 @theme 커스텀 색상/폰트 + dim 색상
├── layout.tsx                  # 루트 레이아웃 (DM Sans/DM Mono)
├── (auth)/login|signup/        # 이메일 로그인/회원가입
├── (app)/layout.tsx            # 인증 체크 + 헤더 + BottomNav
├── (app)/page.tsx              # 홈: 라운드 목록
├── (app)/new-round-button.tsx  # 새 라운드 생성 모달
├── (app)/round-list.tsx        # 라운드 리스트 + 편집/삭제 모달
├── (app)/round/[id]/
│   ├── page.tsx                # 서버: round + holes fetch
│   └── hole-input.tsx          # 클라 오케스트레이터 (useReducer + 홀 캐시 + 저장)
├── (app)/card/                 # Scorecard: Elliott 타일 + 라운드/홀 테이블
├── (app)/analysis/             # Analysis: Elliott 타일 → Riccio → Trend → SG → Leak
├── (app)/settings/page.tsx     # 계정 + Sign Out
└── api/auth/signout/route.ts
src/middleware.ts               # 라우트 보호 (Next 16에서 proxy.ts로 이름 변경 예정)
src/lib/
├── types.ts                    # Shot / Lie / DistBucket / HoleLenBucket / HoleFormState / Round
├── constants.ts                # 라이·거리·홀길이 버킷 + 중간값, 날씨, empty-state, todayLocalISO
├── stats.ts                    # 순수: 원장 → 홀/라운드/기간 stat (Elliott 5 + Riccio)
├── sg.ts                       # 순수: Broadie 투어 기준표 + 샷별/라운드 SG
├── load-rounds.ts              # 서버: rounds+holes 읽어 RoundSummary(stats+sg) 생성 (Card/Analysis 공용)
└── supabase/client.ts|server.ts
src/hooks/use-drag-scroll.ts    # HoleNav 가로 드래그
src/components/
├── ui/                         # mini-toggle, collapsible-section, bottom-nav
├── stats/                      # period-filter, elliott-tiles (Card/Analysis 공용)
└── input/                      # hole-nav, shot-ledger, score-input, notes-section
supabase/migrations/
├── 001~006                     # 이력 (006까지의 테이블 중 다수는 007에서 삭제됨)
└── 007_phase6_minimal.sql      # holes 재생성 + eSG/설정 테이블 삭제 + rounds 컬럼 정리
```

## DB 테이블
```
rounds  (id, user_id, course, date, tee, handicap, rating, holes,
         weather, temperature, round_time, created_at, updated_at)
holes   (id, round_id, user_id, hole_num, par, score,
         hole_len_bucket, shots jsonb, notes, saved_at)   unique(round_id, hole_num)
```
- `shots` = `Shot[]`, `Shot = { lie, dist, pen }`. lie/dist는 **친 후** 위치. null이면 "스코어만 입력" 홀.
- 원장 완성 = 마지막이 HOLED + 앞 항목 전부 거리 있음. 완성 홀만 stat/SG 집계.
- 스코어 = shots.length + 벌타 수 (원장 완성 시 파생).
- holes 변경 시 트리거가 rounds.updated_at 갱신.

## 주요 규칙
- Supabase: 브라우저 → `supabase/client.ts` / 서버 → `supabase/server.ts`
- 색상: globals.css `@theme`의 토큰만 사용 (bg, surface, accent, blue, yellow, red, purple + dim)
- Tailwind 동적 클래스 금지 — 반드시 정적 매핑 객체 사용
- 폰트: `font-sans` = DM Sans, `font-mono` = DM Mono
- RLS 활성화 — 모든 쿼리는 인증된 유저 기준
- TypeScript strict 모드
- **미기록은 0이 아니라 N/A.** 비율엔 분모, 평균엔 라운드 수·"18홀 환산" 표기
- **SG는 항상 "vs Tour" 동반.** 기대치엔 "Riccio" 출처 표기. "eSG", "Baseline", "핸디" 표기 금지
- 계산은 `stats.ts` / `sg.ts` 순수 함수에만. 화면 컴포넌트에서 stat을 직접 계산하지 않음

## 상태 관리 패턴
- 홀 입력: `useReducer`로 `HoleFormState` 관리. ADD_SHOT / REMOVE_LAST_SHOT / TOGGLE_PEN이 스코어를 자동 파생
- 홀 캐시: `useRef<Map<number, HoleFormState>>`로 홀 전환 시 미저장 편집 보존, 네비에 노란 링 표시
- 데이터 흐름: Server Component(fetch) → Client(useReducer) → `holes` upsert(`onConflict: 'round_id,hole_num'`)
- 공통 UI: `value` / `onChange` props 패턴 (controlled)

## 테스트
- `npm run test:lib` — `stats.ts`/`sg.ts` 순수 함수 (백엔드 불필요)
- `npm run test:e2e` — Playwright, UI 흐름만 검증. `.env.local`에 `TEST_EMAIL`/`TEST_PASSWORD` 필요. `BASE_URL`로 배포본 대상 가능
- 셀렉터는 `data-testid`만 사용. 새 UI 요소에는 testid를 붙이고 `tests/README.md` 참조
- 테스트 라운드는 코스명 `[E2E]` 접두어, setup/teardown에서 자동 삭제

## 작업 시 참고
- `@/*` path alias → `./src/*`
- 마이그레이션은 Supabase 대시보드 SQL 에디터에서 수동 실행 (CLI 링크 없음)
- recharts 색상은 CSS 변수 미지원 — 하드코딩 (accent=#4ade80, blue=#60a5fa, yellow=#fbbf24, purple=#a78bfa, ref=#a0a0a0)
- 로컬 `.env`와 프로덕션이 같은 Supabase 프로젝트를 바라봄
