# Golf Tracker — Product Requirements Document (Phase 1–3)

> Phase 4 → `claude/phase4.md`
> Phase 5 → `claude/phase5.md`

## 1. 프로젝트 개요

### 1.1 제품 소개
골프 라운드 중 샷별 루틴(프리샷/포스트샷)을 실시간으로 기록하고, 라운드 후 데이터를 분석해 경기력 향상에 활용하는 모바일 우선 웹앱.

### 1.2 핵심 가치
- 코스에서 빠르게 입력 가능한 UX (탭 기반, 스크롤 최소화)
- 샷 결과뿐 아니라 **의사결정 과정**(프리샷 루틴)까지 기록
- 라운드 후 strokes gained 기반 분석

### 1.3 참고 파일
- `golf-tracker.html` — 완성된 MVP (UI/UX, 데이터 구조, 전체 로직 포함)
- 이 파일의 HTML/CSS/JS를 Next.js + React로 이식하는 것이 Phase 1~2의 핵심 작업

---

## 2. 기술 스택

| 영역 | 기술 | 비고 |
|------|------|------|
| Frontend | Next.js 16 (App Router) | TypeScript |
| Styling | Tailwind CSS v4 | @theme inline으로 커스텀 색상 등록 |
| Backend/DB | Supabase | PostgreSQL + Auth + RLS |
| 배포 | Vercel | |
| 상태관리 | useReducer + useRef 캐시 | 홀 입력 중 로컬 상태 (Zustand/Context 불필요) |
| PWA | 추후 추가 | Phase 5 이후 |

---

## 3. 데이터베이스 스키마

### 3.1 rounds
```sql
create table rounds (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  course      text not null,
  date        date not null,
  tee         text,           -- 'BK' | 'BL' | 'WH' | 'RD'
  handicap    numeric(4,1),
  rating      numeric(4,1),
  holes       int default 18,
  green_speed numeric(2,1) default 3.0,    -- Phase 3: 라운드 레벨 그린스피드
  weather     text,                         -- Phase 3: sunny|partly-cloudy|cloudy|rain|snow|fog
  temperature numeric(3,1),                 -- Phase 3: 섭씨
  round_time  timestamptz default now(),    -- Phase 3: 라운드 시각
  input_mode  text default 'serious'        -- Phase 3: fun|casual|serious
    check (input_mode in ('fun', 'casual', 'serious')),
  created_at  timestamptz default now()
);

alter table rounds enable row level security;
create policy "users can only access own rounds"
  on rounds for all using (auth.uid() = user_id);
```

### 3.2 holes
```sql
create table holes (
  id          uuid primary key default gen_random_uuid(),
  round_id    uuid not null references rounds(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  hole_num    int not null,       -- 1~18
  par         int not null,
  score       int,
  tee_routine jsonb,              -- TeeRoutine 객체
  stg_shots   jsonb,              -- StgShot[] 배열
  putt_cards  jsonb,              -- PuttCard[] 배열
  notes       text,
  saved_at    timestamptz default now(),
  unique(round_id, hole_num)
);

alter table holes enable row level security;
create policy "users can only access own holes"
  on holes for all using (auth.uid() = user_id);
```

### 3.3 user_clubs
```sql
create table user_clubs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  club_name   text not null,
  carry_m     numeric(5,1) not null default 0,
  total_m     numeric(5,1) not null default 0,
  sort_order  int not null default 0,
  created_at  timestamptz default now(),
  unique(user_id, club_name)
);
alter table user_clubs enable row level security;
create policy "users own clubs" on user_clubs for all using (auth.uid() = user_id);
```

### 3.4 user_settings (Phase 3)
```sql
create table user_settings (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  default_mode text default 'serious'
    check (default_mode in ('fun', 'casual', 'serious')),
  updated_at  timestamptz default now()
);
alter table user_settings enable row level security;
create policy "users own settings" on user_settings for all using (auth.uid() = user_id);
```

### 3.5 jsonb 타입 정의 (TypeScript)

