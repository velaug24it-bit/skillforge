import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { Profile } from './pages/Profile';
import { Dashboard } from './pages/Dashboard';
import { Courses } from './pages/Courses';
import { CourseDetails } from './pages/CourseDetails';
import { BookExam } from './pages/BookExam';
import { MyAssessments } from './pages/MyAssessments';
import { AssessmentWorkspace } from './pages/AssessmentWorkspace';
import { MyResults } from './pages/MyResults';
import { checkHealth, HealthResponse } from './services/api';
import { 
  Database, 
  Server, 
  Cpu, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

// Landing Page Component for guests
const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await checkHealth();
      setHealth(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to connect to SkillForge backend API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const phases = [
    { number: 1, title: 'Architecture & Foundation', status: 'Completed', active: true, desc: 'Express + Vite, TypeScript, MongoDB Atlas connection, health API, and base styling' },
    { number: 2, title: 'Authentication & Security', status: 'Completed', active: true, desc: 'JWT in HTTP-only cookies, registration, login, profile, and role isolation' },
    { number: 3, title: 'Courses & Levels Catalog', status: 'Completed', active: true, desc: 'C, C++, Java, Python, JS course portals with beginner to expert tiers' },
    { number: 4, title: 'Coding Exam Workspace', status: 'Completed', active: true, desc: 'Monaco code editor, question viewer, and sample test evaluation' },
    { number: 5, title: 'Test Evaluation & Scoring', status: 'Completed', active: true, desc: 'Hidden test-case execution, 100/100 threshold, and level unlock engine' },
    { number: 6, title: 'Exam Slot Booking', status: 'Completed', active: true, desc: '9:10 AM - 5:10 PM 1-hour slots, atomic reservation, and booking tickets' },
    { number: 7, title: 'Results & Student Portal', status: 'Completed', active: true, desc: 'My Assessments, historical attempts, scores, and downloadable results' },
    { number: 8, title: 'QA & Automated Testing', status: 'Completed', active: true, desc: '19/19 backend integration test suites passed against live Atlas cluster' },
  ];

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Error notification banner if backend is unreachable */}
      {error && (
        <div className="rounded-xl bg-rose-950/40 border border-rose-800/60 p-4 flex items-start space-x-3 text-rose-200">
          <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-medium">Backend Connection Notice</p>
            <p className="text-xs text-rose-300/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="rounded-2xl bg-gradient-to-br from-surface-900 via-surface-900 to-brand-950/40 border border-surface-800 p-8 sm:p-12 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-3xl space-y-5 relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand-900/40 text-brand-300 border border-brand-700/50">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Full-Stack College Examination System</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            SkillForge — Programming Skill Assessment Portal
          </h1>
          <p className="text-surface-300 leading-relaxed text-sm sm:text-base">
            A centralized programming skill assessment platform where students register, explore multi-tier courses in C, C++, Java, Python, and JavaScript, reserve exclusive exam slots, and solve rigorous programming questions.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              to="/register"
              className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-xl shadow-brand-600/30 transition flex items-center space-x-2"
            >
              <span>Get Started as Student</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-200 border border-surface-700 font-semibold text-sm transition"
            >
              Sign In to Candidate Portal
            </Link>
          </div>
        </div>
      </div>

      {/* System Health Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: API Server */}
        <div className="bg-surface-900/80 rounded-xl p-5 border border-surface-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-surface-400">
            <span className="text-xs font-medium uppercase tracking-wider">API Backend</span>
            <Server className="h-4 w-4 text-brand-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-bold text-white">
              {health ? 'Online' : (loading ? 'Checking...' : 'Offline')}
            </span>
            <span className="text-xs text-surface-400 font-mono">
              {health ? `uptime: ${Math.round(health.uptime)}s` : ''}
            </span>
          </div>
          <p className="text-xs text-surface-400">
            REST endpoints on port 5000 with CORS & rate limiting.
          </p>
        </div>

        {/* Card 2: Database */}
        <div className="bg-surface-900/80 rounded-xl p-5 border border-surface-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-surface-400">
            <span className="text-xs font-medium uppercase tracking-wider">Database Engine</span>
            <Database className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-bold text-white capitalize">
              {health?.database.status || (loading ? 'Checking' : 'Connected')}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-900/80 text-emerald-300 border border-emerald-700">Atlas Live</span>
          </div>
          <p className="text-xs text-surface-400">
            MongoDB Atlas connected with Mongoose ODM schemas.
          </p>
        </div>

        {/* Card 3: Code Execution */}
        <div className="bg-surface-900/80 rounded-xl p-5 border border-surface-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-surface-400">
            <span className="text-xs font-medium uppercase tracking-wider">Execution Engine</span>
            <Cpu className="h-4 w-4 text-accent-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-bold text-white">
              {health?.codeExecutionService.configured ? 'Configured' : 'Ready'}
            </span>
          </div>
          <p className="text-xs text-surface-400">
            Judge0 isolated runner integration prepared.
          </p>
        </div>

        {/* Card 4: Campus Timezone */}
        <div className="bg-surface-900/80 rounded-xl p-5 border border-surface-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-surface-400">
            <span className="text-xs font-medium uppercase tracking-wider">Booking Timezone</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-bold text-white">
              {health?.campusTimezone || 'Asia/Kolkata'}
            </span>
          </div>
          <p className="text-xs text-surface-400">
            9:10 AM - 5:10 PM one-hour examination slots.
          </p>
        </div>
      </div>

      {/* Phase Roadmap */}
      <div className="bg-surface-900/80 rounded-2xl border border-surface-800 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Layers className="h-5 w-5 text-brand-400" />
              <span>Full-Stack Architecture & Implementation Phases</span>
            </h2>
            <p className="text-xs text-surface-400 mt-1">
              End-to-end phased development delivering all portal requirements
            </p>
          </div>
          <div className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 self-start sm:self-auto flex items-center space-x-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>All Phases Operational</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {phases.map((phase) => (
            <div 
              key={phase.number} 
              className="p-4 rounded-xl border bg-brand-950/20 border-brand-700/60 shadow-lg shadow-brand-950/40"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold bg-brand-600 text-white">
                    {phase.number}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{phase.title}</h3>
                    <p className="text-xs text-surface-400 mt-0.5">{phase.desc}</p>
                  </div>
                </div>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-700/50">
                  {phase.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-surface-950 text-surface-100 flex flex-col font-sans">
          <Navbar />
          <main className="flex-1 flex flex-col">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Protected Student Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/courses"
                element={
                  <ProtectedRoute>
                    <Courses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/courses/:courseId"
                element={
                  <ProtectedRoute>
                    <CourseDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/book-exam"
                element={
                  <ProtectedRoute>
                    <BookExam />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-assessments"
                element={
                  <ProtectedRoute>
                    <MyAssessments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/workspace/:attemptId"
                element={
                  <ProtectedRoute>
                    <AssessmentWorkspace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-results"
                element={
                  <ProtectedRoute>
                    <MyResults />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <footer className="border-t border-surface-800 bg-surface-900/40 py-6 text-center text-xs text-surface-500">
            <p>SkillForge &copy; {new Date().getFullYear()} — Programming Skill Assessment Portal. All rights reserved.</p>
          </footer>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
