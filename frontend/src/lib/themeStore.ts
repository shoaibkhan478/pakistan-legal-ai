/**
 * Theme Store - Dark/Light mode + Language
 */

import { create } from 'zustand';

interface ThemeState {
  theme: 'light' | 'dark';
  language: 'english' | 'urdu';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (lang: 'english' | 'urdu') => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: typeof window !== 'undefined' && localStorage.getItem('theme') === 'dark' ? 'dark' : 'light',
  language: typeof window !== 'undefined' ? (localStorage.getItem('language') as any) || 'english' : 'english',

  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    set({ theme: newTheme });
  },

  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    set({ theme });
  },

  setLanguage: (language) => {
    localStorage.setItem('language', language);
    set({ language });
  },
}));
