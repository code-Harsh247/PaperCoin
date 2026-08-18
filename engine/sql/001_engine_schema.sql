-- Engine schema: orders, fills, append-only ledger, and balances projection.
-- Design doc: single writer (the engine) owns every order state transition;
-- the API only ever inserts status='pending' rows and requests cancellation.

CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    symbol TEXT NOT NULL DEFAULT 'BTCUSDT',
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
    time_in_force TEXT NOT NULL DEFAULT 'GTC',
    -- Resting volume ahead of us at our price when we joined, maintained by
    -- the engine. NULL until the order is accepted.
    queue_ahead NUMERIC(30,8),
    -- Exactly what was reserved at placement (cash for buys, BTC for sells),
    -- decremented per fill, released on cancel/completion. Tracking it
    -- explicitly is what makes the dust-release exact.
    reserved_remaining NUMERIC(30,8) NOT NULL DEFAULT 0,
    cancel_requested BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_working_set
    ON orders (symbol, status) WHERE status IN ('pending', 'open', 'partially_filled');
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS fills (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id),
    user_id INTEGER NOT NULL,
    side TEXT NOT NULL,
    quantity NUMERIC(30,8) NOT NULL CHECK (quantity > 0),
    price NUMERIC(30,8) NOT NULL,
    -- Binance aggTrade id that caused this fill; NULL for book-walk fills
    -- (market orders / crossing limits), which are settled inline in the same
    -- transaction that transitions the order and so need no replay guard.
    source_trade_id BIGINT,
    liquidity TEXT NOT NULL CHECK (liquidity IN ('maker', 'taker')),
    executed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Idempotency: reprocessing the same market trade against the same order
    -- conflicts here and is discarded. This is what turns at-least-once event
    -- delivery into effectively-once settlement.
    UNIQUE (order_id, source_trade_id)
);
-- Deliberately NOT a hypertable: TimescaleDB would require executed_at inside
-- every unique constraint, and the idempotency key above matters more than
-- time partitioning at this volume.

CREATE INDEX IF NOT EXISTS idx_fills_user ON fills (user_id, executed_at DESC);

CREATE TABLE IF NOT EXISTS ledger_entries (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    account TEXT NOT NULL CHECK (account IN
        ('cash_available', 'cash_reserved', 'btc_available', 'btc_reserved')),
    delta NUMERIC(30,8) NOT NULL,
    ref_type TEXT NOT NULL,   -- deposit | order_reserve | fill | cancel_release
                              -- | residual_release | backfill | signup
    ref_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_user ON ledger_entries (user_id, created_at);

-- Projection of the ledger. The CHECK constraints are the last line of
-- defence against double-spend: even a buggy writer cannot take a balance
-- negative without the transaction aborting.
CREATE TABLE IF NOT EXISTS balances (
    user_id INTEGER PRIMARY KEY REFERENCES users(user_id),
    cash_available NUMERIC(30,8) NOT NULL DEFAULT 0 CHECK (cash_available >= 0),
    cash_reserved NUMERIC(30,8) NOT NULL DEFAULT 0 CHECK (cash_reserved >= 0),
    btc_available NUMERIC(30,8) NOT NULL DEFAULT 0 CHECK (btc_available >= 0),
    btc_reserved NUMERIC(30,8) NOT NULL DEFAULT 0 CHECK (btc_reserved >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Captured aggTrades, for the replay source. Small (~50 rows/s peak for
-- BTCUSDT) and append-only.
CREATE TABLE IF NOT EXISTS market_trades (
    trade_id BIGINT NOT NULL,
    symbol TEXT NOT NULL DEFAULT 'BTCUSDT',
    price NUMERIC(30,8) NOT NULL,
    quantity NUMERIC(30,8) NOT NULL,
    -- true = buyer was maker = aggressor was a SELLER (consumes bids)
    buyer_is_maker BOOLEAN NOT NULL,
    traded_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (symbol, trade_id)
);

CREATE INDEX IF NOT EXISTS idx_market_trades_time ON market_trades (traded_at);
