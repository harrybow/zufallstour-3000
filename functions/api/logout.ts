import { getDb, saveDb } from '../_utils';

export const onRequestPost = async ({ request, env }: { request: Request; env: any }): Promise<Response> => {
  const db = await getDb(env);
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    delete db.sessions[token];
    await saveDb(env, db);
  }
  return Response.json({ success: true });
};
