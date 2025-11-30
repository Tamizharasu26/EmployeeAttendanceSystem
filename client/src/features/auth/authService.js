// client/src/features/auth/authService.js
import axios from 'axios';

const API_URL = '/api/auth';

// Register user
const register = async (userData) => {
  const response = await axios.post(`${API_URL}/register`, userData);

  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
  }

  return response.data;
};

// Login user
const login = async (userData) => {
  const response = await axios.post(`${API_URL}/login`, userData);

  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
  }

  return response.data;
};

// Get current user
const getCurrentUser = async () => {
  const token = localStorage.getItem('token');

  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };

  const response = await axios.get(`${API_URL}/me`, config);
  return response.data;
};

// Logout
const logout = () => {
  localStorage.removeItem('token');
};

const authService = {
  register,
  login,
  getCurrentUser,
  logout
};

export default authService;