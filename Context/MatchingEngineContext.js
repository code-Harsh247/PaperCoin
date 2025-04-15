'use client';
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useOrderbook } from './OrderBookContext';
import { useAuthStore } from '@/store/useAuthStore';
import axios from 'axios';

const MatchingEngineContext = createContext();
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

  const intervalRef = useRef(null);
  const processingRef = useRef(false);
  const dataRef = useRef({
    rawOrderbook: null,
    virtualOrders: null,
    user: null
  });

  useEffect(() => {
    dataRef.current = {
      rawOrderbook,
      virtualOrders,
      user
    };
  }, [rawOrderbook, virtualOrders, user]);

  const updateUserPortfolio = useCallback(async (tradeInfo) => {
    try {
      const currentUser = dataRef.current.user;
      if (!currentUser?.userId) return false;
      console.log("[updateUserPortfolio] currentUser", currentUser);
      
      const portfolioResponse = await axios.post(`/api/portfolios/fetch`, {
        user_id: currentUser.userId
      });
      
      // Handle portfolio as array - get the first item
      const portfolioArray = portfolioResponse.data.portfolio;
      console.log("[updateUserPortfolio] portfolio fetched : ", portfolioArray);
      
      if (!portfolioArray || !Array.isArray(portfolioArray) || portfolioArray.length === 0) {
        console.error("[updateUserPortfolio] No portfolio found or invalid format");
        return false;
      }
      
      // Get the first portfolio from the array
      const portfolio = portfolioArray[0];
      
      const { side, amount, price } = tradeInfo;
      const tradeValue = amount * price;
      
      console.log("[updateUserPortfolio] trade info for updating portfolio : ", tradeInfo);
      
      // Create a new portfolio object
      let newPortfolio = { ...portfolio };
      
      // Safely parse values to handle potential string formats and NaN values
      const currentBtcCoins = parseFloat(portfolio.btccoins || 0);
      const currentFunds = parseFloat(portfolio.available_funds || 0);
      const currentTotalInvested = parseFloat(portfolio.total_invested || 0);
      
      if (side === 'bids') {
        newPortfolio.btccoins = currentBtcCoins + amount;
        newPortfolio.available_funds = currentFunds - tradeValue;
        newPortfolio.total_invested = currentTotalInvested + tradeValue;
        console.log("[updateUserPortfolio] new btccoins", newPortfolio.btccoins);
        console.log("[updateUserPortfolio] new available funds", newPortfolio.available_funds);
      } else {
        newPortfolio.btccoins = currentBtcCoins - amount;
        newPortfolio.available_funds = currentFunds + tradeValue;
        newPortfolio.total_invested = currentTotalInvested - tradeValue;
      }
      
      // Calculate total balance with safeguards against NaN
      newPortfolio.total_balance = parseFloat(newPortfolio.available_funds || 0) + 
                                 (parseFloat(newPortfolio.btccoins || 0) * price);
      
      // Ensure no NaN values are sent to API
      newPortfolio.btccoins = isNaN(newPortfolio.btccoins) ? 0 : newPortfolio.btccoins;
      newPortfolio.available_funds = isNaN(newPortfolio.available_funds) ? 0 : newPortfolio.available_funds;
      newPortfolio.total_balance = isNaN(newPortfolio.total_balance) ? 0 : newPortfolio.total_balance;
      
      newPortfolio.last_updated = new Date().toISOString();
      console.log("[updateUserPortfolio] newPortfolio : ", newPortfolio);
      
      const updateResponse = await axios.post(`/api/portfolios/update`, {
        user_id: currentUser.userId,
        portfolio: newPortfolio
      });
      
      console.log("[updateUserPortfolio] portfolio updated : ", updateResponse.data);
      return true;
    } catch (error) {
      console.error("[updateUserPortfolio] Error:", error);
      return false;
    }
  }, []);

  const processMatches = useCallback(async () => {
    const { user, rawOrderbook, virtualOrders } = dataRef.current;
    if (!user?.userId || !rawOrderbook || !virtualOrders) return { bids: [], asks: [] };

    const potentialMatches = [];

    for (const virtualBid of virtualOrders.bids) {
      if (!virtualBid.tradeId) continue;
      for (const realAsk of rawOrderbook.asks) {
        const virtualPrice = parseFloat(virtualBid.price);
        const realPrice = parseFloat(realAsk.price);
        if (virtualPrice >= realPrice) {
          potentialMatches.push({
            tradeId: virtualBid.tradeId,
            virtualAmount: parseFloat(virtualBid.amount),
            realAmount: parseFloat(realAsk.amount),
            price: realPrice,
            side: 'bids'
          });
          break;
        }
      }
    }

    for (const virtualAsk of virtualOrders.asks) {
      if (!virtualAsk.tradeId) continue;
      for (const realBid of rawOrderbook.bids) {
        const virtualPrice = parseFloat(virtualAsk.price);
        const realPrice = parseFloat(realBid.price);
        if (virtualPrice <= realPrice) {
          potentialMatches.push({
            tradeId: virtualAsk.tradeId,
            virtualAmount: parseFloat(virtualAsk.amount),
            realAmount: parseFloat(realBid.amount),
            price: realPrice,
            side: 'asks'
          });
          break;
        }
      }
    }

    const tradeIds = potentialMatches.map(match => match.tradeId);
    if (tradeIds.length === 0) return { bids: [], asks: [] };

    try {
      const tradesResponse = await axios.post('/api/trades/getBulkTrades', {
        trade_ids: tradeIds
      });
      const trades = tradesResponse.data.trades || [];
      const tradesMap = {};
      trades.forEach(trade => {
        tradesMap[trade.id] = trade;
      });

      const results = { bids: [], asks: [] };
      const tradesToUpdate = [];
      const portfolioUpdates = [];

      for (const match of potentialMatches) {
        const trade = tradesMap[match.tradeId];
        if (!trade || trade.status === 'filled' || trade.status === 'cancelled') continue;

        const currentFilledAmount = parseFloat(trade.filled_amount || 0);
        const tradeAmount = parseFloat(trade.amount);
        const fillAmount = Math.min(match.virtualAmount, match.realAmount);
        const newFilledAmount = currentFilledAmount + fillAmount;
        const newStatus = newFilledAmount >= tradeAmount ? 'filled' : 'partially_filled';

        tradesToUpdate.push({
          trade_id: match.tradeId,
          filled_amount: newFilledAmount,
          status: newStatus
        });

        portfolioUpdates.push({
          side: match.side,
          amount: fillAmount,
          price: match.price
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

      if (tradesToUpdate.length > 0) {
        await axios.post('/api/trades/updateBulkTrades', {
          trades: tradesToUpdate
        });
      }

      for (const update of portfolioUpdates) {
        await updateUserPortfolio({
          side: update.side,
          amount: update.amount,
          price: update.price
        });
      }

      return results;
    } catch {
      return { bids: [], asks: [] };
    }
  }, [updateUserPortfolio]);

  const findMatches = useCallback(async () => {
    if (processingRef.current) return;

    processingRef.current = true;
    setIsProcessing(true);

    try {
      const matches = await processMatches();
      const fullMatches = [...matches.bids, ...matches.asks].filter(m => m.isFull).length;
      const partialMatches = [...matches.bids, ...matches.asks].filter(m => !m.isFull).length;
      const totalVolume = [...matches.bids, ...matches.asks].reduce((sum, match) => sum + match.matchAmount, 0);

      if (fullMatches > 0 || partialMatches > 0) {
        setMatchStats(prev => ({
          fullMatches: prev.fullMatches + fullMatches,
          partialMatches: prev.partialMatches + partialMatches,
          totalVolume: prev.totalVolume + totalVolume
        }));
        setLastMatchResult({ matches, timestamp: new Date().toISOString() });
        await fetchUserTrades();
      }

      return matches;
    } catch {
      return { bids: [], asks: [] };
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  }, [processMatches, fetchUserTrades]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (user?.userId) {
      intervalRef.current = setInterval(() => {
        findMatches().catch(() => {});
      }, 3000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user?.userId, findMatches]);

  const cancelTrade = useCallback(async (tradeId) => {
    if (!dataRef.current.user?.userId) return false;

    try {
      const response = await axios.post('/api/trades/cancelTrade', {
        trade_id: tradeId,
        user_id: dataRef.current.user.userId
      });

      if (response.data.success) {
        await fetchUserTrades();
      }

      return response.data.success;
    } catch {
      return false;
    }
  }, [fetchUserTrades]);

  const resetStats = useCallback(() => {
    setMatchStats({ fullMatches: 0, partialMatches: 0, totalVolume: 0 });
  }, []);

  const valueRef = useRef({
    findMatches,
    cancelTrade,
    isProcessing: false,
    lastMatchResult: null,
    matchStats: { fullMatches: 0, partialMatches: 0, totalVolume: 0 },
    resetStats
  });

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
