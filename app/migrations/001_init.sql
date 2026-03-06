CREATE TABLE sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);


CREATE TABLE users (
    id TEXT PRIMARY KEY,
    handle TEXT UNIQUE,
    created_at INTEGER NOT NULL
);

CREATE TABLE daily_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    score INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    date_utc   TEXT NOT NULL DEFAULT (date('now')),
    UNIQUE(user_id, date_utc, difficulty),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at TEXT NOT NULL
);
