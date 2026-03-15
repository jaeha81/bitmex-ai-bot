'use client';

import { BotStatus as BotStatusType } from '../lib/api';

interface Props {
  status: BotStatusType | null;
  onStart: () => void;
  onStop: () => void;
  loading: boolean;
}

export default function BotStatus({ status, onStart, onStop, loading }: Props) {
  const isRunning = status?.bot_running ?? false;

  return (
    <div style={s.card}>
      <div style={s.row}>
        <div>
          <div style={s.label}>봇 상태</div>
          <div style={{ ...s.status, color: isRunning ? '#00e676' : '#ff5252' }}>
            {isRunning ? '● 실행 중' : '○ 정지'}
          </div>
        </div>
        <button
          style={{ ...s.btn, background: isRunning ? '#7f1d1d' : '#064e3b' }}
          onClick={isRunning ? onStop : onStart}
          disabled={loading}
        >
          {loading ? '...' : isRunning ? '정지' : '시작'}
        </button>
      </div>

      <div style={s.grid}>
        <div style={s.stat}>
          <span style={s.statLabel}>USDT 잔고</span>
          <span style={s.statVal}>${(status?.balance?.total ?? 0).toFixed(2)}</span>
        </div>
        <div style={s.stat}>
          <span style={s.statLabel}>가용 잔고</span>
          <span style={s.statVal}>${(status?.balance?.free ?? 0).toFixed(2)}</span>
        </div>
        <div style={s.stat}>
          <span style={s.statLabel}>일일 PnL</span>
          <span style={{ ...s.statVal, color: (status?.daily_pnl ?? 0) >= 0 ? '#00e676' : '#ff5252' }}>
            {(status?.daily_pnl ?? 0) >= 0 ? '+' : ''}{(status?.daily_pnl ?? 0).toFixed(4)} USDT
          </span>
        </div>
        <div style={s.stat}>
          <span style={s.statLabel}>총 거래</span>
          <span style={s.statVal}>{status?.total_trades ?? 0}회</span>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  card: { background: '#111827', border: '1px solid #1e293b', borderRadius: 12, padding: 16, marginBottom: 12 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  status: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  btn: { padding: '8px 20px', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 14 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
  stat: { display: 'flex', flexDirection: 'column', gap: 2 },
  statLabel: { fontSize: 11, color: '#64748b' },
  statVal: { fontSize: 15, fontWeight: 'bold', color: '#f1f5f9' },
};
