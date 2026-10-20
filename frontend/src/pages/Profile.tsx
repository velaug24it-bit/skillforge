import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Shield, Calendar, Award, CheckCircle } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Active';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Student Profile</h1>
        <p className="text-xs text-surface-400 mt-1">
          Your personal examination profile and authenticated candidate identity
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surface-800">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-600 flex items-center justify-center text-white text-2xl font-bold uppercase shadow-lg shadow-brand-500/20">
              {user.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{user.name}</h2>
              <p className="text-xs text-surface-400 mt-0.5">{user.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-950 text-brand-300 border border-brand-800 capitalize flex items-center space-x-1.5">
              <Shield className="h-3.5 w-3.5 text-brand-400" />
              <span>{user.role} Candidate</span>
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center space-x-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
              <span>Verified Session</span>
            </span>
          </div>
        </div>

        {/* Detailed Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-surface-950/60 border border-surface-800/80 space-y-1">
            <div className="flex items-center space-x-2 text-surface-400 text-xs">
              <User className="h-3.5 w-3.5 text-brand-400" />
              <span>Full Name</span>
            </div>
            <p className="text-sm font-semibold text-white">{user.name}</p>
          </div>

          <div className="p-4 rounded-xl bg-surface-950/60 border border-surface-800/80 space-y-1">
            <div className="flex items-center space-x-2 text-surface-400 text-xs">
              <Mail className="h-3.5 w-3.5 text-brand-400" />
              <span>Registered Email Address</span>
            </div>
            <p className="text-sm font-semibold text-white">{user.email}</p>
          </div>

          <div className="p-4 rounded-xl bg-surface-950/60 border border-surface-800/80 space-y-1">
            <div className="flex items-center space-x-2 text-surface-400 text-xs">
              <Award className="h-3.5 w-3.5 text-accent-400" />
              <span>Candidate ID</span>
            </div>
            <p className="text-sm font-mono text-surface-300">{user.id}</p>
          </div>

          <div className="p-4 rounded-xl bg-surface-950/60 border border-surface-800/80 space-y-1">
            <div className="flex items-center space-x-2 text-surface-400 text-xs">
              <Calendar className="h-3.5 w-3.5 text-emerald-400" />
              <span>Enrolled On</span>
            </div>
            <p className="text-sm font-semibold text-white">{joinDate}</p>
          </div>
        </div>

        {/* Security Policy Information */}
        <div className="rounded-xl bg-surface-950/40 border border-surface-800/80 p-4 text-xs text-surface-400 space-y-2">
          <h3 className="font-semibold text-white flex items-center space-x-2">
            <Shield className="h-4 w-4 text-brand-400" />
            <span>Data Privacy & Single-Student Isolation</span>
          </h3>
          <p className="leading-relaxed">
            Every student sees only their own profile, bookings, assessment attempts, scores, and progression. All evaluations and official scores are calculated on the SkillForge backend server and protected with cryptographically signed tokens.
          </p>
        </div>
      </div>
    </div>
  );
};
