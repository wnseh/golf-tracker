# CLAUDE.md

## 프로젝트 개요
골프 라운드 트래커 웹앱. 샷별 프리샷/포스트샷 루틴을 코스에서 실시간 기록하고 라운드 후 분석.

## 기술 스택
- **Frontend**: Next.js 16 App Router, TypeScript
- **Styling**: Tailwind CSS v4 (커스텀 색상 — globals.css `@theme inline` 참조)
- **Backend/DB**: Supabase (PostgreSQL + Auth + RLS)
- **배포**: Vercel

## 핵심 참조 파일
- `claude/phase1-3.md` — Phase 1~3 요구사항, DB 스키마, 컴포넌트 구조 (완료)
- `claude/phase4.md` — Phase 4 Scorecard & Analysis (eSG) 스펙 (4A/4B/4C 완료, 4D → future-improvements.md)
- `claude/phase5.md` — Phase 5 고도화 (OAuth, PWA 등)
- `claude/future-improvements.md` — Phase 4D (Widgets/Pin) 및 기타 미래 기능
- `claude/golf-tracker.html` — 완성된 UI/UX MVP. 컴포넌트 이식 시 반드시 참조

## 폴더 구조
```
src/app/
├── globals.css                 # Tailwind v4 @theme 커스텀 색상/폰트 + dim 색상
├── layout.tsx                  # 루트 레이아웃 (DM Sans/DM Mono)
├── (auth)/layout.tsx           # Auth 레이아웃
├── (auth)/login/page.tsx       # 이메일 로그인
├── (auth)/signup/page.tsx      # 이메일 회원가입
├── (app)/layout.tsx            # 인증 체크 + 헤더 + BottomNav
├── (app)/page.tsx              # 홈: 라운드 목록 + 톱니바퀴 설정 링크
├── (app)/new-round-button.tsx  # 새 라운드 생성 모달
├── (app)/round/[id]/
│   ├── page.tsx                # 서버 컴포넌트 (fetch round + holes + clubs + migration)
│   └── hole-input.tsx          # 클라이언트 오케스트레이터 (useReducer + 캐시 + GIR/putts)
├── (app)/round-list.tsx          # 라운드 리스트 + 편집/삭제 모달 + 날씨/모드 표시
├── (app)/settings/
│   ├── page.tsx                # 설정 서버 컴포넌트 (클럽 + user_settings fetch)
│   └── settings-client.tsx     # 클럽 에디터 + 기본 모드 선택 + Sign Out
├── (app)/analysis/page.tsx     # Placeholder (Coming Soon)
├── (app)/card/page.tsx         # Placeholder (Coming Soon)
├── api/auth/signout/route.ts   # 로그아웃 API
src/middleware.ts               # 라우트 보호
src/lib/
├── types.ts                    # TypeScript 타입 (InputMode, WeatherVal, UserSettings 포함)
├── constants.ts                # 게임 상수 + 클럽 설정 + 모드/날씨/대강 상수 + empty-state 헬퍼
├── migration.ts                # 구 데이터 마이그레이션 (shape split, slope array, speed numeric)
├── mode-context.tsx            # ModeContext (mode + setMode)
├── casual-mapping.ts           # 대강 모드 → 기존 필드 매핑 헬퍼
├── supabase/client.ts          # 브라우저용
└── supabase/server.ts          # 서버 컴포넌트용
src/hooks/
└── use-drag-scroll.ts          # Pointer 이벤트 기반 수평 드래그 스크롤 훅
src/components/
├── ui/                         # 공통 UI 컴포넌트
│   ├── collapsible-section.tsx # 접이식 섹션 (아이콘+제목+상태+쉐브론)
│   ├── routine-block.tsx       # PRE/POST 서브 접이식 블록
│   ├── mini-toggle.tsx         # 단일 선택 버튼 그룹 (범용)
│   ├── multi-toggle.tsx        # 중복 선택 버튼 그룹 (slope 등)
│   ├── wind-grid.tsx           # 3×3 바람 방향 그리드
│   ├── shape-grid.tsx          # 2행 StartLine+Curve 선택 (ShapeScroll 대체)
│   ├── star-rating.tsx         # 5단계 commit level
│   ├── read-row.tsx            # R-- ~ R++ 퍼팅 read 버튼
│   ├── info-tooltip.tsx        # ⓘ 탭 설명 팝오버
│   └── bottom-nav.tsx          # 5탭 하단 네비게이션 (fixed)
└── input/                      # 입력 도메인 컴포넌트
    ├── hole-nav.tsx            # 홀 선택 가로 스크롤 칩 (드래그 스크롤)
    ├── score-input.tsx         # +/- 스테퍼 (STG/Putts 스테퍼 + GIR 뱃지, variant: fun/casual/serious)
    ├── fun-mode.tsx            # 명랑 모드 (스코어 + 노트만)
    ├── tee-shot.tsx            # 티샷 섹션 (ShapeGrid, 동적 클럽, par 기반)
    ├── ground-shot/
    │   ├── index.tsx           # 그라운드샷 래퍼 (+ Add Shot, userClubs 전달)
    │   └── shot-card.tsx       # 개별 샷 카드 (ShapeGrid, MultiToggle slope, 툴팁)
    ├── putting/
    │   ├── index.tsx           # 퍼팅 래퍼 (+ Add Putt)
    │   └── putt-card.tsx       # 개별 퍼팅 카드 (30m, 툴팁) — Green Speed 제거됨
    ├── casual/                  # 대강 모드 컴포넌트
    │   ├── casual-tee-shot.tsx # 클럽 + 결과 + 방향 + 컨택트
    │   ├── casual-ground-shot.tsx # intent + distBucket + 클럽 + 결과 + lie
    │   └── casual-putting.tsx  # distBucket + outcome + speed + missSide
    └── notes-section.tsx       # 자유 텍스트 노트
supabase/migrations/
├── 001_init.sql                # rounds + holes 테이블 + RLS
├── 002_user_clubs.sql          # user_clubs 테이블 + RLS
├── 003_phase3a.sql             # green_speed, weather, temperature, round_time → rounds
└── 004_phase3b.sql             # input_mode → rounds + user_settings 테이블
```

