import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ADMIN_USERNAME, SHARED_PASSWORD } from '@/lib/constants';
import { useNwaStore } from './useNwaStore';
import type { Role } from '@/lib/types';

export interface AuthUser {
  id: string;
  name: string;
  roles: Role[];
  isAdmin: boolean;
}

interface AuthStore {
  currentUser: AuthUser | null;
  isAdmin: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      currentUser: null,
      isAdmin: false,
      login: (username, password) => {
        if (password !== SHARED_PASSWORD) return false;
        const uname = username.trim().toLowerCase();
        if (!uname) return false;

        if (uname === ADMIN_USERNAME) {
          set({
            currentUser: {
              id: 'admin',
              name: 'Administrator',
              roles: ['admin'],
              isAdmin: true,
            },
            isAdmin: true,
          });
          return true;
        }

        const team = useNwaStore.getState().team;
        const member = team.find(
          (m) => m.name.toLowerCase() === uname || m.id === uname,
        );
        if (!member) return false;

        set({
          currentUser: {
            id: member.id,
            name: member.name,
            roles: member.roles,
            isAdmin: false,
          },
          isAdmin: false,
        });
        return true;
      },
      logout: () => set({ currentUser: null, isAdmin: false }),
    }),
    { name: 'nwa-tracker-auth-v2' },
  ),
);
