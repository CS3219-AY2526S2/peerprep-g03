-- Create a Table that is
-- ID username password email accountType(normally User) role(normally User)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT NOT NULL,
    accountType VARCHAR(10) NOT NULL DEFAULT 'User',
    role VARCHAR(10) NOT NULL DEFAULT 'User',
    failed_attempts INTEGER DEFAULT 0,
    last_failed_at TIMESTAMP WITH TIME ZONE,
    locked_until TIMESTAMP WITH TIME ZONE
);

INSERT INTO users (username, password, email, role)
VALUES (
    'admin01',
    '$2a$12$.cjqGJGvZFpIhiyHocUh8.6BwCFudVALxrt8eSxQBroWzc/fh7GLy', -- Admin01#
    'e0279672d2719576edc54f1708d04193:b1f9435d817b086741f74dc078c47acfbc3a0cfc0be5d23e3dda2ff9c7cff8f5', -- admin@example.com
    'SuperAdmin'
)
ON CONFLICT (username) DO NOTHING; -- only one instance of admin01