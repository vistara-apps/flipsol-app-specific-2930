# Complete Walkthrough: Starting Your First Round

## 🎯 Quick Start Guide

### Step 1: Verify Your Setup

1. **Check Program Status:**
   ```bash
   solana program show BnH9sAdZuku74uWsfdncYYzMASprDHiRiAZd2jwchXL1 --url devnet
   ```
   Should show: Program deployed ✅

2. **Check GlobalState:**
   ```bash
   solana account 9mvdvriVN2VcLWaiCLfdBE75nVahy5x2iiBDrhENctUu --url devnet
   ```
   Should show: Account exists ✅

3. **Authority Wallet:**
   - Address: `4ym542u1DuC2i9hVxnr2EAdss8fHp4Rf4RFnyfqfy82t`
   - This is the wallet that initialized the program
   - **Only this wallet can start rounds**

### Step 2: Start Frontend

```bash
npm run dev
```

Open browser to: `http://localhost:5173`

### Step 3: Connect Your Wallet

1. Click **"Connect Wallet"** button (top right)
2. Select your wallet (Phantom/Solflare)
3. **IMPORTANT**: Make sure wallet is on **Devnet**
   - Phantom: Settings → Developer Mode → Change Network → Devnet
   - Solflare: Click network dropdown → Devnet

### Step 4: Check Authority Status

**In Browser Console (F12):**
- Look for: `"No round state - Debug info:"`
- Check if `isAuthority: true`
- Compare `authority` vs `currentWallet`

**If `isAuthority: false`:**
- You're using the wrong wallet
- Connect the authority wallet: `4ym542u1DuC2i9hVxnr2EAdss8fHp4Rf4RFnyfqfy82t`

### Step 5: Start a Round

1. You should see **"No Active Round"** message
2. If you're authority, you'll see **"Start New Round"** button
3. Click the button
4. Approve transaction in wallet
5. Wait for confirmation (~5-10 seconds)

### Step 6: Verify Round Started

After transaction confirms:
- ✅ Timer appears (counting down from 60 seconds)
- ✅ "Round #1" displays
- ✅ Betting cards (Heads/Tails) appear
- ✅ You can place bets

## 🔍 Troubleshooting

### Issue: "Start New Round" button doesn't appear

**Check 1: Wallet Connected?**
- Look for wallet address in top right
- If not, click "Connect Wallet"

**Check 2: Right Wallet?**
- Open browser console (F12)
- Look for debug log showing authority vs your wallet
- Authority: `4ym542u1DuC2i9hVxnr2EAdss8fHp4Rf4RFnyfqfy82t`
- Your wallet must match this

**Check 3: GlobalState Loaded?**
- Console should show: `"GlobalState fetched:"`
- If not, refresh page
- Check for errors in console

### Issue: Button appears but transaction fails

**Error: "Only the authority can start rounds"**
- You're using wrong wallet
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

### Issue: Button shows "Starting..." forever

1. Check wallet for pending transaction
2. Check browser console for errors
3. Verify you have enough SOL
4. Try refreshing page
5. Check Solana Explorer for transaction status

## 📋 Complete Test Flow

### As Authority:

1. ✅ Connect authority wallet
2. ✅ See "Start New Round" button
3. ✅ Click button → Transaction appears
4. ✅ Approve transaction
5. ✅ Wait for confirmation
6. ✅ Timer appears
7. ✅ Betting cards appear

### As Regular User:

1. ✅ Connect any wallet (not authority)
2. ✅ See "Waiting for a new round to start..."
3. ✅ No "Start New Round" button
4. ✅ Once round starts, can place bets

## 🎮 After Starting Round

### Place a Bet:
1. Choose Heads or Tails
2. Enter amount (min 0.01 SOL)
3. Click "Place Bet"
4. Approve transaction
5. Bet appears in UI

### Close Round (Authority):
1. Wait for timer to reach 0
2. Click "Close Round" (if button appears)
3. Program determines winner
4. Funds distributed

### Claim Winnings:
1. If you won, click "Claim Winnings"
2. Approve transaction
3. SOL transferred to wallet

## 🔗 Useful Commands

**Check your wallet address:**
```bash
solana address
```

**Check authority from GlobalState:**
```bash
solana account 9mvdvriVN2VcLWaiCLfdBE75nVahy5x2iiBDrhENctUu --url devnet
```

**View transaction on explorer:**
- After starting round, copy transaction signature
- Visit: https://explorer.solana.com/tx/[SIGNATURE]?cluster=devnet

## 📝 Debug Checklist

Open browser console (F12) and check:

- [ ] `"Program initialized:"` appears
- [ ] `"Fetching global state..."` appears
- [ ] `"GlobalState fetched:"` shows authority address
- [ ] `"No round state - Debug info:"` shows `isAuthority: true`
- [ ] No red errors in console
- [ ] Wallet address matches authority

## 🎯 Expected Behavior

**Before Round:**
- Shows "No Active Round"
- Authority sees "Start New Round" button
- Others see "Waiting for a new round to start..."

**After Starting Round:**
- Timer counts down
- Round number displays
- Betting cards appear
- Users can place bets

## 💡 Tips

1. **Always check browser console** for debug info
2. **Verify wallet network** is Devnet
3. **Check authority matches** your connected wallet
4. **Have some SOL** for transaction fees
5. **Refresh page** if things seem stuck

## 🆘 Still Having Issues?

1. Check `START_ROUND_GUIDE.md` for detailed troubleshooting
2. Verify program is deployed and initialized
3. Check all environment variables are correct
4. Make sure wallet is on Devnet
5. Check browser console for specific errors
