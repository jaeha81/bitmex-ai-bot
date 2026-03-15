import { useState, useEffect, useCallback } from 'react';
import { api } from './utils/api.js';
import { fmt } from './utils/format.js';

const TABS = ['대시보드', '주문', '포지션', '로그', '설정'];

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [tab, setTab] = useState('대시보드');
  const [mode, setMode] = useState('paper');
  const [balance, setBalance] = useState(null);
  const [position, setPosition] = useState(null);
  const [orders, setOrders] = useState([]);
  const [logs, setLogs] = useState([]);
  const [armed, setArmed] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '', totp: '' });
  const [orderForm, setOrderForm] = useState({ symbol: 'XBTUSD', side: 'Buy', orderQty: '', ordType: 'Market', price: '' });
  const [msg, setMsg] = useState('');

  const headers = useCallback(() => ({
    Authorization: `Bearer ${token}`,
    'x-trading-mode': mode,
    'Content-Type': 'application/json',
  }), [token, mode]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [b, p, o] = await Promise.all([
        api.get('/trading/balance', headers()),
        api.get('/trading/position?symbol=XBTUSD', headers()),
        api.get('/trading/orders?symbol=XBTUSD', headers()),
      ]);
      setBalance(b.data);
      setPosition(p.data?.[0]);
      setOrders(o.data || []);
    } catch {}
  }, [token, headers]);

  useEffect(() => {
    if (token) { load(); }
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [token, load]);

  const login = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', loginForm);
      localStorage.setItem('token', res.token);
      setToken(res.token);
    } catch (err) { setMsg('로그인 실패: ' + (err.message || '')); }
  };

  const placeOrder = async (e) => {
    e.preventDefault();
    if (mode === 'real' && !armed) return setMsg('REAL 주문은 ARM 활성화 필요');
    try {
      const body = { ...orderForm, orderQty: Number(orderForm.orderQty) };
      if (orderForm.ordType === 'Market') delete body.price;
      else body.price = Number(body.price);
      await api.post('/trading/order', body, headers());
      setMsg('✅ 주문 접수');
      load();
    } catch (err) { setMsg('주문 실패: ' + (err.message || '')); }
  };

  const toggleArm = async () => {
    const endpoint = armed ? '/arm/deactivate' : '/arm/activate';
    const res = await api.post(endpoint, {}, headers());
    setArmed(res.armed);
    setMsg(res.armed ? '⚡ ARM 활성화 (30분)' : '🔒 ARM 해제');
  };

  const loadLogs = async () => {
    const res = await api.get('/trading/logs', headers());
    setLogs(res.logs || []);
  };

  if (!token) return (
    <div style={s.loginWrap}>
      <div style={s.loginBox}>
        <h2 style={s.logo}>⚡ BitMEX Trader</h2>
        <form onSubmit={login}>
          <input style={s.input} placeholder="아이디" value={loginForm.username}
            onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))} />
          <input style={s.input} type="password" placeholder="비밀번호" value={loginForm.password}
            onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} />
          <input style={s.input} placeholder="TOTP (선택)" value={loginForm.totp}
            onChange={e => setLoginForm(f => ({ ...f, totp: e.target.value }))} />
          <button style={s.btn} type="submit">로그인</button>
        </form>
        {msg && <p style={s.msg}>{msg}</p>}
      </div>
    </div>
  );

  return (
    <div style={s.wrap}>
      {/* 헤더 */}
      <div style={s.header}>
        <span style={s.logo}>⚡ BitMEX</span>
        <div style={s.modeRow}>
          <button style={{ ...s.modeBtn, ...(mode === 'paper' ? s.modeBtnActive : {}) }}
            onClick={() => setMode('paper')}>PAPER</button>
          <button style={{ ...s.modeBtn, ...(mode === 'real' ? s.modeBtnReal : {}) }}
            onClick={() => setMode('real')}>REAL</button>
          {mode === 'real' && (
            <button style={{ ...s.armBtn, ...(armed ? s.armBtnOn : {}) }} onClick={toggleArm}>
              {armed ? '⚡ARM' : '🔒ARM'}
            </button>
          )}
        </div>
      </div>

      {/* 탭 */}
      <div style={s.tabs}>
        {TABS.map(t => (
          <button key={t} style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }}
            onClick={() => { setTab(t); if (t === '로그') loadLogs(); }}>
            {t}
          </button>
        ))}
      </div>

      {msg && <div style={s.toast}>{msg}</div>}

      {/* 대시보드 탭 */}
      {tab === '대시보드' && (
        <div style={s.content}>
          <div style={s.card}>
            <div style={s.cardLabel}>잔고 (XBt)</div>
            <div style={s.cardValue}>{balance ? fmt.xbt(balance.walletBalance) : '—'}</div>
            <div style={s.cardSub}>가용: {balance ? fmt.xbt(balance.availableMargin) : '—'}</div>
          </div>
          <div style={s.card}>
            <div style={s.cardLabel}>미실현 PnL</div>
            <div style={{ ...s.cardValue, color: balance?.unrealisedPnl >= 0 ? '#00e676' : '#ff5252' }}>
              {balance ? fmt.xbt(balance.unrealisedPnl) : '—'}
            </div>
          </div>
          {position && (
            <div style={s.card}>
              <div style={s.cardLabel}>포지션 ({position.symbol})</div>
              <div style={s.cardValue}>{position.currentQty > 0 ? '🟢 LONG' : position.currentQty < 0 ? '🔴 SHORT' : '없음'}</div>
              <div style={s.cardSub}>수량: {position.currentQty} | 진입가: {fmt.price(position.avgEntryPrice)}</div>
            </div>
          )}
          <div style={s.card}>
            <div style={s.cardLabel}>최근 주문</div>
            {orders.slice(0, 3).map(o => (
              <div key={o.orderID} style={s.orderRow}>
                <span style={{ color: o.side === 'Buy' ? '#00e676' : '#ff5252' }}>{o.side}</span>
                {' '}{o.orderQty} @ {o.ordType === 'Market' ? 'Market' : fmt.price(o.price)}
                {' '}<span style={s.badge}>{o.ordStatus}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 주문 탭 */}
      {tab === '주문' && (
        <div style={s.content}>
          <form onSubmit={placeOrder} style={s.form}>
            <label style={s.label}>심볼</label>
            <select style={s.input} value={orderForm.symbol}
              onChange={e => setOrderForm(f => ({ ...f, symbol: e.target.value }))}>
              <option>XBTUSD</option>
              <option>ETHUSD</option>
              <option>XBTUSDT</option>
            </select>

            <label style={s.label}>방향</label>
            <div style={s.btnRow}>
              {['Buy', 'Sell'].map(side => (
                <button key={side} type="button"
                  style={{ ...s.sideBtn, ...(orderForm.side === side ? (side === 'Buy' ? s.buyActive : s.sellActive) : {}) }}
                  onClick={() => setOrderForm(f => ({ ...f, side }))}>
                  {side === 'Buy' ? '🟢 매수 (Long)' : '🔴 매도 (Short)'}
                </button>
              ))}
            </div>

            <label style={s.label}>주문 타입</label>
            <select style={s.input} value={orderForm.ordType}
              onChange={e => setOrderForm(f => ({ ...f, ordType: e.target.value }))}>
              <option value="Market">Market (시장가)</option>
              <option value="Limit">Limit (지정가)</option>
            </select>

            <label style={s.label}>수량 (계약)</label>
            <input style={s.input} type="number" placeholder="예: 100" value={orderForm.orderQty}
              onChange={e => setOrderForm(f => ({ ...f, orderQty: e.target.value }))} />

            {orderForm.ordType === 'Limit' && (
              <>
                <label style={s.label}>가격 (USD)</label>
                <input style={s.input} type="number" placeholder="예: 65000" value={orderForm.price}
                  onChange={e => setOrderForm(f => ({ ...f, price: e.target.value }))} />
              </>
            )}

            <button style={{ ...s.btn, background: orderForm.side === 'Buy' ? '#00c853' : '#d50000' }}
              type="submit">
              {orderForm.side === 'Buy' ? '🟢 매수 주문' : '🔴 매도 주문'}
            </button>
          </form>
        </div>
      )}

      {/* 포지션 탭 */}
      {tab === '포지션' && (
        <div style={s.content}>
          {position ? (
            <div style={s.card}>
              <div style={s.cardLabel}>{position.symbol}</div>
              <div style={s.cardValue}>
                {position.currentQty > 0 ? '🟢 LONG' : position.currentQty < 0 ? '🔴 SHORT' : '포지션 없음'}
              </div>
              <div style={s.infoGrid}>
                <span>수량</span><span>{position.currentQty}</span>
                <span>진입가</span><span>${fmt.price(position.avgEntryPrice)}</span>
                <span>청산가</span><span>${fmt.price(position.liquidationPrice)}</span>
                <span>미실현PnL</span>
                <span style={{ color: position.unrealisedPnl >= 0 ? '#00e676' : '#ff5252' }}>
                  {fmt.xbt(position.unrealisedPnl)}
                </span>
                <span>레버리지</span><span>{position.leverage}x</span>
              </div>
            </div>
          ) : <p style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>포지션 없음</p>}
        </div>
      )}

      {/* 로그 탭 */}
      {tab === '로그' && (
        <div style={s.content}>
          {logs.map(l => (
            <div key={l.id} style={s.logRow}>
              <span style={{ color: l.side === 'Buy' ? '#00e676' : '#ff5252' }}>{l.side}</span>
              {' '}{l.qty} {l.symbol}
              {' '}<span style={s.badge}>{l.mode}</span>
              {' '}<span style={s.badge}>{l.status}</span>
              <div style={s.logTime}>{l.created_at}</div>
            </div>
          ))}
          {logs.length === 0 && <p style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>거래 기록 없음</p>}
        </div>
      )}

      {/* 설정 탭 */}
      {tab === '설정' && (
        <div style={s.content}>
          <div style={s.card}>
            <div style={s.cardLabel}>계정</div>
            <button style={s.btnDanger} onClick={() => { localStorage.removeItem('token'); setToken(null); }}>
              로그아웃
            </button>
          </div>
          <div style={s.card}>
            <div style={s.cardLabel}>현재 모드</div>
            <div style={s.cardValue}>{mode.toUpperCase()}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// 인라인 스타일 (모바일 최적화 다크 테마)
const s = {
  wrap: { background: '#0a0e1a', minHeight: '100vh', color: '#e0e0e0', fontFamily: 'monospace', maxWidth: 480, margin: '0 auto' },
  loginWrap: { background: '#0a0e1a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loginBox: { background: '#111827', padding: 32, borderRadius: 16, width: 300, border: '1px solid #1e293b' },
  logo: { color: '#f59e0b', fontSize: 22, fontWeight: 'bold', letterSpacing: 2 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #1e293b' },
  modeRow: { display: 'flex', gap: 6, alignItems: 'center' },
  modeBtn: { padding: '4px 10px', borderRadius: 6, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 12 },
  modeBtnActive: { background: '#1e40af', color: '#fff', border: '1px solid #3b82f6' },
  modeBtnReal: { background: '#7f1d1d', color: '#fca5a5', border: '1px solid #ef4444' },
  armBtn: { padding: '4px 10px', borderRadius: 6, border: '1px solid #374151', background: '#1f2937', color: '#6b7280', cursor: 'pointer', fontSize: 12 },
  armBtnOn: { background: '#78350f', color: '#fcd34d', border: '1px solid #f59e0b' },
  tabs: { display: 'flex', borderBottom: '1px solid #1e293b', overflowX: 'auto' },
  tab: { flex: 1, padding: '10px 4px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' },
  tabActive: { color: '#f59e0b', borderBottom: '2px solid #f59e0b' },
  content: { padding: 16 },
  card: { background: '#111827', border: '1px solid #1e293b', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardLabel: { fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  cardValue: { fontSize: 24, fontWeight: 'bold', color: '#f1f5f9' },
  cardSub: { fontSize: 12, color: '#64748b', marginTop: 4 },
  input: { width: '100%', padding: '10px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: 14, marginBottom: 12, boxSizing: 'border-box' },
  btn: { width: '100%', padding: 12, background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, cursor: 'pointer', marginTop: 4 },
  btnDanger: { width: '100%', padding: 10, background: '#7f1d1d', color: '#fca5a5', border: 'none', borderRadius: 8, cursor: 'pointer' },
  btnRow: { display: 'flex', gap: 8, marginBottom: 12 },
  sideBtn: { flex: 1, padding: 10, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#94a3b8', cursor: 'pointer', fontSize: 13 },
  buyActive: { background: '#064e3b', color: '#6ee7b7', border: '1px solid #10b981' },
  sellActive: { background: '#450a0a', color: '#fca5a5', border: '1px solid #ef4444' },
  form: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
  badge: { fontSize: 10, background: '#1e293b', padding: '2px 6px', borderRadius: 4, color: '#94a3b8' },
  orderRow: { fontSize: 13, padding: '4px 0', borderBottom: '1px solid #1e293b' },
  logRow: { background: '#111827', border: '1px solid #1e293b', borderRadius: 8, padding: 10, marginBottom: 8, fontSize: 13 },
  logTime: { fontSize: 10, color: '#475569', marginTop: 4 },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 13, marginTop: 10 },
  toast: { background: '#1e293b', color: '#f59e0b', padding: '8px 16px', fontSize: 13, borderLeft: '3px solid #f59e0b' },
  msg: { color: '#ef4444', fontSize: 13, marginTop: 8 },
};
