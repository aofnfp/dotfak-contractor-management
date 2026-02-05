# Fix: Cloudflare Pages Cache Size Limit

## Issue

Deployment was failing with error:
```
Error: Pages only supports files up to 25 MiB in size
cache/webpack/client-production/0.pack is 47.8 MiB in size
```

## Root Cause

Cloudflare Pages was trying to deploy the entire `frontend/.next` directory, which includes:
- ✅ `server/` - server code (needed)
- ✅ `static/` - static assets (needed)
- ❌ `cache/` - webpack build cache (47.8 MiB, NOT needed for deployment)

The cache directory exceeds Cloudflare's 25 MiB per-file limit.

## Solution

Created a build preparation script that excludes cache files.

### What Was Changed

**1. Created: `frontend/scripts/prepare-cloudflare.js`**
- Copies `.next/` to `.next-cloudflare/`
- Excludes `cache/` directory
- This clean output directory is what Cloudflare deploys

**2. Updated: `frontend/package.json`**
```json
{
  "scripts": {
    "build:cloudflare": "next build && node scripts/prepare-cloudflare.js"
  }
}
```

**3. Updated: `.gitignore`**
- Added `frontend/.next-cloudflare/` to prevent committing build output

## Updated Cloudflare Pages Configuration

Go to your Cloudflare Pages project settings and update:

### Build Configuration

```
Framework preset: Next.js
Build command: cd frontend && npm install && npm run build:cloudflare
Build output directory: frontend/.next-cloudflare
Root directory: /
Production branch: main
```

**Key changes:**
- ✅ Build command: `npm run build:cloudflare` (was `npm run build`)
- ✅ Build output directory: `frontend/.next-cloudflare` (was `frontend/.next`)

### Environment Variables

Make sure these are set:
```
NEXT_PUBLIC_API_URL = https://dotfak-contractor-management.onrender.com
NEXT_PUBLIC_APP_NAME = DotFak Contractor Management
```

## How to Apply the Fix

### Step 1: Update Cloudflare Pages Settings

1. Go to: https://dash.cloudflare.com
2. Click **Workers & Pages** → Your project
3. Click **Settings** → Scroll to **Build configuration**
4. Update **Build command** to:
   ```
   cd frontend && npm install && npm run build:cloudflare
   ```
5. Update **Build output directory** to:
   ```
   frontend/.next-cloudflare
   ```
6. Click **Save**

### Step 2: Trigger Redeploy

Option A: Retry failed deployment
1. Go to **Deployments** tab
2. Click on the failed deployment
3. Click **Retry deployment**

Option B: Trigger new deployment via Git
```bash
cd "/Users/abrahamoladotun/Documents/Paystub Extractor"
git add .
git commit -m "fix: exclude cache directory from Cloudflare Pages deployment"
git push origin main
```

### Step 3: Verify Deployment Success

After 2-3 minutes, you should see:

```
✅ Cloning repository
✅ Installing dependencies
✅ Building application
✅ Preparing build for Cloudflare Pages...
✅ Skipping: cache/
✅ Build prepared successfully!
✅ Deploying to Cloudflare's network
✨ Success! Deployed to https://your-project.pages.dev
```

## Expected Build Log Output

You should now see this in the build logs:

```
> dotfak-contractor-frontend@1.0.0 build:cloudflare
> next build && node scripts/prepare-cloudflare.js

✓ Compiled successfully
✓ Generating static pages (15/15)
✓ Finalizing page optimization

Preparing build for Cloudflare Pages...
Skipping: cache/
Copying build output...
✓ Build prepared successfully!
Output directory: .next-cloudflare
```

## File Size Comparison

| Directory | Size | Deployed? |
|-----------|------|-----------|
| `.next/cache/` | 47.8 MB | ❌ No (excluded) |
| `.next/server/` | ~5 MB | ✅ Yes |
| `.next/static/` | ~2 MB | ✅ Yes |
| **Total deployed** | **~7 MB** | ✅ Under limit |

## Troubleshooting

### Build still fails with cache error

**Cause:** Build command wasn't updated

**Fix:** Verify build command in Cloudflare Pages settings uses `npm run build:cloudflare`

### Script not found error

**Cause:** `scripts/prepare-cloudflare.js` doesn't exist

**Fix:** Ensure you've committed and pushed the new script file:
```bash
git add frontend/scripts/prepare-cloudflare.js
git commit -m "add: Cloudflare build preparation script"
git push origin main
```

### Deployment succeeds but site shows errors

**Cause:** Missing required files in clean build

**Fix:** Verify `.next-cloudflare/` contains `server/` and `static/` directories

## Next Steps

After deployment succeeds:
1. ✅ Get production URL from Deployments tab
2. ✅ Update Render backend CORS with Cloudflare URL
3. ✅ Test login and dashboard
4. ✅ Verify API calls work correctly

---

**This fix ensures only necessary files are deployed, staying under Cloudflare's 25 MiB limit.**
