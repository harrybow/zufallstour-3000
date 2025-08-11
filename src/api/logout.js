import { getDb, saveDb } from '../utils.js';

export async function logout(request, env) {
  const db = await getDb(env);
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    delete db.sessions[token];
    await saveDb(env, db);
  }
  return Response.json({ success: true });
}
