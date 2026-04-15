const { verifyAdmin } = require('../middleware/auth.middleware');
const jwt = require('jsonwebtoken');
const httpMocks = require('node-mocks-http');

jest.mock('jsonwebtoken');

// Middleware tests use mocked JWT responses.
describe('verifyAdmin middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    next = jest.fn();

    process.env.JWT_SECRET = 'testsecret';
    jest.clearAllMocks();
  });

  // 1. No token provided
  test('should return 401 if no token is provided', () => {
    req.headers.authorization = undefined;

    verifyAdmin(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res._getJSONData().message).toBe("No token provided.");
    expect(next).not.toHaveBeenCalled();
  });

  // 2. Invalid token
  test('should return 401 if token is invalid', () => {
    req.headers.authorization = 'Bearer invalidtoken';

    jwt.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    verifyAdmin(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res._getJSONData().message).toBe("Invalid or expired token.");
    expect(next).not.toHaveBeenCalled();
  });

  // 3. Valid token but NOT admin
  test('should return 403 if user is not admin', () => {
    req.headers.authorization = 'Bearer validtoken';

    jwt.verify.mockReturnValue({
      username: 'user1',
      role: 'User'
    });

    verifyAdmin(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res._getJSONData().message)
      .toBe("Permission Denied: Administrative access required.");
    expect(next).not.toHaveBeenCalled();
  });

  // 4. Valid token with Admin role
  test('should call next() if user is Admin', () => {
    req.headers.authorization = 'Bearer validtoken';

    jwt.verify.mockReturnValue({
      username: 'admin1',
      role: 'Admin'
    });

    verifyAdmin(req, res, next);

    expect(req.user).toEqual({
      username: 'admin1',
      role: 'Admin'
    });
    expect(next).toHaveBeenCalled();
  });

  // 5. Valid token with SuperAdmin role
  test('should call next() if user is SuperAdmin', () => {
    req.headers.authorization = 'Bearer validtoken';

    jwt.verify.mockReturnValue({
      username: 'superadmin',
      role: 'SuperAdmin'
    });

    verifyAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
