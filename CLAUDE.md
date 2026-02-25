# CLAUDE.md

## 프로젝트 개요
골프 라운드 트래커 웹앱. 샷별 프리샷/포스트샷 루틴을 코스에서 실시간 기록하고 라운드 후 분석.

## 기술 스택
- **Frontend**: Next.js 16 App Router, TypeScript
- **Styling**: Tailwind CSS v4 (커스텀 색상 — globals.css `@theme inline` 참조)
- **Backend/DB**: Supabase (PostgreSQL + Auth + RLS)
- **배포**: Vercel

## 핵심 참조 파일
- `claude/PRD.md` — 전체 요구사항, DB 스키마, 컴포넌트 구조, 개발 단계
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
├── (app)/settings/
│   ├── page.tsx                # 설정 서버 컴포넌트 (클럽 fetch)
│   └── settings-client.tsx     # 클럽 에디터 (추가/삭제/저장)
├── (app)/analysis/page.tsx     # Placeholder (Coming Soon)
├── (app)/card/page.tsx         # Placeholder (Coming Soon)
├── api/auth/signout/route.ts   # 로그아웃 API
src/middleware.ts               # 라우트 보호
src/lib/
├── types.ts                    # TypeScript 타입 (StartLineVal, CurveVal, UserClub 포함)
├── constants.ts                # 게임 상수 + 클럽 설정 + empty-state 헬퍼 (디폴트값 적용)
├── migration.ts                # 구 데이터 마이그레이션 (shape split, slope array, speed numeric)
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
    ├── score-input.tsx         # +/- 스테퍼 (vs par + GIR/putts 뱃지)
    ├── tee-shot.tsx            # 티샷 섹션 (ShapeGrid, 동적 클럽, par 기반)
    ├── ground-shot/
    │   ├── index.tsx           # 그라운드샷 래퍼 (+ Add Shot, userClubs 전달)
    │   └── shot-card.tsx       # 개별 샷 카드 (ShapeGrid, MultiToggle slope, 툴팁)
    ├── putting/
    │   ├── index.tsx           # 퍼팅 래퍼 (+ Add Putt)
    │   └── putt-card.tsx       # 개별 퍼팅 카드 (30m, 그린스피드 슬라이더, 툴팁)
    └── notes-section.tsx       # 자유 텍스트 노트
supabase/migrations/
├── 001_init.sql                # rounds + holes 테이블 + RLS
└── 002_user_clubs.sql          # user_clubs 테이블 + RLS
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
rounds      (id, user_id, course, date, tee, handicap, rating, holes)
holes       (id, round_id, user_id, hole_num, par, score,
             tee_routine jsonb, stg_shots jsonb, putt_cards jsonb, notes)
user_clubs  (id, user_id, club_name, carry_m, total_m, sort_order)
```
샷 데이터는 jsonb로 저장. Shape는 2필드 (startLine + curve). Slope는 string[]. preSpeed는 numeric(2.0~4.0).

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

### Phase 3 — 분석 화면 (다음)
- [ ] 라운드 분석 페이지 (`round/[id]/stats/page.tsx`)
- [ ] Strokes Gained 계산 로직 이식
- [ ] 퍼팅 분석 (Read 정확도, 거리별 성공률)
- [ ] 스코어카드 화면

## 상태 관리 패턴 (Phase 2)
- 홀 입력: `useReducer`로 `HoleFormState` 관리 (`hole-input.tsx`)
- 홀 캐시: `useRef<Map<number, HoleFormState>>`로 전환 시 클라이언트 보존
- 데이터 흐름: Server Component(fetch) → Client Component(useReducer) → props down → Supabase upsert(browser client)
- 공통 UI 컴포넌트는 모두 `value`/`onChange` props 패턴 (controlled)
- Tailwind 동적 클래스 사용 금지 — 반드시 정적 매핑 객체 사용 (예: `intentActiveClass[intent]`)

## 작업 시 참고
- `claude/golf-tracker.html` — UI 원본 참조 (분석 화면 이식 시 활용)
- 홀 저장: `holes` 테이블 upsert (`onConflict: 'round_id,hole_num'`)
- `@/*` path alias → `./src/*` (tsconfig.json)
- 새 입력 컴포넌트 추가 시 `src/components/input/` 아래, 공통 UI는 `src/components/ui/` 아래
