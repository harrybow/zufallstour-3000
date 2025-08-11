import { login } from './api/login.js';
import { register } from './api/register.js';
import { logout } from './api/logout.js';
import { password } from './api/password.js';
import { accountDelete } from './api/account.js';
import { dataGet, dataPost } from './api/data.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    if (pathname === '/api/login' && request.method === 'POST') {
      return login(request, env);
    }
    if (pathname === '/api/register' && request.method === 'POST') {
      return register(request, env);
    }
    if (pathname === '/api/logout' && request.method === 'POST') {
      return logout(request, env);
    }
    if (pathname === '/api/password' && request.method === 'POST') {
      return password(request, env);
    }
    if (pathname === '/api/account' && request.method === 'DELETE') {
      return accountDelete(request, env);
    }
    if (pathname === '/api/data' && request.method === 'GET') {
      return dataGet(request, env);
    }
    if (pathname === '/api/data' && request.method === 'POST') {
      return dataPost(request, env);
    }
    return env.ASSETS.fetch(request);
  }
};
