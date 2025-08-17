import { describe, it, expect, beforeEach } from 'vitest';
import { onRequestPost as register } from '../functions/api/register.js';
import { onRequestPost as login } from '../functions/api/login.js';
import { onRequestPost as password } from '../functions/api/password.js';
import { initDb } from '../shared/utils.js';
import { createD1 } from './d1-mock.js';

function makeEnv(){
  return { DB: createD1() };
}

function makeRequest(url, method, body, token){
  return new Request(`http://localhost${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

let env;

beforeEach(async () => {
  env = makeEnv();
  await initDb(env.DB);
});

describe('password change', () => {
  it('changes password and rejects old password', async () => {
    let res = await register({ request: makeRequest('/api/register', 'POST', { username: 'alice', password: 'oldpw' }), env });
    expect(res.status).toBe(200);

    res = await login({ request: makeRequest('/api/login', 'POST', { username: 'alice', password: 'oldpw' }), env });
    expect(res.status).toBe(200);
    const { token } = await res.json();

    res = await password({ request: makeRequest('/api/password', 'POST', { oldPassword: 'oldpw', newPassword: 'newpw' }, token), env });
    expect(res.status).toBe(200);

    res = await login({ request: makeRequest('/api/login', 'POST', { username: 'alice', password: 'newpw' }), env });
    expect(res.status).toBe(200);

    res = await login({ request: makeRequest('/api/login', 'POST', { username: 'alice', password: 'oldpw' }), env });
    expect(res.status).toBe(401);
  });
});
