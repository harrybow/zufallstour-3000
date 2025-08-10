export async function register(username, password){
  const res = await fetch('/api/register', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username, password})});
  if(!res.ok) throw new Error('Register failed');
}
export async function login(username, password){
  const res = await fetch('/api/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username, password})});
  if(!res.ok) throw new Error('Login failed');
  const data = await res.json();
  localStorage.setItem('authToken', data.token);
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
