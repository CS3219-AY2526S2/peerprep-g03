import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import * as httpMocks from 'node-mocks-http';

// Mock the AI SDK for controller tests.
const mockPipe = jest.fn();
const mockStreamText = jest.fn(() => ({
  pipeDataStreamToResponse: mockPipe,
}));
const mockGoogle = jest.fn(() => 'mock-model');

jest.unstable_mockModule('ai', () => ({
  streamText: mockStreamText,
}));

jest.unstable_mockModule('@ai-sdk/google', () => ({
  google: mockGoogle,
}));

const { getAiExplanation } = await import('../controllers/ai.controller.js');

describe('getAiExplanation', () => {
  let req;
  let res;

  beforeEach(() => {
    req = httpMocks.createRequest({
      method: 'POST',
      body: {
        prompt: 'Explain this loop',
        body: { context: 'code' },
      },
    });

    res = httpMocks.createResponse();

    jest.clearAllMocks();
    process.env.GEMINI_AI_API_KEY = 'test-key';
  });

  test('calls google and streamText with correct parameters', async () => {
    await getAiExplanation(req, res);

    expect(mockGoogle).toHaveBeenCalledWith(
      'models/gemini-2.5-flash',
      expect.objectContaining({
        apiKey: 'test-key',
      })
    );

    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'mock-model',
        prompt: 'Explain this loop',
        system: expect.stringContaining('code'),
      })
    );
  });

  test('uses default context when missing', async () => {
    req.body = { prompt: 'Explain recursion' };

    await getAiExplanation(req, res);

    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'Explain recursion',
        system: expect.stringContaining('general'),
      })
    );
  });

  test('pipes the data stream to response', async () => {
    await getAiExplanation(req, res);

    expect(mockPipe).toHaveBeenCalledWith(
      res,
      expect.objectContaining({
        getErrorMessage: expect.any(Function),
      })
    );
  });

  test('returns 500 when streamText throws', async () => {
    mockStreamText.mockImplementationOnce(() => {
      throw new Error('AI failed');
    });

    await getAiExplanation(req, res);

    expect(res.statusCode).toBe(500);
    expect(res._getJSONData()).toEqual({
      error: 'AI failed',
    });
  });
});
