import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (token: string, userId: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
      console.log('[Auth] Token found:', !!token);
      setIsLoggedIn(!!token);
    } catch (e) {
      console.error('[Auth] Failed to check login status:', e);
      setIsLoggedIn(false);
    } finally {
      console.log('[Auth] Setting isLoading to false');
      setIsLoading(false);
    }
  };

  const login = async (token: string, userId: string, role: string) => {
    await SecureStore.setItemAsync('accessToken', token);
    await SecureStore.setItemAsync('userId', userId);
    await SecureStore.setItemAsync('userRole', role);
    setIsLoggedIn(true);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('userId');
    await SecureStore.deleteItemAsync('userRole');
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, isLoading, login, logout }}>
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
