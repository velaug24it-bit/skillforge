import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { 
  Code2, 
  Cpu, 
  Coffee, 
  Terminal, 
  Braces, 
  ArrowRight, 
  Award, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface CourseItem {
  id: string;
  name: string;
  language: 'c' | 'cpp' | 'java' | 'python' | 'javascript';
  description: string;
  icon: string;
  totalLevels: number;
  topics: {
    beginner: string[];
    intermediate: string[];
    advanced: string[];
    expert: string[];
  };
  currentUnlockedLevel: number;
  completedLevels: number[];
  isCompleted: boolean;
}

export const Courses: React.FC = () => {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ success: boolean; courses: CourseItem[] }>('/courses');
      if (response.data.success) {
        setCourses(response.data.courses);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const getLanguageIcon = (lang: string) => {
    switch (lang) {
      case 'c': return <Code2 className="h-6 w-6 text-brand-400" />;
      case 'cpp': return <Cpu className="h-6 w-6 text-cyan-400" />;
      case 'java': return <Coffee className="h-6 w-6 text-amber-400" />;
      case 'python': return <Terminal className="h-6 w-6 text-emerald-400" />;
      case 'javascript': return <Braces className="h-6 w-6 text-yellow-400" />;
      default: return <Code2 className="h-6 w-6 text-brand-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center space-y-3 text-surface-400">
        <RefreshCw className="h-8 w-8 text-brand-500 animate-spin" />
        <p className="text-sm">Loading course curriculum...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Catalog Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Programming Course Catalog
        </h1>
        <p className="text-xs sm:text-sm text-surface-400 mt-1 max-w-3xl">
          Select a programming language to view the four difficulty tiers: Beginner, Intermediate, Advanced, and Expert. Complete each level with a perfect 100/100 score to unlock the next challenge.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 flex items-center space-x-3 text-rose-300 text-xs">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Course Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => {
          const completionPct = Math.round((course.completedLevels.length / course.totalLevels) * 100);

          return (
            <div
              key={course.id}
              className="bg-surface-900 border border-surface-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-surface-700 transition space-y-5"
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="h-12 w-12 rounded-xl bg-surface-950 border border-surface-800 flex items-center justify-center shadow-inner">
                    {getLanguageIcon(course.language)}
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-surface-800 text-surface-300 border border-surface-700">
                    4 Levels
                  </span>
                </div>

                {/* Title & Desc */}
                <div>
                  <h2 className="text-lg font-bold text-white">{course.name}</h2>
                  <p className="text-xs text-surface-400 mt-1 line-clamp-2 leading-relaxed">
                    {course.description}
                  </p>
                </div>

                {/* Progress Indicators */}
                <div className="space-y-2 pt-2 border-t border-surface-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-surface-400">Current Level</span>
                    <span className="font-semibold text-white">
                      Level {course.currentUnlockedLevel} of 4
                    </span>
                  </div>
                  <div className="w-full bg-surface-950 rounded-full h-2 overflow-hidden border border-surface-800">
                    <div
                      className="bg-gradient-to-r from-brand-500 to-accent-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(8, completionPct)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-surface-500">
                    <span>{course.completedLevels.length} Completed</span>
                    <span>{completionPct}% Cleared</span>
                  </div>
                </div>

                {/* Topic Badges Preview */}
                <div className="pt-2">
                  <p className="text-[11px] font-semibold text-surface-400 uppercase tracking-wider mb-2">
                    Key Topics
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {course.topics.beginner.slice(0, 2).map((t, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-surface-950 text-surface-300 border border-surface-800">
                        {t}
                      </span>
                    ))}
                    {course.topics.intermediate.slice(0, 1).map((t, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-surface-950 text-surface-300 border border-surface-800">
                        {t}
                      </span>
                    ))}
                    <span className="text-[10px] px-2 py-0.5 rounded bg-surface-800 text-surface-400">
                      +more
                    </span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="pt-4 border-t border-surface-800">
                <Link
                  to={`/courses/${course.id}`}
                  className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-600/30 transition flex items-center justify-center space-x-2"
                >
                  <Award className="h-4 w-4" />
                  <span>
                    {course.isCompleted ? 'Review Completed Course' : `Continue Level ${course.currentUnlockedLevel}`}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
