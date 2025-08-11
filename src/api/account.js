import { getDb, saveDb, auth } from '../utils.js';

export async function accountDelete(request, env) {
  const db = await getDb(env);
  const user = auth(request, db);
  if (!user) {
    return new Response(JSON.stringify({ error: 'noauth' }), { status: 401 });
  }
  db.users = db.users.filter(u => u.id !== user.id);
  delete db.data[user.id];
  for (const [t, uid] of Object.entries(db.sessions)) {
    if (uid === user.id) delete db.sessions[t];
  }
  await saveDb(env, db);
  return Response.json({ success: true });
}
