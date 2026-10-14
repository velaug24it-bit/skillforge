import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Terminal, Lock, Mail, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const loggedUser = await login(email, password);
      if (loggedUser.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-600 items-center justify-center shadow-lg shadow-brand-500/20 mb-2">
            <Terminal className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Portal Sign In</h1>
          <p className="text-xs text-surface-400">
            Sign in as Student or Administrator to access assessment exams & management
          </p>
        </div>

        <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start space-x-2.5 text-rose-300 text-xs">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1.5">
                Email Address or Username
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-surface-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@college.edu or admin"
                  className="w-full bg-surface-950 border border-surface-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-surface-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-surface-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-brand-400 hover:text-brand-300 transition"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="h-4 w-4 text-surface-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-950 border border-surface-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-surface-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-lg shadow-brand-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-surface-800 text-center">
            <p className="text-xs text-surface-400">
              New to SkillForge?{' '}
              <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium">
                Create a Student Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
