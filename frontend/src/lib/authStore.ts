/**
 * Auth Store - Zustand
 */

import { create } from 'zustand';
import Cookies from 'js-cookie';
import api from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'advocate' | 'student' | 'client' | 'researcher';
  status: string;
  language_preference?: string;
  plan?: string;
  tokens_used?: number;
  tokens_limit?: number;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; role?: string }) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const { user, accessToken, refreshToken } = data.data;
    Cookies.set('accessToken', accessToken, { expires: 7 });
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  register: async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    const { user, accessToken, refreshToken } = data.data;
    Cookies.set('accessToken', accessToken, { expires: 7 });
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    Cookies.remove('accessToken');
    localStorage.clear();
    set({ user: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.data, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));
