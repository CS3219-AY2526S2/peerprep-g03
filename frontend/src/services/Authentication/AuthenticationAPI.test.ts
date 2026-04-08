import { getUserProfile, createUserProfile, refreshJWToken, updateProficiency } from './AuthenticationAPI';

describe('Authentication Service', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getUserProfile', () => {
    test('returns user data on successful login', async () => {
      const mockResponse = {
        username: 'testuser',
        role: 'Admin',
        JWToken: 'mock-token'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await getUserProfile('testuser', 'password123');

      expect(result.status).toBe('200');
      expect(result.JWToken).toBe('mock-token');
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/login'), expect.any(Object));
    });

    test('returns error message on 401 failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid credentials' }),
      });

      const result = await getUserProfile('baduser', 'badpass');

      expect(result.status).toBe('401');
      expect(result.data.message).toBe('Invalid credentials');
    });
  });

  describe('refreshJWToken', () => {
    test('returns error if no token in localStorage', async () => {
      const result = await refreshJWToken();
      expect(result.status).toBe('401');
      expect(result.data.message).toBe('No token found');
    });

    test('updates localStorage and returns new token on success', async () => {
      localStorage.setItem('JWToken', 'old-token');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ JWToken: 'new-token' }),
      });

      const result = await refreshJWToken();

      expect(result.JWToken).toBe('new-token');
      expect(localStorage.getItem('JWToken')).toBe('new-token');
    });
  });
});