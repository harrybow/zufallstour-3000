import { getUserByUsername, getStations } from '../../_utils';

export const onRequestGet = async ({ env, params }: { env: any; params: { username: string } }): Promise<Response> => {
  const user = await getUserByUsername(env, params.username);
  if (!user) {
    return new Response(JSON.stringify({ error: 'notfound' }), { status: 404 });
  }
  const data = await getStations(env, user.id);
  return Response.json({ username: user.username, data: data || null });
};
