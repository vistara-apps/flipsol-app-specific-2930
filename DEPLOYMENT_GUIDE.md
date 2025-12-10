# FlipSOL Deployment Guide

## Pre-Deployment Checklist

### 1. Security Audit ✅
- [x] All critical security issues fixed
- [x] Access control implemented
- [x] Integer overflow protection
- [x] Input validation added
- [x] Error handling comprehensive

### 2. Environment Setup
- [ ] Anchor CLI installed (`anchor --version`)
- [ ] Solana CLI installed (`solana --version`)
- [ ] Rust toolchain installed (`rustc --version`)
- [ ] Wallet configured (`solana config get`)

### 3. Devnet Deployment

#### Step 1: Build the Program
```bash
anchor build
```

#### Step 2: Set Devnet Cluster
```bash
solana config set --url devnet
```

#### Step 3: Get Airdrop (if needed)
```bash
solana airdrop 2
```

#### Step 4: Deploy to Devnet
```bash
# Option 1: Using deployment script
./scripts/deploy.sh devnet

# Option 2: Using Anchor directly
anchor deploy --provider.cluster devnet
```

#### Step 5: Get Program ID
After deployment, get your program ID:
```bash
solana address -k target/deploy/flipsol-keypair.json
```

#### Step 6: Update Environment Variables
Update `.env`:
```env
VITE_PROGRAM_ID=<YOUR_PROGRAM_ID>
VITE_SOLANA_NETWORK=devnet
VITE_RPC_URL=https://api.devnet.solana.com
```

Update `backend/.env`:
```env
PROGRAM_ID=<YOUR_PROGRAM_ID>
RPC_URL=https://api.devnet.solana.com
```

#### Step 7: Initialize the Program
```bash
# Using Anchor script
anchor run initialize

# Or manually using TypeScript
ts-node scripts/initialize.ts
```

This will:
- Create GlobalState PDA
- Create Treasury PDA
- Create Jackpot PDA
- Set rake to 2% (200 bps)
- Set jackpot to 1% (100 bps)
- Set minimum bet to 0.01 SOL

### 4. Testing on Devnet

#### Test 1: Start a Round
```bash
# Using Anchor client or frontend
# Duration: 60 seconds
```

#### Test 2: Place a Bet
- Connect wallet
- Place bet on Heads or Tails
- Verify bet is recorded

#### Test 3: Close Round
- Wait for round to expire OR
- Call `close_round` as authority
- Verify winner determination

#### Test 4: Claim Winnings
- If you won, claim winnings
- Verify SOL received

### 5. Mainnet Deployment

**⚠️ IMPORTANT: Only deploy to mainnet after thorough testing on devnet!**

#### Pre-Mainnet Checklist
- [ ] All devnet tests passing
- [ ] Security audit reviewed
- [ ] Multi-sig authority configured (recommended)
- [ ] Backup wallet secured
- [ ] Monitoring set up
- [ ] Emergency procedures documented

#### Mainnet Deployment Steps

1. **Switch to Mainnet**
```bash
solana config set --url mainnet-beta
```

2. **Verify Wallet Balance**
```bash
solana balance
# Need ~2-3 SOL for deployment
```

3. **Build for Mainnet**
```bash
anchor build
```

4. **Deploy to Mainnet**
```bash
anchor deploy --provider.cluster mainnet-beta
```

5. **Initialize Program**
```bash
anchor run initialize
```

6. **Update All Environment Variables**
- Frontend `.env`
- Backend `.env`
- CI/CD pipelines
- Documentation

### 6. Post-Deployment

#### Monitor
- Program account activity
- Transaction success rate
- Error logs
- RPC health

#### Verify
- Program ID matches deployment
- PDAs created correctly
- Initialization successful
- First round can start

#### Document
- Program ID
- Deployment date
- Authority address
- Treasury address
- Jackpot address

## Troubleshooting

### Build Errors
```bash
# Clean and rebuild
anchor clean
anchor build
```

### Deployment Errors
```bash
# Check wallet balance
solana balance

# Check cluster
solana config get

# Verify keypair
solana address -k target/deploy/flipsol-keypair.json
```

### Initialization Errors
- Verify authority wallet has SOL
- Check program ID matches
- Verify PDAs don't already exist

## Security Reminders

1. **Never share your authority keypair**
2. **Use multi-sig for production**
3. **Monitor for suspicious activity**
4. **Keep backups of authority keypair**
5. **Document all admin operations**

## Support

For issues:
1. Check logs: `anchor logs`
2. Verify on-chain: Solana Explorer
3. Review error codes in AUDIT.md
