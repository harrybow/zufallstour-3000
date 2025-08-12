export default {
  async fetch(request, env) {
    const legacy = await env.DB.get('db');
    if (!legacy) {
      return new Response('no legacy db', { status: 404 });
    }
    const { users = [], data = {}, sessions = {} } = JSON.parse(legacy);
    for (const user of users) {
      await env.DB.put(`user:${user.id}`, JSON.stringify(user));
      await env.DB.put(`username:${user.username}`, String(user.id));
      if (data[user.id] !== undefined) {
        await env.DB.put(`data:${user.id}`, JSON.stringify(data[user.id]));
      }
    }
    for (const [token, uid] of Object.entries(sessions)) {
      await env.DB.put(`session:${token}`, String(uid));
    }
    await env.DB.delete('db');
    return new Response('migration complete');
  }
};

