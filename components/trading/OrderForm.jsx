// components/trading/OrderForm.jsx
'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const OrderForm = ({ symbol = 'btcusdt' }) => {
  // State for order type
  const [orderType, setOrderType] = useState('limit');
  const [stopLimitExpanded, setStopLimitExpanded] = useState(false);
  
  // State for form inputs
  const [buyPrice, setBuyPrice] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [buyTotal, setBuyTotal] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [sellTotal, setSellTotal] = useState('');
  const [tpslChecked, setTpslChecked] = useState(false);
  
  // State for available balances
  const [availableUSDT, setAvailableUSDT] = useState(1000); // Example balance
  const [availableBTC, setAvailableBTC] = useState(0.12); // Example balance
  
  // State for current market price
  const [currentPrice, setCurrentPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Fetch the current Bitcoin price
  useEffect(() => {
    const fetchBitcoinPrice = async () => {
      setLoading(true);
      try {
        const response = await axios.get('https://api.binance.com/api/v3/ticker/price', {
          params: {
            symbol: symbol.toUpperCase()
          }
        });
        
        if (response.data && response.data.price) {
          const price = parseFloat(response.data.price);
          setCurrentPrice(price);
          
          // Update buy and sell price inputs with current price
          if (orderType === 'limit') {
            setBuyPrice(price.toFixed(2));
            setSellPrice(price.toFixed(2));
          }
        }
      } catch (error) {
        console.error('Error fetching Bitcoin price:', error);
        // Fallback price if API fails
        setCurrentPrice(84282.85);
        setBuyPrice('84282.85');
        setSellPrice('84282.85');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBitcoinPrice();
    
    // Set up interval to refresh price every 30 seconds
    const intervalId = setInterval(fetchBitcoinPrice, 30000);
    
    return () => clearInterval(intervalId);
  }, [symbol]);
  
  // Update price when currentPrice changes or when orderType changes
  useEffect(() => {
    if (currentPrice > 0 && orderType === 'limit') {
      setBuyPrice(currentPrice.toFixed(2));
      setSellPrice(currentPrice.toFixed(2));
    } else if (orderType === 'market') {
      setBuyPrice('Market Price');
      setSellPrice('Market Price');
    }
  }, [currentPrice, orderType]);
  
  // Calculate total when price or amount changes
  useEffect(() => {
    if (buyPrice && buyAmount && orderType === 'limit') {
      const total = parseFloat(buyPrice) * parseFloat(buyAmount);
      setBuyTotal(total.toFixed(2));
    }
    
    if (sellPrice && sellAmount && orderType === 'limit') {
      const total = parseFloat(sellPrice) * parseFloat(sellAmount);
      setSellTotal(total.toFixed(2));
    }
  }, [buyPrice, buyAmount, sellPrice, sellAmount, orderType]);
  
  // Format the currency for display
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };
  
  // Handle order type change
  const handleOrderTypeChange = (type) => {
    setOrderType(type);
    
    // Reset form values when changing order type
    if (type === 'market') {
      setBuyPrice('Market Price');
      setSellPrice('Market Price');
    } else if (type === 'limit' && currentPrice > 0) {
      setBuyPrice(currentPrice.toFixed(2));
      setSellPrice(currentPrice.toFixed(2));
    }
  };
  
  // Handle order submission
  const handleBuySubmit = (e) => {
    e.preventDefault();
    console.log('Buy order submitted:', {
      type: orderType,
      price: orderType === 'market' ? 'Market Price' : buyPrice,
      amount: buyAmount,
      total: buyTotal,
      tpsl: tpslChecked
    });
    // Add your order submission logic here
  };
  
  const handleSellSubmit = (e) => {
    e.preventDefault();
    console.log('Sell order submitted:', {
      type: orderType,
      price: orderType === 'market' ? 'Market Price' : sellPrice,
      amount: sellAmount,
      total: sellTotal,
      tpsl: tpslChecked
    });
    // Add your order submission logic here
  };
  
  // Calculate max buy amount based on available USDT
  const calculateMaxBuy = () => {
    if (orderType === 'limit' && buyPrice && parseFloat(buyPrice) > 0) {
      return (availableUSDT / parseFloat(buyPrice)).toFixed(8);
    }
    return '--';
  };
  
  // Calculate max sell amount in USDT
  const calculateMaxSell = () => {
    if (orderType === 'limit' && sellPrice && parseFloat(sellPrice) > 0) {
      return (availableBTC * parseFloat(sellPrice)).toFixed(2);
    }
    return '--';
  };
  
  // Handle buy amount slider change
  const handleBuySliderChange = (percentage) => {
    if (orderType === 'limit' && buyPrice && availableUSDT && parseFloat(buyPrice) > 0) {
      const maxBtc = availableUSDT / parseFloat(buyPrice);
      const amount = (maxBtc * percentage) / 100;
      setBuyAmount(amount.toFixed(8));
    } else if (orderType === 'market' && availableUSDT) {
      // For market orders, calculate based on current price
      const maxBtc = availableUSDT / currentPrice;
      const amount = (maxBtc * percentage) / 100;
      setBuyAmount(amount.toFixed(8));
    }
  };
  
  // Handle sell amount slider change
  const handleSellSliderChange = (percentage) => {
    if (availableBTC) {
      const amount = (availableBTC * percentage) / 100;
      setSellAmount(amount.toFixed(8));
    }
  };
  
  return (
    <div className="flex flex-col bg-[#111722] text-white">
      {/* Order type selection */}
      <div className="flex border-b border-gray-800">
        <button 
          className={`py-3 px-4 font-medium text-sm ${orderType === 'limit' ? 'text-white' : 'text-gray-500'}`}
          onClick={() => handleOrderTypeChange('limit')}
        >
          Limit
        </button>
        <button 
          className={`py-3 px-4 font-medium text-sm ${orderType === 'market' ? 'text-white' : 'text-gray-500'}`}
          onClick={() => handleOrderTypeChange('market')}
        >
          Market
        </button>
        <div className="relative">
          <button 
            className={`py-3 px-4 font-medium text-sm flex items-center ${
              orderType === 'stopLimit' || orderType === 'stopMarket' ? 'text-white' : 'text-gray-500'
            }`}
            onClick={() => setStopLimitExpanded(!stopLimitExpanded)}
          >
            Stop Limit
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="ml-1"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          {stopLimitExpanded && (
            <div className="absolute top-full left-0 bg-gray-900 border border-gray-800 z-10 w-48">
              <button 
                className="block w-full px-4 py-2 text-left hover:bg-gray-800"
                onClick={() => {
                  handleOrderTypeChange('stopLimit');
                  setStopLimitExpanded(false);
                }}
              >
                Stop Limit
              </button>
              <button 
                className="block w-full px-4 py-2 text-left hover:bg-gray-800"
                onClick={() => {
                  handleOrderTypeChange('stopMarket');
                  setStopLimitExpanded(false);
                }}
              >
                Stop Market
              </button>
            </div>
          )}
        </div>
        <div className="ml-auto pr-2">
          <button className="p-2 text-gray-500 hover:text-white">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12" y2="8"></line>
            </svg>
          </button>
        </div>
      </div>
      
      {/* Order forms */}
      <div className="flex">
        {/* Buy form */}
        <div className="w-1/2 p-3 border-r border-gray-800">
          <form onSubmit={handleBuySubmit}>
            {/* Price input */}
            {orderType === 'limit' || orderType === 'stopLimit' ? (
              <div className="mb-3 relative">
                <label className="block text-gray-500 text-xs mb-1">Price</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                    className="w-full bg-[#1c2331] border border-gray-800 rounded p-2 pr-20 text-right"
                    placeholder="0"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                    USDT
                  </div>
                  <div className="absolute right-16 top-0 h-full flex flex-col justify-center">
                    <div className="flex flex-col">
                      <button 
                        type="button" 
                        className="text-gray-500 hover:text-white"
                        onClick={() => {
                          const newPrice = parseFloat(buyPrice || 0) + 1;
                          setBuyPrice(newPrice.toFixed(2));
                        }}
                      >
                        <svg width="12" height="6" viewBox="0 0 12 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 0L0 6H12L6 0Z" fill="currentColor"/>
                        </svg>
                      </button>
                      <button 
                        type="button" 
                        className="text-gray-500 hover:text-white mt-1"
                        onClick={() => {
                          const newPrice = Math.max(0, parseFloat(buyPrice || 0) - 1);
                          setBuyPrice(newPrice.toFixed(2));
                        }}
                      >
                        <svg width="12" height="6" viewBox="0 0 12 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 6L0 0H12L6 6Z" fill="currentColor"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-3 relative">
                <label className="block text-gray-500 text-xs mb-1">Price</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value="Market Price"
                    readOnly
                    className="w-full bg-[#1c2331] border border-gray-800 rounded p-2 pr-20 text-right text-gray-400"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                    USDT
                  </div>
                </div>
              </div>
            )}
            
            {/* Amount/Total input based on order type */}
            {orderType === 'market' ? (
              <div className="mb-3 relative">
                <label className="block text-gray-500 text-xs mb-1">Total</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={buyTotal}
                    onChange={(e) => {
                      setBuyTotal(e.target.value);
                      // Calculate amount based on total and current price
                      if (e.target.value && currentPrice > 0) {
                        const amount = parseFloat(e.target.value) / currentPrice;
                        setBuyAmount(amount.toFixed(8));
                      }
                    }}
                    className="w-full bg-[#1c2331] border border-gray-800 rounded p-2 pr-20 text-right"
                    placeholder="Minimum 5"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                    USDT
                  </div>
                  <div className="absolute right-16 top-0 h-full flex flex-col justify-center">
                    <div className="flex flex-col">
                      <button 
                        type="button" 
                        className="text-gray-500 hover:text-white"
                        onClick={() => {
                          const newTotal = parseFloat(buyTotal || 0) + 5;
                          setBuyTotal(newTotal.toFixed(2));
                          if (currentPrice > 0) {
                            const amount = newTotal / currentPrice;
                            setBuyAmount(amount.toFixed(8));
                          }
                        }}
                      >
                        <svg width="12" height="6" viewBox="0 0 12 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 0L0 6H12L6 0Z" fill="currentColor"/>
                        </svg>
                      </button>
                      <button 
                        type="button" 
                        className="text-gray-500 hover:text-white mt-1"
                        onClick={() => {
                          const newTotal = Math.max(5, parseFloat(buyTotal || 0) - 5);
                          setBuyTotal(newTotal.toFixed(2));
                          if (currentPrice > 0) {
                            const amount = newTotal / currentPrice;
                            setBuyAmount(amount.toFixed(8));
                          }
                        }}
                      >
                        <svg width="12" height="6" viewBox="0 0 12 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 6L0 0H12L6 6Z" fill="currentColor"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-3 relative">
                <label className="block text-gray-500 text-xs mb-1">Amount</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={buyAmount}
                    onChange={(e) => {
                      setBuyAmount(e.target.value);
                      // Calculate total based on amount and price
                      if (e.target.value && buyPrice && orderType === 'limit') {
                        const total = parseFloat(e.target.value) * parseFloat(buyPrice);
                        setBuyTotal(total.toFixed(2));
                      }
                    }}
                    className="w-full bg-[#1c2331] border border-gray-800 rounded p-2 pr-16 text-right"
                    placeholder="0"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                    BTC
                  </div>
                  <div className="absolute right-14 top-0 h-full flex flex-col justify-center">
                    <div className="flex flex-col">
                      <button 
                        type="button" 
                        className="text-gray-500 hover:text-white"
                        onClick={() => {
                          const newAmount = parseFloat(buyAmount || 0) + 0.001;
                          setBuyAmount(newAmount.toFixed(8));
                          if (buyPrice && orderType === 'limit') {
                            const total = newAmount * parseFloat(buyPrice);
                            setBuyTotal(total.toFixed(2));
                          }
                        }}
                      >
                        <svg width="12" height="6" viewBox="0 0 12 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 0L0 6H12L6 0Z" fill="currentColor"/>
                        </svg>
                      </button>
                      <button 
                        type="button" 
                        className="text-gray-500 hover:text-white mt-1"
                        onClick={() => {
                          const newAmount = Math.max(0, parseFloat(buyAmount || 0) - 0.001);
                          setBuyAmount(newAmount.toFixed(8));
                          if (buyPrice && orderType === 'limit') {
                            const total = newAmount * parseFloat(buyPrice);
                            setBuyTotal(total.toFixed(2));
                          }
                        }}
                      >
                        <svg width="12" height="6" viewBox="0 0 12 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 6L0 0H12L6 6Z" fill="currentColor"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Slider */}
            <div className="mb-3">
              <input 
                type="range" 
                min="0" 
                max="100" 
                className="w-full accent-green-500"
                onChange={(e) => {
                  const percentage = parseInt(e.target.value);
                  if (orderType === 'market') {
                    // For market orders, calculate based on total
                    const maxTotal = availableUSDT;
                    const total = (maxTotal * percentage) / 100;
                    setBuyTotal(total.toFixed(2));
                    if (currentPrice > 0) {
                      const amount = total / currentPrice;
                      setBuyAmount(amount.toFixed(8));
                    }
                  } else {
                    // For limit orders, calculate based on amount
                    handleBuySliderChange(percentage);
                  }
                }}
              />
              <div className="flex justify-between mt-1">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            
            {/* TP/SL Checkbox */}
            <div className="mb-3">
              <label className="flex items-center">
                <input 
                  type="checkbox" 
                  checked={tpslChecked} 
                  onChange={(e) => setTpslChecked(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">TP/SL</span>
              </label>
            </div>
            
            {/* Available balance */}
            <div className="flex justify-between text-xs text-gray-500 mb-3">
              <span>Avbl</span>
              <span>{availableUSDT.toFixed(2)} USDT</span>
            </div>
            
            <div className="flex justify-between text-xs text-gray-500 mb-3">
              <span>Max Buy</span>
              <span>{calculateMaxBuy()} BTC</span>
            </div>
            
            {/* Submit button */}
            <button 
              type="submit" 
              className="w-full p-3 bg-green-500 hover:bg-green-600 rounded text-white font-medium"
            >
              {loading ? 'Loading...' : 'Buy BTC'}
            </button>
          </form>
        </div>
      </div>
      
      {/* Conditional rendering for order types other than standard limit/market */}
      {(orderType === 'stopLimit' || orderType === 'stopMarket') && (
        <div className="px-3 pt-2 pb-4 border-t border-gray-800">
          <h3 className="text-sm font-medium mb-3">Stop-Limit Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-500 text-xs mb-1">Trigger Price</label>
              <div className="relative">
                <input 
                  type="text" 
                  className="w-full bg-[#1c2331] border border-gray-800 rounded p-2 pr-20 text-right"
                  placeholder="0"
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                  USDT
                </div>
              </div>
            </div>
            
            {orderType === 'stopLimit' && (
              <div>
                <label className="block text-gray-500 text-xs mb-1">Limit Price</label>
                <div className="relative">
                  <input 
                    type="text" 
                    className="w-full bg-[#1c2331] border border-gray-800 rounded p-2 pr-20 text-right"
                    placeholder="0"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                    USDT
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* TP/SL Settings if enabled */}
      {tpslChecked && (
        <div className="px-3 pt-2 pb-4 border-t border-gray-800">
          <h3 className="text-sm font-medium mb-3">Take Profit / Stop Loss</h3>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-gray-500 text-xs mb-1">Take Profit</label>
              <div className="relative">
                <input 
                  type="text" 
                  className="w-full bg-[#1c2331] border border-gray-800 rounded p-2 pr-20 text-right"
                  placeholder="0"
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                  USDT
                </div>
              </div>
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">Stop Loss</label>
              <div className="relative">
                <input 
                  type="text" 
                  className="w-full bg-[#1c2331] border border-gray-800 rounded p-2 pr-20 text-right"
                  placeholder="0"
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                  USDT
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="bg-[#1c2331] border border-gray-800 rounded px-3 py-1 flex items-center">
              <span className="text-xs">25%</span>
            </div>
            <div className="bg-[#1c2331] border border-gray-800 rounded px-3 py-1 flex items-center">
              <span className="text-xs">50%</span>
            </div>
            <div className="bg-[#1c2331] border border-gray-800 rounded px-3 py-1 flex items-center">
              <span className="text-xs">75%</span>
            </div>
            <div className="bg-[#1c2331] border border-gray-800 rounded px-3 py-1 flex items-center">
              <span className="text-xs">100%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderForm;
    