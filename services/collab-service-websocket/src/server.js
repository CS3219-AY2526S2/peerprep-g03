import 'dotenv/config';
import http from 'http';
import { WebSocketServer } from 'ws';
import pg from 'pg';
import * as Y from 'yjs';
import jwt from 'jsonwebtoken';

const { Pool } = pg;

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 3004);
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET');
}

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'collab-service-websocket' }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

const wss = new WebSocketServer({ server });

const rooms = new Map();

function encodeBase64(uint8Array) {
  return Buffer.from(uint8Array).toString('base64');
}

function decodeBase64(base64) {
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS yjs_room_state (
      room_id TEXT PRIMARY KEY,
      doc_state BYTEA NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function loadRoomFromDb(roomId) {
  const { rows } = await pool.query(
    `SELECT doc_state FROM yjs_room_state WHERE room_id = $1`,
    [roomId]
  );

  const ydoc = new Y.Doc();

  if (rows.length > 0 && rows[0].doc_state) {
    const persisted = new Uint8Array(rows[0].doc_state);
    Y.applyUpdate(ydoc, persisted);
    console.log(`[room:${roomId}] restored from Postgres`);
  } else {
    console.log(`[room:${roomId}] new room`);
  }

  return ydoc;
}

async function persistRoomToDb(roomId, ydoc) {
  const fullState = Y.encodeStateAsUpdate(ydoc);

  await pool.query(
    `
    INSERT INTO yjs_room_state (room_id, doc_state, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (room_id)
    DO UPDATE SET
      doc_state = EXCLUDED.doc_state,
      updated_at = NOW()
    `,
    [roomId, Buffer.from(fullState)]
  );

  console.log(`[room:${roomId}] persisted ${fullState.length} bytes`);
}

function schedulePersist(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  if (room.saveTimer) {
    clearTimeout(room.saveTimer);
  }

  room.saveTimer = setTimeout(async () => {
    try {
      await persistRoomToDb(roomId, room.ydoc);
    } catch (err) {
      console.error(`[room:${roomId}] persist failed:`, err);
    }
  }, 1000);
}

async function getOrCreateRoom(roomId) {
  let room = rooms.get(roomId);
  if (room) return room;

  const ydoc = await loadRoomFromDb(roomId);

  room = {
    ydoc,
    clients: new Set(),
    saveTimer: null,
  };

  ydoc.on('update', () => {
    schedulePersist(roomId);
  });

  rooms.set(roomId, room);
  return room;
}

function broadcastToAll(roomId, payload) {
  const room = rooms.get(roomId);
  if (!room) return;

  const text = JSON.stringify(payload);

  for (const client of room.clients) {
    if (client.readyState === client.OPEN) {
      client.send(text);
    }
  }
}

function broadcastToOthers(roomId, sender, payload) {
  const room = rooms.get(roomId);
  if (!room) return;

  const text = JSON.stringify(payload);

  for (const client of room.clients) {
    if (client !== sender && client.readyState === client.OPEN) {
      client.send(text);
    }
  }
}

function cleanupRoomIfEmpty(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  if (room.clients.size === 0) {
    if (room.saveTimer) {
      clearTimeout(room.saveTimer);
      room.saveTimer = null;
    }

    room.ydoc.destroy();
    rooms.delete(roomId);
    console.log(`[room:${roomId}] cleaned up from memory`);
  }
}

function verifyJoinToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

wss.on('connection', async (ws) => {
  let joinedRoomId = null;
  let authUser = null;

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === 'join') {
        const roomId = String(msg.roomId || '').trim();
        const token = String(msg.token || '').trim();
        const claimedUsername = String(msg.username || '').trim();

        if (!roomId) {
          ws.send(JSON.stringify({ type: 'error', message: 'Missing roomId' }));
          ws.close(1008, 'Missing roomId');
          return;
        }

        if (!token) {
          ws.send(JSON.stringify({ type: 'error', message: 'Missing token' }));
          ws.close(1008, 'Missing token');
          return;
        }

        const payload = verifyJoinToken(token);
        if (!payload) {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid or expired token' }));
          ws.close(1008, 'Invalid token');
          return;
        }

        const tokenUsername =
          payload.username || payload.userName || payload.email || payload.sub;

        if (claimedUsername && tokenUsername && claimedUsername !== tokenUsername) {
          ws.send(JSON.stringify({ type: 'error', message: 'Token/user mismatch' }));
          ws.close(1008, 'Token mismatch');
          return;
        }

        authUser = tokenUsername || claimedUsername || 'unknown';

        const room = await getOrCreateRoom(roomId);
        room.clients.add(ws);
        joinedRoomId = roomId;

        const fullState = Y.encodeStateAsUpdate(room.ydoc);

        ws.send(
          JSON.stringify({
            type: 'sync',
            roomId,
            update: encodeBase64(fullState),
          })
        );

        ws.send(
          JSON.stringify({
            type: 'joined',
            roomId,
            user: authUser,
          })
        );

        console.log(`[room:${roomId}] client joined as ${authUser} (${room.clients.size} clients)`);
        return;
      }

      if (msg.type === 'update') {
        const roomId = String(msg.roomId || '').trim();

        if (!authUser) {
          ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
          ws.close(1008, 'Unauthorized');
          return;
        }

        if (!roomId || roomId !== joinedRoomId) {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid roomId' }));
          return;
        }

        const room = rooms.get(roomId);
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
          return;
        }

        const update = decodeBase64(msg.update);
        Y.applyUpdate(room.ydoc, update);

        broadcastToOthers(roomId, ws, {
          type: 'update',
          roomId,
          update: msg.update,
        });

        return;
      }

      if (msg.type === 'awareness') {
        const roomId = String(msg.roomId || '').trim();

        if (!authUser) {
          ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
          ws.close(1008, 'Unauthorized');
          return;
        }

        if (!roomId || roomId !== joinedRoomId) {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid roomId' }));
          return;
        }

        const room = rooms.get(roomId);
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
          return;
        }

        // Awareness is ephemeral: relay only, do not persist.
        broadcastToOthers(roomId, ws, {
          type: 'awareness',
          roomId,
          update: msg.update,
        });

        return;
      }

      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }

      ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${msg.type}` }));
    } catch (err) {
      console.error('message handling failed:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Bad message' }));
    }
  });

  ws.on('close', async () => {
    if (!joinedRoomId) return;

    const room = rooms.get(joinedRoomId);
    if (!room) return;

    room.clients.delete(ws);

    try {
      await persistRoomToDb(joinedRoomId, room.ydoc);
    } catch (err) {
      console.error(`[room:${joinedRoomId}] persist on close failed:`, err);
    }

    cleanupRoomIfEmpty(joinedRoomId);
  });

  ws.on('error', (err) => {
    console.error('ws error:', err);
  });
});

await ensureTable();

server.listen(PORT, HOST, () => {
  console.log(`collab-service-websocket listening on ws://${HOST}:${PORT}`);
});




