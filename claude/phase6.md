# Phase 6 — 최소 데이터 재설계 (SG 원장 + Elliott 5 + Riccio)

## 배경

Phase 1~4는 "루틴 일지 + SG 근사(eSG)"를 목표로 만들어져 입력이 무거웠고, eSG는 샷 체인(치기 전/친 후 위치)이
완성되지 않아 근사에 그쳤다. `claude/`의 세 글을 기준으로 데이터 모델을 처음부터 다시 정했다.

- **Elliott (PGA)** — 기본 stat 5개: FIR, GIR, Up & Down, Putts, Penalties. 10라운드 모아 2~3개 영역에 집중.
- **Riccio's Rule** — GIR이 스코어의 가장 강한 예측 변수. `Score ≈ 95 − 2·GIR`, `Putts|GIR ≈ 37 − ⅔·GIR`, `Score ≈ 58 − 4/3·GIR + Putts`.
- **Shot Scope (SG)** — 샷 SG = E(치기 전 위치) − E(친 후 위치) − 1. 위치 = 남은 거리 + 라이. 4카테고리(Tee/Approach/Short/Putting).

**결정:** 모드 시스템 제거. 홀당 입력 = SG 원장(거리 버킷). Elliott 5와 Riccio는 원장에서 파생. SG 기준표는 투어만.

---

## 데이터 모델

### holes (007에서 재생성)
```
holes (id, round_id, user_id, hole_num, par, score,
       hole_len_bucket text null, shots jsonb null, notes, saved_at)
```
- `shots` = `Shot[]`. `Shot = { lie, dist, pen, strike?, driver? }`. lie/dist는 **친 후** 위치. `pen`은 이 샷의 1벌타.
- `strike` (2026-09-18 추가) = 컨택 `'ok' | 'miss' | null`. 퍼트(치기 전 GR)는 null. 원장 입력 시 나머지는 `ok`로 시작하고
  "미스" 토글로 바꾼다. 필드 없음 = 도입 전 데이터 = N/A. 마이그레이션 불필요(jsonb).
  파생: `stats.mishits`(미스/기록 샷), `sg.byStrike`(컨택별 SG 합). 해설 규칙에서 "미스 샷이 손실의 x%"로 타점 문제(Young)와 판단 문제(Sherman)를 가른다.
- `driver` (2026-09-25 추가) = 티샷 클럽 `true`(드라이버) | `false`(끊어감: 우드·유틸·아이언) | null. 파4·5에서 티에서 친 샷에만
  (OB 다시 치기 후 두 번째 티샷 포함). 입력 시 `true`로 시작, 그 줄의 "Tee" 자리 토글로 바꾼다. 파3으로 바꾸면 필드 제거. 필드 없음 = N/A. 마이그레이션 불필요(jsonb).
  파생: `sg.byTeeClub`(드라이버/끊어감/미기록별 티샷 SG 합). 해설 규칙에서 샷당 SG로 드라이버를 잡는 게 이득인지 가른다.
- 샷 N의 친 후 = 샷 N+1의 치기 전. 샷 1의 치기 전 = 티 (홀 길이 버킷). 예외는 HZ/OB (2026-09-25 추가, `src/lib/ledger.ts`):
  | 친 후 | 자동 벌타 | 다음 샷 출발 |
  |---|---|---|
  | `HZ` + 거리 | +1 | RO, 그 거리 (드롭 지점 — 러프로 근사) |
  | `OB`, 거리 null | +1 | 이 샷의 출발 위치 그대로 (다시 치기 / stroke and distance) |
  | `OB` + 거리 | +2 | FW, 그 거리 (특설티 · 로컬룰 E-5 드롭) |
  `pen`(수동 +1)은 그 외 벌타용으로 별개. HZ/OB 줄은 토글 대신 고정 배지.
- 마지막 항목이 `HOLED`이고 그 앞이 전부 거리를 가지면(OB 다시 치기는 예외) "완성". 완성된 홀만 stat/SG에 집계.
- `shots = null` → "스코어만 입력" 홀. 스코어 트렌드에는 포함, 나머지 stat은 N/A.
- 스코어 = shots.length + Σ벌타 (수동 pen + HZ/OB 자동, 원장 완성 시 파생).

### 버킷 (m)
| 라이 | 남은 거리 버킷 | SG 중간값 |
|---|---|---|
| FW / RO / SA / TR | 0-20 / 20-50 / 50-100 / 100-150 / 150-200 / 200+ | 10 / 35 / 75 / 125 / 175 / 230 |
| GR | 0-1 / 1-2 / 2-5 / 5-10 / 10+ | 0.5 / 1.5 / 3.5 / 7.5 / 13 |

