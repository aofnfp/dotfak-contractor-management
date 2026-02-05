# Quick Start: Complete Cloudflare Pages Deployment

## What Needs to Be Done Right Now

Your build is succeeding, but deployment is failing due to an incorrect configuration. Follow these steps to fix it.

---

## Step 1: Fix Cloudflare Pages Configuration (5 minutes)

### 1.1 Remove Deploy Command

1. Go to: https://dash.cloudflare.com
2. Click **Workers & Pages** → **dotfak-contractor-management** → **Settings**
3. Scroll to **Build configuration**
4. Find **Deploy command** field
5. **DELETE the text** (`npx wrangler deploy`) or leave it empty
6. Click **Save**

**Why?** Cloudflare Pages auto-deploys after build completes. The deploy command is only for Workers, not Pages.

### 1.2 Verify Environment Variables

Still in Settings, scroll to **Environment variables**:

```
NEXT_PUBLIC_API_URL = https://dotfak-contractor-management.onrender.com
NEXT_PUBLIC_APP_NAME = DotFak Contractor Management
```

If missing, click **Add variable** and set them.

### 1.3 Retry Deployment

Go to **Deployments** tab → Click **Retry deployment** on the failed deployment.

**Expected result:**
```
✅ Build succeeded
✅ Deploying to Cloudflare's global network...
✅ Deployment complete!
🌐 https://dotfak-contractor-management.pages.dev
```

---

## Step 2: Update Backend CORS (2 minutes)

Once Cloudflare deployment succeeds:

1. Go to: https://dashboard.render.com
2. Select service: **dotfak-contractor-management** (backend)
3. Click **Environment** tab
4. Find **FRONTEND_URL** variable
5. Click **Edit**
6. Update to: `https://dotfak-contractor-management.pages.dev`
7. Click **Save Changes**
8. Wait 1-2 minutes for automatic redeploy

---

## Step 3: Test Production (5 minutes)

### 3.1 Login Test

1. Open: https://dotfak-contractor-management.pages.dev
2. Login with admin credentials:
   - Email: `admin@dotfakgroup.com`
   - Password: Your admin password
3. Should redirect to dashboard

### 3.2 Dashboard Test

Dashboard should load with real-time stats:
- Total contractors
- Total unpaid amount
- Recent paystubs

### 3.3 API Test (Optional)

Open browser DevTools (F12) → Network tab:
- API calls should go to `https://dotfak-contractor-management.onrender.com`
- No CORS errors in console
- All requests should return 200 OK

---

## Troubleshooting

### "Failed to fetch" errors

**Fix:** Update `FRONTEND_URL` in Render, wait 2 minutes, clear browser cache, retry.

### Environment variables not working

**Fix:** Add them in Cloudflare Pages → Settings → Environment variables, save, retry deployment.

### Still seeing build errors

**Fix:** Check full error in Cloudflare Pages → Deployments → Click on failed deployment → View logs.

---

## Next Steps (After Production Works)

1. ✅ Monitor for 1 week
2. ✅ Check Cloudflare Analytics (free, automatic)
3. ✅ If stable, decommission Vercel deployment
4. ✅ Optional: Add custom domain (e.g., app.dotfakgroup.com)

---

## Summary

**You're 3 steps away from production:**

1. ✅ Remove deploy command in Cloudflare Pages settings (5 min)
2. ✅ Update FRONTEND_URL in Render dashboard (2 min)
3. ✅ Test login and dashboard (5 min)

**Total time:** 12 minutes

**Need help?** Check [CLOUDFLARE_DEPLOYMENT_GUIDE.md](./CLOUDFLARE_DEPLOYMENT_GUIDE.md) for detailed troubleshooting.
