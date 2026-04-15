import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import * as httpMocks from 'node-mocks-http';
import { RoomSessionController } from '../controllers/roomSessionController.js';

describe('RoomSessionController', () => {
  let req;
  let res;
  let mockService;
  let controller;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();

    mockService = {
      startSession: jest.fn(),
      findRejoinableRoomForUser: jest.fn(),
      reconnectSession: jest.fn(),
      leaveSession: jest.fn(),
      disconnectSession: jest.fn(),
      submitSession: jest.fn(),
      getSessionByRoomId: jest.fn(),
    };

    controller = new RoomSessionController(mockService);
    jest.clearAllMocks();
  });

  test('startSession returns 400 when missing fields', async () => {
    req.body = { userId: 'u1' };

    await controller.startSession(req, res);

    expect(res.statusCode).toBe(400);
  });

  test('startSession returns 201 on success', async () => {
    req.body = {
      userId: 'u1',
      matchId: 'm1',
      questionId: 'q1',
      questionTitle: 'Two Sum',
      questionDescription: 'desc',
      questionStarterCode: 'code',
    };

    mockService.startSession.mockResolvedValue({ roomId: 'room-1' });

    await controller.startSession(req, res);

    expect(res.statusCode).toBe(201);
  });

  test('reconnectSession returns 404 when service fails', async () => {
    req.body = { userId: 'u1', roomId: 'room-1' };

    mockService.reconnectSession.mockResolvedValue({
      success: false,
    });

    await controller.reconnectSession(req, res);

    expect(res.statusCode).toBe(404);
  });

  test('getSession returns 404 when not found', async () => {
    req.params = { roomId: 'room-1' };

    mockService.getSessionByRoomId.mockResolvedValue(null);

    await controller.getSession(req, res);

    expect(res.statusCode).toBe(404);
  });
});