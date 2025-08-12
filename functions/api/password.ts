import { parseBody, auth, hashPassword, verifyPassword, getUser, saveUser } from '../_utils';

export const onRequestPost = async ({ request, env }: { request: Request; env: any }): Promise<Response> => {
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
};
