# Solana RPC Providers Guide

## Free Tier Options for Devnet

### 1. Helius (Recommended)
- **Sign up**: https://www.helius.dev/
- **Free tier**: 100k credits/month (~1M requests)
- **Devnet URL**: `https://devnet.helius-rpc.com/?api-key=YOUR_API_KEY`
- **Get API Key**: Dashboard → Create New Project → Copy API Key

### 2. QuickNode
- **Sign up**: https://www.quicknode.com/
- **Free tier**: 10M requests/month
- **Devnet URL**: Create endpoint in dashboard, select Solana Devnet
- **Format**: `https://YOUR-ENDPOINT.solana-devnet.quiknode.pro/YOUR-KEY/`

### 3. Alchemy
- **Sign up**: https://www.alchemy.com/
- **Free tier**: 300M compute units/month
- **Devnet URL**: `https://solana-devnet.g.alchemy.com/v2/YOUR-API-KEY`
- **Get API Key**: Create App → Select Solana → Devnet

### 4. GetBlock
- **Sign up**: https://getblock.io/
- **Free tier**: 40k requests/day
- **Devnet URL**: Available after registration

## For Production (Mainnet)

When ready for mainnet:
1. Use the same providers but select Mainnet
2. Consider paid tiers for better performance
3. Implement RPC fallbacks in your code

## Setting in Vercel

After getting your RPC URL:
```bash
vercel env add VITE_SOLANA_RPC_URL production
# Paste your RPC URL when prompted
```

Or via Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add `VITE_SOLANA_RPC_URL` with your RPC URL
3. Select "Production" environment
4. Save and redeploy