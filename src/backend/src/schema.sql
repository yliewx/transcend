CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT (datetime('now')) NOT NULL,
  otp_verified BOOLEAN NOT NULL DEFAULT 0,
  otp_secret TEXT,
  otp_auth_url TEXT,
  otp_option TEXT CHECK(otp_option IN ('sms', 'email', 'app')) DEFAULT NULL,
  otp_contact TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id INTEGER PRIMARY KEY,
  display_name TEXT,
  avatar_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS friendships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  friend_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (friend_id) REFERENCES users (id) ON DELETE CASCADE,
  UNIQUE(user_id, friend_id)
);

-- CREATE TABLE IF NOT EXISTS match_history (
--   id INTEGER PRIMARY KEY AUTOINCREMENT,
--   match_date TEXT NOT NULL,
--   player1_id INTEGER NOT NULL,
--   player2_id INTEGER NOT NULL,
--   winner_id INTEGER NULL,
--   tournament_id INTEGER NOT NULL,
--   left_score INTEGER NOT NULL DEFAULT 0,
--   right_score INTEGER NOT NULL DEFAULT 0,
--   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--   FOREIGN KEY (player1_id) REFERENCES users (id) ON DELETE CASCADE,
--   FOREIGN KEY (player2_id) REFERENCES users (id) ON DELETE CASCADE,
--   FOREIGN KEY (winner_id) REFERENCES users (id) ON DELETE CASCADE,
--   CHECK (winner_id IS NULL OR winner_id = player1_id OR winner_id = player2_id)
-- );

CREATE TABLE IF NOT EXISTS match_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_date TEXT NOT NULL,
  player1_id INTEGER, -- Remove NOT NULL to allow guest players
  player2_id INTEGER, -- Remove NOT NULL to allow guest players
  winner_id INTEGER NULL,
  tournament_id INTEGER NOT NULL DEFAULT 0,
  left_score INTEGER NOT NULL DEFAULT 0,
  right_score INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player1_id) REFERENCES users (id) ON DELETE SET NULL,
  FOREIGN KEY (player2_id) REFERENCES users (id) ON DELETE SET NULL,
  FOREIGN KEY (winner_id) REFERENCES users (id) ON DELETE SET NULL
  -- Remove the CHECK constraint that requires winner to be one of the players
  -- since we might have null players now
);
