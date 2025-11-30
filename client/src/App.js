// client/src/App.js
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getCurrentUser } from './features/auth/authSlice';

// Layouts
import Layout from './components/Layout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Employee Pages
import EmployeeDashboard from './pages/employee/Dashboard';
import AttendanceMark from './pages/employee/AttendanceMark';
import AttendanceHistory from './pages/employee/AttendanceHistory';
import Profile from './pages/employee/Profile';

// Manager Pages
import ManagerDashboard from './pages/manager/Dashboard';
import EmployeesList from './pages/manager/EmployeesList';
import TeamCalendar from './pages/manager/TeamCalendar';
import Reports from './pages/manager/Reports';

// Private Route Component
const PrivateRoute = ({ children, requiredRole }) => {
  const { user, isAuthenticated } = useSelector(state => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" />;
  }

  return children;
};

const App = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (token) {
      dispatch(getCurrentUser());
    }
  }, [dispatch]);

  return (
    <Router>
      <Layout>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Redirect to appropriate dashboard based on role */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                {user && user.role === 'manager' ? <ManagerDashboard /> : <EmployeeDashboard />}
              </PrivateRoute>
            }
          />

          {/* Employee Routes */}
          <Route
            path="/attendance"
            element={
              <PrivateRoute requiredRole="employee">
                <AttendanceMark />
              </PrivateRoute>
            }
          />

          <Route
            path="/history"
            element={
              <PrivateRoute requiredRole="employee">
                <AttendanceHistory />
              </PrivateRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />

          {/* Manager Routes */}
          <Route
            path="/employees"
            element={
              <PrivateRoute requiredRole="manager">
                <EmployeesList />
              </PrivateRoute>
            }
          />

          <Route
            path="/calendar"
            element={
              <PrivateRoute requiredRole="manager">
                <TeamCalendar />
              </PrivateRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <PrivateRoute requiredRole="manager">
                <Reports />
              </PrivateRoute>
            }
          />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;