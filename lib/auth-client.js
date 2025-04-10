// lib/auth-client.js
import { useAuthStore } from '@/store/useAuthStore';


export const checkAuthentication = async () => {
  try {
    // Check if we have a user in the Zustand store
    const authStore = useAuthStore.getState();
    const userInStore = authStore.user;
    
    if (userInStore?.userId) {
      // If we have user data in the store, assume authenticated
      console.log('User found in store, already authenticated');
      return true;
    }

    // If no user in store, try to verify session with the server
    const response = await fetch('/api/auth/verify-session', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important to send cookies
    });

    if (!response.ok) {
      console.log('Session verification failed');
      return false;
    }

    const data = await response.json();
    
    if (data.isAuthenticated && data.user) {
      // Update the auth store with the user data
      authStore.setUser(data.user);
      console.log('Session verified, user authenticated');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Authentication check error:', error);
    return false;
  }
};


export const handleAuthRedirect = async (router) => {
  const isAuthenticated = await checkAuthentication();
  
  if (isAuthenticated && router) {
    // If router is provided and user is authenticated, redirect to dashboard
    router.push('/dashboard');
  }
  
  // Return authentication status for conditional handling
  return isAuthenticated;
};