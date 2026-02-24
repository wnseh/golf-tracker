# Golf Tracker — Product Requirements Document

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
| 상태관리 | Zustand 또는 React Context | 홀 입력 중 로컬 상태 |
| PWA | 추후 추가 | Phase 3 이후 |

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

### 3.3 jsonb 타입 정의 (TypeScript)

```typescript
// lib/types.ts

export type WindDir = 'down' | 'dl' | 'dr' | 'left' | 'right' | 'ul' | 'ur' | 'into' | 'calm';
export type WindStr = 'none' | 'weak' | 'strong' | 'gusty';
export type ShapeVal = 'duck-hook' | 'hook' | 'pull' | 'draw' | 'straight' | 'fade' | 'push' | 'slice' | 'shank';
export type TrajVal = 'low' | 'mid' | 'high';
export type FeelVal = 'flushed' | 'toe' | 'heel' | 'high' | 'low';
export type ReadVal = 'R--' | 'R-' | 'R0' | 'R+' | 'R++';

export interface TeeRoutine {
  // PRE
  windStr:      WindStr | null;
  windDir:      WindDir | null;
  targetTraj:   TrajVal | null;
  targetShape:  ShapeVal | null;
  // POST
  landing:      'FW' | 'RO' | 'BK' | 'OB' | null;
  actualCarry:  string | null;
  resultTraj:   TrajVal | null;
  resultShape:  ShapeVal | null;
  feel:         FeelVal | null;
  commit:       string | null;      // '1'~'5'
  learnType:    'positive' | 'lesson' | 'neutral' | null;
  learnNote:    string | null;
}

export type StgIntent = 'approach' | 'arg' | 'layup' | 'recovery';

export interface StgShot {
  intent:       StgIntent;
  dist:         string;
  club:         string;
  // PRE — wind
  windStr:      WindStr | null;
  windDir:      WindDir | null;
  // PRE — lie
  lieQuality:   'clean' | 'rough' | 'sand' | 'divot' | 'bad' | null;
  lieBall:      'up' | 'buried' | null;
  lieSlope:     'uphill' | 'downhill' | 'toe-up' | 'toe-dn' | null;
  lieStance:    'stable' | 'unstable' | null;
  // PRE — target
  argType:      string | null;
  targetTraj:   TrajVal | null;
  targetShape:  ShapeVal | null;
  // POST
  result:       string | null;
  resTraj:      TrajVal | null;
  resShape:     ShapeVal | null;
  feel:         FeelVal | null;
  commit:       string | null;
  learnType:    string | null;
  note:         string | null;
}

export interface PuttCard {
  dist:         string | null;      // meters
  slope:        'flat' | 'uphill' | 'downhill' | 'up-down' | 'down-up' | null;
  break:        'straight' | 'left' | 'right' | 'double' | null;
  preSpeed:     'slow' | 'medium' | 'fast' | null;
  outcome:      'made' | 'missed' | null;
  postSpeed:    'short' | 'good' | 'long' | null;
  startLine:    'left' | 'good' | 'right' | null;
  read:         ReadVal | null;
  feel:         FeelVal | null;
  note:         string | null;
}

export interface HoleData {
  id?:          string;
  roundId:      string;
  holeNum:      number;
  par:          number;
  score:        number;
  teeRoutine:   TeeRoutine;
  stgShots:     StgShot[];
  puttCards:    PuttCard[];
  notes:        string;
  savedAt?:     string;
}

export interface Round {
  id:           string;
  userId:       string;
  course:       string;
  date:         string;
  tee:          string;
  handicap:     number | null;
  rating:       number | null;
  holes:        number;
  createdAt:    string;
}
```

---

## 4. 앱 구조 및 라우팅

