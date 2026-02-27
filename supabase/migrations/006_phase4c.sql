-- Phase 4C: round_metrics precompute + rounds.updated_at

-- ─── Add updated_at to rounds ────────────────────────────────────────────────

ALTER TABLE rounds ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Backfill existing rows
UPDATE rounds SET updated_at = created_at WHERE updated_at IS NULL;

-- Set default for future rows
ALTER TABLE rounds ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE rounds ALTER COLUMN updated_at SET NOT NULL;

-- Trigger: keep updated_at current on any UPDATE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rounds_updated_at ON rounds;
CREATE TRIGGER trg_rounds_updated_at
  BEFORE INSERT OR UPDATE ON rounds
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Also touch rounds.updated_at when holes are upserted (stale check support)
-- This requires a trigger on holes that touches the parent round.
CREATE OR REPLACE FUNCTION touch_round_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE rounds SET updated_at = NOW() WHERE id = NEW.round_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_holes_touch_round ON holes;
CREATE TRIGGER trg_holes_touch_round
  AFTER INSERT OR UPDATE ON holes
  FOR EACH ROW EXECUTE FUNCTION touch_round_updated_at();

-- ─── round_metrics table ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS round_metrics (
  round_id            UUID PRIMARY KEY REFERENCES rounds(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL,
  computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- baseline snapshot used for this computation
  baseline_bucket     TEXT NOT NULL,          -- '0-5'|'6-10'|'11-15'|'16-20'|'21-25'|'26+'
  baseline_confidence TEXT NOT NULL,          -- 'High'|'Medium'|'Low'
  baseline_source     TEXT NOT NULL,          -- 'round_handicap'|'skill_index'|'default'

  -- core scorecard metrics
  holes_played        INT NOT NULL,
  score_total         INT NOT NULL,
  score_per18         FLOAT NOT NULL,

  putts_total         INT NULL,
  putts_per18         FLOAT NULL,

  gir_count           INT NULL,
  gir_den             INT NULL,
  gir_rate            FLOAT NULL,

  -- tee / penalty
  tee_penalty_count   INT NULL,
  tee_trouble_count   INT NULL,
  tee_den             INT NULL,

  -- around / approach / arg
  around_den          INT NULL,               -- shots with leaveDistBucket present
  leave_on            INT NULL,
  leave_02            INT NULL,
  leave_25            INT NULL,
  leave_5p            INT NULL,
  leave_pen           INT NULL,

  -- putting buckets
  putt_den            INT NULL,               -- putt cards with distBucket present
  putt_01             INT NULL,
  putt_12             INT NULL,
  putt_25             INT NULL,
  putt_58             INT NULL,
  putt_8p             INT NULL,

  -- eSG outputs (Estimated)
  esg_putt            FLOAT NULL,
  around_cost         FLOAT NULL,
  esg_tee             FLOAT NULL,
  esg_total           FLOAT NULL,

  -- coverage + confidence
  coverage_putt       FLOAT NOT NULL DEFAULT 0,
  coverage_around     FLOAT NOT NULL DEFAULT 0,
  coverage_tee        FLOAT NOT NULL DEFAULT 0,
  coverage_overall    FLOAT NOT NULL DEFAULT 0,

  confidence_putt     TEXT NOT NULL DEFAULT 'Low',
  confidence_around   TEXT NOT NULL DEFAULT 'Low',
  confidence_tee      TEXT NOT NULL DEFAULT 'Low'
);

ALTER TABLE round_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own metrics"
  ON round_metrics FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_round_metrics_user_time
  ON round_metrics (user_id, computed_at DESC);
