import { parseBody, auth, hashPassword, verifyPassword, getUser, saveUser } from '../utils.js';

export async function password(request, env) {
  const user = await auth(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'noauth' }), { status: 401 });
  }
  const { oldPassword, newPassword } = await parseBody(request);
  if (!oldPassword || !newPassword) {
    return new Response(JSON.stringify({ error: 'missing' }), { status: 400 });
  }
  const u = await getUser(env, user.id);
  if (!u || !(await verifyPassword(oldPassword, u.password))) {
    return new Response(JSON.stringify({ error: 'invalid' }), { status: 400 });
  }
  u.password = await hashPassword(newPassword);
  await saveUser(env, u);
  return Response.json({ success: true });
}
