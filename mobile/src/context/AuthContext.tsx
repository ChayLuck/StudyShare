import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

import api from '../services/api';

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  userId: string | null;
  userRole: string | null;
  accessToken: string | null;
  login: (token: string, refreshToken: string, userId: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    // Set a safety timeout in case checkLoginStatus hangs
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn('[Auth] Timeout: Setting isLoading to false');
        setIsLoading(false);
      }
    }, 5000); // 5 second timeout

    checkLoginStatus();

    return () => clearTimeout(timeoutId);
  }, []);

  const checkLoginStatus = async () => {
    try {
      console.log('[Auth] Checking login status...');
      const token = await SecureStore.getItemAsync('accessToken');
      const storedUserId = await SecureStore.getItemAsync('userId');
      const storedRole = await SecureStore.getItemAsync('userRole');

      if (token) {
        try {
          // Verify token validity with backend
          const response = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data.user) {
            setUserId(storedUserId);
            setUserRole(storedRole);
            setAccessToken(token);
            setIsLoggedIn(true);
            console.log('[Auth] Session verified');
          } else {
            throw new Error('User data missing');
          }
        } catch (error) {
          console.warn('[Auth] Token invalid or expired, logging out');
          await logout();
        }
      } else {
        setIsLoggedIn(false);
      }
    } catch (e) {
      console.error('[Auth] Failed to check login status:', e);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token: string, refreshToken: string, userId: string, role: string) => {
    await SecureStore.setItemAsync('accessToken', token);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    await SecureStore.setItemAsync('userId', userId);
    await SecureStore.setItemAsync('userRole', role);
    
    setAccessToken(token);
    setUserId(userId);
    setUserRole(role);
    setIsLoggedIn(true);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('userId');
    await SecureStore.deleteItemAsync('userRole');
    
    setAccessToken(null);
    setUserId(null);
    setUserRole(null);
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, isLoading, userId, userRole, accessToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
