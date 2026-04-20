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

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;