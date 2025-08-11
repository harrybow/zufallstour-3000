# React + Vite

This project now uses **Cloudflare Pages Functions** for the backend API. The former Node.js server has been replaced by serverless functions under `functions/` which store their data in a Cloudflare KV namespace bound as `DB`.

## Development

- Install dependencies and run the frontend:

  ```bash
  npm install
  npm run dev
  ```

- To develop the backend locally, install [Wrangler](https://developers.cloudflare.com/workers/wrangler/install/) and run:

  ```bash
  npx wrangler pages dev
  ```

## Deployment

1. Create a KV namespace in Cloudflare and bind it as `DB` in `wrangler.toml`.
2. Deploy with:

   ```bash
   npx wrangler pages deploy
   ```
