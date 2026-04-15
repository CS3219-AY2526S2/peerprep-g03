jest.mock('zxcvbn', () => jest.fn());

const zxcvbn = require('zxcvbn');
const {
  validateEmail,
  validatePassword,
  validateUsername,
} = require('../utils/validation');

// Validation tests mock password strength scoring.
describe('validation utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateEmail', () => {
    test('returns true for a valid email', () => {
      expect(validateEmail('j123456@j.com')).toBe(true);
    });

    test('accepts uppercase letters by normalizing to lowercase', () => {
      expect(validateEmail('J123456@J.COM')).toBe(true);
    });

    test('returns error for invalid email without @', () => {
      expect(validateEmail('j123456j.com')).toBe('Invalid Email Address');
    });

    test('returns error for invalid email without domain', () => {
      expect(validateEmail('j123456@')).toBe('Invalid Email Address');
    });
  });

  describe('validatePassword', () => {
    test('returns error when password is too short', () => {
      expect(validatePassword('Abc123')).toBe('Password is too short.');
    });

    test('returns error when password has no lowercase letter', () => {
      expect(validatePassword('ABC12345')).toBe(
        'Password must contain a lowercase letter.'
      );
    });

    test('returns error when password has no uppercase letter', () => {
      expect(validatePassword('abc12345')).toBe(
        'Password must contain an uppercase letter.'
      );
    });

    test('returns error when password has no number', () => {
      expect(validatePassword('Abcdefgh')).toBe(
        'Password must contain a number.'
      );
    });

    test('returns error when zxcvbn score is less than 2', () => {
      zxcvbn.mockReturnValue({ score: 1 });

      expect(validatePassword('Abc12345')).toBe(
        'Password is too weak. Try another combination of letters, numbers, and symbols'
      );
      expect(zxcvbn).toHaveBeenCalledWith('Abc12345');
    });

    test('returns true for a strong valid password', () => {
      zxcvbn.mockReturnValue({ score: 3 });

      expect(validatePassword('Abc12345')).toBe(true);
      expect(zxcvbn).toHaveBeenCalledWith('Abc12345');
    });
  });

  describe('validateUsername', () => {
    test('returns error when username is too short', () => {
      expect(validateUsername('abc12')).toBe(
        'Username length must be between 6 to 20 characters'
      );
    });

    test('returns error when username is too long', () => {
      expect(validateUsername('abcdefghijklmnopqrstuvwxyz1.')).toBe(
        'Username length must be between 6 to 20 characters'
      );
    });

    test('returns error for consecutive underlines', () => {
      expect(validateUsername('abc__123')).toBe(
        'Username must not have consecutive underlines'
      );
    });

    test('returns error for invalid characters', () => {
      expect(validateUsername('abc-123')).toBe(
        'Username must consist of only letters, numbers or underlines'
      );
    });

    test('returns true for a valid username with letters and numbers', () => {
      expect(validateUsername('j123456')).toBe(true);
    });

    test('returns true for a valid username with underscore', () => {
      expect(validateUsername('j_123456')).toBe(true);
    });

    test('returns true for username with only underscores and letters/numbers rule satisfied', () => {
      expect(validateUsername('abc_123')).toBe(true);
    });
  });
});
