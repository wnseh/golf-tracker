# Phase 4 — Scorecard & Analysis (MVP → eSG)

## 목표

* **80%+ 유저(명랑/대강)**가 "스코어를 낮추기 위한 원인(누수)"을 빠르게 파악
* 라운드 기록 데이터의 **누락/불완전** 상황에서도 **신뢰 가능한 수치**를 제공
* "커스터마이징"은 2순위: **기본 분석 세트는 강제 제공 + 추천 기반 pin 방식**

---

## 4.1 Scorecard 화면

### 4.1.1 상단 요약 카드 (기간 기반)

* Date range selector (연/월/커스텀)
* 해당 기간의 요약(필수):

  * Avg Score (표본수: 라운드/홀)
  * Avg Putts (가능한 경우)
  * GIR% 또는 "몇온%" (가능한 경우)
* 최근 10라운드 요약(옵션):

  * Avg Score + 트렌드(최근 3 vs 이전 7)
  * 변동성(예: range 또는 표준편차)

**결론/이유(간략)**
평균만 보여주면 노이즈가 크므로, 최소한 **기간 필터 + 트렌드**가 있어야 "좋아졌는지"에 답함.

### 4.1.2 라운드 리스트

* 라운드 카드(접힘/펼침)

  * 접힘: date, course, tee, holes, score, putts, GIR(가능하면), penalties(가능하면)
  * 펼침: 홀별 테이블 (par/score/putts/GIR 등)

### 4.1.3 Missing Data 처리(필수)

* 미기록은 **0이 아니라 `N/A`**로 표시
* 모든 퍼센트/평균 KPI는 분모 노출:

  * 예: `GIR 6/14 (43%)`, `FW 7/12 (58%)`
* Coverage 표기:

  * 예: `Putting coverage 72% (13/18 holes)`

**결론/이유(간략)**
미기록이 0으로 계산되면 "앱이 틀린 값"으로 보이며 신뢰가 붕괴함.

---

## 4.2 Analysis 화면 (명랑/대강 중심 설계)

### 4.2.1 화면 목적(강제)

사용자가 분석에서 얻어야 하는 답은 3개로 고정:

1. **Trend:** 내가 좋아지고 있나?
2. **Leak:** 어디서 타수를 잃나? (Biggest leak)
3. **Action:** 다음 라운드에서 뭘 바꾸면 가장 빨리 줄이나? (1 action)

### 4.2.2 기본 구성(MVP, 강제 노출)

**A. 기간 요약(Top)**

* Avg Score / Avg Putts / GIR% (가능한 지표만)
* 표본수 + Coverage

**B. Trend(필수 2개)**

* Score trend (line)
* Putts per round trend (line)

**C. Biggest Leak(필수 1개)**

* "Estimated Strokes" 기반 Leak 1위 + 보조 2위 (옵션)
* 각 leak 항목은 반드시 포함:

  * `estimated strokes lost (per round)`
  * `sample size`
  * `coverage`
  * `confidence (H/M/L)`
  * `recommended action 1개`

**결론/이유(간략)**
유저는 그래프 목록이 아니라 "결론 + 다음 행동"을 원함. 기본 세트는 비어 있으면 안 됨.

### 4.2.3 위젯 확장(옵션) — "Pick & choose" 금지, 추천 기반 pin만

* 사용자가 위젯 라이브러리에서 직접 고르는 방식 X
* 시스템이 데이터 가용성/신뢰도 기반으로 **추천 → 사용자가 pin**

  * 예: 3-putt 데이터 충분 → "3-putt 위젯 추천"
  * 데이터 부족 → 추천 노출 안 함

**결론/이유(간략)**
사용자는 무엇을 추가해야 할지 모름 + 데이터 누락 상황에서 빈 위젯은 즉시 이탈을 유발.

---

## 4.3 eSG (Estimated Strokes Gained) — 수치 기반 Leak 계산

> 정통 SG를 "그대로" 구현하지 않고, 명랑/대강 데이터에 맞춘 **eSG**로 제공
> UI/문구는 반드시 `Estimated (eSG)`로 표기

### 4.3.1 왜 eSG인가 (간략)

* 대강 데이터는 샷별 "정확한 before/after 거리"가 부족하여 정통 SG에 불리
* 대신 **간단한 leaveDistBucket + putt 거리**로 SG의 핵심(기대타수 변화)을 근사 가능

### 4.3.2 대강 모드 추가 입력(합의사항) — `leaveDistBucket` 1탭

**Approach/ARG에 `leaveDistBucket` 추가**

* `ON` (그린 위, ON이면 leaveDistBucket 입력 스킵 가능)
* `0-2m`
* `2-5m`
* `5m+`
* `PEN`

**대강 모드에서 `lieSimple`은 사실상 필수(자동 제안 + 수정 가능)**

* `clean / rough / sand / bad`

**결론/이유(간략)**
"다음 샷에서 알겠지"에 의존하면 샷 누락 시 데이터가 무너짐. leave+lie로 누락에 강한 eSG 계산이 가능.

### 4.3.3 퍼팅 dist bucket(합의사항)

* `0-1m`
* `1-2m`
* `2-5m`
* `5-8m`
* `8m+`

퍼팅 POST(대강): `outcome`, `postSpeed(short/good/long)`, (선택) `missSide(L/C/R)`

### 4.3.4 Baseline 자동 변경 — "핸디"가 아니라 `Baseline bucket`

* 공인 HI 추정이 아니라 내부 `SkillIndex` 기반 baseline bucket 선택
* `SkillIndex`는 최근 라운드로 추정(B):

  * 입력: AdjScore(18홀 환산), PuttsPer18(가능시), GIR/OnPer18(가능시), PenaltyPer18(가능시)
  * 집계: 최근 N라운드 robust aggregation (median/truncated mean)
  * 출력: baseline bucket (0–5/6–10/11–15/16–20/21–25/26+)
* UI 표기:

  * "추정 핸디" X
  * "Baseline: 11–15 (Confidence: Medium)" O

**결론/이유(간략)**
레이팅/슬로프가 없는 라운드가 많아 공인 HI 추정은 방어 불가. baseline은 내부 지표로 정직하게 운영.

### 4.3.5 신뢰도 방어 장치(필수)

모든 eSG/Leak 출력은 아래를 반드시 동반:

* `sample size`
* `coverage`
* `confidence (H/M/L)` 규칙 기반
* eSG 라벨 "Estimated" 고정

---

## 4.4 Phase 4 Deliverables (체크리스트)

