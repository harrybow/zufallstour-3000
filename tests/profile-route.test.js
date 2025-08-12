import { describe, it, expect } from 'vitest';
import worker from '../src/worker';

function makeEnv(status = 301) {
  return {
    ASSETS: {
      async fetch(request) {
        const url = new URL(request.url);
        if (url.pathname === '/index.html') {
          return new Response('INDEX', { status: 200, headers: { 'content-type': 'text/html' } });
        }
        return new Response(null, { status, headers: { Location: '/' } });
      }
    }
  };
}

describe('profile route handling', () => {
  it('serves index.html for direct profile links', async () => {
    const env = makeEnv();
    const res = await worker.fetch(new Request('https://example.com/profile/foo'), env);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('INDEX');
  });

  it('handles trailing slash in profile link', async () => {
    const env = makeEnv();
    const res = await worker.fetch(new Request('https://example.com/profile/foo/'), env);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('INDEX');
  });
});
