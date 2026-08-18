// Position accounting derived from fills, average-cost method. The ledger
// knows how much BTC you hold; this answers what it cost you.
//
// Average cost: a buy adds quantity and cost; a sell removes quantity at the
// current average cost per unit (the realised P&L is the difference between
// proceeds and that released basis — not needed here, so not returned).

export function computePosition(fills) {
  let qty = 0;
  let basis = 0;
  for (const f of fills) {
    const q = parseFloat(f.quantity);
    const p = parseFloat(f.price);
    if (f.side === 'buy') {
      basis += q * p;
      qty += q;
    } else {
      const avg = qty > 0 ? basis / qty : 0;
      basis -= Math.min(q, qty) * avg;
      qty = Math.max(0, qty - q);
    }
  }
  return { qty, basis };
}

// Timeline of {btccoins, total_invested, last_updated} after each fill —
// the shape PortfolioPerformance already consumes.
export function positionTimeline(fills) {
  const points = [];
  let qty = 0;
  let basis = 0;
  for (const f of fills) {
    const q = parseFloat(f.quantity);
    const p = parseFloat(f.price);
    if (f.side === 'buy') {
      basis += q * p;
      qty += q;
    } else {
      const avg = qty > 0 ? basis / qty : 0;
      basis -= Math.min(q, qty) * avg;
      qty = Math.max(0, qty - q);
    }
    points.push({
      btccoins: qty,
      total_invested: basis,
      last_updated: f.executed_at,
    });
  }
  return points;
}