* [ ] Scorecard 화면 (기간 필터 + 라운드 리스트 + 펼침 홀테이블)
* [ ] Missing data 처리 규칙 적용 (N/A, 분모, coverage)
* [ ] Analysis MVP 화면 (요약/트렌드/Biggest Leak/Action)
* [ ] 대강 모드: leaveDistBucket 1탭 + lieSimple 자동제안/수정
* [ ] Putting dist bucket 적용 (0-1/1-2/2-5/5-8/8+)
* [ ] eSG 계산 v1 (Putting/ARG/Approach 중심, Tee는 penalty 중심)
* [ ] Baseline bucket 자동 추정(SkillIndex) + confidence
* [ ] 위젯 추천 → pin UX (라이브러리 직접 선택 방식 제외)

---

## 4.5 Data Model Changes (Phase 4)

### 4.5.1 공통 원칙

* **기존 스키마 유지** + 분석에 필요한 최소 필드만 추가
* 미기록 값은 `0`으로 저장/표시하지 않고 **null/unknown 처리**
* 분석/지표 출력 시 항상 **분모(샷/홀/라운드) + coverage** 제공

---

### 4.5.2 Ground Shots (`stg_shots` jsonb[]) — `leaveDistBucket` 추가

> StgShot은 flat 구조 — `post` 중첩 객체 없음

#### 신규 enum

```ts
export type LeaveDistBucket = 'ON' | '0-2m' | '2-5m' | '5m+' | 'PEN';
```

#### StgShot에 필드 추가 (flat)

```ts
export interface StgShot {
  // ...existing flat fields...
  leaveDistBucket?: LeaveDistBucket | null;  // 신규
}
```

#### 입력 규칙

* intent=approach:

  * result가 GIR이면 `leaveDistBucket='ON'` 자동 세팅 (추가 탭 스킵 가능)
  * result가 Trouble/OB/HZ 계열이면 `leaveDistBucket='PEN'`
* intent=arg:

  * 기존 결과 Close/Mid/Long을 각각 `0-2m/2-5m/5m+`로 매핑 가능 (호환 유지)
  * 분석에서는 `leaveDistBucket`로 통일

#### `lieSimple` 최소 유지 (대강 모드 기준 강제 수준)

이미 존재하는 `lieQuality`를 그대로 쓰되, 분석 로직에서 아래 축약 매핑을 사용:

```ts
type LieSimple = 'clean' | 'rough' | 'sand' | 'bad';
```

매핑:

* `lieQuality=clean` → clean
* `lieQuality=rough` → rough
* `lieQuality=sand` → sand
* `lieQuality=divot|bad` → bad

**UI 규칙(대강 모드)**

* result 기반으로 `lieSimple` 자동 추천:

  * result가 Bunker면 기본 sand
  * result가 Fairway/Perfect spot이면 기본 clean
  * result가 Rough면 기본 rough
  * Trouble/Playable 등은 bad 추천 가능
* 유저는 1탭으로 수정 가능(선택지 4개)

---

### 4.5.3 Putting (`putt_cards` jsonb[]) — `distBucket` 추가

> PuttCard도 flat 구조 — `pre` 중첩 객체 없음

#### 신규 enum

```ts
export type PuttDistBucket = '0-1m' | '1-2m' | '2-5m' | '5-8m' | '8m+';
```

#### PuttCard에 필드 추가 (flat)

```ts
export interface PuttCard {
  dist:       string | null;               // 기존
  distBucket?: PuttDistBucket | null;       // 신규
  // ...existing flat fields...
}
```

#### 버킷 매핑 규칙

* dist가 있을 때 (자동 계산):

  * 0 < dist <= 1 → 0-1m
  * 1 < dist <= 2 → 1-2m
  * 2 < dist <= 5 → 2-5m
  * 5 < dist <= 8 → 5-8m
  * dist > 8 → 8m+
* dist가 없을 때 (대강 모드):

  * UI에서 바로 distBucket만 선택 가능 (슬라이더 없이 칩 선택)

#### POST (대강 모드 최소 필드)

* `outcome: made|missed`
* `postSpeed: short|good|long`
* (선택) `missSide: left|center|right`
* 기존 `read`, `feel` 등은 진지 모드에서만 노출

---

### 4.5.4 Tee Shot (`tee_routine`) — eSG v1 범위

* 대강 모드에서 tee는 **penalty 중심 eSG**를 위해 기존의 `landing` 값을 활용
* 티샷에 `leaveDistBucket` 추가하지 않음(v1)
* v2에서 "distance gained"를 원하면 다음 중 하나 추가 고려:

  * `teeCarryBucket: short|ok|long`
  * 또는 다음 샷 distBucket으로 간접 추정

---

### 4.5.5 Rounds (`rounds`) — 기존 컬럼 활용

> `rounds.input_mode` (fun|casual|serious) 이미 존재 — 신규 컬럼 추가 불필요

* `input_mode`를 분석에서 coverage/신뢰도 계산에 활용
* `handicap` (선택) — 있으면 baseline bucket 직접 결정에 사용
* `rating` (선택) — 향후 HI 계산 고도화 여지(필수 아님)

---

## 4.6 Derived Metrics & Storage (Analysis Computation)

### 4.6.1 Coverage 계산 (필수)

모든 KPI/Leak/eSG 출력은 coverage 포함:

* `coverage_putting = (#holes with putts recorded) / (holes played)`
* `coverage_stg = (#ground shots recorded) / (expected ground shots)`

  * expected는 완벽 계산 불가 → v1은 "기록된 홀 비율" 또는 "샷 수 임계치"로 대체
* `coverage_tee = tee shot 기록된 홀 비율`

표기 예:

* `GIR 6/14 (43%), coverage 78%`
* `Putting eSG based on 132 putts, coverage 92%`

---

### 4.6.2 Baseline 자동 추정용 테이블 (신규)

공인 HI가 아닌 내부 지표: `SkillIndex` 및 baseline bucket

#### 테이블: `skill_index_snapshots`

| field            | type           | notes                 |
| ---------------- | -------------- | --------------------- |
| user_id          | uuid           | PK part               |
| computed_at      | timestamptz    | PK part               |
| n_rounds         | int            | 사용한 라운드 수             |
| holes_equiv      | int            | 18홀 환산 총합             |
| adj_score_mean   | float          | robust aggregation 결과 |
| putts_per18      | float nullable | 가능하면                  |
| gir_per18        | float nullable | 가능하면                  |
| penalty_per18    | float nullable | 가능하면                  |
| skill_index      | float          | 0~30 스케일              |
| baseline_bucket  | text           | `0-5/6-10/.../26+`    |
| coverage_overall | float          | 종합 coverage           |
| confidence       | text           | `high/medium/low`     |
| debug_json       | jsonb          | 계산 근거(옵션)             |

**계산 규칙(v1)**

* 입력 우선순위:

  1. round.handicap 존재 시 해당 bucket 사용(신뢰도 high boost)
  2. 없으면 SkillIndex 추정(B)
* 집계:

  * 최근 10라운드 중 상하 2개 제거(truncated mean) 또는 median fallback
* 9홀:

  * adjScore = score * 2 (단 confidence down)

