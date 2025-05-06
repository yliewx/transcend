PRAGMA foreign_keys = ON;

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
  otp_contact TEXT DEFAULT NULL,
  google_id TEXT UNIQUE DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  user_id INTEGER PRIMARY KEY,
  token_id TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT (datetime('now')) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id INTEGER PRIMARY KEY,
  display_name TEXT,
  avatar_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS match_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_date TEXT NOT NULL,
  player1_id INTEGER,
  player2_id INTEGER,
  winner_id INTEGER NULL,
  tournament_id INTEGER NOT NULL DEFAULT 0,
  left_score INTEGER NOT NULL DEFAULT 0,
  right_score INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player1_id) REFERENCES users (id) ON DELETE SET NULL,
  FOREIGN KEY (player2_id) REFERENCES users (id) ON DELETE SET NULL,
  FOREIGN KEY (winner_id) REFERENCES users (id) ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS friend_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL,
  recipient_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users (id) ON DELETE CASCADE,
  UNIQUE(sender_id, recipient_id)
);

CREATE INDEX IF NOT EXISTS friend_requests_recipient_idx ON friend_requests (recipient_id, status);

CREATE VIEW IF NOT EXISTS pending_incoming_requests_view AS
SELECT 
  fr.id,
  fr.sender_id,
  fr.recipient_id,
  u_sender.username AS sender_username,
  p_sender.display_name AS sender_display_name,
  fr.created_at,
  fr.status
FROM 
  friend_requests fr
JOIN 
  users u_sender ON fr.sender_id = u_sender.id
LEFT JOIN 
  profiles p_sender ON fr.sender_id = p_sender.user_id
WHERE 
  fr.status = 'pending';

CREATE VIEW IF NOT EXISTS pending_outgoing_requests_view AS
SELECT 
  fr.id,
  fr.sender_id,
  fr.recipient_id,
  u_recipient.username AS recipient_username,
  p_recipient.display_name AS recipient_display_name,
  fr.created_at,
  fr.status
FROM 
  friend_requests fr
JOIN 
  users u_recipient ON fr.recipient_id = u_recipient.id
LEFT JOIN 
  profiles p_recipient ON fr.recipient_id = p_recipient.user_id
WHERE 
  fr.status = 'pending';


CREATE TABLE IF NOT EXISTS friendships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  friend_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (friend_id) REFERENCES users (id) ON DELETE CASCADE,
  UNIQUE(user_id, friend_id)
);


CREATE TABLE IF NOT EXISTS player_stats (
  user_id INTEGER PRIMARY KEY,
  elo_rating INTEGER NOT NULL DEFAULT 1200,
  games_played INTEGER NOT NULL DEFAULT 0,
  games_won INTEGER NOT NULL DEFAULT 0,
  games_lost INTEGER NOT NULL DEFAULT 0,
  current_win_streak INTEGER NOT NULL DEFAULT 0,
  max_win_streak INTEGER NOT NULL DEFAULT 0,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE VIEW IF NOT EXISTS player_complete_stats_view AS
SELECT 
  u.id,
  u.username,
  p.display_name,
  ps.elo_rating,
  ps.games_played,
  ps.games_won,
  ps.games_lost,
  ps.current_win_streak,
  ps.max_win_streak,
  CASE 
    WHEN ps.games_played = 0 THEN 0
    ELSE ROUND((ps.games_won * 100.0) / ps.games_played, 1) 
  END AS win_percentage,
  RANK() OVER (ORDER BY ps.elo_rating DESC) as rank,
  ps.last_updated
FROM 
  player_stats ps
JOIN 
  users u ON ps.user_id = u.id
LEFT JOIN
  profiles p ON u.id = p.user_id;


CREATE TABLE IF NOT EXISTS tournaments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending', 'active', 'completed', 'cancelled')) DEFAULT 'pending',
  max_participants INTEGER NOT NULL DEFAULT 4,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tournament_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  alias TEXT NOT NULL,
  seed INTEGER,
  status TEXT CHECK(status IN ('registered', 'active', 'eliminated', 'winner')) DEFAULT 'registered',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(tournament_id, user_id)
);

CREATE TABLE IF NOT EXISTS tournament_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  round INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  player1_id INTEGER,
  player2_id INTEGER,
  winner_id INTEGER,
  game_id TEXT,
  status TEXT CHECK(status IN ('scheduled', 'in_progress', 'completed', 'cancelled')) DEFAULT 'scheduled',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (player1_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (player2_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(tournament_id, round, match_number)
);


CREATE TABLE IF NOT EXISTS elo_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  match_id INTEGER NOT NULL,
  elo_rating INTEGER NOT NULL,
  previous_rating INTEGER NOT NULL,
  rating_change INTEGER NOT NULL,
  match_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (match_id) REFERENCES match_history (id) ON DELETE CASCADE
);

CREATE VIEW IF NOT EXISTS elo_history_view AS
SELECT 
  eh.id,
  eh.user_id,
  eh.match_id,
  eh.elo_rating,
  eh.previous_rating,
  eh.rating_change,
  eh.match_date,
  mh.player1_id,
  mh.player2_id,
  CASE 
    WHEN mh.player1_id = eh.user_id THEN mh.player2_id
    ELSE mh.player1_id
  END as opponent_id,
  CASE
    WHEN mh.player1_id = eh.user_id THEN u2.username
    ELSE u1.username
  END as opponent_name,
  mh.winner_id,
  CASE 
    WHEN mh.winner_id = eh.user_id THEN 'Win'
    ELSE 'Loss'
  END as result
FROM 
  elo_history eh
JOIN 
  match_history mh ON eh.match_id = mh.id
LEFT JOIN 
  users u1 ON mh.player1_id = u1.id
LEFT JOIN 
  users u2 ON mh.player2_id = u2.id
ORDER BY 
  eh.match_date ASC;