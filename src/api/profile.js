import { getUserByUsername, getUserData } from '../../shared/utils.js';

export async function profileGet(request, env, username) {
  const user = await getUserByUsername(env, username);
  if (!user) {
    return new Response(JSON.stringify({ error: 'notfound' }), { status: 404 });
  }
  return Response.json({ username: user.username, data: await getUserData(env, user.id) });
}
