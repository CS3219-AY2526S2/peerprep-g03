// create room
// reuse room if exists
// validate user
// track session status
import { pool } from '../pool.js';

const USER_SESSION_STATUS = {
  ACTIVE: 'active',
  SUBMITTED: 'submitted',
  LEFT: 'left',
  DISCONNECTED: 'disconnected',
};

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
      userStatus: USER_SESSION_STATUS.ACTIVE,
      lastActiveAt: new Date().toISOString(),
    };
  }

  hasUser(session, userId) {
    return session.users.some((user) => user.userId === userId);
  }

  isActiveUserStatus(userStatus) {
    return userStatus === USER_SESSION_STATUS.ACTIVE;
  }

  isSubmittedUserStatus(userStatus) {
    return userStatus === USER_SESSION_STATUS.SUBMITTED;
  }

  isLeftUserStatus(userStatus) {
    return userStatus === USER_SESSION_STATUS.LEFT;
  }

  isDisconnectedUserStatus(userStatus) {
    return userStatus === USER_SESSION_STATUS.DISCONNECTED;
  }

  getSessionUser(session, userId) {
    return session.users.find((user) => user.userId === userId) || null;
  }

  mapSessionUserRow(user) {
    return {
      userId: user.user_id,
      userStatus: user.user_status,
      lastActiveAt: user.last_active_at,
    };
  }

  buildSessionSnapshot(sessionRow, sessionUsersRows) {
    return {
      roomId: sessionRow.room_id,
      matchId: sessionRow.match_id,
      questionId: sessionRow.question_id,
      users: sessionUsersRows.map((user) => this.mapSessionUserRow(user)),
      status: sessionRow.status,
      submittedUsers: sessionUsersRows
        .filter((user) => this.isSubmittedUserStatus(user.user_status))
        .map((user) => user.user_id),
      leftUsers: sessionUsersRows
        .filter((user) => this.isLeftUserStatus(user.user_status))
        .map((user) => user.user_id),
      updatedAt: new Date().toISOString(),
    };
  }

  async hydrateSessionFromDb(roomId) {
    const sessionRes = await pool.query(
      `SELECT room_id, match_id, question_id, status
       FROM sessions
       WHERE room_id = $1
       LIMIT 1`,
      [roomId]
    );

    const sessionRow = sessionRes.rows[0];
    if (!sessionRow) {
      return null;
    }

    const sessionUsersRes = await pool.query(
      `SELECT user_id, user_status, last_active_at
       FROM session_users
       WHERE room_id = $1`,
      [roomId]
    );

    const hydratedSession = this.buildSessionSnapshot(sessionRow, sessionUsersRes.rows);

    this.matchToRoom.set(hydratedSession.matchId, roomId);
    this.sessions.set(roomId, hydratedSession);

    return hydratedSession;
  }

  async getPartnerForRoom(roomId, userId) {
    const partnerRes = await pool.query(
      `SELECT user_id
       FROM session_users
       WHERE room_id = $1 AND user_id != $2 AND user_status IN ('active', 'submitted', 'disconnected')
       LIMIT 1`,
      [roomId, userId]
    );

    return partnerRes.rows[0]?.user_id || null;
  }

  async findActiveRoomIdForUser(userId) {
    const activeSessionRes = await pool.query(
      `SELECT s.room_id
       FROM sessions s
       JOIN session_users su ON s.room_id = su.room_id
       WHERE su.user_id = $1
         AND s.status = 'active'
         AND su.user_status IN ('active', 'submitted', 'disconnected')
       ORDER BY s.updated_at DESC
       LIMIT 1`,
      [userId]
    );

    return activeSessionRes.rows[0]?.room_id || null;
  }

  // Insert a new session per match, insert a session user per user, should account for race conditions
  async startSession({ userId, matchId }) {
    if (!userId || !matchId) {
      throw new Error('userId and matchId are required');
    }
    const userActiveSessionRes = await pool.query(
      `SELECT s.room_id, s.question_id, s.status, s.match_id, su.user_status, s.updated_at
       FROM sessions s
       JOIN session_users su ON s.room_id = su.room_id
       WHERE su.user_id = $1 
         AND s.status = 'active'
         AND su.user_status IN ('active', 'submitted', 'disconnected')
         AND s.match_id != 'private-room'
       LIMIT 1`,
      [userId]
    );

    console.log('Active session check for user:', userId, userActiveSessionRes.rows);

    const row = userActiveSessionRes.rows[0];

    if (row && (matchId === "REJOIN_CHECK" || matchId === row.match_id)) {
        // Calculate if the session is "Stale" (Older than 30 mins)
        const lastUpdate = new Date(row.updated_at);
        const diffInMinutes = (new Date().getTime() - lastUpdate.getTime()) / (1000 * 60);
        const isStale = diffInMinutes > 3;
        const partner = await this.getPartnerForRoom(row.room_id, userId);

        return {
            roomId: row.room_id,
            questionId: row.question_id,
            status: row.status,
            partner,
            reconnected: true,
            userStatus: row.user_status,
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
        `SELECT user_id, user_status, last_active_at
         FROM session_users
         WHERE room_id = $1`,
        [existingRoomId]
      );

      const existingSession = this.sessions.get(existingRoomId) ?? this.buildSessionSnapshot(
        {
          room_id: existingSessionRow.room_id,
          match_id: matchId,
          question_id: existingSessionRow.question_id,
          status: existingSessionRow.status,
        },
        existingSessionUsersRes.rows
      );

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
          `UPDATE session_users
           SET user_status = $3,
               last_active_at = CURRENT_TIMESTAMP
           WHERE room_id = $1 AND user_id = $2`,
          [existingSession.roomId, userId, USER_SESSION_STATUS.ACTIVE]
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
          `SELECT user_id, user_status, last_active_at
           FROM session_users
           WHERE room_id = $1`,
          [existingSessionRow.room_id]
        );

        await client.query('COMMIT');

        // In memory session
        const existingSession = this.buildSessionSnapshot(
          {
            room_id: existingSessionRow.room_id,
            match_id: matchId,
            question_id: existingSessionRow.question_id,
            status: existingSessionRow.status,
          },
          existingSessionUsersRes.rows
        );

        this.sessions.set(existingSession.roomId, existingSession);
        this.matchToRoom.set(matchId, existingSession.roomId);

        return {
          roomId: existingSession.roomId,
          questionId: existingSession.questionId,
          status: existingSession.status,
          reused: true,
        };
      }

      // MVP: allow rejoin if user was already in session, or add them if missing
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
    console.log(`Attempting to reconnect user ${userId} to room ${roomId} in backend`);

    if (!userId || !roomId) {
      throw new Error('userId and roomId are required');
    }

    let session = this.sessions.get(roomId);
    if (!session) {
      session = await this.hydrateSessionFromDb(roomId);
    }

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

    const sessionUser = this.getSessionUser(session, userId);
    if (!sessionUser) {
      return {
        success: false,
        message: 'User is not part of this session',
      };
    }

    if (this.isLeftUserStatus(sessionUser.userStatus)) {
      return {
        success: false,
        message: 'Cannot reconnect to a room after leaving it',
      };
    }

    console.log(`Current user status: ${sessionUser.userStatus}`);
    if (!(this.isDisconnectedUserStatus(sessionUser.userStatus) || this.isActiveUserStatus(sessionUser.userStatus))) {
      return {
        success: false,
        message: 'User must be disconnected before reconnecting',
      };
    }

    await pool.query(
      `UPDATE session_users
       SET user_status = $3,
           last_active_at = CURRENT_TIMESTAMP
       WHERE room_id = $1 AND user_id = $2`,
      [roomId, userId, USER_SESSION_STATUS.ACTIVE]
    );

    await pool.query(
      `UPDATE sessions
       SET updated_at = CURRENT_TIMESTAMP
       WHERE room_id = $1`,
      [roomId]
    );

    if (!this.hasUser(session, userId)) {
      session.users.push(this.createSessionUser(userId));
    } else {
      session.users = session.users.map((user) =>
        user.userId === userId
          ? { ...user, userStatus: USER_SESSION_STATUS.ACTIVE, lastActiveAt: new Date().toISOString() }
          : user
      );
    }

    
    session.leftUsers = session.leftUsers.filter((id) => id !== userId);
    session.updatedAt = new Date().toISOString();

    this.sessions.set(roomId, session);

    const partner = await this.getPartnerForRoom(roomId, userId);

    return {
      success: true,
      roomId: session.roomId,
      questionId: session.questionId,
      status: session.status,
      partner,
      session,
    };
  }

  async disconnectSession({ userId, roomId }) {
    if (!userId) {
      throw new Error('userId is required');
    }

    const targetRoomId = roomId || await this.findActiveRoomIdForUser(userId);
    if (!targetRoomId) {
      return {
        success: false,
        message: 'Session not found',
      };
    }

    let session = this.sessions.get(targetRoomId);
    if (!session) {
      session = await this.hydrateSessionFromDb(targetRoomId);
    }

    if (!session) {
      return {
        success: false,
        message: 'Session not found',
      };
    }

    const sessionUser = this.getSessionUser(session, userId);
    if (!sessionUser) {
      return {
        success: false,
        message: 'User is not part of this session',
      };
    }

    if (this.isLeftUserStatus(sessionUser.userStatus)) {
      return {
        success: false,
        message: 'Cannot disconnect from a room after leaving it',
      };
    }

    await pool.query(
      `UPDATE session_users
       SET user_status = $3,
           last_active_at = CURRENT_TIMESTAMP
       WHERE room_id = $1 AND user_id = $2`,
      [targetRoomId, userId, USER_SESSION_STATUS.DISCONNECTED]
    );

    await pool.query(
      `UPDATE sessions
       SET updated_at = CURRENT_TIMESTAMP
       WHERE room_id = $1`,
      [targetRoomId]
    );

    const sessionUsersRes = await pool.query(
      `SELECT user_id, user_status, last_active_at
       FROM session_users
       WHERE room_id = $1`,
      [targetRoomId]
    );

    const nextSession = this.buildSessionSnapshot(
      {
        room_id: session.roomId,
        match_id: session.matchId,
        question_id: session.questionId,
        status: session.status,
      },
      sessionUsersRes.rows
    );

    this.sessions.set(targetRoomId, nextSession);

    return {
      success: true,
      roomId: targetRoomId,
      message: 'User disconnected from session successfully',
      status: session.status,
      session: nextSession,
    };
  }

  async leaveSession({ userId, roomId }) {
    if (!userId) {
      throw new Error('userId is required');
    }

    const targetRoomId = roomId || await this.findActiveRoomIdForUser(userId);
    if (!targetRoomId) {
      return {
        success: false,
        message: 'Session not found',
      };
    }

    let session = this.sessions.get(targetRoomId);
    if (!session) {
      session = await this.hydrateSessionFromDb(targetRoomId);
    }

    if (!session) {
      return {
        success: false,
        message: 'Session not found',
      };
    }

    await pool.query(
      `UPDATE session_users
       SET user_status = $3,
           last_active_at = CURRENT_TIMESTAMP
       WHERE room_id = $1 AND user_id = $2`,
      [targetRoomId, userId, USER_SESSION_STATUS.LEFT]
    );

    const sessionUsersRes = await pool.query(
      `SELECT user_id, user_status, last_active_at
       FROM session_users
       WHERE room_id = $1`,
      [targetRoomId]
    );

    const allUsersLeft =
      sessionUsersRes.rows.length > 0 &&
      sessionUsersRes.rows.every((user) => this.isLeftUserStatus(user.user_status));

    const nextStatus = allUsersLeft ? 'closed' : session.status;

    await pool.query(
      `UPDATE sessions
       SET status = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE room_id = $1`,
      [targetRoomId, nextStatus]
    );

    const nextSession = this.buildSessionSnapshot(
      {
        room_id: session.roomId,
        match_id: session.matchId,
        question_id: session.questionId,
        status: nextStatus,
      },
      sessionUsersRes.rows
    );

    if (nextStatus === 'closed') {
      this.sessions.delete(targetRoomId);
      this.matchToRoom.delete(nextSession.matchId);
    } else {
      this.sessions.set(targetRoomId, nextSession);
    }

    return {
      success: true,
      roomId: targetRoomId,
      message: 'User left session successfully',
      status: nextStatus,
      session: nextStatus === 'closed' ? null : nextSession,
    };
  }

  async submitSession({ userId, roomId, code }) {
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
        return { success: false, message: 'Session not found' };
      }

      if (sessionRow.status === 'closed') {
        await client.query('ROLLBACK');
        return { success: false, message: 'Session is already closed' };
      }

      // Verify/Insert submitting user
      await client.query(
        `INSERT INTO session_users (room_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (room_id, user_id) DO NOTHING`,
        [roomId, userId]
      );

      await client.query(
        `UPDATE session_users
         SET user_status = $3,
             last_active_at = CURRENT_TIMESTAMP
         WHERE room_id = $1 AND user_id = $2`,
        [roomId, userId, USER_SESSION_STATUS.SUBMITTED]
      );

      // Insert/Update submission record
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
        `SELECT user_id, user_status, last_active_at
         FROM session_users
         WHERE room_id = $1`,
        [roomId]
      );

      const allUsersSubmitted =
        sessionUsersRes.rows.length > 0 &&
        sessionUsersRes.rows.every((user) => this.isSubmittedUserStatus(user.user_status));

      const nextStatus = allUsersSubmitted ? 'closed' : sessionRow.status;

      // Update session status and timestamp
      await client.query(
        `UPDATE sessions
         SET status = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE room_id = $1`,
        [roomId, nextStatus]
      );

      await client.query('COMMIT');

      // --- ADDED: MEMORY MANAGEMENT LOGIC ---
      
      if (nextStatus === 'closed') {
        // 1. If the session is closed, remove it from memory completely
        // This ensures REJOIN_CHECK won't find it in the cache
        this.sessions.delete(roomId);
        this.matchToRoom.delete(sessionRow.match_id);
      } else {
        // 2. If session is still active (waiting for partner), update the memory object
        const session = {
          ...this.buildSessionSnapshot(sessionRow, sessionUsersRes.rows),
          lastSubmittedCode: code ?? 'Missing Code',
        };

        this.sessions.set(roomId, session);
        this.matchToRoom.set(session.matchId, roomId);
      }
      // --- END OF MEMORY MANAGEMENT ---

      return {
        success: true,
        message: 'Session submitted successfully',
        status: nextStatus,
        // We return the local session object or a null if closed
        session: nextStatus === 'closed' ? null : this.sessions.get(roomId),
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

    return this.hydrateSessionFromDb(roomId);
  }
}
