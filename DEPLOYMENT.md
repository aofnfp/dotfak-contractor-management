# Deployment Guide

## Repository

**GitHub:** https://github.com/Abraham-Oladotun-Foundation/dotfak-contractor-management

## Free Tier Deployment Strategy

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Production Setup (100% Free)             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Frontend (Next.js)          ──────►  Vercel                │
│  ├─ Admin Dashboard                   • Free forever         │
│  └─ Contractor Portal                 • Auto-deploy on push │
│                                        • Global CDN          │
│                                                               │
│  Backend (FastAPI)           ──────►  Render.com            │
│  ├─ REST API                          • 750 hours/month     │
│  ├─ Authentication                    • Auto-sleep 15min    │
│  └─ Business Logic                    • GitHub integration  │
│                                                               │
│  Database & Auth             ──────►  Supabase              │
│  ├─ PostgreSQL                        • 500MB storage       │
│  ├─ Row Level Security                • Unlimited requests  │
│  ├─ JWT Authentication                • Daily backups       │
│  └─ File Storage (PDFs)               • 50MB storage        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 1: Database (Already Done ✅)

**Platform:** Supabase
**Status:** Configured and running

**Database URL:** `postgresql://postgres:[password]@db.pcatbotfxeqrinydewen.supabase.co:5432/postgres`

**Tables Created:**
- ✅ contractors
- ✅ client_companies
- ✅ contractor_assignments
- ✅ contractor_earnings
- ✅ contractor_payments
- ✅ payment_allocations
- ✅ paystubs

**Authentication:** Supabase Auth with ES256 JWT tokens

---

## Step 2: Backend Deployment (Render.com)

### Prerequisites
- GitHub account connected to Render
- Repository pushed to GitHub ✅

### Deployment Steps

#### 1. Create New Web Service

Go to: https://dashboard.render.com/

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository: `Abraham-Oladotun-Foundation/dotfak-contractor-management`
3. Configure the service:

**Basic Settings:**
```
Name: dotfak-backend
Region: Oregon (US West) or closest to your users
Branch: main
Root Directory: (leave blank)
Runtime: Python 3
```

**Build Command:**
```bash
pip install -r requirements.txt
```

**Start Command:**
```bash
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

**Instance Type:** Free (512 MB RAM, sleeps after 15 min)

#### 2. Environment Variables

Add these in Render dashboard under **Environment** tab:

```bash
# Supabase Database
DATABASE_URL=postgresql://postgres:[password]@db.pcatbotfxeqrinydewen.supabase.co:5432/postgres

# Supabase Auth & API
SUPABASE_URL=https://pcatbotfxeqrinydewen.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here
SUPABASE_JWT_SECRET=your-jwt-secret-here

# API Configuration
API_HOST=0.0.0.0
API_PORT=$PORT  # Render provides this automatically

# Environment
ENVIRONMENT=production

# Frontend URL (will set this in Step 3)
FRONTEND_URL=https://your-vercel-app.vercel.app
```

#### 3. Deploy

Click **"Create Web Service"**

Render will:
1. Clone your repository
2. Install dependencies
3. Start the FastAPI server
4. Provide a URL like: `https://dotfak-backend.onrender.com`

**Expected Result:**
- Visit `https://dotfak-backend.onrender.com/` → Should see:
  ```json
  {
    "service": "Paystub Extractor API",
    "version": "1.0.0",
    "status": "running"
  }
  ```

#### 4. Keep-Alive Strategy (Optional)

Since free tier sleeps after 15 minutes, you can:

**Option A:** Accept the sleep (first request takes ~30s to wake up)

**Option B:** Use a free service to ping every 14 minutes:
- UptimeRobot (free, 50 monitors)
- Cron-job.org (free, unlimited)

Add monitor:
```
URL: https://dotfak-backend.onrender.com/
Interval: Every 14 minutes
```

---

## Step 3: Frontend Deployment (Vercel) - Future

### Prerequisites
- Frontend code (Phase 5 - not yet implemented)
- Vercel account

### When Ready (Phase 5):

#### 1. Create Next.js Frontend
```bash
cd frontend
npx create-next-app@latest . --typescript --tailwind --app
```

#### 2. Deploy to Vercel
```bash
npm install -g vercel
vercel login
vercel --prod
```

#### 3. Environment Variables in Vercel
```bash
NEXT_PUBLIC_API_URL=https://dotfak-backend.onrender.com
NEXT_PUBLIC_SUPABASE_URL=https://pcatbotfxeqrinydewen.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

#### 4. Update Backend FRONTEND_URL

Go back to Render → Environment → Update:
```bash
FRONTEND_URL=https://dotfak-contractor-management.vercel.app
```

This enables CORS for your frontend domain.

---

## Step 4: Testing Deployment

### Test Backend API

```bash
# Health check
curl https://dotfak-backend.onrender.com/

# Login (use your actual credentials)
curl -X POST https://dotfak-backend.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dotfakgroup.com","password":"Admin123!"}'

# List contractors (use token from login)
curl https://dotfak-backend.onrender.com/contractors \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Expected Performance

**First Request (Cold Start):**
- ~30 seconds (if service was sleeping)

**Subsequent Requests:**
- < 500ms (when service is awake)

**Automatic Sleep:**
- After 15 minutes of inactivity
- Next request wakes it up

---

## Step 5: Continuous Deployment

### Auto-Deploy on Push

Both Render and Vercel support automatic deployments:

**Render (Backend):**
```bash
# Any push to main branch auto-deploys
git add .
git commit -m "Update: Description of changes"
git push origin main
```

