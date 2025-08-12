import { getDb, saveDb, parseBody, auth } from '../_utils';

export const onRequestGet = async ({ request, env }: { request: Request; env: any }): Promise<Response> => {
  const db = await getDb(env);
  const user = auth(request, db);
  if (!user) {
    return new Response(JSON.stringify({ error: 'noauth' }), { status: 401 });
  }
  return Response.json({ data: db.data[user.id] || null });
};

export const onRequestPost = async ({ request, env }: { request: Request; env: any }): Promise<Response> => {
  const db = await getDb(env);
  const user = auth(request, db);
  if (!user) {
    return new Response(JSON.stringify({ error: 'noauth' }), { status: 401 });
  }
  const { data } = await parseBody(request);
  db.data[user.id] = data;
  await saveDb(env, db);
  return Response.json({ success: true });
};
