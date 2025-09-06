PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
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
  user_id TEXT PRIMARY KEY,
  token_id TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT (datetime('now')) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY,
  display_name TEXT,
  avatar_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS match_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_date TEXT NOT NULL,
  player1_id TEXT,
  player2_id TEXT,
  winner_id TEXT NULL,
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
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
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
  user_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (friend_id) REFERENCES users (id) ON DELETE CASCADE,
  UNIQUE(user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS player_stats (
  user_id TEXT PRIMARY KEY,
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
  CASE 
    WHEN ps.games_played = 0 THEN NULL
    ELSE RANK() OVER (
      ORDER BY 
        CASE WHEN ps.games_played > 0 THEN ps.elo_rating END DESC NULLS LAST
    )
  END as rank,
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
  mode TEXT NOT NULL CHECK(mode IN ('local', 'remote')) DEFAULT 'local',
  status TEXT NOT NULL CHECK(status IN ('pending', 'active', 'completed', 'cancelled')) DEFAULT 'pending',
  max_participants INTEGER NOT NULL DEFAULT 4,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Updated tournament_participants table with host relationship
CREATE TABLE IF NOT EXISTS tournament_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  user_id TEXT,  -- Changed from INTEGER to TEXT
  alias TEXT NOT NULL,
  is_guest BOOLEAN NOT NULL DEFAULT 0,  -- Flag to identify guest/local players
  host_id INTEGER,  -- Reference to the registered player hosting this guest (if applicable)
  status TEXT CHECK(status IN ('registered', 'active', 'eliminated', 'winner')) DEFAULT 'registered',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (host_id) REFERENCES tournament_participants(id) ON DELETE CASCADE,
  UNIQUE(tournament_id, user_id) -- Will only apply when user_id is not NULL
);

-- Simplified tournament_matches table using only participant references
CREATE TABLE IF NOT EXISTS tournament_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('local', 'remote')),
  round INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  player1_participant_id INTEGER, -- Reference to tournament_participants
  player2_participant_id INTEGER, -- Reference to tournament_participants
  winner_participant_id INTEGER,  -- Reference to tournament_participants
  game_id TEXT,
  status TEXT CHECK(status IN ('scheduled', 'in_progress', 'completed', 'cancelled')) DEFAULT 'scheduled',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (player1_participant_id) REFERENCES tournament_participants(id) ON DELETE SET NULL,
  FOREIGN KEY (player2_participant_id) REFERENCES tournament_participants(id) ON DELETE SET NULL,
  FOREIGN KEY (winner_participant_id) REFERENCES tournament_participants(id) ON DELETE SET NULL,
  UNIQUE(tournament_id, round, match_number)
);

CREATE TABLE IF NOT EXISTS elo_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,  -- Changed from INTEGER to TEXT
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