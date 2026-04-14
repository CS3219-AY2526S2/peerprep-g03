CREATE TABLE records (
    id SERIAL PRIMARY KEY,

    user1_id INTEGER NOT NULL,
    user2_id INTEGER NOT NULL,

    question_text TEXT NOT NULL,
    submitted_code TEXT NOT NULL,

    is_correct BOOLEAN NOT NULL,

    programming_language VARCHAR(50),
    question_topic VARCHAR(50),
    difficulty VARCHAR(50),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);