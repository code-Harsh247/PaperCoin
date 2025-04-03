import { create } from 'zustand';
import { useRouter } from 'next/navigation';

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  signOut: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      set({ user: null });
      // You can't use useRouter here directly, so call router in component
    } catch (error) {
      console.error('Error signing out:', error);
    }
  },
}));
