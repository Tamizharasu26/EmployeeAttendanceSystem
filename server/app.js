// server/app.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const config = require('./config/config');
const authRoutes = require('./routes/auth.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const { authenticateJwt } = require('./middleware/auth.middleware');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', authenticateJwt, attendanceRoutes);
app.use('/api/dashboard', authenticateJwt, dashboardRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});
// DEBUG: Print all registered routes
function listRoutes() {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      // routes registered directly on app
      const methods = Object.keys(middleware.route.methods)
        .map((m) => m.toUpperCase())
        .join(',');
      routes.push(`${methods} ${middleware.route.path}`);
    } else if (middleware.name === 'router' && middleware.handle.stack) {
      // routes in routers
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const methods = Object.keys(handler.route.methods)
            .map((m) => m.toUpperCase())
            .join(',');
          routes.push(`${methods} ${handler.route.path}`);
        }
      });
    }
  });

  console.log('\n================ Registered Routes ================');
  routes.forEach((r) => console.log(r));
  console.log('==================================================\n');
}

listRoutes();

module.exports = app;