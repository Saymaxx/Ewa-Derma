'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from './api';

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  roles: ('ADMIN' | 'DOCTOR' | 'RECEPTIONIST' | 'INVENTORY_MANAGER')[];
  doctorId?: string | null;
  clinic?: {
    clinicName: string;
    address: string;
    contactNumber: string;
    openingTime: string;
    closingTime: string;
    operatingDays: string;
  } | null;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: string | string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      const cachedUser = localStorage.getItem('ewa_user');
      if (cachedUser) {
        try {
          return JSON.parse(cachedUser);
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('ewa_access_token');
    }
    return true;
  });
  const router = useRouter();
  const pathname = usePathname();

  const fetchCurrentUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('ewa_access_token');
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const res = await api.get('/auth/me');
      if (res.data?.data) {
        setUser(res.data.data);
        localStorage.setItem('ewa_user', JSON.stringify(res.data.data));
      }
    } catch (err) {
      localStorage.removeItem('ewa_access_token');
      localStorage.removeItem('ewa_refresh_token');
      localStorage.removeItem('ewa_user');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', { identifier, password });
      const { accessToken, refreshToken, user: userData } = res.data.data;

      localStorage.setItem('ewa_access_token', accessToken);
      localStorage.setItem('ewa_refresh_token', refreshToken);
      localStorage.setItem('ewa_user', JSON.stringify(userData));

      setUser(userData);
      if (userData.roles?.includes('DOCTOR') && !userData.roles?.includes('ADMIN')) {
        router.push('/doctor/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      setIsLoading(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('ewa_refresh_token');
      await api.post('/auth/logout', { refreshToken });
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('ewa_access_token');
      localStorage.removeItem('ewa_refresh_token');
      localStorage.removeItem('ewa_user');
      setUser(null);
      router.push('/login');
    }
  };

  const hasRole = (requiredRoles: string | string[]) => {
    if (!user || !user.roles) return false;
    const required = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return required.some((role) => user.roles.includes(role as any));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasRole,
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
