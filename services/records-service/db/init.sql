CREATE TABLE records (
    id SERIAL PRIMARY KEY,

    user1_id INTEGER NOT NULL,
    user2_id INTEGER NOT NULL,

    user1_username VARCHAR(50) NOT NULL,
    user2_username VARCHAR(50) NOT NULL,

    question_text TEXT NOT NULL,
    submitted_code TEXT NOT NULL,
    suggested_solution TEXT NOT NULL,

    programming_language VARCHAR(50),
    question_topic VARCHAR(50),
    difficulty VARCHAR(50),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);