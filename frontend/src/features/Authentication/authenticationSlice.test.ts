import authenticationReducer, {
    initialiseAuth, logout, fetchAuthenticationDetail
} from './authenticationSlice';
import { getUserProfile } from '../../services/Authentication';
import { configureStore } from '@reduxjs/toolkit';

jest.mock('../../services/Authentication');
const mockedGetUserProfile = getUserProfile as jest.MockedFunction<typeof getUserProfile>;

describe('authenticationSlice Reducers', () => {
    const initialState = {
        value: { username: "", role: "", email: "", proficiency: "", JWToken: "" },
        stateStatus: 'idle'
    };

    test('should return the initial state', () => {
        expect(authenticationReducer(undefined, { type: undefined })).toEqual(initialState);
    });

    test('should handle logout', () => {
        const loggedInState = {
            value: { username: "user12", role: "Admin", email: "a@b.com", proficiency: "expert", JWToken: "tok" },
            stateStatus: 'succeeded'
        };
        const actual = authenticationReducer(loggedInState, logout());
        expect(actual.value).toEqual(initialState.value);
    });

    test('should handle initialise', () => {
        const newUser = { username: "tester", role: "User", email: "t@t.com", proficiency: "Beginner", JWToken: "jwt" };
        const actual = authenticationReducer(initialState, initialiseAuth(newUser));
        expect(actual.value).toEqual(newUser);
    });
});

describe('authenticationSlice Async Actions', () => {
    let store: any;

    beforeEach(() => {
        store = configureStore({ reducer: { authentication: authenticationReducer } });
    });

    test('fetchAuthenticationDetail.fulfilled updates state with user profile', async () => {
        const mockProfile = { username: "Alice12", role: "Admin", JWToken: "secret_token" };
        mockedGetUserProfile.mockResolvedValueOnce(mockProfile);

        await store.dispatch(fetchAuthenticationDetail("Alice12", "Password123."));

        const state = store.getState().authentication;
        expect(state.stateStatus).toBe('succeeded');
        expect(state.value).toEqual(mockProfile);
    });

    test('fetchAuthenticationDetail.rejected updates status to failed', async () => {
        mockedGetUserProfile.mockRejectedValueOnce(new Error('Unauthorized'));

        await store.dispatch(fetchAuthenticationDetail("wrong_user", "bad_pass"));

        const state = store.getState().authentication;
        expect(state.stateStatus).toBe('failed');
    });

    test('fetchAuthenticationDetail.pending updates status to loading', () => {
        const action = { type: fetchAuthenticationDetail.pending.type };
        const state = authenticationReducer({ stateStatus: 'idle' }, action);
        expect(state.stateStatus).toBe('loading');
    });
});