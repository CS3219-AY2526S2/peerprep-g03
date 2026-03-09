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
    solution: null,
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
    async ({questionTopic, questionDifficulty, programmingLanguage}) => {
        const data = await getQuestionUser(questionTopic, questionDifficulty, programmingLanguage);
        return {...data, questionTopic, questionDifficulty, programmingLanguage};
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

export const { initialise, reset, resetStatus } = collaborationSlice.actions;
export default collaborationSlice.reducer;