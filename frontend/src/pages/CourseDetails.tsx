import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  Lock, 
  Unlock, 
  CheckCircle2, 
  Clock, 
  Award, 
  Play, 
  Calendar, 
  ArrowLeft, 
  RefreshCw,
  AlertCircle,
  RotateCcw,
  Video
} from 'lucide-react';
import { StudyMaterialsModal } from '../components/StudyMaterialsModal';
import { getStudyMaterial, StudyMaterial } from '../data/studyMaterials';

interface LevelBooking {
  id: string;
  slotReference: string;
  date: string;
  startTime: string;
  endTime: string;
  attendanceStatus?: 'PENDING' | 'PRESENT' | 'ABSENT';
  isNow: boolean;
  isFuture: boolean;
  isPast: boolean;
  message: string;
}

interface LevelDetail {
  id: string;
  levelNumber: number;
  title: string;
  category: string;
  description: string;
  topics: string[];
  passingScore: number;
  durationMinutes: number;
  totalMarks?: number;
  assessmentType?: string;
  negativeMarking?: number;
  marksPerQuestion?: number;
  isUnlocked: boolean;
  isCompleted: boolean;
  attemptsCount?: number;
  attemptsToClear?: number | null;
  highestScore?: number;
  booking?: LevelBooking | null;
  hasActiveAttempt?: boolean;
  activeAttemptId?: string | null;
}

interface CourseData {
  id: string;
  name: string;
  language: string;
  description: string;
  totalLevels: number;
  levels: LevelDetail[];
  studentProgress: {
    currentUnlockedLevel: number;
    completedLevels: number[];
    completionPercentage: number;
  };
}

