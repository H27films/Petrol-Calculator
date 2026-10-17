# Petrol Calculator

Single-page calculator (index.html) with a Vercel API (api/data.js) that stores each signed-in user's figures in Neon.

## Vercel environment variables
Set these in Vercel: Project → Settings → Environment Variables.

- `DATABASE_URL` – the Neon connection string (pooled). Keep it private.
- `NEON_JWKS_URL` – the JWKS URL shown on the Neon Auth (Better Auth) settings page.

## Before deploying
Open index.html and replace `PASTE_YOUR_NEON_AUTH_URL_HERE` with your Auth URL from Neon.
In Neon Auth, add your Vercel address (for example https://petrol-calculator.vercel.app) under trusted domains.

## Deploy
1. Push this folder to the private GitHub repo.
2. On vercel.com, click Add New → Project, import the repo, and deploy.
3. Add the two environment variables, then redeploy.
