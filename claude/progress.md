# 프로젝트 진행 기록

각 페이즈에서 무엇을 만들었는지, 왜 그렇게 결정했는지를 기록합니다.

---

## Phase 1 — 기반 세팅

Next.js 16 App Router + Supabase + Tailwind v4로 프로젝트를 세팅했습니다.
인증은 이메일/비밀번호만 구현했고, 미들웨어로 라우트를 보호합니다.
디자인 시스템은 처음부터 커스텀 색상 토큰(bg/surface/accent/...)으로 정의해서
이후 모든 컴포넌트가 동일한 팔레트를 쓰도록 했습니다.

---

## Phase 2 — 핵심 기능 이식

`claude/golf-tracker.html`에 만들어둔 UI 프로토타입을 React 컴포넌트로 이식했습니다.
홀 입력 화면은 `useReducer`로 상태를 관리하고, `useRef` 기반 캐시로
홀을 이동할 때 미저장 데이터를 보존합니다. Supabase upsert는
`onConflict: 'round_id,hole_num'`으로 동일 홀을 덮어씁니다.

**주요 결정:**
- Shape를 단일 enum 대신 `startLine + curve` 2필드로 분리 → 더 직관적인 그리드 UI 가능
- Slope는 단일 선택 → 중복 선택(MultiToggle)으로 변경 → 실제 라이 상황 반영
- GIR은 DB에 저장하지 않고 `shotsToGreen <= par - 2`로 파생 계산

**Phase 2b 추가:**
Settings 페이지 + user_clubs 테이블로 클럽 거리를 유저별로 관리합니다.
클럽 선택 시 target 거리가 자동으로 채워집니다.
Bottom Navigation(5탭)과 드래그 스크롤 훅도 이 단계에서 추가했습니다.

**Phase 2c 보완:**
- 데스크탑에서 홀 네비게이션 클릭 버그 수정 (pointer event 충돌)
- Sign Out을 홈에서 Settings로 이동 (UX 정리)
- Collapsible 섹션에 하단 접기 버튼 추가

---

## Phase 3 — 모드 시스템 + 핵심 개선

골프를 얼마나 진지하게 기록하느냐에 따라 3가지 모드를 도입했습니다.

| 모드 | 한국어 | 기록 내용 |
|------|--------|-----------|
| fun | 명랑 | 스코어 + 노트만 |
| casual | 대강 | 간단한 샷 결과 |
| serious | 진지 | 프리샷/포스트샷 루틴 전체 |

**핵심 결정: 모드는 UI 복잡도만 제어, DB 스키마는 동일**
모드마다 다른 테이블을 두면 분석이 복잡해지므로, 모든 모드가 같은 컬럼에
저장하고 casual 모드는 일부 필드만 채웁니다. `casual-mapping.ts`가
간단한 casual UI → 기존 필드 매핑을 담당합니다.

**Phase 3a — DB 변경:**
- Green Speed를 퍼트카드 → 라운드 레벨로 이동 (라운드당 1개로 충분)
- Weather, Temperature, Round Time을 rounds 테이블에 추가
- Shots to Green / Putts 스테퍼를 양방향으로 만들어 ScoreInput과 카드 수를 자동 동기화

**Phase 3b — 모드 인프라:**
- rounds.input_mode 컬럼 추가
- user_settings 테이블로 기본 모드를 유저별로 저장
- ModeContext로 현재 모드를 컴포넌트 트리에 전파

**Phase 3c — 모드별 UI:**
- FunMode: 스코어 입력 + 노트만
- CasualTeeShot / CasualGroundShot / CasualPutting: 각 모드에 맞는 간소화 컴포넌트

---

## Phase 4 — Scorecard & Analysis (eSG)

### Phase 4A — Data Plumbing

분석을 위한 데이터 파이프라인을 먼저 완성했습니다.

**추가된 필드:**
- `StgShot.leaveDistBucket` — ARG/Approach 샷 후 그린까지 남은 거리 버킷
- `PuttCard.distBucket` — 퍼트 시작 거리 버킷

**결정: JSONB에 nullable 필드로 추가, 별도 컬럼/테이블 없음**
기존 데이터를 깨지 않으면서 null로 유지하면 분석에서 coverage로 반영됩니다.

**신규 테이블:**
- `expected_strokes` — baseline bucket별 기대 타수 시드 데이터 (읽기 전용)
- `skill_index_snapshots` — 유저별 SkillIndex 자동 계산 스냅샷

**자동 매핑:** casual 모드에서 결과 선택 시 leaveDistBucket이 자동 세팅됩니다
(GIR → ON, Close → 0-2m 등). putt dist 입력 시 distBucket도 자동 계산됩니다.

---

### Phase 4B — Scorecard (Card 탭)

기간 필터(전체/올해/3개월/이번달) + 라운드 리스트 + 펼침 홀 테이블.

**핵심 원칙: 미기록은 0이 아니라 N/A**
퍼팅을 기록하지 않은 라운드에서 putts=0으로 계산하면 평균이 왜곡되므로,
데이터가 없으면 N/A로 표시하고 분모/coverage를 함께 노출합니다.

---

### Phase 4C — Analysis (Analysis 탭)

**eSG (Estimated Strokes Gained) — 항상 "Estimated" 표기, "SG" 단독 사용 금지**

세 가지 누수를 계산합니다:
1. **Putting** — `eSG_putt = Σ(기대 퍼트) - 실제 퍼트`
2. **Around the Green** — `around_cost = Σ(E_around per leaveDistBucket)`
3. **Tee Penalty** — `OB/HZ × 1.5 + Trouble × 0.5`

**결정: around는 "eSG"로 과장하지 않고 "cost"로만 표기**
샷별 before/after 거리가 없어 정통 SG를 계산할 수 없으므로,
around는 기대 손실의 합산값을 leak 신호로 사용합니다.

**Baseline bucket:** 공인 핸디캡 추정 대신 내부 SkillIndex 기반으로 선택.
우선순위: rounds.handicap → skill_index_snapshots → default '11-15'.
UI에서 "핸디" 용어 사용 금지, "Baseline: 11-15 (Confidence: Medium)" 형식만 허용.

**round_metrics 테이블 (on-demand precompute):**
분석 화면 진입 시 `rounds.updated_at > round_metrics.computed_at`이면
재계산 후 upsert. `rounds.updated_at`은 holes upsert 시 트리거로 자동 갱신됩니다.

**Confidence 규칙 (모든 eSG 출력에 필수):**
- High: 샘플 충분(≥20) + coverage ≥ 70%
- Medium: 샘플 보통(≥10) 또는 coverage ≥ 40%
- Low: 그 외 — UI에서 "데이터 부족" 경고 표시

---

## Phase 4D — Widgets/Pin (미구현)

`claude/future-improvements.md` 참조.

---

## 다음: Phase 5

`claude/phase5.md` 참조 — OAuth, PWA, 고도화 등.
