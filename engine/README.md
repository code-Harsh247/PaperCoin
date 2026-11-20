# PaperCoin Trading Engine

A server-side fill simulator for BTC/USDT paper trading. Given what actually
traded on Binance, it answers one question honestly: *would this order have
filled, and by how much?* Design doc: the session plan under
`~/.claude/plans/warm-dazzling-waffle.md`.

## Running

```bash
npm run engine:migrate   # apply schema + backfill (idempotent, self-verifying)
npm run engine           # start the engine (needs .env.local DATABASE_URL)
npm run engine:test      # unit + property tests, no network or DB needed
node engine/replay.mjs --minutes 15   # determinism check over captured trades
curl localhost:4600/health
```

Environment knobs: `ENGINE_CHECK_INVARIANTS=1` (per-settle reserved-balance
audit), `ENGINE_FILL_POLICY=optimistic|pessimistic` (queue policy, default
pessimistic), `ENGINE_PORT` (health, default 4600).

The engine is a separate always-on Node process. Next.js API routes only
insert `status='pending'` order rows and raise `cancel_requested`; every state
transition after that belongs to the engine — one writer, no races.

## Anatomy

| File | Role |
|---|---|
| `marketData.mjs` | Binance WS (depth diff + aggTrade), snapshot-sync L2 book, staleness |
| `book.mjs` | The L2 book itself — pure data structure |
| `fillModel.mjs` | Queue-position fill rules, book walking, stop triggers — pure functions |
| `settlement.mjs` | The only writer of fills/ledger/balances, always transactional |
| `index.mjs` | Single-threaded event loop wiring it together; health endpoint |
| `replay.mjs` | Same engine interface fed from captured `market_trades` |
| `money.mjs` | BigInt fixed-point (1e8); floats never touch accounting |

## The rules that matter

- **Fills come from the trade stream, not quotes.** Quotes flicker without
  anything changing hands; `aggTrade` is ground truth. `m=true` means the
  aggressor sold (fills our buys), `m=false` the aggressor bought (fills our
  sells).
- **Queue position**: a resting order joins behind the volume already at its
  price. Trades at that price drain the queue first; only overflow fills us.
  Trading *through* the price fills the remainder at our limit price.
- **Users are independent.** Each user's orders are matched against the real
  market as if no other PaperCoin user existed, so one user's orders never
  change another's fills. Paper trading is practice against the market, not
  against other users. Within one user's own orders the trade is still shared
  in price-time priority: orders the print went *through* fill by inference,
  and orders exactly at the print queue behind their real `queue_ahead` and
  behind that user's earlier orders at the price (`joinSeq`), so a user's own
  orders can't fill the same real volume twice. `allocateTradePerAccount` in
  `fillModel.mjs`; property tests check that each user's result equals that
  user matched alone, and that one queue never fills more than the trade.
- **Cancellations ahead of us are unknowable** from L2 data. The pessimistic
  default only applies the hard cap (no more can be ahead than rests at the
  level); the optimistic policy also credits shrinkage — and will double-count
  shrinkage caused by trades, which is why it is not the default.
- **Stale book ⇒ no matching.** Trades buffer during a resync and apply after.
  Market orders wait. Never invent a fill during a blackout.
- **Reservations**: buys reserve `qty × limit` cash, resting sells reserve BTC.
  Fills move reserved → settled atomically with the fill row; cancel and
  completion release the remainder, including rounding dust, exactly.
- **Idempotency**: `UNIQUE (order_id, source_trade_id)` turns replayed trade
  events into no-ops, so crash recovery cannot double-apply a fill.
- **Buy stops (market)** reserve nothing — their cost is unknowable until
  trigger — and can be rejected for insufficient funds *at trigger time*.

## Known fidelity limits

- Trades that print while the engine is down are gone (live stream, no
  historical replay against Binance); resting orders fill later than reality.
- Trade-only replay (`replay.mjs`) has no depth capture, so replayed queue
  positions start at zero — deterministic, but more optimistic than live.
- Queue inference from L2 is an estimate by nature; see the policy note above.
- No market impact, by design. Simulated orders never move the real market,
  and different users never compete for the same real volume: ten users at
  a price can each fill against the same 1 BTC trade. Each user's fills are
  realistic on their own; the platform-wide total is not meant to be.
