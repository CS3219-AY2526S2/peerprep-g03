// import 'dotenv/config';
// import http from 'http';
// import { WebSocketServer } from 'ws';
// import pg from 'pg';
// import * as Y from 'yjs';
// import jwt from 'jsonwebtoken';

// const { Pool } = pg;

// export function encodeBase64(uint8Array) {
//   return Buffer.from(uint8Array).toString('base64');
// }

// export function decodeBase64(base64) {
//   return new Uint8Array(Buffer.from(base64, 'base64'));
// }

// export function createPoolFromEnv() {
//   return new Pool({
//     host: process.env.PGHOST,
//     port: Number(process.env.PGPORT || 5432),
//     database: process.env.PGDATABASE,
//     user: process.env.PGUSER,
//     password: process.env.PGPASSWORD,
//   });
// }

// export function createCollabApp({
//   pool,
//   jwtSecret,
//   host = process.env.HOST || '0.0.0.0',
//   port = Number(process.env.PORT || 3012),
//   persistDelayMs = 1000,
//   logger = console,
// } = {}) {
//   if (!jwtSecret) {
//     throw new Error('Missing JWT_SECRET');
//   }

//   if (!pool) {
//     throw new Error('Missing pool');
//   }

//   const rooms = new Map();

//   const server = http.createServer((req, res) => {
//     if (req.url === '/health') {
//       res.writeHead(200, { 'Content-Type': 'application/json' });
//       res.end(JSON.stringify({ status: 'ok', service: 'collab-service-websocket' }));
//       return;
//     }

//     res.writeHead(404, { 'Content-Type': 'application/json' });
//     res.end(JSON.stringify({ error: 'Not found' }));
//   });

//   const wss = new WebSocketServer({ server });

//   async function ensureTable() {
//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS yjs_room_state (
//         room_id TEXT PRIMARY KEY,
//         doc_state BYTEA NOT NULL,
//         updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
//       )
//     `);
//   }

//   async function loadRoomFromDb(roomId) {
//     const { rows } = await pool.query(
//       `SELECT doc_state FROM yjs_room_state WHERE room_id = $1`,
//       [roomId]
//     );

//     const ydoc = new Y.Doc();

//     if (rows.length > 0 && rows[0].doc_state) {
//       const persisted = new Uint8Array(rows[0].doc_state);
//       Y.applyUpdate(ydoc, persisted);
//       logger.log(`[room:${roomId}] restored from Postgres`);
//     } else {
//       logger.log(`[room:${roomId}] new room`);
//     }

//     return ydoc;
//   }

//   async function persistRoomToDb(roomId, ydoc) {
//     const fullState = Y.encodeStateAsUpdate(ydoc);

//     await pool.query(
//       `
//       INSERT INTO yjs_room_state (room_id, doc_state, updated_at)
//       VALUES ($1, $2, NOW())
//       ON CONFLICT (room_id)
//       DO UPDATE SET
//         doc_state = EXCLUDED.doc_state,
//         updated_at = NOW()
//       `,
//       [roomId, Buffer.from(fullState)]
//     );

//     logger.log(`[room:${roomId}] persisted ${fullState.length} bytes`);
//   }

//   function schedulePersist(roomId) {
//     const room = rooms.get(roomId);
//     if (!room) return;

//     if (room.saveTimer) {
//       clearTimeout(room.saveTimer);
//     }

//     room.saveTimer = setTimeout(async () => {
//       try {
//         await persistRoomToDb(roomId, room.ydoc);
//       } catch (err) {
//         logger.error(`[room:${roomId}] persist failed:`, err);
//       }
//     }, persistDelayMs);
//   }

//   async function getOrCreateRoom(roomId) {
//     let room = rooms.get(roomId);
//     if (room) return room;

//     const ydoc = await loadRoomFromDb(roomId);

//     room = {
//       ydoc,
//       clients: new Set(),
//       saveTimer: null,
//     };

//     ydoc.on('update', () => {
//       schedulePersist(roomId);
//     });

//     rooms.set(roomId, room);
//     return room;
//   }

//   function broadcastToOthers(roomId, sender, payload) {
//     const room = rooms.get(roomId);
//     if (!room) return;

//     const text = JSON.stringify(payload);

//     for (const client of room.clients) {
//       if (client !== sender && client.readyState === client.OPEN) {
//         client.send(text);
//       }
//     }
//   }

//   function cleanupRoomIfEmpty(roomId) {
//     const room = rooms.get(roomId);
//     if (!room) return;

//     if (room.clients.size === 0) {
//       if (room.saveTimer) {
//         clearTimeout(room.saveTimer);
//         room.saveTimer = null;
//       }

//       room.ydoc.destroy();
//       rooms.delete(roomId);
//       logger.log(`[room:${roomId}] cleaned up from memory`);
//     }
//   }

//   function verifyJoinToken(token) {
//     try {
//       return jwt.verify(token, jwtSecret);
//     } catch {
//       return null;
//     }
//   }

//   wss.on('connection', async (ws) => {
//     let joinedRoomId = null;
//     let authUser = null;

