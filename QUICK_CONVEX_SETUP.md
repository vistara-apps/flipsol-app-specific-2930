# Quick Convex Setup for Production

## Option 1: Quick Deploy (5 minutes)

1. **Install Convex CLI**:
```bash
npm install -g convex
```

2. **Initialize Convex**:
```bash
npx convex dev --once
# This will create a project and give you a URL
```

3. **Copy the URL** and add to Vercel env vars:
```
VITE_CONVEX_URL=https://your-project.convex.cloud
```

## Option 2: Disable Convex for Now

If you want to deploy without Convex immediately, add this to Vercel env vars:
```
VITE_CONVEX_URL=https://disabled.convex.cloud
```

The referral features will be disabled but the core betting will work.

## Option 3: Use Existing Convex

From the script I found, there's already a project URL:
```
VITE_CONVEX_URL=https://hearty-koala-391.convex.cloud
```

This might work if it's still active.

## Quick Test

Add one of these URLs to Vercel and redeploy:
```bash
vercel --prod
```