import { getDb, saveDb, parseBody, auth } from '../utils.js';

export async function dataGet(request, env) {
  const db = await getDb(env);
  const user = auth(request, db);
  if (!user) {
    return new Response(JSON.stringify({ error: 'noauth' }), { status: 401 });
  }
  return Response.json({ data: db.data[user.id] || null });
}

export async function dataPost(request, env) {
  const db = await getDb(env);
  const user = auth(request, db);
  if (!user) {
    return new Response(JSON.stringify({ error: 'noauth' }), { status: 401 });
  }
  const { data } = await parseBody(request);
  db.data[user.id] = data;
  await saveDb(env, db);
  return Response.json({ success: true });
}
