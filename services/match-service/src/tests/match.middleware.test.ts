import * as httpMocks from 'node-mocks-http';
import {
  validateUserParams,
  validateNewMatchRequest,
} from '../middleware/matchValidators';
import {
  Difficulty,
  Language,
  Topic,
} from '../constants/match.constant';

// Middleware tests validate request input.
describe('Match middleware', () => {
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('validateUserParams', () => {
    test('should call next when userId is valid', () => {
      req.params = { userId: 'u1' };

      validateUserParams(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should return 400 when userId is missing', () => {
      req.params = {};

      validateUserParams(req, res, next);

      expect(res.statusCode).toBe(400);
      expect(res._getJSONData()).toEqual({
        code: 'INVALID_USER_PARAMETER',
        message: 'Invalid userId  in the URL path',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should return 400 when userId is ':/userId'", () => {
      req.params = { userId: ':/userId' };

      validateUserParams(req, res, next);

      expect(res.statusCode).toBe(400);
      expect(res._getJSONData().code).toBe('INVALID_USER_PARAMETER');
      expect(next).not.toHaveBeenCalled();
    });

    test("should return 400 when userId is 'undefined'", () => {
      req.params = { userId: 'undefined' };

      validateUserParams(req, res, next);

      expect(res.statusCode).toBe(400);
      expect(res._getJSONData().code).toBe('INVALID_USER_PARAMETER');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateNewMatchRequest', () => {
    test('should call next when request body is valid', () => {
      req.body = {
        userId: 'u1',
        language: Object.values(Language)[0],
        topic: Object.values(Topic)[0],
        difficulty: Object.values(Difficulty)[0],
      };

      validateNewMatchRequest(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should return 400 when fields are missing', () => {
      req.body = {
        userId: 'u1',
        language: Object.values(Language)[0],
      };

      validateNewMatchRequest(req, res, next);

      expect(res.statusCode).toBe(400);
      expect(res._getJSONData()).toEqual({
        code: 'MISSING_FIELDS',
        message: 'One of more fields have missing values',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 400 when enum values are invalid', () => {
      req.body = {
        userId: 'u1',
        language: 'InvalidLanguage',
        topic: 'InvalidTopic',
        difficulty: 'InvalidDifficulty',
      };

      validateNewMatchRequest(req, res, next);

      expect(res.statusCode).toBe(400);
      expect(res._getJSONData()).toEqual({
        code: 'INVALID_ENUM_VALUE',
        message: 'One or more fields contain invalid options',
        details: {
          language: 'invalid',
          topic: 'invalid',
          difficulty: 'invalid',
        },
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should mark only invalid fields in details', () => {
      req.body = {
        userId: 'u1',
        language: Object.values(Language)[0],
        topic: 'InvalidTopic',
        difficulty: Object.values(Difficulty)[0],
      };

      validateNewMatchRequest(req, res, next);

      expect(res.statusCode).toBe(400);
      expect(res._getJSONData()).toEqual({
        code: 'INVALID_ENUM_VALUE',
        message: 'One or more fields contain invalid options',
        details: {
          language: 'valid',
          topic: 'invalid',
          difficulty: 'valid',
        },
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
