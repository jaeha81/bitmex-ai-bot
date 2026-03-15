'use client';

import { AILog as AILogType } from '../lib/api';

interface Props {
  logs: AILogType[];
}

const ACTION_COLOR: Record<string, string> = {
  buy: '#00e676',
  sell: '#ff5252',
  hold: '#94a3b8',
  close: '#f59e0b',
};

export default function AILog({ logs }: Props) {
  return (
    <div style={s.wrap}>
      <div style={s.header}>AI 판단 로그</div>
      {logs.length === 0 && <div style={s.empty}>AI 판단 기록 없음</div>}
      {logs.map((log) => (
        <div key={log.id} style={s.row}>
          <div style={s.top}>
            <span style={{ ...s.action, color: ACTION_COLOR[log.action] || '#94a3b8' }}>
              {log.action.toUpperCase()}
            </span>
            <span style={s.conf}>신뢰도 {(log.confidence * 100).toFixed(0)}%</span>
            {log.executed ? (
              <span style={s.badgeGreen}>실행됨</span>
            ) : (
              <span style={s.badgeGray}>스킵</span>
            )}
          </div>
          <div style={s.reason}>{log.reason}</div>
          {log.skip_reason && <div style={s.skip}>{log.skip_reason}</div>}
          <div style={s.time}>{new Date(log.created_at).toLocaleString('ko-KR')}</div>
        </div>
      ))}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: {},
  header: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  empty: { color: '#475569', textAlign: 'center', padding: '16px 0', fontSize: 14 },
  row: { background: '#111827', border: '1px solid #1e293b', borderRadius: 8, padding: 12, marginBottom: 8 },
  top: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  action: { fontSize: 14, fontWeight: 'bold' },
  conf: { fontSize: 12, color: '#94a3b8' },
  badgeGreen: { fontSize: 10, background: '#064e3b', color: '#6ee7b7', padding: '2px 6px', borderRadius: 4 },
  badgeGray: { fontSize: 10, background: '#1e293b', color: '#94a3b8', padding: '2px 6px', borderRadius: 4 },
  reason: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 },
  skip: { fontSize: 11, color: '#f59e0b', marginBottom: 4 },
  time: { fontSize: 10, color: '#475569' },
};
