import { pool } from '../pool.js';

const USER_SESSION_STATUS = {
  ACTIVE: 'active',
  SUBMITTED: 'submitted',
  LEFT: 'left',
  DISCONNECTED: 'disconnected',
};

const SESSION_STATUS = {
  ACTIVE: 'active',
  CLOSED: 'closed',
};

const STALE_TIMEOUT_MINUTES = 30;

export class RoomSessionService {
  constructor() {
    this.sessions = new Map();
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
       WHERE room_id = $1
         AND user_id != $2
         AND user_status IN ('active', 'submitted', 'disconnected')
       LIMIT 1`,
      [roomId, userId]
    );

    return partnerRes.rows[0]?.user_id || null;
  }

  async findRejoinableRoomForUser(userId) {
    const sessionRes = await pool.query(
      `SELECT
          s.room_id,
          s.match_id,
          s.question_id,
          s.status,
          su.user_status,
          su.last_active_at
       FROM sessions s
       JOIN session_users su ON s.room_id = su.room_id
       WHERE su.user_id = $1
         AND s.status = 'active'
         AND su.user_status IN ('active', 'disconnected')
         AND s.match_id != 'private-room'
       ORDER BY su.last_active_at DESC
       LIMIT 1`,
      [userId]
    );

    const row = sessionRes.rows[0];
    if (!row) {
      return null;
    }

    const partner = await this.getPartnerForRoom(row.room_id, userId);
    const lastActive = new Date(row.last_active_at);
    const diffInMinutes = (Date.now() - lastActive.getTime()) / (1000 * 60);
    const isStale = diffInMinutes > STALE_TIMEOUT_MINUTES;

    return {
      roomId: row.room_id,
      matchId: row.match_id,
      questionId: row.question_id,
      status: row.status,
      userStatus: row.user_status,
      partner,
      isStale,
    };
  }

  async findActiveRoomIdForUser(userId) {
    const activeSessionRes = await pool.query(
      `SELECT s.room_id
       FROM sessions s
       JOIN session_users su ON s.room_id = su.room_id
       WHERE su.user_id = $1
         AND s.status = 'active'
         AND su.user_status IN ('active', 'disconnected')
       ORDER BY su.last_active_at DESC
       LIMIT 1`,
      [userId]
    );

    return activeSessionRes.rows[0]?.room_id || null;
  }

  async startSession({ userId, matchId }) {
    if (!userId || !matchId) {
      throw new Error('userId and matchId are required');
    }

    const existingSessionRes = await pool.query(
      `SELECT room_id, question_id, status
       FROM sessions
       WHERE match_id = $1
         AND status = 'active'
       ORDER BY updated_at DESC
       LIMIT 1`,
      [matchId]
    );

    const existingSessionRow = existingSessionRes.rows[0];

    if (existingSessionRow) {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        await client.query(
          `INSERT INTO session_users (room_id, user_id)
           VALUES ($1, $2)
           ON CONFLICT (room_id, user_id) DO NOTHING`,
          [existingSessionRow.room_id, userId]
        );

        await client.query(
          `UPDATE session_users
           SET user_status = $3,
               last_active_at = CURRENT_TIMESTAMP
           WHERE room_id = $1 AND user_id = $2`,
          [existingSessionRow.room_id, userId, USER_SESSION_STATUS.ACTIVE]
        );

        await client.query(
          `UPDATE sessions
           SET updated_at = CURRENT_TIMESTAMP
           WHERE room_id = $1`,
          [existingSessionRow.room_id]
        );

        const sessionUsersRes = await client.query(
          `SELECT user_id, user_status, last_active_at
           FROM session_users
           WHERE room_id = $1`,
          [existingSessionRow.room_id]
        );

        await client.query('COMMIT');

        const existingSession = this.buildSessionSnapshot(
          {
            room_id: existingSessionRow.room_id,
            match_id: matchId,
            question_id: existingSessionRow.question_id,
            status: existingSessionRow.status,
          },
          sessionUsersRes.rows
        );

        this.sessions.set(existingSession.roomId, existingSession);
        this.matchToRoom.set(matchId, existingSession.roomId);

        const partner = await this.getPartnerForRoom(existingSession.roomId, userId);

        return {
          roomId: existingSession.roomId,
          questionId: existingSession.questionId,
          status: existingSession.status,
          partner,
          userStatus: USER_SESSION_STATUS.ACTIVE,
          reused: true,
        };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    const roomId = this.generateRoomId();

    const session = {
      roomId,
      matchId,
      questionId: 'sample-question-id',
      users: [this.createSessionUser(userId)],
      status: SESSION_STATUS.ACTIVE,
      submittedUsers: [],
      leftUsers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

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

      if (sessionRes.rows.length === 0) {
        const raceWinnerRes = await client.query(
          `SELECT room_id, question_id, status
           FROM sessions
           WHERE match_id = $1
           LIMIT 1`,
          [matchId]
        );

        const raceWinner = raceWinnerRes.rows[0];

        await client.query(
          `INSERT INTO session_users (room_id, user_id)
           VALUES ($1, $2)
           ON CONFLICT (room_id, user_id) DO NOTHING`,
          [raceWinner.room_id, userId]
        );

        await client.query(
          `UPDATE session_users
           SET user_status = $3,
               last_active_at = CURRENT_TIMESTAMP
           WHERE room_id = $1 AND user_id = $2`,
          [raceWinner.room_id, userId, USER_SESSION_STATUS.ACTIVE]
        );

        await client.query(
          `UPDATE sessions
           SET updated_at = CURRENT_TIMESTAMP
           WHERE room_id = $1`,
          [raceWinner.room_id]
        );

        const sessionUsersRes = await client.query(
          `SELECT user_id, user_status, last_active_at
           FROM session_users
           WHERE room_id = $1`,
          [raceWinner.room_id]
        );

        await client.query('COMMIT');

        const existingSession = this.buildSessionSnapshot(
          {
            room_id: raceWinner.room_id,
            match_id: matchId,
            question_id: raceWinner.question_id,
            status: raceWinner.status,
          },
          sessionUsersRes.rows
        );

        this.sessions.set(existingSession.roomId, existingSession);
        this.matchToRoom.set(matchId, existingSession.roomId);

        const partner = await this.getPartnerForRoom(existingSession.roomId, userId);

        return {
          roomId: existingSession.roomId,
          questionId: existingSession.questionId,
          status: existingSession.status,
          partner,
          userStatus: USER_SESSION_STATUS.ACTIVE,
          reused: true,
        };
      }

      await client.query(
        `INSERT INTO session_users (room_id, user_id, user_status)
         VALUES ($1, $2, $3)`,
        [session.roomId, userId, USER_SESSION_STATUS.ACTIVE]
      );

      await client.query('COMMIT');

      this.sessions.set(roomId, session);
      this.matchToRoom.set(matchId, roomId);

      return {
        roomId,
        questionId: session.questionId,
        status: session.status,
        partner: null,
        userStatus: USER_SESSION_STATUS.ACTIVE,
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

    if (session.status === SESSION_STATUS.CLOSED) {
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
        message: 'Cannot reconnect after leaving this session',
      };
    }

    if (this.isSubmittedUserStatus(sessionUser.userStatus)) {
      return {
        success: false,
        message: 'User already submitted this session',
      };
    }

    if (!(this.isActiveUserStatus(sessionUser.userStatus) || this.isDisconnectedUserStatus(sessionUser.userStatus))) {
      return {
        success: false,
        message: 'User is not rejoinable',
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

    const sessionUsersRes = await pool.query(
      `SELECT user_id, user_status, last_active_at
       FROM session_users
       WHERE room_id = $1`,
      [roomId]
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

    this.sessions.set(roomId, nextSession);

    const partner = await this.getPartnerForRoom(roomId, userId);

    return {
      success: true,
      roomId,
      questionId: nextSession.questionId,
      status: nextSession.status,
      partner,
      session: nextSession,
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
        message: 'Cannot disconnect after leaving this session',
      };
    }

    if (this.isSubmittedUserStatus(sessionUser.userStatus)) {
      return {
        success: false,
        message: 'Submitted users do not need disconnect',
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
      message: 'User disconnected successfully',
      status: nextSession.status,
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

    const allUsersDoneOrGone =
      sessionUsersRes.rows.length > 0 &&
      sessionUsersRes.rows.every(
        (user) =>
          this.isLeftUserStatus(user.user_status) ||
          this.isSubmittedUserStatus(user.user_status)
      );

    const nextStatus = allUsersDoneOrGone ? SESSION_STATUS.CLOSED : session.status;

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

    if (nextStatus === SESSION_STATUS.CLOSED) {
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
      session: nextStatus === SESSION_STATUS.CLOSED ? null : nextSession,
    };
  }

  async submitSession({ userId, roomId, code }) {
    if (!userId || !roomId) {
      throw new Error('userId and roomId are required');
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

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

      if (sessionRow.status === SESSION_STATUS.CLOSED) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Session is already closed' };
      }

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

      const nextStatus = allUsersSubmitted ? SESSION_STATUS.CLOSED : sessionRow.status;

      await client.query(
        `UPDATE sessions
         SET status = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE room_id = $1`,
        [roomId, nextStatus]
      );

      await client.query('COMMIT');

      if (nextStatus === SESSION_STATUS.CLOSED) {
        this.sessions.delete(roomId);
        this.matchToRoom.delete(sessionRow.match_id);
      } else {
        const nextSession = this.buildSessionSnapshot(
          {
            room_id: sessionRow.room_id,
            match_id: sessionRow.match_id,
            question_id: sessionRow.question_id,
            status: nextStatus,
          },
          sessionUsersRes.rows
        );

        this.sessions.set(roomId, nextSession);
        this.matchToRoom.set(sessionRow.match_id, roomId);
      }

      return {
        success: true,
        message: 'Session submitted successfully',
        status: nextStatus,
        session: nextStatus === SESSION_STATUS.CLOSED ? null : this.sessions.get(roomId),
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