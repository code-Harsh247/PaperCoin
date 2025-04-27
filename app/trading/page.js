'use client'
import {useEffect, useState} from 'react'
import OrderBookComponent from '@/components/trading/OrderBookComponent'
import CandleStickChart from '@/components/trading/CandleStickChart'
import PriceHeader from '@/components/trading/PriceHeader'
import OrderHistory from '@/components/trading/OrderHistory'
import TradingForm from '@/components/trading/TradingForm'
import { useAuthStore } from '@/store/useAuthStore'

const Page = () => {
  const symbol = "btcusdt"; // Define your symbol here
  const { user } = useAuthStore()
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    console.log('User in trading:', user)
    
    // Check if the device is mobile
    const checkIfMobile = () => {
      const mobileBreakpoint = 768; // Typical mobile breakpoint
      setIsMobile(window.innerWidth < mobileBreakpoint)
    }
    
    // Check on initial load
    checkIfMobile()
    
    // Add resize listener
    window.addEventListener('resize', checkIfMobile)
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile)
  }, [user])
  
  // Mobile notice component
  const MobileNotice = () => (
    <div className="fixed inset-0 bg-[#111722] z-50 flex items-center justify-center text-center p-6">
      <div className="bg-[#1a2233] p-8 rounded-lg shadow-lg max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">Mobile Version Coming Soon</h2>
        <p className="text-gray-300 mb-6">Please switch to desktop view for the best trading experience.</p>
      </div>
    </div>
  )
  
  return (
    <div className='flex flex-col w-screen h-auto bg-[#111722]'>
      {isMobile && <MobileNotice />}
      
      <PriceHeader symbol={symbol}/>
     
      {/* Chart and OrderBook section */}
      <div className='flex'>
        <div className='w-1/5 border-r border-gray-800'>
          <OrderBookComponent symb={symbol} />
        </div>
        <div className='flex-1'>
          <CandleStickChart symbol={symbol} defaultInterval="1m" />
        </div>
      </div>
      <TradingForm/>
     
      {/* Order History section */}
      <OrderHistory/>
    </div>
  )
}

export default Page