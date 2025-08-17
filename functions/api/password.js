import { parseBody, auth, hashPassword, verifyPassword, getUserById, updateUserPassword } from '../../shared/utils.js';

export const onRequestPost = async ({ request, env }) => {
  const user = await auth(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'noauth' }), { status: 401 });
  }
  const { oldPassword, newPassword } = await parseBody(request);
  if (!oldPassword || !newPassword) {
    return new Response(JSON.stringify({ error: 'missing' }), { status: 400 });
  }
  const u = await getUserById(env, user.id);
  if (!u || !(await verifyPassword(oldPassword, u.password))) {
    return new Response(JSON.stringify({ error: 'invalid' }), { status: 400 });
  }
  await updateUserPassword(env, user.id, await hashPassword(newPassword));
  return Response.json({ success: true });
};
