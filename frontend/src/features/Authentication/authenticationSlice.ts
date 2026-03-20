import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getUserProfile } from '../../services/Authentication'

const initialStateValue = { username: "", role: "", email: "", proficiency: "", JWToken: ""}

export const fetchAuthenticationDetail = createAsyncThunk(
    'authentication/fetchByUsernameAndPassword',
    async (username, password) => {
        const data = await getUserProfile(username, password);
        return data;
    }
);

const authenticationSlice = createSlice({
  name: 'authentication',
  initialState: { value: initialStateValue, stateStatus :'idle'},
  reducers: {
    initialise: (state,action) =>   {state.value = action.payload},
    logout: (state) => {state.value = initialStateValue}
  },
  extraReducers: (builder) => {
      builder
      .addCase(fetchAuthenticationDetail.pending, (state) => {
          state.stateStatus = 'loading';
      })
      .addCase(fetchAuthenticationDetail.fulfilled, (state, action) => {
          state.stateStatus = 'succeeded';
          state.value = action.payload;
      })
      .addCase(fetchAuthenticationDetail.rejected, (state) => {
           state.stateStatus = 'failed';
      });}
});

export const { logout, initialise } = authenticationSlice.actions;
export default authenticationSlice.reducer;