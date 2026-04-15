import collaborationReducer, {
    initialiseCollab,
    reset,
    resetStatus,
    setPartner,
    fetchPartner,
    fetchQuestion
} from './collaborationSlice';
import { getPartner } from '../../../services/Collaboration';
import { configureStore } from '@reduxjs/toolkit';

jest.mock('../../../services/Collaboration');
const mockedGetPartner = getPartner as jest.MockedFunction<typeof getPartner>;

describe('collaborationSlice', () => {
    const initialStateValue = {
        isReconnecting: false,
        matchId: null,
        questionTitle: null,
        questionTopic: null,
        questionDifficulty: null,
        programmingLanguage: null,
        question: null,
        partner: null,
        roomId: null,
        solution: null,
    };

    const initialState = {
        value: initialStateValue,
        stateStatus: 'idle'
    };

    describe('Reducers', () => {
        test('should return the initial state', () => {
            expect(collaborationReducer(undefined, { type: undefined })).toEqual(initialState);
        });

        test('should handle initialise', () => {
            const payload = { questionTitle: 'New Title', questionTopic: 'Strings' };
            const actual = collaborationReducer(initialState, initialiseCollab(payload));
            expect(actual.value.questionTitle).toBe('New Title');
            expect(actual.value.questionTopic).toBe('Strings');
        });

        test('should handle setPartner', () => {
            const actual = collaborationReducer(initialState, setPartner('User123'));
            expect(actual.value.partner).toBe('User123');
            expect(actual.stateStatus).toBe('succeeded');
        });

        test('should handle reset', () => {
            const modifiedState = {
                value: { ...initialStateValue, partner: 'User123' },
                stateStatus: 'succeeded'
            };
            const actual = collaborationReducer(modifiedState, reset());
            expect(actual).toEqual(initialState);
        });

        test('should handle resetStatus', () => {
            const state = { ...initialState, stateStatus: 'loading' };
            const actual = collaborationReducer(state, resetStatus());
            expect(actual.stateStatus).toBe('idle');
        });
    });

    describe('Testing the async thunks', () => {
        let store: any;

        beforeEach(() => {
            store = configureStore({
                reducer: { collaboration: collaborationReducer }
            });
        });

        test('fetchPartner: fulfilled updates state correctly', async () => {
            const mockData = { partner: 'PartnerName' };
            mockedGetPartner.mockResolvedValueOnce(mockData);

            await store.dispatch(fetchPartner({
                questionTopic: 'Arrays',
                questionDifficulty: 'Medium',
                programmingLanguage: 'Python'
            }));

            const state = store.getState().collaboration;
            expect(state.stateStatus).toBe('succeeded');
            expect(state.value.partner).toBe('PartnerName');
            expect(state.value.questionTopic).toBe('Arrays');
        });

        test('fetchPartner: pending sets status to loading', () => {
            const action = { type: fetchPartner.pending.type };
            const state = collaborationReducer(initialState, action);
            expect(state.stateStatus).toBe('loading');
        });

        test('fetchPartner: rejected sets status to failed', () => {
            const action = { type: fetchPartner.rejected.type };
            const state = collaborationReducer(initialState, action);
            expect(state.stateStatus).toBe('failed');
        });

        test('fetchQuestion: fulfilled updates state correctly', async () => {
            const mockData = { question: 'Binary Search Task' };
            mockedGetPartner.mockResolvedValueOnce(mockData);

            await store.dispatch(fetchQuestion({
                username: 'dev_user',
                questionTopic: 'Trees',
                questionDifficulty: 'Hard'
            }));

            const state = store.getState().collaboration;
            expect(state.stateStatus).toBe('succeeded');
            expect(state.value.question).toBe('Binary Search Task');
        });
    });
});