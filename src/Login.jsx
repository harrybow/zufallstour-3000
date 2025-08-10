import { useState } from 'react';
import { login, register } from './api';

export default function Login({ onSuccess }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    try {
      const fn = mode === 'login' ? login : register;
      const { token } = await fn(username, password);
      onSuccess(token);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="p-4 max-w-xs mx-auto">
      <h1 className="font-bold mb-4">{mode === 'login' ? 'Anmelden' : 'Registrieren'}</h1>
      <form onSubmit={submit} className="space-y-3">
        <input
          className="w-full border p-2"
          placeholder="Benutzername"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <input
          className="w-full border p-2"
          type="password"
          placeholder="Passwort"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button type="submit" className="w-full bg-black text-white p-2">
          {mode === 'login' ? 'Login' : 'Registrieren'}
        </button>
      </form>
      <button
        className="mt-4 text-blue-600 underline"
        onClick={() => {
          setMode(mode === 'login' ? 'register' : 'login');
          setError('');
        }}
      >
        {mode === 'login' ? 'Account erstellen' : 'Schon registriert?'}
      </button>
    </div>
  );
}
