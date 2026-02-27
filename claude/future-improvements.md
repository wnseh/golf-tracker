# Future Improvements

이 파일에는 Phase 4 MVP 범위에서 제외되었으나 향후 구현 예정인 기능들이 정리되어 있습니다.

---

## Phase 4D — Widgets 추천 + Pin

**Goal:** Power user를 위한 대시보드 커스터마이즈.

**Phase 4 MVP에서 제외** — 우선순위 최하, Analysis MVP(4C) 완성 후 고려.

### Scope

* **위젯 목록 정의**
  * Score trend (extended range)
  * 3-putt rate widget
  * GIR/On% trend
  * FW hit rate (from tee_routine)
  * ARG conversion rate (leaveDistBucket 기반)
  * Shortgame proximity distribution

* **추천 로직 (coverage/confidence 기반) 정의**
  * 위젯 라이브러리에서 사용자가 직접 고르는 방식 X
  * 시스템이 데이터 가용성/신뢰도 기반으로 추천 → 사용자가 pin
    * 예: 3-putt 데이터 충분 → "3-putt 위젯 추천"
    * 데이터 부족 → 추천 노출 안 함

* **Pin 저장** (`user_dashboard_widgets` 테이블 신규)
  * `user_id`, `widget_id`, `position`, `created_at`
  * RLS 적용

* **UI 구현**
  * Analysis 페이지 하단에 "Recommended for you" 섹션
  * Pin/unpin 토글
  * 핀된 위젯은 Biggest Leak 카드 아래 표시

### DB Schema (예정)

```sql
CREATE TABLE IF NOT EXISTS user_dashboard_widgets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  widget_id   TEXT NOT NULL,     -- e.g. 'three-putt-rate', 'fw-hit', etc.
  position    INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_dashboard_widgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own widgets"
  ON user_dashboard_widgets FOR ALL
  USING (auth.uid() = user_id);
```

### Prerequisites

* Phase 4C Analysis MVP 완성
* round_metrics 테이블에 추가 필드 필요 시 마이그레이션 (006 이후)
* recharts 위젯 컴포넌트 라이브러리화 (analysis-client의 차트를 재사용 가능하게)

---

## Other Future Enhancements

### eSG v1.1 — lieSimple 반영

* AROUND expected_strokes key에 `|lieSimple` 추가:
  * `leave:0-2m|clean`, `leave:0-2m|rough`, `leave:0-2m|sand`, `leave:0-2m|bad`
* 현재 v1: lieSimple 미반영 (key는 `leave:0-2m` 형태)
* 정확도 vs 테이블 크기 trade-off — PM 합의 후 구현

### Tee Distance eSG (v2)

* tee_routine에 `teeCarryBucket: short|ok|long` 추가
* 또는 다음 샷 distBucket으로 간접 추정
* 현재 v1: penalty 기반 loss만 계산

### round_metrics Recompute UI

* 사용자 요청 시 "recompute with latest baseline" 버튼
* 과거 라운드의 round_metrics baseline 재계산 (현재는 스냅샷 고정)

### Calibration (v1.1)

* expected_strokes seed 값을 앱 데이터로 보정
* baseline_bucket별 최소 N >= 200 달성 시 EMA 적용
* PUTT: distBucket별 실제 평균 퍼트수 관측 → seed 수렴
* AROUND: leaveDistBucket별 실제 홀아웃까지 타수 관측 → seed 보정
