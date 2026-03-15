import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';

import authRoutes from './routes/auth.js';
import armRoutes from './routes/arm.js';
import tradingRoutes from './routes/trading.js';

const fastify = Fastify({ logger: true });

// CORS
await fastify.register(cors, { origin: process.env.CORS_ORIGIN || '*' });

// Rate Limit
await fastify.register(rateLimit, { max: 100, timeWindow: '1 minute' });

// JWT
await fastify.register(jwt, { secret: process.env.JWT_SECRET });

// JWT 인증 데코레이터
fastify.decorate('authenticate', async (req, reply) => {
  try { await req.jwtVerify(); }
  catch { reply.status(401).send({ error: '인증 필요' }); }
});

// 라우트 등록
await fastify.register(authRoutes);
await fastify.register(armRoutes);
await fastify.register(tradingRoutes);

// 헬스체크
fastify.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

// 실행
const port = parseInt(process.env.PORT || '8787');
const host = process.env.HOST || '0.0.0.0';

try {
  await fastify.listen({ port, host });
  console.log(`🚀 API 서버 실행 중: http://${host}:${port}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
