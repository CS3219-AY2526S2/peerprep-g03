import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getQuestionDetail } from '../../services/Questions'

const initialStateValue = { questionTitle: null, questionTopic: null, questionDifficulty: null, question: null, id: null, solution: null}

export const fetchQuestionDetail = createAsyncThunk(
    'question/fetchById',
    async (questionId) => {
        const data = await getQuestionDetail(questionId); // an async method that takes question Id, and return the question info
        return data; // note to self: this will be the action.payload
    }
);

const questionSlice = createSlice({
  name: 'question',
  initialState: { value: initialStateValue, stateStatus :'idle'},
  reducers: {
    initialise: (state, action) => {
        state.value = action.payload; // Manual initialise from the form
    },
    reset: (state) => {state.value = initialStateValue}
  },
  extraReducers: (builder) => {
      builder
      .addCase(fetchQuestionDetail.pending, (state) => {
          state.stateStatus = 'loading';
      })
      .addCase(fetchQuestionDetail.fulfilled, (state, action) => {
          state.stateStatus = 'succeeded';
          state.value = action.payload; // Data from the API
      })
      .addCase(fetchQuestionDetail.rejected, (state) => {
           state.stateStatus = 'failed';
      });}
});
export const { reset, initialise } = questionSlice.actions;
export default questionSlice.reducer;