```typescript
// src/lib/types.ts

export type WindDir = 'down' | 'dl' | 'dr' | 'left' | 'right' | 'ul' | 'ur' | 'into' | 'calm';
export type WindStr = 'none' | 'weak' | 'strong' | 'gusty';
export type WeatherVal = 'sunny' | 'partly-cloudy' | 'cloudy' | 'rain' | 'snow' | 'fog';  // Phase 3
export type InputMode = 'fun' | 'casual' | 'serious';                      // Phase 3
export type StartLineVal = 'pull' | 'straight' | 'push';                    // Phase 2b: 시작 방향
export type CurveVal = 'duck-hook' | 'hook' | 'draw' | 'straight' | 'fade' | 'slice' | 'shank'; // Phase 2b: 구질
export type ShapeVal = 'duck-hook' | 'hook' | 'pull' | 'draw' | 'straight' | 'fade' | 'push' | 'slice' | 'shank'; // deprecated, 마이그레이션용
export type TrajVal = 'low' | 'mid' | 'high';
export type FeelVal = 'flushed' | 'toe' | 'heel' | 'high' | 'low';
export type PuttFeelVal = 'solid' | 'pushed' | 'pulled' | 'thin' | 'decel';
export type ReadVal = 'R--' | 'R-' | 'R0' | 'R+' | 'R++';

export interface TeeRoutine {
  // PRE
  windStr:          WindStr | null;
  windDir:          WindDir | null;
  targetTraj:       TrajVal | null;
  targetStartLine:  StartLineVal | null;    // Phase 2b (was targetShape)
  targetCurve:      CurveVal | null;        // Phase 2b (was targetShape)
  // POST
  landing:          'FW' | 'RO' | 'BK' | 'HZ' | 'OB' | null;
  actualCarry:      string | null;
  resultTraj:       TrajVal | null;
  resultStartLine:  StartLineVal | null;    // Phase 2b (was resultShape)
  resultCurve:      CurveVal | null;        // Phase 2b (was resultShape)
  feel:             FeelVal | null;
  commit:           string | null;
  learnType:        'gain confidence' | 'lesson' | 'note' | null;
  learnNote:        string | null;
  // deprecated (마이그레이션 호환)
  targetShape?:     ShapeVal | null;
  resultShape?:     ShapeVal | null;
}

export type StgIntent = 'approach' | 'arg' | 'layup' | 'recovery';

export interface StgShot {
  intent:           StgIntent;
  dist:             string;
  club:             string;
  windStr:          WindStr | null;
  windDir:          WindDir | null;
  lieQuality:       'clean' | 'rough' | 'sand' | 'divot' | 'bad' | null;
  lieBall:          'up' | 'buried' | null;
  lieSlope:         string[] | null;        // Phase 2b: 중복선택 (was string | null)
  lieStance:        'stable' | 'unstable' | null;
  argType:          string | null;
  targetTraj:       TrajVal | null;
  targetStartLine:  StartLineVal | null;    // Phase 2b
  targetCurve:      CurveVal | null;        // Phase 2b
  result:           string | null;
  resTraj:          TrajVal | null;
  resStartLine:     StartLineVal | null;    // Phase 2b
  resCurve:         CurveVal | null;        // Phase 2b
  feel:             FeelVal | null;
  commit:           string | null;
  learnType:        string | null;
  note:             string | null;
  // deprecated
  targetShape?:     ShapeVal | null;
  resShape?:        ShapeVal | null;
}

export interface PuttCard {
  dist:             string | null;
  slope:            'flat' | 'uphill' | 'downhill' | 'up-down' | 'down-up' | null;
  break:            'straight' | 'left' | 'right' | 'double' | null;
  preSpeed:         number | null;          // Phase 3: null for new putts (green speed is round-level)
  outcome:          'made' | 'missed' | null; // Phase 3: auto-derived on save (last=made, others=missed)
  postSpeed:        'short' | 'good' | 'long' | null;
  startLine:        'left' | 'good' | 'right' | null;
  read:             ReadVal | null;
  feel:             PuttFeelVal | null;
  note:             string | null;
}

export interface HoleFormState {
  par:              number;
  score:            number;
  teeClub:          string;
  teeCarry:         string;
  teeRoutine:       TeeRoutine;
  stgShots:         StgShot[];
  puttCards:        PuttCard[];
  notes:            string;
  shotsToGreenOverride: number | null;      // Phase 3: STG 스테퍼 양방향 (was girOverride)
  puttsOverride?:   number | null;          // Phase 2b: 수동 퍼팅 수 오버라이드
}

export interface HoleData {
  id?:              string;
  roundId:          string;
  holeNum:          number;
  par:              number;
  score:            number;
  teeRoutine:       TeeRoutine;
  stgShots:         StgShot[];
  puttCards:        PuttCard[];
  notes:            string;
  savedAt?:         string;
}

export interface Round {
  id:               string;
  userId:           string;
  course:           string;
  date:             string;
  tee:              string;
  handicap:         number | null;
  rating:           number | null;
  holes:            number;
  greenSpeed:       number;                 // Phase 3: 라운드 레벨 그린스피드
  weather:          WeatherVal | null;      // Phase 3
  temperature:      number | null;          // Phase 3
  roundTime:        string | null;          // Phase 3
  inputMode:        InputMode;              // Phase 3
  createdAt:        string;
}

export interface UserSettings {             // Phase 3
  userId:           string;
  defaultMode:      InputMode;
  updatedAt:        string;
}

export interface UserClub {
  id?:              string;
  userId:           string;
  clubName:         string;
  carryM:           number;
  totalM:           number;
  sortOrder:        number;
}
```

