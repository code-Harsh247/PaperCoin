// components/CandlestickChart.js
'use client'
import React, { useEffect, useRef, useState } from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import am5themes_Dark from '@amcharts/amcharts5/themes/Dark';
import { useBacktest } from '@/Context/BacktestContext';

const CandleStickChart = ({ symbol = 'btcusdt', defaultInterval = '1d' }) => {
  const [interval, setInterval] = useState(defaultInterval);
  const chartDivRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const [chartData, setChartData] = useState([]);
  const { backtestActive, backtestConfig } = useBacktest(); // Get backtest state from context

  // Available intervals
  const intervals = [
    { value: '1m', label: '1m' },
    { value: '5m', label: '5m' },
    { value: '15m', label: '15m' },
    { value: '1h', label: '1h' },
    { value: '4h', label: '4h' },
    { value: '1d', label: '1D' },
    { value: '1w', label: '1W' },
  ];

  // Change interval handler
  const handleIntervalChange = (newInterval) => {
    setInterval(newInterval);
  };

  // Fetch initial data
  const fetchCryptoData = async () => {
    try {
      const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=100`);
      const data = await response.json();
      const formattedData = data.map(item => ({
        date: new Date(item[0]).getTime(), // Convert timestamp to milliseconds
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[5])
      }));
      setChartData(formattedData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  // Initialize chart
  useEffect(() => {
    if (!chartDivRef.current) return;

    // Create root element
    const root = am5.Root.new(chartDivRef.current);
    
    // Remove amCharts logo
    if (root.logo) {
      root.logo.dispose();
    }
    
    // Create custom theme for project's default font
    const myTheme = am5.Theme.new(root);
    
    // Apply the font to all labels and text elements
    myTheme.rule("Label").setAll({
      fill: am5.color(0xffffff),
      fontSize: "12px",
      fontFamily: "inherit" // This will use your project's default font
    });

    // Set themes - order matters, our custom theme should be last to override others
    root.setThemes([
      am5themes_Animated.new(root),
      am5themes_Dark.new(root),
      myTheme
    ]);

    // Create chart
    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        focusable: true,
        panX: true,
        panY: true,
        wheelX: 'panX',
        wheelY: 'zoomX',
        layout: root.verticalLayout,
        background: am5.Rectangle.new(root, {
          fill: am5.color(0x111722),
          fillOpacity: 1
        })
      })
    );
    chartRef.current = chart;

    // Create axes
    const xAxis = chart.xAxes.push(
      am5xy.DateAxis.new(root, {
        groupData: true,
        maxDeviation: 0.5,
        baseInterval: { timeUnit: 'minute', count: 1 },
        renderer: am5xy.AxisRendererX.new(root, {
          pan: 'zoom',
          minorGridEnabled: true
        }),
        tooltip: am5.Tooltip.new(root, {})
      })
    );

    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        maxDeviation: 1,
        renderer: am5xy.AxisRendererY.new(root, {
          pan: 'zoom'
        })
      })
    );

    // Add Candlestick series
    const candleSeries = chart.series.push(
      am5xy.CandlestickSeries.new(root, {
        name: symbol.toUpperCase(),
        xAxis: xAxis,
        yAxis: yAxis,
        valueXField: 'date',
        valueYField: 'close',
        openValueYField: 'open',
        lowValueYField: 'low',
        highValueYField: 'high',
        tooltip: am5.Tooltip.new(root, {
          pointerOrientation: 'horizontal',
          labelText: 'Open: {openValueY}\nLow: {lowValueY}\nHigh: {highValueY}\nClose: {valueY}'
        })
      })
    );
    candleSeriesRef.current = candleSeries;

    // Set candlestick colors
    candleSeries.columns.template.adapters.add("fill", (fill, target) => {
      const dataItem = target.dataItem;
      if (dataItem && dataItem.dataContext) {
        if (dataItem.dataContext.open < dataItem.dataContext.close) {
          return am5.color(0x5EBD3E); // Green for up candles
        } else {
          return am5.color(0xD23C3C); // Red for down candles
        }
      }
      return fill;
    });
    
    candleSeries.columns.template.adapters.add("stroke", (stroke, target) => {
      const dataItem = target.dataItem;
      if (dataItem && dataItem.dataContext) {
        if (dataItem.dataContext.open < dataItem.dataContext.close) {
          return am5.color(0x5EBD3E); // Green for up candles
        } else {
          return am5.color(0xD23C3C); // Red for down candles
        }
      }
      return stroke;
    });

    // Add a separate volume axis that sits at the bottom
    const volumeAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        numberFormat: "#.0a",
        height: am5.percent(30), // Height of the volume axis
        y: am5.percent(70),     // Position it at the bottom 30% of the chart
        renderer: am5xy.AxisRendererY.new(root, {
          opposite: true,
          pan: "zoom"
        })
      })
    );
    
    // Hide volume axis grid lines to avoid clutter
    volumeAxis.get("renderer").grid.template.set("forceHidden", true);

    // Add volume series
    const volumeSeries = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: "Volume",
        xAxis: xAxis,
        yAxis: volumeAxis,
        valueYField: "volume",
        valueXField: "date",
        tooltip: am5.Tooltip.new(root, {
          labelText: "Volume: {valueY}"
        })
      })
    );
    volumeSeriesRef.current = volumeSeries;
    
    // Style volume columns
    volumeSeries.columns.template.adapters.add("fill", (fill, target) => {
      const dataItem = target.dataItem;
      if (dataItem && dataItem.dataContext) {
        if (dataItem.dataContext.open < dataItem.dataContext.close) {
          return am5.color(0x5EBD3E); // Green for up candles
        } else {
          return am5.color(0xD23C3C); // Red for down candles
        }
      }
      return fill;
    });
    
    volumeSeries.columns.template.setAll({
      fillOpacity: 0.6,
      strokeOpacity: 0,
      width: am5.percent(100)
    });

    // Limit volume series to bottom 30% of the chart
    volumeSeries.set("height", am5.percent(30));
    volumeSeries.set("y", am5.percent(70));
    
    // Add cursor
    chart.set('cursor', am5xy.XYCursor.new(root, {
      xAxis: xAxis,
      behavior: "zoomX"
    }));

    // Fetch initial data
    fetchCryptoData();

    // Cleanup function
    return () => {
      root.dispose();
    };
  }, [symbol, interval]); // Re-initialize when symbol or interval changes

  // Update chart data
  useEffect(() => {
    if (candleSeriesRef.current && volumeSeriesRef.current && chartData.length > 0) {
      candleSeriesRef.current.data.setAll(chartData);
      volumeSeriesRef.current.data.setAll(chartData);
    }
  }, [chartData]);

  // WebSocket connection
  useEffect(() => {
    // WebSocket for real-time data
    const socket = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`);

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const kline = message.k; // Kline data from Binance

      // Format the new data point
      const newCandle = {
        date: new Date(kline.t).getTime(),
        open: parseFloat(kline.o),
        high: parseFloat(kline.h),
        low: parseFloat(kline.l),
        close: parseFloat(kline.c),
        volume: parseFloat(kline.v)
      };

      // Update chart data
      setChartData(prevData => {
        const newData = [...prevData];
        // Find if this candle already exists (by timestamp)
        const existingIndex = newData.findIndex(d => d.date === newCandle.date);
        
        if (existingIndex >= 0) {
          // Update existing candle
          newData[existingIndex] = newCandle;
        } else {
          // Add new candle
          newData.push(newCandle);
          // Keep only the last 100 candles
          if (newData.length > 100) newData.shift();
        }
        
        return newData;
      });
    };

    // Cleanup function to close WebSocket on component unmount
    return () => {
      socket.close();
    };
  }, [symbol, interval]);

  return (
    <div className="flex flex-col w-full h-full bg-[#111722]">
      {/* Interval selector */}
      <div className="flex items-center p-2 border-b border-gray-700">
        <div className="mr-3 text-sm text-gray-400">Interval:</div>
        <div className="flex">
          {intervals.map((int) => (
            <button
              key={int.value}
              onClick={() => handleIntervalChange(int.value)}
              className={`px-3 py-1 text-xs rounded mx-1 ${
                interval === int.value
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {int.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Chart */}
      <div
        id="chartdiv"
        ref={chartDivRef}
        className="font-inherit"
        style={{ width: '100%', height: '500px', maxWidth: '100%' }}
      ></div>
    </div>
  );
};

export default CandleStickChart;