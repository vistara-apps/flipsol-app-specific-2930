# End-to-End Testing Guide

## ✅ Setup Complete

**Program Deployed:**
- Program ID: `BnH9sAdZuku74uWsfdncYYzMASprDHiRiAZd2jwchXL1`
- Network: Devnet
- Status: ✅ Deployed

**Configuration Files Updated:**
- ✅ `.env` - Frontend environment variables
- ✅ `backend/.env` - Backend environment variables  
- ✅ `src/config/constants.ts` - Program ID updated
- ✅ `Anchor.toml` - Program ID synced

## 🚀 How to Test End-to-End

### 1. Initialize the Program (One-time setup)

```bash
npx ts-node scripts/initialize.ts
```

This will:
- Create GlobalState, Treasury, and Jackpot PDAs
- Set rake to 2% and jackpot to 1%
- Make your wallet the authority

### 2. Start the Backend API

```bash
cd backend
npm install  # If not already done
npm run dev
```

The backend will:
- Start on `http://localhost:3001`
- Connect to devnet RPC
- Start indexing program events
- Provide API endpoints for stats, history, leaderboard

**Note:** You'll need PostgreSQL running. If you don't have it:
- Install PostgreSQL
- Update `backend/.env` with your database URL
- Run `npx prisma migrate dev` to set up the database

### 3. Start the Frontend

```bash
npm run dev
```

The frontend will:
- Start on `http://localhost:5173` (or similar)
- Connect to devnet
- Use your Phantom/Solflare wallet
- Display the game UI

### 4. Testing Flow

#### As Admin (Your Wallet):
1. **Start a Round:**
   - Connect your wallet (must be the authority)
   - Click "Start New Round"
   - Set duration (e.g., 60 seconds)
   - Confirm transaction

#### As User:
1. **Place a Bet:**
   - Connect wallet (can be different from admin)
   - Choose Heads or Tails
   - Enter bet amount (minimum 0.01 SOL)
   - Click "Place Bet"
   - Confirm transaction

2. **Wait for Round to End:**
   - Timer counts down
   - Round automatically settles when timer expires

3. **Claim Winnings:**
   - If you won, click "Claim Winnings"
   - Confirm transaction
   - SOL will be transferred to your wallet

#### As Admin:
1. **Close Round (if needed):**
   - If round expired but didn't auto-close
   - Click "Close Round"
   - Program determines winner
   - Funds distributed

## 📊 What to Check

### Frontend:
- ✅ Wallet connects successfully
- ✅ Balance displays correctly
- ✅ Can see current round state
- ✅ Can place bets
- ✅ Timer counts down correctly
- ✅ Can claim winnings
- ✅ History shows past rounds
- ✅ Leaderboard displays

### Backend API:
- ✅ `GET /api/stats` - Overall statistics
- ✅ `GET /api/rounds/current` - Current round
- ✅ `GET /api/rounds/history` - Past rounds
- ✅ `GET /api/leaderboard` - Top players
- ✅ `GET /api/feed` - Live activity feed

### On-Chain:
- ✅ Program initialized
- ✅ PDAs created correctly
- ✅ Transactions succeed
- ✅ SOL transfers work
- ✅ Round state updates
- ✅ Winners can claim

## 🔍 Troubleshooting

### Program Not Initialized:
```bash
npx ts-node scripts/initialize.ts
```

### Frontend Can't Connect:
- Check `.env` has correct `VITE_PROGRAM_ID`
- Verify wallet is connected to devnet
- Check browser console for errors

### Backend Not Working:
- Ensure PostgreSQL is running
- Check `backend/.env` configuration
- Verify RPC URL is accessible
- Check backend logs for errors

### Transactions Failing:
- Ensure wallet has enough SOL (need ~0.1 SOL for fees)
- Check network is set to devnet
- Verify program ID matches deployed program
- Check Solana explorer for transaction details

## 🎯 Quick Test Checklist

- [ ] Program initialized
- [ ] Backend running (`http://localhost:3001`)
- [ ] Frontend running (`http://localhost:5173`)
- [ ] Wallet connected
- [ ] Can start a round
- [ ] Can place a bet
- [ ] Round timer works
- [ ] Can claim winnings
- [ ] History updates
- [ ] Leaderboard shows data

## 📝 Next Steps

Once everything works:
1. Test with multiple users (different wallets)
2. Test edge cases (no bets, all heads, all tails)
3. Test jackpot trigger
4. Monitor backend logs
5. Check on-chain data on Solana Explorer

## 🔗 Useful Links

- Solana Explorer: https://explorer.solana.com/address/BnH9sAdZuku74uWsfdncYYzMASprDHiRiAZd2jwchXL1?cluster=devnet
- Devnet Faucet: https://faucet.solana.com/
- Program ID: `BnH9sAdZuku74uWsfdncYYzMASprDHiRiAZd2jwchXL1`
