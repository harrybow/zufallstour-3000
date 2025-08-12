import { auth, getUser, deleteUser, deleteStations, deleteSessionsForUser } from '../_utils';

export const onRequestDelete = async ({ request, env }: { request: Request; env: any }): Promise<Response> => {
  const user = await auth(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'noauth' }), { status: 401 });
  }
  const existing = await getUser(env, user.id);
  if (existing) {
    await deleteUser(env, existing);
    await deleteStations(env, user.id);
    await deleteSessionsForUser(env, user.id);
  }
  return Response.json({ success: true });
};
