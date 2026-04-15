import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// The URL from your docker-compose environment
const AI_SERVICE_URL = 'http://localhost:3006/api/ai/explain';

export const fetchAiExplanation = createAsyncThunk(
  'ai/fetchExplanation',
  async ({ text, context }: { text: string; context: string }, { rejectWithValue }) => {
    try {
      const response = await axios.post(AI_SERVICE_URL, { text, context });
      return response.data.explanation;
    } catch (err: any) {
      // This catches your 429 Throttle error and passes the message to the UI
      return rejectWithValue(err.response?.data?.message || "AI is busy, try again.");
    }
  }
);

const aiSlice = createSlice({
  name: 'ai',
  initialState: { explanation: null, status: 'idle', error: null },
  reducers: {
    clearAi: (state) => {
      state.explanation = null;
      state.status = 'idle';
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAiExplanation.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAiExplanation.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.explanation = action.payload;
      })
      .addCase(fetchAiExplanation.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const { clearAi } = aiSlice.actions;
export default aiSlice.reducer;