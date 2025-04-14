'use client';
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useOrderbook } from './OrderBookContext';
import { useAuthStore } from '@/store/useAuthStore';
import axios from 'axios';

const MatchingEngineContext = createContext();
export const useMatchingEngine = () => useContext(MatchingEngineContext);

export const MatchingEngineProvider = ({ children }) => {
  console.log('[MatchingEngine] Provider rendering');
  
  const { rawOrderbook, virtualOrders, fetchUserTrades } = useOrderbook();
  const { user } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastMatchResult, setLastMatchResult] = useState(null);
  const [matchStats, setMatchStats] = useState({
    fullMatches: 0,
    partialMatches: 0,
    totalVolume: 0
  });
  
  // Use refs to maintain stable references across renders
  const intervalRef = useRef(null);
  const processingRef = useRef(false);
  const dataRef = useRef({
    rawOrderbook: null,
    virtualOrders: null,
    user: null
  });
  
  // Update refs whenever the actual values change
  useEffect(() => {
    dataRef.current = {
      rawOrderbook,
      virtualOrders,
      user
    };
  }, [rawOrderbook, virtualOrders, user]);

  // Process all potential matches in a batch
  const processMatches = useCallback(async () => {
    const { user, rawOrderbook, virtualOrders } = dataRef.current;
    
    if (!user?.userId || !rawOrderbook || !virtualOrders) {
      console.log('[processMatches] Missing required data, skipping', {
        hasUser: !!user?.userId,
        hasRawOrderbook: !!rawOrderbook,
        hasVirtualOrders: !!virtualOrders
      });
      return { bids: [], asks: [] };
    }

    console.log('[processMatches] Processing with data:', {
      orderbook: `${rawOrderbook.bids.length} bids, ${rawOrderbook.asks.length} asks`,
      virtualOrders: `${virtualOrders.bids.length} virtual bids, ${virtualOrders.asks.length} virtual asks`
    });
    
    // First, collect all potential matches
    const potentialMatches = [];
    
    // Check bids against asks
    for (const virtualBid of virtualOrders.bids) {
      if (!virtualBid.tradeId) continue;
      
      for (const realAsk of rawOrderbook.asks) {
        const virtualPrice = parseFloat(virtualBid.price);
        const realPrice = parseFloat(realAsk.price);
        
        // Price match check: bid price >= ask price
        if (virtualPrice >= realPrice) {
          potentialMatches.push({
            tradeId: virtualBid.tradeId,
            virtualAmount: parseFloat(virtualBid.amount),
            realAmount: parseFloat(realAsk.amount),
            price: realPrice,
            side: 'bids'
          });
          break; // Match with best price only
        }
      }
    }
    
    // Check asks against bids
    for (const virtualAsk of virtualOrders.asks) {
      if (!virtualAsk.tradeId) continue;
      
      for (const realBid of rawOrderbook.bids) {
        const virtualPrice = parseFloat(virtualAsk.price);
        const realPrice = parseFloat(realBid.price);
        
        // Price match check: ask price <= bid price
        if (virtualPrice <= realPrice) {
          potentialMatches.push({
            tradeId: virtualAsk.tradeId,
            virtualAmount: parseFloat(virtualAsk.amount),
            realAmount: parseFloat(realBid.amount),
            price: realPrice,
            side: 'asks'
          });
          break; // Match with best price only
        }
      }
    }
    
    console.log('[processMatches] Potential matches found:', potentialMatches.length);
    console.log('[processMatches] Potential matches:', potentialMatches);
    
    // Get current status of all trades in one batch
    const tradeIds = potentialMatches.map(match => match.tradeId);
    
    if (tradeIds.length === 0) {
      return { bids: [], asks: [] };
    }
    
    try {
      console.log('[processMatches] Fetching trade details for:', tradeIds);
      const tradesResponse = await axios.post('/api/trades/getBulkTrades', {
        trade_ids: tradeIds
      });
      
      const trades = tradesResponse.data.trades || [];
      console.log('[processMatches] Retrieved trades:', trades.length);
      
      const tradesMap = {};
      trades.forEach(trade => {
        tradesMap[trade.id] = trade;
      });
      
      // Process each match
      const results = { bids: [], asks: [] };
      const tradesToUpdate = [];
      
      for (const match of potentialMatches) {
        const trade = tradesMap[match.tradeId];
        if (!trade || trade.status === 'filled' || trade.status === 'cancelled') {
          console.log(`[processMatches] Skipping trade ${match.tradeId}: status=${trade?.status || 'not found'}`);
          continue;
        }
        
        const currentFilledAmount = parseFloat(trade.filled_amount || 0);
        const tradeAmount = parseFloat(trade.amount);
        const fillAmount = Math.min(match.virtualAmount, match.realAmount);
        const newFilledAmount = currentFilledAmount + fillAmount;
        const newStatus = newFilledAmount >= tradeAmount ? 'filled' : 'partially_filled';
        
        console.log(`[processMatches] Match found for trade ${match.tradeId}: ${fillAmount} @ ${match.price}`);
        
        tradesToUpdate.push({
          trade_id: match.tradeId,
          filled_amount: newFilledAmount,
          status: newStatus
        });
        
        const matchResult = {
          virtualOrderId: match.tradeId,
          matchPrice: match.price,
          matchAmount: fillAmount,
          remainingAmount: tradeAmount - newFilledAmount,
          isFull: newStatus === 'filled',
          executionPrice: match.price
        };
        
        if (match.side === 'bids') {
          results.bids.push(matchResult);
        } else {
          results.asks.push(matchResult);
        }
      }
      
      // Batch update trades
      if (tradesToUpdate.length > 0) {
        console.log('[processMatches] Updating trades:', tradesToUpdate);
        await axios.post('/api/trades/updateBulkTrades', {
          trades: tradesToUpdate
        });
      }
      
      return results;
    } catch (error) {
      console.error('[processMatches] Error processing matches:', error);
      return { bids: [], asks: [] };
    }
  }, []);

  const findMatches = useCallback(async () => {
    // Use ref to prevent concurrent processing
    if (processingRef.current) {
      console.log('[findMatches] Already processing, skipping');
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);
    console.log('[findMatches] Starting match process');

    try {
      const matches = await processMatches();
      
      const fullMatches = [...matches.bids, ...matches.asks].filter(m => m.isFull).length;
      const partialMatches = [...matches.bids, ...matches.asks].filter(m => !m.isFull).length;
      const totalVolume = [...matches.bids, ...matches.asks].reduce((sum, match) => sum + match.matchAmount, 0);

      console.log('[findMatches] Match results:', { fullMatches, partialMatches, totalVolume });
      
      if (fullMatches > 0 || partialMatches > 0) {
        setMatchStats(prev => ({
          fullMatches: prev.fullMatches + fullMatches,
          partialMatches: prev.partialMatches + partialMatches,
          totalVolume: prev.totalVolume + totalVolume
        }));
        
        setLastMatchResult({ 
          matches, 
          timestamp: new Date().toISOString() 
        });
        
        await fetchUserTrades();
      }

      return matches;
    } catch (error) {
      console.error('[findMatches] Error during match process:', error);
      return { bids: [], asks: [] };
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
      console.log('[findMatches] Processing completed');
    }
  }, [processMatches, fetchUserTrades]);

  // Set up the interval with stable references
  useEffect(() => {
    console.log('[MatchingEngine] Setting up interval effect, user:', user?.userId);
    
    // Clear any existing interval first
    if (intervalRef.current) {
      console.log('[MatchingEngine] Clearing existing interval');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (user?.userId) {
      console.log('[MatchingEngine] Starting new 3-second match interval');
      intervalRef.current = setInterval(() => {
        console.log('[MatchingEngine] Interval triggered at', new Date().toISOString());
        findMatches().catch(err => console.error('[MatchingEngine] Interval error:', err));
      }, 3000);
    }
    
    return () => {
      if (intervalRef.current) {
        console.log('[MatchingEngine] Cleaning up interval on unmount');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user?.userId, findMatches]);

  const cancelTrade = useCallback(async (tradeId) => {
    if (!dataRef.current.user?.userId) return false;

    try {
      console.log(`[cancelTrade] Attempting to cancel trade ${tradeId}`);
      const response = await axios.post('/api/trades/cancelTrade', {
        trade_id: tradeId,
        user_id: dataRef.current.user.userId
      });

      if (response.data.success) {
        await fetchUserTrades();
        console.log(`[cancelTrade] Trade ${tradeId} cancelled successfully`);
      }
      
      return response.data.success;
    } catch (error) {
      console.error('[cancelTrade] Error canceling trade:', error);
      return false;
    }
  }, [fetchUserTrades]);

  const resetStats = useCallback(() => {
    console.log('[MatchingEngine] Resetting match stats');
    setMatchStats({ fullMatches: 0, partialMatches: 0, totalVolume: 0 });
  }, []);

  // Create a stable value object with useRef
  const valueRef = useRef({
    findMatches,
    cancelTrade,
    isProcessing: false,
    lastMatchResult: null,
    matchStats: { fullMatches: 0, partialMatches: 0, totalVolume: 0 },
    resetStats
  });

  // Update the value ref when state changes
  useEffect(() => {
    valueRef.current = {
      findMatches,
      cancelTrade,
      isProcessing,
      lastMatchResult,
      matchStats,
      resetStats
    };
  }, [findMatches, cancelTrade, isProcessing, lastMatchResult, matchStats, resetStats]);

  return (
    <MatchingEngineContext.Provider value={valueRef.current}>
      {children}
    </MatchingEngineContext.Provider>
  );
};

export default MatchingEngineContext;