import attemptReducer, { initialiseAttempt, reset, fetchAttempt } from './attemptSlice';
import { getAttemptDetail } from '../../../services/Attempts';
import { configureStore } from '@reduxjs/toolkit';

jest.mock('../../../services/Attempts');
const mockedGetAttemptDetail = getAttemptDetail as jest.MockedFunction<typeof getAttemptDetail>;

describe('attemptSlice Reducers', () => {
    const initialState = {
        value: { username: "", timestamp: "", questionTitle: "", submittedSolution: "", suggestedSolution: "" },
        stateStatus: 'idle'
    };

    test('should return the initial state', () => {
        expect(attemptReducer(undefined, { type: undefined })).toEqual(initialState);
    });

    test('should handle initialise', () => {
        const payload = { username: "user1", timestamp: "123", questionTitle: "T1", submittedSolution: "S1", suggestedSolution: "G1" };
        const actual = attemptReducer(initialState, initialiseAttempt(payload));
        expect(actual.value).toEqual(payload);
    });

    test('should handle reset', () => {
        const modifiedState = { value: { username: "user1" }, stateStatus: 'succeeded' };
        const actual = attemptReducer(modifiedState, reset());
        expect(actual.value).toEqual(initialState.value);
    });
});

describe('attemptSlice Async Actions', () => {
    let store;

    beforeEach(() => {
        store = configureStore({ reducer: { attempt: attemptReducer } });
    });

    test('fetchAttempt.fulfilled updates state with API data', async () => {
        const mockData = { questionTitle: "Mock Question", submittedSolution: "print(1)" };
        mockedGetAttemptDetail.mockResolvedValueOnce(mockData);

        await store.dispatch(fetchAttempt({ username: "testUser", timestamp: "2023" }));

        const state = store.getState().attempt;
        expect(state.stateStatus).toBe('succeeded');
        expect(state.value).toEqual({
            ...mockData,
            username: "testUser",
            timestamp: "2023"
        });
    });

    test('fetchAttempt.rejected updates status to failed', async () => {
        mockedGetAttemptDetail.mockRejectedValueOnce(new Error('API Error'));

        await store.dispatch(fetchAttempt({ username: "user345", timestamp: "0" }));

        const state = store.getState().attempt;
        expect(state.stateStatus).toBe('failed');
    });

    test('fetchAttempt.pending updates status to loading', () => {
        const action = { type: fetchAttempt.pending.type };
        const state = attemptReducer({ stateStatus: 'idle' }, action);
        expect(state.stateStatus).toBe('loading');
    });
});