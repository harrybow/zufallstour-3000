import { describe, it, expect } from 'vitest';
import worker from '../src/worker.js';

describe('worker routing', () => {
  it('serves index.html for profile paths instead of redirecting', async () => {
    const env = {
      ASSETS: {
        fetch: (req) => {
          const url = new URL(req.url);
          if (url.pathname === '/profile/Dens') {
            return Promise.resolve(new Response(null, { status: 301, headers: { Location: '/' } }));
          }
          if (url.pathname === '/index.html') {
            return Promise.resolve(new Response('index', { status: 200 }));
          }
          return Promise.resolve(new Response(null, { status: 404 }));
        }
      }
    };

    const res = await worker.fetch(new Request('https://example.com/profile/Dens'), env);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('index');
  });
});
