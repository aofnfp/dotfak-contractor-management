# Backend CORS Update for Multiple Origins (Optional)

## Current Setup

The backend currently supports only one `FRONTEND_URL` from the environment variable:

```python
# backend/config.py (line 29)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# backend/main.py (lines 54-62)
allowed_origins = [FRONTEND_URL]
if ENVIRONMENT == "development":
    allowed_origins.extend([
        "http://localhost:3000",
        ...
    ])
```

## Option 1: Single Origin (Recommended for Production)

**When to use:** After Cloudflare Pages deployment is confirmed working and you're ready to decommission Vercel.

### Update Render Environment Variable

1. Go to: https://dashboard.render.com
2. Select service: **dotfak-contractor-management** (backend)
3. Click **Environment** tab
4. Find **FRONTEND_URL** variable
5. Update value to: `https://dotfak-contractor-management.pages.dev`
6. Click **Save Changes**
7. Wait 1-2 minutes for automatic redeploy

**No code changes needed!**

---

## Option 2: Multiple Origins (For Transition Period)

**When to use:** If you want to keep both Vercel and Cloudflare working during the transition.

### Step 1: Update Backend Code

Edit `backend/main.py` to support comma-separated origins:

**Current code (lines 54-62):**
```python
# CORS configuration - use frontend URL from config
allowed_origins = [FRONTEND_URL]
if ENVIRONMENT == "development":
    allowed_origins.extend([
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3004",
    ])
```

**Updated code:**
```python
# CORS configuration - support multiple frontend URLs (comma-separated)
frontend_urls = [url.strip() for url in FRONTEND_URL.split(",")]
allowed_origins = frontend_urls
if ENVIRONMENT == "development":
    allowed_origins.extend([
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3004",
    ])
```

### Step 2: Update Render Environment Variable

Set `FRONTEND_URL` to include both URLs (comma-separated):

```
https://frontend-five-delta-82.vercel.app,https://dotfak-contractor-management.pages.dev
```

### Step 3: Deploy Updated Code

```bash
cd "/Users/abrahamoladotun/Documents/Paystub Extractor"
git add backend/main.py
git commit -m "feat: support multiple CORS origins"
git push origin main
```

Render will automatically redeploy the backend with the updated CORS configuration.

---

## Recommendation

**Use Option 1** unless you have a specific reason to keep both deployments active.

**Transition Timeline:**
1. Day 1: Deploy to Cloudflare Pages, update CORS to Cloudflare URL only
2. Day 1-7: Monitor Cloudflare deployment (analytics, error logs, user feedback)
3. Day 7: If stable, decommission Vercel deployment

**Benefits of Single Origin:**
- Simpler configuration
- Easier to debug
- Clear production URL
- No confusion about which deployment is "live"

---

## Current Render Environment Variables

You should have these set in Render:

```
SUPABASE_URL=https://pcatbotfxeqrinydewen.supabase.co
SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_KEY=[your-service-key]
SUPABASE_JWT_SECRET=[your-jwt-secret]
DATABASE_URL=postgresql://postgres:[password]@db.pcatbotfxeqrinydewen.supabase.co:5432/postgres
FRONTEND_URL=[UPDATE THIS TO CLOUDFLARE URL]
ENVIRONMENT=production
API_HOST=0.0.0.0
API_PORT=8000
```

**Only change:** `FRONTEND_URL`

---

## Testing CORS After Update

1. Open Cloudflare Pages URL
2. Open browser DevTools → Network tab
3. Try logging in
4. Check API request headers:
   - Should see `Origin: https://dotfak-contractor-management.pages.dev`
5. Check response headers:
   - Should see `Access-Control-Allow-Origin: https://dotfak-contractor-management.pages.dev`
6. No CORS errors in console

If you see CORS errors:
- Verify `FRONTEND_URL` is set correctly in Render
- Wait 2-3 minutes for Render to finish redeploying
- Clear browser cache and retry
- Check Render logs for any startup errors

---

## Summary

**Quick Path (Recommended):**
1. ✅ Wait for Cloudflare Pages deployment to succeed
2. ✅ Update `FRONTEND_URL` in Render dashboard to Cloudflare URL
3. ✅ Wait 2 minutes for Render to redeploy
4. ✅ Test login and dashboard
5. ✅ Done!

**No code changes required for Option 1.**
