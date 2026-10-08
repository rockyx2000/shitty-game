CREATE TABLE scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_sub TEXT NOT NULL,
  display_name TEXT NOT NULL,
  ms INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_scores_user_ms ON scores (user_sub, ms);
CREATE INDEX idx_scores_ms ON scores (ms);
