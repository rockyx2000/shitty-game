-- 履歴テーブルをやめ、ユーザーごとのベストだけを保持する(ランキング取得を LIMIT 付きインデックススキャンにするため)
CREATE TABLE bests (
  user_sub TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  ms INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_bests_ms ON bests (ms);

INSERT INTO bests (user_sub, display_name, ms, updated_at)
  SELECT user_sub, display_name, MIN(ms), MAX(created_at) FROM scores GROUP BY user_sub;

DROP TABLE scores;