## 주요 규칙
- Supabase 클라이언트: 브라우저 → `src/lib/supabase/client.ts` / 서버 → `src/lib/supabase/server.ts`
- 색상은 반드시 globals.css @theme의 커스텀 색상 사용 (bg, surface, accent, blue, yellow, red, purple + dim 변형)
- dim 색상(accent-dim, red-dim 등)은 선택 상태 배경에 사용 — 동적 보간 금지, 정적 클래스만 사용
- 폰트: `font-sans` = DM Sans, `font-mono` = DM Mono
- RLS 활성화 — 모든 쿼리는 인증된 유저 기준으로 동작
- TypeScript strict 모드

## DB 테이블 요약
```
rounds      (id, user_id, course, date, tee, handicap, rating, holes,
             green_speed, weather, temperature, round_time, input_mode)
holes       (id, round_id, user_id, hole_num, par, score,
             tee_routine jsonb, stg_shots jsonb, putt_cards jsonb, notes)
user_clubs  (id, user_id, club_name, carry_m, total_m, sort_order)
user_settings (user_id, default_mode, updated_at)
```
- 샷 데이터는 jsonb로 저장. Shape는 2필드 (startLine + curve). Slope는 string[].
- Green Speed는 라운드 레벨 (rounds.green_speed). 퍼트카드의 preSpeed는 null로 저장.
- input_mode: 'fun' | 'casual' | 'serious' — UI 복잡도만 결정, 동일 DB 스키마 사용.

## 현재 진행 상황

