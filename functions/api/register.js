import { parseBody, hashPassword, getUserByUsername, addUser } from '../../shared/utils.js';

export const onRequestPost = async ({ request, env }) => {
  const { username, password } = await parseBody(request);
  if (!username || !password) {
    return new Response(JSON.stringify({ error: 'missing' }), { status: 400 });
  }
  const existing = await getUserByUsername(env, username);
  if (existing) {
    return new Response(JSON.stringify({ error: 'exists' }), { status: 400 });
  }
  await addUser(env, username, await hashPassword(password));
  return Response.json({ success: true });
};
