// server/routes/attendance.routes.js
const express = require('express');
const router = express.Router();
const { authenticateJwt } = require('../middleware/auth.middleware');
// add this near other requires
const attendanceController = require('../controllers/attendance.controller');

const Attendance = require('../models/Attendance');
const User = require('../models/User'); // Changed to match your existing model
const moment = require('moment');

// Check in
// require Attendance at top of file if not already:
// const Attendance = require('../models/Attendance');

// require Attendance at top of file if not already:
// const Attendance = require('../models/Attendance');

router.post('/check-in', async (req, res) => {
  try {
    const foundUser = req.user || {};
    const userId = (foundUser._id && foundUser._id.toString && foundUser._id.toString())
      || (foundUser.id && foundUser.id.toString && foundUser.id.toString())
      || (foundUser.userId && foundUser.userId.toString && foundUser.userId.toString());

    if (!userId) {
      console.error('Check in error: req.user missing or no id on req.user:', req.user);
      return res.status(401).json({ success: false, message: 'Unauthorized - user not found in request' });
    }

    // Optional: restrict to "today" only (useful if you allow multiple open across different days)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999);

    // Strategy: find any open attendance for this user (preferably for today; fallback to any open)
    // 1) Try find open attendance for today
    let open = await Attendance.findOne({
      userId: userId,
      checkOutTime: { $exists: false },
      date: { $gte: startOfToday, $lte: endOfToday }
    });

    // 2) Fallback: find any open attendance regardless of date (defensive)
    if (!open) {
      open = await Attendance.findOne({
        userId: userId,
        checkOutTime: { $exists: false }
      });
    }

    if (open) {
      // Found an open record — block new check-in
      console.log('Blocked duplicate check-in attempt by user:', userId, 'openAttendanceId:', open._id);
      return res.status(400).json({
        success: false,
        message: 'You already have an active check-in. Please check out before checking in again.',
        data: { openAttendanceId: open._id, checkInTime: open.checkInTime }
      });
    }

    // No open attendance found — create new one
    const dateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const attendanceData = {
      userId: userId,
      date: dateOnly,
      checkInTime: now,
      ...req.body
    };

    const attendance = new Attendance(attendanceData);
    const saved = await attendance.save();
    console.log('Check-in saved:', saved._id);
    return res.json({ success: true, message: 'Checked in', data: saved });

  } catch (err) {
    console.error('Check in error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// The rest of the attendance routes code remains the same...

// Check out
// In routes/controller where you handle check-out


router.post('/check-out', async (req, res) => {
  try {
    const foundUser = req.user || {};
    const userId = (foundUser._id && foundUser._id.toString && foundUser._id.toString())
      || (foundUser.id && foundUser.id.toString && foundUser.id.toString())
      || (foundUser.userId && foundUser.userId.toString && foundUser.userId.toString());

    if (!userId) {
      console.error('Check out error: req.user missing or no id on req.user:', req.user);
      return res.status(401).json({ success: false, message: 'Unauthorized - user not found in request' });
    }

    console.log('Check-out attempt by user:', userId, 'body:', req.body);

    // Strategy A: find latest open attendance (no checkOutTime)
    let attendance = await Attendance.findOne({ userId: userId, checkOutTime: { $exists: false } })
                         .sort({ checkInTime: -1 });

    // Strategy B: if none, try find today's record (date stored as Date at midnight)
    if (!attendance) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // midnight local
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999);
      attendance = await Attendance.findOne({
        userId: userId,
        date: { $gte: start, $lte: end }
      }).sort({ checkInTime: -1 });
    }

    // Strategy C: fallback: latest attendance regardless
    if (!attendance) {
      attendance = await Attendance.findOne({ userId: userId }).sort({ checkInTime: -1 });
    }

    if (!attendance) {
      return res.status(400).json({ success: false, message: 'No check in record found for today or any open record' });
    }

    // if already checked out, inform user
    if (attendance.checkOutTime) {
      return res.status(400).json({ success: false, message: 'Already checked out for this record' });
    }

    attendance.checkOutTime = new Date();
    // merge optional fields from req.body (notes etc)
    Object.assign(attendance, req.body);

    const saved = await attendance.save();
    console.log('Check-out saved:', saved._id);
    return res.json({ success: true, message: 'Checked out', data: saved });

  } catch (err) {
    console.error('Check out error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// GET /my-history
router.get('/my-history', async (req, res) => {
  try {
    // Make sure req.user exists (authenticateJwt should set it)
    const foundUser = req.user || {};
    const userId = (foundUser._id && foundUser._id.toString && foundUser._id.toString())
      || (foundUser.id && foundUser.id.toString && foundUser.id.toString());

    if (!userId) {
      console.error('my-history: req.user missing', req.user);
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Pagination
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
    const skip = (page - 1) * limit;

    // Optional date filters: from=YYYY-MM-DD, to=YYYY-MM-DD or ?today=true
    const filter = {};
    // Accept either field name - userId or employeeId
    // Query as string or ObjectId depending on how you stored it
    filter.$or = [{ userId: userId }, { employeeId: userId }];

    if (req.query.today === 'true' || req.query.today === '1') {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999);
      filter.date = { $gte: start, $lte: end };
    } else {
      const from = req.query.from; // "2025-11-01"
      const to = req.query.to;     // "2025-11-30"
      if (from || to) {
        const range = {};
        if (from) {
          const f = new Date(from);
          f.setHours(0,0,0,0);
          range.$gte = f;
        }
        if (to) {
          const t = new Date(to);
          t.setHours(23,59,59,999);
          range.$lte = t;
        }
        filter.date = range;
      }
    }

    // Count total matching docs
    const total = await Attendance.countDocuments(filter);

    // Fetch page
    const attendance = await Attendance.find(filter)
      .sort({ date: -1, checkInTime: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      count: attendance.length,
      total,
      pages: Math.ceil(total / limit),
      data: attendance
    });
  } catch (error) {
    console.error('Get attendance history error:', error && error.stack ? error.stack : error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.get('/my-summary', attendanceController.mySummary);


module.exports = router;