### Phase 1 — 기반 세팅 ✅ 완료
- [x] Next.js 프로젝트 생성
- [x] Supabase 프로젝트 생성 + ENV 설정
- [x] DB 스키마 SQL 작성 (`supabase/migrations/001_init.sql`)
- [x] TypeScript 타입 정의 (`src/lib/types.ts`)
- [x] Supabase 클라이언트 설정 (browser + server)
- [x] 디자인 시스템 (Tailwind v4 @theme, DM Sans/DM Mono)
- [x] Auth (이메일 로그인/회원가입 + 로그아웃)
- [x] 미들웨어 라우트 보호
- [x] 홈 화면 (라운드 목록 + 새 라운드 생성 모달)

### Phase 2 — 핵심 기능 이식 ✅ 완료
- [x] 홀 입력 화면 이식 (`round/[id]/page.tsx` + `hole-input.tsx`)
- [x] TeeShot, GroundShot, Putting 컴포넌트
- [x] 공통 UI (CollapsibleSection, RoutineBlock, MiniToggle, WindGrid, ShapeScroll, StarRating, ReadRow)
- [x] 게임 상수 모듈 (`src/lib/constants.ts`)
- [x] PuttFeelVal 타입 + HoleFormState 인터페이스 추가
- [x] globals.css dim 색상 토큰 추가
- [x] Supabase upsert 연동 (SAVE HOLE, `onConflict: 'round_id,hole_num'`)
- [x] 홀 네비게이션 (저장 상태 색상 표시: under-par=초록, par=회색, over-par=빨강)
- [x] useReducer + useRef 홀 캐시로 홀 전환 시 데이터 보존
- [x] 저장 후 다음 홀 자동 이동

### Phase 2b — UI 개선 + 설정 + 네비게이션 ✅ 완료
- [x] Shape 2필드 분리 (StartLine + Curve) → ShapeGrid 컴포넌트
- [x] Slope 중복선택 → MultiToggle 컴포넌트
- [x] 퍼팅: 거리 30m, 그린스피드 슬라이더 (2.0~4.0)
- [x] 디폴트값 적용 (wind=none/calm, traj=mid, shape=straight 등)
- [x] InfoTooltip (Ground Shot intent 설명, Read 설명)
- [x] GIR/Putts 자동 계산 + ScoreInput에 뱃지 표시
- [x] user_clubs 테이블 + 설정 페이지 (클럽 추가/삭제/거리 설정)
- [x] 동적 클럽 리스트 (userClubs 기반, par 3 확장)
- [x] Bottom Navigation (Home, Input, Analysis, Card, Setting)
- [x] 드래그 스크롤 훅 (hole-nav)
- [x] 구 데이터 마이그레이션 레이어 (shape split, slope array, speed numeric)
- [x] Placeholder 페이지 (Analysis, Card — Coming Soon)

### Phase 2c — UI 개선 + 기능 보완 ✅ 완료
**[fix]**
- [x] Step 1: Desktop 홀 네비게이션 클릭 버그 + 스크롤 개선
- [x] Step 2: 홈 설정 버튼 정리 + Sign Out → Settings 이동
**[feat]**
- [x] Step 3: Collapsible 섹션 하단 접기 버튼
- [x] Step 4: 클럽 선택 시 target 거리 자동 입력
- [x] Step 5: 라운드 리스트 편집/삭제 메뉴
**[design]**
- [x] Step 6: InfoTooltip 디자인 개선

