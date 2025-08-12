import { parseBody, verifyPassword, randomHex, getUserByUsername, saveSession } from '../_utils';

export const onRequestPost = async ({ request, env }: { request: Request; env: any }): Promise<Response> => {
  const { username, password } = await parseBody(request);
  const user = await getUserByUsername(env, username);
  if (!user || !(await verifyPassword(password, user.password))) {
    return new Response(JSON.stringify({ error: 'invalid' }), { status: 401 });
  }
  const token = randomHex(24);
  await saveSession(env, token, user.id);
  return Response.json({ token });
};