---

## 4. 앱 구조 및 라우팅

```
src/app/
├── globals.css               # Tailwind v4 @theme 커스텀 색상/폰트 + dim 색상
├── layout.tsx                # 루트 레이아웃 (DM Sans/DM Mono)
│
├── (auth)/
│   ├── layout.tsx            # Auth 레이아웃 (로고 + 중앙 정렬)
│   ├── login/
│   │   └── page.tsx          # 이메일 로그인          ✅
│   └── signup/
│       └── page.tsx          # 이메일 회원가입        ✅
│
├── (app)/                    # 인증된 유저만 접근
│   ├── layout.tsx            # 인증 체크 + 헤더 + Bottom Nav  ✅
│   ├── page.tsx              # 홈: 라운드 목록 + ⚙️ 링크     ✅
│   ├── new-round-button.tsx  # 새 라운드 생성 모달            ✅
│   ├── settings/
│   │   ├── page.tsx          # 설정 서버 컴포넌트 (클럽 + user_settings)  Phase 2b+3
│   │   └── settings-client.tsx # 클럽 에디터 + 기본 모드 선택           Phase 2b+3
│   ├── analysis/
│   │   └── page.tsx          # Placeholder            (Phase 2b)
│   ├── card/
│   │   └── page.tsx          # Placeholder            (Phase 2b)
│   └── round/
│       └── [id]/
│           ├── page.tsx      # 서버 컴포넌트 (fetch)   ✅
│           └── hole-input.tsx # 클라이언트 오케스트레이터 ✅
│
├── api/auth/signout/
│   └── route.ts              # 로그아웃 API           ✅
│
src/middleware.ts              # 라우트 보호             ✅
src/lib/
├── types.ts                  # TypeScript 타입 (InputMode, WeatherVal, UserSettings 포함) ✅
├── constants.ts              # 게임 상수 + 모드/날씨/대강 상수 + empty-state  ✅
├── migration.ts              # 구 데이터 마이그레이션   (Phase 2b)
├── mode-context.tsx          # ModeContext (mode + setMode)                  (Phase 3)
├── casual-mapping.ts         # 대강 모드 → 기존 필드 매핑 헬퍼              (Phase 3)
└── supabase/
    ├── client.ts             # 브라우저용              ✅
    └── server.ts             # 서버 컴포넌트용         ✅

src/hooks/
└── use-drag-scroll.ts        # 드래그 스크롤 훅        (Phase 2b)

src/components/
├── ui/                       # 공통 UI 컴포넌트        ✅
│   ├── collapsible-section.tsx
│   ├── routine-block.tsx
│   ├── mini-toggle.tsx
│   ├── multi-toggle.tsx      # 중복선택 토글           (Phase 2b)
│   ├── wind-grid.tsx
│   ├── shape-grid.tsx        # 2행 StartLine+Curve     (Phase 2b, replaces shape-scroll)
│   ├── star-rating.tsx
│   ├── read-row.tsx
│   ├── info-tooltip.tsx      # 설명 툴팁              (Phase 2b)
│   └── bottom-nav.tsx        # 하단 네비게이션         (Phase 2b)
└── input/                    # 입력 도메인 컴포넌트     ✅
    ├── hole-nav.tsx
    ├── score-input.tsx         # STG/Putts 스테퍼 + GIR 뱃지 (variant: fun/casual/serious) Phase 3
    ├── fun-mode.tsx            # 명랑 모드: 스코어 + 노트만                              Phase 3
    ├── tee-shot.tsx
    ├── ground-shot/
    │   ├── index.tsx
    │   └── shot-card.tsx
    ├── putting/
    │   ├── index.tsx
    │   └── putt-card.tsx       # Green Speed 제거 (라운드 레벨로 이동)                   Phase 3
    ├── casual/                  # 대강 모드 컴포넌트                                     Phase 3
    │   ├── casual-tee-shot.tsx  # 클럽 + 결과 + 방향 + 컨택트
    │   ├── casual-ground-shot.tsx # intent + distBucket + 클럽 + lie + 결과
    │   └── casual-putting.tsx   # distBucket + speed + missSide
    └── notes-section.tsx
```

