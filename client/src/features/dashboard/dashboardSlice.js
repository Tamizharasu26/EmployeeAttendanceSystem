// client/src/features/dashboard/dashboardSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import dashboardService from './dashboardService';

const initialState = {
  employeeDashboard: null,
  managerDashboard: null,
  isLoading: false,
  error: null
};

// Get employee dashboard
export const getEmployeeDashboard = createAsyncThunk(
  'dashboard/getEmployeeDashboard',
  async (_, thunkAPI) => {
    try {
      return await dashboardService.getEmployeeDashboard();
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch dashboard';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get manager dashboard
export const getManagerDashboard = createAsyncThunk(
  'dashboard/getManagerDashboard',
  async (_, thunkAPI) => {
    try {
      return await dashboardService.getManagerDashboard();
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch dashboard';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Employee Dashboard
      .addCase(getEmployeeDashboard.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getEmployeeDashboard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.employeeDashboard = action.payload.dashboard;
      })
      .addCase(getEmployeeDashboard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Manager Dashboard
      .addCase(getManagerDashboard.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getManagerDashboard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.managerDashboard = action.payload.dashboard;
      })
      .addCase(getManagerDashboard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  }
});

export const { reset } = dashboardSlice.actions;
export default dashboardSlice.reducer;