'use client'
import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthSuccess() {
  const router = useRouter()

  useEffect(() => {
    // Check for any URL parameters
    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    
    if (error) {
      console.error('Authentication error:', error)
      router.push('/?auth=failed')
      return
    }

    // On success - redirect to dashboard or home page
    setTimeout(() => {
      router.push('/dashboard')
    }, 1500)
  }, [router])

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