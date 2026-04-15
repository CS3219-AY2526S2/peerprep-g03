import axios from 'axios';
import { getPartner, deleteMatch, pollMatchStatus } from './CollaborationAPI';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Collaboration Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('getPartner', () => {
        test('returns success data when API call succeeds', async () => {
            const mockResponse = { status: 200, data: { status: 'searching' } };
            mockedAxios.post.mockResolvedValueOnce(mockResponse);

            const result = await getPartner('user1', 'Algorithms', 'Easy', 'Python');

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ status: 'searching' });
            expect(mockedAxios.post).toHaveBeenCalledWith(expect.stringContaining('/match'), expect.any(Object));
        });

        test('returns error data when API call fails', async () => {
            const mockError = { response: { status: 404, data: { message: 'Not Found' } } };
            mockedAxios.post.mockRejectedValueOnce(mockError);

            const result = await getPartner('user1', 'topic', 'easy', 'py');

            expect(result.success).toBe(false);
            expect(result.status).toBe(404);
        });
    });

    describe('pollMatchStatus', () => {
        test('resolves immediately when partner is found', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: { status: 'matched', partnerId: 'peer123' } });

            const result = await pollMatchStatus('user1');

            expect(result.status).toBe('matched');
            expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        });

        test('loops and eventually finds a partner after delay', async () => {
            mockedAxios.get
                .mockResolvedValueOnce({ data: { status: 'searching' } })
                .mockResolvedValueOnce({ data: { status: 'matched', partnerId: 'peer123' } });

            const pollPromise = pollMatchStatus('user1');

            await jest.advanceTimersByTimeAsync(10000);

            const result = await pollPromise;
            expect(result.status).toBe('matched');
            expect(mockedAxios.get).toHaveBeenCalledTimes(2);
        });

        test('returns cancelled status if signal is aborted', async () => {
            const controller = new AbortController();
            mockedAxios.get.mockResolvedValue({ data: { status: 'searching' } });

            const pollPromise = pollMatchStatus('user1', controller.signal);


            controller.abort();


            await jest.advanceTimersByTimeAsync(10000);

            const result = await pollPromise;
            expect(result.status).toBe('cancelled');
        });
    });
});