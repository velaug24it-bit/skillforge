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
  RotateCcw,
  BookOpen,
  Plus,
  ChevronRight,
  X,
  Award,
  Layers,
  Check,
  KeyRound,
  Copy,
  Timer
} from 'lucide-react';

interface AssessmentSessionRecord {
  id: string;
  attemptId: string;
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
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'AWAITING_EXIT_VERIFICATION' | 'EXIT_VERIFIED' | 'COMPLETED' | 'EXPIRED';
  totalScore: number;
  passed: boolean;
  otpStatus: 'NOT_GENERATED' | 'ACTIVE' | 'EXPIRED' | 'USED' | 'INVALIDATED';
  otpExpiresAt?: string;
  remainingSeconds: number;
  isExitVerified: boolean;
  canGenerateOtp: boolean;
  startedAt: string;
  finalSubmittedAt?: string;
  completedAt?: string;
  exitedAt?: string;
}

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

interface AdminCourseRecord {
  id: string;
  name: string;
  language: string;
  description: string;
  icon: string;
  totalLevels: number;
  isActive: boolean;
  createdAt: string;
  levelsCount: number;
  enrolledCount: number;
  completedCount: number;
}

interface StudentHistoryLevel {
  levelNumber: number;
  title: string;
  status: 'COMPLETED' | 'UNLOCKED' | 'LOCKED';
  isCompleted: boolean;
  isUnlocked: boolean;
  attemptsCount: number;
  attemptsToClear: number | null;
  highestScore: number;
  attempts: {
    id: string;
    score: number;
    passed: boolean;
    status: string;
    createdAt: string;
    completedAt?: string;
  }[];
}

interface StudentHistoryCourse {
  courseId: string;
  courseName: string;
  language: string;
  icon: string;
  totalLevels: number;
  isEnrolled: boolean;
  currentUnlockedLevel: number;
  completedLevelsCount: number;
  isCompleted: boolean;
  progressPercentage: number;
  levels: StudentHistoryLevel[];
}

