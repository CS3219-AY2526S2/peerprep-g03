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
    const userActiveSessionRes = await pool.query(
        `SELECT s.room_id, s.question_id, s.status, s.match_id, su.has_submitted, s.updated_at
         FROM sessions s
         JOIN session_users su ON s.room_id = su.room_id
         WHERE su.user_id = $1 
           AND s.status = 'active'
           AND s.match_id != 'private-room'
         LIMIT 1`,
        [userId]
    );

    const row = userActiveSessionRes.rows[0];

    if (row && (matchId === "REJOIN_CHECK" || matchId === row.match_id)) {
        // Calculate if the session is "Stale" (Older than 30 mins)
        const lastUpdate = new Date(row.updated_at);
        const diffInMinutes = (new Date().getTime() - lastUpdate.getTime()) / (1000 * 60);
        const isStale = diffInMinutes > 30;

        const partnerRes = await pool.query(
            `SELECT user_id FROM session_users WHERE room_id = $1 AND user_id != $2 LIMIT 1`,
            [row.room_id, userId]
        );

        return {
            roomId: row.room_id,
            questionId: row.question_id,
            status: row.status,
            partner: partnerRes.rows[0]?.user_id || 'Partner',
            reconnected: true,
            hasSubmitted: row.has_submitted,
            isStale: isStale // <--- Pass this to the frontend
        };
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
    await pool.query(
      `UPDATE session_users SET has_left = TRUE WHERE room_id = $1 AND user_id = $2`,
      [roomId, userId]
    );
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
      await pool.query(`UPDATE sessions SET status = 'closed' WHERE room_id = $1`, [roomId]);
    }
    this.sessions.set(roomId, session);

    return {
      success: true,
      message: 'User left session successfully',
      status: session.status,
      session,
    };
  }

  async submitSession({ userId, roomId, code }) {
    // verify room's session is active, user is part of session, etc.
    // verify code is valid (not empty) else store as "Missing Code"
    // end room session for both users
    // "you have submitted" notif for user a, "your partner has submitted" notif for user b (if still connected)

    if (!userId || !roomId) {
      throw new Error('userId and roomId are required');
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Verify session exists and is active
      const sessionRes = await client.query(
        `SELECT room_id, match_id, question_id, status
         FROM sessions
         WHERE room_id = $1
         LIMIT 1`,
        [roomId]
      );

      const sessionRow = sessionRes.rows[0];
      if (!sessionRow) {
        await client.query('ROLLBACK');
        return {
          success: false,
          message: 'Session not found',
        };
      }

      if (sessionRow.status === 'closed') {
        await client.query('ROLLBACK');
        return {
          success: false,
          message: 'Session is already closed',
        };
      }

      // Verify submitting user is part of session
      await client.query(
        `INSERT INTO session_users (room_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (room_id, user_id) DO NOTHING`,
        [roomId, userId]
      );

      await client.query(
        `UPDATE session_users
         SET has_submitted = TRUE,
             last_active_at = CURRENT_TIMESTAMP
         WHERE room_id = $1 AND user_id = $2`,
        [roomId, userId]
      );

      // Insert submission record, update to lastest code if submission for room id exists
      await client.query(
        `INSERT INTO submissions (room_id, submitted_by_user_id, code)
         VALUES ($1, $2, $3)
         ON CONFLICT (room_id)
         DO UPDATE SET
           submitted_by_user_id = EXCLUDED.submitted_by_user_id,
           code = EXCLUDED.code,
           submitted_at = CURRENT_TIMESTAMP`,
        [roomId, userId, code ?? 'Missing Code']
      );

      const sessionUsersRes = await client.query(
        `SELECT user_id, has_submitted, has_left, last_active_at
         FROM session_users
         WHERE room_id = $1`,
        [roomId]
      );

      // Close session if both users have submitted
      const allUsersSubmitted =
        sessionUsersRes.rows.length > 0 &&
        sessionUsersRes.rows.every((user) => user.has_submitted);

      const nextStatus = allUsersSubmitted ? 'closed' : sessionRow.status;

      await client.query(
        `UPDATE sessions
         SET status = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE room_id = $1`,
        [roomId, nextStatus]
      );

      await client.query('COMMIT');

      // Update in-memory session
      const session = {
        roomId: sessionRow.room_id,
        matchId: sessionRow.match_id,
        questionId: sessionRow.question_id,
        users: sessionUsersRes.rows.map((user) => ({
          userId: user.user_id,
          hasSubmitted: user.has_submitted,
          hasLeft: user.has_left,
          lastActiveAt: user.last_active_at,
        })),
        status: nextStatus,
        submittedUsers: sessionUsersRes.rows
          .filter((user) => user.has_submitted)
          .map((user) => user.user_id),
        leftUsers: sessionUsersRes.rows
          .filter((user) => user.has_left)
          .map((user) => user.user_id),
        lastSubmittedCode: code ?? 'Missing Code',
        updatedAt: new Date().toISOString(),
      };

      this.matchToRoom.set(session.matchId, roomId);
      this.sessions.set(roomId, session);

      return {
        success: true,
        message: 'Session submitted successfully',
        status: session.status,
        session,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getSessionByRoomId(roomId) {
    const session = this.sessions.get(roomId);

    if (session) {
      return session;
    }

    const sessionRes = await pool.query(
      `SELECT room_id, match_id, question_id, status
       FROM sessions
       WHERE room_id = $1
       LIMIT 1`,
      [roomId]
    );

    const sessionRow = sessionRes.rows[0];
    if (!sessionRow) {
      return {
        success: false,
        message: 'Session not found',
      } || null;
    }

    const sessionUsersRes = await pool.query(
      `SELECT user_id, has_submitted, has_left, last_active_at
       FROM session_users
       WHERE room_id = $1`,
      [roomId]
    );

    const hydratedSession = {
      roomId: sessionRow.room_id,
      matchId: sessionRow.match_id,
      questionId: sessionRow.question_id,
      users: sessionUsersRes.rows.map((user) => ({
        userId: user.user_id,
        hasSubmitted: user.has_submitted,
        hasLeft: user.has_left,
        lastActiveAt: user.last_active_at,
      })),
      status: sessionRow.status,
      submittedUsers: sessionUsersRes.rows
        .filter((user) => user.has_submitted)
        .map((user) => user.user_id),
      leftUsers: sessionUsersRes.rows
        .filter((user) => user.has_left)
        .map((user) => user.user_id),
      updatedAt: new Date().toISOString(),
    };

    this.matchToRoom.set(hydratedSession.matchId, roomId);
    this.sessions.set(roomId, hydratedSession);

    return hydratedSession;
  }
}
