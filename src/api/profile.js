import { getUserByUsername, getStations } from '../utils.js';

export async function profileGet(request, env, username) {
  const user = await getUserByUsername(env, username);
  if (!user) {
    return new Response(JSON.stringify({ error: 'notfound' }), { status: 404 });
  }
  const data = await getStations(env, user.id);
  return Response.json({ username: user.username, data: data || null });
}
