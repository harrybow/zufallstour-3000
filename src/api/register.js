import { getDb, saveDb, parseBody, hashPassword } from '../../shared/utils.js';

export async function register(request, env) {
  const { username, password } = await parseBody(request);
  if (!username || !password) {
    return new Response(JSON.stringify({ error: 'missing' }), { status: 400 });
  }
  const db = await getDb(env);
  if (db.users.find(u => u.username === username)) {
    return new Response(JSON.stringify({ error: 'exists' }), { status: 400 });
  }
  const id = db.users.length ? Math.max(...db.users.map(u => u.id)) + 1 : 1;
  db.users.push({ id, username, password: await hashPassword(password) });
  await saveDb(env, db);
  return Response.json({ success: true });
}
