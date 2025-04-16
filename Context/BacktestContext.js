'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';

// Create the context
const BacktestContext = createContext();

// Custom hook to use the backtest context
export const useBacktest = () => useContext(BacktestContext);

// Provider component
export const BacktestProvider = ({ children }) => {
  const [backtestActive, setBacktestActive] = useState(false);
  const [backtestConfig, setBacktestConfig] = useState({
    startDate: '',
    endDate: '',
    speed: 1
  });

  useEffect(() => {
    // Cleanup function to stop backtest when component unmounts
    if(backtestActive) {
        console.log("Backtest started with config:", backtestConfig);
    }
    else {
        console.log("Backtest stopped.");
    }
  }, [backtestActive, backtestConfig]);

  // Update config and activate backtest
  const startBacktest = (config) => {
    setBacktestConfig(config);
    setBacktestActive(true);
  };

  // Stop backtest
  const stopBacktest = () => {
    setBacktestActive(false);
  };

  return (
    <BacktestContext.Provider
      value={{
        backtestActive,
        backtestConfig,
        startBacktest,
        stopBacktest
      }}
    >
      {children}
    </BacktestContext.Provider>
  );
};
