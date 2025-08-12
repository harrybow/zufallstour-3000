import { deleteSession } from '../_utils';

export const onRequestPost = async ({ request, env }: { request: Request; env: any }): Promise<Response> => {
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    await deleteSession(env, token);
  }
  return Response.json({ success: true });
};
