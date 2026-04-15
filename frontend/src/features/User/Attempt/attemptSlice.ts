import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
//import { getAttemptDetail } from '../../../services/Attempts'

//const initialStateValue = { username: "", timestamp: "", questionTitle: "", submittedSolution: "", suggestedSolution: ""}

const initialStateValue = {
  id: 0,
  user1_id: 0,
  user2_id: 0,
  question_text: "",
  submitted_code: "",
  is_correct: false,
  programming_language: "",
  question_topic: "",
  difficulty: "",
  created_at: ""
};

export const fetchAttempt = createAsyncThunk(
    'attempt/fetchById',
    async (id: number) => {
        const res = await fetch(`http://localhost:3004/records/${id}`);
        const data = await res.json();
        return data;
    }
);

const attemptSlice = createSlice({
  name: 'attempt',
  initialState: { value: initialStateValue, stateStatus :'idle'},
  reducers: {
      initialiseAttempt: (state, action) => {
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

export const { initialiseAttempt, reset } = attemptSlice.actions;
export default attemptSlice.reducer;