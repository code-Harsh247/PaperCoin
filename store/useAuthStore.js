import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      loading: true,
      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ loading }),
      signOut: async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
          set({ user: null });
        } catch (error) {
          console.error('Error signing out:', error);
        }
      },
    }),
    {
      name: 'auth-storage', // key in localStorage
      partialize: (state) => ({ user: state.user }), // ✅ fixed line
    }
  )
);
