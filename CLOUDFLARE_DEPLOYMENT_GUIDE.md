# Cloudflare Pages Deployment Guide

## Current Status

✅ **Completed:**
- Removed deprecated `@cloudflare/next-on-pages` adapter
- Configured Next.js for native Cloudflare Pages support
- Build succeeds on Cloudflare Pages (15/15 static pages generated)
- Code committed and pushed to GitHub

⚠️ **Issue:**
- Deployment fails due to incorrect deploy command configuration
- Error: `Missing entry-point to Worker script or to assets directory`

## Fix Required: Update Cloudflare Pages Configuration

### Step 1: Remove Deploy Command (CRITICAL)

1. Go to: https://dash.cloudflare.com
2. Click **Workers & Pages** in left sidebar
3. Click your project: **dotfak-contractor-management**
4. Click **Settings** tab
5. Scroll to **Build configuration**
6. Find **Deploy command** field
7. **DELETE or LEAVE EMPTY** the deploy command (`npx wrangler deploy`)
   - Cloudflare Pages auto-deploys after build completes
   - Deploy commands are only for Cloudflare Workers, not Pages

### Step 2: Verify Build Configuration

Ensure these settings are correct:

```
Framework preset: Next.js
Build command: cd frontend && npm install && npm run build
Build output directory: frontend/.next
Root directory: / (leave as root)
Production branch: main
```

### Step 3: Set Environment Variables

1. Still in **Settings** tab
2. Scroll to **Environment variables**
3. Click **Add variable** (if not already set)

**Add these variables for Production:**

```
NEXT_PUBLIC_API_URL = https://dotfak-contractor-management.onrender.com
NEXT_PUBLIC_APP_NAME = DotFak Contractor Management
```

**Important:** Click **Save** after adding each variable.

### Step 4: Retry Deployment

1. Go to **Deployments** tab
2. Click **Retry deployment** on the failed deployment

**OR**

1. Make a small commit to trigger new deployment:
   ```bash
   cd "/Users/abrahamoladotun/Documents/Paystub Extractor"
   git commit --allow-empty -m "trigger: redeploy to Cloudflare Pages"
   git push origin main
   ```

### Expected Result

After removing the deploy command, you should see:

```
✅ Build succeeded
✅ Deploying to Cloudflare's global network...
✅ Deployment complete!
🌐 https://dotfak-contractor-management.pages.dev
```

---

## Step 5: Update Render Backend CORS

Once Cloudflare deployment succeeds, update the backend to allow requests from the new URL.

### Option A: Via Render Dashboard (Recommended)

1. Go to: https://dashboard.render.com
2. Select service: **dotfak-contractor-management** (or your backend service name)
3. Click **Environment** tab
4. Find **FRONTEND_URL** variable
5. Click **Edit**
6. Update value to: `https://dotfak-contractor-management.pages.dev`
7. Click **Save Changes**
8. Wait 1-2 minutes for automatic redeploy

### Option B: Support Multiple Origins (During Transition)

If you want to keep both Vercel and Cloudflare working temporarily:

Update `FRONTEND_URL` to:
```
https://frontend-five-delta-82.vercel.app,https://dotfak-contractor-management.pages.dev
```

Then verify `backend/main.py` splits on comma:

```python
origins = os.getenv("FRONTEND_URL", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # List of allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Step 6: Test Production Deployment

### 6.1 Frontend Loads

1. Open: `https://dotfak-contractor-management.pages.dev`
2. Should see login page with DotFak branding
3. Open browser console (F12) - check for errors

### 6.2 API Connection

1. Try logging in:
   - Email: `admin@dotfakgroup.com`
   - Password: Your admin password
2. Should successfully redirect to dashboard
3. Check Network tab in DevTools:
   - API calls should go to `https://dotfak-contractor-management.onrender.com`
   - No CORS errors

### 6.3 Dashboard Stats

1. Dashboard should load stats:
   - Total contractors
   - Total unpaid amount
   - Recent paystubs
2. Check Network tab for successful API responses

