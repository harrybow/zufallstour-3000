import { parseBody, auth, getStations, saveStations } from '../_utils';

export const onRequestGet = async ({ request, env }: { request: Request; env: any }): Promise<Response> => {
  const user = await auth(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'noauth' }), { status: 401 });
  }
  const data = await getStations(env, user.id);
  return Response.json({ data: data || null });
};

export const onRequestPost = async ({ request, env }: { request: Request; env: any }): Promise<Response> => {
  const user = await auth(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'noauth' }), { status: 401 });
  }
  const { data } = await parseBody(request);
  await saveStations(env, user.id, data);
  return Response.json({ success: true });
};