---

## 5. 화면별 상세 요구사항

### 5.1 로그인/회원가입
- 이메일 + 비밀번호
- Google OAuth (추후)
- 로그인 상태 유지 (Supabase session)
- 미인증 접근 시 `/login` 리다이렉트

### 5.2 홈 (라운드 목록)
- 사용자의 라운드 목록 (최신순)
- 각 카드: 코스명, 날짜, 총점, 홀 수
- "+ New Round" 버튼 → 라운드 생성 모달
- 라운드 클릭 → 해당 라운드 홀 입력 화면

### 5.3 홀 입력 (핵심 화면)
MVP HTML 파일의 input page를 그대로 이식. 3단계 모드 시스템(Phase 3)으로 UI 복잡도 분기.

**라운드 헤더**
- 코스명, 날짜, 티, 홀수, Green Speed, 날씨/온도 표시
- 모드 토글 (명랑/대강/진지) — 변경 시 DB 즉시 반영

**상단 네비게이션**
- 홀 번호 선택 (가로 스크롤 칩)
- 파/거리 표시
- 저장된 홀은 색상 구분 (파 = 초록, 보기 = 노랑, 더블+ = 빨강)

**모드별 입력 (Phase 3)**

**명랑 모드 (fun)**
- Score 스테퍼 + Notes만 표시

**대강 모드 (casual)**
1. Score (스테퍼 + STG/Putts 스테퍼)
2. Tee Shot — 클럽 선택 + 결과(FW/Rough/Bunker/Hazard/OB/Trouble) + 방향(L/C/R) + 컨택트(solid/mishit)
3. Ground Shot — intent + 거리 버킷 + 클럽 + lie(clean/rough/sand/bad) + 결과
4. Putting — 거리 버킷 + speed + miss side(L/C/R)
5. Notes

**진지 모드 (serious) — 기존 전체 UI**
1. Score (스테퍼 + STG/Putts 양방향 스테퍼 + GIR 뱃지)
   - Shots to Green 스테퍼: 숫자 변경 → Ground Shots 자동 추가/제거 (양방향)
   - Putts 스테퍼: 숫자 변경 → PuttCards 자동 추가/제거 (양방향)
   - GIR = shotsToGreen <= par - 2 (자동 파생)
2. Tee Shot
   - PRE: wind 8방향 그리드, club (동적 — userClubs 기반, par 3은 전체), target trajectory, target start line + curve (2행 ShapeGrid)
   - POST: landing, actual carry, actual trajectory, actual start line + curve, feel, commit level, learn/note
   - DR 자동선택: 새 빈 홀에서 par >= 4이고 유저 DR 보유 시
