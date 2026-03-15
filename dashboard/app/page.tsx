'use client';

import { useState, useEffect, useCallback } from 'react';
import { botApi, BotStatus, Trade, AILog, Metrics } from '../lib/api';
import BotStatusComp from '../components/BotStatus';
import PositionCard from '../components/PositionCard';
import PnLCard from '../components/PnLCard';
import AILogComp from '../components/AILog';
import TradeHistory from '../components/TradeHistory';

const TABS = ['대시보드', 'AI 로그', '거래내역', '성과'] as const;
type Tab = typeof TABS[number];

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>('대시보드');
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [aiLogs, setAiLogs] = useState<AILog[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [botLoading, setBotLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const s = await botApi.getStatus();
      setStatus(s);
      setError(null);
    } catch (e) {
      setError('봇 서버 연결 실패 — BOT_URL 확인 필요');
    }
  }, []);

  const loadTabData = useCallback(async () => {
    try {
      if (tab === 'AI 로그') {
        const { logs } = await botApi.getAiLogs();
        setAiLogs(logs);
      } else if (tab === '거래내역') {
        const { trades: t } = await botApi.getTrades();
        setTrades(t);
      } else if (tab === '성과') {
        const m = await botApi.getMetrics();
        setMetrics(m);
      }
    } catch {}
  }, [tab]);

  useEffect(() => {
    loadStatus();
    const t = setInterval(loadStatus, 5000);
    return () => clearInterval(t);
  }, [loadStatus]);

  useEffect(() => {
    loadTabData();
  }, [loadTabData]);

  const handleBotToggle = async (start: boolean) => {
    setBotLoading(true);
    try {
      if (start) await botApi.startBot();
      else await botApi.stopBot();
      await loadStatus();
    } catch (e) {
      setError('봇 제어 실패');
    } finally {
      setBotLoading(false);
    }
  };

  return (
    <div style={s.wrap}>
      {/* 헤더 */}
      <div style={s.header}>
        <span style={s.logo}>🤖 BitMEX AI</span>
        <span style={{ fontSize: 11, color: '#475569' }}>
          {status ? '● 연결됨' : '○ 연결 중...'}
        </span>
      </div>

      {/* 탭 */}
      <div style={s.tabs}>
        {TABS.map((t) => (
          <button
            key={t}
            style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <div style={s.error}>{error}</div>}

      <div style={s.content}>
        {tab === '대시보드' && (
          <>
            <BotStatusComp
              status={status}
              onStart={() => handleBotToggle(true)}
              onStop={() => handleBotToggle(false)}
              loading={botLoading}
            />
            <PositionCard status={status} />
          </>
        )}

        {tab === 'AI 로그' && <AILogComp logs={aiLogs} />}
        {tab === '거래내역' && <TradeHistory trades={trades} />}
        {tab === '성과' && <PnLCard metrics={metrics} />}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: {
    background: '#0a0e1a',
    minHeight: '100vh',
    color: '#e0e0e0',
    fontFamily: 'monospace',
    maxWidth: 480,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #1e293b',
  },
  logo: { color: '#f59e0b', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #1e293b',
    overflowX: 'auto',
  },
  tab: {
    flex: 1,
    padding: '10px 4px',
    background: 'transparent',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: 12,
    whiteSpace: 'nowrap',
  },
  tabActive: { color: '#f59e0b', borderBottom: '2px solid #f59e0b' },
  content: { padding: 16 },
  error: {
    background: '#450a0a',
    color: '#fca5a5',
    padding: '8px 16px',
    fontSize: 12,
    borderLeft: '3px solid #ef4444',
  },
};
