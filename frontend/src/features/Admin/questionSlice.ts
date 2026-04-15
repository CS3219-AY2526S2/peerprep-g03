import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { 
    getQuestionDetail, 
    getQuestions, 
    createQuestion as createQuestionApi, 
    updateQuestion as updateQuestionApi, 
    deleteQuestion,
    releaseQuestionLock
} from '../../services/Questions';
const initialStateValue = { 
    id: null, 
    questionTitle: '', 
    questionTopic: [], 
    questionDifficulty: '', 
    question: '', 
    solution: '',
    templates: [] // New field
};
export const fetchQuestionDetail = createAsyncThunk(
    'question/fetchById',
    async (questionId, { rejectWithValue }) => {
        try {
            const data = await getQuestionDetail(questionId);
            return data; 
        } catch (err: any) {
            // This captures the 409 error message: "This question is currently being edited by..."
            return rejectWithValue(err.response?.data?.message || "Failed to fetch question");
        }
    }
);
export const releaseExistingLock = createAsyncThunk(
    'question/releaseLock',
    async (questionId: string, { rejectWithValue }) => {
        try {
            await releaseQuestionLock(questionId);
            return null; // We don't need to return data to the state
        } catch (err: any) {
            return rejectWithValue(err.response?.data || "Failed to release lock");
        }
    }
);
export const fetchAllQuestions = createAsyncThunk(
    'questions/fetchAll',
    async ({ username, page = 1, limit = 10 }: { username: string; page?: number; limit?: number }, { rejectWithValue }) => {
        try {
            const response = await getQuestions(username, page, limit);
            // Expecting backend to return: { questions: [], totalCount: X, totalPages: Y }
            return response.data; 
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
                templates: questionData.templates
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
                questionData.templates
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
    pagination: {
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
    },
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
    state.serverError = null; // Clear previous errors
    })
    .addCase(fetchQuestionDetail.fulfilled, (state, action) => {
        state.stateStatus = 'succeeded';
        state.value = action.payload; 
        state.serverError = null;
    })
    .addCase(fetchQuestionDetail.rejected, (state, action: any) => {
        state.stateStatus = 'failed';
        // Capture the lock error or any other server error
        state.serverError = action.payload; 
    })
    .addCase(fetchAllQuestions.pending, (state) => {
        state.stateStatus = 'loading';
    })
    .addCase(fetchAllQuestions.fulfilled, (state, action) => {
        state.stateStatus = 'succeeded';
        
        // 1. Store the questions list
        state.list = action.payload.questions.map((q: any) => ({
            ...q,
            topic_tags: Array.isArray(q.topic_tags) ? q.topic_tags.join(', ') : q.topic_tags
        }));

        // 2. Store pagination metadata
        state.pagination = {
            totalCount: action.payload.totalCount,
            totalPages: action.payload.totalPages,
            currentPage: action.payload.currentPage
        };
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
    })
    .addCase(releaseExistingLock.pending, (state) => {
        state.stateStatus = 'loading';
    })
    .addCase(releaseExistingLock.fulfilled, (state) => {
        state.stateStatus = 'idle'; // Reset to idle after successful unlock
        state.serverError = null;
        state.value = initialStateValue; // Clear form data since we are leaving
    })
    .addCase(releaseExistingLock.rejected, (state, action: any) => {
        state.stateStatus = 'failed';
        state.serverError = action.payload;
    });
    }
});
export const { reset, initialise } = questionSlice.actions;
export default questionSlice.reducer;