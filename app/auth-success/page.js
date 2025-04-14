'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'

export default function AuthSuccess() {
  const router = useRouter()
  const { user, setUser, setLoading } = useAuthStore()
  const [isProcessing, setIsProcessing] = useState(true)
  
  // For debugging
  console.log('Initial user state:', user)

  useEffect(() => {
    async function verifyAndFetchUser() {
      try {
        setLoading(true)
        console.log('Starting auth verification')
        
        // Check for URL error parameters
        const params = new URLSearchParams(window.location.search)
        const error = params.get('error')
        
        if (error) {
          console.error('Authentication error from URL:', error)
          router.push('/login?error=auth_failed')
          return
        }
        
        // Get user data from the server using the HTTP-only cookie token
        const response = await fetch('/api/auth/me')
        
        if (!response.ok) {
          console.error('Failed to fetch user data:', await response.text())
          router.push('/login?error=fetch_failed')
          return
        }
        
        const userData = await response.json()
        console.log('User data fetched successfully:', userData)
        
        // The user object should match the structure expected by your app
        const formattedUser = {
          id: userData.userId || userData.id,
          name: userData.name,
          email: userData.email,
          // Add any other fields your app expects
        }
        
        // Update the Zustand store with the user data
        setUser(formattedUser)
        
        // Start redirect to dashboard
        console.log('Authentication successful, redirecting to dashboard...')
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500)
      } catch (error) {
        console.error('Authentication verification error:', error)
        router.push('/login?error=verification_failed')
      } finally {
        setIsProcessing(false)
        setLoading(false)
      }
    }
    
    verifyAndFetchUser()
  }, [router, setUser, setLoading])
  
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