### 6.4 Create Contractor (End-to-End Test)

1. Click **"Add Contractor"**
2. Fill in form:
   - Contractor Code: `TEST-001`
   - First Name: `Test`
   - Last Name: `Contractor`
   - Email: `test@example.com`
3. Submit form
4. Should see success toast
5. Contractor should appear in list

### 6.5 Performance Check

1. Open Lighthouse in Chrome DevTools
2. Run audit
3. Target scores:
   - Performance > 90
   - Accessibility > 95
   - Best Practices > 95
   - SEO > 90

---

## Troubleshooting

### Issue: "Failed to fetch" errors

**Cause:** CORS not updated on Render backend

**Fix:**
1. Update `FRONTEND_URL` in Render dashboard
2. Wait 2 minutes for redeploy
3. Clear browser cache and retry

### Issue: Environment variables undefined

**Cause:** Variables not set in Cloudflare Pages

**Fix:**
1. Go to Cloudflare Pages → Settings → Environment variables
2. Add both `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_APP_NAME`
3. Click **Save**
4. Retry deployment

### Issue: 404 on page refresh

**Cause:** Missing redirects configuration

**Fix:** Cloudflare Pages handles this automatically for Next.js - if you see this, verify the build output directory is correct (`frontend/.next`)

### Issue: Build fails

**Cause:** Incompatible Next.js features or dependencies

**Fix:**
1. Check Cloudflare build logs in dashboard
2. Look for specific error messages
3. Verify `next.config.js` is compatible with Cloudflare

---

## Cloudflare Pages URLs

After successful deployment, you'll have:

- **Production:** `https://dotfak-contractor-management.pages.dev`
- **Preview deployments:** `https://[commit-hash].dotfak-contractor-management.pages.dev`

Every push to `main` branch triggers a new production deployment.
Every push to other branches creates a preview deployment.

---

## Custom Domain (Optional)

If you want to use a custom domain (e.g., `app.dotfakgroup.com`):

1. Go to Cloudflare Pages dashboard
2. Select project: **dotfak-contractor-management**
3. Click **Custom domains** tab
4. Click **Set up a custom domain**
5. Enter domain: `app.dotfakgroup.com`
6. Cloudflare automatically configures DNS
7. Wait 1-5 minutes for SSL certificate

Then update Render backend `FRONTEND_URL` to your custom domain.

---

## Monitoring

### Cloudflare Web Analytics (Free)

1. Go to Cloudflare dashboard
2. Select your Pages project
3. Click **Analytics** tab
4. See:
   - Page views, unique visitors
   - Performance metrics (TTFB, FCP, LCP)
   - Geographic distribution
   - Bandwidth usage

No tracking code needed - automatic for all Pages projects.

---

## Rollback Plan

If Cloudflare deployment doesn't work:

1. **Vercel deployment remains active** (don't delete it yet)
2. Update Render CORS back to Vercel:
   ```
   FRONTEND_URL=https://frontend-five-delta-82.vercel.app
   ```
3. Set environment variable in Vercel dashboard:
   - `NEXT_PUBLIC_API_URL` = `https://dotfak-contractor-management.onrender.com`
4. Redeploy Vercel:
   ```bash
   cd frontend
   npx vercel --prod
   ```

**Rollback time:** < 5 minutes

---

## Decommission Vercel (After Cloudflare Confirmed Working)

**Wait 1 week of stable operation, then:**

1. Go to: https://vercel.com/dashboard
2. Select project: **frontend-five-delta-82**
3. Click **Settings** → **Advanced** → **Delete Project**
4. Confirm deletion

---

## Summary

**What you need to do right now:**

1. ✅ Go to Cloudflare Pages dashboard
2. ✅ Remove the deploy command from Settings
3. ✅ Retry deployment
4. ✅ Get the production URL (https://dotfak-contractor-management.pages.dev)
5. ✅ Update Render backend CORS with new URL
6. ✅ Test login and dashboard
7. ✅ Celebrate! 🎉

**Estimated time:** 10-15 minutes
