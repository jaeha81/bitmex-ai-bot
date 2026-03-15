const BOT_URL = process.env.NEXT_PUBLIC_BOT_URL || 'http://localhost:8000';
const BOT_SECRET = process.env.NEXT_PUBLIC_BOT_SECRET || '';

async function botFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BOT_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-bot-secret': BOT_SECRET,
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const botApi = {
  getStatus: () => botFetch('/status'),
  getTrades: (limit = 20) => botFetch(`/trades?limit=${limit}`),
  getAiLogs: (limit = 30) => botFetch(`/ai-logs?limit=${limit}`),
  getMetrics: () => botFetch('/metrics'),
  startBot: () => botFetch('/bot/start', { method: 'POST' }),
  stopBot: () => botFetch('/bot/stop', { method: 'POST' }),
};

export type BotStatus = {
  bot_running: boolean;
  balance: { total: number; free: number; error?: string };
  position: {
    side: string;
    contracts: number;
    entry_price: number;
    unrealized_pnl: number;
    leverage: number;
  } | null;
  daily_pnl: number;
  total_trades: number;
  winning_trades: number;
};

export type Trade = {
  id: number;
  symbol: string;
  side: string;
  amount: number;
  entry_price: number;
  pnl: number | null;
  status: string;
  created_at: string;
  closed_at: string | null;
};

export type AILog = {
  id: number;
  action: string;
  confidence: number;
  reason: string;
  executed: boolean;
  skip_reason: string | null;
  created_at: string;
};

export type Metrics = {
  total_trades: number;
  closed_trades: number;
  win_rate: number;
  total_pnl: number;
  avg_win: number;
  avg_loss: number;
};
