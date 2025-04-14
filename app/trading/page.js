'use client'
import {useEffect} from 'react'
import OrderBookComponent from '@/components/trading/OrderBookComponent'
import CandleStickChart from '@/components/trading/CandleStickChart'
import PriceHeader from '@/components/trading/PriceHeader'
import OrderHistory from '@/components/trading/OrderHistory'
import TradingForm from '@/components/trading/TradingForm'
import { useAuthStore } from '@/store/useAuthStore'

const Page = () => {
  const symbol = "btcusdt"; // Define your symbol here
  const { user } = useAuthStore()

  useEffect(() => {
    console.log('User in trading:', user)
  },[user])

  return (
    <div className='flex flex-col w-screen h-auto bg-[#111722]'>
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