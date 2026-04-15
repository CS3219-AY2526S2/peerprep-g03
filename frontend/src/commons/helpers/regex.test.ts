import { EMAIL_REGEX, COMPULSORY_REGEX, STRONG_PASSWORD_REGEX } from './regex.ts';

describe('Validation Regex Patterns', () => {

  describe('EMAIL_REGEX', () => {
    test('validates correct email addresses', () => {
      expect(EMAIL_REGEX.test('test@example.com')).toBe(true);
      expect(EMAIL_REGEX.test('user.name+tag@sub.domain.io')).toBe(true);
    });

    test('rejects invalid email addresses', () => {
      expect(EMAIL_REGEX.test('plainaddress')).toBe(false);
      expect(EMAIL_REGEX.test('@missinguser.com')).toBe(false);
      expect(EMAIL_REGEX.test('user@domain')).toBe(false);
    });
  });

  describe('COMPULSORY_REGEX', () => {
    test('validates strings with non-whitespace characters', () => {
      expect(COMPULSORY_REGEX.test('Hello')).toBe(true);
      expect(COMPULSORY_REGEX.test('  Word  ')).toBe(true);
    });

    test('rejects empty or whitespace-only strings', () => {
      expect(COMPULSORY_REGEX.test('')).toBe(false);
      expect(COMPULSORY_REGEX.test('   ')).toBe(false);
    });
  });

  describe('STRONG_PASSWORD_REGEX', () => {
    test('accepts valid strong passwords', () => {
      expect(STRONG_PASSWORD_REGEX.test('Password123!')).toBe(true);
      expect(STRONG_PASSWORD_REGEX.test('aB1#asdfgh')).toBe(true);
    });

    test('rejects passwords missing requirements', () => {
      expect(STRONG_PASSWORD_REGEX.test('Short1!')).toBe(false); // Too short
      expect(STRONG_PASSWORD_REGEX.test('password123!')).toBe(false); // No uppercase
      expect(STRONG_PASSWORD_REGEX.test('PASSWORD123!')).toBe(false); // No lowercase
      expect(STRONG_PASSWORD_REGEX.test('Password!')).toBe(false); // No number
      expect(STRONG_PASSWORD_REGEX.test('Password123')).toBe(false); // No special char
    });
  });
});