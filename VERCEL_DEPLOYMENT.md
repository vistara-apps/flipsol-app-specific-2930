# Vercel Deployment Guide for FlipSOL

## Prerequisites

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Have your Vercel account ready

## Environment Variables

You'll need to set these environment variables in Vercel:

- `SOLANA_RPC_URL`: Your Solana RPC endpoint (e.g., https://api.devnet.solana.com)
- `BACKEND_URL`: Your backend API URL (deployed separately)
- `CONVEX_URL`: Your Convex deployment URL

## Deployment Steps

### 1. Deploy Frontend to Vercel

```bash
# From the project root
vercel

# Follow the prompts:
# - Link to existing project or create new
# - Choose the correct settings (auto-detected from vercel.json)
```

### 2. Set Environment Variables

```bash
# Set production environment variables
vercel env add SOLANA_RPC_URL production
vercel env add BACKEND_URL production
vercel env add CONVEX_URL production
```

Or use the Vercel Dashboard:
1. Go to your project settings
2. Navigate to Environment Variables
3. Add the required variables

### 3. Deploy Backend Separately

The backend needs to be deployed separately (e.g., on Railway, Heroku, or a VPS):

```bash
cd backend
npm run build
npm start
```

Backend environment variables needed:
- `SOLANA_RPC_URL`
- `PRIVATE_KEY` (admin wallet)
- `PORT` (default: 3001)
- `ENABLE_CRON` (set to 'true' to enable autonomous rounds)

### 4. Update Frontend with Backend URL

After deploying the backend, update the `BACKEND_URL` in Vercel:

```bash
vercel env rm BACKEND_URL production
vercel env add BACKEND_URL production
# Enter your backend URL (e.g., https://your-backend.railway.app)
```

### 5. Redeploy

```bash
vercel --prod
```

## Important Notes

1. **CORS**: Make sure your backend allows requests from your Vercel domain
2. **RPC Endpoint**: Use a reliable RPC endpoint for production (not the free devnet)
3. **Private Keys**: NEVER commit private keys. Use environment variables
4. **SSL**: Both frontend and backend should use HTTPS in production

## Monitoring

- Frontend logs: Available in Vercel dashboard
- Backend logs: Check your backend hosting provider
- Solana transactions: Monitor on Solscan

## Custom Domain

To add a custom domain:

```bash
vercel domains add your-domain.com
```

Or use the Vercel dashboard to configure DNS settings.