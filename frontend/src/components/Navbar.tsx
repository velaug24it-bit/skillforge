import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Terminal, 
  LayoutDashboard, 
  BookOpen, 
  Code, 
  Calendar, 
  Award, 
  User as UserIcon, 
  LogOut, 
  Menu, 
  X,
  ChevronDown 
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Explore Courses', path: '/courses', icon: BookOpen },
    { name: 'My Assessments', path: '/my-assessments', icon: Code },
    { name: 'Book Exam', path: '/book-exam', icon: Calendar },
    { name: 'My Results', path: '/my-results', icon: Award },
  ];

  return (
    <header className="border-b border-surface-800 bg-surface-900/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-3 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-600 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <Terminal className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">Skill<span className="text-brand-400">Forge</span></span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-brand-950 text-brand-300 border border-brand-800">
                Assessment
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          {user && (
            <nav className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                      isActive
                        ? 'bg-brand-600/20 text-brand-300 border border-brand-700/50 shadow-sm'
                        : 'text-surface-300 hover:text-white hover:bg-surface-800/60'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right Action / User Profile */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-surface-800/80 hover:bg-surface-700 border border-surface-700 transition"
                >
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-brand-500 to-accent-600 flex items-center justify-center text-white text-xs font-bold uppercase shadow-sm">
                    {user.name.charAt(0)}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-white leading-tight">{user.name}</p>
                    <p className="text-[10px] text-surface-400 capitalize">{user.role}</p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-surface-400" />
                </button>

                {/* User Dropdown */}
                {userMenuOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-56 rounded-xl bg-surface-900 border border-surface-700/80 shadow-2xl py-1 z-50 text-xs backdrop-blur-lg"
                    onMouseLeave={() => setUserMenuOpen(false)}
                  >
                    <div className="px-4 py-2.5 border-b border-surface-800">
                      <p className="font-medium text-white">{user.name}</p>
                      <p className="text-surface-400 truncate text-[11px]">{user.email}</p>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center space-x-2 px-4 py-2 text-surface-300 hover:text-white hover:bg-surface-800 transition"
                    >
                      <UserIcon className="h-3.5 w-3.5 text-brand-400" />
                      <span>My Profile</span>
                    </Link>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 transition"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-surface-300 hover:text-white hover:bg-surface-800 transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-600/30 transition"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-surface-800 text-surface-300 hover:text-white border border-surface-700"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-surface-800 bg-surface-900/95 px-4 pt-2 pb-4 space-y-1">
          {user ? (
            <>
              <div className="px-3 py-2 border-b border-surface-800 mb-2">
                <p className="text-sm font-semibold text-white">{user.name}</p>
                <p className="text-xs text-surface-400 truncate">{user.email}</p>
              </div>
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive ? 'bg-brand-600 text-white' : 'text-surface-300 hover:bg-surface-800'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-surface-300 hover:bg-surface-800"
              >
                <UserIcon className="h-4 w-4 text-brand-400" />
                <span>My Profile</span>
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-950/20"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <div className="pt-2 space-y-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-2 rounded-lg bg-surface-800 text-sm font-medium text-white"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-2 rounded-lg bg-brand-600 text-sm font-semibold text-white"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
