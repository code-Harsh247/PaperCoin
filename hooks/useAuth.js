'use client'
// hooks/useAuth.js
import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';

// Create an authentication context
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check authentication status on mount
  useEffect(() => {
    async function loadUserFromAPI() {
      try {
        const response = await fetch('/api/auth/me');

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUserFromAPI();
  }, []);

  

  // Sign out function
  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      setUser(null)
    } catch (error) {
      console.error('Logout failed:', error)
    }
  };

  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        // The /api/auth/me endpoint will check for the token cookie
        const response = await fetch('/api/auth/me', {
          credentials: 'include', // Important for cookies
        })
        
        if (response.ok) {
          const userData = await response.json()
          setUser(userData)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
      } finally {
        setLoading(false)
      }
    }
    
    checkLoggedIn()
  }, [])
  

  

  // Provide authentication context to children
  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use authentication in components
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}