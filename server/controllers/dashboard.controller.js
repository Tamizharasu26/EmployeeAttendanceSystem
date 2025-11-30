// server/controllers/dashboard.controller.js
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const moment = require('moment');

// Employee dashboard
exports.getEmployeeDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get today's status
    const today = moment().startOf('day');
    const todayAttendance = await Attendance.findOne({
      userId,
      date: {
        $gte: today.toDate(),
        $lt: moment(today).endOf('day').toDate()
      }
    });

    // Get this month's stats
    const startOfMonth = moment().startOf('month');
    const endOfMonth = moment().endOf('month');

    const monthAttendance = await Attendance.find({
      userId,
      date: {
        $gte: startOfMonth.toDate(),
        $lte: endOfMonth.toDate()
      }
    });

    // Calculate monthly stats
    const presentCount = monthAttendance.filter(a => a.status === 'present').length;
    const lateCount = monthAttendance.filter(a => a.status === 'late').length;
    const halfDayCount = monthAttendance.filter(a => a.status === 'half-day').length;
    const totalHours = monthAttendance.reduce((sum, a) => sum + (a.totalHours || 0), 0);

    // Calculate absent days
    const presentDays = monthAttendance.map(a => new Date(a.date).getDate());
    let absentCount = 0;

    for (let i = 1; i <= today.date(); i++) {
      const date = new Date(today.year(), today.month(), i);
      // Only count weekdays (Monday-Friday)
      if (date.getDay() !== 0 && date.getDay() !== 6 && !presentDays.includes(i)) {
        absentCount++;
      }
    }

    // Get recent attendance (last 7 days)
    const lastWeekStart = moment().subtract(7, 'days').startOf('day');

    const recentAttendance = await Attendance.find({
      userId,
      date: {
        $gte: lastWeekStart.toDate(),
        $lte: moment().endOf('day').toDate()
      }
    }).sort({ date: -1 });

    // Format dashboard data
    const dashboard = {
      todayStatus: {
        date: today.toDate(),
        checkedIn: !!todayAttendance,
        checkedOut: todayAttendance ? !!todayAttendance.checkOutTime : false,
        checkInTime: todayAttendance ? todayAttendance.checkInTime : null,
        checkOutTime: todayAttendance ? todayAttendance.checkOutTime : null,
        status: todayAttendance ? todayAttendance.status : null
      },
      monthSummary: {
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        halfDay: halfDayCount,
        totalHours: totalHours.toFixed(2),
        workingDays: getWorkingDaysCount(startOfMonth.toDate(), today.toDate())
      },
      recentAttendance: recentAttendance.map(a => ({
        date: a.date,
        checkInTime: a.checkInTime,
        checkOutTime: a.checkOutTime,
        status: a.status,
        totalHours: a.totalHours
      }))
    };

    res.json({ dashboard });
  } catch (error) {
    console.error('Employee dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Manager dashboard
exports.getManagerDashboard = async (req, res) => {
  try {
    // Ensure the requester is a manager
    if (req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get all employees
    const employees = await User.find({ role: 'employee' });
    const totalEmployees = employees.length;

    // Get today's attendance
    const today = moment().startOf('day');

    const todayAttendance = await Attendance.find({
      date: {
        $gte: today.toDate(),
        $lt: moment(today).endOf('day').toDate()
      }
    }).populate('userId', 'name employeeId department');

    const presentToday = todayAttendance.length;
    const lateToday = todayAttendance.filter(a => a.status === 'late').length;
    const absentToday = totalEmployees - presentToday;

    // Get weekly attendance trend
    const lastWeekStart = moment().subtract(7, 'days').startOf('day');

    const weeklyAttendance = await Attendance.find({
      date: {
        $gte: lastWeekStart.toDate(),
        $lte: moment().endOf('day').toDate()
      }
    });

    // Calculate attendance by day
    const weeklyTrend = [];

    for (let i = 0; i < 7; i++) {
      const date = moment().subtract(i, 'days').startOf('day');
      const dayAttendance = weeklyAttendance.filter(a =>
        moment(a.date).startOf('day').isSame(date)
      );

      weeklyTrend.unshift({
        date: date.format('YYYY-MM-DD'),
        day: date.format('ddd'),
        present: dayAttendance.length,
        absent: totalEmployees - dayAttendance.length,
        late: dayAttendance.filter(a => a.status === 'late').length
      });
    }

    // Get department-wise attendance
    const departments = [...new Set(employees.map(e => e.department))];

    const departmentStats = {};

    for (const department of departments) {
      const deptEmployees = employees.filter(e => e.department === department);
      const deptAttendance = todayAttendance.filter(a => a.userId.department === department);

      departmentStats[department] = {
        totalEmployees: deptEmployees.length,
        present: deptAttendance.length,
        absent: deptEmployees.length - deptAttendance.length,
        late: deptAttendance.filter(a => a.status === 'late').length,
        percentPresent: ((deptAttendance.length / deptEmployees.length) * 100).toFixed(2)
      };
    }

    // List of absent employees
    const absentEmployees = employees.filter(e =>
      !todayAttendance.some(a => a.userId._id.toString() === e._id.toString())
    ).map(e => ({
      id: e._id,
      name: e.name,
      employeeId: e.employeeId,
      department: e.department
    }));

    // Format dashboard data
    const dashboard = {
      totalEmployees,
      todaySummary: {
        date: today.toDate(),
        present: presentToday,
        absent: absentToday,
        late: lateToday,
        percentPresent: ((presentToday / totalEmployees) * 100).toFixed(2)
      },
      weeklyTrend,
      departmentStats,
      absentEmployees
    };

    res.json({ dashboard });
  } catch (error) {
    console.error('Manager dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper functions
function getWorkingDaysCount(startDate, endDate) {
  let count = 0;
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    // Only count weekdays (Monday-Friday)
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      count++;
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return count;
}