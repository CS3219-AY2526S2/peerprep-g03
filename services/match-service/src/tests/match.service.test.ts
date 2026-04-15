import { MatchService } from '../services/matchService';

// Service tests use mocked Redis and repository calls.
describe('MatchService', () => {
  let redis: any;
  let matchRepo: any;
  let service: MatchService;

  beforeEach(() => {
    redis = {
      hSet: jest.fn(),
      expire: jest.fn(),
      zAdd: jest.fn(),
      zRange: jest.fn(),
      hGetAll: jest.fn(),
      hGet: jest.fn(),
      watch: jest.fn(),
      unwatch: jest.fn(),
      get: jest.fn(),
      zScan: jest.fn(),
      scan: jest.fn(),
      zRem: jest.fn(),
      multi: jest.fn(),
    };

    matchRepo = {
      redis,
      removeUser: jest.fn(),
      removeInactiveUser: jest.fn(),
    };

    service = new MatchService(matchRepo);
    jest.clearAllMocks();
  });

  describe('findMatchService', () => {
    test('should return searching when no partner is found', async () => {
      redis.hSet.mockResolvedValue(1);
      redis.expire.mockResolvedValue(1);
      redis.zAdd.mockResolvedValue(1);
      redis.zRange.mockResolvedValue([]);

      const result = await service.findMatchService(
        'u1',
        'Python',
        'Arrays',
        'Easy'
      );

      expect(redis.hSet).toHaveBeenCalledWith('user:u1', {
        userId: 'u1',
        topic: 'Arrays',
        difficulty: 'Easy',
        language: 'Python',
        status: 'searching',
        joinedAt: expect.any(Number),
      });
      expect(redis.expire).toHaveBeenCalledWith('user:u1', 120);
      expect(redis.zAdd).toHaveBeenCalled();
      expect(result).toEqual({ status: 'searching', partnerId: null });
    });

    test('should currently return undefined on duplicate request because catch is not implemented', async () => {
      redis.hSet.mockResolvedValue(0);

      const result = await service.findMatchService(
        'u1',
        'Python',
        'Arrays',
        'Easy'
      );

      expect(result).toBeUndefined();
    });

    test('should return matched when a compatible partner is found and transaction succeeds', async () => {
      const execMock = jest.fn().mockResolvedValue(['OK']);
      const multiMock = {
        hSet: jest.fn().mockReturnThis(),
        zRem: jest.fn().mockReturnThis(),
        setEx: jest.fn().mockReturnThis(),
        exec: execMock,
      };

      redis.hSet.mockResolvedValue(1);
      redis.expire.mockResolvedValue(1);
      redis.zAdd.mockResolvedValue(1);

      redis.zRange.mockResolvedValue(['u2']);
      redis.hGetAll.mockResolvedValue({
        userId: 'u2',
        topic: 'Arrays',
        difficulty: 'Easy',
        language: 'Python',
        status: 'searching',
      });
      redis.watch.mockResolvedValue(undefined);
      redis.hGet.mockResolvedValue('searching');
      redis.multi.mockReturnValue(multiMock);

      const result = await service.findMatchService(
        'u1',
        'Python',
        'Arrays',
        'Easy'
      );

      expect(redis.watch).toHaveBeenCalledWith('user:u1', 'user:u2');
      expect(redis.hGet).toHaveBeenCalledWith('user:u2', 'status');
      expect(redis.multi).toHaveBeenCalled();
      expect(result).toEqual({
        status: 'matched',
        partnerId: 'u2',
        matchId: expect.any(String),
      });
    });

    test('should return searching when watched partner is no longer searching', async () => {
      redis.hSet.mockResolvedValue(1);
      redis.expire.mockResolvedValue(1);
      redis.zAdd.mockResolvedValue(1);

      redis.zRange.mockResolvedValue(['u2']);
      redis.hGetAll.mockResolvedValue({
        userId: 'u2',
        topic: 'Arrays',
        difficulty: 'Easy',
        language: 'Python',
      });
      redis.watch.mockResolvedValue(undefined);
      redis.hGet.mockResolvedValue('matched');
      redis.unwatch.mockResolvedValue(undefined);

      const result = await service.findMatchService(
        'u1',
        'Python',
        'Arrays',
        'Easy'
      );

      expect(redis.unwatch).toHaveBeenCalled();
      expect(result).toEqual({ status: 'searching', partnerId: null });
    });
  });

  describe('pollMatchStatus', () => {
    test('should return expired when user data is missing', async () => {
      redis.hGetAll.mockResolvedValue({});
      redis.get.mockResolvedValue(null);

      const result = await service.pollMatchStatus('u1');

      expect(result).toEqual({
        status: 'expired',
        message: 'Session times out. Please retry.',
      });
    });

    test('should return matched when mailbox exists', async () => {
      redis.hGetAll.mockResolvedValue({
        userId: 'u1',
        language: 'Python',
        difficulty: 'Easy',
        status: 'matched',
      });

      redis.get.mockResolvedValue(
        JSON.stringify({
          partnerId: 'u2',
          matchId: 'match-123',
        })
      );

      const result = await service.pollMatchStatus('u1');

      expect(result).toEqual({
        status: 'matched',
        partnerId: 'u2',
        matchId: 'match-123',
        message: 'Partner found',
      });
    });

    test('should return current status and refresh zset when still searching', async () => {
      redis.hGetAll.mockResolvedValue({
        userId: 'u1',
        language: 'Python',
        difficulty: 'Easy',
        status: 'searching',
      });

      redis.get.mockResolvedValue(null);
      redis.zAdd.mockResolvedValue(1);

      const result = await service.pollMatchStatus('u1');

      expect(redis.zAdd).toHaveBeenCalled();
      expect(result).toEqual({
        status: 'searching',
        userId: 'u1',
      });
    });

    test('should return error status when poll throws', async () => {
      redis.hGetAll.mockRejectedValue(new Error('Redis failed'));
      redis.get.mockResolvedValue(null);

      const result = await service.pollMatchStatus('u1');

      expect(result).toEqual({ status: 'error' });
    });
  });

  describe('cancelMatchService', () => {
    test('should remove user and return success', async () => {
      matchRepo.removeUser.mockResolvedValue(undefined);

      const result = await service.cancelMatchService('u1');

      expect(matchRepo.removeUser).toHaveBeenCalledWith('u1');
      expect(result).toEqual({ status: 'success' });
    });

    test('should throw when removeUser fails', async () => {
      matchRepo.removeUser.mockRejectedValue(new Error('Remove failed'));

      await expect(service.cancelMatchService('u1')).rejects.toThrow('Remove failed');
    });
  });

  describe('generateMatchId', () => {
    test('should generate a match id string', () => {
      const matchId = service.generateMatchId();

      expect(matchId).toEqual(expect.stringMatching(/^match-\d+-\d+$/));
    });
  });
});