---

### 4.6.3 eSG 계산용 테이블 (신규)

eSG는 "Estimated"로만 표기. baseline bucket별 기대값 테이블을 둔다.

#### 테이블: `expected_strokes`

| field           | type  | notes              |
| --------------- | ----- | ------------------ |
| baseline_bucket | text  | `0-5/6-10/...`     |
| domain          | text  | `PUTT` or `AROUND` |
| key             | text  | 버킷 키               |
| expected        | float | 기대 타수/퍼트           |

#### PUTT domain key

* key = `putt:0-1m`, `putt:1-2m`, `putt:2-5m`, `putt:5-8m`, `putt:8m+`
* expected = 기대 퍼트 수

#### AROUND domain key (APP/ARG 공통 v1)

* key = `leave:ON`, `leave:0-2m`, `leave:2-5m`, `leave:5m+`, `leave:PEN`
* lieSimple까지 넣으려면:

  * `leave:0-2m|clean`, `leave:0-2m|rough`, ... 형태로 확장 가능
  * v1 최소는 lieSimple 미반영, v1.1에서 반영 권장

> NOTE: lieSimple 반영은 정확도 증가, 테이블 크기 증가
> PM 합의상 "수치 방어(A)"가 목적이므로 v1.1에서 lieSimple 반영을 추천

---

### 4.6.4 eSG 산출 로직 (v1)

#### Putting eSG

* 각 퍼트 카드의 `distBucket`에 대해 기대 퍼트(E_putt) 조회
* 라운드 단위:

  * `eSG_putt = Σ(E_putt(distBucket)) - actual_putts`
  * actual_putts는 putt card count 또는 hole score 기반 (coverage 높은 쪽 선택)

#### Around/Approach eSG (v1 간소)

* 각 APP/ARG 샷에서 `leaveDistBucket` 기대값(E_around)을 조회
* `eSG_around`는 다음 두 방식 중 택1:

  1. **샷 단위:** `E_before - (1 + E_after)` (v2)
  2. **결과 단위(권장 v1):** leaveDistBucket 분포로 "기대 손실"을 합산(설명 가능, 누락에 강함)

#### Tee eSG (v1)

* penalty 기반:

  * OB/HZ/PEN 발생 시 고정 손실 추정치를 더함
* v2에서 거리 SG 추가

---

### 4.6.5 Confidence 산정 규칙(필수)

모든 eSG/Leak 카드에 `confidence` 표기.

권장 규칙:

* High:

  * 샷/퍼트 샘플 수 >= 50 AND coverage >= 0.70
* Medium:

  * 샘플 수 20~49 OR coverage 0.40~0.69
* Low:

  * 그 외

---

## 4.7 API / Analytics Outputs (Phase 4)

### 4.7.1 Scorecard Summary API

* input: date range
* output:

  * avg_score, avg_putts, gir_rate (with numerator/denominator)
  * trend deltas
  * coverage metrics
  * list of rounds (with expandable hole data)

### 4.7.2 Analysis API

* input: date range + baseline_bucket(optional)
* output:

  * summary KPIs + coverage
  * trend series: score, putts
  * eSG breakdown: tee / approach+around / putting
  * biggest leak list (ranked) + action recommendation

---

## 4.8 JSON Examples (Phase 4)

> 모든 JSON 예시는 실제 코드베이스의 flat 구조에 맞춤

### 4.8.1 Round row 예시 (`rounds` 테이블)

```json
{
  "id": "round_20260226_001",
  "course": "Suwon CC",
  "date": "2026-02-26",
  "tee": "WH",
  "holes": 18,
  "input_mode": "casual",
  "handicap": null,
  "rating": null
}
```

---

### 4.8.2 Hole row 예시 (`holes` 테이블)

> GIR은 DB 컬럼이 아니라 파생값 (분석/표시 레이어에서 shotsToGreen 기반 계산)

```json
{
  "round_id": "round_20260226_001",
  "hole_num": 7,
  "par": 4,
  "score": 5,
  "tee_routine": { },
  "stg_shots": [ ],
  "putt_cards": [ ],
  "notes": "티샷 우측 러프. 세컨 살짝 쇼트"
}
```

---

### 4.8.3 Tee shot 예시 (`holes.tee_routine` jsonb) — flat 구조

#### Casual 모드 저장 최소 예시

```json
{
  "windStr": null,
  "windDir": null,
  "targetTraj": null,
  "targetStartLine": null,
  "targetCurve": null,
  "landing": "RO",
  "actualCarry": null,
  "resultTraj": null,
  "resultStartLine": "push",
  "resultCurve": "fade",
  "feel": "heel",
  "commit": null,
  "learnType": null,
  "learnNote": null
}
```

> Casual 모드에선 `wind`, `target*`, `commit`, `learn*` 등은 기본 숨김/미입력 가능.

---

### 4.8.4 Ground shot 예시 (`holes.stg_shots` jsonb[]) — flat 구조

#### A) Approach 샷 1개 (leaveDistBucket 포함)

```json
{
  "intent": "approach",
  "dist": "118",
  "club": "7I",
  "windStr": null,
  "windDir": null,
  "lieQuality": "rough",
  "lieBall": null,
  "lieSlope": null,
  "lieStance": null,
  "argType": null,
  "targetTraj": null,
  "targetStartLine": null,
  "targetCurve": null,
  "result": "Short",
  "resTraj": null,
  "resStartLine": "straight",
  "resCurve": "straight",
  "feel": "low",
  "commit": null,
  "learnType": null,
  "note": null,
  "leaveDistBucket": "5m+"
}
```

#### B) ARG 샷 1개 (기존 result를 leaveDistBucket으로 매핑)

```json
{
  "intent": "arg",
  "dist": "18",
  "club": "58W",
  "lieQuality": "rough",
  "argType": "Pitch",
  "result": "Mid(2-5m)",
  "feel": "flushed",
  "leaveDistBucket": "2-5m"
}
```

> 간결함을 위해 null 필드 생략. 실제 저장 시 모든 필드 존재.

#### C) Bunker ARG 샷 1개

```json
{
  "intent": "arg",
  "dist": "12",
  "club": "56W",
  "lieQuality": "sand",
  "argType": "Bunker",
  "result": "Long(5m+)",
  "feel": "high",
  "leaveDistBucket": "5m+"
}
```

#### D) Recovery 샷 (penalty 상태)

```json
{
  "intent": "recovery",
  "club": "7I",
  "lieQuality": "bad",
  "result": "Still Trouble",
  "leaveDistBucket": "PEN"
}
```

---

### 4.8.5 Putting 예시 (`holes.putt_cards` jsonb[]) — flat 구조

#### Casual 모드: distBucket + outcome + speed 중심

