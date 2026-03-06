CREATE INDEX idx_daily_date ON daily_scores(date_utc);
CREATE INDEX idx_daily_difficulty ON daily_scores(difficulty);
CREATE INDEX idx_daily_user ON daily_scores(user_id);
