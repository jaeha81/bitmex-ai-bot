import { bitmexRequest, getBitmexConfig } from '../bitmex.js';
import { getDb } from '../db/connection.js';

export default async function tradingRoutes(fastify) {

  // 모드 결정 헬퍼
  function getMode(req) {
    return req.headers['x-trading-mode'] === 'real' ? 'real' : 'paper';
  }

  // GET /trading/balance
  fastify.get('/trading/balance', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const mode = getMode(req);
    const cfg = getBitmexConfig(mode);
    const res = await bitmexRequest({ ...cfg, method: 'GET', path: '/api/v1/user/margin?currency=XBt' });
    return { mode, data: res.data };
  });

  // GET /trading/position
  fastify.get('/trading/position', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const mode = getMode(req);
    const cfg = getBitmexConfig(mode);
    const symbol = req.query.symbol || 'XBTUSD';
    const res = await bitmexRequest({ ...cfg, method: 'GET', path: `/api/v1/position?filter={"symbol":"${symbol}"}` });
    return { mode, data: res.data };
  });

  // GET /trading/orderbook
  fastify.get('/trading/orderbook', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const mode = getMode(req);
    const cfg = getBitmexConfig(mode);
    const symbol = req.query.symbol || 'XBTUSD';
    const res = await bitmexRequest({ ...cfg, method: 'GET', path: `/api/v1/orderBook/L2?symbol=${symbol}&depth=10` });
    return { mode, data: res.data };
  });

  // GET /trading/orders
  fastify.get('/trading/orders', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const mode = getMode(req);
    const cfg = getBitmexConfig(mode);
    const symbol = req.query.symbol || 'XBTUSD';
    const res = await bitmexRequest({ ...cfg, method: 'GET', path: `/api/v1/order?symbol=${symbol}&reverse=true&count=20` });
    return { mode, data: res.data };
  });

  // POST /trading/order — 주문 생성
  fastify.post('/trading/order', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const mode = getMode(req);

    // REAL 모드: ARM 확인
    if (mode === 'real') {
      if (!fastify.armState?.active) {
        return reply.status(403).send({ error: 'REAL 주문은 ARM 활성화 필요' });
      }
    }

    const cfg = getBitmexConfig(mode);
    const { symbol = 'XBTUSD', side, orderQty, ordType = 'Market', price } = req.body;

    const orderData = { symbol, side, orderQty, ordType };
    if (ordType === 'Limit' && price) orderData.price = price;

    const res = await bitmexRequest({ ...cfg, method: 'POST', path: '/api/v1/order', data: orderData });

    // DB 기록
    const db = getDb();
    db.prepare(`
      INSERT INTO trade_logs (mode, symbol, side, order_type, qty, price, order_id, status, raw_response)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(mode, symbol, side, ordType, orderQty, price || null,
      res.data?.orderID || null, res.data?.ordStatus || null, JSON.stringify(res.data));

    return { mode, ok: res.ok, status: res.status, data: res.data };
  });

  // DELETE /trading/order/:orderID — 주문 취소
  fastify.delete('/trading/order/:orderID', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const mode = getMode(req);
    const cfg = getBitmexConfig(mode);
    const res = await bitmexRequest({
      ...cfg, method: 'DELETE', path: '/api/v1/order',
      data: { orderID: req.params.orderID }
    });
    return { mode, ok: res.ok, data: res.data };
  });

  // GET /trading/logs — DB 거래 기록
  fastify.get('/trading/logs', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const db = getDb();
    const logs = db.prepare('SELECT * FROM trade_logs ORDER BY created_at DESC LIMIT 50').all();
    return { logs };
  });
}
