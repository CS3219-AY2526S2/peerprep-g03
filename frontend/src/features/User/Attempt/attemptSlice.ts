import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getAttemptDetail } from '../../../services/Attempts'

const initialStateValue = { username: "", timestamp: "", questionTitle: "", submittedSolution: "", suggestedSolution: ""}

export const fetchAttempt = createAsyncThunk(
    'attempt/fetchByUsernameAndTimeStamp',
    async ({username, timestamp}) => {
        const data = await getAttemptDetail(username, timestamp);
        return {...data, username, timestamp};
    }
);

const attemptSlice = createSlice({
  name: 'attempt',
  initialState: { value: initialStateValue, stateStatus :'idle'},
  reducers: {
      initialise: (state, action) => {
          state.value = action.payload; // Manual initialise from the form
      },
  reset: (state) => {state.value = initialStateValue}
  },
  extraReducers: (builder) => {
      builder
      .addCase(fetchAttempt.pending, (state) => {
          state.stateStatus = 'loading';
      })
      .addCase(fetchAttempt.fulfilled, (state, action) => {
          state.stateStatus = 'succeeded';
          state.value = action.payload; // Data from the API
      })
      .addCase(fetchAttempt.rejected, (state) => {
          state.stateStatus = 'failed';
      });}
});

export const { initialise, reset } = attemptSlice.actions;
export default attemptSlice.reducer;