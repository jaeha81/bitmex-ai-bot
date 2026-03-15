import bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import { getDb } from '../db/connection.js';

export default async function authRoutes(fastify) {

  // POST /auth/login
  fastify.post('/auth/login', async (req, reply) => {
    const { username, password, totp } = req.body;
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) return reply.status(401).send({ error: '인증 실패' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return reply.status(401).send({ error: '인증 실패' });

    if (user.totp_enabled) {
      if (!totp) return reply.status(401).send({ error: 'TOTP 코드 필요', requireTotp: true });
      if (!authenticator.verify({ token: totp, secret: user.totp_secret }))
        return reply.status(401).send({ error: 'TOTP 코드 오류' });
    }

    const token = fastify.jwt.sign(
      { id: user.id, username: user.username, totpEnabled: !!user.totp_enabled },
      { expiresIn: '8h' }
    );
    return { token, user: { id: user.id, username: user.username, totpEnabled: !!user.totp_enabled } };
  });

  // POST /auth/totp/setup  (JWT 필요)
  fastify.post('/auth/totp/setup', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const db = getDb();
    const secret = authenticator.generateSecret();
    db.prepare('UPDATE users SET totp_secret = ? WHERE id = ?').run(secret, req.user.id);
    const otpauth = authenticator.keyuri(req.user.username, 'BitMEX Trader', secret);
    const qr = await qrcode.toDataURL(otpauth);
    return { secret, qr };
  });

  // POST /auth/totp/verify  (JWT 필요)
  fastify.post('/auth/totp/verify', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { token } = req.body;
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!authenticator.verify({ token, secret: user.totp_secret }))
      return reply.status(400).send({ error: 'TOTP 코드 오류' });
    db.prepare('UPDATE users SET totp_enabled = 1 WHERE id = ?').run(req.user.id);
    return { ok: true };
  });
}