3. Ground Shot (+ Add Shot 카드 방식)
   - Intent 선택: Approach / ARG / Layup / Recovery — 각 intent 옆 ⓘ 툴팁
   - PRE: wind 8방향, lie (quality/ball/slope[중복선택]/stance), club/dist (동적 클럽), target traj/start line+curve
   - POST: result, actual traj/start line+curve, feel, commit, learn/note
4. Putting (+ Add Putt 카드 방식)
   - PRE: distance (슬라이더 1~30m + 자유 입력), slope, break
   - POST: speed, start line, read (R--~R++ + ⓘ 설명), stroke feel, note
   - Green Speed는 라운드 레벨 (퍼트카드에서 제거됨)
   - outcome 자동 파생: 마지막 퍼트 = made, 나머지 = missed (UI 버튼 없음)
5. Notes (자유 텍스트)

**데이터 호환 원칙**
- 모든 모드가 동일한 DB 스키마(holes 테이블) 사용. 모드는 UI 복잡도만 결정.
- 대강 UI의 간소 필드 → casual-mapping.ts로 기존 DB 필드에 매핑
- 모드 전환 시 기존 데이터 보존 (UI만 변경)

**저장 동작**
- SAVE HOLE 버튼 → Supabase `holes` 테이블 upsert
- 저장 시 putt outcome 자동 파생 (마지막=made, 나머지=missed)
- 저장 후 다음 홀로 자동 이동
- 낙관적 업데이트 (저장 중에도 UI 블로킹 없음)

### 5.4 라운드 분석
> → `claude/phase4.md` 참조

### 5.5 스코어카드
> → `claude/phase4.md` 참조

---

## 6. 컴포넌트 구조

```
src/components/
├── ui/                           # 공통 UI (value/onChange controlled 패턴)
│   ├── collapsible-section.tsx   # 접이식 섹션 (아이콘+제목+상태+쉐브론)        ✅
│   ├── routine-block.tsx         # PRE/POST 서브 접이식 (badge 포함)            ✅
│   ├── mini-toggle.tsx           # 단일 선택 버튼 그룹 (제네릭 T extends string) ✅
│   ├── multi-toggle.tsx          # 중복 선택 버튼 그룹 (value: T[])       Phase 2b
│   ├── wind-grid.tsx             # 3×3 바람 방향 그리드                         ✅
│   ├── shape-grid.tsx            # 2행: StartLine(3) + Curve(7)           Phase 2b
│   ├── star-rating.tsx           # 5단계 commit level (누적 채움)               ✅
│   ├── read-row.tsx              # R--~R++ (R0=초록, R±=노랑, R±±=빨강)         ✅
│   ├── info-tooltip.tsx          # ⓘ 탭 → 설명 팝오버                    Phase 2b
│   └── bottom-nav.tsx            # 5탭 하단 네비 (Home/Input/Analysis/Card/Setting) Phase 2b
├── input/                        # 입력 도메인 컴포넌트
│   ├── hole-nav.tsx              # 가로 스크롤 홀 칩 + 드래그 스크롤      ✅+Phase 2b
│   ├── score-input.tsx           # STG/Putts 스테퍼 + GIR 뱃지 (variant) ✅+Phase 3
│   ├── fun-mode.tsx              # 명랑 모드: 스코어 + 노트만              Phase 3
│   ├── tee-shot.tsx              # PRE+POST + 동적 클럽(userClubs)       ✅+Phase 2b
│   ├── ground-shot/
│   │   ├── index.tsx             # 샷 리스트 관리 + "Add Shot" + userClubs ✅+Phase 2b
│   │   └── shot-card.tsx         # ShapeGrid, MultiToggle slope, 툴팁    ✅+Phase 2b
│   ├── putting/
│   │   ├── index.tsx             # 퍼팅 리스트 관리 + "Add Putt"               ✅
│   │   └── putt-card.tsx         # 30m 범위, outcome 제거, GS 제거      ✅+Phase 3
│   ├── casual/                    # 대강 모드 컴포넌트                      Phase 3
│   │   ├── casual-tee-shot.tsx   # 클럽 + 결과 + 방향 + 컨택트
│   │   ├── casual-ground-shot.tsx # intent + distBucket + 클럽 + lie + 결과
│   │   └── casual-putting.tsx    # distBucket + speed + missSide
│   └── notes-section.tsx         # textarea 래퍼                               ✅
└── stats/                        # → Phase 4 (claude/phase4.md)
```

