-- Phase 6: 최소 데이터 모델 전환 (SG 원장)
-- 모드 시스템 / eSG 체계 / 클럽 설정 제거. holes 테이블은 재생성 (기존 홀 데이터 삭제됨).

-- ─── 삭제: eSG 체계 + 설정 ───────────────────────────────────────────────────
DROP TABLE IF EXISTS round_metrics;
DROP TABLE IF EXISTS skill_index_snapshots;
DROP TABLE IF EXISTS expected_strokes;
DROP TABLE IF EXISTS user_settings;
DROP TABLE IF EXISTS user_clubs;

-- ─── holes 재생성 ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_holes_touch_round ON holes;
DROP TABLE IF EXISTS holes;

CREATE TABLE holes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id        uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hole_num        int  NOT NULL,
  par             int  NOT NULL CHECK (par IN (3, 4, 5)),
  score           int  NOT NULL,
  hole_len_bucket text NULL,        -- 'p4:350-400' 등 (constants.ts HOLE_LEN_BUCKETS)
  shots           jsonb NULL,       -- Shot[] 원장. NULL = 스코어만 입력한 홀
  notes           text,
  saved_at        timestamptz DEFAULT now(),
  UNIQUE (round_id, hole_num)
);

ALTER TABLE holes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can only access own holes"
  ON holes FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_holes_round ON holes(round_id);

-- holes 변경 시 rounds.updated_at 갱신 (006에서 만든 함수 재사용)
CREATE TRIGGER trg_holes_touch_round
  AFTER INSERT OR UPDATE ON holes
  FOR EACH ROW EXECUTE FUNCTION touch_round_updated_at();

-- ─── rounds: 모드 / 그린스피드 제거 ──────────────────────────────────────────
ALTER TABLE rounds DROP COLUMN IF EXISTS input_mode;
ALTER TABLE rounds DROP COLUMN IF EXISTS green_speed;
