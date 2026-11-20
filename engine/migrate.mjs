// Brings a database up to date, from empty if need be:
//   1. base schema (tables.sql) — only on a fresh database, detected by the
//      absence of the users table
//   2. engine/sql/*.sql in name order, once each
//   3. balance backfill from the legacy tables
//   4. data retention — only when ENGINE_RETENTION_DAYS is set, so a dev
//      database's captured history is never pruned by accident
// Rerunnable: every step skips what is already done.
//
//   node engine/migrate.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool, withTransaction } from './db.mjs';

const engineDir = dirname(fileURLToPath(import.meta.url));
const sqlDir = join(engineDir, 'sql');

async function bootstrapBaseSchema() {
  const { rows } = await pool.query(`SELECT to_regclass('public.users') AS t`);
  if (rows[0].t) {
    console.log('base schema present');
    return;
  }
  await pool.query(readFileSync(join(engineDir, '..', 'tables.sql'), 'utf8'));
  console.log('applied tables.sql (fresh database)');
}

// The two capture streams grow without bound: market_trades (every Binance
// trade the engine sees) and orderbook_snapshots (one depth snapshot a
// second from the standalone ingester). Keep `days` of each.
async function applyRetention(days) {
  // orderbook_snapshots is a hypertable: compress day-old chunks, drop old ones.
  await pool.query(`ALTER TABLE orderbook_snapshots SET (
      timescaledb.compress, timescaledb.compress_orderby = 'timestamp DESC')`);
  await pool.query(`SELECT add_compression_policy('orderbook_snapshots',
      INTERVAL '1 day', if_not_exists => TRUE)`);
  await pool.query(`SELECT remove_retention_policy('orderbook_snapshots', if_exists => TRUE)`);
  await pool.query(`SELECT add_retention_policy('orderbook_snapshots',
      make_interval(days => $1::int))`, [days]);

  // market_trades is a plain table (its primary key has no time column, so it
  // can't be a hypertable): prune it with a scheduled job instead.
  await pool.query(`
    CREATE OR REPLACE PROCEDURE prune_market_trades(job_id INT, config JSONB)
    LANGUAGE plpgsql AS $$
    BEGIN
      DELETE FROM market_trades
      WHERE traded_at < NOW() - make_interval(days => (config->>'days')::int);
    END $$`);
  const config = JSON.stringify({ days });
  const { rows } = await pool.query(
    `SELECT job_id FROM timescaledb_information.jobs WHERE proc_name = 'prune_market_trades'`);
  if (rows.length) {
    await pool.query(`SELECT alter_job($1, config => $2::jsonb)`, [rows[0].job_id, config]);
  } else {
    await pool.query(`SELECT add_job('prune_market_trades', '1 hour', config => $1::jsonb)`, [config]);
  }
  console.log(`retention: keeping ${days} days of trades and order-book snapshots`);
}

async function applyMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const files = readdirSync(sqlDir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const { rowCount } = await pool.query(
      'SELECT 1 FROM schema_migrations WHERE name = $1', [file]
    );
    if (rowCount > 0) {
      console.log(`skip    ${file} (already applied)`);
      continue;
    }
    await withTransaction(async (tx) => {
      await tx.query(readFileSync(join(sqlDir, file), 'utf8'));
      await tx.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    });
    console.log(`applied ${file}`);
  }
}

// Each user's latest user_portfolios snapshot becomes their opening balance,
// recorded as ledger entries so even the starting position is explainable.
async function backfillBalances() {
  const { rows: users } = await pool.query(`
    SELECT DISTINCT ON (p.user_id)
           p.user_id, p.available_funds, p.btccoins
    FROM user_portfolios p
    JOIN users u ON u.user_id = p.user_id
    WHERE NOT EXISTS (SELECT 1 FROM balances b WHERE b.user_id = p.user_id)
    ORDER BY p.user_id, p.last_updated DESC;
  `);

  let migrated = 0;
  for (const u of users) {
    migrated += 1;
    await withTransaction(async (tx) => {
      await tx.query(
        `INSERT INTO balances (user_id, cash_available, btc_available)
         VALUES ($1, $2, $3)`,
        [u.user_id, u.available_funds, u.btccoins]
      );
      await tx.query(
        `INSERT INTO ledger_entries (user_id, account, delta, ref_type)
         VALUES ($1, 'cash_available', $2, 'backfill'),
                ($1, 'btc_available',  $3, 'backfill')`,
        [u.user_id, u.available_funds, u.btccoins]
      );
    });
    console.log(`backfilled user ${u.user_id}: cash ${u.available_funds}, btc ${u.btccoins}`);
  }
  if (users.length === 0) console.log('backfill: nothing to do');
  return migrated;
}

// Verification. The ledger must reconcile to balances always; the legacy
// comparison only holds at the moment of the initial backfill — once live
// trading begins, balances legitimately diverge from the frozen snapshots,
// so that check is limited to runs where the backfill actually migrated.
async function verify(backfilledUsers) {
  const { rows: [neu] } = await pool.query(`
    SELECT COALESCE(SUM(cash_available + cash_reserved), 0) AS cash,
           COALESCE(SUM(btc_available + btc_reserved), 0) AS btc
    FROM balances;
  `);
  const { rows: [ledger] } = await pool.query(`
    SELECT COALESCE(SUM(delta) FILTER (WHERE account LIKE 'cash%'), 0) AS cash,
           COALESCE(SUM(delta) FILTER (WHERE account LIKE 'btc%'), 0) AS btc
    FROM ledger_entries;
  `);
  console.log(`balance totals: cash ${neu.cash}  btc ${neu.btc}`);
  console.log(`ledger totals:  cash ${ledger.cash}  btc ${ledger.btc}`);

  const same = (a, b) => Number(a) === Number(b);
  if (!same(ledger.cash, neu.cash) || !same(ledger.btc, neu.btc)) {
    throw new Error('VERIFICATION FAILED: ledger does not reconcile to balances');
  }

  if (backfilledUsers > 0) {
    const { rows: [legacy] } = await pool.query(`
      SELECT COALESCE(SUM(available_funds), 0) AS cash,
             COALESCE(SUM(btccoins), 0) AS btc
      FROM (SELECT DISTINCT ON (user_id) available_funds, btccoins
            FROM user_portfolios ORDER BY user_id, last_updated DESC) latest;
    `);
    console.log(`legacy totals:  cash ${legacy.cash}  btc ${legacy.btc}`);
    if (!same(legacy.cash, neu.cash) || !same(legacy.btc, neu.btc)) {
      throw new Error('VERIFICATION FAILED: balances do not match legacy totals');
    }
  }
  console.log('verification passed: ledger reconciles exactly');
}

try {
  await bootstrapBaseSchema();
  await applyMigrations();
  const backfilledUsers = await backfillBalances();
  await verify(backfilledUsers);
  const retentionDays = Number(process.env.ENGINE_RETENTION_DAYS);
  if (Number.isInteger(retentionDays) && retentionDays > 0) await applyRetention(retentionDays);
} finally {
  await pool.end();
}
