import { parseBody, auth, getUserData, setUserData } from '../../shared/utils.js';

export const onRequestGet = async ({ request, env }) => {
  const user = await auth(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'noauth' }), { status: 401 });
  }
  return Response.json({ data: await getUserData(env, user.id) });
};

export const onRequestPost = async ({ request, env }) => {
  const user = await auth(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'noauth' }), { status: 401 });
  }
  const { data } = await parseBody(request);
  await setUserData(env, user.id, data);
  return Response.json({ success: true });
};
