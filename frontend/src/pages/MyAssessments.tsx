import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { 
  Calendar, 
  Clock, 
  Play, 
  XCircle, 
  RefreshCw, 
  AlertCircle, 
  ArrowRight
} from 'lucide-react';

interface BookingRecord {
  id: string;
  slotReference: string;
  courseId?: string;
  courseName: string;
  language: string;
  levelId?: string;
  levelTitle: string;
  levelNumber: number;
  date: string;
  startTime: string;
  endTime: string;
  status: 'BOOKED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  attendanceStatus?: 'PENDING' | 'PRESENT' | 'ABSENT';
  isNow?: boolean;
  isFuture?: boolean;
  isPast?: boolean;
  timingMessage?: string;
  createdAt: string;
}

export const MyAssessments: React.FC = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ success: boolean; bookings: BookingRecord[] }>('/bookings/my');
      if (response.data.success) {
        setBookings(response.data.bookings);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this examination slot reservation?')) {
      return;
    }

    setCancellingId(bookingId);
    try {
      await api.patch(`/bookings/${bookingId}/cancel`, {
        reason: 'Cancelled by candidate',
      });
      await fetchBookings();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  const handleStartExam = async (booking: BookingRecord) => {
    setStartingId(booking.id);
    try {
      // Find course details to obtain courseId and levelId
      const coursesRes = await api.get('/courses');
      const course = coursesRes.data.courses.find((c: any) => c.name === booking.courseName);
      if (!course) throw new Error('Course not found');

      const courseDetailsRes = await api.get(`/courses/${course.id}`);
      const level = courseDetailsRes.data.course.levels.find((l: any) => l.levelNumber === booking.levelNumber);
      if (!level) throw new Error('Level not found');

      const response = await api.post('/assessments/start', {
        courseId: course.id,
        levelId: level.id,
        bookingId: booking.id,
      });

      if (response.data.success && response.data.attempt) {
        navigate(`/workspace/${response.data.attempt.id}`);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to start examination');
      setStartingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center space-y-3 text-surface-400">
        <RefreshCw className="h-8 w-8 text-brand-500 animate-spin" />
        <p className="text-sm">Retrieving your exam schedule...</p>
      </div>
    );
  }

  const activeBookings = bookings.filter((b) => b.status === 'BOOKED');
  const pastBookings = bookings.filter((b) => b.status !== 'BOOKED');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            My Examination Bookings
          </h1>
          <p className="text-xs sm:text-sm text-surface-400 mt-1">
            View your scheduled assessment slots, launch examination workspaces, and review booking history.
          </p>
        </div>
        <Link
          to="/book-exam"
          className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-600/30 transition flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Calendar className="h-4 w-4" />
          <span>Book New Slot</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 flex items-center space-x-3 text-rose-300 text-xs">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Active Bookings Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
          <Clock className="h-4 w-4 text-brand-400" />
          <span>Active Reservations</span>
        </h2>

        {activeBookings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeBookings.map((b) => (
              <div
                key={b.id}
                className="bg-surface-900 border border-surface-800 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-semibold uppercase text-brand-400">
                        {b.courseName}
                      </span>
                      <h3 className="text-base font-bold text-white">{b.levelTitle}</h3>
                    </div>
                    {b.isNow ? (
                      b.attendanceStatus === 'PRESENT' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center space-x-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                          <span>Active (Verified Present)</span>
                        </span>
                      ) : b.attendanceStatus === 'ABSENT' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950 text-rose-300 border border-rose-800">
                          Marked Absent
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-800 flex items-center space-x-1">
                          <Clock className="h-3 w-3 text-amber-400" />
                          <span>Active (Pending Admin)</span>
                        </span>
                      )
                    ) : b.isFuture ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-brand-950 text-brand-300 border border-brand-800">
                        Scheduled
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-800">
                        Expired
                      </span>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-surface-800/80 space-y-2 text-xs">
                    <div className="flex items-center space-x-2 text-slate-700 dark:text-surface-200">
                      <Calendar className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                      <span className="font-semibold">{b.date}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-900 dark:text-white">
                      <Clock className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                      <span className="font-bold text-sm tracking-wide text-brand-700 dark:text-brand-300">{b.startTime} – {b.endTime} (Asia/Kolkata)</span>
                    </div>
                    <div className="flex items-center space-x-2 font-mono text-[11px] text-slate-600 dark:text-surface-400 pt-1.5 border-t border-slate-200 dark:border-surface-800/60">
                      <span>Ref: <strong className="text-slate-900 dark:text-white">{b.slotReference}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-slate-200 dark:border-surface-800 flex items-center space-x-3">
                  {b.isNow ? (
                    b.attendanceStatus === 'PRESENT' ? (
                      <button
                        onClick={() => handleStartExam(b)}
                        disabled={startingId === b.id}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/30 transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
                      >
                        {startingId === b.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5" />
                            <span>Enter Examination</span>
                          </>
                        )}
                      </button>
                    ) : b.attendanceStatus === 'ABSENT' ? (
                      <button
                        onClick={() => navigate(`/book-exam?courseId=${b.courseId}&level=${b.levelNumber}`)}
                        className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md shadow-rose-600/30 transition flex items-center justify-center space-x-1.5"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Marked Absent (Rebook)</span>
                      </button>
                    ) : (
                      <button
                        disabled
                        className="flex-1 py-2 px-3 rounded-xl bg-amber-50 dark:bg-surface-800/80 border border-amber-300 dark:border-surface-700/60 text-amber-800 dark:text-amber-300 font-bold text-xs transition flex items-center justify-center space-x-1.5 cursor-not-allowed"
                        title="Waiting for admin to verify attendance"
                      >
                        <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <span>Awaiting Admin Verification</span>
                      </button>
                    )
                  ) : b.isFuture ? (
                    <button
                      disabled
                      className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-surface-800 border border-slate-300 dark:border-surface-700 text-slate-800 dark:text-surface-200 font-bold text-xs transition flex items-center justify-center space-x-2 cursor-not-allowed shadow-sm"
                    >
                      <Clock className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                      <span>Starts at {b.startTime}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`/book-exam?courseId=${b.courseId}&level=${b.levelNumber}`)}
                      className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md shadow-amber-600/30 transition flex items-center justify-center space-x-1.5"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Rebook Slot</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleCancelBooking(b.id)}
                    disabled={cancellingId === b.id}
                    className="py-2 px-3 rounded-xl bg-surface-800 hover:bg-rose-950/40 text-surface-400 hover:text-rose-300 border border-surface-700 text-xs font-medium transition disabled:opacity-50"
                    title="Cancel Booking"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-surface-900 border border-surface-800 text-center space-y-3">
            <Calendar className="h-8 w-8 text-surface-600 mx-auto" />
            <p className="text-xs text-surface-400">
              You currently have no active examination slot bookings.
            </p>
            <Link
              to="/book-exam"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/30 transition"
            >
              <span>Schedule an Exam Slot</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Past / Completed Bookings */}
      {pastBookings.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-surface-800">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Booking History
          </h2>
          <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead className="bg-surface-950/60 border-b border-surface-800 text-surface-400">
                  <tr>
                    <th className="px-5 py-3 font-medium">Slot Reference</th>
                    <th className="px-5 py-3 font-medium">Course / Level</th>
                    <th className="px-5 py-3 font-medium">Date & Time</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800/60">
                  {pastBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-surface-800/30 transition">
                      <td className="px-5 py-3.5 font-mono text-surface-300">{b.slotReference}</td>
                      <td className="px-5 py-3.5 text-white">
                        <span>{b.courseName}</span>
                        <p className="text-[11px] text-surface-400">{b.levelTitle}</p>
                      </td>
                      <td className="px-5 py-3.5 text-surface-300">
                        {b.date} ({b.startTime} - {b.endTime})
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            b.status === 'COMPLETED'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : b.status === 'CANCELLED'
                              ? 'bg-surface-800 text-surface-400 border border-surface-700'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
