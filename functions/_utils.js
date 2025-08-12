export async function getDb(env){
  const data = await env.DB.get('db');
  return data ? JSON.parse(data) : { users: [], data: {}, sessions: {} };
}

export async function saveDb(env, db){
  await env.DB.put('db', JSON.stringify(db));
}

export async function parseBody(request){
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function hashPassword(password){
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const data = new TextEncoder().encode(saltHex + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}`;
}

export async function verifyPassword(password, stored){
  const [saltHex, hashHex] = stored.split(':');
  const data = new TextEncoder().encode(saltHex + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const computed = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === computed;
}

export function auth(request, db){
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const token = authHeader.split(' ')[1];
  const uid = db.sessions[token];
  return uid ? { id: uid } : null;
}

export function randomHex(bytes){
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}
