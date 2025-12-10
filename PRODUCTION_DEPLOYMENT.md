# FlipSOL Production Deployment Guide

## Current State vs Production Requirements

### 1. **Game Mechanics** ✅ READY
- 50/50 coin flip odds (NOT 1% - that's a misunderstanding)
- House edge: 3% (2% rake + 1% jackpot)
- Smart contract is secure with proper system program transfers
- Auto-settlement via backend cron

### 2. **Referral System** ⚠️ NEEDS UPGRADE

**Current (NOT production-ready):**
- Stored in localStorage
- No persistence across devices
- No on-chain rewards
- Can be manipulated

**Production Options:**

#### Option A: Database Backend (Recommended for MVP)
```javascript
// Backend API endpoints needed:
POST /api/referrals/track
GET /api/referrals/stats/:walletAddress
GET /api/referrals/leaderboard

// Store in PostgreSQL/MongoDB:
{
  referrer_wallet: "ABC123...",
  referred_wallet: "XYZ789...",
  total_volume: 10.5,
  commission_earned: 0.105, // 1% of volume
  timestamp: "2024-12-08"
}
```

#### Option B: On-Chain Referral System
```rust
// Add to Solana program:
pub struct ReferralAccount {
    pub referrer: Pubkey,
    pub referred: Pubkey,
    pub total_volume: u64,
    pub commission_earned: u64,
    pub commission_claimed: u64,
}

// New instruction: claim_referral_commission
```

#### Option C: Hybrid with Convex/Supabase
- Real-time syncing across devices
- Easy analytics dashboard
- Lower cost than on-chain
- Quick to implement

### 3. **Casino Vibes** 🎰 ENHANCEMENTS

**Already Added:**
- Coin drop sounds on bet
- Confetti animations
- Win/lose sounds

**To Add for Full Casino Experience:**
```javascript
// 1. Neon glow effects
.casino-glow {
  box-shadow: 
    0 0 20px rgba(255, 0, 255, 0.5),
    0 0 40px rgba(0, 255, 255, 0.3),
    0 0 60px rgba(255, 255, 0, 0.2);
  animation: pulse-neon 2s infinite;
}

// 2. Background casino ambience
const casinoAmbience = new Audio('/sounds/casino-ambience.mp3');
casinoAmbience.loop = true;
casinoAmbience.volume = 0.3;

// 3. Jackpot animations
import Lottie from 'lottie-react';
import jackpotAnimation from './animations/jackpot.json';

// 4. Live activity feed
<LiveFeed>
  <FeedItem>🎰 0xABC... won 5.2 SOL on Heads!</FeedItem>
  <FeedItem>💰 Jackpot now at 125 SOL!</FeedItem>
</LiveFeed>
```

## Mainnet Deployment Steps

### 1. **Program Deployment**
```bash
# Update to mainnet
solana config set --url https://api.mainnet-beta.solana.com

# Deploy with multisig authority
anchor deploy --provider.cluster mainnet \
  --program-name flipsol \
  --program-keypair ./mainnet-program-keypair.json

# Set upgrade authority to multisig
solana program set-upgrade-authority <PROGRAM_ID> \
  --new-upgrade-authority <MULTISIG_ADDRESS>
```

### 2. **Frontend Configuration**
```typescript
// src/config/constants.ts
export const NETWORK = 'mainnet-beta';
export const RPC_URL = process.env.VITE_RPC_URL || 'https://api.mainnet-beta.solana.com';
export const PROGRAM_ID = new PublicKey('YOUR_MAINNET_PROGRAM_ID');

// Add RPC endpoints for better performance
const RPC_ENDPOINTS = [
  'https://solana-mainnet.g.alchemy.com/v2/YOUR_KEY',
  'https://rpc.helius.xyz/?api-key=YOUR_KEY',
  'https://mainnet.rpcpool.com/YOUR_KEY'
];
```

### 3. **Backend Updates**
```javascript
// backend/.env.production
NODE_ENV=production
RPC_URL=https://rpc.helius.xyz/?api-key=YOUR_KEY
PROGRAM_ID=YOUR_MAINNET_PROGRAM_ID
CRON_AUTHORITY_PRIVATE_KEY=[...] // Use AWS Secrets Manager
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

// Add rate limiting
app.use(rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60 // limit each IP to 60 requests per minute
}));

// Add monitoring
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
```

### 4. **Database Schema for Referrals**
```sql
-- PostgreSQL schema
CREATE TABLE referrals (
  id SERIAL PRIMARY KEY,
  referrer_wallet VARCHAR(44) NOT NULL,
  referred_wallet VARCHAR(44) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(referrer_wallet, referred_wallet)
);

CREATE TABLE referral_earnings (
  id SERIAL PRIMARY KEY,
  referrer_wallet VARCHAR(44) NOT NULL,
  round_id INTEGER NOT NULL,
  bet_amount DECIMAL(20, 9) NOT NULL,
  commission_amount DECIMAL(20, 9) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_referrer_wallet ON referral_earnings(referrer_wallet);
```

### 5. **Security Checklist**
- [ ] Enable HTTPS only
- [ ] Add CSP headers
- [ ] Implement rate limiting
- [ ] Use environment variables for secrets
- [ ] Enable CORS for your domain only
- [ ] Add request signing for critical endpoints
- [ ] Implement proper error handling
- [ ] Add comprehensive logging
- [ ] Set up monitoring (Datadog/NewRelic)
- [ ] Configure alerts for anomalies

### 6. **Deployment Services**

**Frontend:**
- Vercel (recommended): Auto-deploys, global CDN
- Cloudflare Pages: Fast, free SSL
- AWS Amplify: If already using AWS

**Backend:**
- Railway.app: Easy deployment with PostgreSQL
- Render.com: Auto-scaling, managed PostgreSQL
- AWS ECS: For full control

**Database:**
- Supabase: PostgreSQL + real-time + auth
- PlanetScale: Serverless MySQL
- Neon: Serverless PostgreSQL

### 7. **Launch Checklist**
- [ ] Audit smart contract (Sec3, Halborn)
- [ ] Load test with 1000+ concurrent users
- [ ] Set up hot wallet for cron operations
- [ ] Configure monitoring dashboards
- [ ] Prepare incident response plan
- [ ] Set up customer support system
- [ ] Create terms of service / privacy policy
- [ ] Implement KYC/AML if required
- [ ] Set up analytics (Mixpanel, Amplitude)
- [ ] Configure error tracking (Sentry)

## Quick Start Commands

```bash
# 1. Deploy program to mainnet
npm run deploy:mainnet

# 2. Initialize program
npm run initialize:mainnet

# 3. Deploy frontend
vercel --prod

# 4. Deploy backend
railway up

# 5. Run health checks
npm run health:check
```

## Referral Commission Structure

**Recommended for Launch:**
- Direct referral: 0.5% of bet volume
- Paid weekly in SOL
- Minimum payout: 0.1 SOL
- Dashboard shows real-time stats
- Leaderboard with bonus rewards

**Future Enhancements:**
- Multi-tier referral system
- NFT rewards for top referrers
- Exclusive games for VIP referrers
- Revenue share tokens

## Support

For deployment issues:
- Discord: discord.gg/flipsol
- Email: dev@flipsol.com
- Docs: docs.flipsol.com