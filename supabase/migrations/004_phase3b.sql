-- Phase 3b: Mode system

-- Input mode per round
ALTER TABLE rounds ADD COLUMN input_mode text DEFAULT 'serious'
  CHECK (input_mode IN ('fun', 'casual', 'serious'));

-- User settings (default mode, etc.)
CREATE TABLE user_settings (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_mode text DEFAULT 'serious'
    CHECK (default_mode IN ('fun', 'casual', 'serious')),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own settings" ON user_settings FOR ALL USING (auth.uid() = user_id);
