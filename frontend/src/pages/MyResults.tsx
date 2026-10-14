import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { 
  Award, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  BookOpen, 
  ArrowRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface AttemptResult {
  id: string;
  courseName: string;
  language: string;
  levelTitle: string;
  levelNumber: number;
  totalScore: number;
  passed: boolean;
  completedAt: string;
  questionBreakdown: Array<{
    questionNumber: number;
    score: number;
    passedTests: number;
  }>;
}

interface CourseProgress {
  courseName: string;
  language: string;
  currentUnlockedLevel: number;
  completedLevels: number[];
  totalLevels: number;
}

export const MyResults: React.FC = () => {
  const [attempts, setAttempts] = useState<AttemptResult[]>([]);
  const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{
        success: boolean;
        attempts: AttemptResult[];
        courseProgress: CourseProgress[];
      }>('/results/my');

      if (response.data.success) {
        setAttempts(response.data.attempts);
        setCourseProgress(response.data.courseProgress);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch assessment results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center space-y-3 text-surface-400">
        <RefreshCw className="h-8 w-8 text-brand-500 animate-spin" />
        <p className="text-sm">Retrieving your assessment history...</p>
      </div>
    );
  }

  const passedCount = attempts.filter((a) => a.passed).length;
  const averageScore = attempts.length > 0 
    ? Math.round(attempts.reduce((acc, curr) => acc + curr.totalScore, 0) / attempts.length) 
    : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          My Assessment Results
        </h1>
        <p className="text-xs sm:text-sm text-surface-400 mt-1">
          Review your official evaluation history, score breakdowns, test-case statistics, and completed levels.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 flex items-center space-x-3 text-rose-300 text-xs">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-900 border border-surface-800 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-surface-400 text-xs">
            <span className="font-medium uppercase tracking-wider">Total Submissions</span>
            <Calendar className="h-4 w-4 text-brand-400" />
          </div>
          <p className="text-2xl font-bold text-white">{attempts.length}</p>
          <p className="text-[11px] text-surface-500">Evaluated official attempts</p>
        </div>

        <div className="bg-surface-900 border border-surface-800 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-surface-400 text-xs">
            <span className="font-medium uppercase tracking-wider">Cleared Levels</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{passedCount}</p>
          <p className="text-[11px] text-surface-500">100/100 perfect scores</p>
        </div>

        <div className="bg-surface-900 border border-surface-800 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-surface-400 text-xs">
            <span className="font-medium uppercase tracking-wider">Average Score</span>
            <TrendingUp className="h-4 w-4 text-accent-400" />
          </div>
          <p className="text-2xl font-bold text-white">{averageScore} / 100</p>
          <p className="text-[11px] text-surface-500">Across all completed attempts</p>
        </div>
      </div>

      {/* Completed Level Progression by Course */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
          <Award className="h-4 w-4 text-brand-400" />
          <span>Level Progression Across Languages</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courseProgress.map((cp, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-surface-950 border border-surface-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{cp.courseName}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-800 text-surface-300">
                  L{cp.currentUnlockedLevel} Unlocked
                </span>
              </div>
              <div className="flex items-center space-x-1.5 pt-1">
                {[1, 2, 3, 4].map((lvl) => {
                  const isCleared = cp.completedLevels.includes(lvl);
                  return (
                    <div
                      key={lvl}
                      title={`Level ${lvl}: ${isCleared ? 'Cleared' : 'Not yet cleared'}`}
                      className={`flex-1 h-2 rounded-full ${
                        isCleared ? 'bg-emerald-500' : 'bg-surface-800'
                      }`}
                    />
                  );
                })}
              </div>
              <p className="text-[11px] text-surface-400">
                {cp.completedLevels.length} of {cp.totalLevels} levels completed
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Attempts History Table */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
          <BookOpen className="h-4 w-4 text-accent-400" />
          <span>Assessment History</span>
        </h2>

        {attempts.length > 0 ? (
          <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-950/60 border-b border-surface-800 text-surface-400">
                  <tr>
                    <th className="px-5 py-3.5 font-medium">Course & Level</th>
                    <th className="px-5 py-3.5 font-medium">Attempt Date</th>
                    <th className="px-5 py-3.5 font-medium">Question 1</th>
                    <th className="px-5 py-3.5 font-medium">Question 2</th>
                    <th className="px-5 py-3.5 font-medium">Total Score</th>
                    <th className="px-5 py-3.5 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800/60">
                  {attempts.map((a) => (
                    <tr key={a.id} className="hover:bg-surface-800/30 transition">
                      <td className="px-5 py-4 text-white">
                        <div className="font-semibold">{a.courseName}</div>
                        <div className="text-[11px] text-surface-400">{a.levelTitle}</div>
                      </td>
                      <td className="px-5 py-4 text-surface-300">
                        {new Date(a.completedAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 font-mono text-surface-200">
                        {a.questionBreakdown[0]?.score || 0}/50 pts
                        <span className="text-[10px] text-surface-400 block">
                          ({a.questionBreakdown[0]?.passedTests || 0}/5 cases)
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-surface-200">
                        {a.questionBreakdown[1]?.score || 0}/50 pts
                        <span className="text-[10px] text-surface-400 block">
                          ({a.questionBreakdown[1]?.passedTests || 0}/5 cases)
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-white text-sm">
                        {a.totalScore} / 100
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                            a.passed
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {a.passed ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Passed (100%)</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" />
                              <span>Not Cleared</span>
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-surface-900 border border-surface-800 text-center space-y-3">
            <Award className="h-8 w-8 text-surface-600 mx-auto" />
            <p className="text-xs text-surface-400">
              No historical assessment attempts found.
            </p>
            <Link
              to="/courses"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/30 transition"
            >
              <span>Explore Courses</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
