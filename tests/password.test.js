/* eslint-env node */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import process from 'node:process';

let server;
let base;

beforeAll(async () => {
  process.env.PORT = 0;
  server = (await import('../server/index.js')).default;
  await new Promise(res => server.on('listening', res));
  const addr = server.address();
  base = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  await new Promise(res => server.close(res));
});

describe('password change', () => {
  it('changes password and rejects old password', async () => {
    let res = await fetch(`${base}/api/register`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:'alice', password:'oldpw'})});
    expect(res.status).toBe(200);
    res = await fetch(`${base}/api/login`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:'alice', password:'oldpw'})});
    expect(res.status).toBe(200);
    const { token } = await res.json();
    res = await fetch(`${base}/api/password`, {method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}, body: JSON.stringify({oldPassword:'oldpw', newPassword:'newpw'})});
    expect(res.status).toBe(200);
    res = await fetch(`${base}/api/login`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:'alice', password:'newpw'})});
    expect(res.status).toBe(200);
    res = await fetch(`${base}/api/login`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:'alice', password:'oldpw'})});
    expect(res.status).toBe(401);
  });
});
