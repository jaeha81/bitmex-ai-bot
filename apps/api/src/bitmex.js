import crypto from 'crypto';

/**
 * BitMEX API 서명 생성
 * signature = hex(HMAC_SHA256(secret, verb + path + expires + data))
 */
export function signRequest(secret, verb, path, expires, data = '') {
  const message = verb + path + expires + data;
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

/**
 * BitMEX API 요청 실행
 */
export async function bitmexRequest({ baseUrl, apiKey, apiSecret, method, path, data = null }) {
  const verb = method.toUpperCase();
  const expires = Math.floor(Date.now() / 1000) + 60;
  const body = data ? JSON.stringify(data) : '';
  const signature = signRequest(apiSecret, verb, path, expires, body);

  const url = `${baseUrl}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'api-expires': expires.toString(),
    'api-key': apiKey,
    'api-signature': signature,
  };

  const fetchOpts = { method: verb, headers };
  if (body && verb !== 'GET' && verb !== 'DELETE') {
    fetchOpts.body = body;
  }

  const response = await fetch(url, fetchOpts);
  let parsed;
  try { parsed = await response.json(); }
  catch { parsed = await response.text(); }

  return { status: response.status, ok: response.ok, data: parsed };
}

/**
 * 모드에 따른 BitMEX 설정 반환
 */
export function getBitmexConfig(mode) {
  if (mode === 'real') {
    return {
      baseUrl: process.env.BITMEX_REAL_BASE || 'https://www.bitmex.com',
      apiKey: process.env.BITMEX_REAL_KEY,
      apiSecret: process.env.BITMEX_REAL_SECRET,
    };
  }
  return {
    baseUrl: process.env.BITMEX_PAPER_BASE || 'https://testnet.bitmex.com',
    apiKey: process.env.BITMEX_PAPER_KEY,
    apiSecret: process.env.BITMEX_PAPER_SECRET,
  };
}