```json
[
  {
    "dist": "7",
    "distBucket": "5-8m",
    "slope": null,
    "break": null,
    "preSpeed": null,
    "outcome": "missed",
    "postSpeed": "good",
    "startLine": "good",
    "read": null,
    "feel": null,
    "note": null
  },
  {
    "dist": "0.8",
    "distBucket": "0-1m",
    "slope": null,
    "break": null,
    "preSpeed": null,
    "outcome": "made",
    "postSpeed": "good",
    "startLine": null,
    "read": null,
    "feel": null,
    "note": null
  }
]
```

> putt 카드 2개면 putts는 2로 계산 가능(coverage 높을 때).

---

## 4.9 DB Migration Checklist (Phase 4)

### 4.9.1 Schema 변경(최소)

> `rounds.input_mode` (fun|casual|serious)는 Phase 3에서 이미 존재 — 추가 불필요

1. JSONB 구조 변경 (테이블 컬럼 추가 없이 JSON 키 추가)

* [ ] `stg_shots[].leaveDistBucket` 키 추가 (nullable)
* [ ] `putt_cards[].distBucket` 키 추가 (nullable)

> JSONB는 마이그레이션 없이도 저장 가능하지만, **validation/enum 체크**는 앱 레벨에서 추가 권장.

---

### 4.9.2 New tables

2. `expected_strokes` (eSG seed)

* [ ] create table `expected_strokes`:

  * `baseline_bucket text not null`
  * `domain text not null` (PUTT, AROUND)
  * `key text not null`
  * `expected float not null`
  * PK: `(baseline_bucket, domain, key)`

* [ ] seed initial rows:

  * PUTT: `putt:0-1m`, `putt:1-2m`, `putt:2-5m`, `putt:5-8m`, `putt:8m+`
  * AROUND: `leave:ON`, `leave:0-2m`, `leave:2-5m`, `leave:5m+`, `leave:PEN`
  * baseline_bucket: `0-5`, `6-10`, `11-15`, `16-20`, `21-25`, `26+`

3. `skill_index_snapshots` (baseline 자동 추정)

* [ ] create table `skill_index_snapshots`:

  * `user_id uuid not null`
  * `computed_at timestamptz not null`
  * `n_rounds int not null`
  * `holes_equiv int not null`
  * `adj_score_mean float not null`
  * `putts_per18 float null`
  * `gir_per18 float null`
  * `penalty_per18 float null`
  * `skill_index float not null`
  * `baseline_bucket text not null`
  * `coverage_overall float not null`
  * `confidence text not null` (high/medium/low)
  * `debug_json jsonb null`
  * PK: `(user_id, computed_at)`

---

### 4.9.3 Backfill / Data hygiene

4. `putt_cards[].distBucket` backfill

* [ ] dist가 있는 카드에 한해 distBucket 계산 후 저장(배치 스크립트)
* [ ] dist가 없는 경우는 null 유지 (analysis에서 제외/coverage 반영)

5. `stg_shots[].leaveDistBucket` backfill

* [ ] 기존 ARG result가 Close/Mid/Long인 경우:

  * Close → 0-2m
  * Mid → 2-5m
  * Long → 5m+
* [ ] APP에서 GIR flag가 명확한 경우: `ON` 세팅
* [ ] 불명확/누락은 null 유지 (coverage 반영)

---

### 4.9.4 Validation & Constraints (권장)

6. App-level enum validation (필수)

* [ ] `leaveDistBucket` 값 검증: `ON|0-2m|2-5m|5m+|PEN`
* [ ] `puttDistBucket` 값 검증: `0-1m|1-2m|2-5m|5-8m|8m+`
* [ ] 결과값과 leaveDistBucket의 일관성:

  * result=GIR → leaveDistBucket=ON (자동)
  * penalty류 → leaveDistBucket=PEN (자동)

7. Metrics 계산 시 Missing 규칙 강제(필수)

* [ ] null은 제외, 0으로 치환 금지
* [ ] KPI 출력 시 numerator/denominator 노출
* [ ] coverage 계산 및 confidence 산정

---

### 4.9.5 Performance / Caching

8. eSG 계산 방식 결정

* [ ] 옵션 A: 조회 시 계산 (simpler, CPU 부담)
* [ ] 옵션 B: 라운드 저장 시 precompute 후 `round_metrics` 테이블에 저장 (추천)

  * 추천 테이블: `round_metrics`

    * `round_id`, `baseline_bucket`, `esg_putt`, `esg_around`, `esg_tee`, `coverage`, `confidence`, `computed_at`

---

## 4.10 Post-migration Smoke Tests (필수)

* [ ] 기존 라운드 열람 시 crash 없이 표시
* [ ] 미기록 putts/GIR에서 0% 대신 N/A + coverage 노출
* [ ] casual 모드에서 approach 결과 입력 → leaveDistBucket 1탭 정상 동작
* [ ] putt dist 입력 → distBucket 자동 매핑 확인
* [ ] analysis에서 baseline_bucket 자동 선택 + confidence 출력 확인
* [ ] biggest leak가 "표본/coverage/신뢰도" 없이 단독 출력되지 않도록 guard

---

## 4.11 `expected_strokes` Seed (v1 Bootstrap)

> 이 값들은 "초기 부트스트랩용".
> 출시 후에는 앱 데이터로 보정(캘리브레이션)해야 수치를 방어할 수 있음.
> UI/문구는 반드시 Estimated / Baseline로만 표기.

### 4.11.1 Baseline buckets

* `0-5`, `6-10`, `11-15`, `16-20`, `21-25`, `26+`

---

### 4.11.2 PUTT domain — Expected putts by distance bucket

**정의**

* `expected`는 "해당 거리에서 홀아웃까지 기대 퍼트 수(E_putt)"
* eSG_putt 계산 시: `Σ(E_putt(distBucket)) - actual_putts`

> 직관 검증:
>
> * 0-1m는 1에 매우 가깝고
> * 8m+는 2.0~2.2 범위가 합리적
> * 핸디가 나쁠수록 기대 퍼트가 증가

```csv
baseline_bucket,domain,key,expected
0-5,PUTT,putt:0-1m,1.04
0-5,PUTT,putt:1-2m,1.15
0-5,PUTT,putt:2-5m,1.45
0-5,PUTT,putt:5-8m,1.75
0-5,PUTT,putt:8m+,2.00
6-10,PUTT,putt:0-1m,1.06
6-10,PUTT,putt:1-2m,1.20
6-10,PUTT,putt:2-5m,1.52
6-10,PUTT,putt:5-8m,1.83
6-10,PUTT,putt:8m+,2.06
11-15,PUTT,putt:0-1m,1.08
11-15,PUTT,putt:1-2m,1.25
11-15,PUTT,putt:2-5m,1.60
11-15,PUTT,putt:5-8m,1.92
11-15,PUTT,putt:8m+,2.12
16-20,PUTT,putt:0-1m,1.10
16-20,PUTT,putt:1-2m,1.32
16-20,PUTT,putt:2-5m,1.70
16-20,PUTT,putt:5-8m,2.02
16-20,PUTT,putt:8m+,2.18
21-25,PUTT,putt:0-1m,1.12
21-25,PUTT,putt:1-2m,1.40
21-25,PUTT,putt:2-5m,1.82
21-25,PUTT,putt:5-8m,2.12
21-25,PUTT,putt:8m+,2.25
26+,PUTT,putt:0-1m,1.14
26+,PUTT,putt:1-2m,1.48
26+,PUTT,putt:2-5m,1.95
26+,PUTT,putt:5-8m,2.22
26+,PUTT,putt:8m+,2.35
```

