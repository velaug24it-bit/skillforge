import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Terminal, Mail, ArrowRight, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', { email });
      setMessage(response.data.message || 'Recovery instructions sent.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to submit recovery request');
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
          <h1 className="text-2xl font-bold tracking-tight text-white">Reset Password</h1>
          <p className="text-xs text-surface-400">
            Enter your college email to receive credentials reset guidance
          </p>
        </div>

        <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start space-x-2.5 text-rose-300 text-xs">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-start space-x-2.5 text-emerald-300 text-xs">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{message}</p>
                <p className="text-[11px] text-emerald-400/80 mt-1">
                  For immediate exam slot assistance, visit your campus department administrator.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1.5">
                Registered College Email
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-surface-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@college.edu"
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
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <span>Send Recovery Instructions</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-surface-800 text-center">
            <Link to="/login" className="text-xs text-brand-400 hover:text-brand-300 font-medium">
              &larr; Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
