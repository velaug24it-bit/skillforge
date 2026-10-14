import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck, 
  Search, 
  RotateCcw
} from 'lucide-react';

interface SlotBooking {
  id: string;
  slotReference: string;
  student: {
    id: string;
    name: string;
    email: string;
  };
  course: {
    id: string;
    name: string;
    language: string;
  };
  level: {
    id: string;
    levelNumber: number;
    title: string;
  };
  attendanceStatus: 'PENDING' | 'PRESENT' | 'ABSENT';
  markedAt?: string;
  status: string;
}

interface HourwiseSlot {
  slotIndex: number;
  startTime: string;
  endTime: string;
  label: string;
  isBooked: boolean;
  timingStatus: {
    isNow: boolean;
    isFuture: boolean;
    isPast: boolean;
    message: string;
  };
  booking: SlotBooking | null;
}

interface StudentRecord {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  coursesEnrolled: number;
  totalClearedLevels: number;
  totalAttempts: number;
  bestScore: number;
  latestBooking: {
    id: string;
    courseName: string;
    levelNumber: number;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    attendanceStatus: 'PENDING' | 'PRESENT' | 'ABSENT';
    slotReference: string;
  } | null;
}

interface AdminStats {
  totalStudents: number;
  totalBookings: number;
  todayBookingsCount: number;
  presentTodayCount: number;
  absentTodayCount: number;
  pendingTodayCount: number;
  completedAttemptsCount: number;
  campusTime: {
    date: string;
    time: string;
  };
}

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'slots' | 'students'>('slots');
  const [stats, setStats] = useState<AdminStats | null>(null);
  
  // Slot Roster state
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(now);
  });
  const [slots, setSlots] = useState<HourwiseSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);

  // Student directory state
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load Overview stats
  const fetchOverview = async () => {
    try {
      const res = await api.get<{ success: boolean; stats: AdminStats }>('/admin/overview');
      if (res.data.success) {
        setStats(res.data.stats);
      }
    } catch (err: any) {
      console.error('Failed to load admin stats:', err);
    }
  };

  // Load Hourwise Slot Roster
  const fetchSlots = async (date: string) => {
    setLoadingSlots(true);
    try {
      const res = await api.get<{ success: boolean; slots: HourwiseSlot[]; campusTime: any }>(
        `/admin/slots?date=${date}`
      );
      if (res.data.success) {
        setSlots(res.data.slots);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to retrieve slot roster',
      });
    } finally {
      setLoadingSlots(false);
    }
  };

  // Load Student Directory
  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const res = await api.get<{ success: boolean; students: StudentRecord[] }>('/admin/students');
      if (res.data.success) {
        setStudents(res.data.students);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to retrieve student directory',
      });
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchSlots(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (activeTab === 'students') {
      fetchStudents();
    }
  }, [activeTab]);

  // Handle Attendance Update (Present / Absent / Pending)
  const handleSetAttendance = async (
    bookingId: string,
    newStatus: 'PRESENT' | 'ABSENT' | 'PENDING'
  ) => {
    setUpdatingBookingId(bookingId);
    try {
      const res = await api.patch(`/admin/bookings/${bookingId}/attendance`, {
        attendanceStatus: newStatus,
      });

      if (res.data.success) {
        // Optimistically update local slots state
        setSlots((prevSlots) =>
          prevSlots.map((slot) => {
            if (slot.booking && slot.booking.id === bookingId) {
              return {
                ...slot,
                booking: {
                  ...slot.booking,
                  attendanceStatus: newStatus,
                  markedAt: new Date().toISOString(),
                },
              };
            }
            return slot;
          })
        );

        setNotification({
          type: 'success',
          message: `Candidate attendance updated to ${newStatus}.`,
        });

        // Refresh overview stats
        fetchOverview();
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to update attendance status',
      });
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/80 mb-2">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
            <span>Administrator & Exam Proctor Control</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Assessment Operations Center
          </h1>
          <p className="text-xs sm:text-sm text-surface-400 mt-1 max-w-3xl">
            Monitor daily hour-wise examination slots, verify candidate attendance, and review student progress across all programming courses.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={() => {
              fetchOverview();
              if (activeTab === 'slots') fetchSlots(selectedDate);
              else fetchStudents();
            }}
            className="p-2 rounded-xl bg-surface-800 text-surface-300 hover:text-white border border-surface-700 transition"
            title="Refresh Data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs transition ${
            notification.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800 text-rose-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-surface-400 hover:text-white text-xs ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Students */}
        <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-surface-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Registered Students</span>
            <Users className="h-4 w-4 text-brand-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats ? stats.totalStudents : '—'}</div>
          <p className="text-[11px] text-surface-400">Enrolled across all 5 courses</p>
        </div>

        {/* Card 2: Today's Bookings */}
        <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-surface-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Booked Slots (Today)</span>
            <Calendar className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats ? stats.todayBookingsCount : '—'}</div>
          <p className="text-[11px] text-surface-400">Across 8 campus time windows</p>
        </div>

        {/* Card 3: Present / Verified */}
        <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-surface-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Marked Present</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{stats ? stats.presentTodayCount : '—'}</div>
          <p className="text-[11px] text-surface-400">Verified & authorized for testing</p>
        </div>

        {/* Card 4: Pending / Absent */}
        <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-surface-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending / Absent</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-amber-300">
              {stats ? stats.pendingTodayCount : '—'}
            </span>
            <span className="text-xs text-rose-400 font-medium">
              ({stats ? stats.absentTodayCount : 0} absent)
            </span>
          </div>
          <p className="text-[11px] text-surface-400">Awaiting attendance verification</p>
        </div>
      </div>

      {/* Main Tab Controls */}
      <div className="border-b border-surface-800 flex space-x-8 text-sm">
        <button
          onClick={() => setActiveTab('slots')}
          className={`pb-3 font-semibold transition border-b-2 flex items-center space-x-2 ${
            activeTab === 'slots'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-surface-400 hover:text-white'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Hour-Wise Exam Roster & Attendance</span>
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`pb-3 font-semibold transition border-b-2 flex items-center space-x-2 ${
            activeTab === 'students'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-surface-400 hover:text-white'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Student Directory & Progression</span>
        </button>
      </div>

      {/* Tab 1: Hour-Wise Slot Roster */}
      {activeTab === 'slots' && (
        <div className="space-y-6">
          {/* Date Picker & Proctor Policy Callout */}
          <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">
                  Examination Date
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-surface-950 border border-surface-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                  <button
                    onClick={() => {
                      const now = new Date();
                      const formatter = new Intl.DateTimeFormat('en-CA', {
                        timeZone: 'Asia/Kolkata',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                      });
                      setSelectedDate(formatter.format(now));
                    }}
                    className="px-3 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-300 text-xs font-semibold transition"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      const formatter = new Intl.DateTimeFormat('en-CA', {
                        timeZone: 'Asia/Kolkata',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                      });
                      setSelectedDate(formatter.format(tomorrow));
                    }}
                    className="px-3 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-300 text-xs font-semibold transition"
                  >
                    Tomorrow
                  </button>
                </div>
              </div>
            </div>

            <div className="max-w-md p-3 rounded-xl bg-brand-950/40 border border-brand-800/60 text-xs text-brand-300 flex items-start space-x-2.5">
              <ShieldCheck className="h-4 w-4 text-brand-400 flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Proctor Verification Policy:</strong> Students can start their exam <em>only</em> after you mark them <strong>Present</strong> during their reserved slot timing.
              </p>
            </div>
          </div>

          {/* Slots List (8 1-hour slots) */}
          {loadingSlots ? (
            <div className="py-20 text-center text-surface-400 text-xs space-y-2">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-brand-400" />
              <p>Loading candidate slot bookings for {selectedDate}...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {slots.map((slot) => {
                const booking = slot.booking;

                return (
                  <div
                    key={slot.slotIndex}
                    className={`rounded-2xl border p-5 shadow-xl transition flex flex-col justify-between space-y-4 ${
                      slot.isBooked
                        ? booking?.attendanceStatus === 'PRESENT'
                          ? 'bg-surface-900 border-emerald-800/80 ring-1 ring-emerald-900/50'
                          : booking?.attendanceStatus === 'ABSENT'
                          ? 'bg-surface-900 border-rose-900/60 ring-1 ring-rose-950'
                          : 'bg-surface-900 border-amber-800/60'
                        : 'bg-surface-900/50 border-surface-800/80 opacity-75'
                    }`}
                  >
                    {/* Slot Header */}
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-surface-800">
                        <div className="flex items-center space-x-2">
                          <span className="w-6 h-6 rounded-lg bg-surface-800 text-white flex items-center justify-center text-xs font-bold">
                            {slot.slotIndex}
                          </span>
                          <span className="font-mono text-sm font-bold text-white">
                            {slot.label}
                          </span>
                        </div>

                        {slot.timingStatus.isNow ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center space-x-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                            <span>Active Now</span>
                          </span>
                        ) : slot.timingStatus.isPast ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-surface-800 text-surface-400">
                            Slot Ended
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-brand-950 text-brand-300 border border-brand-800">
                            Upcoming
                          </span>
                        )}
                      </div>

                      {/* Candidate & Booking Details */}
                      {slot.isBooked && booking ? (
                        <div className="pt-3.5 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-bold text-white">{booking.student.name}</p>
                              <p className="text-xs text-surface-400">{booking.student.email}</p>
                            </div>
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-surface-950 text-brand-400 border border-surface-800">
                              {booking.slotReference}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-surface-950 border border-surface-800 flex items-center justify-between text-xs">
                            <div className="space-y-0.5">
                              <span className="text-surface-400 text-[10px] uppercase font-semibold">
                                Track & Level
                              </span>
                              <p className="text-white font-medium">
                                {booking.course.name} • Level {booking.level.levelNumber}
                              </p>
                            </div>

                            <div className="text-right">
                              <span className="text-surface-400 text-[10px] uppercase font-semibold block">
                                Attendance State
                              </span>
                              {booking.attendanceStatus === 'PRESENT' ? (
                                <span className="inline-flex items-center space-x-1 font-bold text-emerald-400 text-xs">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>Present (Allowed)</span>
                                </span>
                              ) : booking.attendanceStatus === 'ABSENT' ? (
                                <span className="inline-flex items-center space-x-1 font-bold text-rose-400 text-xs">
                                  <XCircle className="h-3.5 w-3.5" />
                                  <span>Absent (Blocked)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 font-bold text-amber-400 text-xs">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>Pending Proctor</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-6 text-center text-xs text-surface-500">
                          <Calendar className="h-6 w-6 text-surface-700 mx-auto mb-1.5" />
                          <p>No candidate has reserved this examination slot.</p>
                        </div>
                      )}
                    </div>

                    {/* Attendance Control Action Buttons */}
                    {slot.isBooked && booking && (
                      <div className="pt-3 border-t border-surface-800 flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleSetAttendance(booking.id, 'PRESENT')}
                          disabled={updatingBookingId === booking.id || booking.attendanceStatus === 'PRESENT'}
                          className={`flex-1 py-2 px-3 rounded-xl font-semibold text-xs transition flex items-center justify-center space-x-1.5 ${
                            booking.attendanceStatus === 'PRESENT'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/80 cursor-default'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30'
                          } disabled:opacity-60`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Mark Present</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSetAttendance(booking.id, 'ABSENT')}
                          disabled={updatingBookingId === booking.id || booking.attendanceStatus === 'ABSENT'}
                          className={`flex-1 py-2 px-3 rounded-xl font-semibold text-xs transition flex items-center justify-center space-x-1.5 ${
                            booking.attendanceStatus === 'ABSENT'
                              ? 'bg-rose-950 text-rose-400 border border-rose-700/80 cursor-default'
                              : 'bg-surface-800 hover:bg-rose-950/60 text-surface-300 hover:text-rose-300 border border-surface-700'
                          } disabled:opacity-60`}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Mark Absent</span>
                        </button>

                        {booking.attendanceStatus !== 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => handleSetAttendance(booking.id, 'PENDING')}
                            disabled={updatingBookingId === booking.id}
                            className="p-2 rounded-xl bg-surface-800 text-surface-400 hover:text-white border border-surface-700 transition"
                            title="Reset to Pending"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Student Directory */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          {/* Search bar */}
          <div className="bg-surface-900 border border-surface-800 rounded-2xl p-4 shadow-xl flex items-center space-x-3">
            <Search className="h-4 w-4 text-surface-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students by name or email address..."
              className="w-full bg-transparent text-sm text-white placeholder-surface-500 focus:outline-none"
            />
          </div>

          {loadingStudents ? (
            <div className="py-20 text-center text-surface-400 text-xs space-y-2">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-brand-400" />
              <p>Loading student directory and assessment histories...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-surface-400 text-xs bg-surface-900 border border-surface-800 rounded-2xl">
              <Users className="h-8 w-8 text-surface-600 mx-auto mb-2" />
              <p>No registered students found matching your search.</p>
            </div>
          ) : (
            <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-950/70 border-b border-surface-800 text-surface-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-6 py-3.5 font-semibold">Student Name & Email</th>
                      <th className="px-6 py-3.5 font-semibold">Enrolled Tracks</th>
                      <th className="px-6 py-3.5 font-semibold">Levels Cleared</th>
                      <th className="px-6 py-3.5 font-semibold">Total Attempts</th>
                      <th className="px-6 py-3.5 font-semibold">Highest Score</th>
                      <th className="px-6 py-3.5 font-semibold">Latest Booking Slot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800">
                    {filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-surface-800/40 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-brand-600 to-accent-600 flex items-center justify-center font-bold text-white text-xs uppercase">
                              {s.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-white">{s.name}</p>
                              <p className="text-surface-400 text-[11px]">{s.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-surface-300">
                          <span className="font-medium text-white">{s.coursesEnrolled}</span> of 5 Courses
                        </td>

                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            {s.totalClearedLevels} Levels Cleared
                          </span>
                        </td>

                        <td className="px-6 py-4 text-surface-300 font-medium">
                          {s.totalAttempts} Exam Sessions
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-bold text-white">{s.bestScore} / 100</span>
                        </td>

                        <td className="px-6 py-4">
                          {s.latestBooking ? (
                            <div className="space-y-0.5">
                              <p className="font-semibold text-white text-[11px]">
                                {s.latestBooking.courseName} • L{s.latestBooking.levelNumber}
                              </p>
                              <p className="text-[10px] text-surface-400">
                                {s.latestBooking.date} @ {s.latestBooking.startTime}
                              </p>
                              <span
                                className={`inline-block text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                                  s.latestBooking.attendanceStatus === 'PRESENT'
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : s.latestBooking.attendanceStatus === 'ABSENT'
                                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                                }`}
                              >
                                {s.latestBooking.attendanceStatus}
                              </span>
                            </div>
                          ) : (
                            <span className="text-surface-500 text-[11px]">No bookings</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
