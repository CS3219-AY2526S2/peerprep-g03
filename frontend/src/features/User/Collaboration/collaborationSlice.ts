import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getPartner } from '../../../services/Collaboration'
import { getQuestionUser } from '../../../services/Questions'
import { useSelector, useDispatch } from 'react-redux';
import { reset } from '../../../../features/User/Collaboration/collaborationSlice';

const initialStateValue = {
    questionTitle: null,
    questionTopic: null,
    questionDifficulty: null,
    programmingLanguage: null,
    question: null,
    partner: null,
    matchId: null,
    roomId: null,
    solution: null,
    isReconnecting: false,
}

export const fetchPartner = createAsyncThunk(
    'collaboration/fetchPartnerByQuestionSetting',
    async ({questionTopic, questionDifficulty, programmingLanguage}) => {
        const data = await getPartner(questionTopic, questionDifficulty, programmingLanguage);
        return {...data, questionTopic, questionDifficulty, programmingLanguage};
    }
);

export const fetchQuestion = createAsyncThunk(
    'collaboration/fetchQuestionByQuestionSetting',
     async ({username, questionTopic, questionDifficulty, programmingLanguage}) => {
            const data = await getPartner(username, questionTopic, questionDifficulty, programmingLanguage);
            return {...data, username, questionTopic, questionDifficulty, programmingLanguage};
     }
);

const handleStatus = (status) => (state) => {
    state.stateStatus = status;
    state.value = { ...state.value };
};
const handleFulfilled = (state, action) => {
    state.stateStatus = 'succeeded';
    state.value = { ...state.value, ...action.payload };
};



const collaborationSlice = createSlice({
    name: 'collaboration',
    initialState: { value: initialStateValue, stateStatus :'idle'},
    reducers: {
        initialise: (state, action) => {
            state.value = {
                ...state.value,
                ...action.payload
            };
            if (action.payload.roomId) {
                state.stateStatus = 'succeeded';
            }
        },
        

        setPartner: (state, action) => {
            state.value.partner = action.payload;
            state.stateStatus = 'succeeded';
        },
        setMatchId: (state, action) => {
            state.value.matchId = action.payload;
            state.stateStatus = 'succeeded';
        },

        setRoomId: (state, action) => {
            state.value.roomId = action.payload;
            state.stateStatus = 'succeeded'; // what is status for?
        },
        reset: (state) => {
            state.value = initialStateValue;
            state.stateStatus = 'idle'},
        resetStatus: (state) => {
            state.stateStatus = 'idle'
        }
    },
    extraReducers: (builder) => {
        [fetchQuestion, fetchPartner].forEach(thunk => {
            builder
                .addCase(thunk.pending, handleStatus('loading'))
                .addCase(thunk.fulfilled, handleFulfilled)
                .addCase(thunk.rejected, handleStatus('failed'));
        });
    }
});

export const { initialise, reset, resetStatus, setPartner, setMatchId, setRoomId } = collaborationSlice.actions;
export default collaborationSlice.reducer;
