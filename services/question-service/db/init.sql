CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(50) CHECK (difficulty IN ('Easy', 'Intermediate', 'Hard')) NOT NULL,
    topic_tags TEXT[] NOT NULL, -- Array of tags
    templates JSONB,
    solution TEXT,
    test_cases JSONB,
    image_url TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE INDEX idx_difficulty ON questions(difficulty);
CREATE INDEX idx_topic_tags ON questions USING GIN (topic_tags);
CREATE INDEX idx_is_deleted ON questions(is_deleted);

INSERT INTO questions (title, description, difficulty, topic_tags, solution) 
VALUES 
('Two Sum', 'Given an array of integers, return indices of the two numbers such that they add up to a specific target.', 'Easy', ARRAY['Data Structures', 'Algorithms'], 'Use a hash map to store seen values.'),
('Longest Substring', 'Find the length of the longest substring without repeating characters.', 'Intermediate', ARRAY['Strings', 'Sliding Window'], 'Use two pointers to maintain a window.'),
('Median of Two Sorted Arrays', 'Find the median of the two sorted arrays.', 'Hard', ARRAY['Arrays', 'Binary Search'], 'Binary search on the smaller array.');