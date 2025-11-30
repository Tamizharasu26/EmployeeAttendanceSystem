// client/src/features/attendance/attendanceService.js
import axios from 'axios';

const API_URL = '/api/attendance';

// Get token from local storage and set auth header
const getConfig = () => {
  const token = localStorage.getItem('token');

  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

// Check in
const checkIn = async () => {
  const response = await axios.post(`${API_URL}/check-in`, {}, getConfig());
  return response.data;
};

// Check out
const checkOut = async () => {
  const response = await axios.post(`${API_URL}/check-out`, {}, getConfig());
  return response.data;
};

// Get my attendance history
const getMyHistory = async (dateRange) => {
  let url = `${API_URL}/my-history`;

  if (dateRange) {
    url += `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
  }

  const response = await axios.get(url, getConfig());
  return response.data;
};

// Get my monthly summary
const getMySummary = async (date) => {
  let url = `${API_URL}/my-summary`;

  if (date) {
    url += `?month=${date.month}&year=${date.year}`;
  }

  const response = await axios.get(url, getConfig());
  return response.data;
};

// Get today's status
const getTodayStatus = async () => {
  const response = await axios.get(`${API_URL}/today`, getConfig());
  return response.data;
};

// Get all attendance (manager)
const getAllAttendance = async (filters) => {
  let url = `${API_URL}/all`;

  if (filters) {
    const queryParams = [];

    if (filters.startDate && filters.endDate) {
      queryParams.push(`startDate=${filters.startDate}`);
      queryParams.push(`endDate=${filters.endDate}`);
    }

    if (filters.employeeId) {
      queryParams.push(`employeeId=${filters.employeeId}`);
    }

    if (filters.status) {
      queryParams.push(`status=${filters.status}`);
    }

    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }
  }

  const response = await axios.get(url, getConfig());
  return response.data;
};

// Get employee attendance (manager)
const getEmployeeAttendance = async (id, dateRange) => {
  let url = `${API_URL}/employee/${id}`;

  if (dateRange) {
    url += `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
  }

  const response = await axios.get(url, getConfig());
  return response.data;
};

// Get team summary (manager)
const getTeamSummary = async (date) => {
  let url = `${API_URL}/summary`;

  if (date) {
    url += `?month=${date.month}&year=${date.year}`;
  }

  const response = await axios.get(url, getConfig());
  return response.data;
};

// Export attendance (manager)
const exportAttendance = async (filters) => {
  let url = `${API_URL}/export`;

  if (filters) {
    const queryParams = [];

    if (filters.startDate && filters.endDate) {
      queryParams.push(`startDate=${filters.startDate}`);
      queryParams.push(`endDate=${filters.endDate}`);
    }

    if (filters.department) {
      queryParams.push(`department=${filters.department}`);
    }

    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }
  }

  const response = await axios.get(url, {
    ...getConfig(),
    responseType: 'blob'
  });

  // Create a URL for the file blob
  const fileURL = window.URL.createObjectURL(new Blob([response.data]));

  // Create a link element and trigger download
  const fileLink = document.createElement('a');
  fileLink.href = fileURL;
  fileLink.setAttribute('download', 'attendance-report.csv');
  document.body.appendChild(fileLink);
  fileLink.click();
  fileLink.remove();

  return { success: true };
};

// Get today's team status (manager)
const getTodayTeamStatus = async () => {
  const response = await axios.get(`${API_URL}/today-status`, getConfig());
  return response.data;
};

const attendanceService = {
  checkIn,
  checkOut,
  getMyHistory,
  getMySummary,
  getTodayStatus,
  getAllAttendance,
  getEmployeeAttendance,
  getTeamSummary,
  exportAttendance,
  getTodayTeamStatus
};

export default attendanceService;