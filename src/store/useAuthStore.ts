import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ADMIN_USERNAME, ADMIN_PASSWORD } from '@/lib/constants';

interface AuthStore {
  isAdmin: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isAdmin: false,
      login: (u, p) => {
        if (u === ADMIN_USERNAME && p === ADMIN_PASSWORD) {
          set({ isAdmin: true });
          return true;
        }
        return false;
      },
      logout: () => set({ isAdmin: false }),
    }),
    { name: 'nwa-tracker-auth' },
  ),
);
