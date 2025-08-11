import { describe, it, expect, beforeEach } from 'vitest';
import * as register from '../functions/api/register.js';
import * as login from '../functions/api/login.js';
import * as password from '../functions/api/password.js';

function makeEnv(){
  const store = {};
  return {
    DB: {
      async get(key){ return store[key] || null; },
      async put(key, val){ store[key] = val; }
    }
  };
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

beforeEach(() => {
  env = makeEnv();
});

describe('password change', () => {
  it('changes password and rejects old password', async () => {
    let res = await register(makeRequest('/api/register', 'POST', { username: 'alice', password: 'oldpw' }), env);
    expect(res.status).toBe(200);

    res = await login(makeRequest('/api/login', 'POST', { username: 'alice', password: 'oldpw' }), env);
    expect(res.status).toBe(200);
    const { token } = await res.json();

    res = await password(makeRequest('/api/password', 'POST', { oldPassword: 'oldpw', newPassword: 'newpw' }, token), env);
    expect(res.status).toBe(200);

    res = await login(makeRequest('/api/login', 'POST', { username: 'alice', password: 'newpw' }), env);
    expect(res.status).toBe(200);

    res = await login(makeRequest('/api/login', 'POST', { username: 'alice', password: 'oldpw' }), env);
    expect(res.status).toBe(401);
  });
});
