// client/src/pages/employee/Dashboard.jsx
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getEmployeeDashboard } from '../../features/dashboard/dashboardSlice';
import { checkIn, checkOut } from '../../features/attendance/attendanceSlice';
import { FaClock, FaCheck, FaTimes, FaCalendarAlt, FaUserClock } from 'react-icons/fa';
import moment from 'moment';

const Dashboard = () => {
  const dispatch = useDispatch();

  const { employeeDashboard, isLoading } = useSelector(state => state.dashboard);
  const { success, message } = useSelector(state => state.attendance);

  useEffect(() => {
    dispatch(getEmployeeDashboard());
  }, [dispatch, success]);

  const handleCheckIn = () => {
    dispatch(checkIn());
  };

  const handleCheckOut = () => {
    dispatch(checkOut());
  };

  if (isLoading || !employeeDashboard) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const { todayStatus, monthSummary, recentAttendance } = employeeDashboard;

  // Format time for display
  const formatTime = (time) => {
    return time ? moment(time).format('hh:mm A') : '--:--';
  };

  // Calculate attendance percentage
  const attendancePercentage = Math.round((monthSummary.present / monthSummary.workingDays) * 100) || 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Employee Dashboard</h1>

      {success && message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{message}</span>
        </div>
      )}

      {/* Today's Status Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <FaUserClock className="mr-2" /> Today's Attendance Status
        </h2>

        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-gray-600">Date: {moment().format('DD MMM, YYYY')}</p>
            <p className="text-gray-600 mt-1">Status:
              <span className={`font-semibold ml-2 ${todayStatus.status === 'present'
                ? 'text-green-500'
                : todayStatus.status === 'late'
                  ? 'text-orange-500'
                  : 'text-gray-500'}`}>
                {todayStatus.checkedIn
                  ? (todayStatus.status === 'present' ? 'Present' : 'Late')
                  : 'Not Checked In'}
              </span>
            </p>
            {todayStatus.checkedIn && (
              <div className="mt-1">
                <p className="text-gray-600">Check In:
                  <span className="font-semibold ml-2">{formatTime(todayStatus.checkInTime)}</span>
                </p>
                {todayStatus.checkedOut && (
                  <p className="text-gray-600">Check Out:
                    <span className="font-semibold ml-2">{formatTime(todayStatus.checkOutTime)}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleCheckIn}
              disabled={todayStatus.checkedIn}
              className={`flex items-center px-4 py-2 rounded ${
                todayStatus.checkedIn
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              <FaCheck className="mr-2" /> Check In
            </button>

            <button
              onClick={handleCheckOut}
              disabled={!todayStatus.checkedIn || todayStatus.checkedOut}
              className={`flex items-center px-4 py-2 rounded ${
                !todayStatus.checkedIn || todayStatus.checkedOut
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              <FaTimes className="mr-2" /> Check Out
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Summary Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <FaCalendarAlt className="mr-2" /> This Month's Summary
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-gray-600">Present</p>
            <p className="text-2xl font-bold text-blue-600">{monthSummary.present}</p>
          </div>

          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-gray-600">Absent</p>
            <p className="text-2xl font-bold text-red-600">{monthSummary.absent}</p>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-gray-600">Late</p>
            <p className="text-2xl font-bold text-yellow-600">{monthSummary.late}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-600">Working Hours</p>
            <p className="text-2xl font-bold text-gray-600">{monthSummary.totalHours}</p>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Attendance Rate</h3>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className={`h-4 rounded-full ${
                attendancePercentage >= 90
                  ? 'bg-green-500'
                  : attendancePercentage >= 75
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${attendancePercentage}%` }}
            ></div>
          </div>
          <div className="text-sm text-gray-600 mt-1">{attendancePercentage}% ({monthSummary.present}/{monthSummary.workingDays} days)</div>
        </div>
      </div>

      {/* Recent Attendance Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <FaClock className="mr-2" /> Recent Attendance
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check In
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check Out
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentAttendance.length > 0 ? (
                recentAttendance.map((record, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {moment(record.date).format('DD MMM, YYYY')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTime(record.checkInTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTime(record.checkOutTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        record.status === 'present'
                          ? 'bg-green-100 text-green-800'
                          : record.status === 'late'
                            ? 'bg-yellow-100 text-yellow-800'
                            : record.status === 'half-day'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-red-100 text-red-800'
                      }`}>
                        {record.status === 'present'
                          ? 'Present'
                          : record.status === 'late'
                            ? 'Late'
                            : record.status === 'half-day'
                              ? 'Half Day'
                              : 'Absent'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.totalHours ? record.totalHours.toFixed(2) : '0.00'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                    No recent attendance records
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;