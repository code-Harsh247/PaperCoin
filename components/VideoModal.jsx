'use client'
import React, { useState, useEffect, useRef } from 'react';

const VideoModal = ({ isOpen, onClose }) => {
  const modalRef = useRef(null);
  
  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent scrolling when modal is open
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div 
        ref={modalRef}
        className="relative bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full overflow-hidden"
      >
        {/* Close button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-white hover:text-amber-500 z-10"
          aria-label="Close modal"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* YouTube iframe (with autoplay=1) */}
        <div className="relative pb-[56.25%] h-0">
          <iframe 
            className="absolute top-0 left-0 w-full h-full"
            src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
            title="Demo Video" 
            frameBorder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen
          ></iframe>
        </div>
      </div>
    </div>
  );
};

export default VideoModal;