---

## 7. 디자인 시스템

MVP HTML에서 정의된 CSS 변수를 Tailwind 커스텀 색상으로 이식:

Tailwind v4 `@theme inline` 방식으로 `globals.css`에 등록 완료:

```css
/* src/app/globals.css */
@theme inline {
  --color-bg: #0a0a0a;
  --color-surface: #111111;
  --color-surface2: #161616;
  --color-surface3: #1c1c1c;
  --color-border: #2a2a2a;
  --color-border2: #333333;
  --color-text: #f0f0f0;
  --color-text2: #a0a0a0;
  --color-text3: #555555;
  --color-accent: #4ade80;
  --color-blue: #60a5fa;
  --color-yellow: #fbbf24;
  --color-red: #f87171;
  --color-purple: #a78bfa;

  /* dim 변형 — 선택 상태 배경 (Phase 2 추가) */
  --color-accent-dim: rgba(74, 222, 128, 0.12);
  --color-red-dim: rgba(248, 113, 113, 0.12);
  --color-blue-dim: rgba(96, 165, 250, 0.12);
  --color-yellow-dim: rgba(251, 191, 36, 0.12);
  --color-purple-dim: rgba(167, 139, 250, 0.12);

  --font-sans: 'DM Sans', sans-serif;
  --font-mono: 'DM Mono', monospace;
}
```

---

## 8. 개발 단계

### Phase 1 — 기반 세팅 ✅ 완료
- [x] Next.js 프로젝트 초기화
- [x] Supabase 프로젝트 생성
- [x] DB 스키마 적용 (`supabase/migrations/001_init.sql`)
- [x] Supabase 클라이언트 설정 (`lib/supabase/client.ts`, `server.ts`)
- [x] TypeScript 타입 정의 (`lib/types.ts`)
- [x] 디자인 시스템 (Tailwind v4 @theme, DM Sans/DM Mono)
- [x] Auth 연동 (이메일 로그인/회원가입)
- [x] 미들웨어 라우트 보호 (`middleware.ts`)
- [x] 홈 화면 (라운드 목록 + 새 라운드 생성 모달)
- [x] 로그아웃 API (`/api/auth/signout`)

### Phase 2 — 핵심 기능 이식 ✅ 완료
- [x] 타입 수정: `PuttFeelVal` 추가, `PuttCard.feel` → `PuttFeelVal`, `HoleFormState` 인터페이스 추가
- [x] 게임 상수 모듈 (`src/lib/constants.ts`): GS_META, 클럽, 결과, shape, 빈 상태 헬퍼 등
- [x] 공통 UI 7개: CollapsibleSection, RoutineBlock, MiniToggle, WindGrid, ShapeScroll, StarRating, ReadRow
- [x] 입력 컴포넌트 8개: HoleNav, ScoreInput, TeeShot, GroundShot(index+ShotCard), Putting(index+PuttCard), NotesSection
- [x] 서버 컴포넌트 (`round/[id]/page.tsx`): round + holes fetch → HoleInput 전달
- [x] 클라이언트 오케스트레이터 (`hole-input.tsx`): useReducer + useRef 홀 캐시
- [x] Supabase upsert (`onConflict: 'round_id,hole_num'`) + 저장 후 자동 이동
- [x] 홀 네비게이션 (저장 상태 색상: under-par=초록, par=회색, over-par=빨강)
- [x] globals.css dim 색상 토큰 5종 추가
- [x] `TeeRoutine.landing`에 `'HZ'` 추가, `learnType`을 `'gain confidence' | 'lesson' | 'note'`로 변경
- [x] `LANDING_OPTIONS`에 `'HZ'` 추가, `LEARN_TYPES`를 `'gain confidence' | 'lesson' | 'note'`로 변경

