// ARM(Armed Mode) — REAL 주문 활성화 (30분 자동 해제)
const armState = { active: false, activatedAt: null, timer: null };

export default async function armRoutes(fastify) {

  // POST /arm/activate  (JWT 필요)
  fastify.post('/arm/activate', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    if (armState.timer) clearTimeout(armState.timer);
    armState.active = true;
    armState.activatedAt = new Date().toISOString();
    armState.timer = setTimeout(() => {
      armState.active = false;
      armState.activatedAt = null;
      armState.timer = null;
    }, 30 * 60 * 1000); // 30분
    return { armed: true, activatedAt: armState.activatedAt, expiresIn: '30분' };
  });

  // POST /arm/deactivate
  fastify.post('/arm/deactivate', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    if (armState.timer) clearTimeout(armState.timer);
    armState.active = false;
    armState.activatedAt = null;
    armState.timer = null;
    return { armed: false };
  });

  // GET /arm/status
  fastify.get('/arm/status', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    return { armed: armState.active, activatedAt: armState.activatedAt };
  });

  // ARM 상태 공유 (trading.js에서 참조)
  fastify.decorate('armState', armState);
}
