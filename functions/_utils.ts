export interface User {
  id: string;
  username: string;
  password: string;
}

export async function getUser(env: any, id: string): Promise<User | null>{
  const data = await env.DB.get(`user:${id}`);
  return data ? JSON.parse(data) as User : null;
}

export async function getUserByUsername(env: any, username: string): Promise<User | null>{
  const id = await env.DB.get(`username:${username}`);
  return id ? await getUser(env, id) : null;
}

export async function saveUser(env: any, user: User): Promise<void>{
  await env.DB.put(`user:${user.id}`, JSON.stringify(user));
  await env.DB.put(`username:${user.username}`, user.id);
}

export async function deleteUser(env: any, user: User): Promise<void>{
  await env.DB.delete(`user:${user.id}`);
  await env.DB.delete(`username:${user.username}`);
}

export async function getStations(env: any, userId: string): Promise<any>{
  const data = await env.DB.get(`data:${userId}`);
  return data ? JSON.parse(data) : null;
}

export async function saveStations(env: any, userId: string, stations: any): Promise<void>{
  await env.DB.put(`data:${userId}`, JSON.stringify(stations));
}

export async function deleteStations(env: any, userId: string): Promise<void>{
  await env.DB.delete(`data:${userId}`);
}

export async function saveSession(env: any, token: string, userId: string): Promise<void>{
  await env.DB.put(`session:${token}`, String(userId));
}

export async function deleteSession(env: any, token: string): Promise<void>{
  await env.DB.delete(`session:${token}`);
}

export async function deleteSessionsForUser(env: any, userId: string): Promise<void>{
  const list = await env.DB.list({ prefix: 'session:' });
  await Promise.all(list.keys.map(async k => {
    const uid = await env.DB.get(k.name);
    if (uid === String(userId)) await env.DB.delete(k.name);
  }));
}

export async function parseBody(request: Request): Promise<any>{
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function hashPassword(password: string): Promise<string>{
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const data = new TextEncoder().encode(saltHex + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean>{
  const [saltHex, hashHex] = stored.split(':');
  const data = new TextEncoder().encode(saltHex + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const computed = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === computed;
}

export async function auth(request: Request, env: any): Promise<{ id: string } | null>{
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const token = authHeader.split(' ')[1];
  const uid = await env.DB.get(`session:${token}`);
  return uid ? { id: uid } : null;
}

export function randomHex(bytes: number): string{
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}
