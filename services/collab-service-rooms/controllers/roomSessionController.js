// POST /room-sessions/start
// POST /room-sessions/reconnect
// POST /room-sessions/leave

export class RoomSessionController {
  constructor(roomSessionService) {
    this.roomSessionService = roomSessionService;
  }

  startSession = async (req, res) => {
    try {
      const { userId, matchId } = req.body;

      if (!userId || !matchId) {
        return res.status(400).json({
          error: 'userId and matchId are required',
        });
      }

      const result = await this.roomSessionService.startSession({
        userId,
        matchId,
      });

      return res.status(201).json(result);
    } catch (error) {
      console.error('startSession error:', error);
      return res.status(500).json({
        error: error.message || 'Failed to start room session',
      });
    }
  };

  getRejoinableSession = async (req, res) => {
    try {
      const { userId } = req.body;
      const result = await this.roomSessionService.findRejoinableRoomForUser(userId);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  reconnectSession = async (req, res) => {
    try {
      const { userId, roomId } = req.body;

      if (!userId || !roomId) {
        return res.status(400).json({
          error: 'userId and roomId are required',
        });
      }

      const result = await this.roomSessionService.reconnectSession({
        userId,
        roomId,
      });

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error('reconnectSession error:', error);
      return res.status(500).json({
        error: error.message || 'Failed to reconnect room session',
      });
    }
  };

  leaveSession = async (req, res) => {
    try {
      const { userId, roomId } = req.body;

      if (!userId) {
        return res.status(400).json({
          error: 'userId is required',
        });
      }

      const result = await this.roomSessionService.leaveSession({
        userId,
        roomId,
      });

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error('leaveSession error:', error);
      return res.status(500).json({
        error: error.message || 'Failed to leave room session',
      });
    }
  };

  disconnectSession = async (req, res) => {
    try {
      const { userId, roomId } = req.body;

      if (!userId) {
        return res.status(400).json({
          error: 'userId is required',
        });
      }

      const result = await this.roomSessionService.disconnectSession({
        userId,
        roomId,
      });

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error('disconnectSession error:', error);
      return res.status(500).json({
        error: error.message || 'Failed to disconnect room session',
      });
    }
  };

  submitSession = async (req, res) => {
    try {
      const { userId, partnerId, question, roomId, code } = req.body;

      if (!userId || !roomId) {
        return res.status(400).json({
          error: 'userId and roomId are required',
        });
      }

      const result = await this.roomSessionService.submitSession({
        userId,
        partnerId,
        question,
        roomId,
        code,
      });

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error('submitSession error:', error);
      return res.status(500).json({
        error: error.message || 'Failed to submit room session',
      });
    }
  };

  getSession = async (req, res) => {
    try {
      const { roomId } = req.params;

      if (!roomId) {
        return res.status(400).json({
          error: 'roomId is required',
        });
      }

      const session = await this.roomSessionService.getSessionByRoomId(roomId);

      if (!session) {
        return res.status(404).json({
          error: 'Session not found',
        });
      }

      return res.status(200).json(session);
    } catch (error) {
      console.error('getSession error:', error);
      return res.status(500).json({
        error: error.message || 'Failed to get room session',
      });
    }
  };
}
