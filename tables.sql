CREATE TABLE weekly_portfolio_snapshots (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    week_ending_date DATE NOT NULL,  -- Store the last day of each week
    total_balance DECIMAL(15,2) NOT NULL,
    total_invested DECIMAL(15,2) NOT NULL,
    available_funds DECIMAL(15,2) NOT NULL,
    weekly_balance_change_pct DECIMAL(6,2),
    weekly_invested_change_pct DECIMAL(6,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (user_id, week_ending_date)
);

INSERT INTO weekly_portfolio_snapshots 
(user_id, week_ending_date, total_balance, total_invested, available_funds, weekly_balance_change_pct, weekly_invested_change_pct)
VALUES
-- Week 1: Starting position
(49, '2025-02-02', 10000.00, 5000.00, 5000.00, NULL, NULL),

-- Week 2: Made some investments, market slightly up
(49, '2025-02-09', 10250.00, 5500.00, 4750.00, 2.50, 10.00),

-- Week 3: Market continued rising
(49, '2025-02-16', 10625.50, 5735.00, 4890.50, 3.66, 4.27),

-- Week 4: Small market correction
(49, '2025-02-23', 10200.75, 5620.25, 4580.50, -4.00, -2.00),

-- Week 5: Recovery begins
(49, '2025-03-02', 10452.75, 5900.50, 4552.25, 2.47, 4.99),

-- Week 6: Added funds and investments
(49, '2025-03-09', 11780.40, 6250.75, 5529.65, 12.70, 5.94),

-- Week 7: Strong market performance
(49, '2025-03-16', 12605.10, 6480.30, 6124.80, 7.00, 3.67),

-- Week 8: Took some profits
(49, '2025-03-23', 12350.00, 5980.45, 6369.55, -2.02, -7.71),

-- Week 9: Sideways market
(49, '2025-03-30', 12410.25, 6010.20, 6400.05, 0.49, 0.50),

-- Week 10: Current week (similar to your screenshot)
(49, '2025-04-06', 10000.00, 5230.45, 4769.55, -19.42, -12.97);

-- Create the user_portfolios table
CREATE TABLE user_portfolios (
    user_id INTEGER PRIMARY KEY,
    total_balance DECIMAL(15, 2) NOT NULL,
    total_invested DECIMAL(15, 2) NOT NULL,
    available_funds DECIMAL(15, 2) NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add sample data for user_id 49
INSERT INTO user_portfolios (user_id, total_balance, total_invested, available_funds) 
VALUES (49, 10000.00, 5230.45, 4769.55);


CREATE TABLE user_trades (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,                -- User identifier
    trade_type TEXT NOT NULL,             -- 'bid' or 'ask'
    symbol TEXT NOT NULL,                 -- Trading pair e.g. 'BTCUSDT'
    price DECIMAL(18,8) NOT NULL,         -- Order price
    amount DECIMAL(18,8) NOT NULL,        -- Order amount
    filled_amount DECIMAL(18,8) DEFAULT 0,-- Amount already filled
    status TEXT NOT NULL,                 -- 'OPEN', 'FILLED', 'CANCELED', 'PARTIALLY_FILLED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create a hypertable for time-series optimization
SELECT create_hypertable('user_trades', 'created_at');

-- Index for frequent queries
CREATE INDEX idx_user_trades_user_symbol_status ON user_trades(user_id, symbol, status);


CREATE TABLE orderbook_snapshots (
  id BIGSERIAL,
  timestamp TIMESTAMPTZ NOT NULL,
  bids JSONB NOT NULL,
  asks JSONB NOT NULL,
  PRIMARY KEY (timestamp, id)
);

-- Turn into hypertable
SELECT create_hypertable('orderbook_snapshots', 'timestamp', chunk_time_interval => interval '1 day');

CREATE INDEX ON orderbook_snapshots (timestamp DESC);

-- Enable compression
ALTER TABLE orderbook_snapshots SET (
  timescaledb.compress,
  timescaledb.compress_orderby = 'timestamp DESC'
);

-- Auto compress data older than 7 days
SELECT add_compression_policy('orderbook_snapshots', INTERVAL '7 days');

-- Optional: Retain only 6 months of data
SELECT add_retention_policy('orderbook_snapshots', INTERVAL '180 days');


CREATE TABLE candlestick_data (
    time TIMESTAMPTZ NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    interval VARCHAR(5) NOT NULL,
    open NUMERIC(18, 8) NOT NULL,
    high NUMERIC(18, 8) NOT NULL,
    low NUMERIC(18, 8) NOT NULL,
    close NUMERIC(18, 8) NOT NULL,
    volume NUMERIC(25, 8) NOT NULL
);


-- Add indexes for faster queries
CREATE INDEX idx_candlestick_symbol ON candlestick_data (symbol);
CREATE INDEX idx_candlestick_interval ON candlestick_data (interval);

-- Convert to hypertable with time partitioning
SELECT create_hypertable('candlestick_data', 'time', chunk_time_interval =>
 INTERVAL '1 day');


-- Set chunk size to 1 day for high-frequency intervals (like 1m, 5m)
-- and a larger interval for lower frequency data
SELECT set_chunk_time_interval('candlestick_data', INTERVAL '1 day');

-- Enable compression with proper ordering to optimize query patterns
ALTER TABLE candlestick_data SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'symbol,interval',
    timescaledb.compress_orderby = 'time DESC'
);

-- Create compression policy (compress chunks older than 3 days)
SELECT add_compression_policy('candlestick_data', INTERVAL '3 days');

-- Create retention policy (remove data older than 1 year)
SELECT add_retention_policy('candlestick_data', INTERVAL '180 days');
