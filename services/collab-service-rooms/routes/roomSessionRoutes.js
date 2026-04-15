// router.post('/start', controller.startSession)
// router.post('/reconnect', controller.reconnect)

import express from 'express';

export function createRoomSessionRoutes(roomSessionController) {
  const router = express.Router();

  router.post('/start', roomSessionController.startSession);
  router.post('/reconnect', roomSessionController.reconnectSession);
  router.post('/disconnect', roomSessionController.disconnectSession);
  router.post('/leave', roomSessionController.leaveSession);
  router.post('/submit', roomSessionController.submitSession);
  router.get('/:roomId', roomSessionController.getSession);

  return router;
}
