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
├── globals.css                 # Tailwind v4 @theme 커스텀 색상/폰트
├── layout.tsx                  # 루트 레이아웃 (DM Sans/DM Mono)
├── (auth)/layout.tsx           # Auth 레이아웃
├── (auth)/login/page.tsx       # 이메일 로그인
├── (auth)/signup/page.tsx      # 이메일 회원가입
├── (app)/layout.tsx            # 인증 체크 + 헤더
├── (app)/page.tsx              # 홈: 라운드 목록
├── (app)/new-round-button.tsx  # 새 라운드 생성 모달
├── (app)/round/[id]/page.tsx   # 홀 입력 (Phase 2)
├── api/auth/signout/route.ts   # 로그아웃 API
src/middleware.ts               # 라우트 보호
src/lib/
├── types.ts                    # 전체 TypeScript 타입
├── supabase/client.ts          # 브라우저용
└── supabase/server.ts          # 서버 컴포넌트용
supabase/migrations/
└── 001_init.sql                # rounds + holes 테이블 + RLS
```

## 주요 규칙
- Supabase 클라이언트: 브라우저 → `src/lib/supabase/client.ts` / 서버 → `src/lib/supabase/server.ts`
- 색상은 반드시 globals.css @theme의 커스텀 색상 사용 (bg, surface, accent, blue, yellow, red, purple 등)
- 폰트: `font-sans` = DM Sans, `font-mono` = DM Mono
- RLS 활성화 — 모든 쿼리는 인증된 유저 기준으로 동작
- TypeScript strict 모드

## DB 테이블 요약
```
rounds   (id, user_id, course, date, tee, handicap, rating, holes)
holes    (id, round_id, user_id, hole_num, par, score,
          tee_routine jsonb, stg_shots jsonb, putt_cards jsonb, notes)
```
샷 데이터는 jsonb로 저장 (golf-tracker.html의 collectTeeRoutine/collectStgShots/collectPuttCards 반환값 구조와 동일).

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

### Phase 2 — 핵심 기능 이식 (다음)
- [ ] 홀 입력 화면 이식 (`round/[id]/page.tsx`)
- [ ] TeeShot, GroundShot, Putting 컴포넌트
- [ ] 공통 UI (CollapsibleSection, MiniToggle, WindGrid 등)
- [ ] Supabase upsert 연동 (SAVE HOLE)
- [ ] 홀 네비게이션 (저장 상태 색상 표시)

## 작업 시 참고
- 새 컴포넌트 만들 때 `claude/golf-tracker.html`에서 해당 섹션 HTML/CSS/JS 찾아서 이식
- localStorage 로직 → Supabase 쿼리로 교체
- 홀 저장: `holes` 테이블 upsert (round_id + hole_num unique)
- `@/*` path alias → `./src/*` (tsconfig.json)
