// Controller tests cover the main match endpoints.

import * as httpMocks from 'node-mocks-http';
import { MatchController } from '../controllers/matchController';

describe('MatchController', () => {
  let req: any;
  let res: any;
  let mockService: any;
  let controller: MatchController;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();

    mockService = {
      findMatchService: jest.fn(),
      pollMatchStatus: jest.fn(),
      cancelMatchService: jest.fn(),
    };

    controller = new MatchController(mockService);
    jest.clearAllMocks();
  });

  test('findMatch should return 201 with service response', async () => {
    const mockResponse = { status: 'searching', partnerId: null };
    req.body = {
      userId: 'u1',
      language: 'Python',
      topic: 'Arrays',
      difficulty: 'Easy',
    };

    mockService.findMatchService.mockResolvedValue(mockResponse);

    await controller.findMatch(req, res);

    expect(mockService.findMatchService).toHaveBeenCalledWith(
      'u1',
      'Python',
      'Arrays',
      'Easy'
    );
    expect(res.statusCode).toBe(201);
    expect(res._getJSONData()).toEqual(mockResponse);
  });

  test('findMatch should return 500 on error', async () => {
    req.body = {
      userId: 'u1',
      language: 'Python',
      topic: 'Arrays',
      difficulty: 'Easy',
    };

    mockService.findMatchService.mockRejectedValue(new Error('Service failed'));

    await controller.findMatch(req, res);

    expect(res.statusCode).toBe(500);
    expect(res._getJSONData()).toEqual({ error: 'Service failed' });
  });

  test('getMatchStatus should return 200 when match request exists', async () => {
    req.params = { userId: 'u1' };
    const mockResponse = { status: 'matched', partnerId: 'u2', matchId: 'm1' };

    mockService.pollMatchStatus.mockResolvedValue(mockResponse);

    await controller.getMatchStatus(req, res);

    expect(mockService.pollMatchStatus).toHaveBeenCalledWith('u1');
    expect(res.statusCode).toBe(200);
    expect(res._getJSONData()).toEqual(mockResponse);
  });

  test('getMatchStatus should return 404 when no match request found', async () => {
    req.params = { userId: 'u1' };
    mockService.pollMatchStatus.mockResolvedValue(null);

    await controller.getMatchStatus(req, res);

    expect(res.statusCode).toBe(404);
    expect(res._getJSONData()).toEqual({ message: 'Match request not found' });
  });

  test('cancelMatch should return 200 on success', async () => {
    req.params = { userId: 'u1' };
    mockService.cancelMatchService.mockResolvedValue({ status: 'success' });

    await controller.cancelMatch(req, res);

    expect(mockService.cancelMatchService).toHaveBeenCalledWith('u1');
    expect(res.statusCode).toBe(200);
    expect(res._getJSONData()).toEqual({ message: 'Successfully exited match' });
  });

  test('cancelMatch should return 400 when service returns error status', async () => {
    req.params = { userId: 'u1' };
    mockService.cancelMatchService.mockResolvedValue({
      status: 'error',
      message: 'Failed to cancel',
    });

    await controller.cancelMatch(req, res);

    expect(res.statusCode).toBe(400);
    expect(res._getJSONData()).toEqual({ error: 'Failed to cancel' });
  });

  test('exitTab should return 200 on success', async () => {
    req.params = { userId: 'u1' };
    mockService.cancelMatchService.mockResolvedValue({ status: 'success' });

    await controller.exitTab(req, res);

    expect(res.statusCode).toBe(200);
    expect(res._getJSONData()).toEqual({ message: 'Successfully exited match' });
  });
});
