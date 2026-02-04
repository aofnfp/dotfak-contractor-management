# Render.com Environment Variables Setup

## Step-by-Step Guide

### 1. Get Your Supabase Credentials

Go to your Supabase Dashboard:
👉 https://supabase.com/dashboard/project/pcatbotfxeqrinydewen/settings/api

You'll see:
- **Project URL** (already visible)
- **Anon (public) key** - Click "Reveal" to copy
- **Service role key** - Click "Reveal" to copy (⚠️ Keep this secret!)

Also get JWT Secret from:
👉 https://supabase.com/dashboard/project/pcatbotfxeqrinydewen/settings/api
- Scroll down to **JWT Settings**
- Copy the **JWT Secret**

Get Database URL from:
👉 https://supabase.com/dashboard/project/pcatbotfxeqrinydewen/settings/database
- Look for **Connection string** under "Connection pooling"
- Copy the **URI** (starts with `postgresql://`)

---

## 2. Add to Render Dashboard

When creating your web service on Render, go to the **Environment** tab and add these **8 variables**:

### Required Variables (Copy-Paste Format)

```bash
# 1. Supabase URL
SUPABASE_URL
https://pcatbotfxeqrinydewen.supabase.co

# 2. Supabase Anon Key (get from dashboard)
SUPABASE_ANON_KEY
[paste your anon key here - it's long, starts with "eyJ..."]

# 3. Supabase Service Role Key (get from dashboard)
SUPABASE_SERVICE_KEY
[paste your service role key here - it's long, starts with "eyJ..."]

# 4. JWT Secret (get from dashboard)
SUPABASE_JWT_SECRET
[paste your JWT secret here - very long string]

# 5. Database URL (get from dashboard)
DATABASE_URL
postgresql://postgres.[your-project-ref]:[your-password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres

# 6. API Host (use exactly this)
API_HOST
0.0.0.0

# 7. API Port (use exactly this - Render provides $PORT)
API_PORT
$PORT

# 8. Environment (use exactly this)
ENVIRONMENT
production
```

### Optional (Add Later When Frontend is Ready)

```bash
# 9. Frontend URL (add after deploying frontend to Vercel)
FRONTEND_URL
https://your-app-name.vercel.app
```

---

## 3. How to Add Variables in Render

1. Go to: https://dashboard.render.com/
2. Click your web service (or while creating it)
3. Go to **Environment** tab
4. For each variable:
   - Click **"Add Environment Variable"**
   - Enter **Key** (e.g., `SUPABASE_URL`)
   - Enter **Value** (e.g., `https://pcatbotfxeqrinydewen.supabase.co`)
   - Click **"Save"**

---

## 4. Quick Checklist

Before deploying, make sure you have:

- [ ] ✅ SUPABASE_URL (from Supabase Settings > API)
- [ ] ✅ SUPABASE_ANON_KEY (from Supabase Settings > API, click "Reveal")
- [ ] ✅ SUPABASE_SERVICE_KEY (from Supabase Settings > API, click "Reveal")
- [ ] ✅ SUPABASE_JWT_SECRET (from Supabase Settings > API > JWT Settings)
- [ ] ✅ DATABASE_URL (from Supabase Settings > Database > Connection string)
- [ ] ✅ API_HOST = `0.0.0.0`
- [ ] ✅ API_PORT = `$PORT`
- [ ] ✅ ENVIRONMENT = `production`

---

## 5. Where to Find Each Value

| Variable | Location | Format |
|----------|----------|--------|
| SUPABASE_URL | Settings > API | `https://xxx.supabase.co` |
| SUPABASE_ANON_KEY | Settings > API > "Reveal" | `eyJhbGc...` (long JWT) |
| SUPABASE_SERVICE_KEY | Settings > API > "Reveal" | `eyJhbGc...` (long JWT) |
| SUPABASE_JWT_SECRET | Settings > API > JWT Settings | Very long string |
| DATABASE_URL | Settings > Database > Connection string | `postgresql://postgres...` |
| API_HOST | Fixed value | `0.0.0.0` |
| API_PORT | Render variable | `$PORT` |
| ENVIRONMENT | Fixed value | `production` |

---

## 6. Security Notes

⚠️ **NEVER share these values publicly:**
- ❌ Don't commit to GitHub
- ❌ Don't paste in public forums
- ❌ Don't share in screenshots

✅ **Keep these secret:**
- `SUPABASE_SERVICE_KEY` - This bypasses all security (admin access)
- `SUPABASE_JWT_SECRET` - Used to verify/create tokens
- `DATABASE_URL` - Direct database access

✅ **These are OK to expose (but still don't publish):**
- `SUPABASE_URL` - Public anyway
- `SUPABASE_ANON_KEY` - Designed for frontend use (but respect RLS)

---

## 7. Test After Deployment

Once deployed, test your API:

```bash
# Replace with your actual Render URL
curl https://dotfak-backend.onrender.com/

# Should return:
{
  "service": "Paystub Extractor API",
  "version": "1.0.0",
  "status": "running"
}
```

---

## 8. Troubleshooting

### "Missing required environment variables" error

**Fix:** Check that all 8 variables are added in Render dashboard

### "Invalid credentials" or database connection errors

**Fix:**
1. Double-check DATABASE_URL is correct
2. Make sure password is included in the URL
3. Try using the "Connection pooling" URL from Supabase instead of direct connection

### CORS errors (later, when frontend is ready)

**Fix:** Add `FRONTEND_URL` variable with your Vercel URL

---

## Ready to Deploy!

Once all 8 variables are set in Render, click **"Manual Deploy"** or push to GitHub to trigger auto-deploy.

Your backend will be live at: `https://dotfak-backend.onrender.com` 🚀
