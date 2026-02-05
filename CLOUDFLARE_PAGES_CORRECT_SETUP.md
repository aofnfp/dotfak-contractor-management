# Cloudflare Pages - Correct Project Setup

## Issue Identified

You accidentally created a **Cloudflare Workers** project instead of a **Cloudflare Pages** project.

**Evidence:**
- Settings show "Version command: npx wrangler versions upload" (Workers-specific)
- Deployments show "version(s)" instead of URLs
- Missing "Build output directory" field
- Getting "no active route" error

## Solution: Create Proper Cloudflare Pages Project

### Step 1: Delete Current Workers Project (Optional)

1. Go to: https://dash.cloudflare.com
2. Click **Workers & Pages** in left sidebar
3. Find project: **dotfak-contractor-management**
4. Click on it → **Settings** → **Advanced** (scroll down)
5. Click **Delete** (optional - you can keep it for reference)

### Step 2: Create New Cloudflare Pages Project

1. Go to: https://dash.cloudflare.com
2. Click **Workers & Pages** in left sidebar
3. Click **Create application**
4. **IMPORTANT:** Click the **"Pages"** tab at the top (NOT Workers tab)
5. Click **"Connect to Git"**

### Step 3: Connect GitHub Repository

1. Click **GitHub**
2. Authorize Cloudflare (if first time)
3. Select repository: **Abraham-Oladotun-Foundation/dotfak-contractor-management**
4. Click **"Begin setup"**

### Step 4: Configure Build Settings

**IMPORTANT: These fields will appear during Pages project creation:**

```
Project name: dotfak-contractor-management
Production branch: main

Build settings:
Framework preset: Next.js
Build command: cd frontend && npm install && npm run build
Build output directory: frontend/.next
Root directory: / (leave as root)
```

**Critical:** The "Build output directory" field will appear automatically when you select "Next.js" as Framework preset.

### Step 5: Set Environment Variables

Before clicking "Save and Deploy", click **"Environment variables (advanced)"**:

**Add these variables for Production:**
```
NEXT_PUBLIC_API_URL = https://dotfak-contractor-management.onrender.com
NEXT_PUBLIC_APP_NAME = DotFak Contractor Management
```

Click **"Save and Deploy"**

### Step 6: Wait for Build

Build will take 2-3 minutes. You'll see:

```
✅ Cloning repository
✅ Installing dependencies
✅ Building application
✅ Deploying to Cloudflare's network
✨ Success! Deployed to https://dotfak-contractor-management.pages.dev
```

### Step 7: Find Your Production URL

After deployment succeeds:

1. Go to **Deployments** tab
2. You'll see a list of deployments with **URLs** (not version IDs)
3. Latest deployment will show: `https://<hash>.dotfak-contractor-management.pages.dev`
4. Production URL: `https://dotfak-contractor-management.pages.dev`

Click on the URL to test your site!

## Differences: Workers vs Pages

| Feature | Workers | Pages (Correct) |
|---------|---------|-----------------|
| **Purpose** | Serverless functions | Static sites + SSR |
| **Deploy method** | `wrangler deploy` | Git push (auto-deploy) |
| **Settings** | Version command, Deploy command | Framework preset, Build output directory |
| **Deployments** | Version IDs (v abc123) | URLs (https://xyz.pages.dev) |
| **URL** | Custom route | Auto .pages.dev domain |

## What You Should See (Pages Project)

### Settings → Builds & deployments

```
Framework preset: Next.js ← YOU SHOULD SEE THIS
Build command: cd frontend && npm install && npm run build
Build output directory: frontend/.next ← YOU SHOULD SEE THIS
Root directory: /
Production branch: main
```

### Deployments Tab

```
Production
✅ https://dotfak-contractor-management.pages.dev
   35 minutes ago • main • abc123

Preview deployments
✅ https://abc123.dotfak-contractor-management.pages.dev
   1 hour ago • main • def456
```

## Next Steps After Correct Setup

1. ✅ Verify frontend loads at .pages.dev URL
2. ✅ Copy production URL
3. ✅ Update Render backend CORS with new URL
4. ✅ Test login and dashboard

---

**Start over with Step 2 above to create the correct Pages project.**
