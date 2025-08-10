import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const SECRET = process.env.JWT_SECRET || 'supersecret';
const PORT = process.env.PORT || 3000;

async function createDb() {
  const db = await open({ filename: './server/data.sqlite', driver: sqlite3.Database });
  await db.exec(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT NOT NULL
  );`);
  await db.exec(`CREATE TABLE IF NOT EXISTS user_data (
    user_id INTEGER UNIQUE,
    data TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );`);
  return db;
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

async function main() {
  const db = await createDb();
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
    try {
      const hash = await bcrypt.hash(password, 10);
      const result = await db.run('INSERT INTO users(username, password) VALUES (?, ?)', username, hash);
      await db.run('INSERT INTO user_data(user_id, data) VALUES (?, ?)', result.lastID, JSON.stringify({ stations: [] }));
      const token = jwt.sign({ id: result.lastID, username }, SECRET);
      res.json({ token });
    } catch (e) {
      res.status(400).json({ error: 'User exists' });
    }
  });

  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await db.get('SELECT * FROM users WHERE username = ?', username);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, username }, SECRET);
    res.json({ token });
  });

  app.get('/api/data', authMiddleware, async (req, res) => {
    const row = await db.get('SELECT data FROM user_data WHERE user_id = ?', req.user.id);
    const data = row ? JSON.parse(row.data) : { stations: [] };
    res.json(data);
  });

  app.post('/api/data', authMiddleware, async (req, res) => {
    const { stations } = req.body;
    const json = JSON.stringify({ stations: stations || [] });
    await db.run('INSERT INTO user_data(user_id, data) VALUES(?, ?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data', req.user.id, json);
    res.json({ ok: true });
  });

  app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
  });
}

main();
