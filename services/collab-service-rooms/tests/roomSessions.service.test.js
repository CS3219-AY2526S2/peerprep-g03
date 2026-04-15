import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const mockPoolQuery = jest.fn();
const mockClientQuery = jest.fn();
const mockClientRelease = jest.fn();
const mockPoolConnect = jest.fn(() =>
  Promise.resolve({
    query: mockClientQuery,
    release: mockClientRelease,
  })
);

jest.unstable_mockModule('../pool.js', () => ({
  pool: {
    query: mockPoolQuery,
    connect: mockPoolConnect,
  },
}));

const { RoomSessionService } = await import('../services/roomSessionService.js');

describe('RoomSessionService', () => {
  let service;

  beforeEach(() => {
    service = new RoomSessionService();
    jest.clearAllMocks();
  });

  describe('generateRoomId', () => {
    test('returns a room id string', () => {
      const roomId = service.generateRoomId();
      expect(roomId).toEqual(expect.stringMatching(/^room-\d+-\d+$/));
    });
  });

  describe('createSessionUser', () => {
    test('returns an active session user', () => {
      const result = service.createSessionUser('u1');

      expect(result).toEqual({
        userId: 'u1',
        userStatus: 'active',
        lastActiveAt: expect.any(String),
      });
    });
  });

  describe('buildSessionSnapshot', () => {
    test('builds a session snapshot from DB rows', () => {
      const sessionRow = {
        room_id: 'room-1',
        match_id: 'match-1',
        question_id: 'q1',
        question_title: 'Two Sum',
        question_description: 'desc',
        question_starter_code: 'code',
        status: 'active',
      };

      const sessionUsersRows = [
        {
          user_id: 'u1',
          user_status: 'active',
          last_active_at: '2026-01-01T00:00:00.000Z',
        },
        {
          user_id: 'u2',
          user_status: 'submitted',
          last_active_at: '2026-01-01T00:01:00.000Z',
        },
        {
          user_id: 'u3',
          user_status: 'left',
          last_active_at: '2026-01-01T00:02:00.000Z',
        },
      ];

      const result = service.buildSessionSnapshot(sessionRow, sessionUsersRows);

      expect(result).toEqual({
        roomId: 'room-1',
        matchId: 'match-1',
        questionId: 'q1',
        questionTitle: 'Two Sum',
        questionDescription: 'desc',
        questionStarterCode: 'code',
        users: [
          {
            userId: 'u1',
            userStatus: 'active',
            lastActiveAt: '2026-01-01T00:00:00.000Z',
          },
          {
            userId: 'u2',
            userStatus: 'submitted',
            lastActiveAt: '2026-01-01T00:01:00.000Z',
          },
          {
            userId: 'u3',
            userStatus: 'left',
            lastActiveAt: '2026-01-01T00:02:00.000Z',
          },
        ],
        status: 'active',
        submittedUsers: ['u2'],
        leftUsers: ['u3'],
        updatedAt: expect.any(String),
      });
    });
  });

  describe('hydrateSessionFromDb', () => {
    test('returns null if session does not exist', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.hydrateSessionFromDb('room-1');

      expect(result).toBeNull();
    });

    test('hydrates and caches session from DB', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({
          rows: [
            {
              room_id: 'room-1',
              match_id: 'match-1',
              question_id: 'q1',
              question_title: 'Two Sum',
              question_description: 'desc',
              question_starter_code: 'code',
              status: 'active',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              user_id: 'u1',
              user_status: 'active',
              last_active_at: '2026-01-01T00:00:00.000Z',
            },
          ],
        });

      const result = await service.hydrateSessionFromDb('room-1');

      expect(result.roomId).toBe('room-1');
      expect(service.sessions.get('room-1')).toEqual(result);
      expect(service.matchToRoom.get('match-1')).toBe('room-1');
    });
  });

  describe('findRejoinableRoomForUser', () => {
    test('returns null when no room exists', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.findRejoinableRoomForUser('u1');

      expect(result).toBeNull();
    });

    test('returns rejoinable room details when found', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({
          rows: [
            {
              room_id: 'room-1',
              match_id: 'match-1',
              question_id: 'q1',
              question_title: 'Two Sum',
              question_description: 'desc',
              question_starter_code: 'code',
              status: 'active',
              user_status: 'disconnected',
              last_active_at: new Date().toISOString(),
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ user_id: 'u2' }],
        });

      const result = await service.findRejoinableRoomForUser('u1');

      expect(result).toEqual({
        roomId: 'room-1',
        matchId: 'match-1',
        questionId: 'q1',
        status: 'active',
        userStatus: 'disconnected',
        partner: 'u2',
        isStale: false,
      });
    });
  });

  describe('startSession', () => {
    test('throws when userId or matchId is missing', async () => {
      await expect(service.startSession({ userId: 'u1' })).rejects.toThrow(
        'userId and matchId are required'
      );
    });

    test('throws when question details are missing', async () => {
      await expect(
        service.startSession({
          userId: 'u1',
          matchId: 'm1',
        })
      ).rejects.toThrow('All question details are required');
    });

    test('creates a new session when no active session exists', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [] });

      mockClientQuery
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ room_id: 'room-123', question_id: 'q1', status: 'active' }],
        }) // insert session
        .mockResolvedValueOnce(undefined) // insert session_users
        .mockResolvedValueOnce(undefined); // COMMIT

      jest.spyOn(service, 'generateRoomId').mockReturnValue('room-123');

      const result = await service.startSession({
        userId: 'u1',
        matchId: 'm1',
        questionId: 'q1',
        questionTitle: 'Two Sum',
        questionDescription: 'desc',
        questionStarterCode: 'code',
      });

      expect(result).toEqual({
        roomId: 'room-123',
        questionId: 'q1',
        questionTitle: 'Two Sum',
        questionDescription: 'desc',
        questionStarterCode: 'code',
        status: 'active',
        partner: null,
        userStatus: 'active',
        reused: false,
      });

      expect(service.sessions.get('room-123')).toBeTruthy();
      expect(service.matchToRoom.get('m1')).toBe('room-123');
      expect(mockClientRelease).toHaveBeenCalled();
    });

    test('reuses an existing active session', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({
          rows: [
            {
              room_id: 'room-1',
              question_id: 'q1',
              question_title: 'Two Sum',
              question_description: 'desc',
              question_starter_code: 'code',
              status: 'active',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ user_id: 'u2' }],
        });

      mockClientQuery
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // insert session_users
        .mockResolvedValueOnce(undefined) // update session_users
        .mockResolvedValueOnce(undefined) // update sessions
        .mockResolvedValueOnce({
          rows: [
            {
              user_id: 'u1',
              user_status: 'active',
              last_active_at: '2026-01-01T00:00:00.000Z',
            },
            {
              user_id: 'u2',
              user_status: 'active',
              last_active_at: '2026-01-01T00:01:00.000Z',
            },
          ],
        })
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await service.startSession({
        userId: 'u1',
        matchId: 'm1',
        questionId: 'q1',
        questionTitle: 'Two Sum',
        questionDescription: 'desc',
        questionStarterCode: 'code',
      });

      expect(result).toEqual({
        roomId: 'room-1',
        questionId: 'q1',
        questionTitle: 'Two Sum',
        questionDescription: 'desc',
        questionStarterCode: 'code',
        status: 'active',
        partner: 'u2',
        userStatus: 'active',
        reused: true,
      });
    });
  });

  describe('reconnectSession', () => {
    test('returns failure when session is missing', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.reconnectSession({
        userId: 'u1',
        roomId: 'room-1',
      });

      expect(result).toEqual({
        success: false,
        message: 'Session not found',
      });
    });

    test('blocks reconnect if user has left', async () => {
      service.sessions.set('room-1', {
        roomId: 'room-1',
        matchId: 'm1',
        questionId: 'q1',
        questionTitle: 'Two Sum',
        questionDescription: 'desc',
        questionStarterCode: 'code',
        users: [
          {
            userId: 'u1',
            userStatus: 'left',
            lastActiveAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        status: 'active',
      });

      const result = await service.reconnectSession({
        userId: 'u1',
        roomId: 'room-1',
      });

      expect(result).toEqual({
        success: false,
        message: 'Cannot reconnect after leaving this session',
      });
    });

    test('succeeds for disconnected user', async () => {
      service.sessions.set('room-1', {
        roomId: 'room-1',
        matchId: 'm1',
        questionId: 'q1',
        questionTitle: 'Two Sum',
        questionDescription: 'desc',
        questionStarterCode: 'code',
        users: [
          {
            userId: 'u1',
            userStatus: 'disconnected',
            lastActiveAt: '2026-01-01T00:00:00.000Z',
          },
          {
            userId: 'u2',
            userStatus: 'active',
            lastActiveAt: '2026-01-01T00:01:00.000Z',
          },
        ],
        status: 'active',
      });

      mockPoolQuery
        .mockResolvedValueOnce(undefined) // update session_users
        .mockResolvedValueOnce(undefined) // update sessions
        .mockResolvedValueOnce({
          rows: [
            {
              user_id: 'u1',
              user_status: 'active',
              last_active_at: '2026-01-01T00:02:00.000Z',
            },
            {
              user_id: 'u2',
              user_status: 'active',
              last_active_at: '2026-01-01T00:01:00.000Z',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ user_id: 'u2' }],
        });

      const result = await service.reconnectSession({
        userId: 'u1',
        roomId: 'room-1',
      });

      expect(result.success).toBe(true);
      expect(result.roomId).toBe('room-1');
      expect(result.partner).toBe('u2');
    });
  });

  describe('disconnectSession', () => {
    test('throws when userId is missing', async () => {
      await expect(service.disconnectSession({})).rejects.toThrow(
        'userId is required'
      );
    });

    test('returns failure when no active room is found', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.disconnectSession({ userId: 'u1' });

      expect(result).toEqual({
        success: false,
        message: 'Session not found',
      });
    });
  });

  describe('leaveSession', () => {
    test('throws when userId is missing', async () => {
      await expect(service.leaveSession({})).rejects.toThrow('userId is required');
    });

    test('closes session when all users are left or submitted', async () => {
      service.sessions.set('room-1', {
        roomId: 'room-1',
        matchId: 'm1',
        questionId: 'q1',
        questionTitle: 'Two Sum',
        questionDescription: 'desc',
        questionStarterCode: 'code',
        users: [],
        status: 'active',
      });

      mockPoolQuery
        .mockResolvedValueOnce(undefined) // update session_users
        .mockResolvedValueOnce({
          rows: [
            {
              user_id: 'u1',
              user_status: 'left',
              last_active_at: '2026-01-01T00:00:00.000Z',
            },
            {
              user_id: 'u2',
              user_status: 'submitted',
              last_active_at: '2026-01-01T00:01:00.000Z',
            },
          ],
        })
        .mockResolvedValueOnce(undefined); // update sessions

      const result = await service.leaveSession({
        userId: 'u1',
        roomId: 'room-1',
      });

      expect(result).toEqual({
        success: true,
        roomId: 'room-1',
        message: 'User left session successfully',
        status: 'closed',
        session: null,
      });

      expect(service.sessions.has('room-1')).toBe(false);
      expect(service.matchToRoom.has('m1')).toBe(false);
    });
  });

  describe('submitSession', () => {
    test('throws when userId or roomId is missing', async () => {
      await expect(service.submitSession({ userId: 'u1' })).rejects.toThrow(
        'userId and roomId are required'
      );
    });

    test('returns failure when session is not found', async () => {
      mockClientQuery
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // select session
        .mockResolvedValueOnce(undefined); // ROLLBACK

      const result = await service.submitSession({
        userId: 'u1',
        roomId: 'room-1',
        code: 'print(1)',
      });

      expect(result).toEqual({
        success: false,
        message: 'Session not found',
      });
      expect(mockClientRelease).toHaveBeenCalled();
    });

    test('keeps session active when not all users submitted', async () => {
      mockClientQuery
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              room_id: 'room-1',
              match_id: 'm1',
              question_id: 'q1',
              question_title: 'Two Sum',
              question_description: 'desc',
              question_starter_code: 'code',
              status: 'active',
            },
          ],
        })
        .mockResolvedValueOnce(undefined) // insert session_users
        .mockResolvedValueOnce(undefined) // update session_users
        .mockResolvedValueOnce(undefined) // insert submission
        .mockResolvedValueOnce({
          rows: [
            {
              user_id: 'u1',
              user_status: 'submitted',
              last_active_at: '2026-01-01T00:00:00.000Z',
            },
            {
              user_id: 'u2',
              user_status: 'active',
              last_active_at: '2026-01-01T00:01:00.000Z',
            },
          ],
        })
        .mockResolvedValueOnce(undefined) // update sessions
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await service.submitSession({
        userId: 'u1',
        roomId: 'room-1',
        code: 'print(1)',
      });

      expect(result).toEqual({
        success: true,
        message: 'Session submitted successfully',
        status: 'active',
        session: expect.any(Object),
      });

      expect(service.sessions.get('room-1')).toBeTruthy();
    });

    test('closes session when all users submitted', async () => {
      service.sessions.set('room-1', { roomId: 'room-1' });
      service.matchToRoom.set('m1', 'room-1');

      mockClientQuery
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              room_id: 'room-1',
              match_id: 'm1',
              question_id: 'q1',
              question_title: 'Two Sum',
              question_description: 'desc',
              question_starter_code: 'code',
              status: 'active',
            },
          ],
        })
        .mockResolvedValueOnce(undefined) // insert session_users
        .mockResolvedValueOnce(undefined) // update session_users
        .mockResolvedValueOnce(undefined) // insert submission
        .mockResolvedValueOnce({
          rows: [
            {
              user_id: 'u1',
              user_status: 'submitted',
              last_active_at: '2026-01-01T00:00:00.000Z',
            },
            {
              user_id: 'u2',
              user_status: 'submitted',
              last_active_at: '2026-01-01T00:01:00.000Z',
            },
          ],
        })
        .mockResolvedValueOnce(undefined) // update sessions
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await service.submitSession({
        userId: 'u1',
        roomId: 'room-1',
        code: 'print(1)',
      });

      expect(result).toEqual({
        success: true,
        message: 'Session submitted successfully',
        status: 'closed',
        session: null,
      });

      expect(service.sessions.has('room-1')).toBe(false);
      expect(service.matchToRoom.has('m1')).toBe(false);
    });
  });

  describe('getSessionByRoomId', () => {
    test('returns cached session if present', async () => {
      service.sessions.set('room-1', {
        roomId: 'room-1',
        status: 'active',
      });

      const result = await service.getSessionByRoomId('room-1');

      expect(result).toEqual({
        roomId: 'room-1',
        status: 'active',
      });
    });

    test('hydrates from DB if not cached', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({
          rows: [
            {
              room_id: 'room-1',
              match_id: 'm1',
              question_id: 'q1',
              question_title: 'Two Sum',
              question_description: 'desc',
              question_starter_code: 'code',
              status: 'active',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              user_id: 'u1',
              user_status: 'active',
              last_active_at: '2026-01-01T00:00:00.000Z',
            },
          ],
        });

      const result = await service.getSessionByRoomId('room-1');

      expect(result.roomId).toBe('room-1');
    });
  });
});