export const CourseDetails: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingLevel, setStartingLevel] = useState<number | null>(null);
  const [selectedStudyMaterial, setSelectedStudyMaterial] = useState<StudyMaterial | null>(null);

  const fetchCourseDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ success: boolean; course: CourseData }>(`/courses/${courseId}`);
      if (response.data.success) {
        setCourse(response.data.course);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load course levels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchCourseDetails();
    }
  }, [courseId]);

  const handleStartExam = async (level: LevelDetail) => {
    if (!level.isUnlocked) return;

    setStartingLevel(level.levelNumber);
    try {
      const response = await api.post('/assessments/start', {
        courseId: course?.id,
        levelId: level.id,
        bookingId: level.booking?.id,
      });

      if (response.data.success && response.data.attempt) {
        navigate(`/workspace/${response.data.attempt.id}`);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to initialize assessment workspace');
      setStartingLevel(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center space-y-3 text-surface-400">
        <RefreshCw className="h-8 w-8 text-brand-500 animate-spin" />
        <p className="text-sm">Loading course levels and verified questions...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Course Not Found</h2>
        <Link to="/courses" className="text-sm text-brand-400 hover:text-brand-300">
          &larr; Back to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <Link to="/courses" className="inline-flex items-center space-x-2 text-xs font-medium text-surface-400 hover:text-white transition">
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Course Catalog</span>
      </Link>

      {/* Course Hero */}
      <div className="rounded-2xl bg-surface-900 border border-surface-800 p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-950 text-brand-300 border border-brand-800 uppercase tracking-wider">
              {course.language} Track
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              {course.name}
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              to={`/book-exam?courseId=${course.id}`}
              className="px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-200 border border-surface-700 text-xs font-semibold transition flex items-center space-x-1.5"
            >
              <Calendar className="h-4 w-4" />
              <span>Book Exam Slot</span>
            </Link>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-surface-300 max-w-3xl leading-relaxed">
          {course.description}
        </p>

        {/* Course Progress Summary */}
        <div className="pt-4 border-t border-surface-800 flex flex-wrap items-center gap-6 text-xs text-surface-400">
          <div>
            <span>Curriculum Progress: </span>
            <span className="font-semibold text-white">
              {course.studentProgress.completedLevels.length} / 4 Levels Cleared ({course.studentProgress.completionPercentage}%)
            </span>
          </div>
          <div>
            <span>Passing Condition: </span>
            <span className="font-semibold text-emerald-400">100 / 100 Marks (All 10 test cases must pass)</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 flex items-center space-x-3 text-rose-300 text-xs">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Level Cards List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <Award className="h-5 w-5 text-brand-400" />
          <span>Assessment Levels (1 through 4)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {course.levels.map((level) => {
            const isUnlocked = level.isUnlocked;
            const isCompleted = level.isCompleted;

            return (
              <div
                key={level.id}
                className={`rounded-2xl border p-6 flex flex-col justify-between transition-all ${
                  isUnlocked
                    ? isCompleted
                      ? 'bg-emerald-950/10 border-emerald-800/60 shadow-lg'
                      : 'bg-surface-900 border-surface-700/80 shadow-xl'
                    : 'bg-surface-950/40 border-surface-800/60 opacity-70'
                }`}
              >
                <div className="space-y-4">
                  {/* Top Level Status Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isUnlocked
                          ? 'bg-brand-600 text-white'
                          : 'bg-surface-800 text-surface-500'
                      }`}>
                        L{level.levelNumber}
                      </div>
                      <h3 className="text-sm font-bold text-white">{level.title}</h3>
                    </div>

                    <div>
                      {isCompleted ? (
                        <div className="flex flex-col items-end space-y-0.5">
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Cleared (100/100)</span>
                          </span>
                          <span className="text-[10px] text-emerald-400 font-medium">
                            Cleared in {level.attemptsToClear || level.attemptsCount || 1} {(level.attemptsToClear || level.attemptsCount || 1) === 1 ? 'attempt' : 'attempts'}
                          </span>
                        </div>
                      ) : isUnlocked ? (
                        <div className="flex flex-col items-end space-y-0.5">
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-950 text-brand-300 border border-brand-800">
                            <Unlock className="h-3 w-3" />
                            <span>Unlocked</span>
                          </span>
                          <span className="text-[10px] text-surface-400 font-medium">
                            {typeof level.attemptsCount === 'number' && level.attemptsCount > 0
                              ? `${level.attemptsCount} attempt${level.attemptsCount === 1 ? '' : 's'} made (Best: ${level.highestScore || 0}/${level.totalMarks || (course.language === 'aptitude' ? 40 : 100)})`
                              : '0 attempts made'}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface-800 text-surface-400 border border-surface-700">
                          <Lock className="h-3 w-3" />
                          <span>Locked</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-surface-300 leading-relaxed">
                    {level.description}
                  </p>

                  {/* Level Exam Specifications */}
                  <div className="grid grid-cols-3 gap-2 text-[11px] py-2 border-y border-surface-800">
                    <div className="flex items-center space-x-1.5 text-surface-400">
                      <Clock className="h-3.5 w-3.5 text-surface-500" />
                      <span>{level.durationMinutes} Mins</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-surface-400">
                      <Award className="h-3.5 w-3.5 text-surface-500" />
                      <span>
                        {course.language === 'aptitude' || level.assessmentType === 'aptitude'
                          ? '40 MCQs (40 pts)'
                          : '2 Qs (100 pts)'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-surface-400">
                      <RotateCcw className="h-3.5 w-3.5 text-surface-500" />
                      <span>
                        {isCompleted
                          ? `${level.attemptsToClear || 1} att. to clear`
                          : `${level.attemptsCount || 0} attempts`}
                      </span>
                    </div>
                  </div>

                  {/* Aptitude Scoring Rule Pill */}
                  {(course.language === 'aptitude' || level.assessmentType === 'aptitude') && (
                    <div className="px-3 py-1.5 rounded-lg bg-purple-950/40 border border-purple-800/60 text-[10.5px] text-purple-300 flex items-center justify-between">
                      <span className="font-semibold">Passing Mark: 24 / 40</span>
                      <span className="text-purple-400 font-mono">+1.0 Correct &bull; -0.25 Wrong</span>
                    </div>
                  )}

                  {/* Topics List */}
                  <div>
                    <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider mb-1.5">
                      Syllabus Topics
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {level.topics.map((topic, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded bg-surface-950 text-surface-300 border border-surface-800"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Study Materials & Video Guide Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedStudyMaterial(
                          getStudyMaterial(course.language, level.levelNumber, level.title, level.topics)
                        )
                      }
                      className="w-full py-2.5 px-3.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition flex items-center justify-between shadow-sm cursor-pointer group"
                    >
                      <div className="flex items-center space-x-2">
                        <Video className="h-4 w-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                        <span>Level {level.levelNumber} Study Materials & Videos</span>
                      </div>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-200/80 dark:bg-indigo-800 text-indigo-900 dark:text-indigo-100 font-bold flex items-center space-x-1">
                        <span>Learn Concepts</span>
                        <span>&rarr;</span>
                      </span>
                    </button>
                  </div>
                </div>

                {/* Bottom Action Area */}
                <div className="pt-5 mt-4 border-t border-surface-800 space-y-2">
                  {!isUnlocked ? (
                    <div className="p-2.5 rounded-xl bg-surface-950/60 border border-surface-800/80 text-center text-xs text-surface-400 flex items-center justify-center space-x-1.5">
                      <Lock className="h-3.5 w-3.5 text-surface-500" />
                      <span>
                        Score {course.language === 'aptitude' ? '24/40' : '100/100'} on Level {level.levelNumber - 1} to unlock
                      </span>
                    </div>
                  ) : level.hasActiveAttempt && level.activeAttemptId ? (
                    <div className="space-y-2">
                      <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800 text-[11px] text-emerald-300 flex items-center space-x-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Assessment session in progress</span>
                      </div>
                      <button
                        onClick={() => navigate(`/workspace/${level.activeAttemptId}`)}
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/30 transition flex items-center justify-center space-x-2"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Resume Assessment Session</span>
                      </button>
                    </div>
                  ) : level.booking ? (
                    <div className="space-y-2">
                      {level.booking.isNow ? (
                        level.booking.attendanceStatus === 'PRESENT' ? (
                          <>
                            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-600/70 text-[11px] text-emerald-300 flex items-center justify-between">
                              <span className="flex items-center space-x-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                <strong className="text-white">Verified Present:</strong>
                                <span>Window Open ({level.booking.startTime} – {level.booking.endTime})</span>
                              </span>
                              <span className="font-mono text-[10px] text-emerald-400">{level.booking.slotReference}</span>
                            </div>
                            <button
                              onClick={() => handleStartExam(level)}
                              disabled={startingLevel === level.levelNumber}
                              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50"
                            >
                              {startingLevel === level.levelNumber ? (
                                <>
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                  <span>Launching Exam Workspace...</span>
                                </>
                              ) : (
                                <>
                                  <Play className="h-3.5 w-3.5" />
                                  <span>Start Level Assessment</span>
                                </>
                              )}
                            </button>
                          </>
                        ) : level.booking.attendanceStatus === 'ABSENT' ? (
                          <>
                            <div className="p-2 rounded-lg bg-rose-950/50 border border-rose-800 text-[11px] text-rose-300 flex items-center space-x-2">
                              <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                              <span>Marked Absent by Proctor for this slot. Exam entry is blocked.</span>
                            </div>
                            <button
                              onClick={() => navigate(`/book-exam?courseId=${course.id}&level=${level.levelNumber}`)}
                              className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md shadow-rose-600/30 transition flex items-center justify-center space-x-2"
                            >
                              <Calendar className="h-3.5 w-3.5" />
                              <span>Book New Exam Slot</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/80 text-[11px] text-amber-300 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="flex items-center space-x-1.5 font-semibold text-white">
                                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                                  <span>Slot Active Now ({level.booking.startTime} – {level.booking.endTime})</span>
                                </span>
                                <span className="font-mono text-[10px] text-amber-400">{level.booking.slotReference}</span>
                              </div>
                              <p className="text-[10px] text-amber-300/80">
                                Proctor Attendance Status: <strong className="text-amber-200">Pending Verification</strong>
                              </p>
                            </div>
                            <button
                              disabled
                              className="w-full py-2.5 px-4 rounded-xl bg-surface-800/80 border border-surface-700/60 text-amber-300/70 font-semibold text-xs transition flex items-center justify-center space-x-2 cursor-not-allowed"
                            >
                              <Clock className="h-3.5 w-3.5 text-amber-400" />
                              <span>Awaiting Admin to Mark Present</span>
                            </button>
                            <p className="text-[10px] text-center text-surface-500">
                              The administrator must mark you Present during your slot before you can enter the test.
                            </p>
                          </>
                        )
                      ) : level.booking.isFuture ? (
                        <>
                          <div className="p-3 rounded-xl bg-blue-50 dark:bg-brand-950/40 border border-blue-200 dark:border-brand-800 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5 text-xs">
                                <Calendar className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                                <span>Slot Reserved ({level.booking.date})</span>
                              </span>
                              <span className="font-mono text-xs font-bold text-brand-700 dark:text-brand-300">{level.booking.slotReference}</span>
                            </div>
                            <div className="flex items-center space-x-1.5 text-xs font-bold text-blue-900 dark:text-brand-200 pt-0.5">
                              <Clock className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400 flex-shrink-0" />
                              <span>Window: {level.booking.startTime} – {level.booking.endTime} (Asia/Kolkata)</span>
                            </div>
                          </div>
                          <button
                            disabled
                            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-surface-800 border border-slate-300 dark:border-surface-700 text-slate-800 dark:text-surface-200 font-bold text-xs transition flex items-center justify-center space-x-2 cursor-not-allowed shadow-sm"
                          >
                            <Clock className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                            <span>Exam Starts at {level.booking.startTime}</span>
                          </button>
                          <p className="text-[11px] font-medium text-center text-slate-600 dark:text-surface-400">
                            Assessment unlocks automatically during your booked timing.
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-800 text-[11px] text-amber-300 flex items-center space-x-1.5">
                            <AlertCircle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                            <span>Slot on {level.booking.date} at {level.booking.startTime} expired</span>
                          </div>
                          <button
                            onClick={() => navigate(`/book-exam?courseId=${course.id}&level=${level.levelNumber}`)}
                            className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md shadow-amber-600/30 transition flex items-center justify-center space-x-2"
                          >
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Book New Exam Slot</span>
                          </button>
                        </>
                      )}
                    </div>
                  ) : isCompleted ? (
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800 text-[11px] text-emerald-300 flex items-center justify-between">
                        <span className="flex items-center space-x-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <strong className="text-white">Completed</strong>
                          <span>({level.attemptsToClear || level.attemptsCount || 1} {(level.attemptsToClear || level.attemptsCount || 1) === 1 ? 'attempt' : 'attempts'})</span>
                        </span>
                        <span className="font-semibold text-emerald-400">100/100</span>
                      </div>
                      {level.levelNumber < 4 && (
                        <button
                          onClick={() => navigate(`/book-exam?courseId=${course.id}&level=${level.levelNumber + 1}`)}
                          className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/30 transition flex items-center justify-center space-x-2"
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Book Level {level.levelNumber + 1} Slot &rarr;</span>
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/book-exam?courseId=${course.id}&level=${level.levelNumber}`)}
                        className="w-full py-2 px-3 rounded-xl bg-surface-950 hover:bg-surface-800 text-surface-400 hover:text-white border border-surface-800 text-[11px] font-medium transition flex items-center justify-center space-x-1.5"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Book Slot for Retake</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-2 rounded-lg bg-surface-950 border border-surface-800 text-[11px] text-surface-400 flex items-center space-x-1.5">
                        <Calendar className="h-3.5 w-3.5 text-brand-400 flex-shrink-0" />
                        <span>Slot reservation required for this assessment.</span>
                      </div>
                      <button
                        onClick={() => navigate(`/book-exam?courseId=${course.id}&level=${level.levelNumber}`)}
                        className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-600/30 transition flex items-center justify-center space-x-2"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Book Assessment Slot</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Study Materials & Concept Video Modal */}
      {selectedStudyMaterial && (
        <StudyMaterialsModal
          material={selectedStudyMaterial}
          isOpen={!!selectedStudyMaterial}
          onClose={() => setSelectedStudyMaterial(null)}
        />
      )}
    </div>
  );
};
