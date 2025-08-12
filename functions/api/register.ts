import { parseBody, hashPassword, getUserByUsername, saveUser, randomHex } from '../_utils';

export const onRequestPost = async ({ request, env }: { request: Request; env: any }): Promise<Response> => {
  const { username, password } = await parseBody(request);
  if (!username || !password) {
    return new Response(JSON.stringify({ error: 'missing' }), { status: 400 });
  }
  const existing = await getUserByUsername(env, username);
  if (existing) {
    return new Response(JSON.stringify({ error: 'exists' }), { status: 400 });
  }
  const id = randomHex(8);
  await saveUser(env, { id, username, password: await hashPassword(password) });
  return Response.json({ success: true });
};
