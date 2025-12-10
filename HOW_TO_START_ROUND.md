# 🎮 How to Start a New Round - Complete Guide

## ✅ Fixed Issues

1. ✅ Removed duplicate `IDL` export
2. ✅ Added proper TypeScript type export
3. ✅ Fixed program instance creation
4. ✅ Added debug logging
5. ✅ Improved error handling

## 🚀 Step-by-Step: Starting Your First Round

### Step 1: Make Sure Frontend is Running

```bash
npm run dev
```

Open browser: `http://localhost:5173`

### Step 2: Connect the Authority Wallet

**IMPORTANT**: You must connect the authority wallet to start rounds.

**Authority Wallet Address**: `4ym542u1DuC2i9hVxnr2EAdss8fHp4Rf4RFnyfqfy82t`

**How to connect:**
1. Click **"Connect Wallet"** button (top right)
2. Select your Solana wallet (Phantom/Solflare)
3. **CRITICAL**: Make sure wallet is on **Devnet**
   - Phantom: Settings → Developer Mode → Change Network → Devnet
   - Solflare: Click network dropdown → Select Devnet

### Step 3: Verify Authority Status

**Open Browser Console (F12)** and look for:

```
No round state: {
  hasGlobalState: true,
  hasPublicKey: true,
  isAuthority: true,  ← Should be TRUE
  authority: "4ym542u1DuC2i9hVxnr2EAdss8fHp4Rf4RFnyfqfy82t",
  currentWallet: "4ym542u1DuC2i9hVxnr2EAdss8fHp4Rf4RFnyfqfy82t"
}
```

**If `isAuthority: false`:**
- Your wallet doesn't match the authority
- Connect the correct wallet or import the authority keypair

### Step 4: Start the Round

1. You should see **"No Active Round"** message
2. If you're the authority, you'll see:
   - Message: "Start a new round to begin accepting bets"
   - **"Start New Round"** button
3. Click the **"Start New Round"** button
4. Approve the transaction in your wallet
5. Wait 5-10 seconds for confirmation

### Step 5: Verify Round Started

After transaction confirms, you should see:
- ✅ Timer appears (counting down from 60 seconds)
- ✅ "Round #1" displays
- ✅ Betting cards (Heads/Tails) appear
- ✅ You can now place bets

## 🔍 Troubleshooting

### Button Doesn't Appear?

**Check 1: Wallet Connected?**
- Look for wallet address in top right
- If not connected, click "Connect Wallet"

**Check 2: Right Wallet?**
- Open console (F12)
- Check debug log: `isAuthority` should be `true`
- Authority address: `4ym542u1DuC2i9hVxnr2EAdss8fHp4Rf4RFnyfqfy82t`
- Your wallet must match exactly

**Check 3: GlobalState Loaded?**
- Console should show: `"GlobalState fetched:"`
- If not, refresh page
- Check for errors in console

### Transaction Fails?

**Error: "Only the authority can start rounds"**
- Wrong wallet connected
- Connect authority wallet

**Error: "Insufficient funds"**
- Need SOL for fees (~0.001 SOL)
- Get devnet SOL: https://faucet.solana.com/

**Error: "Program not initialized"**
- Run: `npx ts-node scripts/initialize.ts`
- Wait for success message

**Error: Network errors**
- Check wallet is on Devnet
- Check `.env` has correct RPC URL
- Try refreshing page

### Button Shows "Starting..." Forever?

1. Check wallet for pending transaction
2. Check browser console for errors
3. Verify you have enough SOL
4. Refresh page
5. Check Solana Explorer for transaction status

## 📋 Quick Checklist

- [ ] Frontend running (`npm run dev`)
- [ ] Wallet connected to Devnet
- [ ] Wallet is authority (`4ym542u1DuC2i9hVxnr2EAdss8fHp4Rf4RFnyfqfy82t`)
- [ ] Console shows `isAuthority: true`
- [ ] "Start New Round" button visible
- [ ] Click button → Transaction appears
- [ ] Approve transaction
- [ ] Wait for confirmation
- [ ] Timer appears
- [ ] Betting cards appear

## 🎯 What Happens When You Start a Round

**On-Chain:**
1. Creates new `RoundState` PDA
2. Sets `endsAt` timestamp (now + 60 seconds)
3. Increments `currentRound` in `GlobalState`
4. Round is now active for betting

**In UI:**
1. Timer starts counting down
2. Users can place bets
3. Round data updates in real-time

## 🎮 After Starting Round

### Place a Bet:
1. Choose **Heads** or **Tails**
2. Enter amount (minimum 0.01 SOL)
3. Click **"Place Bet"**
4. Approve transaction
5. Your bet appears in the UI

### Close Round (Authority):
1. Wait for timer to reach 0
2. Click **"Close Round"** (if button appears)
3. Program determines winner using randomness
4. Funds distributed:
   - Jackpot % → Jackpot PDA
   - Rake % → Treasury PDA
   - Rest → Winners (proportional)

### Claim Winnings:
1. If you won, click **"Claim Winnings"**
2. Approve transaction
3. SOL transferred to your wallet

## 🔗 Useful Commands

**Check your wallet:**
```bash
solana address
```

**Check authority:**
```bash
solana account 9mvdvriVN2VcLWaiCLfdBE75nVahy5x2iiBDrhENctUu --url devnet
```

**View transaction:**
- Copy transaction signature after starting round
- Visit: https://explorer.solana.com/tx/[SIGNATURE]?cluster=devnet

## 💡 Tips

1. **Always check browser console** (F12) for debug info
2. **Verify wallet network** is Devnet
3. **Check authority matches** your connected wallet
4. **Have some SOL** for transaction fees
5. **Refresh page** if things seem stuck

## 🆘 Still Having Issues?

1. Check browser console (F12) for specific errors
2. Verify program is deployed: `solana program show BnH9sAdZuku74uWsfdncYYzMASprDHiRiAZd2jwchXL1 --url devnet`
3. Verify program is initialized: Check GlobalState account exists
4. Make sure wallet is on Devnet
5. Check you have enough SOL for fees

---

**Ready to start?** Refresh your browser, connect the authority wallet, and click "Start New Round"! 🚀
