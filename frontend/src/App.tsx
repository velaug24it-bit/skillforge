import { useState, useEffect } from 'react';
import { 
  Terminal, 
  Database, 
  Server, 
  Cpu, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Layers, 
  BookOpen, 
  Calendar, 
  Award, 
  ShieldCheck
} from 'lucide-react';
import { checkHealth, HealthResponse } from './services/api';

export function App() {
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
    { number: 1, title: 'Architecture & Foundation', status: 'Completed', active: true, desc: 'Express + Vite, TypeScript, MongoDB connection, health API, and base styling' },
    { number: 2, title: 'Authentication & Security', status: 'Ready to Start', active: false, desc: 'JWT in HTTP-only cookies, registration, login, profile, and role isolation' },
    { number: 3, title: 'Courses & Levels Catalog', status: 'Pending', active: false, desc: 'C, C++, Java, Python, JS course portals with beginner to expert tiers' },
    { number: 4, title: 'Coding Exam Workspace', status: 'Pending', active: false, desc: 'Monaco code editor, question viewer, and sample test evaluation' },
    { number: 5, title: 'Test Evaluation & Scoring', status: 'Pending', active: false, desc: 'Hidden test-case execution, 100/100 threshold, and level unlock engine' },
    { number: 6, title: 'Exam Slot Booking', status: 'Pending', active: false, desc: '9:10 AM - 5:10 PM 1-hour slots, atomic reservation, and booking tickets' },
    { number: 7, title: 'Results & Student Portal', status: 'Pending', active: false, desc: 'My Assessments, historical attempts, scores, and downloadable results' },
    { number: 8, title: 'QA & Automated Testing', status: 'Pending', active: false, desc: 'End-to-end integration test coverage, edge-case validation, and deployment' },
  ];

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-surface-800 bg-surface-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Terminal className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">Skill<span className="text-brand-400">Forge</span></span>
              <span className="hidden sm:inline-block ml-3 px-2 py-0.5 text-xs font-medium rounded-full bg-brand-950 text-brand-300 border border-brand-800">
                Assessment Portal
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs text-surface-400 bg-surface-800/80 px-3 py-1.5 rounded-lg border border-surface-700">
              <div className={`h-2 w-2 rounded-full ${health?.database.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-mono">{health ? 'Backend Connected' : (loading ? 'Connecting...' : 'Offline')}</span>
            </div>
            <button 
              onClick={fetchHealth} 
              disabled={loading}
              title="Refresh Health Status"
              className="p-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white transition border border-surface-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Error notification banner if backend is unreachable */}
        {error && (
          <div className="rounded-xl bg-rose-950/40 border border-rose-800/60 p-4 flex items-start space-x-3 text-rose-200">
            <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-medium">Backend Connection Notice</p>
              <p className="text-xs text-rose-300/80 mt-1">{error}. Start the backend server (`npm run dev` in backend) to enable live telemetry.</p>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="rounded-2xl bg-gradient-to-br from-surface-900 via-surface-900 to-brand-950/40 border border-surface-800 p-8 shadow-xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-3xl space-y-4 relative z-10">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand-900/40 text-brand-300 border border-brand-700/50">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Full-Stack College Examination System</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Programming Skill Assessment Portal
            </h1>
            <p className="text-surface-300 leading-relaxed text-sm sm:text-base">
              A centralized assessment engine featuring four difficulty tiers across C, C++, Java, Python, and JavaScript. 
              Designed with strict test-case evaluation, anti-cheat slot scheduling, and verifiable progression.
            </p>
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
                {health?.database.status || (loading ? 'Checking' : 'Disconnected')}
              </span>
              {health?.database.connected && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-900/80 text-emerald-300 border border-emerald-700">Live</span>
              )}
            </div>
            <p className="text-xs text-surface-400">
              Mongoose ODM architecture connected to MongoDB.
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
                {health?.codeExecutionService.configured ? 'Configured' : 'Ready (Notice)'}
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
                <span>Development & Implementation Phases</span>
              </h2>
              <p className="text-xs text-surface-400 mt-1">
                Step-by-step phased architecture as specified in the project requirements
              </p>
            </div>
            <div className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 self-start sm:self-auto flex items-center space-x-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Phase 1: Foundation Active</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {phases.map((phase) => (
              <div 
                key={phase.number} 
                className={`p-4 rounded-xl border transition-all ${
                  phase.active 
                    ? 'bg-brand-950/20 border-brand-700/60 shadow-lg shadow-brand-950/40' 
                    : 'bg-surface-950/40 border-surface-800/80 opacity-80'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      phase.active ? 'bg-brand-600 text-white' : 'bg-surface-800 text-surface-400'
                    }`}>
                      {phase.number}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{phase.title}</h3>
                      <p className="text-xs text-surface-400 mt-0.5">{phase.desc}</p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                    phase.status === 'Completed'
                      ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50'
                      : phase.status === 'Ready to Start'
                      ? 'bg-blue-900/40 text-blue-300 border border-blue-700/50'
                      : 'bg-surface-800 text-surface-500'
                  }`}>
                    {phase.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Preview Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl border border-surface-800 bg-surface-900/40 p-5 space-y-3">
            <div className="h-8 w-8 rounded-lg bg-surface-800 flex items-center justify-center text-brand-400">
              <BookOpen className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">5 Supported Languages</h3>
            <p className="text-xs text-surface-400">
              C, C++, Java, Python, and JavaScript each with 4 progressive level tiers.
            </p>
          </div>

          <div className="rounded-xl border border-surface-800 bg-surface-900/40 p-5 space-y-3">
            <div className="h-8 w-8 rounded-lg bg-surface-800 flex items-center justify-center text-accent-400">
              <Award className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Strict 100/100 Scoring</h3>
            <p className="text-xs text-surface-400">
              Each level requires passing 5 hidden test cases across 2 questions (10 pts each).
            </p>
          </div>

          <div className="rounded-xl border border-surface-800 bg-surface-900/40 p-5 space-y-3">
            <div className="h-8 w-8 rounded-lg bg-surface-800 flex items-center justify-center text-emerald-400">
              <Calendar className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Atomic Slot Booking</h3>
            <p className="text-xs text-surface-400">
              Exclusive 1-hour slots from 9:10 AM to 5:10 PM with concurrency safety.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-800 bg-surface-900/40 py-6 text-center text-xs text-surface-500">
        <p>SkillForge &copy; {new Date().getFullYear()} — Programming Skill Assessment Portal. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
