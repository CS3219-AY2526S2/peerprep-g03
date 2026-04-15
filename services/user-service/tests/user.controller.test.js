process.env.JWT_SECRET = 'testsecret';

jest.mock('../models/userModel', () => ({
  createUser: jest.fn(),
  getUserByUsername: jest.fn(),
  getUserById: jest.fn(),
  decryptEmail: jest.fn(),
  getAllUsers: jest.fn(),
  updateUserRole: jest.fn(),
}));

jest.mock('../utils/validation', () => ({
  validateEmail: jest.fn(),
  validatePassword: jest.fn(),
  validateUsername: jest.fn(),
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

jest.mock('pg', () => {
  const query = jest.fn();
  return {
    Pool: jest.fn(() => ({ query })),
  };
});

const httpMocks = require('node-mocks-http');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const userModel = require('../models/userModel');
const validation = require('../utils/validation');
const { Pool } = require('pg');

const userController = require('../controllers/authController');

describe('User Controller', () => {
  let req;
  let res;
  let mockPool;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();

    mockPool = new Pool();
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'testsecret';
  });

  describe('registerUser', () => {
    test('should return 400 if email validation fails', async () => {
      req.body = {
        username: 'j123456',
        password: 'jJ123456.',
        email: 'bad-email',
      };

      validation.validateEmail.mockReturnValue('Invalid email');
      validation.validatePassword.mockReturnValue(true);
      validation.validateUsername.mockReturnValue(true);

      await userController.registerUser(req, res);

      expect(res.statusCode).toBe(400);
      expect(res._getJSONData()).toEqual({ error: 'Invalid email' });
    });

    test('should return 409 if username already exists', async () => {
      req.body = {
        username: 'j123456',
        password: 'jJ123456.',
        email: 'j123456@j.com',
      };

      validation.validateEmail.mockReturnValue(true);
      validation.validatePassword.mockReturnValue(true);
      validation.validateUsername.mockReturnValue(true);
      userModel.getUserByUsername.mockResolvedValue({ id: 1, username: 'j123456' });

      await userController.registerUser(req, res);

      expect(res.statusCode).toBe(409);
      expect(res._getJSONData()).toEqual({ error: 'Username already exists' });
    });

    test('should return 201 when user is created', async () => {
      req.body = {
        username: 'j123456',
        password: 'jJ123456.',
        email: 'j123456@j.com',
      };

      validation.validateEmail.mockReturnValue(true);
      validation.validatePassword.mockReturnValue(true);
      validation.validateUsername.mockReturnValue(true);
      userModel.getUserByUsername.mockResolvedValue(null);
      userModel.createUser.mockResolvedValue({ id: 3 });

      await userController.registerUser(req, res);

      expect(userModel.createUser).toHaveBeenCalledWith(
        'j123456',
        'jJ123456.',
        'j123456@j.com',
        'User'
      );
      expect(res.statusCode).toBe(201);
      expect(res._getJSONData()).toEqual({ message: 'User created', id: 3 });
    });

    test('should return 500 when createUser throws', async () => {
      req.body = {
        username: 'j123456',
        password: 'jJ123456.',
        email: 'j123456@j.com',
      };

      validation.validateEmail.mockReturnValue(true);
      validation.validatePassword.mockReturnValue(true);
      validation.validateUsername.mockReturnValue(true);
      userModel.getUserByUsername.mockResolvedValue(null);
      userModel.createUser.mockRejectedValue(new Error('DB failed'));

      await userController.registerUser(req, res);

      expect(res.statusCode).toBe(500);
      expect(res._getJSONData()).toEqual({ error: 'DB failed' });
    });
  });

  describe('loginUser', () => {
    test('should return 404 if user not found', async () => {
      req.body = { username: 'j123456', password: 'jJ123456.' };
      userModel.getUserByUsername.mockResolvedValue(null);

      await userController.loginUser(req, res);

      expect(res.statusCode).toBe(404);
      expect(res._getJSONData()).toEqual({ error: 'User not found' });
    });

    test('should return 403 if account is locked', async () => {
      req.body = { username: 'j123456', password: 'jJ123456.' };

      userModel.getUserByUsername.mockResolvedValue({
        id: 1,
        username: 'j123456',
        locked_until: new Date(Date.now() + 60000).toISOString(),
      });

      await userController.loginUser(req, res);

      expect(res.statusCode).toBe(403);
      expect(res._getJSONData().error).toContain('Account locked');
    });

    test('should return 401 for invalid password', async () => {
      req.body = { username: 'j123456', password: 'wrongpass' };

      userModel.getUserByUsername.mockResolvedValue({
        id: 1,
        username: 'j123456',
        password: 'hashedpw',
        failed_attempts: 1,
        last_failed_at: new Date().toISOString(),
        locked_until: null,
      });

      bcrypt.compare.mockResolvedValue(false);
      mockPool.query.mockResolvedValue({});

      await userController.loginUser(req, res);

      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpass', 'hashedpw');
      expect(mockPool.query).toHaveBeenCalled();
      expect(res.statusCode).toBe(401);
      expect(res._getJSONData()).toEqual({ error: 'Invalid password' });
    });

    test('should return login payload for valid password', async () => {
      req.body = { username: 'j123456', password: 'jJ123456.' };

      userModel.getUserByUsername.mockResolvedValue({
        id: 1,
        username: 'j123456',
        password: 'hashedpw',
        role: 'User',
        email: 'encrypted-email',
        proficiency: 'Intermediate',
      });

      bcrypt.compare.mockResolvedValue(true);
      mockPool.query.mockResolvedValue({});
      userModel.decryptEmail.mockReturnValue('j123456@j.com');
      jwt.sign.mockReturnValue('token-123');

      await userController.loginUser(req, res);

      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE users SET failed_attempts = 0, last_failed_at = NULL, locked_until = NULL WHERE id = $1',
        [1]
      );
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 1, username: 'j123456', role: 'User' },
        'testsecret',
        { expiresIn: '15m' }
      );
      expect(res._getJSONData()).toEqual({
        username: 'j123456',
        role: 'User',
        email: 'j123456@j.com',
        proficiency: 'Intermediate',
        JWToken: 'token-123',
        id: 1,
      });
    });
  });

  describe('refreshToken', () => {
    test('should return 401 if no token provided', async () => {
      req.headers = {};

      await userController.refreshToken(req, res);

      expect(res.statusCode).toBe(401);
      expect(res._getJSONData()).toEqual({ error: 'No token provided' });
    });

    test('should return 404 if user not found', async () => {
      req.headers = { authorization: 'Bearer oldtoken' };
      jwt.verify.mockReturnValue({ id: 1 });
      userModel.getUserById.mockResolvedValue(null);

      await userController.refreshToken(req, res);

      expect(res.statusCode).toBe(404);
      expect(res._getJSONData()).toEqual({ error: 'User not found' });
    });

    test('should return new token on success', async () => {
      req.headers = { authorization: 'Bearer oldtoken' };
      jwt.verify.mockReturnValue({ id: 1 });
      userModel.getUserById.mockResolvedValue({
        id: 1,
        username: 'j123456',
        role: 'Admin',
      });
      jwt.sign.mockReturnValue('newtoken');

      await userController.refreshToken(req, res);

      expect(res._getJSONData()).toEqual({ JWToken: 'newtoken' });
    });

    test('should return 401 for invalid token', async () => {
      req.headers = { authorization: 'Bearer badtoken' };
      const err = new Error('bad');
      err.name = 'JsonWebTokenError';
      jwt.verify.mockImplementation(() => { throw err; });

      await userController.refreshToken(req, res);

      expect(res.statusCode).toBe(401);
      expect(res._getJSONData()).toEqual({ error: 'Invalid token' });
    });
  });

  describe('getAllUsers', () => {
    test('should return 401 if no auth header', async () => {
      req.headers = {};

      await userController.getAllUsers(req, res);

      expect(res.statusCode).toBe(401);
      expect(res._getJSONData()).toEqual({ error: 'No token' });
    });

    test('should return 403 if not superadmin', async () => {
      req.headers = { authorization: 'Bearer token' };
      jwt.verify.mockReturnValue({ role: 'Admin' });

      await userController.getAllUsers(req, res);

      expect(res.statusCode).toBe(403);
      expect(res._getJSONData()).toEqual({ error: 'Forbidden' });
    });

    test('should return users for superadmin', async () => {
      req.headers = { authorization: 'Bearer token' };
      jwt.verify.mockReturnValue({ role: 'SuperAdmin' });
      userModel.getAllUsers.mockResolvedValue([{ id: 1, username: 'a', role: 'User' }]);

      await userController.getAllUsers(req, res);

      expect(res._getJSONData()).toEqual([{ id: 1, username: 'a', role: 'User' }]);
    });
  });

  describe('updateUserRole', () => {
    test('should return 400 for invalid role', async () => {
      req.headers = { authorization: 'Bearer token' };
      req.params = { id: '1' };
      req.body = { role: 'SuperAdmin' };
      jwt.verify.mockReturnValue({ role: 'SuperAdmin' });

      await userController.updateUserRole(req, res);

      expect(res.statusCode).toBe(400);
      expect(res._getJSONData()).toEqual({ error: 'Invalid role' });
    });

    test('should update role for superadmin', async () => {
      req.headers = { authorization: 'Bearer token' };
      req.params = { id: '1' };
      req.body = { role: 'Admin' };
      jwt.verify.mockReturnValue({ role: 'SuperAdmin' });
      userModel.updateUserRole.mockResolvedValue({
        id: 1,
        username: 'j123456',
        role: 'Admin',
      });

      await userController.updateUserRole(req, res);

      expect(userModel.updateUserRole).toHaveBeenCalledWith('1', 'Admin');
      expect(res._getJSONData()).toEqual({
        id: 1,
        username: 'j123456',
        role: 'Admin',
      });
    });
  });
});