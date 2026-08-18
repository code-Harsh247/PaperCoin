-- PaperCoin schema reference.
-- Matches what the app in this repo actually queries. Run against a fresh
-- database to set one up:
--   psql -U postgres -d papercoin -f tables.sql

CREATE EXTENSION IF NOT EXISTS timescaledb;


-- Accounts. Rows are created by lib/db-utils.js addUsertoDb(), used by both
-- password signup (app/api/auth/signUp) and Google OAuth
-- (app/api/auth/google/callback). password_hash is null for OAuth-only users
-- and google_id is null for password-only users.
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username TEXT UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    google_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- Append-only portfolio snapshots, one row per change rather than one row per
-- user: app/api/portfolios/update INSERTs a new row each time, and readers
-- (portfolios/fetch, weeklySnapshots) take the latest by last_updated.
-- Note app/api/addFunds UPDATEs by user_id, so it touches every row for a user.
CREATE TABLE IF NOT EXISTS user_portfolios (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    total_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_invested DECIMAL(15, 2) NOT NULL DEFAULT 0,
    available_funds DECIMAL(15, 2) NOT NULL DEFAULT 0,
    btccoins DECIMAL(18, 8) NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_portfolios_user_updated
    ON user_portfolios (user_id, last_updated DESC);


-- Weekly rollups for the dashboard chart.
CREATE TABLE IF NOT EXISTS weekly_portfolio_snapshots (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    week_ending_date DATE NOT NULL,   -- last day of the week
    total_balance DECIMAL(15,2) NOT NULL,
    total_invested DECIMAL(15,2) NOT NULL,
    available_funds DECIMAL(15,2) NOT NULL,
    weekly_balance_change_pct DECIMAL(6,2),
    weekly_invested_change_pct DECIMAL(6,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, week_ending_date)
);


-- Orders. user_id is TEXT here because the trade routes pass the id through
-- from the JWT without casting. status is lowercased by makeTrade:
-- 'open', 'partially_filled', 'filled', 'canceled'.
-- symbol has a default because makeTrade omits it from its INSERT.
CREATE TABLE IF NOT EXISTS user_trades (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    trade_type TEXT NOT NULL,             -- 'bid' or 'ask'
    symbol TEXT NOT NULL DEFAULT 'BTCUSDT',
    price DECIMAL(18,8) NOT NULL,
    amount DECIMAL(18,8) NOT NULL,
    filled_amount DECIMAL(18,8) DEFAULT 0,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_trades_user_symbol_status
    ON user_trades (user_id, symbol, status);


-- getOpenOrders() and getOrderHistory() in lib/db-utils.js read these two and
-- order by trade_time, which is just created_at under another name.
CREATE OR REPLACE VIEW openorders AS
    SELECT *, created_at AS trade_time
    FROM user_trades
    WHERE status IN ('open', 'partially_filled');

CREATE OR REPLACE VIEW orderhistory AS
    SELECT *, created_at AS trade_time
    FROM user_trades
    WHERE status NOT IN ('open', 'partially_filled');


-- Time-series tables below. The chart currently streams klines straight from
-- Binance (components/trading/CandleStickChart.jsx), so candlestick_data is
-- only populated if you backfill it.
CREATE TABLE IF NOT EXISTS candlestick_data (
    time TIMESTAMPTZ NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    interval VARCHAR(5) NOT NULL,
    open NUMERIC(18, 8) NOT NULL,
    high NUMERIC(18, 8) NOT NULL,
    low NUMERIC(18, 8) NOT NULL,
    close NUMERIC(18, 8) NOT NULL,
    volume NUMERIC(25, 8) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_candlestick_symbol ON candlestick_data (symbol);
CREATE INDEX IF NOT EXISTS idx_candlestick_interval ON candlestick_data (interval);

SELECT create_hypertable('candlestick_data', 'time',
    chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);


CREATE TABLE IF NOT EXISTS orderbook_snapshots (
    id BIGSERIAL,
    timestamp TIMESTAMPTZ NOT NULL,
    bids JSONB NOT NULL,
    asks JSONB NOT NULL,
    PRIMARY KEY (timestamp, id)
);

SELECT create_hypertable('orderbook_snapshots', 'timestamp',
    chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_orderbook_snapshots_time
    ON orderbook_snapshots (timestamp DESC);


-- Written by insertOrderBookUpdate() / insertSnapshot() in lib/db-utils.js.
CREATE TABLE IF NOT EXISTS order_book_updates (
    time TIMESTAMPTZ NOT NULL,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL,
    price DECIMAL(18,8) NOT NULL,
    quantity DECIMAL(18,8) NOT NULL,
    first_update_id BIGINT,
    last_update_id BIGINT
);

SELECT create_hypertable('order_book_updates', 'time',
    chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_order_book_updates_symbol_time
    ON order_book_updates (symbol, time DESC);


CREATE TABLE IF NOT EXISTS order_book_snapshots (
    time TIMESTAMPTZ NOT NULL,
    symbol TEXT NOT NULL,
    last_update_id BIGINT,
    bids JSONB NOT NULL,
    asks JSONB NOT NULL
);

SELECT create_hypertable('order_book_snapshots', 'time',
    chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);


-- Optional: compression and retention. These were in the original schema but
-- are commented out because they need periodic background jobs and are not
-- worth running against a local dev database.
--
-- ALTER TABLE orderbook_snapshots SET (
--     timescaledb.compress,
--     timescaledb.compress_orderby = 'timestamp DESC'
-- );
-- SELECT add_compression_policy('orderbook_snapshots', INTERVAL '7 days');
-- SELECT add_retention_policy('orderbook_snapshots', INTERVAL '180 days');
--
-- ALTER TABLE candlestick_data SET (
--     timescaledb.compress,
--     timescaledb.compress_segmentby = 'symbol,interval',
--     timescaledb.compress_orderby = 'time DESC'
-- );
-- SELECT add_compression_policy('candlestick_data', INTERVAL '3 days');
-- SELECT add_retention_policy('candlestick_data', INTERVAL '180 days');
