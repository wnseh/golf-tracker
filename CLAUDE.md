# CLAUDE.md

## 프로젝트 개요
골프 라운드 트래커 웹앱. 샷별 프리샷/포스트샷 루틴을 코스에서 실시간 기록하고 라운드 후 분석.

## 기술 스택
- **Frontend**: Next.js 16 App Router, TypeScript
- **Styling**: Tailwind CSS v4 (커스텀 색상 — globals.css `@theme inline` 참조)
- **Backend/DB**: Supabase (PostgreSQL + Auth + RLS)
- **배포**: Vercel

## 현재 상태
Phase 4 완료 (Scorecard + Analysis MVP). 다음: Phase 5.
- 상세 진행 기록: `claude/progress.md`
- 다음 스펙: `claude/phase5.md`

## 참조 문서
- `claude/phase4.md` — Phase 4 eSG 스펙 (구현 완료, 세부 로직 참조용)
- `claude/future-improvements.md` — Phase 4D 및 미래 기능
- `claude/golf-tracker.html` — 원본 UI/UX 프로토타입 (새 컴포넌트 이식 시 참조)

## 폴더 구조
```
src/app/
├── globals.css                 # Tailwind v4 @theme 커스텀 색상/폰트 + dim 색상
├── layout.tsx                  # 루트 레이아웃 (DM Sans/DM Mono)
├── (auth)/login/page.tsx       # 이메일 로그인
├── (auth)/signup/page.tsx      # 이메일 회원가입
├── (app)/layout.tsx            # 인증 체크 + 헤더 + BottomNav
├── (app)/page.tsx              # 홈: 라운드 목록
├── (app)/new-round-button.tsx  # 새 라운드 생성 모달
├── (app)/round-list.tsx        # 라운드 리스트 + 편집/삭제 모달
├── (app)/round/[id]/
│   ├── page.tsx                # 서버 컴포넌트 (fetch round + holes + clubs)
│   └── hole-input.tsx          # 클라이언트 오케스트레이터 (useReducer + 캐시)
├── (app)/settings/
│   ├── page.tsx                # 설정 서버 컴포넌트
│   └── settings-client.tsx     # 클럽 에디터 + 기본 모드 + Sign Out
├── (app)/analysis/
│   ├── page.tsx                # Analysis 서버 컴포넌트 (round_metrics 계산/upsert)
│   └── analysis-client.tsx     # Analysis UI (recharts 트렌드 + Leak 카드)
├── (app)/card/
│   ├── page.tsx                # Scorecard 서버 컴포넌트
│   └── scorecard-client.tsx    # Scorecard UI (기간 필터 + 라운드 리스트)
└── api/auth/signout/route.ts   # 로그아웃 API
src/middleware.ts               # 라우트 보호
src/lib/
├── types.ts                    # TypeScript 타입 정의
├── constants.ts                # 게임 상수 + 클럽 설정 + empty-state 헬퍼 + bucket 매핑 함수
├── esg.ts                      # 순수 eSG 계산 라이브러리 (서버 전용)
├── migration.ts                # 구 데이터 마이그레이션 헬퍼
├── mode-context.tsx            # ModeContext (mode + setMode)
├── casual-mapping.ts           # 대강 모드 UI → DB 필드 매핑
├── supabase/client.ts          # 브라우저용 Supabase 클라이언트
└── supabase/server.ts          # 서버 컴포넌트용 Supabase 클라이언트
src/hooks/
└── use-drag-scroll.ts          # Pointer 이벤트 기반 수평 드래그 스크롤
src/components/
├── ui/                         # 공통 UI (collapsible-section, mini-toggle, multi-toggle,
│                               #   wind-grid, shape-grid, star-rating, read-row,
│                               #   info-tooltip, bottom-nav, routine-block)
└── input/                      # 입력 도메인 컴포넌트
    ├── hole-nav.tsx
    ├── score-input.tsx         # variant: fun/casual/serious
    ├── fun-mode.tsx
    ├── tee-shot.tsx
    ├── ground-shot/            # index.tsx + shot-card.tsx
    ├── putting/                # index.tsx + putt-card.tsx
    ├── casual/                 # casual-tee-shot, casual-ground-shot, casual-putting
    └── notes-section.tsx
supabase/migrations/
├── 001_init.sql                # rounds + holes + RLS
├── 002_user_clubs.sql          # user_clubs
├── 003_phase3a.sql             # green_speed, weather, temperature, round_time → rounds
├── 004_phase3b.sql             # input_mode → rounds, user_settings 테이블
├── 005_phase4a.sql             # expected_strokes + seed, skill_index_snapshots
└── 006_phase4c.sql             # rounds.updated_at + 트리거, round_metrics 테이블
```

## DB 테이블
```
rounds            (id, user_id, course, date, tee, handicap, rating, holes,
                   green_speed, weather, temperature, round_time, input_mode,
                   created_at, updated_at)
holes             (id, round_id, user_id, hole_num, par, score,
                   tee_routine jsonb, stg_shots jsonb, putt_cards jsonb, notes)
user_clubs        (id, user_id, club_name, carry_m, total_m, sort_order)
user_settings     (user_id, default_mode, updated_at)
expected_strokes  (baseline_bucket, domain, key, expected)  ← 읽기 전용 시드
skill_index_snapshots (user_id, computed_at, skill_index, baseline_bucket, confidence, ...)
round_metrics     (round_id, user_id, computed_at, baseline_bucket, esg_putt,
                   around_cost, esg_tee, coverage_*, confidence_*, ...)
```
- 샷 데이터는 jsonb. Shape: startLine + curve 2필드. Slope: string[].
- input_mode: `'fun' | 'casual' | 'serious'` — UI 복잡도만 결정, 동일 스키마.
- round_metrics는 on-demand 계산 후 upsert. rounds.updated_at 기준 stale check.

## 주요 규칙
- Supabase: 브라우저 → `supabase/client.ts` / 서버 → `supabase/server.ts`
- 색상: globals.css `@theme`의 토큰만 사용 (bg, surface, accent, blue, yellow, red, purple + dim)
- Tailwind 동적 클래스 금지 — 반드시 정적 매핑 객체 사용
- dim 색상(accent-dim 등)은 선택 상태 배경에 사용
- 폰트: `font-sans` = DM Sans, `font-mono` = DM Mono
- RLS 활성화 — 모든 쿼리는 인증된 유저 기준
- TypeScript strict 모드
- eSG 출력 시 반드시 "Estimated" 표기, "SG" 단독 사용 금지
- Baseline은 "Baseline: 11-15 (Confidence: Medium)" 형식, "핸디" 용어 금지

## 상태 관리 패턴
- 홀 입력: `useReducer`로 `HoleFormState` 관리 (`hole-input.tsx`)
- 홀 캐시: `useRef<Map<number, HoleFormState>>`로 홀 전환 시 미저장 데이터 보존
- 데이터 흐름: Server Component(fetch) → Client Component(useReducer) → Supabase upsert
- 공통 UI: `value` / `onChange` props 패턴 (controlled)
- 모드: `ModeContext`로 전파. UI 복잡도만 제어, 데이터 모델 동일.
- 양방향 STG/Putts: ScoreInput 스테퍼 ↔ stgShots/puttCards 배열 자동 동기화

## 작업 시 참고
- 홀 저장: `holes` upsert (`onConflict: 'round_id,hole_num'`)
- `@/*` path alias → `./src/*`
- 새 입력 컴포넌트: `src/components/input/` / 공통 UI: `src/components/ui/`
- recharts 색상은 CSS 변수 미지원 — 하드코딩 (accent=#4ade80, blue=#60a5fa)