---

### 4.11.3 AROUND domain — Expected strokes to hole-out by leaveDistBucket

**정의**

* `expected`는 "그 상태에서 홀아웃까지 기대 타수(E_around)"
* leaveDistBucket은 APP/ARG 모두 공통으로 사용 (v1에서는 통합)

키:

* `leave:ON`
* `leave:0-2m`
* `leave:2-5m`
* `leave:5m+`
* `leave:PEN`

> 해석:
>
> * `leave:ON`은 "그린 위(첫 퍼트 남음)" 상태의 기대 타수 = 기대 퍼트 수준(대략 2 근처)
> * `0-2m`는 업앤다운 확률이 높아서 2.1~2.5대
> * `5m+`는 칩/피치 + 퍼트 1~2개가 섞여서 2.6~3.2대
> * `PEN`은 상태가 다양하지만 v1은 1회 penalty 포함한 보수적 값으로 둠

```csv
baseline_bucket,domain,key,expected
0-5,AROUND,leave:ON,1.80
0-5,AROUND,leave:0-2m,2.10
0-5,AROUND,leave:2-5m,2.30
0-5,AROUND,leave:5m+,2.60
0-5,AROUND,leave:PEN,3.30
6-10,AROUND,leave:ON,1.85
6-10,AROUND,leave:0-2m,2.20
6-10,AROUND,leave:2-5m,2.45
6-10,AROUND,leave:5m+,2.75
6-10,AROUND,leave:PEN,3.45
11-15,AROUND,leave:ON,1.90
11-15,AROUND,leave:0-2m,2.32
11-15,AROUND,leave:2-5m,2.62
11-15,AROUND,leave:5m+,2.95
11-15,AROUND,leave:PEN,3.60
16-20,AROUND,leave:ON,1.95
16-20,AROUND,leave:0-2m,2.45
16-20,AROUND,leave:2-5m,2.80
16-20,AROUND,leave:5m+,3.15
16-20,AROUND,leave:PEN,3.80
21-25,AROUND,leave:ON,2.00
21-25,AROUND,leave:0-2m,2.60
21-25,AROUND,leave:2-5m,3.00
21-25,AROUND,leave:5m+,3.35
21-25,AROUND,leave:PEN,4.05
26+,AROUND,leave:ON,2.05
26+,AROUND,leave:0-2m,2.75
26+,AROUND,leave:2-5m,3.20
26+,AROUND,leave:5m+,3.55
26+,AROUND,leave:PEN,4.30
```

**주의(필수 표기)**

* 이 AROUND 값은 라이(rough/sand/bad)를 아직 반영하지 않은 v1 seed임
* v1.1에서 `|lieSimple`을 key에 포함해 분리 추천:

  * 예: `leave:0-2m|clean`, `leave:0-2m|sand` ...

---

### 4.11.4 Seed 적용 규칙 (Phase 4 구현 지침)

* baseline_bucket이 없으면:

  * `skill_index_snapshots`의 최신 스냅샷 bucket 사용
  * 없으면 기본 `11-15` + confidence low
* 누락 데이터는 계산에서 제외하고 coverage에 반영
* `expected_strokes`에 없는 key가 들어오면:

  * 계산 제외 + debug 로그 + confidence 하락

---

## 4.12 Calibration Plan (v1 → v1.1 필수 로드맵)

수치 목표를 방어하려면 seed를 "앱 데이터로 보정"해야 함.

### v1.1 보정 방법(추천)

* baseline_bucket별로,

  * PUTT: distBucket별 실제 평균 퍼트수를 관측 → seed에 EMA(지수이동평균)로 수렴
  * AROUND: leaveDistBucket별 "실제 홀아웃까지 타수" 관측 → seed 보정
* 보정 시 최소 샘플 조건:

  * bucket별 N >= 200 (또는 confidence high에서만 적용)

---

## 4.13 SQL — Seed `expected_strokes` (v1 Bootstrap)

> 전제: 테이블이 이미 생성되어 있음
> `expected_strokes(baseline_bucket text, domain text, key text, expected float)`
> PK: `(baseline_bucket, domain, key)`

```sql
-- 4.13.1 PUTT domain seed
INSERT INTO expected_strokes (baseline_bucket, domain, key, expected) VALUES
('0-5','PUTT','putt:0-1m',1.04),
('0-5','PUTT','putt:1-2m',1.15),
('0-5','PUTT','putt:2-5m',1.45),
('0-5','PUTT','putt:5-8m',1.75),
('0-5','PUTT','putt:8m+',2.00),

('6-10','PUTT','putt:0-1m',1.06),
('6-10','PUTT','putt:1-2m',1.20),
('6-10','PUTT','putt:2-5m',1.52),
('6-10','PUTT','putt:5-8m',1.83),
('6-10','PUTT','putt:8m+',2.06),

('11-15','PUTT','putt:0-1m',1.08),
('11-15','PUTT','putt:1-2m',1.25),
('11-15','PUTT','putt:2-5m',1.60),
('11-15','PUTT','putt:5-8m',1.92),
('11-15','PUTT','putt:8m+',2.12),

('16-20','PUTT','putt:0-1m',1.10),
('16-20','PUTT','putt:1-2m',1.32),
('16-20','PUTT','putt:2-5m',1.70),
('16-20','PUTT','putt:5-8m',2.02),
('16-20','PUTT','putt:8m+',2.18),

('21-25','PUTT','putt:0-1m',1.12),
('21-25','PUTT','putt:1-2m',1.40),
('21-25','PUTT','putt:2-5m',1.82),
('21-25','PUTT','putt:5-8m',2.12),
('21-25','PUTT','putt:8m+',2.25),

('26+','PUTT','putt:0-1m',1.14),
('26+','PUTT','putt:1-2m',1.48),
('26+','PUTT','putt:2-5m',1.95),
('26+','PUTT','putt:5-8m',2.22),
('26+','PUTT','putt:8m+',2.35)
ON CONFLICT (baseline_bucket, domain, key) DO UPDATE
SET expected = EXCLUDED.expected;

-- 4.13.2 AROUND domain seed
INSERT INTO expected_strokes (baseline_bucket, domain, key, expected) VALUES
('0-5','AROUND','leave:ON',1.80),
('0-5','AROUND','leave:0-2m',2.10),
('0-5','AROUND','leave:2-5m',2.30),
('0-5','AROUND','leave:5m+',2.60),
('0-5','AROUND','leave:PEN',3.30),

('6-10','AROUND','leave:ON',1.85),
('6-10','AROUND','leave:0-2m',2.20),
('6-10','AROUND','leave:2-5m',2.45),
('6-10','AROUND','leave:5m+',2.75),
('6-10','AROUND','leave:PEN',3.45),

('11-15','AROUND','leave:ON',1.90),
('11-15','AROUND','leave:0-2m',2.32),
('11-15','AROUND','leave:2-5m',2.62),
('11-15','AROUND','leave:5m+',2.95),
('11-15','AROUND','leave:PEN',3.60),

('16-20','AROUND','leave:ON',1.95),
('16-20','AROUND','leave:0-2m',2.45),
('16-20','AROUND','leave:2-5m',2.80),
('16-20','AROUND','leave:5m+',3.15),
('16-20','AROUND','leave:PEN',3.80),

('21-25','AROUND','leave:ON',2.00),
('21-25','AROUND','leave:0-2m',2.60),
('21-25','AROUND','leave:2-5m',3.00),
('21-25','AROUND','leave:5m+',3.35),
('21-25','AROUND','leave:PEN',4.05),

('26+','AROUND','leave:ON',2.05),
('26+','AROUND','leave:0-2m',2.75),
('26+','AROUND','leave:2-5m',3.20),
('26+','AROUND','leave:5m+',3.55),
('26+','AROUND','leave:PEN',4.30)
ON CONFLICT (baseline_bucket, domain, key) DO UPDATE
SET expected = EXCLUDED.expected;
```

