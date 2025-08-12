import { parseBody, verifyPassword, randomHex, getUserByUsername, saveSession } from '../utils.js';

export async function login(request, env) {
  const { username, password } = await parseBody(request);
  const user = await getUserByUsername(env, username);
  if (!user || !(await verifyPassword(password, user.password))) {
    return new Response(JSON.stringify({ error: 'invalid' }), { status: 401 });
  }
  const token = randomHex(24);
  await saveSession(env, token, user.id);
  return Response.json({ token });
}
