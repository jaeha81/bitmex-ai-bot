'use client';

import { BotStatus } from '../lib/api';

interface Props {
  status: BotStatus | null;
}

export default function PositionCard({ status }: Props) {
  const pos = status?.position;

  return (
    <div style={s.card}>
      <div style={s.label}>현재 포지션</div>
      {pos ? (
        <div>
          <div style={{ ...s.side, color: pos.side === 'long' ? '#00e676' : '#ff5252' }}>
            {pos.side === 'long' ? '🟢 LONG' : '🔴 SHORT'}
          </div>
          <div style={s.grid}>
            <span style={s.key}>계약 수량</span>
            <span style={s.val}>{pos.contracts}</span>
            <span style={s.key}>진입가</span>
            <span style={s.val}>${pos.entry_price?.toLocaleString()}</span>
            <span style={s.key}>레버리지</span>
            <span style={s.val}>{pos.leverage}x</span>
            <span style={s.key}>미실현 PnL</span>
            <span style={{ ...s.val, color: pos.unrealized_pnl >= 0 ? '#00e676' : '#ff5252' }}>
              {pos.unrealized_pnl >= 0 ? '+' : ''}{pos.unrealized_pnl?.toFixed(4)} USDT
            </span>
          </div>
        </div>
      ) : (
        <div style={s.empty}>포지션 없음</div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  card: { background: '#111827', border: '1px solid #1e293b', borderRadius: 12, padding: 16, marginBottom: 12 },
  label: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  side: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 13 },
  key: { color: '#64748b' },
  val: { color: '#f1f5f9', fontWeight: 'bold' },
  empty: { color: '#475569', textAlign: 'center', padding: '16px 0', fontSize: 14 },
};
