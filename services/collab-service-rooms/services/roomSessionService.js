// create room
// reuse room if exists
// validate user
// track session status
import { pool } from '../pool.js';

export class RoomSessionService {
  constructor() {
    // In-memory session store for MVP
    // key = roomId
    // value = session object
    this.sessions = new Map();

    // Optional helper map:
    // key = matchId
    // value = roomId
    this.matchToRoom = new Map();
  }

  generateRoomId() {
    return `room-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  createSessionUser(userId) {
    return {
      userId,
      hasSubmitted: false,
      hasLeft: false,
      lastActiveAt: new Date().toISOString(),
    };
  }

  hasUser(session, userId) {
    return session.users.some((user) => user.userId === userId);
  }

  // Insert a new session per match, insert a session user per user, should account for race conditions
  async startSession({ userId, matchId }) {
    if (!userId || !matchId) {
      throw new Error('userId and matchId are required');
    }

    // 1 matchId starts 1 session, but 2nd user joining same matchId should reuse existing session (if still active)
    const existingSessionRes = await pool.query(
      `SELECT room_id, question_id, status
       FROM sessions
       WHERE match_id = $1 AND status = 'active'
       ORDER BY updated_at DESC
       LIMIT 1`,
      [matchId]
    );

    const existingSessionRow = existingSessionRes.rows[0];
    if (existingSessionRow) {
      const existingRoomId = existingSessionRow.room_id;
      const existingSessionUsersRes = await pool.query(
        `SELECT user_id, has_submitted, has_left, last_active_at
         FROM session_users
         WHERE room_id = $1`,
        [existingRoomId]
      );

      const existingSession = this.sessions.get(existingRoomId) ?? {
        roomId: existingRoomId,
        matchId,
        questionId: existingSessionRow.question_id,
        users: existingSessionUsersRes.rows.map((user) => ({
          userId: user.user_id,
          hasSubmitted: user.has_submitted,
          hasLeft: user.has_left,
          lastActiveAt: user.last_active_at,
        })),
        status: existingSessionRow.status,
        submittedUsers: existingSessionUsersRes.rows
          .filter((user) => user.has_submitted)
          .map((user) => user.user_id),
        leftUsers: existingSessionUsersRes.rows
          .filter((user) => user.has_left)
          .map((user) => user.user_id),
        updatedAt: new Date().toISOString(),
      };

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        await client.query(
          `INSERT INTO session_users (room_id, user_id)
           VALUES ($1, $2)
           ON CONFLICT (room_id, user_id) DO NOTHING`,
          [existingSession.roomId, userId]
        );

        await client.query(
          `UPDATE sessions
           SET updated_at = CURRENT_TIMESTAMP
           WHERE room_id = $1`,
          [existingSession.roomId]
        );

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      if (!this.hasUser(existingSession, userId)) {
        existingSession.users.push(this.createSessionUser(userId));
      }

      existingSession.updatedAt = new Date().toISOString();
      this.matchToRoom.set(matchId, existingRoomId);
      this.sessions.set(existingRoomId, existingSession);

      return {
        roomId: existingSession.roomId,
        questionId: existingSession.questionId,
        status: existingSession.status,
        reused: true,
      };
    }

    // In a real system, you would look up the match from your match service / DB
    // and get both users + assigned question from there.
    // For now, we create a basic session.
    const roomId = this.generateRoomId();

    const session = {
      roomId,
      matchId,
      questionId: 'sample-question-id',
      users: [this.createSessionUser(userId)],
      status: 'active',
      submittedUsers: [],
      leftUsers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store session in DB

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const sessionRes = await client.query(
        `INSERT INTO sessions (room_id, match_id, question_id, status)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (match_id) DO NOTHING
        RETURNING room_id, question_id, status`,
        [session.roomId, session.matchId, session.questionId, session.status]
      );

      if (sessionRes.rows.length === 0) { // This user's query lost the race condition
        const existingSessionRes = await client.query(
          `SELECT room_id, question_id, status
           FROM sessions
           WHERE match_id = $1
           LIMIT 1`,
          [matchId]
        );

        const existingSessionRow = existingSessionRes.rows[0];

        await client.query(
          `INSERT INTO session_users (room_id, user_id)
           VALUES ($1, $2)
           ON CONFLICT (room_id, user_id) DO NOTHING`,
          [existingSessionRow.room_id, userId]
        );

        await client.query(
          `UPDATE sessions
           SET updated_at = CURRENT_TIMESTAMP
           WHERE room_id = $1`,
          [existingSessionRow.room_id]
        );

        const existingSessionUsersRes = await client.query(
          `SELECT user_id, has_submitted, has_left, last_active_at
           FROM session_users
           WHERE room_id = $1`,
          [existingSessionRow.room_id]
        );

        await client.query('COMMIT');

        // In memory session
        const existingSession = {
          roomId: existingSessionRow.room_id,
          matchId,
          questionId: existingSessionRow.question_id,
          users: existingSessionUsersRes.rows.map((user) => ({
            userId: user.user_id,
            hasSubmitted: user.has_submitted,
            hasLeft: user.has_left,
            lastActiveAt: user.last_active_at,
          })),
          status: existingSessionRow.status,
          submittedUsers: existingSessionUsersRes.rows
            .filter((user) => user.has_submitted)
            .map((user) => user.user_id),
          leftUsers: existingSessionUsersRes.rows
            .filter((user) => user.has_left)
            .map((user) => user.user_id),
          updatedAt: new Date().toISOString(),
        };

        this.sessions.set(existingSession.roomId, existingSession);
        this.matchToRoom.set(matchId, existingSession.roomId);

        return {
          roomId: existingSession.roomId,
          questionId: existingSession.questionId,
          status: existingSession.status,
          reused: true,
        };
      }

      await client.query(
        `INSERT INTO session_users (room_id, user_id)
        VALUES ($1, $2)`,
        [session.roomId, userId]
      );

      await client.query('COMMIT');

      // Store session in memory
      this.sessions.set(roomId, session);
      this.matchToRoom.set(matchId, roomId);

      const savedSession = sessionRes.rows[0];


      return {
        roomId: savedSession.room_id,
        questionId: savedSession.question_id,
        status: savedSession.status,
        reused: false,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  

  async reconnectSession({ userId, roomId }) {
    if (!userId || !roomId) {
      throw new Error('userId and roomId are required');
    }

    const session = this.sessions.get(roomId);

    if (!session) {
      return {
        success: false,
        message: 'Session not found',
      };
    }

    if (session.status === 'closed') {
      return {
        success: false,
        message: 'Session is closed',
      };
    }

    // MVP: allow rejoin if user was already in session, or add them if missing
    if (!this.hasUser(session, userId)) {
      session.users.push(this.createSessionUser(userId));
    }

    // If user had left before, remove from leftUsers
    session.leftUsers = session.leftUsers.filter((id) => id !== userId);
    session.updatedAt = new Date().toISOString();

    this.sessions.set(roomId, session);

    return {
      success: true,
      roomId: session.roomId,
      questionId: session.questionId,
      status: session.status,
      session,
    };
  }

  async leaveSession({ userId, roomId }) {
    if (!userId || !roomId) {
      throw new Error('userId and roomId are required');
    }

    const session = this.sessions.get(roomId);

    if (!session) {
      return {
        success: false,
        message: 'Session not found',
      };
    }

    if (!session.leftUsers.includes(userId)) {
      session.leftUsers.push(userId);
    }

    session.updatedAt = new Date().toISOString();

    // Example close rule:
    // if all known users have left, close session
    const allUsersLeft =
      session.users.length > 0 &&
      session.users.every((user) => session.leftUsers.includes(user.userId));

    if (allUsersLeft) {
      session.status = 'closed';
    }

    this.sessions.set(roomId, session);

    return {
      success: true,
      message: 'User left session successfully',
      status: session.status,
      session,
    };
  }

  async submitSession({ userId, partnerId, question, roomId, code }) {
    // verify room's session is active, user is part of session, etc.
    // verify code is valid (not empty) else store as "Missing Code"
    // end room session for both users
    // "you have submitted" notif for user a, "your partner has submitted" notif for user b (if still connected)


    if (!userId || !roomId) {
      throw new Error('userId and roomId are required');
    }

    const session = this.sessions.get(roomId);

    if (!session) {
      return {
        success: false,
        message: 'Session not found',
      };
    }

    if (session.status === 'closed') {
      return {
        success: false,
        message: 'Session is already closed',
      };
    }

    if (!session.submittedUsers.includes(userId)) {
      session.submittedUsers.push(userId);
    }

    session.lastSubmittedCode = code ?? 'Missing Code';
    session.updatedAt = new Date().toISOString();

    // Example rule:
    // close when all users in session have submitted
    const allUsersSubmitted =
      session.users.length > 0 &&
      session.users.every((user) => session.submittedUsers.includes(user.userId));

    if (allUsersSubmitted) {
      session.status = 'closed';
    }

    this.sessions.set(roomId, session);

    return {
      success: true,
      message: 'Session submitted successfully',
      status: session.status,
      session,
    };
  }

  async getSessionByRoomId(roomId) {
    return this.sessions.get(roomId) || null;
  }
}
