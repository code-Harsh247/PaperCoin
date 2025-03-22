import React from 'react'
import TradingPlatform from '@/components/TradingPlatform'
import OrderBook from '@/components/OrderBook'

const page = () => {
  return (
    <div className='w-screen h-screen'><OrderBook symb="btcusdt"/></div>
  )
}

export default page