// import 'dotenv/config';
// import http from 'http';
// import { WebSocketServer } from 'ws';
// import pg from 'pg';
// import * as Y from 'yjs';

// const { Pool } = pg;

// const HOST = process.env.HOST || '0.0.0.0';
// const PORT = Number(process.env.PORT || 3004);

// const pool = new Pool({
//   host: process.env.PGHOST,
//   port: Number(process.env.PGPORT || 5432),
//   database: process.env.PGDATABASE,
//   user: process.env.PGUSER,
//   password: process.env.PGPASSWORD,
// });

// const server = http.createServer((req, res) => {
//   if (req.url === '/health') {
//     res.writeHead(200, { 'Content-Type': 'application/json' });
//     res.end(JSON.stringify({ status: 'ok', service: 'collab-service-websocket' }));
//     return;
//   }

//   res.writeHead(404, { 'Content-Type': 'application/json' });
//   res.end(JSON.stringify({ error: 'Not found' }));
// });

// const wss = new WebSocketServer({ server });

// /**
//  * rooms map:
//  * roomId -> {
//  *   ydoc: Y.Doc,
//  *   clients: Set<WebSocket>,
//  *   saveTimer: NodeJS.Timeout | null
//  * }
//  */
// const rooms = new Map();

// function encodeBase64(uint8Array) {
//   return Buffer.from(uint8Array).toString('base64');
// }

