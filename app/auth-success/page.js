'use client'
import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore' 

export default function AuthSuccess() {
  const router = useRouter()
  // Access the correct user state from your Zustand store
  // You may need to adjust this selector based on your actual store structure
  const user = useAuthStore(state => state.user)
  
  // For debugging
  console.log('Initial user state:', user)

  useEffect(() => {
    // Check for any URL parameters
    console.log('User in effect:', user)
    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    
    if (error) {
      console.error('Authentication error from URL:', error)
      router.push('/?auth=failed')
      return
    }

    // Check user state with more detailed logging
    if (!user) {
      console.error('No user found in store')
      
      // Optional: Add a fallback check for user in localStorage or other sources
      const fallbackUser = localStorage.getItem('auth_user')
      if (fallbackUser) {
        console.log('Found fallback user, proceeding with redirect')
        redirectToDashboard()
      } else {
        console.log('No fallback user found, redirecting to auth failed')
        router.push('/?auth=failed')
      }
      return
    }

    console.log('Authentication successful:', user)
    console.log('Redirecting to dashboard...')
    redirectToDashboard()
  }, [router, user]) // Keep user in dependency array
  
  // Extract redirect logic to a separate function for clarity
  const redirectToDashboard = () => {
    console.log('Starting redirect timeout...')
    setTimeout(() => {
      console.log('Timeout complete, pushing to dashboard...')
      router.push('/dashboard')
    }, 1500)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4">
      <div className="bg-gray-900 rounded-xl p-8 max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">Authentication Successful</h1>
        <p className="text-gray-400 mb-6">You've been successfully authenticated!</p>
        
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          <span className="ml-3 text-gray-400">Redirecting to dashboard...</span>
        </div>
      </div>
    </div>
  )
}