### Phase 3 — 모드 시스템 + 핵심 개선 ✅ 완료
**Phase 3a — DB 변경 + 핵심 기능 개선**
- [x] DB 마이그레이션 (green_speed, weather, temperature, round_time → rounds)
- [x] 타입 변경 (WeatherVal, InputMode, UserSettings, Round 확장, shotsToGreenOverride)
- [x] 상수 추가 (날씨/모드/대강 모드 상수)
- [x] Green Speed → 라운드 레벨 이동 (퍼트카드에서 제거)
- [x] Shots to Green 양방향 스테퍼 (ScoreInput ↔ GroundShots 자동 조정)
- [x] Putts 양방향 스테퍼 (ScoreInput ↔ PuttCards 자동 조정)
- [x] GIR 계산 변경 (shotsToGreen <= par-2)
- [x] DR 자동선택 (par >= 4, 유저 DR 보유 시)
- [x] 라운드 생성/수정에 Green Speed, Weather, Temperature 추가
- [x] 라운드 헤더에 날씨/온도/스피드 표시
**Phase 3b — 모드 시스템 인프라**
- [x] DB 마이그레이션 (input_mode → rounds, user_settings 테이블)
- [x] ModeContext (mode + setMode)
- [x] 입력 화면 모드 토글 (명랑/대강/진지) + DB 반영
- [x] 설정 페이지 기본 모드 선택
- [x] 라운드 생성 모달 모드 선택
**Phase 3c — 모드별 UI 구현**
- [x] FunMode 컴포넌트 (스코어 + 노트만)
- [x] CasualTeeShot (클럽 + 결과 + 방향 + 컨택트)
- [x] CasualGroundSection (intent + distBucket + 클럽 + 결과 + lie)
- [x] CasualPuttingSection (distBucket + outcome + speed + missSide)
- [x] HoleInput 조건부 렌더링 (mode별 UI 분기)
- [x] ScoreInput variant prop (fun/casual/serious)
- [x] casual-mapping.ts (대강 UI → 기존 필드 매핑)

### Phase 4 — Scorecard & Analysis (다음)
> 상세 스펙: `claude/phase4.md`

**Phase 4A — Data Plumbing + Casual 입력 확장 ✅ 완료**
- [x] StgShot.leaveDistBucket + PuttCard.distBucket 추가
- [x] 자동 매핑 (ARG result → leaveDistBucket, putt dist → distBucket)
- [x] expected_strokes 테이블 + seed
- [x] skill_index_snapshots 테이블 + SkillIndex v1 계산
**Phase 4B — Scorecard (Card 탭) MVP ✅ 완료**
- [x] 기간 필터 (연/월/커스텀) + 상단 요약 카드
- [x] 라운드 리스트 + 펼침 홀 테이블
- [x] Missing data → N/A + 분모/coverage
**Phase 4C — Analysis (Analysis 탭) MVP ✅ 완료**
- [x] recharts 트렌드 차트 (Score/Putts)
- [x] Biggest Leak 카드 (eSG 기반 + confidence/coverage)
- [x] round_metrics 프리컴퓨트 (on-demand + stale check)
- [x] Leak ranking v1 (룰 기반 action 추천)
**Phase 4D — Widgets 추천 + Pin → `claude/future-improvements.md` 이동**

## 상태 관리 패턴
- 홀 입력: `useReducer`로 `HoleFormState` 관리 (`hole-input.tsx`)
- 홀 캐시: `useRef<Map<number, HoleFormState>>`로 전환 시 클라이언트 보존
- 데이터 흐름: Server Component(fetch) → Client Component(useReducer) → props down → Supabase upsert(browser client)
- 공통 UI 컴포넌트는 모두 `value`/`onChange` props 패턴 (controlled)
- Tailwind 동적 클래스 사용 금지 — 반드시 정적 매핑 객체 사용 (예: `intentActiveClass[intent]`)
- 모드 시스템: `ModeContext`로 현재 모드 전파. 모드는 UI 복잡도만 결정, 데이터 모델 동일.
- 양방향 STG/Putts: ScoreInput 스테퍼 변경 → 리듀서가 stgShots/puttCards 자동 조정, 반대도 동작

## 작업 시 참고
- `claude/golf-tracker.html` — UI 원본 참조 (분석 화면 이식 시 활용)
- 홀 저장: `holes` 테이블 upsert (`onConflict: 'round_id,hole_num'`)
- `@/*` path alias → `./src/*` (tsconfig.json)
- 새 입력 컴포넌트 추가 시 `src/components/input/` 아래, 공통 UI는 `src/components/ui/` 아래