interface StudentHistoryData {
  success?: boolean;
  student: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  };
  stats: {
    totalCoursesEnrolled: number;
    totalLevelsCleared: number;
    totalAttempts: number;
    passedAttempts: number;
    passRate: number;
    totalBookings: number;
  };
  coursesProgress: StudentHistoryCourse[];
  attemptsHistory: {
    id: string;
    courseName: string;
    language: string;
    levelNumber: number;
    levelTitle: string;
    totalScore: number;
    passed: boolean;
    status: string;
    createdAt: string;
    completedAt?: string;
    questionsCount: number;
  }[];
  bookingsHistory: {
    id: string;
    slotReference: string;
    courseName: string;
    levelNumber: number;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    attendanceStatus: 'PENDING' | 'PRESENT' | 'ABSENT';
    markedAt?: string;
    createdAt: string;
  }[];
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
  const [activeTab, setActiveTab] = useState<'slots' | 'students' | 'courses' | 'sessions'>('slots');
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

  // Student History Modal state
  const [selectedStudentHistory, setSelectedStudentHistory] = useState<StudentHistoryData | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyTab, setHistoryTab] = useState<'courses' | 'attempts' | 'bookings'>('courses');

  // Courses Management state
  const [courses, setCourses] = useState<AdminCourseRecord[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [courseFormData, setCourseFormData] = useState({
    name: '',
    language: 'python' as 'c' | 'cpp' | 'java' | 'python' | 'javascript',
    description: '',
    icon: 'Terminal',
  });

  // Assessment Sessions & OTP Management state
  const [sessions, setSessions] = useState<AssessmentSessionRecord[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionStatusFilter, setSessionStatusFilter] = useState<'ALL' | 'AWAITING' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const [generatingOtpAttemptId, setGeneratingOtpAttemptId] = useState<string | null>(null);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [activeOtpModal, setActiveOtpModal] = useState<{
    attemptId: string;
    studentName: string;
    courseName: string;
    levelNumber: number;
    otp: string;
    expiresAt: string;
    remainingSeconds: number;
  } | null>(null);

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
        message: err?.response?.data?.message || 'Failed to fetch examination slots',
      });
    } finally {
      setLoadingSlots(false);
    }
  };

  // Load Students Directory
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
        message: err?.response?.data?.message || 'Failed to fetch student directory',
      });
    } finally {
      setLoadingStudents(false);
    }
  };

  // Load Courses List
  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await api.get<{ success: boolean; courses: AdminCourseRecord[] }>('/admin/courses');
      if (res.data.success) {
        setCourses(res.data.courses);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to load courses',
      });
    } finally {
      setLoadingCourses(false);
    }
  };

  // Load Assessment Sessions for OTP Management
  const fetchAssessmentSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await api.get<{ success: boolean; sessions: AssessmentSessionRecord[] }>('/admin/assessment-sessions');
      if (res.data.success) {
        setSessions(res.data.sessions);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to fetch assessment sessions',
      });
    } finally {
      setLoadingSessions(false);
    }
  };

  // Generate 6-digit Exit OTP with 30s countdown
  const handleGenerateOtp = async (attemptId: string) => {
    setGeneratingOtpAttemptId(attemptId);
    try {
      const res = await api.post<{
        success: boolean;
        message: string;
        attemptId: string;
        studentName: string;
        courseName: string;
        levelNumber: number;
        otp: string;
        expiresAt: string;
        validitySeconds: number;
      }>(`/admin/assessment-sessions/${attemptId}/generate-otp`);

      if (res.data.success) {
        setActiveOtpModal({
          attemptId: res.data.attemptId,
          studentName: res.data.studentName || 'Student',
          courseName: res.data.courseName || 'Course',
          levelNumber: res.data.levelNumber || 1,
          otp: res.data.otp,
          expiresAt: res.data.expiresAt,
          remainingSeconds: res.data.validitySeconds || 30,
        });
        setCopiedOtp(false);

        setNotification({
          type: 'success',
          message: `Exit OTP ${res.data.otp} generated for ${res.data.studentName}. Active for 30s.`,
        });

        fetchAssessmentSessions();
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to generate exit OTP',
      });
    } finally {
      setGeneratingOtpAttemptId(null);
    }
  };

  // Fetch Student History
  const handleOpenStudentHistory = async (studentId: string) => {
    setLoadingHistory(true);
    setSelectedStudentHistory(null);
    setHistoryTab('courses');
    try {
      const res = await api.get<StudentHistoryData>(`/admin/students/${studentId}/history`);
      if (res.data.success) {
        setSelectedStudentHistory(res.data);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to load student history',
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  // Create New Course
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseFormData.name.trim() || !courseFormData.description.trim()) {
      setNotification({ type: 'error', message: 'Course name and description are required' });
      return;
    }

    setCreatingCourse(true);
    try {
      const res = await api.post('/admin/courses', courseFormData);
      if (res.data.success) {
        setNotification({
          type: 'success',
          message: res.data.message || 'Course and 4 assessment levels created successfully!',
        });
        setIsAddCourseModalOpen(false);
        setCourseFormData({
          name: '',
          language: 'python',
          description: '',
          icon: 'Terminal',
        });
        fetchCourses();
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to create course',
      });
    } finally {
      setCreatingCourse(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchSlots(selectedDate);
    fetchStudents();
    fetchCourses();
    fetchAssessmentSessions();
  }, []);

  // Live countdown ticker every 1 second
  useEffect(() => {
    const timer = setInterval(() => {
      // 1. Tick active OTP modal if open
      setActiveOtpModal((prev) => {
        if (!prev) return null;
        const diff = Math.max(0, Math.floor((new Date(prev.expiresAt).getTime() - Date.now()) / 1000));
        return { ...prev, remainingSeconds: diff };
      });

      // 2. Tick active sessions in table
      setSessions((prev) =>
        prev.map((s) => {
          if (s.otpStatus === 'ACTIVE' && s.otpExpiresAt) {
            const diff = Math.max(0, Math.floor((new Date(s.otpExpiresAt).getTime() - Date.now()) / 1000));
            return {
              ...s,
              remainingSeconds: diff,
              otpStatus: diff === 0 ? 'EXPIRED' : 'ACTIVE',
            };
          }
          return s;
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    fetchSlots(newDate);
  };

  // Handle Proctor Attendance updates
  const handleSetAttendance = async (bookingId: string, newStatus: 'PRESENT' | 'ABSENT' | 'PENDING') => {
    setUpdatingBookingId(bookingId);
    try {
      const res = await api.patch<{ success: boolean; message: string; booking: any }>(
        `/admin/bookings/${bookingId}/attendance`,
        { attendanceStatus: newStatus }
      );

      if (res.data.success) {
        // Update local slot state optimistically
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
            <span>Proctor Administration & Exam Controller</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Administrator Portal
          </h1>
          <p className="text-xs sm:text-sm text-surface-400 mt-1">
            Hour-wise proctor attendance verification, student progression drilldown, and curriculum management.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              fetchOverview();
              fetchSlots(selectedDate);
              fetchStudents();
              fetchCourses();
              fetchAssessmentSessions();
            }}
            className="px-3.5 py-2 rounded-xl bg-surface-900 hover:bg-surface-800 border border-surface-700/80 text-surface-300 hover:text-white text-xs font-semibold transition flex items-center space-x-1.5 shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh All Data</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800 text-rose-300'
          }`}
        >
          <div className="flex items-center space-x-2 text-xs font-medium">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-400" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            &times;
          </button>
        </div>
      )}

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Registered Students */}
        <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-surface-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Registered Students</span>
            <Users className="h-4 w-4 text-brand-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats ? stats.totalStudents : '—'}</div>
          <p className="text-[11px] text-surface-400">Enrolled across programming tracks</p>
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

        <button
          onClick={() => setActiveTab('courses')}
          className={`pb-3 font-semibold transition border-b-2 flex items-center space-x-2 ${
            activeTab === 'courses'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-surface-400 hover:text-white'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Course Management</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('sessions');
            fetchAssessmentSessions();
          }}
          className={`pb-3 font-semibold transition border-b-2 flex items-center space-x-2 ${
            activeTab === 'sessions'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-surface-400 hover:text-white'
          }`}
        >
          <KeyRound className="h-4 w-4" />
          <span>Assessment OTP Management</span>
          {sessions.filter((s) => s.status === 'AWAITING_EXIT_VERIFICATION').length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-black animate-pulse">
              {sessions.filter((s) => s.status === 'AWAITING_EXIT_VERIFICATION').length} Awaiting
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Hour-Wise Slot Roster & Attendance Controls */}
      {activeTab === 'slots' && (
        <div className="space-y-6">
          {/* Date Picker & Proctor Instructions */}
          <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-brand-400" />
              <div>
                <p className="text-xs font-semibold text-white">Select Examination Date</p>
                <p className="text-[11px] text-surface-400">Filter candidate bookings across 8 everyday slots</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="px-3.5 py-2 bg-surface-950 border border-surface-700 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-brand-500"
              />
              <span className="text-xs text-surface-400">Campus Timezone: <strong>Asia/Kolkata</strong></span>
            </div>
          </div>

          {/* Slot Grid (8 Slots) */}
          {loadingSlots ? (
            <div className="py-20 text-center text-surface-400 text-xs space-y-2">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-brand-400" />
              <p>Loading everyday hour-wise slots...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {slots.map((slot) => {
                const booking = slot.booking;
                const isNow = slot.timingStatus.isNow;
                const isPast = slot.timingStatus.isPast;

                return (
                  <div
                    key={slot.slotIndex}
                    className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                      booking
                        ? isNow
                          ? 'bg-brand-950/20 border-brand-500/80 shadow-lg ring-1 ring-brand-500/30'
                          : 'bg-surface-900 border-surface-700/80 shadow-md'
                        : 'bg-surface-950/40 border-surface-800/60 opacity-60'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Slot Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="w-6 h-6 rounded-md bg-surface-800 text-surface-300 flex items-center justify-center text-[10px] font-bold">
                            #{slot.slotIndex}
                          </span>
                          <span className="text-xs font-bold text-white">{slot.label}</span>
                        </div>

                        {isNow && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-950 text-brand-300 border border-brand-800 animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                            <span>Active Now</span>
                          </span>
                        )}
                        {isPast && !isNow && (
                          <span className="text-[10px] text-surface-500 font-medium">Slot Ended</span>
                        )}
                      </div>

                      {/* Candidate Info or Empty Slot */}
                      {booking ? (
                        <div className="space-y-2.5 pt-2 border-t border-surface-800">
                          <div>
                            <p className="text-xs font-bold text-white flex items-center justify-between">
                              <span>{booking.student.name}</span>
                              <span className="font-mono text-[10px] text-surface-400">{booking.slotReference}</span>
                            </p>
                            <p className="text-[11px] text-surface-400">{booking.student.email}</p>
                          </div>

                          <div className="p-2 rounded-lg bg-surface-950 border border-surface-800 text-[11px] space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-surface-300 font-medium">{booking.course.name}</span>
                              <span className="px-1.5 py-0.2 rounded bg-surface-800 text-surface-300 font-mono text-[10px]">
                                Level {booking.level.levelNumber}
                              </span>
                            </div>
                            <p className="text-[10px] text-surface-400">{booking.level.title}</p>
                          </div>

                          {/* Attendance Status Badge */}
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-surface-400 font-medium">Attendance:</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center space-x-1 uppercase ${
                                booking.attendanceStatus === 'PRESENT'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : booking.attendanceStatus === 'ABSENT'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : 'bg-amber-950 text-amber-300 border border-amber-800'
                              }`}
                            >
                              {booking.attendanceStatus === 'PRESENT' && <CheckCircle2 className="h-3 w-3" />}
                              {booking.attendanceStatus === 'ABSENT' && <XCircle className="h-3 w-3" />}
                              {booking.attendanceStatus === 'PENDING' && <Clock className="h-3 w-3" />}
                              <span>{booking.attendanceStatus}</span>
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-6 text-center text-surface-500 text-xs border-t border-surface-800">
                          <p>No booking for this slot</p>
                          <span className="text-[10px] text-surface-600">Available for reservation</span>
                        </div>
                      )}
                    </div>

                    {/* Attendance Controls */}
                    {booking && (
                      <div className="pt-4 mt-3 border-t border-surface-800 flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleSetAttendance(booking.id, 'PRESENT')}
                          disabled={updatingBookingId === booking.id || booking.attendanceStatus === 'PRESENT'}
                          className={`flex-1 py-2 px-3 rounded-xl font-semibold text-xs transition flex items-center justify-center space-x-1.5 ${
                            booking.attendanceStatus === 'PRESENT'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/80 cursor-default'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
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

      {/* Tab 2: Student Directory & Progress History */}
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
                      <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
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
                          <span className="font-medium text-white">{s.coursesEnrolled}</span> Enrolled Tracks
                        </td>

                        <td className="px-6 py-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
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

                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleOpenStudentHistory(s.id)}
                            className="px-3 py-1.5 rounded-xl bg-brand-600/20 hover:bg-brand-600 text-brand-300 hover:text-white border border-brand-500/30 text-[11px] font-semibold transition inline-flex items-center space-x-1"
                          >
                            <span>View Full History</span>
                            <ChevronRight className="h-3 w-3" />
                          </button>
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

      {/* Tab 3: Course Management & Addition */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white">Course Curriculum & Tracks</h2>
              <p className="text-xs text-surface-400 mt-0.5">
                Manage programming tracks, check completion rates, and add new assessment curriculums.
              </p>
            </div>
            <button
              onClick={() => setIsAddCourseModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-600/30 transition flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Course</span>
            </button>
          </div>

          {loadingCourses ? (
            <div className="py-20 text-center text-surface-400 text-xs space-y-2">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-brand-400" />
              <p>Loading course catalog...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="rounded-2xl bg-surface-900 border border-surface-800 p-6 shadow-xl flex flex-col justify-between space-y-4 hover:border-surface-700 transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-950 text-brand-300 border border-brand-800 uppercase tracking-wider">
                        {course.language} Track
                      </span>
                      <span className="text-[10px] font-medium text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                        Active Curriculum
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white">{course.name}</h3>
                    <p className="text-xs text-surface-300 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-surface-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-surface-400">
                      <span>Configured Levels:</span>
                      <span className="font-bold text-white">{course.totalLevels} Progressive Levels</span>
                    </div>
                    <div className="flex items-center justify-between text-surface-400">
                      <span>Enrolled Students:</span>
                      <span className="font-bold text-brand-400">{course.enrolledCount} Students</span>
                    </div>
                    <div className="flex items-center justify-between text-surface-400">
                      <span>Completed Course:</span>
                      <span className="font-bold text-emerald-400">{course.completedCount} Graduates</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Assessment Sessions & Exit OTP Management */}
      {activeTab === 'sessions' && (
        <div className="space-y-6">
          {/* Active Generated OTP Hero Card (If Active) */}
          {activeOtpModal && (
            <div className="rounded-3xl bg-gradient-to-br from-amber-950/70 via-surface-900 to-surface-950 border-2 border-amber-500/80 p-6 sm:p-8 shadow-2xl shadow-amber-500/10 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
                    <KeyRound className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Exit Verification Code</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        activeOtpModal.remainingSeconds > 0 
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 animate-pulse'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {activeOtpModal.remainingSeconds > 0 ? 'VALID & ACTIVE' : 'EXPIRED'}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white">
                      {activeOtpModal.studentName} — {activeOtpModal.courseName} (Level {activeOtpModal.levelNumber})
                    </h3>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {activeOtpModal.remainingSeconds === 0 ? (
                    <button
                      onClick={() => handleGenerateOtp(activeOtpModal.attemptId)}
                      disabled={generatingOtpAttemptId === activeOtpModal.attemptId}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md transition flex items-center space-x-1.5"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Regenerate OTP</span>
                    </button>
                  ) : null}
                  <button
                    onClick={() => setActiveOtpModal(null)}
                    className="p-2 rounded-xl text-surface-400 hover:text-white hover:bg-surface-800 transition"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* OTP Display and 30s Countdown Strip */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center bg-surface-950/80 border border-amber-900/40 rounded-2xl p-6 relative z-10">
                <div className="md:col-span-2 space-y-2">
                  <p className="text-xs text-surface-400 font-medium">
                    Provide this 6-digit exit verification code directly to candidate. Single-use and strictly bound to this session:
                  </p>
                  <div className="flex items-center space-x-4">
                    <span className="text-4xl sm:text-5xl font-mono font-black tracking-widest text-amber-300 bg-surface-900 px-6 py-2.5 rounded-2xl border border-amber-500/50 shadow-inner select-all">
                      {activeOtpModal.otp}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(activeOtpModal.otp);
                        setCopiedOtp(true);
                        setTimeout(() => setCopiedOtp(false), 2000);
                      }}
                      className="px-4 py-3 rounded-xl bg-surface-800 hover:bg-surface-700 text-white text-xs font-semibold border border-surface-700 transition flex items-center space-x-1.5"
                    >
                      {copiedOtp ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Live Countdown Wheel/Ticker */}
                <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-surface-900/90 border border-surface-800 text-center space-y-2">
                  <div className="flex items-center space-x-2 text-surface-400 text-xs font-medium">
                    <Timer className="h-4 w-4 text-amber-400" />
                    <span>Live Expiry Countdown</span>
                  </div>
                  <div className={`text-3xl font-black font-mono ${
                    activeOtpModal.remainingSeconds > 10
                      ? 'text-emerald-400'
                      : activeOtpModal.remainingSeconds > 0
                      ? 'text-amber-400 animate-pulse'
                      : 'text-rose-400'
                  }`}>
                    {activeOtpModal.remainingSeconds > 0 ? `${activeOtpModal.remainingSeconds}s` : 'EXPIRED'}
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-surface-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-1000 ${
                        activeOtpModal.remainingSeconds > 10 ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${(activeOtpModal.remainingSeconds / 30) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-surface-500">
                    {activeOtpModal.remainingSeconds > 0 ? 'Server-enforced 30-second window' : 'Click Regenerate for a new code'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sessions Filter and Search Controls */}
          <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3 flex-1">
              <Search className="h-4 w-4 text-surface-400" />
              <input
                type="text"
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
                placeholder="Search candidates by name, email, or attempt ID..."
                className="w-full bg-transparent text-sm text-white placeholder-surface-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-xs text-surface-400">Filter:</span>
              <select
                value={sessionStatusFilter}
                onChange={(e) => setSessionStatusFilter(e.target.value as any)}
                className="px-3.5 py-2 bg-surface-950 border border-surface-700 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-brand-500"
              >
                <option value="ALL">All Assessment Sessions</option>
                <option value="AWAITING">Awaiting Exit Verification</option>
                <option value="ACTIVE">In Progress / Submitted</option>
                <option value="COMPLETED">Completed / Exited</option>
              </select>

              <button
                onClick={fetchAssessmentSessions}
                className="p-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white border border-surface-700 transition"
                title="Refresh Assessment Sessions"
              >
                <RefreshCw className={`h-4 w-4 ${loadingSessions ? 'animate-spin text-brand-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Sessions Table */}
          {loadingSessions ? (
            <div className="py-20 text-center text-surface-400 text-xs space-y-2">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-brand-400" />
              <p>Loading candidate assessment sessions & exit verification states...</p>
            </div>
          ) : (
            <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-950/70 border-b border-surface-800 text-surface-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-6 py-3.5 font-semibold">Candidate</th>
                      <th className="px-6 py-3.5 font-semibold">Course & Level</th>
                      <th className="px-6 py-3.5 font-semibold">Score / 100</th>
                      <th className="px-6 py-3.5 font-semibold">Assessment Status</th>
                      <th className="px-6 py-3.5 font-semibold">Exit OTP State</th>
                      <th className="px-6 py-3.5 font-semibold text-right">Proctor Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800">
                    {sessions
                      .filter((s) => {
                        // Search
                        const q = sessionSearch.toLowerCase();
                        const matchesSearch =
                          s.student.name.toLowerCase().includes(q) ||
                          s.student.email.toLowerCase().includes(q) ||
                          s.id.toLowerCase().includes(q);
                        if (!matchesSearch) return false;

                        // Filter
                        if (sessionStatusFilter === 'AWAITING') return s.status === 'AWAITING_EXIT_VERIFICATION';
                        if (sessionStatusFilter === 'ACTIVE') return ['IN_PROGRESS', 'SUBMITTED'].includes(s.status);
                        if (sessionStatusFilter === 'COMPLETED') return ['COMPLETED', 'EXIT_VERIFIED'].includes(s.status);
                        return true;
                      })
                      .map((s) => {
                        const isAwaiting = s.status === 'AWAITING_EXIT_VERIFICATION';
                        const isCompleted = s.status === 'COMPLETED' || s.isExitVerified;

                        return (
                          <tr key={s.id} className={`hover:bg-surface-800/40 transition ${isAwaiting ? 'bg-amber-950/10' : ''}`}>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-brand-600 to-accent-600 flex items-center justify-center font-bold text-white text-xs uppercase">
                                  {s.student.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-semibold text-white">{s.student.name}</p>
                                  <p className="text-surface-400 text-[11px]">{s.student.email}</p>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <p className="font-semibold text-white">{s.course.name}</p>
                              <p className="text-surface-400 text-[11px]">Level {s.level.levelNumber} • {s.level.title}</p>
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-white text-sm">{s.totalScore} / 100</span>
                                {s.passed ? (
                                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                    PASSED
                                  </span>
                                ) : s.status !== 'IN_PROGRESS' ? (
                                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                                    FAILED
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-surface-500">—</span>
                                )}
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              {s.status === 'AWAITING_EXIT_VERIFICATION' ? (
                                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 animate-pulse">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                  <span>Awaiting Exit Verification</span>
                                </span>
                              ) : s.status === 'COMPLETED' ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                  <Check className="h-3 w-3" />
                                  <span>Completed & Exited</span>
                                </span>
                              ) : s.status === 'EXIT_VERIFIED' ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                  <Check className="h-3 w-3" />
                                  <span>Exit Verified</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                                  <span>In Progress</span>
                                </span>
                              )}
                            </td>

                            <td className="px-6 py-4">
                              {s.otpStatus === 'ACTIVE' && s.remainingSeconds > 0 ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 animate-pulse">
                                    <Timer className="h-3 w-3" />
                                    <span>Active ({s.remainingSeconds}s)</span>
                                  </span>
                                  <p className="text-[10px] text-surface-500 font-mono">Expires shortly</p>
                                </div>
                              ) : s.otpStatus === 'USED' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                  OTP Verified
                                </span>
                              ) : s.otpStatus === 'EXPIRED' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                                  OTP Expired
                                </span>
                              ) : (
                                <span className="text-[11px] text-surface-500 font-medium">Not Generated</span>
                              )}
                            </td>

                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleGenerateOtp(s.id)}
                                disabled={generatingOtpAttemptId === s.id}
                                className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition inline-flex items-center space-x-1.5 shadow-sm ${
                                  s.otpStatus === 'ACTIVE' && s.remainingSeconds > 0
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                                    : isAwaiting
                                    ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20 animate-pulse'
                                    : 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-600/20'
                                } disabled:opacity-50`}
                              >
                                {generatingOtpAttemptId === s.id ? (
                                  <>
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                    <span>Generating...</span>
                                  </>
                                ) : (
                                  <>
                                    <KeyRound className="h-3 w-3" />
                                    <span>
                                      {s.otpStatus === 'ACTIVE' && s.remainingSeconds > 0
                                        ? `Active (${s.remainingSeconds}s) — Re-issue`
                                        : isCompleted
                                        ? 'Generate Exit OTP'
                                        : isAwaiting
                                        ? 'Generate Exit OTP'
                                        : 'Generate Exit OTP'}
                                    </span>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Student History Modal */}
      {(selectedStudentHistory || loadingHistory) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface-900 border border-surface-700 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col my-8">
            {loadingHistory ? (
              <div className="p-16 text-center text-surface-400 text-xs space-y-3">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-brand-400" />
                <p>Loading complete assessment history & level drilldown...</p>
              </div>
            ) : selectedStudentHistory && (
              <>
                {/* Modal Header */}
                <div className="p-6 border-b border-surface-800 flex items-start justify-between bg-surface-950/40">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-600 flex items-center justify-center font-extrabold text-white text-lg uppercase shadow-lg">
                      {selectedStudentHistory.student.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-lg font-bold text-white">
                          {selectedStudentHistory.student.name}
                        </h2>
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-brand-950 text-brand-300 border border-brand-800">
                          Student
                        </span>
                      </div>
                      <p className="text-xs text-surface-400">{selectedStudentHistory.student.email}</p>
                      <p className="text-[10px] text-surface-500 mt-0.5">
                        Registered on {new Date(selectedStudentHistory.student.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedStudentHistory(null)}
                    className="p-2 rounded-xl text-surface-400 hover:text-white hover:bg-surface-800 transition"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Aggregate Stats Strip */}
                <div className="p-6 border-b border-surface-800 grid grid-cols-2 sm:grid-cols-5 gap-3 bg-surface-950/20 text-center">
                  <div className="p-3 rounded-xl bg-surface-900 border border-surface-800">
                    <p className="text-[10px] font-semibold text-surface-400 uppercase">Enrolled</p>
                    <p className="text-lg font-bold text-white mt-1">
                      {selectedStudentHistory.stats.totalCoursesEnrolled} Tracks
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-900 border border-surface-800">
                    <p className="text-[10px] font-semibold text-surface-400 uppercase">Cleared Levels</p>
                    <p className="text-lg font-bold text-emerald-400 mt-1">
                      {selectedStudentHistory.stats.totalLevelsCleared} Cleared
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-900 border border-surface-800">
                    <p className="text-[10px] font-semibold text-surface-400 uppercase">Total Attempts</p>
                    <p className="text-lg font-bold text-white mt-1">
                      {selectedStudentHistory.stats.totalAttempts} Sessions
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-900 border border-surface-800">
                    <p className="text-[10px] font-semibold text-surface-400 uppercase">Pass Rate</p>
                    <p className="text-lg font-bold text-brand-400 mt-1">
                      {selectedStudentHistory.stats.passRate}%
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-900 border border-surface-800">
                    <p className="text-[10px] font-semibold text-surface-400 uppercase">Slot Bookings</p>
                    <p className="text-lg font-bold text-cyan-400 mt-1">
                      {selectedStudentHistory.stats.totalBookings} Reserved
                    </p>
                  </div>
                </div>

                {/* Modal Sub-Tabs */}
                <div className="px-6 border-b border-surface-800 flex space-x-6 text-xs bg-surface-950/40">
                  <button
                    onClick={() => setHistoryTab('courses')}
                    className={`py-3 font-semibold transition border-b-2 flex items-center space-x-1.5 ${
                      historyTab === 'courses'
                        ? 'border-brand-500 text-brand-400'
                        : 'border-transparent text-surface-400 hover:text-white'
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>Course Progress & Level Attempts</span>
                  </button>

                  <button
                    onClick={() => setHistoryTab('attempts')}
                    className={`py-3 font-semibold transition border-b-2 flex items-center space-x-1.5 ${
                      historyTab === 'attempts'
                        ? 'border-brand-500 text-brand-400'
                        : 'border-transparent text-surface-400 hover:text-white'
                    }`}
                  >
                    <Award className="h-3.5 w-3.5" />
                    <span>All Assessment Attempts ({selectedStudentHistory.attemptsHistory.length})</span>
                  </button>

                  <button
                    onClick={() => setHistoryTab('bookings')}
                    className={`py-3 font-semibold transition border-b-2 flex items-center space-x-1.5 ${
                      historyTab === 'bookings'
                        ? 'border-brand-500 text-brand-400'
                        : 'border-transparent text-surface-400 hover:text-white'
                    }`}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Slot Bookings & Attendance ({selectedStudentHistory.bookingsHistory.length})</span>
                  </button>
                </div>

                {/* Sub-Tab 1: Course-by-Course Level Breakdown */}
                <div className="p-6 space-y-6 overflow-y-auto">
                  {historyTab === 'courses' && (
                    <div className="space-y-6">
                      {selectedStudentHistory.coursesProgress.map((course) => (
                        <div
                          key={course.courseId}
                          className="rounded-2xl bg-surface-950/60 border border-surface-800 p-5 space-y-4"
                        >
                          {/* Course Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-950 text-brand-300 border border-brand-800 uppercase">
                                  {course.language}
                                </span>
                                <h3 className="text-sm font-bold text-white">{course.courseName}</h3>
                              </div>
                              <p className="text-[11px] text-surface-400 mt-0.5">
                                Progress: Level {course.currentUnlockedLevel} Unlocked • {course.completedLevelsCount} of {course.totalLevels} levels cleared ({course.progressPercentage}%)
                              </p>
                            </div>

                            <div className="w-full sm:w-48 bg-surface-800 rounded-full h-2.5 overflow-hidden">
                              <div
                                className="bg-emerald-500 h-2.5 rounded-full transition-all"
                                style={{ width: `${course.progressPercentage}%` }}
                              />
                            </div>
                          </div>

                          {/* 4 Levels for this course */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {course.levels.map((lvl) => (
                              <div
                                key={lvl.levelNumber}
                                className={`rounded-xl border p-3 flex flex-col justify-between space-y-2 ${
                                  lvl.isCompleted
                                    ? 'bg-emerald-950/20 border-emerald-800/80 shadow-sm'
                                    : lvl.isUnlocked
                                    ? 'bg-surface-900 border-surface-700'
                                    : 'bg-surface-950 border-surface-800/60 opacity-50'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${
                                      lvl.isCompleted
                                        ? 'bg-emerald-600 text-white'
                                        : lvl.isUnlocked
                                        ? 'bg-brand-600 text-white'
                                        : 'bg-surface-800 text-surface-500'
                                    }`}>
                                      L{lvl.levelNumber}
                                    </span>

                                    {lvl.isCompleted ? (
                                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center space-x-1">
                                        <Check className="h-2.5 w-2.5" />
                                        <span>Cleared (100)</span>
                                      </span>
                                    ) : lvl.isUnlocked ? (
                                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-brand-950 text-brand-300 border border-brand-800">
                                        Unlocked
                                      </span>
                                    ) : (
                                      <span className="text-[9px] text-surface-500 font-semibold uppercase">
                                        Locked
                                      </span>
                                    )}
                                  </div>

                                  <h4 className="text-xs font-bold text-white line-clamp-1">{lvl.title}</h4>
                                </div>

                                <div className="pt-2 border-t border-surface-800/80 text-[10px] space-y-1">
                                  {lvl.isCompleted ? (
                                    <div className="text-emerald-400 font-semibold">
                                      Completed in {lvl.attemptsToClear || lvl.attemptsCount || 1} {(lvl.attemptsToClear || lvl.attemptsCount || 1) === 1 ? 'attempt' : 'attempts'}
                                    </div>
                                  ) : lvl.isUnlocked ? (
                                    <div className="text-surface-300">
                                      {lvl.attemptsCount > 0 ? (
                                        <span>{lvl.attemptsCount} attempt{lvl.attemptsCount === 1 ? '' : 's'} made (Best: {lvl.highestScore}/100)</span>
                                      ) : (
                                        <span className="text-surface-500">Ready to book & attempt</span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-surface-500">Requires clearing L{lvl.levelNumber - 1}</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sub-Tab 2: All Attempts Table */}
                  {historyTab === 'attempts' && (
                    <div className="border border-surface-800 rounded-2xl overflow-hidden bg-surface-950/40">
                      {selectedStudentHistory.attemptsHistory.length === 0 ? (
                        <div className="p-8 text-center text-surface-500 text-xs">
                          No assessment attempts recorded for this student yet.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs">
                          <thead className="bg-surface-950 text-surface-400 uppercase text-[10px] border-b border-surface-800">
                            <tr>
                              <th className="px-4 py-3 font-semibold">Date & Time</th>
                              <th className="px-4 py-3 font-semibold">Course & Track</th>
                              <th className="px-4 py-3 font-semibold">Level</th>
                              <th className="px-4 py-3 font-semibold">Total Score</th>
                              <th className="px-4 py-3 font-semibold">Result</th>
                              <th className="px-4 py-3 font-semibold">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-800">
                            {selectedStudentHistory.attemptsHistory.map((att) => (
                              <tr key={att.id} className="hover:bg-surface-800/30">
                                <td className="px-4 py-3 text-surface-300 text-[11px]">
                                  {new Date(att.createdAt).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 font-medium text-white">
                                  {att.courseName} ({att.language})
                                </td>
                                <td className="px-4 py-3 text-surface-300">
                                  Level {att.levelNumber}
                                </td>
                                <td className="px-4 py-3 font-bold text-white">
                                  {att.totalScore} / 100
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      att.passed
                                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                                    }`}
                                  >
                                    {att.passed ? 'PASSED (100)' : 'FAILED'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-surface-400 text-[11px]">
                                  {att.status}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* Sub-Tab 3: Bookings Table */}
                  {historyTab === 'bookings' && (
                    <div className="border border-surface-800 rounded-2xl overflow-hidden bg-surface-950/40">
                      {selectedStudentHistory.bookingsHistory.length === 0 ? (
                        <div className="p-8 text-center text-surface-500 text-xs">
                          No exam bookings found for this student.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs">
                          <thead className="bg-surface-950 text-surface-400 uppercase text-[10px] border-b border-surface-800">
                            <tr>
                              <th className="px-4 py-3 font-semibold">Reference</th>
                              <th className="px-4 py-3 font-semibold">Course & Level</th>
                              <th className="px-4 py-3 font-semibold">Date & Timing</th>
                              <th className="px-4 py-3 font-semibold">Proctor Attendance</th>
                              <th className="px-4 py-3 font-semibold">Booking State</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-800">
                            {selectedStudentHistory.bookingsHistory.map((b) => (
                              <tr key={b.id} className="hover:bg-surface-800/30">
                                <td className="px-4 py-3 font-mono text-[11px] text-brand-400 font-semibold">
                                  {b.slotReference}
                                </td>
                                <td className="px-4 py-3 font-medium text-white">
                                  {b.courseName} • Level {b.levelNumber}
                                </td>
                                <td className="px-4 py-3 text-surface-300 text-[11px]">
                                  {b.date} @ {b.startTime} – {b.endTime}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                      b.attendanceStatus === 'PRESENT'
                                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                        : b.attendanceStatus === 'ABSENT'
                                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                                    }`}
                                  >
                                    {b.attendanceStatus}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-surface-400 text-[11px]">
                                  {b.status}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      {isAddCourseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-surface-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-surface-800 pb-3">
              <div className="flex items-center space-x-2">
                <Plus className="h-5 w-5 text-brand-400" />
                <h3 className="text-base font-bold text-white">Add New Course & Curriculum</h3>
              </div>
              <button
                onClick={() => setIsAddCourseModalOpen(false)}
                className="text-surface-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-300 mb-1">
                  Course Title / Name *
                </label>
                <input
                  type="text"
                  required
                  value={courseFormData.name}
                  onChange={(e) => setCourseFormData({ ...courseFormData, name: e.target.value })}
                  placeholder="e.g. Modern C++ & Algorithms Mastery"
                  className="w-full px-3.5 py-2.5 bg-surface-950 border border-surface-700 rounded-xl text-white text-xs placeholder-surface-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-300 mb-1">
                  Programming Language Track *
                </label>
                <select
                  value={courseFormData.language}
                  onChange={(e) =>
                    setCourseFormData({
                      ...courseFormData,
                      language: e.target.value as any,
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-surface-950 border border-surface-700 rounded-xl text-white text-xs focus:outline-none focus:border-brand-500"
                >
                  <option value="python">Python 3</option>
                  <option value="java">Java 21</option>
                  <option value="cpp">C++ (GCC 14)</option>
                  <option value="c">C (GCC 14)</option>
                  <option value="javascript">JavaScript / Node.js</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-300 mb-1">
                  Course Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={courseFormData.description}
                  onChange={(e) => setCourseFormData({ ...courseFormData, description: e.target.value })}
                  placeholder="Comprehensive description covering syllabus, objectives, and problem domains..."
                  className="w-full px-3.5 py-2.5 bg-surface-950 border border-surface-700 rounded-xl text-white text-xs placeholder-surface-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-300 mb-1">
                  Track Icon
                </label>
                <select
                  value={courseFormData.icon}
                  onChange={(e) => setCourseFormData({ ...courseFormData, icon: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-surface-950 border border-surface-700 rounded-xl text-white text-xs focus:outline-none focus:border-brand-500"
                >
                  <option value="Terminal">Terminal</option>
                  <option value="Code">Code</option>
                  <option value="Cpu">Cpu</option>
                  <option value="Database">Database</option>
                  <option value="BookOpen">BookOpen</option>
                  <option value="Layers">Layers</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-brand-950/40 border border-brand-800 text-[11px] text-brand-300 space-y-1">
                <p className="font-semibold text-white">Automatic Curriculum Provisioning:</p>
                <p className="text-surface-300">
                  SkillForge will automatically create 4 progressive Assessment Levels (Beginner to Expert) and 8 verified coding questions with sample and private test cases for this course.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2 border-t border-surface-800">
                <button
                  type="button"
                  onClick={() => setIsAddCourseModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-surface-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingCourse}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-600/30 transition flex items-center space-x-2 disabled:opacity-50"
                >
                  {creatingCourse ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Creating Course & Levels...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      <span>Create Course</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
