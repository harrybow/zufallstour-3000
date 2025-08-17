# React + Vite

This project now runs entirely on a single **Cloudflare Worker**. The Worker serves the built frontend assets and exposes API routes backed by a Cloudflare D1 database bound as `DB`.

## Development

- Install dependencies and run the frontend:

  ```bash
  npm install
  npm run dev
  ```

- Build the frontend and start the Worker locally:

  ```bash
  npm run build
  npx wrangler dev
  ```

## Deployment

1. Create a D1 database in Cloudflare and bind it as `DB` in `wrangler.toml`.
2. Ensure the database has the required tables:

   ```sql
   CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT);
   CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER);
   CREATE TABLE IF NOT EXISTS user_data (user_id INTEGER PRIMARY KEY, data TEXT);
   ```

   You can run these with `wrangler d1 execute`.
3. Deploy the Worker and assets:

   ```bash
   npm run deploy
   ```