---

## 4.14 SkillIndex v1 Spec — Baseline 자동 추정 (B)

### 4.14.1 목적/정의

* 공인 HI 추정이 아니라, **eSG baseline 선택을 위한 내부 지표**
* 출력은 연속값이 아니라 **baseline bucket(0-5/.../26+)** 중심
* 누락 데이터가 많아도 동작해야 함(명랑/대강 80% 전제)

---

### 4.14.2 입력 데이터

최근 N 라운드(기본 N=10, 최대 20까지 확장 가능)에서 다음을 추출:

* `holes` (9/18)
* `score_total` (18홀 합)
* `putts_total` (있으면)
* `GIR_total` 또는 `온` (있으면)
* `penalty_count` (있으면: OB/HZ/PEN 등)
* `input_mode` (fun/casual/serious)

---

### 4.14.3 전처리: 18홀 환산(AdjScore)

* 18홀 라운드: `AdjScore = score_total`
* 9홀 라운드: `AdjScore = score_total * 2`

  * 단, **confidence 페널티** 적용

추가 환산:

* `PuttsPer18 = putts_total * (18/holes)` (nullable)
* `GIRper18 = gir_total * (18/holes)` 또는 `OnPer18` (nullable)
* `PenaltyPer18 = penalty_total * (18/holes)` (nullable)

---

### 4.14.4 Robust Aggregation (핵심)

골프는 분산이 크므로 평균은 금지 수준.

* 우선, 후보 라운드 집합 R을 만든다:

  * 최근 N 라운드 중 "score가 있는 라운드"
* `|R| >= 8`이면:

  * AdjScore 기준으로 정렬 후 **상위 2개 + 하위 2개 제거**
  * 남은 값의 평균 = `AdjScoreMean`
* `4 <= |R| < 8`이면:

  * `AdjScoreMedian` 사용
* `|R| < 4`이면:

  * baseline_bucket을 `11-15`로 고정하고 confidence=low

---

### 4.14.5 SkillIndex 산출(v1 룰)

SkillIndex는 0(잘침)~30(약함) 스케일로 clamp.

#### Base (스코어 기반)

* `Base = clamp(AdjScoreMean - 72, 0, 30)`

#### Adjust (가능한 보조 데이터로 미세조정)

각 항목은 null이면 스킵.

* Putts:

  * if `PuttsPer18 >= 36` → `Base += 2`
  * if `PuttsPer18 <= 30` → `Base -= 1`

* GIR (또는 On):

  * if `GIRper18 >= 10` → `Base -= 2`
  * if `GIRper18 <= 4` → `Base += 1`

* Penalty:

  * if `PenaltyPer18 >= 2` → `Base += 2`
  * if `PenaltyPer18 == 0` → `Base -= 0.5`

최종:

* `SkillIndex = clamp(Base, 0, 30)`

---

### 4.14.6 baseline bucket 매핑

매핑 규칙:

* 0 <= SkillIndex <= 5 → `0-5`
* 6~10 → `6-10`
* 11~15 → `11-15`
* 16~20 → `16-20`
* 21~25 → `21-25`
* >= 26 → `26+`

---

### 4.14.7 Coverage/Confidence (필수)

#### Coverage metrics

* `coverage_score = scored_rounds / N`
* `coverage_putt = rounds_with_putts / scored_rounds`
* `coverage_gir = rounds_with_gir / scored_rounds`
* `coverage_pen = rounds_with_penalty / scored_rounds`
* `coverage_overall = weighted average` (가중치: score 0.5, putt 0.2, gir 0.2, pen 0.1)

#### Confidence rule

* High:

  * scored_rounds >= 8 AND coverage_overall >= 0.70 AND 18-hole share >= 0.6
* Medium:

  * scored_rounds 4-7 OR coverage_overall 0.40-0.69
* Low:

  * 그 외

UI 표기:

* `Baseline: 11-15 (Confidence: Medium)`
* "핸디"라는 단어 사용 금지(Phase 4)

---

## 4.15 Implementation Checklist (Seed + SkillIndex)

* [ ] `expected_strokes` 생성/seed SQL 실행
* [ ] baseline bucket 선택 로직 연결(라운드 handicap 있으면 우선)
* [ ] 라운드 저장/수정 시 `skill_index_snapshots` 갱신(배치 또는 on-write)
* [ ] analysis API에서 baseline_bucket/confidence/coverage 반환
* [ ] eSG 계산에 expected_strokes를 실제로 사용 (키 miss 시 guard)

---

## 4.16 Round Metrics Precompute (권장)

### 4.16.1 목적

* Analysis/Scorecard 화면에서 매번 JSONB를 풀어서 계산하면 느리고, 로직도 분산됨
* 라운드 저장 시점에 **요약 KPI + eSG + coverage + leak inputs**를 확정해두면:

  * 조회 속도 향상
  * 동일 기간 필터 조회가 쉬워짐
  * 수치 제품에 필요한 일관성 확보

---

### 4.16.2 테이블: `round_metrics`

