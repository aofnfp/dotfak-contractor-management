# Production Deployment Guide - Step by Step

## Overview

We'll deploy in this order:
1. **Backend → Render.com** (get production API URL)
2. **Frontend → Vercel** (configure with production API URL)
3. **Test & Verify**

Total time: ~15-20 minutes

---

## Part 1: Deploy Backend to Render (10 minutes)

### Step 1.1: Create Render Account & Connect GitHub

1. Go to: **https://dashboard.render.com/register**
2. Sign up with GitHub (recommended for auto-deploy)
3. Authorize Render to access your repositories

### Step 1.2: Create New Web Service

1. Click **"New +"** → **"Web Service"**
2. Find and select your repository: `Abraham-Oladotun-Foundation/dotfak-contractor-management`
3. Click **"Connect"**

### Step 1.3: Configure Service

Fill in these settings:

**Name:** `dotfak-backend`

**Region:** Oregon (US West) or closest to your users

**Branch:** `main`

**Root Directory:** (leave blank)

**Runtime:** `Python 3`

**Build Command:**
```bash
pip install -r requirements.txt
```

**Start Command:**
```bash
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

**Instance Type:** `Free` (512 MB RAM, sleeps after 15 min)

### Step 1.4: Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add each of these (replace with your actual values):

```bash
# Database
DATABASE_URL=postgresql://postgres.pcatbotfxeqrinydewen:YOUR_DB_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres

# Supabase Auth & API
SUPABASE_URL=https://pcatbotfxeqrinydewen.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_KEY=YOUR_SERVICE_KEY
SUPABASE_JWT_SECRET=YOUR_JWT_SECRET

# API Configuration
API_HOST=0.0.0.0

# Environment
ENVIRONMENT=production

# CORS (we'll update this after Vercel deployment)
FRONTEND_URL=https://localhost:3000
```

**Where to find Supabase credentials:**
1. Go to: https://supabase.com/dashboard/project/pcatbotfxeqrinydewen/settings/api
2. Copy:
   - **Project URL** → SUPABASE_URL
   - **anon/public key** → SUPABASE_ANON_KEY
   - **service_role key** → SUPABASE_SERVICE_KEY
3. For DATABASE_URL, go to: https://supabase.com/dashboard/project/pcatbotfxeqrinydewen/settings/database
   - Use the **Connection Pooling** URL (port 6543, not 5432)

**Where to find JWT Secret:**
1. Go to: https://supabase.com/dashboard/project/pcatbotfxeqrinydewen/settings/api
2. Scroll to **JWT Settings** → Copy **JWT Secret**

### Step 1.5: Deploy

1. Click **"Create Web Service"**
2. Wait 2-3 minutes for build to complete
3. You'll get a URL like: `https://dotfak-backend.onrender.com`

### Step 1.6: Verify Backend Deployment

Open your backend URL in browser: `https://dotfak-backend.onrender.com`

You should see:
```json
{
  "service": "Paystub Extractor API",
  "version": "1.0.0",
  "status": "running"
}
```

Also check the docs: `https://dotfak-backend.onrender.com/docs`

**✅ Backend deployment complete!**

**Copy your backend URL - you'll need it for frontend deployment:**
```
https://dotfak-backend-XXXX.onrender.com
```

---

## Part 2: Deploy Frontend to Vercel (5 minutes)

### Step 2.1: Install Vercel CLI & Login

Open terminal and run:
```bash
cd "/Users/abrahamoladotun/Documents/Paystub Extractor/frontend"
npx vercel login
```

Follow the login prompts (check your email for verification).

### Step 2.2: Deploy to Production

Run the deployment command:
```bash
npx vercel --prod
```

**Answer the setup questions:**

- **Set up and deploy?** → `Y`
- **Which scope?** → Select your account
- **Link to existing project?** → `N`
- **Project name?** → `dotfak-contractor-management` (or press Enter)
- **Directory?** → `.` (press Enter)
- **Override settings?** → `N`

Vercel will:
1. Build your Next.js app
2. Deploy to production
3. Give you a URL like: `https://dotfak-contractor-management.vercel.app`

### Step 2.3: Configure Environment Variables on Vercel

1. Go to: **https://vercel.com/dashboard**
2. Click your project: **dotfak-contractor-management**
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

```bash
NEXT_PUBLIC_API_URL=https://dotfak-backend-XXXX.onrender.com
NEXT_PUBLIC_APP_NAME=DotFak Contractor Management
```

Replace `dotfak-backend-XXXX.onrender.com` with your actual Render backend URL from Step 1.6.

5. Click **"Save"**

### Step 2.4: Redeploy Frontend with Environment Variables

```bash
npx vercel --prod
```

This redeploys with the correct API URL.

**✅ Frontend deployment complete!**

**Copy your frontend URL:**
```
https://dotfak-contractor-management.vercel.app
```

---

## Part 3: Update Backend CORS (2 minutes)

