# Railway Backend Deployment Guide

## Prerequisites

1. Create a Railway account at https://railway.app
2. Install Railway CLI (optional):
```bash
npm install -g @railway/cli
```

## Deployment Steps

### 1. Create New Project on Railway

```bash
# Option 1: Using CLI
cd backend
railway login
railway init

# Option 2: Using Web UI
# Go to https://railway.app/new and select "Deploy from GitHub repo"
```

### 2. Set Environment Variables

In Railway dashboard, add these environment variables:

```env
# Required
SOLANA_RPC_URL=https://api.devnet.solana.com
PRIVATE_KEY=[your-admin-wallet-private-key-array]
ENABLE_CRON=true

# Optional
PORT=3001
NODE_ENV=production
```

**IMPORTANT**: For PRIVATE_KEY, use the JSON array format:
```
[123,456,789,...] 
```

### 3. Deploy Backend

```bash
# Using CLI
railway up

# Or push to GitHub and Railway will auto-deploy
git add .
git commit -m "Deploy backend"
git push
```

### 4. Get Backend URL

After deployment, Railway will provide a URL like:
```
https://flipsol-backend.up.railway.app
```

### 5. Configure CORS

Update backend/src/index.ts to allow your frontend domain:

```typescript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-vercel-app.vercel.app',
    process.env.FRONTEND_URL
  ],
  credentials: true
}));
```

## Environment Variables Explained

- `SOLANA_RPC_URL`: RPC endpoint for Solana network
- `PRIVATE_KEY`: Admin wallet private key (JSON array format)
- `ENABLE_CRON`: Set to 'true' to enable automatic round settlement
- `PORT`: Server port (Railway provides this automatically)
- `NODE_ENV`: Set to 'production' for production deployment

## Database Setup

Railway automatically provides PostgreSQL. The connection URL will be available as `DATABASE_URL`.

If using Prisma:
```bash
npx prisma migrate deploy
```

## Monitoring

- Logs: Available in Railway dashboard
- Metrics: CPU, Memory, Network usage visible in dashboard
- Alerts: Set up in Railway settings

## Troubleshooting

1. **Build fails**: Check package.json has all dependencies
2. **App crashes**: Check logs for missing env vars
3. **CORS errors**: Update allowed origins in backend
4. **Database errors**: Run migrations with `npx prisma migrate deploy`

## Scaling

Railway supports:
- Horizontal scaling (multiple instances)
- Vertical scaling (more resources)
- Auto-scaling based on metrics

## Security Notes

1. **Never commit private keys** - Use environment variables
2. **Use secrets management** - Railway encrypts env vars
3. **Enable HTTPS** - Railway provides SSL automatically
4. **Rate limiting** - Implement in your backend code
5. **Monitor logs** - Check for suspicious activity