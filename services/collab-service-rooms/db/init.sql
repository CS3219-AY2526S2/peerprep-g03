-- all tables join on room_id 

-- 1. Room level
-- room_id does not repeat
CREATE TABLE sessions ( 
  room_id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL UNIQUE,
  -- can be null for private rooms, but for now we can just generate a match_id for every room session
  -- unique even for same partners, so that we can track multiple sessions between same partners
  question_id TEXT NOT NULL,

  status TEXT NOT NULL CHECK (status IN ('active', 'closed')),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 2. User level in a room
CREATE TABLE session_users (
  id SERIAL PRIMARY KEY, -- for ORM, else Primary Key is (room_id, user_id)

  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,

  user_status TEXT NOT NULL DEFAULT 'active'
    CHECK (user_status IN ('active', 'submitted', 'left', 'disconnected')),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (room_id, user_id),

  FOREIGN KEY (room_id)
    REFERENCES sessions(room_id)
    ON DELETE CASCADE
);


-- 3. Submissions level
CREATE TABLE submissions (
  room_id TEXT PRIMARY KEY,
  submitted_by_user_id TEXT NOT NULL,
  code TEXT NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (room_id)
    REFERENCES sessions(room_id)
    ON DELETE CASCADE,

  FOREIGN KEY (room_id, submitted_by_user_id)
    REFERENCES session_users(room_id, user_id)
    ON DELETE CASCADE
);
