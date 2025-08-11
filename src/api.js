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
export function logout(){ localStorage.removeItem('authToken'); }
export async function fetchData(token){
  const res = await fetch('/api/data', {headers:{'Authorization':`Bearer ${token}`}});
  if(!res.ok) return null;
  const {data} = await res.json();
  return data;
}
export async function saveData(token, data){
  await fetch('/api/data', {method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}, body: JSON.stringify({data})});
}

export async function changePassword(oldPw, newPw){
  const token = localStorage.getItem('authToken');
  const res = await fetch('/api/password', {
    method: 'POST',
    headers: {'Content-Type':'application/json','Authorization':`Bearer ${token}`},
    body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw })
  });
  if(!res.ok){
    const data = await res.json().catch(()=>({}));
    throw new Error(data.error || 'Change password failed');
  }
}