```sql
CREATE TABLE IF NOT EXISTS round_metrics (
  round_id         UUID PRIMARY KEY REFERENCES rounds(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL,
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- snapshot of baseline used for this computation
  baseline_bucket  TEXT NOT NULL,
  baseline_confidence TEXT NOT NULL, -- high/medium/low
  baseline_source  TEXT NOT NULL,    -- 'round_handicap' | 'skill_index' | 'default'

  -- core scorecard metrics
  holes_played     INT NOT NULL,      -- 9 or 18
  score_total      INT NOT NULL,
  score_per18      FLOAT NOT NULL,    -- score_total * (18/holes_played)

  putts_total      INT NULL,
  putts_per18      FLOAT NULL,

  gir_count        INT NULL,
  gir_den          INT NULL,          -- holes with enough info
  gir_rate         FLOAT NULL,        -- gir_count / gir_den

  -- tee/penalty / trouble
  tee_penalty_count INT NULL,         -- OB/HZ/PEN inferred from tee landing
  tee_trouble_count INT NULL,         -- trouble/blocked
  tee_den          INT NULL,          -- holes with tee recorded

  -- around/approach / arg
  app_shots        INT NULL,
  arg_shots        INT NULL,
  around_den       INT NULL,          -- shots with leaveDistBucket present
  leave_on_count   INT NULL,
  leave_0_2_count  INT NULL,
  leave_2_5_count  INT NULL,
  leave_5p_count   INT NULL,
  leave_pen_count  INT NULL,

  -- putting buckets
  putt_den         INT NULL,          -- putt cards with distBucket present
  putt_0_1_count   INT NULL,
  putt_1_2_count   INT NULL,
  putt_2_5_count   INT NULL,
  putt_5_8_count   INT NULL,
  putt_8p_count    INT NULL,

  -- eSG outputs (estimated)
  esg_putt         FLOAT NULL,
  esg_around       FLOAT NULL,
  esg_tee          FLOAT NULL,
  esg_total        FLOAT NULL,

  -- coverage + confidence for the whole round metrics
  coverage_score   FLOAT NOT NULL,    -- always 1 for a recorded round
  coverage_putt    FLOAT NOT NULL,
  coverage_around  FLOAT NOT NULL,
  coverage_tee     FLOAT NOT NULL,
  coverage_overall FLOAT NOT NULL,

  confidence_putt  TEXT NOT NULL,     -- high/medium/low
  confidence_around TEXT NOT NULL,
  confidence_tee   TEXT NOT NULL,

  debug_json       JSONB NULL
);

ALTER TABLE round_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own metrics" ON round_metrics FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_round_metrics_user_time
ON round_metrics (user_id, computed_at DESC);
```

**결론/이유(간략)**
조회 시점 계산을 줄이고, 숫자 일관성을 확보하기 위해 라운드별 지표를 스냅샷으로 저장.

---

### 4.16.3 계산 파이프라인 (On-write)

라운드 입력/수정 시, 아래 순서로 처리:

#### Step 1) Baseline bucket 결정

우선순위:

1. `round.handicap` 존재 → `baseline_source='round_handicap'`
2. 최신 `skill_index_snapshots` 존재 → `baseline_source='skill_index'`
3. default `11-15` → `baseline_source='default'` + confidence low

저장:

* `baseline_bucket`
* `baseline_confidence`
* `baseline_source`

#### Step 2) Round Score metrics

* `holes_played`
* `score_total`
* `score_per18 = score_total * (18/holes_played)`

#### Step 3) Putting metrics + eSG_putt

* `putts_total`

  * 우선순위: putt_cards count 합산(coverage 높은 경우) vs hole score 기반
* `putt_den = #putt_cards with distBucket != null`
* distBucket 카운트 누적
* `esg_putt = Σ(E_putt(distBucket)) - actual_putts`

  * `E_putt`는 `expected_strokes`의 `PUTT` domain에서 조회
  * baseline_bucket별로 다른 값 사용

#### Step 4) Around metrics + eSG_around

* 대상: `stg_shots` 중 intent=approach/arg (또는 전체에서 leaveDistBucket 있는 것)
* `around_den = #shots with leaveDistBucket != null`
* leaveDistBucket 카운트 누적 (ON/0-2/2-5/5+/PEN)
* v1 eSG_around 계산(단순화, 누락에 강한 방식):

  * 권장 v1:

    * "상태별 기대 타수 총합"을 직접 누수로 사용:

      * `around_cost = Σ( E_around_key )`
      * 이 값 자체를 leak ranking에 사용
    * eSG는 라운드 비교용으로만 제공:

      * `esg_around = (expected_baseline_around_cost_for_round) - around_cost`
      * expected_baseline_around_cost_for_round는 **샷 수 기반**으로 추정:

        * `N = around_den`
        * `expected_baseline_around_cost_for_round = N * E_around_baseline_avg`
        * `E_around_baseline_avg`는 baseline_bucket별 상수(초기값)로 둠
  * (대안) v1에서 eSG_around를 0으로 두고 "strokes lost" 형태로만 표기해도 됨

> NOTE (중요):
> v1은 "정통 SG"가 아니라 eSG이며, **around는 샷별 before/after가 없어서 putt만큼 정밀하지 않음**
> 따라서 confidence/coverage와 함께만 노출

#### Step 5) Tee metrics + eSG_tee (penalty 중심)

* tee_routine.landing 기반:

  * OB/HZ → `tee_penalty_count++`
  * Trouble(나무/막힘) → `tee_trouble_count++`
* `tee_den = #holes with tee_routine present`
* `esg_tee = - (tee_penalty_count * W_penalty + tee_trouble_count * W_trouble)`

  * v1 weights 예:

    * `W_penalty = 1.5`
    * `W_trouble = 0.5`
  * (이 값은 eSG라기보다 loss proxy이므로 UI에서 "Estimated" 강제)

#### Step 6) Total

* `esg_total = esg_putt + esg_around + esg_tee` (null-safe)

---

### 4.16.4 Coverage & Confidence 규칙 (round_metrics 수준)

#### Coverage

* `coverage_putt = putt_den / max(putts_total, 1)` (or per-hole 방식)
* `coverage_around = around_den / max(app_shots + arg_shots, 1)` (샷수 기반)
* `coverage_tee = tee_den / holes_played`
* `coverage_overall = 0.5*coverage_score + 0.2*coverage_putt + 0.2*coverage_around + 0.1*coverage_tee`

  * score는 항상 1로 둠

#### Confidence (카테고리별)

* Putting:

  * High: `putt_den >= 20` and `coverage_putt >= 0.7`
  * Medium: `putt_den >= 10` or `coverage_putt >= 0.4`
  * Low: else
* Around:

  * High: `around_den >= 12` and `coverage_around >= 0.7`
  * Medium: `around_den >= 6` or `coverage_around >= 0.4`
  * Low: else
