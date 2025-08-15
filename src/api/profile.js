import { getDb } from '../../shared/utils.js';

export async function profileGet(request, env, username) {
  const db = await getDb(env);
  const user = db.users.find(u => u.username === username);
  if (!user) {
    return new Response(JSON.stringify({ error: 'notfound' }), { status: 404 });
  }
  return Response.json({ username: user.username, data: db.data[user.id] || null });
}
