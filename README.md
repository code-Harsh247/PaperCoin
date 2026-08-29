# PaperCoin

A full-stack crypto paper-trading platform that lets users trade BTC risk-free
using live Binance market data — real prices, virtual funds, and orders that
fill for real reasons, not on faith.

## What this is

Most paper-trading demos fake fills: an order goes in and a balance updates,
with nothing underneath asking *would this actually have happened?* PaperCoin
answers that question honestly. A server-side matching engine consumes
Binance's live trade stream and decides whether a simulated order would have
filled — using price-time priority, partial fills, and the same rules a real
resting order would be subject to. Users hold real positions, watch real P&L,
and can replay historical market data to backtest a strategy through the
identical fill logic used live.

## Features

- **Live trading** — market, limit, stop, and stop-limit orders, filled
  against real Binance trades with price-time priority and partial fills
- **Deterministic backtesting** — replay any captured historical window
  through the same matching engine, in an isolated session that never touches
  real balances
- **Real-time UI** — live order book, candlestick charts, and price ticker,
  all backed by auto-reconnecting WebSocket connections
- **Portfolio tracking** — holdings marked to market against the live price,
  with unrealized P&L computed against actual cost basis
- **Google OAuth + email/password auth**

## Architecture

```
Binance WebSocket ──► Trading Engine ──► PostgreSQL / TimescaleDB ◄── Next.js
  (live trades,        (fill model,        (orders, fills,          (UI, API
   depth)               ledger,             append-only ledger,      routes)
                        backtesting)        market_trades)
```

The engine is a separate, always-on Node process (`engine/`) — not a
serverless function — because it holds a persistent WebSocket connection to
Binance and must keep matching orders whether or not anyone has the app open.
Next.js API routes never touch order state directly; they insert a row and
notify the engine, which is the single writer for every order transition.
This is what makes a resting limit order fill correctly even if you close the
browser.

See [`engine/README.md`](engine/README.md) for how the matching engine, the
ledger, and backtesting actually work — the fill rules, the accounting
invariants, and the reasoning behind them.

## Tech stack

**Frontend:** Next.js 15, React 19, Tailwind CSS 4, Zustand, Recharts,
AmCharts
**Backend:** Node.js, PostgreSQL 17 + TimescaleDB, `pg`
**Auth:** JWT (`jose`), Google OAuth, bcrypt
**Market data:** Binance WebSocket (depth + trade streams)

## Getting started

**Prerequisites:** Node 18+, PostgreSQL 17 with the TimescaleDB extension.

```bash
npm install
cp .env.local.example .env.local   # fill in DATABASE_URL, JWT_SECRET, etc.
npm run engine:migrate             # applies schema + backfills the ledger
```

Run the app and the trading engine as two separate processes:

```bash
npm run dev       # Next.js app — http://localhost:3000
npm run engine    # trading engine (must be running for orders to fill)
```

Optional: `PaperCoin_Backtesting_Server` runs alongside these to animate
order-book depth during a backtest — display only, it doesn't decide fills.

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | Signs session tokens |
| `OAUTH_CLIENT_ID` / `OAUTH_CLIENT_SECRET` | Google login |
| `NEXT_PUBLIC_APP_URL` | Used in OAuth redirects |
| `NEXT_PUBLIC_BACKTEST_WS_URL` | Order-book replay server address |

## Testing

```bash
npm run engine:test
```

Covers the fill model against hand-built market scenarios, and a property
test that fuzzes thousands of randomized order/trade sequences asserting cash
and BTC are conserved after every single event — the invariant that actually
matters for a trading ledger.

```bash
node engine/replay.mjs --minutes 15
```

Replays captured trades twice and asserts byte-identical fills — proof the
engine is deterministic, which is also what makes backtesting valid: it's the
same code path as live trading, just fed recorded events instead of a socket.

## Project structure

```
app/               Next.js pages and API routes
  api/orders/          live order placement/cancellation
  api/backtest/        isolated backtest session API + SSE stream
components/trading/    trading UI (order form, book, chart, history)
Context/               React contexts (auth-aware orderbook, backtest state)
engine/                the trading engine (see engine/README.md)
  fillModel.mjs           pure fill-matching rules — no I/O, fully unit-tested
  settlement.mjs          the only writer of orders/fills/ledger/balances
  backtest/               isolated session engine + ledger for backtesting
  test/                   unit + property tests
lib/                   shared server utilities (auth, db, position math)
```

## Design notes worth knowing

- **Money is never a float.** The engine does all accounting in BigInt
  fixed-point (`engine/money.mjs`) — floating-point drift is exactly the kind
  of bug a trading ledger can't afford.
- **Balances are a projection of an append-only ledger**, not a mutated
  number. Every deposit, reservation, and fill is a ledger entry; the balance
  is derived, so any figure can be explained after the fact.
- **Backtesting reuses the live fill model rather than reimplementing it.**
  A backtest session and a live session run through the identical matching
  code — only where the events come from differs.

## Known limitations

- Backtestable history is limited to whatever the engine has captured since
  it started running — there's no bulk historical import (yet).
- Resting order queue position is estimated from L2 depth, not certain — the
  market only ever tells you total volume at a price, never who's ahead of
  you.
