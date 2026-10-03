# PantryKart Live — Deployment Guide

This app is a single-process fullstack application:
- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express (served via Vite middleware in dev, static + API in prod)
- **Database**: Supabase Cloud PostgreSQL + in-memory store

---

## ⚙️ Node.js Version: Use Node 22 (Important for Supabase)

This repo already pins **Node 22** via `.nvmrc` and `.node-version`, so most platforms auto-select it:
- **Render**: Settings → Build & Deploy → **Node Version** → set `22` (or it auto-reads `.node-version`).
- **Railway**: auto-reads `.nvmrc` → will use Node 22. No action needed.
- **Vercel**: Project Settings → General → **Node.js Version** → select `22.x`.

Why: `@supabase/supabase-js` works best on Node 22+ (native WebSocket). On Node 20 the app still works because we ship a `ws` transport fallback, but Node 22 is recommended.

`package.json` also has `"engines": { "node": ">=20.0.0" }` so Node 20 won't hard-fail as a fallback.

---

## 🚀 Option 1: Deploy on Render.com (Recommended — 100% Free / Easy)

Render runs both the frontend and backend together as a single Node.js Web Service.

1. Go to [render.com](https://render.com) and create/login to your account.
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository: `gstranchi64-pantrykart/pantrykartlive-12345`.
4. Configure settings:
   - **Name**: `pantrykart-live`
   - **Region**: Singapore or nearest to your users
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Under **Environment Variables**, add:
   ```env
   NODE_ENV=production
   PORT=3000
   SUPABASE_URL=https://bgxnmmecjcgrwtemmjtz.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJneG5tbWVjamNncnd0ZW1tanR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMzgwNTgsImV4cCI6MjEwNTcxNDA1OH0.1BEmrzrTZuM7jyyVw8-qp8JjKfuk1cB4oDtpNih43o8
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJneG5tbWVjamNncnd0ZW1tanR6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDEzODA1OCwiZXhwIjoyMTA1NzE0MDU4fQ.dMVk2v3wdELMzAwAP80yuATN0RL9ud6WgJlIZCVimYQ
   SUPABASE_PROJECT_REF=bgxnmmecjcgrwtemmjtz
   VITE_SUPABASE_URL=https://bgxnmmecjcgrwtemmjtz.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJneG5tbWVjamNncnd0ZW1tanR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMzgwNTgsImV4cCI6MjEwNTcxNDA1OH0.1BEmrzrTZuM7jyyVw8-qp8JjKfuk1cB4oDtpNih43o8
   ```
6. Click **Deploy Web Service**. Your app will be live on `https://your-app.onrender.com`.

---

## 🚂 Option 2: Deploy on Railway.app

1. Go to [railway.app](https://railway.app).
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select `gstranchi64-pantrykart/pantrykartlive-12345`.
4. Railway will auto-detect Node.js.
5. In **Variables**, add the same Supabase variables listed above.
6. In **Settings** → **Networking**, click **Generate Domain**.
7. Railway will build and deploy automatically.

---

## 💻 Option 3: Run Locally on your Machine

```bash
# 1. Clone the repository
git clone https://github.com/gstranchi64-pantrykart/pantrykartlive-12345.git
cd pantrykartlive-12345

# 2. Install dependencies
npm install

# 3. Create .env file with your Supabase credentials

# 4. Start the development server
npm run dev
# or
npm start

# 5. Open browser at http://localhost:3000
```
