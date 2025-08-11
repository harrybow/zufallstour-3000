import React, { useState } from 'react';
import { changePassword } from './api.js';

export default function ChangePassword(){
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(e){
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await changePassword(oldPw, newPw);
      setMessage('Passwort aktualisiert');
      setOldPw('');
      setNewPw('');
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="rounded-2xl border-4 border-black p-4 bg-white/80 mt-4">
      <h3 className="font-extrabold text-lg mb-2">Passwort ändern</h3>
      <form onSubmit={submit} className="space-y-2">
        <div><input type="password" value={oldPw} onChange={e=>setOldPw(e.target.value)} placeholder="Altes Passwort" className="w-full px-3 py-2 rounded-lg border-4 border-black bg-white text-sm"/></div>
        <div><input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="Neues Passwort" className="w-full px-3 py-2 rounded-lg border-4 border-black bg-white text-sm"/></div>
        {message && <div className="text-green-600 text-sm">{message}</div>}
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button type="submit" className="px-4 py-2 rounded-full bg-black text-white font-extrabold border-4 border-black w-full">Speichern</button>
      </form>
    </div>
  );
}

