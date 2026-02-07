# Deployment Guide

## Repository

**GitHub:** https://github.com/Abraham-Oladotun-Foundation/dotfak-contractor-management

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Production Setup                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Frontend (Next.js)          ──────►  Netlify               │
│  ├─ Admin Dashboard                   • Auto-deploy on push │
│  └─ Contractor Portal                 • Global CDN          │
│                                                               │
│  Backend (FastAPI)           ──────►  Coolify VPS           │
│  ├─ REST API                          • Docker-based        │
│  ├─ Authentication                    • Always-on           │
│  └─ Paystub Processing               • 172.190.9.72        │
│                                                               │
│  Database & Auth             ──────►  Supabase              │
│  ├─ PostgreSQL                        • 500MB storage       │
│  ├─ Row Level Security                • Unlimited requests  │
│  └─ JWT Authentication                • Daily backups       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Production URLs

| Service | URL |
|---------|-----|
| Frontend | https://dotfak-contractor-management.netlify.app |
| Backend API | http://q0c480kc0gcokkkk8ksggoso.172.190.9.72.sslip.io |
| API Docs | http://q0c480kc0gcokkkk8ksggoso.172.190.9.72.sslip.io/docs |
| Database | https://supabase.com/dashboard/project/pcatbotfxeqrinydewen |

---

## Frontend (Netlify)

**Config file:** `netlify.toml` (project root)

**Build settings:**
- Build command: `cd frontend && npm install && npm run build`
- Publish directory: `frontend/.next`
- Plugin: `@netlify/plugin-nextjs`

**Environment variables (set in netlify.toml):**
```
NEXT_PUBLIC_API_URL = http://q0c480kc0gcokkkk8ksggoso.172.190.9.72.sslip.io
NEXT_PUBLIC_APP_NAME = DotFak Contractor Management
NODE_VERSION = 20
```

**Important:** `NEXT_PUBLIC_*` variables are baked in at build time. If you change them, you must trigger a new Netlify deploy.

**Auto-deploy:** Every push to `main` triggers a new build.

---

## Backend (Coolify VPS)

**Host:** 172.190.9.72 (via Coolify)
**URL:** http://q0c480kc0gcokkkk8ksggoso.172.190.9.72.sslip.io

**Deployment:** Docker-based via Coolify dashboard. Uses the `Dockerfile` at project root.

**Key Dockerfile settings:**
```dockerfile
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
```

**`.dockerignore`** excludes `__pycache__/`, `*.pyc`, `.git/`, `.env`, `frontend/`, etc.

**Environment variables:** Set in Coolify dashboard (same as `.env`).

---

## Database (Supabase)

**Project:** pcatbotfxeqrinydewen
**Connection:** `postgresql://postgres:[password]@db.pcatbotfxeqrinydewen.supabase.co:5432/postgres`

---

## Deploying Changes

### Frontend changes
```bash
git add .
git commit -m "feat: description"
git push origin main
# Netlify auto-builds and deploys
```

### Backend changes
```bash
git push origin main
# Then redeploy in Coolify dashboard (or set up auto-deploy from GitHub)
```

---

## Troubleshooting

### Frontend still hitting wrong backend
- Check `netlify.toml` → `NEXT_PUBLIC_API_URL` is correct
- Trigger a fresh Netlify deploy (env vars are baked at build time)
- Hard refresh browser (Ctrl+Shift+R) to clear cached JS bundles

### Backend returning old code
- Check `.dockerignore` excludes `__pycache__/`
- Redeploy in Coolify **without cache**
- Verify with `/debug/parser-version` endpoint

### CORS errors
- Check `FRONTEND_URL` env var in Coolify matches Netlify URL
- Backend `main.py` must include the Netlify domain in allowed origins
