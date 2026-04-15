ALTER TABLE session_users
ADD COLUMN user_status TEXT NOT NULL DEFAULT 'active'
  CHECK (user_status IN ('active', 'submitted', 'left', 'disconnected'));

UPDATE session_users
SET user_status = CASE
  WHEN has_left = TRUE THEN 'left'
  WHEN has_submitted = TRUE THEN 'submitted'
  ELSE 'active'
END;

ALTER TABLE session_users
DROP COLUMN has_submitted,
DROP COLUMN has_left;
