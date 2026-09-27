import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { api } from '../api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: Role) => Promise<void>;
  isTestingOfficer: boolean;
  isReviewingOfficer: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('marksure_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('marksure_token');
      if (storedToken) {
        try {
          const { user } = await api.getMe();
          setUser(user);
          setToken(storedToken);
        } catch (error) {
          console.warn('Session expired or invalid token:', error);
          localStorage.removeItem('marksure_token');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    const data = await api.login(email, pass);
    localStorage.setItem('marksure_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('marksure_token');
    setToken(null);
    setUser(null);
  };

  const switchRole = async (targetRole: Role) => {
    let email = 'officer.test@marksure.gov.in';
    if (targetRole === 'REVIEWING_OFFICER') {
      email = 'officer.review@marksure.gov.in';
    } else if (targetRole === 'ADMIN') {
      email = 'admin@marksure.gov.in';
    }
    await login(email, 'Pass@123');
  };

  const isTestingOfficer = user?.role === 'TESTING_OFFICER';
  const isReviewingOfficer = user?.role === 'REVIEWING_OFFICER';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        switchRole,
        isTestingOfficer,
        isReviewingOfficer,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
