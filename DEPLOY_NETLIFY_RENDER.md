# Deploy with Netlify + Render

## 1) Backend on Render

1. Create a new **Web Service** on Render from this GitHub repo.
2. Render will read `render.yaml` automatically. If prompted:
   - Service root: `backend`
   - Build command: `npm ci && npm run build`
   - Start command: `sh ./render-start.sh`
3. Add required environment variables in Render:
   - `DATABASE_URL`
   - `REDIS_URL`
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `NODE_ENV=production`
   - `CORS_ORIGIN=https://<your-netlify-site>.netlify.app`
4. Deploy and confirm health check:
   - `GET /health` returns `{ "status": "ok" }`

## 2) Frontend on Netlify

1. Create a new Netlify site from this GitHub repo.
2. Netlify will use `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Add environment variable in Netlify:
   - `VITE_API_URL=https://<your-render-backend>.onrender.com`
4. Deploy and open the site URL.

## 3) Post-Deploy Checks

1. Open frontend and test login/register.
2. Open backend docs: `https://<your-render-backend>.onrender.com/docs`
3. Confirm CORS allows Netlify domain.
