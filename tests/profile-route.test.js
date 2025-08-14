import { describe, it, expect } from 'vitest';
import worker from '../src/worker.js';

function makeEnv() {
  return {
    ASSETS: {
      async fetch(request) {
        const url = new URL(request.url);
        if (url.pathname === '/profile') {
          return new Response('PROFILE', { status: 200, headers: { 'content-type': 'text/html' } });
        }
        if (url.pathname === '/profile.html') {
          return new Response(null, { status: 301, headers: { Location: '/profile' } });
        }
        return new Response(null, { status: 404, headers: { Location: '/' } });
      }
    }
  };
}

describe('profile route handling', () => {
  it('serves profile page for direct profile links', async () => {
    const env = makeEnv();
    const res = await worker.fetch(new Request('https://example.com/profil/foo'), env);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('PROFILE');
  });

  it('handles trailing slash in profile link', async () => {
    const env = makeEnv();
    const res = await worker.fetch(new Request('https://example.com/profil/foo/'), env);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('PROFILE');
  });
});
