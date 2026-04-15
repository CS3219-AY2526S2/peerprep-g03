import { configureStore } from '@reduxjs/toolkit';
import questionReducer, {
    initialiseQns,
    reset,
    fetchQuestionDetail,
    fetchAllQuestions,
    createNewQuestion,
    deleteExistingQuestion
} from './questionSlice';
import * as questionService from '../../services/Questions';

jest.mock('../../services/Questions');
const mockedService = questionService as jest.Mocked<typeof questionService>;

describe('questionSlice', () => {
    const initialState = {
        value: { id: null, questionTitle: '', questionTopic: [], questionDifficulty: '', question: '', solution: '', templates: [] },
        list: [],
        stateStatus: 'idle',
        serverError: null
    };

    describe('Synchronous Reducers', () => {
        test('initialise updates the value object', () => {
          const initialState = {
            value: { id: null, questionTitle: '', questionTopic: [] },
            list: [],
            stateStatus: 'idle'
          };

          const payload = { questionTitle: 'New Title', questionTopic: ['Arrays'] };

          const actual = questionReducer(initialState, initialiseQns(payload));

          expect(actual.value.questionTitle).toBe('New Title');
          expect(actual.value.questionTopic).toEqual(['Arrays']);
        });

        test('reset returns state to default and clears errors', () => {
            const dirtyState = { ...initialState, stateStatus: 'failed', serverError: 'Server Error' };
            const actual = questionReducer(dirtyState, reset());
            expect(actual).toEqual(initialState);
        });
    });

    describe('Async Extra Reducers for CRUD operations', () => {
        let store: any;

        beforeEach(() => {
            store = configureStore({ reducer: { question: questionReducer } });
            jest.clearAllMocks();
        });

        test('fetchAllQuestions transforms topic_tags array to string', async () => {
            const mockQuestions = [
                { id: '1', topic_tags: ['Arrays', 'Strings'] },
                { id: '2', topic_tags: 'SingleTopic' }
            ];
            mockedService.getQuestions.mockResolvedValueOnce({ data: { questions: mockQuestions } });

            await store.dispatch(fetchAllQuestions('testUser'));

            const state = store.getState().question;
            expect(state.list[0].topic_tags).toBe('Arrays, Strings');
            expect(state.list[1].topic_tags).toBe('SingleTopic');
            expect(state.stateStatus).toBe('succeeded');
        });

        test('createNewQuestion.rejected captures backend error messages', async () => {
            const errorPayload = { error: 'Duplicate title detected' };
            mockedService.createQuestion.mockRejectedValueOnce({
                response: { data: errorPayload }
            });

            await store.dispatch(createNewQuestion({ questionTitle: 'Duplicate' }));

            const state = store.getState().question;
            expect(state.stateStatus).toBe('failed');
            expect(state.serverError).toBe('Duplicate title detected');
        });

        test('deleteExistingQuestion.fulfilled removes the item from list', async () => {
            const populatedState = {
                ...initialState,
                list: [{ id: '123', questionTitle: 'Delete Me' }, { id: '456', questionTitle: 'Keep Me' }]
            };

            const action = { type: deleteExistingQuestion.fulfilled.type, payload: '123' };
            const state = questionReducer(populatedState, action);

            expect(state.list).toHaveLength(1);
            expect(state.list[0].id).toBe('456');
        });

        test('fetchQuestionDetail sets loading state', () => {
            const state = questionReducer(initialState, { type: fetchQuestionDetail.pending.type });
            expect(state.stateStatus).toBe('loading');
        });
    });
});