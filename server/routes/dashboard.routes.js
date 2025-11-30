
// server/routes/dashboard.routes.js
const express = require('express');
const router = express.Router();
const { authorize } = require('../middleware/auth.middleware');
const User = require('../models/User'); // Changed to match your existing model
const Attendance = require('../models/Attendance');
const moment = require('moment');

// Rest of the dashboard routes code remains the same...
// Get dashboard statistics (admin/manager only)
router.get('/stats', authorize('admin', 'manager'), async (req, res) => {
  try {
    // Get today's date at the start of the day
    const today = moment().startOf('day');

    // Count total users
    const totalUsers = await User.countDocuments({ isActive: true });

    // Count today's attendance
    const todayAttendance = await Attendance.countDocuments({
      date: {
        $gte: today.toDate(),
        $lt: moment(today).endOf('day').toDate()
      },
      status: 'present'
    });

    // Count today's absent
    const todayAbsent = totalUsers - todayAttendance;

    // Count this month's attendance
    const monthStart = moment().startOf('month');
    const monthAttendance = await Attendance.countDocuments({
      date: {
        $gte: monthStart.toDate(),
        $lt: moment().endOf('month').toDate()
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalEmployees: totalUsers,
        todayPresent: todayAttendance,
        todayAbsent: todayAbsent,
        monthAttendance: monthAttendance
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard statistics',
      error: error.message
    });
  }
});

// Employee dashboard (for individual employees)
router.get('/employee', async (req, res) => {
  try {
    const userId = req.user._id;

    // Get attendance for the current month
    const monthStart = moment().startOf('month');
    const monthEnd = moment().endOf('month');

    const monthAttendance = await Attendance.find({
      employeeId: userId,
      date: {
        $gte: monthStart.toDate(),
        $lte: monthEnd.toDate()
      }
    }).sort({ date: 1 });

    // Check if checked in today
    const today = moment().startOf('day');
    const todayRecord = await Attendance.findOne({
      employeeId: userId,
      date: {
        $gte: today.toDate(),
        $lt: moment(today).endOf('day').toDate()
      }
    });

    // Calculate stats
    const presentDays = monthAttendance.filter(a => a.status === 'present').length;
    const absentDays = monthAttendance.filter(a => a.status === 'absent').length;
    const leaveDays = monthAttendance.filter(a => a.status === 'leave').length;

    // Calculate total worked hours this month
    const totalHours = monthAttendance.reduce((total, record) => {
      return total + (record.hoursWorked || 0);
    }, 0);

    res.status(200).json({
      success: true,
      data: {
        checkedInToday: !!(todayRecord && todayRecord.checkIn),
        checkedOutToday: !!(todayRecord && todayRecord.checkOut),
        todayRecord: todayRecord || null,
        monthStats: {
          present: presentDays,
          absent: absentDays,
          leave: leaveDays,
          totalDays: monthAttendance.length,
          totalHours: totalHours.toFixed(2)
        },
        recentAttendance: monthAttendance.slice(0, 5)
      }
    });
  } catch (error) {
    console.error('Employee dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching employee dashboard',
      error: error.message
    });
  }
});

module.exports = router;