-- Phase 4A: eSG Data Tables
-- Note: leaveDistBucket / distBucket are JSONB fields in stg_shots / putt_cards
-- No column-level migration needed — app handles nullable JSON keys.

-- ─── expected_strokes ────────────────────────────────────────────────────────
-- Baseline lookup table for eSG calculation (seeded with v1 bootstrap values)
CREATE TABLE IF NOT EXISTS expected_strokes (
  baseline_bucket TEXT NOT NULL,  -- '0-5' | '6-10' | '11-15' | '16-20' | '21-25' | '26+'
  domain          TEXT NOT NULL,  -- 'PUTT' | 'AROUND'
  key             TEXT NOT NULL,  -- 'putt:0-1m' | 'leave:ON' etc.
  expected        FLOAT NOT NULL,
  PRIMARY KEY (baseline_bucket, domain, key)
);

-- No RLS needed — read-only reference data (no user_id)
-- Analytics queries join against this table directly.

-- ─── skill_index_snapshots ───────────────────────────────────────────────────
-- Per-user baseline bucket snapshots (auto-computed, not hand-entered handicap)
CREATE TABLE IF NOT EXISTS skill_index_snapshots (
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  n_rounds         INT NOT NULL,
  holes_equiv      INT NOT NULL,           -- total 18-hole equivalent holes used
  adj_score_mean   FLOAT NOT NULL,         -- robust aggregation result
  putts_per18      FLOAT NULL,
  gir_per18        FLOAT NULL,
  penalty_per18    FLOAT NULL,
  skill_index      FLOAT NOT NULL,         -- 0–30 scale
  baseline_bucket  TEXT NOT NULL,          -- '0-5' | '6-10' | ... | '26+'
  coverage_overall FLOAT NOT NULL,
  confidence       TEXT NOT NULL,          -- 'high' | 'medium' | 'low'
  debug_json       JSONB NULL,
  PRIMARY KEY (user_id, computed_at)
);

ALTER TABLE skill_index_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own skill snapshots"
  ON skill_index_snapshots FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_skill_index_user_time
  ON skill_index_snapshots (user_id, computed_at DESC);

-- ─── Seed: expected_strokes v1 bootstrap ─────────────────────────────────────

-- PUTT domain
INSERT INTO expected_strokes (baseline_bucket, domain, key, expected) VALUES
('0-5',   'PUTT', 'putt:0-1m', 1.04),
('0-5',   'PUTT', 'putt:1-2m', 1.15),
('0-5',   'PUTT', 'putt:2-5m', 1.45),
('0-5',   'PUTT', 'putt:5-8m', 1.75),
('0-5',   'PUTT', 'putt:8m+',  2.00),

('6-10',  'PUTT', 'putt:0-1m', 1.06),
('6-10',  'PUTT', 'putt:1-2m', 1.20),
('6-10',  'PUTT', 'putt:2-5m', 1.52),
('6-10',  'PUTT', 'putt:5-8m', 1.83),
('6-10',  'PUTT', 'putt:8m+',  2.06),

('11-15', 'PUTT', 'putt:0-1m', 1.08),
('11-15', 'PUTT', 'putt:1-2m', 1.25),
('11-15', 'PUTT', 'putt:2-5m', 1.60),
('11-15', 'PUTT', 'putt:5-8m', 1.92),
('11-15', 'PUTT', 'putt:8m+',  2.12),

('16-20', 'PUTT', 'putt:0-1m', 1.10),
('16-20', 'PUTT', 'putt:1-2m', 1.32),
('16-20', 'PUTT', 'putt:2-5m', 1.70),
('16-20', 'PUTT', 'putt:5-8m', 2.02),
('16-20', 'PUTT', 'putt:8m+',  2.18),

('21-25', 'PUTT', 'putt:0-1m', 1.12),
('21-25', 'PUTT', 'putt:1-2m', 1.40),
('21-25', 'PUTT', 'putt:2-5m', 1.82),
('21-25', 'PUTT', 'putt:5-8m', 2.12),
('21-25', 'PUTT', 'putt:8m+',  2.25),

('26+',   'PUTT', 'putt:0-1m', 1.14),
('26+',   'PUTT', 'putt:1-2m', 1.48),
('26+',   'PUTT', 'putt:2-5m', 1.95),
('26+',   'PUTT', 'putt:5-8m', 2.22),
('26+',   'PUTT', 'putt:8m+',  2.35)

ON CONFLICT (baseline_bucket, domain, key) DO UPDATE
  SET expected = EXCLUDED.expected;

-- AROUND domain
INSERT INTO expected_strokes (baseline_bucket, domain, key, expected) VALUES
('0-5',   'AROUND', 'leave:ON',   1.80),
('0-5',   'AROUND', 'leave:0-2m', 2.10),
('0-5',   'AROUND', 'leave:2-5m', 2.30),
('0-5',   'AROUND', 'leave:5m+',  2.60),
('0-5',   'AROUND', 'leave:PEN',  3.30),

('6-10',  'AROUND', 'leave:ON',   1.85),
('6-10',  'AROUND', 'leave:0-2m', 2.20),
('6-10',  'AROUND', 'leave:2-5m', 2.45),
('6-10',  'AROUND', 'leave:5m+',  2.75),
('6-10',  'AROUND', 'leave:PEN',  3.45),

('11-15', 'AROUND', 'leave:ON',   1.90),
('11-15', 'AROUND', 'leave:0-2m', 2.32),
('11-15', 'AROUND', 'leave:2-5m', 2.62),
('11-15', 'AROUND', 'leave:5m+',  2.95),
('11-15', 'AROUND', 'leave:PEN',  3.60),

('16-20', 'AROUND', 'leave:ON',   1.95),
('16-20', 'AROUND', 'leave:0-2m', 2.45),
('16-20', 'AROUND', 'leave:2-5m', 2.80),
('16-20', 'AROUND', 'leave:5m+',  3.15),
('16-20', 'AROUND', 'leave:PEN',  3.80),

('21-25', 'AROUND', 'leave:ON',   2.00),
('21-25', 'AROUND', 'leave:0-2m', 2.60),
('21-25', 'AROUND', 'leave:2-5m', 3.00),
('21-25', 'AROUND', 'leave:5m+',  3.35),
('21-25', 'AROUND', 'leave:PEN',  4.05),

('26+',   'AROUND', 'leave:ON',   2.05),
('26+',   'AROUND', 'leave:0-2m', 2.75),
('26+',   'AROUND', 'leave:2-5m', 3.20),
('26+',   'AROUND', 'leave:5m+',  3.55),
('26+',   'AROUND', 'leave:PEN',  4.30)

ON CONFLICT (baseline_bucket, domain, key) DO UPDATE
  SET expected = EXCLUDED.expected;
