import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { logoutUser } from './supabaseApi';

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: async () => {
        await logoutUser();
        set({ token: null, user: null });
      },
    }),
    {
      name: 'fleet-auth',
    }
  )
);