//     ws.on('message', async (raw) => {
//       try {
//         const msg = JSON.parse(raw.toString());

//         if (msg.type === 'join') {
//           const roomId = String(msg.roomId || '').trim();
//           const token = String(msg.token || '').trim();
//           const claimedUsername = String(msg.username || '').trim();

//           if (!roomId) {
//             ws.send(JSON.stringify({ type: 'error', message: 'Missing roomId' }));
//             ws.close(1008, 'Missing roomId');
//             return;
//           }

//           if (!token) {
//             ws.send(JSON.stringify({ type: 'error', message: 'Missing token' }));
//             ws.close(1008, 'Missing token');
//             return;
//           }

//           const payload = verifyJoinToken(token);
//           if (!payload) {
//             ws.send(JSON.stringify({ type: 'error', message: 'Invalid or expired token' }));
//             ws.close(1008, 'Invalid token');
//             return;
//           }

//           const tokenUsername =
//             payload.username || payload.userName || payload.email || payload.sub;

//           if (claimedUsername && tokenUsername && claimedUsername !== tokenUsername) {
//             ws.send(JSON.stringify({ type: 'error', message: 'Token/user mismatch' }));
//             ws.close(1008, 'Token mismatch');
//             return;
//           }

//           authUser = tokenUsername || claimedUsername || 'unknown';

//           const room = await getOrCreateRoom(roomId);
//           room.clients.add(ws);
//           joinedRoomId = roomId;

//           const fullState = Y.encodeStateAsUpdate(room.ydoc);

//           ws.send(
//             JSON.stringify({
//               type: 'sync',
//               roomId,
//               update: encodeBase64(fullState),
//             })
//           );

//           ws.send(
//             JSON.stringify({
//               type: 'joined',
//               roomId,
//               user: authUser,
//             })
//           );

//           logger.log(`[room:${roomId}] client joined as ${authUser} (${room.clients.size} clients)`);
//           return;
//         }

//         if (msg.type === 'update') {
//           const roomId = String(msg.roomId || '').trim();

//           if (!authUser) {
//             ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
//             ws.close(1008, 'Unauthorized');
//             return;
//           }

//           if (!roomId || roomId !== joinedRoomId) {
//             ws.send(JSON.stringify({ type: 'error', message: 'Invalid roomId' }));
//             return;
//           }

//           const room = rooms.get(roomId);
//           if (!room) {
//             ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
//             return;
//           }

//           const update = decodeBase64(msg.update);
//           Y.applyUpdate(room.ydoc, update);

//           broadcastToOthers(roomId, ws, {
//             type: 'update',
//             roomId,
//             update: msg.update,
//           });

//           return;
//         }

//         if (msg.type === 'awareness') {
//           const roomId = String(msg.roomId || '').trim();

//           if (!authUser) {
//             ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
//             ws.close(1008, 'Unauthorized');
//             return;
//           }

//           if (!roomId || roomId !== joinedRoomId) {
//             ws.send(JSON.stringify({ type: 'error', message: 'Invalid roomId' }));
//             return;
//           }

//           const room = rooms.get(roomId);
//           if (!room) {
//             ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
//             return;
//           }

//           broadcastToOthers(roomId, ws, {
//             type: 'awareness',
//             roomId,
//             update: msg.update,
//           });

//           return;
//         }

//         if (msg.type === 'ping') {
//           ws.send(JSON.stringify({ type: 'pong' }));
//           return;
//         }

//         ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${msg.type}` }));
//       } catch (err) {
//         logger.error('message handling failed:', err);
//         ws.send(JSON.stringify({ type: 'error', message: 'Bad message' }));
//       }
//     });

//     ws.on('close', async () => {
//       if (!joinedRoomId) return;

//       const room = rooms.get(joinedRoomId);
//       if (!room) return;

//       room.clients.delete(ws);

//       try {
//         await persistRoomToDb(joinedRoomId, room.ydoc);
//       } catch (err) {
//         logger.error(`[room:${joinedRoomId}] persist on close failed:`, err);
//       }

//       cleanupRoomIfEmpty(joinedRoomId);
//     });

//     ws.on('error', (err) => {
//       logger.error('ws error:', err);
//     });
//   });

//   async function start() {
//     await ensureTable();

//     await new Promise((resolve) => {
//       server.listen(port, host, resolve);
//     });

//     logger.log(`collab-service-websocket listening on ws://${host}:${port}`);
//   }

//   async function stop() {
//     for (const [roomId, room] of rooms.entries()) {
//       if (room.saveTimer) {
//         clearTimeout(room.saveTimer);
//       }
//       room.ydoc.destroy();
//       rooms.delete(roomId);
//     }

//     await new Promise((resolve, reject) => {
//       wss.close((err) => (err ? reject(err) : resolve()));
//     });

//     await new Promise((resolve, reject) => {
//       server.close((err) => (err ? reject(err) : resolve()));
//     });
//   }

//   return {
//     server,
//     wss,
//     rooms,
//     start,
//     stop,
//     ensureTable,
//     loadRoomFromDb,
//     persistRoomToDb,
//     getOrCreateRoom,
//     verifyJoinToken,
//   };
// }

