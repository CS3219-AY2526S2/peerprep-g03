// Model tests run with a mocked pg pool.
const mockQuery = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    query: mockQuery,
  })),
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

const crypto = require('crypto');

describe('userModel', () => {
  let userModel;
  let bcrypt;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    process.env.DATABASE_URL = 'postgres://test';
    process.env.EMAIL_ENCRYPTION_KEY =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    bcrypt = require('bcrypt');
    userModel = require('../models/userModel');
  });

  test('createUser should hash password, encrypt email and insert user', async () => {
    bcrypt.hash.mockResolvedValue('hashed-password');
    mockQuery.mockResolvedValue({
      rows: [{ id: 1, username: 'j123456', role: 'User' }],
    });

    const result = await userModel.createUser(
      'j123456',
      'jJ123456.',
      'j123456@j.com',
      'User'
    );

    expect(bcrypt.hash).toHaveBeenCalledWith('jJ123456.', 12);
    expect(mockQuery).toHaveBeenCalledWith(
      'INSERT INTO users(username, password, email, role) VALUES($1, $2, $3, $4) RETURNING *',
      ['j123456', 'hashed-password', expect.any(String), 'User']
    );
    expect(result).toEqual({ id: 1, username: 'j123456', role: 'User' });
  });

  test('getUserByUsername should return first matching row', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ id: 1, username: 'j123456' }],
    });

    const result = await userModel.getUserByUsername('j123456');

    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT * FROM users WHERE LOWER(username) = LOWER($1)',
      ['j123456']
    );
    expect(result).toEqual({ id: 1, username: 'j123456' });
  });

  test('getUserById should return first row', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ id: 1, username: 'j123456' }],
    });

    const result = await userModel.getUserById(1);

    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT * FROM users WHERE id = $1',
      [1]
    );
    expect(result).toEqual({ id: 1, username: 'j123456' });
  });

  test('getAllUsers should return rows', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ id: 1, username: 'j123456', role: 'User' }],
    });

    const result = await userModel.getAllUsers();

    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT id, username, role FROM users ORDER BY id ASC'
    );
    expect(result).toEqual([{ id: 1, username: 'j123456', role: 'User' }]);
  });

  test('updateUserRole should return updated row', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ id: 1, username: 'j123456', role: 'Admin' }],
    });

    const result = await userModel.updateUserRole(1, 'Admin');

    expect(mockQuery).toHaveBeenCalledWith(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, role',
      ['Admin', 1]
    );
    expect(result).toEqual({ id: 1, username: 'j123456', role: 'Admin' });
  });

  test('decryptEmail should decrypt what encryptEmail produced internally', () => {
    const key = Buffer.from(process.env.EMAIL_ENCRYPTION_KEY, 'hex');
    const iv = Buffer.alloc(16, 1);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update('j123456@j.com', 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const payload = iv.toString('hex') + ':' + encrypted;

    const result = userModel.decryptEmail(payload);

    expect(result).toBe('j123456@j.com');
  });
});
