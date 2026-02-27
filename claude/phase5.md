# Phase 5 — 고도화

## 목표
핵심 기능(입력 + 분석) 안정화 이후의 고도화 작업.

---

## Phase 5A — PWA 설치 경험 (다음)

**목표:** 홈 화면 아이콘으로 앱처럼 실행 (브라우저 주소창 없이)

**오프라인 동작 없음** — 네트워크 없으면 일반 웹사이트와 동일하게 동작.
한국 골프장은 대부분 인터넷이 되므로 오프라인은 5C에서 다룸.

### 구현 범위
- `public/manifest.json` — 앱 이름, 아이콘, `display: standalone`, 테마 색상
- 앱 아이콘 (192×192, 512×512 최소)
- 최소 서비스 워커 — install/activate 이벤트만, fetch 핸들러 없음
  (Android Chrome 설치 프롬프트 요건 충족용)
- `layout.tsx` 메타태그 추가
  - `theme-color`
  - `apple-mobile-web-app-capable`
  - `apple-mobile-web-app-status-bar-style`
  - `apple-touch-icon`

---

## Phase 5B — Kakao OAuth + 온보딩 (추후)

### 인증 변경
- **이메일/비밀번호 로그인 제거** — Kakao OAuth로 완전 대체
- Supabase Authentication → Kakao provider 사용
- 카카오 버튼 하나만 노출

**Prerequisites (코드 작업 전 필요):**
- Kakao Developers에서 앱 등록 + REST API Key / Client Secret 발급
- Redirect URI 등록: `https://<supabase-project>.supabase.co/auth/v1/callback`
- Supabase dashboard → Authentication → Providers → Kakao 등록

### 온보딩 플로우
카카오 로그인 후 기존 유저 → 홈 이동. 신규 유저 → 온보딩 시작.

**Step 1 — 필수 정보 (Skip 버튼 잠김)**
- 성별: 남성 / 여성
  - 즉시 클럽 거리 기본값에 반영 (carryMale / carryFemale)
- 핸디캡: 직접 입력 또는 범위 선택 (언더파 / 5이하 / 6-10 / 11-15 / 16-20 / 21-25 / 26+ / 없음·초보)
  - eSG baseline bucket 결정에 직접 사용
  - "없음·초보" 선택 시 SkillIndex 자동 추정으로 fallback

**Step 2 — 선택 정보 (Skip 버튼 활성화)**
- 선호 티 (흰색 / 노란색 / 파란색 / 빨간색 / 기타) → 새 라운드 생성 시 자동 입력
- 홈 코스 이름 → 새 라운드 생성 시 자동 입력
- 월 평균 라운드 수 → confidence 스코어링 보정에 활용

### DB 변경
`user_profiles` 테이블 신규 (user_settings와 분리 — 역할이 다름):
```
user_profiles (
  user_id        UUID PK REFERENCES auth.users,
  gender         TEXT NOT NULL,           -- 'male' | 'female'
  handicap       FLOAT NULL,              -- 실제 핸디캡 수치
  handicap_bucket TEXT NULL,             -- '0-5'|'6-10'|...|'26+'|'beginner'
  preferred_tee  TEXT NULL,
  home_course    TEXT NULL,
  rounds_per_month INT NULL,
  onboarding_done BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
```

**기존 rounds.handicap과의 관계:**
- `user_profiles.handicap` — 유저의 전반적 실력 (온보딩 시 입력)
- `rounds.handicap` — 해당 라운드의 실제 핸디캡 (라운드별로 다를 수 있음)
- eSG 계산 우선순위: `rounds.handicap` → `user_profiles.handicap_bucket` → SkillIndex → default

---

## Phase 5C — 성능 + 오프라인 대비 (추후)

- Loading skeleton 전체 페이지 적용
- Streaming / Suspense 최적화
- PWA 오프라인 sync
  - IndexedDB 큐로 오프라인 입력 저장
  - 네트워크 복구 시 Supabase sync

---

## Phase 5D — 미정 (추후)

- 코스 DB (홀별 파/거리 커스텀 저장)
- 라운드 공유 / 코치 뷰
- AI 샷 패턴 분석 (데이터 충분히 쌓인 후)
