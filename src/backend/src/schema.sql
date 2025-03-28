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

CREATE TABLE IF NOT EXISTS refresh_tokens (
  user_id INTEGER NOT NULL,
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


-- Create a table for friend requests
CREATE TABLE IF NOT EXISTS friend_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL,
  recipient_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users (id) ON DELETE CASCADE,
  -- Ensure a user can't send multiple requests to the same recipient
  UNIQUE(sender_id, recipient_id)
);

-- Create an index for faster lookups by recipient
CREATE INDEX IF NOT EXISTS friend_requests_recipient_idx ON friend_requests (recipient_id, status);

-- Create a view for pending friend requests with user info
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


CREATE TABLE IF NOT EXISTS friendships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  friend_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (friend_id) REFERENCES users (id) ON DELETE CASCADE,
  UNIQUE(user_id, friend_id)
);