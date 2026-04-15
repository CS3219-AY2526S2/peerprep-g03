-- Create a Table that is
-- ID username password email role(normally User)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT NOT NULL,
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

-- Standard User
INSERT INTO users (username, password, email, role)
VALUES (
    'alice_dev',
    '$2b$12$P3ir0eg5.FecppkHUMp6bubfbDphp.mlG4rz4IdHD6/X7efjx5JlC', -- Alice123#
    '24acdbf63bbc3d143a981ddc9827b0bf:26afc358bcba499d767ed2a57e4ea2d50ef2de930cb8cfe24390a2b6331e5c3d', -- alice.dev@example.com
    'User'
)
ON CONFLICT (username) DO NOTHING;

-- Another User
INSERT INTO users (username, password, email, role)
VALUES (
    'bob_student',
    '$2b$12$32TUOayxnkO8t2n66pueuePpWHBXfvo50ottnMjUiiFanYd7SaSnm', -- Bob3456#
    '379926340c458ac0b4300306c95bb307:e664c646d9740a45995d258fe1a0ebcd5df47683d50c8c34af20dd6489ec17ee', -- bob.student@example.com
    'User'
)
ON CONFLICT (username) DO NOTHING;

-- Admin User
INSERT INTO users (username, password, email, role)
VALUES (
    'charlie_admin',
    '$2b$12$m2wk/LuReUKNndtC8zqEce2puIDwFvMhogvR5AWoY0KP9CrwBBS8e', -- Charlie789#
    '75744ecfdbcfec3fa62cdf9ebb20504f:ce5d9b1c000a029f9c30d3e63c0c170e5037d484d210421a504dc3fb7117e2f9', -- charlie.admin@example.com
    'Admin'
)
ON CONFLICT (username) DO NOTHING;

-- Regular User
INSERT INTO users (username, password, email, role)
VALUES (
    'diana_collab',
    '$2b$12$WYTkW.qQ.itGt/zJ.EFVG.iUOBMkdnpcfDW0GYtBR5ZJIKVYF/AUG', -- Diana321#
    '233efa852332f05456e30abf9f5d6ec9:6c678bc98bbc410a941371a4f074f2a2eaaec4f75f7db034d6e60231ac34d236', -- diana.collab@example.com
    'User'
)
ON CONFLICT (username) DO NOTHING;
