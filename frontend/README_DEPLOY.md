# Deploying frontend

Quick steps for Vercel:

- Push your repo to GitHub.
- Import the repo in Vercel and set the project root to `frontend`.
- Build command: `npm run build`, Output directory: `dist`.
- Add environment variable `VITE_API_BASE_URL` pointing to your backend URL.

Quick steps for Netlify:

- Push repo to GitHub.
- Create new site from Git -> Choose repo -> Set base directory `frontend`.
- Build command: `npm run build`, Publish directory: `dist`.
- Add `VITE_API_BASE_URL` in site environment variables.