Render will:
1. Detect the push
2. Rebuild the service
3. Deploy automatically
4. Show build logs in dashboard

**Vercel (Frontend):**
- Same process, auto-deploys on push to main

---

## Monitoring & Logs

### Render Dashboard

**View Logs:**
https://dashboard.render.com/web/[your-service-id]/logs

**Real-time logging:**
- All print() statements
- Uvicorn access logs
- Error tracebacks

**Metrics:**
- CPU usage
- Memory usage
- Request count
- Response times

### Supabase Dashboard

**Database Logs:**
https://supabase.com/dashboard/project/pcatbotfxeqrinydewen/logs/postgres-logs

**Monitor:**
- Query performance
- Connection count
- Storage usage
- API requests

---

## Security Checklist

### ✅ Environment Variables
- [x] Never commit .env to git
- [x] Use .env.template for documentation
- [x] Set secrets in Render dashboard

### ✅ Database Security
- [x] Row Level Security (RLS) enabled
- [x] Parameterized queries (SQL injection prevention)
- [x] Connection via SSL

### ✅ API Security
- [x] JWT authentication with ES256
- [x] Role-based access control
- [x] CORS restricted to frontend domain
- [x] Input validation with Pydantic

### ✅ File Upload Security
- [x] PDF-only validation
- [x] File size limits (10MB)
- [x] SHA-256 duplicate detection
- [x] Secure storage in Supabase

---

## Cost Breakdown (Monthly)

| Service | Plan | Cost |
|---------|------|------|
| Supabase | Free Tier | $0 |
| - Database (500MB) | ✅ | $0 |
| - Auth (Unlimited) | ✅ | $0 |
| - Storage (50MB) | ✅ | $0 |
| Render.com | Free Tier | $0 |
| - Backend (750 hrs) | ✅ | $0 |
| Vercel | Hobby Plan | $0 |
| - Frontend (Unlimited) | ✅ | $0 |
| **Total** | | **$0/month** |

**Upgrade Path (If Needed):**
- Supabase Pro: $25/month (8GB database, 100GB storage)
- Render Starter: $7/month (no sleep, more resources)
- Vercel Pro: $20/month (team features, analytics)

---

## Backup & Recovery

### Database Backups

**Supabase (Automatic):**
- Daily backups (retained 7 days)
- Point-in-time recovery available

**Manual Backup:**
```bash
pg_dump $DATABASE_URL > backup.sql
```

### Code Backups

**GitHub (Automatic):**
- All code versioned in git
- Complete history preserved
- Can redeploy any commit

---

## Troubleshooting

### Issue: Backend won't start on Render

**Check:**
1. Build logs for errors
2. Environment variables set correctly
3. `requirements.txt` includes all dependencies

**Fix:**
```bash
# Test locally first
pip install -r requirements.txt
python backend/main.py
```

### Issue: Database connection fails

**Check:**
1. DATABASE_URL is correct
2. Supabase project is active
3. IP restrictions in Supabase (should be disabled for Render)

**Fix:**
- Go to Supabase → Settings → Database → Connection Pooling
- Use "Session" mode connection string

### Issue: CORS errors from frontend

**Check:**
1. FRONTEND_URL environment variable set in Render
2. Frontend is deployed to that URL

**Fix:**
```python
# backend/config.py
allowed_origins = [FRONTEND_URL]
```

---

## Deployment Checklist

### Pre-Deployment
- [x] All tests passing locally
- [x] Environment variables documented
- [x] .gitignore configured correctly
- [x] Database schema finalized
- [x] Code pushed to GitHub

### Backend Deployment
- [ ] Create Render web service
- [ ] Configure environment variables
- [ ] Deploy and test endpoints
- [ ] Set up monitoring
- [ ] (Optional) Configure keep-alive

### Frontend Deployment (Phase 5)
- [ ] Build Next.js frontend
- [ ] Deploy to Vercel
- [ ] Configure environment variables
- [ ] Update CORS in backend
- [ ] Test end-to-end flow

### Post-Deployment
- [ ] Test all API endpoints
- [ ] Verify authentication works
- [ ] Upload test paystub
- [ ] Record test payment
- [ ] Monitor logs for errors
- [ ] Document production URLs

---

## Production URLs

### Current Status

**Repository:** https://github.com/Abraham-Oladotun-Foundation/dotfak-contractor-management

**Backend API:** (To be deployed to Render)
- Production: `https://dotfak-backend.onrender.com`
- Docs: `https://dotfak-backend.onrender.com/docs`
- Health: `https://dotfak-backend.onrender.com/`

**Frontend:** (Phase 5 - Not yet deployed)
- Production: `https://dotfak-contractor-management.vercel.app`

**Database:** (Already running ✅)
- Supabase: `https://pcatbotfxeqrinydewen.supabase.co`

---

## Next Steps

1. **Deploy Backend to Render** (20 minutes)
   - Follow Step 2 above
   - Test all endpoints

2. **Build Frontend** (Phase 5)
   - Admin dashboard
   - Contractor portal

3. **Deploy Frontend to Vercel** (10 minutes)
   - Follow Step 3 above
   - Update CORS settings

4. **Go Live!** 🚀
   - Monitor performance
   - Collect user feedback
   - Iterate and improve

---

**Platform:** DotFak Contractor Management System
**Repository:** https://github.com/Abraham-Oladotun-Foundation/dotfak-contractor-management
**Status:** Backend ready for deployment, Frontend pending (Phase 5)
**Deployment Cost:** $0/month (100% free tier)
