import React, { useState } from 'react';
import { login, register } from './api.js';

export default function Login({ onSuccess }){
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');

  async function submit(e){
    e.preventDefault();
    try {
      if (mode === 'register') {
        await register(username, password);
      }
      const token = await login(username, password);
      onSuccess(token, username);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2 p-4 border-4 border-black bg-white rounded-xl w-80">
      <div><input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Username" className="w-full border p-2"/></div>
      <div><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="w-full border p-2"/></div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <button type="submit" className="w-full bg-black text-white p-2 rounded">{mode==='login'? 'Login' : 'Registrieren'}</button>
      <button type="button" className="text-sm underline" onClick={()=>setMode(mode==='login'?'register':'login')}>
        {mode==='login' ? 'Neu hier? Registrieren' : 'Schon registriert? Login'}
      </button>
    </form>
  );
}
