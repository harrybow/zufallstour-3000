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

export function randomHex(bytes){
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function initDb(db){
  await db.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER);
CREATE TABLE IF NOT EXISTS user_data (user_id INTEGER PRIMARY KEY, data TEXT);`);
}

export async function getUserByUsername(env, username){
  return await env.DB.prepare('SELECT id, username, password FROM users WHERE username = ?').bind(username).first();
}

export async function addUser(env, username, password){
  await env.DB.prepare('INSERT INTO users (username, password) VALUES (?, ?)').bind(username, password).run();
}

export async function getUserById(env, id){
  return await env.DB.prepare('SELECT id, username, password FROM users WHERE id = ?').bind(id).first();
}

export async function updateUserPassword(env, id, password){
  await env.DB.prepare('UPDATE users SET password = ? WHERE id = ?').bind(password, id).run();
}

export async function createSession(env, token, userId){
  await env.DB.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').bind(token, userId).run();
}

export async function getUserIdByToken(env, token){
  const row = await env.DB.prepare('SELECT user_id FROM sessions WHERE token = ?').bind(token).first();
  return row ? row.user_id : null;
}

export async function deleteSession(env, token){
  await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
}

export async function deleteSessionsByUser(env, userId){
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
}

export async function setUserData(env, userId, data){
  await env.DB.prepare('INSERT OR REPLACE INTO user_data (user_id, data) VALUES (?, ?)').bind(userId, JSON.stringify(data)).run();
}

export async function getUserData(env, userId){
  const row = await env.DB.prepare('SELECT data FROM user_data WHERE user_id = ?').bind(userId).first();
  return row ? JSON.parse(row.data) : null;
}

export async function deleteUserData(env, userId){
  await env.DB.prepare('DELETE FROM user_data WHERE user_id = ?').bind(userId).run();
}

export async function deleteUser(env, userId){
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
}

export async function auth(request, env){
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const token = authHeader.split(' ')[1];
  const uid = await getUserIdByToken(env, token);
  return uid ? { id: uid } : null;
}