| 파 | 홀 길이 버킷 | 중간값 |
|---|---|---|
| 3 | <120 / 120-150 / 150-180 / 180+ | 105 / 135 / 165 / 195 |
| 4 | <300 / 300-350 / 350-400 / 400+ | 280 / 325 / 375 / 420 |
| 5 | <450 / 450-500 / 500+ | 430 / 475 / 520 |

### rounds
`input_mode`, `green_speed` 삭제. 나머지 유지.

### 삭제된 테이블
`round_metrics`, `skill_index_snapshots`, `expected_strokes`, `user_settings`, `user_clubs`

---

## 파생 계산 (`src/lib/stats.ts`)

홀 (원장 완성 시):
- `fir` = 파≥4 ? 샷1 친 후 라이 == FW : null
- `gir` = 친 후 라이가 GR 또는 HOLED인 샷 중, 그 샷까지의 타수(벌타 포함)가 파−2 이하인 샷이 있음
- `putts` = 치기 전 라이가 GR인 샷 수
- `penalties` = Σ벌타 (수동 pen + HZ/OB 자동)
- `scramble` (Up & Down) = GIR 미스 홀에서 score ≤ par

라운드/기간: 분모(den)와 원장 coverage를 항상 동반. 18홀 환산은 ×18/완성홀수.
Riccio는 합산 GIR·퍼트를 18홀 환산한 뒤 공식 적용.

## SG (`src/lib/sg.ts`)

- 기준표: Broadie 2011 논문 Table 9 (TEE/FW/RO/SA/Recovery, yards) + 퍼팅 논문 Figure 1 (GR, feet).
  코드에 TS 상수로 내장, 조회 시 m 변환 + 선형 보간 + 범위 밖 클램프.
- 카테고리 (치기 전 위치): tee = 파4/5 샷1, approach = 그린 밖 >50m (파3 샷1 포함), short = 그린 밖 ≤50m, putt = 그린.
- 홀 길이 버킷 없으면 샷1만 건너뜀 (skipped 카운트).
- 검증: Shot Scope 글 예시 홀(파4 426yd 5타) 글 −0.92 / 우리 −0.99 (버킷 오차). 기준표 스팟체크 3개 일치.

---

## 화면

- **입력** (`round/[id]/hole-input.tsx`): 파 → 홀 길이 칩 → 샷 원장(`shot-ledger.tsx`: 라이 칩 → 거리 칩 → 행 확정, 행별 +1 벌타) → 노트 → 저장.
  스코어/FIR/GIR/퍼트/벌타 실시간 파생 표시. "스코어만 입력" 토글은 블로업 홀용 탈출구.
  미저장 홀은 네비에 노란 링. 원장 미완성 상태로 저장 시도 시 토스트로 차단.
- **Card**: Elliott 타일 6개 + 라운드 리스트 + 홀 테이블(H#/Par/Score/FIR/GIR/Putt/Pen/SG).
- **Analysis**: 기간 필터 → Elliott 타일 → Round vs 기간(라운드 선택, stat별 나란히 + Δ) → Riccio 카드(기대 vs 실제, 해석 문구) → Trend(스코어 실선 + Riccio 점선, 퍼트) → SG vs Tour 막대 → Biggest Leak 2개.
- **홀 입력**: 원장 샷 줄마다 샷별 SG vs Tour(진행 중에도 계산), Shots 헤더에 홀 합계. 스코어 색은 score-input의 vsParColor로 Card와 통일.
  SG·Leak은 원장 라운드 3개부터.
  SG 카드 헤더·카테고리 셀·Leak 카드의 ⓘ → 해설 모달(`sg-insight-modal.tsx`). 문구와 상황 규칙은 `src/lib/insights.ts`
  (고정 해설 SG_GUIDE + 규칙 selectInsights; 출처 Broadie 2011/2014, Sherman Four Foundations/practical-golf, Riccio; 근거 없는 임계값은 "앱 기준").
  이를 위해 `stats.ts`에 더블보기(저장 홀 기준)·3퍼트(완성 홀 기준) 비율 추가.
- **Settings**: 계정 이메일 + Sign Out.

## 문구 규칙
- 미기록은 0이 아니라 N/A. 비율에는 분모, 평균에는 라운드 수와 "18홀 환산" 표기.
- SG는 항상 "vs Tour" 동반. 기대치는 "Riccio" 출처 표기. "eSG", "Baseline", "핸디" 표기 폐기.
