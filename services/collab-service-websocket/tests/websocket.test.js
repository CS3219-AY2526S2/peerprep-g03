import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import * as Y from 'yjs';
import { createCollabApp } from '../src/server.js';

jest.setTimeout(10000);

function waitForOpen(ws) {
  return new Promise((resolve, reject) => {
    const onOpen = () => {
      ws.off('error', onError);
      resolve();
    };
    const onError = (err) => {
      ws.off('open', onOpen);
      reject(err);
    };

    ws.once('open', onOpen);
    ws.once('error', onError);
  });
}

function waitForMessage(ws, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for message'));
    }, timeoutMs);

    const onMessage = (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        cleanup();
        resolve(parsed);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    const onError = (err) => {
      cleanup();
      reject(err);
    };

    function cleanup() {
      clearTimeout(timer);
      ws.off('message', onMessage);
      ws.off('error', onError);
    }

    ws.once('message', onMessage);
    ws.once('error', onError);
  });
}

function waitForMessages(ws, count, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const messages = [];

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${count} messages, got ${messages.length}`));
    }, timeoutMs);

    const onMessage = (data) => {
      try {
        messages.push(JSON.parse(data.toString()));
        if (messages.length === count) {
          cleanup();
          resolve(messages);
        }
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    const onError = (err) => {
      cleanup();
      reject(err);
    };

    function cleanup() {
      clearTimeout(timer);
      ws.off('message', onMessage);
      ws.off('error', onError);
    }

    ws.on('message', onMessage);
    ws.on('error', onError);
  });
}

function waitForClose(ws, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for close'));
    }, timeoutMs);

    const onClose = (code, reason) => {
      cleanup();
      resolve({ code, reason: reason.toString() });
    };

    const onError = (err) => {
      cleanup();
      reject(err);
    };

    function cleanup() {
      clearTimeout(timer);
      ws.off('close', onClose);
      ws.off('error', onError);
    }

    ws.once('close', onClose);
    ws.once('error', onError);
  });
}

async function joinRoom(ws, { roomId, username, token }) {
  const incoming = waitForMessages(ws, 2);

  ws.send(
    JSON.stringify({
      type: 'join',
      roomId,
      username,
      token,
    })
  );

  const [syncMsg, joinedMsg] = await incoming;
  return { syncMsg, joinedMsg };
}

describe('collab websocket server', () => {
  let app;
  let pool;
  let client;
  let clientA;
  let clientB;
  let port;

  beforeEach(async () => {
    pool = {
      query: jest.fn(),
      connect: jest.fn(),
    };

    pool.query.mockImplementation(async (sql) => {
      const text = String(sql);

      if (text.includes('CREATE TABLE IF NOT EXISTS yjs_room_state')) {
        return { rows: [] };
      }

      if (text.includes('SELECT doc_state FROM yjs_room_state')) {
        return { rows: [] };
      }

      if (text.includes('INSERT INTO yjs_room_state')) {
        return { rows: [] };
      }

      return { rows: [] };
    });

    app = createCollabApp({
      pool,
      jwtSecret: 'test-secret',
      host: '127.0.0.1',
      port: 0,
      persistDelayMs: 10,
      logger: {
        log: jest.fn(),
        error: jest.fn(),
      },
    });

    await app.start();
    port = app.server.address().port;
  });

  afterEach(async () => {
    const sockets = [client, clientA, clientB].filter(Boolean);

    await Promise.all(
      sockets.map(async (ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          const closePromise = waitForClose(ws).catch(() => null);
          ws.close();
          await closePromise;
        }
      })
    );

    if (app) {
      await app.stop();
    }
  });

  test('rejects join when token is missing', async () => {
    client = new WebSocket(`ws://127.0.0.1:${port}`);
    await waitForOpen(client);

    const errorPromise = waitForMessage(client);
    const closePromise = waitForClose(client);

    client.send(
      JSON.stringify({
        type: 'join',
        roomId: 'room-1',
        username: 'alice',
      })
    );

    const msg = await errorPromise;
    expect(msg).toEqual({
      type: 'error',
      message: 'Missing token',
    });

    const closed = await closePromise;
    expect(closed.code).toBe(1008);
  });

  test('rejects join when token is invalid', async () => {
    client = new WebSocket(`ws://127.0.0.1:${port}`);
    await waitForOpen(client);

    const errorPromise = waitForMessage(client);
    const closePromise = waitForClose(client);

    client.send(
      JSON.stringify({
        type: 'join',
        roomId: 'room-1',
        username: 'alice',
        token: 'bad-token',
      })
    );

    const msg = await errorPromise;
    expect(msg).toEqual({
      type: 'error',
      message: 'Invalid or expired token',
    });

    const closed = await closePromise;
    expect(closed.code).toBe(1008);
  });

  test('joins successfully and receives sync then joined', async () => {
    const token = jwt.sign({ username: 'alice' }, 'test-secret');

    client = new WebSocket(`ws://127.0.0.1:${port}`);
    await waitForOpen(client);

    const { syncMsg, joinedMsg } = await joinRoom(client, {
      roomId: 'room-1',
      username: 'alice',
      token,
    });

    expect(syncMsg.type).toBe('sync');
    expect(syncMsg.roomId).toBe('room-1');
    expect(typeof syncMsg.update).toBe('string');

    expect(joinedMsg).toEqual({
      type: 'joined',
      roomId: 'room-1',
      user: 'alice',
    });
  });

  test('responds to ping with pong', async () => {
    client = new WebSocket(`ws://127.0.0.1:${port}`);
    await waitForOpen(client);

    const msgPromise = waitForMessage(client);
    client.send(JSON.stringify({ type: 'ping' }));

    const msg = await msgPromise;
    expect(msg).toEqual({ type: 'pong' });
  });

  test('relays update from one client to another in same room', async () => {
    const tokenA = jwt.sign({ username: 'alice' }, 'test-secret');
    const tokenB = jwt.sign({ username: 'bob' }, 'test-secret');

    clientA = new WebSocket(`ws://127.0.0.1:${port}`);
    clientB = new WebSocket(`ws://127.0.0.1:${port}`);

    await waitForOpen(clientA);
    await waitForOpen(clientB);

    await joinRoom(clientA, {
      roomId: 'room-1',
      username: 'alice',
      token: tokenA,
    });

    await joinRoom(clientB, {
      roomId: 'room-1',
      username: 'bob',
      token: tokenB,
    });

    const ydoc = new Y.Doc();
    const ytext = ydoc.getText('monaco');
    ytext.insert(0, 'hello');
    const update = Y.encodeStateAsUpdate(ydoc);
    const updateBase64 = Buffer.from(update).toString('base64');

    const relayedPromise = waitForMessage(clientB);

    clientA.send(
      JSON.stringify({
        type: 'update',
        roomId: 'room-1',
        update: updateBase64,
      })
    );

    const relayed = await relayedPromise;

    expect(relayed).toEqual({
      type: 'update',
      roomId: 'room-1',
      update: updateBase64,
    });
  });

  test('rejects update before join', async () => {
    client = new WebSocket(`ws://127.0.0.1:${port}`);
    await waitForOpen(client);

    const errorPromise = waitForMessage(client);
    const closePromise = waitForClose(client);

    client.send(
      JSON.stringify({
        type: 'update',
        roomId: 'room-1',
        update: 'abc',
      })
    );

    const msg = await errorPromise;
    expect(msg).toEqual({
      type: 'error',
      message: 'Unauthorized',
    });

    const closed = await closePromise;
    expect(closed.code).toBe(1008);
  });
});