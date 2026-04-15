import {
    getBlankFieldError,
    getValidPasswordError,
    getValidConfirmPasswordError,
    getValidEmailError,
    getValidUsernameError
} from './validators.ts';

describe('Form Validation Logic', () => {

    describe('getBlankFieldError', () => {
        test('returns error message if value is empty or whitespace', () => {
            expect(getBlankFieldError('email', '')).toContain('Email is required');
            expect(getBlankFieldError('password', '   ')).toContain('Password is required');
        });

        test('returns empty string if value is present', () => {
            expect(getBlankFieldError('username', 'testuser')).toBe('');
        });
    });

    describe('getValidPasswordError', () => {
        test('returns error for weak passwords', () => {
            const error = getValidPasswordError('12345');
            expect(error).toContain('at least 8 characters');
        });

        test('returns empty string for strong passwords', () => {
            expect(getValidPasswordError('StrongPass123!')).toBe('');
        });
    });

    describe('getValidConfirmPasswordError', () => {
        test('returns error if passwords do not match', () => {
            expect(getValidConfirmPasswordError('pass1', 'pass2')).toContain('does not match');
        });

        test('returns empty string if passwords match', () => {
            expect(getValidConfirmPasswordError('secure123', 'secure123')).toBe('');
        });
    });

    describe('getValidEmailError', () => {
        test('returns error for invalid email formats', () => {
            expect(getValidEmailError('invalid-email')).toContain('correct format');
        });

        test('returns empty string for valid email', () => {
            expect(getValidEmailError('test@example.com')).toBe('');
        });
    });

    describe('getValidUsernameError', () => {
        test('returns error if username is too short', () => {
            expect(getValidUsernameError('abc')).toContain('at least 6 character');
        });

        test('returns empty string for valid length username', () => {
            expect(getValidUsernameError('longusername')).toBe('');
        });
    });
});