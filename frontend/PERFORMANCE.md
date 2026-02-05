# Performance Monitoring

This project uses Lighthouse CI to track performance metrics and catch regressions automatically.

## Overview

- **Automated audits** run on every push to `main` and every pull request
- **Performance budgets** enforce size and timing thresholds
- **Core Web Vitals** monitored (FCP, LCP, TBT, CLS)
- **Accessibility audits** ensure WCAG compliance
- **Reports** posted as PR comments and stored as artifacts

---

## Configuration Files

### lighthouserc.json

Defines Lighthouse CI settings, assertions, and performance thresholds.

**Key settings:**
- Audits 5 critical pages (login, dashboard, contractors, earnings, payments)
- Runs 3 audits per page for consistency
- Performance score must be ≥ 90%
- Accessibility score must be ≥ 95%
- Core Web Vitals thresholds enforced

### budget.json

Defines performance budgets for resource sizes and counts.

**Budgets:**
- **JavaScript**: 200 KB (±50 KB tolerance)
- **CSS**: 50 KB (±10 KB tolerance)
- **Images**: 100 KB (±20 KB tolerance)
- **Fonts**: 100 KB (±20 KB tolerance)
- **Total page size**: 500 KB (±100 KB tolerance)

**Timing budgets:**
- **Time to Interactive**: 3.5s (±0.5s)
- **First Contentful Paint**: 2.0s (±0.3s)
- **Largest Contentful Paint**: 2.5s (±0.5s)
- **Total Blocking Time**: 300ms (±100ms)
- **Cumulative Layout Shift**: 0.1 (±0.05)

---

## Running Locally

### Prerequisites

```bash
npm install -g @lhci/cli@0.13.x
```

### Run audit

```bash
cd frontend
npm run build
npm start

# In another terminal
lhci autorun
```

This will:
1. Build the production app
2. Start the server
3. Run Lighthouse audits on all configured pages
4. Generate reports in `.lighthouseci/`
5. Check against performance budgets
6. Fail if assertions don't pass

---

## GitHub Actions Integration

The workflow (`.github/workflows/lighthouse-ci.yml`) runs automatically on:

- **Push to main**: Tracks performance over time
- **Pull requests**: Catches regressions before merge

### Workflow steps:

1. **Checkout code**
2. **Install dependencies**
3. **Build application**
4. **Run Lighthouse audits**
5. **Upload results** as artifacts (retained for 30 days)
6. **Comment on PR** with performance scores

### Example PR comment:

```
## 🔦 Lighthouse Performance Report

| Metric | Score |
|--------|-------|
| 🎯 Performance | 92% |
| ♿ Accessibility | 98% |
| 🎨 Best Practices | 95% |
| 🔍 SEO | 88% |

### Core Web Vitals
- **FCP**: 1,245ms
- **LCP**: 2,134ms
- **TBT**: 187ms
- **CLS**: 0.03

[📊 View detailed report](https://example.com/report)
```

---

## Interpreting Results

### Performance Score (Target: ≥90%)

Composite score based on:
- First Contentful Paint (10%)
- Speed Index (10%)
- Largest Contentful Paint (25%)
- Time to Interactive (10%)
- Total Blocking Time (30%)
- Cumulative Layout Shift (15%)

### Core Web Vitals

**Good thresholds:**
- **FCP** (First Contentful Paint): < 1.8s
- **LCP** (Largest Contentful Paint): < 2.5s
- **TBT** (Total Blocking Time): < 200ms
- **CLS** (Cumulative Layout Shift): < 0.1

**Our targets** (more strict):
- FCP: < 2.0s
- LCP: < 2.5s
- TBT: < 300ms
- CLS: < 0.1

### Budget Violations

If budgets are exceeded, the CI will fail with details:

```
❌ Budget exceeded for script
  Expected: 200 KB
  Actual: 245 KB
  Over by: 45 KB
```

**Common causes:**
- Large dependencies added
- Images not optimized
- Too many third-party scripts
- Unminified code in production

---

## Improving Performance

### If JavaScript budget is exceeded:

1. Check bundle analyzer:
   ```bash
   npm run build
   # Check .next/analyze/
   ```

2. Look for:
   - Large dependencies (consider alternatives)
   - Duplicate code (check for duplicated imports)
   - Unnecessary polyfills
   - Code that could be lazy-loaded

3. Solutions:
   - Use dynamic imports for heavy components
   - Tree-shake unused exports
   - Replace large libraries with lighter alternatives
   - Split code by route

### If FCP/LCP is too slow:

1. Check for:
   - Render-blocking resources
   - Large images above the fold
   - Synchronous scripts in <head>
   - Slow API calls blocking render

2. Solutions:
   - Preload critical assets
   - Optimize images (WebP, lazy loading)
   - Defer non-critical scripts
   - Show loading skeleton while fetching

### If TBT is high:

1. Check for:
   - Heavy JavaScript execution
   - Long tasks (> 50ms)
   - Expensive computations on main thread

2. Solutions:
   - Break up long tasks
   - Use Web Workers for heavy computation
   - Defer non-critical work
   - Optimize expensive operations

### If CLS is high:

1. Check for:
   - Images without dimensions
   - Fonts causing layout shift
   - Content injected above existing content
   - Ads/embeds without reserved space

2. Solutions:
   - Set explicit width/height on images
   - Use font-display: swap
   - Reserve space for dynamic content
   - Use CSS containment

---

## Monitoring Over Time

### View historical data:

1. Go to GitHub Actions
2. Click on "Lighthouse CI" workflow
3. Select a run
4. Download "lighthouse-results" artifact
5. Open HTML reports in `.lighthouseci/`

### Track trends:

Look for:
- **Performance degradation** over time
- **Budget violations** after feature additions
- **Accessibility regressions**
- **Core Web Vitals changes**

### Set up alerts:

Consider integrating with:
- **Lighthouse CI Server** (self-hosted dashboard)
- **Google Cloud Monitoring** (track Core Web Vitals)
- **Sentry Performance** (real user monitoring)

---

## Best Practices

1. **Run audits locally** before pushing
2. **Check bundle size** after adding dependencies
3. **Test on slow 3G** to simulate real conditions
4. **Monitor real user data** with RUM tools
5. **Update budgets** as app grows (gradually)
6. **Don't obsess over 100%** - aim for consistent good scores

---

## Troubleshooting

### Lighthouse CI fails on PR

**Check:**
1. Did the build succeed?
2. Are there TypeScript errors?
3. Is the server starting correctly?
4. Are all pages accessible?

**Common fixes:**
- Ensure `npm run build` works locally
- Check environment variables are set
- Verify URLs in `lighthouserc.json` are correct

### Scores vary between runs

**Normal variance:**
- ±5% is expected (network, CPU throttling)
- CI uses 3 runs and median value
- Local vs. CI environment differences

**Reduce variance:**
- Run multiple times and average
- Use consistent test environment
- Check for background processes affecting tests

### Budget too strict

**Adjust gradually:**
- Increase tolerance in `budget.json`
- Raise budget limits if growth is justified
- Balance strictness vs. feature velocity

---

## Resources

- [Lighthouse CI docs](https://github.com/GoogleChrome/lighthouse-ci)
- [Web.dev Performance](https://web.dev/performance/)
- [Core Web Vitals](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)

---

## Status

✅ Lighthouse CI configured
✅ GitHub Actions workflow set up
✅ Performance budgets defined
✅ Core Web Vitals monitored
✅ Automated PR comments enabled

**Next**: Push changes and create a test PR to see it in action!
