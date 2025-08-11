# React + Vite

This project now runs entirely on a single **Cloudflare Worker**. The Worker serves the built frontend assets and exposes API routes backed by a Cloudflare KV namespace bound as `DB`.

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

1. Create a KV namespace in Cloudflare and bind it as `DB` in `wrangler.toml`.
2. Deploy the Worker and assets:

   ```bash
   npx wrangler deploy
   ```
