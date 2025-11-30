// server/controllers/attendance.controller.js
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const moment = require('moment');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');

// Employee Functions
function getUserIdFromReq(req) {
  // your authenticateJwt middleware should set req.user (user object)
  if (!req.user) return null;
  // prefer _id, fallback to id
  return req.user._id ? req.user._id.toString() : (req.user.id ? req.user.id : null);
}

// Check in
exports.checkIn = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      console.error('Check in error: req.user missing or no id on req.user', req.user);
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    console.log('Check-in by user:', userId, 'body:', req.body);

    // Build attendance using the required field name `userId`
    const attendanceDoc = new Attendance({
      userId: userId,              // <--- REQUIRED field per your schema
      checkInTime: new Date(),
      // merge any extra data that your schema allows (e.g., latitude, longitude, note)
      ...req.body
    });

    const saved = await attendanceDoc.save();
    console.log('Check-in saved:', saved._id);

    return res.json({ success: true, message: 'Checked in', data: saved });
  } catch (err) {
    console.error('Check in error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      console.error('Check out error: req.user missing or no id on req.user', req.user);
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    console.log('Check-out by user:', userId, 'body:', req.body);

    // Typical pattern: find today's attendance record for user and set checkout
    const today = new Date();
    today.setHours(0,0,0,0);

    // adjust query to match your schema (e.g., using checkInTime date)
    const attendance = await Attendance.findOne({ userId: userId, checkInTime: { $gte: today } }).sort({ checkInTime: -1 });

    if (!attendance) {
      return res.status(400).json({ success: false, message: 'No check-in record found for today' });
    }

    attendance.checkOutTime = new Date();
    // add any checkout metadata from req.body
    Object.assign(attendance, req.body);

    const saved = await attendance.save();
    console.log('Check-out saved:', saved._id);

    return res.json({ success: true, message: 'Checked out', data: saved });
  } catch (err) {
    console.error('Check out error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// Get my attendance history
// GET /my-history
exports.myHistory = async (req, res) => {
  try {
    const foundUser = req.user || {};
    const userId = (foundUser._id && foundUser._id.toString())
      || (foundUser.id && foundUser.id.toString())
      || (foundUser.userId && foundUser.userId.toString());

    if (!userId) {
      console.error("my-history error: req.user missing:", req.user);
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    console.log("Fetching history for user:", userId);

    const history = await Attendance.find({ userId })
      .sort({ date: -1, checkInTime: -1 });

    return res.json({ success: true, count: history.length, data: history });

  } catch (err) {
    console.error("my-history error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error"
    });
  }
};
// Replace or add this in server/controllers/attendance.controller.js

// Helper: convert 24-hex string to ObjectId when possible
function toObjectIdIfPossible(id) {
  if (!id) return null;
  const hex24 = /^[0-9a-fA-F]{24}$/;
  if (typeof id === 'string' && hex24.test(id)) {
    try { return mongoose.Types.ObjectId(id); } catch (e) { return id; }
  }
  return id;
}

exports.mySummary = async (req, res) => {
  try {
    const foundUser = req.user || {};
    const rawUserId = (foundUser._id && foundUser._id.toString && foundUser._id.toString())
      || (foundUser.id && foundUser.id.toString && foundUser.id.toString());

    if (!rawUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Prepare match values (ObjectId + string) to be tolerant
    const objectId = toObjectIdIfPossible(rawUserId);
    const orMatch = [];
    if (objectId) {
      orMatch.push({ userId: objectId }, { employeeId: objectId });
    }
    orMatch.push({ userId: rawUserId }, { employeeId: rawUserId });

    // Fetch all attendance docs for this user (you can limit range if needed)
    const docs = await Attendance.find({ $or: orMatch }).sort({ date: -1, checkInTime: -1 }).lean();

    // If no docs, return zeros quickly
    if (!docs || docs.length === 0) {
      // build last7Days empty array
      const now = new Date();
      const last7 = [];
      for (let i = 6; i >= 0; i--) {
        const dt = new Date(now);
        dt.setDate(now.getDate() - i);
        last7.push({
          date: dt.toISOString().slice(0,10),
          present: false,
          checkIn: null,
          checkOut: null,
          hours: 0
        });
      }
      return res.json({
        success: true,
        totalDays: 0,
        totalHours: 0,
        avgHours: 0,
        monthDays: 0,
        monthHours: 0,
        last7Days: last7
      });
    }

    // Helper to parse possible date values (Date object or ISO string)
    function parseDate(d) {
      if (!d) return null;
      if (d instanceof Date) return d;
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    // Group by calendar date (YYYY-MM-DD)
    const dayMap = new Map(); // key -> { docs: [], totalMs }
    for (const doc of docs) {
      // doc.date should exist; fallback to checkInTime if it doesn't
      const dateVal = doc.date || doc.checkInTime;
      const dateObj = parseDate(dateVal);
      const dateKey = dateObj ? dateObj.toISOString().slice(0,10) : 'unknown';

      // compute duration for this doc (ms)
      const ci = parseDate(doc.checkInTime);
      const co = parseDate(doc.checkOutTime);
      const durationMs = (ci && co) ? Math.max(0, (co.getTime() - ci.getTime())) : 0;

      if (!dayMap.has(dateKey)) dayMap.set(dateKey, { docs: [], totalMs: 0 });
      const entry = dayMap.get(dateKey);
      entry.docs.push(doc);
      entry.totalMs += durationMs;
    }

    // totalDays = number of unique dateKeys (excluding 'unknown' unless needed)
    const allDateKeys = Array.from(dayMap.keys()).filter(k => k !== 'unknown');
    const totalDays = allDateKeys.length;

    // totalHours = sum of all days' totalMs
    let totalMs = 0;
    for (const v of dayMap.values()) totalMs += v.totalMs;
    const totalHours = +(totalMs / (1000 * 60 * 60)).toFixed(2);

    const avgHours = totalDays > 0 ? +(totalHours / totalDays).toFixed(2) : 0;

    // Month stats: for docs whose date falls in current month (local time)
    const now = new Date();
    const currentYear = now.getFullYear(), currentMonth = now.getMonth();
    let monthDaysSet = new Set();
    let monthMs = 0;
    for (const [dateKey, val] of dayMap) {
      if (dateKey === 'unknown') continue;
      const dt = new Date(dateKey + 'T00:00:00Z');
      // Compare UTC year/month vs local: safer to get year/month from dt in local timezone
      const local = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
      if (local.getFullYear() === currentYear && local.getMonth() === currentMonth) {
        monthDaysSet.add(dateKey);
        monthMs += val.totalMs;
      }
    }
    const monthDays = monthDaysSet.size;
    const monthHours = +(monthMs / (1000 * 60 * 60)).toFixed(2);

    // Build last 7 calendar days array (most recent last)
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(now);
      dt.setDate(now.getDate() - i);
      const key = dt.toISOString().slice(0,10);
      const dayEntry = dayMap.get(key);
      if (!dayEntry) {
        last7.push({ date: key, present: false, checkIn: null, checkOut: null, hours: 0 });
      } else {
        // pick the latest doc for that day (sorted earlier so first is latest)
        const docsForDay = dayEntry.docs;
        let chosen = docsForDay[0];
        // find doc with max checkInTime if you want better selection
        docsForDay.sort((a,b) => {
          const aT = parseDate(a.checkInTime) ? parseDate(a.checkInTime).getTime() : 0;
          const bT = parseDate(b.checkInTime) ? parseDate(b.checkInTime).getTime() : 0;
          return bT - aT;
        });
        chosen = docsForDay[0];
        const checkInIso = parseDate(chosen.checkInTime) ? parseDate(chosen.checkInTime).toISOString() : null;
        const checkOutIso = parseDate(chosen.checkOutTime) ? parseDate(chosen.checkOutTime).toISOString() : null;
        last7.push({
          date: key,
          present: true,
          checkIn: checkInIso,
          checkOut: checkOutIso,
          hours: +( (dayEntry.totalMs / (1000*60*60)) .toFixed(2) )
        });
      }
    }

    return res.json({
      success: true,
      totalDays,
      totalHours,
      avgHours,
      monthDays,
      monthHours,
      last7Days: last7
    });

  } catch (err) {
    console.error('my-summary error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ success:false, message:'Server error' });
  }
};

// Get today's status
exports.getTodayStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = moment().startOf('day');

    const attendance = await Attendance.findOne({
      userId,
      date: {
        $gte: today.toDate(),
        $lt: moment(today).endOf('day').toDate()
      }
    });

    const status = {
      date: new Date(),
      checkedIn: !!attendance,
      checkedOut: attendance ? !!attendance.checkOutTime : false,
      checkInTime: attendance ? attendance.checkInTime : null,
      checkOutTime: attendance ? attendance.checkOutTime : null,
      status: attendance ? attendance.status : null,
      totalHours: attendance ? attendance.totalHours : 0
    };

    res.json({ status });
  } catch (error) {
    console.error('Get today status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Manager Functions
// Get all employees attendance
exports.getAllAttendance = async (req, res) => {
  try {
    // Ensure the requester is a manager
    if (req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { startDate, endDate, employeeId, status } = req.query;

    let query = {};

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (status) {
      query.status = status;
    }

    if (employeeId) {
      const user = await User.findOne({ employeeId });
      if (user) {
        query.userId = user._id;
      }
    }

    const attendance = await Attendance.find(query)
      .populate('userId', 'name employeeId department')
      .sort({ date: -1 });

    res.json({ attendance });
  } catch (error) {
    console.error('Get all attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get specific employee attendance
exports.getEmployeeAttendance = async (req, res) => {
  try {
    // Ensure the requester is a manager
    if (req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;
    const { startDate, endDate } = req.query;

    // Find the employee
    const employee = await User.findById(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    let query = { userId: id };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendance = await Attendance.find(query).sort({ date: -1 });

    res.json({
      employee: {
        id: employee._id,
        name: employee.name,
        employeeId: employee.employeeId,
        department: employee.department
      },
      attendance
    });
  } catch (error) {
    console.error('Get employee attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get team attendance summary
exports.getTeamSummary = async (req, res) => {
  try {
    // Ensure the requester is a manager
    if (req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { month, year } = req.query;

    // Default to current month if not specified
    const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0);

    // Get all employees
    const employees = await User.find({ role: 'employee' });

    // Get attendance for all employees in the specified month
    const attendance = await Attendance.find({
      date: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    });

    // Calculate summary for each employee
    const employeeSummary = [];

    for (const employee of employees) {
      const employeeAttendance = attendance.filter(a =>
        a.userId.toString() === employee._id.toString()
      );

      const summary = {
        employee: {
          id: employee._id,
          name: employee.name,
          employeeId: employee.employeeId,
          department: employee.department
        },
        present: employeeAttendance.filter(a => a.status === 'present').length,
        late: employeeAttendance.filter(a => a.status === 'late').length,
        absent: 0,
        halfDay: employeeAttendance.filter(a => a.status === 'half-day').length,
        totalHours: employeeAttendance.reduce((sum, a) => sum + (a.totalHours || 0), 0)
      };

      // Calculate absent days
      const presentDays = employeeAttendance.map(a => new Date(a.date).getDate());
      let absentCount = 0;

      for (let i = 1; i <= endOfMonth.getDate(); i++) {
        const date = new Date(targetYear, targetMonth, i);
        // Only count weekdays (Monday-Friday)
        if (date.getDay() !== 0 && date.getDay() !== 6 && !presentDays.includes(i) && date <= new Date()) {
          absentCount++;
        }
      }

      summary.absent = absentCount;
      employeeSummary.push(summary);
    }

    // Team totals
    const teamSummary = {
      totalEmployees: employees.length,
      averagePresent: employeeSummary.reduce((sum, e) => sum + e.present, 0) / employees.length,
      averageLate: employeeSummary.reduce((sum, e) => sum + e.late, 0) / employees.length,
      averageAbsent: employeeSummary.reduce((sum, e) => sum + e.absent, 0) / employees.length,
      totalHours: employeeSummary.reduce((sum, e) => sum + e.totalHours, 0),
      departmentSummary: {}
    };

    // Department-wise summary
    const departments = [...new Set(employees.map(e => e.department))];

    for (const department of departments) {
      const deptEmployees = employees.filter(e => e.department === department);
      const deptSummaries = employeeSummary.filter(s => s.employee.department === department);

      teamSummary.departmentSummary[department] = {
        totalEmployees: deptEmployees.length,
        averagePresent: deptSummaries.reduce((sum, e) => sum + e.present, 0) / deptEmployees.length,
        averageLate: deptSummaries.reduce((sum, e) => sum + e.late, 0) / deptEmployees.length,
        averageAbsent: deptSummaries.reduce((sum, e) => sum + e.absent, 0) / deptEmployees.length,
        totalHours: deptSummaries.reduce((sum, e) => sum + e.totalHours, 0)
      };
    }

    res.json({
      month: targetMonth + 1,
      year: targetYear,
      teamSummary,
      employeeSummary
    });
  } catch (error) {
    console.error('Get team summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Export attendance data to CSV
exports.exportAttendance = async (req, res) => {
  try {
    // Ensure the requester is a manager
    if (req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { startDate, endDate, department } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start and end dates are required' });
    }

    let employeeQuery = { role: 'employee' };
    if (department) {
      employeeQuery.department = department;
    }

    // Get all employees
    const employees = await User.find(employeeQuery);

    // Get attendance for the specified period
    const attendance = await Attendance.find({
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).populate('userId', 'name employeeId department');

    // Filter attendance by department if specified
    let filteredAttendance = attendance;
    if (department) {
      filteredAttendance = attendance.filter(a => a.userId.department === department);
    }

    // Prepare data for CSV
    const csvData = filteredAttendance.map(a => ({
      Date: moment(a.date).format('YYYY-MM-DD'),
      'Employee ID': a.userId.employeeId,
      'Employee Name': a.userId.name,
      Department: a.userId.department,
      'Check In': a.checkInTime ? moment(a.checkInTime).format('HH:mm:ss') : 'N/A',
      'Check Out': a.checkOutTime ? moment(a.checkOutTime).format('HH:mm:ss') : 'N/A',
      Status: a.status,
      'Total Hours': a.totalHours ? a.totalHours.toFixed(2) : 0
    }));

    // Create CSV file
    const fileName = `attendance-${startDate}-to-${endDate}.csv`;
    const filePath = path.join(__dirname, '..', 'exports', fileName);

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'Date', title: 'Date' },
        { id: 'Employee ID', title: 'Employee ID' },
        { id: 'Employee Name', title: 'Employee Name' },
        { id: 'Department', title: 'Department' },
        { id: 'Check In', title: 'Check In' },
        { id: 'Check Out', title: 'Check Out' },
        { id: 'Status', title: 'Status' },
        { id: 'Total Hours', title: 'Total Hours' }
      ]
    });

    await csvWriter.writeRecords(csvData);

    // Return the file
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Download error:', err);
        return res.status(500).json({ message: 'Error downloading file' });
      }
    });
  } catch (error) {
    console.error('Export attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get who's present today
exports.getTodayStatus = async (req, res) => {
  try {
    // Ensure the requester is a manager
    if (req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const today = moment().startOf('day');

    // Get all employees
    const employees = await User.find({ role: 'employee' });

    // Get today's attendance
    const attendance = await Attendance.find({
      date: {
        $gte: today.toDate(),
        $lt: moment(today).endOf('day').toDate()
      }
    }).populate('userId', 'name employeeId department');

    const present = attendance.filter(a => a.checkInTime && !a.checkOutTime);
    const completed = attendance.filter(a => a.checkInTime && a.checkOutTime);
    const absent = employees.filter(e =>
      !attendance.some(a => a.userId._id.toString() === e._id.toString())
    );

    // Format response
    const todayStatus = {
      date: today.toDate(),
      totalEmployees: employees.length,
      present: present.length,
      completed: completed.length,
      absent: absent.length,
      late: attendance.filter(a => a.status === 'late').length,
      presentEmployees: present.map(a => ({
        id: a.userId._id,
        name: a.userId.name,
        employeeId: a.userId.employeeId,
        department: a.userId.department,
        checkInTime: a.checkInTime,
        status: a.status
      })),
      completedEmployees: completed.map(a => ({
        id: a.userId._id,
        name: a.userId.name,
        employeeId: a.userId.employeeId,
        department: a.userId.department,
        checkInTime: a.checkInTime,
        checkOutTime: a.checkOutTime,
        totalHours: a.totalHours,
        status: a.status
      })),
      absentEmployees: absent.map(e => ({
        id: e._id,
        name: e.name,
        employeeId: e.employeeId,
        department: e.department
      }))
    };

    res.json({ todayStatus });
  } catch (error) {
    console.error('Get today status error:', error);
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