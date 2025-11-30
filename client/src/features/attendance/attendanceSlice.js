// client/src/features/attendance/attendanceSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import attendanceService from './attendanceService';

const initialState = {
  todayStatus: null,
  history: [],
  summary: null,
  allAttendance: [],
  employeeAttendance: null,
  teamSummary: null,
  isLoading: false,
  error: null,
  success: false,
  message: ''
};

// Check in
export const checkIn = createAsyncThunk(
  'attendance/checkIn',
  async (_, thunkAPI) => {
    try {
      return await attendanceService.checkIn();
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Check-in failed';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Check out
export const checkOut = createAsyncThunk(
  'attendance/checkOut',
  async (_, thunkAPI) => {
    try {
      return await attendanceService.checkOut();
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Check-out failed';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get my attendance history
export const getMyHistory = createAsyncThunk(
  'attendance/getMyHistory',
  async (dateRange, thunkAPI) => {
    try {
      return await attendanceService.getMyHistory(dateRange);
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch attendance history';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get my monthly summary
export const getMySummary = createAsyncThunk(
  'attendance/getMySummary',
  async (date, thunkAPI) => {
    try {
      return await attendanceService.getMySummary(date);
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch summary';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get today's status
export const getTodayStatus = createAsyncThunk(
  'attendance/getTodayStatus',
  async (_, thunkAPI) => {
    try {
      return await attendanceService.getTodayStatus();
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch today\'s status';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get all attendance (manager)
export const getAllAttendance = createAsyncThunk(
  'attendance/getAllAttendance',
  async (filters, thunkAPI) => {
    try {
      return await attendanceService.getAllAttendance(filters);
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch attendance';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get employee attendance (manager)
export const getEmployeeAttendance = createAsyncThunk(
  'attendance/getEmployeeAttendance',
  async ({ id, dateRange }, thunkAPI) => {
    try {
      return await attendanceService.getEmployeeAttendance(id, dateRange);
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch employee attendance';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get team summary (manager)
export const getTeamSummary = createAsyncThunk(
  'attendance/getTeamSummary',
  async (date, thunkAPI) => {
    try {
      return await attendanceService.getTeamSummary(date);
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch team summary';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Export attendance (manager)
export const exportAttendance = createAsyncThunk(
  'attendance/exportAttendance',
  async (filters, thunkAPI) => {
    try {
      return await attendanceService.exportAttendance(filters);
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to export attendance';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get today's team status (manager)
export const getTodayTeamStatus = createAsyncThunk(
  'attendance/getTodayTeamStatus',
  async (_, thunkAPI) => {
    try {
      return await attendanceService.getTodayTeamStatus();
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch team status';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.success = false;
      state.error = null;
      state.message = '';
    }
  },
  extraReducers: (builder) => {
    builder
      // Check In
      .addCase(checkIn.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkIn.fulfilled, (state, action) => {
        state.isLoading = false;
        state.success = true;
        state.message = 'Check-in successful';
        state.todayStatus = {
          ...state.todayStatus,
          checkedIn: true,
          checkInTime: action.payload.attendance.checkInTime,
          status: action.payload.attendance.status
        };
      })
      .addCase(checkIn.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Check Out
      .addCase(checkOut.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkOut.fulfilled, (state, action) => {
        state.isLoading = false;
        state.success = true;
        state.message = 'Check-out successful';
        state.todayStatus = {
          ...state.todayStatus,
          checkedOut: true,
          checkOutTime: action.payload.attendance.checkOutTime,
          totalHours: action.payload.attendance.totalHours,
          status: action.payload.attendance.status
        };
      })
      .addCase(checkOut.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Get My History
      .addCase(getMyHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getMyHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.history = action.payload.attendance;
      })
      .addCase(getMyHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Get My Summary
      .addCase(getMySummary.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getMySummary.fulfilled, (state, action) => {
        state.isLoading = false;
        state.summary = action.payload.summary;
      })
      .addCase(getMySummary.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Get Today Status
      .addCase(getTodayStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getTodayStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.todayStatus = action.payload.status;
      })
      .addCase(getTodayStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Get All Attendance (Manager)
      .addCase(getAllAttendance.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getAllAttendance.fulfilled, (state, action) => {
        state.isLoading = false;
        state.allAttendance = action.payload.attendance;
      })
      .addCase(getAllAttendance.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Get Employee Attendance (Manager)
      .addCase(getEmployeeAttendance.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getEmployeeAttendance.fulfilled, (state, action) => {
        state.isLoading = false;
        state.employeeAttendance = action.payload;
      })
      .addCase(getEmployeeAttendance.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Get Team Summary (Manager)
      .addCase(getTeamSummary.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getTeamSummary.fulfilled, (state, action) => {
        state.isLoading = false;
        state.teamSummary = action.payload;
      })
      .addCase(getTeamSummary.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Export Attendance (Manager)
      .addCase(exportAttendance.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(exportAttendance.fulfilled, (state) => {
        state.isLoading = false;
        state.success = true;
        state.message = 'Attendance exported successfully';
      })
      .addCase(exportAttendance.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Get Today Team Status (Manager)
      .addCase(getTodayTeamStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getTodayTeamStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.todayStatus = action.payload.todayStatus;
      })
      .addCase(getTodayTeamStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  }
});

export const { reset } = attendanceSlice.actions;
export default attendanceSlice.reducer;