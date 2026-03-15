'use client';

import { Metrics } from '../lib/api';

interface Props {
  metrics: Metrics | null;
}

export default function PnLCard({ metrics }: Props) {
  return (
    <div style={s.card}>
      <div style={s.label}>성과 요약</div>
      <div style={s.grid}>
        <div style={s.stat}>
          <span style={s.key}>총 PnL</span>
          <span style={{ ...s.val, color: (metrics?.total_pnl ?? 0) >= 0 ? '#00e676' : '#ff5252' }}>
            {(metrics?.total_pnl ?? 0) >= 0 ? '+' : ''}{(metrics?.total_pnl ?? 0).toFixed(4)} USDT
          </span>
        </div>
        <div style={s.stat}>
          <span style={s.key}>승률</span>
          <span style={s.val}>{(metrics?.win_rate ?? 0).toFixed(1)}%</span>
        </div>
        <div style={s.stat}>
          <span style={s.key}>평균 수익</span>
          <span style={{ ...s.val, color: '#00e676' }}>
            +{(metrics?.avg_win ?? 0).toFixed(4)}
          </span>
        </div>
        <div style={s.stat}>
          <span style={s.key}>평균 손실</span>
          <span style={{ ...s.val, color: '#ff5252' }}>
            {(metrics?.avg_loss ?? 0).toFixed(4)}
          </span>
        </div>
        <div style={s.stat}>
          <span style={s.key}>총 거래</span>
          <span style={s.val}>{metrics?.closed_trades ?? 0}회</span>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  card: { background: '#111827', border: '1px solid #1e293b', borderRadius: 12, padding: 16, marginBottom: 12 },
  label: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  stat: { display: 'flex', flexDirection: 'column', gap: 2 },
  key: { fontSize: 11, color: '#64748b' },
  val: { fontSize: 16, fontWeight: 'bold', color: '#f1f5f9' },
};