// function decodeBase64(base64) {
//   return new Uint8Array(Buffer.from(base64, 'base64'));
// }

// async function ensureTable() {
//   await pool.query(`
//     CREATE TABLE IF NOT EXISTS yjs_room_state (
//       room_id TEXT PRIMARY KEY,
//       doc_state BYTEA NOT NULL,
//       updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
//     )
//   `);
// }

// async function loadRoomFromDb(roomId) {
//   const { rows } = await pool.query(
//     `SELECT doc_state FROM yjs_room_state WHERE room_id = $1`,
//     [roomId]
//   );

//   const ydoc = new Y.Doc();

//   if (rows.length > 0 && rows[0].doc_state) {
//     const persisted = new Uint8Array(rows[0].doc_state);
//     Y.applyUpdate(ydoc, persisted);
//     console.log(`[room:${roomId}] restored from Postgres`);
//   } else {
//     console.log(`[room:${roomId}] new room`);
//   }

//   return ydoc;
// }

// async function persistRoomToDb(roomId, ydoc) {
//   const fullState = Y.encodeStateAsUpdate(ydoc);

//   await pool.query(
//     `
//     INSERT INTO yjs_room_state (room_id, doc_state, updated_at)
//     VALUES ($1, $2, NOW())
//     ON CONFLICT (room_id)
//     DO UPDATE SET
//       doc_state = EXCLUDED.doc_state,
//       updated_at = NOW()
//     `,
//     [roomId, Buffer.from(fullState)]
//   );

//   console.log(`[room:${roomId}] persisted ${fullState.length} bytes`);
// }

// function schedulePersist(roomId) {
//   const room = rooms.get(roomId);
//   if (!room) return;

//   if (room.saveTimer) {
//     clearTimeout(room.saveTimer);
//   }

//   room.saveTimer = setTimeout(async () => {
//     try {
//       await persistRoomToDb(roomId, room.ydoc);
//     } catch (err) {
//       console.error(`[room:${roomId}] persist failed:`, err);
//     }
//   }, 1000);
// }

// async function getOrCreateRoom(roomId) {
//   let room = rooms.get(roomId);
//   if (room) return room;

//   const ydoc = await loadRoomFromDb(roomId);

//   room = {
//     ydoc,
//     clients: new Set(),
//     saveTimer: null,
//   };

//   // Persist every time the Y.Doc changes, but debounce it.
//   ydoc.on('update', () => {
//     schedulePersist(roomId);
//   });

//   rooms.set(roomId, room);
//   return room;
// }

// function broadcastToOthers(roomId, sender, payload) {
//   const room = rooms.get(roomId);
//   if (!room) return;

//   const text = JSON.stringify(payload);

//   for (const client of room.clients) {
//     if (client !== sender && client.readyState === client.OPEN) {
//       client.send(text);
//     }
//   }
// }

// function cleanupRoomIfEmpty(roomId) {
//   const room = rooms.get(roomId);
//   if (!room) return;

//   if (room.clients.size === 0) {
//     if (room.saveTimer) {
//       clearTimeout(room.saveTimer);
//       room.saveTimer = null;
//     }

//     // Keep memory clean. State is already in Postgres.
//     room.ydoc.destroy();
//     rooms.delete(roomId);
//     console.log(`[room:${roomId}] cleaned up from memory`);
//   }
// }

// wss.on('connection', async (ws) => {
//   let joinedRoomId = null;

//   ws.on('message', async (raw) => {
//     try {
//       const msg = JSON.parse(raw.toString());

//       // 1) Client joins room
//       if (msg.type === 'join') {
//         const roomId = String(msg.roomId || '').trim();
//         if (!roomId) {
//           ws.send(JSON.stringify({ type: 'error', message: 'Missing roomId' }));
//           return;
//         }

//         const room = await getOrCreateRoom(roomId);
//         room.clients.add(ws);
//         joinedRoomId = roomId;

//         // Send full current doc state to the newly joined client
//         const fullState = Y.encodeStateAsUpdate(room.ydoc);

