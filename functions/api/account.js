import { auth, deleteUser, deleteUserData, deleteSessionsByUser } from '../../shared/utils.js';

export const onRequestDelete = async ({ request, env }) => {
  const user = await auth(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'noauth' }), { status: 401 });
  }
  await deleteUser(env, user.id);
  await deleteUserData(env, user.id);
  await deleteSessionsByUser(env, user.id);
  return Response.json({ success: true });
};
