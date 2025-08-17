import { login } from './api/login.js';
import { register } from './api/register.js';
import { logout } from './api/logout.js';
import { password } from './api/password.js';
import { accountDelete } from './api/account.js';
import { dataGet, dataPost } from './api/data.js';
import { profileGet } from './api/profile.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    // ---- konkrete API-Routen (deine bestehende Logik) ----
    if (pathname === '/api/login'    && request.method === 'POST') return login(request, env);
    if (pathname === '/api/register' && request.method === 'POST') return register(request, env);
    if (pathname === '/api/logout'   && request.method === 'POST') return logout(request, env);
    if (pathname === '/api/password' && request.method === 'POST') return password(request, env);
    if (pathname === '/api/account'  && request.method === 'DELETE') return accountDelete(request, env);
    if (pathname === '/api/data'     && request.method === 'GET')  return dataGet(request, env);
    if (pathname === '/api/data'     && request.method === 'POST') return dataPost(request, env);

    // zuerst die spezielle /api/profile-Route prüfen
    const profileMatch = pathname.match(/^\/api\/profile\/(.+)$/);
    if (profileMatch && request.method === 'GET') {
      return profileGet(request, env, decodeURIComponent(profileMatch[1]));
    }

    // optionale Zusatz-API (health/db). Gibt null zurück, wenn nicht zutreffend.
    const extra = await handleApi(request, env);
    if (extra) return extra;

    // ---- Statische Assets + SPA-Fallback ----
    if (request.method === 'GET' && !pathname.startsWith('/api/')) {
      // Serve the dedicated profile SPA for direct links
      if (pathname.startsWith('/profil/') || pathname.startsWith('/profile/')) {
        // Fetch the clean-URL version to avoid redirects to /profile
        return env.ASSETS.fetch(new Request(`${url.origin}/profile`, request));

      }
      const asset = await env.ASSETS.fetch(request);
      if (asset.status === 404) {
        // SPA-Fallback auf index.html
        return env.ASSETS.fetch(new Request(`${url.origin}/index.html`, request));
      }
      return asset;
    }

    return new Response('Not found', { status: 404 });
  }
};

// außerhalb des Objekt-Literals definieren
async function handleApi(request, env) {
  const url = new URL(request.url);

  if (url.pathname === '/api/health' && request.method === 'GET') {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' }
    });
  }

  if (url.pathname === '/api/db' && request.method === 'GET') {
    const users = (await env.DB.prepare('SELECT id, username FROM users').all()).results;
    const dataRows = (await env.DB.prepare('SELECT user_id, data FROM user_data').all()).results;
    const sessionRows = (await env.DB.prepare('SELECT token, user_id FROM sessions').all()).results;
    const data = Object.fromEntries(dataRows.map(r => [r.user_id, JSON.parse(r.data)]));
    const sessions = Object.fromEntries(sessionRows.map(r => [r.token, r.user_id]));
    return new Response(JSON.stringify({ users, data, sessions }), { headers: { 'content-type': 'application/json' } });
  }

  if (url.pathname === '/api/db' && request.method === 'PUT') {
    const body = await request.text();
    await env.DB.exec(body);
    return new Response(null, { status: 204 });
  }

  // nichts davon? -> Signal an fetch(), dass es weiter prüfen soll
  return null;
}
