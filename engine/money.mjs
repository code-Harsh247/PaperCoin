// Fixed-point arithmetic for the engine. Quantities, prices, and cash values
// are all BigInt scaled by 1e8, which maps exactly onto NUMERIC(30,8) in
// Postgres via strings. Floats never touch accounting: 0.1 + 0.2 !== 0.3 is
// precisely the class of bug a ledger exists to rule out.

export const SCALE = 100_000_000n; // 1e8

// "64000.12345678" -> 6400012345678n. Accepts an optional sign and up to
// 8 decimal places; anything beyond 8 is rejected rather than silently
// truncated, because silent truncation is how value leaks.
export function parseUnits(str) {
  const s = String(str).trim();
  const m = s.match(/^(-?)(\d+)(?:\.(\d{1,8}))?$/);
  if (!m) throw new Error(`not a valid decimal amount: ${JSON.stringify(str)}`);
  const [, sign, whole, frac = ''] = m;
  const units = BigInt(whole) * SCALE + BigInt(frac.padEnd(8, '0'));
  return sign === '-' ? -units : units;
}

// 6400012345678n -> "64000.12345678". Always emits all 8 decimals so the
// string round-trips through NUMERIC(30,8) unchanged.
export function fmtUnits(units) {
  const neg = units < 0n;
  const abs = neg ? -units : units;
  const whole = abs / SCALE;
  const frac = (abs % SCALE).toString().padStart(8, '0');
  return `${neg ? '-' : ''}${whole}.${frac}`;
}

// (qty units) x (price units) -> value units, floored. Flooring means the sum
// of per-fill values can undershoot quantity x price by dust; the engine
// releases that dust explicitly when an order completes, so conservation holds
// by construction rather than by hoping rounding cancels out.
export function mulUnits(a, b) {
  const product = a * b;
  if (product < 0n) throw new Error('mulUnits expects non-negative operands');
  return product / SCALE;
}

export function minUnits(a, b) {
  return a < b ? a : b;
}

export const ZERO = 0n;
