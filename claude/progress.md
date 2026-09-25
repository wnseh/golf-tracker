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

## Phase 4D — Widgets/Pin (미구현 → Phase 6에서 폐기, future-improvements로 이동)

---

## Phase 6 — 최소 데이터 재설계 (2026-09-17)

**왜 바꿨나.** 세 글(Elliott PGA 기본 stat, Riccio's Rule, Shot Scope SG)을 기준으로 기존 설계를 다시 봤다.
기존 앱은 "루틴 일지 + SG 근사"라는 두 목표 때문에 입력이 무거웠고, 대강 모드조차 Elliott 기본 5개보다
많은 데이터를 요구했다. 반면 eSG는 샷 체인(홀 길이·티샷 후 남은 거리)이 없어 근사에 그쳤고, 근사를
방어하느라 SkillIndex·Baseline·coverage·confidence 인프라가 붙었다. 보정 안 된 시드 위에서 정밀함의
이점은 못 얻고 입력 비용만 내는 상태였다.

**무엇으로 바꿨나.** 모드 시스템 제거. 홀당 입력을 SG 원장(샷마다 친 후 라이 + 남은 거리 버킷 + 벌타)
하나로 통일. 이 원장에서 스코어·FIR·GIR·퍼트·벌타·업앤다운(Elliott 5)과 Riccio 기대 스코어가 전부
파생되고, Broadie 투어 기준표로 샷별 SG를 계산한다. 원장은 Elliott 5의 상위 집합이라 별도 입력이 없다.

**주요 결정:**
- 거리는 숫자가 아니라 버킷 (탭 수를 Elliott 5개 수준으로). SG는 버킷 중간값으로 근사 — Shot Scope 예시 홀 대조 시 −0.92 vs −0.99.
- 홀 길이도 파별 버킷 한 탭. 없으면 티샷 SG만 건너뜀.
- "스코어만 입력" 탈출구 유지 (블로업 홀). 그 홀은 스코어 트렌드에만 포함.
- SG 기준표는 투어만. 실력별 표는 future-improvements.
- 기준표는 DB 테이블 대신 TS 상수 (`sg.ts`) — 읽기 전용이고 서버에서 TS로 계산하므로.
- 기존 홀 데이터는 버림 (007 마이그레이션이 holes 재생성). eSG 관련 테이블 5개 삭제.
- Analysis 순서: Elliott 타일 → Riccio 카드 → Trend(Riccio 점선) → SG vs Tour → Leak. Riccio를 SG보다 위에.

상세: `claude/phase6.md`

---

## SG 해설 모달 (2026-09-18)

**왜.** SG 숫자만으로는 "그래서 뭘 하지"가 안 나온다. 카테고리별 읽는 법과 내 상황에 맞는 해설을 ⓘ로 열어 보게 했다.

**결정:**
- 문구·규칙은 DB가 아니라 `src/lib/insights.ts` 파일. 사용자 데이터가 아니라 참조 콘텐츠이고, git 이력·타입 검사·`test:lib`로
  검증되며 push로 배포된다. 앱 안에서 편집하거나 사용자별 문구가 필요해지면 같은 스키마로 테이블로 옮긴다.
- 두 층: 고정 해설(무엇을 재나 / 읽는 법 / Leak Action)과 상황 규칙(`selectInsights`). 규칙마다 `source` 필수.
- 근거: Broadie 2011 기준표·Every Shot Counts(롱게임 2/3), Sherman Four Foundations·practical-golf(인플레이 > 페어웨이,
  그린 중앙 + 뒤쪽 야디지, 웨지는 올리기, 스피드 컨트롤, 더블보기 줄이기), Riccio. 임계값에 근거 없으면 "앱 기준".
- Sherman의 핵심 지표를 위해 `stats.ts`에 더블보기 비율(스코어만 홀 포함)과 3퍼트 비율(완성 홀) 추가.
- 실력별 기준표(Stagner/Broadie 아마추어 표)는 여전히 보류. 들어오면 `InsightContext`에 필드 추가로 규칙 확장.

## 컨택(strike) 필드 (2026-09-18)

**왜.** SG는 결과만 보므로 어프로치 손실이 클럽 선택 문제인지 타점 문제인지 못 가른다. Young(The Practice Manual / Strike Plan)은
아마추어 손실의 큰 부분이 컨택이라고 본다. 샷당 한 칸이면 "미스 샷의 SG vs 정상 샷의 SG"로 진단이 갈린다.

**결정:**
- `Shot.strike?: 'ok' | 'miss' | null`. 퍼트는 null(입력 UI도 숨김). 나머지는 원장 입력 시 `ok`로 시작, 미스만 한 번 더 탭.
  뒤땅/탑/힐/토 세부 유형은 넣지 않음 — 아마추어 자기 진단의 신뢰도가 낮아 "미스" 하나만.
- 이전 데이터는 필드 없음 → N/A. jsonb라 마이그레이션 없음.
- `stats.ts` mishits(홀/라운드/기간), `sg.ts` byStrike + sumStrike, 해설 규칙 4개(타점 문제 / 판단 문제 / 기록 부족 / 전체 미스율).
  임계값(기록 10샷, 손실 비중 60%/30%, 미스율 25%)은 앱 기준.

## 티샷 드라이버 여부 (2026-09-25)

**왜.** Phase 6에서 클럽 기록(`user_clubs`)을 없앴는데, 티샷 해설이 "필요하면 드라이버 대신 한 클럽 짧게"를 권하면서
실제로 드라이버를 잡았는지는 몰랐다. 모든 샷의 클럽은 탭 부담 대비 가치가 낮고(거리도 버킷이라 gapping 불가),
코스 전략 결정에 직결되는 건 파4·5 티샷의 드라이버 여부 하나라서 그것만 넣었다.

**결정:**
- `Shot.driver?: boolean | null`, 파4·5 첫 샷에만. 기본 `true`(추가 탭 0), 끊어갔을 때만 한 번 탭. 파3이면 필드 제거.
- UI는 첫 줄의 "Tee" 라벨 자리를 토글(드라이버/끊어감)로 바꿔 줄 폭을 늘리지 않았다.
- `sg.ts` byTeeClub + sumTeeClub, 해설 규칙 4개(드라이버가 나음 / 끊어감이 나음 / 비슷 / 기록 부족).
  임계값(그룹별 5샷, 샷당 0.15타)은 앱 기준. 끊어가는 홀은 대개 좁은 홀이라 조건이 같지 않다는 단서를 문구에 넣었다.

## HZ / OB 라이 (2026-09-25)

**왜.** 해저드·OB를 TR/RO + 벌타 토글로 우회 입력했다. OB는 처리 방식에 따라 벌타 수와 다음 샷 위치가 다르다:
다시 치기(같은 자리, 다음이 3타째) vs 특설티(앞에서, 다음이 4타째). 우회 입력으로는 스코어·SG가 틀렸다.

**결정:**
- `Lie`에 `HZ`, `OB` 추가. `Shot` 필드는 늘리지 않고 `dist`로 구분 — OB + dist null = 다시 치기(+1), OB + dist = 특설티·드롭(+2).
- HZ 드롭 후 다음 샷은 RO로, 특설티는 FW로 근사 (드롭 라이를 따로 묻지 않아 탭 수 유지).
- 위치·벌타 규칙을 `src/lib/ledger.ts` 한 곳으로 모음 (`penaltyStrokes`, `startPositions`, `strokesBefore`). stats·sg·입력 UI가 공용.
- SG: 도착 위치에 위 규칙 적용, 벌타 전부 차감. 티샷 OB 다시 치기 = 정확히 −2 (Broadie 방식). 다시 친 티샷도 Tee 카테고리·드라이버 토글 대상.
- GIR을 스윙 수가 아니라 벌타 포함 타수로 판정하도록 수정 (기존에는 벌타 홀에서 GIR이 잘못 ✓될 수 있었음).
- OB/HZ 횟수 별도 stat·해설 규칙은 이번 범위 밖. 벌타 합계(Pen)에는 자동 포함.

---

## Shot Scope 캡처 대조 (2026-09-18)

`claude/Understanding Strokes Gained_...pdf`의 앱 화면 3장과 비교. 4카테고리 SG 막대·전통 stat·홀 테이블은 이미 같은 구조.
없던 것 두 개를 추가: 홀 입력 원장의 **샷별 SG**(글의 핵심 예시 표 형태, `holeSG` 결과를 그대로 표시)와 Analysis의
**Round vs 기간** 카드(Shot Scope의 Round/Season 비교. 라운드 선택, Score/FIR/GIR/Putts/Up&Down/Penalty/Double+/SG, Δ 색).
Card와 홀 입력의 스코어 색이 달랐던 것을 `vsParColor` 하나로 통일. 스코어 유형(이글~더블) 개수 분포는 아직 없음.

## 로깅 · Sentry · 홀 저장 복원력 (2026-09-21)

**왜.** 앱에 로그가 전혀 없었다(`console.*` 0, 에러 페이지 0). Supabase 에러는 서버 읽기 9곳에서 빈 데이터로 삼켜지고,
유일한 쓰기 경로인 홀 저장은 실패 시 "저장 실패" 2초 토스트가 전부에 `catch`도 없어 코스에서 통신이 끊기면 입력이 사라졌다.

**결정:**
- `lib/log.ts` `logError/logWarn`: console 항상(서버=Vercel 로그) + Sentry는 DSN 있을 때만. 미로그인은 로그 제외.
- Sentry `@sentry/nextjs` 10, 표준 레이아웃(instrumentation ×2 + config ×2 + withSentryConfig). traces 0, replay 없음, tunnelRoute 없음(미들웨어 matcher와 충돌).
  Turbopack에선 middleware가 계측되지 않아 middleware는 console만. `middleware.ts → proxy.ts` 개명은 보류.
- 서버 읽기 실패는 throw → `error.tsx`. 부분 데이터로 stat을 내면 "N/A" 규칙을 어기고 틀린 숫자가 나오므로.
  라운드 페이지는 UUID 검사 + `.maybeSingle()`로 "없음(404)"과 "DB 실패(에러 페이지)"를 분리. 홀 로드 실패도 throw(빈 홀로 덮어쓰기 방지).
- 클라 mutation은 원본 `error.message` 대신 `save-errors.ts` 문구. 분류 기준: PostgREST `code ''` = 네트워크, 42501 = RLS, 23xxx = 제약, 401/PGRST30x = 인증.
- 홀 저장: 대기 홀 + 현재 홀을 배치 upsert(멱등) → `withRetry` 첫 시도 + 재시도 3회(500ms/1s/2s, 스피너 "재시도 중 n/3") →
  실패 시 `pending-holes`(라운드당 localStorage 키 하나)에 보관, 네비 빨간 점 + 버튼 "(+미저장 N홀)" + 인라인 안내. 차단 모달 없음.
  다음 저장 때 함께 저장. 대기 홀 쪽 데이터 오류가 배치를 막으면 현재 홀만 단독 저장 폴백. 마운트 시 복원.
  권한/제약/형식 오류는 재시도·보관 없이 문구만. 인증 만료는 보관은 하되 재시도 안 함.

## 다음: Phase 5

`claude/phase5.md` 참조 — PWA, Kakao OAuth + 온보딩, 성능.
