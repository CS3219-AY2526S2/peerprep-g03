CREATE TABLE records (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    collaborators TEXT[] NOT NULL,
    submitted_code TEXT NOT NULL,
    result JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);