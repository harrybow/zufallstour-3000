import { getDb, saveDb, parseBody, auth, hashPassword, verifyPassword } from '../../shared/utils.js';

export async function password(request, env) {
  const db = await getDb(env);
  const user = auth(request, db);
  if (!user) {
    return new Response(JSON.stringify({ error: 'noauth' }), { status: 401 });
  }
  const { oldPassword, newPassword } = await parseBody(request);
  if (!oldPassword || !newPassword) {
    return new Response(JSON.stringify({ error: 'missing' }), { status: 400 });
  }
  const u = db.users.find(u => u.id === user.id);
  if (!u || !(await verifyPassword(oldPassword, u.password))) {
    return new Response(JSON.stringify({ error: 'invalid' }), { status: 400 });
  }
  u.password = await hashPassword(newPassword);
  await saveDb(env, db);
  return Response.json({ success: true });
}