### Phase 2b — UI 개선 + 설정 + 하단 네비 ✅ 완료
- [x] Shape 2필드 분리: StartLineVal(Pull/Str/Push) + CurveVal(D-Hook~Shank) — 타입/상수/UI 전부 변경
- [x] 구 데이터 마이그레이션 레이어 (`src/lib/migration.ts`) — ShapeVal→StartLine+Curve, slope→배열, preSpeed→숫자
- [x] DB: `user_clubs` 테이블 (`002_user_clubs.sql`) — 유저별 클럽/캐리/토탈 거리
- [x] 설정 페이지 (`/settings`) — 클럽 관리, 성별별 디폴트 거리, 웨지 도수 피커
- [x] Bottom Nav 5탭 (Home/Input/Analysis/Card/Setting) + Placeholder 페이지
- [x] 퍼팅: 거리 30m, 그린스피드 슬라이더(2.0~4.0, 0.1단위)
- [x] Slope 중복선택 (MultiToggle: `string[] | null`)
- [x] 디폴트 선택값: wind=none/calm, quality=clean, traj=mid, shape=straight/straight 등
- [x] Info 툴팁: Intent 설명, 퍼팅 Read 설명, Shape 설명
- [x] Score GIR/퍼팅수 표시 (자동계산 + 수동 오버라이드)
- [x] 홀 네비/shape 드래그 스크롤 (`useDragScroll` 훅)
- [x] Par 3: 티샷 클럽 전체 표시 (유저 설정 기준)
- [x] 홈 페이지 ⚙️ 설정 링크

### Phase 2c — UI 개선 + 기능 보완 ✅ 완료
**[fix]**
- [x] Step 1: Desktop 홀 네비게이션 클릭 버그 + 스크롤 개선
  - `use-drag-scroll` drag vs click 구분 (threshold 5px 추가)
  - pointer capture를 즉시→threshold 이후로 지연
- [x] Step 2: 홈 설정 버튼 정리 + Sign Out → Settings 이동
  - 홈 헤더 톱니바퀴 제거 (BottomNav에 Settings 탭 있음)
  - Settings 페이지 최하단에 Sign Out 버튼 추가 (테두리 + 위험색)

**[feat]**
- [x] Step 3: Collapsible 섹션 하단 접기 버튼
  - CollapsibleSection, RoutineBlock 열렸을 때 하단 ▲ chevron 추가
- [x] Step 4: 클럽 선택 시 target 거리 자동 입력
  - Tee Shot / Ground Shot 클럽 선택 → `total_m` 자동 입력 (빈 필드만)
  - ARG, Recovery → 디폴트 50m
- [x] Step 5: 라운드 리스트 편집/삭제 메뉴
  - 홈 라운드 카드에 `...` 아이콘 → 편집 모달 (Cancel/Update/Delete)
  - 새 `round-list.tsx` 클라이언트 컴포넌트, Delete 2단계 확인

**[design]**
- [x] Step 6: InfoTooltip 디자인 개선
  - children 기반 리치 콘텐츠 (text→ReactNode)
  - Shot Information: 카드형, 색상 dot, intent별 색상 볼드
  - Putt Read: font-mono 키, R0=초록/R±=노랑/R±±=빨강 색상 구분

### Phase 3 — 모드 시스템 + 핵심 개선 ✅ 완료
**Phase 3a — DB 변경 + 핵심 기능 개선**
- [x] DB 마이그레이션 (`003_phase3a.sql`): green_speed, weather, temperature, round_time → rounds
- [x] 타입 변경: WeatherVal, InputMode, UserSettings, Round 확장, girOverride → shotsToGreenOverride
- [x] 상수 추가: 날씨/모드/대강 모드 상수
- [x] Green Speed → 라운드 레벨 이동 (퍼트카드에서 슬라이더 제거)
- [x] Shots to Green 양방향 스테퍼 (ScoreInput ↔ stgShots 자동 조정)
- [x] Putts 양방향 스테퍼 (ScoreInput ↔ puttCards 자동 조정)
- [x] GIR 계산 변경: shotsToGreen <= par - 2 (자동 파생)
- [x] DR 자동선택: 새 빈 홀, par >= 4, 유저 DR 보유 시
- [x] 라운드 생성/수정에 Green Speed, Weather, Temperature 추가
- [x] 라운드 헤더에 날씨/온도/스피드 표시
- [x] Putt outcome 자동 파생 (마지막=made), made/missed UI 제거