```
src/app/
├── globals.css               # Tailwind v4 @theme 커스텀 색상/폰트
├── layout.tsx                # 루트 레이아웃 (DM Sans/DM Mono)
│
├── (auth)/
│   ├── layout.tsx            # Auth 레이아웃 (로고 + 중앙 정렬)
│   ├── login/
│   │   └── page.tsx          # 이메일 로그인      ✅
│   └── signup/
│       └── page.tsx          # 이메일 회원가입    ✅
│
├── (app)/                    # 인증된 유저만 접근
│   ├── layout.tsx            # 인증 체크 + 헤더   ✅
│   ├── page.tsx              # 홈: 라운드 목록    ✅
│   ├── new-round-button.tsx  # 새 라운드 생성 모달 ✅
│   └── round/
│       └── [id]/
│           ├── page.tsx      # 홀 입력 메인 (Phase 2)
│           └── stats/
│               └── page.tsx  # 라운드 분석 (Phase 3)
│
├── api/auth/signout/
│   └── route.ts              # 로그아웃 API       ✅
│
src/middleware.ts              # 라우트 보호         ✅
src/lib/
├── types.ts                  # TypeScript 타입     ✅
└── supabase/
    ├── client.ts             # 브라우저용          ✅
    └── server.ts             # 서버 컴포넌트용     ✅
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
MVP HTML 파일의 input page를 그대로 이식. 구성:

**상단 네비게이션**
- 홀 번호 선택 (가로 스크롤 칩)
- 파/거리 표시
- 저장된 홀은 색상 구분 (파 = 초록, 보기 = 노랑, 더블+ = 빨강)

**입력 섹션 (모두 collapsible)**
1. Score (스테퍼)
2. Tee Shot
   - PRE: wind 8방향 그리드, club, target trajectory, target shape (9종 가로 스크롤)
   - POST: landing, actual carry, actual trajectory, actual shape, feel, commit level, learn/note
3. Ground Shot (+ Add Shot 카드 방식)
   - Intent 선택: Approach (≥50m) / ARG (<50m, 자동 분류) / Layup / Recovery
   - PRE: wind 8방향, lie (quality/ball/slope/stance), club/dist, target traj/shape
   - POST: result, actual traj/shape, feel, commit, learn/note
4. Putting (+ Add Putt 카드 방식)
   - PRE: distance (슬라이더 1~10m + 자유 입력), slope, break, green speed
   - POST: made/missed, speed, start line, read (R--~R++), stroke feel, note
5. Notes (자유 텍스트)

**저장 동작**
- SAVE HOLE 버튼 → Supabase `holes` 테이블 upsert
- 저장 후 다음 홀로 자동 이동
- 낙관적 업데이트 (저장 중에도 UI 블로킹 없음)

### 5.4 라운드 분석
MVP HTML의 stats page 이식:
- 스코어 요약 (vs par, 버디/파/보기/더블 분포)
- Strokes Gained 분석 (Tee / Approach / ARG / Putting)
- 페어웨이 적중률
- 퍼팅 Read 정확도 (R0 비율, R-/R+ 분포)
- 샷 shape 분포
- 클럽별 거리/결과 통계

---

## 6. 컴포넌트 구조

```
components/
├── input/
│   ├── HoleNav.tsx           # 홀 선택 가로 스크롤
│   ├── ScoreInput.tsx        # 스테퍼
│   ├── TeeShot/
│   │   ├── index.tsx
│   │   ├── WindGrid.tsx      # 8방향 바람 그리드
│   │   └── ShapeScroll.tsx   # 9개 shape 가로 스크롤
│   ├── GroundShot/
│   │   ├── index.tsx
│   │   ├── ShotCard.tsx      # 개별 샷 카드
│   │   └── LieSection.tsx    # 라이 정보 입력
│   └── Putting/
│       ├── index.tsx
│       └── PuttCard.tsx      # 개별 퍼팅 카드 + 슬라이더
├── ui/
│   ├── RoutineBlock.tsx      # 접이식 PRE/POST 블록
│   ├── MiniToggle.tsx        # 단일 선택 버튼 그룹
│   ├── StarRating.tsx        # Commit level 별점
│   ├── ReadRow.tsx           # R--~R++ 버튼
│   └── CollapsibleSection.tsx
└── stats/
    ├── ScoreSummary.tsx
    ├── StrokesGained.tsx
    └── PuttingAnalysis.tsx
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

### Phase 2 — 핵심 기능 이식 (2~3주)
- [ ] 홀 입력 화면 React 컴포넌트화
  - [ ] TeeShot (WindGrid, ShapeScroll, PRE/POST)
  - [ ] GroundShot (카드 추가/삭제, 4 intent, Lie 섹션, 자동 분류)
  - [ ] Putting (카드 추가/삭제, 슬라이더, PRE/POST)
  - [ ] CollapsibleSection, MiniToggle 등 공통 UI
- [ ] Supabase upsert 연동 (SAVE HOLE)
- [ ] 홀 데이터 로드 및 복원 (`fillHoleForm` 로직 이식)
- [ ] 홀 네비게이션 (저장 상태 색상 표시)

### Phase 3 — 분석 화면 (1~2주)
- [ ] 라운드 분석 페이지
- [ ] Strokes Gained 계산 로직 이식
- [ ] 퍼팅 분석 (Read 정확도, 거리별 성공률)
- [ ] 스코어카드 화면

### Phase 4 — 고도화 (이후)
- [ ] Google / Kakao OAuth
- [ ] 코스 DB (홀별 파/거리 커스텀 저장)
- [ ] PWA (오프라인 입력 후 sync)
- [ ] 라운드 공유 / 코치 뷰
- [ ] AI 샷 패턴 분석

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

### JS 로직 → React hooks/utils 이식
| HTML 함수 | React 대응 |
|-----------|-----------|
| `collectTeeRoutine()` | `useTeeShot` hook의 state 수집 |
| `collectStgShots()` | `useGroundShot` hook의 state 수집 |
| `collectPuttCards()` | `usePutting` hook의 state 수집 |
| `saveHole()` | `saveHole()` server action / Supabase upsert |
| `loadHole()` / `fillHoleForm()` | 페이지 초기화 시 Supabase에서 fetch → state 주입 |
| `renderStats()` | `StrokesGained.tsx` 컴포넌트 내 계산 로직 |
| `buildStgShotHTML()` | `ShotCard.tsx` 컴포넌트 |
| `buildPuttCardHTML()` | `PuttCard.tsx` 컴포넌트 |
| `toggleRoutine()` | `CollapsibleSection` 컴포넌트 내부 state |
| `miniToggle()` | `MiniToggle` 컴포넌트 내부 state |
| `windToggle8()` | `WindGrid` 컴포넌트 내부 state |
| `starToggle()` | `StarRating` 컴포넌트 내부 state |
| `readToggle()` | `ReadRow` 컴포넌트 내부 state |

### 데이터 구조 호환성
localStorage의 객체 구조가 Supabase `holes` 테이블의 jsonb 컬럼 구조와 동일하게 설계됨. 수집된 데이터를 그대로 Supabase에 저장/불러오기 가능.
