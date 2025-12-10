# FlipSOL - Working State Documentation

## Overview
FlipSOL is a decentralized coin flip betting game on Solana with autonomous round management, rake collection, and jackpot distribution.

## Critical Information

### Program Details
- **Program ID**: `BTU8kuz95iPH6XqBMp7a4VEsLhdco62s9H81Jt6G4GQL`
- **Authority**: `4ym542u1DuC2i9hVxnr2EAdss8fHp4Rf4RFnyfqfy82t`
- **Network**: Solana Devnet

### Key Features Working
1. **Autonomous Round Management**: Backend creates rounds every 90 seconds (60s betting + 30s break)
2. **Betting System**: Users can bet on HEADS (0) or TAILS (1)
3. **Settlement**: Automatic settlement with coin toss winner selection
4. **Rake & Jackpot**: 1% rake to treasury, 1% to jackpot pool
5. **Convex Integration**: Real-time referral tracking

## Known Working Commands

### 1. Start Backend Services
```bash
cd backend
npm run dev
```

### 2. Start Frontend
```bash
npm run dev
```

### 3. Create New Round (Manual)
```bash
cd scripts
node create-new-round.cjs
```

### 4. Place Bet (Manual Testing)
```bash
cd scripts
node place-bet.cjs [roundId] [side] [amount]
# Example: node place-bet.cjs 37 0 0.1  (Round 37, HEADS, 0.1 SOL)
```

### 5. Settle Round (Manual)
```bash
cd scripts
node manual-close-round.cjs [roundId]
```

### 6. Build & Deploy Program
```bash
# Build
cargo build-sbf

# Deploy new
solana program deploy target/deploy/flipsol.so

# Upgrade existing
solana program write-buffer target/deploy/flipsol.so
solana program upgrade <BUFFER_ID> BTU8kuz95iPH6XqBMp7a4VEsLhdco62s9H81Jt6G4GQL
```

## Critical Fixes Applied

### 1. Lamport Transfer Fix
**Problem**: "Transfer: `from` must not carry data" error when settling rounds
**Solution**: Use direct lamport manipulation for PDA-to-PDA transfers instead of system program

```rust
// Fixed code in programs/flipsol/src/lib.rs
**ctx.accounts.jackpot.to_account_info().try_borrow_mut_lamports()? = ctx.accounts.jackpot.to_account_info()
    .lamports()
    .checked_sub(jackpot_amount)
    .ok_or(ErrorCode::InsufficientFunds)?;
    
**ctx.accounts.round_state.to_account_info().try_borrow_mut_lamports()? = ctx.accounts.round_state.to_account_info()
    .lamports()
    .checked_add(jackpot_amount)
    .ok_or(ErrorCode::AmountOverflow)?;
```

### 2. Backend Timing Fix
**Problem**: Backend creating rounds every 2 seconds
**Solution**: Changed CHECK_INTERVAL to 30 seconds in casinoAgent.ts

### 3. Round Corruption Skip
**Problem**: Round #31 had invalid timestamp from old program
**Solution**: Skip rounds with timestamps < 1000000000

### 4. Discriminator Fixes
**Problem**: Wrong instruction discriminators causing "InstructionFallbackNotFound"
**Solution**: Use correct Anchor discriminators:
- PlaceBet: `[222, 62, 67, 220, 63, 166, 126, 33]`
- StartRound: `[144, 144, 43, 7, 193, 42, 217, 215]`
- CloseRound: `[149, 14, 81, 88, 230, 226, 234, 37]`

### 5. PDA Seeds Fix
**Problem**: Wrong PDA derivation for user bets
**Solution**: Use correct seeds: `[b"user_bet", user.key(), round_id.to_le_bytes()]`

## Environment Variables

### Backend (.env)
```env
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=BTU8kuz95iPH6XqBMp7a4VEsLhdco62s9H81Jt6G4GQL
AUTHORITY_PRIVATE_KEY=[your-private-key-array]
PORT=3001
CONVEX_URL=your-convex-url
```

### Frontend (.env.local)
```env
VITE_SOLANA_NETWORK=devnet
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_PROGRAM_ID=BTU8kuz95iPH6XqBMp7a4VEsLhdco62s9H81Jt6G4GQL
VITE_BACKEND_URL=http://localhost:3001
VITE_CONVEX_URL=your-convex-url
```

