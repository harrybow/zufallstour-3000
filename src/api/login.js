import { getDb, saveDb, parseBody, verifyPassword, randomHex } from '../utils.js';

export async function login(request, env) {
  const { username, password } = await parseBody(request);
  const db = await getDb(env);
  const user = db.users.find(u => u.username === username);
  if (!user || !(await verifyPassword(password, user.password))) {
    return new Response(JSON.stringify({ error: 'invalid' }), { status: 401 });
  }
  const token = randomHex(24);
  db.sessions[token] = user.id;
  await saveDb(env, db);
  return Response.json({ token });
}
