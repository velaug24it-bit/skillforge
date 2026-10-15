import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  BookOpen, 
  Calendar, 
  Award, 
  Code, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Sparkles,
  ChevronRight
} from 'lucide-react';

interface DashboardSummary {
  studentName: string;
  studentEmail: string;
  totalCourses: number;
  enrolledCoursesCount: number;
  totalCompletedLevels: number;
  overallProgress: number;
  upcomingBooking: {
    id: string;
    courseName: string;
    language: string;
    levelTitle: string;
    levelNumber: number;
    date: string;
    startTime: string;
    endTime: string;
    slotReference: string;
    status: string;
  } | null;
  recentAttempts: Array<{
    id: string;
    courseName: string;
    language: string;
    levelTitle: string;
    levelNumber: number;
    totalScore: number;
    passed: boolean;
    status: string;
    date: string;
  }>;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ success: boolean; summary: DashboardSummary }>('/dashboard/summary');
      if (response.data.success) {
        setSummary(response.data.summary);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center space-y-3 text-surface-400">
        <RefreshCw className="h-8 w-8 text-brand-500 animate-spin" />
        <p className="text-sm">Loading your candidate assessment portal...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-surface-900 via-surface-900 to-brand-950/60 border border-surface-800 p-6 sm:p-8 shadow-xl overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand-950 text-brand-300 border border-brand-800">
              <Sparkles className="h-3.5 w-3.5 text-brand-400" />
              <span>SkillForge Assessment Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.name || summary?.studentName}!
            </h1>
            <p className="text-xs sm:text-sm text-surface-300 max-w-2xl leading-relaxed">
              Track your verified coding achievements, reserve exclusive exam slots, and solve multi-level programming evaluations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/courses"
              className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-lg shadow-brand-600/30 transition flex items-center space-x-1.5"
            >
              <BookOpen className="h-4 w-4" />
              <span>Explore Courses</span>
            </Link>
            <Link
              to="/book-exam"
              className="px-4 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-200 border border-surface-700 text-xs font-semibold transition flex items-center space-x-1.5"
            >
              <Calendar className="h-4 w-4" />
              <span>Book Exam Slot</span>
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 flex items-center space-x-3 text-rose-300 text-xs">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-surface-900 border border-surface-800 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-surface-400">
            <span className="text-xs font-medium uppercase tracking-wider">Available Courses</span>
            <BookOpen className="h-4 w-4 text-brand-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{summary?.totalCourses || 5}</span>
            <span className="text-xs text-surface-400">languages</span>
          </div>
          <p className="text-[11px] text-surface-500">C, C++, Java, Python, JS</p>
        </div>

        {/* Metric 2 */}
        <div className="bg-surface-900 border border-surface-800 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-surface-400">
            <span className="text-xs font-medium uppercase tracking-wider">Levels Completed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{summary?.totalCompletedLevels || 0}</span>
            <span className="text-xs text-surface-400">/ 20 total</span>
          </div>
          <p className="text-[11px] text-surface-500">Must score 100/100 to clear</p>
        </div>

        {/* Metric 3 */}
        <div className="bg-surface-900 border border-surface-800 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-surface-400">
            <span className="text-xs font-medium uppercase tracking-wider">Overall Progress</span>
            <Award className="h-4 w-4 text-accent-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{summary?.overallProgress || 0}%</span>
            <span className="text-xs text-surface-400">curriculum</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-surface-950 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-brand-500 to-accent-500 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${Math.max(5, summary?.overallProgress || 0)}%` }} 
            />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-surface-900 border border-surface-800 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-surface-400">
            <span className="text-xs font-medium uppercase tracking-wider">Active Bookings</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">
              {summary?.upcomingBooking ? '1 Slot' : 'None'}
            </span>
          </div>
          <p className="text-[11px] text-surface-500">
            {summary?.upcomingBooking ? `${summary.upcomingBooking.date} @ ${summary.upcomingBooking.startTime}` : 'No upcoming exam scheduled'}
          </p>
        </div>
      </div>

      {/* Two Column Layout: Upcoming Booking & Recent Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Upcoming Booking Card (1 col) */}
        <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-brand-400" />
                <span>Upcoming Examination</span>
              </h2>
              {summary?.upcomingBooking && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Confirmed
                </span>
              )}
            </div>

            {summary?.upcomingBooking ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-surface-800 space-y-3">
                <div>
                  <span className="text-xs text-brand-600 dark:text-brand-400 font-bold uppercase">
                    {summary.upcomingBooking.courseName}
                  </span>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {summary.upcomingBooking.levelTitle}
                  </p>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center space-x-2 text-slate-700 dark:text-surface-200">
                    <Calendar className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                    <span className="font-semibold">{summary.upcomingBooking.date}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-900 dark:text-white">
                    <Clock className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                    <span className="font-bold text-sm tracking-wide text-brand-700 dark:text-brand-300">{summary.upcomingBooking.startTime} – {summary.upcomingBooking.endTime} (IST)</span>
                  </div>
                  <div className="flex items-center space-x-2 font-mono text-[11px] text-slate-600 dark:text-surface-400 pt-1.5 border-t border-slate-200 dark:border-surface-800/60">
                    <span>Ref: <strong className="text-slate-900 dark:text-white">{summary.upcomingBooking.slotReference}</strong></span>
                  </div>
                </div>
                <Link
                  to="/my-assessments"
                  className="w-full py-2 px-3 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold text-center block transition shadow-md shadow-brand-600/30"
                >
                  Enter Assessment
                </Link>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-surface-950/40 border border-surface-800/80 text-center space-y-3">
                <Calendar className="h-8 w-8 text-surface-600 mx-auto" />
                <p className="text-xs text-surface-400">
                  No upcoming exam slot scheduled. You can book an available slot between 9:10 AM and 5:10 PM.
                </p>
                <Link
                  to="/book-exam"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-brand-400 text-xs font-medium border border-surface-700 transition"
                >
                  <span>Book Slot Now</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-surface-800 text-[11px] text-surface-500">
            Exam slots are 60 minutes long. Make sure to be logged in before your slot begins.
          </div>
        </div>

        {/* Right: Recent Assessment Results (2 cols) */}
        <div className="lg:col-span-2 bg-surface-900 border border-surface-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Award className="h-4 w-4 text-accent-400" />
              <span>Recent Assessment Results</span>
            </h2>
            <Link to="/my-results" className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center space-x-1">
              <span>View All</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {summary?.recentAttempts && summary.recentAttempts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-surface-800 text-surface-400">
                    <th className="pb-3 font-medium">Course / Level</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Score</th>
                    <th className="pb-3 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800/60">
                  {summary.recentAttempts.map((attempt) => (
                    <tr key={attempt.id} className="hover:bg-surface-800/30 transition">
                      <td className="py-3 font-medium text-white">
                        <div>
                          <span>{attempt.courseName}</span>
                          <p className="text-[11px] text-surface-400">{attempt.levelTitle}</p>
                        </div>
                      </td>
                      <td className="py-3 text-surface-400">
                        {new Date(attempt.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 font-mono font-semibold text-white">
                        {attempt.totalScore} / 100
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            attempt.passed
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {attempt.passed ? 'PASSED (100%)' : 'NOT CLEARED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-surface-950/40 border border-surface-800/80 text-center space-y-3">
              <Code className="h-8 w-8 text-surface-600 mx-auto" />
              <p className="text-xs text-surface-400">
                You haven't attempted any assessments yet. Choose a course to begin Level 1!
              </p>
              <Link
                to="/courses"
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/30 transition"
              >
                <span>Start Level 1 Coding</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
