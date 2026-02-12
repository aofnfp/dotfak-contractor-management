# Deployment Guide

## Repository

**GitHub:** https://github.com/Abraham-Oladotun-Foundation/dotfak-contractor-management

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Production Setup                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Frontend (Next.js)          ──────►  Coolify VPS           │
│  ├─ Admin Dashboard                   • Docker-based        │
│  └─ Contractor Portal                 • https://portal.dotfak.com  │
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
| Frontend | https://portal.dotfak.com |
| Backend API | http://q0c480kc0gcokkkk8ksggoso.172.190.9.72.sslip.io |
| API Docs | http://q0c480kc0gcokkkk8ksggoso.172.190.9.72.sslip.io/docs |
| Database | https://supabase.com/dashboard/project/pcatbotfxeqrinydewen |

---

## Frontend (Coolify)

**Deployment:** Docker-based via Coolify. Uses Next.js standalone output mode.

**Domain:** `https://portal.dotfak.com`

**API Proxy:** Next.js rewrites in `next.config.js` proxy `/api/*` to the backend.

**Environment variables:** Set in Coolify dashboard.
```
NEXT_PUBLIC_API_URL = /api
NEXT_PUBLIC_APP_NAME = DotFak Contractor Management
BACKEND_URL = http://q0c480kc0gcokkkk8ksggoso.172.190.9.72.sslip.io
```

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
- `FRONTEND_URL` must be set to `https://portal.dotfak.com` (used for CORS and email links)

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
# Redeploy in Coolify dashboard (or set up auto-deploy from GitHub)
```

### Backend changes
```bash
git push origin main
# Then redeploy in Coolify dashboard (or set up auto-deploy from GitHub)
```

---

## Troubleshooting

### Frontend still hitting wrong backend
- Check `BACKEND_URL` env var in Coolify is set correctly
- Rebuild the frontend container (env vars are baked at build time for `NEXT_PUBLIC_*`)
- Hard refresh browser (Ctrl+Shift+R) to clear cached JS bundles

### Backend returning old code
- Check `.dockerignore` excludes `__pycache__/`
- Redeploy in Coolify **without cache**
- Verify with `/debug/parser-version` endpoint

### CORS errors
- Check `FRONTEND_URL` env var in Coolify matches `https://portal.dotfak.com`
- Backend `main.py` uses `FRONTEND_URL` from config for CORS origins
