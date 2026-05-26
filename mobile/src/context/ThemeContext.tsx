import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  colors: typeof LightColors;
}

const LightColors = {
  background: '#F9FAFB',
  card: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
  primary: '#4F46E5',
  border: '#F3F4F6',
  divider: '#F3F4F6',
  surface: '#FFFFFF',
  chip: '#EEF2FF',
  chipText: '#4F46E5',
};

const DarkColors = {
  background: '#111827',
  card: '#1F2937',
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
  primary: '#6366F1',
  border: '#374151',
  divider: '#374151',
  surface: '#1F2937',
  chip: '#312E81',
  chipText: '#C7D2FE',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      console.log('[Theme] Loading theme...');
      const savedTheme = await SecureStore.getItemAsync('userTheme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme);
        console.log('[Theme] Loaded theme:', savedTheme);
      } else {
        console.log('[Theme] No saved theme, using default (light)');
      }
    } catch (e) {
      console.error('[Theme] Failed to load theme:', e);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    await SecureStore.setItemAsync('userTheme', newTheme);
  };

  const colors = theme === 'light' ? LightColors : DarkColors;
  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
