// Live smoke test (not part of `node --test`): runs the market data service
// for ~25s, then cross-checks the maintained book against a fresh REST
// snapshot. Top-of-book must agree; deep levels can differ transiently since
// the snapshot and the stream are sampled at different instants.
//   node engine/test/marketData.smoke.mjs
import { MarketDataService } from '../marketData.mjs';
import { fmtUnits } from '../money.mjs';

const md = new MarketDataService();
let trades = 0;
let depths = 0;

md.on('trade', () => { trades += 1; });
md.on('depth', () => { depths += 1; });
md.on('sync', ({ synced }) => console.log(`sync: ${synced}`));
md.on('error_note', (n) => console.log(`note: ${n}`));

md.start();

setTimeout(async () => {
  console.log(`events after 25s: trades=${trades} depth=${depths} synced=${md.synced}`);
  console.log(`best bid ${fmtUnits(md.book.bestBid())}  best ask ${fmtUnits(md.book.bestAsk())}`);
  console.log(`levels: bids=${md.book.bids.size} asks=${md.book.asks.size}`);

  const res = await fetch('https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=5');
  const snap = await res.json();
  console.log(`REST top of book: bid ${snap.bids[0][0]}  ask ${snap.asks[0][0]}`);

  const localBid = Number(fmtUnits(md.book.bestBid()));
  const restBid = Number(snap.bids[0][0]);
  const drift = Math.abs(localBid - restBid);
  console.log(drift <= 5
    ? `PASS: top of book within $${drift.toFixed(2)} of REST`
    : `FAIL: book drifted $${drift.toFixed(2)} from REST`);
  md.stop();
  process.exit(0);
}, 25000);
