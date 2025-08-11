export async function register(username, password){
  const res = await fetch('/api/register', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username, password})});
  if(!res.ok) throw new Error('Register failed');
}
export async function login(username, password){
  const res = await fetch('/api/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username, password})});
  if(!res.ok) throw new Error('Login failed');
  const data = await res.json();
  try {
    localStorage.setItem('authToken', data.token);
  } catch (e) {
    // Speicher voll? alte lokale Daten entfernen und erneut versuchen
    console.warn('Auth token could not be stored, trying to free space', e);
    try {
      localStorage.removeItem('zufallstour3000.v4');
      localStorage.setItem('authToken', data.token);
    } catch (e2) {
      console.error('Failed to store auth token', e2);
      throw e2;
    }
  }
  return data.token;
}
export async function logout(token){
  try { await fetch('/api/logout', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } }); } catch { /* ignore */ }
  try { localStorage.removeItem('authToken'); } catch { /* ignore */ }
}
export async function fetchData(token){
  const res = await fetch('/api/data', {headers:{'Authorization':`Bearer ${token}`}});
  if(!res.ok) return null;
  const {data} = await res.json();
  return data;
}
export async function saveData(token, data){
  await fetch('/api/data', {method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}, body: JSON.stringify({data})});
}
export async function deleteAccount(token){
  const res = await fetch('/api/account', {method:'DELETE', headers:{'Authorization':`Bearer ${token}`}});
  if(!res.ok) throw new Error('Delete failed');
}
