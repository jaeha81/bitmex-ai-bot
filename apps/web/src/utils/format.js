export const fmt = {
  xbt: (satoshi) => satoshi != null ? `${(satoshi / 1e8).toFixed(4)} XBT` : '—',
  price: (p) => p != null ? Number(p).toLocaleString() : '—',
  pct: (p) => p != null ? `${(p * 100).toFixed(2)}%` : '—',
};
