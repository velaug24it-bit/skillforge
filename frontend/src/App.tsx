import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { AdminDashboard } from './pages/AdminDashboard';

// Direct Root Redirect: opens directly into login/signup for guests, or dashboard/admin for authenticated users
const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return <Navigate to="/login" replace />;
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
              <Route path="/" element={<RootRedirect />} />
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
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
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
