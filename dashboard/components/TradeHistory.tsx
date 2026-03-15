'use client';

import { Trade } from '../lib/api';

interface Props {
  trades: Trade[];
}

export default function TradeHistory({ trades }: Props) {
  return (
    <div>
      <div style={s.header}>거래 내역</div>
      {trades.length === 0 && <div style={s.empty}>거래 내역 없음</div>}
      {trades.map((t) => (
        <div key={t.id} style={s.row}>
          <div style={s.top}>
            <span style={{ color: t.side === 'buy' ? '#00e676' : '#ff5252', fontWeight: 'bold' }}>
              {t.side === 'buy' ? '🟢 BUY' : t.side === 'sell' ? '🔴 SELL' : '⚪ CLOSE'}
            </span>
            <span style={s.amount}>{t.amount} 계약</span>
            <span style={{ ...s.badge, background: t.status === 'open' ? '#1e3a5f' : '#1e293b' }}>
              {t.status}
            </span>
          </div>
          <div style={s.details}>
            <span>진입가: ${t.entry_price?.toLocaleString()}</span>
            {t.pnl !== null && (
              <span style={{ color: t.pnl >= 0 ? '#00e676' : '#ff5252' }}>
                PnL: {t.pnl >= 0 ? '+' : ''}{t.pnl?.toFixed(4)} USDT
              </span>
            )}
          </div>
          <div style={s.time}>{new Date(t.created_at).toLocaleString('ko-KR')}</div>
        </div>
      ))}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  header: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  empty: { color: '#475569', textAlign: 'center', padding: '16px 0', fontSize: 14 },
  row: { background: '#111827', border: '1px solid #1e293b', borderRadius: 8, padding: 12, marginBottom: 8 },
  top: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  amount: { fontSize: 13, color: '#94a3b8' },
  badge: { fontSize: 10, padding: '2px 6px', borderRadius: 4, color: '#94a3b8' },
  details: { display: 'flex', gap: 12, fontSize: 12, color: '#cbd5e1', marginBottom: 4 },
  time: { fontSize: 10, color: '#475569' },
};
