import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RefreshCw } from 'lucide-react';

export const ProtectedRoute: React.FC<{ 
  children: React.ReactElement;
  requiredRole?: 'student' | 'admin';
}> = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center text-surface-400 space-y-4">
        <RefreshCw className="h-8 w-8 text-brand-500 animate-spin" />
        <p className="text-sm font-medium">Verifying authentication session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return children;
};
