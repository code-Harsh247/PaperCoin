'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useOrderbook } from './OrderBookContext';
import { useAuthStore } from '@/store/useAuthStore';
import axios from 'axios';

// Create the context
const MatchingEngineContext = createContext();

// Custom hook to use the matching engine context
export const useMatchingEngine = () => useContext(MatchingEngineContext);

export const MatchingEngineProvider = ({ children }) => {
  const { rawOrderbook, virtualOrders, fetchUserTrades } = useOrderbook();
  const { user } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastMatchResult, setLastMatchResult] = useState(null);
  const [matchStats, setMatchStats] = useState({
    fullMatches: 0,
    partialMatches: 0,
    totalVolume: 0
  });

  // Function to update a trade in the database
  const updateTrade = useCallback(async (tradeId, newFilledAmount, newStatus) => {
    if (!user?.userId) return null;
    
    try {
      const response = await axios.post('/api/trades/updateTrade', {
        trade_id: tradeId,
        filled_amount: newFilledAmount,
        status: newStatus
      });
      
      return response.data;
    } catch (error) {
      console.error('Error updating trade:', error);
      return null;
    }
  }, [user]);

  // Process a potential match between a virtual order and a real order
  const processMatch = useCallback(async (virtualOrder, realOrder, virtualOrderSide) => {
    // Determine if this is a virtual bid matching with a real ask or vice versa
    const isBuyMatch = virtualOrderSide === 'bids'; // Virtual bid matches with real ask
    
    const virtualPrice = parseFloat(virtualOrder.price);
    const realPrice = parseFloat(realOrder.price);
    const virtualAmount = parseFloat(virtualOrder.amount);
    const realAmount = parseFloat(realOrder.amount);
    
    // For a match to occur:
    // - If virtual bid: virtualPrice >= realPrice (willing to buy at this price or higher)
    // - If virtual ask: virtualPrice <= realPrice (willing to sell at this price or lower)
    const isPriceMatch = isBuyMatch ? 
      virtualPrice >= realPrice : 
      virtualPrice <= realPrice;
    
    if (!isPriceMatch) return null;
    
    // Calculate the amount that can be filled
    const fillAmount = Math.min(virtualAmount, realAmount);
    
    // If we have a tradeId, update it in the database
    if (virtualOrder.tradeId) {
      // Get the current trade to calculate the new filled amount
      try {
        const tradesResponse = await axios.post('/api/trades/getTrade', {
          trade_id: virtualOrder.tradeId
        });
        
        const trade = tradesResponse.data.trade;
        if (!trade) throw new Error('Trade not found');
        
        const currentFilledAmount = parseFloat(trade.filled_amount);
        const newFilledAmount = currentFilledAmount + fillAmount;
        const newStatus = newFilledAmount >= parseFloat(trade.amount) ? 'filled' : 'partially_filled';
        
        // Update the trade in the database
        await updateTrade(
          virtualOrder.tradeId,
          newFilledAmount,
          newStatus
        );
        
        // Return match information
        return {
          virtualOrderId: virtualOrder.tradeId,
          matchPrice: realPrice,
          matchAmount: fillAmount,
          remainingAmount: virtualAmount - fillAmount,
          isFull: newStatus === 'filled',
          executionPrice: isBuyMatch ? realPrice : virtualPrice // The price at which the order executes
        };
      } catch (error) {
        console.error('Error processing match:', error);
        return null;
      }
    }
    
    return null;
  }, [updateTrade]);

  // Find matches for all virtual orders against the real orderbook
  const findMatches = useCallback(async () => {
    if (isProcessing || !rawOrderbook || !virtualOrders) return;
    
    setIsProcessing(true);
    
    try {
      const matches = {
        bids: [], // Matches for virtual bids
        asks: [] // Matches for virtual asks
      };
      
      // Process virtual bids against real asks
      for (const virtualBid of virtualOrders.bids) {
        for (const realAsk of rawOrderbook.asks) {
          const match = await processMatch(virtualBid, realAsk, 'bids');
          if (match) {
            matches.bids.push(match);
            // If fully matched, break out of the inner loop
            if (match.isFull) break;
          }
        }
      }
      
      // Process virtual asks against real bids
      for (const virtualAsk of virtualOrders.asks) {
        for (const realBid of rawOrderbook.bids) {
          const match = await processMatch(virtualAsk, realBid, 'asks');
          if (match) {
            matches.asks.push(match);
            // If fully matched, break out of the inner loop
            if (match.isFull) break;
          }
        }
      }
      
      // Calculate match statistics
      const fullMatches = [...matches.bids, ...matches.asks].filter(m => m.isFull).length;
      const partialMatches = [...matches.bids, ...matches.asks].filter(m => !m.isFull).length;
      const totalVolume = [...matches.bids, ...matches.asks].reduce(
        (sum, match) => sum + match.matchAmount, 0
      );
      
      setMatchStats({
        fullMatches,
        partialMatches,
        totalVolume
      });
      
      setLastMatchResult({
        matches,
        timestamp: new Date().toISOString()
      });
      
      // Refresh user trades to update the UI with new filled amounts
      await fetchUserTrades();
      
      return matches;
    } catch (error) {
      console.error('Error finding matches:', error);
      return { bids: [], asks: [] };
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, rawOrderbook, virtualOrders, processMatch, fetchUserTrades]);

  // Automatic matching at regular intervals
  useEffect(() => {
    const matchInterval = setInterval(() => {
      if (user?.userId) {
        findMatches();
      }
    }, 2000); // Check for matches every 2 seconds
    
    return () => clearInterval(matchInterval);
  }, [findMatches, user]);

  // Cancel a trade
  const cancelTrade = useCallback(async (tradeId) => {
    if (!user?.userId) return false;
    
    try {
      const response = await axios.post('/api/trades/cancelTrade', {
        trade_id: tradeId,
        user_id: user.userId
      });
      
      // Refresh user trades to update the UI
      await fetchUserTrades();
      
      return response.data.success;
    } catch (error) {
      console.error('Error canceling trade:', error);
      return false;
    }
  }, [user, fetchUserTrades]);

  // Context value
  const value = {
    findMatches,
    cancelTrade,
    isProcessing,
    lastMatchResult,
    matchStats
  };

  return (
    <MatchingEngineContext.Provider value={value}>
      {children}
    </MatchingEngineContext.Provider>
  );
};

export default MatchingEngineContext;