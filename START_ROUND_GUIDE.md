# How to Start a New Round - Step by Step Guide

## Prerequisites

1. **Program is deployed** ✅ (Done: `BnH9sAdZuku74uWsfdncYYzMASprDHiRiAZd2jwchXL1`)
2. **Program is initialized** ✅ (Done: Authority is `4ym542u1DuC2i9hVxnr2EAdss8fHp4Rf4RFnyfqfy82t`)
3. **Frontend is running** ✅ (`npm run dev`)

## Step-by-Step: Starting Your First Round

### Step 1: Connect Your Wallet

1. Open the app in your browser (usually `http://localhost:5173`)
2. Click "Connect Wallet" in the top right
3. Select your Solana wallet (Phantom, Solflare, etc.)
4. **IMPORTANT**: Make sure your wallet is connected to **Devnet**
   - In Phantom: Settings → Developer Mode → Change Network → Devnet
   - In Solflare: Click network dropdown → Select Devnet

### Step 2: Verify You're the Authority

The authority wallet is: `4ym542u1DuC2i9hVxnr2EAdss8fHp4Rf4RFnyfqfy82t`

**Check if your wallet matches:**
- If YES → You'll see "Start New Round" button
- If NO → You need to use the authority wallet or transfer authority

### Step 3: Start a Round

1. You should see "No Active Round" message
2. If you're the authority, you'll see a **"Start New Round"** button
3. Click the button
4. Approve the transaction in your wallet
5. Wait for confirmation (~5-10 seconds)

### Step 4: Verify Round Started

After the transaction confirms:
- Timer should appear showing countdown (default: 60 seconds)
- Betting cards (Heads/Tails) should appear
- Round number should display

## Troubleshooting

### Issue: "Start New Round" button doesn't appear

**Possible causes:**
1. **Wrong wallet connected**
   - Solution: Connect the authority wallet (`4ym542u1DuC2i9hVxnr2EAdss8fHp4Rf4RFnyfqfy82t`)

2. **Wallet not connected**
   - Solution: Click "Connect Wallet" button

3. **GlobalState not loaded**
   - Solution: Check browser console for errors
   - Refresh the page

### Issue: Transaction fails

**Common errors:**

1. **"Only the authority can start rounds"**
   - You're using the wrong wallet
   - Connect the authority wallet

2. **"Insufficient funds"**
   - You need SOL for transaction fees (~0.001 SOL)
   - Get devnet SOL: https://faucet.solana.com/

3. **"Program not initialized"**
   - Run: `npx ts-node scripts/initialize.ts`
   - Make sure it completes successfully

4. **Network errors**
   - Check you're on Devnet (not Mainnet)
   - Check RPC URL in `.env` file

### Issue: Button shows "Starting..." but nothing happens

1. Check browser console (F12) for errors
2. Check wallet for pending transaction
3. Verify you have enough SOL
4. Try refreshing the page

## Quick Test Checklist

- [ ] Wallet connected to Devnet
- [ ] Wallet is the authority wallet
- [ ] "Start New Round" button visible
- [ ] Click button → Transaction appears in wallet
- [ ] Approve transaction
- [ ] Wait for confirmation
- [ ] Timer appears
- [ ] Betting cards appear

## What Happens When You Start a Round

1. **On-chain:**
   - Creates a new `RoundState` PDA
   - Sets `endsAt` timestamp (now + duration)
   - Increments `currentRound` in `GlobalState`
   - Round is now active for betting

2. **In UI:**
   - Timer starts counting down
   - Users can place bets
   - Round data updates in real-time

## Next Steps After Starting Round

1. **Place a test bet:**
   - Choose Heads or Tails
   - Enter amount (min 0.01 SOL)
   - Confirm transaction

2. **Wait for round to end:**
   - Timer counts down
   - When timer reaches 0, round expires

3. **Close the round:**
   - As authority, click "Close Round"
   - Program determines winner
   - Funds are distributed

4. **Claim winnings:**
   - If you won, click "Claim Winnings"
   - SOL is transferred to your wallet

## Authority Wallet Info

- **Address**: `4ym542u1DuC2i9hVxnr2EAdss8fHp4Rf4RFnyfqfy82t`
- **This is the wallet that initialized the program**
- **Only this wallet can start/close rounds**

## Need Help?

1. Check browser console (F12) for errors
2. Check Solana Explorer: https://explorer.solana.com/address/BnH9sAdZuku74uWsfdncYYzMASprDHiRiAZd2jwchXL1?cluster=devnet
3. Verify your wallet address matches the authority
4. Make sure you have devnet SOL