**Phase 3b — 모드 시스템 인프라**
- [x] DB 마이그레이션 (`004_phase3b.sql`): input_mode → rounds, user_settings 테이블
- [x] ModeContext (`mode-context.tsx`): mode + setMode
- [x] 입력 화면 모드 토글 (명랑/대강/진지) + DB 즉시 반영
- [x] 설정 페이지 기본 모드 선택 + upsert
- [x] 라운드 생성 모달 모드 선택 (기본값: user_settings.default_mode)

**Phase 3c — 모드별 UI 구현**
- [x] FunMode 컴포넌트 (스코어 + 노트만)
- [x] CasualTeeShot (클럽 + 결과 + 방향 + 컨택트)
- [x] CasualGroundSection (intent + distBucket + 클럽 + lie + 결과)
- [x] CasualPuttingSection (distBucket + speed + missSide)
- [x] HoleInput 조건부 렌더링 (mode별 UI 분기)
- [x] ScoreInput variant prop (fun: 스코어만 / casual: +STG/Putts / serious: +GIR 뱃지)
- [x] casual-mapping.ts (대강 UI → 기존 필드 매핑)

> Phase 4, 5 → 별도 파일 참조

---

## 9. 환경 변수

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxx
SUPABASE_SERVICE_ROLE_KEY=xxxx   # 서버사이드 전용, 클라이언트 노출 금지
```

---

## 10. MVP HTML 파일 활용 가이드

Claude Code 작업 시 `golf-tracker.html`을 항상 참조 파일로 유지할 것.

### UI → JSX 변환
각 섹션의 HTML 구조를 JSX로 변환. CSS 인라인 스타일은 Tailwind 유틸리티로, CSS 변수는 Tailwind config 커스텀 색상으로 대체.

### JS 로직 → React 이식 매핑 (Phase 2 완료)
| HTML 함수 | React 구현 | 파일 |
|-----------|-----------|------|
| `collectTeeRoutine()` | `useReducer` PATCH_TEE_ROUTINE | `hole-input.tsx` |
| `collectStgShots()` | `useReducer` SET_STG_SHOTS | `hole-input.tsx` |
| `collectPuttCards()` | `useReducer` SET_PUTT_CARDS | `hole-input.tsx` |
| `saveHole()` | `handleSave()` → Supabase upsert | `hole-input.tsx` |
| `loadHole()` / `fillHoleForm()` | `switchHole()` (캐시 → 서버 → 빈 상태) | `hole-input.tsx` |
| `buildStgShotHTML()` | `<ShotCard>` 컴포넌트 | `ground-shot/shot-card.tsx` |
| `buildPuttCardHTML()` | `<PuttCard>` 컴포넌트 | `putting/putt-card.tsx` |
| `toggleSection()` | `<CollapsibleSection>` (useState) | `ui/collapsible-section.tsx` |
| `toggleRoutine()` | `<RoutineBlock>` (useState) | `ui/routine-block.tsx` |
| `miniToggle()` | `<MiniToggle>` (value/onChange) | `ui/mini-toggle.tsx` |
| `windToggle8()` | `<WindGrid>` (value/onChange) | `ui/wind-grid.tsx` |
| `shapeToggle()` | `<ShapeGrid>` (startLine+curve) | `ui/shape-grid.tsx` |
| `starToggle()` | `<StarRating>` (value/onChange) | `ui/star-rating.tsx` |
| `readToggle()` | `<ReadRow>` (value/onChange) | `ui/read-row.tsx` |
| `setStgIntent()` | `setIntent()` in ShotCard | `ground-shot/shot-card.tsx` |
| `onStgDistChange()` | `handleDistChange()` in ShotCard | `ground-shot/shot-card.tsx` |
| `syncPuttDist()` | `syncDist()` in PuttCard | `putting/putt-card.tsx` |
| `renderStats()` | Phase 4 예정 | — |

### 데이터 구조 호환성
localStorage의 객체 구조가 Supabase `holes` 테이블의 jsonb 컬럼 구조와 동일하게 설계됨. 수집된 데이터를 그대로 Supabase에 저장/불러오기 가능.
