-- 1. Create the master Questions table (Updated)
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(50) NOT NULL,
    topic_tags TEXT[], 
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create the Language Templates table (New)
CREATE TABLE question_templates (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    language VARCHAR(50) NOT NULL, -- 'python', 'cpp', 'java'
    starter_code TEXT,             -- The code the user sees first
    solution_code TEXT,            -- The reference solution
    UNIQUE(question_id, language)  -- Prevents duplicate Python entries for one question
);