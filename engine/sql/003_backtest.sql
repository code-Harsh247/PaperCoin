-- Backtesting: a parallel, fully isolated universe. Same shapes as the live
-- tables, but keyed by session and with no foreign keys into live money —
-- a backtest can never touch balances/orders/fills, and deleting a session
-- cascades away cleanly.

CREATE TABLE IF NOT EXISTS backtest_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    status TEXT NOT NULL DEFAULT 'running'
        CHECK (status IN ('running', 'completed', 'stopped', 'error')),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    speed NUMERIC(6,2) NOT NULL DEFAULT 1,
    -- Where the replay clock currently stands; lets the UI show progress and
    -- a restarted engine mark orphaned sessions as stopped.
    replay_position TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_backtest_sessions_user
    ON backtest_sessions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS backtest_orders (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES backtest_sessions(id) ON DELETE CASCADE,
    side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
    type TEXT NOT NULL CHECK (type IN ('market', 'limit', 'stop', 'stop_limit')),
    limit_price NUMERIC(30,8),
    stop_price NUMERIC(30,8),
    quantity NUMERIC(30,8) NOT NULL CHECK (quantity > 0),
    filled_quantity NUMERIC(30,8) NOT NULL DEFAULT 0,
    avg_fill_price NUMERIC(30,8),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'open', 'partially_filled', 'filled',
                          'cancelled', 'rejected', 'expired')),
    reject_reason TEXT,
    queue_ahead NUMERIC(30,8),
    reserved_remaining NUMERIC(30,8) NOT NULL DEFAULT 0,
    triggered BOOLEAN NOT NULL DEFAULT FALSE,
    cancel_requested BOOLEAN NOT NULL DEFAULT FALSE,
    -- Timestamps in REPLAY time, not wall time: an order placed "at" 14:03:07
    -- in the historical window is meaningful; when you clicked is not.
    placed_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backtest_orders_session
    ON backtest_orders (session_id, placed_at DESC);

CREATE TABLE IF NOT EXISTS backtest_fills (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES backtest_orders(id) ON DELETE CASCADE,
    session_id BIGINT NOT NULL,
    side TEXT NOT NULL,
    quantity NUMERIC(30,8) NOT NULL CHECK (quantity > 0),
    price NUMERIC(30,8) NOT NULL,
    source_trade_id BIGINT,
    liquidity TEXT NOT NULL CHECK (liquidity IN ('maker', 'taker')),
    executed_at TIMESTAMPTZ NOT NULL,   -- replay time
    UNIQUE (order_id, source_trade_id)
);

CREATE INDEX IF NOT EXISTS idx_backtest_fills_session
    ON backtest_fills (session_id, executed_at);

CREATE TABLE IF NOT EXISTS backtest_ledger_entries (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES backtest_sessions(id) ON DELETE CASCADE,
    account TEXT NOT NULL CHECK (account IN
        ('cash_available', 'cash_reserved', 'btc_available', 'btc_reserved')),
    delta NUMERIC(30,8) NOT NULL,
    ref_type TEXT NOT NULL,
    ref_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backtest_ledger_session
    ON backtest_ledger_entries (session_id, created_at);

CREATE TABLE IF NOT EXISTS backtest_balances (
    session_id BIGINT PRIMARY KEY REFERENCES backtest_sessions(id) ON DELETE CASCADE,
    cash_available NUMERIC(30,8) NOT NULL DEFAULT 0 CHECK (cash_available >= 0),
    cash_reserved NUMERIC(30,8) NOT NULL DEFAULT 0 CHECK (cash_reserved >= 0),
    btc_available NUMERIC(30,8) NOT NULL DEFAULT 0 CHECK (btc_available >= 0),
    btc_reserved NUMERIC(30,8) NOT NULL DEFAULT 0 CHECK (btc_reserved >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
