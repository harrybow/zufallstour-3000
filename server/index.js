import http from 'http';
import { parse } from 'url';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const DB_FILE = new URL('./db.json', import.meta.url);
let db = { users: [], data: {}, sessions: {} };
if (existsSync(DB_FILE)) {
  try { db = JSON.parse(readFileSync(DB_FILE, 'utf8')); } catch { /* ignore */ }
}
function saveDb(){ writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
function hashPassword(password){ const salt=randomBytes(16).toString('hex'); const hash=scryptSync(password,salt,64).toString('hex'); return `${salt}:${hash}`; }
function verifyPassword(password, stored){ const [salt,hash]=stored.split(':'); const hashed=scryptSync(password,salt,64); return timingSafeEqual(Buffer.from(hash,'hex'), hashed); }
function parseBody(req){ return new Promise((resolve)=>{ let body=''; req.on('data',c=>body+=c); req.on('end',()=>{ try{ resolve(JSON.parse(body||'{}')); }catch{ resolve({}); } }); }); }
function auth(req){ const auth=req.headers['authorization']; if(!auth) return null; const token=auth.split(' ')[1]; const uid=db.sessions[token]; return uid? {id:uid}: null; }

const server = http.createServer(async (req,res)=>{
  const { pathname } = parse(req.url, true);
  if (req.method==='POST' && pathname==='/api/register'){
    const {username,password} = await parseBody(req);
    if(!username || !password){ res.writeHead(400); return res.end(JSON.stringify({error:'missing'})); }
    if(db.users.find(u=>u.username===username)){ res.writeHead(400); return res.end(JSON.stringify({error:'exists'})); }
    const id = db.users.length? Math.max(...db.users.map(u=>u.id))+1 : 1;
    db.users.push({id, username, password:hashPassword(password)});
    saveDb();
    res.end(JSON.stringify({success:true}));
  }
  else if (req.method==='POST' && pathname==='/api/login'){
    const {username,password} = await parseBody(req);
    const user=db.users.find(u=>u.username===username);
    if(!user || !verifyPassword(password,user.password)){ res.writeHead(401); return res.end(JSON.stringify({error:'invalid'})); }
    const token=randomBytes(24).toString('hex'); db.sessions[token]=user.id; saveDb();
    res.end(JSON.stringify({token}));
  }
  else if (req.method==='GET' && pathname==='/api/data'){
    const user=auth(req); if(!user){ res.writeHead(401); return res.end(JSON.stringify({error:'noauth'})); }
    res.end(JSON.stringify({data: db.data[user.id] || null}));
  }
  else if (req.method==='POST' && pathname==='/api/data'){
    const user=auth(req); if(!user){ res.writeHead(401); return res.end(JSON.stringify({error:'noauth'})); }
    const {data} = await parseBody(req); db.data[user.id]=data; saveDb();
    res.end(JSON.stringify({success:true}));
  }
  else if (req.method==='POST' && pathname==='/api/password'){
    const user=auth(req); if(!user){ res.writeHead(401); return res.end(JSON.stringify({error:'noauth'})); }
    const {oldPassword, newPassword} = await parseBody(req);
    const u = db.users.find(u=>u.id===user.id);
    if(!u || !oldPassword || !newPassword || !verifyPassword(oldPassword, u.password)){
      res.writeHead(400); return res.end(JSON.stringify({error:'invalid'}));
    }
    u.password = hashPassword(newPassword); saveDb();
    res.end(JSON.stringify({success:true}));
  }
  else {
    res.writeHead(404); res.end('not found');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server listening on '+PORT));
