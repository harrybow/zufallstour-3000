
export async function getUser(env, id){
  const data = await env.DB.get(`user:${id}`);
  return data ? JSON.parse(data) : null;
}

export async function getUserByUsername(env, username){
  const id = await env.DB.get(`username:${username}`);
  return id ? await getUser(env, id) : null;
}

export async function saveUser(env, user){
  await env.DB.put(`user:${user.id}`, JSON.stringify(user));
  await env.DB.put(`username:${user.username}`, user.id);
}

export async function deleteUser(env, user){
  await env.DB.delete(`user:${user.id}`);
  await env.DB.delete(`username:${user.username}`);
}

export async function getStations(env, userId){
  const data = await env.DB.get(`data:${userId}`);
  return data ? JSON.parse(data) : null;
}

export async function saveStations(env, userId, stations){
  await env.DB.put(`data:${userId}`, JSON.stringify(stations));
}

export async function deleteStations(env, userId){
  await env.DB.delete(`data:${userId}`);
}

export async function saveSession(env, token, userId){
  await env.DB.put(`session:${token}`, String(userId));
}

export async function deleteSession(env, token){
  await env.DB.delete(`session:${token}`);
}

export async function deleteSessionsForUser(env, userId){
  const list = await env.DB.list({ prefix: 'session:' });
  await Promise.all(list.keys.map(async k => {
    const uid = await env.DB.get(k.name);
    if (uid === String(userId)) await env.DB.delete(k.name);
  }));
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

export async function auth(request, env){
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const token = authHeader.split(' ')[1];
  const uid = await env.DB.get(`session:${token}`);
  return uid ? { id: uid } : null;
}

export function randomHex(bytes){
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}
