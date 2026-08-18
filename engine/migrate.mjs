// Applies engine/sql/*.sql in name order, once each, then runs the balance
// backfill from the legacy tables. Rerunnable: applied migrations are skipped
// and the backfill only touches users with no balances row yet.
//
//   node engine/migrate.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool, withTransaction } from './db.mjs';

const sqlDir = join(dirname(fileURLToPath(import.meta.url)), 'sql');

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

  for (const u of users) {
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
}

// The migration is only done if no value was created or destroyed.
async function verify() {
  const { rows: [legacy] } = await pool.query(`
    SELECT COALESCE(SUM(available_funds), 0) AS cash,
           COALESCE(SUM(btccoins), 0) AS btc
    FROM (SELECT DISTINCT ON (user_id) available_funds, btccoins
          FROM user_portfolios ORDER BY user_id, last_updated DESC) latest;
  `);
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

  console.log(`legacy totals:  cash ${legacy.cash}  btc ${legacy.btc}`);
  console.log(`balance totals: cash ${neu.cash}  btc ${neu.btc}`);
  console.log(`ledger totals:  cash ${ledger.cash}  btc ${ledger.btc}`);

  const same = (a, b) => Number(a) === Number(b);
  if (!same(legacy.cash, neu.cash) || !same(legacy.btc, neu.btc)) {
    throw new Error('VERIFICATION FAILED: balances do not match legacy totals');
  }
  if (!same(ledger.cash, neu.cash) || !same(ledger.btc, neu.btc)) {
    throw new Error('VERIFICATION FAILED: ledger does not reconcile to balances');
  }
  console.log('verification passed: no value created or destroyed');
}

try {
  await applyMigrations();
  await backfillBalances();
  await verify();
} finally {
  await pool.end();
}