## Testing Checklist

### End-to-End Test Flow:
1. [ ] Backend creates new round automatically
2. [ ] Frontend shows betting window with timer
3. [ ] User can connect wallet
4. [ ] User can place bet on HEADS or TAILS
5. [ ] Frontend shows bet confirmation with Solscan link
6. [ ] Round expires after 60 seconds
7. [ ] Backend settles round automatically
8. [ ] Winner is determined by coin toss
9. [ ] Rake (1%) goes to treasury
10. [ ] Jackpot (1%) goes to jackpot pool
11. [ ] Winners can claim their rewards
12. [ ] Casino break shows for 30 seconds
13. [ ] Next round starts automatically

## Common Issues & Solutions

### Issue: Settlement fails with "Transfer: `from` must not carry data"
**Solution**: Rebuild and upgrade program with cargo build-sbf

### Issue: Backend spamming settlement attempts
**Solution**: Check casinoAgent.ts CHECK_INTERVAL is 30000ms

### Issue: Rounds created too quickly
**Solution**: Ensure ROUND_DURATION = 90000ms in casinoAgent.ts

### Issue: Can't place bets
**Solution**: Check discriminators match in place-bet.cjs

### Issue: Frontend shows wrong round state
**Solution**: Ensure frontend polling interval matches backend timing

## Monitoring

### Check Backend Status
```bash
curl http://localhost:3001/api/cron/status
```

### View Logs
```bash
# Backend logs
cd backend && npm run dev

# Check for errors like:
# - "Transfer: `from` must not carry data"
# - "Round already settled"
# - "No bets placed"
```

## How It All Works

### 1. Coin Toss (Randomness)
The program uses SHA256 hash for pseudo-randomness:
```rust
// Hash inputs: round_id + clock_slot + round_balance
let hash_result = hash(&hash_input);
let pseudo_random = hash_bytes[0] % 2;
let winning_side = if pseudo_random == 0 { 0u8 } else { 1u8 };
```
- 0 = HEADS wins
- 1 = TAILS wins

### 2. Settlement Distribution
When a round is settled:
1. **Fees Deducted**: 1% rake + 1% jackpot (2% total)
2. **Winner Pool**: 98% of total pot
3. **Jackpot Trigger**: ~0.0129% chance to add jackpot to winner pool

### 3. Claiming Winnings
Winners must claim their rewards manually:
- Share calculated proportionally: `user_bet / total_winning_side * winner_pool`
- Direct lamport transfer from round PDA to user wallet
- Prevents double claiming with `claimed` flag

### 4. Current Limitations
- **No Referral System**: Not implemented in smart contract (tracked off-chain in Convex)
- **Manual Claims**: Winners must claim rewards (not automatic) - but UI shows unclaimed winnings
- **Single Bet**: Users can only bet once per round

### 5. Winner Claiming System
The frontend now includes:
- **Unclaimed Winnings Component**: Shows all rounds where user won but hasn't claimed
- **One-Click Claim**: Users can claim winnings directly from the UI
- **Backend APIs**:
  - `/api/user/unclaimed-winnings/:wallet` - Get unclaimed winnings
  - `/api/user/bet-history/:wallet` - Get complete bet history

## Success Metrics
- Rounds create every 120 seconds (60s betting + 60s break)
- Settlement happens within 30 seconds of round expiry
- No "Transfer: `from` must not carry data" errors
- Winners receive 98% of total pot (2% to rake/jackpot)
- Jackpot triggers ~0.0129% of rounds

## Next Steps
1. Implement proper secrets management (don't hardcode keys)
2. Add emergency pause functionality
3. Deploy redundant backend services
4. Add more comprehensive error handling
5. Implement referral rewards distribution

## Verified Working Transactions
- Bet placed: https://solscan.io/tx/25MXYHDmbuvMyeKa2qs9HsLtypGrZ6PhyF5TtDULBUYcWzyNRA9SKFXFNNXiJV1tos7m2p9THzoXyKLDpVX8CyWp?cluster=devnet
- Round settled: https://solscan.io/tx/45YuyQLqLaoDwtnBSqCcFEpEMLhQnFAqyB1UBYRfarK2Bfq1T1JyvcuWuDVVzirq4hp5w5dZBdDnojXj94ZuBWZc?cluster=devnet