//         ws.send(
//           JSON.stringify({
//             type: 'sync',
//             roomId,
//             update: encodeBase64(fullState),
//           })
//         );

//         ws.send(
//           JSON.stringify({
//             type: 'joined',
//             roomId,
//           })
//         );

//         console.log(`[room:${roomId}] client joined (${room.clients.size} clients)`);
//         return;
//       }

//       // 2) Client sends Yjs update
//       if (msg.type === 'update') {
//         const roomId = String(msg.roomId || '').trim();
//         if (!roomId || roomId !== joinedRoomId) {
//           ws.send(JSON.stringify({ type: 'error', message: 'Invalid roomId' }));
//           return;
//         }

//         const room = rooms.get(roomId);
//         if (!room) {
//           ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
//           return;
//         }

//         const update = decodeBase64(msg.update);

//         // Apply to server doc
//         Y.applyUpdate(room.ydoc, update);

//         // Broadcast exact same update to other peers
//         broadcastToOthers(roomId, ws, {
//           type: 'update',
//           roomId,
//           update: msg.update,
//         });

//         return;
//       }

//       if (msg.type === 'ping') {
//         ws.send(JSON.stringify({ type: 'pong' }));
//       }
//     } catch (err) {
//       console.error('message handling failed:', err);
//       ws.send(JSON.stringify({ type: 'error', message: 'Bad message' }));
//     }
//   });

//   ws.on('close', async () => {
//     if (!joinedRoomId) return;

//     const room = rooms.get(joinedRoomId);
//     if (!room) return;

//     room.clients.delete(ws);

//     try {
//       await persistRoomToDb(joinedRoomId, room.ydoc);
//     } catch (err) {
//       console.error(`[room:${joinedRoomId}] persist on close failed:`, err);
//     }

//     cleanupRoomIfEmpty(joinedRoomId);
//   });

//   ws.on('error', (err) => {
//     console.error('ws error:', err);
//   });
// });

// await ensureTable();

// server.listen(PORT, HOST, () => {
//   console.log(`collab-service-websocket listening on ws://${HOST}:${PORT}`);
// });










// import * as Y from 'yjs'

// import 'dotenv/config'
// import http from 'http'
// import { WebSocketServer } from 'ws'
// import { PostgresqlPersistence } from 'y-postgresql'

// // These imports match the y-postgresql example structure.
// // Depending on your installed y-websocket version, the path may be:
// //   y-websocket/bin/utils.js
// // or a local copied utils file from the y-websocket server package.
// import { setPersistence, setupWSConnection } from 'y-websocket/bin/utils.js'

// const HOST = process.env.HOST || '0.0.0.0'
// const PORT = Number(process.env.PORT || 3004)

// const server = http.createServer((req, res) => {
//   res.writeHead(200, { 'Content-Type': 'text/plain' })
//   res.end('collab-service ok')
// })

// const wss = new WebSocketServer({ server })

// const pgdb = await PostgresqlPersistence.build(
//   {
//     host: process.env.PGHOST,
//     port: Number(process.env.PGPORT || 5432),
//     database: process.env.PGDATABASE,
//     user: process.env.PGUSER,
//     password: process.env.PGPASSWORD,
//   },
//   {
//     tableName: 'yjs_documents',
//     flushSize: 200,
//     useIndex: false,
//   }
// )

// // Plug Postgres into y-websocket persistence
// setPersistence({
//   provider: pgdb,
//   bindState: async (docName, ydoc) => {
//     const persistedYdoc = await pgdb.getYDoc(docName)
//     const state = Y.encodeStateAsUpdate(persistedYdoc)
//     Y.applyUpdate(ydoc, state)

//     ydoc.on('update', async (update) => {
//       await pgdb.storeUpdate(docName, update)
//     })
//   },
//   writeState: async (docName, ydoc) => {
//     // Optional hook; y-postgresql already stores updates incrementally.
//     // You can keep this as a no-op for now.
//   },
// })

// wss.on('connection', (conn, req) => {
//   setupWSConnection(conn, req)
// })

// server.listen(PORT, HOST, () => {
//   console.log(`collab-service listening on ws://${HOST}:${PORT}`)
// })