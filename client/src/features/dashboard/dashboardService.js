// client/src/features/dashboard/dashboardService.js
import axios from 'axios';

const API_URL = '/api/dashboard';

// Get token from local storage and set auth header
const getConfig = () => {
  const token = localStorage.getItem('token');

  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

// Get employee dashboard
const getEmployeeDashboard = async () => {
  const response = await axios.get(`${API_URL}/employee`, getConfig());
  return response.data;
};

// Get manager dashboard
const getManagerDashboard = async () => {
  const response = await axios.get(`${API_URL}/manager`, getConfig());
  return response.data;
};

const dashboardService = {
  getEmployeeDashboard,
  getManagerDashboard
};

export default dashboardService;