* Tee:

  * High: `tee_den >= holes_played * 0.8`
  * Medium: `tee_den >= holes_played * 0.5`
  * Low: else

---

### 4.16.5 Recompute Triggers (필수)

라운드 데이터 변경 시 아래 조건이면 `round_metrics` 재계산:

* [ ] 라운드 기본값 변경: date/course/tee/holes/score
* [ ] putt_cards 변경
* [ ] stg_shots 변경(특히 leaveDistBucket)
* [ ] tee_routine 변경
* [ ] baseline_bucket 변경(핸디 입력 추가/변경 or skill_index snapshot 갱신 정책)

권장 정책:

* 라운드 수정 시 즉시 재계산
* skill_index는 전체 라운드에 영향을 주지만, baseline은 "스냅샷"이므로

  * 과거 라운드의 round_metrics baseline은 고정 (스냅샷 유지)
  * 단, 사용자 요청 시 "recompute with latest baseline" 옵션 제공 가능(v2)

---

## 4.17 Biggest Leak Ranking (round_metrics 기반)

Analysis 페이지의 leak은 **round_metrics에서 계산** (조회가 빠르고 일관됨)

v1 ranking 후보:

1. `tee_penalty_count` 기반 loss
2. `putt:8m+` 비중 + 3putt 관련(가능하면)
3. `leave:5m+` 및 `leave:PEN` 비중
4. `putt:1-2m` missed 비율 (missSide 있으면 더 정확)

출력 형식(강제):

* leak_name
* estimated_strokes_lost_per_round
* sample_size
* coverage
* confidence
* action_1

---

## 4.18 Sub-phase 실행 계획 (확정)

### Phase 4A — Data Plumbing + Casual 입력 확장

**Goal:** 수치 기반 분석이 돌아가도록 데이터 파이프라인/스키마를 먼저 완성한다.

**Scope:**

* Casual 입력 UI 확장
  * `StgShot.leaveDistBucket` 추가 (ON / 0-2m / 2-5m / 5m+ / PEN)
  * `PuttCard.distBucket` 추가 (0-1m / 1-2m / 2-5m / 5-8m / 8m+)
* 자동 매핑
  * ARG Close/Mid/Long → leaveDistBucket 자동 세팅
  * putt dist → distBucket 자동 세팅 (있을 때)
* Tables
  * `expected_strokes` 생성 + seed insert
  * `skill_index_snapshots` 생성 + SkillIndex v1 계산 (룰 기반)
* Backfill v0 (optional but recommended)
  * 기존 putt dist → distBucket
  * 기존 ARG result → leaveDistBucket

**Done Criteria:**

* [ ] Casual 모드 라운드 입력 시 leaveDistBucket/distBucket 저장됨
* [ ] expected_strokes seed 조회 가능
* [ ] 유저별 skill_index_snapshots 1개 이상 생성됨
* [ ] Missing data는 0이 아닌 null/N/A로 유지되며 API에서 분모/coverage 제공

---

### Phase 4B — Scorecard (Card 탭) MVP

**Goal:** 라운드 로그(기간 필터 + 리스트 + 홀 테이블)를 신뢰 가능하게 제공한다.

**Scope:**

* 탭 매핑: **Card 탭 = Scorecard** (`/card`)
* 기간 필터: 연/월/커스텀 range
* 상단 요약 카드 (기간 기준)
  * Avg Score, Avg Putts, GIR(or On%) — 가능한 것만
  * 표본수(라운드/홀) + coverage 노출
* 라운드 리스트 + 펼침(홀 테이블)
  * 홀 테이블: par/score/putts/notes 중심
  * 데이터 없는 항목은 숨김 또는 N/A (0% 금지)

**Done Criteria:**

* [ ] 기간 필터 변경 시 요약/리스트가 동기화됨
* [ ] 미기록 데이터가 0으로 표시되지 않음 (N/A + 분모/coverage)
* [ ] 라운드 펼침 UI가 끊김 없이 동작

---

### Phase 4C — Analysis (Analysis 탭) MVP: Trend + Biggest Leak

**Goal:** 명랑/대강 유저에게 "가장 큰 누수(원인)"를 숫자로 보여주고, 행동 1개를 제시한다.

**Scope:**

* 탭 매핑: **Analysis 탭 = Analysis** (`/analysis`)
* 차트 라이브러리: **recharts**
* 고정 구성 (커스터마이즈 없음)
  * Trend 2개: Score trend / Putts per round trend
  * Biggest Leak 카드 (필수): Leak 1위 + (옵션) 2위
    * estimated strokes lost / round
    * sample size + coverage + confidence (H/M/L)
    * recommended action 1개 (룰 기반)
* `round_metrics` 도입 (프리컴퓨트)
  * 계산 타이밍: **on-demand + stale check**
    * round_metrics가 없거나 `computed_at < rounds.updated_at`이면 재계산 후 upsert
    * `rounds.updated_at` 보장 (holes upsert 시 rounds.updated_at 터치)
* eSG/loss 계산 v1 확정
  * Putting: `eSG_putt = expected_putts - actual_putts`
  * Tee: penalty/trouble 기반 loss (estimated)
  * Around: eSG로 과포장 금지, v1은 `around_cost = Σ E_around(leaveDistBucket)`를 loss로 사용
* Leak ranking v1 (stable, 설명 가능한 룰)
  * Tee penalty loss
  * Putting loss (특히 8m+ / 1-2m 구간)
  * Around cost (5m+ / PEN 비율)

**Done Criteria:**

* [ ] Analysis 진입 시 화면이 비지 않음 (데이터 부족 시 가이드 출력)
* [ ] Leak 수치가 단독으로 표시되지 않음 (표본/coverage/confidence 필수)
* [ ] round_metrics가 stale check로 자동 갱신됨
* [ ] 사용자 baseline bucket이 자동 선택되어 노출됨 ("Baseline: 11-15" 등, 핸디 용어 금지)

---

### Phase 4D — Widgets 추천 + Pin (Optional, MVP 제외 가능)

**Goal:** Power user를 위한 대시보드 커스터마이즈.

**Scope:**

* 위젯 목록 정의
* 추천 로직 (coverage/confidence 기반) 정의
* pin 저장 (`user_dashboard_widgets`) 및 UI 구현

**Decision:** Phase 4 MVP에서는 제외 가능 (우선순위 최하)

---

## 4.19 Global Rules (Phase 4 전체 공통)

* Missing data는 0이 아니라 **N/A**로 표시
* 모든 비율/평균은 **numerator/denominator + coverage**를 동반
* "SG"라는 단어는 v1에서 직접 사용하지 않고 **eSG(Estimated)**로만 표기
* baseline은 공인 HI가 아니라 내부 **SkillIndex 기반 Baseline bucket**으로 표기
