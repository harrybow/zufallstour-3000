import { getUserByUsername, getUserData } from '../../../shared/utils.js';

export const onRequestGet = async ({ env, params }) => {
  const user = await getUserByUsername(env, params.username);
  if (!user) {
    return new Response(JSON.stringify({ error: 'notfound' }), { status: 404 });
  }
  return Response.json({ username: user.username, data: await getUserData(env, user.id) });
};
