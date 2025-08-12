import { describe, it, expect, beforeEach } from 'vitest';
import { onRequestPost as register } from '../functions/api/register.js';
import { onRequestPost as login } from '../functions/api/login.js';
import { onRequestPost as dataPost } from '../functions/api/data.js';
import { onRequestGet as profileGet } from '../functions/api/profile/[username].js';

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

describe('profile endpoint', () => {
  it('returns stored station data for a username', async () => {
    let res = await register({ request: makeRequest('/api/register', 'POST', { username: 'bob', password: 'pw' }), env });
    expect(res.status).toBe(200);

    res = await login({ request: makeRequest('/api/login', 'POST', { username: 'bob', password: 'pw' }), env });
    const { token } = await res.json();

    const sampleData = [{ id:'1', name:'A', types:['S'], visits:[{ date:'2024-01-01' }] }];
    res = await dataPost({ request: makeRequest('/api/data', 'POST', { data: sampleData }, token), env });
    expect(res.status).toBe(200);

    res = await profileGet({ env, params: { username: 'bob' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.username).toBe('bob');
    expect(body.data).toEqual(sampleData);
  });

  it('returns 404 for an unknown username', async () => {
    const res = await profileGet({ env, params: { username: 'alice' } });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('notfound');
  });
});
