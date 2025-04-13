import React, { useState, useEffect } from 'react'
import { XCircle, Plus } from 'lucide-react'
import axios from 'axios'
import { useAuthStore } from '@/store/useAuthStore' // Update the path as needed

const AddFundsModal = ({ isOpen, onClose, onSuccess }) => {
  const [funds, setFunds] = useState('')
  const [formError, setFormError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // Get user email from auth store
  const userEmail = useAuthStore(state => state.user?.email)
  
  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Set a default amount when opening
      setFunds('100')
    } else {
      setFunds('')
    }
    setFormError('')
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
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    
    // Validate amount
    const reqFunds = parseFloat(funds)
    if (isNaN(reqFunds) || reqFunds <= 0) {
      setFormError('Please enter a valid amount')
      return
    }
    
    // Additional validation for reasonable amounts
    if (reqFunds > 1000000) {
      setFormError('For security reasons, please add funds less than $1,000,000 in a single transaction')
      return
    }
    
    setIsLoading(true)
    
    try {
      // Call the add funds API
      const response = await axios.post('/api/addFunds  ', {
        email: userEmail,
        reqFunds: reqFunds
      })
      
      console.log('Funds added successfully:', response.data)
      
      // Close modal and notify parent component of success
      onClose()
      if (onSuccess) {
        onSuccess(reqFunds)
      }
    } catch (error) {
      console.error('Error adding funds:', error)
      
      // Extract error message from response if available
      const errorMessage = error.response?.data?.message || 
                           'Something went wrong. Please try again later.'
      
      setFormError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Quick amount selection
  const quickAmounts = [100, 500, 1000, 5000]
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/40">
      <div 
        className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl w-full max-w-md p-8 relative animate-fadeIn border border-gray-700 shadow-lg"
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
          <h2 className="text-2xl font-bold text-white">Add Funds</h2>
          <p className="text-gray-400 mt-2">
            Add funds to your PaperCoin account
          </p>
        </div>
        
        {/* Form error message */}
        {formError && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
            {formError}
          </div>
        )}
        
        {/* Add Funds Form */}
        <form onSubmit={handleSubmit}>
          {/* Amount field */}
          <div className="mb-6">
            <label htmlFor="funds" className="block text-gray-300 mb-2 text-sm">Amount ($)</label>
            <input
              id="funds"
              type="number"
              min="1"
              step="any"
              value={funds}
              onChange={(e) => setFunds(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Enter amount"
              disabled={isLoading}
            />
          </div>
          
          {/* Quick amount selection */}
          <div className="mb-6">
            <label className="block text-gray-300 mb-2 text-sm">Quick Select</label>
            <div className="grid grid-cols-4 gap-2">
              {quickAmounts.map(amount => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setFunds(amount.toString())}
                  className="bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg py-2 text-white transition-colors"
                >
                  ${amount}
                </button>
              ))}
            </div>
          </div>
          
          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 px-4 rounded-lg transition-colors mb-4 disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <Plus size={18} className="mr-2" />
                Add Funds
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AddFundsModal