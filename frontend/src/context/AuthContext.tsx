import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const response = await api.get<{ success: boolean; user: User }>('/auth/me');
      if (response.data.success && response.data.user) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const response = await api.post<{ success: boolean; user: User }>('/auth/login', {
      email,
      password,
    });
    if (response.data.success && response.data.user) {
      setUser(response.data.user);
      return response.data.user;
    }
    throw new Error('Unable to retrieve user credentials');
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    confirmPassword: string
  ): Promise<void> => {
    const response = await api.post<{ success: boolean; user: User }>('/auth/register', {
      name,
      email,
      password,
      confirmPassword,
    });
    if (response.data.success && response.data.user) {
      setUser(response.data.user);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
