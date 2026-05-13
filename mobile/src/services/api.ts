import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getAPIUrl = () => {
  // 1. Explicit environment variable (Production)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. Dynamically determine dev server IP (Works on LAN physical devices)
  const hostUri = Constants.experienceUrl || Constants.expoConfig?.hostUri;
  if (hostUri) {
    const match = hostUri.match(/([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/);
    if (match && match[1]) {
      return `http://${match[1]}:4000/api`;
    }
  }

  // 3. Android Emulator fallback (10.0.2.2 points to host's localhost)
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000/api';
  }

  // 4. Default localhost (iOS simulator / Web)
  return 'http://localhost:4000/api';
};

const API_URL = getAPIUrl();

console.log('[API] Using API URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 second timeout
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log('[API] Request:', config.method?.toUpperCase(), config.url);
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log('[API] Response:', response.status, response.config.url);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login') && !originalRequest.url?.includes('/auth/refresh-token')) {
      originalRequest._retry = true;
      console.log('[API] 401 detected, attempting token refresh...');

      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (!refreshToken) throw new Error('No refresh token available');

        const res = await axios.post(`${API_URL}/auth/refresh-token`, { token: refreshToken });
        const { accessToken } = res.data;

        await SecureStore.setItemAsync('accessToken', accessToken);
        console.log('[API] Token refreshed successfully');

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('[API] Refresh failed, clearing session:', refreshError);
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        await SecureStore.deleteItemAsync('userId');
        await SecureStore.deleteItemAsync('userRole');
        // This will eventually cause AuthContext to set isLoggedIn to false
        return Promise.reject(refreshError);
      }
    }

    console.error('[API] Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message
    });
    return Promise.reject(error);
  }
);

export default api;