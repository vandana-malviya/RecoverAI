import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import type { AuthUser } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  quickDemoLogin: (email?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const initAuth = async () => {
    try {
      const token = api.getToken();
      if (token) {
        const currentUser = await api.getCurrentUser();
        setUser(currentUser);
      } else {
        // In demo mode default user state or null
        const savedUser = localStorage.getItem('recoverai_user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        } else {
          // Set default demo merchant
          const defaultUser: AuthUser = {
            user_id: 'usr_merchant_001',
            email: 'merchant@recoverai.io',
            name: 'Alex Merchant',
            merchant_name: 'NovaFlow Commerce',
            role: 'merchant_admin',
          };
          setUser(defaultUser);
        }
      }
    } catch (err) {
      console.error('Failed to initialize user session', err);
      // Fallback to default demo user
      const defaultUser: AuthUser = {
        user_id: 'usr_merchant_001',
        email: 'merchant@recoverai.io',
        name: 'Alex Merchant',
        merchant_name: 'NovaFlow Commerce',
        role: 'merchant_admin',
      };
      setUser(defaultUser);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(email, password);
      const authenticatedUser: AuthUser = {
        user_id: res.user_id,
        email: res.email,
        name: res.name,
        merchant_name: res.email.includes('razorpay') ? 'Razorpay Global Enterprise' : 'NovaFlow Commerce',
        role: res.role,
      };
      setUser(authenticatedUser);
      localStorage.setItem('recoverai_user', JSON.stringify(authenticatedUser));
    } finally {
      setIsLoading(false);
    }
  };

  const quickDemoLogin = async (email = 'merchant@recoverai.io') => {
    return login(email, 'demo1234');
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        quickDemoLogin,
      }}
    >
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
