import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { 
    getQuestionDetail, 
    getQuestions, 
    createQuestion as createQuestionApi, 
    updateQuestion as updateQuestionApi, 
    deleteQuestion
} from '../../services/Questions';
const initialStateValue = { questionTitle: null, questionTopic: null, questionDifficulty: null, question: null, id: null, solution: null}

export const fetchQuestionDetail = createAsyncThunk(
    'question/fetchById',
    async (questionId) => {
        const data = await getQuestionDetail(questionId); // an async method that takes question Id, and return the question info
        return data; // note to self: this will be the action.payload
    }
);
export const fetchAllQuestions = createAsyncThunk(
    'questions/fetchAll',
    async (username: string, { rejectWithValue }) => {
        try {
            const response = await getQuestions(username);
            
            return response.data.questions; 
        } catch (err: any) {
            return rejectWithValue(err.response?.data || "Server unreachable");
        }
    }
);
export const updateExistingQuestion = createAsyncThunk(
    'question/update',
    async (questionData: any, { rejectWithValue }) => {
        try {
            
            return await updateQuestionApi({
                id: questionData.id,
                title: questionData.questionTitle,
                topic: questionData.questionTopic,
                difficulty: questionData.questionDifficulty,
                description: questionData.question,
                solution: questionData.solution
            });
        } catch (err: any) {
            return rejectWithValue(err.response?.data || "Update failed");
        }
    }
);
export const createNewQuestion = createAsyncThunk(
    'question/new',
    async (questionData: any, { rejectWithValue }) => {
        try {
            const response = await createQuestionApi(
                questionData.questionTitle, // This becomes 'title' in the API call
                questionData.questionTopic, // This becomes 'topic'
                questionData.questionDifficulty,
                questionData.question,      // This becomes 'description'
                questionData.solution
            );
            return response; // Successful creation 
        } catch (err: any) {
            return rejectWithValue(err.response.data);
        }
    }
);

export const deleteExistingQuestion = createAsyncThunk(
    'question/delete',
    async (id: string, { rejectWithValue }) => {
        try {
            
            await deleteQuestion(id); 
            // Return the ID so the Reducer can filter it out of state.list
            return id; 
        } catch (err: any) {
            return rejectWithValue(err.response?.data || "Delete failed");
        }
    }
);
const initialState = { 
    value: initialStateValue, 
    list: [], // This is where the table data lives
    stateStatus: 'idle',
    serverError: null
};
const questionSlice = createSlice({
  name: 'question',
  initialState,
  reducers: {
    initialise: (state, action) => {
        state.value = action.payload; // Manual initialise from the form
    },
    reset: (state) => {
        state.value = initialStateValue;
        state.serverError = null; // Important: Clear the error here
        state.stateStatus = 'idle';
    }
  },
  extraReducers: (builder) => {
      builder
    .addCase(createNewQuestion.fulfilled, (state) => {
    state.stateStatus = 'succeeded';
    // Logic to clear form or redirect can go here
    })
    .addCase(createNewQuestion.rejected, (state, action: any) => {
    state.stateStatus = 'failed';
    // Capture the "Duplicate title..." string from backend
    state.serverError = action.payload?.error || action.payload || "Create failed";
    })
    .addCase(updateExistingQuestion.pending, (state) => {
              state.stateStatus = 'loading';
          })
    .addCase(updateExistingQuestion.fulfilled, (state, action) => {
              state.stateStatus = 'succeeded';
              // Update the current value with the new data
              state.value = action.payload; 
              
              // Optional: Update the item in the list if it exists
              if (state.list) {
                  const index = state.list.findIndex(q => q.id === action.payload.id);
                  if (index !== -1) {
                      state.list[index] = action.payload;
                  }
              }
          })
    .addCase(updateExistingQuestion.rejected, (state, action: any) => {
        state.stateStatus = 'failed';
        // Capture the "Duplicate title..." string from backend
        state.serverError = action.payload?.error || action.payload || "Update failed";
    })
    .addCase(fetchQuestionDetail.pending, (state) => {
          state.stateStatus = 'loading';
      })
      .addCase(fetchQuestionDetail.fulfilled, (state, action) => {
          state.stateStatus = 'succeeded';
          state.value = action.payload; // Data from the API
      })
      .addCase(fetchQuestionDetail.rejected, (state) => {
           state.stateStatus = 'failed';
      })
      .addCase(fetchAllQuestions.pending, (state) => {
          state.stateStatus = 'loading';
      })
      .addCase(fetchAllQuestions.fulfilled, (state, action) => {
          state.stateStatus = 'succeeded';
          state.list = action.payload.map((q: any) => ({
            ...q,
            topic_tags: Array.isArray(q.topic_tags) ? q.topic_tags.join(', ') : q.topic_tags
    }));
      })
      .addCase(fetchAllQuestions.rejected, (state) => {
          state.stateStatus = 'failed';
      })
      .addCase(deleteExistingQuestion.pending, (state) => {
        state.stateStatus = 'loading';
    })
    .addCase(deleteExistingQuestion.fulfilled, (state, action) => {
        state.stateStatus = 'succeeded';
        if (state.list) {
            state.list = state.list.filter((q) => q.id !== action.payload);
        }
    })
    .addCase(deleteExistingQuestion.rejected, (state) => {
        state.stateStatus = 'failed';
    });
    }
});
export const { reset, initialise } = questionSlice.actions;
export default questionSlice.reducer;