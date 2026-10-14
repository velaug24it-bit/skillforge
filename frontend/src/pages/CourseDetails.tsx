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
  AlertCircle
} from 'lucide-react';

interface LevelDetail {
  id: string;
  levelNumber: number;
  title: string;
  category: string;
  description: string;
  topics: string[];
  passingScore: number;
  durationMinutes: number;
  isUnlocked: boolean;
  isCompleted: boolean;
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
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Cleared (100/100)</span>
                        </span>
                      ) : isUnlocked ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-950 text-brand-300 border border-brand-800">
                          <Unlock className="h-3 w-3" />
                          <span>Unlocked</span>
                        </span>
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
                  <div className="grid grid-cols-2 gap-2 text-[11px] py-2 border-y border-surface-800">
                    <div className="flex items-center space-x-1.5 text-surface-400">
                      <Clock className="h-3.5 w-3.5 text-surface-500" />
                      <span>Duration: {level.durationMinutes} Mins</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-surface-400">
                      <Award className="h-3.5 w-3.5 text-surface-500" />
                      <span>2 Questions (50 marks each)</span>
                    </div>
                  </div>

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
                </div>

                {/* Bottom Action Area */}
                <div className="pt-5 mt-4 border-t border-surface-800">
                  {isUnlocked ? (
                    <button
                      onClick={() => handleStartExam(level)}
                      disabled={startingLevel === level.levelNumber}
                      className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      {startingLevel === level.levelNumber ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Launching Exam Workspace...</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" />
                          <span>{isCompleted ? 'Retake Assessment' : 'Start Level Assessment'}</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-surface-950/60 border border-surface-800/80 text-center text-xs text-surface-400 flex items-center justify-center space-x-1.5">
                      <Lock className="h-3.5 w-3.5 text-surface-500" />
                      <span>Score 100/100 on Level {level.levelNumber - 1} to unlock</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
