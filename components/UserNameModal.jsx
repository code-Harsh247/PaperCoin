'use client'
import React, { useState, useEffect } from 'react'
import { XCircle } from 'lucide-react'
import axios from 'axios'

const UserNameModal = ({ isOpen, onClose, initialMode = 'set-username', email }) => {
  const [username, setUsername] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  
  // Reset form when modal opens/closes
  useEffect(() => {
    setUsername('')
    setUsernameError('')
  }, [isOpen])
  
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

  // Basic client-side validation
  const validateUsername = (username) => {
    if (!username.trim()) {
      return 'Username is required'
    }
    
    if (username.length < 3) {
      return 'Username must be at least 3 characters'
    }
    
    if (username.length > 20) {
      return 'Username must be less than 20 characters'
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return 'Username can only contain letters, numbers, and underscores'
    }
    
    return ''
  }
  
  const handleUsernameChange = (e) => {
    const newUsername = e.target.value
    setUsername(newUsername)
    
    // Only do client-side validation here, no API call
    const validationError = validateUsername(newUsername)
    setUsernameError(validationError)
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Final validation before submission
    const validationError = validateUsername(username)
    if (validationError) {
      setUsernameError(validationError)
      return
    }
    
    setIsCheckingUsername(true)
    
    try {
      // Check if the username exists using axios
      const checkResponse = await axios.post('/api/auth/checkUserExist', { username })
      
      if (checkResponse.data.isUserNameUsed) {
        setUsernameError('This username is already taken')
        setIsCheckingUsername(false)
        return
      }
      
      // Username is available, update the existing user
      const updateResponse = await axios.post('/api/auth/updateUserName', {
        email: email, // Using the email of the existing user
        username: username 
      })
      
      console.log('updateResponse', updateResponse)
      
      // Success - close modal and notify parent component
      console.log('Username updated successfully:', username)
      onClose(username) // Pass the username back to the parent
      
    } catch (error) {
      console.error('Error updating username:', error)
      
      // More specific error handling with axios
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        setUsernameError(`Error: ${error.response.data.message || 'Server error occurred'}`)
      } else if (error.request) {
        // The request was made but no response was received
        setUsernameError('Network error: No response from server')
      } else {
        // Something happened in setting up the request
        setUsernameError('An error occurred while updating your username')
      }
    } finally {
      setIsCheckingUsername(false)
    }
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/40">
      <div 
        className="bg-gray-900 rounded-xl w-full max-w-md p-8 relative animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
          aria-label="Close"
        >
          <XCircle size={24} />
        </button>
        
        {/* Modal header */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-white">Choose Your Username</h2>
          <p className="text-gray-400 mt-2">
            Pick a unique username for your PaperCoin account
          </p>
        </div>
        
        {/* Username form */}
        <form onSubmit={handleSubmit}>
          {/* Username field */}
          <div className="mb-4">
            <label htmlFor="username" className="block text-gray-300 mb-2 text-sm">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={handleUsernameChange}
              className={`w-full bg-gray-800 border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                usernameError ? 'border-red-500' : 'border-gray-700'
              }`}
              placeholder="Enter your username"
              autoComplete="off"
            />
            
            {/* Username validation error */}
            {usernameError && (
              <p className="mt-2 text-red-400 text-sm">{usernameError}</p>
            )}
            
            {/* Username requirements */}
            <div className="mt-2 text-gray-400 text-xs">
              <p>Username requirements:</p>
              <ul className="list-disc ml-5 mt-1 space-y-1">
                <li className={username.length >= 3 ? 'text-green-400' : ''}>
                  At least 3 characters
                </li>
                <li className={username.length <= 20 ? 'text-green-400' : ''}>
                  Maximum 20 characters
                </li>
                <li className={/^[a-zA-Z0-9_]*$/.test(username) ? 'text-green-400' : ''}>
                  Only letters, numbers, and underscores
                </li>
              </ul>
            </div>
          </div>
          
          {/* Loading indicator */}
          {isCheckingUsername && (
            <div className="mb-4 text-amber-500 text-sm flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing your request...
            </div>
          )}
          
          {/* Submit button */}
          <button
            type="submit"
            disabled={isCheckingUsername || !!usernameError || !username || username.length < 3}
            className={`w-full font-bold py-3 px-4 rounded-lg transition-colors mb-4 ${
              isCheckingUsername || !!usernameError || !username || username.length < 3
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-600 text-black'
            }`}
          >
            Save Username
          </button>
        </form>
      </div>
    </div>
  )
}

export default UserNameModal