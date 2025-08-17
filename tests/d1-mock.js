export function createD1(){
  const state = { users: [], sessions: [], user_data: [], lastId: 0 };
  return {
    async exec(){ /* no-op for schema creation */ },
    prepare(sql){
      const stmt = {
        sql,
        params: [],
        bind(...args){ this.params = args; return this; },
        async first(){ const r = runAll(sql, this.params, state); return r[0] || null; },
        async run(){ runAll(sql, this.params, state); return { success: true }; },
        async all(){ return { results: runAll(sql, this.params, state) }; }
      };
      return stmt;
    }
  };
}

function runAll(sql, params, state){
  switch(sql){
    case 'SELECT id, username, password FROM users WHERE username = ?':
      return state.users.filter(u => u.username === params[0]);
    case 'INSERT INTO users (username, password) VALUES (?, ?)': {
      const id = ++state.lastId;
      state.users.push({ id, username: params[0], password: params[1] });
      return [];
    }
    case 'SELECT id, username, password FROM users WHERE id = ?':
      return state.users.filter(u => u.id === params[0]);
    case 'UPDATE users SET password = ? WHERE id = ?': {
      const u = state.users.find(u => u.id === params[1]);
      if (u) u.password = params[0];
      return [];
    }
    case 'INSERT INTO sessions (token, user_id) VALUES (?, ?)': {
      state.sessions.push({ token: params[0], user_id: params[1] });
      return [];
    }
    case 'SELECT user_id FROM sessions WHERE token = ?':
      return state.sessions.filter(s => s.token === params[0]).map(s => ({ user_id: s.user_id }));
    case 'DELETE FROM sessions WHERE token = ?':
      state.sessions = state.sessions.filter(s => s.token !== params[0]);
      return [];
    case 'DELETE FROM sessions WHERE user_id = ?': {
      state.sessions = state.sessions.filter(s => s.user_id !== params[0]);
      return [];
    }
    case 'INSERT OR REPLACE INTO user_data (user_id, data) VALUES (?, ?)': {
      const idx = state.user_data.findIndex(d => d.user_id === params[0]);
      const row = { user_id: params[0], data: params[1] };
      if (idx >= 0) state.user_data[idx] = row; else state.user_data.push(row);
      return [];
    }
    case 'SELECT data FROM user_data WHERE user_id = ?': {
      return state.user_data.filter(d => d.user_id === params[0]).map(d => ({ data: d.data }));
    }
    case 'DELETE FROM user_data WHERE user_id = ?': {
      state.user_data = state.user_data.filter(d => d.user_id !== params[0]);
      return [];
    }
    case 'DELETE FROM users WHERE id = ?': {
      state.users = state.users.filter(u => u.id !== params[0]);
      return [];
    }
    case 'SELECT id, username FROM users':
      return state.users.map(u => ({ id: u.id, username: u.username }));
    case 'SELECT user_id, data FROM user_data':
      return state.user_data.map(d => ({ user_id: d.user_id, data: d.data }));
    case 'SELECT token, user_id FROM sessions':
      return state.sessions.map(s => ({ token: s.token, user_id: s.user_id }));
    default:
      throw new Error('Unsupported SQL: ' + sql);
  }
}
