import { getDb } from '../../_utils';

export const onRequestGet = async ({ env, params }: { env: any; params: { username: string } }): Promise<Response> => {
  const db = await getDb(env);
  const user = db.users.find(u => u.username === params.username);
  if (!user) {
    return new Response(JSON.stringify({ error: 'notfound' }), { status: 404 });
  }
  return Response.json({ username: user.username, data: db.data[user.id] || null });
};
