import axios from 'axios';
import {
    getQuestionDetail,
    deleteQuestion,
    getQuestionUser,
    createQuestion,
    getQuestions
} from './QuestionsAPI';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Questions Service', () => {
    const mockToken = 'fake-jwtoken';

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        localStorage.setItem('JWToken', mockToken);
    });

    afterEach(() => {
        jest.useRealTimers();
        localStorage.clear();
    });

    test('getQuestionDetail fetches data correctly', async () => {
        const mockData = { id: '1', title: 'Two Sum' };
        mockedAxios.get.mockResolvedValueOnce({ data: mockData });

        const result = await getQuestionDetail('1');

        expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/questions/1'));
        expect(result).toEqual(mockData);
    });

    test('deleteQuestion sends token and waits for timeout', async () => {
        mockedAxios.delete.mockResolvedValueOnce({ data: { message: 'Deleted' } });

        const promise = deleteQuestion('123');

        const result = await promise;

        expect(mockedAxios.delete).toHaveBeenCalledWith(
            expect.stringContaining('/questions/123'),
            { headers: { Authorization: `Bearer ${mockToken}` } }
        );
        expect(result.message).toBe('Deleted');
    });

    test('createQuestion sends payload with authorization header', async () => {
        mockedAxios.post.mockResolvedValueOnce({ data: { id: 'new-id' } });

        const result = await createQuestion('Title', 'Topic', 'Easy', 'Desc', []);

        expect(mockedAxios.post).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ title: 'Title', difficulty: 'Easy' }),
            { headers: { Authorization: `Bearer ${mockToken}` } }
        );
        expect(result.id).toBe('new-id');
    });
});