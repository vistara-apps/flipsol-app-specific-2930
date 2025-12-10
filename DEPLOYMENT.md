# FlipSOL Deployment Guide

## Quick Start Checklist

### 1. Prerequisites Setup
- [ ] Install Node.js 18+
- [ ] Install Rust and Anchor CLI
- [ ] Setup PostgreSQL database
- [ ] Install Solana CLI tools

### 2. Anchor Program Deployment

```bash
# Build the program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Save the program ID
# Update VITE_PROGRAM_ID in .env
```

### 3. Environment Configuration

**Frontend (.env):**
```env
VITE_SOLANA_NETWORK=devnet
VITE_RPC_URL=https://api.devnet.solana.com
VITE_PROGRAM_ID=<YOUR_PROGRAM_ID>
VITE_API_BASE_URL=http://localhost:3001/api
```

**Backend (backend/.env):**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/flipsol
RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=<YOUR_PROGRAM_ID>
PORT=3001
ADMIN_KEY=<generate-secret-key>
```

### 4. Database Setup

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Initialize Program

After deployment, initialize the program:

```bash
# Using Anchor CLI
anchor run initialize --rake-bps 200 --jackpot-bps 100

# Or using a script
# This creates GlobalState, Treasury, and Jackpot PDAs
```

### 6. Start Services

**Development:**
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend API
cd backend && npm run dev

# Terminal 3: Event Indexer
cd backend && npm run indexer:dev
```

**Production:**
```bash
# Frontend
npm run build
# Deploy dist/ to Vercel/Netlify

# Backend
cd backend
npm run build
npm start

# Indexer (run as service)
npm run indexer:dev
```

## Production Deployment

### Frontend (Vercel)

1. Connect GitHub repository
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Backend (Railway/Render)

1. Connect repository
2. Set environment variables
3. Set build command: `cd backend && npm install && npm run build`
4. Set start command: `cd backend && npm start`

### Database (Supabase/Neon)

1. Create PostgreSQL database
2. Run migrations:
```bash
cd backend
npx prisma migrate deploy
```

### Program (Mainnet)

```bash
# Build for mainnet
anchor build

# Deploy to mainnet
anchor deploy --provider.cluster mainnet

# Update PROGRAM_ID in all environments
```

## Monitoring

- **RPC Health**: Monitor RPC endpoint availability
- **Database**: Monitor connection pool and query performance
- **Indexer**: Monitor event processing lag
- **Transactions**: Monitor failed transactions and errors

## Security Checklist

- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS in production
- [ ] Set up CORS properly
- [ ] Use rate limiting on API
- [ ] Secure admin endpoints
- [ ] Regular security audits
- [ ] Monitor for suspicious activity

## Troubleshooting

### Program Not Found
- Verify PROGRAM_ID matches deployed program
- Check network (devnet/mainnet) matches

### Database Connection Issues
- Verify DATABASE_URL format
- Check database is accessible
- Run `npx prisma generate`

### RPC Errors
- Check RPC endpoint is accessible
- Consider using multiple RPC providers
- Monitor rate limits

### Indexer Not Syncing
- Check RPC connection
- Verify program ID matches
- Check database connection
- Review indexer logs
