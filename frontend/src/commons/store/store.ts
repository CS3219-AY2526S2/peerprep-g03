import { configureStore } from '@reduxjs/toolkit';
import questionReducer from './../../features/Admin/questionSlice.ts';
import authenticationReducer from './../../features/Authentication/authenticationSlice.ts';
import attemptReducer from './../../features/User/Attempt/attemptSlice.ts';
import collaborationReducer from './../../features/User/Collaboration/collaborationSlice.ts';
import aiReducer from './../../features/User/AI/aiSlice.ts'
export const store = configureStore({
  reducer: {
      question: questionReducer,
      authentication: authenticationReducer,
      attempt: attemptReducer,
      collaboration: collaborationReducer,
      ai: aiReducer
  },
  devTools: true,
});