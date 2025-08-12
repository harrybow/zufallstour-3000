import { deleteSession } from '../utils.js';

export async function logout(request, env) {
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    await deleteSession(env, token);
  }
  return Response.json({ success: true });
}