Now that we have the frontend URL, we need to allow it in the backend.

### Step 3.1: Update Render Environment Variable

1. Go back to Render Dashboard: **https://dashboard.render.com**
2. Click your service: **dotfak-backend**
3. Go to **Environment** tab
4. Find **FRONTEND_URL** variable
5. Update it to your Vercel URL:
   ```
   https://dotfak-contractor-management.vercel.app
   ```
6. Click **"Save Changes"**

Render will automatically redeploy with the new CORS settings.

---

## Part 4: Test Production Deployment (5 minutes)

### Test 1: Frontend Loads

Open your Vercel URL: `https://dotfak-contractor-management.vercel.app`

You should see the login page with:
- ✅ DotFak branding
- ✅ Email/password fields
- ✅ Dark mode theme

### Test 2: Login Works

Try logging in with your admin account:
- Email: `admin@dotfakgroup.com`
- Password: Your admin password

You should:
- ✅ See the dashboard
- ✅ See stats (0 contractors, $0 unpaid, etc.)
- ✅ See the onboarding guide

### Test 3: API Connection

Open browser console (F12) → Network tab

Refresh the dashboard page. You should see:
- ✅ Request to `/dashboard/stats` (status 200)
- ✅ No CORS errors
- ✅ Data loading correctly

### Test 4: Create a Test Contractor

1. Click **"Add Contractor"** button
2. Fill in contractor details
3. Click **"Create"**

You should:
- ✅ See success toast notification
- ✅ Contractor appears in list
- ✅ Dashboard stats update

---

## Production URLs (Save These!)

**Frontend (Vercel):**
```
https://dotfak-contractor-management.vercel.app
```

**Backend API (Render):**
```
https://dotfak-backend-XXXX.onrender.com
```

**API Docs (Swagger):**
```
https://dotfak-backend-XXXX.onrender.com/docs
```

**Database (Supabase):**
```
https://supabase.com/dashboard/project/pcatbotfxeqrinydewen
```

**Repository (GitHub):**
```
https://github.com/Abraham-Oladotun-Foundation/dotfak-contractor-management
```

---

## Automatic Deployments

Both services are now configured for auto-deploy:

**Any push to `main` branch will automatically:**
1. Trigger Render rebuild (backend)
2. Trigger Vercel rebuild (frontend)
3. Deploy to production in 2-3 minutes

To deploy updates:
```bash
git add .
git commit -m "feat: your changes"
git push origin main
```

---

## Monitoring & Logs

### Render (Backend Logs)
https://dashboard.render.com → Your service → **Logs** tab

### Vercel (Frontend Logs)
https://vercel.com/dashboard → Your project → **Deployments** → Click deployment → **Logs**

### Supabase (Database Logs)
https://supabase.com/dashboard/project/pcatbotfxeqrinydewen/logs

---

## Troubleshooting

### Issue: Backend shows "Service Unavailable"

**Cause:** Cold start (free tier sleeps after 15 min)
**Solution:** Wait 30 seconds, refresh page

### Issue: CORS errors in browser console

**Check:**
1. Render environment variable `FRONTEND_URL` matches Vercel URL exactly
2. No trailing slash in URL

**Fix:**
```bash
# Render Dashboard → Environment → Update FRONTEND_URL
FRONTEND_URL=https://dotfak-contractor-management.vercel.app
```

### Issue: "Failed to fetch" errors

**Cause:** Backend not deployed or URL mismatch
**Solution:**
1. Check Render service is running
2. Verify `NEXT_PUBLIC_API_URL` in Vercel matches Render URL exactly
3. Redeploy frontend: `npx vercel --prod`

### Issue: Login fails with 401

**Cause:** JWT secret mismatch
**Solution:**
1. Go to Render → Environment
2. Verify `SUPABASE_JWT_SECRET` matches Supabase dashboard
3. Redeploy service

---

## Cost & Performance

**Monthly Cost:** $0 (100% free tier)

**Performance:**
- **First request:** 20-30s (cold start on Render free tier)
- **Subsequent requests:** < 500ms
- **Frontend:** Instant (served from Vercel edge network)

**Free Tier Limits:**
- Render: 750 hours/month (more than enough for 1 instance)
- Vercel: Unlimited deployments, 100GB bandwidth
- Supabase: 500MB database, unlimited API requests

---

## Next Steps After Deployment

1. ✅ **Create your first contractor**
2. ✅ **Upload a paystub**
3. ✅ **Record a payment**
4. ✅ **Monitor usage in dashboards**
5. ✅ **Share the URL with your team**

---

## Security Reminders

- ✅ Never commit `.env` files
- ✅ Use strong passwords for admin accounts
- ✅ Rotate JWT secrets periodically
- ✅ Monitor Supabase logs for suspicious activity
- ✅ Keep dependencies updated (`npm audit`, `pip-audit`)

---

**You're all set! 🚀**

Your contractor management platform is now live in production!
