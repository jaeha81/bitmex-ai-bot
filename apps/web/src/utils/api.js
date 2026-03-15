const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

async function request(method, path, body, headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  get: (path, headers) => request('GET', path, null, headers),
  post: (path, body, headers) => request('POST', path, body, headers),
  delete: (path, headers) => request('DELETE', path, null, headers),
};
