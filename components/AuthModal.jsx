'use client'
import React, { useState, useEffect } from 'react'
import { XCircle } from 'lucide-react'

const AuthModal = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode) // 'login' or 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [formError, setFormError] = useState('')
  
  // Reset form when modal opens/closes or mode changes
  useEffect(() => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setName('')
    setFormError('')
  }, [isOpen, mode])
  
  // Close modal when Escape key is pressed
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose])
  
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isOpen])
  
  if (!isOpen) return null
  
  const handleSubmit = (e) => {
    e.preventDefault()
    setFormError('')
    
    if (mode === 'signup') {
      // Validation for signup
      if (!name.trim()) {
        setFormError('Name is required')
        return
      }
      
      if (password !== confirmPassword) {
        setFormError('Passwords do not match')
        return
      }
    }
    
    if (!email.trim() || !password.trim()) {
      setFormError('Email and password are required')
      return
    }
    
    // Here you would handle authentication logic
    console.log('Form submitted:', { mode, email, password, name })
    
    // Mock successful auth for now
    onClose()
  }
  
  const handleGoogleAuth = () => {
    // Redirect to Google OAuth endpoint
    window.location.href = '/api/auth/google'
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/40">
      <div 
        className="bg-gray-900 rounded-xl w-full max-w-md p-8 relative animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button 
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
          onClick={onClose}
        >
          <XCircle size={24} />
        </button>
        
        {/* Modal header */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-white">
            {mode === 'login' ? 'Welcome' : 'Create an Account'}
          </h2>
          <p className="text-gray-400 mt-2">
            {mode === 'login' 
              ? 'Sign in to access your PaperCoin account' 
              : 'Start your crypto trading journey today'}
          </p>
        </div>
        
        {/* Form error message */}
        {formError && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
            {formError}
          </div>
        )}
        
        {/* Auth Form */}
        <form onSubmit={handleSubmit}>
          {/* Name field - only for signup */}
          {mode === 'signup' && (
            <div className="mb-4">
              <label htmlFor="name" className="block text-gray-300 mb-2 text-sm">Full Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Enter your name"
              />
            </div>
          )}
          
          {/* Email field */}
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-300 mb-2 text-sm">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Enter your email"
            />
          </div>
          
          {/* Password field */}
          <div className="mb-4">
            <label htmlFor="password" className="block text-gray-300 mb-2 text-sm">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Enter your password"
            />
          </div>
          
          {/* Confirm Password field - only for signup */}
          {mode === 'signup' && (
            <div className="mb-4">
              <label htmlFor="confirmPassword" className="block text-gray-300 mb-2 text-sm">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Confirm your password"
              />
            </div>
          )}
          
          {/* Forgot password link - only for login */}
          {mode === 'login' && (
            <div className="mb-6 text-right">
              <a href="#" className="text-sm text-amber-500 hover:text-amber-400">Forgot password?</a>
            </div>
          )}
          
          {/* Submit button */}
          <button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 px-4 rounded-lg transition-colors mb-4"
          >
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
          
          {/* Divider */}
          <div className="flex items-center mb-4">
            <div className="flex-1 border-t border-gray-700"></div>
            <span className="mx-4 text-gray-500 text-sm">OR</span>
            <div className="flex-1 border-t border-gray-700"></div>
          </div>
          
          {/* Google OAuth button */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg border border-gray-700 transition-colors flex items-center justify-center gap-2 mb-6"
          >
            <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
            </svg>
            <span>Continue with Google</span>
          </button>
          
          {/* Mode toggle */}
          <div className="text-center text-gray-400 text-sm">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button 
                  type="button"
                  onClick={() => setMode('signup')} 
                  className="text-amber-500 hover:text-amber-400"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button 
                  type="button"
                  onClick={() => setMode('login')} 
                  className="text-amber-500 hover:text-amber-400"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default AuthModal